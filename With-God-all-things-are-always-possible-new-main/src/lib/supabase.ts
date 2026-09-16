import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://ehoddaeffpiyhivlmfcj.supabase.co';

function getSanitizedSupabaseUrl(): string {
  const envObj = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});
  let rawUrl = (envObj as any).VITE_SUPABASE_URL || (envObj as any).SUPABASE_URL;
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return FALLBACK_URL;
  }
  rawUrl = rawUrl.trim();
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = 'https://' + rawUrl;
  }
  // Remove trailing /rest/v1 or slashes
  rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');

  try {
    const parsed = new URL(rawUrl);
    return parsed.origin;
  } catch {
    return FALLBACK_URL;
  }
}

function getSanitizedSupabaseKey(): string {
  const envObj = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});
  const rawKey = (envObj as any).VITE_SUPABASE_ANON_KEY || (envObj as any).SUPABASE_ANON_KEY;
  if (typeof rawKey === 'string' && rawKey.trim().length > 0) {
    return rawKey.trim();
  }
  return '';
}

const supabaseUrl = getSanitizedSupabaseUrl();
const supabaseAnonKey = getSanitizedSupabaseKey();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});


