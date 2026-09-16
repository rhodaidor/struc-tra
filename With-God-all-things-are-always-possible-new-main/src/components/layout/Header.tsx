import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Mic, Sparkles, Bell, Shield, 
  LogOut, Settings, ChevronDown, Check, X, Filter, Menu, FileText, FileCode, Receipt, BarChart3, Tag
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { UserAvatar } from '../common/UserAvatar';
import { StructraLogo } from '../common/StructraLogo';
import aiAvatarImg from '../../assets/images/structra_ai_avatar_1785559224651.jpg';

export const Header: React.FC = () => {
  const { 
    user, 
    currentPage, 
    setCurrentPage, 
    globalSearchQuery, 
    setGlobalSearchQuery, 
    performAISearch,
    addSearchQuery,
    documents,
    setSelectedDocument,
    setIsAIChatOpen,
    setIsVoiceSearchOpen,
    setIsMobileMenuOpen,
    logout,
    notifications,
    openOnboarding
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchErrorToast, setSearchErrorToast] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadNotifCount = notifications.filter(n => n.unread).length;

  // Auto-close dropdowns on page navigation
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsNotifOpen(false);
  }, [currentPage]);

  // Handle outside click & Escape key for User Profile Dropdown
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  // Filter matching suggestions for search dropdown
  const matchingSuggestions = React.useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    const q = globalSearchQuery.toLowerCase();
    return documents.filter(doc => !doc.isTrash && (
      (doc.title || '').toLowerCase().includes(q) ||
      (doc.category || '').toLowerCase().includes(q) ||
      (doc.source || '').toLowerCase().includes(q) ||
      (doc.fileType || '').toLowerCase().includes(q) ||
      (doc.tags || []).some(t => (t || '').toLowerCase().includes(q)) ||
      (doc.contentSummary || '').toLowerCase().includes(q)
    )).slice(0, 5);
  }, [documents, globalSearchQuery]);

  // Handle clicking outside search container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = globalSearchQuery.trim();
    if (!query) {
      setSearchErrorToast('Enter a keyword to search your documents.');
      setTimeout(() => setSearchErrorToast(null), 3000);
      return;
    }

    setSearchErrorToast(null);
    addSearchQuery(query);
    setIsSearchFocused(false);
    performAISearch(query);
    if (currentPage !== 'documents') {
      setCurrentPage('documents');
    }
  };

  const handleSelectSuggestion = (docTitle: string, doc?: any) => {
    setGlobalSearchQuery(docTitle);
    addSearchQuery(docTitle);
    setIsSearchFocused(false);
    if (doc) {
      setSelectedDocument(doc);
    }
    performAISearch(docTitle);
    if (currentPage !== 'documents') {
      setCurrentPage('documents');
    }
  };

  const handleClearSearch = () => {
    setGlobalSearchQuery('');
    setSearchErrorToast(null);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-[#121316] border-b border-slate-200/80 dark:border-[#22242a] sticky top-0 z-30 px-3 md:px-6 flex items-center justify-between gap-2 transition-colors">
      {/* Brand Logo & Mobile Menu Toggle */}
      <div className="flex items-center gap-2">
        {user && (
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1c22] rounded-xl transition-colors shrink-0"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Structra Logo & Name: Hidden on Mobile when user is logged in */}
        <div className={user ? 'hidden md:block' : 'block'}>
          <StructraLogo 
            size="md" 
            onClick={() => setCurrentPage(user ? 'dashboard' : 'landing')} 
          />
        </div>
      </div>

      {/* Global AI Search Bar (Desktop, Tablet & Mobile) */}
      {user && (
        <div ref={searchContainerRef} className="flex-1 max-w-xl mx-1 sm:mx-4 relative">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 dark:text-[#666a79] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setSearchErrorToast(null);
                if (!isSearchFocused) setIsSearchFocused(true);
              }}
              placeholder="Search documents, invoices, contracts..."
              className="w-full pl-9 pr-16 py-2 bg-slate-50 dark:bg-[#18191d] border border-slate-200 dark:border-[#2a2c35] rounded-2xl text-xs text-slate-800 dark:text-[#ededee] placeholder-slate-400 dark:placeholder-[#666a79] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[#121316] transition-all shadow-2xs"
            />

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Clear (X) Button */}
              {globalSearchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 text-slate-400 dark:text-[#666a79] hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-[#252730] transition-colors"
                  title="Clear search"
                  aria-label="Clear search input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Voice Search Button */}
              <button
                type="button"
                onClick={() => setIsVoiceSearchOpen(true)}
                title="Start voice search"
                aria-label="Start voice search"
                className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Empty Search Toast Alert */}
          {searchErrorToast && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg z-50 animate-in fade-in slide-in-from-top-1 flex items-center justify-between">
              <span>{searchErrorToast}</span>
              <button onClick={() => setSearchErrorToast(null)} className="text-white/80 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Real-time Search Suggestions Dropdown */}
          {isSearchFocused && globalSearchQuery.trim().length > 0 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-[#16171b] border border-slate-200 dark:border-[#2a2c35] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-2 border-b border-slate-100 dark:border-[#22242a] bg-slate-50/80 dark:bg-[#121316] flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#707482] px-3">
                <span>Matching Documents ({matchingSuggestions.length})</span>
                <span>Press Enter to View All</span>
              </div>

              {matchingSuggestions.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-[#22242a] max-h-64 overflow-y-auto">
                  {matchingSuggestions.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectSuggestion(doc.title, doc)}
                      className="w-full text-left p-3 hover:bg-blue-50/60 dark:hover:bg-[#1f2128] transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${
                          doc.fileType === 'PDF' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' :
                          doc.fileType === 'DOCX' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' :
                          'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {doc.fileType}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 dark:text-[#ededee] group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                            {doc.title}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-[#888c9b] truncate">
                            {doc.source} • {doc.category} • {doc.sizeFormatted}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        View
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                  No documents matching "<span className="font-bold text-slate-800 dark:text-slate-200">{globalSearchQuery}</span>"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {user ? (
          <>
            {/* AI Chat Button */}
            <button
              type="button"
              onClick={() => setIsAIChatOpen(true)}
              className="p-1.5 md:px-3 md:py-1.5 rounded-xl bg-blue-50 dark:bg-[#1a1c24] hover:bg-blue-100 dark:hover:bg-[#222530] border border-blue-100 dark:border-[#2a2c35] text-blue-700 dark:text-blue-400 text-xs font-bold transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 bg-indigo-600 ring-1 ring-blue-400/30 flex items-center justify-center">
                <img
                  src={aiAvatarImg}
                  alt="Structra AI Avatar"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/structra-ai-avatar.jpg';
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="hidden md:inline">AI Assistant</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  const nextState = !isNotifOpen;
                  setIsNotifOpen(nextState);
                  if (nextState) setIsUserMenuOpen(false);
                }}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1c22] rounded-xl relative transition-colors"
                aria-label={unreadNotifCount > 0 ? `${unreadNotifCount} unread notifications` : "Notifications"}
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#121316]">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              <NotificationDropdown 
                isOpen={isNotifOpen} 
                onClose={() => setIsNotifOpen(false)} 
              />
            </div>

            {/* User Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  const nextState = !isUserMenuOpen;
                  setIsUserMenuOpen(nextState);
                  if (nextState) setIsNotifOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-[#1a1c22] rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                aria-label="User profile menu"
                aria-expanded={isUserMenuOpen}
              >
                <UserAvatar 
                  name={user?.name || user?.email || 'User'} 
                  avatar={user?.avatar} 
                  className="w-7 h-7 text-[10px] ring-2 ring-blue-500/20" 
                />
                <span className="hidden lg:inline text-xs font-bold text-slate-800 dark:text-slate-200">
                  {(user?.name || user?.email || 'User').split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hidden lg:inline" />
              </button>

              {isUserMenuOpen && (
                <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-64 max-w-sm bg-white dark:bg-[#16171b] border border-slate-200/90 dark:border-[#2a2c35] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-[#22242a]">
                    <div className="flex items-center gap-3">
                      <UserAvatar 
                        name={user?.name || user?.email || 'User'} 
                        avatar={user?.avatar} 
                        className="w-9 h-9 text-xs ring-2 ring-blue-500/20 shrink-0" 
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] truncate">
                          {user?.name || user?.email || 'User'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#888c9b] truncate">{user?.email || ''}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-100/80 dark:border-blue-900/60">
                          {user?.accountType || 'individual'} Account
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    {(() => {
                      const userEmail = (user?.email || '').toLowerCase().trim();
                      const isRevoked = userEmail === 'onammanwosu19@gmail.com' || userEmail === 'onammannwosu19@gmail.com';
                      const isUserAdmin = !isRevoked && (user?.role === 'admin' || [
                        'anelurhoda@gmail.com',
                        'meklitseife86@gmail.com',
                        'aidoranow2026@gmail.com',
                        'admin@structra.com',
                      ].includes(userEmail));
                      return isUserAdmin ? (
                        <button
                          onClick={() => { setCurrentPage('admin'); setIsUserMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[#1f2128] flex items-center gap-2.5 transition-colors"
                        >
                          <Shield className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                          Admin Portal
                        </button>
                      ) : null;
                    })()}
                    <button
                      onClick={() => { setCurrentPage('profile'); setIsUserMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1f2128] hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      Profile & Settings
                    </button>
                    <button
                      onClick={() => { openOnboarding(); setIsUserMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1f2128] hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      Product Tour
                    </button>
                  </div>

                  <div className="border-t border-slate-100 dark:border-[#22242a] pt-1 mt-1">
                    <button
                      onClick={() => { logout(); setIsUserMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 font-bold transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage('login')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1c22] rounded-xl transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => setCurrentPage('signup')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    </header>
  );
};


