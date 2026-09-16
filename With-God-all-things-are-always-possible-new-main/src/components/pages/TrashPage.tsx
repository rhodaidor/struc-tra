import React, { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TrashPage: React.FC = () => {
  const { documents, restoreFromTrash, deletePermanently, emptyTrash } = useApp();
  const trashedDocs = documents.filter(d => d.isTrash);
  const [isEmptyModalOpen, setIsEmptyModalOpen] = useState(false);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#ededee] tracking-tight flex items-center gap-2">
            Trash <Trash2 className="w-5 h-5 text-rose-500" />
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#888c9b] mt-0.5">
            Deleted documents are stored here. Items are automatically purged after 30 days.
          </p>
        </div>

        {trashedDocs.length > 0 && (
          <button
            onClick={() => setIsEmptyModalOpen(true)}
            className="px-4 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 w-fit cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {/* Warning Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 rounded-2xl text-xs flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-amber-800 dark:text-amber-300/90 font-medium">
          <span className="font-bold text-amber-900 dark:text-amber-200">Notice:</span> Items in Trash will be automatically and permanently removed after 30 days of deletion.
        </p>
      </div>

      <div className="bg-white dark:bg-[#16171b] rounded-3xl border border-slate-200/80 dark:border-[#22242a] p-6 shadow-xs">
        {trashedDocs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-[#6b7082]">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#20222a] text-slate-400 dark:text-[#6b7082] flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-700 dark:text-[#ededee]">Trash is empty.</p>
            <p className="text-xs text-slate-400 dark:text-[#888c9b] mt-1">No deleted files in your workspace.</p>
          </div>
        ) : (
          <div>
            {/* Desktop & Tablet Table (>=768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-[#1a1c23] border-b border-slate-200 dark:border-[#22242a] text-[10px] font-bold text-slate-400 dark:text-[#888c9b] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Document Title</th>
                    <th className="py-3 px-3">Source</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Size</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#22242a]">
                  {trashedDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1e2029] transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-[#ededee]">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 dark:text-[#6b7082] shrink-0" />
                          <span className="truncate max-w-xs">{doc.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-[#888c9b]">{doc.source}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#20222a] text-slate-600 dark:text-[#888c9b] border border-slate-200/60 dark:border-[#2a2d37] font-bold text-[10px]">
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-[#888c9b]">{doc.sizeFormatted}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => restoreFromTrash(doc.id)}
                            className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100/60 dark:border-indigo-900/40 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                          <button
                            onClick={() => deletePermanently(doc.id)}
                            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-100/60 dark:border-rose-900/40 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            Delete Permanently
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (<768px) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-[#22242a]">
              {trashedDocs.map((doc) => (
                <div key={doc.id} className="py-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-slate-400 dark:text-[#6b7082] shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-[#ededee] text-xs line-clamp-1">{doc.title}</p>
                        <p className="text-[10px] text-slate-400 dark:text-[#888c9b] mt-0.5">{doc.source} • {doc.sizeFormatted}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#20222a] text-slate-600 dark:text-[#888c9b] border border-slate-200/60 dark:border-[#2a2d37] font-bold text-[10px] shrink-0">
                      {doc.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-[#22242a]">
                    <button
                      onClick={() => restoreFromTrash(doc.id)}
                      className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100/60 dark:border-indigo-900/40 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                    <button
                      onClick={() => deletePermanently(doc.id)}
                      className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-100/60 dark:border-rose-900/40 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty Trash Modal */}
      {isEmptyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#16171b] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200/80 dark:border-[#22242a] text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#ededee]">Empty Trash?</h3>
            <p className="text-xs text-slate-500 dark:text-[#888c9b]">
              All {trashedDocs.length} items in the trash will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsEmptyModalOpen(false)}
                className="flex-1 py-2 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#282a36] text-slate-700 dark:text-[#ededee] border border-slate-200/60 dark:border-[#2a2d37] rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { emptyTrash(); setIsEmptyModalOpen(false); }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
