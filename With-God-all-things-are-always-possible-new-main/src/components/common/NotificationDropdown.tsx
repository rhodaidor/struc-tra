import React, { useEffect, useRef, useState } from 'react';
import { 
  Bell, CheckCheck, X, FileText, UploadCloud, 
  Layers, HardDrive, Sparkles, Inbox 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';
import { formatRelativeTime } from '../../utils/dateUtils';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    setCurrentPage 
  } = useApp();

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [, setTimeTick] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Live dynamic recalculation of relative timestamps every 15 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Handle outside click & Keyboard navigation (Escape, ArrowUp, ArrowDown)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex(prev => {
          const next = prev < notifications.length - 1 ? prev + 1 : 0;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(prev => {
          const next = prev > 0 ? prev - 1 : notifications.length - 1;
          itemRefs.current[next]?.focus();
          return next;
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, notifications.length, onClose]);

  if (!isOpen) return null;

  const handleNotificationClick = (n: NotificationItem) => {
    markNotificationAsRead(n.id);
    if (n.targetPage) {
      setCurrentPage(n.targetPage);
    }
    onClose();
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'upload':
        return <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
      case 'integration':
        return <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'system':
        return <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />;
    }
  };

  return (
    <div 
      ref={containerRef}
      role="dialog"
      aria-label="Notifications Panel"
      className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 sm:max-w-sm bg-white dark:bg-[#16171b] border border-slate-200/90 dark:border-[#262832] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] sm:max-h-none flex flex-col"
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-[#22242a] bg-white dark:bg-[#16171b] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#ededee]">Notifications</h3>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-extrabold text-[10px] border border-indigo-100/80 dark:border-indigo-900/60">
            Unread: {unreadCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg px-1.5 py-0.5"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 text-slate-400 dark:text-[#888c9b] hover:text-slate-600 dark:hover:text-[#ededee] rounded-lg hover:bg-slate-100 dark:hover:bg-[#20222a] transition-colors"
            aria-label="Close notifications panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#22242a] max-h-[60vh] sm:max-h-96">
        {notifications.length > 0 ? (
          notifications.map((n, idx) => (
            <button
              key={n.id}
              ref={el => { itemRefs.current[idx] = el; }}
              onClick={() => handleNotificationClick(n)}
              onFocus={() => setActiveIndex(idx)}
              className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 relative group focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                n.unread 
                  ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-l-4 border-indigo-600 dark:border-indigo-500 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30' 
                  : 'bg-white dark:bg-[#16171b] border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-[#1c1e24]'
              }`}
            >
              <div className="pt-0.5 shrink-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  n.unread ? 'bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-[#20222a] text-slate-500 dark:text-[#888c9b]'
                }`}>
                  {getNotificationIcon(n.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {n.unread && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" aria-hidden="true" />
                    )}
                    <p className={`text-xs truncate ${n.unread ? 'font-extrabold text-slate-900 dark:text-[#ededee]' : 'font-semibold text-slate-800 dark:text-[#d0d3de]'}`}>
                      {n.title}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-[#6b7082] shrink-0 font-medium">
                    {formatRelativeTime(n.createdAt || n.time)}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-[#888c9b] mt-1 line-clamp-2 leading-relaxed font-normal">
                  {n.desc}
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    n.unread ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-[#20222a] text-slate-500 dark:text-[#888c9b]'
                  }`}>
                    {n.unread ? 'Unread' : 'Read'}
                  </span>

                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    View &rarr;
                  </span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-[#ededee]">No notifications yet.</p>
              <p className="text-[11px] text-slate-400 dark:text-[#888c9b] mt-1">We'll alert you when documents are processed or integrations sync.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
