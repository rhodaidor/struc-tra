import React from 'react';
import { LegalPage } from './LegalPage';

interface TermsOfServicePageProps {
  onNavigateHome?: () => void;
}

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onNavigateHome }) => {
  return <LegalPage type="terms" onNavigateHome={onNavigateHome} />;
};
