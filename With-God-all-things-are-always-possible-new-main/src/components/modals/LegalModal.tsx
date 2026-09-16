import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Scale, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TermsOfServiceContent, PrivacyPolicyContent } from '../common/LegalContent';

export const LegalModal: React.FC = () => {
  const { legalModalType, closeLegalModal, openLegalModal } = useApp();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  useEffect(() => {
    if (legalModalType) {
      setActiveTab(legalModalType);
      
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      const mainEl = document.querySelector('main');
      const originalMainOverflow = mainEl ? mainEl.style.overflow : '';

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      if (mainEl) {
        mainEl.style.overflow = 'hidden';
      }

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;
        if (mainEl) {
          mainEl.style.overflow = originalMainOverflow;
        }
      };
    }
  }, [legalModalType]);

  if (!legalModalType) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={closeLegalModal}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {activeTab === 'terms' ? <Scale className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                Structra AI Document Intelligence • Last updated July 2026
              </p>
            </div>
          </div>

          <button
            onClick={closeLegalModal}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'terms'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'privacy'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7">
          {activeTab === 'terms' ? <TermsOfServiceContent /> : <PrivacyPolicyContent />}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => setActiveTab(activeTab === 'terms' ? 'privacy' : 'terms')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 order-2 sm:order-1"
          >
            <span>Switch to {activeTab === 'terms' ? 'Privacy Policy' : 'Terms of Service'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={closeLegalModal}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all order-1 sm:order-2 cursor-pointer"
          >
            I Understand & Accept
          </button>
        </div>

      </div>
    </div>
  );
};
