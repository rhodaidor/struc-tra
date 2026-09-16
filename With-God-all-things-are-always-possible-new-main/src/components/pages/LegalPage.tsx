import React, { useEffect } from 'react';
import { ShieldCheck, Scale, ArrowLeft, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StructraLogo } from '../common/StructraLogo';
import { TermsOfServiceContent, PrivacyPolicyContent } from '../common/LegalContent';

export interface LegalPageProps {
  type: 'terms' | 'privacy';
  onNavigateHome?: () => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ type, onNavigateHome }) => {
  const { user, setCurrentPage } = useApp();

  // Scroll to top whenever type changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [type]);

  const handleHomeClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      setCurrentPage(user ? 'dashboard' : 'landing');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleHomeClick}
              className="inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
              aria-label="Structra Home"
            >
              <StructraLogo size="sm" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleHomeClick}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to</span> {user ? 'Dashboard' : 'Home'}
            </button>

            {!user ? (
              <button
                type="button"
                onClick={() => setCurrentPage('login')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Sign In</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentPage('dashboard')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Open App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Header Hero Section */}
        <div className="space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            {type === 'terms' ? <Scale className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>Structra Legal & Compliance</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Effective Date: July 2026 • Official Legal Documentation for Structra Inc.
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex gap-1.5 max-w-md">
          <button
            type="button"
            onClick={() => setCurrentPage('terms')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              type === 'terms'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage('privacy')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              type === 'privacy'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Policy Document Content Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none text-left">
          {type === 'terms' ? <TermsOfServiceContent /> : <PrivacyPolicyContent />}
        </div>

        {/* Trust and Security Summary Card */}
        <div className="bg-slate-100/80 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Enterprise-Grade Privacy & Security Commitment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How Structra protects your business documents and connected workspaces.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 dark:text-white font-semibold mb-0.5">AES-256 Storage</strong>
                <span className="text-slate-500 dark:text-slate-400 leading-normal">Infrastructure encryption at rest & AES-256-GCM token security.</span>
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 dark:text-white font-semibold mb-0.5">No Generalized AI Training</strong>
                <span className="text-slate-500 dark:text-slate-400 leading-normal">Private data is never used to train generalized or public AI models.</span>
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 dark:text-white font-semibold mb-0.5">Tenant Isolation</strong>
                <span className="text-slate-500 dark:text-slate-400 leading-normal">Strict session boundaries ensure complete privacy.</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Standalone Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 sm:px-6 transition-colors">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <StructraLogo size="sm" variant="icon" />
            <span>© 2026 Structra Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setCurrentPage('terms')}
              className={`hover:underline cursor-pointer ${type === 'terms' ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage('privacy')}
              className={`hover:underline cursor-pointer ${type === 'privacy' ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={handleHomeClick}
              className="hover:underline cursor-pointer"
            >
              Home
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
