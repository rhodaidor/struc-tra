import React from 'react';
import { LegalPage } from './LegalPage';

interface PrivacyPolicyPageProps {
  onNavigateHome?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigateHome }) => {
  return <LegalPage type="privacy" onNavigateHome={onNavigateHome} />;
};
