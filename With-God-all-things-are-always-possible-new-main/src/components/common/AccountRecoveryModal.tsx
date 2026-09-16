import React from 'react';
import { AlertTriangle, RefreshCw, LogOut, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { User } from '../../types';

interface AccountRecoveryModalProps {
  isOpen: boolean;
  user: User | null;
  onRestore: () => void;
  onContinueDeletion: () => void;
}

export const AccountRecoveryModal: React.FC<AccountRecoveryModalProps> = ({
  isOpen,
  user,
  onRestore,
  onContinueDeletion,
}) => {
  if (!isOpen || !user) return null;

  const scheduledDate = user.scheduledDeletionDate 
    ? new Date(user.scheduledDeletionDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const formattedDate = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const targetTime = scheduledDate.getTime();
  const now = Date.now();
  const daysRemaining = Math.max(0, Math.ceil((targetTime - now) / (1000 * 60 * 60 * 24)));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 text-center relative overflow-hidden">
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

        {/* Icon Header */}
        <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200/80 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        {/* Title & Account Identification */}
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Pending Deletion
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Account Scheduled for Deletion
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Signed in as <span className="font-bold text-slate-800 dark:text-slate-200">{user.email}</span>
          </p>
        </div>

        {/* Scheduled Date Notice Box */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl text-left space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Your Structra account is scheduled to be permanently deleted on:
              </p>
              <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                {formattedDate}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium border-t border-slate-200/60 dark:border-slate-700/60 pt-2.5">
            You can still recover your account at any time before this date. All your documents, settings, and workspace data remain fully intact.
          </p>

          {/* Urgent Reminder Banner if 7 days or less */}
          {daysRemaining <= 7 && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900/80 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-extrabold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>
                {daysRemaining <= 1 
                  ? 'Your account will be permanently deleted tomorrow unless you restore it.'
                  : `Your Structra account will be permanently deleted in ${daysRemaining} days.`}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onRestore}
            className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Restore My Account</span>
          </button>

          <button
            type="button"
            onClick={onContinueDeletion}
            className="w-full py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Continue with Deletion</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Choosing "Continue with Deletion" will keep your account deactivated until the scheduled deletion date.
        </p>
      </div>
    </div>
  );
};
