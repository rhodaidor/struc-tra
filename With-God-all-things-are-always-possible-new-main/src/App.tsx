import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { LandingPage } from './components/pages/LandingPage';
import { AuthPage } from './components/pages/AuthPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { DocumentsPage } from './components/pages/DocumentsPage';
import { UploadCenterPage } from './components/pages/UploadCenterPage';
import { IntegrationsPage } from './components/pages/IntegrationsPage';
import { FavoritesPage } from './components/pages/FavoritesPage';
import { ProfileSettingsPage } from './components/pages/ProfileSettingsPage';
import { TrashPage } from './components/pages/TrashPage';
import { AdminPage } from './components/pages/AdminPage';
import { SharePage } from './components/pages/SharePage';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/pages/TermsOfServicePage';

// Common Drawers & Modals
import { AIChatDrawer } from './components/common/AIChatDrawer';
import { VoiceSearchModal } from './components/common/VoiceSearchModal';
import { DocumentPreviewModal } from './components/common/DocumentPreviewModal';
import { AccountTypeModal } from './components/common/AccountTypeModal';
import { GoogleAuthModal } from './components/common/GoogleAuthModal';
import { AccountRecoveryModal } from './components/common/AccountRecoveryModal';
import { LogoutConfirmModal } from './components/modals/LogoutConfirmModal';
import { LegalModal } from './components/modals/LegalModal';
import { MoreIntegrationsModal } from './components/modals/MoreIntegrationsModal';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { StructraLogo } from './components/common/StructraLogo';
import { CheckCircle2, Loader2, WifiOff } from 'lucide-react';

const AppContent: React.FC = () => {
  const { 
    user, 
    currentPage, 
    isAuthLoading,
    isOffline,
    pendingRecoveryUser, 
    isRecoveryModalOpen, 
    restoreAccount, 
    continueDeletion,
    restorationToast,
    isRoadmapModalOpen,
    setIsRoadmapModalOpen,
    isLogoutModalOpen,
    closeLogoutModal,
    confirmLogout,
  } = useApp();

  const mainRef = React.useRef<HTMLElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Scroll to the absolute top of the page and container whenever page or user changes
  React.useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [currentPage, user]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0c0d10] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 animate-pulse mb-4">
          <StructraLogo className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-bold text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading Structra...</span>
        </div>
      </div>
    );
  }

  const isPublicPage = 
    currentPage === 'landing' || 
    currentPage === 'login' || 
    currentPage === 'signup' || 
    currentPage === 'share' ||
    currentPage === 'privacy' ||
    currentPage === 'terms';

  if (currentPage === 'share') {
    return <SharePage onNavigateHome={() => window.location.href = '/'} />;
  }

  if (currentPage === 'privacy') {
    return <PrivacyPolicyPage onNavigateHome={() => window.location.href = '/'} />;
  }

  if (currentPage === 'terms') {
    return <TermsOfServicePage onNavigateHome={() => window.location.href = '/'} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0d10] text-slate-900 dark:text-[#ededee] font-sans flex flex-col transition-colors duration-200 relative">
      {/* Active Session Offline Banner */}
      {isOffline && (
        <div 
          id="offline-connection-banner"
          role="status" 
          aria-live="polite"
          className="w-full bg-red-50 dark:bg-red-950/90 border-b border-red-200 dark:border-red-900/70 px-4 py-2 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm sticky top-0 z-50 shadow-xs transition-colors"
        >
          <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="font-bold text-red-600 dark:text-red-400">No Internet Connection</span>
        </div>
      )}

      {/* Restoration Success Toast Banner */}
      {restorationToast && (
        <div className="fixed top-5 right-5 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{restorationToast}</span>
        </div>
      )}

      {/* Top Header (Only for internal/dashboard pages) */}
      {!isPublicPage && <Header />}

      <div ref={containerRef} className="flex-1 flex overflow-x-hidden">
        {/* Sidebar (Only shown when logged in or viewing app views) */}
        {!isPublicPage && user && <Sidebar />}

        {/* Main Workspace Area */}
        <main ref={mainRef} className={`flex-1 min-w-0 overflow-y-auto ${!isPublicPage && user ? 'p-4 md:px-6 md:pt-4 lg:px-8 lg:pt-5 pb-20' : ''}`}>
          {currentPage === 'landing' && <LandingPage />}
          {currentPage === 'login' && <AuthPage initialMode="login" />}
          {currentPage === 'signup' && <AuthPage initialMode="signup" />}

          {/* Authenticated Application Views */}
          {currentPage === 'dashboard' && <DashboardPage />}
          {currentPage === 'documents' && <DocumentsPage />}
          {currentPage === 'upload' && <UploadCenterPage />}
          {currentPage === 'integrations' && <IntegrationsPage />}
          {currentPage === 'favorites' && <FavoritesPage />}
          {currentPage === 'profile' && <ProfileSettingsPage />}
          {currentPage === 'trash' && <TrashPage />}
          {currentPage === 'admin' && <AdminPage />}

          {/* Route Fallback Guard */}
          {!['landing', 'login', 'signup', 'dashboard', 'documents', 'upload', 'integrations', 'favorites', 'profile', 'trash', 'admin'].includes(currentPage) && (
            user ? <DashboardPage /> : <LandingPage />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {!isPublicPage && user && <BottomNav />}

      {/* Global Modals & Drawers */}
      <AIChatDrawer />
      <VoiceSearchModal />
      <DocumentPreviewModal />
      <GoogleAuthModal />
      <AccountTypeModal />
      <OnboardingModal />
      <LegalModal />
      <MoreIntegrationsModal
        isOpen={isRoadmapModalOpen}
        onClose={() => setIsRoadmapModalOpen(false)}
      />

      {/* Account Recovery Interception Modal */}
      <AccountRecoveryModal
        isOpen={isRecoveryModalOpen}
        user={pendingRecoveryUser}
        onRestore={() => restoreAccount()}
        onContinueDeletion={continueDeletion}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
