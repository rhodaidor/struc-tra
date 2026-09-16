import React, { useState } from 'react';
import { 
  Download, ZoomIn, ZoomOut, RotateCw, Sparkles, FileText, 
  AlertTriangle, RefreshCw, CheckCircle2, Info, Eye
} from 'lucide-react';

interface ImageRendererProps {
  fileUrl?: string | null;
  documentTitle: string;
  selectedDocument: any;
  zoom?: number;
  imageZoom: number;
  setImageZoom: React.Dispatch<React.SetStateAction<number>>;
  imageRotation: number;
  setImageRotation: React.Dispatch<React.SetStateAction<number>>;
  handleDownload: () => void;
}

export const ImageRenderer: React.FC<ImageRendererProps> = ({
  fileUrl,
  documentTitle,
  selectedDocument,
  zoom = 100,
  imageZoom,
  setImageZoom,
  imageRotation,
  setImageRotation,
  handleDownload,
}) => {
  const [imageError, setImageError] = useState<boolean>(false);
  const [showAiInsights, setShowAiInsights] = useState<boolean>(false);

  const imgSrc = fileUrl || selectedDocument.fileUrl;
  const fileTypeUpper = (selectedDocument.fileType || 'IMAGE').toUpperCase();

  return (
    <div className="w-full h-full flex-1 overflow-y-auto box-border">
      <div 
        className="w-full max-w-5xl mx-auto space-y-4 pb-12 flex flex-col items-center"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Image Toolbar Header */}
        <div className="w-full bg-[#0F172A] text-white p-4 sm:p-5 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md">
              IMG
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-white">{documentTitle}</h3>
                
                {!imageError ? (
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold rounded-md border border-indigo-500/30 uppercase">
                    ORIGINAL {fileTypeUpper} IMAGE
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold rounded-md border border-amber-500/30 uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    AI PREVIEW
                  </span>
                )}
              </div>
              
              <p className="text-[11px] text-slate-400 mt-1">
                Original Attachment Preserved • {selectedDocument.sizeFormatted || 'Original File'} • {selectedDocument.source || 'Upload Center'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImageZoom(prev => Math.max(50, prev - 25))}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-bold text-slate-200 px-2 bg-slate-800 py-1.5 rounded-lg border border-slate-700">
              {imageZoom}%
            </span>

            <button
              type="button"
              onClick={() => setImageZoom(prev => Math.min(300, prev + 25))}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setImageRotation(prev => (prev + 90) % 360)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
              title="Rotate Clockwise"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowAiInsights(!showAiInsights)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                showAiInsights
                  ? 'bg-indigo-500 text-white border-indigo-400 font-extrabold shadow-md'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI OCR & Insights</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md border border-indigo-500"
            >
              <Download className="w-4 h-4" />
              <span>Download Image</span>
            </button>
          </div>
        </div>

        {/* AI Enhancement Drawer / OCR Extracted Text Panel */}
        {showAiInsights && (
          <div className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Enhancement & OCR Optical Text Extraction</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 font-bold bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700">
                OCR Active
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                {selectedDocument.contentSummary || 'Original image processed with AI OCR for structured text extraction and search indexing.'}
              </p>
              {selectedDocument.rawText && (
                <div className="p-3 bg-slate-900/80 rounded-xl border border-indigo-900 font-mono text-xs text-indigo-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedDocument.rawText}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Original Image Canvas View */}
        <div className="bg-[#020617] rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-12 min-h-[520px] w-full flex items-center justify-center overflow-auto relative">
          {!imageError && imgSrc ? (
            <img
              src={imgSrc}
              alt={documentTitle}
              onError={() => setImageError(true)}
              className="max-w-full h-auto rounded-xl shadow-2xl object-contain transition-all duration-300"
              style={{
                transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                maxHeight: '70vh',
              }}
            />
          ) : (
            /* AI Preview Fallback if Image Loading Fails */
            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 max-w-xl text-center space-y-5">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold rounded-lg border border-amber-500/30">
                  AI PREVIEW
                </span>
                <h3 className="text-lg font-bold text-white mt-2">{documentTitle}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Original image file binary is stored safely in your Structra account. Showing AI OCR text summary.
                </p>
              </div>

              {selectedDocument.rawText && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-left font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedDocument.rawText}
                </div>
              )}

              <button
                type="button"
                onClick={handleDownload}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Original Image File</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
