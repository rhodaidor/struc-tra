import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Mail, Lock, User as UserIcon, Check, AlertCircle, 
  ArrowRight, ArrowLeft, Shield, FolderCheck, Cpu, Eye, EyeOff, Loader2,
  ExternalLink, RefreshCw, CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AccountType } from '../../types';
import { supabase } from '../../lib/supabase';

interface AuthPageProps {
  initialMode?: 'login' | 'signup' | 'forgot' | 'forgot_sent' | 'reset' | 'verify' | 'verified';
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'signup' }) => {
  const { 
    register, 
    login, 
    loginWithGoogle,
    setCurrentPage, 
    openLegalModal,
    changePassword
  } = useApp();
  
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'forgot_sent' | 'reset' | 'verify' | 'verified'>(initialMode);

  // Layout & DOM Refs for automatic scrolling & focusing
  const containerRef = useRef<HTMLDivElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const successBannerRef = useRef<HTMLDivElement>(null);

  // Form Input Refs
  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const signupEmailInputRef = useRef<HTMLInputElement>(null);
  const signupPasswordInputRef = useRef<HTMLInputElement>(null);
  const signupConfirmPasswordInputRef = useRef<HTMLInputElement>(null);
  
  const loginEmailInputRef = useRef<HTMLInputElement>(null);
  const loginPasswordInputRef = useRef<HTMLInputElement>(null);
  
  const forgotEmailInputRef = useRef<HTMLInputElement>(null);

  const resetPasswordInputRef = useRef<HTMLInputElement>(null);
  const resetConfirmPasswordInputRef = useRef<HTMLInputElement>(null);

  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('business');
  const [rememberMe, setRememberMe] = useState(true);

  // Verification & Resend Cooldown State
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Loading, Errors & Field Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  // Check URL Hash & Search Parameters for Verification & Reset links
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;

    if (hash.includes('type=recovery') || search.includes('mode=reset')) {
      if (hash.includes('error_code=otp_expired') || hash.includes('error_description=') && hash.includes('expired')) {
        setMode('forgot');
        setError('This password reset link has expired.');
      } else if (hash.includes('error_code=') || hash.includes('error=')) {
        setMode('forgot');
        setError('This password reset link is invalid.');
      } else {
        setMode('reset');
      }
    } else if (
      hash.includes('type=signup') || 
      hash.includes('type=email_verification') || 
      hash.includes('type=email_confirmation') || 
      search.includes('mode=verified') || 
      search.includes('verified=true') ||
      hash.includes('error_code=already_verified')
    ) {
      if (hash.includes('error_code=otp_expired') || (hash.includes('error_description=') && hash.includes('expired'))) {
        setMode('verify');
        setError('This verification link has expired.');
      } else if (hash.includes('error_code=') && !hash.includes('already_verified')) {
        setMode('verify');
        setError('This verification link is invalid.');
      } else {
        setMode('login');
        setSuccessMessage('Your email has been verified.');
        supabase.auth.signOut().catch(() => {});
        if (typeof window !== 'undefined' && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname + '?mode=login');
        }
      }
    } else if (hash.includes('error_code=otp_expired') || hash.includes('error=access_denied')) {
      setMode('verify');
      setError('This verification link has expired.');
    }
  }, []);

  // Sync mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});
  }, [initialMode]);

  // Handle Mode Switch
  const handleSwitchMode = (newMode: 'login' | 'signup' | 'forgot' | 'forgot_sent' | 'reset' | 'verify' | 'verified') => {
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setMode(newMode);
    if (newMode === 'login' || newMode === 'signup') {
      setCurrentPage(newMode);
    }
  };

  // Resend Timer Countdown Effect
  useEffect(() => {
    let interval: any = null;
    if (mode === 'verify' && resendTimer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, resendTimer]);

  // Automatic input focus when switching modes
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (mode === 'signup' && fullNameInputRef.current) {
        fullNameInputRef.current.focus();
      } else if (mode === 'login' && loginEmailInputRef.current) {
        loginEmailInputRef.current.focus();
      } else if (mode === 'forgot' && forgotEmailInputRef.current) {
        forgotEmailInputRef.current.focus();
      } else if (mode === 'reset' && resetPasswordInputRef.current) {
        resetPasswordInputRef.current.focus();
      }
    }, 60);

    return () => clearTimeout(focusTimer);
  }, [mode]);

  // Password Strength Calculator
  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Weak', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculateStrength(password);

  // Detailed Field Validation Rules (matching prompt specification)
  const validateFullName = (name: string): string | null => {
    if (!name.trim()) return 'Please enter your full name.';
    if (name.trim().length < 2) return 'Name must be at least 2 characters.';
    return null;
  };

  const validateEmail = (val: string): string | null => {
    if (!val.trim()) return 'Please enter your email.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) return 'Enter a valid email address.';
    return null;
  };

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must contain at least 8 characters.';
    if (!/[A-Z]/.test(pass)) return 'Password must include one uppercase letter.';
    if (!/[a-z]/.test(pass)) return 'Password must include one lowercase letter.';
    if (!/[0-9]/.test(pass)) return 'Password must include one number.';
    if (!/[^A-Za-z0-9]/.test(pass)) return 'Password must include one special character.';
    return null;
  };

  const validateConfirmPassword = (pass: string, confirm: string): string | null => {
    if (pass !== confirm) return 'Passwords do not match.';
    return null;
  };

  // Scroll to banner on server error or success
  const scrollToAlert = (type: 'error' | 'success') => {
    setTimeout(() => {
      const targetRef = type === 'error' ? errorBannerRef : successBannerRef;
      if (targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  // SIGN UP HANDLER
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const errors: FormErrors = {};
    
    const nameErr = validateFullName(fullName);
    if (nameErr) errors.fullName = nameErr;

    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;

    const passErr = validatePassword(password);
    if (passErr) errors.password = passErr;

    const confirmErr = validateConfirmPassword(password, confirmPassword);
    if (confirmErr) errors.confirmPassword = confirmErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Find first invalid input ref and scroll + focus automatically
      let firstRef: React.RefObject<HTMLInputElement | null> | null = null;
      if (errors.fullName) firstRef = fullNameInputRef;
      else if (errors.email) firstRef = signupEmailInputRef;
      else if (errors.password) firstRef = signupPasswordInputRef;
      else if (errors.confirmPassword) firstRef = signupConfirmPasswordInputRef;

      if (firstRef?.current) {
        firstRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstRef.current.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await register(fullName, email, accountType, password);
      // DO NOT automatically log in or navigate to dashboard.
      // Switch to Check Your Email Screen
      setResendTimer(60);
      setCanResend(false);
      setMode('verify');
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong. Please try again.';
      setError(msg);
      scrollToAlert('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SIGN IN HANDLER
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const errors: FormErrors = {};
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;

    if (!password) {
      errors.password = 'Please enter your password.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      let firstRef: React.RefObject<HTMLInputElement | null> | null = null;
      if (errors.email) firstRef = loginEmailInputRef;
      else if (errors.password) firstRef = loginPasswordInputRef;

      if (firstRef?.current) {
        firstRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstRef.current.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      // Supabase listener handles navigation upon SIGNED_IN
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong. Please try again.';
      setError(msg);
      scrollToAlert('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // FORGOT PASSWORD HANDLER
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const emailErr = validateEmail(email);
    if (emailErr) {
      setFieldErrors({ email: emailErr });
      if (forgotEmailInputRef.current) {
        forgotEmailInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        forgotEmailInputRef.current.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth?mode=reset` : 'https://struc-tra.com/auth?mode=reset';
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (resetErr) throw resetErr;
      setMode('forgot_sent');
      setSuccessMessage('Password reset email sent successfully.');
      scrollToAlert('success');
    } catch (err: any) {
      if (!navigator.onLine) {
        setError('No internet connection. Please check your network.');
      } else {
        setError(err?.message || 'Password reset request failed. Please try again.');
      }
      scrollToAlert('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // RESET PASSWORD HANDLER
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const errors: FormErrors = {};
    const passErr = validatePassword(password);
    if (passErr) errors.password = passErr;

    const confirmErr = validateConfirmPassword(password, confirmPassword);
    if (confirmErr) errors.confirmPassword = confirmErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      let firstRef: React.RefObject<HTMLInputElement | null> | null = null;
      if (errors.password) firstRef = resetPasswordInputRef;
      else if (errors.confirmPassword) firstRef = resetConfirmPasswordInputRef;

      if (firstRef?.current) {
        firstRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstRef.current.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePassword(password);
      if (res.success) {
        setSuccessMessage('Password updated successfully. Please sign in.');
        scrollToAlert('success');
        setTimeout(() => {
          handleSwitchMode('login');
        }, 1500);
      } else {
        setError(res.message || 'Password update failed. Please try again.');
        scrollToAlert('error');
      }
    } catch (err: any) {
      setError(err?.message || 'Password update failed. Please try again.');
      scrollToAlert('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // RESEND EMAIL HANDLER
  const handleResendEmail = async () => {
    if (!canResend) {
      setError('Please wait before requesting another verification email.');
      scrollToAlert('error');
      return;
    }

    if (!email) {
      setError('Please enter your email address.');
      scrollToAlert('error');
      return;
    }

    setIsResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'https://struc-tra.com';
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (resendErr) {
        const resendMsg = (resendErr.message || '').toLowerCase();
        if (resendMsg.includes('already confirmed') || resendMsg.includes('already verified')) {
          setSuccessMessage('Your email has already been verified. Please sign in.');
          setMode('login');
          setError(null);
          scrollToAlert('success');
          return;
        }
        if (resendMsg.includes('rate limit')) {
          throw new Error('Please wait before requesting another verification email.');
        }
        throw resendErr;
      }

      setResendTimer(60);
      setCanResend(false);
      setSuccessMessage('Verification email sent successfully.');
      scrollToAlert('success');
    } catch (err: any) {
      setError(err?.message || 'Please wait before requesting another verification email.');
      scrollToAlert('error');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google OAuth Error:', err);
      setError(err?.message || 'Google authentication failed. Please try again.');
      scrollToAlert('error');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        
        {/* Left Branding Illustration Panel */}
        <div className="md:col-span-5 bg-gradient-to-b from-blue-50/80 via-blue-50/30 to-white p-6 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 relative">
          <div>
            <div className="flex flex-col gap-3 mb-6 sm:mb-8">
              <div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('landing')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg py-1 px-1.5 -ml-1.5 cursor-pointer"
                  aria-label="Back to Home"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Home</span>
                </button>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              All your documents <br />
              <span className="text-blue-600">Organized.</span> <br />
              <span className="text-blue-500">Searchable.</span> <br />
              <span className="text-blue-400">Always accessible</span>
            </h2>

            <p className="text-xs text-slate-500 mt-2 sm:mt-3 font-medium leading-relaxed">
              Centralize your files, invoices, receipts, and contracts in your AI-driven document intelligence hub.
            </p>
          </div>

          <div className="my-6 sm:my-8 relative p-5 sm:p-6 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <FolderCheck className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                AES-256 Vault
              </span>
            </div>

            <p className="text-sm font-bold">10,000+ Files Indexed</p>
            <div className="flex items-center gap-2 text-[10px] text-blue-100">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Gmail</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Telegram</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-4">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-500" /> Secured & Private</span>
            <span>AI Search Powered</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-12 flex flex-col justify-center">
          
          {/* Prominent Global Error Alert Banner */}
          {error && (
            <div ref={errorBannerRef} className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs space-y-2 animate-in fade-in shadow-xs" role="alert">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-rose-400 hover:text-rose-600 text-xs font-bold p-0.5"
                >
                  ✕
                </button>
              </div>

              {/* Edge Case Actions */}
              {error === 'An account already exists with this email.' && (
                <div className="pt-2 border-t border-rose-200/60 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('login')}
                    className="px-3 py-1.5 bg-rose-600 text-white font-bold text-[11px] rounded-lg hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot')}
                    className="text-[11px] font-bold text-rose-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {(error === 'Your email has not been verified.' || error === 'Your email address has not been verified.') && (
                <div className="pt-2 border-t border-rose-200/60 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={isResending}
                    className="px-3 py-1.5 bg-rose-600 text-white font-bold text-[11px] rounded-lg hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('login')}
                    className="text-[11px] font-bold text-rose-700 hover:underline"
                  >
                    Back
                  </button>
                </div>
              )}

              {error === 'No account found.' && (
                <div className="pt-2 border-t border-rose-200/60">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('signup')}
                    className="px-3 py-1.5 bg-rose-600 text-white font-bold text-[11px] rounded-lg hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              )}

              {error === 'No internet connection.' && (
                <div className="pt-2 border-t border-rose-200/60">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-3 py-1.5 bg-rose-600 text-white font-bold text-[11px] rounded-lg hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Global Success Banner */}
          {successMessage && (
            <div ref={successBannerRef} className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in shadow-xs" role="status">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* SIGNUP MODE */}
          {mode === 'signup' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create your account</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Get started with your secure Structra workspace.</p>
              </div>

              <form onSubmit={handleSignupSubmit} className="space-y-4" noValidate>
                
                {/* Full Name */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Full Name</label>
                  <input
                    ref={fullNameInputRef}
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) setFieldErrors(prev => ({ ...prev, fullName: undefined }));
                    }}
                    placeholder="Enter your full name"
                    aria-invalid={!!fieldErrors.fullName}
                    aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      fieldErrors.fullName 
                        ? 'bg-rose-50/30 border border-rose-500 focus:ring-2 focus:ring-rose-500 text-slate-900' 
                        : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800'
                    }`}
                  />
                  {fieldErrors.fullName && (
                    <p id="fullName-error" className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.fullName}</span>
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Email Address</label>
                  <input
                    ref={signupEmailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    placeholder="Enter your email address"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "signupEmail-error" : undefined}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      fieldErrors.email 
                        ? 'bg-rose-50/30 border border-rose-500 focus:ring-2 focus:ring-rose-500 text-slate-900' 
                        : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p id="signupEmail-error" className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password field with toggle & meter */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Password</label>
                  <div className="relative">
                    <input
                      ref={signupPasswordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      placeholder="Create your password"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? "signupPassword-error" : undefined}
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        fieldErrors.password 
                          ? 'bg-rose-50/30 border border-rose-500 focus:ring-2 focus:ring-rose-500 text-slate-900' 
                          : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="signupPassword-error" className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Password strength:</span>
                        <span className={`font-bold ${
                          strength.score === 1 ? 'text-rose-600' : strength.score === 2 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className={`h-1.5 rounded-full transition-colors ${strength.score >= 1 ? strength.color : 'bg-slate-200'}`} />
                        <div className={`h-1.5 rounded-full transition-colors ${strength.score >= 2 ? strength.color : 'bg-slate-200'}`} />
                        <div className={`h-1.5 rounded-full transition-colors ${strength.score >= 3 ? strength.color : 'bg-slate-200'}`} />
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Minimum 8 characters with Uppercase, Lowercase, Number & Special Character
                  </p>
                </div>

                {/* Confirm Password field */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      ref={signupConfirmPasswordInputRef}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }}
                      placeholder="Confirm your password"
                      aria-invalid={!!fieldErrors.confirmPassword}
                      aria-describedby={fieldErrors.confirmPassword ? "signupConfirmPassword-error" : undefined}
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        fieldErrors.confirmPassword 
                          ? 'bg-rose-50/30 border border-rose-500 focus:ring-2 focus:ring-rose-500 text-slate-900' 
                          : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p id="signupConfirmPassword-error" className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.confirmPassword}</span>
                    </p>
                  )}
                </div>

                {/* Account Type Option Cards */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-2">I am signing up as:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountType('business')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        accountType === 'business'
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900">Business / Team</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">For teams & organizations</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType('individual')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        accountType === 'individual'
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900">Individual</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">For personal use</p>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Creating your account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>

                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                  <span className="relative bg-white px-3 text-[10px] text-slate-400 font-bold uppercase">Or</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Connecting Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </form>

              <div className="text-center text-xs text-slate-500 pt-2 space-y-1">
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('login')}
                    className="text-blue-600 font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1 cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
                <p className="text-[10px] text-slate-400">
                  By signing up, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => openLegalModal('terms')}
                    className="underline text-slate-500 font-semibold hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    Terms of Service
                  </button>{' '}
                  &{' '}
                  <button
                    type="button"
                    onClick={() => openLegalModal('privacy')}
                    className="underline text-slate-500 font-semibold hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </button>.
                </p>
              </div>
            </div>
          )}

          {/* CHECK YOUR EMAIL SCREEN */}
          {mode === 'verify' && (
            <div className="space-y-6 text-center animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner text-2xl">
                📧
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Check your email</h2>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  We've sent a verification email to:
                </p>
                <p className="text-sm font-bold text-blue-600 mt-1">{email || 'your email'}</p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Please verify your email before signing in.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={!canResend || isResending}
                  className={`w-full py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                    canResend
                      ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                      <span>Sending verification email...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className={`w-3.5 h-3.5 ${!canResend ? 'animate-spin' : ''}`} />
                      <span>{canResend ? 'Resend Email' : `Resend Email in ${resendTimer}s`}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* EMAIL VERIFIED SCREEN */}
          {mode === 'verified' && (
            <div className="space-y-6 text-center animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner text-2xl">
                ✅
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Email Verified</h2>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Your email has been verified.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* LOGIN MODE */}
          {mode === 'login' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Enter your credentials to access your account</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
                {/* Email Address */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Email Address</label>
                  <input
                    ref={loginEmailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    placeholder="Enter your email address"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "loginEmail-error" : undefined}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      fieldErrors.email 
                        ? 'bg-rose-50/30 border border-rose-500 focus:ring-2 focus:ring-rose-500 text-slate-900' 
                        : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p id="loginEmail-error" className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-extrabold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('forgot')}
                      className="text-xs text-blue-600 font-bold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      ref={loginPasswordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      placeholder="Enter your password"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? "loginPassword-error" : undefined}
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        fieldErrors.password 
                          ? 'bg-rose-50/30 border border-rose-500 focus:ring-2 focus:ring-rose-500 text-slate-900' 
                          : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="loginPassword-error" className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="remember" className="text-xs font-semibold text-slate-600 cursor-pointer">
                    Remember me
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Signing you in...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>

                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                  <span className="relative bg-white px-3 text-[10px] text-slate-400 font-bold uppercase">Or</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Connecting Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('signup')}
                    className="text-blue-600 font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1 cursor-pointer"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD MODE */}
          {mode === 'forgot' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Forgot Password</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Enter your email address to receive password reset instructions.</p>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Email Address</label>
                  <input
                    ref={forgotEmailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    placeholder="Enter your email address"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "forgotEmail-error" : undefined}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      fieldErrors.email 
                        ? 'bg-rose-50/30 border border-rose-500 focus:ring-2 focus:ring-rose-500 text-slate-900' 
                        : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p id="forgotEmail-error" className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500 pt-2">
                Back to{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className="text-blue-600 font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1 cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            </div>
          )}

          {/* FORGOT PASSWORD SENT SCREEN */}
          {mode === 'forgot_sent' && (
            <div className="space-y-6 text-center animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner text-2xl">
                📧
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Check your email</h2>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  We've sent password reset instructions to:
                </p>
                <p className="text-sm font-bold text-blue-600 mt-1">{email || 'your email'}</p>
                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                  Please check your inbox and click the reset password link to create a new password.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Back to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* RESET PASSWORD MODE */}
          {mode === 'reset' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create New Password</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Enter your new password below.</p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">New Password</label>
                  <div className="relative">
                    <input
                      ref={resetPasswordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      placeholder="Enter new password"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? "resetPassword-error" : undefined}
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        fieldErrors.password 
                          ? 'bg-rose-50/30 border border-rose-500 focus:ring-2 focus:ring-rose-500 text-slate-900' 
                          : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="resetPassword-error" className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Password strength:</span>
                        <span className={`font-bold ${
                          strength.score === 1 ? 'text-rose-600' : strength.score === 2 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className={`h-1.5 rounded-full transition-colors ${strength.score >= 1 ? strength.color : 'bg-slate-200'}`} />
                        <div className={`h-1.5 rounded-full transition-colors ${strength.score >= 2 ? strength.color : 'bg-slate-200'}`} />
                        <div className={`h-1.5 rounded-full transition-colors ${strength.score >= 3 ? strength.color : 'bg-slate-200'}`} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      ref={resetConfirmPasswordInputRef}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }}
                      placeholder="Confirm new password"
                      aria-invalid={!!fieldErrors.confirmPassword}
                      aria-describedby={fieldErrors.confirmPassword ? "resetConfirmPassword-error" : undefined}
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        fieldErrors.confirmPassword 
                          ? 'bg-rose-50/30 border border-rose-500 focus:ring-2 focus:ring-rose-500 text-slate-900' 
                          : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p id="resetConfirmPassword-error" className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.confirmPassword}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Auth Page Footer */}
      <footer className="mt-6 text-center text-[11px] text-slate-400 font-medium flex justify-center items-center px-4">
        <span>© {new Date().getFullYear()} Structra Inc. All rights reserved.</span>
      </footer>
    </div>
  );
};
