import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  ChevronLeft, ChevronRight, Download, Sparkles, RefreshCw, 
  Play, Pause, FileText, Layout, Info, AlertTriangle, Layers, Tag, Database
} from 'lucide-react';

interface ParsedSlideShape {
  text: string;
  isTitle?: boolean;
  x?: number; // % or EMU
  y?: number;
  width?: number;
  height?: number;
  fontSize?: string;
  color?: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  bgColor?: string;
}

interface ParsedSlideImage {
  id: string;
  dataUrl: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface ParsedSlide {
  slideNumber: number;
  title: string;
  shapes: ParsedSlideShape[];
  images: ParsedSlideImage[];
  rawText: string;
  bgColor?: string;
}

interface PptxRendererProps {
  fileUrl?: string | null;
  previewPdfUrl?: string | null;
  documentTitle: string;
  selectedDocument: any;
  zoom?: number;
  handleDownload: () => void;
}

export const PptxRenderer: React.FC<PptxRendererProps> = ({
  fileUrl,
  previewPdfUrl,
  documentTitle,
  selectedDocument,
  zoom = 100,
  handleDownload,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [slides, setSlides] = useState<ParsedSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isOriginalRendered, setIsOriginalRendered] = useState<boolean>(false);
  const [showAiInsights, setShowAiInsights] = useState<boolean>(false);

  // If a Preview PDF is available, render via high-fidelity PDF object viewer
  if (previewPdfUrl) {
    return (
      <div className="w-full h-full flex-1 flex flex-col overflow-hidden">
        <div 
          className="w-full h-full flex-1 flex flex-col items-center justify-center"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <object
            data={`${previewPdfUrl}#toolbar=0&navpanes=0`}
            type="application/pdf"
            className="w-full h-full min-h-[720px] rounded-2xl border border-slate-200/90 shadow-2xl bg-white"
          >
            <iframe
              src={`${previewPdfUrl}#toolbar=0`}
              title={documentTitle}
              className="w-full h-full min-h-[720px] rounded-2xl border border-slate-200/90 shadow-2xl bg-white"
            />
          </object>
        </div>
      </div>
    );
  }

  // Parse PPTX file using JSZip
  useEffect(() => {
    let isMounted = true;

    const parsePptx = async () => {
      setLoading(true);
      setIsOriginalRendered(false);
      setSlides([]);

      if (!fileUrl) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        let arrayBuffer: ArrayBuffer | null = null;

        if (fileUrl.startsWith('data:')) {
          const parts = fileUrl.split(',');
          if (parts.length >= 2) {
            const base64 = parts[1];
            const binaryStr = atob(base64);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            arrayBuffer = bytes.buffer;
          }
        } else {
          try {
            const res = await fetch(fileUrl);
            if (res.ok) {
              arrayBuffer = await res.arrayBuffer();
            }
          } catch (e) {
            console.warn('Fetch PPTX failed:', e);
          }
        }

        if (arrayBuffer && arrayBuffer.byteLength > 100) {
          const zip = await JSZip.loadAsync(arrayBuffer);
          
          // Find all slide files ppt/slides/slide1.xml, etc.
          const slideFiles: { name: string; num: number }[] = [];
          zip.forEach((relativePath) => {
            const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
            if (match) {
              slideFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
            }
          });

          // Sort by slide number
          slideFiles.sort((a, b) => a.num - b.num);

          if (slideFiles.length > 0) {
            // Load media images
            const mediaMap: Record<string, string> = {};
            const mediaFiles = zip.file(/^ppt\/media\//);
            for (const mediaFile of mediaFiles) {
              try {
                const mime = mediaFile.name.endsWith('.png') ? 'image/png' 
                  : mediaFile.name.endsWith('.jpg') || mediaFile.name.endsWith('.jpeg') ? 'image/jpeg' 
                  : mediaFile.name.endsWith('.gif') ? 'image/gif' 
                  : mediaFile.name.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
                const base64 = await mediaFile.async('base64');
                const relPath = mediaFile.name.replace(/^ppt\//, '');
                mediaMap[relPath] = `data:${mime};base64,${base64}`;
                // also store filename alone for lookup
                const fileNameOnly = mediaFile.name.split('/').pop() || '';
                mediaMap[fileNameOnly] = `data:${mime};base64,${base64}`;
              } catch (e) {
                console.warn('Media decode notice:', e);
              }
            }

            const parsedSlidesList: ParsedSlide[] = [];

            for (let i = 0; i < slideFiles.length; i++) {
              const fileObj = slideFiles[i];
              const slideXmlStr = await zip.file(fileObj.name)?.async('string') || '';

              // Parse XML relationships for slide
              const relPath = `ppt/slides/_rels/slide${fileObj.num}.xml.rels`;
              const relsXmlStr = await zip.file(relPath)?.async('string') || '';

              const rIdToMedia: Record<string, string> = {};
              if (relsXmlStr) {
                const parser = new DOMParser();
                const relsDoc = parser.parseFromString(relsXmlStr, 'application/xml');
                const relEls = relsDoc.getElementsByTagName('Relationship');
                for (let r = 0; r < relEls.length; r++) {
                  const rId = relEls[r].getAttribute('Id');
                  const target = relEls[r].getAttribute('Target') || '';
                  if (rId && target) {
                    const cleanTarget = target.replace('../', '');
                    if (mediaMap[cleanTarget]) {
                      rIdToMedia[rId] = mediaMap[cleanTarget];
                    } else {
                      const fileOnly = target.split('/').pop() || '';
                      if (mediaMap[fileOnly]) {
                        rIdToMedia[rId] = mediaMap[fileOnly];
                      }
                    }
                  }
                }
              }

              // Parse slide XML
              const parser = new DOMParser();
              const slideDoc = parser.parseFromString(slideXmlStr, 'application/xml');

              const textParagraphs = slideDoc.getElementsByTagName('a:p');
              const extractedShapes: ParsedSlideShape[] = [];
              let slideTitle = `Slide ${fileObj.num}`;
              let allText = '';

              for (let p = 0; p < textParagraphs.length; p++) {
                const paragraph = textParagraphs[p];
                const textRuns = paragraph.getElementsByTagName('a:t');
                let paragraphText = '';
                for (let r = 0; r < textRuns.length; r++) {
                  paragraphText += textRuns[r].textContent || '';
                }

                if (paragraphText.trim()) {
                  allText += paragraphText.trim() + '\n';
                  const isTitle = p === 0 || paragraphText.length < 60;
                  if (p === 0 && paragraphText.trim().length > 2) {
                    slideTitle = paragraphText.trim();
                  }

                  extractedShapes.push({
                    text: paragraphText.trim(),
                    isTitle,
                    bold: paragraphText.length < 50,
                  });
                }
              }

              // Extract Images in slide
              const blipEls = slideDoc.getElementsByTagName('a:blip');
              const slideImages: ParsedSlideImage[] = [];
              for (let b = 0; b < blipEls.length; b++) {
                const embedId = blipEls[b].getAttribute('r:embed');
                if (embedId && rIdToMedia[embedId]) {
                  slideImages.push({
                    id: embedId,
                    dataUrl: rIdToMedia[embedId],
                  });
                }
              }

              parsedSlidesList.push({
                slideNumber: i + 1,
                title: slideTitle,
                shapes: extractedShapes,
                images: slideImages,
                rawText: allText,
              });
            }

            if (isMounted && parsedSlidesList.length > 0) {
              setSlides(parsedSlidesList);
              setIsOriginalRendered(true);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('PPTX client unzip failed, falling back to AI preview:', err);
      }

      if (isMounted) {
        setIsOriginalRendered(false);
        setLoading(false);
      }
    };

    parsePptx();

    return () => {
      isMounted = false;
    };
  }, [fileUrl]);

  // Slideshow timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && slides.length > 1) {
      interval = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
      }, 3500);
    } else {
      setIsPlaying(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, slides.length]);

  const currentSlide = slides[currentSlideIndex];
  const totalSlideCount = slides.length || 5;

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto min-h-[450px] flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-xl my-6">
        <RefreshCw className="w-10 h-10 text-amber-600 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-800">Reading PowerPoint Presentation Slides...</p>
        <p className="text-xs text-slate-400 mt-1">Extracting slide layouts, graphics, shapes, and images</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex-1 overflow-y-auto box-border">
      <div 
        className="w-full max-w-5xl mx-auto space-y-4 pb-12"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* PowerPoint Navigation Header */}
        <div className="bg-[#0F172A] text-white p-4 sm:p-5 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-amber-600 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md">
              PPT
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-white">{documentTitle}</h3>
                
                {/* Status Badge */}
                {isOriginalRendered ? (
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded-md border border-emerald-500/30 uppercase">
                    ORIGINAL PPTX RENDERED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold rounded-md border border-amber-500/30 uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    AI PREVIEW
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 mt-1">
                Slide {currentSlideIndex + 1} of {totalSlideCount} • {selectedDocument.sizeFormatted || 'Original File'} • {selectedDocument.source || 'Upload Center'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
              title="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-bold text-slate-200 px-2 bg-slate-800/80 py-1.5 rounded-lg border border-slate-700">
              {currentSlideIndex + 1} / {totalSlideCount}
            </span>

            <button
              type="button"
              onClick={() => setCurrentSlideIndex(prev => Math.min(totalSlideCount - 1, prev + 1))}
              disabled={currentSlideIndex === totalSlideCount - 1}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
              title="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAiInsights(!showAiInsights)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                showAiInsights
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Insights</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md border border-amber-500"
            >
              <Download className="w-4 h-4" />
              <span>Download PPTX</span>
            </button>
          </div>
        </div>

        {/* AI Insights Enhancement Drawer / Bar */}
        {showAiInsights && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>AI Enhancement Layer (Summary & Key Points)</span>
              </div>
              <span className="text-[10px] font-mono text-amber-700 font-bold bg-amber-200/60 px-2 py-0.5 rounded">
                Enhancement Active
              </span>
            </div>
            <p className="text-xs text-amber-950 leading-relaxed font-medium">
              {selectedDocument.contentSummary || 'AI indexed original slides for instant semantic search and slide analytics.'}
            </p>
            {selectedDocument.tags && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedDocument.tags.map((t: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 bg-amber-200/80 text-amber-900 font-bold text-[10px] rounded-md border border-amber-300">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 16:9 Presentation Canvas */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden p-8 sm:p-14 min-h-[500px] flex flex-col justify-between relative">
          {/* Render Original PPTX Slides if Unzipped */}
          {isOriginalRendered && currentSlide ? (
            <div className="space-y-6 my-auto">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {currentSlide.title || `Slide ${currentSlide.slideNumber}`}
                </h2>
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                  SLIDE {currentSlide.slideNumber < 10 ? `0${currentSlide.slideNumber}` : currentSlide.slideNumber}
                </span>
              </div>

              {/* Render Images in current slide */}
              {currentSlide.images.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                  {currentSlide.images.map((img, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2 shadow-xs">
                      <img 
                        src={img.dataUrl} 
                        alt={`Slide graphic ${idx + 1}`} 
                        className="max-h-56 w-auto mx-auto object-contain rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Render Shapes / Text Elements */}
              <div className="space-y-3">
                {currentSlide.shapes.length > 0 ? (
                  currentSlide.shapes.map((shape, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border transition-all ${
                        shape.isTitle 
                          ? 'bg-amber-50/70 border-amber-200 font-bold text-slate-900 text-lg'
                          : 'bg-slate-50 border-slate-200/80 text-slate-700 text-sm leading-relaxed'
                      }`}
                    >
                      {shape.text}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 font-sans">{currentSlide.rawText || 'Slide content rendered from original presentation binary.'}</p>
                )}
              </div>
            </div>
          ) : (
            /* Honest empty state when presentation slides cannot be rendered from binary */
            <div className="space-y-6 my-auto text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-3 shadow-xs">
                <Layout className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">PowerPoint Visual Preview Unavailable</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                The visual presentation slides could not be extracted directly from the uploaded binary. The original file is available for download, and extracted insights can be viewed in the AI Summary tab.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Original Presentation</span>
                </button>
              </div>
            </div>
          )}

          {/* Slide Footer */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Structra Presentation Engine</span>
            <span>Slide {currentSlideIndex + 1} of {totalSlideCount}</span>
          </div>
        </div>

        {/* Thumbnail Strip */}
        <div className="bg-[#0F172A] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-center gap-2 overflow-x-auto shadow-xl">
          {Array.from({ length: totalSlideCount }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlideIndex(idx)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                currentSlideIndex === idx
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Slide {idx + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
