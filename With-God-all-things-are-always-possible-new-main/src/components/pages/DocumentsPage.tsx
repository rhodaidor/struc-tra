import React, { useState } from 'react';
import { 
  Search, Mic, Sparkles, Filter, LayoutGrid, List, ChevronDown, Loader2,
  RotateCcw, FileText, Star, Eye, Download, Trash2, Check, Plus, ChevronLeft, ChevronRight, ShieldCheck, RefreshCcw,
  Inbox, FolderPlus, X, UploadCloud
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DocumentCategory, DocumentSource, AppDocument } from '../../types';
import { isMatchingCategory } from '../../utils/categoryClassifier';

export const DocumentsPage: React.FC = () => {
  const { 
    documents, 
    activeCollectionFilter, 
    setActiveCollectionFilter,
    globalSearchQuery,
    setGlobalSearchQuery,
    aiSearchResult,
    setSelectedDocument,
    toggleFavorite,
    moveToTrash,
    setIsAIChatOpen,
    setIsVoiceSearchOpen,
    setCurrentPage
  } = useApp();

  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedFileType, setSelectedFileType] = useState<string>('All');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('All');
  const [selectedSize, setSelectedSize] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('Recent');
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [customCollections, setCustomCollections] = useState<string[]>([]);
  const [isAddingCollection, setIsAddingCollection] = useState<boolean>(false);
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState<boolean>(false);

  const activeFilterCount = 
    (selectedSources.length > 0 ? selectedSources.length : 0) +
    (activeCollectionFilter && activeCollectionFilter !== 'All Documents' ? 1 : 0) +
    (selectedFileType !== 'All' ? 1 : 0) +
    (selectedDateRange !== 'All' ? 1 : 0);

  const toggleSourceFilter = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
    setCurrentPageNum(1);
  };

  const handleAddCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCollectionName.trim()) {
      setCustomCollections(prev => [...prev, newCollectionName.trim()]);
      setNewCollectionName('');
      setIsAddingCollection(false);
    }
  };

  const clearAllFilters = () => {
    setSelectedSources([]);
    setSelectedFileType('All');
    setSelectedDateRange('All');
    setSelectedSize('All');
    setActiveCollectionFilter(null);
    setGlobalSearchQuery('');
    setCurrentPageNum(1);
  };

  // Filter calculation
  const filteredDocs = documents.filter(doc => {
    if (doc.isTrash) return false;

    // Search query with AI search integration
    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.trim().toLowerCase();
      
      // If AI Search result is available for this exact query
      if (aiSearchResult && aiSearchResult.query.trim().toLowerCase() === q) {
        if (aiSearchResult.matchedDocumentIds && aiSearchResult.matchedDocumentIds.length > 0) {
          if (!aiSearchResult.matchedDocumentIds.includes(doc.id)) {
            return false;
          }
        } else if (!aiSearchResult.isSearching && aiSearchResult.searchError === null) {
          // AI search explicitly returned 0 matches
          return false;
        }
      } else {
        // Multi-signal keyword & metadata matching fallback
        const matchTitle = (doc.title || '').toLowerCase().includes(q);
        const matchCat = (doc.category || '').toLowerCase().includes(q);
        const matchSrc = (doc.source || '').toLowerCase().includes(q);
        const matchTag = (doc.tags || []).some(t => (t || '').toLowerCase().includes(q));
        const matchSummary = (doc.contentSummary || '').toLowerCase().includes(q);
        const matchVendor = doc.metadata?.vendor?.toLowerCase().includes(q);
        const matchDocNum = doc.metadata?.documentNumber?.toLowerCase().includes(q);
        const matchAmount = doc.metadata?.totalAmount?.toLowerCase().includes(q);
        const matchDate = doc.metadata?.issueDate?.toLowerCase().includes(q) || (doc.uploadDate || '').toLowerCase().includes(q);
        const words = q.split(' ').filter(w => w.length > 2);
        const matchWords = words.length > 0 && words.some(w => 
          (doc.title || '').toLowerCase().includes(w) ||
          (doc.metadata?.vendor && doc.metadata.vendor.toLowerCase().includes(w)) ||
          (doc.category || '').toLowerCase().includes(w)
        );

        if (!matchTitle && !matchCat && !matchSrc && !matchTag && !matchSummary && !matchVendor && !matchDocNum && !matchAmount && !matchDate && !matchWords) {
          return false;
        }
      }
    }

    // Collection filter
    if (activeCollectionFilter) {
      if (activeCollectionFilter === 'Favorites' && !doc.isFavorite) return false;
      if (activeCollectionFilter === 'Recent') {
        const docDate = new Date(doc.uploadDate).getTime();
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (docDate < thirtyDaysAgo) return false;
      }
      if (activeCollectionFilter !== 'All Documents' && activeCollectionFilter !== 'Recent' && activeCollectionFilter !== 'Favorites') {
        if (customCollections.includes(activeCollectionFilter)) {
          if (!(doc.tags || []).includes(activeCollectionFilter)) return false;
        } else {
          if (!isMatchingCategory(doc.category, activeCollectionFilter)) return false;
        }
      }
    }

    // Source Filter Checkboxes
    if (selectedSources.length > 0) {
      const matchSource = selectedSources.some(s => doc.source.toLowerCase().includes(s.toLowerCase()));
      if (!matchSource) return false;
    }

    // File Type Dropdown
    if (selectedFileType !== 'All') {
      if (selectedFileType === 'PDF' && doc.fileType !== 'PDF') return false;
      if (selectedFileType === 'DOCX' && doc.fileType !== 'DOCX') return false;
      if (selectedFileType === 'XLSX' && doc.fileType !== 'XLSX') return false;
    }

    return true;
  });

  // Sort docs - prioritizing Best Match if AI Search identified a top document
  const sortedDocs = [...filteredDocs].sort((a, b) => {
    if (globalSearchQuery.trim() && aiSearchResult?.bestMatchId) {
      if (a.id === aiSearchResult.bestMatchId) return -1;
      if (b.id === aiSearchResult.bestMatchId) return 1;
    }

    if (sortBy === 'Recent') {
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    }
    if (sortBy === 'Name') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'Size') {
      return (b.fileSize || 0) - (a.fileSize || 0);
    }
    return 0;
  });

  // Pagination
  const totalResults = sortedDocs.length;
  const totalPages = Math.ceil(totalResults / itemsPerPage) || 1;
  const startIndex = (currentPageNum - 1) * itemsPerPage;
  const displayedDocs = sortedDocs.slice(startIndex, startIndex + itemsPerPage);

  // Counts for Collections
  const allCount = documents.filter(d => !d.isTrash).length;
  const recentCount = documents.filter(d => !d.isTrash).length;
  const favCount = documents.filter(d => !d.isTrash && d.isFavorite).length;
  const invoiceCount = documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Invoices')).length;
  const contractCount = documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Contracts')).length;
  const receiptCount = documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Receipts')).length;
  const reportCount = documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Reports')).length;
  const certificateCount = documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Certificates')).length;
  const otherCount = documents.filter(d => !d.isTrash && isMatchingCategory(d.category, 'Others')).length;

  // Counts for Sources
  const gmailCount = documents.filter(d => !d.isTrash && d.source === 'Gmail').length;
  const uploadCount = documents.filter(d => !d.isTrash && d.source === 'Upload Center').length;
  const telegramCount = documents.filter(d => !d.isTrash && d.source === 'Telegram').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-[#ededee] tracking-tight flex items-center gap-2">
            Documents <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#888c9b] font-medium mt-0.5">
            All your documents in one place. Search, filter and management with ease.
          </p>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Filters Column (Desktop only >= 1024px) */}
        <div className="hidden lg:block lg:col-span-3 space-y-6">
          {/* Smart AI Collection Box */}
          <div className="bg-white dark:bg-[#16171b] rounded-3xl p-5 border border-slate-200/80 dark:border-[#22242a] shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-[#22242a]">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider">Smart AI Collection</h3>
            </div>

            <div className="space-y-1 text-xs font-semibold text-slate-600 dark:text-[#888c9b]">
              {[
                { name: 'All Documents', count: allCount },
                { name: 'Recent', count: recentCount },
                { name: 'Favorites', count: favCount },
                { name: 'Invoices', count: invoiceCount },
                { name: 'Contracts', count: contractCount },
                { name: 'Receipts', count: receiptCount },
                { name: 'Reports', count: reportCount },
                { name: 'Certificates', count: certificateCount },
                { name: 'Others', count: otherCount },
                ...customCollections.map(c => ({ name: c, count: documents.filter(d => (d.tags || []).includes(c)).length }))
              ].map((item) => {
                const isActive = activeCollectionFilter === item.name || (!activeCollectionFilter && item.name === 'All Documents');
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActiveCollectionFilter(item.name === 'All Documents' ? null : item.name);
                      setCurrentPageNum(1);
                    }}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                      isActive 
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-extrabold' 
                        : 'hover:bg-slate-50 dark:hover:bg-[#20222a] text-slate-600 dark:text-[#888c9b]'
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 dark:bg-[#20222a] text-slate-500 dark:text-[#888c9b] font-bold'
                    }`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}

              {/* Add Collection Form */}
              {isAddingCollection ? (
                <form onSubmit={handleAddCollection} className="pt-2">
                  <input
                    type="text"
                    autoFocus
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="Collection name..."
                    className="w-full px-2.5 py-1.5 border border-blue-300 dark:border-blue-700 dark:bg-[#20222a] dark:text-[#ededee] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingCollection(true)}
                  className="w-full mt-2 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[#20222a] rounded-xl border border-dashed border-blue-200 dark:border-[#2a2d37] flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>NewCollection</span>
                </button>
              )}
            </div>
          </div>

          {/* Source Checkbox Filter Box */}
          <div className="bg-white dark:bg-[#16171b] rounded-3xl p-5 border border-slate-200/80 dark:border-[#22242a] shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#22242a]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider">Filter</h3>
              </div>
              <button
                onClick={clearAllFilters}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082] uppercase tracking-wider">Source</p>

              {[
                { label: 'Gmail', count: gmailCount },
                { label: 'Upload Center', count: uploadCount },
                { label: 'Telegram', count: telegramCount },
                { label: 'Receipts', count: receiptCount }
              ].map((src) => {
                const isChecked = selectedSources.includes(src.label);
                return (
                  <label 
                    key={src.label} 
                    className="flex items-center justify-between cursor-pointer py-1 px-2 hover:bg-slate-50 dark:hover:bg-[#20222a] rounded-xl text-slate-700 dark:text-[#d0d3de] font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSourceFilter(src.label)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-[#20222a]"
                      />
                      <span className="text-xs">{src.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082]">{src.count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* AI Info Card Banner */}
          <div className="p-5 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white dark:from-[#161924] dark:via-[#16171b] dark:to-[#16171b] rounded-3xl border border-blue-100/80 dark:border-blue-900/30 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
              AI
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-[#ededee]">AI organizes. You win time.</h4>
            <p className="text-[11px] text-slate-500 dark:text-[#888c9b] leading-relaxed font-medium">
              Structra automatically categorizes and tags your documents so you can find them in seconds.
            </p>
            <button 
              onClick={() => setIsAIChatOpen(true)}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 pt-1"
            >
              Learn more →
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="w-full lg:col-span-9 space-y-4">
          {/* Mobile & Tablet Quick Collection Horizontal Pills */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { name: 'All Documents', count: allCount },
              { name: 'Recent', count: recentCount },
              { name: 'Favorites', count: favCount },
              { name: 'Invoices', count: invoiceCount },
              { name: 'Contracts', count: contractCount },
              { name: 'Receipts', count: receiptCount },
              { name: 'Reports', count: reportCount },
              { name: 'Certificates', count: certificateCount },
              { name: 'Others', count: otherCount },
              ...customCollections.map(c => ({ name: c, count: documents.filter(d => (d.tags || []).includes(c)).length }))
            ].map((item) => {
              const isActive = activeCollectionFilter === item.name || (!activeCollectionFilter && item.name === 'All Documents');
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveCollectionFilter(item.name === 'All Documents' ? null : item.name);
                    setCurrentPageNum(1);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-[#16171b] text-slate-600 dark:text-[#888c9b] hover:bg-slate-50 dark:hover:bg-[#20222a] border border-slate-200/80 dark:border-[#22242a]'
                  }`}
                >
                  <span className="truncate">{item.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-blue-700 text-white font-black' : 'bg-slate-100 dark:bg-[#20222a] text-slate-500 dark:text-[#888c9b] font-bold'
                  }`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Top Dropdowns & Filter Bar */}
          <div className="bg-white dark:bg-[#16171b] rounded-2xl p-3 border border-slate-200/80 dark:border-[#22242a] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Mobile / Tablet Filter Trigger Button */}
              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold rounded-xl border border-blue-200 dark:border-blue-800 transition-colors shrink-0"
              >
                <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Source Dropdown */}
              <div className="relative">
                <select
                  value={selectedSources[0] || 'Source'}
                  onChange={(e) => {
                    if (e.target.value === 'Source') setSelectedSources([]);
                    else setSelectedSources([e.target.value]);
                  }}
                  className="appearance-none bg-slate-50 dark:bg-[#20222a] border border-slate-200 dark:border-[#2a2d37] hover:bg-slate-100 dark:hover:bg-[#282a36] rounded-xl px-3 py-1.5 pr-7 font-bold text-slate-700 dark:text-[#ededee] cursor-pointer focus:outline-none"
                >
                  <option value="Source">Source</option>
                  <option value="Gmail">Gmail</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Upload Center">Upload Center</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-[#6b7082] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* File Type Dropdown */}
              <div className="relative">
                <select
                  value={selectedFileType}
                  onChange={(e) => setSelectedFileType(e.target.value)}
                  className="appearance-none bg-slate-50 dark:bg-[#20222a] border border-slate-200 dark:border-[#2a2d37] hover:bg-slate-100 dark:hover:bg-[#282a36] rounded-xl px-3 py-1.5 pr-7 font-bold text-slate-700 dark:text-[#ededee] cursor-pointer focus:outline-none"
                >
                  <option value="All">File Type</option>
                  <option value="PDF">PDF</option>
                  <option value="DOCX">Word (DOCX)</option>
                  <option value="XLSX">Excel (XLSX)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-[#6b7082] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Date Modified */}
              <div className="relative">
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="appearance-none bg-slate-50 dark:bg-[#20222a] border border-slate-200 dark:border-[#2a2d37] hover:bg-slate-100 dark:hover:bg-[#282a36] rounded-xl px-3 py-1.5 pr-7 font-bold text-slate-700 dark:text-[#ededee] cursor-pointer focus:outline-none"
                >
                  <option value="All">Date Modified</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="1year">This Year</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-[#6b7082] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Reset Button */}
              <button
                onClick={clearAllFilters}
                className="px-3 py-1.5 text-slate-500 dark:text-[#888c9b] hover:text-slate-800 dark:hover:text-[#ededee] font-bold hover:bg-slate-100 dark:hover:bg-[#20222a] rounded-xl transition-colors"
              >
                Reset
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-[#20222a] p-0.5 rounded-xl border border-slate-200 dark:border-[#2a2d37]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#16171b] text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-400 dark:text-[#6b7082] hover:text-slate-600 dark:hover:text-[#ededee]'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-[#16171b] text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-400 dark:text-[#6b7082] hover:text-slate-600 dark:hover:text-[#ededee]'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort By Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-slate-50 dark:bg-[#20222a] border border-slate-200 dark:border-[#2a2d37] hover:bg-slate-100 dark:hover:bg-[#282a36] rounded-xl px-3 py-1.5 pr-7 font-bold text-slate-700 dark:text-[#ededee] cursor-pointer focus:outline-none"
                >
                  <option value="Recent">Sort by: Recent</option>
                  <option value="Name">Sort by: Name</option>
                  <option value="Size">Sort by: Size</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-[#6b7082] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* AI Search Natural Language Banner */}
          {globalSearchQuery.trim() && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/40 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                      Structra AI Retrieval
                    </h3>
                    <p className="text-sm font-bold text-white">
                      "{globalSearchQuery}"
                    </p>
                  </div>
                </div>

                {aiSearchResult?.isSearching ? (
                  <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-300 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> Evaluating workspace document index...
                  </span>
                ) : aiSearchResult?.matchType === 'EXACT' ? (
                  <span className="px-3 py-1 bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 rounded-full text-[11px] font-extrabold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Exact Match
                  </span>
                ) : aiSearchResult?.matchType === 'RELATED' ? (
                  <span className="px-3 py-1 bg-blue-500/25 border border-blue-400/40 text-blue-200 rounded-full text-[11px] font-extrabold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                    Related Documents ({Math.round((aiSearchResult.confidence || 0.85) * 100)}%)
                  </span>
                ) : aiSearchResult?.matchType === 'NONE' ? (
                  <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-300 rounded-full text-[11px] font-extrabold flex items-center gap-1">
                    No Direct Match
                  </span>
                ) : aiSearchResult?.aiAnswer ? (
                  <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-[11px] font-extrabold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {Math.round((aiSearchResult.confidence || 0.95) * 100)}% Match Confidence
                  </span>
                ) : null}
              </div>

              {aiSearchResult?.aiAnswer && (
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 text-xs text-indigo-100 font-medium leading-relaxed border border-white/10">
                  <p className="font-bold text-white text-xs">{aiSearchResult.aiAnswer}</p>
                  {aiSearchResult.reasoning && (
                    <p className="text-[11px] text-indigo-200/80 mt-1 italic">
                      <strong className="not-italic text-indigo-300">Matching criteria:</strong> {aiSearchResult.reasoning}
                    </p>
                  )}
                </div>
              )}

              {aiSearchResult?.parsedIntent && (
                <div className="flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 pt-1">
                  {aiSearchResult.parsedIntent.vendor && (
                    <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-lg">
                      Vendor: {aiSearchResult.parsedIntent.vendor}
                    </span>
                  )}
                  {aiSearchResult.parsedIntent.documentType && (
                    <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-lg">
                      Type: {aiSearchResult.parsedIntent.documentType}
                    </span>
                  )}
                  {aiSearchResult.parsedIntent.dateRange && (
                    <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-lg">
                      Date: {aiSearchResult.parsedIntent.dateRange}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Filter Results Banner */}
          <div className="flex items-center justify-between text-xs font-semibold px-1">
            <span className="text-slate-500 dark:text-[#888c9b]">
              Showing results from <span className="text-blue-600 dark:text-blue-400 font-bold">{activeCollectionFilter || 'All documents'}</span>
            </span>
            <span className="text-slate-400 dark:text-[#6b7082] font-bold">{totalResults} documents found</span>
          </div>

          {/* Main Document View: List or Grid */}
          {viewMode === 'list' ? (
            <div className="bg-white dark:bg-[#16171b] rounded-3xl border border-slate-200/80 dark:border-[#22242a] shadow-2xs overflow-hidden">
              {/* Desktop & Tablet Table View (>=768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-[#1a1c23] border-b border-slate-100 dark:border-[#22242a] text-[10px] font-extrabold text-slate-400 dark:text-[#888c9b] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-3">Source</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Size</th>
                      <th className="py-3 px-3">Date Modified</th>
                      <th className="py-3 px-3">Tags</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#22242a]">
                    {displayedDocs.length > 0 ? (
                      displayedDocs.map((doc) => (
                        <tr 
                          key={doc.id}
                          onClick={() => setSelectedDocument(doc)}
                          className="hover:bg-blue-50/40 dark:hover:bg-[#1e2029] transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                doc.fileType === 'PDF' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60' :
                                doc.fileType === 'DOCX' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60' :
                                'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60'
                              }`}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="truncate max-w-xs">
                                <p className="font-bold text-slate-900 dark:text-[#ededee] group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{doc.title}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-slate-600 dark:text-[#d0d3de]">
                            <div className="flex items-center gap-1.5">
                              <span>{doc.source}</span>
                              {doc.importStatus === 'External' ? (
                                <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold border border-amber-200/60 dark:border-amber-900/60 rounded-md">
                                  Indexed
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[9px] font-extrabold border border-blue-200/60 dark:border-blue-900/60 rounded-md">
                                  Imported
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#20222a] font-bold text-[10px] text-slate-600 dark:text-[#888c9b] rounded">
                              {doc.fileType}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-slate-500 dark:text-[#888c9b] font-medium">
                            {doc.sizeFormatted}
                          </td>

                          <td className="py-3.5 px-3 text-slate-400 dark:text-[#6b7082] text-[11px] font-medium">
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {(doc.tags || []).slice(0, 2).map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-md">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => toggleFavorite(doc.id)}
                                className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors ${
                                  doc.isFavorite ? 'text-amber-500' : 'text-slate-300 dark:text-[#6b7082] hover:text-slate-500'
                                }`}
                              >
                                <Star className="w-4 h-4 fill-current" />
                              </button>

                              <button
                                onClick={() => moveToTrash(doc.id)}
                                className="p-1.5 text-slate-300 dark:text-[#6b7082] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setSelectedDocument(doc)}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                              >
                                Retrieve
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center px-4">
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                              <Search className="w-6 h-6" />
                            </div>
                            <p className="font-extrabold text-slate-800 dark:text-[#ededee] text-sm">No matching documents found in your library.</p>
                            <div className="bg-slate-50 dark:bg-[#1a1c23] border border-slate-200 dark:border-[#22242a] rounded-2xl p-4 text-xs text-slate-600 dark:text-[#888c9b] text-left space-y-2">
                              <p className="font-bold text-slate-800 dark:text-[#ededee]">Search Suggestions:</p>
                              <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-[#888c9b]">
                                <li>Search by vendor or company (e.g., <span className="font-semibold text-slate-700 dark:text-[#d0d3de]">Dangote</span>, <span className="font-semibold text-slate-700 dark:text-[#d0d3de]">Zenith</span>)</li>
                                <li>Specify document types (e.g., <span className="font-semibold text-slate-700 dark:text-[#d0d3de]">invoice</span>, <span className="font-semibold text-slate-700 dark:text-[#d0d3de]">contract</span>, <span className="font-semibold text-slate-700 dark:text-[#d0d3de]">receipt</span>)</li>
                                <li>Mention dates or months (e.g., <span className="font-semibold text-slate-700 dark:text-[#d0d3de]">March</span>, <span className="font-semibold text-slate-700 dark:text-[#d0d3de]">April</span>)</li>
                                <li>Include reference numbers (e.g., <span className="font-semibold text-slate-700 dark:text-[#d0d3de]">INV-2045</span>)</li>
                              </ul>
                            </div>
                            <div className="flex items-center justify-center gap-2 pt-2">
                              <button
                                onClick={() => setCurrentPage('upload')}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
                              >
                                Upload Document
                              </button>
                              {globalSearchQuery && (
                                <button
                                  onClick={clearAllFilters}
                                  className="px-4 py-2 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#282a36] text-slate-700 dark:text-[#ededee] font-bold rounded-xl text-xs transition-colors"
                                >
                                  Clear Search
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (<768px) */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-[#22242a]">
                {displayedDocs.length > 0 ? (
                  displayedDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className="p-4 hover:bg-blue-50/30 dark:hover:bg-[#1e2029] transition-colors cursor-pointer space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            doc.fileType === 'PDF' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60' :
                            doc.fileType === 'DOCX' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60' :
                            'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60'
                          }`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-[#ededee] text-xs leading-snug line-clamp-1">{doc.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-[#888c9b] mt-0.5">{doc.source} • {doc.sizeFormatted}</p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#20222a] font-bold text-[10px] text-slate-600 dark:text-[#888c9b] rounded shrink-0">
                          {doc.fileType}
                        </span>
                      </div>

                      {/* Tags & Metadata */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap gap-1">
                          {(doc.tags || []).slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <span className="text-[10px] text-slate-400 dark:text-[#6b7082] font-medium">
                          {new Date(doc.uploadDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/80 dark:border-[#22242a]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFavorite(doc.id)}
                            className={`p-2 rounded-xl border border-slate-200 dark:border-[#2a2d37] transition-colors ${
                              doc.isFavorite ? 'text-amber-500 bg-amber-50/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>

                          <button
                            onClick={() => moveToTrash(doc.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-[#2a2d37] rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                        >
                          Retrieve Document
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center px-4">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-extrabold text-slate-800 dark:text-[#ededee] text-sm">No matching documents were found.</p>
                      <p className="text-xs text-slate-500 dark:text-[#888c9b]">
                        {globalSearchQuery 
                          ? `No results for "${globalSearchQuery}". Check for typos or try another keyword.` 
                          : 'Try selecting another collection or clearing active filters.'}
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          onClick={() => setCurrentPage('upload')}
                          className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-2xs"
                        >
                          Upload a Document
                        </button>
                        {globalSearchQuery && (
                          <button
                            onClick={clearAllFilters}
                            className="px-4 py-2 bg-slate-100 dark:bg-[#20222a] text-slate-700 dark:text-[#ededee] font-bold rounded-xl text-xs"
                          >
                            Try another keyword
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {displayedDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className="p-4 bg-white dark:bg-[#16171b] rounded-3xl border border-slate-200/80 dark:border-[#22242a] shadow-2xs hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(doc.id);
                      }}
                      className={`p-1.5 rounded-lg ${doc.isFavorite ? 'text-amber-500' : 'text-slate-300 dark:text-[#6b7082] hover:text-slate-500'}`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#ededee] group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{doc.title}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#6b7082] mt-0.5">{doc.source} • {doc.sizeFormatted}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-[#22242a] flex items-center justify-between text-[11px]">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#20222a] text-slate-600 dark:text-[#888c9b] font-bold rounded text-[10px]">{doc.category}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocument(doc);
                      }}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      Retrieve →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table Bottom Pagination Bar */}
          <div className="px-6 py-4 bg-white dark:bg-[#16171b] rounded-2xl border border-slate-200/80 dark:border-[#22242a] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#888c9b]">
            <p className="font-semibold">
              Showing {totalResults > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, totalResults)} of {totalResults} documents
            </p>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
                  disabled={currentPageNum === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2a2d37] hover:bg-slate-50 dark:hover:bg-[#20222a] disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPageNum(idx + 1)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      currentPageNum === idx + 1
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'hover:bg-slate-100 dark:hover:bg-[#20222a] text-slate-700 dark:text-[#d0d3de]'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))}
                  disabled={currentPageNum === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2a2d37] hover:bg-slate-50 dark:hover:bg-[#20222a] disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Items per page selector */}
              <div className="relative ml-2">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPageNum(1);
                  }}
                  className="appearance-none bg-slate-50 dark:bg-[#20222a] border border-slate-200 dark:border-[#2a2d37] rounded-xl px-3 py-1 pr-7 font-bold text-slate-700 dark:text-[#ededee] cursor-pointer focus:outline-none"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-[#6b7082] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Filters Drawer */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileFiltersOpen(false)}
          />

          {/* Drawer Body */}
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-[#16171b] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-[#22242a] flex items-center justify-between bg-slate-50/50 dark:bg-[#181a20]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-[#ededee]">Filters & Collections</h3>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1.5 text-slate-400 dark:text-[#888c9b] hover:text-slate-600 dark:hover:text-[#ededee] hover:bg-slate-100 dark:hover:bg-[#20222a] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Smart AI Collection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-[#22242a]">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider">Smart AI Collection</h4>
                </div>
                <div className="space-y-1 text-xs font-semibold text-slate-600 dark:text-[#888c9b]">
                  {[
                    { name: 'All Documents', count: allCount },
                    { name: 'Recent', count: recentCount },
                    { name: 'Favorites', count: favCount },
                    { name: 'Invoices', count: invoiceCount },
                    { name: 'Contracts', count: contractCount },
                    { name: 'Receipts', count: receiptCount },
                    { name: 'Reports', count: reportCount },
                    { name: 'Certificates', count: certificateCount },
                    { name: 'Others', count: otherCount },
                    ...customCollections.map(c => ({ name: c, count: documents.filter(d => (d.tags || []).includes(c)).length }))
                  ].map((item) => {
                    const isActive = activeCollectionFilter === item.name || (!activeCollectionFilter && item.name === 'All Documents');
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          setActiveCollectionFilter(item.name === 'All Documents' ? null : item.name);
                          setCurrentPageNum(1);
                        }}
                        className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                          isActive 
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-extrabold' 
                            : 'hover:bg-slate-50 dark:hover:bg-[#20222a] text-slate-600 dark:text-[#888c9b]'
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 dark:bg-[#20222a] text-slate-500 dark:text-[#888c9b] font-bold'
                        }`}>
                          {item.count}
                        </span>
                      </button>
                    );
                  })}

                  {/* Add Collection Form */}
                  {isAddingCollection ? (
                    <form onSubmit={handleAddCollection} className="pt-2">
                      <input
                        type="text"
                        autoFocus
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        placeholder="Collection name..."
                        className="w-full px-2.5 py-1.5 border border-blue-300 dark:border-blue-700 dark:bg-[#20222a] dark:text-[#ededee] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </form>
                  ) : (
                    <button
                      onClick={() => setIsAddingCollection(true)}
                      className="w-full mt-2 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[#20222a] rounded-xl border border-dashed border-blue-200 dark:border-[#2a2d37] flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>NewCollection</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Source Checkbox Filter Box */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-[#22242a]">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider">Source</h4>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Gmail', count: gmailCount },
                    { label: 'Upload Center', count: uploadCount },
                    { label: 'Telegram', count: telegramCount },
                    { label: 'Receipts', count: receiptCount }
                  ].map((src) => {
                    const isChecked = selectedSources.includes(src.label);
                    return (
                      <label 
                        key={src.label} 
                        className="flex items-center justify-between cursor-pointer py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-[#20222a] rounded-xl text-slate-700 dark:text-[#d0d3de] font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSourceFilter(src.label)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-[#20222a]"
                          />
                          <span className="text-xs">{src.label}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082]">{src.count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Quick Dropdown Filters */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider">File & Date</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082]">File Type</label>
                    <select
                      value={selectedFileType}
                      onChange={(e) => setSelectedFileType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#20222a] border border-slate-200 dark:border-[#2a2d37] rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-[#ededee] focus:outline-none"
                    >
                      <option value="All">All Types</option>
                      <option value="PDF">PDF</option>
                      <option value="DOCX">Word (DOCX)</option>
                      <option value="XLSX">Excel (XLSX)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-[#6b7082]">Date</label>
                    <select
                      value={selectedDateRange}
                      onChange={(e) => setSelectedDateRange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#20222a] border border-slate-200 dark:border-[#2a2d37] rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-[#ededee] focus:outline-none"
                    >
                      <option value="All">Any Time</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="1year">This Year</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-[#22242a] bg-slate-50 dark:bg-[#181a20] flex items-center gap-3">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-2.5 text-xs font-bold text-slate-700 dark:text-[#ededee] bg-white dark:bg-[#20222a] border border-slate-200 dark:border-[#2a2d37] hover:bg-slate-100 dark:hover:bg-[#282a36] rounded-xl transition-colors text-center"
              >
                Reset
              </button>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="flex-2 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors text-center"
              >
                Show {filteredDocs.length} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


