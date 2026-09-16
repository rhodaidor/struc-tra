import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  Clock,
  AlertCircle,
  ExternalLink,
  Lock,
  ArrowRight,
  Eye,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

interface SharedDocInfo {
  title: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  allowDownload: boolean;
  isDirectViewable: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface SharePageProps {
  token?: string;
  onNavigateHome?: () => void;
}

export const SharePage: React.FC<SharePageProps> = ({ token: propToken, onNavigateHome }) => {
  // Extract token from prop, URL pathname (/share/:token), or search params
  const [token, setToken] = useState<string>(() => {
    if (propToken) return propToken;
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/share\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1];
      const params = new URLSearchParams(window.location.search);
      return params.get('token') || '';
    }
    return '';
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<'NOT_FOUND' | 'REVOKED' | 'EXPIRED' | 'NETWORK' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [docInfo, setDocInfo] = useState<SharedDocInfo | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setErrorStatus('NOT_FOUND');
      setErrorMessage('No share link token provided.');
      return;
    }

    const loadSharedDoc = async () => {
      setIsLoading(true);
      setErrorStatus(null);
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          setDocInfo(data.document);
          setDownloadUrl(data.endpoints?.downloadUrl || `/api/share/${encodeURIComponent(token)}/download`);
          setViewUrl(data.endpoints?.viewUrl || null);
        } else {
          setErrorStatus(data.status || (res.status === 404 ? 'NOT_FOUND' : 'REVOKED'));
          setErrorMessage(data.message || 'This share link is no longer available.');
        }
      } catch (err) {
        setErrorStatus('NETWORK');
        setErrorMessage('Failed to connect to Structra secure share server.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedDoc();
  }, [token]);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    const type = (fileType || '').toLowerCase();
    if (type.includes('xls') || type.includes('csv') || type.includes('sheet')) {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />;
    }
    if (type.includes('ppt') || type.includes('presentation')) {
      return <Presentation className="w-8 h-8 text-amber-600 dark:text-amber-400" />;
    }
    if (type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('image')) {
      return <ImageIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />;
    }
    return <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />;
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    setIsDownloading(true);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = docInfo?.title || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsDownloading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-purple-500 selection:text-white">
      {/* Top Brand Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between py-6 px-4">
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform">
            S
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            STRUCTRA<span className="text-purple-400">.</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Secure Document Share</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-4xl flex-1 flex flex-col justify-center my-4">
        {isLoading ? (
          <div className="p-12 bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl text-center flex flex-col items-center justify-center space-y-4 max-w-md mx-auto w-full">
            <div className="w-12 h-12 rounded-full border-3 border-purple-500 border-t-transparent animate-spin" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100">Verifying secure link...</h3>
              <p className="text-xs text-slate-400">Decrypting permissions and resolving original document</p>
            </div>
          </div>
        ) : errorStatus ? (
          <div className="p-8 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl text-center flex flex-col items-center justify-center space-y-5 max-w-md mx-auto w-full">
            <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/60 text-red-400 flex items-center justify-center shadow-lg shadow-red-950/50">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100">
                {errorStatus === 'EXPIRED'
                  ? 'Share Link Expired'
                  : errorStatus === 'REVOKED'
                  ? 'Share Link Revoked'
                  : 'Link Unavailable'}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {errorMessage || 'This document is no longer accessible via this share link.'}
              </p>
            </div>
            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Go to Structra Home</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : docInfo ? (
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
            {/* Header / Document Overview */}
            <div className="p-6 md:p-8 border-b border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-700/80 border border-slate-600/60 flex items-center justify-center shrink-0 shadow-inner">
                  {getFileIcon(docInfo.fileType)}
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-950/80 border border-purple-800 text-purple-300 font-bold text-[11px] uppercase tracking-wide">
                      {docInfo.fileType || 'DOCUMENT'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatFileSize(docInfo.fileSize)}
                    </span>
                  </div>
                  <h1 className="text-lg md:text-xl font-bold text-slate-100 break-words line-clamp-2">
                    {docInfo.title}
                  </h1>
                </div>
              </div>

              {/* Primary Action Button */}
              {docInfo.allowDownload ? (
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="px-6 py-3.5 bg-purple-600 hover:bg-purple-500 active:scale-98 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? 'Downloading...' : `Download Original (${docInfo.fileType})`}</span>
                </button>
              ) : (
                <div className="px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-xs text-slate-400 flex items-center gap-2 shrink-0">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>Download disabled by owner</span>
                </div>
              )}
            </div>

            {/* Content Area: Direct Viewer or Formatted Card */}
            <div className="p-6 md:p-8 bg-slate-900/50 flex-1 min-h-[420px] flex flex-col items-center justify-center">
              {docInfo.isDirectViewable && viewUrl ? (
                <div className="w-full h-[600px] rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-inner flex flex-col">
                  <iframe
                    src={viewUrl}
                    title={docInfo.title}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="text-center max-w-md p-8 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-700/60 border border-slate-600 flex items-center justify-center">
                    {getFileIcon(docInfo.fileType)}
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-100">
                      Original {docInfo.fileType} Document
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {docInfo.allowDownload
                        ? `Click the download button above to download the original ${docInfo.fileType} file with all original formatting and binary data intact.`
                        : `This original ${docInfo.fileType} file is shared in secure view-only mode.`}
                    </p>
                  </div>
                  {docInfo.allowDownload && (
                    <button
                      onClick={handleDownload}
                      className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer mt-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download {docInfo.title}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer Metadata & Security Badges */}
            <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Original Binary Verified</span>
                </span>
                {docInfo.expiresAt && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires: {new Date(docInfo.expiresAt).toLocaleDateString()}</span>
                  </span>
                )}
              </div>
              <span className="text-slate-500 text-[11px]">
                Protected by Structra Cryptographic Tenant Isolation
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Footer */}
      <div className="w-full max-w-4xl text-center py-4 text-xs text-slate-500">
        Structra Intelligent Document Management & Vector Retrieval
      </div>
    </div>
  );
};
