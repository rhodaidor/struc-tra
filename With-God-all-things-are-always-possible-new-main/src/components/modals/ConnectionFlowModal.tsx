import React, { useState, useEffect } from 'react';
import { 
  X, Check, CheckCircle2, Shield, ArrowRight, RefreshCw, 
  Database, Search, AlertCircle, Phone, KeyRound, Lock, ShieldCheck,
  Clock, FileText, Sparkles
} from 'lucide-react';
import { Integration, HandlingMode } from '../../types';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

interface ConnectionFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration;
  onComplete: (
    id: Integration['id'], 
    accountIdentifier: string, 
    selectedMode: HandlingMode, 
    permissions: string[],
    initialSyncMetrics?: {
      status?: string;
      alreadyInProgress?: boolean;
      countIndexed?: number;
      countImported?: number;
      countDuplicates?: number;
      createdDocuments?: any[];
    } | null
  ) => void;
}

export const ConnectionFlowModal: React.FC<ConnectionFlowModalProps> = ({
  isOpen,
  onClose,
  integration,
  onComplete,
}) => {
  const { user } = useApp();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [accountIdentifier, setAccountIdentifier] = useState(
    integration.accountIdentifier || 
    (user?.email ? user.email : 
     integration.id === 'gmail' ? 'user@gmail.com' : 
     integration.id === 'telegram' ? '+1234567890' : 'user@company.com')
  );
  const [selectedMode, setSelectedMode] = useState<HandlingMode>('Secure Index');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStage, setSyncStage] = useState('Connecting to channel...');
  const [syncStatusState, setSyncStatusState] = useState<'starting' | 'processing' | 'complete' | 'background'>('starting');
  const [docsFound, setDocsFound] = useState(0);
  const [initialSyncResult, setInitialSyncResult] = useState<{
    status?: string;
    alreadyInProgress?: boolean;
    countIndexed?: number;
    countImported?: number;
    countDuplicates?: number;
    createdDocuments?: any[];
  } | null>(null);
  const [isAuthorizingGoogle, setIsAuthorizingGoogle] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Telegram MTProto client authentication state
  const [tgAuthStage, setTgAuthStage] = useState<'phone' | 'code' | '2fa'>('phone');
  const [tgPhoneNumber, setTgPhoneNumber] = useState('');
  const [tgPhoneCode, setTgPhoneCode] = useState('');
  const [tg2faPassword, setTg2faPassword] = useState('');
  const [tgDeliveryType, setTgDeliveryType] = useState<'app' | 'sms' | null>(null);
  const [isTgLoading, setIsTgLoading] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const [tgSuccessMessage, setTgSuccessMessage] = useState<string | null>(null);

  // Lock background body scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Listen for Google OAuth popup message
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GMAIL_OAUTH_RESULT') {
        const payload = event.data.payload;
        setIsAuthorizingGoogle(false);
        if (payload?.success) {
          if (payload.email) {
            setAccountIdentifier(payload.email);
          }
          if (payload.mode) {
            setSelectedMode(payload.mode);
          }
          setAuthError(null);
          setStep(2);
        } else {
          setAuthError(payload?.error || 'Google authorization failed or was cancelled.');
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, []);

  if (!isOpen) return null;

  const isGmail = integration.id === 'gmail';
  const isTelegram = integration.id === 'telegram';

  // Handle Google OAuth authorization initiation
  const handleStartGoogleOAuth = async () => {
    setIsAuthorizingGoogle(true);
    setAuthError(null);

    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data?.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/auth/google/url?mode=${encodeURIComponent(selectedMode)}`, { headers });
      const data = await res.json();

      if (!res.ok || !data.success || !data.url) {
        setIsAuthorizingGoogle(false);
        setAuthError(data.error || 'Failed to initialize Google OAuth. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.');
        return;
      }

      // Open Google OAuth in a popup window
      const width = 560;
      const height = 680;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2.5;

      const popup = window.open(
        data.url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Fallback: navigate directly if popup was blocked
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('[Google OAuth URL Fetch Error]:', err);
      setIsAuthorizingGoogle(false);
      setAuthError('Could not start Google authorization. Please check your connection and try again.');
    }
  };

  // Telegram MTProto Step 1: Send Login Code
  const handleTgSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = tgPhoneNumber.trim();
    if (!cleanPhone || cleanPhone.length < 5) {
      setTgError('Please enter a valid international phone number with country code (e.g. +14155552671).');
      return;
    }

    setIsTgLoading(true);
    setTgError(null);
    setTgSuccessMessage(null);

    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data?.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/integrations/telegram/auth/send-code', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phoneNumber: cleanPhone }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTgError(data.error || 'Failed to send Telegram login code. Please verify your phone number and try again.');
        return;
      }

      setTgDeliveryType(data.deliveryType || (data.isCodeViaApp ? 'app' : 'sms'));
      setTgSuccessMessage(data.message || 'Verification code dispatched to your Telegram app or SMS.');
      setTgAuthStage('code');
    } catch (err: any) {
      console.error('[Telegram Send Code Error]:', err);
      setTgError('Unable to connect to Telegram service. Please check your network and try again.');
    } finally {
      setIsTgLoading(false);
    }
  };

  // Telegram MTProto Step 2: Verify Login Code
  const handleTgVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = tgPhoneCode.trim();
    if (!cleanCode) {
      setTgError('Please enter the verification code sent to your Telegram account.');
      return;
    }

    setIsTgLoading(true);
    setTgError(null);

    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data?.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/integrations/telegram/auth/verify-code', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phoneCode: cleanCode,
          selectedMode,
        }),
      });

      const data = await res.json();
      if (data.requiresPassword) {
        setTgAuthStage('2fa');
        setTgSuccessMessage(data.message || 'Two-step verification (2FA) cloud password required.');
        return;
      }

      if (!res.ok || !data.success) {
        setTgError(data.error || 'Invalid or expired verification code. Please check and try again.');
        return;
      }

      const identifiedAccount = data.accountIdentifier || tgPhoneNumber;
      setAccountIdentifier(identifiedAccount);
      if (data.mode) {
        setSelectedMode(data.mode);
      }
      setStep(2);
    } catch (err: any) {
      console.error('[Telegram Verify Code Error]:', err);
      setTgError('Verification request failed. Please try again.');
    } finally {
      setIsTgLoading(false);
    }
  };

  // Telegram MTProto Step 3: Verify 2FA Cloud Password
  const handleTgVerify2faPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPwd = tg2faPassword.trim();
    if (!cleanPwd) {
      setTgError('Please enter your Telegram 2FA cloud password.');
      return;
    }

    setIsTgLoading(true);
    setTgError(null);

    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data?.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/integrations/telegram/auth/verify-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          password: cleanPwd,
          selectedMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTgError(data.error || 'Incorrect 2FA password. Please check and try again.');
        return;
      }

      const identifiedAccount = data.accountIdentifier || tgPhoneNumber;
      setAccountIdentifier(identifiedAccount);
      if (data.mode) {
        setSelectedMode(data.mode);
      }
      setStep(2);
    } catch (err: any) {
      console.error('[Telegram 2FA Password Error]:', err);
      setTgError('Two-step verification failed. Please try again.');
    } finally {
      setIsTgLoading(false);
    }
  };

  // Scope & Permissions requested
  const gmailPermissionsList = [
    'Read email messages and thread metadata',
    'Access attached documents (PDFs, Invoices, Contracts)',
    'Search Gmail for relevant files and documents',
    'Import attachments into Structra and build AI Secure Index'
  ];

  const telegramPermissionsList = [
    'Connect user Telegram account via official MTProto protocol',
    'Discover and retrieve user messages containing document attachments',
    'Ingest and extract PDF, DOCX, XLSX, and text documents securely',
    'Build AI search vector embeddings and OCR entity metadata'
  ];

  const genericPermissionsList = [
    'Read messages and thread history',
    'Access attached documents and media',
    'Extract document metadata (dates, vendors, totals)',
    'Build AI search vector embeddings'
  ];

  const permissionsList = isGmail 
    ? gmailPermissionsList 
    : isTelegram 
    ? telegramPermissionsList 
    : genericPermissionsList;

  const handleStartAuth = () => {
    if (isGmail) {
      handleStartGoogleOAuth();
    } else {
      setStep(2);
    }
  };

  const handleContinueToChoice = () => {
    setStep(3);
  };

  const handleStartSync = async () => {
    setStep(4);
    setSyncStatusState('starting');
    setSyncProgress(15);
    setSyncStage(`Connecting to ${integration.name}...`);

    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data?.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      setSyncStatusState('processing');
      setSyncProgress(35);
      setSyncStage('Scanning for messages with document attachments...');

      const syncUrl = isGmail ? '/api/integrations/gmail/sync' : '/api/integrations/telegram/sync';
      const syncRes = await fetch(syncUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: selectedMode }),
      });

      setSyncProgress(75);
      setSyncStage(
        selectedMode === 'Smart Import' 
          ? 'Importing files & extracting OCR metadata...' 
          : 'Building AI Secure Index & vector embeddings...'
      );

      const syncData = await syncRes.json();
      let finalSyncData = syncData;

      if (syncData.status === 'already_in_progress' || syncData.alreadyInProgress) {
        setSyncStatusState('background');
        setSyncProgress(80);
        setSyncStage('Sync in progress in background...');
        // Wait 2 seconds for in-flight sync to complete
        await new Promise(r => setTimeout(r, 2000));
        try {
          const checkRes = await fetch(syncUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ mode: selectedMode }),
          });
          if (checkRes.ok) {
            const recheckData = await checkRes.json();
            if (recheckData.status !== 'already_in_progress' && !recheckData.alreadyInProgress) {
              finalSyncData = recheckData;
            }
          }
        } catch (e) {}
      }

      setSyncProgress(100);
      const isStillInProgress = finalSyncData.status === 'already_in_progress' || finalSyncData.alreadyInProgress;
      setSyncStatusState(isStillInProgress ? 'background' : 'complete');
      setSyncStage(isStillInProgress ? 'Sync in Progress' : 'Sync Complete!');
      const newlyAddedCount = typeof finalSyncData.countIndexed === 'number'
        ? finalSyncData.countIndexed
        : typeof finalSyncData.countImported === 'number'
        ? finalSyncData.countImported
        : (finalSyncData.createdDocuments?.length || 0);
      setDocsFound(newlyAddedCount);
      setInitialSyncResult(finalSyncData);

    } catch (err) {
      console.warn('[Initial Sync Notice]:', err);
      setSyncStatusState('complete');
      setSyncProgress(100);
      setSyncStage('Sync Complete!');
    }
  };

  const handleFinish = () => {
    // Record user-scoped flag for seen guidance so it is never shown again on subsequent page visits
    if (user?.id) {
      try {
        if (isGmail) {
          localStorage.setItem(`structra_gmail_sync_guidance_seen_${user.id}`, 'true');
        } else if (isTelegram) {
          localStorage.setItem(`structra_telegram_sync_guidance_seen_${user.id}`, 'true');
        }
      } catch (e) {
        console.warn('[LocalStorage Flag Save Notice]:', e);
      }
    }

    const finalPermissions = isGmail 
      ? ['https://www.googleapis.com/auth/gmail.readonly', ...permissionsList]
      : permissionsList;
    onComplete(integration.id, accountIdentifier, selectedMode, finalPermissions, initialSyncResult);
    onClose();
  };

  const handleModalClose = () => {
    if (step === 4) {
      handleFinish();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className={`bg-white dark:bg-[#16171b] rounded-3xl ${step === 4 && (isGmail || isTelegram) ? 'max-w-xl sm:max-w-2xl' : 'max-w-xl'} w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/80 dark:border-[#22242a] relative overflow-hidden animate-in zoom-in-95 my-auto box-border`}>
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 dark:border-[#22242a] shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
              <img src={integration.logo} alt={integration.name} className="w-5 h-5 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-[#ededee] truncate">
                {step === 4 && (isGmail || isTelegram) ? `${integration.name} connected ✓` : `Connect ${integration.name}`}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-[#888c9b] font-medium truncate">
                {step === 4 && (isGmail || isTelegram)
                  ? 'Step 4 of 4 — Sync Guidance & Schedule'
                  : `Step ${step} of 4 — ${step === 1 ? 'Authorization' : step === 2 ? 'Connection Success' : step === 3 ? 'Choose AI Mode' : 'Initial Sync'}`
                }
              </p>
            </div>
          </div>

          <button
            onClick={handleModalClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#ededee] rounded-xl hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="px-4 sm:px-8 py-5 sm:py-6 overflow-y-auto overflow-x-hidden flex-1 min-h-0 space-y-5 sm:space-y-6 w-full box-border">
          {/* STEP 1: OAuth & MTProto Authorization */}
          {step === 1 && (
            <div className="space-y-5">
              {isGmail && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900 dark:text-blue-200 font-medium min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="break-words">Google OAuth Scope Requested:</span>
                  </div>
                  <code className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-mono px-2 py-0.5 rounded-lg font-bold shrink-0">
                    gmail.readonly
                  </code>
                </div>
              )}

              {isTelegram && (
                <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/40 rounded-2xl space-y-2 text-xs text-sky-900 dark:text-sky-200">
                  <div className="flex items-center gap-2 font-bold text-sky-950 dark:text-sky-100">
                    <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>Official Telegram MTProto Account Integration</span>
                  </div>
                  <p className="text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed break-words">
                    Connect your authentic Telegram user account directly via Telegram MTProto client authentication. Structra retrieves documents directly from your chats without requiring a bot intermediary.
                  </p>
                </div>
              )}

              {/* TELEGRAM MTPROTO INPUT FORMS */}
              {isTelegram && tgAuthStage === 'phone' && (
                <form onSubmit={handleTgSendCode} className="p-4 bg-slate-50 dark:bg-[#1c1e24] border border-slate-200/90 dark:border-[#262832] rounded-2xl space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-[#ededee] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Enter Telegram Phone Number:</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-[#888c9b] font-medium">
                      Include country code (e.g. <code>+14155552671</code> or <code>+447911123456</code>). Telegram will send a direct authentication code to your Telegram app or SMS.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="tel"
                      value={tgPhoneNumber}
                      onChange={(e) => setTgPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      disabled={isTgLoading}
                      autoFocus
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#16171b] border border-slate-300 dark:border-[#2a2d37] rounded-xl text-xs font-semibold text-slate-900 dark:text-[#ededee] placeholder:text-slate-400 dark:placeholder:text-[#6b7082] focus:outline-hidden focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 dark:text-[#6b7082] font-medium">
                      Protected by AES-256-GCM encryption
                    </span>
                    <button
                      type="submit"
                      disabled={isTgLoading || !tgPhoneNumber.trim()}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isTgLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isTgLoading ? 'Sending Code...' : 'Send Telegram Code'}</span>
                      {!isTgLoading && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </form>
              )}

              {isTelegram && tgAuthStage === 'code' && (
                <form onSubmit={handleTgVerifyCode} className="p-4 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40 rounded-2xl space-y-3.5 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Enter Telegram Verification Code:</span>
                    </label>
                    <div className="p-2.5 bg-white/80 dark:bg-[#16171b] border border-sky-200 dark:border-sky-900/40 rounded-xl text-[11px] text-sky-900 dark:text-sky-200 leading-relaxed space-y-1">
                      {tgDeliveryType === 'app' ? (
                        <>
                          <div className="font-bold flex items-center gap-1 text-sky-950 dark:text-sky-100">
                            <span>Check your Telegram App (Direct Message)</span>
                          </div>
                          <p>
                            Telegram sent your login code via direct message inside your active Telegram app (look for the official <strong>Telegram</strong> service chat with the blue verified checkmark), <em>not</em> via phone SMS.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="font-bold flex items-center gap-1 text-sky-950 dark:text-sky-100">
                            <span>Check your SMS Messages</span>
                          </div>
                          <p>
                            Telegram sent a verification code via SMS to <strong>{tgPhoneNumber}</strong>.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={tgPhoneCode}
                      onChange={(e) => setTgPhoneCode(e.target.value)}
                      placeholder="12345"
                      disabled={isTgLoading}
                      autoFocus
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#16171b] border border-sky-300 dark:border-sky-800 rounded-xl text-sm font-mono tracking-widest text-slate-900 dark:text-[#ededee] text-center placeholder:text-slate-400 dark:placeholder:text-[#6b7082] focus:outline-hidden focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 font-bold"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTgAuthStage('phone');
                        setTgError(null);
                        setTgPhoneCode('');
                      }}
                      className="text-[11px] text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 font-semibold underline cursor-pointer"
                    >
                      Change phone number
                    </button>
                    <button
                      type="submit"
                      disabled={isTgLoading || !tgPhoneCode.trim()}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isTgLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isTgLoading ? 'Verifying...' : 'Verify Code & Connect'}</span>
                      {!isTgLoading && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </form>
              )}

              {isTelegram && tgAuthStage === '2fa' && (
                <form onSubmit={handleTgVerify2faPassword} className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl space-y-3.5 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Telegram Two-Step Verification (2FA):</span>
                    </label>
                    <p className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">
                      Your Telegram account has 2-Step Verification enabled. Enter your Telegram cloud password to complete connection.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="password"
                      value={tg2faPassword}
                      onChange={(e) => setTg2faPassword(e.target.value)}
                      placeholder="Telegram Cloud Password"
                      disabled={isTgLoading}
                      autoFocus
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#16171b] border border-indigo-300 dark:border-indigo-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-[#ededee] placeholder:text-slate-400 dark:placeholder:text-[#6b7082] focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTgAuthStage('phone');
                        setTgError(null);
                        setTg2faPassword('');
                      }}
                      className="text-[11px] text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-semibold underline cursor-pointer"
                    >
                      Restart login
                    </button>
                    <button
                      type="submit"
                      disabled={isTgLoading || !tg2faPassword.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isTgLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isTgLoading ? 'Verifying 2FA...' : 'Verify Password & Connect'}</span>
                      {!isTgLoading && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </form>
              )}

              {/* Permissions List */}
              <div className="p-4 bg-slate-50 dark:bg-[#1c1e24] rounded-2xl border border-slate-200/80 dark:border-[#262832] space-y-3">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 dark:text-[#ededee]">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Requested Permissions for Structra AI:</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-[#888c9b]">
                  {permissionsList.map((perm, idx) => (
                    <li key={idx} className="flex items-start gap-2 min-w-0">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="min-w-0 flex-1 break-words">{perm}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isGmail && isAuthorizingGoogle && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/90 dark:border-blue-900/40 rounded-2xl text-center space-y-3 animate-in fade-in">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin mx-auto" />
                  <div>
                    <p className="text-xs font-extrabold text-blue-900 dark:text-blue-200">Connecting with Google...</p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 break-words">
                      Please complete authorization in the Google sign-in window. Once authorized, Structra will automatically connect your account.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 rounded-xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-snug text-[11px] break-words">
                  <strong>Read-Only Document Access:</strong> Structra requests strictly read-only access to discover and ingest document attachments. Structra cannot post messages, delete conversations, or modify your account.
                </p>
              </div>

              {tgSuccessMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-medium min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="break-words">{tgSuccessMessage}</span>
                </div>
              )}

              {authError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/40 rounded-xl flex items-center gap-2 text-red-700 dark:text-rose-300 text-xs font-medium min-w-0">
                  <AlertCircle className="w-4 h-4 text-red-500 dark:text-rose-400 shrink-0" />
                  <span className="break-words">{authError}</span>
                </div>
              )}

              {tgError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/40 rounded-xl flex items-center gap-2 text-red-700 dark:text-rose-300 text-xs font-medium min-w-0">
                  <AlertCircle className="w-4 h-4 text-red-500 dark:text-rose-400 shrink-0" />
                  <span className="break-words">{tgError}</span>
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 sm:gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#262832] text-slate-700 dark:text-[#ededee] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {isGmail && (
                  <button
                    onClick={handleStartAuth}
                    disabled={isAuthorizingGoogle}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-200 dark:shadow-none flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isAuthorizingGoogle ? 'Authorizing...' : 'Connect Gmail with Google'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

        {/* STEP 2: Connection Success Screen */}
        {step === 2 && (
          <div className="space-y-6 text-center py-2">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-[#ededee]">Connection Successful</h3>
              <p className="text-xs text-slate-500 dark:text-[#888c9b] font-medium mt-1">
                Structra AI has securely linked with your {integration.name} account.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-[#1c1e24] rounded-2xl border border-slate-200/80 dark:border-[#262832] p-4 text-left space-y-2 text-xs w-full box-border">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-[#262832] gap-2 min-w-0">
                <span className="text-slate-500 dark:text-[#888c9b] shrink-0">Account:</span>
                <span className="font-bold text-slate-900 dark:text-[#ededee] truncate">{accountIdentifier}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-[#262832] gap-2 min-w-0">
                <span className="text-slate-500 dark:text-[#888c9b] shrink-0">Source Type:</span>
                <span className="font-bold text-slate-900 dark:text-[#ededee] truncate">{integration.name}</span>
              </div>
              {isGmail && (
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-[#262832] gap-2 min-w-0">
                  <span className="text-slate-500 dark:text-[#888c9b] shrink-0">OAuth Scope:</span>
                  <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 break-all">gmail.readonly</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-[#262832] gap-2 min-w-0">
                <span className="text-slate-500 dark:text-[#888c9b] shrink-0">Permissions Granted:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">{isGmail ? 'gmail.readonly + 4 granted' : '4 granted'}</span>
              </div>
              <div className="flex justify-between py-1 gap-2 min-w-0">
                <span className="text-slate-500 dark:text-[#888c9b] shrink-0">Last Sync:</span>
                <span className="font-bold text-slate-400 dark:text-[#6b7082]">Not yet synced</span>
              </div>
            </div>

            <button
              onClick={handleContinueToChoice}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 3: Post-Connection Onboarding Choice (Single Mode Rule) */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#ededee]">
                How would you like Structra AI to work with your documents?
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#888c9b] font-medium mt-0.5">
                You can select <strong>ONLY ONE mode</strong> per integration.
              </p>
            </div>

            {/* Selection Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: Smart Import */}
              <div
                onClick={() => setSelectedMode('Smart Import')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative flex flex-col justify-between ${
                  selectedMode === 'Smart Import'
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-sm'
                    : 'border-slate-200 dark:border-[#262832] bg-white dark:bg-[#1c1e24] hover:border-slate-300 dark:hover:border-[#383c48]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    {selectedMode === 'Smart Import' && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-[#ededee]">Smart Import</h4>
                  <p className="text-[11px] text-slate-600 dark:text-[#888c9b] leading-relaxed font-medium">
                    Import documents into Structra Storage for long-term retention, offline viewing, and collaboration.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-[#262832] text-[10px] text-slate-500 dark:text-[#888c9b] space-y-1">
                  <p>• Stores full document copies</p>
                  <p>• Preserves file lineage</p>
                  <p>• Enables full sharing links</p>
                </div>
              </div>

              {/* Card 2: Secure Index */}
              <div
                onClick={() => setSelectedMode('Secure Index')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative flex flex-col justify-between ${
                  selectedMode === 'Secure Index'
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-sm'
                    : 'border-slate-200 dark:border-[#262832] bg-white dark:bg-[#1c1e24] hover:border-slate-300 dark:hover:border-[#383c48]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Search className="w-4 h-4" />
                    </div>
                    {selectedMode === 'Secure Index' && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-[#ededee]">Secure Index</h4>
                    <span className="text-[9px] bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 font-extrabold px-1.5 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-[#888c9b] leading-relaxed font-medium">
                    Allow Structra AI to search and retrieve documents from your account without storing full files.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-[#262832] text-[10px] text-slate-500 dark:text-[#888c9b] space-y-1">
                  <p>• Zero document file storage</p>
                  <p>• AI vector & metadata search</p>
                  <p>• Maximum data privacy</p>
                </div>
              </div>

            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={handleStartSync}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Complete Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Initial Sync Progress & Sync Guidance Card */}
        {step === 4 && (isGmail || isTelegram) ? (
          <div className="space-y-4 animate-in fade-in py-1">
            {/* Header / Intro */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{isGmail ? 'Gmail connected ✓' : 'Telegram connected ✓'}</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#ededee] tracking-tight">
                Your document syncing is now set up
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#9ea3b5] leading-relaxed">
                Structra will now keep your eligible documents in sync from the point you connected {isGmail ? 'Gmail' : 'Telegram'}.
              </p>
            </div>

            {/* Real Sync Status Banner */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-[#262832] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="min-w-0 flex-1">
                {syncStatusState === 'starting' && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>Initial sync: Starting…</span>
                    </span>
                  </div>
                )}
                {syncStatusState === 'processing' && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>Initial sync: Processing documents…</span>
                    </span>
                  </div>
                )}
                {syncStatusState === 'background' && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Initial sync: Processing in background</span>
                    </span>
                  </div>
                )}
                {syncStatusState === 'complete' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="font-extrabold text-xs sm:text-[13px]">Initial sync complete</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-[#ededee] pl-5.5">
                      {docsFound === 0
                        ? '0 new eligible documents found since you connected.'
                        : `${docsFound} eligible ${docsFound === 1 ? 'document' : 'documents'} added to Structra.`}
                    </p>
                  </div>
                )}
              </div>
              <div className="shrink-0 self-start sm:self-center">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#20222a] text-[10px] font-bold text-slate-500 dark:text-[#888c9b] border border-slate-200/60 dark:border-[#282b36]">
                  Mode: {selectedMode}
                </span>
              </div>
            </div>

            {/* Important Information Box */}
            <div className="p-3.5 sm:p-4 bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl space-y-1.5 text-xs text-amber-950 dark:text-amber-100 shadow-xs">
              <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-300 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <h4>Where does syncing start?</h4>
              </div>
              <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed font-medium">
                Your initial sync starts from when you connected {isGmail ? 'Gmail' : 'Telegram'}. Documents that were already in your {isGmail ? 'Gmail' : 'Telegram'} before you connected Structra are <strong className="font-extrabold text-amber-950 dark:text-amber-100 underline decoration-amber-400 dark:decoration-amber-500 underline-offset-2">not automatically synced</strong>.
              </p>
            </div>

            {/* Compact Before / When / After Visual Boundary */}
            <div className="bg-slate-50 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-[#262832] rounded-2xl p-3.5 space-y-2.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#7d8292]">
                Sync Boundary Overview
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* Before you connected */}
                <div className="p-3 bg-white dark:bg-[#16171b] border border-slate-200 dark:border-[#282b36] rounded-xl flex flex-col justify-between space-y-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-[#888c9b] uppercase">Before you connected</span>
                    <p className="font-bold text-slate-800 dark:text-[#ededee] text-[11px] mt-0.5">Existing {isGmail ? 'Gmail' : 'Telegram'} documents</p>
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/50">
                      → Not automatically imported
                    </span>
                  </div>
                </div>

                {/* When you connected */}
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl flex flex-col justify-between space-y-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">When you connected</span>
                    <p className="font-extrabold text-blue-950 dark:text-blue-100 text-[11px] mt-0.5">Sync Starting Point</p>
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-semibold text-blue-800 dark:text-blue-300">
                      Structra establishes sync boundary
                    </span>
                  </div>
                </div>

                {/* After you connected */}
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex flex-col justify-between space-y-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">After you connected</span>
                    <p className="font-bold text-emerald-950 dark:text-emerald-100 text-[11px] mt-0.5">New eligible documents</p>
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50">
                      → Picked up by automatic syncing
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Timeline */}
            <div className="space-y-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#7d8292]">
                How Document Syncing Works
              </p>
              <div className="relative pl-7 space-y-3.5 border-l-2 border-slate-200 dark:border-[#262832] ml-2">
                {/* Stage 1: Connected */}
                <div className="relative">
                  <div className="absolute -left-[35px] top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-[#ededee]">
                      {isGmail ? 'Gmail Connected' : 'Telegram Connected'}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-[#888c9b] mt-0.5">
                      Your {isGmail ? 'Gmail' : 'Telegram'} connection is active.
                    </p>
                  </div>
                </div>

                {/* Stage 2: Initial Sync */}
                <div className="relative">
                  <div className="absolute -left-[35px] top-0.5 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    2
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-[#ededee]">
                      Initial Sync
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-[#9ea3b5] mt-0.5 leading-relaxed">
                      Structra starts syncing eligible documents from the connection point. Older documents from before you connected are not automatically imported.
                    </p>
                  </div>
                </div>

                {/* Stage 3: Processing & Indexing */}
                <div className="relative">
                  <div className="absolute -left-[35px] top-0.5 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    3
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-[#ededee]">
                      Processing & Indexing
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-[#9ea3b5] mt-0.5 leading-relaxed">
                      Documents found during syncing are processed and indexed so Structra can find them for you.
                    </p>
                  </div>
                </div>

                {/* Stage 4: Ready to Search */}
                <div className="relative">
                  <div className="absolute -left-[35px] top-0.5 w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    4
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-[#ededee]">
                      Ready to Search
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-[#9ea3b5] mt-0.5 leading-relaxed">
                      Once processing is complete, you can find and retrieve the documents in Structra.
                    </p>
                  </div>
                </div>

                {/* Stage 5: Automatic Sync Schedule */}
                <div className="relative">
                  <div className="absolute -left-[35px] top-0.5 w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-400 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    5
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-[#ededee]">
                        {isGmail ? 'Automatic Sync Every 15 Minutes' : 'Automatic Background Sync'}
                      </h5>
                      {isGmail && (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800/40">
                          Every 15 min
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-[#9ea3b5] mt-0.5 leading-relaxed">
                      {isGmail 
                        ? 'Structra checks Gmail for new eligible documents every 15 minutes.' 
                        : 'Structra checks Telegram for new eligible documents through incremental background syncing.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Section: What gets synced? */}
            <div className="p-3 bg-slate-50 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-[#262832] rounded-2xl space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-[#ededee]">
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <h5>What gets synced?</h5>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-[#888c9b] leading-relaxed">
                Structra looks for supported document files from your connected source. Messages or emails without supported document attachments are not imported as documents.
              </p>
            </div>

            {/* Sticky Action Button */}
            <div className="pt-2 sticky bottom-0 bg-white dark:bg-[#16171b] pb-1 z-10 border-t border-slate-100 dark:border-[#22242a]">
              <button
                onClick={handleFinish}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-200 dark:shadow-none cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Got it</span>
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        ) : step === 4 ? (
          /* Generic Integrations Initial Sync Progress */
          <div className="space-y-6 text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
              <RefreshCw className={`w-6 h-6 ${syncProgress < 100 ? 'animate-spin' : ''}`} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#ededee]">
                {initialSyncResult?.status === 'already_in_progress' || initialSyncResult?.alreadyInProgress
                  ? 'Sync in Progress'
                  : syncStage}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#888c9b] font-medium">
                {syncProgress < 100 
                  ? `Processing ${integration.name} account data...` 
                  : initialSyncResult?.status === 'already_in_progress' || initialSyncResult?.alreadyInProgress
                  ? `${integration.name} sync is running in the background. Your documents will appear when processing is complete.`
                  : docsFound > 0
                  ? `Successfully processed and indexed ${docsFound} documents.`
                  : `Sync completed. No new document attachments found.`}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 max-w-sm mx-auto">
              <div className="w-full bg-slate-100 dark:bg-[#282b36] h-2.5 rounded-full overflow-hidden border border-slate-200/80 dark:border-[#262832]">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-[#6b7082] font-bold">
                <span>{syncProgress}%</span>
                <span>
                  {initialSyncResult?.status === 'already_in_progress' || initialSyncResult?.alreadyInProgress
                    ? 'Syncing in background'
                    : `${docsFound} files scanned`}
                </span>
              </div>
            </div>

            {syncProgress === 100 && (
              <button
                onClick={handleFinish}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 dark:shadow-none animate-in fade-in cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Done</span>
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        ) : null}

        </div>
      </div>
    </div>
  );
};


