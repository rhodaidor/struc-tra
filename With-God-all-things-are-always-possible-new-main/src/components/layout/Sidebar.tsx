import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, FileText, UploadCloud, Layers, Star, 
  Settings, Trash2, Shield, HardDrive, X,
  Building2, User, ChevronsUpDown, Check, Plus, LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StructraLogo } from '../common/StructraLogo';

const WorkspaceSwitcher: React.FC = () => {
  const { user } = useApp();
  const userNameFirst = user?.name ? user.name.split(' ')[0] : 'Rhoda';
  const personalName = `${userNameFirst}'s Workspace`;

  return (
    <div className="relative mb-3 px-0.5">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#6B7280] dark:text-[#7d8292] mb-1.5 px-2">
        WORKSPACE
      </p>
      <div className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-100/90 dark:bg-[#18191e] border border-slate-200/90 dark:border-[#262832] transition-all text-left">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-900 dark:text-[#ededee] truncate leading-tight">
              {personalName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-[#888c9b] font-extrabold truncate mt-0.5">
              Personal Workspace
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { 
    user,
    currentPage, 
    setCurrentPage, 
    documents, 
    setActiveCollectionFilter,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    logout
  } = useApp();

  const sidebarRef = useRef<HTMLElement>(null);

  // Auto-reset sidebar scroll to absolute top when navigating pages
  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  // Lock background webpage scrolling when mobile sidebar is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isMobileMenuOpen]);

  const userEmail = (user?.email || '').toLowerCase().trim();
  const isRevoked = userEmail === 'onammanwosu19@gmail.com' || userEmail === 'onammannwosu19@gmail.com';
  const isAdmin = !isRevoked && (user?.role === 'admin' || [
    'anelurhoda@gmail.com',
    'meklitseife86@gmail.com',
    'aidoranow2026@gmail.com',
    'admin@structra.com',
  ].includes(userEmail));

  // Exact navigation hierarchy required by Structra specification (Search removed)
  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload Center', icon: UploadCloud },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'integrations', label: 'Integrations', icon: Layers },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'profile', label: 'Profile & Settings', icon: Settings },
    { id: 'trash', label: 'Trash', icon: Trash2 },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Portal', icon: Shield }] : []),
  ];

  // Calculate storage dynamically from uploaded non-trashed documents
  const totalBytes = documents
    .filter(d => !d.isTrash)
    .reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

  const maxGB = 10;
  const usedGBNum = totalBytes / (1024 * 1024 * 1024);
  const usedGBFormatted = usedGBNum < 0.1 ? (usedGBNum === 0 ? '0.0' : usedGBNum.toFixed(2)) : usedGBNum.toFixed(1);
  const percentUsed = Math.min(100, Math.max(0, (totalBytes / (10 * 1024 * 1024 * 1024)) * 100)).toFixed(1);

  const handleNavClick = (id: string) => {
    setCurrentPage(id);
    if (id === 'documents') {
      setActiveCollectionFilter(null);
    }
    setIsMobileMenuOpen(false);
  };

  const handleManageStorage = () => {
    setCurrentPage('profile');
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      const storageEl = document.getElementById('storage-section');
      if (storageEl) {
        storageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <>
      {/* DESKTOP & TABLET SIDEBAR (768px+) */}
      <aside ref={sidebarRef} className="hidden md:flex flex-col justify-between w-[240px] lg:w-[250px] bg-white dark:bg-[#121316] border-r border-[#E5E7EB] dark:border-[#22242a] h-[calc(100vh-4rem)] sticky top-16 pt-2 md:pt-2.5 lg:pt-5 md:pb-6 lg:pb-8 px-3.5 overflow-y-auto shrink-0 transition-all duration-200 z-20">
        <div className="space-y-3">
          {/* Workspace Switcher */}
          <WorkspaceSwitcher />

          {/* Section Heading */}
          <div className="px-2 mb-1.5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#6B7280] dark:text-[#7d8292]">
              MAIN MENU
            </p>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                      : 'text-[#475569] dark:text-[#9da1b0] hover:text-[#0F172A] dark:hover:text-[#f3f4f6] hover:bg-slate-100 dark:hover:bg-[#1c1e24]'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-[#6B7280] dark:text-[#7d8292] group-hover:text-[#0F172A] dark:group-hover:text-[#f3f4f6]'}`} />
                  <span className="truncate tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Storage Card Section */}
        <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#22242a] mt-4">
          <div className="p-3.5 bg-slate-50 dark:bg-[#18191e] border border-[#E5E7EB] dark:border-[#262832] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#111827] dark:text-[#ededee]">
              <span className="flex items-center gap-1.5 font-extrabold text-xs text-blue-600 dark:text-blue-400">
                <HardDrive className="w-4 h-4" />
                Storage Used
              </span>
            </div>

            <div className="text-xs font-black text-[#111827] dark:text-[#ededee]">
              {usedGBFormatted} GB / {maxGB} GB
            </div>

            <div className="w-full bg-slate-200 dark:bg-[#282a36] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(usedGBNum > 0 ? 2 : 0, Number(percentUsed))}%` }}
              ></div>
            </div>

            <div className="pt-1">
              <button 
                onClick={handleManageStorage}
                className="w-full py-2 bg-white dark:bg-[#121316] hover:bg-slate-100 dark:hover:bg-[#1f2128] border border-[#E5E7EB] dark:border-[#262832] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Manage Storage
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE SLIDE-IN NAVIGATION DRAWER (<768px) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 overflow-hidden">
          {/* Semi-transparent backdrop overlay - locks page scroll */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Mobile Drawer Container */}
          <div className="fixed inset-y-0 left-0 w-[290px] max-w-[85vw] bg-white dark:bg-[#121316] text-slate-900 dark:text-[#ededee] shadow-2xl flex flex-col justify-between p-5 z-50 animate-in slide-in-from-left duration-250 border-r border-[#E5E7EB] dark:border-[#22242a] overflow-y-auto max-h-screen">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#22242a]">
                <StructraLogo
                  size="md"
                  onClick={() => handleNavClick('dashboard')}
                />

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1c22] rounded-xl transition-colors border border-slate-200 dark:border-[#262832] cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Workspace Switcher */}
              <WorkspaceSwitcher />

              {/* Drawer Navigation List */}
              <div className="space-y-1.5">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#6B7280] dark:text-[#7d8292] mb-3">
                  MAIN MENU
                </p>
                {mainNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-extrabold'
                          : 'text-slate-700 dark:text-[#9da1b0] hover:text-slate-900 dark:hover:text-[#f3f4f6] hover:bg-slate-100 dark:hover:bg-[#1c1e24]'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-[#7d8292]'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Storage Card at Bottom of Drawer */}
            <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#22242a] mt-6 shrink-0">
              <div className="p-4 bg-slate-50 dark:bg-[#18191e] border border-[#E5E7EB] dark:border-[#262832] rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-[#ededee]">
                  <span className="flex items-center gap-2 text-[10px] font-extrabold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                    <HardDrive className="w-3.5 h-3.5" />
                    Storage Used
                  </span>
                </div>

                <div className="text-xs font-black text-slate-900 dark:text-[#ededee]">
                  {usedGBFormatted} GB / {maxGB} GB
                </div>

                <div className="w-full bg-slate-200 dark:bg-[#282a36] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(usedGBNum > 0 ? 2 : 0, Number(percentUsed))}%` }}
                  ></div>
                </div>

                <div className="pt-1 flex flex-col gap-2">
                  <button 
                    onClick={handleManageStorage}
                    className="w-full py-2 bg-white dark:bg-[#121316] hover:bg-slate-100 dark:hover:bg-[#1f2128] border border-slate-200 dark:border-[#262832] text-blue-600 dark:text-blue-400 hover:text-blue-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Manage Storage
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
