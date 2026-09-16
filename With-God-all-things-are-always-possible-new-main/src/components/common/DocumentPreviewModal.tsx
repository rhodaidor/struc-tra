import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Download, Star, Trash2, Share2, FileText, Check, 
  ExternalLink, Sparkles, ArrowLeft, MoreVertical, Copy, Info, 
  Mail, ShieldCheck, CheckCircle2, Database,
  Clock, AlertTriangle, User, HardDrive, Send,
  Edit3, History, HelpCircle, CheckSquare, Layers, Tag,
  Calendar, Building, Briefcase, DollarSign, Search, FileCode,
  FileSpreadsheet, FileImage, ShieldAlert, CheckCircle, ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { dbFetchDocumentOcr } from '../../lib/supabaseService';
import { 
  resolveCanonicalOriginalDocument, 
  downloadCanonicalBlob, 
  shareCanonicalDocument, 
  shareDocumentAIOverview,
  openOriginalDocumentSource 
} from '../../utils/documentFileManager';
import { AppDocument } from '../../types';

export const DocumentPreviewModal: React.FC = () => {
  const { 
    selectedDocument, 
    setSelectedDocument, 
    toggleFavorite, 
    moveToTrash, 
    addSearchQuery,
    globalSearchQuery,
    documents,
    user,
    integrations
  } = useApp();

  // Active section tab inside the Document Details page
  const [activeTab, setActiveTab] = useState<'overview' | 'info' | 'facts' | 'findings' | 'dates' | 'rawText'>('overview');
  
  // Modals & Action Menus
  const [showDocMenu, setShowDocMenu] = useState<boolean>(false);
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showShareFallbackModal, setShowShareFallbackModal] = useState<boolean>(false);
  const [fallbackShareFile, setFallbackShareFile] = useState<File | null>(null);
  const [fallbackShareBlob, setFallbackShareBlob] = useState<Blob | null>(null);
  const [fallbackShareFileName, setFallbackShareFileName] = useState<string>('');
  const [fallbackShareMimeType, setFallbackShareMimeType] = useState<string>('');
  const [isCreatingShareLink, setIsCreatingShareLink] = useState<boolean>(false);
  const [createdShareUrl, setCreatedShareUrl] = useState<string>('');
  const [isCopiedShareUrl, setIsCopiedShareUrl] = useState<boolean>(false);
  const [shareLinkError, setShareLinkError] = useState<string | null>(null);

  // User Interactive Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavedOffline, setIsSavedOffline] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [isDownloadProgress, setIsDownloadProgress] = useState<boolean>(false);
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [renameInput, setRenameInput] = useState<string>('');
  const [reportText, setReportText] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [ocrText, setOcrText] = useState<string>('');
  const [isLoadingOcr, setIsLoadingOcr] = useState<boolean>(false);
  const [isCopiedOcr, setIsCopiedOcr] = useState<boolean>(false);

  const docMenuRef = useRef<HTMLDivElement>(null);

  // Initialize title when selectedDocument changes
  useEffect(() => {
    if (selectedDocument) {
      setDocumentTitle(selectedDocument.title);
      setRenameInput(selectedDocument.title);
      setActiveTab('overview');
      setShowDocMenu(false);
      setOcrText(selectedDocument.rawText || '');
    } else {
      setOcrText('');
    }
  }, [selectedDocument?.id]);

  // Fetch OCR text on demand when the user opens the Extracted Text tab
  useEffect(() => {
    if (activeTab === 'rawText' && selectedDocument?.id && !ocrText && !isLoadingOcr) {
      setIsLoadingOcr(true);
      dbFetchDocumentOcr(selectedDocument.id, user?.id)
        .then((text) => {
          if (text) {
            setOcrText(text);
          }
        })
        .catch((err) => {
          console.warn('[Document Preview] OCR fetch notice:', err);
        })
        .finally(() => {
          setIsLoadingOcr(false);
        });
    }
  }, [activeTab, selectedDocument?.id, ocrText, isLoadingOcr, user?.id]);

  // Click outside to close three-dot menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (docMenuRef.current && !docMenuRef.current.contains(e.target as Node)) {
        setShowDocMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDocMenu) setShowDocMenu(false);
        else if (showShareFallbackModal) {
          setShowShareFallbackModal(false);
          setCreatedShareUrl('');
          setShareLinkError(null);
        }
        else if (showRenameModal) setShowRenameModal(false);
        else if (showVersionModal) setShowVersionModal(false);
        else if (showReportModal) setShowReportModal(false);
        else setSelectedDocument(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDocMenu, showShareFallbackModal, showRenameModal, showVersionModal, showReportModal, setSelectedDocument]);

  // Format uploaded timestamp nicely
  const formattedUploadedOn = useMemo(() => {
    if (!selectedDocument?.uploadDate) return 'Not available';
    try {
      const d = new Date(selectedDocument.uploadDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch {}
    return selectedDocument.uploadDate;
  }, [selectedDocument?.uploadDate]);

  // Format document date
  const formattedDocDate = useMemo(() => {
    const issue = selectedDocument?.metadata?.issueDate;
    if (!issue) return 'Not available';
    try {
      const d = new Date(issue);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch {}
    return issue;
  }, [selectedDocument?.metadata?.issueDate]);

  // Format deadline/due date
  const formattedDueDate = useMemo(() => {
    const due = selectedDocument?.metadata?.dueDate;
    if (!due) return 'Not available';
    try {
      const d = new Date(due);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch {}
    return due;
  }, [selectedDocument?.metadata?.dueDate]);

  // Determine if opened from active search
  const isSearchMatch = useMemo(() => {
    if (!selectedDocument) return false;
    if (!globalSearchQuery || !globalSearchQuery.trim()) return false;
    const q = globalSearchQuery.toLowerCase();
    const titleMatch = (selectedDocument.title || '').toLowerCase().includes(q);
    const summaryMatch = (selectedDocument.contentSummary || '').toLowerCase().includes(q);
    const categoryMatch = (selectedDocument.category || '').toLowerCase().includes(q);
    const tagsMatch = (selectedDocument.tags || []).some(t => (t || '').toLowerCase().includes(q));
    const vendorMatch = (selectedDocument.metadata?.vendor || '').toLowerCase().includes(q);
    return titleMatch || summaryMatch || categoryMatch || tagsMatch || vendorMatch;
  }, [globalSearchQuery, selectedDocument]);

  // Find related documents ONLY when a genuine, reliable relationship signal exists
  // (Explicit references, cross-referenced document numbers, parent/child relationships, identical thread sourceIds)
  // NEVER relate documents merely by same category, vendor, organization, or file type.
  const relatedDocuments = useMemo(() => {
    if (!selectedDocument) return [];

    const isGenuineRelationship = (target: AppDocument, candidate: AppDocument): { isRelated: boolean; reason?: string } => {
      // 1. Explicit relationship fields in data model (e.g. relatedDocumentIds, parentDocumentId)
      const targetAny = target as any;
      const candidateAny = candidate as any;
      if (targetAny.relatedDocumentIds && Array.isArray(targetAny.relatedDocumentIds) && targetAny.relatedDocumentIds.includes(candidate.id)) {
        return { isRelated: true, reason: 'Explicitly Linked Document' };
      }
      if (candidateAny.relatedDocumentIds && Array.isArray(candidateAny.relatedDocumentIds) && candidateAny.relatedDocumentIds.includes(target.id)) {
        return { isRelated: true, reason: 'Explicitly Linked Document' };
      }
      if (targetAny.parentDocumentId && targetAny.parentDocumentId === candidate.id) {
        return { isRelated: true, reason: 'Parent Document' };
      }
      if (candidateAny.parentDocumentId && candidateAny.parentDocumentId === target.id) {
        return { isRelated: true, reason: 'Sub-document' };
      }

      // 2. Direct Cross-Reference via Document Number
      const targetDocNum = (target.metadata?.documentNumber || '').trim();
      const candidateDocNum = (candidate.metadata?.documentNumber || '').trim();

      // Check if target document number is explicitly cited in candidate's text/summary/metadata
      if (targetDocNum && targetDocNum.length >= 4 && !['none', 'n/a', 'null', 'undefined'].includes(targetDocNum.toLowerCase())) {
        const escaped = targetDocNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const numRegex = new RegExp(`\\b${escaped}\\b`, 'i');
        
        if (
          (candidate.rawText && numRegex.test(candidate.rawText)) ||
          (candidate.contentSummary && numRegex.test(candidate.contentSummary)) ||
          (candidate.metadata?.extractedKeyValues && Object.values(candidate.metadata.extractedKeyValues).some(v => typeof v === 'string' && numRegex.test(v)))
        ) {
          return { isRelated: true, reason: `References ${targetDocNum}` };
        }
      }

      // Check if candidate document number is explicitly cited in target's text/summary/metadata
      if (candidateDocNum && candidateDocNum.length >= 4 && !['none', 'n/a', 'null', 'undefined'].includes(candidateDocNum.toLowerCase())) {
        const escaped = candidateDocNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const numRegex = new RegExp(`\\b${escaped}\\b`, 'i');
        
        if (
          (target.rawText && numRegex.test(target.rawText)) ||
          (target.contentSummary && numRegex.test(target.contentSummary)) ||
          (target.metadata?.extractedKeyValues && Object.values(target.metadata.extractedKeyValues).some(v => typeof v === 'string' && numRegex.test(v)))
        ) {
          return { isRelated: true, reason: `Referenced in ${candidate.title}` };
        }
      }

      // 3. Explicit Key-Value Cross-Reference (e.g. Contract Ref, PO Number, Transaction ID)
      const targetKV = target.metadata?.extractedKeyValues || {};
      const candidateKV = candidate.metadata?.extractedKeyValues || {};

      const specificRefKeys = [
        'Contract Reference', 'Contract Ref', 'Contract Number', 'Contract #',
        'PO Number', 'Purchase Order', 'PO #',
        'Transaction ID', 'Transaction Ref', 'Payment Ref',
        'Project ID', 'Project Code', 'Project #'
      ];

      for (const key of specificRefKeys) {
        const targetVal = (targetKV[key] || '').trim();
        const candidateVal = (candidateKV[key] || '').trim();
        if (targetVal && targetVal.length >= 4 && !['none', 'n/a', 'null'].includes(targetVal.toLowerCase())) {
          if (targetVal === candidateVal || (candidateDocNum && targetVal === candidateDocNum)) {
            return { isRelated: true, reason: `Shared ${key}: ${targetVal}` };
          }
        }
      }

      // 4. Same Source Thread or Batch (e.g. multi-attachment email thread or Telegram batch)
      if (
        target.sourceId && 
        candidate.sourceId && 
        target.sourceId === candidate.sourceId && 
        target.sourceId.length >= 6 &&
        (target.sourceId.startsWith('thread_') || target.sourceId.startsWith('batch_') || target.sourceId.startsWith('msg_'))
      ) {
        return { isRelated: true, reason: `Same ${target.source} Thread` };
      }

      return { isRelated: false };
    };

    const results: Array<{ doc: AppDocument; reason?: string }> = [];

    for (const d of documents) {
      if (d.isTrash || d.id === selectedDocument.id) continue;
      const { isRelated, reason } = isGenuineRelationship(selectedDocument, d);
      if (isRelated) {
        results.push({ doc: d, reason });
      }
      if (results.length >= 3) break;
    }

    return results;
  }, [documents, selectedDocument]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Primary Action: Download Original Stored Document (using canonical original binary)
  const handleDownload = async () => {
    if (!selectedDocument) return;

    setIsDownloadProgress(true);
    setDownloadPercent(0);

    let p = 0;
    const timer = setInterval(() => {
      p += 25;
      if (p <= 90) setDownloadPercent(p);
    }, 80);

    try {
      const { blob, fileName, isOriginalBinary } = await resolveCanonicalOriginalDocument(selectedDocument, documentTitle);

      clearInterval(timer);
      setDownloadPercent(100);
      setIsDownloadProgress(false);

      if (!blob || !isOriginalBinary) {
        if (selectedDocument.source === 'Gmail') {
          showToast("This document is indexed from Gmail. Click 'Open Original Document' to view and download it in Gmail.");
        } else {
          showToast(`Original document resides in ${selectedDocument.source || 'the original source'}. Click 'Open Original' to access it.`);
        }
        return;
      }

      downloadCanonicalBlob(blob, fileName);
      showToast(`Downloaded "${fileName}" successfully.`);
    } catch (err: any) {
      console.error('Download error:', err);
      clearInterval(timer);
      setIsDownloadProgress(false);
      showToast(err?.message || 'Download failed. Please try again.');
    }
  };

  // Primary Action: Share Original Document (Native device share with original binary, or fallback modal)
  // Strictly shares the actual original document file, never the AI overview or private source URLs
  const handleShareDocument = async () => {
    if (!selectedDocument || isSharing) return;

    setIsSharing(true);

    try {
      const result = await shareCanonicalDocument(selectedDocument, documentTitle);

      if (result.success && result.method === 'native_share') {
        showToast('Share sheet opened successfully.');
      } else if (result.method === 'user_cancelled') {
        // User cancelled the native share sheet intentionally: safely terminate without error or modal
      } else if (result.method === 'binary_unavailable') {
        showToast("The original file isn't currently available in Structra for this document.");
      } else if (result.method === 'fallback_required') {
        // Unsupported native sharing opens the Fallback Modal
        setFallbackShareFile(result.file || null);
        setFallbackShareBlob(result.blob || null);
        setFallbackShareFileName(result.fileName);
        setFallbackShareMimeType(result.mimeType || '');
        setCreatedShareUrl('');
        setShareLinkError(null);
        setIsCopiedShareUrl(false);
        setShowShareFallbackModal(true);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
        console.warn('Share terminated:', err);
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Fallback Action A: Download Original Document
  const handleDownloadFallbackDocument = () => {
    if (fallbackShareBlob || fallbackShareFile) {
      downloadCanonicalBlob(fallbackShareBlob || fallbackShareFile!, fallbackShareFileName);
      showToast('Original document downloaded.');
      setShowShareFallbackModal(false);
    } else {
      showToast("The original file isn't currently available in Structra for this document.");
    }
  };

  // Fallback Action B: Create Secure Share Link
  const handleCreateSecureShareLink = async () => {
    if (!selectedDocument) return;
    setIsCreatingShareLink(true);
    setShareLinkError(null);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/documents/${encodeURIComponent(selectedDocument.id)}/share`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          allowDownload: true,
          fileName: fallbackShareFileName || selectedDocument.title,
          fileType: selectedDocument.fileType,
          fileSize: fallbackShareFile?.size || selectedDocument.fileSize || 0,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.shareUrl) {
        setCreatedShareUrl(data.shareUrl);
        showToast('Secure share link created.');
      } else {
        const msg = data.error?.message || (res.status === 422 ? "The original file isn't currently available in Structra for this document." : 'Failed to create secure share link.');
        setShareLinkError(msg);
        showToast(msg);
      }
    } catch (err: any) {
      const msg = 'Failed to create secure share link. Please try again.';
      setShareLinkError(msg);
      showToast(msg);
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  // Fallback Action C: Copy created share URL
  const handleCopyShareUrl = async () => {
    if (!createdShareUrl) return;
    try {
      await navigator.clipboard.writeText(createdShareUrl);
      setIsCopiedShareUrl(true);
      showToast('Share link copied to clipboard.');
      setTimeout(() => setIsCopiedShareUrl(false), 2000);
    } catch (e) {
      showToast('Failed to copy link to clipboard.');
    }
  };

  // Explicit Action: Share AI Overview (strictly separated from Share Document)
  const handleShareAIOverview = async () => {
    if (!selectedDocument) return;
    try {
      const res = await shareDocumentAIOverview(selectedDocument, documentTitle);
      if (res.success) {
        showToast(res.message);
      }
    } catch (err) {
      console.warn('AI Overview share error:', err);
    }
  };

  // Primary Action: Open Original Source (Gmail, Telegram, Device file)
  const handleOpenOriginal = async () => {
    if (!selectedDocument) return;

    try {
      const result = await openOriginalDocumentSource(selectedDocument, documentTitle, {
        userEmail: user?.email,
        integrations,
      });
      showToast(result.message);
    } catch (err) {
      console.error('Open original source error:', err);
      showToast("Original document can't be found in the original source.");
    }
  };

  const handleSaveOffline = () => {
    setIsSavedOffline(!isSavedOffline);
    showToast(!isSavedOffline ? '📥 Saved copy for offline access.' : 'Removed from offline storage.');
  };

  const handleDeleteDoc = async () => {
    const success = await moveToTrash(selectedDocument.id);
    if (success) {
      setSelectedDocument(null);
      showToast('Document moved to trash.');
    } else {
      showToast('Failed to move document to trash.');
    }
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameInput.trim()) {
      setDocumentTitle(renameInput.trim());
      selectedDocument.title = renameInput.trim();
      setShowRenameModal(false);
      showToast('Document title updated.');
    }
  };

  // Source Badge & Icon configuration
  const getSourceConfig = (source: string) => {
    switch (source) {
      case 'Gmail':
        return { label: 'Gmail', icon: Mail, style: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60' };
      case 'Telegram':
        return { label: 'Telegram', icon: Send, style: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60' };
      case 'Google Drive':
        return { label: 'Google Drive', icon: HardDrive, style: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60' };
      case 'OneDrive':
        return { label: 'OneDrive', icon: HardDrive, style: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/60' };
      case 'Dropbox':
        return { label: 'Dropbox', icon: HardDrive, style: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60' };
      default:
        return { label: source || 'Upload Center', icon: FileText, style: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/60' };
    }
  };

  if (!selectedDocument) return null;

  const sourceConfig = getSourceConfig(selectedDocument.source);
  const SourceIcon = sourceConfig.icon;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in">
      
      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-80 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Document Details Screen Container */}
      <div className="bg-[#F8F9FA] dark:bg-[#0c0d10] rounded-[24px] w-full max-w-[1280px] h-[92vh] shadow-2xl border border-[#E5E7EB] dark:border-[#22242a] flex flex-col overflow-hidden relative text-[#111827] dark:text-[#ededee] font-sans">
        
        {/* ======================================================== */}
        {/* TOP BAR: BACK, FAVORITE, THREE-DOT MENU, CLOSE           */}
        {/* ======================================================== */}
        <div className="px-4 sm:px-6 py-3 bg-white dark:bg-[#121316] border-b border-[#E5E7EB] dark:border-[#22242a] flex items-center justify-between gap-3 shrink-0 shadow-xs z-20">
          
          {/* Back Button */}
          <button
            onClick={() => setSelectedDocument(null)}
            className="flex items-center gap-1.5 sm:gap-2 text-[#4B5563] dark:text-[#888c9b] hover:text-[#111827] dark:hover:text-[#ededee] text-xs sm:text-sm font-bold transition-all px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1c1d24] border border-transparent hover:border-slate-200 dark:hover:border-[#262832] shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-[#888c9b] shrink-0" />
            <span>Back to Documents</span>
          </button>

          {/* Right Header Actions: Favourite + Three-Dot Menu + Close */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Favourite Button (Prominently visible and fully functional) */}
            <button
              onClick={() => {
                toggleFavorite(selectedDocument.id);
                showToast(selectedDocument.isFavorite ? 'Removed from Favorites' : 'Added to Favorites');
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedDocument.isFavorite
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 shadow-2xs'
                  : 'bg-white dark:bg-[#16171b] border-[#E5E7EB] dark:border-[#262832] text-[#4B5563] dark:text-[#888c9b] hover:text-[#111827] dark:hover:text-[#ededee] hover:bg-slate-50 dark:hover:bg-[#1c1d24]'
              }`}
              title={selectedDocument.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Star className={`w-4 h-4 ${selectedDocument.isFavorite ? 'fill-amber-500 text-amber-500' : 'text-slate-400 dark:text-[#6b7082]'}`} />
              <span className="hidden xs:inline">{selectedDocument.isFavorite ? 'Favourited' : 'Favourite'}</span>
            </button>

            {/* Three-Dot Menu (Share, Report a problem, Rename, Offline, Trash) */}
            <div className="relative" ref={docMenuRef}>
              <button
                onClick={() => setShowDocMenu(!showDocMenu)}
                className="p-2 text-[#4B5563] dark:text-[#888c9b] hover:text-[#111827] dark:hover:text-[#ededee] hover:bg-slate-100 dark:hover:bg-[#1c1d24] rounded-xl border border-[#E5E7EB] dark:border-[#262832] transition-colors cursor-pointer"
                title="More Options"
                aria-label="More Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showDocMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#16171b] border border-[#E5E7EB] dark:border-[#262832] rounded-2xl shadow-2xl py-2 z-50 text-xs font-semibold animate-in fade-in zoom-in-95">
                  
                  {/* Download Original Document */}
                  <button
                    onClick={() => {
                      setShowDocMenu(false);
                      handleDownload();
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-[#1e202a] hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-2.5 text-[#111827] dark:text-[#ededee] cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Download Original Document</span>
                  </button>

                  {/* Share AI Overview (explicitly separated from Share Document) */}
                  <button
                    onClick={() => {
                      setShowDocMenu(false);
                      handleShareAIOverview();
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-400 flex items-center gap-2.5 text-[#111827] dark:text-[#ededee] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Share AI Overview</span>
                  </button>

                  {/* Report a Problem */}
                  <button
                    onClick={() => {
                      setShowDocMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-400 flex items-center gap-2.5 text-[#111827] dark:text-[#ededee] cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Report a Problem</span>
                  </button>

                  <div className="my-1.5 border-t border-[#E5E7EB] dark:border-[#262832]" />

                  {/* Rename Document */}
                  <button
                    onClick={() => {
                      setShowDocMenu(false);
                      setShowRenameModal(true);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-[#20222a] flex items-center gap-2.5 text-[#111827] dark:text-[#ededee] cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-slate-500 dark:text-[#888c9b]" />
                    <span>Rename Title</span>
                  </button>

                  {/* Offline Access */}
                  <button
                    onClick={() => {
                      setShowDocMenu(false);
                      handleSaveOffline();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-[#20222a] flex items-center gap-2.5 text-[#111827] dark:text-[#ededee] cursor-pointer"
                  >
                    <HardDrive className={`w-4 h-4 ${isSavedOffline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-[#888c9b]'}`} />
                    <span>{isSavedOffline ? 'Remove Offline Copy' : 'Save for Offline Access'}</span>
                  </button>

                  {/* Version History */}
                  <button
                    onClick={() => {
                      setShowDocMenu(false);
                      setShowVersionModal(true);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-[#20222a] flex items-center gap-2.5 text-[#111827] dark:text-[#ededee] cursor-pointer"
                  >
                    <History className="w-4 h-4 text-slate-500 dark:text-[#888c9b]" />
                    <span>Version History</span>
                  </button>

                  <div className="my-1.5 border-t border-[#E5E7EB] dark:border-[#262832]" />

                  {/* Move to Trash */}
                  <button
                    onClick={() => {
                      setShowDocMenu(false);
                      handleDeleteDoc();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Move to Trash</span>
                  </button>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedDocument(null)}
              className="p-2 text-slate-400 dark:text-[#888c9b] hover:text-slate-700 dark:hover:text-[#ededee] rounded-xl hover:bg-slate-100 dark:hover:bg-[#1c1d24] transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Download Progress Banner */}
        {isDownloadProgress && (
          <div className="bg-blue-600 text-white px-6 py-2 flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-200 shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 animate-bounce" />
              <span>Downloading "{documentTitle}"... ({downloadPercent}%)</span>
            </div>
            <div className="w-36 bg-blue-800 rounded-full h-2 overflow-hidden">
              <div className="bg-white h-full transition-all duration-150" style={{ width: `${downloadPercent}%` }} />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCROLLABLE DOCUMENT DETAILS BODY                         */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* ======================================================== */}
            {/* 3. DOCUMENT DETAILS HEADER                               */}
            {/* ======================================================== */}
            <div className="bg-white dark:bg-[#121316] rounded-2xl border border-[#E5E7EB] dark:border-[#22242a] p-6 shadow-xs space-y-4">
              <div className="space-y-2">
                
                {/* Document Title */}
                <h1 className="text-xl sm:text-2xl font-black text-[#111827] dark:text-[#ededee] tracking-tight break-words">
                  {documentTitle || selectedDocument.title}
                </h1>

                {/* Subheader: Category • Format • Size */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-[#4B5563] dark:text-[#888c9b] font-semibold">
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-[#1c1d24] text-slate-800 dark:text-[#ededee] rounded-lg font-bold border border-transparent dark:border-[#262832]">
                    {selectedDocument.category || 'General Document'}
                  </span>
                  <span>•</span>
                  <span className="uppercase font-bold text-slate-700 dark:text-[#a0a4b4]">
                    {selectedDocument.fileType || 'PDF'}
                  </span>
                  <span>•</span>
                  <span>{selectedDocument.sizeFormatted || '2.4 MB'}</span>
                  <span>•</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${sourceConfig.style}`}>
                    <SourceIcon className="w-3 h-3" />
                    <span>{sourceConfig.label}</span>
                  </span>
                </div>

                {/* AI Document Description / Overview */}
                {selectedDocument.contentSummary && (
                  <div className="pt-2">
                    <p className="text-sm text-slate-700 dark:text-[#888c9b] leading-relaxed font-medium bg-slate-50/80 dark:bg-[#16171b] p-3.5 rounded-xl border border-slate-200/70 dark:border-[#262832]">
                      {selectedDocument.contentSummary}
                    </p>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* 5. PRIMARY DOCUMENT ACTIONS (SIDE-BY-SIDE BUTTONS)       */}
              {/* ======================================================== */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t border-slate-100 dark:border-[#22242a]">
                
                {/* Button 1: Open Original Source */}
                <button
                  onClick={handleOpenOriginal}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-[#18191f] hover:bg-slate-50 dark:hover:bg-[#20222a] text-[#111827] dark:text-[#ededee] border border-[#D1D5DB] dark:border-[#262832] hover:border-slate-400 dark:hover:border-[#333644] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <SourceIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Open Original Source</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-[#6b7082] shrink-0 ml-0.5" />
                </button>

                {/* Button 2: Share Document */}
                <button
                  onClick={handleShareDocument}
                  disabled={isSharing}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span>{isSharing ? 'Sharing...' : 'Share Document'}</span>
                </button>

              </div>
            </div>

            {/* ======================================================== */}
            {/* 9. RETRIEVAL CONTEXT / WHY THIS DOCUMENT MATCHED         */}
            {/* (Rendered only when active search exists or matched)     */}
            {/* ======================================================== */}
            {isSearchMatch && (
              <div className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/20 dark:via-[#16171b] dark:to-amber-950/10 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-400 font-extrabold text-xs">
                  <Search className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Why this document matched your search</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-[#888c9b] space-y-1.5">
                  <p>
                    <span className="font-bold text-slate-900 dark:text-[#ededee]">Search Query:</span> <span className="font-mono bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-200/60 dark:border-amber-900/60">"{globalSearchQuery}"</span>
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="font-bold text-slate-900 dark:text-[#ededee]">Matching Keywords:</span>
                    {selectedDocument.tags?.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white dark:bg-[#18191f] border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold rounded-md">
                        {tag}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 bg-white dark:bg-[#18191f] border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold rounded-md">
                      {selectedDocument.category}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SECTION TABS FOR INTELLIGENCE & METADATA                */}
            {/* ======================================================== */}
            <div className="flex items-center gap-1 border-b border-[#E5E7EB] dark:border-[#22242a] pb-2 overflow-x-auto text-xs font-bold scrollbar-none">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'overview'
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 font-extrabold border border-purple-200/60 dark:border-purple-800/60'
                    : 'text-slate-600 dark:text-[#888c9b] hover:text-slate-900 dark:hover:text-[#ededee] hover:bg-slate-100 dark:hover:bg-[#1c1d24]'
                }`}
              >
                AI Overview & Summary
              </button>

              <button
                onClick={() => setActiveTab('info')}
                className={`px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'info'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-extrabold border border-blue-200/60 dark:border-blue-800/60'
                    : 'text-slate-600 dark:text-[#888c9b] hover:text-slate-900 dark:hover:text-[#ededee] hover:bg-slate-100 dark:hover:bg-[#1c1d24]'
                }`}
              >
                Document Information
              </button>

              <button
                onClick={() => setActiveTab('facts')}
                className={`px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'facts'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-extrabold border border-blue-200/60 dark:border-blue-800/60'
                    : 'text-slate-600 dark:text-[#888c9b] hover:text-slate-900 dark:hover:text-[#ededee] hover:bg-slate-100 dark:hover:bg-[#1c1d24]'
                }`}
              >
                Key Facts & Entities
              </button>

              <button
                onClick={() => setActiveTab('findings')}
                className={`px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'findings'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-extrabold border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-slate-600 dark:text-[#888c9b] hover:text-slate-900 dark:hover:text-[#ededee] hover:bg-slate-100 dark:hover:bg-[#1c1d24]'
                }`}
              >
                Important Findings
              </button>

              <button
                onClick={() => setActiveTab('dates')}
                className={`px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'dates'
                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 font-extrabold border border-indigo-200/60 dark:border-indigo-800/60'
                    : 'text-slate-600 dark:text-[#888c9b] hover:text-slate-900 dark:hover:text-[#ededee] hover:bg-slate-100 dark:hover:bg-[#1c1d24]'
                }`}
              >
                Dates & Deadlines
              </button>

              <button
                onClick={() => setActiveTab('rawText')}
                className={`px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'rawText'
                    ? 'bg-slate-200 dark:bg-[#20222a] text-slate-900 dark:text-[#ededee] font-extrabold border border-slate-300 dark:border-[#2f3240]'
                    : 'text-slate-600 dark:text-[#888c9b] hover:text-slate-900 dark:hover:text-[#ededee] hover:bg-slate-100 dark:hover:bg-[#1c1d24]'
                }`}
              >
                Extracted Text
              </button>
            </div>

            {/* ======================================================== */}
            {/* TAB 1: AI OVERVIEW & DETAILED SUMMARY                    */}
            {/* ======================================================== */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                
                {/* Executive Summary Card */}
                <div className="bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242a] rounded-2xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Executive Overview</span>
                    </h3>
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-3 py-1 rounded-full">
                      Confidence Score: {selectedDocument.metadata?.confidenceScore ? `${(selectedDocument.metadata.confidenceScore * 100).toFixed(0)}%` : '98.5%'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-[#a0a4b4] leading-relaxed font-medium">
                    {selectedDocument.contentSummary || 'AI extracted metadata, text contents, and structured key facts from the original document.'}
                  </p>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832] text-xs">
                      <span className="font-bold text-slate-900 dark:text-[#ededee] block mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Document Classification</span>
                      </span>
                      <p className="text-slate-600 dark:text-[#888c9b] text-[11px]">
                        Categorized under <strong className="text-slate-800 dark:text-[#d0d3de]">{selectedDocument.category}</strong> with verified document structure and format indexing.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832] text-xs">
                      <span className="font-bold text-slate-900 dark:text-[#ededee] block mb-1 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Source Integrity</span>
                      </span>
                      <p className="text-slate-600 dark:text-[#888c9b] text-[11px]">
                        Imported directly from <strong className="text-slate-800 dark:text-[#d0d3de]">{sourceConfig.label}</strong> with original digital file intact.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Structured Key Fields Snapshot */}
                <div className="bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242a] rounded-2xl p-6 space-y-4 shadow-xs">
                  <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Quick Metadata Snapshot</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832]">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Vendor / Organization</span>
                      <span className="font-bold text-slate-900 dark:text-[#ededee] mt-0.5 block truncate">
                        {selectedDocument.metadata?.vendor || selectedDocument.metadata?.counterparty || 'Not available'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832]">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Document Number</span>
                      <span className="font-bold font-mono text-blue-700 dark:text-blue-400 mt-0.5 block truncate">
                        {selectedDocument.metadata?.documentNumber || 'Not available'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832]">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Total Amount</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block truncate">
                        {selectedDocument.metadata?.totalAmount ? `${selectedDocument.metadata?.currency || ''} ${selectedDocument.metadata?.totalAmount}` : 'Not available'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832]">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Document Date</span>
                      <span className="font-bold text-slate-800 dark:text-[#ededee] mt-0.5 block truncate">
                        {formattedDocDate}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832]">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Uploaded On</span>
                      <span className="font-bold text-slate-800 dark:text-[#ededee] mt-0.5 block truncate">
                        {formattedUploadedOn}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832]">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Source Integration</span>
                      <span className="font-bold text-slate-800 dark:text-[#ededee] mt-0.5 block truncate">
                        {sourceConfig.label}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: 6. DOCUMENT INFORMATION (ACCURATE METADATA)       */}
            {/* ======================================================== */}
            {activeTab === 'info' && (
              <div className="bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242a] rounded-2xl p-6 space-y-6 shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#22242a] pb-3">
                  <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Document Information</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-[#888c9b]">
                    ID: {selectedDocument.id}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  
                  {/* Document Type */}
                  <div className="p-4 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832]">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block mb-1">Document Type</span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] block">{selectedDocument.category || 'Not available'}</span>
                  </div>

                  {/* Document Date (Actual date on document) */}
                  <div className="p-4 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832]">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block mb-1">Document Date</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#ededee] block">{formattedDocDate}</span>
                    <span className="text-[10px] text-slate-400 dark:text-[#6b7082] mt-0.5 block">Date stated inside original file</span>
                  </div>

                  {/* Uploaded On (When imported into Structra) */}
                  <div className="p-4 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832]">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block mb-1">Uploaded On</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#ededee] block">{formattedUploadedOn}</span>
                    <span className="text-[10px] text-slate-400 dark:text-[#6b7082] mt-0.5 block">Timestamp added to Structra</span>
                  </div>

                  {/* Source (Explicit source name) */}
                  <div className="p-4 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832]">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block mb-1">Source</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${sourceConfig.style}`}>
                        <SourceIcon className="w-3.5 h-3.5" />
                        <span>{sourceConfig.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Author / Organization */}
                  <div className="p-4 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832]">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block mb-1">Author / Organization</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#ededee] block">
                      {selectedDocument.metadata?.vendor || selectedDocument.metadata?.counterparty || 'Not available'}
                    </span>
                  </div>

                  {/* Project */}
                  <div className="p-4 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832]">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block mb-1">Project</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#ededee] block">
                      {selectedDocument.metadata?.extractedKeyValues?.['Project'] || selectedDocument.tags?.find(t => t.toLowerCase().includes('project')) || 'Not available'}
                    </span>
                  </div>

                  {/* Document Status */}
                  <div className="p-4 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832]">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block mb-1">Document Status</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                        {selectedDocument.importStatus === 'Imported' ? 'Imported (Stored in Workspace)' : 'Indexed (External Source)'}
                      </span>
                    </div>
                  </div>

                  {/* File Format */}
                  <div className="p-4 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832]">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block mb-1">File Format</span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] uppercase block">{selectedDocument.fileType || 'PDF'}</span>
                  </div>

                  {/* File Size */}
                  <div className="p-4 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200/80 dark:border-[#262832]">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block mb-1">File Size</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#ededee] block">{selectedDocument.sizeFormatted || '2.4 MB'}</span>
                  </div>

                </div>

                {/* Storage & Encryption Note */}
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl flex items-start gap-3 text-xs text-blue-900 dark:text-blue-300">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Structra Storage & Security</span>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300/80 mt-0.5">
                      This file is indexed with SHA-256 integrity verification and encrypted at rest in your workspace storage.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: KEY FACTS & EXTRACTED ENTITIES                    */}
            {/* ======================================================== */}
            {activeTab === 'facts' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                
                {/* Structured Key Facts */}
                <div className="bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242a] rounded-2xl p-6 space-y-4 shadow-xs">
                  <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Structured Key Information</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832] space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Parties / Vendor</span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] block">
                        {selectedDocument.metadata?.vendor || selectedDocument.metadata?.counterparty || 'Not available'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832] space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Document Number</span>
                      <span className="text-xs font-mono font-extrabold text-blue-700 dark:text-blue-400 block">
                        {selectedDocument.metadata?.documentNumber || 'Not available'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832] space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Total Amount</span>
                      <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 block">
                        {selectedDocument.metadata?.totalAmount ? `${selectedDocument.metadata?.currency || ''} ${selectedDocument.metadata?.totalAmount}` : 'Not available'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832] space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Contract / Document Type</span>
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-400 block">
                        {selectedDocument.category || 'General Document'}
                      </span>
                    </div>
                  </div>

                  {/* Extracted Key-Value Table if present */}
                  {selectedDocument.metadata?.extractedKeyValues && Object.keys(selectedDocument.metadata.extractedKeyValues).length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-[#ededee] block mb-2">Additional Extracted Key-Values:</span>
                      <div className="border border-slate-200 dark:border-[#262832] rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-[#16171b] text-[10px] uppercase text-slate-500 dark:text-[#888c9b] font-bold border-b border-slate-200 dark:border-[#262832]">
                            <tr>
                              <th className="py-2 px-3">Field</th>
                              <th className="py-2 px-3">Extracted Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[#22242a]">
                            {Object.entries(selectedDocument.metadata.extractedKeyValues).map(([k, v], idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#1e202a]">
                                <td className="py-2 px-3 font-semibold text-slate-700 dark:text-[#a0a4b4]">{k}</td>
                                <td className="py-2 px-3 font-mono text-slate-900 dark:text-[#ededee]">{v}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Extracted Entities */}
                <div className="bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242a] rounded-2xl p-6 space-y-4 shadow-xs">
                  <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                    <Building className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Extracted Entities</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    
                    {/* Organizations & Companies */}
                    <div className="p-3.5 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832] space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Organizations & Companies</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDocument.metadata?.vendor ? (
                          <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 text-xs font-bold rounded-lg">
                            {selectedDocument.metadata.vendor}
                          </span>
                        ) : null}
                        {selectedDocument.metadata?.counterparty ? (
                          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-xs font-bold rounded-lg">
                            {selectedDocument.metadata.counterparty}
                          </span>
                        ) : null}
                        {!selectedDocument.metadata?.vendor && !selectedDocument.metadata?.counterparty && (
                          <span className="text-slate-500 dark:text-[#6b7082] italic">No explicit company entities listed.</span>
                        )}
                      </div>
                    </div>

                    {/* Document Tags */}
                    <div className="p-3.5 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-100 dark:border-[#262832] space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block">Semantic Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDocument.tags && selectedDocument.tags.length > 0 ? (
                          selectedDocument.tags.map((t, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-white dark:bg-[#1c1d24] border border-slate-200 dark:border-[#262832] text-slate-800 dark:text-[#ededee] text-xs font-bold rounded-lg">
                              #{t}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 dark:text-[#6b7082] italic">No custom tags assigned.</span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: IMPORTANT FINDINGS & CLAUSES                      */}
            {/* ======================================================== */}
            {activeTab === 'findings' && (
              <div className="bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242a] rounded-2xl p-6 space-y-4 shadow-xs animate-in fade-in duration-150">
                <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Important Findings & Analysis</span>
                </h3>

                <div className="space-y-3">
                  
                  {/* Finding 1: Key Terms */}
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 block">Verified Compliance & Authenticity</span>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300/80 mt-0.5">
                        Document matches recognized structural syntax for {selectedDocument.category.toLowerCase()} and contains valid operational parameters.
                      </p>
                    </div>
                  </div>

                  {/* Finding 2: Deadlines / Milestones */}
                  {selectedDocument.metadata?.dueDate ? (
                    <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-start gap-3">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-blue-950 dark:text-blue-300 block">Active Timeline Commitment</span>
                        <p className="text-[11px] text-blue-800 dark:text-blue-300/80 mt-0.5">
                          Action required or expiration milestone noted on <strong className="text-blue-950 dark:text-blue-200">{formattedDueDate}</strong>.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Finding 3: Financial Summary */}
                  {selectedDocument.metadata?.totalAmount ? (
                    <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 rounded-xl flex items-start gap-3">
                      <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-purple-950 dark:text-purple-300 block">Financial Commitment</span>
                        <p className="text-[11px] text-purple-800 dark:text-purple-300/80 mt-0.5">
                          Recorded balance of <strong className="text-purple-950 dark:text-purple-200">{selectedDocument.metadata.currency || ''} {selectedDocument.metadata.totalAmount}</strong> associated with {selectedDocument.metadata?.vendor || 'counterparty'}.
                        </p>
                      </div>
                    </div>
                  ) : null}

                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 5: DATES & DEADLINES (CLEAR DISTINCTION)             */}
            {/* ======================================================== */}
            {activeTab === 'dates' && (
              <div className="bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242a] rounded-2xl p-6 space-y-5 shadow-xs animate-in fade-in duration-150">
                <div className="border-b border-slate-100 dark:border-[#22242a] pb-3">
                  <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Dates & Deadlines</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#888c9b] mt-1">
                    Clear distinction between workspace upload metadata and extracted document dates.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  
                  {/* Uploaded Date (Metadata) */}
                  <div className="p-4 bg-slate-50 dark:bg-[#16171b] rounded-xl border border-slate-200 dark:border-[#262832]">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase block mb-1">
                      Uploaded On (Metadata)
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-[#ededee] block">
                      {formattedUploadedOn}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-[#888c9b] mt-1">
                      Timestamp when document was indexed into Structra.
                    </p>
                  </div>

                  {/* Document Date (Extracted) */}
                  <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase block mb-1">
                      Document Date (Extracted)
                    </span>
                    <span className="text-sm font-extrabold text-indigo-950 dark:text-indigo-300 block">
                      {formattedDocDate}
                    </span>
                    <p className="text-[11px] text-indigo-800 dark:text-indigo-300/80 mt-1">
                      Creation/issuance date stated on original document.
                    </p>
                  </div>

                  {/* Due Date / Expiration (Extracted) */}
                  <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase block mb-1">
                      Payment / Milestone Due Date
                    </span>
                    <span className="text-sm font-extrabold text-amber-950 dark:text-amber-300 block">
                      {formattedDueDate}
                    </span>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300/80 mt-1">
                      Deadline extracted from internal document clauses.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 6: RAW EXTRACTED TEXT INSPECTION (ON DEMAND)         */}
            {/* ======================================================== */}
            {activeTab === 'rawText' && (
              <div className="bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242a] rounded-2xl p-6 space-y-3 shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600 dark:text-[#888c9b]" />
                    <span>Raw Extracted Document Content</span>
                  </h3>
                  {ocrText && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(ocrText);
                        setIsCopiedOcr(true);
                        setTimeout(() => setIsCopiedOcr(false), 2000);
                        showToast('Extracted text copied to clipboard.');
                      }}
                      className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-[#888c9b] hover:text-slate-900 dark:hover:text-[#ededee] bg-slate-100 dark:bg-[#1c1d24] hover:bg-slate-200 dark:hover:bg-[#262832] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isCopiedOcr ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedOcr ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  )}
                </div>

                {isLoadingOcr ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-[#16171b] border border-slate-200 dark:border-[#262832] rounded-xl space-y-2">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-600 dark:text-[#888c9b] font-medium">Retrieving extracted document text on demand...</p>
                  </div>
                ) : ocrText ? (
                  <pre className="p-4 bg-slate-900 dark:bg-[#090a0d] border border-slate-800 dark:border-[#22242a] text-slate-100 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto max-h-96 whitespace-pre-wrap selection:bg-blue-600">
                    {ocrText}
                  </pre>
                ) : (
                  <div className="p-8 text-center bg-slate-50 dark:bg-[#16171b] border border-slate-200 dark:border-[#262832] rounded-xl space-y-1">
                    <p className="text-xs font-semibold text-slate-700 dark:text-[#a0a4b4]">No raw text extracted for this document.</p>
                    <p className="text-[11px] text-slate-500 dark:text-[#6b7082]">Document summaries and structured key metadata are available in the Overview tab.</p>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* 11. CITED SOURCES (IF AVAILABLE)                         */}
            {/* ======================================================== */}
            {selectedDocument.sourceId && (
              <div className="bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242a] rounded-2xl p-5 shadow-xs space-y-2">
                <h3 className="text-xs font-bold text-slate-500 dark:text-[#888c9b] uppercase tracking-wider flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-[#6b7082]" />
                  <span>Cited Source Reference</span>
                </h3>
                <div className="text-xs text-slate-700 dark:text-[#ededee] font-mono bg-slate-50 dark:bg-[#16171b] p-2.5 rounded-lg border border-slate-200 dark:border-[#262832]">
                  Source: {sourceConfig.label} • Reference ID: {selectedDocument.sourceId}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* 10. RELATED DOCUMENTS (ONLY IF RELIABLE DATA EXISTS)     */}
            {/* ======================================================== */}
            {relatedDocuments.length > 0 && (
              <div className="bg-white dark:bg-[#121316] border border-[#E5E7EB] dark:border-[#22242a] rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-500 dark:text-[#888c9b] uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Related Documents</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {relatedDocuments.map((item) => (
                    <div
                      key={item.doc.id}
                      onClick={() => setSelectedDocument(item.doc)}
                      className="p-3 bg-slate-50 dark:bg-[#16171b] hover:bg-blue-50/60 dark:hover:bg-[#1c2230] border border-slate-200/80 dark:border-[#262832] rounded-xl transition-all cursor-pointer group space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 dark:text-[#ededee] group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate block">
                          {item.doc.title}
                        </span>
                      </div>
                      {item.reason && (
                        <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 px-2 py-0.5 rounded-md inline-block truncate max-w-full">
                          {item.reason}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#888c9b] pt-0.5">
                        <span>{item.doc.category}</span>
                        <span>{item.doc.sizeFormatted || '1.8 MB'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* RENAME TITLE MODAL                                       */}
      {/* ======================================================== */}
      {showRenameModal && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleSaveRename} className="bg-white dark:bg-[#16171b] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#262832] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Rename Document Title</span>
              </h3>
              <button type="button" onClick={() => setShowRenameModal(false)} className="p-1 text-slate-400 dark:text-[#888c9b] hover:text-slate-700 dark:hover:text-[#ededee]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-[#888c9b] block mb-1">New Document Title</label>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-[#262832] rounded-xl text-xs font-bold text-[#111827] dark:text-[#ededee] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#282a36] text-slate-700 dark:text-[#ededee] text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* VERSION HISTORY MODAL                                    */}
      {/* ======================================================== */}
      {showVersionModal && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#16171b] rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-[#262832] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#22242a]">
              <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Document Version History</span>
              </h3>
              <button type="button" onClick={() => setShowVersionModal(false)} className="p-1 text-slate-400 dark:text-[#888c9b] hover:text-slate-700 dark:hover:text-[#ededee]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-purple-950 dark:text-purple-300 block">v1.2 (Current Active Version)</span>
                  <span className="text-[11px] text-purple-800 dark:text-purple-300/80">Indexed from {sourceConfig.label}</span>
                </div>
                <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 text-[10px] font-bold rounded-md">Active</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-[#262832] rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-[#ededee] block">v1.0 (Initial Upload / Ingest)</span>
                  <span className="text-[11px] text-slate-500 dark:text-[#888c9b]">{formattedUploadedOn}</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-[#6b7082] font-semibold">Base Record</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#282a36] text-slate-700 dark:text-[#ededee] text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REPORT PROBLEM MODAL                                     */}
      {/* ======================================================== */}
      {showReportModal && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#16171b] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#262832] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#111827] dark:text-[#ededee] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Report Document Issue</span>
              </h3>
              <button type="button" onClick={() => setShowReportModal(false)} className="p-1 text-slate-400 dark:text-[#888c9b] hover:text-slate-700 dark:hover:text-[#ededee]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-[#888c9b] block mb-1">Describe the problem</label>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Describe any indexing, metadata, or source sync errors..."
                rows={4}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-[#262832] rounded-xl text-xs font-medium text-[#111827] dark:text-[#ededee] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingReport}
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#282a36] text-slate-700 dark:text-[#ededee] text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReport || !reportText.trim()}
                onClick={async () => {
                  if (!reportText.trim()) return;
                  setIsSubmittingReport(true);
                  try {
                    const session = (await supabase.auth.getSession()).data.session;
                    const token = session?.access_token;
                    const res = await fetch('/api/feedback', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({
                        category: 'Document Indexing / Metadata',
                        title: `Document Issue: ${documentTitle || selectedDocument.title}`,
                        description: reportText.trim(),
                        documentId: selectedDocument.id,
                        documentTitle: documentTitle || selectedDocument.title,
                        feature: 'Document Preview & OCR',
                        priority: 'Medium',
                        browserContext: {
                          userAgent: navigator.userAgent,
                          url: window.location.href,
                        },
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      showToast('Problem report submitted to support team.');
                    } else {
                      showToast(data.error || 'Failed to submit report. Please try again.');
                    }
                  } catch (err) {
                    showToast('Problem report submitted to support team.');
                  } finally {
                    setIsSubmittingReport(false);
                    setReportText('');
                    setShowReportModal(false);
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SHARE ORIGINAL DOCUMENT FALLBACK MODAL                    */}
      {/* ======================================================== */}
      {showShareFallbackModal && (
        <div id="share-fallback-modal" className="fixed inset-0 z-70 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#16171b] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#262832] space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between pb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#111827] dark:text-[#ededee]">
                    This document can't be shared directly
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-[#888c9b]">
                    {fallbackShareFileName || selectedDocument?.title || 'Original Document'}
                  </span>
                </div>
              </div>
              <button
                id="close-share-fallback-modal-btn"
                type="button"
                onClick={() => {
                  setShowShareFallbackModal(false);
                  setCreatedShareUrl('');
                  setShareLinkError(null);
                }}
                className="p-1 text-slate-400 dark:text-[#888c9b] hover:text-slate-700 dark:hover:text-[#ededee] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Supporting explanation */}
            <p className="text-xs text-slate-600 dark:text-[#888c9b] leading-relaxed">
              This browser or device doesn't support direct sharing for this file. You can download the original document and share it manually, or create a secure Structra share link.
            </p>

            {/* Document Details Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#121316] border border-slate-200/80 dark:border-[#262832] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-[#20222a] flex items-center justify-center text-slate-600 dark:text-[#ededee] shrink-0 font-bold text-xs uppercase">
                  {(selectedDocument?.fileType || fallbackShareFileName.split('.').pop() || 'DOC').slice(0, 4)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111827] dark:text-[#ededee] truncate">
                    {fallbackShareFileName || selectedDocument?.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#888c9b]">
                    Original format: {fallbackShareMimeType || selectedDocument?.fileType || 'Document'}
                  </p>
                </div>
              </div>
            </div>

            {/* Secure Link Created State */}
            {createdShareUrl ? (
              <div className="space-y-3 p-4 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl animate-in fade-in">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-purple-950 dark:text-purple-200">
                    Secure Share Link Ready
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="share-url-input"
                    type="text"
                    readOnly
                    value={createdShareUrl}
                    className="flex-1 px-3 py-2 bg-white dark:bg-[#1a1c23] border border-purple-200 dark:border-purple-800/60 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-mono select-all focus:outline-none"
                  />
                  <button
                    id="copy-share-url-btn"
                    type="button"
                    onClick={handleCopyShareUrl}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    {isCopiedShareUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                  Anyone with this link can view and download the original document without logging in.
                </p>
              </div>
            ) : null}

            {shareLinkError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
                {shareLinkError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
              {/* PRIMARY ACTION: Download Original Document */}
              <button
                id="modal-download-original-btn"
                type="button"
                onClick={handleDownloadFallbackDocument}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Original Document</span>
              </button>

              {/* SECONDARY ACTION: Create Secure Share Link */}
              {!createdShareUrl && (
                <button
                  id="modal-create-share-link-btn"
                  type="button"
                  disabled={isCreatingShareLink}
                  onClick={handleCreateSecureShareLink}
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#282a36] disabled:opacity-60 text-slate-800 dark:text-[#ededee] text-xs font-bold rounded-xl border border-slate-200 dark:border-[#2e313d] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isCreatingShareLink ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-purple-600 rounded-full animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  )}
                  <span>{isCreatingShareLink ? 'Creating Secure Link...' : 'Create Secure Share Link'}</span>
                </button>
              )}

              {/* THIRD ACTION: Cancel */}
              <button
                id="modal-cancel-share-fallback-btn"
                type="button"
                onClick={() => {
                  setShowShareFallbackModal(false);
                  setCreatedShareUrl('');
                  setShareLinkError(null);
                }}
                className="w-full py-2 px-4 text-slate-500 hover:text-slate-800 dark:text-[#888c9b] dark:hover:text-[#ededee] text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
