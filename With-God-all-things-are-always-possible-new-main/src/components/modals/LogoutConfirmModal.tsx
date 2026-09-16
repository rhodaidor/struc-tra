import React, { useState } from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onConfirm();
    } finally {
      setIsLoggingOut(false);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[110] bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden animate-in fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#16171b] rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-[#262832] text-center relative animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
      >
        <button
          onClick={onClose}
          disabled={isLoggingOut}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#ededee] rounded-full hover:bg-slate-100 dark:hover:bg-[#22242a] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-6 h-6" />
        </div>

        <h3 id="logout-modal-title" className="text-lg font-black text-slate-900 dark:text-[#ededee] tracking-tight">
          Sign out?
        </h3>
        
        <p className="text-xs text-slate-500 dark:text-[#888c9b] mt-1.5 mb-6 font-medium leading-relaxed">
          Are you sure you want to sign out?
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#282a36] text-slate-700 dark:text-[#ededee] font-bold rounded-xl text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {isLoggingOut ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing out...</span>
              </>
            ) : (
              <span>Sign Out</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
