import React, { useState } from 'react';
import { RefreshCw, X, Database, Search, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { Integration, HandlingMode } from '../../types';

interface ReconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration;
  onConfirmReconnect: (
    id: Integration['id'], 
    reconnectOption: 'restore' | 'rebuild' | 'resume',
    selectedMode: HandlingMode
  ) => void;
}

export const ReconnectModal: React.FC<ReconnectModalProps> = ({
  isOpen,
  onClose,
  integration,
  onConfirmReconnect,
}) => {
  const [reconnectOption, setReconnectOption] = useState<'restore' | 'rebuild' | 'resume'>('restore');
  const [selectedMode, setSelectedMode] = useState<HandlingMode>(integration.mode !== 'Not Configured' ? integration.mode : 'Secure Index');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmReconnect(integration.id, reconnectOption, selectedMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#16171b] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-[#22242a] space-y-5 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#22242a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
              <img src={integration.logo} alt={integration.name} className="w-5 h-5 object-contain" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#ededee]">
                Reconnect {integration.name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#888c9b] font-medium">
                Detected previous connection history
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#ededee] rounded-xl hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-3 text-xs">
          <span className="font-extrabold text-slate-800 dark:text-[#ededee] block">
            Select Reconnection Strategy:
          </span>

          {/* Option 1: Restore Previous Index */}
          <div
            onClick={() => setReconnectOption('restore')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
              reconnectOption === 'restore'
                ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 shadow-2xs'
                : 'bg-slate-50 dark:bg-[#1c1e24] border-slate-200 dark:border-[#262832] hover:border-slate-300 dark:hover:border-[#383c48]'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-[#ededee]">
              <span>Restore previous index</span>
              {reconnectOption === 'restore' && (
                <span className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-[10px]">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#888c9b] font-medium leading-relaxed">
              Instantly re-activates existing vector embeddings and cached document search metadata.
            </p>
          </div>

          {/* Option 2: Rebuild Index from Scratch */}
          <div
            onClick={() => setReconnectOption('rebuild')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
              reconnectOption === 'rebuild'
                ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 shadow-2xs'
                : 'bg-slate-50 dark:bg-[#1c1e24] border-slate-200 dark:border-[#262832] hover:border-slate-300 dark:hover:border-[#383c48]'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-[#ededee]">
              <span>Rebuild index from scratch</span>
              {reconnectOption === 'rebuild' && (
                <span className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-[10px]">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#888c9b] font-medium leading-relaxed">
              Purges existing cache and triggers a complete rescan of all messages & document attachments.
            </p>
          </div>

          {/* Option 3: Resume Smart Import / Select Mode */}
          <div
            onClick={() => setReconnectOption('resume')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
              reconnectOption === 'resume'
                ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 shadow-2xs'
                : 'bg-slate-50 dark:bg-[#1c1e24] border-slate-200 dark:border-[#262832] hover:border-slate-300 dark:hover:border-[#383c48]'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-[#ededee]">
              <span>Resume & Reconfigure Mode</span>
              {reconnectOption === 'resume' && (
                <span className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-[10px]">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#888c9b] font-medium leading-relaxed">
              Select handling mode (Smart Import vs Secure Index) and resume automatic synchronization.
            </p>
          </div>
        </div>

        {/* Mode Selector for Reconnect */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#22242a] space-y-2">
          <label className="text-xs font-bold text-slate-800 dark:text-[#ededee] block">
            Active Mode (Strict Single-Mode Rule):
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedMode('Secure Index')}
              className={`p-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                selectedMode === 'Secure Index'
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300'
                  : 'bg-slate-50 dark:bg-[#1c1e24] border-slate-200 dark:border-[#262832] text-slate-600 dark:text-[#888c9b]'
              }`}
            >
              Secure Index
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('Smart Import')}
              className={`p-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                selectedMode === 'Smart Import'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-[#1c1e24] border-slate-200 dark:border-[#262832] text-slate-600 dark:text-[#888c9b]'
              }`}
            >
              Smart Import
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#262832] text-slate-700 dark:text-[#ededee] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-200 dark:shadow-none flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Confirm Reconnect</span>
          </button>
        </div>

      </div>
    </div>
  );
};
