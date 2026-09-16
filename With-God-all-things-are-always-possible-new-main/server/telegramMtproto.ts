import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';

// ==============================================================================
// SECURE AES-256-GCM TELEGRAM CREDENTIAL ENCRYPTION (NO FALLBACK KEYS)
// ==============================================================================

/**
 * Validates and retrieves the encryption key exclusively from TELEGRAM_SESSION_ENCRYPTION_KEY.
 * Strictly throws if the environment variable is missing, empty, or whitespace.
 * No generic fallback, no derived keys from other services, and no hardcoded defaults.
 */
export function getTelegramSessionEncryptionKey(): Buffer {
  const rawKey = process.env.TELEGRAM_SESSION_ENCRYPTION_KEY;
  if (!rawKey || typeof rawKey !== 'string' || rawKey.trim().length === 0) {
    throw new Error('TELEGRAM_SESSION_ENCRYPTION_KEY_NOT_CONFIGURED');
  }
  return crypto.createHash('sha256').update(rawKey.trim()).digest();
}

export function isTelegramEncryptionConfigured(): boolean {
  const rawKey = process.env.TELEGRAM_SESSION_ENCRYPTION_KEY;
  return typeof rawKey === 'string' && rawKey.trim().length > 0;
}

export function encryptSessionOrTokens(data: any): string {
  const key = getTelegramSessionEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit cryptographically secure random IV for AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex'); // 128-bit authentication tag
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decryptSessionOrTokens(encryptedPayload: string): any | null {
  try {
    const parts = (encryptedPayload || '').split(':');
    if (parts.length !== 3) return null;
    const [ivHex, tagHex, dataHex] = parts;
    if (!ivHex || !tagHex || !dataHex) return null;
    if (ivHex.length !== 24 || tagHex.length !== 32) return null; // 12 bytes = 24 hex, 16 bytes = 32 hex

    const key = getTelegramSessionEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(dataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (err: any) {
    if (err?.message === 'TELEGRAM_SESSION_ENCRYPTION_KEY_NOT_CONFIGURED') {
      throw err;
    }
    console.warn('[Telegram Session Decrypt Notice]: Authentication or decryption failed');
    return null;
  }
}

// Backward compatibility alias for exported function
export const getEncryptionKey = getTelegramSessionEncryptionKey;

// ==========================================
// TELEGRAM MTPROTO CONFIGURATION & HELPERS
// ==========================================

export function getTelegramApiConfig(): { apiId: number; apiHash: string } | null {
  const apiIdStr = process.env.TELEGRAM_API_ID || '';
  const apiHash = process.env.TELEGRAM_API_HASH || '';
  const apiId = parseInt(apiIdStr, 10);
  if (!apiId || isNaN(apiId) || !apiHash) return null;
  return { apiId, apiHash };
}

export interface PendingTelegramAuthState {
  userId: string;
  phoneNumber: string;
  phoneCodeHash: string;
  encryptedSession: string;
  stage: 'awaiting_code' | 'awaiting_password' | 'completed';
  createdAt: number;
  expiresAt: number;
}

// In-memory pending auth cache as a local performance acceleration (never required for correctness)
const pendingAuthMemoryCache = new Map<string, PendingTelegramAuthState>();

// Periodic cleanup of stale local cache entries (10-minute TTL)
setInterval(() => {
  const now = Date.now();
  for (const [userId, item] of pendingAuthMemoryCache.entries()) {
    if (now > item.expiresAt) {
      pendingAuthMemoryCache.delete(userId);
    }
  }
}, 3 * 60 * 1000);

async function savePendingAuthState(
  req: express.Request,
  authUserId: string,
  state: PendingTelegramAuthState
): Promise<void> {
  // 1. Update local cache
  pendingAuthMemoryCache.set(authUserId, state);

  // 2. Persist to Supabase for multi-instance serverless resilience
  const sb = getSupabaseClient(req);
  if (!sb) return;

  const expiresIso = new Date(state.expiresAt).toISOString();
  const createdIso = new Date(state.createdAt).toISOString();

  let savedToDedicatedTable = false;
  try {
    const { error: upsertErr } = await sb.from('telegram_auth_states').upsert(
      {
        user_id: authUserId,
        phone_number: state.phoneNumber,
        phone_code_hash: state.phoneCodeHash,
        encrypted_session: state.encryptedSession,
        stage: state.stage,
        created_at: createdIso,
        expires_at: expiresIso,
      },
      { onConflict: 'user_id' }
    );
    if (!upsertErr) {
      savedToDedicatedTable = true;
    } else {
      console.warn('[Telegram Pending Auth DB Table Notice]:', upsertErr.message);
    }
  } catch (dbErr: any) {
    console.warn('[Telegram Pending Auth Table Exception]:', dbErr.message);
  }

  // 3. Resilient fallback: Also store in integrations table with status 'pending_auth'
  try {
    const serializedPayload = encryptSessionOrTokens(state);
    const { data: existing } = await sb
      .from('integrations')
      .select('id')
      .eq('user_id', authUserId)
      .eq('provider', 'telegram');

    if (existing && existing.length > 0) {
      await sb.from('integrations').update({
        connected_account: state.phoneNumber,
        status: `pending_auth:${state.stage}`,
        oauth_tokens_encrypted: serializedPayload,
        updated_at: new Date().toISOString(),
      }).eq('id', existing[0].id);
    } else {
      await sb.from('integrations').insert({
        user_id: authUserId,
        provider: 'telegram',
        connected_account: state.phoneNumber,
        status: `pending_auth:${state.stage}`,
        oauth_tokens_encrypted: serializedPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (fallbackErr: any) {
    console.warn('[Telegram Pending Auth Fallback Notice]:', fallbackErr.message);
  }
}

async function getPendingAuthState(
  req: express.Request,
  authUserId: string
): Promise<PendingTelegramAuthState | null> {
  const now = Date.now();
  const sb = getSupabaseClient(req);

  // 1. Try dedicated Supabase table first (Serverless authoritative source)
  if (sb) {
    try {
      const { data, error } = await sb
        .from('telegram_auth_states')
        .select('*')
        .eq('user_id', authUserId)
        .gt('expires_at', new Date(now).toISOString())
        .maybeSingle();

      if (!error && data) {
        const state: PendingTelegramAuthState = {
          userId: data.user_id,
          phoneNumber: data.phone_number,
          phoneCodeHash: data.phone_code_hash,
          encryptedSession: data.encrypted_session,
          stage: data.stage as any,
          createdAt: new Date(data.created_at).getTime(),
          expiresAt: new Date(data.expires_at).getTime(),
        };
        pendingAuthMemoryCache.set(authUserId, state);
        return state;
      }
    } catch (err: any) {
      console.warn('[Telegram Get Pending Auth DB Notice]:', err.message);
    }

    // 2. Try fallback in integrations table
    try {
      const { data: integData } = await sb
        .from('integrations')
        .select('*')
        .eq('user_id', authUserId)
        .eq('provider', 'telegram')
        .maybeSingle();

      if (integData && integData.status?.startsWith('pending_auth') && integData.oauth_tokens_encrypted) {
        const decrypted = decryptSessionOrTokens(integData.oauth_tokens_encrypted);
        if (decrypted && typeof decrypted === 'object' && decrypted.phoneCodeHash && decrypted.expiresAt > now) {
          pendingAuthMemoryCache.set(authUserId, decrypted as PendingTelegramAuthState);
          return decrypted as PendingTelegramAuthState;
        }
      }
    } catch (integErr: any) {
      console.warn('[Telegram Get Pending Auth Fallback Notice]:', integErr.message);
    }
  }

  // 3. Check memory cache as fast-path fallback
  const cached = pendingAuthMemoryCache.get(authUserId);
  if (cached) {
    if (cached.expiresAt > now) {
      return cached;
    }
    pendingAuthMemoryCache.delete(authUserId);
  }

  return null;
}

async function clearPendingAuthState(
  req: express.Request,
  authUserId: string
): Promise<void> {
  pendingAuthMemoryCache.delete(authUserId);

  const sb = getSupabaseClient(req);
  if (!sb) return;

  try {
    await sb.from('telegram_auth_states').delete().eq('user_id', authUserId);
  } catch (e) {}

  try {
    const { data: row } = await sb
      .from('integrations')
      .select('id, status')
      .eq('user_id', authUserId)
      .eq('provider', 'telegram')
      .maybeSingle();

    if (row && row.status?.startsWith('pending_auth')) {
      await sb.from('integrations').update({
        status: 'Disconnected',
        oauth_tokens_encrypted: null,
        updated_at: new Date().toISOString(),
      }).eq('id', row.id);
    }
  } catch (e) {}
}

// Supabase & AI Clients
function getSupabaseClient(req?: express.Request) {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl) return null;

  if (serviceRoleKey) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  const options: any = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  };

  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      options.global = { headers: { Authorization: `Bearer ${token}` } };
    }
  }

  return createClient(supabaseUrl, anonKey, options);
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

interface TgAuthTokenCacheEntry {
  userId: string;
  expiresAt: number;
}

const tgAuthTokenCache = new Map<string, TgAuthTokenCacheEntry>();
const TG_AUTH_CACHE_TTL_MS = 90 * 1000; // 90s TTL
const TG_AUTH_CACHE_MAX_ENTRIES = 1000;

setInterval(() => {
  const now = Date.now();
  for (const [tokenKey, entry] of tgAuthTokenCache.entries()) {
    if (now > entry.expiresAt) {
      tgAuthTokenCache.delete(tokenKey);
    }
  }
}, 2 * 60 * 1000);

async function getAuthUserId(req: express.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  const now = Date.now();
  const cached = tgAuthTokenCache.get(token);
  if (cached && now < cached.expiresAt) {
    return cached.userId;
  }

  try {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !anonKey) return null;

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await userClient.auth.getUser();
    if (error || !data?.user?.id) {
      tgAuthTokenCache.delete(token);
      return null;
    }

    if (tgAuthTokenCache.size >= TG_AUTH_CACHE_MAX_ENTRIES) {
      const oldestKey = tgAuthTokenCache.keys().next().value;
      if (oldestKey) tgAuthTokenCache.delete(oldestKey);
    }
    tgAuthTokenCache.set(token, {
      userId: data.user.id,
      expiresAt: now + TG_AUTH_CACHE_TTL_MS,
    });

    return data.user.id;
  } catch (err) {
    return null;
  }
}

async function generateVector(text: string): Promise<number[] | null> {
  const ai = getGeminiClient();
  if (!ai || !text || !text.trim()) return null;

  try {
    const res = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: text.slice(0, 8000),
    });
    const vec = res.embeddings?.[0]?.values;
    if (vec && Array.isArray(vec) && vec.length > 0) return vec;
  } catch (e) {
    try {
      const resFallback = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text.slice(0, 8000),
      });
      const vec = resFallback.embeddings?.[0]?.values;
      if (vec && Array.isArray(vec) && vec.length > 0) return vec;
    } catch (e2) {}
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function normalizeDocCategory(rawCat?: string | null, title?: string, text?: string): string {
  if (rawCat) {
    const t = rawCat.trim().toLowerCase();
    if (t.includes('invoice') || t.includes('bill')) return 'Invoices';
    if (t.includes('receipt') || t.includes('pos')) return 'Receipts';
    if (t.includes('contract') || t.includes('agreement') || t.includes('nda')) return 'Contracts';
    if (t.includes('report') || t.includes('audit')) return 'Reports';
    if (t.includes('certificate') || t.includes('clearance') || t.includes('tcc')) return 'Certificates';
    if (t.includes('quote') || t.includes('quotation') || t.includes('estimate')) return 'Quotations';
    if (t.includes('payment') || t.includes('transfer') || t.includes('remittance')) return 'Payment Confirmations';
    if (t.includes('academic') || t.includes('thesis') || t.includes('transcript')) return 'Academic Documents';
  }
  const combined = `${title || ''} ${text || ''}`.toLowerCase();
  if (/\b(invoice|bill to|inv-|amount due)\b/i.test(combined)) return 'Invoices';
  if (/\b(receipt|sales receipt|cash receipt|total paid)\b/i.test(combined)) return 'Receipts';
  if (/\b(contract|agreement|nda|terms and conditions)\b/i.test(combined)) return 'Contracts';
  if (/\b(report|financial statement|audit)\b/i.test(combined)) return 'Reports';
  if (/\b(certificate|certified that)\b/i.test(combined)) return 'Certificates';
  if (/\b(quotation|price quote|estimate)\b/i.test(combined)) return 'Quotations';
  if (/\b(payment confirmation|transfer receipt|debit alert)\b/i.test(combined)) return 'Payment Confirmations';
  return 'Others';
}

// ==========================================
// TELEGRAM MTPROTO ROUTE HANDLERS
// ==========================================

export async function handleTelegramInfo(req: express.Request, res: express.Response) {
  const config = getTelegramApiConfig();
  const encryptionConfigured = isTelegramEncryptionConfigured();
  return res.json({
    success: true,
    isConfigured: !!config && encryptionConfigured,
    type: 'mtproto_user_client',
    description: 'Telegram MTProto User Account Client Integration',
  });
}

export async function handleTelegramSendCode(req: express.Request, res: express.Response) {
  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ success: false, error: 'Authentication required. Missing or invalid Bearer token.' });
  }

  if (!isTelegramEncryptionConfigured()) {
    console.error('[Telegram Security Diagnostic]: TELEGRAM_SESSION_ENCRYPTION_KEY_NOT_CONFIGURED');
    return res.status(503).json({
      success: false,
      error: 'Telegram integration is temporarily unavailable. Please try again later.',
    });
  }

  const { phoneNumber } = req.body || {};
  if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length < 5) {
    return res.status(400).json({ success: false, error: 'Please enter a valid international phone number (e.g. +1234567890).' });
  }

  const config = getTelegramApiConfig();
  if (!config) {
    console.error('[Telegram Security Diagnostic]: TELEGRAM_API_ID or TELEGRAM_API_HASH not configured');
    return res.status(503).json({
      success: false,
      error: 'Telegram integration is temporarily unavailable. Please try again later.',
    });
  }

  const cleanPhone = phoneNumber.trim().replace(/[^\d+]/g, '');

  console.log(`[Telegram MTProto SendCode] Request received for user ${authUserId.slice(0, 8)}...`);

  try {
    // Clear any previous incomplete pending auth sessions for this user
    await clearPendingAuthState(req, authUserId);

    const session = new StringSession('');
    const client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    const sendResult = await client.sendCode(
      { apiId: config.apiId, apiHash: config.apiHash },
      cleanPhone
    );

    const phoneCodeHash = sendResult.phoneCodeHash;
    const isCodeViaApp = (sendResult as any).isCodeViaApp || (sendResult as any).type?.className === 'auth.SentCodeTypeApp' || false;
    const deliveryType = isCodeViaApp ? 'app' : 'sms';

    // Export and encrypt the temporary MTProto session containing the negotiated AuthKey and DC parameters
    const intermediateSession = client.session.save() as unknown as string;
    const encryptedIntermediateSession = encryptSessionOrTokens(intermediateSession);

    const pendingState: PendingTelegramAuthState = {
      userId: authUserId,
      phoneNumber: cleanPhone,
      phoneCodeHash,
      encryptedSession: encryptedIntermediateSession,
      stage: 'awaiting_code',
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10-minute serverless verification window
    };

    // Durably persist temporary authentication state in Supabase
    await savePendingAuthState(req, authUserId, pendingState);

    try { await client.disconnect(); } catch (e) {}

    const deliveryMsg = isCodeViaApp
      ? 'Telegram delivered your 5-digit login code to your active Telegram app (look for a direct message in the official service chat "Telegram" with verified badge).'
      : 'Telegram sent your verification code via SMS to your phone number.';

    console.log(`[Telegram MTProto SendCode Success] Code dispatched via ${deliveryType.toUpperCase()} for user ${authUserId.slice(0, 8)}`);

    return res.json({
      success: true,
      phoneCodeHash,
      isCodeViaApp,
      deliveryType,
      message: deliveryMsg,
    });
  } catch (err: any) {
    const rawMsg = err.message || err.errorMessage || '';
    const errUpper = rawMsg.toUpperCase();
    console.error(`[Telegram MTProto SendCode Error for ${authUserId.slice(0, 8)}]:`, rawMsg);

    let userSafeError = 'Failed to send Telegram login code. Please check your phone number.';
    if (errUpper.includes('PHONE_NUMBER_INVALID')) {
      userSafeError = 'Invalid phone number format. Please ensure your international country code is included (e.g. +1 for USA/Canada, +44 for UK).';
    } else if (errUpper.includes('PHONE_NUMBER_BANNED')) {
      userSafeError = 'This phone number has been restricted or banned by Telegram.';
    } else if (errUpper.includes('API_ID_INVALID') || errUpper.includes('API_ID_PUBLISHED_FLOOD')) {
      userSafeError = 'Telegram integration is temporarily unavailable. Please try again later.';
    } else if (errUpper.includes('FLOOD_WAIT')) {
      userSafeError = 'Too many requests. Telegram requires you to wait a moment before requesting another login code.';
    } else if (errUpper.includes('PHONE_NUMBER_UNOCCUPIED')) {
      userSafeError = 'No Telegram account found with this phone number. Please register with Telegram first.';
    }

    return res.status(400).json({
      success: false,
      error: userSafeError,
    });
  }
}

// Multi-Tenant Isolation: Check if a Telegram account is already actively connected to another Structra user
async function checkTelegramAccountCollision(
  sb: any,
  authUserId: string,
  accountIdentifier: string,
  meObj?: any
): Promise<boolean> {
  if (!sb) return false;
  try {
    const { data: activeIntegrations } = await sb
      .from('integrations')
      .select('id, user_id, connected_account, status, oauth_tokens_encrypted')
      .eq('provider', 'telegram')
      .neq('user_id', authUserId);

    if (!activeIntegrations || activeIntegrations.length === 0) return false;

    const normAccount = (accountIdentifier || '').trim().toLowerCase();
    const tgUsername = meObj?.username ? `@${meObj.username.toLowerCase()}` : null;
    const rawUsername = meObj?.username ? meObj.username.toLowerCase() : null;
    const rawPhone = meObj?.phone ? meObj.phone.replace(/\D/g, '') : null;
    const tgId = meObj?.id ? String(meObj.id) : null;

    return activeIntegrations.some(row => {
      const status = (row.status || '').toLowerCase();
      const isDisconnected = status === 'disconnected';
      const hasSession = !!row.oauth_tokens_encrypted;
      if (isDisconnected || !hasSession) return false;

      const existingAccount = (row.connected_account || '').trim().toLowerCase();
      const existingCleanPhone = existingAccount.replace(/\D/g, '');

      if (normAccount && existingAccount === normAccount) return true;
      if (tgUsername && (existingAccount === tgUsername || existingAccount === rawUsername)) return true;
      if (rawPhone && rawPhone.length >= 7 && existingCleanPhone.length >= 7 && (rawPhone === existingCleanPhone || existingCleanPhone.includes(rawPhone) || rawPhone.includes(existingCleanPhone))) return true;
      if (tgId && existingAccount.includes(tgId)) return true;

      return false;
    });
  } catch (err) {
    console.warn('[Telegram Ownership Collision Check Error]:', err);
    return false;
  }
}

export async function handleTelegramVerifyCode(req: express.Request, res: express.Response) {
  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ success: false, error: 'Authentication required. Missing or invalid Bearer token.' });
  }

  if (!isTelegramEncryptionConfigured()) {
    console.error('[Telegram Security Diagnostic]: TELEGRAM_SESSION_ENCRYPTION_KEY_NOT_CONFIGURED');
    return res.status(503).json({
      success: false,
      error: 'Telegram integration is temporarily unavailable. Please try again later.',
    });
  }

  const { phoneCode, selectedMode } = req.body || {};
  if (!phoneCode || typeof phoneCode !== 'string') {
    return res.status(400).json({ success: false, error: 'Please enter the authorization code sent by Telegram.' });
  }

  const pending = await getPendingAuthState(req, authUserId);
  if (!pending) {
    return res.status(400).json({
      success: false,
      error: 'Login verification session expired or not found. Please restart by entering your phone number.',
    });
  }

  const config = getTelegramApiConfig();
  if (!config) {
    console.error('[Telegram Security Diagnostic]: TELEGRAM_API_ID or TELEGRAM_API_HASH missing');
    return res.status(503).json({
      success: false,
      error: 'Telegram integration is temporarily unavailable. Please try again later.',
    });
  }

  const cleanCode = phoneCode.trim().replace(/\D/g, '');
  if (!cleanCode) {
    return res.status(400).json({ success: false, error: 'Please enter a valid numeric verification code.' });
  }

  const modeVal = selectedMode === 'Secure Index' ? 'Secure Index' : 'Smart Import';

  const decryptedSession = decryptSessionOrTokens(pending.encryptedSession);
  if (!decryptedSession || typeof decryptedSession !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Corrupted or unreadable session state. Please restart login.',
    });
  }

  // Reconstruct GramJS TelegramClient using the saved StringSession and auth state
  const client = new TelegramClient(new StringSession(decryptedSession), config.apiId, config.apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.connect();

    // Use direct MTProto RPC SignIn
    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: pending.phoneNumber,
          phoneCodeHash: pending.phoneCodeHash,
          phoneCode: cleanCode,
        })
      );
    } catch (rpcErr: any) {
      const errMsg = (rpcErr.message || rpcErr.errorMessage || '').toUpperCase();
      if (errMsg.includes('SESSION_PASSWORD_NEEDED') || errMsg.includes('2FA') || rpcErr.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        // Save updated MTProto session state and transition stage to awaiting_password
        const updatedSession = client.session.save() as unknown as string;
        pending.encryptedSession = encryptSessionOrTokens(updatedSession);
        pending.stage = 'awaiting_password';
        await savePendingAuthState(req, authUserId, pending);
        try { await client.disconnect(); } catch (e) {}

        return res.json({
          success: false,
          requiresPassword: true,
          message: 'Two-step verification (2FA) cloud password is required for this Telegram account.',
        });
      }

      try { await client.disconnect(); } catch (e) {}

      if (errMsg.includes('PHONE_CODE_INVALID')) {
        return res.status(400).json({
          success: false,
          error: 'The 5-digit verification code you entered is invalid. Please check the code in your Telegram app.',
        });
      }
      if (errMsg.includes('PHONE_CODE_EXPIRED')) {
        return res.status(400).json({
          success: false,
          error: 'The verification code has expired. Please restart login to receive a new code.',
        });
      }
      if (errMsg.includes('FLOOD_WAIT')) {
        return res.status(429).json({
          success: false,
          error: 'Too many verification attempts. Telegram requires waiting a few moments before trying again.',
        });
      }
      return res.status(400).json({
        success: false,
        error: rpcErr.message || 'Verification failed. Please try again.',
      });
    }

    const me: any = await client.getMe();
    const accountIdentifier = me?.username
      ? `@${me.username}`
      : (me?.firstName ? `${me.firstName}${me.lastName ? ' ' + me.lastName : ''}` : (me?.phone ? `+${me.phone}` : 'Connected Telegram Account'));

    const sb = getSupabaseClient(req);

    // Multi-Tenant Isolation: Check if this Telegram account is already actively linked to another Structra account
    if (sb) {
      const isConflict = await checkTelegramAccountCollision(sb, authUserId, accountIdentifier, me);
      if (isConflict) {
        console.warn(`[Telegram Multi-Tenant Collision]: Account ${accountIdentifier} is already actively connected to another Structra user. Blocking user ${authUserId}.`);
        try { await client.disconnect(); } catch (e) {}
        await clearPendingAuthState(req, authUserId);
        return res.status(409).json({
          success: false,
          error: 'This account is already connected to another Structra account. Disconnect it from that account before connecting it here.',
        });
      }
    }

    // Save persistent authenticated MTProto StringSession with connection timestamp
    const persistentSessionString = client.session.save() as unknown as string;
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const encryptedFinalSession = encryptSessionOrTokens({
      sessionString: persistentSessionString,
      connected_at: nowIso,
      connected_at_ms: nowMs,
      account: accountIdentifier,
    });
    const statusStr = `Connected:${modeVal}`;

    if (sb) {
      const { data: existing } = await sb
        .from('integrations')
        .select('id')
        .eq('user_id', authUserId)
        .eq('provider', 'telegram');

      if (existing && existing.length > 0) {
        await sb.from('integrations').update({
          connected_account: accountIdentifier,
          active_mode: modeVal === 'Secure Index' ? 'secure_index' : 'smart_import',
          oauth_tokens_encrypted: encryptedFinalSession,
          status: statusStr,
          last_sync: nowIso,
          updated_at: nowIso,
        }).eq('id', existing[0].id);
      } else {
        await sb.from('integrations').insert({
          user_id: authUserId,
          provider: 'telegram',
          connected_account: accountIdentifier,
          active_mode: modeVal === 'Secure Index' ? 'secure_index' : 'smart_import',
          oauth_tokens_encrypted: encryptedFinalSession,
          status: statusStr,
          last_sync: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
    }

    // Clean up temporary serverless pending auth state
    await clearPendingAuthState(req, authUserId);
    try { await client.disconnect(); } catch (e) {}

    console.log(`[Telegram MTProto Auth Complete] User ${authUserId.slice(0, 8)} connected as ${accountIdentifier}`);

    return res.json({
      success: true,
      accountIdentifier,
      mode: modeVal,
      message: 'Telegram user account linked successfully via MTProto.',
    });
  } catch (err: any) {
    try { await client.disconnect(); } catch (e) {}
    console.error('[Telegram MTProto Code Verification Error]:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Invalid or expired verification code. Please try again.',
    });
  }
}

export async function handleTelegramVerifyPassword(req: express.Request, res: express.Response) {
  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ success: false, error: 'Authentication required. Missing or invalid Bearer token.' });
  }

  if (!isTelegramEncryptionConfigured()) {
    console.error('[Telegram Security Diagnostic]: TELEGRAM_SESSION_ENCRYPTION_KEY_NOT_CONFIGURED');
    return res.status(503).json({
      success: false,
      error: 'Telegram integration is temporarily unavailable. Please try again later.',
    });
  }

  const { password, selectedMode } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Please enter your Telegram 2FA password.' });
  }

  const pending = await getPendingAuthState(req, authUserId);
  if (!pending) {
    return res.status(400).json({
      success: false,
      error: 'Login session expired or not found. Please restart the login process.',
    });
  }

  const config = getTelegramApiConfig();
  if (!config) {
    console.error('[Telegram Security Diagnostic]: TELEGRAM_API_ID or TELEGRAM_API_HASH missing');
    return res.status(503).json({
      success: false,
      error: 'Telegram integration is temporarily unavailable. Please try again later.',
    });
  }

  const modeVal = selectedMode === 'Secure Index' ? 'Secure Index' : 'Smart Import';
  const decryptedSession = decryptSessionOrTokens(pending.encryptedSession);
  if (!decryptedSession || typeof decryptedSession !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Corrupted or unreadable session state. Please restart login.',
    });
  }

  const client = new TelegramClient(new StringSession(decryptedSession), config.apiId, config.apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.connect();

    try {
      await client.signInWithPassword(
        { apiId: config.apiId, apiHash: config.apiHash },
        {
          password: async () => password.trim(),
          onError: (err: any) => { throw err; },
        }
      );
    } catch (pwdErr: any) {
      try { await client.disconnect(); } catch (e) {}
      const errMsg = (pwdErr.message || pwdErr.errorMessage || '').toUpperCase();
      if (errMsg.includes('PASSWORD_HASH_INVALID')) {
        return res.status(400).json({
          success: false,
          error: 'Incorrect 2FA password. Please check your Telegram cloud password.',
        });
      }
      if (errMsg.includes('FLOOD_WAIT')) {
        return res.status(429).json({
          success: false,
          error: 'Too many attempts. Telegram requires waiting a few moments before trying again.',
        });
      }
      return res.status(400).json({
        success: false,
        error: pwdErr.message || 'Incorrect 2FA password. Please try again.',
      });
    }

    const me: any = await client.getMe();
    const accountIdentifier = me?.username
      ? `@${me.username}`
      : (me?.firstName ? `${me.firstName}${me.lastName ? ' ' + me.lastName : ''}` : (me?.phone ? `+${me.phone}` : 'Telegram User'));

    const sb = getSupabaseClient(req);

    // Multi-Tenant Isolation: Check if this Telegram account is already actively linked to another Structra account
    if (sb) {
      const isConflict = await checkTelegramAccountCollision(sb, authUserId, accountIdentifier, me);
      if (isConflict) {
        console.warn(`[Telegram Multi-Tenant Collision 2FA]: Account ${accountIdentifier} is already actively connected to another Structra user. Blocking user ${authUserId}.`);
        try { await client.disconnect(); } catch (e) {}
        await clearPendingAuthState(req, authUserId);
        return res.status(409).json({
          success: false,
          error: 'This account is already connected to another Structra account. Disconnect it from that account before connecting it here.',
        });
      }
    }

    const persistentSessionString = client.session.save() as unknown as string;
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const encryptedFinalSession = encryptSessionOrTokens({
      sessionString: persistentSessionString,
      connected_at: nowIso,
      connected_at_ms: nowMs,
      account: accountIdentifier,
    });
    const statusStr = `Connected:${modeVal}`;

    if (sb) {
      const { data: existing } = await sb
        .from('integrations')
        .select('id')
        .eq('user_id', authUserId)
        .eq('provider', 'telegram');

      if (existing && existing.length > 0) {
        await sb.from('integrations').update({
          connected_account: accountIdentifier,
          active_mode: modeVal === 'Secure Index' ? 'secure_index' : 'smart_import',
          oauth_tokens_encrypted: encryptedFinalSession,
          status: statusStr,
          last_sync: nowIso,
          updated_at: nowIso,
        }).eq('id', existing[0].id);
      } else {
        await sb.from('integrations').insert({
          user_id: authUserId,
          provider: 'telegram',
          connected_account: accountIdentifier,
          active_mode: modeVal === 'Secure Index' ? 'secure_index' : 'smart_import',
          oauth_tokens_encrypted: encryptedFinalSession,
          status: statusStr,
          last_sync: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
    }

    await clearPendingAuthState(req, authUserId);
    try { await client.disconnect(); } catch (e) {}

    console.log(`[Telegram MTProto 2FA Complete] User ${authUserId.slice(0, 8)} connected as ${accountIdentifier}`);

    return res.json({
      success: true,
      accountIdentifier,
      mode: modeVal,
      message: 'Telegram user account linked successfully with 2FA.',
    });
  } catch (err: any) {
    try { await client.disconnect(); } catch (e) {}
    console.error('[Telegram MTProto 2FA Password Verification Error]:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Incorrect 2FA password. Please try again.',
    });
  }
}

export async function handleTelegramStatus(req: express.Request, res: express.Response) {
  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ success: false, error: 'Authentication required. Missing or invalid Bearer token.' });
  }

  const sb = getSupabaseClient(req);
  let connected = false;
  let mode = 'Smart Import';
  let accountIdentifier: string | null = null;
  let lastSync = 'Never';

  if (sb) {
    try {
      const { data } = await sb
        .from('integrations')
        .select('id, status, active_mode, connected_account, last_sync')
        .eq('user_id', authUserId)
        .eq('provider', 'telegram');

      if (data && data.length > 0) {
        const row = data[0];
        const statusStr = row.status || '';
        connected = statusStr.startsWith('Connected') || statusStr === 'Syncing';
        if (statusStr.includes('Secure Index') || row.active_mode === 'secure_index') mode = 'Secure Index';
        if (statusStr.includes('Smart Import') || row.active_mode === 'smart_import') mode = 'Smart Import';
        if (row.connected_account) accountIdentifier = row.connected_account;
        if (row.last_sync) {
          lastSync = new Date(row.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
    } catch (err) {
      console.warn('[Telegram Status DB Query Notice]:', err);
    }
  }

  return res.json({
    success: true,
    connected,
    accountIdentifier: connected ? (accountIdentifier || 'Connected Telegram Account') : null,
    mode,
    lastSync,
  });
}

export async function handleTelegramConnect(req: express.Request, res: express.Response) {
  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const { accountIdentifier, selectedMode } = req.body || {};
  const modeVal = selectedMode === 'Secure Index' ? 'Secure Index' : 'Smart Import';
  const statusStr = `Connected:${modeVal}`;
  const nowIso = new Date().toISOString();
  let resolvedAccount = accountIdentifier || null;

  const sb = getSupabaseClient(req);
  if (sb && accountIdentifier && typeof accountIdentifier === 'string') {
    const isConflict = await checkTelegramAccountCollision(sb, authUserId, accountIdentifier);
    if (isConflict) {
      return res.status(409).json({
        success: false,
        error: 'This account is already connected to another Structra account. Disconnect it from that account before connecting it here.',
      });
    }
  }

  if (sb) {
    try {
      const { data: existing } = await sb
        .from('integrations')
        .select('id, connected_account')
        .eq('user_id', authUserId)
        .eq('provider', 'telegram');

      if (existing && existing.length > 0) {
        resolvedAccount = accountIdentifier || existing[0].connected_account || null;
        await sb.from('integrations').update({
          connected_account: resolvedAccount,
          active_mode: modeVal === 'Secure Index' ? 'secure_index' : 'smart_import',
          status: statusStr,
          updated_at: nowIso,
        }).eq('id', existing[0].id);
      }
    } catch (err) {
      console.warn('[Telegram Connect DB Error]:', err);
    }
  }

  return res.json({
    success: true,
    connected: true,
    accountIdentifier: resolvedAccount,
    mode: modeVal,
    lastSync: 'Just now',
    message: 'Telegram settings updated.',
  });
}

export async function handleTelegramDisconnect(req: express.Request, res: express.Response) {
  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  await clearPendingAuthState(req, authUserId);

  const sb = getSupabaseClient(req);
  if (sb) {
    try {
      await sb.from('integrations').update({
        status: 'Disconnected',
        oauth_tokens_encrypted: null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', authUserId).eq('provider', 'telegram');
    } catch (err) {
      console.warn('[Telegram Disconnect DB Error]:', err);
    }
  }

  return res.json({
    success: true,
    connected: false,
    message: 'Telegram integration disconnected successfully.',
  });
}

// In-flight sync locks to prevent concurrent sync executions
const activeTelegramSyncLocks = new Set<string>();

export async function handleTelegramSync(req: express.Request, res: express.Response) {
  const startTime = Date.now();
  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ success: false, error: 'Authentication required. Missing Bearer token.' });
  }

  if (!isTelegramEncryptionConfigured()) {
    console.error('[Telegram Security Diagnostic]: TELEGRAM_SESSION_ENCRYPTION_KEY_NOT_CONFIGURED');
    return res.status(503).json({
      success: false,
      error: 'Telegram integration is temporarily unavailable. Please try again later.',
    });
  }

  const { mode: reqMode } = req.body || {};
  const modeVal: 'Smart Import' | 'Secure Index' = reqMode === 'Secure Index' ? 'Secure Index' : 'Smart Import';
  const nowIso = new Date().toISOString();

  // Prevent concurrent sync executions for the same user
  const syncLockKey = `${authUserId}:telegram`;
  if (activeTelegramSyncLocks.has(syncLockKey)) {
    return res.json({
      success: true,
      mode: modeVal,
      countDiscovered: 0,
      countImported: 0,
      countIndexed: 0,
      countDuplicates: 0,
      message: 'Telegram sync is already in progress.',
      createdDocuments: [],
    });
  }
  activeTelegramSyncLocks.add(syncLockKey);

  console.log(`[Telegram MTProto Sync] User ${authUserId.slice(0, 8)}... (Mode: ${modeVal})`);

  const sb = getSupabaseClient(req);
  if (!sb) {
    activeTelegramSyncLocks.delete(syncLockKey);
    return res.status(500).json({ success: false, error: 'Database client unavailable.' });
  }

  const { data: intData, error: intErr } = await sb
    .from('integrations')
    .select('id, oauth_tokens_encrypted, created_at')
    .eq('user_id', authUserId)
    .eq('provider', 'telegram')
    .single();

  if (intErr || !intData || !intData.oauth_tokens_encrypted) {
    activeTelegramSyncLocks.delete(syncLockKey);
    return res.status(401).json({
      success: false,
      error: 'Telegram account is not connected. Please connect your Telegram account first.',
    });
  }

  const decryptedSession = decryptSessionOrTokens(intData.oauth_tokens_encrypted);
  const sessionString = typeof decryptedSession === 'string' ? decryptedSession : (decryptedSession?.sessionString || '');

  let connectedAtMs = 0;
  if (decryptedSession && typeof decryptedSession === 'object') {
    if (decryptedSession.connected_at_ms) {
      connectedAtMs = Number(decryptedSession.connected_at_ms);
    } else if (decryptedSession.connected_at) {
      connectedAtMs = new Date(decryptedSession.connected_at).getTime();
    }
  }
  if (!connectedAtMs && intData.created_at) {
    connectedAtMs = new Date(intData.created_at).getTime();
  }
  const connectedAtSec = connectedAtMs > 0 ? Math.floor(connectedAtMs / 1000) : 0;

  // Rule 2: Incremental checkpoint boundary (lastSyncedAtSec)
  const lastSyncedAtSec = (decryptedSession && typeof decryptedSession === 'object' && decryptedSession.last_synced_at_sec)
    ? Number(decryptedSession.last_synced_at_sec)
    : ((decryptedSession && typeof decryptedSession === 'object' && decryptedSession.last_synced_at)
      ? Math.floor(new Date(decryptedSession.last_synced_at).getTime() / 1000)
      : 0);

  // Effective sync boundary: must be >= connectedAtSec AND >= lastSyncedAtSec
  const incrementalBoundarySec = Math.max(connectedAtSec, lastSyncedAtSec);

  console.log(`[Telegram MTProto Sync] Boundaries: connectedAt=${connectedAtSec ? new Date(connectedAtSec * 1000).toISOString() : 'none'}, lastSyncedAt=${lastSyncedAtSec ? new Date(lastSyncedAtSec * 1000).toISOString() : 'none'}, effectiveBoundary=${incrementalBoundarySec ? new Date(incrementalBoundarySec * 1000).toISOString() : 'none'}`);

  if (!sessionString) {
    activeTelegramSyncLocks.delete(syncLockKey);
    return res.status(401).json({
      success: false,
      error: 'Telegram session expired. Please re-authenticate your Telegram account.',
    });
  }

  const config = getTelegramApiConfig();
  if (!config) {
    activeTelegramSyncLocks.delete(syncLockKey);
    return res.status(500).json({
      success: false,
      error: 'Telegram API credentials (TELEGRAM_API_ID and TELEGRAM_API_HASH) are not configured on the server.',
    });
  }

  const client = new TelegramClient(new StringSession(sessionString), config.apiId, config.apiHash, {
    connectionRetries: 3,
  });

  const createdDocs: any[] = [];
  let countDiscovered = 0;
  let countImported = 0;
  let countIndexed = 0;
  let countDuplicates = 0;

  try {
    await client.connect();

    const isAuthorized = await client.isUserAuthorized();
    if (!isAuthorized) {
      await sb.from('integrations').update({
        status: 'Disconnected',
        oauth_tokens_encrypted: null,
        updated_at: nowIso,
      }).eq('id', intData.id);

      try { await client.disconnect(); } catch (e) {}
      return res.status(401).json({
        success: false,
        error: 'Telegram session has expired. Please re-authenticate.',
      });
    }

    const existingDocNames = new Set<string>();
    const existingTgMessageIds = new Set<string>();
    const existingMediaIds = new Set<string>();

    const { data: existingDocs } = await sb
      .from('documents')
      .select('original_filename, file_name, document_metadata(extracted_entities)')
      .eq('owner_id', authUserId)
      .in('upload_source', ['telegram', 'Telegram'])
      .eq('is_deleted', false);

    if (existingDocs) {
      for (const doc of existingDocs) {
        if (doc.original_filename) existingDocNames.add(doc.original_filename.toLowerCase().trim());
        if (doc.file_name) existingDocNames.add(doc.file_name.toLowerCase().trim());
        const meta = Array.isArray(doc.document_metadata) ? doc.document_metadata[0] : doc.document_metadata;
        const entities = meta?.extracted_entities || {};
        if (entities.telegramMessageId) existingTgMessageIds.add(String(entities.telegramMessageId));
        if (entities.telegramMediaId) existingMediaIds.add(String(entities.telegramMediaId));
        if (entities.messageId) existingTgMessageIds.add(String(entities.messageId));
      }
    }

    // Collect messages containing document or photo attachments across chats/dialogs, Saved Messages, and Global Search
    const rawMessages: any[] = [];
    const seenMsgKeys = new Set<string>();

    const addMessageIfNew = (m: any, peerStr: string) => {
      if (!m || !m.id) return;
      const mDateSec = typeof m.date === 'number' ? m.date : (m.date ? Math.floor(new Date(m.date).getTime() / 1000) : 0);
      // Skip if older than incremental boundary (connected_at or last_synced_at)
      if (incrementalBoundarySec > 0 && mDateSec > 0 && mDateSec < incrementalBoundarySec) {
        return;
      }
      const key = `${peerStr}_${m.id}`;
      if (!seenMsgKeys.has(key)) {
        seenMsgKeys.add(key);
        (m as any)._peerStr = peerStr;
        rawMessages.push(m);
      }
    };

    // 1. Saved Messages ('me'): Query recent messages as well as document and photo filters
    try {
      const savedMsgs = await client.getMessages('me', { limit: 50 });
      for (const m of savedMsgs) {
        if (m && m.media) addMessageIfNew(m, 'me');
      }
      try {
        const savedDocs = await client.getMessages('me', {
          filter: new Api.InputMessagesFilterDocument(),
          limit: 50,
        });
        for (const m of savedDocs) {
          if (m && m.media) addMessageIfNew(m, 'me');
        }
      } catch (docFilterErr) {}

      try {
        const savedPhotos = await client.getMessages('me', {
          filter: new Api.InputMessagesFilterPhotos(),
          limit: 30,
        });
        for (const m of savedPhotos) {
          if (m && m.media) addMessageIfNew(m, 'me');
        }
      } catch (photoFilterErr) {}
    } catch (meErr) {
      console.warn('[Telegram Sync Saved Messages Notice]:', meErr);
    }

    // 2. Recent Dialogs / Chats: Scan recent dialogs with both general and document filters
    try {
      const dialogs = await client.getDialogs({ limit: 30 });
      for (const dialog of dialogs) {
        try {
          const peerEntity = dialog.entity || dialog.inputEntity;
          const peerId = dialog.id ? String(dialog.id) : (dialog.entity?.id ? String(dialog.entity.id) : 'chat');
          
          const msgs = await client.getMessages(peerEntity, { limit: 30 });
          for (const m of msgs) {
            if (m && m.media) addMessageIfNew(m, peerId);
          }

          try {
            const peerDocs = await client.getMessages(peerEntity, {
              filter: new Api.InputMessagesFilterDocument(),
              limit: 30,
            });
            for (const m of peerDocs) {
              if (m && m.media) addMessageIfNew(m, peerId);
            }
          } catch (pDocErr) {}
        } catch (dErr) {}
      }
    } catch (dialogErr) {
      console.warn('[Telegram Sync Dialogs Notice]:', dialogErr);
    }

    // 3. SearchGlobal across entire Telegram account for documents and photos bounded by incremental checkpoint
    const searchMinDate = incrementalBoundarySec > 0 ? Math.max(0, incrementalBoundarySec - 60) : 0;
    try {
      const globalDocRes = await client.invoke(
        new Api.messages.SearchGlobal({
          q: '',
          filter: new Api.InputMessagesFilterDocument(),
          minDate: searchMinDate,
          maxDate: 0,
          offsetRate: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          offsetId: 0,
          limit: 50,
        })
      );
      const globalDocs = (globalDocRes as any)?.messages || [];
      for (const m of globalDocs) {
        if (m && m.media) addMessageIfNew(m, 'global');
      }
    } catch (gErr) {
      console.warn('[Telegram Global Document Search Notice]:', gErr);
    }

    try {
      const globalPhotoRes = await client.invoke(
        new Api.messages.SearchGlobal({
          q: '',
          filter: new Api.InputMessagesFilterPhotos(),
          minDate: searchMinDate,
          maxDate: 0,
          offsetRate: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          offsetId: 0,
          limit: 30,
        })
      );
      const globalPhotos = (globalPhotoRes as any)?.messages || [];
      for (const m of globalPhotos) {
        if (m && m.media) addMessageIfNew(m, 'global');
      }
    } catch (gPhotoErr) {
      console.warn('[Telegram Global Photo Search Notice]:', gPhotoErr);
    }

    const supportedExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.txt', '.csv'];
    const ai = getGeminiClient();
    let minFailedMsgDateSec = Infinity;

    if (rawMessages.length === 0) {
      const newLastSyncedAtSec = Math.floor(startTime / 1000);
      const updatedSessionPayload = {
        ...(typeof decryptedSession === 'object' && decryptedSession !== null ? decryptedSession : { sessionString }),
        last_synced_at: new Date(newLastSyncedAtSec * 1000).toISOString(),
        last_synced_at_sec: newLastSyncedAtSec,
      };
      const newEncrypted = encryptSessionOrTokens(updatedSessionPayload);

      await sb.from('integrations').update({
        last_sync: nowIso,
        status: `Connected:${modeVal}`,
        oauth_tokens_encrypted: newEncrypted,
        updated_at: nowIso,
      }).eq('id', intData.id);

      try { await client.disconnect(); } catch (e) {}

      console.log(`[Telegram MTProto Sync] Finished in ${Date.now() - startTime}ms. No new messages.`);
      return res.json({
        success: true,
        mode: modeVal,
        countDiscovered: 0,
        countImported: 0,
        countIndexed: 0,
        countDuplicates: 0,
        message: 'Sync completed. No new Telegram attachments found.',
        createdDocuments: [],
      });
    }

    for (const msg of rawMessages.slice(0, 50)) {
      let msgDateSec = 0;
      try {
        const docMedia = msg.media?.document || msg.document;
        const photoMedia = msg.media?.photo || msg.photo;
        if (!docMedia && !photoMedia) continue;

        // Authoritative Telegram message timestamp check
        msgDateSec = typeof msg.date === 'number' ? msg.date : (msg.date ? Math.floor(new Date(msg.date).getTime() / 1000) : 0);

        // Rule 1: Skip historical messages before connected_at
        if (connectedAtSec > 0 && msgDateSec > 0 && msgDateSec < connectedAtSec) {
          console.log(`[Telegram Sync] Skipping historical message ${msg.id} (msgDate: ${new Date(msgDateSec * 1000).toISOString()} < connectedAt: ${new Date(connectedAtSec * 1000).toISOString()})`);
          continue;
        }

        // Rule 2: Skip already-synced messages before incremental checkpoint
        if (lastSyncedAtSec > 0 && msgDateSec > 0 && msgDateSec < lastSyncedAtSec) {
          console.log(`[Telegram Sync] Skipping already-synced message ${msg.id} (msgDate: ${new Date(msgDateSec * 1000).toISOString()} < checkpoint: ${new Date(lastSyncedAtSec * 1000).toISOString()})`);
          continue;
        }

        const peerStr = (msg as any)._peerStr || (msg.peerId?.channelId || msg.peerId?.chatId || msg.peerId?.userId || 'tg');
        const uniqueMsgKey = `${peerStr}_${msg.id}`;
        const mediaIdStr = docMedia?.id ? String(docMedia.id) : (photoMedia?.id ? String(photoMedia.id) : null);

        let fileName = '';
        let mimeType = '';

        if (docMedia) {
          mimeType = docMedia.mimeType || 'application/pdf';
          if (docMedia.attributes && Array.isArray(docMedia.attributes)) {
            for (const attr of docMedia.attributes) {
              if (attr.fileName) {
                fileName = attr.fileName;
                break;
              } else if (attr.title) {
                fileName = attr.title;
                break;
              }
            }
          }
          if (!fileName) {
            const extInferred = mimeType.includes('pdf') ? '.pdf' :
              mimeType.includes('word') || mimeType.includes('officedocument') ? '.docx' :
              mimeType.includes('png') ? '.png' :
              mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' :
              mimeType.includes('sheet') || mimeType.includes('excel') ? '.xlsx' : '.pdf';
            fileName = `telegram_doc_${msg.id}${extInferred}`;
          }
        } else if (photoMedia) {
          mimeType = 'image/jpeg';
          fileName = `telegram_photo_${msg.id}.jpg`;
        }

        const ext = path.extname(fileName).toLowerCase() || (mimeType.includes('image') ? '.jpg' : '.pdf');
        if (!supportedExtensions.includes(ext)) continue;

        countDiscovered++;
        const normFileName = fileName.toLowerCase().trim();

        // Reliable Telegram message & media deduplication (do NOT reject based solely on common filenames)
        const isDuplicateMsg = existingTgMessageIds.has(uniqueMsgKey) || existingTgMessageIds.has(String(msg.id));
        const isDuplicateMedia = mediaIdStr ? existingMediaIds.has(mediaIdStr) : false;

        if (isDuplicateMsg || isDuplicateMedia) {
          countDuplicates++;
          continue;
        }

        // Download media binary buffer from Telegram MTProto
        const buffer = (await client.downloadMedia(msg, {})) as Buffer;
        if (!buffer || buffer.length === 0) {
          console.warn(`[Telegram Download Notice]: Empty buffer for message ${msg.id}`);
          if (msgDateSec > 0) minFailedMsgDateSec = Math.min(minFailedMsgDateSec, msgDateSec);
          continue;
        }

        const base64Data = buffer.toString('base64');
        const fileSize = buffer.length;
        if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        const dateStr = msg.date ? new Date(msg.date * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // Sender information
        let senderName = 'Telegram Contact / Channel';
        try {
          if (msg.sender) {
            const s = msg.sender as any;
            senderName = s.title || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.username || senderName;
          }
        } catch (sErr) {}

        // Run AI analysis / OCR with Gemini
        let aiResult: any = null;
        if (ai) {
          try {
            const promptText = `Analyze this Telegram document ("${fileName}") from "${senderName}". Perform OCR, classification, smart tagging, and content summarization.
Allowed categories: "Invoices", "Receipts", "Contracts", "Payment Confirmations", "Quotations", "Academic Documents", "Reports", "Certificates", "Others".

Return strictly JSON matching this structure:
{
  "category": "Invoices",
  "tags": ["Telegram", "Tag1", "Tag2"],
  "contentSummary": "Detailed summary of document purpose and contents.",
  "rawText": "Extracted key text snippet...",
  "metadata": {
    "vendor": "${senderName}",
    "issueDate": "${dateStr}",
    "totalAmount": "Amount if present or N/A",
    "confidenceScore": 0.96
  }
}`;

            if (['application/pdf', 'image/png', 'image/jpeg'].includes(mimeType)) {
              let response: any = null;
              try {
                response = await ai.models.generateContent({
                  model: 'gemini-3.6-flash',
                  contents: [
                    {
                      role: 'user',
                      parts: [
                        { text: promptText },
                        { inlineData: { mimeType, data: base64Data } },
                      ],
                    },
                  ],
                  config: { responseMimeType: 'application/json' },
                });
              } catch (modelErr) {
                response = await ai.models.generateContent({
                  model: 'gemini-3.7-flash',
                  contents: [
                    {
                      role: 'user',
                      parts: [
                        { text: promptText },
                        { inlineData: { mimeType, data: base64Data } },
                      ],
                    },
                  ],
                  config: { responseMimeType: 'application/json' },
                });
              }
              if (response?.text) aiResult = JSON.parse(response.text);
            } else if (ext === '.docx') {
              const mammothRes = await mammoth.extractRawText({ buffer });
              const docxText = mammothRes.value || '';
              let response: any = null;
              try {
                response = await ai.models.generateContent({
                  model: 'gemini-3.6-flash',
                  contents: [
                    {
                      role: 'user',
                      parts: [{ text: `${promptText}\n\nDocument Text:\n${docxText.slice(0, 10000)}` }],
                    },
                  ],
                  config: { responseMimeType: 'application/json' },
                });
              } catch (modelErr) {
                response = await ai.models.generateContent({
                  model: 'gemini-3.7-flash',
                  contents: [
                    {
                      role: 'user',
                      parts: [{ text: `${promptText}\n\nDocument Text:\n${docxText.slice(0, 10000)}` }],
                    },
                  ],
                  config: { responseMimeType: 'application/json' },
                });
              }
              if (response.text) aiResult = JSON.parse(response.text);
            }
          } catch (aiErr) {
            console.warn(`[Telegram Gemini Analysis Notice for ${fileName}]:`, aiErr);
          }
        }

        const resolvedCategory = normalizeDocCategory(
          aiResult?.category || 'Others',
          fileName,
          aiResult?.rawText || ''
        );

        const docUuid = crypto.randomUUID();
        let storageFilePath: string | null = null;
        let publicStorageUrl: string | null = null;

        // Upload physical file binary to Supabase Storage bucket 'documents' ONLY in Smart Import mode
        if (modeVal === 'Smart Import') {
          storageFilePath = `${authUserId}/telegram/${docUuid}_${fileName}`;
          try {
            const { data: storageData, error: storageErr } = await sb.storage
              .from('documents')
              .upload(storageFilePath, buffer, {
                contentType: mimeType,
                upsert: true,
              });

            if (!storageErr && storageData?.path) {
              const { data: pubUrlData } = sb.storage.from('documents').getPublicUrl(storageData.path);
              publicStorageUrl = pubUrlData?.publicUrl || null;
            } else if (storageErr) {
              console.warn(`[Telegram Storage Upload Notice] (${fileName}):`, storageErr.message);
            }
          } catch (storageEx) {
            console.warn(`[Telegram Storage Upload Exception] (${fileName}):`, storageEx);
          }

          if (!publicStorageUrl) {
            publicStorageUrl = `data:${mimeType};base64,${base64Data}`;
          }
        }

        const documentRow = {
          id: docUuid,
          owner_id: authUserId,
          file_name: fileName,
          original_filename: fileName,
          file_type: ext.replace('.', '').toUpperCase() || 'PDF',
          mime_type: mimeType,
          file_size: fileSize,
          upload_source: 'telegram',
          upload_status: 'completed',
          supabase_storage_url: publicStorageUrl,
          storage_path: storageFilePath,
          is_favorite: false,
          is_deleted: false,
          created_at: nowIso,
          updated_at: nowIso,
        };

        const cleanChannelPeer = peerStr ? peerStr.replace(/^-100/, '').replace(/^-/, '') : '';
        const telegramDeepLink = cleanChannelPeer && msg.id
          ? `https://t.me/c/${cleanChannelPeer}/${msg.id}`
          : 'https://web.telegram.org';

        const metadataRow = {
          document_id: docUuid,
          title: fileName,
          category: resolvedCategory,
          tags: Array.isArray(aiResult?.tags) && aiResult.tags.length > 0 ? aiResult.tags : ['Telegram', resolvedCategory],
          ocr_text: aiResult?.rawText || `Telegram Document: ${fileName}`,
          ai_summary: modeVal === 'Smart Import'
            ? (aiResult?.contentSummary || `Imported Telegram document (${fileName}).`)
            : `${aiResult?.contentSummary || 'Indexed Telegram document'} (Secure Indexed from Telegram)`,
          extracted_entities: {
            ...(aiResult?.metadata || {}),
            vendor: aiResult?.metadata?.vendor || senderName,
            issueDate: aiResult?.metadata?.issueDate || dateStr,
            totalAmount: aiResult?.metadata?.totalAmount || 'N/A',
            channelId: cleanChannelPeer || undefined,
            messageId: String(msg.id),
            telegramMessageId: uniqueMsgKey,
            telegramMediaId: mediaIdStr || undefined,
            confidenceScore: aiResult?.metadata?.confidenceScore || 0.95,
            mode: modeVal,
            sourceUrl: telegramDeepLink,
          },
          created_at: nowIso,
          updated_at: nowIso,
        };

        const { error: docErr } = await sb.from('documents').upsert(documentRow);
        if (docErr) {
          console.error(`[Telegram Sync DB Document Error] (${fileName}):`, docErr.message);
          if (msgDateSec > 0) minFailedMsgDateSec = Math.min(minFailedMsgDateSec, msgDateSec);
          continue; // CRITICAL: Do NOT count as indexed if DB write failed!
        }

        const { error: metaErr } = await sb.from('document_metadata').upsert(metadataRow, { onConflict: 'document_id' });
        if (metaErr) {
          console.warn(`[Telegram Sync DB Metadata Notice] (${fileName}):`, metaErr.message);
        }

        // Generate vector embeddings & chunk
        const fullSearchText = `Document: ${fileName}\nCategory: ${resolvedCategory}\nSummary: ${metadataRow.ai_summary}\nText: ${metadataRow.ocr_text}`;
        const embedding = await generateVector(fullSearchText);
        if (embedding) {
          try {
            await sb.from('document_chunks').insert({
              document_id: docUuid,
              user_id: authUserId,
              chunk_index: 0,
              chunk_text: fullSearchText,
              embedding: embedding,
              page_number: 1,
              created_at: nowIso,
            });
          } catch (chunkErr) {
            console.warn('[Telegram Chunk Insert Notice]:', chunkErr);
          }
        }

        existingDocNames.add(normFileName);
        existingTgMessageIds.add(uniqueMsgKey);
        if (mediaIdStr) existingMediaIds.add(mediaIdStr);

        countIndexed++;
        if (modeVal === 'Smart Import') countImported++;

        const rawExt = (fileName.includes('.') ? fileName.split('.').pop() : 'PDF') || 'PDF';
        const validFileTypes = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'PNG', 'JPG', 'TXT'] as const;
        const canonicalFileType = validFileTypes.includes(rawExt.toUpperCase() as any) ? (rawExt.toUpperCase() as any) : 'PDF';

        createdDocs.push({
          id: docUuid,
          title: fileName,
          original_filename: fileName,
          file_name: fileName,
          category: resolvedCategory,
          size: fileSize,
          fileSize: fileSize,
          sizeFormatted: formatBytes(fileSize),
          fileType: canonicalFileType,
          uploadDate: dateStr,
          modifiedDate: dateStr,
          isFavorite: false,
          isTrash: false,
          source: 'Telegram',
          upload_source: 'telegram',
          sourceId: docUuid,
          importStatus: modeVal === 'Smart Import' ? 'Imported' : 'External',
          mode: modeVal,
          confidence: aiResult?.metadata?.confidenceScore || 0.95,
          tags: metadataRow.tags,
          contentSummary: metadataRow.ai_summary,
          rawText: metadataRow.ocr_text,
          metadata: metadataRow.extracted_entities,
          isSmartImport: modeVal === 'Smart Import',
          fileUrl: publicStorageUrl || '',
          previewUrl: publicStorageUrl || undefined,
        });
      } catch (docErr) {
        console.warn('[Telegram Document Sync Error]:', docErr);
        if (msgDateSec > 0) minFailedMsgDateSec = Math.min(minFailedMsgDateSec, msgDateSec);
      }
    }

    // 4. Update incremental sync checkpoint safely in encrypted session
    let newLastSyncedAtSec = Math.floor(startTime / 1000);
    if (minFailedMsgDateSec !== Infinity && minFailedMsgDateSec > 0) {
      newLastSyncedAtSec = Math.max(lastSyncedAtSec, minFailedMsgDateSec - 1);
    }

    const updatedSessionPayload = {
      ...(typeof decryptedSession === 'object' && decryptedSession !== null ? decryptedSession : { sessionString }),
      last_synced_at: new Date(newLastSyncedAtSec * 1000).toISOString(),
      last_synced_at_sec: newLastSyncedAtSec,
    };
    const newEncrypted = encryptSessionOrTokens(updatedSessionPayload);

    await sb.from('integrations').update({
      last_sync: nowIso,
      status: `Connected:${modeVal}`,
      oauth_tokens_encrypted: newEncrypted,
      updated_at: nowIso,
    }).eq('id', intData.id);

    try { await client.disconnect(); } catch (e) {}

    console.log(`[Telegram MTProto Sync] Finished in ${Date.now() - startTime}ms. Discovered: ${countDiscovered}, Indexed: ${countIndexed}, NewCheckpoint: ${new Date(newLastSyncedAtSec * 1000).toISOString()}`);

    return res.json({
      success: true,
      mode: modeVal,
      countDiscovered,
      countImported,
      countIndexed,
      countDuplicates,
      message: `Telegram sync completed in ${modeVal} mode. ${countIndexed} documents indexed.`,
      createdDocuments: createdDocs,
    });
  } catch (syncErr: any) {
    try { await client.disconnect(); } catch (e) {}
    console.error('[Telegram MTProto Sync Exception]:', syncErr);
    return res.status(500).json({
      success: false,
      error: syncErr.message || 'An error occurred during Telegram MTProto synchronization.',
    });
  } finally {
    activeTelegramSyncLocks.delete(syncLockKey);
  }
}

export async function handleTelegramUserDocuments(req: express.Request, res: express.Response) {
  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const sb = getSupabaseClient(req);
  if (!sb) {
    return res.json({ success: true, documents: [] });
  }

  try {
    const { data: docs } = await sb
      .from('documents')
      .select('id, owner_id, file_name, original_filename, file_size, file_type, upload_source, upload_status, supabase_storage_url, storage_path, created_at, updated_at, is_favorite, is_deleted, deleted_at, document_metadata(title, category, tags, ai_summary, ocr_text, extracted_entities)')
      .eq('owner_id', authUserId)
      .in('upload_source', ['telegram', 'Telegram'])
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    const formatted = (docs || []).map((d: any) => {
      const meta = Array.isArray(d.document_metadata) ? (d.document_metadata[0] || {}) : (d.document_metadata || {});
      const rawTitle = meta?.title || d.original_filename || d.file_name || 'Untitled Telegram Document';
      const modeVal = d.supabase_storage_url ? 'Smart Import' : 'Secure Index';
      const rawExt = (d.file_type || (rawTitle.includes('.') ? rawTitle.split('.').pop() : 'PDF') || 'PDF').toUpperCase().trim();
      const validFileTypes = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'PNG', 'JPG', 'TXT'] as const;
      const canonicalFileType = validFileTypes.includes(rawExt as any) ? (rawExt as any) : 'PDF';
      const fileSizeNum = Number(d.file_size) || 0;

      return {
        id: d.id,
        title: rawTitle,
        original_filename: d.original_filename || d.file_name,
        file_name: d.file_name || d.original_filename,
        category: normalizeDocCategory(meta?.category, rawTitle, meta?.ocr_text),
        source: 'Telegram',
        upload_source: 'telegram',
        sourceId: d.id,
        importStatus: modeVal === 'Smart Import' ? 'Imported' : 'External',
        fileType: canonicalFileType,
        fileSize: fileSizeNum,
        size: fileSizeNum,
        sizeFormatted: formatBytes(fileSizeNum),
        uploadDate: d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        modifiedDate: d.updated_at ? new Date(d.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        tags: Array.isArray(meta?.tags) && meta.tags.length > 0 ? meta.tags : ['Telegram'],
        isFavorite: !!d.is_favorite,
        isTrash: !!d.is_deleted,
        deletedAt: d.deleted_at || undefined,
        contentSummary: meta?.ai_summary || '',
        rawText: meta?.ocr_text || '',
        metadata: meta?.extracted_entities || {},
        fileUrl: d.supabase_storage_url || d.storage_path || '',
        previewUrl: d.supabase_storage_url || d.storage_path || undefined,
        mode: modeVal,
        confidence: meta?.extracted_entities?.confidenceScore || 0.95,
        isSmartImport: modeVal === 'Smart Import',
      };
    });

    return res.json({ success: true, documents: formatted });
  } catch (err) {
    console.warn('[Fetch Telegram Documents DB Error]:', err);
    return res.json({ success: true, documents: [] });
  }
}
