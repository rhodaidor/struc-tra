import { DocumentCategory } from '../types';

export const CANONICAL_CATEGORIES: DocumentCategory[] = [
  'Invoices',
  'Receipts',
  'Contracts',
  'Reports',
  'Certificates',
  'Quotations',
  'Payment Confirmations',
  'Academic Documents',
  'Others',
];

/**
 * Normalizes any category string or infers category from title, content text, tags, and file metadata.
 * Returns strictly a canonical DocumentCategory.
 */
export function normalizeDocumentCategory(
  rawCategory?: string | null,
  title?: string,
  text?: string,
  tags?: string[]
): DocumentCategory {
  if (rawCategory && typeof rawCategory === 'string') {
    const trimmed = rawCategory.trim().toLowerCase();

    // Direct canonical checks
    if (trimmed === 'invoices' || trimmed === 'invoice' || trimmed === 'bills' || trimmed === 'bill' || trimmed === 'tax invoice') {
      return 'Invoices';
    }
    if (trimmed === 'receipts' || trimmed === 'receipt' || trimmed === 'pos' || trimmed === 'sales receipt' || trimmed === 'purchase receipt') {
      return 'Receipts';
    }
    if (trimmed === 'contracts' || trimmed === 'contract' || trimmed === 'agreement' || trimmed === 'agreements' || trimmed === 'lease' || trimmed === 'nda') {
      return 'Contracts';
    }
    if (trimmed === 'reports' || trimmed === 'report' || trimmed === 'audit' || trimmed === 'quarterly' || trimmed === 'annual report' || trimmed === 'analysis') {
      return 'Reports';
    }
    if (trimmed === 'certificates' || trimmed === 'certificate' || trimmed === 'certification' || trimmed === 'tax clearance' || trimmed === 'tcc' || trimmed === 'compliance') {
      return 'Certificates';
    }
    if (trimmed === 'quotations' || trimmed === 'quotation' || trimmed === 'quote' || trimmed === 'quotes' || trimmed === 'estimate' || trimmed === 'proforma') {
      return 'Quotations';
    }
    if (trimmed === 'payment confirmations' || trimmed === 'payment confirmation' || trimmed === 'payment' || trimmed === 'transfer receipt' || trimmed === 'remittance') {
      return 'Payment Confirmations';
    }
    if (trimmed === 'academic documents' || trimmed === 'academic' || trimmed === 'thesis' || trimmed === 'transcript' || trimmed === 'syllabus' || trimmed === 'srs') {
      return 'Academic Documents';
    }
    if (trimmed === 'others' || trimmed === 'other' || trimmed === 'general' || trimmed === 'document' || trimmed === 'uncategorized') {
      // If marked as General/Others, attempt smart heuristic from title and text before giving up
      const inferred = inferCategoryFromSignals(title, text, tags);
      if (inferred) return inferred;
      return 'Others';
    }

    // Partial matches
    if (trimmed.includes('receipt')) return 'Receipts';
    if (trimmed.includes('invoice') || trimmed.includes('billing')) return 'Invoices';
    if (trimmed.includes('contract') || trimmed.includes('agreement') || trimmed.includes('lease') || trimmed.includes('legal')) return 'Contracts';
    if (trimmed.includes('report') || trimmed.includes('summary') || trimmed.includes('audit')) return 'Reports';
    if (trimmed.includes('certificat') || trimmed.includes('tax clearance')) return 'Certificates';
    if (trimmed.includes('quote') || trimmed.includes('quotation') || trimmed.includes('estimate')) return 'Quotations';
    if (trimmed.includes('payment') || trimmed.includes('transfer') || trimmed.includes('remittance')) return 'Payment Confirmations';
    if (trimmed.includes('academic') || trimmed.includes('curriculum') || trimmed.includes('thesis')) return 'Academic Documents';
  }

  // If no valid category was supplied, infer from signals (title, text, tags)
  const inferred = inferCategoryFromSignals(title, text, tags);
  if (inferred) return inferred;

  return 'Others';
}

/**
 * Intelligent multi-signal heuristic classifier for documents based on text snippet, title, and tags
 */
export function inferCategoryFromSignals(
  title?: string,
  text?: string,
  tags?: string[]
): DocumentCategory | null {
  const combined = [
    title || '',
    text ? text.slice(0, 3000) : '',
    ...(tags || [])
  ].join(' ').toLowerCase();

  if (!combined.trim()) return null;

  const scores: Record<DocumentCategory, number> = {
    Invoices: 0,
    Receipts: 0,
    Contracts: 0,
    Reports: 0,
    Certificates: 0,
    Quotations: 0,
    'Payment Confirmations': 0,
    'Academic Documents': 0,
    Others: 0,
  };

  // Receipts signals (Weighted)
  if (/\b(receipt|pos\b|sales receipt|purchase receipt|cash receipt|total paid|items purchased|merchant|cashier|terminal id|vat receipt|receipt #|store receipt|till #)\b/i.test(combined)) scores.Receipts += 40;
  if (/\b(subtotal|change due|card ending in|visa debit|mastercard|approved|auth code)\b/i.test(combined)) scores.Receipts += 20;

  // Invoices signals
  if (/\b(invoice|bill to|invoice number|inv-|inv_|due date|payment due|remit to|amount due|balance due|net 30|tax invoice|vendor invoice)\b/i.test(combined)) scores.Invoices += 40;
  if (/\b(billing address|unit price|po number|purchase order|account payable)\b/i.test(combined)) scores.Invoices += 20;

  // Contracts signals
  if (/\b(agreement|contract|lease agreement|service agreement|nda|non-disclosure|memorandum of understanding|mou|hereby agree|terms and conditions|indemnity|governing law|witnesseth|landlord|tenant)\b/i.test(combined)) scores.Contracts += 40;
  if (/\b(confidentiality|effective date|parties|severability|clause|jurisdiction)\b/i.test(combined)) scores.Contracts += 20;

  // Reports signals
  if (/\b(report|quarterly|annual report|financial statement|balance sheet|audit report|executive summary|findings|performance review|progress report|market analysis|kpi)\b/i.test(combined)) scores.Reports += 40;
  if (/\b(methodology|conclusion|overview|metrics|evaluation|quarter)\b/i.test(combined)) scores.Reports += 15;

  // Certificates signals
  if (/\b(certificate|tax clearance certificate|tcc|certification|certified that|firs|cac|certificate of incorporation|diploma|awarded to|has successfully completed|accreditation)\b/i.test(combined)) scores.Certificates += 40;

  // Quotations signals
  if (/\b(quotation|price quote|estimate|price estimation|proforma invoice|pro-forma|valid until|quote #|rfq)\b/i.test(combined)) scores.Quotations += 40;

  // Payment Confirmations signals
  if (/\b(payment confirmation|transaction successful|transfer receipt|transaction receipt|transfer successful|debit alert|credit alert|bank transfer confirmation|remittance advice|proof of payment)\b/i.test(combined)) scores['Payment Confirmations'] += 40;

  // Academic signals
  if (/\b(thesis|dissertation|transcript|curriculum|syllabus|software requirements specification|srs\b|course outline|faculty of|department of|student id|matric)\b/i.test(combined)) scores['Academic Documents'] += 40;

  // Title-specific bonus
  if (title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('receipt')) scores.Receipts += 50;
    if (lowerTitle.includes('invoice') || lowerTitle.includes('inv_') || lowerTitle.includes('inv-')) scores.Invoices += 50;
    if (lowerTitle.includes('contract') || lowerTitle.includes('agreement') || lowerTitle.includes('lease') || lowerTitle.includes('nda')) scores.Contracts += 50;
    if (lowerTitle.includes('report') || lowerTitle.includes('audit')) scores.Reports += 50;
    if (lowerTitle.includes('certificate') || lowerTitle.includes('tcc') || lowerTitle.includes('tax_clearance')) scores.Certificates += 50;
    if (lowerTitle.includes('quote') || lowerTitle.includes('quotation') || lowerTitle.includes('estimate')) scores.Quotations += 50;
    if (lowerTitle.includes('payment') || lowerTitle.includes('transfer')) scores['Payment Confirmations'] += 50;
    if (lowerTitle.includes('srs') || lowerTitle.includes('curriculum') || lowerTitle.includes('thesis')) scores['Academic Documents'] += 50;
  }

  // Find max scored category
  let bestCategory: DocumentCategory | null = null;
  let maxScore = 0;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore && cat !== 'Others') {
      maxScore = score;
      bestCategory = cat as DocumentCategory;
    }
  }

  if (maxScore >= 15 && bestCategory) {
    return bestCategory;
  }

  return null;
}

/**
 * Robust case-insensitive comparison helper to check if a document's category matches a target category filter.
 */
export function isMatchingCategory(
  docCategory: string | undefined | null,
  targetCategory: string | undefined | null
): boolean {
  if (!docCategory || !targetCategory) return false;
  const normDoc = normalizeDocumentCategory(docCategory);
  const normTarget = normalizeDocumentCategory(targetCategory);
  return normDoc === normTarget;
}
