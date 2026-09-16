import React from 'react';
import { Star, FileText, Eye, Trash2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FavoritesPage: React.FC = () => {
  const { documents, setSelectedDocument, toggleFavorite, moveToTrash } = useApp();
  const favoriteDocs = documents.filter(d => !d.isTrash && d.isFavorite);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#ededee] tracking-tight flex items-center gap-2">
          Favorites <Star className="w-5 h-5 text-amber-500 fill-current" />
        </h1>
        <p className="text-xs text-slate-500 dark:text-[#888c9b] mt-0.5">
          Starred priority documents for instant single-click retrieval.
        </p>
      </div>

      <div className="bg-white dark:bg-[#16171b] rounded-3xl border border-slate-200/80 dark:border-[#22242a] p-6 shadow-xs">
        {favoriteDocs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-[#6b7082]">
            <Star className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-[#383c48]" />
            <p className="font-bold text-slate-700 dark:text-[#ededee]">No favorited documents yet.</p>
            <p className="text-xs text-slate-400 dark:text-[#888c9b] mt-1">Star key invoices or contracts from the documents library to pin them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {favoriteDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocument(doc)}
                className="bg-slate-50 dark:bg-[#1c1e24] hover:bg-indigo-50/50 dark:hover:bg-[#232630] rounded-2xl border border-slate-200/80 dark:border-[#262832] p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#16171b] border border-slate-200 dark:border-[#2a2d37] flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shadow-xs">
                    {doc.fileType}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(doc.id); }}
                    className="p-1.5 rounded-lg text-amber-500 hover:bg-white dark:hover:bg-[#16171b] transition-colors"
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-[#ededee] truncate">{doc.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#888c9b] mt-0.5">{doc.source} • {doc.sizeFormatted}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-[#262832] flex items-center justify-between text-[10px] text-slate-400 dark:text-[#6b7082]">
                  <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100/60 dark:border-indigo-900/40 font-bold">
                    {doc.category}
                  </span>
                  <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
