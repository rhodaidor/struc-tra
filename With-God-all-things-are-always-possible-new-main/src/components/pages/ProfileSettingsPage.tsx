import React, { useState, useRef, useEffect } from 'react';
import { 
  User as UserIcon, Mail, Check, Sparkles, Sun, Moon, Laptop, 
  ToggleLeft, ToggleRight, KeyRound, AlertTriangle, ChevronDown, Plus, LogOut, Lock, Edit3, HardDrive, Camera, Trash2, Upload, X,
  Eye, EyeOff, Shield, Loader2, FileText, Send, UploadCloud, FileCode, Receipt, BarChart3, AlertCircle, CheckCircle2, ArrowUpRight, Folder,
  HelpCircle, LifeBuoy, MessageSquarePlus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAvatar } from '../common/UserAvatar';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';

export const ProfileSettingsPage: React.FC = () => {
  const { 
    user, updateUserProfile, logout, setOpenIntegrationModal, setCurrentPage, 
    documents, themeMode, setThemeMode, scheduleAccountDeletion, restoreAccount,
    selectedLanguage, changeLanguage, changePassword, setSelectedDocument,
    setIsRoadmapModalOpen, integrations, isAuthLoading, updateUserPreferences
  } = useApp();

  const gmailIntegration = integrations.find(i => i.id === 'gmail');
  const telegramIntegration = integrations.find(i => i.id === 'telegram');

  const isGmailConnected = gmailIntegration?.connected ?? false;
  const isTelegramConnected = telegramIntegration?.connected ?? false;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || 'Chinaza Rhoda');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync state when user updates
  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  // Calculate dynamic storage usage
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const activeDocs = documents.filter(d => !d.isTrash);
  const totalStorageBytes = activeDocs.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
  const maxStorageBytes = 10 * 1024 * 1024 * 1024; // 10 GB Limit
  const storagePctNum = Math.min(100, (totalStorageBytes / maxStorageBytes) * 100);
  const storagePctFormatted = storagePctNum < 0.1 ? (storagePctNum === 0 ? '0.0' : storagePctNum.toFixed(2)) : storagePctNum.toFixed(1);

  // Breakdown by Source / Channel
  const manualUploadsSize = activeDocs
    .filter(d => !d.source || d.source.toLowerCase().includes('upload') || d.source.toLowerCase().includes('manual'))
    .reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

  const gmailSize = activeDocs
    .filter(d => d.source && d.source.toLowerCase().includes('gmail'))
    .reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

  const telegramSize = activeDocs
    .filter(d => d.source && d.source.toLowerCase().includes('telegram'))
    .reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

  // Breakdown by File Type
  const pdfSize = activeDocs
    .filter(d => (d.fileType || '').toLowerCase() === 'pdf' || (d.title || '').toLowerCase().endsWith('.pdf'))
    .reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

  const wordSize = activeDocs
    .filter(d => ['docx', 'doc'].includes((d.fileType || '').toLowerCase()) || /\.(docx|doc)$/i.test(d.title || ''))
    .reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

  const pptSize = activeDocs
    .filter(d => ['pptx', 'ppt'].includes((d.fileType || '').toLowerCase()) || /\.(pptx|ppt)$/i.test(d.title || ''))
    .reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

  const excelSize = activeDocs
    .filter(d => ['xlsx', 'xls', 'csv'].includes((d.fileType || '').toLowerCase()) || /\.(xlsx|xls|csv)$/i.test(d.title || ''))
    .reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

  const imageSize = activeDocs
    .filter(d => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes((d.fileType || '').toLowerCase()) || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(d.title || ''))
    .reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

  const otherSize = Math.max(0, totalStorageBytes - (pdfSize + wordSize + pptSize + excelSize + imageSize));

  // Top 5 Largest Files
  const largestFilesList = [...activeDocs]
    .sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0))
    .slice(0, 5);

  const top3SizeTotal = largestFilesList.slice(0, 3).reduce((acc, d) => acc + (d.fileSize || 0), 0);
  const top3Pct = totalStorageBytes > 0 ? ((top3SizeTotal / totalStorageBytes) * 100).toFixed(1) : '0';

  // User Preferences
  const appNotifications = user?.appNotificationsEnabled ?? true;
  const featureUpdates = user?.featureUpdatesEnabled ?? true;

  const handleToggleAppNotifications = async () => {
    const nextVal = !appNotifications;
    const success = await updateUserPreferences({ appNotificationsEnabled: nextVal });
    if (success) {
      setStatusMessage({
        type: 'success',
        text: `App notifications ${nextVal ? 'enabled' : 'disabled'}.`
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Unable to save your notification preference. Please try again.'
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleToggleFeatureUpdates = async () => {
    const nextVal = !featureUpdates;
    const success = await updateUserPreferences({ featureUpdatesEnabled: nextVal });
    if (success) {
      setStatusMessage({
        type: 'success',
        text: `Feature updates ${nextVal ? 'enabled' : 'disabled'}.`
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Unable to save your notification preference. Please try again.'
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleLanguageChange = async (newLang: string) => {
    const success = await updateUserPreferences({ language: newLang });
    if (success) {
      changeLanguage(newLang);
      setStatusMessage({
        type: 'success',
        text: `Default language updated to ${newLang}.`
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Unable to save your language preference. Please try again.'
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteInputText, setDeleteInputText] = useState('');

  // Password fields and state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdErrorMsg, setPwdErrorMsg] = useState<string | null>(null);
  const [pwdSuccessMsg, setPwdSuccessMsg] = useState<string | null>(null);
  const [isSubmittingPwd, setIsSubmittingPwd] = useState(false);
  const [forgotPwdSent, setForgotPwdSent] = useState(false);

  // Support & Feedback modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<'Problem Report' | 'Bug Report' | 'General Feedback' | 'Feature Request' | 'Performance' | 'Integration Issue'>('Problem Report');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [feedbackPriority, setFeedbackPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string | null>(null);
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState<string | null>(null);

  const openFeedbackModal = (defaultCategory: 'Problem Report' | 'Bug Report' | 'General Feedback' | 'Feature Request' | 'Performance' | 'Integration Issue' = 'Problem Report') => {
    setFeedbackCategory(defaultCategory);
    setFeedbackTitle('');
    setFeedbackDesc('');
    setFeedbackPriority('Medium');
    setFeedbackSuccessMsg(null);
    setFeedbackErrorMsg(null);
    setIsFeedbackModalOpen(true);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTitle.trim() || !feedbackDesc.trim()) return;
    setIsSubmittingFeedback(true);
    setFeedbackErrorMsg(null);
    try {
      const { supabase } = await import('../../lib/supabase');
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          category: feedbackCategory,
          title: feedbackTitle.trim(),
          description: feedbackDesc.trim(),
          priority: feedbackPriority,
          feature: 'User Settings / Workspace',
          browserContext: {
            userAgent: navigator.userAgent,
            url: window.location.href,
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackSuccessMsg('Thank you! Your report has been submitted to the Structra engineering team.');
        setFeedbackTitle('');
        setFeedbackDesc('');
        setTimeout(() => {
          setFeedbackSuccessMsg(null);
          setIsFeedbackModalOpen(false);
        }, 2000);
      } else {
        setFeedbackErrorMsg(data.error || 'Failed to submit report. Please try again.');
      }
    } catch (err: any) {
      setFeedbackErrorMsg('An error occurred while submitting. Please check your connection and try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const openPasswordModal = () => {
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdErrorMsg(null);
    setPwdSuccessMsg(null);
    setShowCurrentPwd(false);
    setShowNewPwd(false);
    setShowConfirmPwd(false);
    setForgotPwdSent(false);
    setIsPasswordModalOpen(true);
  };

  const handleForgotPasswordClick = () => {
    setForgotPwdSent(true);
  };

  // Password rule indicators
  const pwdHasLength = newPwd.length >= 8;
  const pwdHasUpper = /[A-Z]/.test(newPwd);
  const pwdHasLower = /[a-z]/.test(newPwd);
  const pwdHasNumber = /[0-9]/.test(newPwd);
  const pwdHasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPwd);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErrorMsg(null);
    setPwdSuccessMsg(null);
    setForgotPwdSent(false);

    if (!currentPwd) {
      setPwdErrorMsg('Current password is required.');
      return;
    }

    if (newPwd !== confirmPwd) {
      setPwdErrorMsg('Passwords do not match.');
      return;
    }

    if (isSubmittingPwd) return;

    setIsSubmittingPwd(true);

    try {
      const res = await changePassword(currentPwd, newPwd);
      setIsSubmittingPwd(false);

      if (!res.success) {
        setPwdErrorMsg(res.message);
        setPwdSuccessMsg(null);
      } else {
        setPwdErrorMsg(null);
        setPwdSuccessMsg(res.message || 'Your password has been updated successfully.');
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPwdSuccessMsg(null);
          setPwdErrorMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      setIsSubmittingPwd(false);
      setPwdErrorMsg(err?.message || 'An unexpected error occurred. Please try again.');
      setPwdSuccessMsg(null);
    }
  };

  const openDeleteModal = () => {
    setDeleteStep(1);
    setDeleteInputText('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteInputText.trim() !== 'DELETE') return;
    setIsDeleteModalOpen(false);
    scheduleAccountDeletion();
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = /\.(jpg|jpeg|png|webp)$/i;
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    // Format validation
    if (!allowedMimeTypes.includes(file.type.toLowerCase()) && !allowedExtensions.test(file.name)) {
      setStatusMessage({
        type: 'error',
        text: 'Invalid file format. Please upload a JPG, JPEG, PNG, or WEBP image.'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Size validation
    if (file.size > maxSizeBytes) {
      setStatusMessage({
        type: 'error',
        text: 'File size exceeds 5 MB limit. Please select a smaller image.'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setStatusMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarPreview(result);
      setStatusMessage({
        type: 'info',
        text: 'New photo selected. Click "Save Changes" to apply.'
      });
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditing = () => {
    if (user) {
      setName(user.name);
      setAvatarPreview(user.avatar || null);
    }
    setStatusMessage(null);
    setIsEditingProfile(true);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelChanges = () => {
    if (isSavingProfile) return;

    // Immediately restore original saved values
    const currentAvatar = user?.avatar || null;
    const currentName = user?.name || '';

    setName(currentName);
    setAvatarPreview(currentAvatar);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Immediately exit edit mode, close form, and return to Profile & Settings view
    setIsEditingProfile(false);
    setStatusMessage(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSavingProfile) return;

    const trimmedName = name.trim();

    // 1. Validate fields
    if (!trimmedName) {
      setStatusMessage({ type: 'error', text: 'Full Name cannot be empty.' });
      return;
    }

    const currentAvatar = user.avatar || null;
    const isNameChanged = trimmedName !== user.name;
    const isAvatarChanged = avatarPreview !== currentAvatar;

    // 2. Check if no changes were made
    if (!isNameChanged && !isAvatarChanged) {
      setStatusMessage({ type: 'info', text: 'No changes to save.' });
      return;
    }

    // 3. During Save: Disable button, display loading indicator, prevent duplicate submissions
    setIsSavingProfile(true);
    setStatusMessage(null);

    try {
      // Simulate smooth async operation
      await new Promise(res => setTimeout(res, 500));

      // 4. Update profile information throughout the application
      updateUserProfile({
        name: trimmedName,
        avatar: avatarPreview
      });

      // 5. Display success toast notification
      setStatusMessage({ type: 'success', text: 'Profile updated successfully.' });

      // Keep success message visible for approximately 2 seconds before closing
      setTimeout(() => {
        setIsEditingProfile(false);
        setIsSavingProfile(false);
        setStatusMessage(null);
      }, 2000);
    } catch (err) {
      setIsSavingProfile(false);
      setStatusMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-6xl mx-auto">
      {/* Page Title Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          Profile Setting
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
          Manage your account, preferences, and connected integrations.
        </p>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profile & Connected Integrations */}
        <div className="lg:col-span-6 space-y-6">
          {/* Profile Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 shrink-0">
                <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  {isEditingProfile ? 'Edit Profile' : 'Profile'}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-100 dark:border-blue-900/80 whitespace-nowrap">
                  {user?.accountType === 'individual' ? 'Personal Account' : 'Business/Team Account'}
                </span>
                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={handleStartEditing}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium -mt-2">
              {isEditingProfile ? 'Update your personal information and profile picture.' : 'View your account and personal profile details.'}
            </p>

            {/* Status Feedback Banner */}
            {statusMessage && (
              <div className={`p-3 rounded-2xl text-xs font-extrabold flex items-center justify-between gap-2 animate-in fade-in ${
                statusMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800' :
                statusMessage.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800' :
                'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800'
              }`}>
                <div className="flex items-center gap-2">
                  {statusMessage.type === 'success' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
                  {statusMessage.type === 'info' && <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                  <span>{statusMessage.text}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setStatusMessage(null)} 
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!isEditingProfile ? (
              /* View Mode Profile Display */
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    name={user?.name || 'User'}
                    avatar={user?.avatar || null}
                    className="w-16 h-16 text-xl ring-4 ring-blue-50 dark:ring-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs"
                    textClassName="text-xl font-black text-white"
                  />
                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{user?.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{user?.email}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Workspace</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                      {user?.accountType === 'individual' ? 'Personal' : 'Business / Team'}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Role</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate capitalize">{user?.role || 'User'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Status</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                      Active
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Mode Editable Form */
              <div className="space-y-5 pt-1">
                {/* Profile Avatar Upload Header */}
                <div className="flex items-center gap-4">
                  <div 
                    className="relative group shrink-0 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    title="Click to upload profile picture"
                  >
                    <UserAvatar
                      name={name || user?.name || 'User'}
                      avatar={avatarPreview}
                      className="w-16 h-16 text-xl ring-4 ring-blue-50 dark:ring-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs"
                      textClassName="text-xl font-black text-white"
                    />
                    <div className="absolute inset-0 rounded-full bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-transform transform hover:scale-110 active:scale-95"
                      aria-label="Upload avatar"
                      title="Upload profile picture"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {avatarPreview && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove photo</span>
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
                      Click camera icon to choose a profile photo.<br />
                      JPG, JPEG, PNG, or WEBP up to 5 MB.
                    </p>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarSelect}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                  />
                </div>

                {/* Form for Profile Settings */}
                <form onSubmit={handleSaveProfile} className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label htmlFor="full-name-input" className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                      Full Name
                    </label>
                    <input
                      id="full-name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      disabled={isSavingProfile}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor="email-readonly-input" className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                      <span>Email Address</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">Read-only</span>
                    </label>
                    <div className="relative">
                      <input
                        id="email-readonly-input"
                        type="email"
                        value={user?.email || 'user@example.com'}
                        readOnly
                        disabled
                        tabIndex={-1}
                        className="w-full px-3.5 py-2.5 bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border border-slate-200/90 dark:border-slate-700/90 rounded-2xl text-xs font-semibold cursor-not-allowed select-all focus:outline-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                      Email addresses are fixed and cannot be edited.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isSavingProfile}
                      onClick={handleCancelChanges}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Connected Integrations Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Connected Integrations</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage your integration accounts.</p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Gmail Item */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg"
                      alt="Gmail"
                      className="w-5 h-5"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Gmail</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Import and process documents from your Gmail account.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                  {isAuthLoading ? (
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                      Checking connection...
                    </span>
                  ) : isGmailConnected ? (
                    <>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-100 dark:border-emerald-900/60">
                        Connected
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage('integrations')}
                        className="px-3 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Manage
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                        Not Connected
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage('integrations')}
                        className="w-full sm:w-auto px-4 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-[11px] font-bold rounded-xl transition-colors cursor-pointer text-center"
                      >
                        Connect
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Telegram Item */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-100 dark:border-cyan-900/60 flex items-center justify-center shrink-0">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
                      alt="Telegram"
                      className="w-5 h-5"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Telegram</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Import and process documents from your Telegram bot account.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                  {isAuthLoading ? (
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                      Checking connection...
                    </span>
                  ) : isTelegramConnected ? (
                    <>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-100 dark:border-emerald-900/60">
                        Connected
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage('integrations')}
                        className="px-3 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Manage
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                        Not Connected
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage('integrations')}
                        className="w-full sm:w-auto px-4 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-[11px] font-bold rounded-xl transition-colors cursor-pointer text-center"
                      >
                        Connect
                      </button>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRoadmapModalOpen(true)}
                className="w-full py-2.5 border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Connect another account</span>
              </button>
            </div>
          </div>

          {/* Storage Management Section */}
          <div id="storage-section" className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Storage Management</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] border border-emerald-100 dark:border-emerald-900/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                10 GB ACTIVE QUOTA
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Real-time workspace storage allocation calculated strictly from original document file sizes.
            </p>

            {/* Storage Gauge Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 dark:text-slate-100">
                <span>{formatBytes(totalStorageBytes)} / 10 GB Used</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{storagePctFormatted}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    storagePctNum >= 80 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                  }`}
                  style={{ width: `${Math.max(totalStorageBytes > 0 ? 1.5 : 0, storagePctNum)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
                <span>Total Active Documents: <strong className="text-slate-700 dark:text-slate-300 font-bold">{activeDocs.length}</strong></span>
                <span>Free Storage: <strong className="text-slate-700 dark:text-slate-300 font-bold">{formatBytes(maxStorageBytes - totalStorageBytes)}</strong></span>
              </div>
            </div>

            {/* Breakdown By Source / Channel */}
            <div className="space-y-2.5 pt-1">
              <h4 className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Storage Breakdown by Source</span>
              </h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {/* Manual Uploads */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Uploads</span>
                  </div>
                  <p className="text-xs font-black text-slate-900 dark:text-slate-100">{formatBytes(manualUploadsSize)}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {totalStorageBytes > 0 ? ((manualUploadsSize / totalStorageBytes) * 100).toFixed(0) : 0}% of used
                  </p>
                </div>

                {/* Gmail Smart Import */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gmail</span>
                  </div>
                  <p className="text-xs font-black text-slate-900 dark:text-slate-100">{formatBytes(gmailSize)}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {totalStorageBytes > 0 ? ((gmailSize / totalStorageBytes) * 100).toFixed(0) : 0}% of used
                  </p>
                </div>

                {/* Telegram Smart Import */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram</span>
                  </div>
                  <p className="text-xs font-black text-slate-900 dark:text-slate-100">{formatBytes(telegramSize)}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {totalStorageBytes > 0 ? ((telegramSize / totalStorageBytes) * 100).toFixed(0) : 0}% of used
                  </p>
                </div>
              </div>
            </div>

            {/* Breakdown By File Type */}
            <div className="space-y-2.5 pt-1">
              <h4 className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Storage Breakdown by File Type
              </h4>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'PDF Documents', size: pdfSize, color: 'bg-rose-500' },
                  { label: 'Word Documents', size: wordSize, color: 'bg-blue-500' },
                  { label: 'PowerPoint Presentations', size: pptSize, color: 'bg-amber-500' },
                  { label: 'Spreadsheets & CSVs', size: excelSize, color: 'bg-emerald-500' },
                  { label: 'Images & Photos', size: imageSize, color: 'bg-purple-500' },
                  ...(otherSize > 0 ? [{ label: 'Other Files', size: otherSize, color: 'bg-slate-400' }] : []),
                ].map((item, i) => {
                  const pct = totalStorageBytes > 0 ? (item.size / totalStorageBytes) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-500 font-mono">{formatBytes(item.size)}</span>
                        <span className="text-[10px] font-bold text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Largest Files Section */}
            {largestFilesList.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Largest Files in Workspace</span>
                  <span className="text-[10px] text-slate-400 font-normal">Top {largestFilesList.length}</span>
                </h4>
                <div className="space-y-2">
                  {largestFilesList.map((docItem) => (
                    <div 
                      key={docItem.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 hover:border-indigo-300 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-[200px] sm:max-w-[260px]">
                        <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-black text-[9px] rounded uppercase font-mono shrink-0">
                          {(docItem.fileType || 'DOC').toUpperCase()}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{docItem.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                          {formatBytes(docItem.fileSize || 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedDocument(docItem)}
                          className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 text-[10px] font-extrabold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights & Storage Alerts */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {storagePctNum >= 80 ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black">High Storage Usage Warning</p>
                    <p className="text-[10px] font-medium mt-0.5">
                      You have used {storagePctFormatted}% of your 10 GB limit. Consider reviewing large attachments or clearing trashed documents.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black">Storage Optimization Insight</p>
                    <p className="text-[10px] font-medium mt-0.5">
                      Your top 3 largest files account for {top3Pct}% ({formatBytes(top3SizeTotal)}) of your total used storage.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Preference & Security */}
        <div className="lg:col-span-6 space-y-6">
          {/* Preference Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Preference</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Customize your experience with Structra.</p>
            </div>

            {/* Appearance Switcher */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Theme</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`py-1.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    themeMode === 'light' 
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/60 dark:border-slate-700' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`py-1.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    themeMode === 'dark' 
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/60 dark:border-slate-700' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode('system')}
                  className={`py-1.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    themeMode === 'system' 
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/60 dark:border-slate-700' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>

            {/* Notification Toggles */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">App Notifications</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Shared notifications in the application.</p>
                </div>
                <button 
                  onClick={handleToggleAppNotifications}
                  aria-label={appNotifications ? "Disable App Notifications" : "Enable App Notifications"}
                >
                  {appNotifications ? (
                    <ToggleRight className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Feature Updates</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Get notified about new features and improvements.</p>
                </div>
                <button 
                  onClick={handleToggleFeatureUpdates}
                  aria-label={featureUpdates ? "Disable Feature Updates" : "Enable Feature Updates"}
                >
                  {featureUpdates ? (
                    <ToggleRight className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Language Dropdown */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <label htmlFor="language-select" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Default Language Settings
              </label>
              <div className="relative">
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.name}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Account Security Box */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Account security
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Change password and security settings.</p>
                </div>
                <button
                  type="button"
                  onClick={openPasswordModal}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Change password
                </button>
              </div>

              {/* Security Audit Log Preview */}
              {user?.securityLogs && user.securityLogs.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-[10px] space-y-1">
                  <div className="text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-between">
                    <span>Recent Security Activity:</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-300">{user.securityLogs[0].action}</span>
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 font-medium flex items-center justify-between">
                    <span>{user.securityLogs[0].date} at {user.securityLogs[0].time}</span>
                    <span>{user.securityLogs[0].device} • {user.securityLogs[0].browser}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Support & Problem Reporting Box */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <LifeBuoy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Support & Feedback
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Report an issue or send product feedback to our team.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openFeedbackModal('Problem Report')}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  Report a Problem
                </button>
              </div>
            </div>

            {/* Danger Zone Box */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Danger Zone
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {user?.pendingDeletion 
                    ? `Account scheduled for permanent deletion.` 
                    : `Schedule your account for permanent deletion with a 30-day recovery window.`}
                </p>
              </div>
              <button
                type="button"
                onClick={openDeleteModal}
                className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/80 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 relative overflow-hidden">
            {/* Top Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-inner">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Change Password</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Update your credentials to keep your account secure.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Notification Banner */}
            {pwdSuccessMsg && (
              <div role="alert" aria-live="assertive" className="p-3 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{pwdSuccessMsg}</span>
              </div>
            )}

            {/* Error Notification Banner */}
            {pwdErrorMsg && (
              <div role="alert" aria-live="assertive" className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{pwdErrorMsg}</span>
              </div>
            )}

            {/* Forgot Password Link Banner */}
            {forgotPwdSent && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs font-medium space-y-1 animate-in fade-in">
                <p className="font-bold">Password Reset Requested</p>
                <p className="text-[11px]">We have sent a password reset link to <strong className="text-slate-900 dark:text-slate-100">{user?.email}</strong>. Please check your email inbox.</p>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              {/* Current Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="current-password" className="font-bold text-slate-700 dark:text-slate-300 block">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPasswordClick}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrentPwd ? 'text' : 'password'}
                    required
                    value={currentPwd}
                    onChange={(e) => { setCurrentPwd(e.target.value); setPwdErrorMsg(null); }}
                    placeholder="Enter current password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-semibold focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    aria-label={showCurrentPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 cursor-pointer"
                  >
                    {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label htmlFor="new-password" className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPwd ? 'text' : 'password'}
                    required
                    value={newPwd}
                    onChange={(e) => { setNewPwd(e.target.value); setPwdErrorMsg(null); }}
                    placeholder="e.g. Structra@2026"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-semibold focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    aria-label={showNewPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 cursor-pointer"
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label htmlFor="confirm-password" className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPwd ? 'text' : 'password'}
                    required
                    value={confirmPwd}
                    onChange={(e) => { setConfirmPwd(e.target.value); setPwdErrorMsg(null); }}
                    placeholder="Re-enter new password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-semibold focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    aria-label={showConfirmPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 cursor-pointer"
                  >
                    {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Helper Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-1.5">
                <p className="font-bold text-slate-700 dark:text-slate-300">Password must contain:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-medium">
                  <div className={`flex items-center gap-1 ${pwdHasLength ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${pwdHasLength ? 'opacity-100' : 'opacity-30'}`} />
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1 ${pwdHasUpper ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${pwdHasUpper ? 'opacity-100' : 'opacity-30'}`} />
                    <span>1 uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1 ${pwdHasLower ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${pwdHasLower ? 'opacity-100' : 'opacity-30'}`} />
                    <span>1 lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1 ${pwdHasNumber ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${pwdHasNumber ? 'opacity-100' : 'opacity-30'}`} />
                    <span>1 number</span>
                  </div>
                  <div className={`flex items-center gap-1 col-span-2 ${pwdHasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${pwdHasSpecial ? 'opacity-100' : 'opacity-30'}`} />
                    <span>1 special character (@, #, $, %, etc.)</span>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingPwd}
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPwd}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingPwd ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal (Step 1 & Step 2) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-center relative overflow-hidden">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600" />

            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800 shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {deleteStep === 1 ? (
              <>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    Delete Your Structra Account?
                  </h3>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-left space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                  <p>
                    Deleting your account will deactivate your Structra workspace.
                  </p>
                  <p>
                    Your account, documents, and settings will be scheduled for permanent deletion after <strong className="text-slate-900 dark:text-slate-100">30 days</strong>.
                  </p>
                  <p>
                    You can recover your account at any time during this period by signing in again.
                  </p>
                  <p className="text-rose-600 dark:text-rose-400 font-bold border-t border-slate-200/80 dark:border-slate-700/80 pt-2">
                    After 30 days, your account and all associated data will be permanently removed and cannot be recovered.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/20 transition-colors cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    Confirm Account Deletion
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    To proceed, please type <strong className="text-slate-900 dark:text-slate-100">DELETE</strong> below to confirm deletion.
                  </p>
                </div>

                <div className="space-y-3 text-left">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
                      Type "DELETE" to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteInputText}
                      onChange={(e) => setDeleteInputText(e.target.value)}
                      placeholder="DELETE"
                      autoFocus
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-rose-500 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-extrabold focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteInputText.trim() !== 'DELETE'}
                    onClick={handleConfirmDelete}
                    className={`flex-1 py-2.5 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      deleteInputText.trim() === 'DELETE'
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20'
                        : 'bg-rose-300 dark:bg-rose-950/60 text-rose-100 dark:text-rose-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    Delete Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Support & Problem Reporting / Feedback Modal */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 relative overflow-hidden">
            {/* Top Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-inner">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Report a Problem & Feedback</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Direct line to the Structra engineering and support team.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Banner */}
            {feedbackSuccessMsg && (
              <div role="alert" aria-live="assertive" className="p-3 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{feedbackSuccessMsg}</span>
              </div>
            )}

            {/* Error Banner */}
            {feedbackErrorMsg && (
              <div role="alert" aria-live="assertive" className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{feedbackErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs">
              {/* Category & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="feedback-category" className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="feedback-category"
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Problem Report">Problem Report</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Integration Issue">Integration Issue (Gmail/Telegram)</option>
                    <option value="Performance">Performance / Latency</option>
                    <option value="General Feedback">General Feedback</option>
                    <option value="Feature Request">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="feedback-priority" className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Urgency / Priority
                  </label>
                  <select
                    id="feedback-priority"
                    value={feedbackPriority}
                    onChange={(e) => setFeedbackPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Low">Low (General suggestion)</option>
                    <option value="Medium">Medium (Affects single workflow)</option>
                    <option value="High">High (Impacting daily work)</option>
                    <option value="Critical">Critical (System blocker)</option>
                  </select>
                </div>
              </div>

              {/* Title Field */}
              <div>
                <label htmlFor="feedback-title" className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Subject / Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  id="feedback-title"
                  type="text"
                  required
                  value={feedbackTitle}
                  onChange={(e) => setFeedbackTitle(e.target.value)}
                  placeholder="e.g. OCR text extraction issue on scanned receipts"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>

              {/* Description Field */}
              <div>
                <label htmlFor="feedback-desc" className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="feedback-desc"
                  required
                  rows={4}
                  value={feedbackDesc}
                  onChange={(e) => setFeedbackDesc(e.target.value)}
                  placeholder="Provide details of what happened, expected behavior, or steps to reproduce..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-medium focus:outline-none transition-colors"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingFeedback}
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback || !feedbackTitle.trim() || !feedbackDesc.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingFeedback ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit to Engineering</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

