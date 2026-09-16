import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StructraLogo } from './StructraLogo';
import { UserPlus, Loader2, X, ChevronDown } from 'lucide-react';

export const GoogleAuthModal: React.FC = () => {
  const { isGoogleAuthModalOpen, setIsGoogleAuthModalOpen, handleSelectGoogleAccount, openLegalModal } = useApp();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showCustomEmail, setShowCustomEmail] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  if (!isGoogleAuthModalOpen) return null;

  const accounts = [
    {
      id: 'acc_1',
      name: 'Joseph Analew',
      email: 'joseph.analeu@structra.io',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 'acc_2',
      name: 'Joseph A. (Personal)',
      email: 'j.analue.personal@gmail.com',
      avatarLetter: 'J',
      avatarBg: 'bg-indigo-600',
    },
  ];

  const handleAccountClick = (acc: { name: string; email: string }) => {
    setSelectedAccount(acc.email);
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      handleSelectGoogleAccount(acc);
    }, 600);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      setCustomError('Please enter a valid email address.');
      return;
    }
    const name = customName.trim() || customEmail.split('@')[0];
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      handleSelectGoogleAccount({ name, email: customEmail.trim() });
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F0F2FE]/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-[420px] w-full p-6 sm:p-8 shadow-2xl border border-slate-200/90 text-center relative animate-in zoom-in-95">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsGoogleAuthModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <StructraLogo className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-slate-900 text-base tracking-tight">Structra</span>
        </div>

        {/* Google Multi-Color Logo */}
        <div className="my-2 flex justify-center">
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
        </div>

        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          Sign in with Google
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-1 mb-6">
          Choose an account to continue to Structra Enterprise
        </p>

        {isAuthenticating ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-bold text-slate-700 animate-pulse">
              Authenticating with Google...
            </p>
          </div>
        ) : (
          <>
            {/* Account Selector List */}
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 overflow-hidden text-left mb-6 bg-white">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleAccountClick({ name: acc.name, email: acc.email })}
                  className="w-full p-3.5 hover:bg-slate-50 flex items-center gap-3.5 transition-colors cursor-pointer text-left focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  {acc.avatar ? (
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-full ${acc.avatarBg} text-white font-bold text-sm flex items-center justify-center shrink-0`}>
                      {acc.avatarLetter}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                      {acc.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {acc.email}
                    </p>
                  </div>
                </button>
              ))}

              {/* Use another account option */}
              {!showCustomEmail ? (
                <button
                  type="button"
                  onClick={() => setShowCustomEmail(true)}
                  className="w-full p-3.5 hover:bg-slate-50 flex items-center gap-3.5 transition-colors cursor-pointer text-left focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">
                    Use another account
                  </span>
                </button>
              ) : (
                <form onSubmit={handleCustomSubmit} className="p-3.5 bg-slate-50/50 space-y-2">
                  <input
                    type="text"
                    placeholder="Full Name (optional)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <input
                    type="email"
                    placeholder="google.email@gmail.com"
                    value={customEmail}
                    onChange={(e) => {
                      setCustomEmail(e.target.value);
                      setCustomError(null);
                    }}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  {customError && (
                    <p className="text-[11px] text-rose-600 font-medium">{customError}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomEmail(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Disclosure Notice */}
            <p className="text-[11px] text-slate-500 leading-relaxed text-left">
              To continue, Google will share your name, email address, language preference, and profile picture with Structra. Before using this app, you can review Structra's{' '}
              <button
                type="button"
                onClick={() => openLegalModal('privacy')}
                className="text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                privacy policy
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => openLegalModal('terms')}
                className="text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                terms of service
              </button>.
            </p>
          </>
        )}
      </div>

      {/* Footer Below Modal */}
      <div className="mt-6 max-w-[420px] w-full flex items-center justify-between text-[11px] text-slate-500 px-2 font-medium">
        <div className="flex items-center gap-3">
          <button type="button" className="hover:underline cursor-pointer">Help</button>
          <button type="button" onClick={() => openLegalModal('privacy')} className="hover:underline cursor-pointer">Privacy</button>
          <button type="button" onClick={() => openLegalModal('terms')} className="hover:underline cursor-pointer">Terms</button>
        </div>
        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-700">
          <span>English (United States)</span>
          <ChevronDown className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};
