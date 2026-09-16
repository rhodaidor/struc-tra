import React, { useState, useEffect } from 'react';
import { X, Check, Send, Sparkles, CheckCircle2, Puzzle, Users, Shield, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MoreIntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURE_OPTIONS = [
  { id: 'More Integrations', label: 'More Integrations', desc: 'Connect Structra with existing tools' },
  { id: 'Team Workspaces', label: 'Team Workspaces', desc: 'Collaborate securely with team members' },
  { id: 'Enterprise Security', label: 'Enterprise Security', desc: 'Compliance & admin controls' },
  { id: 'Advanced AI Insights', label: 'Advanced AI Insights', desc: 'Deeper document analysis & search' },
];

const PLATFORM_OPTIONS = [
  'WhatsApp Business',
  'Google Drive',
  'OneDrive',
  'Dropbox',
  'Outlook',
  'iCloud Drive',
  'Slack',
  'Box',
  'Notion',
  'SharePoint',
  'Zoho Mail',
  'Proton Mail',
  'Other',
];

export const MoreIntegrationsModal: React.FC<MoreIntegrationsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useApp();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['More Integrations']);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState(user?.email || 'user@example.com');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Lock background webpage scrolling when Roadmap & Waitlist modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlatforms.length === 0 && selectedFeatures.length === 0) return;
    
    setIsSubmitting(true);
    const requestData = {
      email,
      features: selectedFeatures,
      platforms: selectedPlatforms,
      otherDetail: selectedPlatforms.includes('Other') ? otherText : null,
      feedback: feedbackText || null,
      submittedAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('structra_integration_requests') || '[]');
      existing.push(requestData);
      localStorage.setItem('structra_integration_requests', JSON.stringify(existing));
    } catch {
      // ignore localstorage errors
    }

    try {
      let token: string | undefined;
      try {
        const { supabase } = await import('../../lib/supabase');
        const session = (await supabase.auth.getSession()).data.session;
        token = session?.access_token;
      } catch (authErr) {
        // Continue if no session
      }

      await fetch('/api/feature-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestData),
      });
    } catch (apiErr) {
      console.warn('Feature request API notice:', apiErr);
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  const resetAndClose = () => {
    setSubmitted(false);
    setSelectedPlatforms([]);
    setSelectedFeatures(['More Integrations']);
    setOtherText('');
    setFeedbackText('');
    onClose();
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white dark:bg-[#16171b] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200/90 dark:border-[#22242a] space-y-6 relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-[#ededee] hover:bg-slate-100 dark:hover:bg-[#20222a] rounded-xl transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-[#ededee]">Thank you!</h3>
              <p className="text-sm font-semibold text-slate-700 dark:text-[#d0d3de] max-w-md mx-auto">
                Your request has been recorded.
              </p>
              <p className="text-xs text-slate-500 dark:text-[#888c9b] font-medium max-w-md mx-auto">
                We'll notify you when these upcoming capabilities and integrations become available.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={resetAndClose}
                className="px-6 py-2.5 bg-slate-900 dark:bg-[#20222a] hover:bg-slate-800 dark:hover:bg-[#262832] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Modal Header */}
            <div className="space-y-1.5 pr-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Roadmap & Waitlist</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-[#ededee] tracking-tight">
                More Powerful Features Are Coming
              </h2>
              <p className="text-xs font-semibold text-slate-600 dark:text-[#888c9b]">
                Help us prioritize which capabilities and integrations to build next.
              </p>
            </div>

            {/* Subtitle / Body text */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#1c1e24] border border-slate-200/80 dark:border-[#262832] rounded-2xl text-xs text-slate-600 dark:text-[#888c9b] space-y-1 font-medium leading-relaxed">
              <p>
                <strong className="text-slate-800 dark:text-[#ededee]">Structra currently supports Gmail and Telegram.</strong>
              </p>
              <p>
                We're actively working on additional integrations and capabilities. Tell us what you'd like to see.
              </p>
            </div>

            {/* Future Features Checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-800 dark:text-[#ededee] block uppercase tracking-wider">
                Upcoming Features of Interest:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FEATURE_OPTIONS.map((feat) => {
                  const isChecked = selectedFeatures.includes(feat.id);
                  return (
                    <label
                      key={feat.id}
                      onClick={() => toggleFeature(feat.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-start gap-2.5 cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 shadow-2xs'
                          : 'border-slate-200/80 dark:border-[#262832] bg-white dark:bg-[#1c1e24] text-slate-700 dark:text-[#888c9b] hover:bg-slate-50 dark:hover:bg-[#20222a] hover:border-slate-300 dark:hover:border-[#383c48]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-[#383c48] bg-white dark:bg-[#16171b]'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="block font-black text-slate-900 dark:text-[#ededee]">{feat.label}</span>
                        <span className="text-[10px] text-slate-500 dark:text-[#888c9b] font-normal block leading-tight">{feat.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Platforms Checkbox Grid */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-800 dark:text-[#ededee] block uppercase tracking-wider">
                Future Integration Platforms:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PLATFORM_OPTIONS.map((option) => {
                  const isChecked = selectedPlatforms.includes(option);
                  return (
                    <label
                      key={option}
                      onClick={() => togglePlatform(option)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 shadow-2xs'
                          : 'border-slate-200/80 dark:border-[#262832] bg-white dark:bg-[#1c1e24] text-slate-700 dark:text-[#888c9b] hover:bg-slate-50 dark:hover:bg-[#20222a] hover:border-slate-300 dark:hover:border-[#383c48]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-[#383c48] bg-white dark:bg-[#16171b]'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate text-slate-900 dark:text-[#ededee]">{option}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* If "Other" selected, show text field */}
            {selectedPlatforms.includes('Other') && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-extrabold text-slate-800 dark:text-[#ededee] block">
                  What integration would you like to see?
                </label>
                <input
                  type="text"
                  required
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="e.g. Salesforce, WhatsApp, Discord, Evernote..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1c1e24] border border-slate-200 dark:border-[#262832] rounded-xl text-xs font-medium text-slate-800 dark:text-[#ededee] placeholder:text-slate-400 dark:placeholder:text-[#6b7082] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {/* Optional Feedback */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 dark:text-[#ededee] block">
                Additional Feedback / Use Cases (Optional):
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={2}
                placeholder="Tell us more about how you plan to use Structra..."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#1c1e24] border border-slate-200 dark:border-[#262832] rounded-xl text-xs font-medium text-slate-800 dark:text-[#ededee] placeholder:text-slate-400 dark:placeholder:text-[#6b7082] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 dark:text-[#ededee] block">
                Notification Email:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1c1e24] border border-slate-200 dark:border-[#262832] rounded-xl text-xs font-medium text-slate-800 dark:text-[#ededee] placeholder:text-slate-400 dark:placeholder:text-[#6b7082] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Footer / Submit */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 dark:bg-[#20222a] hover:bg-slate-200 dark:hover:bg-[#262832] text-slate-700 dark:text-[#ededee] rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={selectedPlatforms.length === 0 && selectedFeatures.length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center gap-2 cursor-pointer"
              >
                <span>Notify Me</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

