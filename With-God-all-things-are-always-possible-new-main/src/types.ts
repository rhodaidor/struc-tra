export type AccountType = 'individual' | 'business';
export type UserRole = 'user' | 'admin';

export interface SecurityLog {
  id: string;
  action: string;
  date: string;
  time: string;
  device: string;
  browser: string;
  ip?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  accountType: AccountType;
  workspaceType?: string;
  hasCompletedWorkspaceSelection?: boolean;
  role: UserRole;
  createdAt: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  pendingDeletion?: boolean;
  deletionRequestedAt?: string;
  scheduledDeletionDate?: string;
  language?: string;
  appNotificationsEnabled?: boolean;
  featureUpdatesEnabled?: boolean;
  onboardingCompleted?: boolean;
  password?: string;
  securityLogs?: SecurityLog[];
}

export type DocumentCategory = 
  | 'Invoices' 
  | 'Receipts' 
  | 'Contracts' 
  | 'Payment Confirmations' 
  | 'Quotations' 
  | 'Academic Documents' 
  | 'Reports' 
  | 'Certificates' 
  | 'Others';

export type DocumentSource = 'Gmail' | 'Telegram' | 'Google Drive' | 'OneDrive' | 'Dropbox' | 'Upload Center';

export type FileType = 'PDF' | 'DOCX' | 'XLSX' | 'PPTX' | 'PNG' | 'JPG' | 'TXT';

export interface DocumentShareAccessLog {
  id: string;
  userOrIp: string;
  action: 'view' | 'download';
  timestamp: string;
}

export interface DocumentShareSettings {
  isShared: boolean;
  shareToken?: string;
  shareUrl?: string;
  readOnly?: boolean;
  allowDownload?: boolean;
  expiresAt?: string;
  hasPassword?: boolean;
  password?: string;
  accessLogs?: DocumentShareAccessLog[];
  sharedWithUsers?: Array<{ email: string; name?: string; role: 'viewer' | 'editor' }>;
}

export interface DocumentMetadata {
  vendor?: string;
  issueDate?: string;
  dueDate?: string;
  documentNumber?: string;
  totalAmount?: string;
  currency?: string;
  counterparty?: string;
  confidenceScore?: number;
  extractedKeyValues?: Record<string, string>;
  messageId?: string;
  threadId?: string;
  attachmentId?: string;
  sourceUrl?: string;
  accountEmail?: string;
  connectedAccount?: string;
  channelId?: string;
  [key: string]: any;
}

export interface AppDocument {
  id: string;
  title: string;
  fileName?: string;
  originalFilename?: string;
  category: DocumentCategory;
  source: DocumentSource;
  sourceId?: string; // e.g. Gmail / Telegram message ID
  importStatus: 'Imported' | 'External';
  fileType: FileType;
  fileSize: number; // in bytes
  sizeFormatted: string;
  uploadDate: string;
  modifiedDate: string;
  tags: string[];
  isFavorite: boolean;
  isTrash: boolean;
  deletedAt?: string;
  contentSummary: string;
  rawText?: string;
  metadata: DocumentMetadata;
  fileUrl?: string;
  previewUrl?: string;
  previewStatus?: 'pending' | 'processing' | 'ready' | 'failed';
  previewError?: string;
  shareSettings?: DocumentShareSettings;
}

export type HandlingMode = 'Smart Import' | 'Secure Index' | 'Not Configured';
export type IntegrationStatus = 'Not Connected' | 'Connecting' | 'Connected' | 'Syncing' | 'Connection Error' | 'Disconnected';

export type IntegrationId = 'gmail' | 'telegram' | 'google_drive' | 'onedrive' | 'dropbox' | 'whatsapp';

export interface Integration {
  id: IntegrationId;
  name: string;
  logo: string;
  connected: boolean;
  mode: HandlingMode;
  lastSync: string;
  documentsIndexed: number;
  documentsImported: number;
  accountIdentifier?: string;
  status: IntegrationStatus;
  permissionsGranted?: string[];
  retainedData?: boolean;
  disconnectedAt?: string;
}

export interface SyncActivityLog {
  id: string;
  channel: string;
  icon: 'gmail' | 'telegram' | 'google_drive' | 'onedrive' | 'dropbox' | 'whatsapp';
  activity: string;
  time: string;
  status: 'Success' | 'Failed' | 'Syncing' | 'Running' | 'Warning';
  mode?: HandlingMode;
  isSwitchEvent?: boolean;
}

export type ProcessingStage = 
  | 'Uploading' 
  | 'Virus Scan' 
  | 'Metadata Extraction' 
  | 'AI Document Classification' 
  | 'Smart Tag Generation' 
  | 'Smart Collection Assignment' 
  | 'Search Indexing' 
  | 'Completed' 
  | 'Failed';

export interface UploadJob {
  id: string;
  fileName: string;
  fileSize: number;
  sizeFormatted: string;
  fileType: FileType;
  progress: number;
  stage: ProcessingStage;
  status: 'Uploading' | 'Processing' | 'Indexed' | 'Failed';
  uploadDate: string;
  source: DocumentSource;
  error?: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
}

export type MatchType = 'EXACT' | 'RELATED' | 'NONE';

export interface AISearchResult {
  query: string;
  matchedDocumentIds: string[];
  bestMatchId?: string | null;
  matchType?: MatchType;
  contextDocumentIds?: string[];
  aiAnswer?: string;
  reasoning?: string;
  confidence?: number;
  parsedIntent?: {
    intent?: string;
    documentType?: string;
    vendor?: string;
    dateRange?: string;
    filename?: string;
    [key: string]: any;
  };
  suggestedCategory?: string | null;
  suggestedSource?: string | null;
  isSearching: boolean;
  searchError?: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  createdAt?: string;
  unread: boolean;
  targetPage?: string;
  type?: 'upload' | 'document' | 'integration' | 'system' | 'feature_update';
  isSecurity?: boolean;
  isFeatureUpdate?: boolean;
}

export interface UserFeedback {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  category: 'Problem Report' | 'Bug Report' | 'General Feedback' | 'Feature Request' | 'Performance' | 'Integration Issue' | string;
  title: string;
  description: string;
  documentId?: string;
  documentTitle?: string;
  feature?: string;
  status: 'New' | 'Investigating' | 'Resolved' | 'Dismissed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  adminNotes?: string;
  browserContext?: any;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureRequestItem {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  featureName: string;
  category: string;
  platforms: string[];
  details?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureDemandSummary {
  featureName: string;
  requestCount: number;
  platforms: string[];
  uniqueUsers: number;
  latestRequestAt: string;
  sampleNotes?: string[];
  userEmails: string[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  plan: 'Free' | 'Pro' | 'Enterprise';
  status: 'Active' | 'Suspended' | 'Pending Deletion';
  registrationDate: string;
  lastLogin: string;
  documentsCount: number;
  storageUsedBytes?: number;
  scheduledDeletionDate?: string;
  role?: UserRole;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  indexedDocuments: number;
  connectedGmailAccounts: number;
  connectedTelegramAccounts: number;
  dailySearches: number;
  aiSearchSuccessRate: number; // e.g. 96.8
  storageUsedGb: number;
  storageLimitGb: number;
  systemHealth: 'Optimal' | 'Degraded' | 'Maintenance';
  openProblemsCount?: number;
  totalFeedbackCount?: number;
  totalFeatureRequestsCount?: number;
  topRequestedFeatures?: { name: string; count: number }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  administrator: string;
  action: string;
  resource: string;
  status: 'Success' | 'Failed' | 'Warning';
  details?: any;
  ipAddress?: string;
}


export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  referencedDocumentIds?: string[];
  matchType?: MatchType;
  contextDocumentIds?: string[];
}

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}
