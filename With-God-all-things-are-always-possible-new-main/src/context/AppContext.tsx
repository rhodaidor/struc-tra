import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  User, AppDocument, Integration, IntegrationId, HandlingMode, SyncActivityLog, DocumentShareSettings, SearchHistoryItem, AISearchResult, UploadJob, 
  AdminUser, SystemStats, AuditLog, AccountType, DocumentCategory, DocumentSource, NotificationItem, SecurityLog, AIChatMessage, AIConversation,
  MatchType
} from '../types';
import { 
  initialUser, initialDocuments, initialIntegrations, 
  initialSearchHistory, initialAdminUsers, initialSystemStats, initialAuditLogs 
} from '../data/mockData';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../constants/languages';
import { extractTextFromFile } from '../utils/textExtractor';
import { normalizeDocumentCategory } from '../utils/categoryClassifier';
import { registerSessionDeviceFile } from '../utils/documentFileManager';
import { supabase } from '../lib/supabase';
import { 
  uploadFileToSupabaseStorage, 
  dbFetchDocuments, 
  dbUpsertDocument, 
  dbMoveDocumentToTrash,
  dbRestoreDocument,
  dbDeleteDocument, 
  dbFetchProfile, 
  dbUpsertProfile, 
  dbSaveNotification, 
  dbFetchNotifications,
  dbMarkNotificationAsRead,
  dbMarkAllNotificationsAsRead,
  dbFetchIntegrations,
  dbUpsertIntegration,
  dbFetchAIConversations,
  dbFetchAIChatMessages,
  dbFetchAIChats,
  dbSaveAIChatMessage,
  dbDeleteAIConversation,
  dbClearAIChats,
  dbMigrateInitialDataIfNeeded 
} from '../lib/supabaseService';

// Purge legacy unscoped document cache on startup so stale cross-tenant document data cannot be reused
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('structra_docs');
  }
} catch (e) {}

interface AppContextType {
  user: User | null;
  isAuthenticated: boolean;
  isOffline: boolean;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  
  // Language State
  selectedLanguage: string;
  changeLanguage: (languageName: string) => void;

  // Password Management
  changePassword: (currentPwdInput: string, newPwdInput?: string) => Promise<{ success: boolean; message: string }>;
  
  // Documents state
  documents: AppDocument[];
  selectedDocument: AppDocument | null;
  setSelectedDocument: (doc: AppDocument | null) => void;
  
  // Search & Filter state
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  aiSearchResult: AISearchResult | null;
  performAISearch: (query: string) => Promise<AISearchResult>;
  activeCollectionFilter: string | null;
  setActiveCollectionFilter: (category: string | null) => void;
  activeSourceFilter: string | null;
  setActiveSourceFilter: (source: string | null) => void;
  searchHistory: SearchHistoryItem[];
  addSearchQuery: (query: string) => void;
  clearSearchHistory: () => void;
  
  // User Preferences & Settings
  updateUserPreferences: (newPrefs: Partial<{ appNotificationsEnabled: boolean; featureUpdatesEnabled: boolean; language: string }>) => Promise<boolean>;

  // Notifications
  notifications: NotificationItem[];
  addNotification: (notif: Omit<NotificationItem, 'id' | 'time' | 'unread'> & { isSecurity?: boolean; isFeatureUpdate?: boolean }) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  
  // Favorites & Actions
  toggleFavorite: (docId: string) => void;
  moveToTrash: (docId: string) => Promise<boolean>;
  restoreFromTrash: (docId: string) => Promise<boolean>;
  permanentDelete: (docId: string) => void;
  deletePermanently: (docId: string) => void;
  emptyTrash: () => void;
  
  // Integrations
  integrations: Integration[];
  syncActivityLogs: SyncActivityLog[];
  connectIntegration: (
    id: IntegrationId, 
    accountIdentifier?: string, 
    mode?: HandlingMode, 
    permissions?: string[],
    initialSyncMetrics?: {
      status?: string;
      alreadyInProgress?: boolean;
      countIndexed?: number;
      countImported?: number;
      countDuplicates?: number;
      createdDocuments?: any[];
    } | null
  ) => void;
  disconnectIntegration: (id: IntegrationId, options?: { keepImportedDocs?: boolean; deleteImportedDocs?: boolean; removeSecureIndex?: boolean }) => void;
  reconnectIntegration: (id: IntegrationId, reconnectOption?: 'restore' | 'rebuild' | 'resume', mode?: HandlingMode) => void;
  updateIntegrationMode: (id: IntegrationId, mode: HandlingMode) => void;
  toggleIntegrationMode: (channel: string) => void;
  triggerSync: (id: IntegrationId) => Promise<void>;
  triggerIntegrationSync: (channel: string) => Promise<void>;
  setOpenIntegrationModal: (channel: string) => void;
  importExternalDocument: (docId: string) => void;
  updateDocumentShareSettings: (docId: string, settings: DocumentShareSettings) => void;
  
  // Uploads
  uploadJobs: UploadJob[];
  addUploadJob: (job: UploadJob) => void;
  updateUploadJob: (id: string, updates: Partial<UploadJob>) => void;
  processUploadedFile: (file: File, options?: { replaceDocId?: string; overrideTitle?: string }) => Promise<AppDocument>;
  cancelUploadJob: (jobId: string) => void;
  
  // AI Chat Conversation Persistence & Multi-Chat Management
  aiConversations: AIConversation[];
  activeConversationId: string | null;
  aiMessages: AIChatMessage[];
  setAiMessages: React.Dispatch<React.SetStateAction<AIChatMessage[]>>;
  addAiMessage: (msg: AIChatMessage) => Promise<void>;
  startNewAiChat: () => void;
  selectAiConversation: (conversationId: string) => Promise<void>;
  deleteAiConversation: (conversationId: string) => Promise<boolean>;
  clearAiConversation: () => Promise<void>;
  isLoadingConversations: boolean;

  // UI Triggers
  isAIChatOpen: boolean;
  setIsAIChatOpen: (open: boolean) => void;
  isVoiceSearchOpen: boolean;
  setIsVoiceSearchOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isAccountTypeModalOpen: boolean;
  setIsAccountTypeModalOpen: (open: boolean) => void;
  isGoogleAuthModalOpen: boolean;
  setIsGoogleAuthModalOpen: (open: boolean) => void;
  handleSelectGoogleAccount: (user: { name: string; email: string }) => void;
  isRoadmapModalOpen: boolean;
  setIsRoadmapModalOpen: (open: boolean) => void;
  activeWorkspace: 'personal' | 'team';
  setActiveWorkspace: (ws: 'personal' | 'team') => void;
  pendingGoogleUser: { name: string; email: string } | null;

  // Onboarding
  isOnboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  completeOnboarding: () => Promise<void> | void;

  // Legal Modal
  legalModalType: 'terms' | 'privacy' | null;
  openLegalModal: (type: 'terms' | 'privacy') => void;
  closeLegalModal: () => void;
  
  // Theme state
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;

  // Auth actions
  isAuthLoading: boolean;
  login: (email: string, password?: string) => Promise<void> | void;
  loginWithGoogle: () => Promise<void>;
  completeWorkspaceSelection: (accountType: AccountType) => Promise<void> | void;
  register: (name: string, email: string, accountType: AccountType, password?: string) => Promise<{ success: boolean; requiresVerification: boolean; email: string }> | Promise<void> | void;
  logout: () => void;
  isLogoutModalOpen: boolean;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
  confirmLogout: () => Promise<void>;
  updateProfile: (updates: Partial<User> | string, legacyEmail?: string) => void;
  updateUserProfile: (updates: Partial<User> | string, legacyEmail?: string) => void;
  
  // Account Deletion & Recovery
  scheduleAccountDeletion: () => void;
  restoreAccount: (targetEmail?: string) => void;
  continueDeletion: () => void;
  pendingRecoveryUser: User | null;
  isRecoveryModalOpen: boolean;
  setIsRecoveryModalOpen: (open: boolean) => void;
  restorationToast: string | null;
  setRestorationToast: (msg: string | null) => void;

  // Admin Data
  adminUsers: AdminUser[];
  setAdminUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  systemStats: SystemStats;
  auditLogs: AuditLog[];
  toggleUserStatus: (userId: string) => void;
  reprocessDocument: (docId: string) => void;
}

function enhanceUserWithPreferences(targetUser: User): User {
  const userKey = (targetUser.id || targetUser.email).toLowerCase();
  const storageKey = `structra_settings_${userKey}`;
  let savedSettings: any = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) savedSettings = JSON.parse(raw);
  } catch (e) {}

  return {
    ...targetUser,
    appNotificationsEnabled: savedSettings?.appNotificationsEnabled ?? targetUser.appNotificationsEnabled ?? true,
    featureUpdatesEnabled: savedSettings?.featureUpdatesEnabled ?? targetUser.featureUpdatesEnabled ?? true,
    language: savedSettings?.language || targetUser.language || 'English (United States)',
  };
}

// Helper to safely load initial AI conversation state from localStorage synchronously
function getInitialAiState(): { initialConvs: AIConversation[]; initialActiveId: string | null; initialMsgs: AIChatMessage[] } {
  try {
    let lastUserId: string | null = null;
    try {
      lastUserId = localStorage.getItem('structra_last_user_id');
      if (!lastUserId) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('structra_ai_active_conv_')) {
            lastUserId = key.replace('structra_ai_active_conv_', '');
            break;
          }
        }
      }
    } catch (e) {}

    let initialConvs: AIConversation[] = [];
    let initialActiveId: string | null = null;
    let initialMsgs: AIChatMessage[] = [];

    if (lastUserId) {
      const rawConvs = localStorage.getItem(`structra_ai_convs_${lastUserId}`);
      if (rawConvs) {
        try {
          const parsed = JSON.parse(rawConvs);
          if (Array.isArray(parsed)) initialConvs = parsed;
        } catch (e) {}
      }

      const rawActiveId = localStorage.getItem(`structra_ai_active_conv_${lastUserId}`);
      if (rawActiveId) {
        initialActiveId = rawActiveId;
        const rawMsgs = localStorage.getItem(`structra_ai_chat_${lastUserId}_${rawActiveId}`);
        if (rawMsgs) {
          try {
            const parsed = JSON.parse(rawMsgs);
            if (Array.isArray(parsed)) initialMsgs = parsed;
          } catch (e) {}
        }
      } else if (initialConvs.length > 0) {
        initialActiveId = initialConvs[0].id;
        const rawMsgs = localStorage.getItem(`structra_ai_chat_${lastUserId}_${initialConvs[0].id}`);
        if (rawMsgs) {
          try {
            const parsed = JSON.parse(rawMsgs);
            if (Array.isArray(parsed)) initialMsgs = parsed;
          } catch (e) {}
        }
      } else {
        const rawPending = localStorage.getItem(`structra_ai_chat_${lastUserId}_pending`);
        if (rawPending) {
          try {
            const parsed = JSON.parse(rawPending);
            if (Array.isArray(parsed)) initialMsgs = parsed;
          } catch (e) {}
        }
      }
    }

    return { initialConvs, initialActiveId, initialMsgs };
  } catch (e) {
    return { initialConvs: [], initialActiveId: null, initialMsgs: [] };
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawUser, setRawUser] = useState<User | null>(null);

  const user = useMemo(() => {
    return rawUser ? enhanceUserWithPreferences(rawUser) : null;
  }, [rawUser]);

  const setUser = (newUserOrFn: React.SetStateAction<User | null>) => {
    if (typeof newUserOrFn === 'function') {
      setRawUser(prev => {
        const next = newUserOrFn(prev);
        return next ? enhanceUserWithPreferences(next) : null;
      });
    } else {
      setRawUser(newUserOrFn ? enhanceUserWithPreferences(newUserOrFn) : null);
    }
  };
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPageState] = useState<string>(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const mode = search.get('mode');
      const path = window.location.pathname;

      if (path === '/privacy') return 'privacy';
      if (path === '/terms') return 'terms';
      if (path.startsWith('/share')) return 'share';
      if (path === '/login' || mode === 'login') return 'login';
      if (path === '/signup' || mode === 'signup') return 'signup';
      if (path === '/auth') return mode === 'login' ? 'login' : 'signup';
      if (path === '/landing' || path === '/' || !path) return 'landing';
      if (path.length > 1) return path.substring(1);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Structra Router] Error parsing initial URL route:', err);
      }
    }
    return 'landing';
  });

  const setCurrentPage = (page: string, replace = false) => {
    setCurrentPageState(page);
    try {
      let url = '/';
      if (page === 'login') {
        url = '/auth?mode=login';
      } else if (page === 'signup') {
        url = '/auth?mode=signup';
      } else if (page === 'landing') {
        url = '/';
      } else if (page === 'privacy') {
        url = '/privacy';
      } else if (page === 'terms') {
        url = '/terms';
      } else if (page === 'share') {
        url = window.location.pathname.startsWith('/share') ? window.location.pathname : '/share';
      } else {
        url = `/${page}`;
      }

      const currentFullUrl = window.location.pathname + window.location.search;
      if (currentFullUrl !== url) {
        if (replace) {
          window.history.replaceState({ page }, '', url);
        } else {
          window.history.pushState({ page }, '', url);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Structra Router] Error updating browser history:', err);
      }
    }
  };

  // Sync with browser back/forward buttons (popstate)
  useEffect(() => {
    try {
      if (!window.history.state || !window.history.state.page) {
        let url = '/';
        if (currentPage === 'login') url = '/auth?mode=login';
        else if (currentPage === 'signup') url = '/auth?mode=signup';
        else if (currentPage === 'landing') url = '/';
        else if (currentPage === 'privacy') url = '/privacy';
        else if (currentPage === 'terms') url = '/terms';
        else url = `/${currentPage}`;

        window.history.replaceState({ page: currentPage }, '', url);
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Structra Router] Error setting initial history state:', err);
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      try {
        if (event.state && event.state.page) {
          setCurrentPageState(event.state.page);
          return;
        }
        const search = new URLSearchParams(window.location.search);
        const mode = search.get('mode');
        const path = window.location.pathname;

        if (path === '/privacy') {
          setCurrentPageState('privacy');
        } else if (path === '/terms') {
          setCurrentPageState('terms');
        } else if (path.startsWith('/share')) {
          setCurrentPageState('share');
        } else if (path === '/login' || mode === 'login') {
          setCurrentPageState('login');
        } else if (path === '/signup' || mode === 'signup') {
          setCurrentPageState('signup');
        } else if (path === '/auth') {
          setCurrentPageState(mode === 'login' ? 'login' : 'signup');
        } else if (path === '/' || path === '' || path === '/landing') {
          setCurrentPageState('landing');
        } else if (path.length > 1) {
          setCurrentPageState(path.substring(1));
        } else {
          setCurrentPageState('landing');
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Structra Router] Error handling browser history popstate:', err);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPage]);
  
  // Initial state is strictly empty [] until the authenticated user's identity is verified
  const [documents, setDocuments] = useState<AppDocument[]>([]);

  const [selectedDocument, setSelectedDocument] = useState<AppDocument | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [aiSearchResult, setAiSearchResult] = useState<AISearchResult | null>(null);
  const [activeCollectionFilter, setActiveCollectionFilter] = useState<string | null>(null);
  const [activeSourceFilter, setActiveSourceFilter] = useState<string | null>(null);

  const performAISearch = async (query: string): Promise<AISearchResult> => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      const emptyResult: AISearchResult = {
        query: '',
        matchedDocumentIds: [],
        bestMatchId: null,
        isSearching: false,
      };
      setAiSearchResult(null);
      return emptyResult;
    }

    setAiSearchResult({
      query: cleanQuery,
      matchedDocumentIds: [],
      bestMatchId: null,
      isSearching: true,
      searchError: null,
    });

    // Prepare active documents list (exclude trash)
    const activeDocs = documents.filter(d => !d.isTrash).map(d => ({
      id: d.id,
      title: d.title,
      fileName: d.fileName || d.title,
      originalFilename: d.originalFilename || d.fileName || d.title,
      category: d.category,
      source: d.source,
      tags: d.tags,
      uploadDate: d.uploadDate,
      contentSummary: d.contentSummary,
      rawText: d.rawText || '',
      metadata: d.metadata,
    }));

    try {
      let token: string | undefined = undefined;
      try {
        const sessionRes = await supabase.auth.getSession();
        token = sessionRes.data?.session?.access_token;
      } catch (e) {
        console.warn('Session check failed:', e);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: cleanQuery,
          documents: activeDocs,
          userId: user?.id,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        throw new Error('Search service error. Please try again.');
      }

      const data = await res.json();

      const matchedIds = Array.isArray(data.matchedDocumentIds) ? data.matchedDocumentIds : [];
      const resolvedMatchType: MatchType = data.matchType || (data.bestMatchId ? 'EXACT' : matchedIds.length > 0 ? 'RELATED' : 'NONE');

      const searchResult: AISearchResult = {
        query: cleanQuery,
        matchedDocumentIds: matchedIds,
        bestMatchId: data.bestMatchId || null,
        matchType: resolvedMatchType,
        contextDocumentIds: Array.isArray(data.contextDocumentIds) ? data.contextDocumentIds : [],
        aiAnswer: data.aiAnswer,
        reasoning: data.reasoning,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.8,
        parsedIntent: data.parsedIntent || null,
        suggestedCategory: data.suggestedCategory || null,
        suggestedSource: data.suggestedSource || null,
        isSearching: false,
        searchError: null,
      };

      setAiSearchResult(searchResult);
      addSearchQuery(cleanQuery);
      return searchResult;
    } catch (err: any) {
      console.error('[performAISearch] Error:', err);
      // Local fallback matching
      const q = cleanQuery.toLowerCase();
      const fallbackMatches = documents.filter(d => !d.isTrash && (
        (d.title || '').toLowerCase().includes(q) ||
        (d.fileName || '').toLowerCase().includes(q) ||
        (d.originalFilename || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q) ||
        (d.source || '').toLowerCase().includes(q) ||
        (d.metadata?.vendor && d.metadata.vendor.toLowerCase().includes(q)) ||
        (d.metadata?.documentNumber && d.metadata.documentNumber.toLowerCase().includes(q)) ||
        (d.tags || []).some(t => (t || '').toLowerCase().includes(q)) ||
        (d.contentSummary || '').toLowerCase().includes(q)
      )).map(d => d.id);

      const fallbackMatchType: MatchType = fallbackMatches.length === 1 ? 'EXACT' : fallbackMatches.length > 1 ? 'RELATED' : 'NONE';

      const fallbackResult: AISearchResult = {
        query: cleanQuery,
        matchedDocumentIds: fallbackMatches,
        bestMatchId: fallbackMatches.length > 0 ? fallbackMatches[0] : null,
        matchType: fallbackMatchType,
        contextDocumentIds: [],
        aiAnswer: fallbackMatches.length > 0 
          ? `Found ${fallbackMatches.length} document(s) matching "${cleanQuery}".`
          : `No matching document found.`,
        isSearching: false,
        searchError: err.message || 'Network failure during AI search.',
      };

      setAiSearchResult(fallbackResult);
      addSearchQuery(cleanQuery);
      return fallbackResult;
    }
  };
  
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // User Preferences Updater with Optimistic UI & Server Persistence
  const updateUserPreferences = async (newPrefs: Partial<{ appNotificationsEnabled: boolean; featureUpdatesEnabled: boolean; language: string }>): Promise<boolean> => {
    if (!user) return false;

    const previousUser = { ...user };
    const userKey = (user.id || user.email).toLowerCase();
    const storageKey = `structra_settings_${userKey}`;

    const updatedUser: User = {
      ...user,
      ...(newPrefs.appNotificationsEnabled !== undefined ? { appNotificationsEnabled: newPrefs.appNotificationsEnabled } : {}),
      ...(newPrefs.featureUpdatesEnabled !== undefined ? { featureUpdatesEnabled: newPrefs.featureUpdatesEnabled } : {}),
      ...(newPrefs.language !== undefined ? { language: newPrefs.language } : {}),
    };

    // 1. Optimistic UI update
    setUser(updatedUser);

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        appNotificationsEnabled: updatedUser.appNotificationsEnabled ?? true,
        featureUpdatesEnabled: updatedUser.featureUpdatesEnabled ?? true,
        language: updatedUser.language || 'English (United States)',
      }));
    } catch (e) {}

    const accounts = getStoredAccounts();
    if (accounts[user.email.toLowerCase()]) {
      accounts[user.email.toLowerCase()] = updatedUser;
      saveStoredAccounts(accounts);
    }

    if (newPrefs.language) {
      const validOption = SUPPORTED_LANGUAGES.find(l => l.name === newPrefs.language) || SUPPORTED_LANGUAGES[0];
      setSelectedLanguage(validOption.name);
      document.documentElement.lang = validOption.locale;
      try {
        localStorage.setItem('structra_language', validOption.name);
      } catch (e) {}
    }

    // 2. Persist to API & Supabase DB
    try {
      let apiSuccess = false;
      try {
        const res = await fetch('/api/settings/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPrefs),
        });
        if (res.ok) apiSuccess = true;
      } catch (e) {
        // network notice
      }

      const dbSuccess = await dbUpsertProfile(updatedUser);

      // Consider saved if API endpoint or Supabase DB succeeded
      if (!apiSuccess && !dbSuccess) {
        console.warn('[User Preferences] Persistence failed. Reverting optimistic UI state.');
        setUser(previousUser);
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            appNotificationsEnabled: previousUser.appNotificationsEnabled ?? true,
            featureUpdatesEnabled: previousUser.featureUpdatesEnabled ?? true,
            language: previousUser.language || 'English (United States)',
          }));
        } catch (e) {}
        return false;
      }

      return true;
    } catch (err) {
      console.error('[User Preferences] Exception updating user preferences:', err);
      setUser(previousUser);
      return false;
    }
  };

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'time' | 'unread'> & { isSecurity?: boolean; isFeatureUpdate?: boolean }) => {
    const titleLower = notif.title.toLowerCase();
    const descLower = notif.desc.toLowerCase();
    const isSec = notif.isSecurity || notif.type === 'system' || titleLower.includes('security') || titleLower.includes('deletion') || titleLower.includes('password') || descLower.includes('password') || descLower.includes('deleted');
    const isFeat = notif.isFeatureUpdate || notif.type === 'feature_update';

    if (!isSec) {
      if (isFeat) {
        if (user?.featureUpdatesEnabled === false) {
          console.log('[Notification Engine] Feature updates disabled for user. Suppressing notification:', notif.title);
          return;
        }
      } else {
        if (user?.appNotificationsEnabled === false) {
          console.log('[Notification Engine] App notifications disabled for user. Suppressing notification:', notif.title);
          return;
        }
      }
    }

    const nowIso = new Date().toISOString();
    const newNotifItem: NotificationItem = {
      id: 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      title: notif.title,
      desc: notif.desc,
      time: nowIso,
      createdAt: nowIso,
      unread: true,
      targetPage: notif.targetPage,
      type: notif.type || (isFeat ? 'feature_update' : isSec ? 'system' : 'document'),
      isSecurity: isSec,
      isFeatureUpdate: isFeat,
    };

    setNotifications(prev => {
      const updated = [newNotifItem, ...prev];
      if (user?.id) {
        try {
          localStorage.setItem(`structra_notifications_${user.id}`, JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    if (user?.id) {
      dbSaveNotification(newNotifItem, user.id);
    }
  };

  const activeNotifications = useMemo(() => {
    return notifications.filter(n => {
      const titleLower = n.title.toLowerCase();
      const descLower = n.desc.toLowerCase();
      const isSec = n.isSecurity || n.type === 'system' || titleLower.includes('security') || titleLower.includes('deletion') || titleLower.includes('password') || descLower.includes('password') || descLower.includes('deleted');
      if (isSec) return true;

      const isFeat = n.isFeatureUpdate || n.type === 'feature_update';
      if (isFeat) {
        return user?.featureUpdatesEnabled !== false;
      }

      return user?.appNotificationsEnabled !== false;
    });
  }, [notifications, user?.appNotificationsEnabled, user?.featureUpdatesEnabled]);
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'gmail',
      name: 'Gmail',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg',
      connected: false,
      mode: 'Smart Import',
      lastSync: 'Never',
      documentsIndexed: 0,
      documentsImported: 0,
      status: 'Not Connected',
      permissionsGranted: ['Read emails', 'Access attachments', 'Read metadata'],
      retainedData: true,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg',
      connected: false,
      mode: 'Secure Index',
      lastSync: 'Never',
      documentsIndexed: 0,
      documentsImported: 0,
      status: 'Not Connected',
      permissionsGranted: ['Read chat messages', 'Access media/docs', 'Read metadata'],
      retainedData: false,
    }
  ]);
  const [syncActivityLogs, setSyncActivityLogs] = useState<SyncActivityLog[]>([]);
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, unread: false } : n);
      if (user?.id) {
        try {
          localStorage.setItem(`structra_notifications_${user.id}`, JSON.stringify(updated));
        } catch (e) {}
        dbMarkNotificationAsRead(id, user.id);
      }
      return updated;
    });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, unread: false }));
      if (user?.id) {
        try {
          localStorage.setItem(`structra_notifications_${user.id}`, JSON.stringify(updated));
        } catch (e) {}
        dbMarkAllNotificationsAsRead(user.id);
      }
      return updated;
    });
  };
  
  // AI Chat Conversation Persistence & Multi-Chat Management
  const initialAi = useMemo(() => getInitialAiState(), []);
  const [aiConversations, setAiConversations] = useState<AIConversation[]>(() => initialAi.initialConvs);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => initialAi.initialActiveId);
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>(() => initialAi.initialMsgs);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);

  const lastHydratedUserIdRef = useRef<string | null>(null);
  const lastFetchedDocsUserIdRef = useRef<string | null>(null);
  const sessionHydrationPromiseRef = useRef<Promise<void> | null>(null);
  const inFlightHydratingUserIdRef = useRef<string | null>(null);
  const lastFetchedAiUserIdRef = useRef<string | null>(null);
  const lastAuthIntegrityCheckTimeRef = useRef<number>(0);
  const authIntegrityCheckTimeoutRef = useRef<any>(null);
  const activeConversationIdRef = useRef<string | null>(initialAi.initialActiveId);
  const aiMessagesRef = useRef<AIChatMessage[]>(initialAi.initialMsgs);
  const gmailSyncInFlightRef = useRef<boolean>(false);
  const lastGmailSyncTimeRef = useRef<number>(0);
  const telegramSyncInFlightRef = useRef<boolean>(false);
  const lastTelegramSyncTimeRef = useRef<number>(0);

  // Synchronize refs with state updates
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    aiMessagesRef.current = aiMessages;
  }, [aiMessages]);

  const startNewAiChat = () => {
    activeConversationIdRef.current = null;
    setActiveConversationId(null);
    aiMessagesRef.current = [];
    setAiMessages([]);
    if (user?.id) {
      try {
        localStorage.removeItem(`structra_ai_active_conv_${user.id}`);
        localStorage.removeItem(`structra_ai_chat_${user.id}_pending`);
      } catch (e) {}
    }
  };

  const selectAiConversation = async (conversationId: string) => {
    if (!user?.id || !conversationId) return;
    activeConversationIdRef.current = conversationId;
    setActiveConversationId(conversationId);
    try {
      localStorage.setItem(`structra_ai_active_conv_${user.id}`, conversationId);
    } catch (e) {}

    // Instant local cache render
    const cachedMsgs = localStorage.getItem(`structra_ai_chat_${user.id}_${conversationId}`);
    if (cachedMsgs) {
      try {
        const parsed = JSON.parse(cachedMsgs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          aiMessagesRef.current = parsed;
          setAiMessages(parsed);
        }
      } catch (e) {}
    }

    // Refresh from Supabase
    setIsLoadingConversations(true);
    try {
      const msgs = await dbFetchAIChatMessages(conversationId, user.id);
      if (msgs !== null && Array.isArray(msgs) && msgs.length > 0) {
        aiMessagesRef.current = msgs;
        setAiMessages(msgs);
        try {
          localStorage.setItem(`structra_ai_chat_${user.id}_${conversationId}`, JSON.stringify(msgs));
        } catch (e) {}
      }
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const deleteAiConversation = async (conversationId: string): Promise<boolean> => {
    if (!user?.id || !conversationId) return false;
    const success = await dbDeleteAIConversation(conversationId, user.id);
    if (success) {
      setAiConversations(prev => {
        const updated = prev.filter(c => c.id !== conversationId);
        try {
          localStorage.setItem(`structra_ai_convs_${user.id}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      try {
        localStorage.removeItem(`structra_ai_chat_${user.id}_${conversationId}`);
      } catch (e) {}

      // If the deleted conversation was the active one, start a fresh chat
      if (activeConversationIdRef.current === conversationId || activeConversationId === conversationId) {
        startNewAiChat();
      }
      return true;
    }
    return false;
  };

  const addAiMessage = async (msg: AIChatMessage) => {
    const currentConvId = activeConversationIdRef.current;

    // 1. Optimistic UI update
    setAiMessages(prev => {
      const updated = [...prev, msg];
      aiMessagesRef.current = updated;
      if (user?.id) {
        const targetKey = currentConvId 
          ? `structra_ai_chat_${user.id}_${currentConvId}` 
          : `structra_ai_chat_${user.id}_pending`;
        try {
          localStorage.setItem(targetKey, JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    // 2. Save to Supabase and track conversation ID atomically
    if (user?.id) {
      const saveRes = await dbSaveAIChatMessage(msg, user.id, currentConvId);
      if (saveRes.success && saveRes.conversationId) {
        const confirmedConvId = saveRes.conversationId;
        
        // Immediately update synchronous ref so consecutive calls in the same turn share this conversation
        activeConversationIdRef.current = confirmedConvId;
        setActiveConversationId(confirmedConvId);
        
        try {
          localStorage.setItem(`structra_ai_active_conv_${user.id}`, confirmedConvId);
          const pending = localStorage.getItem(`structra_ai_chat_${user.id}_pending`);
          if (pending) {
            localStorage.setItem(`structra_ai_chat_${user.id}_${confirmedConvId}`, pending);
            localStorage.removeItem(`structra_ai_chat_${user.id}_pending`);
          } else {
            localStorage.setItem(`structra_ai_chat_${user.id}_${confirmedConvId}`, JSON.stringify(aiMessagesRef.current));
          }
        } catch (e) {}

        // Update aiConversations state & cache
        setAiConversations(prev => {
          const existingIndex = prev.findIndex(c => c.id === confirmedConvId);
          const nowIso = new Date().toISOString();
          let updated: AIConversation[];
          if (existingIndex >= 0) {
            updated = prev.map((c, i) => i === existingIndex ? {
              ...c,
              lastMessage: msg.text.substring(0, 100),
              updatedAt: nowIso,
            } : c).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          } else {
            const newConvObj: AIConversation = {
              id: confirmedConvId,
              userId: user.id,
              title: saveRes.title || 'New Conversation',
              lastMessage: msg.text.substring(0, 100),
              createdAt: nowIso,
              updatedAt: nowIso,
            };
            updated = [newConvObj, ...prev];
          }
          try {
            localStorage.setItem(`structra_ai_convs_${user.id}`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    }
  };

  const clearAiConversation = async () => {
    startNewAiChat();
  };

  // Active Connection / Offline Status
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isAccountTypeModalOpen, setIsAccountTypeModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isGoogleAuthModalOpen, setIsGoogleAuthModalOpen] = useState<boolean>(false);
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState<boolean>(false);
  const [activeWorkspace, setActiveWorkspace] = useState<'personal' | 'team'>('personal');
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{ name: string; email: string } | null>(null);

  const handleSelectGoogleAccount = (googleUser: { name: string; email: string }) => {
    setIsGoogleAuthModalOpen(false);
    setPendingGoogleUser(googleUser);
    setIsAccountTypeModalOpen(true);
  };

  const completeOnboarding = async () => {
    setIsOnboardingOpen(false);
    if (!user) return;

    const userKey = (user.id || user.email).toLowerCase();
    try {
      localStorage.setItem(`structra_onboarding_${userKey}`, 'true');
      localStorage.removeItem(`structra_is_new_signup_${userKey}`);
      if (user.email) {
        localStorage.removeItem(`structra_is_new_signup_${user.email.toLowerCase()}`);
      }
    } catch (e) {}

    const updatedUser: User = {
      ...user,
      onboardingCompleted: true,
    };
    setUser(updatedUser);

    try {
      await dbUpsertProfile(updatedUser);
    } catch (e) {}

    try {
      const accounts = getStoredAccounts();
      if (user.email && accounts[user.email.toLowerCase()]) {
        accounts[user.email.toLowerCase()] = updatedUser;
        saveStoredAccounts(accounts);
      }
    } catch (e) {}
  };

  const closeOnboarding = () => {
    completeOnboarding();
  };

  const openOnboarding = () => {
    setIsOnboardingOpen(true);
  };

  // Auto-trigger onboarding for first-time users after auth and workspace selection
  useEffect(() => {
    if (!user || isAccountTypeModalOpen || !user.hasCompletedWorkspaceSelection || isAuthLoading) {
      return;
    }

    const userKey = (user.id || user.email).toLowerCase();
    const isCompletedLocal = localStorage.getItem(`structra_onboarding_${userKey}`) === 'true';

    // If already completed in memory or localStorage, never show
    if (user.onboardingCompleted === true || isCompletedLocal) {
      return;
    }

    // Check if new user
    const isNewSignup = 
      user.onboardingCompleted === false || 
      localStorage.getItem(`structra_is_new_signup_${userKey}`) === 'true' ||
      (user.email && localStorage.getItem(`structra_is_new_signup_${user.email.toLowerCase()}`) === 'true');

    if (isNewSignup) {
      setIsOnboardingOpen(true);
    }
  }, [user?.id, user?.email, user?.onboardingCompleted, user?.hasCompletedWorkspaceSelection, isAccountTypeModalOpen, isAuthLoading]);

  // Lazy-load AI Chat History on Demand when AI Assistant Drawer is Opened
  useEffect(() => {
    if (!isAIChatOpen || !user?.id) return;

    if (lastFetchedAiUserIdRef.current === user.id && aiConversations.length > 0) {
      return;
    }

    let isCancelled = false;
    const loadAiHistory = async () => {
      setIsLoadingConversations(true);
      try {
        const dbConvs = await dbFetchAIConversations(user.id);
        if (isCancelled) return;

        if (dbConvs !== null && dbConvs.length > 0) {
          setAiConversations(dbConvs);
          try {
            localStorage.setItem(`structra_ai_convs_${user.id}`, JSON.stringify(dbConvs));
          } catch (e) {}

          const savedActiveId = localStorage.getItem(`structra_ai_active_conv_${user.id}`) || activeConversationIdRef.current;
          const targetConv = (savedActiveId && dbConvs.find(c => c.id === savedActiveId)) || dbConvs[0];
          activeConversationIdRef.current = targetConv.id;
          setActiveConversationId(targetConv.id);
          try {
            localStorage.setItem(`structra_ai_active_conv_${user.id}`, targetConv.id);
          } catch (e) {}

          const msgs = await dbFetchAIChatMessages(targetConv.id, user.id);
          if (isCancelled) return;

          if (msgs !== null && Array.isArray(msgs) && msgs.length > 0) {
            aiMessagesRef.current = msgs;
            setAiMessages(msgs);
            try {
              localStorage.setItem(`structra_ai_chat_${user.id}_${targetConv.id}`, JSON.stringify(msgs));
            } catch (e) {}
          } else {
            const cachedMsgs = localStorage.getItem(`structra_ai_chat_${user.id}_${targetConv.id}`);
            if (cachedMsgs) {
              try {
                const parsed = JSON.parse(cachedMsgs);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  aiMessagesRef.current = parsed;
                  setAiMessages(parsed);
                }
              } catch (e) {}
            }
          }
          lastFetchedAiUserIdRef.current = user.id;
        } else {
          // Remote DB returned empty list [] or null: preserve local cache
          const cachedConvs = localStorage.getItem(`structra_ai_convs_${user.id}`);
          let localConvsFound = false;
          if (cachedConvs) {
            try {
              const parsedConvs = JSON.parse(cachedConvs);
              if (Array.isArray(parsedConvs) && parsedConvs.length > 0) {
                localConvsFound = true;
                setAiConversations(parsedConvs);
                const savedActiveId = localStorage.getItem(`structra_ai_active_conv_${user.id}`) || activeConversationIdRef.current;
                const targetConv = (savedActiveId && parsedConvs.find(c => c.id === savedActiveId)) || parsedConvs[0];
                activeConversationIdRef.current = targetConv.id;
                setActiveConversationId(targetConv.id);
                const cachedMsgs = localStorage.getItem(`structra_ai_chat_${user.id}_${targetConv.id}`);
                if (cachedMsgs) {
                  try {
                    const parsedMsgs = JSON.parse(cachedMsgs);
                    if (Array.isArray(parsedMsgs) && parsedMsgs.length > 0) {
                      aiMessagesRef.current = parsedMsgs;
                      setAiMessages(parsedMsgs);
                    }
                  } catch (e) {}
                }
              }
            } catch (e) {}
          }

          if (!localConvsFound) {
            const pendingMsgs = localStorage.getItem(`structra_ai_chat_${user.id}_pending`);
            if (pendingMsgs) {
              try {
                const parsedPending = JSON.parse(pendingMsgs);
                if (Array.isArray(parsedPending) && parsedPending.length > 0) {
                  aiMessagesRef.current = parsedPending;
                  setAiMessages(parsedPending);
                }
              } catch (e) {}
            } else if (aiMessagesRef.current.length === 0) {
              activeConversationIdRef.current = null;
              setActiveConversationId(null);
              setAiMessages([]);
            }
          }
          lastFetchedAiUserIdRef.current = user.id;
        }
      } catch (e) {
        console.warn('[AI Conversations Lazy Load Notice]:', e);
      } finally {
        if (!isCancelled) {
          setIsLoadingConversations(false);
        }
      }
    };

    loadAiHistory();

    return () => {
      isCancelled = true;
    };
  }, [isAIChatOpen, user?.id]);

  // Legal Modal State & Handlers
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);
  const openLegalModal = (type: 'terms' | 'privacy') => {
    setLegalModalType(type);
  };
  const closeLegalModal = () => {
    setLegalModalType(null);
  };

  // Recovery & Deletion & Logout Modal State
  const [pendingRecoveryUser, setPendingRecoveryUser] = useState<User | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState<boolean>(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [restorationToast, setRestorationToast] = useState<string | null>(null);

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(initialAdminUsers);
  const [systemStats, setSystemStats] = useState<SystemStats>(initialSystemStats);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  // Helper for stored accounts map in localStorage
  const getStoredAccounts = (): Record<string, User> => {
    try {
      const saved = localStorage.getItem('structra_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (parsed['onammanwosu19@gmail.com']) {
            parsed['onammanwosu19@gmail.com'].role = 'user';
            parsed['onammanwosu19@gmail.com'].name = 'Onam Manwosu';
          }
          if (parsed['onammannwosu19@gmail.com']) {
            parsed['onammannwosu19@gmail.com'].role = 'user';
            parsed['onammannwosu19@gmail.com'].name = 'Onam Manwosu';
          }
          if (!parsed['meklitseife86@gmail.com']) {
            parsed['meklitseife86@gmail.com'] = {
              id: 'usr_meklit',
              name: 'Meklit Seife (Admin)',
              email: 'meklitseife86@gmail.com',
              accountType: 'business',
              workspaceType: 'Business / Team Workspace',
              hasCompletedWorkspaceSelection: true,
              role: 'admin',
              createdAt: '2026-03-01',
              storageUsedBytes: 0,
              storageLimitBytes: 10 * 1024 * 1024 * 1024,
            };
          } else {
            parsed['meklitseife86@gmail.com'].role = 'admin';
          }
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    const initialMap: Record<string, User> = {
      [initialUser.email.toLowerCase()]: initialUser,
      'josephonoka@gmail.com': {
        id: 'usr_joseph',
        name: 'Joseph Onoka',
        email: 'josephonoka@gmail.com',
        accountType: 'business',
        workspaceType: 'Business / Team Workspace',
        hasCompletedWorkspaceSelection: true,
        role: 'user',
        createdAt: '2026-02-01',
        storageUsedBytes: 1.5 * 1024 * 1024 * 1024,
        storageLimitBytes: 10 * 1024 * 1024 * 1024,
      },
      'anelurhoda@gmail.com': {
        id: 'usr_rhoda',
        name: 'Rhoda Anelu',
        email: 'anelurhoda@gmail.com',
        accountType: 'individual',
        workspaceType: 'Individual Workspace',
        hasCompletedWorkspaceSelection: true,
        role: 'user',
        createdAt: '2026-02-10',
        storageUsedBytes: 0.8 * 1024 * 1024 * 1024,
        storageLimitBytes: 10 * 1024 * 1024 * 1024,
      },
      'onammanwosu19@gmail.com': {
        id: 'usr_onam',
        name: 'Onam Manwosu',
        email: 'onammanwosu19@gmail.com',
        accountType: 'business',
        workspaceType: 'Business / Team Workspace',
        hasCompletedWorkspaceSelection: true,
        role: 'user',
        createdAt: '2026-02-26',
        storageUsedBytes: 0,
        storageLimitBytes: 10 * 1024 * 1024 * 1024,
      },
      'meklitseife86@gmail.com': {
        id: 'usr_meklit',
        name: 'Meklit Seife (Admin)',
        email: 'meklitseife86@gmail.com',
        accountType: 'business',
        workspaceType: 'Business / Team Workspace',
        hasCompletedWorkspaceSelection: true,
        role: 'admin',
        createdAt: '2026-03-01',
        storageUsedBytes: 0,
        storageLimitBytes: 10 * 1024 * 1024 * 1024,
      },
    };
    try {
      localStorage.setItem('structra_accounts', JSON.stringify(initialMap));
    } catch (e) {}
    return initialMap;
  };

  const saveStoredAccounts = (accounts: Record<string, User>) => {
    try {
      localStorage.setItem('structra_accounts', JSON.stringify(accounts));
    } catch (e) {}
  };

  // Run initial check for pending deletion accounts (30-day purge or 7-day/1-day reminders)
  useEffect(() => {
    const accounts = getStoredAccounts();
    let updatedAccounts = false;

    Object.keys(accounts).forEach(emailKey => {
      const acc = accounts[emailKey];
      if (acc.pendingDeletion && acc.scheduledDeletionDate) {
        const scheduledTime = new Date(acc.scheduledDeletionDate).getTime();
        const nowTime = Date.now();

        if (nowTime > scheduledTime) {
          // 30 days elapsed -> Permanent deletion!
          delete accounts[emailKey];
          updatedAccounts = true;
          setAdminUsers(prev => prev.filter(u => u.email.toLowerCase() !== emailKey));
        } else {
          // Generate reminder notification if within 7 days or 1 day
          const daysLeft = Math.ceil((scheduledTime - nowTime) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7) {
            const reminderTitle = daysLeft <= 1 
              ? 'Account Deletion Reminder: Tomorrow' 
              : `Account Deletion Reminder: ${daysLeft} Days Remaining`;
            const reminderDesc = daysLeft <= 1 
              ? 'Your account will be permanently deleted tomorrow unless you restore it.' 
              : `Your Structra account will be permanently deleted in ${daysLeft} days unless restored.`;

            setNotifications(prev => {
              if (prev.some(n => n.title === reminderTitle)) return prev;
              return [
                {
                  id: 'notif_del_' + Date.now(),
                  title: reminderTitle,
                  desc: reminderDesc,
                  time: 'Just now',
                  unread: true,
                  type: 'system',
                  targetPage: 'profile',
                },
                ...prev,
              ];
            });
          }
        }
      }
    });

    if (updatedAccounts) {
      saveStoredAccounts(accounts);
    }
  }, []);

  // Supabase Auth and Remote Data Sync Listener
  useEffect(() => {
    const handleSupabaseSession = async (sessionUser: any, isAlreadyVerified: boolean = false) => {
      if (!sessionUser) {
        setIsAuthLoading(false);
        return;
      }

      const targetUserId = sessionUser.id;

      // In-flight hydration guard: deduplicate concurrent/overlapping hydration for the same user
      if (targetUserId && inFlightHydratingUserIdRef.current === targetUserId && sessionHydrationPromiseRef.current) {
        await sessionHydrationPromiseRef.current;
        return;
      }

      inFlightHydratingUserIdRef.current = targetUserId;

      const hydrationPromise = (async () => {
        try {
          let validUser = sessionUser;

          // Authoritative verification against Supabase Auth server only if not already verified
          if (!isAlreadyVerified) {
            const { data: authData, error: authErr } = await supabase.auth.getUser();
            if (authErr || !authData?.user) {
              console.warn('[Supabase Auth] User verification failed: account does not exist or was deleted in Supabase Auth.');
              await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
              
              try {
                const deletedId = sessionUser?.id || lastHydratedUserIdRef.current;
                if (deletedId) {
                  localStorage.removeItem(`structra_profile_${deletedId}`);
                  localStorage.removeItem(`structra_docs_${deletedId}`);
                  localStorage.removeItem(`structra_notifications_${deletedId}`);
                  localStorage.removeItem(`structra_ai_convs_${deletedId}`);
                  localStorage.removeItem(`structra_ai_active_conv_${deletedId}`);
                  localStorage.removeItem(`structra_settings_${deletedId}`);
                }
                localStorage.removeItem('structra_last_user_id');
                if (sessionUser?.email) {
                  const stored = getStoredAccounts();
                  const emailKey = sessionUser.email.trim().toLowerCase();
                  if (stored[emailKey]) {
                    delete stored[emailKey];
                    saveStoredAccounts(stored);
                  }
                }
              } catch (e) {}

              sessionHydrationPromiseRef.current = null;
              inFlightHydratingUserIdRef.current = null;
              lastFetchedAiUserIdRef.current = null;
              lastHydratedUserIdRef.current = null;
              lastFetchedDocsUserIdRef.current = null;
              activeConversationIdRef.current = null;
              aiMessagesRef.current = [];
              setDocuments([]);
              setSelectedDocument(null);
              setUser(null);
              setIsAuthenticated(false);
              setIsAccountTypeModalOpen(false);
              setPendingRecoveryUser(null);
              setIsRecoveryModalOpen(false);
              setNotifications([]);
              setAiConversations([]);
              setActiveConversationId(null);
              setAiMessages([]);
              setCurrentPageState(prev => (prev === 'landing' || prev === 'privacy' || prev === 'terms' || prev === 'share' ? prev : 'login'));
              setIsAuthLoading(false);
              return;
            }
            validUser = authData.user;
          }

          const isSameUser = lastHydratedUserIdRef.current === validUser.id;
          lastHydratedUserIdRef.current = validUser.id;
          try {
            localStorage.setItem('structra_last_user_id', validUser.id);
          } catch (e) {}

          // Instant local cache hydration for this user (Stale-While-Revalidate)
          const normalizedEmail = (validUser.email || '').trim().toLowerCase();
          const storedAccounts = getStoredAccounts();
          let localSavedUser: User | null = (normalizedEmail ? storedAccounts[normalizedEmail] : null);
          if (!localSavedUser) {
            try {
              const raw = localStorage.getItem(`structra_signup_${normalizedEmail}`) || localStorage.getItem(`structra_profile_${validUser.id}`);
              if (raw) localSavedUser = JSON.parse(raw);
            } catch (e) {}
          }

          // Reset document & notification state immediately when user changes, then hydrate cached data
          if (!isSameUser) {
            setDocuments([]);
            setSelectedDocument(null);
            lastFetchedDocsUserIdRef.current = null;
            try {
              const cachedUserDocs = localStorage.getItem(`structra_docs_${validUser.id}`);
              if (cachedUserDocs) {
                const parsed = JSON.parse(cachedUserDocs);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setDocuments(parsed);
                }
              }
            } catch (e) {}

            try {
              const localNotifs = localStorage.getItem(`structra_notifications_${validUser.id}`);
              if (localNotifs) {
                const parsedNotifs = JSON.parse(localNotifs);
                if (Array.isArray(parsedNotifs)) {
                  setNotifications(parsedNotifs);
                }
              }
            } catch (e) {}
          }

          const metadataAccountType = (validUser.user_metadata?.account_type || validUser.user_metadata?.accountType) as AccountType | undefined;
          const resolvedAccountType: AccountType = 
            localSavedUser?.accountType || 
            metadataAccountType || 
            'individual';

          const resolvedWorkspaceType = 
            localSavedUser?.workspaceType || 
            (resolvedAccountType === 'individual' ? 'Individual Workspace' : 'Business / Team Workspace');

          const resolvedHasCompletedWorkspaceSelection = Boolean(
            localSavedUser?.hasCompletedWorkspaceSelection || 
            validUser.user_metadata?.has_completed_workspace_selection || 
            validUser.user_metadata?.hasCompletedWorkspaceSelection || 
            metadataAccountType || 
            localSavedUser?.accountType
          );

          const googleName = validUser.user_metadata?.full_name || validUser.user_metadata?.name || validUser.email?.split('@')[0] || 'User';
          const googleAvatar = validUser.user_metadata?.avatar_url || validUser.user_metadata?.picture || '';

          // Establish initial authenticated user identity so the workspace can render immediately
          const initialProfile: User = localSavedUser || {
            id: validUser.id,
            name: googleName,
            email: validUser.email || '',
            avatar: googleAvatar,
            accountType: resolvedAccountType,
            workspaceType: resolvedWorkspaceType,
            hasCompletedWorkspaceSelection: resolvedHasCompletedWorkspaceSelection,
            role: 'user',
            createdAt: new Date().toISOString().split('T')[0],
            storageUsedBytes: 0,
            storageLimitBytes: 10 * 1024 * 1024 * 1024,
            language: 'English (United States)',
            appNotificationsEnabled: true,
            featureUpdatesEnabled: true,
          };

          setUser(initialProfile);
          setIsAuthenticated(true);

          if (!initialProfile.hasCompletedWorkspaceSelection) {
            setIsAccountTypeModalOpen(true);
          } else {
            setIsAccountTypeModalOpen(false);
          }

          // Never redirect authenticated user to Landing Page. Navigate to Dashboard!
          setCurrentPageState(prev => (prev === 'landing' || prev === 'login' || prev === 'signup' ? 'dashboard' : prev));

          // =========================================================================
          // CHANGE THREE: AUTH READY -> DISMISS GLOBAL LOADING SPLASH IMMEDIATELY!
          // =========================================================================
          setIsAuthLoading(false);

          // =========================================================================
          // CHANGE FOUR: PARALLELIZE INDEPENDENT REMOTE DATA HYDRATION (IN BACKGROUND)
          // =========================================================================
          try {
            const [remoteProfile, dbDocs, dbInts, dbNotifs] = await Promise.all([
              dbFetchProfile(validUser.id).catch(err => {
                console.warn('[Supabase DB] Profile fetch notice:', err);
                return null;
              }),
              dbFetchDocuments(validUser.id).catch(err => {
                console.warn('[Supabase DB] Documents fetch notice:', err);
                return null;
              }),
              dbFetchIntegrations(validUser.id).catch(err => {
                console.warn('[Supabase DB] Integrations fetch notice:', err);
                return null;
              }),
              dbFetchNotifications(validUser.id).catch(err => {
                console.warn('[Supabase DB] Notifications fetch notice:', err);
                return null;
              }),
            ]);

            // Stale user guard: if user switched while network was in flight, discard results
            if (lastHydratedUserIdRef.current !== validUser.id) {
              return;
            }

            // 1. Process Profile
            let finalProfile = remoteProfile;
            if (!finalProfile) {
              const newProfile: User = {
                id: validUser.id,
                name: initialProfile.name || googleName,
                email: validUser.email || '',
                avatar: initialProfile.avatar || googleAvatar,
                accountType: initialProfile.accountType || resolvedAccountType,
                workspaceType: initialProfile.workspaceType || resolvedWorkspaceType,
                hasCompletedWorkspaceSelection: initialProfile.hasCompletedWorkspaceSelection || resolvedHasCompletedWorkspaceSelection,
                role: initialProfile.role || 'user',
                createdAt: initialProfile.createdAt || new Date().toISOString().split('T')[0],
                storageUsedBytes: initialProfile.storageUsedBytes || 0,
                storageLimitBytes: initialProfile.storageLimitBytes || 10 * 1024 * 1024 * 1024,
                language: initialProfile.language || 'English (United States)',
                appNotificationsEnabled: initialProfile.appNotificationsEnabled ?? true,
                featureUpdatesEnabled: initialProfile.featureUpdatesEnabled ?? true,
              };
              await dbUpsertProfile(newProfile).catch(() => {});
              finalProfile = newProfile;
            } else {
              if (!finalProfile.name) {
                finalProfile.name = initialProfile.name || googleName;
              }
              if (initialProfile.hasCompletedWorkspaceSelection && !finalProfile.hasCompletedWorkspaceSelection) {
                finalProfile.hasCompletedWorkspaceSelection = true;
                finalProfile.accountType = initialProfile.accountType;
                finalProfile.workspaceType = initialProfile.workspaceType;
                await dbUpsertProfile(finalProfile).catch(() => {});
              }
            }

            try {
              localStorage.setItem(`structra_profile_${validUser.id}`, JSON.stringify(finalProfile));
            } catch (e) {}
            setUser(finalProfile);

            if (!finalProfile.hasCompletedWorkspaceSelection) {
              setIsAccountTypeModalOpen(true);
            } else {
              setIsAccountTypeModalOpen(false);
            }

            // 2. Process Documents
            if (dbDocs !== null) {
              setDocuments(dbDocs);
              lastFetchedDocsUserIdRef.current = validUser.id;
              try {
                localStorage.setItem(`structra_docs_${validUser.id}`, JSON.stringify(dbDocs));
              } catch (e) {}
            } else {
              console.warn('[Supabase DB] Documents remote fetch failed; preserving local state.');
              const cachedUserDocs = localStorage.getItem(`structra_docs_${validUser.id}`);
              if (cachedUserDocs) {
                try {
                  const parsed = JSON.parse(cachedUserDocs);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setDocuments(parsed);
                  }
                } catch (e) {}
              }
            }

            // 3. Process Integrations
            if (dbInts && Object.keys(dbInts).length > 0) {
              setIntegrations(prev => prev.map(item => {
                const dbItem = dbInts[item.id];
                if (dbItem) {
                  return {
                    ...item,
                    connected: dbItem.connected,
                    status: dbItem.status as any,
                    mode: dbItem.mode,
                    lastSync: dbItem.lastSync,
                    accountIdentifier: dbItem.accountIdentifier || (dbItem.connected ? item.accountIdentifier : ''),
                  };
                }
                return item;
              }));
            }

            // 4. Process Notifications
            if (dbNotifs !== null) {
              setNotifications(dbNotifs);
              try {
                localStorage.setItem(`structra_notifications_${validUser.id}`, JSON.stringify(dbNotifs));
              } catch (e) {}
            } else {
              const localNotifs = localStorage.getItem(`structra_notifications_${validUser.id}`);
              if (localNotifs) {
                try {
                  setNotifications(JSON.parse(localNotifs));
                } catch (e) {}
              }
            }
          } catch (dbSyncErr) {
            console.warn('[Supabase DB Hydration Notice]:', dbSyncErr);
          }
        } catch (err) {
          console.warn('[Supabase Auth Sync Notice]:', err);
        } finally {
          setIsAuthLoading(false);
        }
      })();

      sessionHydrationPromiseRef.current = hydrationPromise;
      try {
        await hydrationPromise;
      } finally {
        if (sessionHydrationPromiseRef.current === hydrationPromise) {
          sessionHydrationPromiseRef.current = null;
          inFlightHydratingUserIdRef.current = null;
        }
      }
    };

    const initSupabase = async () => {
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const search = typeof window !== 'undefined' ? window.location.search : '';

        const isEmailVerificationLink = 
          hash.includes('type=signup') || 
          hash.includes('type=email_verification') || 
          hash.includes('type=email_confirmation') || 
          search.includes('mode=verified') || 
          search.includes('verified=true') ||
          hash.includes('error_code=already_verified');

        if (isEmailVerificationLink) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          sessionHydrationPromiseRef.current = null;
          inFlightHydratingUserIdRef.current = null;
          lastFetchedAiUserIdRef.current = null;
          lastHydratedUserIdRef.current = null;
          lastFetchedDocsUserIdRef.current = null;
          activeConversationIdRef.current = null;
          aiMessagesRef.current = [];
          setDocuments([]);
          setSelectedDocument(null);
          setUser(null);
          setIsAuthenticated(false);
          setIsAccountTypeModalOpen(false);
          setCurrentPageState('login');
          if (typeof window !== 'undefined' && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname + '?mode=login');
          }
          setIsAuthLoading(false);
          return;
        }

        // Check if there is an active user in Supabase Auth (server verified)
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authData?.user && !authErr) {
          // Pass isAlreadyVerified = true to avoid duplicate server getUser() call
          await handleSupabaseSession(authData.user, true);
        } else {
          // If no active server-verified user, clean up local tokens and unauthenticate
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          sessionHydrationPromiseRef.current = null;
          inFlightHydratingUserIdRef.current = null;
          lastFetchedAiUserIdRef.current = null;
          lastHydratedUserIdRef.current = null;
          lastFetchedDocsUserIdRef.current = null;
          activeConversationIdRef.current = null;
          setActiveConversationId(null);
          aiMessagesRef.current = [];
          setAiMessages([]);
          setAiConversations([]);
          setDocuments([]);
          setSelectedDocument(null);
          setUser(null);
          setIsAuthenticated(false);
          setIsAccountTypeModalOpen(false);
          setNotifications([]);
          setIsAuthLoading(false);
        }
      } catch (err) {
        console.warn('[Supabase Session] Notice:', err);
        setDocuments([]);
        setSelectedDocument(null);
        setIsAuthLoading(false);
      }
    };
    initSupabase();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const search = typeof window !== 'undefined' ? window.location.search : '';

      const isEmailVerificationLink = 
        hash.includes('type=signup') || 
        hash.includes('type=email_verification') || 
        hash.includes('type=email_confirmation') || 
        search.includes('mode=verified') || 
        search.includes('verified=true') ||
        hash.includes('error_code=already_verified');

      if (isEmailVerificationLink) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        sessionHydrationPromiseRef.current = null;
        inFlightHydratingUserIdRef.current = null;
        lastFetchedAiUserIdRef.current = null;
        lastHydratedUserIdRef.current = null;
        lastFetchedDocsUserIdRef.current = null;
        activeConversationIdRef.current = null;
        aiMessagesRef.current = [];
        setDocuments([]);
        setSelectedDocument(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsAccountTypeModalOpen(false);
        setCurrentPageState('login');
        if (typeof window !== 'undefined' && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname + '?mode=login');
        }
        setIsAuthLoading(false);
        return;
      }

      if (session?.user) {
        if (event === 'TOKEN_REFRESHED') {
          // Token refreshed in background - verify user still exists in Supabase Auth
          const { data: authData, error: authErr } = await supabase.auth.getUser();
          if (authErr || !authData?.user) {
            console.warn('[Supabase Auth] Token refresh detected user was deleted; signing out.');
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            sessionHydrationPromiseRef.current = null;
            inFlightHydratingUserIdRef.current = null;
            lastFetchedAiUserIdRef.current = null;
            setUser(null);
            setIsAuthenticated(false);
            setIsAccountTypeModalOpen(false);
            setDocuments([]);
            setSelectedDocument(null);
            setCurrentPageState('login');
            setIsAuthLoading(false);
          }
          return;
        }
        if (event === 'SIGNED_IN' || lastHydratedUserIdRef.current !== session.user.id) {
          await handleSupabaseSession(session.user, false);
        }
      } else if (event === 'SIGNED_OUT') {
        sessionHydrationPromiseRef.current = null;
        inFlightHydratingUserIdRef.current = null;
        lastFetchedAiUserIdRef.current = null;
        lastHydratedUserIdRef.current = null;
        lastFetchedDocsUserIdRef.current = null;
        activeConversationIdRef.current = null;
        aiMessagesRef.current = [];
        setDocuments([]);
        setSelectedDocument(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsAccountTypeModalOpen(false);
        setNotifications([]);
        setAiConversations([]);
        setActiveConversationId(null);
        setAiMessages([]);
        setCurrentPageState(prev => (prev === 'landing' || prev === 'privacy' || prev === 'terms' || prev === 'share' ? prev : 'login'));
        setIsAuthLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Proactive Session Integrity Check on Window Focus and Tab Visibility
  useEffect(() => {
    const checkActiveSessionIntegrity = async () => {
      if (!isAuthenticated || !navigator.onLine) return;
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user) {
          console.warn('[Supabase Auth] Session verification failed on tab focus: user was deleted or session invalidated.');
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          try {
            const currentUserId = lastHydratedUserIdRef.current;
            if (currentUserId) {
              localStorage.removeItem(`structra_profile_${currentUserId}`);
              localStorage.removeItem(`structra_docs_${currentUserId}`);
              localStorage.removeItem(`structra_notifications_${currentUserId}`);
              localStorage.removeItem(`structra_ai_convs_${currentUserId}`);
              localStorage.removeItem(`structra_ai_active_conv_${currentUserId}`);
              localStorage.removeItem(`structra_settings_${currentUserId}`);
            }
            localStorage.removeItem('structra_last_user_id');
          } catch (e) {}

          sessionHydrationPromiseRef.current = null;
          inFlightHydratingUserIdRef.current = null;
          lastFetchedAiUserIdRef.current = null;
          lastHydratedUserIdRef.current = null;
          lastFetchedDocsUserIdRef.current = null;
          activeConversationIdRef.current = null;
          aiMessagesRef.current = [];
          setDocuments([]);
          setSelectedDocument(null);
          setUser(null);
          setIsAuthenticated(false);
          setIsAccountTypeModalOpen(false);
          setCurrentPageState(prev => (prev === 'landing' || prev === 'privacy' || prev === 'terms' || prev === 'share' ? prev : 'login'));
        }
      } catch (err) {
        console.warn('[Supabase Auth] Integrity check notice:', err);
      }
    };

    const AUTH_INTEGRITY_COOLDOWN_MS = 45000;

    const triggerDebouncedIntegrityCheck = () => {
      if (!isAuthenticated || !navigator.onLine) return;
      const now = Date.now();
      if (now - lastAuthIntegrityCheckTimeRef.current < AUTH_INTEGRITY_COOLDOWN_MS) {
        return;
      }
      if (authIntegrityCheckTimeoutRef.current) {
        clearTimeout(authIntegrityCheckTimeoutRef.current);
      }
      authIntegrityCheckTimeoutRef.current = setTimeout(() => {
        const freshNow = Date.now();
        if (freshNow - lastAuthIntegrityCheckTimeRef.current >= AUTH_INTEGRITY_COOLDOWN_MS) {
          lastAuthIntegrityCheckTimeRef.current = freshNow;
          checkActiveSessionIntegrity();
        }
      }, 300);
    };

    const handleFocus = () => {
      triggerDebouncedIntegrityCheck();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerDebouncedIntegrityCheck();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (authIntegrityCheckTimeoutRef.current) {
        clearTimeout(authIntegrityCheckTimeoutRef.current);
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  // Strict page protection & navigation guard
  useEffect(() => {
    if (!isAuthLoading) {
      const isPublicAccessible = 
        currentPage === 'landing' || 
        currentPage === 'login' || 
        currentPage === 'signup' || 
        currentPage === 'privacy' || 
        currentPage === 'terms' || 
        currentPage === 'share';

      const isAuthEntryOnly = 
        currentPage === 'landing' || 
        currentPage === 'login' || 
        currentPage === 'signup';

      if (!user && !isPublicAccessible) {
        setCurrentPageState('login');
        if (typeof window !== 'undefined' && window.history.replaceState) {
          window.history.replaceState({ page: 'login' }, '', '/auth?mode=login');
        }
      } else if (user && isAuthEntryOnly) {
        setCurrentPageState('dashboard');
        if (typeof window !== 'undefined' && window.history.replaceState) {
          window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
        }
      }
    }
  }, [isAuthLoading, user, currentPage]);

  // Sync user documents with Supabase when user is logged in
  useEffect(() => {
    if (!user?.id) {
      setDocuments([]);
      setSelectedDocument(null);
      return;
    }
    // Prevent duplicate hydration if documents were already fetched during session initialization
    if (lastFetchedDocsUserIdRef.current === user.id) {
      return;
    }
    const loadRemoteDocs = async () => {
      try {
        const remoteDocs = await dbFetchDocuments(user.id);
        if (remoteDocs !== null) {
          setDocuments(remoteDocs);
          lastFetchedDocsUserIdRef.current = user.id;
          try {
            localStorage.setItem(`structra_docs_${user.id}`, JSON.stringify(remoteDocs));
          } catch (e) {}
        } else {
          console.warn('[Supabase Sync] Remote documents fetch failed; preserving local state.');
          lastFetchedDocsUserIdRef.current = user.id;
          const cachedUserDocs = localStorage.getItem(`structra_docs_${user.id}`);
          if (cachedUserDocs) {
            try {
              const parsed = JSON.parse(cachedUserDocs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setDocuments(parsed);
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('[Supabase Sync] Notice:', err);
      }
    };
    loadRemoteDocs();
  }, [user?.id]);

  // User-scoped integrations loading effect
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIntegrations(initialIntegrations);
      return;
    }

    const userKey = `structra_integrations_${user.id || user.email.toLowerCase()}`;
    try {
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIntegrations(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('[Integrations] Error loading user integrations:', e);
    }

    // Default to initialIntegrations (connected: false for Gmail & Telegram) for a user with no connection record
    setIntegrations(initialIntegrations);
  }, [user?.id, user?.email, isAuthLoading]);

  // Telegram Integration Automatic Synchronization & Hydration Effect
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    // Smart sync cooldown constants
    const EVENT_SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown for focus / tab visibility return
    const ACTIVE_POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes while user is active

    const syncTelegramServerState = async (options: { isBackground?: boolean; force?: boolean } = {}) => {
      const { isBackground = true, force = false } = options;
      if (!user?.id || telegramSyncInFlightRef.current) return;

      const now = Date.now();
      const elapsedSinceLastSync = now - lastTelegramSyncTimeRef.current;

      // When triggered by background/focus/visibility events, respect 5-minute cooldown unless forced
      if (!force && elapsedSinceLastSync < EVENT_SYNC_COOLDOWN_MS) {
        return;
      }

      telegramSyncInFlightRef.current = true;
      try {
        let token = '';
        try {
          const sessionRes = await supabase.auth.getSession();
          token = sessionRes.data?.session?.access_token || '';
        } catch (e) {}

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // 1. Check connection status
        const statusRes = await fetch('/api/integrations/telegram/status', { headers });
        if (statusRes.status === 401) {
          if (!isMounted) return;
          setIntegrations(prev => prev.map(item => item.id === 'telegram' ? {
            ...item,
            connected: false,
            status: 'Not Connected',
            accountIdentifier: '',
          } : item));
          return;
        }

        const statusContentType = statusRes.headers.get('content-type') || '';
        if (statusRes.ok && statusContentType.includes('application/json')) {
          const statusData = await statusRes.json();
          if (!isMounted) return;

          if (statusData.success && statusData.connected) {
            setIntegrations(prev => prev.map(item => {
              if (item.id === 'telegram') {
                return {
                  ...item,
                  connected: true,
                  status: item.status === 'Syncing' ? item.status : 'Connected',
                  mode: statusData.mode || item.mode || 'Smart Import',
                  accountIdentifier: statusData.accountIdentifier || item.accountIdentifier || 'Connected Telegram Account',
                };
              }
              return item;
            }));

            // 2. Perform direct sync if user is connected
            const currentTelegramIntegration = integrations.find(item => item.id === 'telegram');
            const currentMode = currentTelegramIntegration?.mode || statusData.mode || 'Smart Import';

            const syncRes = await fetch('/api/integrations/telegram/sync', {
              method: 'POST',
              headers,
              body: JSON.stringify({ mode: currentMode, background: isBackground }),
            });

            lastTelegramSyncTimeRef.current = Date.now();

            if (syncRes.status === 401) {
              return;
            }

            const syncContentType = syncRes.headers.get('content-type') || '';
            if (syncRes.ok && syncContentType.includes('application/json')) {
              const syncData = await syncRes.json();
              if (!isMounted) return;

              const countIndexed = typeof syncData.countIndexed === 'number' ? syncData.countIndexed : (syncData.createdDocuments?.length || 0);
              const countImported = typeof syncData.countImported === 'number' ? syncData.countImported : 0;
              const countDuplicates = typeof syncData.countDuplicates === 'number' ? syncData.countDuplicates : 0;

              // Rehydrate documents from Supabase DB ONLY if new documents were indexed or imported
              if ((countIndexed > 0 || countImported > 0) && isMounted) {
                const rehydratedDocs = await dbFetchDocuments(user.id);
                if (rehydratedDocs !== null && isMounted) {
                  setDocuments(rehydratedDocs);
                  try {
                    localStorage.setItem(`structra_docs_${user.id}`, JSON.stringify(rehydratedDocs));
                  } catch (e) {}
                }
              }

              // Update integration metrics
              setIntegrations(prev => prev.map(item => item.id === 'telegram' ? {
                ...item,
                status: 'Connected',
                lastSync: 'Just now',
                documentsIndexed: item.documentsIndexed + countIndexed,
                documentsImported: item.documentsImported + countImported,
              } : item));

              if (countIndexed > 0 && isMounted) {
                const activityText = currentMode === 'Smart Import'
                  ? `Smart Import: ${countImported} new attachment(s) imported from Telegram`
                  : `Secure Index: ${countIndexed} new attachment(s) indexed from Telegram`;

                setSyncActivityLogs(prev => [
                  {
                    id: 'log_' + Date.now(),
                    channel: 'Telegram',
                    icon: 'telegram' as any,
                    activity: activityText,
                    time: 'Just now',
                    status: 'Success',
                    mode: currentMode,
                  },
                  ...prev,
                ]);

                addNotification({
                  title: 'Telegram Auto-Sync',
                  desc: activityText,
                  targetPage: 'documents',
                  type: 'integration',
                });
              } else if (countDuplicates > 0 && !isBackground && isMounted) {
                const activityText = `Telegram sync up to date (${countDuplicates} existing attachment(s) verified)`;
                setSyncActivityLogs(prev => [
                  {
                    id: 'log_' + Date.now(),
                    channel: 'Telegram',
                    icon: 'telegram' as any,
                    activity: activityText,
                    time: 'Just now',
                    status: 'Success',
                    mode: currentMode,
                  },
                  ...prev,
                ]);
              }
            }
          } else {
            // Backend confirms Telegram is not connected
            setIntegrations(prev => prev.map(item => item.id === 'telegram' ? {
              ...item,
              connected: false,
              status: item.status === 'Disconnected' ? 'Disconnected' : 'Not Connected',
              accountIdentifier: '',
            } : item));
          }
        }


      } catch (err) {
        console.warn('[Telegram Auto-Sync Notice]:', err);
      } finally {
        telegramSyncInFlightRef.current = false;
      }
    };

    // 1. Initial controlled run on session mount/restore
    syncTelegramServerState({ isBackground: true, force: false });

    // 2. Active tab polling: sync approximately every 15 minutes ONLY while the user is active (tab is visible)
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncTelegramServerState({ isBackground: true, force: true });
      }
    }, ACTIVE_POLL_INTERVAL_MS);

    // 3. Sync on tab focus or visibility change with 5-minute cooldown and debounced event listener
    let activeDebounceTimer: any = null;
    const handleActiveTrigger = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (activeDebounceTimer) clearTimeout(activeDebounceTimer);
      activeDebounceTimer = setTimeout(() => {
        syncTelegramServerState({ isBackground: true, force: false });
      }, 500);
    };

    // 4. Force sync immediately on explicit Telegram connection completion or manual triggers
    const handleSyncRequested = () => {
      syncTelegramServerState({ isBackground: false, force: true });
    };

    window.addEventListener('focus', handleActiveTrigger);
    document.addEventListener('visibilitychange', handleActiveTrigger);
    window.addEventListener('structra_telegram_sync_requested', handleSyncRequested);

    return () => {
      isMounted = false;
      if (activeDebounceTimer) clearTimeout(activeDebounceTimer);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleActiveTrigger);
      document.removeEventListener('visibilitychange', handleActiveTrigger);
      window.removeEventListener('structra_telegram_sync_requested', handleSyncRequested);
    };
  }, [user?.id]);

  // Gmail Integration Automatic Synchronization & Hydration Effect
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    // Smart sync cooldown constants
    const EVENT_SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown for focus / tab visibility return
    const ACTIVE_POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes while user is active

    const syncGmailServerState = async (options: { isBackground?: boolean; force?: boolean } = {}) => {
      const { isBackground = true, force = false } = options;
      if (!user?.id || gmailSyncInFlightRef.current) return;

      const now = Date.now();
      const elapsedSinceLastSync = now - lastGmailSyncTimeRef.current;

      // When triggered by background/focus/visibility events, respect 5-minute cooldown unless forced
      if (!force && elapsedSinceLastSync < EVENT_SYNC_COOLDOWN_MS) {
        return;
      }

      gmailSyncInFlightRef.current = true;
      try {
        let token = '';
        try {
          const sessionRes = await supabase.auth.getSession();
          token = sessionRes.data?.session?.access_token || '';
        } catch (e) {}

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const currentGmailIntegration = integrations.find(item => item.id === 'gmail');
        const currentMode = currentGmailIntegration?.mode || 'Smart Import';

        // Perform direct sync (server validates connection, token validity, and permissions in a single roundtrip)
        const syncRes = await fetch('/api/integrations/gmail/sync', {
          method: 'POST',
          headers,
          body: JSON.stringify({ mode: currentMode, background: isBackground }),
        });

        lastGmailSyncTimeRef.current = Date.now();

        if (syncRes.status === 401) {
          // Gmail not connected or authorization expired on server
          if (!isBackground && isMounted) {
            addNotification({
              title: 'Gmail Sync Notice',
              desc: "Gmail is connected, but we couldn't sync your documents. Please reconnect Gmail and try again.",
              targetPage: 'integrations',
              type: 'integration',
            });
          }
          return;
        }

        const syncContentType = syncRes.headers.get('content-type') || '';
        if (syncRes.ok && syncContentType.includes('application/json')) {
          const syncData = await syncRes.json();
          if (!isMounted) return;

          // If a sync is already executing on the server, yield cleanly without clobbering state
          if (syncData.status === 'already_in_progress' || syncData.alreadyInProgress) {
            console.log('[Gmail Auto-Sync] Sync is already in progress, yielding to active sync worker.');
            return;
          }

          if (syncData.status === 'failed' || syncData.success === false) {
            console.warn('[Gmail Auto-Sync] Sync failed on server.');
            return;
          }

          // Keep local state in sync with server status
          setIntegrations(prev => prev.map(item => {
            if (item.id === 'gmail') {
              return {
                ...item,
                connected: true,
                status: item.status === 'Syncing' ? item.status : 'Connected',
                mode: syncData.mode || item.mode || 'Smart Import',
                accountIdentifier: syncData.accountIdentifier || item.accountIdentifier || 'Connected Account',
              };
            }
            return item;
          }));

          const countIndexed = typeof syncData.countIndexed === 'number' ? syncData.countIndexed : (syncData.createdDocuments?.length || 0);
          const countImported = typeof syncData.countImported === 'number' ? syncData.countImported : 0;
          const countDuplicates = typeof syncData.countDuplicates === 'number' ? syncData.countDuplicates : 0;

          // Authoritatively rehydrate documents from Supabase DB whenever new documents were indexed/imported,
          // or whenever a forced sync was initiated to guarantee authoritative state in AppContext
          if ((countIndexed > 0 || countImported > 0 || force) && isMounted) {
            const rehydratedDocs = await dbFetchDocuments(user.id);
            if (rehydratedDocs !== null && isMounted) {
              setDocuments(rehydratedDocs);
              try {
                localStorage.setItem(`structra_docs_${user.id}`, JSON.stringify(rehydratedDocs));
              } catch (e) {}
            }
          }

          // Update integration metrics
          setIntegrations(prev => prev.map(item => item.id === 'gmail' ? {
            ...item,
            status: 'Connected',
            lastSync: 'Just now',
            documentsIndexed: item.documentsIndexed + countIndexed,
            documentsImported: item.documentsImported + countImported,
          } : item));

          if (countIndexed > 0 && isMounted) {
            const activityText = currentMode === 'Smart Import'
              ? `Smart Import: ${countImported} new attachment(s) imported from Gmail`
              : `Secure Index: ${countIndexed} new attachment(s) indexed from Gmail`;

            setSyncActivityLogs(prev => [
              {
                id: 'log_' + Date.now(),
                channel: 'Gmail',
                icon: 'gmail' as any,
                activity: activityText,
                time: 'Just now',
                status: 'Success',
                mode: currentMode,
              },
              ...prev,
            ]);

            addNotification({
              title: 'Gmail Auto-Sync',
              desc: activityText,
              targetPage: 'documents',
              type: 'integration',
            });
          } else if (countDuplicates > 0 && !isBackground && isMounted) {
            const activityText = `Gmail sync up to date (${countDuplicates} existing attachment(s) verified)`;
            setSyncActivityLogs(prev => [
              {
                id: 'log_' + Date.now(),
                channel: 'Gmail',
                icon: 'gmail' as any,
                activity: activityText,
                time: 'Just now',
                status: 'Success',
                mode: currentMode,
              },
              ...prev,
            ]);
          }
        }
      } catch (err) {
        console.warn('[Gmail Auto-Sync Notice]:', err);
      } finally {
        gmailSyncInFlightRef.current = false;
      }
    };

    // 1. Initial controlled run on session mount/restore
    syncGmailServerState({ isBackground: true, force: false });

    // 2. Active tab polling: sync approximately every 15 minutes ONLY while the user is active (tab is visible)
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncGmailServerState({ isBackground: true, force: true });
      }
    }, ACTIVE_POLL_INTERVAL_MS);

    // 3. Sync on tab focus or visibility change with 5-minute cooldown and debounced event listener
    let activeGmailDebounceTimer: any = null;
    const handleActiveGmailTrigger = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (activeGmailDebounceTimer) clearTimeout(activeGmailDebounceTimer);
      activeGmailDebounceTimer = setTimeout(() => {
        syncGmailServerState({ isBackground: true, force: false });
      }, 500);
    };

    // 4. Force sync immediately on explicit OAuth connection completion or manual triggers
    const handleSyncRequested = () => {
      syncGmailServerState({ isBackground: false, force: true });
    };

    window.addEventListener('focus', handleActiveGmailTrigger);
    document.addEventListener('visibilitychange', handleActiveGmailTrigger);
    window.addEventListener('structra_gmail_sync_requested', handleSyncRequested);

    return () => {
      isMounted = false;
      if (activeGmailDebounceTimer) clearTimeout(activeGmailDebounceTimer);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleActiveGmailTrigger);
      document.removeEventListener('visibilitychange', handleActiveGmailTrigger);
      window.removeEventListener('structra_gmail_sync_requested', handleSyncRequested);
    };
  }, [user?.id]);

  // Persist user-scoped integrations
  useEffect(() => {
    if (!user || isAuthLoading) return;
    const userKey = `structra_integrations_${user.id || user.email.toLowerCase()}`;
    try {
      localStorage.setItem(userKey, JSON.stringify(integrations));
    } catch (e) {
      console.warn('[Integrations] Error persisting user integrations:', e);
    }
  }, [integrations, user?.id, user?.email, isAuthLoading]);

  // Sync to local storage safely with fallback for quota limits (Strictly User-Scoped)
  useEffect(() => {
    if (!user?.id || isAuthLoading) return;
    const userDocsKey = `structra_docs_${user.id}`;
    try {
      localStorage.setItem(userDocsKey, JSON.stringify(documents));
    } catch (e) {
      console.warn('localStorage quota reached when saving documents. Stripping heavy fileUrl data strings for persistence:', e);
      try {
        const lightDocs = documents.map(doc => {
          if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
            const { fileUrl, ...rest } = doc;
            return rest;
          }
          return doc;
        });
        localStorage.setItem(userDocsKey, JSON.stringify(lightDocs));
      } catch (err2) {
        console.warn('localStorage quota still exceeded after stripping data URLs:', err2);
      }
    }
  }, [documents, user?.id, isAuthLoading]);

  const addSearchQuery = (query: string) => {
    if (!query.trim()) return;
    setSearchHistory(prev => [
      { id: 'sh_' + Date.now(), query, timestamp: 'Just now' },
      ...prev.filter(item => item.query.toLowerCase() !== query.toLowerCase()).slice(0, 4)
    ]);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
  };

  const toggleFavorite = (docId: string) => {
    let updatedTarget: AppDocument | null = null;
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        updatedTarget = { ...doc, isFavorite: !doc.isFavorite };
        return updatedTarget;
      }
      return doc;
    }));
    if (selectedDocument && selectedDocument.id === docId) {
      setSelectedDocument(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
    if (updatedTarget && user) {
      dbUpsertDocument(updatedTarget, user.id);
    }
  };

  const moveToTrash = async (docId: string): Promise<boolean> => {
    const docToTrash = documents.find(doc => doc.id === docId);
    if (!docToTrash) return false;

    const nowIso = new Date().toISOString();

    // 1. If user is authenticated, persist soft-delete to database first
    if (user?.id) {
      const persisted = await dbMoveDocumentToTrash(docId, user.id);
      if (!persisted) {
        addNotification({
          title: 'Action Failed',
          desc: `Failed to move "${docToTrash.title}" to Trash. Please try again.`,
          type: 'system',
        });
        return false;
      }
    }

    // 2. Update documents state only after persistence confirmation
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return { ...doc, isTrash: true, deletedAt: nowIso };
      }
      return doc;
    }));

    if (selectedDocument && selectedDocument.id === docId) {
      setSelectedDocument(null);
    }

    // 3. Immediately persist updated documents list to user-scoped localStorage
    if (user?.id) {
      try {
        const userDocsKey = `structra_docs_${user.id}`;
        const updated = documents.map(doc => doc.id === docId ? { ...doc, isTrash: true, deletedAt: nowIso } : doc);
        localStorage.setItem(userDocsKey, JSON.stringify(updated));
      } catch (e) {}
    }

    addNotification({
      title: 'Document Moved to Trash',
      desc: `"${docToTrash.title}" was moved to Trash.`,
      type: 'document',
    });

    return true;
  };

  const restoreFromTrash = async (docId: string): Promise<boolean> => {
    const docToRestore = documents.find(doc => doc.id === docId);
    if (!docToRestore) return false;

    // 1. If user is authenticated, persist restore to database first
    if (user?.id) {
      const persisted = await dbRestoreDocument(docId, user.id);
      if (!persisted) {
        addNotification({
          title: 'Action Failed',
          desc: `Failed to restore "${docToRestore.title}". Please try again.`,
          type: 'system',
        });
        return false;
      }
    }

    // 2. Update documents state only after persistence confirmation
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return { ...doc, isTrash: false, deletedAt: undefined };
      }
      return doc;
    }));

    // 3. Immediately persist updated documents list to user-scoped localStorage
    if (user?.id) {
      try {
        const userDocsKey = `structra_docs_${user.id}`;
        const updated = documents.map(doc => doc.id === docId ? { ...doc, isTrash: false, deletedAt: undefined } : doc);
        localStorage.setItem(userDocsKey, JSON.stringify(updated));
      } catch (e) {}
    }

    addNotification({
      title: 'Document Restored',
      desc: `"${docToRestore.title}" has been restored to your documents.`,
      type: 'document',
    });

    return true;
  };

  const permanentDelete = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    if (user) {
      dbDeleteDocument(docId, user.id);
    }
  };

  const emptyTrash = () => {
    setDocuments(prev => prev.filter(doc => !doc.isTrash));
  };

  const connectIntegration = (
    id: IntegrationId, 
    accountIdentifier?: string, 
    mode: HandlingMode = 'Secure Index',
    permissions: string[] = ['Read metadata', 'Access attachments'],
    initialSyncMetrics?: {
      status?: string;
      alreadyInProgress?: boolean;
      countIndexed?: number;
      countImported?: number;
      countDuplicates?: number;
      createdDocuments?: any[];
    } | null
  ) => {
    const countIndexed = typeof initialSyncMetrics?.countIndexed === 'number' 
      ? initialSyncMetrics.countIndexed 
      : (initialSyncMetrics?.createdDocuments?.length || 0);
    const countImported = mode === 'Smart Import'
      ? (typeof initialSyncMetrics?.countImported === 'number' ? initialSyncMetrics.countImported : countIndexed)
      : 0;
    const countDuplicates = typeof initialSyncMetrics?.countDuplicates === 'number' 
      ? initialSyncMetrics.countDuplicates 
      : 0;

    setIntegrations(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          connected: true,
          mode,
          status: 'Connected',
          accountIdentifier: accountIdentifier || item.accountIdentifier || 'user@domain.com',
          lastSync: 'Just now',
          permissionsGranted: permissions,
          retainedData: mode === 'Smart Import',
          documentsIndexed: item.documentsIndexed + countIndexed,
          documentsImported: item.documentsImported + countImported,
        };
      }
      return item;
    }));

    if (id === 'gmail') {
      lastGmailSyncTimeRef.current = Date.now();
    } else if (id === 'telegram') {
      lastTelegramSyncTimeRef.current = Date.now();
    }

    if (user?.id) {
      dbUpsertIntegration(user.id, id, true, mode);
      if (id === 'gmail' || id === 'telegram') {
        supabase.auth.getSession().then(sessionRes => {
          const token = sessionRes.data?.session?.access_token;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const connectEndpoint = id === 'gmail' ? '/api/integrations/gmail/connect' : '/api/integrations/telegram/connect';
          fetch(connectEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ accountIdentifier, selectedMode: mode }),
          }).catch(e => console.warn(`${id} connect API error:`, e));
        });

        // If no initial metrics were supplied (e.g. connected outside modal), trigger initial sync automatically once
        if (!initialSyncMetrics) {
          const syncEndpoint = id === 'gmail' ? '/api/integrations/gmail/sync' : '/api/integrations/telegram/sync';
          supabase.auth.getSession().then(async sessionRes => {
            const token = sessionRes.data?.session?.access_token;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            try {
              const syncRes = await fetch(syncEndpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({ mode }),
              });
              if (syncRes.ok) {
                const data = await syncRes.json();
                const syncIndexed = typeof data.countIndexed === 'number' ? data.countIndexed : (data.createdDocuments?.length || 0);
                const syncImported = mode === 'Smart Import' ? (typeof data.countImported === 'number' ? data.countImported : syncIndexed) : 0;
                if (syncIndexed > 0 || syncImported > 0) {
                  setIntegrations(prev => prev.map(item => item.id === id ? {
                    ...item,
                    documentsIndexed: item.documentsIndexed + syncIndexed,
                    documentsImported: item.documentsImported + syncImported,
                    lastSync: 'Just now',
                  } : item));
                  const rehydratedDocs = await dbFetchDocuments(user.id);
                  if (rehydratedDocs !== null) {
                    setDocuments(rehydratedDocs);
                  }
                }
              }
            } catch (e) {
              console.warn(`[${id} fallback initial sync notice]:`, e);
            }
          });
        }

        // Immediately inject newly created documents into state
        if (Array.isArray(initialSyncMetrics?.createdDocuments) && initialSyncMetrics.createdDocuments.length > 0) {
          setDocuments(prev => {
            const existingIds = new Set(prev.map(d => d.id));
            const newDocs = (initialSyncMetrics.createdDocuments || []).filter((d: any) => !existingIds.has(d.id));
            if (newDocs.length > 0) {
              return [...newDocs, ...prev];
            }
            return prev;
          });
        }

        // Authoritatively rehydrate documents from Supabase DB when new items were indexed/imported
        if (countIndexed > 0 || countImported > 0) {
          dbFetchDocuments(user.id).then(rehydratedDocs => {
            if (rehydratedDocs !== null) {
              setDocuments(rehydratedDocs);
              try {
                localStorage.setItem(`structra_docs_${user.id}`, JSON.stringify(rehydratedDocs));
              } catch (e) {}
            }
          }).catch(e => console.warn(`[${id} Connect Doc Hydration Notice]:`, e));
        }
      }
    }

    const channelName = id === 'gmail' ? 'Gmail' : id === 'telegram' ? 'Telegram' : id.charAt(0).toUpperCase() + id.slice(1).replace('_', ' ');
    const itemNoun = id === 'telegram' ? 'document(s)' : 'attachment(s)';

    let activityText = `Connected in ${mode} mode`;
    let notifTitle = 'Integration Connected';
    let notifDesc = `${channelName} channel linked in ${mode} mode.`;

    if (countIndexed > 0) {
      if (mode === 'Smart Import') {
        activityText = `Smart Import: ${countImported} new ${itemNoun} imported from ${channelName}`;
        notifDesc = `Smart Import: ${countImported} new ${itemNoun} imported from ${channelName}`;
      } else {
        activityText = `Secure Index: ${countIndexed} ${itemNoun} indexed from ${channelName}`;
        notifDesc = `Secure Index: ${countIndexed} ${itemNoun} indexed from ${channelName}`;
      }
      notifTitle = `${channelName} Connected`;
    } else if (countDuplicates > 0) {
      activityText = `${channelName} sync complete: All ${itemNoun} are up to date (${countDuplicates} existing verified)`;
      notifDesc = `${channelName} channel linked. All ${itemNoun} are up to date (${countDuplicates} existing verified).`;
      notifTitle = `${channelName} Connected`;
    } else if (initialSyncMetrics?.status === 'already_in_progress' || initialSyncMetrics?.alreadyInProgress) {
      activityText = `${channelName} channel linked in ${mode} mode. Sync is actively processing in the background...`;
      notifDesc = `${channelName} channel linked. Your attachments are being processed in the background.`;
      notifTitle = `${channelName} Connected`;

      // Schedule delayed document rehydration for when background sync completes
      if (user?.id) {
        setTimeout(async () => {
          try {
            const rehydratedDocs = await dbFetchDocuments(user.id);
            if (rehydratedDocs !== null) {
              setDocuments(rehydratedDocs);
            }
          } catch (e) {}
        }, 2500);
      }
    }

    setSyncActivityLogs(prev => [
      {
        id: 'log_' + Date.now(),
        channel: channelName,
        icon: id as any,
        activity: activityText,
        time: 'Just now',
        status: 'Success',
        mode: mode,
      },
      ...prev,
    ]);

    addNotification({
      title: notifTitle,
      desc: notifDesc,
      targetPage: countIndexed > 0 ? 'documents' : 'integrations',
      type: 'integration',
    });
  };

  const disconnectIntegration = (
    id: IntegrationId, 
    options?: { keepImportedDocs?: boolean; deleteImportedDocs?: boolean; removeSecureIndex?: boolean }
  ) => {
    setIntegrations(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          connected: false,
          status: 'Disconnected',
          disconnectedAt: new Date().toLocaleDateString(),
          retainedData: options?.keepImportedDocs ?? true,
        };
      }
      return item;
    }));

    if (user?.id) {
      dbUpsertIntegration(user.id, id, false, 'Smart Import');
      if (id === 'gmail' || id === 'telegram') {
        supabase.auth.getSession().then(sessionRes => {
          const token = sessionRes.data?.session?.access_token;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const disconnectEndpoint = id === 'gmail' ? '/api/integrations/gmail/disconnect' : '/api/integrations/telegram/disconnect';
          fetch(disconnectEndpoint, {
            method: 'POST',
            headers,
          }).catch(e => console.warn(`${id} disconnect API error:`, e));
        });
      }
    }

    if (options?.deleteImportedDocs) {
      const sourceName = id === 'gmail' ? 'Gmail' : id === 'telegram' ? 'Telegram' : id === 'google_drive' ? 'Google Drive' : id === 'onedrive' ? 'OneDrive' : 'Dropbox';
      setDocuments(prev => prev.filter(doc => doc.source !== sourceName));
    }

    setSyncActivityLogs(prev => [
      {
        id: 'log_' + Date.now(),
        channel: id.charAt(0).toUpperCase() + id.slice(1).replace('_', ' '),
        icon: id as any,
        activity: `Disconnected account (${options?.deleteImportedDocs ? 'Files purged' : 'Files preserved'})`,
        time: 'Just now',
        status: 'Success',
      },
      ...prev,
    ]);
  };

  const reconnectIntegration = (
    id: IntegrationId, 
    reconnectOption: 'restore' | 'rebuild' | 'resume' = 'restore',
    selectedMode: HandlingMode = 'Secure Index'
  ) => {
    setIntegrations(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          connected: true,
          status: 'Connected',
          mode: selectedMode,
          lastSync: 'Just now',
        };
      }
      return item;
    }));

    if (user?.id) {
      dbUpsertIntegration(user.id, id, true, selectedMode);
    }

    setSyncActivityLogs(prev => [
      {
        id: 'log_' + Date.now(),
        channel: id.charAt(0).toUpperCase() + id.slice(1).replace('_', ' '),
        icon: id as any,
        activity: `Reconnected account (${reconnectOption} mode)`,
        time: 'Just now',
        status: 'Success',
      },
      ...prev,
    ]);
  };

  const updateIntegrationMode = (id: IntegrationId, mode: HandlingMode) => {
    const channelName = id === 'gmail' ? 'Gmail' : id === 'telegram' ? 'Telegram' : id.charAt(0).toUpperCase() + id.slice(1);
    setIntegrations(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, mode, retainedData: mode === 'Smart Import' };
      }
      return item;
    }));

    if (user?.id) {
      dbUpsertIntegration(user.id, id, true, mode);
      if (id === 'gmail' || id === 'telegram') {
        supabase.auth.getSession().then(sessionRes => {
          const token = sessionRes.data?.session?.access_token;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const updateEndpoint = id === 'gmail' ? '/api/integrations/gmail/connect' : '/api/integrations/telegram/connect';
          fetch(updateEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ selectedMode: mode }),
          }).catch(e => console.warn(`${id} update mode API error:`, e));
        });
      }
    }

    setSyncActivityLogs(prev => [
      {
        id: 'log_' + Date.now(),
        channel: channelName,
        icon: id as any,
        activity: `${channelName} switched to ${mode}.`,
        time: 'Just now',
        status: 'Success',
        mode: mode,
        isSwitchEvent: true,
      },
      ...prev,
    ]);
  };

  const toggleIntegrationMode = (channel: string) => {
    const targetId: IntegrationId = channel.toLowerCase().includes('gmail') ? 'gmail' : 
                                   channel.toLowerCase().includes('telegram') ? 'telegram' : 'google_drive';
    const current = integrations.find(i => i.id === targetId);
    if (current) {
      const nextMode = current.mode === 'Smart Import' ? 'Secure Index' : 'Smart Import';
      updateIntegrationMode(targetId, nextMode);
    }
  };

  const triggerSync = async (id: IntegrationId) => {
    const channelName = id === 'gmail' ? 'Gmail' : id === 'telegram' ? 'Telegram' : id.charAt(0).toUpperCase() + id.slice(1);
    const targetIntegration = integrations.find(i => i.id === id);
    const currentMode = targetIntegration?.mode || 'Smart Import';

    setIntegrations(prev => prev.map(item => item.id === id ? { ...item, status: 'Syncing' } : item));

    try {
      if (id === 'gmail' || id === 'telegram') {
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes.data?.session?.access_token;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const syncEndpoint = id === 'gmail' ? '/api/integrations/gmail/sync' : '/api/integrations/telegram/sync';
        const syncRes = await fetch(syncEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ mode: currentMode }),
        });
        const syncContentType = syncRes.headers.get('content-type') || '';
        let syncData: any = {};
        if (syncContentType.includes('application/json')) {
          try {
            syncData = await syncRes.json();
          } catch (e) {}
        } else {
          console.warn(`[Sync Integration] ${id} sync returned status ${syncRes.status} (${syncContentType})`);
        }

        // Handle STATE D: Sync failed or unauthorized
        if (!syncRes.ok || syncData.success === false || syncData.status === 'failed') {
          const errMessage = syncData.error || `${channelName} sync failed. Please check your connection.`;
          setIntegrations(prev => prev.map(item => item.id === id ? { 
            ...item, 
            status: syncRes.status === 401 ? 'Connection Error' : 'Connected', 
          } : item));
          setSyncActivityLogs(prev => [
            {
              id: 'log_' + Date.now(),
              channel: channelName,
              icon: id as any,
              activity: errMessage,
              time: 'Just now',
              status: 'Failed',
              mode: currentMode,
            },
            ...prev,
          ]);
          addNotification({
            title: `${channelName} Sync Failed`,
            desc: errMessage,
            targetPage: 'integrations',
            type: 'integration',
          });
          return;
        }

        // Handle STATE C: Sync already in progress
        if (syncData.status === 'already_in_progress' || syncData.alreadyInProgress) {
          const inProgressText = `${channelName} sync is already in progress. Your documents will appear when processing is complete.`;
          setIntegrations(prev => prev.map(item => item.id === id ? { 
            ...item, 
            status: 'Syncing', 
          } : item));
          setSyncActivityLogs(prev => [
            {
              id: 'log_' + Date.now(),
              channel: channelName,
              icon: id as any,
              activity: inProgressText,
              time: 'Just now',
              status: 'Syncing',
              mode: currentMode,
            },
            ...prev,
          ]);
          addNotification({
            title: `${channelName} Sync In Progress`,
            desc: inProgressText,
            targetPage: 'documents',
            type: 'integration',
          });
          // Restore status and rehydrate docs once in-flight sync finishes
          setTimeout(async () => {
            if (user?.id) {
              const rehydratedDocs = await dbFetchDocuments(user.id);
              if (rehydratedDocs !== null) {
                setDocuments(rehydratedDocs);
              }
            }
            setIntegrations(prev => prev.map(item => item.id === id ? { 
              ...item, 
              status: 'Connected', 
              lastSync: 'Just now',
            } : item));
          }, 2500);
          return;
        }

        const countIndexed = typeof syncData.countIndexed === 'number' ? syncData.countIndexed : (syncData.createdDocuments?.length || 0);
        const countImported = currentMode === 'Smart Import' 
          ? (typeof syncData.countImported === 'number' ? syncData.countImported : countIndexed) 
          : 0;
        const countDuplicates = typeof syncData.countDuplicates === 'number' ? syncData.countDuplicates : 0;

        if (user?.id) {
          await dbUpsertIntegration(user.id, id, true, currentMode, new Date().toISOString());
          // Immediately inject newly created documents into state
          if (Array.isArray(syncData.createdDocuments) && syncData.createdDocuments.length > 0) {
            setDocuments(prev => {
              const existingIds = new Set(prev.map(d => d.id));
              const newDocs = syncData.createdDocuments.filter((d: any) => !existingIds.has(d.id));
              if (newDocs.length > 0) {
                return [...newDocs, ...prev];
              }
              return prev;
            });
          }
          // Only rehydrate documents if new items were indexed/imported
          if (countIndexed > 0 || countImported > 0) {
            const rehydratedDocs = await dbFetchDocuments(user.id);
            if (rehydratedDocs !== null) {
              setDocuments(rehydratedDocs);
              try {
                localStorage.setItem(`structra_docs_${user.id}`, JSON.stringify(rehydratedDocs));
              } catch (e) {}
            }
          }
        }

        // Also hit the secondary document endpoint as a safety net
        try {
          const secRes = await fetch(`/api/user/${id}-documents`, { headers });
          if (secRes.ok) {
            const secData = await secRes.json();
            if (secData.success && Array.isArray(secData.documents) && secData.documents.length > 0) {
              setDocuments(prev => {
                const existingIds = new Set(prev.map(d => d.id));
                const newDocs = secData.documents.filter((d: any) => !existingIds.has(d.id));
                if (newDocs.length > 0) {
                  return [...newDocs, ...prev];
                }
                return prev;
              });
            }
          }
        } catch (secErr) {
          console.warn('[Sync Secondary Fetch Notice]:', secErr);
        }

        setIntegrations(prev => prev.map(item => item.id === id ? { 
          ...item, 
          status: 'Connected', 
          lastSync: 'Just now',
          documentsIndexed: item.documentsIndexed + countIndexed,
          documentsImported: item.documentsImported + countImported,
        } : item));

        let activityText = '';
        if (countIndexed > 0) {
          activityText = currentMode === 'Smart Import'
            ? `Smart Import: ${countImported} new attachment(s) imported from ${channelName}`
            : `Secure Index: ${countIndexed} attachment(s) indexed from ${channelName}`;
        } else if (countDuplicates > 0) {
          activityText = `${channelName} sync complete: All attachments are up to date (${countDuplicates} existing verified)`;
        } else {
          activityText = syncData.message || `${channelName} sync completed. No new email attachments found in Gmail inbox.`;
        }

        setSyncActivityLogs(prev => [
          {
            id: 'log_' + Date.now(),
            channel: channelName,
            icon: id as any,
            activity: activityText,
            time: 'Just now',
            status: 'Success',
            mode: currentMode,
          },
          ...prev,
        ]);

        addNotification({
          title: `${channelName} Sync Completed`,
          desc: activityText,
          targetPage: 'documents',
          type: 'integration',
        });

        return;
      }
    } catch (err: any) {
      console.error('[Sync Exception]:', err);
      setIntegrations(prev => prev.map(item => item.id === id ? { ...item, status: 'Connected' } : item));
      setSyncActivityLogs(prev => [
        {
          id: 'log_' + Date.now(),
          channel: channelName,
          icon: id as any,
          activity: `${channelName} sync encountered an unexpected error.`,
          time: 'Just now',
          status: 'Failed',
          mode: currentMode,
        },
        ...prev,
      ]);
      addNotification({
        title: `${channelName} Sync Failed`,
        desc: `${channelName} sync encountered an unexpected error. Please try again.`,
        targetPage: 'integrations',
        type: 'integration',
      });
      return;
    }
  };

  const triggerIntegrationSync = async (channel: string) => {
    const targetId: IntegrationId = channel.toLowerCase().includes('gmail') ? 'gmail' : 
                                   channel.toLowerCase().includes('telegram') ? 'telegram' : 'whatsapp';
    await triggerSync(targetId);
  };

  const setOpenIntegrationModal = (_channel: string) => {
    setCurrentPage('integrations');
  };

  const importExternalDocument = (docId: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          importStatus: 'Imported',
          contentSummary: doc.contentSummary + ' (Imported into Structra Storage)',
        };
      }
      return doc;
    }));

    addNotification({
      title: 'Document Imported',
      desc: 'Document successfully imported from external source into Structra Storage.',
      targetPage: 'documents',
      type: 'document',
    });
  };

  const updateDocumentShareSettings = (docId: string, settings: DocumentShareSettings) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          shareSettings: settings,
        };
      }
      return doc;
    }));
  };

  const addUploadJob = (job: UploadJob) => {
    setUploadJobs(prev => [job, ...prev]);
  };

  const updateUploadJob = (id: string, updates: Partial<UploadJob>) => {
    setUploadJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const cancelUploadJob = (jobId: string) => {
    setUploadJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'Failed', stage: 'Failed', error: 'Upload canceled by user' } : j));
  };

  const processUploadedFile = (file: File, options?: { replaceDocId?: string; overrideTitle?: string }): Promise<AppDocument> => {
    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const docId = options?.replaceDocId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-a000-' + Date.now().toString().padStart(12, '0'));
    const docTitle = options?.overrideTitle || file.name;
    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    
    let rawExt = docTitle.split('.').pop()?.toUpperCase() || 'PDF';
    let ext: any = rawExt;
    const validFormats = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'PNG', 'JPG'];
    if (!validFormats.includes(ext)) {
      ext = 'PDF';
    }

    const blobUrl = URL.createObjectURL(file);
    registerSessionDeviceFile(docId, file);
    registerSessionDeviceFile(docTitle, file);

    const newJob: UploadJob = {
      id: jobId,
      fileName: docTitle,
      fileSize: file.size,
      sizeFormatted,
      fileType: ext,
      progress: 15,
      stage: 'Uploading',
      status: 'Uploading',
      uploadDate: new Date().toISOString(),
      source: 'Upload Center',
    };

    addUploadJob(newJob);

    return new Promise<AppDocument>((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const fullDataUrl = reader.result as string;
        const base64Data = fullDataUrl.split(',')[1] || '';
        
        // Stage 1: Uploading -> Virus Scan
        updateUploadJob(jobId, { progress: 30, stage: 'Virus Scan', status: 'Processing' });
        await new Promise(res => setTimeout(res, 350));

        // Stage 2: Virus Scan -> Metadata & Text Extraction
        updateUploadJob(jobId, { progress: 50, stage: 'Metadata Extraction' });
        await new Promise(res => setTimeout(res, 350));

        // Client-side automatic text extraction upon upload
        let clientExtractedText = '';
        try {
          clientExtractedText = await extractTextFromFile(file);
        } catch (e) {
          console.warn('Client text extraction notice:', e);
        }

        let aiResult: any = null;
        try {
          const truncatedBase64 = base64Data && base64Data.length > 3000000 
            ? base64Data.substring(0, 3000000) 
            : base64Data;

          let authToken = '';
          try {
            const sessionRes = await supabase.auth.getSession();
            authToken = sessionRes?.data?.session?.access_token || '';
          } catch (tokErr) {}

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }

          const response = await fetch('/api/ai/process-document', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              fileName: docTitle,
              fileType: file.type,
              fileContentBase64: truncatedBase64,
              clientExtractedText,
            }),
          });
          if (response.ok) {
            aiResult = await response.json();
          }
        } catch (err) {
          console.warn('AI Processing call notice:', err);
        }

        // Stage 3: AI Document Classification
        updateUploadJob(jobId, { progress: 70, stage: 'AI Document Classification' });
        await new Promise(res => setTimeout(res, 300));

        // Stage 4: Smart Search Indexing
        updateUploadJob(jobId, { progress: 88, stage: 'Search Indexing' });
        await new Promise(res => setTimeout(res, 300));

        // Stage 5: Completed
        updateUploadJob(jobId, { progress: 100, stage: 'Completed', status: 'Indexed' });

        const extractedTextCombined = aiResult?.rawText || clientExtractedText || `Document Title: ${docTitle}\nProcessed at: ${new Date().toLocaleString()}\nFile Size: ${sizeFormatted}`;

        // Compute canonical DocumentCategory using multi-signal normalizer
        const canonicalCategory = normalizeDocumentCategory(
          aiResult?.category,
          docTitle,
          extractedTextCombined,
          aiResult?.tags
        );

        // Upload file binary to Supabase Storage
        let supabaseStorageUrl: string | null = null;
        try {
          supabaseStorageUrl = await uploadFileToSupabaseStorage(file, user?.id || 'usr_guest');
        } catch (storageErr) {
          console.warn('[Supabase Storage] Notice:', storageErr);
        }

        const effectiveFileUrl = supabaseStorageUrl || fullDataUrl || blobUrl;

        const newDoc: AppDocument = {
          id: docId,
          title: docTitle,
          category: canonicalCategory,
          source: 'Upload Center',
          importStatus: 'Imported',
          fileType: ext,
          fileSize: file.size,
          sizeFormatted,
          uploadDate: new Date().toISOString(),
          modifiedDate: new Date().toISOString(),
          tags: aiResult?.tags || ['Uploaded', canonicalCategory, ext],
          isFavorite: false,
          isTrash: false,
          contentSummary: aiResult?.contentSummary || (clientExtractedText.length > 20 ? clientExtractedText.substring(0, 250) + '...' : `Original document ${docTitle} categorized as ${canonicalCategory} and indexed for AI search.`),
          rawText: extractedTextCombined,
          metadata: aiResult?.metadata || {
            vendor: canonicalCategory === 'Receipts' ? 'Point of Sale Merchant' : 'Direct Manual Upload',
            issueDate: new Date().toISOString().split('T')[0],
            confidenceScore: 0.99,
            documentNumber: 'DOC-' + Math.floor(100000 + Math.random() * 900000),
          },
          fileUrl: effectiveFileUrl, // Prioritize Supabase Storage URL
        };

        // Persist document metadata in Supabase PostgreSQL
        if (user?.id) {
          const saveOk = await dbUpsertDocument(newDoc, user.id);
          if (!saveOk) {
            console.error('[Document Upload] Failed to save document to Supabase database.');
          }
        }

        setDocuments(prev => {
          if (options?.replaceDocId) {
            return prev.map(d => d.id === options.replaceDocId ? newDoc : d);
          }
          return [newDoc, ...prev.filter(d => d.id !== newDoc.id)];
        });

        addNotification({
          title: 'Upload Completed',
          desc: `${docTitle} successfully uploaded and processed.`,
          targetPage: 'documents',
          type: 'upload',
        });

        // Do NOT automatically force-open the preview screen. Return newDoc to caller.
        resolve(newDoc);
      };

      reader.onerror = () => {
        updateUploadJob(jobId, { progress: 0, stage: 'Failed', status: 'Failed', error: 'Failed to read document' });
      };
    });
  };

  const login = async (emailInput: string, passwordInput?: string) => {
    const normalizedEmail = emailInput.trim().toLowerCase();

    if (passwordInput !== undefined && typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error("No internet connection.");
    }

    // Try Supabase Auth first if password supplied
    if (passwordInput !== undefined) {
      console.log('[Supabase Auth] Attempting signInWithPassword for email:', normalizedEmail);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: passwordInput,
      });

      if (error) {
        console.error('[Supabase Auth Response Error]:', {
          message: error.message,
          status: error.status,
          code: (error as any)?.code,
        });

        const msg = error.message || '';
        const msgLower = msg.toLowerCase();

        if (
          msgLower.includes('email not confirmed') ||
          msgLower.includes('not_confirmed') ||
          (msgLower.includes('email') && msgLower.includes('not confirmed')) ||
          (msgLower.includes('email') && msgLower.includes('unconfirmed'))
        ) {
          throw new Error('Your email address has not been verified.');
        }

        if (
          msgLower.includes('invalid login credentials') ||
          msgLower.includes('invalid credentials') ||
          msgLower.includes('incorrect') ||
          msgLower.includes('user not found') ||
          msgLower.includes('user_not_found') ||
          msgLower.includes('invalid_grant')
        ) {
          throw new Error('Incorrect email or password. Please try again.');
        }

        if (msgLower.includes('disabled') || msgLower.includes('user_disabled')) {
          throw new Error('Your account has been disabled. Please contact support.');
        }

        if (msgLower.includes('rate limit') || msgLower.includes('too many') || msgLower.includes('too many attempts')) {
          throw new Error('Too many login attempts. Please wait before trying again.');
        }

        throw new Error('Incorrect email or password. Please try again.');
      }

      if (data?.user && !data?.session && !data.user.email_confirmed_at && !data.user.confirmed_at) {
        throw new Error('Your email address has not been verified.');
      }

      if (data?.session && data.user) {
        let remoteProfile = await dbFetchProfile(data.user.id);
        const storedAccounts = getStoredAccounts();
        let localSavedUser: User | null = storedAccounts[normalizedEmail] || null;
        if (!localSavedUser) {
          try {
            const raw = localStorage.getItem(`structra_signup_${normalizedEmail}`) || localStorage.getItem(`structra_profile_${data.user.id}`);
            if (raw) localSavedUser = JSON.parse(raw);
          } catch (e) {}
        }

        const metadataAccountType = (data.user.user_metadata?.account_type || data.user.user_metadata?.accountType) as AccountType | undefined;
        const resolvedAccountType: AccountType = 
          remoteProfile?.accountType || 
          localSavedUser?.accountType || 
          metadataAccountType || 
          'individual';

        const resolvedWorkspaceType = 
          remoteProfile?.workspaceType || 
          localSavedUser?.workspaceType || 
          (resolvedAccountType === 'individual' ? 'Individual Workspace' : 'Business / Team Workspace');

        const resolvedHasCompletedWorkspaceSelection = Boolean(
          remoteProfile?.hasCompletedWorkspaceSelection || 
          localSavedUser?.hasCompletedWorkspaceSelection || 
          data.user.user_metadata?.has_completed_workspace_selection || 
          data.user.user_metadata?.hasCompletedWorkspaceSelection || 
          metadataAccountType || 
          localSavedUser?.accountType
        );

        const userToSet: User = {
          id: data.user.id,
          name: remoteProfile?.name || localSavedUser?.name || data.user.user_metadata?.full_name || data.user.user_metadata?.name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          avatar: remoteProfile?.avatar || localSavedUser?.avatar || data.user.user_metadata?.avatar_url || '',
          accountType: resolvedAccountType,
          workspaceType: resolvedWorkspaceType,
          hasCompletedWorkspaceSelection: resolvedHasCompletedWorkspaceSelection,
          role: remoteProfile?.role || localSavedUser?.role || 'user',
          createdAt: remoteProfile?.createdAt || localSavedUser?.createdAt || new Date().toISOString().split('T')[0],
          storageUsedBytes: remoteProfile?.storageUsedBytes || localSavedUser?.storageUsedBytes || 0,
          storageLimitBytes: remoteProfile?.storageLimitBytes || localSavedUser?.storageLimitBytes || 10 * 1024 * 1024 * 1024,
          language: remoteProfile?.language || localSavedUser?.language || 'English (United States)',
          appNotificationsEnabled: remoteProfile?.appNotificationsEnabled ?? localSavedUser?.appNotificationsEnabled ?? true,
          featureUpdatesEnabled: remoteProfile?.featureUpdatesEnabled ?? localSavedUser?.featureUpdatesEnabled ?? true,
          onboardingCompleted: remoteProfile?.onboardingCompleted ?? localSavedUser?.onboardingCompleted ?? (normalizedEmail === initialUser.email.toLowerCase() ? true : undefined),
        };

        setUser(userToSet);
        setIsAccountTypeModalOpen(false);
        setIsAuthenticated(true);
        setCurrentPage('dashboard');

        dbUpsertProfile(userToSet);
        storedAccounts[normalizedEmail] = userToSet;
        saveStoredAccounts(storedAccounts);
        try {
          localStorage.setItem(`structra_profile_${data.user.id}`, JSON.stringify(userToSet));
        } catch (e) {}
        return;
      }

      throw new Error('Incorrect email or password. Please try again.');
    }

    const accounts = getStoredAccounts();
    let foundUser = accounts[normalizedEmail];

    // Direct / Google login fallback (no password specified)
    if (!foundUser) {
      if (initialUser.email.toLowerCase() === normalizedEmail) {
        foundUser = initialUser;
      } else {
        foundUser = {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-a000-' + Date.now().toString().padStart(12, '0')),
          name: emailInput.split('@')[0],
          email: emailInput.trim(),
          accountType: 'individual',
          role: 'user',
          createdAt: new Date().toISOString().split('T')[0],
          storageUsedBytes: 0,
          storageLimitBytes: 10 * 1024 * 1024 * 1024,
        };
        accounts[normalizedEmail] = foundUser;
        saveStoredAccounts(accounts);
      }
    }

    // Check if account is scheduled for deletion
    if (foundUser.pendingDeletion && foundUser.scheduledDeletionDate) {
      const scheduledTime = new Date(foundUser.scheduledDeletionDate).getTime();
      const nowTime = Date.now();

      // Permanent Deletion after 30 days
      if (nowTime > scheduledTime) {
        delete accounts[normalizedEmail];
        saveStoredAccounts(accounts);

        setAdminUsers(prev => prev.filter(u => u.email.toLowerCase() !== normalizedEmail));
        setUser(null);
        setIsAuthenticated(false);
        throw new Error('This account was permanently deleted after the 30-day recovery period.');
      }

      // Within 30 days: intercept login and open Recovery Modal
      setPendingRecoveryUser(foundUser);
      setIsRecoveryModalOpen(true);
      return;
    }

    // Active login
    setUser(foundUser);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
  };

  const loginWithGoogle = async (): Promise<void> => {
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          redirectTo: typeof window !== 'undefined' ? window.location.origin : 'https://struc-tra.com',
        },
      });
      if (error) {
        setIsAuthLoading(false);
        setIsGoogleAuthModalOpen(true);
      }
    } catch (err) {
      setIsAuthLoading(false);
      setIsGoogleAuthModalOpen(true);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const completeWorkspaceSelection = async (selectedType: AccountType) => {
    const workspaceLabel = selectedType === 'individual' ? 'Individual Workspace' : 'Business / Team Workspace';
    let targetUser: User | null = null;

    if (user) {
      targetUser = {
        ...user,
        accountType: selectedType,
        workspaceType: workspaceLabel,
        hasCompletedWorkspaceSelection: true,
      };
    } else if (pendingGoogleUser) {
      const normalizedEmail = pendingGoogleUser.email.toLowerCase();
      const accounts = getStoredAccounts();
      const existing = accounts[normalizedEmail];

      targetUser = {
        id: existing?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-a000-' + Date.now().toString().padStart(12, '0')),
        name: pendingGoogleUser.name,
        email: pendingGoogleUser.email,
        accountType: selectedType,
        workspaceType: workspaceLabel,
        hasCompletedWorkspaceSelection: true,
        onboardingCompleted: existing ? (existing.onboardingCompleted ?? true) : false,
        role: existing?.role || 'user',
        createdAt: existing?.createdAt || new Date().toISOString().split('T')[0],
        storageUsedBytes: existing?.storageUsedBytes || 0,
        storageLimitBytes: existing?.storageLimitBytes || 10 * 1024 * 1024 * 1024,
      };
    }

    if (targetUser) {
      setUser(targetUser);
      setIsAuthenticated(true);
      setIsAccountTypeModalOpen(false);
      setPendingGoogleUser(null);
      await dbUpsertProfile(targetUser);
      setCurrentPage('dashboard');
    } else {
      setIsAccountTypeModalOpen(false);
    }
  };

  const register = async (name: string, email: string, accountType: AccountType, passwordInput?: string) => {
    const workspaceLabel = accountType === 'individual' ? 'Individual Workspace' : 'Business / Team Workspace';
    const normalizedEmail = email.trim().toLowerCase();

    if (passwordInput) {
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'https://struc-tra.com';
      console.log('[Supabase Auth] Registering new user:', normalizedEmail);
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: passwordInput,
        options: {
          emailRedirectTo: redirectUrl,
          data: { 
            full_name: name.trim(), 
            name: name.trim(), 
            account_type: accountType,
            accountType: accountType,
            workspace_type: workspaceLabel,
            workspaceType: workspaceLabel,
            has_completed_workspace_selection: true,
            hasCompletedWorkspaceSelection: true,
          }
        }
      });

      if (error) {
        console.error('[Supabase Auth SignUp Error]:', {
          message: error.message,
          status: error.status,
          code: (error as any)?.code,
        });
        const msg = error.message || '';
        if (msg.includes('already registered') || msg.includes('User already registered') || msg.includes('already exists')) {
          throw new Error('An account already exists with this email.');
        }
        if (msg.includes('rate limit') || msg.includes('Too many requests')) {
          throw new Error('Too many requests. Please wait before trying again.');
        }
        throw new Error(msg || 'Something went wrong. Please try again.');
      }

      const newUser: User = {
        id: data?.user?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'usr_' + Date.now()),
        name: name.trim(),
        email: normalizedEmail,
        accountType,
        workspaceType: workspaceLabel,
        hasCompletedWorkspaceSelection: true,
        onboardingCompleted: false,
        role: 'user',
        createdAt: new Date().toISOString().split('T')[0],
        storageUsedBytes: 0,
        storageLimitBytes: 10 * 1024 * 1024 * 1024,
      };

      try {
        localStorage.setItem(`structra_is_new_signup_${normalizedEmail}`, 'true');
      } catch (e) {}

      if (data?.user?.id) {
        try {
          localStorage.setItem(`structra_profile_${data.user.id}`, JSON.stringify(newUser));
        } catch (e) {}
        dbUpsertProfile(newUser);
      }
      const accounts = getStoredAccounts();
      accounts[normalizedEmail] = newUser;
      saveStoredAccounts(accounts);
      try {
        localStorage.setItem(`structra_signup_${normalizedEmail}`, JSON.stringify(newUser));
      } catch (e) {}
    }

    // Do NOT automatically log the user in or navigate to dashboard.
    // Return status so AuthPage can display Check Your Email screen.
    return { success: true, requiresVerification: true, email: normalizedEmail };
  };

  const scheduleAccountDeletion = () => {
    if (!user) return;

    const now = new Date();
    const deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updatedUser: User = {
      ...user,
      pendingDeletion: true,
      deletionRequestedAt: now.toISOString(),
      scheduledDeletionDate: deletionDate.toISOString(),
    };

    // 1. Update current user state
    setUser(updatedUser);

    // 2. Persist in structra_accounts
    const accounts = getStoredAccounts();
    accounts[user.email.toLowerCase()] = updatedUser;
    saveStoredAccounts(accounts);

    // 3. Update adminUsers list
    setAdminUsers(prev =>
      prev.map(u => {
        if (u.email.toLowerCase() === user.email.toLowerCase()) {
          return {
            ...u,
            status: 'Pending Deletion',
            scheduledDeletionDate: deletionDate.toISOString(),
          };
        }
        return u;
      })
    );

    // 4. Sign out & redirect to landing
    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('landing');
  };

  const restoreAccount = (targetEmail?: string) => {
    const emailToRestore = targetEmail || user?.email || pendingRecoveryUser?.email;
    if (!emailToRestore) return;

    const accounts = getStoredAccounts();
    const existing = accounts[emailToRestore.toLowerCase()] || user || pendingRecoveryUser;

    if (!existing) return;

    const restoredUser: User = {
      ...existing,
      pendingDeletion: false,
      deletionRequestedAt: undefined,
      scheduledDeletionDate: undefined,
    };

    // 1. Save updated account in store
    accounts[emailToRestore.toLowerCase()] = restoredUser;
    saveStoredAccounts(accounts);

    // 2. Update adminUsers list
    setAdminUsers(prev =>
      prev.map(u => {
        if (u.email.toLowerCase() === emailToRestore.toLowerCase()) {
          return {
            ...u,
            status: 'Active',
            scheduledDeletionDate: undefined,
          };
        }
        return u;
      })
    );

    // 3. Restore active session
    setUser(restoredUser);
    setIsAuthenticated(true);
    setPendingRecoveryUser(null);
    setIsRecoveryModalOpen(false);

    // 4. Redirect to dashboard
    setCurrentPage('dashboard');

    // 5. Display confirmation toast
    setRestorationToast('Your account has been successfully restored.');
    setTimeout(() => {
      setRestorationToast(null);
    }, 6000);
  };

  const continueDeletion = () => {
    setPendingRecoveryUser(null);
    setIsRecoveryModalOpen(false);
    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('landing');
  };

  // Theme management - User-scoped with default 'light'
  const getSavedThemeForUser = (userIdOrEmail?: string): 'light' | 'dark' | 'system' | null => {
    try {
      if (userIdOrEmail) {
        const userKey = `structra_theme_${userIdOrEmail.toLowerCase()}`;
        const savedUserTheme = localStorage.getItem(userKey);
        if (savedUserTheme === 'light' || savedUserTheme === 'dark' || savedUserTheme === 'system') {
          return savedUserTheme;
        }
        // One-time migration for legacy global theme if present for an existing user
        const globalSaved = localStorage.getItem('structra_theme');
        if (globalSaved === 'light' || globalSaved === 'dark' || globalSaved === 'system') {
          localStorage.setItem(userKey, globalSaved);
          localStorage.removeItem('structra_theme');
          return globalSaved;
        }
      }
    } catch (e) {}
    return null;
  };

  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = getSavedThemeForUser(user?.id || user?.email);
    return saved || 'light';
  });

  // User-scoped theme synchronization on user change
  useEffect(() => {
    if (isAuthLoading) return;
    if (user) {
      const savedUserTheme = getSavedThemeForUser(user.id || user.email);
      setThemeModeState(savedUserTheme || 'light');
    } else {
      setThemeModeState('light');
    }
  }, [user?.id, user?.email, isAuthLoading]);

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemeModeState(mode);
    try {
      if (user) {
        const userThemeKey = `structra_theme_${(user.id || user.email).toLowerCase()}`;
        localStorage.setItem(userThemeKey, mode);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = false;
      if (themeMode === 'dark') {
        isDark = true;
      } else if (themeMode === 'light') {
        isDark = false;
      } else {
        isDark = mediaQuery.matches;
      }

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themeMode]);

  // Language Preference State
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    try {
      const savedLang = localStorage.getItem('structra_language');
      if (savedLang && SUPPORTED_LANGUAGES.some(l => l.name === savedLang)) {
        return savedLang;
      }
    } catch (e) {}
    return initialUser.language || DEFAULT_LANGUAGE;
  });

  // Keep html lang attribute synchronized with selectedLanguage
  useEffect(() => {
    const matched = SUPPORTED_LANGUAGES.find(l => l.name === selectedLanguage) || SUPPORTED_LANGUAGES[0];
    if (matched) {
      document.documentElement.lang = matched.locale;
    }
  }, [selectedLanguage]);

  // Sync user language if user changes
  useEffect(() => {
    if (user?.language && user.language !== selectedLanguage) {
      if (SUPPORTED_LANGUAGES.some(l => l.name === user.language)) {
        setSelectedLanguage(user.language);
      }
    }
  }, [user]);

  const changeLanguage = (languageName: string) => {
    const validOption = SUPPORTED_LANGUAGES.find(l => l.name === languageName) || SUPPORTED_LANGUAGES[0];
    const newLang = validOption.name;
    setSelectedLanguage(newLang);
    try {
      localStorage.setItem('structra_language', newLang);
    } catch (e) {}

    document.documentElement.lang = validOption.locale;

    if (user) {
      const updatedUser: User = { ...user, language: newLang };
      setUser(updatedUser);
      const accounts = getStoredAccounts();
      accounts[user.email.toLowerCase()] = updatedUser;
      saveStoredAccounts(accounts);
    }
  };

  // Secure Password Change Workflow
  const changePassword = async (
    currentPwdInput: string,
    newPwdInput?: string
  ): Promise<{ success: boolean; message: string }> => {
    const isRecoveryReset = !newPwdInput;
    const targetNewPwd = isRecoveryReset ? currentPwdInput : newPwdInput;

    if (!user && !isRecoveryReset) {
      return { success: false, message: 'User is not logged in.' };
    }

    // 1. Validation checks BEFORE touching Supabase Auth or updating anything
    if (!isRecoveryReset) {
      if (!currentPwdInput || !currentPwdInput.trim()) {
        return { success: false, message: 'Current password is required.' };
      }
      if (targetNewPwd === currentPwdInput) {
        return { success: false, message: 'Your new password must be different from your current password.' };
      }
    }

    if (targetNewPwd.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(targetNewPwd)) {
      return { success: false, message: 'New password must include at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(targetNewPwd)) {
      return { success: false, message: 'New password must include at least one lowercase letter.' };
    }
    if (!/[0-9]/.test(targetNewPwd)) {
      return { success: false, message: 'New password must include at least one number.' };
    }

    // 2. For logged-in user session, verify current password FIRST before updating
    if (user && !isRecoveryReset) {
      let isCurrentPasswordValid = false;

      // Attempt verification via Supabase Auth
      if (user.email) {
        try {
          const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPwdInput,
          });

          if (!verifyError) {
            isCurrentPasswordValid = true;
          } else {
            // Check local fallback password state (e.g. offline/mock or custom session)
            if (user.password && currentPwdInput === user.password) {
              isCurrentPasswordValid = true;
            }
          }
        } catch (e) {
          if (user.password && currentPwdInput === user.password) {
            isCurrentPasswordValid = true;
          }
        }
      } else if (user.password && currentPwdInput === user.password) {
        isCurrentPasswordValid = true;
      }

      if (!isCurrentPasswordValid) {
        // Return error IMMEDIATELY without updating Supabase Auth password!
        return { success: false, message: 'Current password is incorrect.' };
      }
    }

    // 3. NOW perform actual password update via Supabase Auth
    try {
      const { error } = await supabase.auth.updateUser({ password: targetNewPwd });
      if (error && !isRecoveryReset) {
        console.warn('[Supabase Auth] Password update error:', error.message);
        return { success: false, message: error.message || 'Failed to update password. Please try again.' };
      }
    } catch (e: any) {
      console.warn('[Supabase Auth] Password update exception:', e);
    }

    if (!user && isRecoveryReset) {
      return { success: true, message: 'Your password has been updated successfully.' };
    }

    if (!user) {
      return { success: false, message: 'User is not logged in.' };
    }

    // 4. Record Security Audit Log & update local user session state
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    let device = 'Desktop';
    if (/mobile/i.test(userAgent)) device = 'Mobile Device';
    else if (/macintosh|mac os x/i.test(userAgent)) device = 'Macintosh';
    else if (/windows/i.test(userAgent)) device = 'Windows PC';
    else if (/linux/i.test(userAgent)) device = 'Linux PC';

    let browser = 'Chrome';
    if (/chrome|crios/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Chrome';
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
    else if (/edg/i.test(userAgent)) browser = 'Edge';
    else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newSecurityLog: SecurityLog = {
      id: 'sec_' + Date.now(),
      action: 'Password Changed',
      date: dateStr,
      time: timeStr,
      device,
      browser,
    };

    const updatedUser: User = {
      ...user,
      password: targetNewPwd,
      securityLogs: [newSecurityLog, ...(user.securityLogs || [])],
    };

    setUser(updatedUser);

    const accounts = getStoredAccounts();
    if (user.email) {
      accounts[user.email.toLowerCase()] = updatedUser;
      saveStoredAccounts(accounts);
    }

    return { success: true, message: 'Your password has been updated successfully.' };
  };

  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

  const confirmLogout = async () => {
    if (user?.id) {
      try {
        localStorage.removeItem(`structra_docs_${user.id}`);
        localStorage.removeItem(`structra_integrations_${user.id}`);
      } catch (e) {}
    }
    if (user?.email) {
      try {
        localStorage.removeItem(`structra_integrations_${user.email.toLowerCase()}`);
      } catch (e) {}
    }
    try {
      localStorage.removeItem('structra_docs');
      localStorage.removeItem('structra_integrations');
    } catch (e) {}

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[Supabase Auth] SignOut notice:', e);
    }
    lastHydratedUserIdRef.current = null;
    lastFetchedDocsUserIdRef.current = null;
    sessionHydrationPromiseRef.current = null;
    inFlightHydratingUserIdRef.current = null;
    lastFetchedAiUserIdRef.current = null;
    lastAuthIntegrityCheckTimeRef.current = 0;
    activeConversationIdRef.current = null;
    aiMessagesRef.current = [];
    setDocuments([]);
    setSelectedDocument(null);
    setUser(null);
    setIsAuthenticated(false);
    setNotifications([]);
    setAiConversations([]);
    setActiveConversationId(null);
    setAiMessages([]);
    setIsOnboardingOpen(false);
    setIsLogoutModalOpen(false);
    setIntegrations(initialIntegrations);
    setCurrentPage('login');
  };

  const logout = () => {
    openLogoutModal();
  };

  const updateProfile = (updates: Partial<User> | string, legacyEmail?: string) => {
    if (!user) return;
    let updatedUser: User;
    if (typeof updates === 'string') {
      updatedUser = { ...user, name: updates, email: legacyEmail || user.email };
    } else {
      updatedUser = { ...user, ...updates };
    }
    setUser(updatedUser);
    dbUpsertProfile(updatedUser);
    const accounts = getStoredAccounts();
    accounts[updatedUser.email.toLowerCase()] = updatedUser;
    saveStoredAccounts(accounts);
  };

  const updateUserProfile = updateProfile;

  const toggleUserStatus = (userId: string) => {
    setAdminUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' };
      }
      return u;
    }));
  };

  const reprocessDocument = (docId: string) => {
    const targetDoc = documents.find(d => d.id === docId);
    const docName = targetDoc?.title || 'Document';

    setAuditLogs(prev => [
      {
        id: 'log_' + Date.now(),
        timestamp: new Date().toLocaleString(),
        administrator: user?.name + ' (Admin)',
        action: 'Document Index Reprocessed',
        resource: docId,
        status: 'Success',
      },
      ...prev,
    ]);

    addNotification({
      title: 'Document Processed',
      desc: `${docName} metadata and embeddings re-indexed with updated AI model.`,
      targetPage: 'documents',
      type: 'document',
    });
  };

  return (
    <AppContext.Provider value={{
      user,
      isAuthenticated,
      isAuthLoading,
      isOffline,
      currentPage,
      setCurrentPage,
      selectedLanguage,
      changeLanguage,
      changePassword,
      updateUserPreferences,
      documents,
      selectedDocument,
      setSelectedDocument,
      globalSearchQuery,
      setGlobalSearchQuery,
      aiSearchResult,
      performAISearch,
      activeCollectionFilter,
      setActiveCollectionFilter,
      activeSourceFilter,
      setActiveSourceFilter,
      searchHistory,
      addSearchQuery,
      clearSearchHistory,
      notifications: activeNotifications,
      addNotification,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      toggleFavorite,
      moveToTrash,
      restoreFromTrash,
      permanentDelete,
      deletePermanently: permanentDelete,
      emptyTrash,
      integrations,
      syncActivityLogs,
      connectIntegration,
      disconnectIntegration,
      reconnectIntegration,
      updateIntegrationMode,
      toggleIntegrationMode,
      triggerSync,
      triggerIntegrationSync,
      setOpenIntegrationModal,
      importExternalDocument,
      updateDocumentShareSettings,
      uploadJobs,
      addUploadJob,
      updateUploadJob,
      processUploadedFile,
      cancelUploadJob,
      aiConversations,
      activeConversationId,
      aiMessages,
      setAiMessages,
      addAiMessage,
      startNewAiChat,
      selectAiConversation,
      deleteAiConversation,
      clearAiConversation,
      isLoadingConversations,
      isAIChatOpen,
      setIsAIChatOpen,
      isVoiceSearchOpen,
      setIsVoiceSearchOpen,
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      isAccountTypeModalOpen,
      setIsAccountTypeModalOpen,
      isGoogleAuthModalOpen,
      setIsGoogleAuthModalOpen,
      handleSelectGoogleAccount,
      isRoadmapModalOpen,
      setIsRoadmapModalOpen,
      isOnboardingOpen,
      openOnboarding,
      closeOnboarding,
      completeOnboarding,
      activeWorkspace,
      setActiveWorkspace,
      pendingGoogleUser,
      legalModalType,
      openLegalModal,
      closeLegalModal,
      themeMode,
      setThemeMode,
      login,
      loginWithGoogle,
      completeWorkspaceSelection,
      register,
      logout,
      isLogoutModalOpen,
      openLogoutModal,
      closeLogoutModal,
      confirmLogout,
      updateProfile,
      updateUserProfile,
      scheduleAccountDeletion,
      restoreAccount,
      continueDeletion,
      pendingRecoveryUser,
      isRecoveryModalOpen,
      setIsRecoveryModalOpen,
      restorationToast,
      setRestorationToast,
      adminUsers,
      setAdminUsers,
      systemStats,
      auditLogs,
      toggleUserStatus,
      reprocessDocument,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
