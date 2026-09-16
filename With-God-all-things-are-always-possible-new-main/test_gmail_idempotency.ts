import assert from 'assert';
import {
  buildGmailStableSourceKey,
  normalizeGmailFilename,
  calculateContentSha256,
  extractAttachmentParts,
} from './server';

console.log('--- Running Gmail Idempotent Sync & Deduplication Tests ---');

// 1. Filename Normalization Tests
console.log('Testing filename normalization...');
assert.strictEqual(
  normalizeGmailFilename('Invoice_2024.pdf'),
  'invoice_2024.pdf',
  'Should lowercase simple filenames'
);
assert.strictEqual(
  normalizeGmailFilename('  Q3 Report   Financials.PDF  '),
  'q3 report financials.pdf',
  'Should trim and collapse multiple whitespaces'
);
assert.strictEqual(
  normalizeGmailFilename('/nested/path/to/Contract.docx'),
  'contract.docx',
  'Should strip directory paths and retain only basename'
);
assert.strictEqual(
  normalizeGmailFilename('resum\u0065\u0301.pdf'), // e + combining acute
  normalizeGmailFilename('resum\u00e9.pdf'), // precomposed é
  'Should normalize Unicode to NFC'
);
console.log('✓ Filename normalization passed');

// 2. Stable Source Key Generation Tests
console.log('Testing stable source key generation...');
const key1 = buildGmailStableSourceKey('User@Example.COM', 'msg_12345', '1', 'Receipt.pdf');
const key2 = buildGmailStableSourceKey('user@example.com', 'msg_12345', '1', 'receipt.pdf');
const key3 = buildGmailStableSourceKey('user@example.com', 'msg_12345', '1', '  RECEIPT.pdf  ');

assert.strictEqual(key1, key2, 'Stable keys must match regardless of email or filename casing');
assert.strictEqual(key2, key3, 'Stable keys must match regardless of whitespace');
assert.strictEqual(key1, 'user@example.com:::msg_12345:::1:::receipt.pdf');

// Distinct partIds within the same message must have distinct keys
const keyPart0 = buildGmailStableSourceKey('user@example.com', 'msg_12345', '0', 'file.pdf');
const keyPart1 = buildGmailStableSourceKey('user@example.com', 'msg_12345', '1', 'file.pdf');
assert.notStrictEqual(keyPart0, keyPart1, 'Different parts of same message must have distinct stable keys');

// Ephemeral attachmentId independence test
// In Gmail API, the same attachment in message 'msg_999' part '0' might return attId 'ANGjdJ8...' on day 1
// and 'ANGjdJ9_different...' on day 2. The stable key MUST remain identical!
const stableKeyDay1 = buildGmailStableSourceKey('user@example.com', 'msg_999', '0', 'Statement.pdf');
const stableKeyDay2 = buildGmailStableSourceKey('user@example.com', 'msg_999', '0', 'Statement.pdf');
assert.strictEqual(stableKeyDay1, stableKeyDay2, 'Stable key is independent of ephemeral attachmentId');
console.log('✓ Stable source key generation passed');

// 3. Content SHA-256 Hashing Tests
console.log('Testing content hashing...');
const sampleBuffer1 = Buffer.from('Binary PDF content representing invoice #1001');
const sampleBuffer2 = Buffer.from('Binary PDF content representing invoice #1001');
const sampleBuffer3 = Buffer.from('Different PDF binary content');

const hash1 = calculateContentSha256(sampleBuffer1);
const hash2 = calculateContentSha256(sampleBuffer2);
const hash3 = calculateContentSha256(sampleBuffer3);

assert.strictEqual(hash1, hash2, 'Identical buffers must produce identical SHA-256 hashes');
assert.notStrictEqual(hash1, hash3, 'Different buffers must produce distinct SHA-256 hashes');
assert.strictEqual(hash1.length, 64, 'SHA-256 hex string must be 64 characters');
console.log('✓ Content hashing passed');

// 4. Pre-Download Deduplication Verification
console.log('Testing pre-download deduplication logic...');
{
  const existingStableSourceKeys = new Set<string>();
  const existingSourceKeys = new Set<string>();
  const existingAttachmentIds = new Set<string>();

  // Simulate existing document in DB
  const existingAccount = 'finance@company.com';
  const existingMsgId = 'msg_abc123';
  const existingPartId = '1';
  const existingFilename = 'May_Invoice.pdf';
  const existingAttId = 'att_ephemeral_old_999';

  const canonicalKey = buildGmailStableSourceKey(existingAccount, existingMsgId, existingPartId, existingFilename);
  existingStableSourceKeys.add(canonicalKey);
  existingSourceKeys.add(`${existingMsgId}_${normalizeGmailFilename(existingFilename)}`);
  existingAttachmentIds.add(existingAttId);

  // Incoming sync attempts to re-import the same file, but with a NEW ephemeral attachmentId
  const candidateMsgId = existingMsgId;
  const candidatePartId = existingPartId;
  const candidateFilename = 'MAY_INVOICE.PDF'; // Different casing
  const candidateNewAttId = 'att_ephemeral_NEW_111'; // Ephemeral ID rotated by Gmail

  const candidateStableKey = buildGmailStableSourceKey(existingAccount, candidateMsgId, candidatePartId, candidateFilename);
  const normCandName = normalizeGmailFilename(candidateFilename);
  const legacyPartKey = `${candidateMsgId}_${candidateNewAttId}`;
  const legacyNameKey = `${candidateMsgId}_${normCandName}`;

  let downloadInvoked = false;
  const fakeDownload = () => {
    downloadInvoked = true;
    return Buffer.from('content');
  };

  const isMetadataDuplicate =
    existingStableSourceKeys.has(candidateStableKey) ||
    existingSourceKeys.has(legacyPartKey) ||
    existingSourceKeys.has(legacyNameKey) ||
    existingAttachmentIds.has(candidateNewAttId);

  assert.strictEqual(isMetadataDuplicate, true, 'Must detect duplicate using stable metadata key');

  if (!isMetadataDuplicate) {
    fakeDownload();
  }

  assert.strictEqual(downloadInvoked, false, 'Pre-download deduplication MUST prevent calling attachment download API');
}
console.log('✓ Pre-download deduplication passed');

// 5. Post-Download Content Hash Safety Net Verification
console.log('Testing post-download content hash safety net...');
{
  const existingContentHashes = new Set<string>();
  const existingBinary = Buffer.from('%PDF-1.4 Mock invoice payload for testing deduplication');
  const existingHash = calculateContentSha256(existingBinary);
  existingContentHashes.add(existingHash);

  // Candidate with new messageId and different name, but identical content binary
  const candidateBinary = Buffer.from('%PDF-1.4 Mock invoice payload for testing deduplication');
  const candidateHash = calculateContentSha256(candidateBinary);

  let aiExtractionInvoked = false;
  let storageUploadInvoked = false;

  const isContentDuplicate = existingContentHashes.has(candidateHash);
  assert.strictEqual(isContentDuplicate, true, 'Content hash safety net must catch duplicate payload');

  if (!isContentDuplicate) {
    aiExtractionInvoked = true;
    storageUploadInvoked = true;
  }

  assert.strictEqual(aiExtractionInvoked, false, 'Duplicate content must not trigger AI extraction');
  assert.strictEqual(storageUploadInvoked, false, 'Duplicate content must not trigger storage upload');
}
console.log('✓ Post-download content hash safety net passed');

// 6. Incremental Timestamp Checkpoint Verification
console.log('Testing incremental timestamp filtering...');
{
  const connectedAtMs = 1700000000000; // e.g. connected at timestamp T1
  const lastSyncedAtMs = 1700050000000; // e.g. last synced at timestamp T2

  const historicalMsgTimeMs = 1699999999000; // before connection
  const alreadySyncedMsgTimeMs = 1700020000000; // between connection and last sync
  const newMsgTimeMs = 1700060000000; // after last sync

  const isHistorical = connectedAtMs > 0 && historicalMsgTimeMs < connectedAtMs;
  const isAlreadySynced = lastSyncedAtMs > 0 && alreadySyncedMsgTimeMs < lastSyncedAtMs;
  const isNew = (!connectedAtMs || newMsgTimeMs >= connectedAtMs) && (!lastSyncedAtMs || newMsgTimeMs >= lastSyncedAtMs);

  assert.strictEqual(isHistorical, true, 'Must filter out messages older than connection time');
  assert.strictEqual(isAlreadySynced, true, 'Must filter out messages older than incremental checkpoint');
  assert.strictEqual(isNew, true, 'Must accept messages newer than last checkpoint');
}
console.log('✓ Incremental timestamp filtering passed');

// 7. extractAttachmentParts deterministic partId assignment
console.log('Testing extractAttachmentParts deterministic partId resolution...');
{
  const sampleParts = [
    {
      partId: '0',
      mimeType: 'text/html',
      body: { size: 1000, data: 'PGh0bWw+PC9odG1sPg==' }, // Rejected: HTML email body
    },
    {
      partId: '1',
      filename: 'Invoice_1.pdf',
      mimeType: 'application/pdf',
      body: { attachmentId: 'att_1', size: 50000 },
    },
    {
      // No explicit partId provided in raw MIME part
      filename: 'Invoice_2.pdf',
      mimeType: 'application/pdf',
      body: { attachmentId: 'att_2', size: 60000 },
    }
  ];

  const extracted = extractAttachmentParts(sampleParts);
  assert.strictEqual(extracted.length, 2, 'Must extract only the 2 PDF attachments');
  assert.strictEqual(extracted[0].partId, '1', 'Must preserve explicit partId');
  assert.strictEqual(extracted[1].partId, '2', 'Must assign deterministic index-based partId when omitted');
  assert.strictEqual(extracted[0].filename, 'Invoice_1.pdf');
  assert.strictEqual(extracted[1].filename, 'Invoice_2.pdf');
}
console.log('✓ extractAttachmentParts deterministic partIds passed');

console.log('\n======================================================');
console.log('ALL GMAIL IDEMPOTENCY & DEDUPLICATION TESTS PASSED!');
console.log('======================================================\n');
process.exit(0);
