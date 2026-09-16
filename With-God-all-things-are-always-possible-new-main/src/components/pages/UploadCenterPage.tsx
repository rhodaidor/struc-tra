import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileText, CheckCircle2, Loader2, 
  Sparkles, ShieldCheck, X, AlertTriangle, AlertCircle, Eye
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppDocument } from '../../types';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif'
];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const UploadCenterPage: React.FC = () => {
  const { 
    documents, 
    uploadJobs,
    processUploadedFile, 
    cancelUploadJob,
    setSelectedDocument, 
  } = useApp();

  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateModalFile, setDuplicateModalFile] = useState<{ file: File; existingDoc: AppDocument } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadJobs.some(j => j.status === 'Uploading' || j.status === 'Processing');

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Unsupported file type. Please upload PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, or TXT files.'
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: 'This file exceeds the 25 MB upload limit.'
      };
    }

    return { valid: true };
  };

  const [uploadedDocToast, setUploadedDocToast] = useState<AppDocument | null>(null);

  const handleProcessFile = async (file: File, options?: { replaceDocId?: string; overrideTitle?: string }) => {
    setValidationError(null);
    setSuccessToast(null);
    setUploadedDocToast(null);

    const doc = await processUploadedFile(file, options);
    setUploadedDocToast(doc);
    setSuccessToast('Document uploaded successfully.');
    setTimeout(() => {
      setSuccessToast(null);
    }, 8000);
  };

  const handleFilesSelection = (files: FileList | File[]) => {
    setValidationError(null);
    const rawList = Array.from(files);

    // Prevent duplicate uploads of identical file in a single action
    const seenNames = new Set<string>();
    const uniqueFiles: File[] = [];

    for (const file of rawList) {
      if (!seenNames.has(file.name.toLowerCase())) {
        seenNames.add(file.name.toLowerCase());
        uniqueFiles.push(file);
      }
    }

    for (const file of uniqueFiles) {
      const val = validateFile(file);
      if (!val.valid) {
        setValidationError(val.error || 'Unsupported file type.');
        return;
      }

      // Duplicate detection against existing indexed documents
      const existing = documents.find(d => !d.isTrash && d.title.toLowerCase() === file.name.toLowerCase());
      if (existing) {
        setDuplicateModalFile({ file, existingDoc: existing });
        return;
      }

      handleProcessFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelection(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelection(e.dataTransfer.files);
    }
  };

  const handleReplaceDuplicate = () => {
    if (duplicateModalFile) {
      const { file, existingDoc } = duplicateModalFile;
      setDuplicateModalFile(null);
      handleProcessFile(file, { replaceDocId: existingDoc.id });
    }
  };

  const handleKeepBothDuplicate = () => {
    if (duplicateModalFile) {
      const { file } = duplicateModalFile;
      setDuplicateModalFile(null);
      const parts = file.name.split('.');
      const ext = parts.length > 1 ? parts.pop() : '';
      const baseName = parts.join('.');
      const newTitle = `${baseName} (1)${ext ? '.' + ext : ''}`;
      handleProcessFile(file, { overrideTitle: newTitle });
    }
  };

  // Filter upload history (latest 10)
  const totalActiveDocsCount = documents.filter(doc => !doc.isTrash).length;
  const historyDocs = documents
    .filter(doc => !doc.isTrash)
    .slice(0, 10);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-[#ededee] tracking-tight flex items-center gap-2">
            Upload Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#888c9b] font-medium mt-0.5">
            Manual document ingestion engine with real-time AI auto-extraction & indexing.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Manual Document Mode Active</span>
        </div>
      </div>

      {/* Success Banner Alert */}
      {successToast && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <div className="flex items-center gap-2">
            {uploadedDocToast && (
              <button
                type="button"
                onClick={() => setSelectedDocument(uploadedDocToast)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Document</span>
              </button>
            )}
            <button 
              type="button"
              onClick={() => setSuccessToast(null)}
              className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Validation Error Banner Alert */}
      {validationError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-rose-900 dark:text-rose-200">Upload Validation Error</p>
              <p className="text-rose-700 dark:text-rose-400 font-medium mt-0.5">{validationError}</p>
            </div>
          </div>
          <button 
            onClick={() => setValidationError(null)}
            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg text-rose-700 dark:text-rose-400 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Upload Zone and Uploaded Documents Section */}
      <div className="space-y-6">
        
        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`p-8 sm:p-10 border-2 border-dashed rounded-3xl text-center transition-all ${
            validationError
              ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/20 scale-[1.005]'
              : isDragging
              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 scale-[1.01]'
              : 'border-slate-200 dark:border-[#262832] bg-white dark:bg-[#16171b] hover:border-blue-300 dark:hover:border-blue-500/50'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs ${
            validationError ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
          }`}>
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#ededee]">
            Drag & Drop Document Files Here
          </h3>
          
          <div className="space-y-0.5 text-xs text-slate-500 dark:text-[#888c9b] font-medium my-3">
            <p className="font-semibold text-slate-700 dark:text-[#d0d3de]">Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT</p>
            <p>Maximum file size: 25 MB per document</p>
          </div>

          <button 
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className={`inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-colors ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
          </button>
          <input 
            ref={fileInputRef}
            type="file" 
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
            onChange={handleFileInput} 
            className="hidden" 
          />

          <p className="text-[11px] text-slate-400 dark:text-[#6b7082] font-medium mt-3 italic">
            Note: Images are only supported via Gmail or Telegram Smart Import.
          </p>
        </div>

        {/* Active Upload Queue Card */}
        {uploadJobs.length > 0 && (
          <div className="bg-white dark:bg-[#16171b] rounded-3xl border border-slate-200/80 dark:border-[#22242a] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#22242a]">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                Upload & AI Processing Queue ({uploadJobs.length})
              </h3>
            </div>

            <div className="space-y-3">
              {uploadJobs.map((job) => (
                <div key={job.id} className="p-3.5 bg-slate-50 dark:bg-[#1c1e24] rounded-2xl border border-slate-100 dark:border-[#262832] space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-bold text-slate-900 dark:text-[#ededee] truncate">{job.fileName}</span>
                      <span className="text-[10px] text-slate-600 dark:text-[#888c9b] font-semibold bg-slate-200 dark:bg-[#282b36] px-1.5 py-0.5 rounded">
                        {job.fileType} • {job.sizeFormatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {job.status === 'Indexed' ? (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Indexed
                        </span>
                      ) : job.status === 'Failed' ? (
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Failed
                        </span>
                      ) : (
                        <button
                          onClick={() => cancelUploadJob(job.id)}
                          className="text-[11px] font-bold text-slate-400 dark:text-[#6b7082] hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Stage Status */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 dark:bg-[#282b36] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${
                          job.status === 'Indexed' ? 'bg-emerald-500' : job.status === 'Failed' ? 'bg-rose-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 dark:text-[#888c9b]">
                      <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-bold">
                        {job.status === 'Processing' || job.status === 'Uploading' ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
                        ) : null}
                        <span>Stage: {job.stage}</span>
                      </span>
                      <span>{job.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload History Table */}
        <div className="bg-white dark:bg-[#16171b] rounded-3xl border border-slate-200/80 dark:border-[#22242a] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#ededee]">
              Upload History {totalActiveDocsCount > 10 ? '(Latest 10)' : ''}
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-[#6b7082] font-medium">Total: {totalActiveDocsCount} documents</span>
          </div>

          {historyDocs.length === 0 ? (
            /* Empty State */
            <div className="text-center py-10 px-4 space-y-3 bg-slate-50/60 dark:bg-[#1c1e24]/50 rounded-2xl border border-dashed border-slate-200 dark:border-[#262832]">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-[#ededee]">Upload your first document</h4>
                <p className="text-[11px] text-slate-500 dark:text-[#888c9b] font-medium max-w-sm mx-auto mt-0.5">
                  Structra will automatically organize and index it for instant retrieval.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Upload Files
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#1c1e24] border-b border-slate-100 dark:border-[#22242a] text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Document Title</th>
                    <th className="py-2.5 px-2">Format</th>
                    <th className="py-2.5 px-2">Upload Date</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#22242a]">
                  {historyDocs.map((doc) => (
                    <tr 
                      key={doc.id} 
                      className="hover:bg-blue-50/40 dark:hover:bg-[#20222a] transition-colors cursor-pointer"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-[#ededee] flex items-center gap-2 max-w-xs truncate">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#20222a] text-slate-700 dark:text-[#ededee] font-bold text-[10px]">
                          {doc.fileType}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-500 dark:text-[#888c9b] text-[11px]">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1 border border-emerald-100 dark:border-emerald-900/40">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Indexed
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocument(doc);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          View Document
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Duplicate File Modal Dialog */}
      {duplicateModalFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#16171b] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#22242a] space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-[#ededee]">This document already exists.</h3>
                <p className="text-xs text-slate-500 dark:text-[#888c9b] font-medium mt-1">
                  A document named <span className="font-bold text-slate-800 dark:text-[#ededee]">"{duplicateModalFile.file.name}"</span> is already in your library. What would you like to do?
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleReplaceDuplicate}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs text-center cursor-pointer"
              >
                Replace Existing
              </button>
              
              <button
                onClick={handleKeepBothDuplicate}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#262832] text-slate-800 dark:text-[#ededee] font-bold rounded-xl text-xs transition-colors text-center cursor-pointer"
              >
                Keep Both (Rename Copy)
              </button>

              <button
                onClick={() => setDuplicateModalFile(null)}
                className="w-full py-2 px-4 text-slate-500 dark:text-[#888c9b] hover:text-slate-700 dark:hover:text-[#ededee] font-bold text-xs transition-colors text-center cursor-pointer"
              >
                Cancel Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
