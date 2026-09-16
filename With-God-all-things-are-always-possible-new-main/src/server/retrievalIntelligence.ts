/**
 * Structra AI — Retrieval Intelligence & Query Understanding Engine
 * 
 * Hybrid Retrieval Architecture:
 * 1. Intent Classification (Conversational, Help, Knowledge, Retrieval, QA, Analysis)
 * 2. Structured Query Intent Extraction (Semantic, Temporal, Exact Terms, Metadata Filters)
 * 3. Multi-Signal Hybrid Retrieval (Dense Vector + Lexical/BM25 + Exact Identifier + Metadata Boosts)
 * 4. Reciprocal Rank Fusion (RRF) & Deterministic Sorting
 * 5. Gemini Flash Reasoning & Context Budget Verification
 */

export type HighLevelIntent =
  | 'CONVERSATIONAL'
  | 'CAPABILITY'
  | 'GENERAL_KNOWLEDGE'
  | 'DOCUMENT_RETRIEVAL'
  | 'DOCUMENT_QUESTION_ANSWERING'
  | 'DOCUMENT_ANALYSIS'
  | 'CONVERSATIONAL_FOLLOW_UP';

export type RetrievalIntent =
  | 'search'
  | 'latest_document'
  | 'oldest_document'
  | 'list_all'
  | 'qa'
  | 'compare'
  | 'conversational';

export type CoreRetrievalCategory =
  | 'EXACT_LOOKUP'
  | 'DOCUMENT_QA'
  | 'THEMATIC_SEARCH'
  | 'LIST_ALL'
  | 'CONVERSATIONAL';

export type MatchType = 'EXACT' | 'RELATED' | 'NONE';

export interface ExactLookupTarget {
  isExact: boolean;
  filename?: string;
  identifier?: string;
  rawTarget?: string;
}

export interface StructuredQueryIntent {
  highLevelIntent: HighLevelIntent;
  intent: RetrievalIntent;
  coreCategory: CoreRetrievalCategory;
  exactTarget?: ExactLookupTarget | null;
  documentHint?: string | null;
  semanticQuery: string;
  exactTerms: string[];
  documentCategory?: string | null;
  source?: 'Gmail' | 'Telegram' | 'Upload Center' | null;
  fileType?: 'PDF' | 'DOCX' | 'XLSX' | 'PPTX' | 'TXT' | null;
  vendorOrParty?: string | null;
  dateRange?: {
    from?: string; // YYYY-MM-DD
    to?: string;   // YYYY-MM-DD
    relativeType?: string;
  } | null;
  sortBy?: 'upload_date' | 'relevance' | 'amount' | 'name' | 'issue_date';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number | null;
  targetOrdinalIndex?: number | null; // e.g. 1 for first, 2 for second
  isConversationalRefinement?: boolean;
  rawQuery: string;
  confidence: number;
}

export interface HybridSearchResult {
  matchedDocumentIds: string[];
  bestMatchId: string | null;
  matchType: MatchType;
  contextDocumentIds?: string[];
  aiAnswer: string;
  reasoning: string;
  confidence: number;
  parsedIntent: StructuredQueryIntent;
  suggestedCategory?: string | null;
  suggestedSource?: string | null;
  sources: Array<{
    documentId: string;
    documentName: string;
    relevance: number;
  }>;
}

/**
 * Normalizes document categories using Structra's canonical taxonomy.
 */
export function normalizeCategory(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.includes('invoice') || trimmed.includes('bill')) return 'Invoices';
  if (trimmed.includes('receipt') || trimmed.includes('pos')) return 'Receipts';
  if (trimmed.includes('contract') || trimmed.includes('agreement') || trimmed.includes('lease') || trimmed.includes('nda')) return 'Contracts';
  if (trimmed.includes('report') || trimmed.includes('audit')) return 'Reports';
  if (trimmed.includes('certificate') || trimmed.includes('tcc') || trimmed.includes('tax clearance')) return 'Certificates';
  if (trimmed.includes('quotation') || trimmed.includes('quote') || trimmed.includes('estimate') || trimmed.includes('proforma')) return 'Quotations';
  if (trimmed.includes('payment') || trimmed.includes('transfer') || trimmed.includes('remittance')) return 'Payment Confirmations';
  if (trimmed.includes('academic') || trimmed.includes('thesis') || trimmed.includes('srs') || trimmed.includes('handbook')) return 'Academic Documents';
  return null;
}

/**
 * Deterministic Temporal Range Resolver
 * Converts human expressions ("yesterday", "last month", "March 2026") into ISO YYYY-MM-DD bounds.
 */
export function resolveTemporalDateRange(text: string, referenceDate: Date = new Date()): {
  from?: string;
  to?: string;
  relativeType: string;
} | null {
  const lower = text.toLowerCase();
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed
  const date = referenceDate.getDate();

  const toIso = (d: Date) => d.toISOString().split('T')[0];

  // 1. "Today"
  if (/\b(today|this day)\b/i.test(lower)) {
    const todayStr = toIso(referenceDate);
    return { from: todayStr, to: todayStr, relativeType: 'today' };
  }

  // 2. "Yesterday"
  if (/\b(yesterday)\b/i.test(lower)) {
    const yest = new Date(referenceDate);
    yest.setDate(yest.getDate() - 1);
    const yestStr = toIso(yest);
    return { from: yestStr, to: yestStr, relativeType: 'yesterday' };
  }

  // 3. "This week"
  if (/\b(this week)\b/i.test(lower)) {
    const startOfWeek = new Date(referenceDate);
    const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    return { from: toIso(startOfWeek), to: toIso(referenceDate), relativeType: 'this_week' };
  }

  // 4. "Last week"
  if (/\b(last week|past week)\b/i.test(lower)) {
    const endOfLastWeek = new Date(referenceDate);
    endOfLastWeek.setDate(endOfLastWeek.getDate() - endOfLastWeek.getDay() - 1);
    const startOfLastWeek = new Date(endOfLastWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 6);
    return { from: toIso(startOfLastWeek), to: toIso(endOfLastWeek), relativeType: 'last_week' };
  }

  // 5. "This month"
  if (/\b(this month)\b/i.test(lower)) {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    return { from: toIso(startOfMonth), to: toIso(endOfMonth), relativeType: 'this_month' };
  }

  // 6. "Last month"
  if (/\b(last month|past month)\b/i.test(lower)) {
    const startOfLastMonth = new Date(year, month - 1, 1);
    const endOfLastMonth = new Date(year, month, 0);
    return { from: toIso(startOfLastMonth), to: toIso(endOfLastMonth), relativeType: 'last_month' };
  }

  // 7. "This year"
  if (/\b(this year)\b/i.test(lower)) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    return { from: toIso(startOfYear), to: toIso(endOfYear), relativeType: 'this_year' };
  }

  // 8. "Last year"
  if (/\b(last year)\b/i.test(lower)) {
    const startOfLastYear = new Date(year - 1, 0, 1);
    const endOfLastYear = new Date(year - 1, 11, 31);
    return { from: toIso(startOfLastYear), to: toIso(endOfLastYear), relativeType: 'last_year' };
  }

  // 9. Specific Month & Year (e.g. "March 2026", "July 2026", "Feb 2026", "March", "July")
  const monthNames = [
    'january|jan', 'february|feb', 'march|mar', 'april|apr', 'may', 'june|jun',
    'july|jul', 'august|aug', 'september|sep|sept', 'october|oct', 'november|nov', 'december|dec'
  ];

  for (let mIdx = 0; mIdx < monthNames.length; mIdx++) {
    const mPattern = new RegExp(`\\b(${monthNames[mIdx]})\\s*(\\d{4})?\\b`, 'i');
    const mMatch = lower.match(mPattern);
    if (mMatch) {
      const targetYear = mMatch[2] ? parseInt(mMatch[2], 10) : year;
      const startOfM = new Date(targetYear, mIdx, 1);
      const endOfM = new Date(targetYear, mIdx + 1, 0);
      return { from: toIso(startOfM), to: toIso(endOfM), relativeType: `${monthNames[mIdx]}_${targetYear}` };
    }
  }

  // 10. Specific Year (e.g. "2024", "2025", "2026", "receipts from 2024")
  const yearPattern = /\b(19\d{2}|20\d{2})\b/;
  const yearMatch = lower.match(yearPattern);
  if (yearMatch) {
    const targetYear = parseInt(yearMatch[1], 10);
    return { from: `${targetYear}-01-01`, to: `${targetYear}-12-31`, relativeType: `year_${targetYear}` };
  }

  return null;
}

/**
 * Fast Deterministic Intent Classifier
 * Evaluates greetings, capabilities, general definitions, and common query patterns in <1ms.
 */
export function classifyHighLevelIntent(
  cleanMsg: string,
  history: any[] = []
): {
  highLevelIntent: HighLevelIntent;
  fastAnswer?: string;
} {
  const cleanLower = cleanMsg.toLowerCase().replace(/[!?.,;]+$/, '').trim();

  // Check if user is responding affirmatively to an offered alternative document in prior turn
  const lastAssistantMsg = Array.isArray(history) && history.length > 0
    ? [...history].reverse().find((h: any) => h.sender === 'assistant' || h.sender === 'bot')
    : null;
  const isAnsweringPreviousOffer = Boolean(
    lastAssistantMsg && /would you like (me to show|to see|me to find)/i.test(lastAssistantMsg.text)
  );
  const isAffirmativeResponse = /^(yes|yeah|yep|sure|please|yes\s+please|show\s+me|show\s+it|please\s+show\s+me|ok|okay|do\s+that|go\s+ahead|that\s+would\s+be\s+great|yes\s+show\s+me(\s+that)?)$/i.test(cleanLower);

  if (isAnsweringPreviousOffer && isAffirmativeResponse) {
    return { highLevelIntent: 'CONVERSATIONAL_FOLLOW_UP' };
  }

  // Conversational Greetings & Social Pleasantries
  const greetingsRegex = /^(hi|hello|hey|heya|howdy|good\s+(morning|afternoon|evening|day)|greetings|hi\s+there|hello\s+there)$/i;
  if (greetingsRegex.test(cleanLower)) {
    let greeting = "Hello! 👋 How can I help you today with your documents?";
    if (cleanLower.includes('good morning')) greeting = "Good morning! 👋 How can I help you with your documents today?";
    if (cleanLower.includes('good afternoon')) greeting = "Good afternoon! 👋 How can I help you with your documents today?";
    if (cleanLower.includes('good evening')) greeting = "Good evening! 👋 How can I help you with your documents today?";
    return { highLevelIntent: 'CONVERSATIONAL', fastAnswer: greeting };
  }

  const socialRegex = /^(how\s+are\s+you|how\s+are\s+you\s+doing|how's\s+it\s+going|what's\s+up|sup|how\s+do\s+you\s+do)$/i;
  if (socialRegex.test(cleanLower)) {
    return { highLevelIntent: 'CONVERSATIONAL', fastAnswer: "I'm doing well, thank you! How can I help you with your workspace documents today?" };
  }

  const thanksRegex = /^(thanks|thank\s+you|thank\s+you\s+so\s+much|thank\s+you\s+very\s+much|thx|cheers|appreciate\s+it|many\s+thanks)$/i;
  if (thanksRegex.test(cleanLower)) {
    return { highLevelIntent: 'CONVERSATIONAL', fastAnswer: "You're very welcome! Let me know if you need anything else from your documents." };
  }

  const farewellRegex = /^(bye|goodbye|see\s+you|have\s+a\s+good\s+day|great|awesome|cool|got\s+it|ok|okay)$/i;
  if (farewellRegex.test(cleanLower)) {
    return { highLevelIntent: 'CONVERSATIONAL', fastAnswer: "Glad to help! Feel free to ask anytime you need assistance with your documents." };
  }

  // Capability & Guidance Questions
  const capabilitiesRegex = /^(what\s+can\s+you\s+do|what\s+do\s+you\s+do|what\s+are\s+your\s+capabilities|how\s+can\s+you\s+help(\s+me)?|what\s+can\s+structra\s+do|what\s+can\s+i\s+search\s+for|how\s+do\s+i\s+find\s+a\s+document|help|help\s+me|who\s+are\s+you|tell\s+me\s+about\s+yourself)$/i;
  if (capabilitiesRegex.test(cleanLower)) {
    const capResponse = "I can help you find documents, answer questions about their contents, compare documents, and retrieve files using natural language.\n\nFor example, you can ask:\n• \"Find my latest invoice\"\n• \"Retrieve the last document I uploaded\"\n• \"What are the payment terms in my lease?\"\n• \"Find the document about collaboration effects on leaders\"\n• \"Compare my Dangote invoice with the steel invoice\"";
    return { highLevelIntent: 'CAPABILITY', fastAnswer: capResponse };
  }

  // General Domain Knowledge (Only when NO personal workspace indicators exist)
  const hasWorkspaceIndicator = /\b(my|our|this|these|workspace|uploaded|sent|received|find|where\s+is|show\s+me|list|search|total\s+on|check\s+my|compare|mtn|dangote|safenija|john)\b/i.test(cleanLower);
  const generalDefinitionRegex = /^(what\s+is|what\s+are|define|explain|what\s+does\s+.*\s+mean|difference\s+between)\s+(an?\s+|the\s+concept\s+of\s+)?(invoice|receipt|contract|nda|service\s+level\s+agreement|sla|srs|proposal|bill\s+of\s+lading|purchase\s+order|po|tax\s+clearance|tcc|ocr|pdf|docx|ebitda|affidavit|statute|cac|depreciation|amortization|subpoena|promissory\s+note)$/i;

  if (!hasWorkspaceIndicator && generalDefinitionRegex.test(cleanLower)) {
    const genericDefs: Record<string, string> = {
      invoice: "An invoice is a commercial document issued by a seller to a buyer relating to a sale transaction, indicating products, quantities, and agreed prices for goods or services.",
      receipt: "A receipt is a written acknowledgment confirming that a specified sum of money or goods has been received as proof of payment.",
      contract: "A contract is a legally binding agreement between two or more parties that establishes mutual rights and obligations enforceable by law.",
      nda: "A Non-Disclosure Agreement (NDA) is a legal contract that outlines confidential material, knowledge, or information that the parties wish to share with one another for certain purposes, but restrict access to by third parties.",
      ocr: "OCR (Optical Character Recognition) is the technology that converts different types of documents, such as scanned paper documents, PDF files, or images captured by a digital camera, into editable and searchable data.",
      ebitda: "EBITDA stands for Earnings Before Interest, Taxes, Depreciation, and Amortization. It is a metric used to evaluate a company's operating performance.",
      pdf: "PDF (Portable Document Format) is a file format developed by Adobe to present documents consistently across software, hardware, and operating systems.",
      docx: "DOCX is the default file format for Microsoft Word documents since Word 2007, using the Open XML standard.",
    };

    const matchedKey = Object.keys(genericDefs).find(k => cleanLower.includes(k));
    const definition = matchedKey ? genericDefs[matchedKey] : "A formal business document used for recordkeeping, legal compliance, or financial verification.";
    return { highLevelIntent: 'GENERAL_KNOWLEDGE', fastAnswer: definition };
  }

  // Conversational follow-ups (e.g. "The one from John", "Show me the second one", "Which one is the most recent?", "What was the total?")
  const followUpPattern = /^(the\s+one\s+from|the\s+(?:second|2nd|first|1st|third|3rd|fourth|4th)(\s+one)?|(?:show\s+me|open|get|find)\s+(?:the\s+)?(?:second|2nd|first|1st|third|3rd|fourth|4th)(\s+one)?|(?:show\s+me|open|get)\s+(?:that|that\s+one|the\s+one\s+from\s+.*)|which\s+(?:one|of\s+(?:them|those))|what\s+about\s+(?:the|that)|tell\s+me\s+more\s+about\s+(?:it|that|them)|what\s+is\s+the\s+total\s+(?:of|for)\s+(?:it|that)|who\s+signed\s+(?:it|that)|when\s+was\s+(?:it|that)\s+issued)$/i;
  if (
    followUpPattern.test(cleanLower) ||
    (Array.isArray(history) && history.length > 0 && (
      /^(the\s+one\s+|that\s+one|second\s+one|first\s+one|the\s+second|the\s+first|which\s+one|which\s+of|what\s+about|and\s+the|tell\s+me\s+more)/i.test(cleanLower) ||
      cleanLower.includes('most recent') ||
      cleanLower.includes('latest one') ||
      cleanLower.includes('oldest one')
    ))
  ) {
    return { highLevelIntent: 'CONVERSATIONAL_FOLLOW_UP' };
  }

  // Specific question answering
  if (/^(how\s+much|when\s+does|what\s+are\s+the\s+payment\s+terms|what\s+is\s+the\s+total|who\s+signed|what\s+did\s+i\s+pay)/i.test(cleanLower)) {
    return { highLevelIntent: 'DOCUMENT_QUESTION_ANSWERING' };
  }

  // Comparison
  if (/\b(compare|difference\s+between)\b/i.test(cleanLower) && hasWorkspaceIndicator) {
    return { highLevelIntent: 'DOCUMENT_ANALYSIS' };
  }

  return { highLevelIntent: 'DOCUMENT_RETRIEVAL' };
}

/**
 * Authoritative Exact Target Extractor
 * Identifies if a query is seeking a specific document by exact filename, extension,
 * quoted literal, or unique business identifier (e.g. INV-2026-0045).
 */
export function extractExactLookupTarget(query: string): ExactLookupTarget {
  const clean = query.trim();

  // 1. Quoted terms (e.g. "March Financial Report.pdf", 'INV-2026-0045', 'Employee Handbook 2026')
  const quoteMatch = clean.match(/["']([^"']{3,})["']/);
  if (quoteMatch) {
    const rawVal = quoteMatch[1].trim();
    const hasExt = /\.(pdf|docx|xlsx|pptx|txt|png|jpg|csv)$/i.test(rawVal);
    const isId = /^[A-Za-z0-9_-]{4,}$/.test(rawVal);
    return {
      isExact: true,
      filename: hasExt ? rawVal : undefined,
      identifier: isId ? rawVal : undefined,
      rawTarget: rawVal,
    };
  }

  // 2. Explicit file with extension in query (e.g. "find March Financial Report.pdf", "open report.docx")
  const fileExtMatch = clean.match(/\b([A-Za-z0-9_\-\s.]+\.(?:pdf|docx|xlsx|pptx|txt|png|jpg|csv))\b/i);
  if (fileExtMatch) {
    let fn = fileExtMatch[1].trim();
    fn = fn.replace(/^(?:find|open|get|locate|show\s+me|where\s+is|the\s+file|the\s+document)\s+/i, '').trim();
    return {
      isExact: true,
      filename: fn,
      rawTarget: fn,
    };
  }

  // 3. Phrasing explicitly designating a named document
  // e.g. "document called Employee Handbook 2026", "file titled Q1 Report", "where is the document called Employee Handbook 2026?"
  const designatedMatch = clean.match(/\b(?:document|file|agreement|contract|handbook|report|policy)\s+(?:called|named|titled)\s+["']?([^"'?]+)["']?/i);
  if (designatedMatch) {
    const designatedName = designatedMatch[1].trim();
    return {
      isExact: true,
      filename: designatedName,
      rawTarget: designatedName,
    };
  }

  // 4. UUID match
  const uuidMatch = clean.match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
  if (uuidMatch) {
    return {
      isExact: true,
      identifier: uuidMatch[1],
      rawTarget: uuidMatch[1],
    };
  }

  // 5. Business Identifiers:
  // Handles:
  // - Hyphenated codes: INV-2026-0045, PO-2026-17, Contract-2026-04, REF-9923
  // - Concatenated alphanumeric codes: INV20260045, PO202617, TRX991204
  // - Spaced identifier codes: Contract 2026-04, PO 2026-17
  const idPrefixMatch = clean.match(/\b((?:INV|PO|CONTRACT|REF|DOC|TRX|REC|AGREEMENT|ORDER|TCC|CAC|BILL)[-_ ]?[0-9A-Z]+(?:[-_/][0-9A-Z]+)*)\b/i);
  if (idPrefixMatch) {
    const code = idPrefixMatch[1].trim();
    return {
      isExact: true,
      identifier: code,
      rawTarget: code,
    };
  }

  // 6. Generic hyphenated/dotted reference codes: e.g. EAP-2026-01, SRS-02, DAN-998
  const generalCodeMatch = clean.match(/\b([A-Z0-9]{2,}(?:-[A-Z0-9]+){1,4})\b/i);
  if (generalCodeMatch) {
    const code = generalCodeMatch[1].trim();
    const isLookupAction = /^(?:find|open|get|locate|show|where\s+is|search\s+for)?\s*(?:the\s+)?(?:document|invoice|file|receipt)?\s*([A-Za-z0-9_-]+)\??$/i.test(clean);
    if (isLookupAction || clean.length < 35) {
      return {
        isExact: true,
        identifier: code,
        rawTarget: code,
      };
    }
  }

  // 7. Direct named document lookups: e.g. "Find March Financial Report", "Where is Employee Handbook 2026"
  const directNameMatch = clean.match(/^(?:find|open|where\s+is|locate|show\s+me)\s+(?:the\s+)?(?:document|file)?\s*([A-Za-z0-9_\-\s]{4,50})\??$/i);
  if (directNameMatch) {
    const candidateName = directNameMatch[1].trim();
    // Exclude vague search terms like "all documents", "my invoices", "recent files"
    const isVague = /^(all|my|the|recent|latest|newest|oldest|any)\s+(documents|files|invoices|receipts|contracts)$/i.test(candidateName);
    const isCategoryOnly = /^(invoices?|receipts?|contracts?|reports?|files?|documents?)$/i.test(candidateName);
    if (!isVague && !isCategoryOnly) {
      return {
        isExact: true,
        filename: candidateName,
        rawTarget: candidateName,
      };
    }
  }

  return {
    isExact: false,
    rawTarget: clean,
  };
}

/**
 * Deterministic Exact Document Matcher
 * Resolves targets against authoritative metadata: fileName, originalFilename, id,
 * documentNumber, invoiceNumber, and exact document title.
 */
export function findExactDocumentMatch(
  target: ExactLookupTarget,
  activeDocs: any[]
): {
  exactMatch: any | null;
  nearMatches: any[];
} {
  if (!activeDocs || activeDocs.length === 0) {
    return { exactMatch: null, nearMatches: [] };
  }

  const rawCandidate = (target.filename || target.identifier || target.rawTarget || '').trim();
  if (!rawCandidate) return { exactMatch: null, nearMatches: [] };

  const normTarget = rawCandidate.toLowerCase().replace(/["']/g, '').trim();
  const targetNoExt = normTarget.replace(/\.(pdf|docx|xlsx|pptx|txt|png|jpg|csv)$/i, '').trim();
  const targetAlphaOnly = normTarget.replace(/[^a-z0-9]/g, '');

  const nearCandidates: Array<{ doc: any; score: number }> = [];

  for (const doc of activeDocs) {
    if (!doc) continue;
    const title = (doc.title || '').toLowerCase().replace(/["']/g, '').trim();
    const titleNoExt = title.replace(/\.(pdf|docx|xlsx|pptx|txt|png|jpg|csv)$/i, '').trim();
    const titleAlphaOnly = title.replace(/[^a-z0-9]/g, '');

    const fileName = (doc.fileName || '').toLowerCase().replace(/["']/g, '').trim();
    const fileNameNoExt = fileName.replace(/\.(pdf|docx|xlsx|pptx|txt|png|jpg|csv)$/i, '').trim();

    const origFileName = (doc.originalFilename || doc.original_filename || '').toLowerCase().replace(/["']/g, '').trim();
    const origNoExt = origFileName.replace(/\.(pdf|docx|xlsx|pptx|txt|png|jpg|csv)$/i, '').trim();

    const docId = String(doc.id || '').toLowerCase();
    const docNum = String(doc.metadata?.documentNumber || doc.metadata?.invoiceNumber || doc.metadata?.document_number || doc.metadata?.referenceNumber || '').toLowerCase().trim();
    const docNumAlphaOnly = docNum.replace(/[^a-z0-9]/g, '');

    // 1. Authoritative Document ID match
    if (docId === normTarget || docId === targetNoExt) {
      return { exactMatch: doc, nearMatches: [] };
    }

    // 2. Authoritative Document / Invoice / Reference Number match
    if (docNum) {
      if (docNum === normTarget || docNum === targetNoExt) {
        return { exactMatch: doc, nearMatches: [] };
      }
      if (targetAlphaOnly.length >= 5 && docNumAlphaOnly === targetAlphaOnly) {
        return { exactMatch: doc, nearMatches: [] };
      }
    }

    // 3. Authoritative Filename or Original Filename match
    if (fileName) {
      if (fileName === normTarget || fileNameNoExt === normTarget || fileName === targetNoExt || fileNameNoExt === targetNoExt) {
        return { exactMatch: doc, nearMatches: [] };
      }
    }
    if (origFileName) {
      if (origFileName === normTarget || origNoExt === normTarget || origFileName === targetNoExt || origNoExt === targetNoExt) {
        return { exactMatch: doc, nearMatches: [] };
      }
    }

    // 4. Exact Title match
    if (title) {
      if (title === normTarget || titleNoExt === normTarget || title === targetNoExt || titleNoExt === targetNoExt) {
        return { exactMatch: doc, nearMatches: [] };
      }
    }

    // 5. Normalised alphanumeric equality (e.g. "INV-2026-0045" vs "INV20260045")
    if (targetAlphaOnly.length >= 6) {
      if (titleAlphaOnly === targetAlphaOnly || fileName.replace(/[^a-z0-9]/g, '') === targetAlphaOnly || origFileName.replace(/[^a-z0-9]/g, '') === targetAlphaOnly) {
        return { exactMatch: doc, nearMatches: [] };
      }
      if (docNumAlphaOnly && docNumAlphaOnly === targetAlphaOnly) {
        return { exactMatch: doc, nearMatches: [] };
      }
    }

    // Calculate Near-Match Candidates for transparent disclosure
    let overlapScore = 0;
    const targetWords = targetNoExt.split(/[\s_-]+/).filter(w => w.length > 2);
    if (targetWords.length > 0) {
      const docWords = `${titleNoExt} ${fileNameNoExt} ${origNoExt}`.split(/[\s_-]+/);
      const matches = targetWords.filter(tw => docWords.some(dw => dw === tw || (dw.length >= 4 && (dw.includes(tw) || tw.includes(dw)))));
      overlapScore = matches.length / targetWords.length;
    }
    if (overlapScore >= 0.45) {
      nearCandidates.push({ doc, score: overlapScore });
    }
  }

  nearCandidates.sort((a, b) => b.score - a.score);
  return {
    exactMatch: null,
    nearMatches: nearCandidates.map(c => c.doc),
  };
}

/**
 * Deterministic Query Understanding Parser
 * Analyzes natural language search requests to extract structured intent, exact terms, and constraints.
 */
export function parseQueryIntentDeterministic(
  query: string,
  history: any[] = [],
  referenceDate: Date = new Date()
): StructuredQueryIntent {
  const clean = query.trim();
  const lower = clean.toLowerCase();

  let { highLevelIntent, fastAnswer } = classifyHighLevelIntent(clean, history);

  if (highLevelIntent === 'CONVERSATIONAL' || highLevelIntent === 'CAPABILITY' || highLevelIntent === 'GENERAL_KNOWLEDGE') {
    return {
      highLevelIntent,
      intent: 'conversational',
      coreCategory: 'CONVERSATIONAL',
      exactTarget: null,
      documentHint: null,
      semanticQuery: '',
      exactTerms: [],
      rawQuery: clean,
      confidence: 1.0,
    };
  }

  // 0. Extract Exact Lookup Target
  const exactTarget = extractExactLookupTarget(clean);

  // 1. Exact Identifier Extraction (Invoice numbers, transaction IDs, currency strings, alphanumeric codes)
  const exactTerms: string[] = [];
  if (exactTarget.filename && !exactTerms.includes(exactTarget.filename)) {
    exactTerms.push(exactTarget.filename);
  }
  if (exactTarget.identifier && !exactTerms.includes(exactTarget.identifier)) {
    exactTerms.push(exactTarget.identifier);
  }

  const invMatch = clean.match(/\b([A-Z0-9]{2,}(?:-[A-Z0-9]+){1,4}|INV-[A-Z0-9_-]+|DANG-[A-Z0-9_-]+|MTN-[A-Z0-9_-]+|SRS-[A-Z0-9_-]+|PO-[A-Z0-9_-]+|TRX-[A-Z0-9_-]+|TG-[A-Z0-9_-]+|EAP-[A-Z0-9_-]+)\b/gi);
  if (invMatch) {
    const filtered = invMatch.filter(m => /[-_0-9]/.test(m) || m.length >= 6);
    for (const item of filtered) {
      if (!exactTerms.includes(item)) exactTerms.push(item);
    }
  }
  const numIdMatch = clean.match(/\b(?:number|no\.?|#)\s*:?\s*([A-Za-z0-9_-]+)/gi);
  if (numIdMatch) {
    for (const m of numIdMatch) {
      const code = m.replace(/^(?:number|no\.?|#)\s*:?\s*/i, '').trim();
      if (code && !exactTerms.includes(code)) exactTerms.push(code);
    }
  }
  const currMatch = clean.match(/([₦$€£]\s*[0-9,]+(?:\.[0-9]{2})?|[0-9,]+\s*(?:NGN|USD|EUR|GBP))/gi);
  if (currMatch) {
    for (const c of currMatch) {
      if (!exactTerms.includes(c)) exactTerms.push(c);
    }
  }

  // 2. Category Normalization
  let category: string | null = null;
  if (/\b(invoice|invoices|bill|bills|tax invoice)\b/i.test(lower)) category = 'Invoices';
  else if (/\b(receipt|receipts|pos)\b/i.test(lower)) category = 'Receipts';
  else if (/\b(contract|contracts|agreement|agreements|lease|nda)\b/i.test(lower)) category = 'Contracts';
  else if (/\b(report|reports|audit|audits)\b/i.test(lower)) category = 'Reports';
  else if (/\b(certificate|certificates|tcc|tax clearance)\b/i.test(lower)) category = 'Certificates';
  else if (/\b(quotation|quotations|quote|quotes|estimate)\b/i.test(lower)) category = 'Quotations';
  else if (/\b(payment confirmation|transfer receipt|debit alert)\b/i.test(lower)) category = 'Payment Confirmations';
  else if (/\b(academic|handbook|srs|thesis)\b/i.test(lower)) category = 'Academic Documents';

  // 3. Source Extraction
  let source: 'Gmail' | 'Telegram' | 'Upload Center' | null = null;
  if (/\b(gmail|email|inbox)\b/i.test(lower)) source = 'Gmail';
  else if (/\b(telegram|tg\s+bot)\b/i.test(lower)) source = 'Telegram';
  else if (/\b(upload\s+center|uploaded\s+directly)\b/i.test(lower)) source = 'Upload Center';

  // 4. File Type Extraction
  let fileType: 'PDF' | 'DOCX' | 'XLSX' | 'PPTX' | 'TXT' | null = null;
  if (/\b(pdf)\b/i.test(lower)) fileType = 'PDF';
  else if (/\b(docx|word|doc)\b/i.test(lower)) fileType = 'DOCX';
  else if (/\b(xlsx|excel|spreadsheet|csv)\b/i.test(lower)) fileType = 'XLSX';

  // 5. Vendor / Party Extraction
  let vendorOrParty: string | null = null;
  const vendorPatterns = [
    /\b(?:from|with|by|vendor)\s+([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*)/,
    /\b(dangote|julius\s+berger|mtn|access\s+bank|zenith\s+bank|eko\s+atlantic|west\s+africa\s+steel|apex\s+solutions|brightwave|ikoyi|john)\b/i
  ];
  for (const vp of vendorPatterns) {
    const vMatch = clean.match(vp);
    if (vMatch) {
      vendorOrParty = vMatch[1].trim();
      break;
    }
  }

  // 6. Temporal Date Range
  const dateRange = resolveTemporalDateRange(clean, referenceDate);

  // 7. Temporal Superlatives (Latest / Most Recent / Oldest)
  let sortBy: 'upload_date' | 'relevance' | 'amount' | 'name' | 'issue_date' = 'relevance';
  let sortOrder: 'ASC' | 'DESC' = 'DESC';
  let limit: number | null = null;
  let intent: RetrievalIntent = 'search';

  const isLatest = /\b(latest|last|most\s+recent|newest|recent|recently)\b/i.test(lower);
  const isOldest = /\b(oldest|first\s+document|earliest)\b/i.test(lower);
  const isListing = /\b(what\s+documents|show\s+documents|list\s+documents|list\s+all|list\s+my|all\s+documents|what\s+files|show\s+all|all\s+my\s+documents)\b/i.test(lower);

  if (isLatest) {
    intent = 'latest_document';
    sortBy = 'upload_date';
    sortOrder = 'DESC';
    limit = 1;
  } else if (isOldest) {
    intent = 'oldest_document';
    sortBy = 'upload_date';
    sortOrder = 'ASC';
    limit = 1;
  } else if (isListing) {
    intent = 'list_all';
    sortBy = 'relevance';
  } else if (highLevelIntent === 'DOCUMENT_QUESTION_ANSWERING') {
    intent = 'qa';
  } else if (highLevelIntent === 'DOCUMENT_ANALYSIS') {
    intent = 'compare';
  }

  // 8. Conversational Follow-up & Direct Ordinal Resolution
  let targetOrdinalIndex: number | null = null;
  let isConversationalRefinement = false;

  if (/\b(second|2nd)\b/i.test(lower)) targetOrdinalIndex = 2;
  else if (/\b(first|1st)\b/i.test(lower)) targetOrdinalIndex = 1;
  else if (/\b(third|3rd)\b/i.test(lower)) targetOrdinalIndex = 3;
  else if (/\b(fourth|4th)\b/i.test(lower)) targetOrdinalIndex = 4;

  if (highLevelIntent === 'CONVERSATIONAL_FOLLOW_UP' || targetOrdinalIndex !== null) {
    isConversationalRefinement = true;
    if (!vendorOrParty) {
      const johnMatch = clean.match(/\b(?:from|by)\s+([A-Za-z0-9]+)/i);
      if (johnMatch) vendorOrParty = johnMatch[1];
    }
  }

  // 9. Document QA Document Hint Extraction & Conversational Reference Resolution
  let documentHint: string | null = null;
  const inDocMatch = clean.match(/\b(?:in|from|for|on|about)\s+(?:the\s+)?([A-Za-z0-9_\-\s]+?(?:agreement|contract|lease|invoice|report|document|handbook|policy|tax\s+clearance|statement|receipt|evaluation|summary))\b/i);

  // Conversational back-references: "it", "that document", "this agreement", "that invoice", "the one you found"
  const isConversationalDocRef = /\b(in\s+it|on\s+it|about\s+it|from\s+it|of\s+it|who\s+signed\s+it|total\s+on\s+it|what\s+is\s+the\s+monthly\s+rent\s+in\s+it|that\s+document|this\s+document|the\s+document|that\s+agreement|this\s+agreement|the\s+agreement|that\s+invoice|this\s+invoice|the\s+invoice|that\s+contract|this\s+contract|the\s+contract|that\s+one|the\s+one\s+you\s+found|\bit\b)\b/i.test(clean);

  if (inDocMatch) {
    documentHint = inDocMatch[1].trim();
  } else if (history.length > 0 && isConversationalDocRef) {
    const lastAssistant = [...history].reverse().find((h: any) => 
      h.sender === 'assistant' && (
        (Array.isArray(h.referencedDocumentIds) && h.referencedDocumentIds.length > 0) ||
        (Array.isArray(h.contextDocumentIds) && h.contextDocumentIds.length > 0) ||
        (Array.isArray(h.sources) && h.sources.length > 0)
      )
    );
    if (lastAssistant) {
      documentHint = lastAssistant.referencedDocumentIds?.[0] || lastAssistant.contextDocumentIds?.[0] || lastAssistant.sources?.[0]?.documentId || lastAssistant.sources?.[0]?.documentName || null;
      isConversationalRefinement = true;
    }
  }

  // 10. Determine Core Category Architecture
  let coreCategory: CoreRetrievalCategory = 'THEMATIC_SEARCH';
  if (exactTarget.isExact) {
    coreCategory = 'EXACT_LOOKUP';
  } else if (isListing) {
    coreCategory = 'LIST_ALL';
  } else if (
    documentHint ||
    highLevelIntent === 'DOCUMENT_QUESTION_ANSWERING' ||
    intent === 'qa' ||
    /\b(what\s+is|how\s+much|who\s+signed|when\s+was|where\s+does|what\s+are\s+the\s+payment\s+terms|summarize|explain\s+the|details\s+of|monthly\s+rent|total\s+amount)\b/i.test(clean)
  ) {
    coreCategory = 'DOCUMENT_QA';
    if (highLevelIntent !== 'DOCUMENT_QUESTION_ANSWERING') {
      highLevelIntent = 'DOCUMENT_QUESTION_ANSWERING';
    }
  } else {
    coreCategory = 'THEMATIC_SEARCH';
  }

  // 11. Semantic Query Extraction (Stripping search boilerplate & temporal commands)
  let semantic = clean
    .replace(/\b(retrieve|find|show\s+me|get|where\s+is|give\s+me|open|search\s+for|list|the|a|an|my|i\s+uploaded|uploaded|sent\s+me|on\s+gmail|on\s+telegram|in\s+workspace)\b/gi, ' ')
    .replace(/\b(last\s+document|most\s+recent\s+document|latest\s+document|latest|newest|oldest|yesterday|today|this\s+week|last\s+week|this\s+month|last\s+month|this\s+year|last\s+year)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!semantic && category) {
    semantic = category;
  } else if (!semantic) {
    semantic = clean;
  }

  return {
    highLevelIntent,
    intent,
    coreCategory,
    exactTarget: exactTarget.isExact ? exactTarget : null,
    documentHint,
    semanticQuery: semantic,
    exactTerms,
    documentCategory: category,
    source,
    fileType,
    vendorOrParty,
    dateRange,
    sortBy,
    sortOrder,
    limit,
    targetOrdinalIndex,
    isConversationalRefinement,
    rawQuery: clean,
    confidence: exactTarget.isExact ? 0.98 : 0.9,
  };
}

/**
 * Deep Gemini Structured Query Parser
 * Used for nuanced, ambiguous, or multi-predicate natural language queries.
 */
export async function parseQueryIntentWithGemini(
  query: string,
  aiClient: any,
  history: any[] = [],
  referenceDate: Date = new Date()
): Promise<StructuredQueryIntent> {
  const deterministic = parseQueryIntentDeterministic(query, history, referenceDate);

  // If deterministic engine has high confidence on obvious queries, return directly to save latency
  if (
    deterministic.highLevelIntent === 'CONVERSATIONAL' ||
    deterministic.highLevelIntent === 'CAPABILITY' ||
    deterministic.highLevelIntent === 'GENERAL_KNOWLEDGE' ||
    deterministic.exactTerms.length > 0 ||
    (deterministic.intent === 'latest_document' && !query.includes(' and ') && !query.includes(' about '))
  ) {
    return deterministic;
  }

  if (!aiClient) return deterministic;

  try {
    const dateStr = referenceDate.toISOString().split('T')[0];
    const prompt = `You are Structra's AI Document Query Understanding Engine.
Current Server Date: ${dateStr}

Analyze the user's document retrieval or question query. Decompose it into a structured retrieval intent.

User Query: "${query}"

Recent History Context:
${Array.isArray(history) && history.length > 0 ? history.slice(-4).map((h: any) => `${h.sender}: ${h.text}`).join('\n') : 'None'}

Schema to return (strictly JSON):
{
  "highLevelIntent": "DOCUMENT_RETRIEVAL" | "DOCUMENT_QUESTION_ANSWERING" | "DOCUMENT_ANALYSIS" | "CONVERSATIONAL_FOLLOW_UP",
  "intent": "search" | "latest_document" | "oldest_document" | "list_all" | "qa" | "compare",
  "semanticQuery": "Clean semantic search phrase stripped of temporal words / search verbs",
  "exactTerms": ["INV-DAN-2026-0892"],
  "documentCategory": "Invoices" | "Receipts" | "Contracts" | "Reports" | "Certificates" | "Quotations" | "Payment Confirmations" | "Academic Documents" | null,
  "source": "Gmail" | "Telegram" | "Upload Center" | null,
  "fileType": "PDF" | "DOCX" | "XLSX" | null,
  "vendorOrParty": "Dangote" | "John" | null,
  "dateRange": {
    "from": "YYYY-MM-DD",
    "to": "YYYY-MM-DD",
    "relativeType": "yesterday" | "last_month" | "specific_date"
  } | null,
  "sortBy": "upload_date" | "relevance" | "amount" | "name",
  "sortOrder": "ASC" | "DESC",
  "limit": 1 | null,
  "targetOrdinalIndex": 2 | null,
  "isConversationalRefinement": false
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      highLevelIntent: parsed.highLevelIntent || deterministic.highLevelIntent,
      intent: parsed.intent || deterministic.intent,
      coreCategory: deterministic.coreCategory,
      exactTarget: deterministic.exactTarget,
      documentHint: deterministic.documentHint,
      semanticQuery: parsed.semanticQuery || deterministic.semanticQuery,
      exactTerms: Array.isArray(parsed.exactTerms) && parsed.exactTerms.length > 0 ? parsed.exactTerms : deterministic.exactTerms,
      documentCategory: normalizeCategory(parsed.documentCategory) || deterministic.documentCategory,
      source: parsed.source || deterministic.source,
      fileType: parsed.fileType || deterministic.fileType,
      vendorOrParty: parsed.vendorOrParty || deterministic.vendorOrParty,
      dateRange: parsed.dateRange || deterministic.dateRange,
      sortBy: parsed.sortBy || deterministic.sortBy,
      sortOrder: parsed.sortOrder || deterministic.sortOrder,
      limit: typeof parsed.limit === 'number' ? parsed.limit : deterministic.limit,
      targetOrdinalIndex: typeof parsed.targetOrdinalIndex === 'number' ? parsed.targetOrdinalIndex : deterministic.targetOrdinalIndex,
      isConversationalRefinement: Boolean(parsed.isConversationalRefinement || deterministic.isConversationalRefinement),
      rawQuery: query,
      confidence: 0.95,
    };
  } catch (err) {
    console.warn('[parseQueryIntentWithGemini fallback to deterministic]:', err);
    return deterministic;
  }
}

/**
 * Multi-Signal Lexical Keyword & Entity Scorer
 */
export function scoreDocumentLexical(
  query: string,
  doc: any,
  exactTerms: string[] = []
): number {
  if (!doc) return 0;
  let score = 0;
  const normQuery = query.toLowerCase().trim();

  const title = (doc.title || doc.fileName || '').toLowerCase();
  const category = (doc.category || '').toLowerCase();
  const source = (doc.source || '').toLowerCase();
  const summary = (doc.contentSummary || '').toLowerCase();
  const rawText = (doc.rawText || '').toLowerCase();
  const tags = Array.isArray(doc.tags) ? doc.tags.map((t: string) => String(t).toLowerCase()).join(' ') : '';
  
  const metaVendor = (doc.metadata?.vendor || doc.metadata?.counterparty || '').toLowerCase();
  const metaDocNum = (doc.metadata?.documentNumber || doc.metadata?.invoiceNumber || '').toLowerCase();
  const metaTotal = (doc.metadata?.totalAmount || doc.metadata?.total || '').toLowerCase();
  const metaDate = (doc.metadata?.issueDate || doc.metadata?.dueDate || '').toLowerCase();

  // 1. Exact Identifier Boost
  for (const term of exactTerms) {
    const termLower = term.toLowerCase();
    if (metaDocNum.includes(termLower) || title.includes(termLower)) score += 100;
    if (rawText.includes(termLower) || summary.includes(termLower)) score += 60;
    if (metaTotal.includes(termLower)) score += 80;
  }

  // 2. Full query exact substring match
  if (normQuery.length > 3) {
    if (title.includes(normQuery)) score += 40;
    if (metaVendor.includes(normQuery)) score += 35;
    if (summary.includes(normQuery)) score += 25;
    if (rawText.includes(normQuery)) score += 20;
  }

  // 3. Token-based matching
  const stopWords = new Set(['what', 'is', 'the', 'on', 'a', 'an', 'in', 'of', 'for', 'to', 'show', 'find', 'me', 'my', 'documents', 'do', 'i', 'have', 'from', 'with']);
  const queryTokens = normQuery.replace(/[^\w\s]/gi, ' ').split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

  queryTokens.forEach(token => {
    if (title.includes(token)) score += 15;
    if (metaVendor.includes(token)) score += 20;
    if (metaDocNum.includes(token)) score += 25;
    if (metaTotal.includes(token)) score += 15;
    if (tags.includes(token)) score += 12;
    if (category.includes(token)) score += 10;
    if (source.includes(token)) score += 8;
    if (metaDate.includes(token)) score += 10;
    if (summary.includes(token)) score += 6;
    if (rawText.includes(token)) score += 4;
  });

  return score;
}

/**
 * Full Hybrid Document Retrieval Pipeline
 * Combines intent parsing, deterministic metadata constraints, vector similarity, lexical scoring, and Gemini verification.
 */
export async function performHybridRetrievalPipeline(params: {
  rawQuery: string;
  activeDocs: any[];
  authenticatedUserId: string;
  history?: any[];
  aiClient?: any;
  referenceDate?: Date;
  searchVectorFn: (query: string, docs: any[], topK: number, userId: string) => Promise<Array<{ chunk: any; similarity: number }>>;
  fetchDocumentContent?: (docIds: string[]) => Promise<Map<string, string>>;
  searchChunksLexicalFn?: (terms: string[], userDocs: any[], userId: string) => Promise<Array<{ documentId: string; chunkText: string }>>;
}): Promise<HybridSearchResult> {
  const {
    rawQuery,
    activeDocs,
    authenticatedUserId,
    history = [],
    aiClient,
    referenceDate = new Date(),
    searchVectorFn,
    fetchDocumentContent,
    searchChunksLexicalFn,
  } = params;

  // 1. Parse Structured Intent
  const parsedIntent = await parseQueryIntentWithGemini(rawQuery, aiClient, history, referenceDate);

  // Conversational / Fast Path Exits
  if (
    parsedIntent.highLevelIntent === 'CONVERSATIONAL' ||
    parsedIntent.highLevelIntent === 'CAPABILITY' ||
    parsedIntent.highLevelIntent === 'GENERAL_KNOWLEDGE'
  ) {
    const { fastAnswer } = classifyHighLevelIntent(rawQuery, history);
    return {
      matchedDocumentIds: [],
      bestMatchId: null,
      matchType: 'NONE',
      contextDocumentIds: [],
      aiAnswer: fastAnswer || "How can I help you today with your documents?",
      reasoning: "Conversational direct response without workspace search.",
      confidence: 1.0,
      parsedIntent,
      suggestedCategory: null,
      suggestedSource: null,
      sources: [],
    };
  }

  if (!activeDocs || activeDocs.length === 0) {
    return {
      matchedDocumentIds: [],
      bestMatchId: null,
      matchType: 'NONE',
      contextDocumentIds: [],
      aiAnswer: "You don't have any documents available in your Structra workspace yet. Upload a document or connect a document source to start asking questions.",
      reasoning: "Document workspace contains no active documents.",
      confidence: 0,
      parsedIntent,
      suggestedCategory: null,
      suggestedSource: null,
      sources: [],
    };
  }

  // 2. Resolve Conversational Ordinals (e.g. "Show me the second one")
  if (parsedIntent.targetOrdinalIndex && history.length > 0) {
    const lastAssistantWithDocs = [...history].reverse().find((h: any) => Array.isArray(h.referencedDocumentIds) && h.referencedDocumentIds.length > 0);
    if (lastAssistantWithDocs && lastAssistantWithDocs.referencedDocumentIds) {
      const targetIndex = parsedIntent.targetOrdinalIndex - 1;
      const targetDocId = lastAssistantWithDocs.referencedDocumentIds[targetIndex];
      if (targetDocId) {
        const foundDoc = activeDocs.find(d => d.id === targetDocId);
        if (foundDoc) {
          return {
            matchedDocumentIds: [foundDoc.id],
            bestMatchId: foundDoc.id,
            matchType: 'EXACT',
            contextDocumentIds: [],
            aiAnswer: `Here is the ${foundDoc.title || 'requested document'} (item #${parsedIntent.targetOrdinalIndex}):`,
            reasoning: `Resolved ordinal reference #${parsedIntent.targetOrdinalIndex} from previous search context.`,
            confidence: 1.0,
            parsedIntent,
            suggestedCategory: foundDoc.category,
            suggestedSource: foundDoc.source,
            sources: [{ documentId: foundDoc.id, documentName: foundDoc.title, relevance: 1.0 }],
          };
        }
      }
    }
  }

  // 2.5 Authoritative Deterministic Exact Document Lookup Strategy
  // If the user clearly asks for a specific document, filename, or ID, bypass vector/semantic ambiguity.
  if (parsedIntent.coreCategory === 'EXACT_LOOKUP' || parsedIntent.exactTarget?.isExact) {
    const exactTarget = parsedIntent.exactTarget || {
      isExact: true,
      rawTarget: rawQuery,
    };
    const { exactMatch, nearMatches } = findExactDocumentMatch(exactTarget, activeDocs);

    if (exactMatch) {
      return {
        matchedDocumentIds: [exactMatch.id],
        bestMatchId: exactMatch.id,
        matchType: 'EXACT',
        contextDocumentIds: [],
        aiAnswer: `Found exact document: **${exactMatch.title || exactMatch.fileName}** (${exactMatch.category || 'Document'}).`,
        reasoning: `Exact deterministic match on ${exactMatch.fileName ? 'authoritative filename' : 'document metadata/identifier'}.`,
        confidence: 1.0,
        parsedIntent,
        suggestedCategory: exactMatch.category,
        suggestedSource: exactMatch.source,
        sources: [{
          documentId: exactMatch.id,
          documentName: exactMatch.title || exactMatch.fileName,
          relevance: 1.0,
        }],
      };
    }

    // Exact document was explicitly requested, but NOT found in active workspace.
    // Strictly adhere to No-Match contract (Requirement 7, 14, 15):
    const nearCandidate = nearMatches[0];
    const targetName = exactTarget.filename || exactTarget.identifier || exactTarget.rawTarget || rawQuery;
    const nearCandidateIds = nearMatches.slice(0, 3).map(d => d.id);

    return {
      matchedDocumentIds: [],
      bestMatchId: null,
      matchType: 'NONE',
      contextDocumentIds: nearCandidateIds,
      aiAnswer: nearCandidate
        ? `I couldn't find the exact document "${targetName}" in your workspace. Did you mean **${nearCandidate.title || nearCandidate.fileName}**?`
        : `I couldn't find any document named or identified as "${targetName}" in your workspace.`,
      reasoning: `Deterministic exact lookup found no authoritative match for "${targetName}".`,
      confidence: 0.95,
      parsedIntent,
      suggestedCategory: nearCandidate?.category || null,
      suggestedSource: nearCandidate?.source || null,
      sources: [],
    };
  }

  // 2.6 Targeted Document QA Resolution
  let targetQADoc: any = null;
  if (parsedIntent.coreCategory === 'DOCUMENT_QA') {
    if (parsedIntent.documentHint) {
      const { exactMatch, nearMatches } = findExactDocumentMatch({ rawTarget: parsedIntent.documentHint, isExact: true }, activeDocs);
      targetQADoc = exactMatch || nearMatches[0] || null;
    } else if (history.length > 0) {
      const lastAssistantWithDocs = [...history].reverse().find((h: any) => 
        (Array.isArray(h.referencedDocumentIds) && h.referencedDocumentIds.length > 0) ||
        (Array.isArray(h.contextDocumentIds) && h.contextDocumentIds.length > 0)
      );
      const prevDocId = lastAssistantWithDocs?.referencedDocumentIds?.[0] || lastAssistantWithDocs?.contextDocumentIds?.[0];
      if (prevDocId) {
        targetQADoc = activeDocs.find(d => d.id === prevDocId) || null;
      }
    }

    // If a specific document is identified for QA, answer exclusively from that document (Requirement 17)
    if (targetQADoc) {
      if (!targetQADoc.rawText && fetchDocumentContent) {
        try {
          const contentMap = await fetchDocumentContent([targetQADoc.id]);
          if (contentMap.get(targetQADoc.id)) {
            targetQADoc.rawText = contentMap.get(targetQADoc.id);
          }
        } catch (e) {
          console.warn('[Targeted QA Content Fetch Warning]:', e);
        }
      }

      const docText = (targetQADoc.rawText || targetQADoc.contentSummary || '').trim();
      const docName = targetQADoc.title || targetQADoc.fileName || 'document';

      if (aiClient) {
        try {
          const targetedPrompt = `You are Structra's authoritative AI Assistant answering a targeted question about a specific document.
User Question: "${rawQuery}"
Target Document: "${docName}" (Category: ${targetQADoc.category || 'General'}, Source: ${targetQADoc.source || 'Upload'})
Authoritative Metadata: ${JSON.stringify(targetQADoc.metadata || {})}

Document Content:
${docText.slice(0, 18000) || 'No text extracted.'}

Instructions:
1. Answer the user's question directly, accurately, and factually using ONLY the provided document text and metadata.
2. If the document specifies the requested detail (such as rent, payment terms, dates, signatories, or clauses), state or quote it clearly with figures and currency.
3. If this document does NOT specify or mention the requested information, state clearly: "${docName} does not specify [the requested detail]."
4. Strictly do NOT extrapolate, assume, or invent information not present in this document.

Return valid JSON matching this schema:
{
  "aiAnswer": "The answer directly from the document...",
  "reasoning": "Explanation citing text/metadata from ${docName}",
  "confidence": 0.98
}`;

          const res = await aiClient.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: targetedPrompt,
            config: { responseMimeType: 'application/json' },
          });

          const parsed = JSON.parse(res.text || '{}');
          return {
            matchedDocumentIds: [targetQADoc.id],
            bestMatchId: targetQADoc.id,
            matchType: 'EXACT',
            contextDocumentIds: [],
            aiAnswer: parsed.aiAnswer || `From **${docName}**: ${targetQADoc.contentSummary || 'Review document details.'}`,
            reasoning: parsed.reasoning || `Targeted QA extracted directly from ${docName}.`,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
            parsedIntent,
            suggestedCategory: targetQADoc.category,
            suggestedSource: targetQADoc.source,
            sources: [{
              documentId: targetQADoc.id,
              documentName: docName,
              relevance: 1.0,
            }],
          };
        } catch (qaErr) {
          console.warn('[Targeted QA Gemini error, falling back to deterministic extraction]:', qaErr);
        }
      }

      // Deterministic QA fallback when aiClient is unavailable or errored
      let answerText = `From **${docName}**: `;
      const lowerQuery = rawQuery.toLowerCase();
      if (/rent|monthly/i.test(lowerQuery)) {
        const rentMatch = docText.match(/(?:rent|monthly\s+rent|rate)[\s:—–-]+([₦$€£A-Za-z0-9,.\s]+(?:per\s+month|\/month|\/mo|\b))/i) ||
                          docText.match(/([₦$€£][\d,]+(?:\.\d{2})?)/);
        if (rentMatch) {
          answerText += `The monthly rent is ${rentMatch[1].trim()}.`;
        } else {
          answerText += `Details: ${targetQADoc.contentSummary || 'See document content.'}`;
        }
      } else if (/total|amount|cost|how\s+much/i.test(lowerQuery)) {
        const total = targetQADoc.metadata?.totalAmount || targetQADoc.metadata?.amount;
        if (total) {
          answerText += `The total amount is ${total}.`;
        } else {
          answerText += `${targetQADoc.contentSummary || 'See document content.'}`;
        }
      } else {
        answerText += `${targetQADoc.contentSummary || 'See document content.'}`;
      }

      return {
        matchedDocumentIds: [targetQADoc.id],
        bestMatchId: targetQADoc.id,
        matchType: 'EXACT',
        contextDocumentIds: [],
        aiAnswer: answerText,
        reasoning: `Targeted QA directly answered from ${docName}.`,
        confidence: 0.95,
        parsedIntent,
        suggestedCategory: targetQADoc.category,
        suggestedSource: targetQADoc.source,
        sources: [{
          documentId: targetQADoc.id,
          documentName: docName,
          relevance: 1.0,
        }],
      };
    }
  }

  // 3. Metadata Filtering & Scoring
  const scoredDocsMap = new Map<string, {
    doc: any;
    vectorRank: number;
    lexicalScore: number;
    metadataScore: number;
    dateMatch: boolean;
    categoryMatch: boolean;
    sourceMatch: boolean;
    vendorMatch: boolean;
  }>();

  for (const doc of activeDocs) {
    let metaScore = 0;
    let categoryMatch = false;
    let sourceMatch = false;
    let vendorMatch = false;
    let dateMatch = false;

    const docCategory = (doc.category || '').toLowerCase();
    const docSource = (doc.source || '').toLowerCase();
    const docTitle = (doc.title || doc.fileName || '').toLowerCase();
    const docVendor = (doc.metadata?.vendor || doc.metadata?.counterparty || '').toLowerCase();
    const docDate = doc.uploadDate || doc.created_at || doc.metadata?.issueDate || '';

    // Category check
    if (parsedIntent.documentCategory) {
      const targetCat = parsedIntent.documentCategory.toLowerCase();
      if (docCategory.includes(targetCat) || targetCat.includes(docCategory)) {
        categoryMatch = true;
        metaScore += 60;
      }
    }

    // Source check
    if (parsedIntent.source) {
      const targetSrc = parsedIntent.source.toLowerCase();
      if (docSource.includes(targetSrc) || targetSrc.includes(docSource)) {
        sourceMatch = true;
        metaScore += 50;
      }
    }

    // File type check
    if (parsedIntent.fileType) {
      if ((doc.fileType || '').toUpperCase() === parsedIntent.fileType.toUpperCase()) {
        metaScore += 30;
      }
    }

    // Vendor / Party check
    if (parsedIntent.vendorOrParty) {
      const vLower = parsedIntent.vendorOrParty.toLowerCase();
      if (docVendor.includes(vLower) || docTitle.includes(vLower) || (doc.rawText && doc.rawText.toLowerCase().includes(vLower))) {
        vendorMatch = true;
        metaScore += 60;
      }
    }

    // Date range check
    if (parsedIntent.dateRange?.from && parsedIntent.dateRange?.to && docDate) {
      const dStr = typeof docDate === 'string' ? docDate.split('T')[0] : '';
      if (dStr >= parsedIntent.dateRange.from && dStr <= parsedIntent.dateRange.to) {
        dateMatch = true;
        metaScore += 70;
      }
    }

    const lexScore = scoreDocumentLexical(parsedIntent.semanticQuery || rawQuery, doc, parsedIntent.exactTerms);

    scoredDocsMap.set(doc.id, {
      doc,
      vectorRank: 999,
      lexicalScore: lexScore,
      metadataScore: metaScore,
      dateMatch,
      categoryMatch,
      sourceMatch,
      vendorMatch,
    });
  }

  // 3.5 OCR Chunk Lexical Boost (search inside OCR text chunks for candidate terms without broad egress)
  if (searchChunksLexicalFn) {
    const terms = [
      ...parsedIntent.exactTerms,
      ...(parsedIntent.semanticQuery ? parsedIntent.semanticQuery.split(/\s+/).filter(w => w.length > 3 && !/^(find|show|document|file|what|when|where|which|about)$/i.test(w)) : [])
    ];
    if (terms.length > 0) {
      try {
        const chunkHits = await searchChunksLexicalFn(terms.slice(0, 5), activeDocs, authenticatedUserId);
        for (const hit of chunkHits) {
          const entry = scoredDocsMap.get(hit.documentId);
          if (entry) {
            entry.lexicalScore += 35;
          }
        }
      } catch (e) {
        console.warn('[searchChunksLexicalFn notice]:', e);
      }
    }
  }

  // 4. Pure Temporal Queries (e.g. "Retrieve the last document I uploaded", "Get the latest receipt")
  if (parsedIntent.intent === 'latest_document' || parsedIntent.intent === 'oldest_document') {
    let candidatePool = activeDocs;

    // Filter by Category if user said "latest receipt", "latest invoice", etc.
    if (parsedIntent.documentCategory) {
      const catFiltered = candidatePool.filter(d => {
        const cat = (d.category || '').toLowerCase();
        const target = parsedIntent.documentCategory!.toLowerCase();
        return cat.includes(target) || target.includes(cat);
      });
      if (catFiltered.length > 0) candidatePool = catFiltered;
    }

    // Filter by Source if specified (e.g. "latest on Gmail")
    if (parsedIntent.source) {
      const srcFiltered = candidatePool.filter(d => {
        const src = (d.source || '').toLowerCase();
        const target = parsedIntent.source!.toLowerCase();
        return src.includes(target) || target.includes(src);
      });
      if (srcFiltered.length > 0) candidatePool = srcFiltered;
    }

    // Filter by Vendor if specified
    if (parsedIntent.vendorOrParty) {
      const vFiltered = candidatePool.filter(d => {
        const v = parsedIntent.vendorOrParty!.toLowerCase();
        return (d.title && d.title.toLowerCase().includes(v)) ||
               (d.metadata?.vendor && d.metadata.vendor.toLowerCase().includes(v)) ||
               (d.rawText && d.rawText.toLowerCase().includes(v));
      });
      if (vFiltered.length > 0) candidatePool = vFiltered;
    }

    const sortedByDate = [...candidatePool].sort((a, b) => {
      const timeA = new Date(a.uploadDate || a.created_at || 0).getTime();
      const timeB = new Date(b.uploadDate || b.created_at || 0).getTime();
      return parsedIntent.intent === 'latest_document' ? timeB - timeA : timeA - timeB;
    });

    if (sortedByDate.length > 0) {
      const topDoc = sortedByDate[0];
      const matchIds = sortedByDate.slice(0, 5).map(d => d.id);
      return {
        matchedDocumentIds: matchIds,
        bestMatchId: topDoc.id,
        matchType: 'EXACT',
        contextDocumentIds: [],
        aiAnswer: `Found ${topDoc.title || 'document'} as the ${parsedIntent.intent === 'latest_document' ? 'most recent' : 'oldest'} document${parsedIntent.documentCategory ? ` in ${parsedIntent.documentCategory}` : ''}.`,
        reasoning: `Deterministic timestamp sorting by upload date (${topDoc.uploadDate || 'recent'}).`,
        confidence: 0.98,
        parsedIntent,
        suggestedCategory: topDoc.category,
        suggestedSource: topDoc.source,
        sources: matchIds.map(id => {
          const d = activeDocs.find(x => x.id === id);
          return { documentId: id, documentName: d?.title || 'Document', relevance: 0.95 };
        }),
      };
    }
  }

  // 5. Dense Vector Search
  const queryForVector = parsedIntent.semanticQuery || rawQuery;
  const vectorResults = await searchVectorFn(queryForVector, activeDocs, 15, authenticatedUserId);

  vectorResults.forEach((res, idx) => {
    const entry = scoredDocsMap.get(res.chunk.documentId);
    if (entry) {
      entry.vectorRank = Math.min(entry.vectorRank, idx + 1);
    }
  });

  // 6. Reciprocal Rank Fusion (RRF) & Multi-Signal Scoring
  const fusedDocs: Array<{ doc: any; score: number }> = [];

  for (const [docId, data] of scoredDocsMap.entries()) {
    const vecScore = data.vectorRank <= 50 ? (1 / (60 + data.vectorRank)) : 0;
    const lexScore = data.lexicalScore > 0 ? (data.lexicalScore / (100 + data.lexicalScore)) : 0;
    const metaBoost = data.metadataScore / 200;

    // Combined RRF score
    const finalScore = (vecScore * 0.45) + (lexScore * 0.35) + (metaBoost * 0.20);
    if (finalScore > 0 || data.metadataScore > 0 || data.lexicalScore > 0) {
      fusedDocs.push({ doc: data.doc, score: finalScore });
    }
  }

  fusedDocs.sort((a, b) => b.score - a.score);

  // If no documents scored above threshold and vector search returned 0 matches
  if (fusedDocs.length === 0 && (vectorResults.length === 0 || vectorResults[0].similarity < 0.18)) {
    return {
      matchedDocumentIds: [],
      bestMatchId: null,
      matchType: 'NONE',
      contextDocumentIds: [],
      aiAnswer: "I couldn't find that document in your Structra workspace.",
      reasoning: "No workspace documents matched the query criteria or metadata filters.",
      confidence: 0,
      parsedIntent,
      suggestedCategory: null,
      suggestedSource: null,
      sources: [],
    };
  }

  // 7. Context Budget Guard & Chunk Gathering for Gemini Reranking / QA
  const topCandidateDocs = fusedDocs.slice(0, 5).map(f => f.doc);

  // Surgically fetch full OCR content only for the top candidate documents without broad workspace egress
  if (fetchDocumentContent) {
    const missingDocs = topCandidateDocs.filter(d => !d.rawText);
    if (missingDocs.length > 0) {
      try {
        const contentMap = await fetchDocumentContent(missingDocs.map(d => d.id));
        for (const d of missingDocs) {
          const ocr = contentMap.get(d.id);
          if (ocr) {
            d.rawText = ocr;
          }
        }
      } catch (e) {
        console.warn('[fetchDocumentContent topCandidateDocs warning]:', e);
      }
    }
  }

  const relevantChunks: any[] = [];
  let charCount = 0;

  // Include vector chunks matching top candidate docs
  for (const vRes of vectorResults) {
    if (charCount > 18000) break;
    if (topCandidateDocs.some(d => d.id === vRes.chunk.documentId)) {
      relevantChunks.push(vRes.chunk);
      charCount += vRes.chunk.text.length;
    }
  }

  // If some top docs have no vector chunks, include their summary or raw text snippet
  for (const cDoc of topCandidateDocs) {
    if (charCount > 18000) break;
    if (!relevantChunks.some(c => c.documentId === cDoc.id)) {
      const snippet = cDoc.rawText ? cDoc.rawText.slice(0, 1200) : (cDoc.contentSummary || `Title: ${cDoc.title}`);
      relevantChunks.push({
        chunkId: `${cDoc.id}_snippet`,
        documentId: cDoc.id,
        docTitle: cDoc.title,
        docCategory: cDoc.category,
        text: snippet,
        docMetadata: cDoc.metadata || {},
      });
      charCount += snippet.length;
    }
  }

  // 8. Gemini Synthesis & Anti-Hallucination Reranking
  if (!aiClient) {
    // Check for temporal or specific near-miss (e.g. user asked for March MTN invoice, but found document is from February)
    const rawLower = rawQuery.toLowerCase();
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const requestedMonth = months.find(m => rawLower.includes(m));
    const topDoc = topCandidateDocs[0];

    if (topDoc && requestedMonth) {
      const docText = `${topDoc.title} ${topDoc.contentSummary} ${topDoc.metadata?.issueDate || ''}`.toLowerCase();
      if (!docText.includes(requestedMonth)) {
        // Found a document from a different month
        const altDocMonth = months.find(m => docText.includes(m));
        return {
          matchedDocumentIds: [],
          bestMatchId: null,
          matchType: 'NONE',
          contextDocumentIds: [topDoc.id],
          aiAnswer: `I couldn't find a ${requestedMonth.charAt(0).toUpperCase() + requestedMonth.slice(1)} document in your workspace. I found **${topDoc.title}**${altDocMonth ? ` from ${altDocMonth.charAt(0).toUpperCase() + altDocMonth.slice(1)}` : ''}, but it doesn't match your exact request.\n\nWould you like me to show you ${topDoc.title}?`,
          reasoning: `Near-miss transparent disclosure: user requested ${requestedMonth}, document was from ${altDocMonth || 'another period'}.`,
          confidence: 0.9,
          parsedIntent,
          suggestedCategory: topDoc.category,
          suggestedSource: topDoc.source,
          sources: [],
        };
      }
    }

    const matchedIds = topCandidateDocs.map(d => d.id);
    return {
      matchedDocumentIds: matchedIds,
      bestMatchId: matchedIds[0] || null,
      matchType: 'RELATED',
      contextDocumentIds: [],
      aiAnswer: `Found ${matchedIds.length} matching document(s) for "${rawQuery}".`,
      reasoning: "Retrieved via Hybrid Corpus multi-signal fusion.",
      confidence: 0.85,
      parsedIntent,
      suggestedCategory: topCandidateDocs[0]?.category || null,
      suggestedSource: topCandidateDocs[0]?.source || null,
      sources: matchedIds.map(id => {
        const d = activeDocs.find(x => x.id === id);
        return { documentId: id, documentName: d?.title || 'Document', relevance: 0.85 };
      }),
    };
  }

  try {
    const chunkPayload = relevantChunks.map(c => ({
      documentId: c.documentId,
      docTitle: c.docTitle,
      docCategory: c.docCategory,
      text: c.text,
      docMetadata: c.docMetadata || {},
    }));

    const synthesisPrompt = `You are Structra's authoritative AI Search & Retrieval Reasoning Engine.
User Search Query: "${rawQuery}"
Parsed Intent: ${JSON.stringify(parsedIntent)}

Recent Conversation History Context:
${Array.isArray(history) && history.length > 0 ? history.slice(-6).map((h: any) => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n') : 'None'}

Candidate Document Chunks from User's Workspace:
${JSON.stringify(chunkPayload, null, 2)}

Instructions:
1. Examine the candidate chunks strictly. Disambiguate amounts, dates, vendors, and terms.
2. If the user query is a conversational follow-up (e.g. "Which one is the most recent?", "What is the total of that?", "Show me the second one"), use the Recent Conversation History Context to understand which documents or topics the user is referring to.
3. Determine which documents truly match the user's intent.
4. If no candidate document matches, set matchedDocumentIds to [] and bestMatchId to null, and clearly state that no match was found.
5. If a document is a near-miss (e.g. user asked for MTN invoice, but only February MTN receipt exists), mention that clearly.
6. Provide a crisp, factual aiAnswer and reasoning.

Return strictly JSON matching this schema:
{
  "matchedDocumentIds": ["uuid1", "uuid2"],
  "bestMatchId": "uuid1" or null,
  "aiAnswer": "Clear, direct answer explaining what was found or answering the user's question with numbers/dates.",
  "reasoning": "Explanation of matching criteria and verification.",
  "confidence": 0.95
}`;

    const geminiRes = await aiClient.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: synthesisPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsedRes = JSON.parse(geminiRes.text || '{}');
    const validCandidateSet = new Set(topCandidateDocs.map(d => d.id));

    let finalMatchedIds: string[] = [];
    if (Array.isArray(parsedRes.matchedDocumentIds)) {
      finalMatchedIds = parsedRes.matchedDocumentIds.filter((id: string) => validCandidateSet.has(id));
    } else {
      finalMatchedIds = topCandidateDocs.map(d => d.id);
    }

    let finalBestId = parsedRes.bestMatchId && validCandidateSet.has(parsedRes.bestMatchId)
      ? parsedRes.bestMatchId
      : (finalMatchedIds.length > 0 ? finalMatchedIds[0] : null);

    let matchType: MatchType = 'RELATED';
    let contextDocumentIds: string[] = [];

    if (finalMatchedIds.length === 0) {
      matchType = 'NONE';
      finalBestId = null;
      contextDocumentIds = topCandidateDocs.slice(0, 3).map(d => d.id);
    } else if (parsedIntent.coreCategory === 'DOCUMENT_QA' && targetQADoc && finalMatchedIds.includes(targetQADoc.id)) {
      matchType = 'EXACT';
      finalMatchedIds = [targetQADoc.id];
      finalBestId = targetQADoc.id;
    }

    const bestDoc = activeDocs.find(d => d.id === finalBestId);

    return {
      matchedDocumentIds: finalMatchedIds,
      bestMatchId: finalBestId,
      matchType,
      contextDocumentIds,
      aiAnswer: parsedRes.aiAnswer || `Found matching documents for "${rawQuery}".`,
      reasoning: parsedRes.reasoning || "Verified via Gemini Hybrid Retrieval reasoning.",
      confidence: typeof parsedRes.confidence === 'number' ? parsedRes.confidence : 0.9,
      parsedIntent,
      suggestedCategory: bestDoc?.category || parsedIntent.documentCategory || null,
      suggestedSource: bestDoc?.source || parsedIntent.source || null,
      sources: finalMatchedIds.map((id: string) => {
        const d = activeDocs.find(x => x.id === id);
        return {
          documentId: id,
          documentName: d?.title || d?.fileName || 'Document',
          relevance: id === finalBestId ? 0.95 : 0.8,
        };
      }),
    };
  } catch (err) {
    console.warn('[Gemini Hybrid Verification Fallback]:', err);
    const matchedIds = topCandidateDocs.map(d => d.id);
    return {
      matchedDocumentIds: matchedIds,
      bestMatchId: matchedIds[0] || null,
      matchType: 'RELATED',
      contextDocumentIds: [],
      aiAnswer: `Found ${matchedIds.length} matching document(s).`,
      reasoning: "Retrieved via Hybrid Corpus multi-signal fusion.",
      confidence: 0.8,
      parsedIntent,
      suggestedCategory: topCandidateDocs[0]?.category || null,
      suggestedSource: topCandidateDocs[0]?.source || null,
      sources: matchedIds.map(id => {
        const d = activeDocs.find(x => x.id === id);
        return { documentId: id, documentName: d?.title || 'Document', relevance: 0.8 };
      }),
    };
  }
}

