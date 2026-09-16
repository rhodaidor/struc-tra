import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountType } from '../../types';
import { User, Building2, Check } from 'lucide-react';

export const AccountTypeModal: React.FC = () => {
  const { isAccountTypeModalOpen, completeWorkspaceSelection } = useApp();
  const [selectedType, setSelectedType] = useState<AccountType | null>('individual');

  if (!isAccountTypeModalOpen) return null;

  const handleContinue = () => {
    if (!selectedType) return;
    completeWorkspaceSelection(selectedType);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F0F2FE]/95 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-8 sm:p-10 shadow-xl border border-slate-200 text-center relative animate-in zoom-in-95">
        
        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome to Structra!
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 mb-8">
          Choose how you want to use Structra
        </p>

        {/* Choice Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
          
          {/* Individual Card */}
          <button
            type="button"
            onClick={() => setSelectedType('individual')}
            className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer select-none relative ${
              selectedType === 'individual'
                ? 'border-2 border-indigo-600 bg-indigo-50/20 shadow-xs ring-2 ring-indigo-500/20'
                : 'border border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                  selectedType === 'individual'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selectedType === 'individual' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900">Individual</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              For Personal Use
            </p>
          </button>

          {/* Business / Team Card */}
          <button
            type="button"
            onClick={() => setSelectedType('business')}
            className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer select-none relative ${
              selectedType === 'business'
                ? 'border-2 border-indigo-600 bg-indigo-50/20 shadow-xs ring-2 ring-indigo-500/20'
                : 'border border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                  selectedType === 'business'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selectedType === 'business' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900">Business / Team</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              For Teams and Organizations
            </p>
          </button>
        </div>

        {/* Continue Button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedType}
          className="w-full max-w-xs mx-auto block py-3.5 px-6 bg-[#3B30E8] hover:bg-[#2F25C9] active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
