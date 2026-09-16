import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ShareRecord {
  id: string;
  documentId: string;
  ownerId: string;
  tokenHash: string;
  rawToken?: string;
  allowDownload: boolean;
  expiresAt: string | null;
  isRevoked: boolean;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  // Preserved original document metadata
  originalFilename: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  originalStorageUrl?: string;
  originalBinaryBuffer?: Buffer;
}

// In-memory & disk fallback store for share records
const shareStore = new Map<string, ShareRecord>(); // Keyed by tokenHash
const docToShareStore = new Map<string, string>(); // docId -> tokenHash

const TEMP_SHARE_DIR = path.join(process.cwd(), '.share-store');
if (!fs.existsSync(TEMP_SHARE_DIR)) {
  try {
    fs.mkdirSync(TEMP_SHARE_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create share store dir:', e);
  }
}

/**
 * Deterministically hash a raw share token with SHA-256 for secure storage at rest
 */
export function hashShareToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Generate a cryptographically secure random token for sharing (64 hex characters)
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Resolve correct MIME type for original file
 */
export function getOriginalMimeType(fileName: string, fileType?: string): string {
  const ext = (fileName.split('.').pop() || fileType || '').toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'txt':
      return 'text/plain; charset=utf-8';
    case 'csv':
      return 'text/csv; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Resolves the true canonical MIME type.
 * Never blindly trusts generic or incorrect DB MIME types like 'text/plain' or 'application/octet-stream'
 * when the actual file extension or type clearly indicates a specific format (DOCX, XLSX, PDF, etc.).
 */
export function resolveCanonicalMimeType(storedMime?: string, fileName?: string, fileType?: string): string {
  const derived = getOriginalMimeType(fileName || '', fileType);
  const raw = (storedMime || '').trim().toLowerCase();

  if (!raw || raw === 'text/plain' || raw === 'application/octet-stream') {
    return derived;
  }

  const ext = ((fileName || '').split('.').pop() || fileType || '').toLowerCase();
  const isOfficeOrPdf = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext);
  if (isOfficeOrPdf && raw !== derived) {
    return derived;
  }

  return storedMime!;
}

/**
 * Save share record to memory & local storage
 */
export function persistLocalShare(record: ShareRecord): void {
  shareStore.set(record.tokenHash, record);
  docToShareStore.set(record.documentId, record.tokenHash);
  try {
    const filePath = path.join(TEMP_SHARE_DIR, `${record.tokenHash}.json`);
    // Avoid saving binary buffer in JSON
    const { originalBinaryBuffer, ...serializable } = record;
    fs.writeFileSync(filePath, JSON.stringify(serializable, null, 2));
  } catch (e) {
    console.warn('[Share Store] Disk persist notice:', e);
  }
}

/**
 * Retrieve share record from memory or local storage
 */
export function getLocalShareByTokenHash(tokenHash: string): ShareRecord | null {
  if (shareStore.has(tokenHash)) {
    return shareStore.get(tokenHash)!;
  }
  try {
    const filePath = path.join(TEMP_SHARE_DIR, `${tokenHash}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      shareStore.set(tokenHash, data);
      docToShareStore.set(data.documentId, tokenHash);
      return data;
    }
  } catch (e) {
    console.warn('[Share Store] Disk read notice:', e);
  }
  return null;
}

/**
 * Retrieve share record for a document ID
 */
export function getLocalShareByDocId(docId: string): ShareRecord | null {
  const tokenHash = docToShareStore.get(docId);
  if (tokenHash) {
    return getLocalShareByTokenHash(tokenHash);
  }
  return null;
}

/**
 * Create or update a document share record
 */
export async function createOrUpdateShare(
  sbClient: SupabaseClient | null,
  options: {
    documentId: string;
    ownerId: string;
    allowDownload?: boolean;
    expiresAt?: string | null;
    originalFilename: string;
    fileType: string;
    fileSize: number;
    originalStorageUrl?: string;
    originalBinaryBuffer?: Buffer;
  }
): Promise<{ rawToken: string; shareRecord: ShareRecord }> {
  const rawToken = generateShareToken();
  const tokenHash = hashShareToken(rawToken);
  const now = new Date().toISOString();

  const record: ShareRecord = {
    id: `share_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    documentId: options.documentId,
    ownerId: options.ownerId,
    tokenHash,
    rawToken,
    allowDownload: options.allowDownload ?? true,
    expiresAt: options.expiresAt || null,
    isRevoked: false,
    viewCount: 0,
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
    originalFilename: options.originalFilename,
    fileType: options.fileType,
    mimeType: getOriginalMimeType(options.originalFilename, options.fileType),
    fileSize: options.fileSize,
    originalStorageUrl: options.originalStorageUrl,
    originalBinaryBuffer: options.originalBinaryBuffer,
  };

  // 1. Save to local fallback cache
  persistLocalShare(record);

  // 2. Persist to Supabase shared_documents table if database client available
  if (sbClient) {
    try {
      await sbClient.from('shared_documents').insert({
        document_id: options.documentId,
        shared_by_user_id: options.ownerId,
        share_token: tokenHash,
        allow_download: record.allowDownload,
        expires_at: record.expiresAt,
        is_revoked: false,
        view_count: 0,
        download_count: 0,
        created_at: now,
        updated_at: now,
      });

      // Audit Log
      await sbClient.from('audit_logs').insert({
        user_id: options.ownerId,
        action: 'share_created',
        resource_type: 'document',
        resource_id: options.documentId,
        details: {
          token_hash: tokenHash,
          allow_download: record.allowDownload,
          expires_at: record.expiresAt,
        },
        created_at: now,
      });
    } catch (dbErr) {
      console.warn('[Supabase Share DB Insert Notice]:', dbErr);
    }
  }

  return { rawToken, shareRecord: record };
}

/**
 * Revoke an existing share for a document
 */
export async function revokeShare(
  sbClient: SupabaseClient | null,
  documentId: string,
  ownerId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const tokenHash = docToShareStore.get(documentId);
  if (tokenHash) {
    const local = getLocalShareByTokenHash(tokenHash);
    if (local && local.ownerId === ownerId) {
      local.isRevoked = true;
      local.updatedAt = now;
      persistLocalShare(local);
    }
  }

  if (sbClient) {
    try {
      await sbClient
        .from('shared_documents')
        .update({ is_revoked: true, updated_at: now })
        .eq('document_id', documentId)
        .eq('shared_by_user_id', ownerId);

      // Audit Log
      await sbClient.from('audit_logs').insert({
        user_id: ownerId,
        action: 'share_revoked',
        resource_type: 'document',
        resource_id: documentId,
        details: { revoked_at: now },
        created_at: now,
      });
      return true;
    } catch (e) {
      console.warn('[Supabase Share Revoke Notice]:', e);
    }
  }
  return true;
}

/**
 * Validate incoming raw token and resolve share record
 */
export async function validateAndResolveShare(
  sbClient: SupabaseClient | null,
  rawToken: string
): Promise<{
  valid: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND';
  message: string;
  shareRecord?: ShareRecord;
}> {
  if (!rawToken || typeof rawToken !== 'string') {
    return {
      valid: false,
      status: 'NOT_FOUND',
      message: 'This share link is no longer available.',
    };
  }

  const tokenHash = hashShareToken(rawToken);

  // 1. Check local store
  let record = getLocalShareByTokenHash(tokenHash);

  // 2. Check Supabase DB if not in local memory/disk
  if (!record && sbClient) {
    try {
      const { data, error } = await sbClient
        .from('shared_documents')
        .select('id, document_id, shared_by_user_id, share_token, allow_download, expires_at, is_revoked, view_count, download_count, created_at, updated_at, documents(id, original_filename, file_name, file_type, mime_type, file_size, supabase_storage_url, storage_path)')
        .eq('share_token', tokenHash)
        .maybeSingle();

      if (!error && data) {
        const doc: any = Array.isArray(data.documents) ? data.documents[0] : data.documents;

        record = {
          id: data.id,
          documentId: data.document_id,
          ownerId: data.shared_by_user_id,
          tokenHash: data.share_token,
          allowDownload: data.allow_download ?? true,
          expiresAt: data.expires_at,
          isRevoked: !!data.is_revoked,
          viewCount: data.view_count || 0,
          downloadCount: data.download_count || 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          originalFilename: doc?.original_filename || doc?.file_name || 'document',
          fileType: doc?.file_type || 'PDF',
          mimeType: resolveCanonicalMimeType(doc?.mime_type, doc?.original_filename || doc?.file_name || '', doc?.file_type),
          fileSize: Number(doc?.file_size) || 0,
          originalStorageUrl: doc?.supabase_storage_url || doc?.storage_path,
        };
        persistLocalShare(record);
      }
    } catch (e) {
      console.warn('[Supabase DB Share Lookup Notice]:', e);
    }
  }

  if (!record) {
    return {
      valid: false,
      status: 'NOT_FOUND',
      message: 'This share link is no longer available.',
    };
  }

  if (record.isRevoked) {
    return {
      valid: false,
      status: 'REVOKED',
      message: 'This share link has been revoked.',
    };
  }

  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return {
      valid: false,
      status: 'EXPIRED',
      message: 'This share link has expired.',
    };
  }

  // Increment view count
  record.viewCount += 1;
  record.lastAccessedAt = new Date().toISOString();
  persistLocalShare(record);

  if (sbClient) {
    try {
      await sbClient
        .from('shared_documents')
        .update({
          view_count: record.viewCount,
          updated_at: new Date().toISOString(),
        })
        .eq('share_token', tokenHash);
    } catch (e) {}
  }

  return {
    valid: true,
    status: 'ACTIVE',
    message: 'Share is active and valid.',
    shareRecord: record,
  };
}

/**
 * Retrieve the original binary buffer for a valid share
 * STRICT RULE: Retrieves the EXACT original binary, NEVER the preview artifact.
 */
export async function getOriginalBinaryForShare(
  sbClient: SupabaseClient | null,
  record: ShareRecord
): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
  const canonicalMime = resolveCanonicalMimeType(record.mimeType, record.originalFilename, record.fileType);

  // 1. Direct in-memory buffer if present
  if (record.originalBinaryBuffer && record.originalBinaryBuffer.length > 0) {
    return {
      buffer: record.originalBinaryBuffer,
      mimeType: canonicalMime,
      filename: record.originalFilename,
    };
  }

  // 2. If originalStorageUrl is a data URL
  if (record.originalStorageUrl && record.originalStorageUrl.startsWith('data:')) {
    const cleanBase64 = record.originalStorageUrl.split('base64,')[1];
    if (cleanBase64) {
      return {
        buffer: Buffer.from(cleanBase64, 'base64'),
        mimeType: canonicalMime,
        filename: record.originalFilename,
      };
    }
  }

  // 3. If Supabase Storage URL / path exists
  if (record.originalStorageUrl && (record.originalStorageUrl.startsWith('http://') || record.originalStorageUrl.startsWith('https://'))) {
    try {
      const fetchRes = await fetch(record.originalStorageUrl);
      if (fetchRes.ok) {
        const ab = await fetchRes.arrayBuffer();
        return {
          buffer: Buffer.from(ab),
          mimeType: canonicalMime,
          filename: record.originalFilename,
        };
      }
    } catch (e) {
      console.warn('[Share Service] Error fetching original binary from storage URL:', e);
    }
  }

  // 4. If path in Supabase documents bucket
  if (sbClient && record.originalStorageUrl) {
    try {
      const cleanPath = record.originalStorageUrl.replace(/^.*\/documents\//, '');
      const { data, error } = await sbClient.storage.from('documents').download(cleanPath);
      if (!error && data) {
        const ab = await data.arrayBuffer();
        return {
          buffer: Buffer.from(ab),
          mimeType: canonicalMime,
          filename: record.originalFilename,
        };
      }
    } catch (e) {
      console.warn('[Share Service] Error downloading original from Supabase Storage:', e);
    }
  }

  return null;
}
