import React from 'react';
import { AlertTriangle, X, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Integration, HandlingMode } from '../../types';

interface ModeSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration;
  targetMode: HandlingMode;
  onConfirm: (id: Integration['id'], newMode: HandlingMode) => void;
}

export const ModeSwitchModal: React.FC<ModeSwitchModalProps> = ({
  isOpen,
  onClose,
  integration,
  targetMode,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const currentMode = integration.mode;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#16171b] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 dark:border-[#22242a] space-y-5 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#22242a]">
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-[#ededee]">Switch Integration Mode?</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#ededee] rounded-xl hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Content */}
        <div className="space-y-3 text-xs">
          <p className="font-extrabold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 leading-relaxed">
            Switching will disable your current mode and reconfigure your data pipeline for {integration.name}.
          </p>

          <div className="p-3 bg-slate-50 dark:bg-[#1c1e24] rounded-2xl border border-slate-200/60 dark:border-[#262832] space-y-2 text-slate-700 dark:text-[#ededee]">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#262832]">
              <span className="font-bold text-slate-500 dark:text-[#888c9b]">Current Mode:</span>
              <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full text-[10px]">
                {currentMode} (Disabling)
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-slate-500 dark:text-[#888c9b]">New Mode:</span>
              <span className="font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full text-[10px]">
                {targetMode} (Enabling)
              </span>
            </div>
          </div>

          <p className="text-slate-500 dark:text-[#888c9b] leading-relaxed font-medium">
            {targetMode === 'Smart Import'
              ? 'Structra AI will begin importing supported document attachments directly into Structra Storage during future syncs.'
              : 'Structra AI will stop downloading file copies and will only maintain search metadata and vector embeddings.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#262832] text-slate-700 dark:text-[#ededee] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Keep Current Mode
          </button>

          <button
            onClick={() => {
              onConfirm(integration.id, targetMode);
              onClose();
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-200 dark:shadow-none flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Confirm & Switch</span>
          </button>
        </div>

      </div>
    </div>
  );
};
