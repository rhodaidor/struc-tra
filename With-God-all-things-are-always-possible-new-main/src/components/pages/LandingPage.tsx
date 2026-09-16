import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Search, Layers, Shield, Clock, FileText, 
  ArrowRight, Check, Star, Mail, Send, Play, Lock, CheckCircle2, Cpu, Smartphone, RefreshCw,
  Menu, X, Loader2, AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StructraLogo } from '../common/StructraLogo';
import { Footer } from '../layout/Footer';

export const LandingPage: React.FC = () => {
  const { setCurrentPage } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navigatingTarget, setNavigatingTarget] = useState<'login' | 'signup' | null>(null);
  const [showNavError, setShowNavError] = useState<string | null>(null);

  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const handleCloseMenu = () => {
    setIsMobileMenuOpen(false);
    hamburgerButtonRef.current?.focus();
  };

  // Robust Auth Navigation Handler
  const handleAuthNavigate = (targetMode: 'login' | 'signup') => {
    if (navigatingTarget) return; // Prevent duplicate clicks

    setNavigatingTarget(targetMode);
    setShowNavError(null);

    // 1. Close mobile navigation menu if open and restore body scroll
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    // 2. Perform smooth route transition with loading feedback
    try {
      setTimeout(() => {
        try {
          setCurrentPage(targetMode);
          setNavigatingTarget(null);
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[Structra Nav Error] Navigation to ${targetMode} failed:`, err);
          }
          setShowNavError('Authentication service temporarily unavailable. Please try again.');
          setNavigatingTarget(null);
        }
      }, 300);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Structra Nav Exception] Exception navigating to ${targetMode}:`, err);
      }
      setShowNavError('Unexpected navigation error occurred. Please try again.');
      setNavigatingTarget(null);
    }
  };

  // Smooth scroll to a section by ID with header offset and error handling
  const scrollToSection = (targetId: string) => {
    // Close mobile menu if open
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      hamburgerButtonRef.current?.focus();
    }

    // Delay slightly so body scroll is unlocked before scroll animation begins
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[Structra Navigation] Target section with ID "#${targetId}" was not found on page.`);
        }
      }
    }, 50);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    scrollToSection(targetId);
  };

  // Lock background body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isMobileMenuOpen]);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        handleCloseMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Trap focus inside mobile menu when open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const focusableElements = mobileMenuRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !mobileMenuRef.current) return;

        const focusables = Array.from(
          mobileMenuRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;

        const first = focusables[0] as HTMLElement;
        const last = focusables[focusables.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      };

      window.addEventListener('keydown', handleTabKey);
      return () => window.removeEventListener('keydown', handleTabKey);
    }
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Fallback Error Notification Banner */}
      {showNavError && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-3 text-xs text-center flex items-center justify-center gap-2 sticky top-0 z-50 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{showNavError}</span>
          <button 
            onClick={() => setShowNavError(null)} 
            className="ml-3 font-bold underline hover:text-rose-950 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header Navbar */}
      <header className="border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 md:gap-6 lg:gap-8">
          <div className="shrink-0 flex items-center">
            <StructraLogo 
              size="sm" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            />
          </div>

          {/* Desktop & Tablet Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-8 text-xs font-bold text-slate-600 shrink-0">
            <a href="#features" onClick={(e) => handleNavClick(e, 'features')} className="whitespace-nowrap hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')} className="whitespace-nowrap hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#integrations" onClick={(e) => handleNavClick(e, 'integrations')} className="whitespace-nowrap hover:text-blue-600 transition-colors">Integrations</a>
            <a href="#testimonials" onClick={(e) => handleNavClick(e, 'testimonials')} className="whitespace-nowrap hover:text-blue-600 transition-colors">Testimonials</a>
          </nav>

          {/* Desktop & Tablet Actions */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => handleAuthNavigate('login')}
              disabled={!!navigatingTarget}
              aria-label="Login to your account"
              className="px-3.5 py-2 text-slate-700 hover:text-blue-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 rounded-xl whitespace-nowrap"
            >
              {navigatingTarget === 'login' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : null}
              <span>Login</span>
            </button>

            <button
              type="button"
              onClick={() => handleAuthNavigate('signup')}
              disabled={!!navigatingTarget}
              aria-label="Sign Up Free for Structra"
              className="px-4 lg:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              {navigatingTarget === 'signup' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : null}
              <span>Sign Up Free</span>
            </button>
          </div>

          {/* Mobile & Tablet Hamburger Toggle */}
          <button
            ref={hamburgerButtonRef}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Backdrop Overlay */}
      <div
        onClick={handleCloseMenu}
        onTouchMove={(e) => e.preventDefault()}
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Mobile Menu Drawer */}
      <div
        ref={mobileMenuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto md:hidden transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <StructraLogo 
              size="sm" 
              onClick={() => {
                handleCloseMenu();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
            />
            <button
              onClick={handleCloseMenu}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary CTA & Auth Options */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => handleAuthNavigate('signup')}
              disabled={!!navigatingTarget}
              aria-label="Sign Up Free for Structra"
              className="w-full min-h-[44px] py-3 px-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold rounded-xl shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2 text-center"
            >
              {navigatingTarget === 'signup' ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : null}
              <span>Sign Up Free</span>
            </button>

            <button
              type="button"
              onClick={() => handleAuthNavigate('login')}
              disabled={!!navigatingTarget}
              aria-label="Login to your Structra account"
              className="w-full min-h-[44px] py-3 px-5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 font-bold rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2 text-center"
            >
              {navigatingTarget === 'login' ? <Loader2 className="w-4 h-4 animate-spin text-slate-700" /> : null}
              <span>Login</span>
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="space-y-1 pt-2 border-t border-slate-100">
            <a
              href="#features"
              onClick={(e) => handleNavClick(e, 'features')}
              className="min-h-[44px] flex items-center px-3.5 py-2.5 rounded-xl font-bold text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, 'how-it-works')}
              className="min-h-[44px] flex items-center px-3.5 py-2.5 rounded-xl font-bold text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#integrations"
              onClick={(e) => handleNavClick(e, 'integrations')}
              className="min-h-[44px] flex items-center px-3.5 py-2.5 rounded-xl font-bold text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Integrations
            </a>
            <a
              href="#testimonials"
              onClick={(e) => handleNavClick(e, 'testimonials')}
              className="min-h-[44px] flex items-center px-3.5 py-2.5 rounded-xl font-bold text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Testimonials
            </a>
          </nav>
        </div>

        {/* Footer info in mobile drawer */}
        <div className="pt-6 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
          © 2026 Structra Inc. All rights reserved.
        </div>
      </div>

      {/* Hero Section */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28 bg-gradient-to-b from-blue-50/50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            All your documents. <br />
            <span className="text-blue-600">Organized. Searchable.</span> <br />
            <span className="text-blue-500">Always accessible.</span>
          </h1>

          <p className="mt-6 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
            Centralize your files, invoices, receipts, and contracts in one intelligent search hub. Search, retrieve documents, ask questions, and uncover insights in seconds without manual folder organization.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleAuthNavigate('signup')}
              disabled={!!navigatingTarget}
              aria-label="Sign Up Free for Structra"
              className="w-full sm:w-auto min-h-[44px] px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {navigatingTarget === 'signup' ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : null}
              <span>Sign Up Free</span>
            </button>

            <button
              type="button"
              onClick={() => handleAuthNavigate('login')}
              disabled={!!navigatingTarget}
              aria-label="Watch Demo or Login"
              className="w-full sm:w-auto min-h-[44px] px-8 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 rounded-xl text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {navigatingTarget === 'login' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Play className="w-3.5 h-3.5 text-blue-600 fill-current" />}
              <span>Watch Demo</span>
            </button>
          </div>

          <div className="mt-16 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Trusted by 100+ businesses and professionals
          </div>
        </div>
      </section>

      {/* WHY STRUCTRA SECTION */}
      <section id="features" className="py-20 bg-slate-50 border-y border-slate-100 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-extrabold uppercase text-blue-600 tracking-wider">WHY STRUCTRA</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">One place for all your documents</h2>
            <p className="text-xs text-slate-500 mt-2 font-medium">Stop wasting time searching through email attachments, Telegram chat histories, and folder clutter.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Search,
                title: 'Smart Search',
                desc: 'Find contracts, invoices, and tax files with simple natural language queries in plain English.'
              },
              {
                icon: Layers,
                title: 'Categorized Logs',
                desc: 'Group documents by source (Gmail, Telegram, Uploads) or file type automatically.'
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                desc: 'Bank-grade AES-256 encryption and role access controls keep sensitive data private.'
              },
              {
                icon: Clock,
                title: 'Save Time',
                desc: 'Automate folder organization and retrieve files 10x faster with vector indexing.'
              }
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{card.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-extrabold uppercase text-blue-600 tracking-wider">HOW IT WORKS</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Simple 3 steps</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Get started in 2 minutes and take control of all your workspace documents.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {[
              {
                step: '1',
                title: 'Connect or Upload',
                desc: 'Link Gmail, Telegram, or drop files directly into the platform.'
              },
              {
                step: '2',
                title: 'AI Organizes',
                desc: 'Extracts key metadata, tags file details, and indexes contents automatically.'
              },
              {
                step: '3',
                title: 'Search & Find',
                desc: 'Ask key questions or keywords and retrieve verified document links in seconds.',
                extra: 'Chat with Structra AI to analyze what you find, understand key details, and get actionable insights or recommended next steps.'
              }
            ].map((s, idx) => (
              <div key={idx} className="p-8 bg-slate-50/70 rounded-3xl border border-slate-200/80 text-center relative space-y-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center mx-auto text-sm shadow-xs">
                  {s.step}
                </div>
                <h3 className="text-base font-extrabold text-slate-900">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                {s.extra && (
                  <p className="text-xs text-slate-600 font-medium leading-relaxed pt-2.5 border-t border-slate-200/60 mt-2">{s.extra}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KEY FEATURES / INTEGRATIONS GRID */}
      <section id="integrations" className="py-20 bg-slate-50 border-t border-slate-100 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-extrabold uppercase text-blue-600 tracking-wider">KEY FEATURES & INTEGRATIONS</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Everything you need for document intelligence</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                icon: Search, 
                title: 'AI Natural Search', 
                desc: 'Ask in natural language like "Show Dangote invoice from March".',
                extra: 'Continue the conversation with Structra AI to analyze retrieved documents, understand what they mean, and receive actionable insights.'
              },
              { 
                icon: Layers, 
                title: 'Multiple Integrations', 
                desc: 'Seamless connection to Gmail, Telegram, and Drive.' 
              },
              { 
                icon: Cpu, 
                title: 'Automated Extraction', 
                desc: 'Optical Character Recognition extracts line items and dates.',
                extra: 'Structra AI uses extracted information to help you evaluate key terms, spot trends or risks, compare documents, and surface meaningful findings.'
              },
              { 
                icon: Sparkles, 
                title: 'Smart Workspace', 
                desc: 'Organizes files automatically without needing manual folder creation.' 
              },
              { 
                icon: Lock, 
                title: 'Encrypted Storage', 
                desc: 'AES-256 cloud encryption with private vector indexing.' 
              },
              { 
                icon: Smartphone, 
                title: 'Voice Retrieval', 
                desc: 'Speak directly into the microphone to retrieve documents.' 
              },
            ].map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                  {f.extra && (
                    <p className="text-xs text-slate-600 font-medium leading-relaxed pt-2 border-t border-slate-100 mt-2">{f.extra}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dedicated AI Insights Callout */}
          <div className="mt-8 p-6 sm:p-8 bg-white rounded-3xl border border-blue-100 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>Document Intelligence</span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Ask Structra AI</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Chat with your documents, uncover important findings, and turn information into actionable insights. Ask questions across multiple files to summarize complex agreements, compare invoices, identify upcoming obligations, spot risks, and determine recommended next steps.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAuthNavigate('signup')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Try AI Analysis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section id="testimonials" className="py-20 bg-white border-t border-slate-100 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-extrabold uppercase text-blue-600 tracking-wider">TESTIMONIALS</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Loved by teams & professionals</h2>
            <p className="text-xs text-slate-500 mt-2 font-medium">See how Structra transforms document management and indexing for teams of all sizes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "Structra cut our invoice search time from 20 minutes to 5 seconds. Connecting Gmail and Telegram took less than 2 minutes.",
                author: "Sarah Jenkins",
                role: "Head of Operations, Apex Media",
                rating: 5,
                avatar: "SJ"
              },
              {
                quote: "The natural language search is magic. I just type 'Find Dangote March receipt' and it pulls up the exact PDF instantly.",
                author: "Marcus Chen",
                role: "Founder, Zenith Financial",
                rating: 5,
                avatar: "MC"
              },
              {
                quote: "Structra doesn't just help me find documents. I can chat with Structra AI to analyze them, understand what matters, and get actionable insights without going through everything myself.",
                author: "Amara Okezie",
                role: "Senior Legal Counsel, Veloce Tech",
                rating: 5,
                avatar: "AO"
              }
            ].map((t, idx) => (
              <div key={idx} className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4 flex flex-col justify-between shadow-2xs">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">"{t.quote}"</p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-200/60">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{t.author}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-16 bg-blue-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Ready to centralize your documents?</h2>
          <p className="mt-2 text-blue-100 text-xs sm:text-sm">Join professionals who save 5+ hours every week searching through files.</p>
          
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={() => handleAuthNavigate('signup')}
              disabled={!!navigatingTarget}
              aria-label="Get Started Free with Structra"
              className="min-h-[44px] px-6 py-3 bg-white text-blue-600 hover:bg-slate-50 active:scale-[0.98] font-bold rounded-xl text-xs shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {navigatingTarget === 'signup' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : null}
              <span>Get Started Free</span>
            </button>

            <button
              type="button"
              onClick={() => handleAuthNavigate('login')}
              disabled={!!navigatingTarget}
              aria-label="Book a Demo or Login"
              className="min-h-[44px] px-6 py-3 bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white font-bold rounded-xl text-xs border border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {navigatingTarget === 'login' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : null}
              <span>Book a Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer onNavClick={scrollToSection} onAuthNavigate={handleAuthNavigate} />
    </div>
  );
};


