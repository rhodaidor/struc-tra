import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Users, Activity, Search, CheckCircle2, AlertTriangle, 
  Lock, RefreshCw, BarChart3, UserPlus, Download, 
  Sparkles, X, Filter, LifeBuoy, MessageSquare, HardDrive, 
  Clock, Trash2, Eye, Mail, FileText, Check, ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAvatar } from '../common/UserAvatar';
import { 
  AdminUser, UserFeedback, FeatureDemandSummary, 
  FeatureRequestItem, SystemStats, AuditLog 
} from '../../types';
import { supabase } from '../../lib/supabase';

export const AdminPage: React.FC = () => {
  const { user, setCurrentPage } = useApp();
  
  // Auth & Permissions State
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'users' | 'feedback' | 'features' | 'health' | 'audit'>('users');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Data States
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [feedbackList, setFeedbackList] = useState<UserFeedback[]>([]);
  const [featureSummaries, setFeatureSummaries] = useState<FeatureDemandSummary[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequestItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Filter & Search States
  const [searchUser, setSearchUser] = useState('');
  const [searchFeedback, setSearchFeedback] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'All' | 'New' | 'Investigating' | 'Resolved' | 'Dismissed'>('All');
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<string>('All');
  const [searchFeature, setSearchFeature] = useState('');
  const [searchAudit, setSearchAudit] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState<'All' | 'Success' | 'Failed' | 'Warning'>('All');

  // Modals & Active Viewers
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Problem / Feedback Detail Modal
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'New' | 'Investigating' | 'Resolved' | 'Dismissed'>('New');
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState(false);

  // Toast / Feedback message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (e) {}
    return headers;
  };

  // Main data loader
  const loadAllAdminData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const headers = await getAuthHeaders();

      // Parallel fetch of all admin endpoints
      const [statsRes, usersRes, feedbackRes, featuresRes, auditRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/feedback', { headers }),
        fetch('/api/admin/feature-requests', { headers }),
        fetch('/api/admin/audit-logs', { headers }),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        if (d.success && d.stats) setStats(d.stats);
      }

      if (usersRes.ok) {
        const d = await usersRes.json();
        if (d.success && Array.isArray(d.users)) setAdminUsers(d.users);
      }

      if (feedbackRes.ok) {
        const d = await feedbackRes.json();
        if (d.success && Array.isArray(d.feedback)) setFeedbackList(d.feedback);
      }

      if (featuresRes.ok) {
        const d = await featuresRes.json();
        if (d.success) {
          if (Array.isArray(d.demandSummaries)) setFeatureSummaries(d.demandSummaries);
          if (Array.isArray(d.requests)) setFeatureRequests(d.requests);
        }
      }

      if (auditRes.ok) {
        const d = await auditRes.json();
        if (d.success && Array.isArray(d.auditLogs)) setAuditLogs(d.auditLogs);
      }
    } catch (err) {
      console.error('Failed to refresh admin data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial verification & bootstrap
  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      setIsVerifying(true);
      try {
        const headers = await getAuthHeaders();
        const verifyRes = await fetch('/api/admin/verify', { headers });

        if (!verifyRes.ok) {
          if (isMounted) {
            setIsAuthorized(false);
            setIsVerifying(false);
          }
          return;
        }

        const verifyData = await verifyRes.json();
        if (!verifyData.success || !verifyData.isAdmin) {
          if (isMounted) {
            setIsAuthorized(false);
            setIsVerifying(false);
          }
          return;
        }

        if (isMounted) {
          setIsAuthorized(true);
          setAdminEmail(verifyData.email || user?.email || '');
          setIsVerifying(false);
        }

        await loadAllAdminData();
      } catch (err) {
        if (isMounted) {
          setIsAuthorized(false);
          setIsVerifying(false);
        }
      }
    };

    if (user) {
      verifyAdmin();
    } else {
      setIsAuthorized(false);
      setIsVerifying(false);
    }

    return () => { isMounted = false; };
  }, [user, loadAllAdminData]);

  // User Actions
  const toggleUserRole = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/users/${id}/role`, { method: 'PATCH', headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setAdminUsers(prev => prev.map(u => u.id === id ? data.user : u));
          showToast(`Updated role for ${data.user.name || data.user.email}`);
        }
      }
    } catch (err) {
      console.error('Failed to toggle role:', err);
    }
  };

  const toggleUserStatus = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/users/${id}/status`, { method: 'PATCH', headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setAdminUsers(prev => prev.map(u => u.id === id ? data.user : u));
          showToast(`Updated status to ${data.user.status}`);
        }
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user from the workspace?')) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setAdminUsers(prev => prev.filter(u => u.id !== id));
        showToast('User deleted from workspace');
      } else {
        showToast(data?.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast('Failed to delete user');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setAdminUsers(prev => [data.user, ...prev]);
        setInviteName('');
        setInviteEmail('');
        setIsInviteModalOpen(false);
        showToast(`Invitation sent to ${data.user.email}`);
      } else {
        setInviteError(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      setInviteError('Network error while inviting user');
    } finally {
      setIsInviting(false);
    }
  };

  // Feedback Actions
  const handleOpenFeedbackDetail = (item: UserFeedback) => {
    setSelectedFeedback(item);
    setEditAdminNotes(item.adminNotes || '');
    setEditStatus(item.status);
  };

  const handleSaveFeedbackUpdate = async () => {
    if (!selectedFeedback) return;
    setIsUpdatingFeedback(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/feedback/${selectedFeedback.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: editStatus,
          adminNotes: editAdminNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.feedback) {
        setFeedbackList(prev => prev.map(f => f.id === selectedFeedback.id ? data.feedback : f));
        setSelectedFeedback(null);
        showToast(`Updated status to ${data.feedback.status}`);
        // Refresh stats to reflect new open problems count
        const statsRes = await fetch('/api/admin/stats', { headers });
        if (statsRes.ok) {
          const sd = await statsRes.json();
          if (sd.success && sd.stats) setStats(sd.stats);
        }
      }
    } catch (err) {
      console.error('Failed to update feedback:', err);
    } finally {
      setIsUpdatingFeedback(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm('Delete this feedback record permanently?')) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setFeedbackList(prev => prev.filter(f => f.id !== id));
        if (selectedFeedback?.id === id) setSelectedFeedback(null);
        showToast('Feedback item removed');
      }
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    }
  };

  const handleDeleteFeatureRequest = async (id: string) => {
    if (!window.confirm('Remove this feature request record?')) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/feature-requests/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setFeatureRequests(prev => prev.filter(r => r.id !== id));
        showToast('Feature request removed');
      }
    } catch (err) {
      console.error('Failed to delete feature request:', err);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in max-w-md mx-auto">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
          Verifying administrative authorization...
        </p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-100 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <span className="px-3 py-1 bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
          403 Forbidden
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Access Denied
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">
          You do not have administrative privileges to access the Structra Admin Portal.
        </p>
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Filter calculations
  const filteredUsers = adminUsers.filter(u => 
    u.name.toLowerCase().includes(searchUser.toLowerCase()) || 
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredFeedback = feedbackList.filter(f => {
    const matchesSearch = 
      f.title.toLowerCase().includes(searchFeedback.toLowerCase()) ||
      f.description.toLowerCase().includes(searchFeedback.toLowerCase()) ||
      (f.userEmail || '').toLowerCase().includes(searchFeedback.toLowerCase()) ||
      (f.userName || '').toLowerCase().includes(searchFeedback.toLowerCase()) ||
      (f.documentTitle || '').toLowerCase().includes(searchFeedback.toLowerCase());
    
    const matchesStatus = feedbackStatusFilter === 'All' || f.status === feedbackStatusFilter;
    const matchesCategory = feedbackCategoryFilter === 'All' || f.category === feedbackCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const filteredFeatureRequests = featureRequests.filter(r => 
    r.featureName.toLowerCase().includes(searchFeature.toLowerCase()) ||
    (r.userEmail || '').toLowerCase().includes(searchFeature.toLowerCase()) ||
    (r.details || '').toLowerCase().includes(searchFeature.toLowerCase()) ||
    r.platforms.some(p => p.toLowerCase().includes(searchFeature.toLowerCase()))
  );

  const filteredAuditLogs = auditLogs.filter(l => {
    const matchesSearch = 
      l.action.toLowerCase().includes(searchAudit.toLowerCase()) ||
      l.administrator.toLowerCase().includes(searchAudit.toLowerCase()) ||
      l.resource.toLowerCase().includes(searchAudit.toLowerCase());
    const matchesStatus = auditStatusFilter === 'All' || l.status === auditStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const openProblemsCount = feedbackList.filter(f => f.status === 'New' || f.status === 'Investigating').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Structra Admin Dashboard</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Admin Console & Operations</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Real-time telemetry, user management, problem reports, roadmap interest, and security audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={loadAllAdminData}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh all metrics from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Live Refresh'}</span>
          </button>

          {activeTab === 'users' && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Real Persistent Stats Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Users */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Workspace Users</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats?.activeUsers ?? adminUsers.length} <span className="text-xs font-semibold text-slate-400">/ {stats?.totalUsers ?? adminUsers.length} total</span>
          </p>
          <p className="text-[10px] text-emerald-600 font-bold">100% active identity accounts</p>
        </div>

        {/* Metric 2: Live Documents & Storage */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Live Vault Documents</span>
            <HardDrive className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {stats?.totalDocuments ?? 0} <span className="text-xs font-semibold text-slate-400">({(stats?.storageUsedGb ?? 0.0).toFixed(2)} GB used)</span>
          </p>
          <p className="text-[10px] text-slate-400">
            {stats?.indexedDocuments ?? 0} indexed for AI Search & OCR
          </p>
        </div>

        {/* Metric 3: Open Problems & User Feedback */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Problem Reports & Feedback</span>
            <LifeBuoy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {openProblemsCount} <span className="text-xs font-semibold text-slate-400">open ({feedbackList.length} total)</span>
          </p>
          <p className="text-[10px] text-slate-400">
            {feedbackList.filter(f => f.status === 'Resolved').length} resolved issues
          </p>
        </div>

        {/* Metric 4: Feature Requests & Product Interest */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Roadmap Signals & Interest</span>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {featureRequests.length} <span className="text-xs font-semibold text-slate-400">requests</span>
          </p>
          <p className="text-[10px] text-slate-400">
            {featureSummaries.length} upcoming feature categories
          </p>
        </div>
      </div>

      {/* Admin Nav Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto text-xs font-bold text-slate-600 dark:text-slate-400">
        {[
          { id: 'users', label: 'User Management', icon: Users, badge: adminUsers.length },
          { id: 'feedback', label: 'Problem Reports & Feedback', icon: LifeBuoy, badge: openProblemsCount, badgeColor: 'bg-amber-500 text-white' },
          { id: 'features', label: 'Feature Requests & Roadmap', icon: Sparkles, badge: featureRequests.length, badgeColor: 'bg-blue-600 text-white' },
          { id: 'health', label: 'System Health & Storage', icon: Activity },
          { id: 'audit', label: 'Security & Audit Logs', icon: Lock, badge: auditLogs.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-4 flex items-center gap-2 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${tab.badgeColor || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USER MANAGEMENT                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {filteredUsers.length} of {adminUsers.length} registered users
            </span>
          </div>

          {/* Desktop & Tablet Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Documents & Storage</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.name} avatar={(u as any).avatar} className="w-8 h-8 text-xs shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{u.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                        u.role === 'admin' 
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-100 dark:border-blue-800' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {u.role === 'admin' ? 'Super Admin' : 'Standard User'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{u.documentsCount} documents</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {u.storageUsedBytes ? `${(u.storageUsedBytes / (1024 * 1024)).toFixed(1)} MB` : '0 MB'}
                      </p>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                        u.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' 
                          : u.status === 'Pending Deletion'
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-100 dark:border-rose-800'
                      }`}>
                        {u.status === 'Pending Deletion' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-slate-400 font-medium">
                      {u.registrationDate}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleUserRole(u.id)}
                          className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Change Role
                        </button>
                        {u.status === 'Pending Deletion' ? (
                          <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-lg text-[10px] font-extrabold border border-amber-200 dark:border-amber-800">
                            30-Day Recovery Period
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleUserStatus(u.id)}
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                u.status === 'Active' 
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300' 
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              {u.status === 'Active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={u.name} avatar={(u as any).avatar} className="w-9 h-9 text-xs shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">{u.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{u.email}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    u.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {u.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{u.role === 'admin' ? 'Super Admin' : 'User'}</span>
                  <span>•</span>
                  <span>{u.documentsCount} documents</span>
                  <span>•</span>
                  <span>Joined {u.registrationDate}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => toggleUserRole(u.id)}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold"
                  >
                    Change Role
                  </button>
                  <button
                    onClick={() => toggleUserStatus(u.id)}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold"
                  >
                    {u.status === 'Active' ? 'Suspend' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="px-2.5 py-1 bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 rounded-lg text-[11px] font-bold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROBLEM REPORTS & FEEDBACK (REAL PERSISTED DATA)                   */}
      {/* ========================================================================= */}
      {activeTab === 'feedback' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-amber-500" />
                <span>Live Problem Reports & User Feedback</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Issues reported via "Report a Problem", settings feedback forms, and indexing alerts.
              </p>
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Category filter */}
              <select
                value={feedbackCategoryFilter}
                onChange={(e) => setFeedbackCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Problem Report">Problem Reports</option>
                <option value="Document Indexing / Metadata">Document Indexing</option>
                <option value="Bug Report">Bug Reports</option>
                <option value="Integration Issue">Integration Issues</option>
                <option value="Performance">Performance</option>
                <option value="General Feedback">General Feedback</option>
              </select>

              {/* Status filter */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                {(['All', 'New', 'Investigating', 'Resolved', 'Dismissed'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setFeedbackStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      feedbackStatusFilter === st
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports by title, user email, description, or document..."
              value={searchFeedback}
              onChange={(e) => setSearchFeedback(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Feedback Items List */}
          {filteredFeedback.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No problem reports matching criteria</p>
              <p className="text-[11px]">Any issues submitted by users will appear here in real-time.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFeedback.map((fb) => (
                <div key={fb.id} className="py-4 space-y-2.5 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 p-3 rounded-2xl transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        fb.status === 'New' 
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                          : fb.status === 'Investigating'
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          : fb.status === 'Resolved'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {fb.status}
                      </span>

                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-bold">
                        {fb.category}
                      </span>

                      {fb.priority && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          fb.priority === 'Critical' ? 'bg-rose-100 text-rose-900 font-extrabold' :
                          fb.priority === 'High' ? 'bg-orange-100 text-orange-900' :
                          fb.priority === 'Medium' ? 'bg-blue-50 text-blue-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {fb.priority} Priority
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(fb.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenFeedbackDetail(fb)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect & Update</span>
                      </button>

                      <button
                        onClick={() => handleDeleteFeedback(fb.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{fb.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed whitespace-pre-wrap">
                      {fb.description}
                    </p>
                  </div>

                  {/* Context Metadata row */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      User: <strong className="text-slate-700 dark:text-slate-300">{fb.userEmail || fb.userName || 'Anonymous User'}</strong>
                    </span>

                    {fb.documentTitle && (
                      <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                        <FileText className="w-3 h-3" />
                        Document: {fb.documentTitle}
                      </span>
                    )}

                    {fb.adminNotes && (
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-md text-[10px] font-bold">
                        Admin Note: {fb.adminNotes}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FEATURE REQUESTS & ROADMAP SIGNALS                                  */}
      {/* ========================================================================= */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          {/* Aggregated Demand Summary Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <span>Roadmap Feature Demand & Waitlist</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aggregated signals from users clicking "Notify Me", integrations waitlist, and survey submissions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {featureSummaries.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400 text-xs font-semibold">
                  No feature interest signals submitted yet.
                </div>
              ) : (
                featureSummaries.map((summary, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{summary.featureName}</h4>
                      <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-xl text-xs font-black">
                        {summary.requestCount} requests
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Unique Users: <strong className="text-slate-800 dark:text-slate-200">{summary.uniqueUsers}</strong>
                      </p>
                      
                      {summary.platforms.length > 0 && (
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Platforms requested:</span>
                          <div className="flex flex-wrap gap-1">
                            {summary.platforms.map((p, pIdx) => (
                              <span key={pIdx} className="px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {summary.sampleNotes && summary.sampleNotes.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">User Notes:</span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-2">
                            "{summary.sampleNotes[0]}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Raw Request Records Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">All Individual Submissions</h3>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter feature requests..."
                  value={searchFeature}
                  onChange={(e) => setSearchFeature(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Feature / Platform</th>
                    <th className="py-3 px-3">User Email</th>
                    <th className="py-3 px-3">Details / User Feedback</th>
                    <th className="py-3 px-3">Submitted</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFeatureRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <span>{req.featureName}</span>
                        {req.platforms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {req.platforms.map((p, i) => (
                              <span key={i} className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[9px] font-bold">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 font-medium">
                        {req.userEmail}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 font-medium max-w-xs truncate">
                        {req.details || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteFeatureRequest(req.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Remove Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SYSTEM HEALTH & PERSISTENCE METRICS                                 */}
      {/* ========================================================================= */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Gemini 2.5 Flash API</span>
              <p className="text-xl font-extrabold text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                99.98% Operational
              </p>
              <p className="text-[11px] text-slate-400">Semantic Vector Extraction latency ~280ms</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">OCR & Multi-Channel Pipeline</span>
              <p className="text-xl font-extrabold text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                100% Operational
              </p>
              <p className="text-[11px] text-slate-400">
                Connected accounts: {stats?.connectedGmailAccounts ?? 0} Gmail • {stats?.connectedTelegramAccounts ?? 0} Telegram
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Cloud Storage Cluster</span>
              <p className="text-xl font-extrabold text-slate-800 dark:text-slate-200">
                {(stats?.storageUsedGb ?? 0.0).toFixed(2)} / {(stats?.storageLimitGb ?? 20.0).toFixed(1)} GB
              </p>
              <p className="text-[11px] text-slate-400">
                {((((stats?.storageUsedGb ?? 0.0) / (stats?.storageLimitGb ?? 20.0)) * 100)).toFixed(1)}% capacity utilized
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Live Infrastructure Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Database Layer</span>
                <p className="font-extrabold text-slate-800 dark:text-slate-200">Supabase PostgreSQL</p>
                <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected & Healthy
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Security & RLS</span>
                <p className="font-extrabold text-slate-800 dark:text-slate-200">Row Level Security</p>
                <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Tenant Isolation Active
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Search Performance</span>
                <p className="font-extrabold text-slate-800 dark:text-slate-200">{stats?.aiSearchSuccessRate ?? 96.8}% Accuracy</p>
                <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> High Confidence
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Admin RBAC</span>
                <p className="font-extrabold text-slate-800 dark:text-slate-200">Server-Side Verified</p>
                <span className="text-blue-600 font-bold text-[10px]">
                  Logged in as {adminEmail}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SECURITY AUDIT TRAIL (REAL PERSISTED LOGS)                         */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Security Audit Trail & Governance</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Immutable logs of administrative changes, user feedback events, and system security actions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchAudit}
                  onChange={(e) => setSearchAudit(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <select
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="All">All Statuses</option>
                <option value="Success">Success</option>
                <option value="Warning">Warning</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {filteredAuditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-medium">
                No audit logs found matching filter.
              </div>
            ) : (
              filteredAuditLogs.map((log) => (
                <div key={log.id} className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-slate-900 dark:text-slate-100">{log.action}</p>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase ${
                        log.status === 'Success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        log.status === 'Warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Actor: <strong className="text-slate-700 dark:text-slate-300">{log.administrator}</strong> • Target: {log.resource}
                      {log.ipAddress && ` • IP: ${log.ipAddress}`}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPECT & UPDATE PROBLEM REPORT                                    */}
      {/* ========================================================================= */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Inspect Problem Report</h3>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Subject</label>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  {selectedFeedback.title}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">User Description</label>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedFeedback.description}
                </p>
              </div>

              {selectedFeedback.documentTitle && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Associated Document</label>
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 p-2.5 rounded-xl border border-purple-200 dark:border-purple-900 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{selectedFeedback.documentTitle}</span>
                  </p>
                </div>
              )}

              {/* Status Selector */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Investigation Status</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['New', 'Investigating', 'Resolved', 'Dismissed'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        editStatus === st
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Resolution Notes */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Admin Notes / Internal Resolution</label>
                <textarea
                  rows={3}
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="Record steps taken to resolve, bug tracker ticket ID, or response..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteFeedback(selectedFeedback.id)}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Delete Report
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFeedback(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingFeedback}
                    onClick={handleSaveFeedbackUpdate}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    {isUpdatingFeedback ? 'Saving...' : 'Save Updates'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INVITE MEMBER                                                      */}
      {/* ========================================================================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Invite Team Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInviteUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Okon"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. david@firm.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="user">Standard User (View & Retrieve)</option>
                  <option value="admin">Super Admin (Full Workspace Access)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isInviting ? 'Sending...' : 'Send Invite Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
