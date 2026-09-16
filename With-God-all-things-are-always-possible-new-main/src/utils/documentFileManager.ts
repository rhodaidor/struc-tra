import * as XLSX from 'xlsx';
import { AppDocument, FileType } from '../types';
import { dbFetchDocumentStorageUrl } from '../lib/supabaseService';

/**
 * MIME Type mappings for supported file formats
 */
const MIME_TYPE_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain;charset=utf-8',
  csv: 'text/csv;charset=utf-8',
};

/**
 * Ensure the filename ends with the canonical extension
 */
export function sanitizeFileNameWithExtension(rawName: string, fileType?: FileType | string): string {
  const cleanTitle = (rawName || 'document').trim();
  const ext = (fileType || '').toLowerCase().trim();

  if (!ext) return cleanTitle;

  const targetExt = ext === 'jpeg' ? 'jpg' : ext;
  const regex = new RegExp(`\\.${targetExt}$`, 'i');

  if (regex.test(cleanTitle)) {
    return cleanTitle;
  }

  // Strip trailing periods if any
  return `${cleanTitle.replace(/\.+$/, '')}.${targetExt}`;
}

/**
 * Convert any URL (data URL, blob URL, or remote http/https) into a Blob safely
 */
export async function urlToBlob(url: string | undefined): Promise<Blob | null> {
  if (!url) return null;

  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      if (parts.length < 2) return null;
      const meta = parts[0];
      const mimeMatch = meta.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const isBase64 = meta.includes('base64');
      if (isBase64) {
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
      } else {
        const text = decodeURIComponent(parts[1]);
        return new Blob([text], { type: mime });
      }
    } catch (e) {
      console.warn('[urlToBlob] Error converting data URL to blob:', e);
      return null;
    }
  }

  try {
    const res = await fetch(url);
    if (res.ok) {
      return await res.blob();
    }
  } catch (err) {
    console.warn('[urlToBlob] Could not fetch blob from URL:', err);
  }
  return null;
}

/**
 * Generate a valid PDF 1.4 compliant binary blob with header, catalog, pages, and content stream
 */
function generateValidPdfBlob(
  title: string,
  category: string,
  summary: string,
  metadata?: Record<string, any>,
  rawText?: string
): Blob {
  const sanitize = (str: string) => (str || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const lines: string[] = [
    `STRUCTRA DOCUMENT ARCHIVE`,
    `==================================================`,
    `Title: ${title}`,
    `Category: ${category || 'Uncategorized'}`,
    `Exported: ${new Date().toUTCString()}`,
    ``,
    `DOCUMENT METADATA:`,
  ];

  if (metadata && Object.keys(metadata).length > 0) {
    for (const [k, v] of Object.entries(metadata)) {
      if (v !== undefined && v !== null && typeof v !== 'object') {
        lines.push(`- ${k}: ${String(v)}`);
      }
    }
  } else {
    lines.push(`- Status: Verified Document in Structra Storage`);
  }

  lines.push(``);
  lines.push(`EXECUTIVE SUMMARY:`);
  lines.push(summary || 'No summary text available.');

  if (rawText && rawText.trim() && rawText !== summary) {
    lines.push(``);
    lines.push(`EXTRACTED CONTENT:`);
    lines.push(rawText.substring(0, 1200));
  }

  let streamContent = `BT /F1 11 Tf 50 740 Td 14 TL\n`;
  for (const rawLine of lines) {
    const safeLine = sanitize(rawLine.substring(0, 85));
    streamContent += `(${safeLine}) '\n`;
  }
  streamContent += `ET`;

  const streamLength = streamContent.length;

  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000${(244 + 50 + streamLength).toString().padStart(3, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${360 + streamLength}
%%EOF`;

  return new Blob([pdfString], { type: 'application/pdf' });
}

/**
 * Generate fallback image binary blob
 */
function generateFallbackImageBlob(title: string, category: string): Promise<Blob> {
  return new Promise((resolve) => {
    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 650;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Background gradient
          const grad = ctx.createLinearGradient(0, 0, 900, 650);
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(1, '#1e293b');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 900, 650);

          // Accent bar
          ctx.fillStyle = '#2563eb';
          ctx.fillRect(60, 60, 240, 42);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('STRUCTRA DOCUMENT', 78, 87);

          // Title
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 30px sans-serif';
          ctx.fillText(title.substring(0, 45), 60, 170);

          // Category
          ctx.fillStyle = '#94a3b8';
          ctx.font = '20px sans-serif';
          ctx.fillText(`Category: ${category || 'General Document'}`, 60, 220);

          // Subtitle & Timestamp
          ctx.fillStyle = '#64748b';
          ctx.font = '15px sans-serif';
          ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, 60, 270);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
              return;
            }
            resolve(new Blob(['Structra Stored Image'], { type: 'image/png' }));
          }, 'image/png');
          return;
        }
      }
    } catch (e) {
      console.warn('[generateFallbackImageBlob] Canvas creation notice:', e);
    }
    resolve(new Blob(['Structra Stored Image'], { type: 'image/png' }));
  });
}

/**
 * CANONICAL ORIGINAL FILE RESOLVER
 * Resolves the exact binary file stored for an AppDocument.
 * STRICT ANTI-BUG POLICY: NEVER synthesizes a mock document from AI summary or raw text.
 * The AI overview is derived content and must remain strictly separate from the original document.
 */
export async function resolveCanonicalOriginalDocument(
  doc: AppDocument,
  customTitle?: string
): Promise<{
  file: File | null;
  blob: Blob | null;
  fileName: string;
  mimeType: string;
  isOriginalBinary: boolean;
}> {
  const fileExt = ((doc.title?.split('.').pop()) || doc.fileType || 'pdf').toLowerCase().trim();
  const mimeType = MIME_TYPE_MAP[fileExt] || 'application/octet-stream';
  const fileName = sanitizeFileNameWithExtension(customTitle || doc.title || 'document', doc.fileType);

  // 1. Check if the active browser session holds the genuine original File handle from upload
  const sessionFile = getSessionDeviceFile(doc.id, doc.title);
  if (sessionFile && sessionFile.size > 0) {
    return {
      file: sessionFile,
      blob: sessionFile,
      fileName: sessionFile.name || fileName,
      mimeType: sessionFile.type || mimeType,
      isOriginalBinary: true,
    };
  }

  // 2. Fetch the actual stored original binary from doc.fileUrl (or on-demand storage fetch)
  let targetUrl = doc.fileUrl;
  let blob: Blob | null = null;

  if (targetUrl) {
    blob = await urlToBlob(targetUrl);
  }

  // If no blob was loaded (e.g. fileUrl was empty, a storage path, or not cached), fetch on-demand for this specific document
  if (!blob && doc.id) {
    try {
      const fetchedUrl = await dbFetchDocumentStorageUrl(doc.id, (doc as any).userId || (doc as any).user_id || (doc as any).owner_id);
      if (fetchedUrl) {
        targetUrl = fetchedUrl;
        blob = await urlToBlob(fetchedUrl);
      }
    } catch (fetchErr) {
      console.warn('[resolveCanonicalOriginalDocument] On-demand storage URL fetch failed:', fetchErr);
    }
  }

  if (blob && blob.size > 0) {
    const typedBlob = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });
    const file = new File([typedBlob], fileName, {
      type: mimeType,
      lastModified: doc.uploadDate ? new Date(doc.uploadDate).getTime() : Date.now(),
    });
    return {
      file,
      blob: typedBlob,
      fileName,
      mimeType,
      isOriginalBinary: true,
    };
  }

  // 3. CRITICAL ANTI-BUG FIX:
  // If no original binary exists in local session or Supabase storage (e.g. Secure Index mode or external cloud reference),
  // NEVER synthesize an artificial document using doc.contentSummary or AI overview!
  // Return null binary with isOriginalBinary: false so caller can route to original source or report truthfully.
  return {
    file: null,
    blob: null,
    fileName,
    mimeType,
    isOriginalBinary: false,
  };
}

// Runtime session registry for genuine device File handles/objects uploaded in the current browser session
const sessionDeviceFileRegistry = new Map<string, File>();

/**
 * Register a genuine device File handle/object in the browser session registry
 */
export function registerSessionDeviceFile(docIdOrTitle: string, file: File): void {
  if (!docIdOrTitle || !file) return;
  const key = docIdOrTitle.toLowerCase().trim();
  sessionDeviceFileRegistry.set(key, file);
  if (file.name) {
    sessionDeviceFileRegistry.set(file.name.toLowerCase().trim(), file);
  }
}

/**
 * Retrieve a registered session device File handle/object if available
 */
export function getSessionDeviceFile(docId?: string, title?: string): File | null {
  if (docId) {
    const key = docId.toLowerCase().trim();
    if (sessionDeviceFileRegistry.has(key)) {
      return sessionDeviceFileRegistry.get(key) || null;
    }
  }
  if (title) {
    const key = title.toLowerCase().trim();
    if (sessionDeviceFileRegistry.has(key)) {
      return sessionDeviceFileRegistry.get(key) || null;
    }
  }
  return null;
}

/**
 * Trigger direct download of a binary Blob
 */
export function downloadCanonicalBlob(blob: Blob, fileName: string): void {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 3000);
}

export interface ShareCanonicalResult {
  success: boolean;
  method: 'native_share' | 'fallback_required' | 'user_cancelled' | 'binary_unavailable';
  fileName: string;
  file?: File;
  blob?: Blob;
  mimeType?: string;
  message?: string;
}

/**
 * NATIVE DEVICE SHARING HANDLER
 * Shares the actual original document binary file via Web Share API if supported.
 * STRICT ANTI-BUG POLICY:
 * - NEVER claims success when no share occurred.
 * - NEVER shares or copies private Gmail or Telegram URLs as a fallback.
 * - NEVER shares the AI overview / summary.
 * - If native file sharing is unsupported, returns method: 'fallback_required' so the UI
 *   can present the Fallback Modal (Download Original Document vs Create Secure Share Link).
 */
export async function shareCanonicalDocument(
  doc: AppDocument,
  customTitle?: string
): Promise<ShareCanonicalResult> {
  const { file, blob, fileName, mimeType, isOriginalBinary } = await resolveCanonicalOriginalDocument(doc, customTitle);
  const documentTitle = customTitle || fileName || doc.title || 'Document';

  // 1. If no genuine original binary exists in Structra for this document:
  if (!isOriginalBinary || (!file && !blob)) {
    return {
      success: false,
      method: 'binary_unavailable',
      fileName,
      mimeType,
      message: "The original file isn't currently available in Structra for this document.",
    };
  }

  // 2. Ensure we have a File instance for Web Share
  const canonicalFile = file || (blob ? new File([blob], fileName, { type: mimeType }) : null);
  if (!canonicalFile) {
    return {
      success: false,
      method: 'binary_unavailable',
      fileName,
      mimeType,
      message: "The original file isn't currently available in Structra for this document.",
    };
  }

  const isWebShareAvailable =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function';

  // 3. Runtime capability detection using navigator.canShare({ files: [canonicalFile] })
  if (isWebShareAvailable) {
    const shareData = {
      title: documentTitle,
      files: [canonicalFile],
    };

    let canShareFiles = false;
    try {
      canShareFiles =
        typeof navigator.canShare === 'function'
          ? navigator.canShare(shareData)
          : false;
    } catch (e) {
      canShareFiles = false;
    }

    if (canShareFiles) {
      try {
        await navigator.share(shareData);
        return {
          success: true,
          method: 'native_share',
          fileName,
          file: canonicalFile,
          blob: blob || canonicalFile,
          mimeType,
          message: 'Share sheet opened successfully.',
        };
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.name === 'NotAllowedError') {
          return {
            success: false,
            method: 'user_cancelled',
            fileName,
            file: canonicalFile,
            blob: blob || canonicalFile,
            mimeType,
          };
        }
        console.warn('[shareCanonicalDocument] Native share failed:', err);
        return {
          success: false,
          method: 'fallback_required',
          fileName,
          file: canonicalFile,
          blob: blob || canonicalFile,
          mimeType,
          message: "This browser or device doesn't support direct sharing for this file.",
        };
      }
    }
  }

  // 4. Native file sharing unsupported on this browser/device/file -> fallback modal required!
  return {
    success: false,
    method: 'fallback_required',
    fileName,
    file: canonicalFile,
    blob: blob || canonicalFile,
    mimeType,
    message: "This browser or device doesn't support direct sharing for this file. You can download the original document and share it manually, or create a secure Structra share link.",
  };
}

/**
 * EXPLICIT AI OVERVIEW SHARING HANDLER
 * Explicitly shares the AI-generated document summary/overview.
 * This is strictly separated from shareCanonicalDocument to avoid any ambiguity.
 */
export async function shareDocumentAIOverview(
  doc: AppDocument,
  customTitle?: string
): Promise<{
  success: boolean;
  method: 'native_share' | 'clipboard' | 'user_cancelled' | 'unsupported';
  message: string;
}> {
  const documentTitle = customTitle || doc.title || 'Document';
  const overviewText = `STRUCTRA AI OVERVIEW\nDocument: ${documentTitle}\nCategory: ${doc.category || 'General'}\nDate: ${doc.uploadDate || ''}\n\nSummary:\n${doc.contentSummary || 'No summary available.'}`;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: `AI Overview: ${documentTitle}`,
        text: overviewText,
      });
      return { success: true, method: 'native_share', message: 'Shared AI Overview successfully.' };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'NotAllowedError') {
        return { success: false, method: 'user_cancelled', message: 'Share cancelled.' };
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(overviewText);
      return { success: true, method: 'clipboard', message: 'AI Overview copied to clipboard.' };
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
  }

  return { success: false, method: 'unsupported', message: 'Unable to share AI overview.' };
}

export interface OpenSourceContext {
  userEmail?: string;
  integrations?: Array<{ provider?: string; id?: string; connectedAccount?: string; accountIdentifier?: string }>;
}

/**
 * Shared source resolution logic:
 * Document -> Source Provider -> Account -> Exact Document/Message/Attachment -> Destination URL
 * 
 * Works consistently across laptop/desktop and mobile devices.
 */
export function resolveOriginalDocumentTarget(
  doc: AppDocument,
  context?: OpenSourceContext
): {
  provider: 'gmail' | 'telegram' | 'drive' | 'onedrive' | 'dropbox' | 'upload_center' | 'other';
  accountEmail?: string;
  targetUrl?: string;
  isDirectFile?: boolean;
} {
  if (!doc) {
    return { provider: 'other' };
  }

  const sourceStr = (doc.source || '').toLowerCase().trim();
  const rawSourceId = (doc.sourceId || '').trim();
  const metadata = (doc.metadata || {}) as any;

  // Helper to resolve connected account from context or localStorage
  const findConnectedAccount = (prov: string): string => {
    if (context?.integrations && Array.isArray(context.integrations)) {
      const match = context.integrations.find(
        (i) => (i.provider || i.id || '').toLowerCase() === prov.toLowerCase()
      );
      if (match?.connectedAccount || match?.accountIdentifier) {
        return (match.connectedAccount || match.accountIdentifier)!.trim();
      }
    }
    if (typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('structra_integrations')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                const match = parsed.find(
                  (item: any) => (item.id || item.provider || '').toLowerCase() === prov.toLowerCase()
                );
                if (match?.connectedAccount || match?.accountIdentifier) {
                  return (match.connectedAccount || match.accountIdentifier)!.trim();
                }
              }
            }
          }
        }
      } catch {}
    }
    return '';
  };

  // 1. GMAIL SOURCE
  if (sourceStr.includes('gmail')) {
    const accountEmail =
      metadata.accountEmail ||
      metadata.connectedAccount ||
      metadata.accountIdentifier ||
      findConnectedAccount('gmail') ||
      context?.userEmail ||
      '';

    const encodedEmail = accountEmail ? encodeURIComponent(accountEmail.trim().toLowerCase()) : '';
    // Combine /u/{email}/ and authuser={email} to ensure correct multi-account routing on both desktop and mobile
    const mailBase = encodedEmail
      ? `https://mail.google.com/mail/u/${encodedEmail}/?authuser=${encodedEmail}`
      : 'https://mail.google.com/mail/u/0/';

    let targetUrl = '';
    if (metadata.sourceUrl && typeof metadata.sourceUrl === 'string' && metadata.sourceUrl.startsWith('http')) {
      targetUrl = metadata.sourceUrl.replace('#inbox/', '#all/');
      if (encodedEmail && targetUrl.includes('/u/0/')) {
        targetUrl = targetUrl.replace('/u/0/', `/u/${encodedEmail}/?authuser=${encodedEmail}`);
      }
    } else if (metadata.threadId && typeof metadata.threadId === 'string' && metadata.threadId.trim()) {
      targetUrl = `${mailBase}#all/${encodeURIComponent(metadata.threadId.trim())}`;
    } else if (metadata.messageId && typeof metadata.messageId === 'string' && metadata.messageId.trim()) {
      const cleanId = metadata.messageId.trim().replace(/^msg_gm_/, '').replace(/^msg_/, '');
      if (cleanId.includes('@') || cleanId.includes('<')) {
        targetUrl = `${mailBase}#search/rfc822msgid%3A${encodeURIComponent(cleanId)}`;
      } else {
        targetUrl = `${mailBase}#all/${encodeURIComponent(cleanId)}`;
      }
    } else if (rawSourceId && rawSourceId !== 'gmail' && rawSourceId !== doc.id) {
      const cleanId = rawSourceId.replace(/^msg_gm_/, '').replace(/^msg_/, '');
      if (cleanId) {
        if (cleanId.includes('@') || cleanId.includes('<')) {
          targetUrl = `${mailBase}#search/rfc822msgid%3A${encodeURIComponent(cleanId)}`;
        } else {
          targetUrl = `${mailBase}#all/${encodeURIComponent(cleanId)}`;
        }
      }
    }

    return {
      provider: 'gmail',
      accountEmail: accountEmail || undefined,
      targetUrl: targetUrl || undefined,
    };
  }

  // 2. TELEGRAM SOURCE
  if (sourceStr.includes('telegram')) {
    let channelId = metadata.channelId ? String(metadata.channelId).trim() : '';
    let messageId = metadata.messageId ? String(metadata.messageId).trim() : '';

    if (metadata.telegramMessageId && typeof metadata.telegramMessageId === 'string') {
      const parts = metadata.telegramMessageId.split('_');
      if (parts.length === 2) {
        channelId = parts[0];
        messageId = parts[1];
      }
    } else if (rawSourceId && rawSourceId.startsWith('tg_channel_')) {
      const clean = rawSourceId.replace(/^tg_channel_/, '');
      const parts = clean.split('_');
      if (parts.length === 2) {
        channelId = parts[0];
        messageId = parts[1];
      } else {
        channelId = clean;
      }
    }

    // Clean peer channel prefix (-100 or -)
    const cleanChannelId = channelId.replace(/^-100/, '').replace(/^-/, '');
    let targetUrl = '';

    if (cleanChannelId && messageId) {
      targetUrl = `https://t.me/c/${cleanChannelId}/${messageId}`;
    } else if (metadata.channelUsername && messageId) {
      targetUrl = `https://t.me/${metadata.channelUsername.replace(/^@/, '')}/${messageId}`;
    } else if (cleanChannelId) {
      targetUrl = `https://t.me/c/${cleanChannelId}`;
    } else if (metadata.sourceUrl && typeof metadata.sourceUrl === 'string' && metadata.sourceUrl.startsWith('http') && !metadata.sourceUrl.includes('web.telegram.org')) {
      targetUrl = metadata.sourceUrl;
    }

    return {
      provider: 'telegram',
      targetUrl: targetUrl || undefined,
    };
  }

  // 3. GOOGLE DRIVE / ONEDRIVE / DROPBOX
  if (sourceStr.includes('drive') || sourceStr.includes('onedrive') || sourceStr.includes('dropbox')) {
    const isDrive = sourceStr.includes('drive');
    const accountEmail =
      metadata.accountEmail ||
      metadata.connectedAccount ||
      findConnectedAccount('google_drive') ||
      context?.userEmail ||
      '';

    let cloudUrl = metadata.sourceUrl || (doc.fileUrl && doc.fileUrl.startsWith('http') && !doc.fileUrl.includes('supabase') ? doc.fileUrl : '');
    if (!cloudUrl && isDrive && metadata.fileId) {
      cloudUrl = `https://drive.google.com/file/d/${encodeURIComponent(metadata.fileId)}/view`;
      if (accountEmail) {
        cloudUrl += `?authuser=${encodeURIComponent(accountEmail)}`;
      }
    }

    return {
      provider: isDrive ? 'drive' : (sourceStr.includes('onedrive') ? 'onedrive' : 'dropbox'),
      accountEmail: accountEmail || undefined,
      targetUrl: cloudUrl || undefined,
    };
  }

  // 4. UPLOAD CENTER / LOCAL DEVICE
  if (sourceStr.includes('upload') || sourceStr.includes('direct') || !doc.source) {
    return {
      provider: 'upload_center',
      isDirectFile: true,
      targetUrl: doc.fileUrl || undefined,
    };
  }

  return { provider: 'other', targetUrl: metadata.sourceUrl || undefined };
}

/**
 * OPEN ORIGINAL SOURCE HANDLER
 * Opens the actual original source (Gmail email/thread, Telegram message/channel, or device file).
 * Strictly adheres to source location deep linking.
 */
export async function openOriginalDocumentSource(
  doc: AppDocument,
  customTitle?: string,
  context?: OpenSourceContext
): Promise<{
  status: 'opened' | 'unavailable' | 'blocked';
  message: string;
  url?: string;
}> {
  if (!doc) {
    return { status: 'unavailable', message: "Original source is not available for this document." };
  }

  const resolution = resolveOriginalDocumentTarget(doc, context);

  // 1. GMAIL SOURCE
  if (resolution.provider === 'gmail') {
    if (resolution.targetUrl) {
      const win = window.open(resolution.targetUrl, '_blank', 'noopener,noreferrer');
      if (win) {
        return {
          status: 'opened',
          message: resolution.accountEmail
            ? `Opening original email in Gmail (${resolution.accountEmail})...`
            : 'Opening original email in Gmail...',
          url: resolution.targetUrl,
        };
      }
      return { status: 'blocked', message: 'Popup blocked by browser. Please allow popups to open Gmail.', url: resolution.targetUrl };
    }

    return {
      status: 'unavailable',
      message: "No Gmail source reference found for this document. The email message ID or thread identifier is not available in document metadata."
    };
  }

  // 2. TELEGRAM SOURCE
  if (resolution.provider === 'telegram') {
    if (resolution.targetUrl) {
      const win = window.open(resolution.targetUrl, '_blank', 'noopener,noreferrer');
      if (win) {
        return { status: 'opened', message: 'Opening original message in Telegram...', url: resolution.targetUrl };
      }
      return { status: 'blocked', message: 'Popup blocked by browser. Please allow popups to open Telegram.', url: resolution.targetUrl };
    }

    return {
      status: 'unavailable',
      message: "Original document can't be found in Telegram. The channel or message identifier is no longer accessible."
    };
  }

  // 3. GOOGLE DRIVE / ONEDRIVE / DROPBOX
  if (resolution.provider === 'drive' || resolution.provider === 'onedrive' || resolution.provider === 'dropbox') {
    if (resolution.targetUrl) {
      const win = window.open(resolution.targetUrl, '_blank', 'noopener,noreferrer');
      if (win) return { status: 'opened', message: `Opening ${doc.source || 'cloud storage'}...`, url: resolution.targetUrl };
      return { status: 'blocked', message: `Popup blocked by browser. Please allow popups to open ${doc.source}.`, url: resolution.targetUrl };
    }
    return {
      status: 'unavailable',
      message: `Original document can't be found in ${doc.source || 'the original cloud source'}.`
    };
  }

  // 4. UPLOAD CENTER / DIRECT UPLOAD (FROM USER'S DEVICE)
  if (resolution.provider === 'upload_center') {
    // Phase 1: Try in-memory File handle from device session (Scenario K)
    const sessionFile = getSessionDeviceFile(doc.id, doc.title);
    if (sessionFile) {
      const blobUrl = URL.createObjectURL(sessionFile);
      const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60000);

      if (win) {
        return { status: 'opened', message: `Opened original file on device: ${sessionFile.name}`, url: blobUrl };
      }
      return { status: 'blocked', message: 'Browser popup was blocked. Please allow popups to open the original file.' };
    }

    // Phase 2: Page refreshed or accessed on another device (Scenario L)
    // Resolve verified canonical document storage URL
    let storageUrl = doc.fileUrl && doc.fileUrl.startsWith('http') ? doc.fileUrl : null;
    if (!storageUrl) {
      try {
        storageUrl = await dbFetchDocumentStorageUrl(doc.id);
      } catch (err) {
        console.warn('[Open Original Source] Error fetching storage backup:', err);
      }
    }

    if (storageUrl) {
      const win = window.open(storageUrl, '_blank', 'noopener,noreferrer');
      if (win) {
        return {
          status: 'opened',
          message: 'Opened verified original uploaded document from storage.',
          url: storageUrl,
        };
      }
      return { status: 'blocked', message: 'Browser popup was blocked. Please allow popups to open the document.', url: storageUrl };
    }

    return {
      status: 'unavailable',
      message: "The original document can't be found on your device or storage."
    };
  }

  // GENERAL FALLBACK
  if (resolution.targetUrl) {
    const win = window.open(resolution.targetUrl, '_blank', 'noopener,noreferrer');
    if (win) return { status: 'opened', message: `Opening ${doc.source || 'document'}...`, url: resolution.targetUrl };
  }

  return {
    status: 'unavailable',
    message: "Original document can't be found in the original source."
  };
}
