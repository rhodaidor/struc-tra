import React, { useState, useEffect } from 'react';
import { 
  Mail, Linkedin, Check, ShieldCheck, Lock, 
  FileText, HelpCircle, Briefcase, Info, 
  X, Phone
} from 'lucide-react';
import { StructraLogo } from '../common/StructraLogo';
import { useApp } from '../../context/AppContext';

interface FooterProps {
  onNavClick?: (targetId: string) => void;
  onAuthNavigate?: (mode: 'login' | 'signup') => void;
}

type ModalType = 'about' | 'contact' | 'careers' | 'faq' | 'privacy' | 'terms' | 'cookie' | 'security' | null;

export const Footer: React.FC<FooterProps> = ({ onNavClick }) => {
  const { setCurrentPage } = useApp();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Lock background webpage scrolling across desktop, tablet, and mobile when any footer modal is active
  useEffect(() => {
    if (activeModal) {
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

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setActiveModal(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;
        if (mainEl) {
          mainEl.style.overflow = originalMainOverflow;
        }
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [activeModal]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleProductClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    if (onNavClick) {
      onNavClick(targetId);
    } else {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <>
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 sm:pt-16 pb-10 text-xs">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
          
          {/* Main Footer Layout: Stacked on Mobile & Tablet (< lg), Balanced Desktop Row with 3-Column Nav Grid on Right (>= lg) */}
          <div className="flex flex-col lg:flex-row items-start justify-between gap-10 lg:gap-12 xl:gap-16 pb-12 text-left">
            
            {/* BRAND SECTION */}
            <div className="w-full lg:max-w-sm xl:max-w-md flex flex-col items-start text-left space-y-4 shrink-0">
              
              {/* Logo + Structra (white wordmark on dark background) */}
              <div 
                className="flex items-start justify-start cursor-pointer group" 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <StructraLogo size="md" isDarkBackground={true} />
              </div>

              {/* Tagline */}
              <h3 className="text-sm font-extrabold text-slate-200 tracking-tight">
                Turn your scattered business documents into instant answers in seconds
              </h3>

              {/* Description */}
              <p className="text-slate-400 text-xs leading-relaxed font-normal">
                Structra uses AI to collect, organize, and instantly retrieve your documents from Gmail,<br className="hidden sm:inline lg:hidden" /> Telegram, and direct uploads—all in one secure workspace.
              </p>

              {/* Contact Information & Social Icons Stacked Vertically like Reference Image */}
              <div className="pt-2 space-y-3.5 w-full">
                <div className="space-y-2 text-xs font-medium text-slate-300">
                  <a 
                    href="mailto:support@structra.ai" 
                    className="flex items-center gap-2.5 text-slate-400 hover:text-blue-400 transition-colors py-0.5 group w-fit"
                  >
                    <Mail className="w-4 h-4 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>support@structra.ai</span>
                  </a>
                  <a 
                    href="https://wa.me/2347068303819" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-slate-400 hover:text-emerald-400 transition-colors py-0.5 group w-fit"
                  >
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>Chat with us: +234 706 830 3819</span>
                  </a>
                </div>

                {/* Social Icons Row (Circular buttons like Reference Image) */}
                <div className="flex items-center justify-start gap-2.5 pt-1">
                  {/* LinkedIn */}
                  <a 
                    href="https://www.linkedin.com/company/structra-inc" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="w-9 h-9 rounded-full bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-xs hover:scale-105 active:scale-95"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>

                  {/* X (Twitter) */}
                  <a 
                    href="https://x.com/Structra_ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="X (Twitter)"
                    className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-xs hover:scale-105 active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                </div>
              </div>

            </div>

            {/* THREE NAVIGATION COLUMNS (COMPANY, PRODUCT, LEGAL): Stacked in 1 Column on Mobile & Tablet (< lg), Distributed 3 Columns across Right Area on Desktop (>= lg) */}
            <div className="w-full lg:flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-8 xl:gap-12 items-start lg:pl-6 xl:pl-10">
              
              {/* COLUMN: COMPANY */}
              <div className="flex flex-col items-start text-left space-y-3">
                <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                  Company
                </h4>
                <ul className="space-y-2 text-xs font-medium text-slate-400 w-full text-left">
                  <li>
                    <button 
                      onClick={() => setActiveModal('about')}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 cursor-pointer text-left whitespace-nowrap"
                    >
                      About Us
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setActiveModal('contact')}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 cursor-pointer text-left whitespace-nowrap"
                    >
                      Contact
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setActiveModal('careers')}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 cursor-pointer text-left whitespace-nowrap"
                    >
                      Careers
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setActiveModal('faq')}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 cursor-pointer text-left whitespace-nowrap"
                    >
                      FAQ
                    </button>
                  </li>
                </ul>
              </div>

              {/* COLUMN: PRODUCT */}
              <div className="flex flex-col items-start text-left space-y-3">
                <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                  Product
                </h4>
                <ul className="space-y-2 text-xs font-medium text-slate-400 w-full text-left">
                  <li>
                    <a 
                      href="#how-it-works" 
                      onClick={(e) => handleProductClick(e, 'how-it-works')}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 text-left whitespace-nowrap cursor-pointer"
                    >
                      How It Works
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#integrations" 
                      onClick={(e) => handleProductClick(e, 'integrations')}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 text-left whitespace-nowrap cursor-pointer"
                    >
                      Integrations
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#features" 
                      onClick={(e) => handleProductClick(e, 'features')}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 text-left whitespace-nowrap cursor-pointer"
                    >
                      Features
                    </a>
                  </li>
                  <li>
                    <button 
                      onClick={() => setActiveModal('security')}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 cursor-pointer text-left whitespace-nowrap"
                    >
                      Security
                    </button>
                  </li>
                </ul>
              </div>

              {/* COLUMN: LEGAL */}
              <div className="flex flex-col items-start text-left space-y-3">
                <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                  Legal
                </h4>
                <ul className="space-y-2 text-xs font-medium text-slate-400 w-full text-left">
                  <li>
                    <a 
                      href="/terms"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage('terms');
                      }}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 cursor-pointer text-left whitespace-nowrap"
                    >
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a 
                      href="/privacy"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage('privacy');
                      }}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 cursor-pointer text-left whitespace-nowrap"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <button 
                      onClick={() => setActiveModal('cookie')}
                      className="hover:text-blue-400 transition-colors inline-flex items-center py-0.5 cursor-pointer text-left whitespace-nowrap"
                    >
                      Cookie Policy
                    </button>
                  </li>
                </ul>
              </div>

            </div>

          </div>

          {/* BOTTOM FOOTER DIVIDER & LEFT-ALIGNED COPYRIGHT */}
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between text-left gap-4">
            <p className="text-xs font-medium text-slate-500 text-left">
              © 2026 Structra Inc. All rights reserved. • AI-Powered
            </p>
          </div>

        </div>
      </footer>

      {/* FOOTER MODALS (Modal Dialogs for About, Contact, Careers, FAQ, Privacy, Terms, Cookie, Security) */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                {activeModal === 'about' && <Info className="w-5 h-5 text-blue-400" />}
                {activeModal === 'contact' && <Mail className="w-5 h-5 text-blue-400" />}
                {activeModal === 'careers' && <Briefcase className="w-5 h-5 text-purple-400" />}
                {activeModal === 'faq' && <HelpCircle className="w-5 h-5 text-amber-400" />}
                {activeModal === 'privacy' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                {activeModal === 'terms' && <FileText className="w-5 h-5 text-blue-400" />}
                {activeModal === 'cookie' && <FileText className="w-5 h-5 text-indigo-400" />}
                {activeModal === 'security' && <Lock className="w-5 h-5 text-emerald-400" />}
                
                <h3 className="text-base font-extrabold text-white capitalize">
                  {activeModal === 'about' && 'About Us'}
                  {activeModal === 'contact' && 'Contact Structra Team'}
                  {activeModal === 'careers' && 'Careers at Structra'}
                  {activeModal === 'faq' && 'Frequently Asked Questions'}
                  {activeModal === 'privacy' && 'Privacy Policy'}
                  {activeModal === 'terms' && 'Terms of Service'}
                  {activeModal === 'cookie' && 'Cookie Policy'}
                  {activeModal === 'security' && 'Security Architecture'}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="text-xs leading-relaxed space-y-4 text-slate-300">
              {activeModal === 'about' && (
                <>
                  <p className="text-sm font-semibold text-white">
                    Structra is an AI-powered document intelligence workspace built to eliminate manual document searching.
                  </p>
                  <p>
                    Businesses and individuals lose hundreds of hours each year digging through cluttered email threads, messaging apps, and local storage folders. Structra unifies your scattered files from Gmail, Telegram, and direct uploads into a single, instantly searchable knowledge base.
                  </p>
                  <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                    <h4 className="font-bold text-white text-xs">Core Principles</h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      <li>Instant Neural Search & Retrieval</li>
                      <li>Zero Manual Tagging Required</li>
                      <li>Bank-grade Security & End-to-End Encryption</li>
                    </ul>
                  </div>
                </>
              )}

              {activeModal === 'contact' && (
                <>
                  <p>
                    Have questions or need enterprise deployment assistance? Reach out directly to our team:
                  </p>
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Official Support Email</span>
                        <a href="mailto:support@structra.ai" className="font-mono text-xs font-bold text-blue-400 hover:underline">support@structra.ai</a>
                      </div>
                      <button 
                        onClick={() => handleCopy('support@structra.ai', 'email')}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        {copiedText === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                        <span>{copiedText === 'email' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-slate-400 block">WhatsApp Desk</span>
                        <a href="https://wa.me/2347068303819" target="_blank" rel="noopener noreferrer" className="font-mono text-xs font-bold text-emerald-400 hover:underline">+234 706 830 3819</a>
                      </div>
                      <button 
                        onClick={() => handleCopy('+2347068303819', 'wa')}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        {copiedText === 'wa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                        <span>{copiedText === 'wa' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeModal === 'careers' && (
                <div className="py-4 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 shadow-inner">
                    <Briefcase className="w-7 h-7 text-purple-400" />
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <h4 className="text-base font-bold text-white">Join Our Team</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      We don't have any open positions at the moment, but we’d love to hear from talented people who are interested in building the future with Structra.
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Check back soon for new opportunities.
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => setActiveModal('contact')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Contact Us</span>
                    </button>
                  </div>
                </div>
              )}

              {activeModal === 'faq' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <h4 className="font-bold text-white mb-1">How does Structra import documents?</h4>
                    <p className="text-slate-300 text-[11px]">
                      Structra connects directly with your Gmail and Telegram accounts via official OAuth APIs. Attachments are securely indexed with vector embeddings for instant search.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <h4 className="font-bold text-white mb-1">Is my document data private?</h4>
                    <p className="text-slate-300 text-[11px]">
                      Yes. Your files are encrypted using 256-bit AES encryption at rest and TLS 1.3 in transit. We never sell your data or use your private files to train public models.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <h4 className="font-bold text-white mb-1">What formats are supported?</h4>
                    <p className="text-slate-300 text-[11px]">
                      Structra supports PDF, DOCX, XLSX, TXT, CSV, PNG, JPG, and Markdown files.
                    </p>
                  </div>
                </div>
              )}

              {activeModal === 'privacy' && (
                <>
                  <p>
                    At Structra, we take your privacy and data security seriously.
                  </p>
                  <p>
                    1. <strong>Data Collection:</strong> We only collect information required to deliver document search services (e.g. email address, connected integration OAuth tokens, and document text metadata).
                  </p>
                  <p>
                    2. <strong>Encryption:</strong> All document data stored in your workspace is encrypted using AES-256. Data in transit is protected using TLS 1.3 encryption.
                  </p>
                  <p>
                    3. <strong>No Third-Party Selling:</strong> We do not sell, rent, or lease your personal information or document contents to third parties under any circumstances.
                  </p>
                </>
              )}

              {activeModal === 'terms' && (
                <>
                  <p>
                    By using Structra, you agree to the following terms and conditions:
                  </p>
                  <p>
                    1. <strong>Account Responsibility:</strong> You are responsible for maintaining the security of your account credentials and connected integrations.
                  </p>
                  <p>
                    2. <strong>Acceptable Use:</strong> You agree not to upload malicious software, illegal content, or attempt to violate workspace boundaries.
                  </p>
                  <p>
                    3. <strong>Service Availability:</strong> Structra provides standard service SLAs and automatic backups for high availability.
                  </p>
                </>
              )}

              {activeModal === 'cookie' && (
                <>
                  <p>
                    Structra uses essential cookies and local browser state to keep you authenticated and store workspace layout preferences.
                  </p>
                  <p>
                    - <strong>Authentication Cookies:</strong> Keep your session active securely.
                  </p>
                  <p>
                    - <strong>Preference Storage:</strong> Saves your dark mode preferences and document view settings.
                  </p>
                </>
              )}

              {activeModal === 'security' && (
                <>
                  <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    SOC2 Compliant Architecture & AES-256 Encryption
                  </p>
                  <p>
                    Structra uses enterprise-grade security practices across all layers of our stack:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5">
                    <li>Strict OAuth 2.0 scoping (only requested attachments are accessed)</li>
                    <li>Row-Level Security (RLS) and encrypted database isolation</li>
                    <li>Automated threat monitoring and vulnerability scanning</li>
                  </ul>
                </>
              )}

            </div>

            {/* Modal Footer Action */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

