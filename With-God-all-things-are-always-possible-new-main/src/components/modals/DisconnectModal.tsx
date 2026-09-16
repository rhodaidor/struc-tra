import React, { useState } from 'react';
import { Unlink, X, AlertOctagon, CheckSquare, Square, Trash2, ShieldAlert } from 'lucide-react';
import { Integration } from '../../types';

interface DisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration;
  onConfirmDisconnect: (
    id: Integration['id'], 
    options: {
      keepImportedDocs: boolean;
      deleteImportedDocs: boolean;
      removeSecureIndex: boolean;
    }
  ) => void;
}

export const DisconnectModal: React.FC<DisconnectModalProps> = ({
  isOpen,
  onClose,
  integration,
  onConfirmDisconnect,
}) => {
  const [keepImportedDocs, setKeepImportedDocs] = useState(true);
  const [deleteImportedDocs, setDeleteImportedDocs] = useState(false);
  const [removeSecureIndex, setRemoveSecureIndex] = useState(true);

  if (!isOpen) return null;

  const handleToggleKeep = () => {
    setKeepImportedDocs(prev => !prev);
    if (!keepImportedDocs) {
      setDeleteImportedDocs(false);
    } else {
      setDeleteImportedDocs(true);
    }
  };

  const handleToggleDelete = () => {
    setDeleteImportedDocs(prev => !prev);
    if (!deleteImportedDocs) {
      setKeepImportedDocs(false);
    } else {
      setKeepImportedDocs(true);
    }
  };

  const handleConfirm = () => {
    onConfirmDisconnect(integration.id, {
      keepImportedDocs,
      deleteImportedDocs,
      removeSecureIndex,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#16171b] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-[#22242a] space-y-5 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#22242a]">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <Unlink className="w-5 h-5 shrink-0" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-[#ededee]">
              Disconnect {integration.name}?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#ededee] rounded-xl hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Message Box */}
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-100 dark:border-rose-900/40 space-y-2 text-xs">
          <p className="font-extrabold text-rose-900 dark:text-rose-200">Disconnecting will:</p>
          <ul className="list-disc list-inside space-y-1 text-rose-800 dark:text-rose-300 font-medium">
            <li>Stop background syncing for new emails & messages</li>
            <li>Disable Secure Index for this account</li>
            <li>Stop Smart Import automation</li>
            <li>Remove AI document search access to this source</li>
          </ul>
        </div>

        {/* Retained Data Options Checkboxes */}
        <div className="space-y-3 pt-1">
          <span className="text-xs font-extrabold text-slate-800 dark:text-[#ededee] block">
            Choose what to do with existing data:
          </span>

          {/* Checkbox 1: Keep imported docs */}
          <div
            onClick={handleToggleKeep}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
              keepImportedDocs ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40' : 'bg-slate-50 dark:bg-[#1c1e24] border-slate-200 dark:border-[#262832]'
            }`}
          >
            <div className="mt-0.5 text-blue-600 dark:text-blue-400">
              {keepImportedDocs ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400 dark:text-[#6b7082]" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-[#ededee]">
                Keep already imported documents in Structra Storage
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-[#888c9b] font-medium mt-0.5">
                Files already downloaded will remain in your Structra storage library.
              </p>
            </div>
          </div>

          {/* Checkbox 2: Delete imported docs */}
          <div
            onClick={handleToggleDelete}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
              deleteImportedDocs ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40' : 'bg-slate-50 dark:bg-[#1c1e24] border-slate-200 dark:border-[#262832]'
            }`}
          >
            <div className="mt-0.5 text-rose-600 dark:text-rose-400">
              {deleteImportedDocs ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400 dark:text-[#6b7082]" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Delete all imported documents from this source
              </h4>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                Permanently purge all downloaded files associated with this {integration.name} account.
              </p>
            </div>
          </div>

          {/* Checkbox 3: Remove Secure Index data */}
          <div
            onClick={() => setRemoveSecureIndex(!removeSecureIndex)}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
              removeSecureIndex ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40' : 'bg-slate-50 dark:bg-[#1c1e24] border-slate-200 dark:border-[#262832]'
            }`}
          >
            <div className="mt-0.5 text-purple-600 dark:text-purple-400">
              {removeSecureIndex ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400 dark:text-[#6b7082]" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-[#ededee]">
                Remove Secure Index data for this account
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-[#888c9b] font-medium mt-0.5">
                Purge vector search embeddings and metadata for unimported external files.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#262832] text-slate-700 dark:text-[#ededee] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-rose-200 dark:shadow-none flex items-center gap-1.5 cursor-pointer"
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>Confirm Disconnect</span>
          </button>
        </div>

      </div>
    </div>
  );
};
