import React from 'react';
import { LayoutDashboard, Search, UploadCloud, FileText, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { currentPage, setCurrentPage, setIsMobileMenuOpen, setIsVoiceSearchOpen } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'upload', label: 'Upload', icon: UploadCloud },
    { id: 'documents', label: 'Docs', icon: FileText },
    { id: 'more', label: 'More', icon: Menu },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'more') {
      setIsMobileMenuOpen(true);
    } else if (id === 'search') {
      setIsVoiceSearchOpen(true);
    } else {
      setCurrentPage(id);
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121316]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-[#22242a] px-2 py-1.5 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = 
          (item.id === 'dashboard' && currentPage === 'dashboard') ||
          (item.id === 'upload' && currentPage === 'upload') ||
          (item.id === 'documents' && currentPage === 'documents');

        return (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-500 dark:text-[#888c9b] hover:text-slate-800 dark:hover:text-[#ededee] font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
