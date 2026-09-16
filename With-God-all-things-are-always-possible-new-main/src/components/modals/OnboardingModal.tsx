import React, { useState, useEffect } from 'react';
import { 
  X, Check, ArrowRight, ArrowLeft, Mail, Send, 
  UploadCloud, Search, Sparkles, MessageSquareText,
  FileText, Shield, Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const OnboardingModal: React.FC = () => {
  const { 
    isOnboardingOpen, 
    completeOnboarding, 
    setCurrentPage 
  } = useApp();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Reset to Step 1 whenever the modal opens
  useEffect(() => {
    if (isOnboardingOpen) {
      setCurrentStep(1);
    }
  }, [isOnboardingOpen]);

  // Lock background scrolling while modal is open & listen for Escape key
  useEffect(() => {
    if (!isOnboardingOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        completeOnboarding();
      } else if (e.key === 'ArrowRight' && currentStep < 4) {
        setCurrentStep((prev) => (Math.min(prev + 1, 4) as 1 | 2 | 3 | 4));
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        setCurrentStep((prev) => (Math.max(prev - 1, 1) as 1 | 2 | 3 | 4));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOnboardingOpen, currentStep, completeOnboarding]);

  if (!isOnboardingOpen) return null;

  const handleSkip = () => {
    completeOnboarding();
    setCurrentPage('dashboard');
  };

  const handleConnectSource = () => {
    completeOnboarding();
    setCurrentPage('integrations');
  };

  const handleGoToUpload = () => {
    completeOnboarding();
    setCurrentPage('upload');
  };

  const handleSeeDocuments = () => {
    completeOnboarding();
    setCurrentPage('documents');
  };

  const handleFinish = () => {
    completeOnboarding();
    setCurrentPage('dashboard');
  };

  return (
    <div 
      className="fixed inset-0 z-[120] bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-card-title"
    >
      <div className="bg-white dark:bg-[#16171b] rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-[#262832] relative flex flex-col justify-between animate-in zoom-in-95 duration-200 text-slate-900 dark:text-[#ededee]">
        
        {/* Top Header: Step Indicator & Skip/Close */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#22242a] mb-6 shrink-0">
          
          {/* Progress Segment Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Step {currentStep} of 4
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setCurrentStep(step as 1 | 2 | 3 | 4)}
                  aria-label={`Go to step ${step}`}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    currentStep === step
                      ? 'w-6 bg-blue-600 dark:bg-blue-500'
                      : currentStep > step
                      ? 'w-2 bg-blue-300 dark:bg-blue-900 cursor-pointer'
                      : 'w-2 bg-slate-200 dark:bg-[#262832]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Quick Skip for Now / Close */}
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-[#ededee] px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors cursor-pointer flex items-center gap-1"
            title="Skip onboarding"
          >
            <span>Skip for now</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Body Content */}
        <div className="flex-1 min-h-[340px] flex flex-col justify-between">
          
          {/* ========================================================================= */}
          {/* CARD 1 — WELCOME TO STRUCTRA */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <h2 id="onboarding-card-title" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#ededee] tracking-tight">
                  Welcome to Structra 👋
                </h2>
                <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                  Turn scattered documents into instant answers.
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#888c9b] font-medium mt-3 leading-relaxed">
                  Your important documents can live across Gmail, Telegram, downloads, and different folders. Structra brings them together so you can find what you need without digging through every source.
                </p>
              </div>

              {/* Value Points */}
              <div className="space-y-2.5 bg-slate-50 dark:bg-[#1c1d23] p-4 rounded-2xl border border-slate-100 dark:border-[#262832]">
                <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Bring documents into one place</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Find files faster</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Ask questions about your documents</span>
                </div>
              </div>

              {/* Footer Actions for Card 1 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-[#22242a]">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full sm:w-auto py-2.5 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-[#ededee] rounded-xl hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors text-center order-2 sm:order-1 cursor-pointer"
                >
                  Skip for now
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto py-3 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 order-1 sm:order-2 cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CARD 2 — BRING YOUR DOCUMENTS IN */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                <Layers className="w-6 h-6" />
              </div>

              <div>
                <h2 id="onboarding-card-title" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#ededee] tracking-tight">
                  Bring your documents into one place
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#888c9b] font-medium mt-2 leading-relaxed">
                  Connect the sources where your documents already live, or upload a file directly. Structra can organize and index supported documents so they're easier to find later.
                </p>
              </div>

              {/* Existing Integration Options */}
              <div className="grid grid-cols-1 gap-2.5">
                {/* Gmail Option */}
                <div 
                  onClick={handleConnectSource}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#262832] bg-slate-50/50 dark:bg-[#1c1d23] hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all flex items-start gap-3.5 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#ededee] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Gmail
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#888c9b] mt-0.5">
                      Bring in supported email attachments.
                    </p>
                  </div>
                </div>

                {/* Telegram Option */}
                <div 
                  onClick={handleConnectSource}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#262832] bg-slate-50/50 dark:bg-[#1c1d23] hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all flex items-start gap-3.5 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#ededee] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Telegram
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#888c9b] mt-0.5">
                      Import supported documents from your Telegram sources.
                    </p>
                  </div>
                </div>

                {/* Upload Center Option */}
                <div 
                  onClick={handleGoToUpload}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#262832] bg-slate-50/50 dark:bg-[#1c1d23] hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all flex items-start gap-3.5 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#ededee] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Upload Center
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#888c9b] mt-0.5">
                      Upload a document directly from your device.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Actions for Card 2 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-[#22242a]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="py-2.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-[#ededee] rounded-xl hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 sm:flex-initial py-2.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors text-center cursor-pointer"
                  >
                    I'll do this later
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectSource}
                    className="flex-1 sm:flex-initial py-2.5 px-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Connect a Source</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CARD 3 — FIND WHAT YOU NEED */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                <Search className="w-6 h-6" />
              </div>

              <div>
                <h2 id="onboarding-card-title" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#ededee] tracking-tight">
                  Find exactly what you need
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#888c9b] font-medium mt-2 leading-relaxed">
                  Instead of scrolling through emails, chats, or folders, search your Structra documents using the information you remember about the file.
                </p>
              </div>

              {/* Search Example Prompts */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1c1d23] border border-slate-200/80 dark:border-[#262832] flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-xs font-black">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 italic">
                    “Find the proposal I received last month”
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1c1d23] border border-slate-200/80 dark:border-[#262832] flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-xs font-black">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 italic">
                    “Show me the PDF about the 2026 project budget”
                  </span>
                </div>

                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#888c9b] font-medium px-1">
                  Structra surfaces the relevant file from the documents available in your account.
                </p>
              </div>

              {/* Supporting Value Highlight */}
              <div className="py-2.5 px-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold text-xs sm:text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Search less. Find faster.</span>
              </div>

              {/* Footer Actions for Card 3 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-[#22242a]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="py-2.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-[#ededee] rounded-xl hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleSeeDocuments}
                    className="flex-1 sm:flex-initial py-2.5 px-4 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors text-center cursor-pointer"
                  >
                    See My Documents
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="flex-1 sm:flex-initial py-2.5 px-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CARD 4 — ASK STRUCTRA */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquareText className="w-6 h-6" />
              </div>

              <div>
                <h2 id="onboarding-card-title" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#ededee] tracking-tight">
                  Your documents can answer questions too
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#888c9b] font-medium mt-2 leading-relaxed">
                  Once your documents are in Structra, you can use the AI Assistant to ask questions about the information inside them.
                </p>
              </div>

              {/* AI Question Examples */}
              <div className="space-y-2 bg-slate-50 dark:bg-[#1c1d23] p-4 rounded-2xl border border-slate-200/80 dark:border-[#262832]">
                <div className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>“What were the payment terms in this contract?”</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>“Summarize the key points from this report.”</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>“Which document contains the project budget?”</span>
                </div>

                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#888c9b] font-medium pt-2 border-t border-slate-200/60 dark:border-[#2a2c38]">
                  Structra uses the documents available in your workspace to help answer your questions.
                </p>
              </div>

              {/* Supporting Value Highlight */}
              <div className="py-2.5 px-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold text-xs sm:text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Your documents, organized and ready to work for you.</span>
              </div>

              {/* Footer Actions for Card 4 */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-[#22242a]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="py-2.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-[#ededee] rounded-xl hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="py-3 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Start Using Structra</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
