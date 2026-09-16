import React from 'react';
import { 
  Sparkles, Search, Mic, UploadCloud, FileText, 
  HardDrive, CheckCircle2, ArrowUpRight, Star, Eye, Trash2, 
  Mail, Send, Plus, Clock, ExternalLink, Filter, MessageSquare, 
  FileCode, Receipt, BarChart3, Award, Folder, MoreVertical 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DocumentCategory } from '../../types';
import { isMatchingCategory } from '../../utils/categoryClassifier';
import { getTimeOfDayGreeting } from '../../utils/dateUtils';

export const DashboardPage: React.FC = () => {
  const { 
    user, 
    setCurrentPage, 
    documents, 
    searchHistory, 
    addSearchQuery,
    setGlobalSearchQuery,
    setSelectedDocument,
    toggleFavorite,
    moveToTrash,
    integrations,
    setActiveCollectionFilter,
    setIsVoiceSearchOpen,
    connectIntegration
  } = useApp();

  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  const recentDocs = documents.filter(d => !d.isTrash).slice(0, 6);

  const stats = [
    { label: 'Total Documents', value: documents.filter(d => !d.isTrash).length.toString(), change: documents.length > 0 ? `${documents.length} stored` : '0 stored', icon: FileText },
    { label: 'Categories Managed', value: new Set(documents.filter(d => !d.isTrash).map(d => d.category)).size.toString(), change: 'Auto-indexed', icon: Folder },
    { label: 'Connected Channels', value: integrations.filter(i => i.connected).length.toString(), change: integrations.filter(i => i.connected).length > 0 ? 'Active' : 'None', icon: Mail },
    { label: 'Retrieval Accuracy', value: documents.length > 0 ? '99%' : '100%', change: '< 1.2s avg search', icon: CheckCircle2 },
  ];

  const smartCollections: { name: DocumentCategory; count: number; icon: any }[] = [
    { name: 'Invoices', count: documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Invoices')).length, icon: FileText },
    { name: 'Contracts', count: documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Contracts')).length, icon: FileCode },
    { name: 'Receipts', count: documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Receipts')).length, icon: Receipt },
    { name: 'Reports', count: documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Reports')).length, icon: BarChart3 },
    { name: 'Certificates', count: documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Certificates')).length, icon: Award },
    { name: 'Others', count: documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Others')).length, icon: Folder },
  ];

  const handleCollectionSelect = (cat: DocumentCategory) => {
    setActiveCollectionFilter(cat);
    setCurrentPage('documents');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-7xl mx-auto">
      {/* Top Greeting Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-[#14151a] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-[#262832] shadow-2xs flex items-center justify-between gap-4 transition-colors">
        <div className="max-w-xl space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#ededee] tracking-tight flex items-center gap-2">
            {getTimeOfDayGreeting()}, {user?.name?.split(' ')[0] || 'Rhoda'}! 👋
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#9da1b0] leading-relaxed font-medium">
            Bring your document sources together for AI-powered organization, intelligent search, instant retrieval, and actionable insights - all from one secure workspace.
          </p>
        </div>

        {/* Purple Folder Illustration Graphic (Right) */}
        <div className="hidden sm:flex shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white items-center justify-center shadow-md shadow-indigo-500/20">
          <Folder className="w-10 h-10 fill-white/20 text-white" />
        </div>
      </div>

      {/* Quick Actions matching Mockup Screen 1 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider">Quick Actions</h2>
          <button 
            onClick={() => setCurrentPage('upload')}
            className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Upload Document */}
          <button
            onClick={() => setCurrentPage('upload')}
            className="p-3.5 bg-white dark:bg-[#16171c] hover:bg-slate-50 dark:hover:bg-[#1e2027] border border-slate-200/80 dark:border-[#262832] rounded-2xl flex flex-col items-center text-center gap-2 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-[#ededee]">Upload Document</span>
          </button>

          {/* AI Search Docs */}
          <button
            onClick={() => setIsVoiceSearchOpen(true)}
            className="p-3.5 bg-white dark:bg-[#16171c] hover:bg-slate-50 dark:hover:bg-[#1e2027] border border-slate-200/80 dark:border-[#262832] rounded-2xl flex flex-col items-center text-center gap-2 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-[#ededee]">AI Search Docs</span>
          </button>

          {/* Import from Gmail */}
          <button
            onClick={() => {
              setCurrentPage('integrations');
            }}
            className="p-3.5 bg-white dark:bg-[#16171c] hover:bg-slate-50 dark:hover:bg-[#1e2027] border border-slate-200/80 dark:border-[#262832] rounded-2xl flex flex-col items-center text-center gap-2 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-[#ededee]">Import from Gmail</span>
          </button>

          {/* Import from Telegram */}
          <button
            onClick={() => {
              setCurrentPage('integrations');
            }}
            className="p-3.5 bg-white dark:bg-[#16171c] hover:bg-slate-50 dark:hover:bg-[#1e2027] border border-slate-200/80 dark:border-[#262832] rounded-2xl flex flex-col items-center text-center gap-2 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-[#ededee]">Import from Telegram</span>
          </button>
        </div>
      </div>

      {/* Document Categories Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider">Document Categories</h2>
          <button
            onClick={() => {
              setActiveCollectionFilter(null);
              setCurrentPage('documents');
            }}
            className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {smartCollections.slice(0, 4).map((col) => {
            const IconComponent = col.icon;
            return (
              <button
                key={col.name}
                onClick={() => handleCollectionSelect(col.name)}
                className="p-4 bg-white dark:bg-[#16171c] hover:bg-blue-50/40 dark:hover:bg-[#1e2027] border border-slate-200/80 dark:border-[#262832] rounded-2xl text-left transition-all group shadow-2xs flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-[#ededee]">{col.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-[#888c9b] font-medium">{col.count} {col.count === 1 ? 'doc' : 'docs'}</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-[#555866] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Recent Documents & Recent Searches matching Mockup Screen 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Documents List */}
        <div className="bg-white dark:bg-[#14151a] rounded-3xl border border-slate-200/80 dark:border-[#262832] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider">
              Recent Documents
            </h3>
            <button 
              onClick={() => {
                setActiveCollectionFilter(null);
                setCurrentPage('documents');
              }} 
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-2.5">
            {recentDocs.length > 0 ? (
              recentDocs.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-[#22242a] hover:border-blue-200 dark:hover:border-blue-800/80 hover:bg-blue-50/30 dark:hover:bg-[#1a1b22] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-[10px] shrink-0 ${
                      doc.fileType === 'PDF' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60' :
                      doc.fileType === 'DOCX' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60' :
                      'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60'
                    }`}>
                      {doc.fileType === 'PDF' ? 'PDF' : doc.fileType === 'DOCX' ? 'DOC' : 'IMG'}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-[#ededee] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{doc.title}</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#888c9b] font-medium truncate">{doc.uploadDate} • {doc.fileType} • {doc.sizeFormatted}</p>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedDocument(doc); }}
                    className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-[#ededee] rounded-lg hover:bg-slate-100 dark:hover:bg-[#22242c] transition-colors shrink-0 cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-8 px-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-[#ededee]">No documents yet.</p>
                  <p className="text-[11px] text-slate-400 dark:text-[#888c9b] max-w-xs mx-auto mt-0.5">
                    Upload your first document or connect Gmail or Telegram to get started.
                  </p>
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => setCurrentPage('upload')}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Upload Document
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Searches List */}
        <div className="bg-white dark:bg-[#14151a] rounded-3xl border border-slate-200/80 dark:border-[#262832] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider">
              Recent Searches
            </h3>
            {searchHistory.length > 0 && (
              <button 
                onClick={() => setCurrentPage('documents')} 
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                View all
              </button>
            )}
          </div>

          <div className="space-y-2">
            {searchHistory.length > 0 ? (
              searchHistory.slice(0, 5).map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setGlobalSearchQuery(item.query);
                    addSearchQuery(item.query);
                    setCurrentPage('documents');
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50 dark:bg-[#18191f] hover:bg-blue-50/60 dark:hover:bg-[#20222a] border border-slate-100 dark:border-[#262832] transition-colors flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-[#d1d5db] hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-slate-400 dark:text-[#707482] shrink-0" />
                  <span className="truncate">{item.query}</span>
                </button>
              ))
            ) : (
              <div className="py-8 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#18191f] text-slate-400 dark:text-[#707482] flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-[#ededee]">No recent searches yet.</p>
                  <p className="text-[11px] text-slate-400 dark:text-[#888c9b] max-w-xs mx-auto mt-0.5">
                    Your search history will appear here once you query your documents.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating Action Button (FAB) matching Mockup Screen 1 & 3 */}
      <button
        onClick={() => setCurrentPage('upload')}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-40 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all focus:outline-none"
        title="Quick Upload Document"
        aria-label="Quick Upload Document"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};

