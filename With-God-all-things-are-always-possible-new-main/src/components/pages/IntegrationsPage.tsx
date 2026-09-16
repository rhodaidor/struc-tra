import React, { useState } from 'react';
import { 
  Shield, RefreshCw, ToggleLeft, ToggleRight,
  Plus, Activity, Check, Unlink, Sparkles, ArrowRight,
  Puzzle, Users, Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Integration, HandlingMode, IntegrationId } from '../../types';
import { ConnectionFlowModal } from '../modals/ConnectionFlowModal';
import { ModeSwitchModal } from '../modals/ModeSwitchModal';
import { DisconnectModal } from '../modals/DisconnectModal';
import { ReconnectModal } from '../modals/ReconnectModal';
import { MoreIntegrationsModal } from '../modals/MoreIntegrationsModal';

export const IntegrationsPage: React.FC = () => {
  const { 
    integrations, 
    syncActivityLogs,
    connectIntegration,
    disconnectIntegration,
    reconnectIntegration,
    updateIntegrationMode,
    triggerSync,
  } = useApp();

  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Modal states
  const [selectedIntegrationForFlow, setSelectedIntegrationForFlow] = useState<Integration | null>(null);
  const [selectedIntegrationForModeSwitch, setSelectedIntegrationForModeSwitch] = useState<{ integration: Integration; targetMode: HandlingMode } | null>(null);
  const [selectedIntegrationForDisconnect, setSelectedIntegrationForDisconnect] = useState<Integration | null>(null);
  const [selectedIntegrationForReconnect, setSelectedIntegrationForReconnect] = useState<Integration | null>(null);
  const [showMoreIntegrationsModal, setShowMoreIntegrationsModal] = useState(false);

  // Filter ONLY Gmail and Telegram for Structra MVP
  const mvpIntegrations = integrations.filter(i => i.id === 'gmail' || i.id === 'telegram');
  const gmailIntegration = mvpIntegrations.find(i => i.id === 'gmail');
  const telegramIntegration = mvpIntegrations.find(i => i.id === 'telegram');

  // Filter activity logs to strictly match the currently enabled mode for each channel
  const mvpActivityLogs = syncActivityLogs.filter(log => {
    const isGmail = log.channel.toLowerCase().includes('gmail');
    const isTelegram = log.channel.toLowerCase().includes('telegram');

    if (!isGmail && !isTelegram) return false;

    const channelIntegration = isGmail ? gmailIntegration : telegramIntegration;
    if (!channelIntegration) return false;

    // If channel is not connected, skip normal logs unless it's a switch or disconnect event
    if (!channelIntegration.connected && !log.isSwitchEvent && !log.activity.includes('switched')) {
      return false;
    }

    const currentMode = channelIntegration.mode; // 'Smart Import' or 'Secure Index'

    // Always keep transition mode switch events (e.g. "Gmail switched to Secure Index.")
    if (log.isSwitchEvent || log.activity.includes('switched to')) {
      return true;
    }

    // If log has an explicit mode property, check if it matches current active mode
    if (log.mode) {
      return log.mode === currentMode;
    }

    // Fallback text check
    if (currentMode === 'Smart Import') {
      return !log.activity.toLowerCase().includes('secure index') && !log.activity.toLowerCase().includes('re-indexed');
    } else if (currentMode === 'Secure Index') {
      return !log.activity.toLowerCase().includes('smart import') && !log.activity.toLowerCase().includes('attachments saved');
    }

    return true;
  });

  const handleTriggerSync = async (id: IntegrationId) => {
    setSyncingId(id);
    await triggerSync(id);
    setSyncingId(null);
  };

  const handleModeToggleClick = (integration: Integration) => {
    if (!integration.connected) return;
    const targetMode: HandlingMode = integration.mode === 'Smart Import' ? 'Secure Index' : 'Smart Import';
    setSelectedIntegrationForModeSwitch({ integration, targetMode });
  };

  const activeIntegrations = mvpIntegrations.filter(i => i.connected);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-5xl mx-auto">
      
      {/* 1. Page Header */}
      <div className="space-y-1 border-b border-slate-200/80 dark:border-[#22242a] pb-5">
        <h1 className="text-2xl font-black text-slate-900 dark:text-[#ededee] tracking-tight">
          Integrations
        </h1>
        <p className="text-xs text-slate-500 dark:text-[#888c9b] font-semibold">
          Manage your connected sources and document processing.
        </p>
      </div>

      {/* Product Rule Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-blue-300">
              Structra MVP Pipeline Active
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Each source runs in <strong>ONE mode at a time</strong> (Smart Import or Secure Index). Switching modes reconfigures your sync pipeline safely.
            </p>
          </div>
        </div>
      </div>

      {/* 2 & 3. Gmail & Telegram Cards Layout */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#6b7082]">
          Supported MVP Channels
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mvpIntegrations.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white dark:bg-[#16171b] rounded-3xl border p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5 flex flex-col justify-between transition-all ${
                item.connected ? 'border-slate-200/90 dark:border-[#22242a]' : 'border-slate-200/60 dark:border-[#22242a] opacity-90'
              }`}
            >
              <div className="space-y-4">
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 w-full">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-[#1c1e24] border border-slate-100 dark:border-[#262832] p-2.5 flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={item.logo}
                        alt={item.name}
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-[#ededee] truncate">{item.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-[#888c9b] font-medium truncate">
                        {item.accountIdentifier || 'Not linked'}
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-auto shrink-0 pt-0.5">
                    {item.status === 'Connecting' ? (
                      <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-extrabold border border-blue-100 dark:border-blue-900/40 inline-flex items-center gap-1.5 whitespace-nowrap">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-500 shrink-0" />
                        Connecting
                      </span>
                    ) : item.status === 'Connection Error' ? (
                      <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-extrabold border border-rose-100 dark:border-rose-900/40 inline-flex items-center gap-1.5 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        Connection Error
                      </span>
                    ) : item.connected ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold border border-emerald-100 dark:border-emerald-900/40 inline-flex items-center gap-1.5 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        Connected
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#20222a] text-slate-500 dark:text-[#888c9b] text-xs font-bold border border-slate-200 dark:border-[#262832] inline-flex items-center shrink-0 whitespace-nowrap">
                        {item.status === 'Disconnected' ? 'Disconnected' : 'Not Connected'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Integration Description */}
                <p className="text-xs text-slate-500 dark:text-[#888c9b] leading-relaxed">
                  {item.id === 'gmail' 
                    ? 'Import and process document attachments directly from your Gmail inbox & messages.' 
                    : 'Import and process business documents directly from your Telegram user chats & channels via MTProto.'}
                </p>

                {/* Handling Mode Box */}
                <div className="p-3.5 bg-slate-50 dark:bg-[#1c1e24] rounded-2xl border border-slate-200/60 dark:border-[#262832] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-400 dark:text-[#6b7082] block text-[10px] uppercase tracking-wider">Processing Mode:</span>
                      <span className={`text-xs font-black ${
                        item.mode === 'Smart Import' 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : item.mode === 'Secure Index' 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : 'text-slate-400 dark:text-[#6b7082]'
                      }`}>
                        {item.mode}
                      </span>
                    </div>

                    {item.connected && (
                      <button 
                        onClick={() => handleModeToggleClick(item)} 
                        title="Switch Mode"
                        className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        {item.mode === 'Smart Import' ? (
                          <ToggleRight className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-semibold border-t border-slate-200/50 dark:border-[#262832]">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.mode === 'Smart Import' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <span className={item.mode === 'Smart Import' ? 'text-slate-900 dark:text-[#ededee] font-extrabold' : 'text-slate-400 dark:text-[#6b7082]'}>
                        Smart Import
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.mode === 'Secure Index' ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <span className={item.mode === 'Secure Index' ? 'text-slate-900 dark:text-[#ededee] font-extrabold' : 'text-slate-400 dark:text-[#6b7082]'}>
                        Secure Index
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Footer */}
                <div className="flex justify-between text-xs text-slate-500 dark:text-[#888c9b] font-medium pt-1">
                  <span>Indexed: <strong className="text-slate-800 dark:text-[#ededee]">{item.documentsIndexed} docs</strong></span>
                  <span>Last Sync: <strong className="text-slate-800 dark:text-[#ededee]">{item.lastSync}</strong></span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#22242a] flex flex-col sm:grid sm:grid-cols-2 gap-2.5">
                {item.status === 'Connecting' ? (
                  <button
                    disabled
                    className="w-full sm:col-span-2 py-2.5 px-4 bg-slate-100 dark:bg-[#20222a] text-slate-400 dark:text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Connecting...</span>
                  </button>
                ) : item.connected ? (
                  <>
                    <button
                      onClick={() => setSelectedIntegrationForDisconnect(item)}
                      className="w-full py-2.5 px-3 bg-slate-100 dark:bg-[#20222a] hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 text-slate-700 dark:text-[#ededee] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>

                    <button
                      onClick={() => handleTriggerSync(item.id)}
                      disabled={syncingId === item.id || item.status === 'Syncing'}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingId === item.id || item.status === 'Syncing' ? 'animate-spin' : ''}`} />
                      <span>{syncingId === item.id || item.status === 'Syncing' ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  </>
                ) : item.status === 'Connection Error' ? (
                  <button
                    onClick={() => setSelectedIntegrationForFlow(item)}
                    className="w-full sm:col-span-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Connection</span>
                  </button>
                ) : item.status === 'Disconnected' ? (
                  <button
                    onClick={() => setSelectedIntegrationForReconnect(item)}
                    className="w-full sm:col-span-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Connect</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedIntegrationForFlow(item)}
                    className="w-full sm:col-span-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Connect New Source Button (Below Gmail & Telegram cards) */}
      <div className="p-6 bg-slate-50 dark:bg-[#16171b] border border-slate-200/80 dark:border-[#22242a] rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#ededee] flex items-center gap-2 justify-center sm:justify-start">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Need another integration?</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#888c9b] font-medium">
            Structra currently supports Gmail and Telegram. Request new sources for our roadmap.
          </p>
        </div>

        <button
          onClick={() => setShowMoreIntegrationsModal(true)}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Source</span>
        </button>
      </div>

      {/* Lower Section: Sync Activity Logs */}
      <div className="bg-white dark:bg-[#16171b] rounded-3xl border border-slate-200/80 dark:border-[#22242a] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#22242a]">
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-[#ededee] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Live Sync Activity
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-[#888c9b] font-medium">Real-time pipeline indexing & import logs</p>
          </div>

          <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/40">
            {activeIntegrations.length} Channel{activeIntegrations.length === 1 ? '' : 's'} Active
          </span>
        </div>

        {mvpActivityLogs.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-1.5 border border-dashed border-slate-200 dark:border-[#262832] rounded-2xl bg-slate-50/50 dark:bg-[#1c1e24]/50">
            <p className="text-xs font-extrabold text-slate-800 dark:text-[#ededee]">
              No synchronization activity yet.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#888c9b] font-medium max-w-sm mx-auto leading-relaxed">
              Connect Gmail or Telegram and enable Smart Import or Secure Index to start tracking activity.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead className="bg-slate-50 dark:bg-[#1c1e24] border-b border-slate-200 dark:border-[#22242a] text-[10px] font-extrabold text-slate-400 dark:text-[#6b7082] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Channel & Activity</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#22242a]">
                {mvpActivityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-[#20222a] transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-[#ededee]">{log.channel}</span>
                          <p className="text-[10px] text-slate-500 dark:text-[#888c9b]">{log.activity}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-[#888c9b] text-[11px]">{log.time}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] border border-emerald-100 dark:border-emerald-900/40 inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Coming Soon Banner (NEW - Placed at the very bottom) */}
      <div className="bg-slate-950 border border-slate-800/90 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row items-stretch justify-between gap-8 transition-all">
        {/* Left Column: Heading, Description & Action Button */}
        <div className="space-y-4 flex flex-col justify-between max-w-xl">
          <div className="space-y-3">
            <div className="inline-block">
              <span className="px-2.5 py-1 bg-blue-950/80 text-blue-400 border border-blue-800/60 text-[10px] font-black uppercase tracking-widest rounded-md">
                COMING SOON
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              More Powerful Features Are on the Way 🚀
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              We're building the next generation of Structra to help individuals, businesses, and teams organize, search, and manage documents even more efficiently. Be among the first to experience upcoming integrations, collaboration tools, enterprise-grade security, and advanced AI capabilities.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowMoreIntegrationsModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer w-fit"
            >
              <span>Join the Waitlist</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Upcoming Features Preview Grid */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 space-y-4 max-w-md w-full shrink-0 flex flex-col justify-center">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/40 flex items-center justify-center shrink-0">
              <Puzzle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">More Integrations</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                Connect Structra with the tools you already use.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/40 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Team Workspaces</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                Collaborate securely with your team.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/40 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Enterprise Security</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                Advanced security, compliance, and administrative controls.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/40 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Advanced AI Insights</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                Smarter document analysis, recommendations, and AI-powered insights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Render Modals */}
      {selectedIntegrationForFlow && (
        <ConnectionFlowModal
          isOpen={!!selectedIntegrationForFlow}
          onClose={() => setSelectedIntegrationForFlow(null)}
          integration={selectedIntegrationForFlow}
          onComplete={(id, accountId, mode, perms, initialSyncMetrics) => connectIntegration(id, accountId, mode, perms, initialSyncMetrics)}
        />
      )}

      {selectedIntegrationForModeSwitch && (
        <ModeSwitchModal
          isOpen={!!selectedIntegrationForModeSwitch}
          onClose={() => setSelectedIntegrationForModeSwitch(null)}
          integration={selectedIntegrationForModeSwitch.integration}
          targetMode={selectedIntegrationForModeSwitch.targetMode}
          onConfirm={(id, newMode) => updateIntegrationMode(id, newMode)}
        />
      )}

      {selectedIntegrationForDisconnect && (
        <DisconnectModal
          isOpen={!!selectedIntegrationForDisconnect}
          onClose={() => setSelectedIntegrationForDisconnect(null)}
          integration={selectedIntegrationForDisconnect}
          onConfirmDisconnect={(id, options) => disconnectIntegration(id, options)}
        />
      )}

      {selectedIntegrationForReconnect && (
        <ReconnectModal
          isOpen={!!selectedIntegrationForReconnect}
          onClose={() => setSelectedIntegrationForReconnect(null)}
          integration={selectedIntegrationForReconnect}
          onConfirmReconnect={(id, option, mode) => reconnectIntegration(id, option, mode)}
        />
      )}

      {showMoreIntegrationsModal && (
        <MoreIntegrationsModal
          isOpen={showMoreIntegrationsModal}
          onClose={() => setShowMoreIntegrationsModal(false)}
        />
      )}

    </div>
  );
};
