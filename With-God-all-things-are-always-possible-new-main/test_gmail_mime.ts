import assert from 'node:assert';
import {
  extractAttachmentParts,
  getFilenameFromHeaders,
  getHeaderValue,
  isContentDispositionInline,
  isContentDispositionAttachment,
} from './server.js';

console.log('--- Running Gmail Attachment Classification Regression Tests ---');

// Test Case 1: MUST REJECT - Plain email body
// text/plain, no filename, body.data present, no attachmentId
const case1Parts = [
  {
    partId: '0',
    mimeType: 'text/plain',
    filename: '',
    headers: [
      { name: 'Content-Type', value: 'text/plain; charset=UTF-8' },
    ],
    body: {
      data: 'SGVsbG8sIHRoaXMgaXMgYW4gZW1haWwgYm9keSB3aXRob3V0IGF0dGFjaG1lbnRzLg==',
      size: 45,
    },
  },
];
const res1 = extractAttachmentParts(case1Parts);
assert.strictEqual(res1.length, 0, 'Case 1 Failed: Plain email body must not become an attachment');
console.log('✓ Case 1 Passed: Plain email body rejected');

// Test Case 2: MUST REJECT - HTML email body
// text/html, no filename, body.data present
const case2Parts = [
  {
    partId: '1',
    mimeType: 'text/html',
    filename: '',
    headers: [
      { name: 'Content-Type', value: 'text/html; charset=UTF-8' },
    ],
    body: {
      data: 'PGh0bWw+PGJvZHk+PHA+RW1haWwgYm9keTwvcD48L2JvZHk+PC9odG1sPg==',
      size: 55,
    },
  },
];
const res2 = extractAttachmentParts(case2Parts);
assert.strictEqual(res2.length, 0, 'Case 2 Failed: HTML email body must not become an attachment');
console.log('✓ Case 2 Passed: HTML email body rejected');

// Test Case 3: MUST REJECT - Inline image
// image/png, Content-Disposition: inline, Content-ID present
const case3Parts = [
  {
    partId: '0.2',
    mimeType: 'image/png',
    filename: 'banner.png',
    headers: [
      { name: 'Content-Type', value: 'image/png; name="banner.png"' },
      { name: 'Content-Disposition', value: 'inline; filename="banner.png"' },
      { name: 'Content-ID', value: '<banner.png@domain.com>' },
    ],
    body: {
      attachmentId: 'att_inline_banner',
      size: 5000,
    },
  },
];
const res3 = extractAttachmentParts(case3Parts);
assert.strictEqual(res3.length, 0, 'Case 3 Failed: Inline image with Content-ID must be rejected');
console.log('✓ Case 3 Passed: Inline image rejected');

// Test Case 4: MUST REJECT - CID image
// image/jpeg, Content-ID present
const case4Parts = [
  {
    partId: '0.3',
    mimeType: 'image/jpeg',
    filename: 'photo.jpg',
    headers: [
      { name: 'Content-Type', value: 'image/jpeg; name="photo.jpg"' },
      { name: 'Content-ID', value: '<photo123@domain.com>' },
    ],
    body: {
      attachmentId: 'att_cid_photo',
      size: 12000,
    },
  },
];
const res4 = extractAttachmentParts(case4Parts);
assert.strictEqual(res4.length, 0, 'Case 4 Failed: CID image must be rejected');
console.log('✓ Case 4 Passed: CID image rejected');

// Test Case 5: MUST REJECT - Embedded signature/logo
// image/png, inline, filename resembles logo/signature
const case5Parts = [
  {
    partId: '0.4',
    mimeType: 'image/png',
    filename: 'logo.png',
    headers: [
      { name: 'Content-Type', value: 'image/png; name="logo.png"' },
      { name: 'Content-Disposition', value: 'inline; filename="logo.png"' },
    ],
    body: {
      attachmentId: 'att_sig_logo',
      size: 1500,
    },
  },
];
const res5 = extractAttachmentParts(case5Parts);
assert.strictEqual(res5.length, 0, 'Case 5 Failed: Embedded signature/logo must be rejected');
console.log('✓ Case 5 Passed: Embedded signature/logo rejected');

// Test Case 6: MUST ACCEPT - PDF attachment
// application/pdf, filename: invoice.pdf, attachmentId present
const case6Parts = [
  {
    partId: '2',
    mimeType: 'application/pdf',
    filename: 'invoice.pdf',
    headers: [
      { name: 'Content-Type', value: 'application/pdf; name="invoice.pdf"' },
      { name: 'Content-Disposition', value: 'attachment; filename="invoice.pdf"' },
    ],
    body: {
      attachmentId: 'att_invoice_pdf',
      size: 65000,
    },
  },
];
const res6 = extractAttachmentParts(case6Parts);
assert.strictEqual(res6.length, 1, 'Case 6 Failed: Legitimate PDF attachment must be accepted');
assert.strictEqual(res6[0].filename, 'invoice.pdf');
console.log('✓ Case 6 Passed: PDF attachment accepted');

// Test Case 7: MUST ACCEPT - Word attachment
// application/vnd.openxmlformats-officedocument.wordprocessingml.document, filename: report.docx, attachmentId present
const case7Parts = [
  {
    partId: '3',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    filename: 'report.docx',
    headers: [
      { name: 'Content-Disposition', value: 'attachment; filename="report.docx"' },
    ],
    body: {
      attachmentId: 'att_report_docx',
      size: 45000,
    },
  },
];
const res7 = extractAttachmentParts(case7Parts);
assert.strictEqual(res7.length, 1, 'Case 7 Failed: Legitimate Word attachment must be accepted');
assert.strictEqual(res7[0].filename, 'report.docx');
console.log('✓ Case 7 Passed: Word attachment accepted');

// Test Case 8: MUST ACCEPT - Excel attachment
const case8Parts = [
  {
    partId: '4',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: 'financials.xlsx',
    headers: [
      { name: 'Content-Disposition', value: 'attachment; filename="financials.xlsx"' },
    ],
    body: {
      attachmentId: 'att_financials_xlsx',
      size: 80000,
    },
  },
];
const res8 = extractAttachmentParts(case8Parts);
assert.strictEqual(res8.length, 1, 'Case 8 Failed: Legitimate Excel attachment must be accepted');
assert.strictEqual(res8[0].filename, 'financials.xlsx');
console.log('✓ Case 8 Passed: Excel attachment accepted');

// Test Case 9: MUST ACCEPT - CSV attachment
const case9Parts = [
  {
    partId: '5',
    mimeType: 'text/csv',
    filename: 'users_export.csv',
    headers: [
      { name: 'Content-Disposition', value: 'attachment; filename="users_export.csv"' },
    ],
    body: {
      attachmentId: 'att_users_csv',
      size: 15000,
    },
  },
];
const res9 = extractAttachmentParts(case9Parts);
assert.strictEqual(res9.length, 1, 'Case 9 Failed: Legitimate CSV attachment must be accepted');
assert.strictEqual(res9[0].filename, 'users_export.csv');
console.log('✓ Case 9 Passed: CSV attachment accepted');

// Test Case 10: MUST ACCEPT - Legitimate TXT attachment
// text/plain, filename: notes.txt, attachmentId present
const case10Parts = [
  {
    partId: '6',
    mimeType: 'text/plain',
    filename: 'notes.txt',
    headers: [
      { name: 'Content-Disposition', value: 'attachment; filename="notes.txt"' },
    ],
    body: {
      attachmentId: 'att_notes_txt',
      size: 3500,
    },
  },
];
const res10 = extractAttachmentParts(case10Parts);
assert.strictEqual(res10.length, 1, 'Case 10 Failed: Legitimate TXT file attachment must be accepted');
assert.strictEqual(res10[0].filename, 'notes.txt');
console.log('✓ Case 10 Passed: Legitimate TXT attachment accepted');

// Test Case 11: MUST ACCEPT - Legitimate image attachment
// image/png, filename: receipt.png, attachmentId present, Content-Disposition: attachment
const case11Parts = [
  {
    partId: '7',
    mimeType: 'image/png',
    filename: 'receipt.png',
    headers: [
      { name: 'Content-Type', value: 'image/png; name="receipt.png"' },
      { name: 'Content-Disposition', value: 'attachment; filename="receipt.png"' },
    ],
    body: {
      attachmentId: 'att_receipt_png',
      size: 125000,
    },
  },
];
const res11 = extractAttachmentParts(case11Parts);
assert.strictEqual(res11.length, 1, 'Case 11 Failed: Legitimate image attachment must be accepted');
assert.strictEqual(res11[0].filename, 'receipt.png');
console.log('✓ Case 11 Passed: Legitimate image attachment accepted');

// Bonus Case: Nested multipart message with body and PDF attachment
const nestedMultipart = [
  {
    mimeType: 'multipart/alternative',
    filename: '',
    parts: [
      {
        partId: '0.0',
        mimeType: 'text/plain',
        filename: '',
        body: { data: 'SGkh', size: 4 },
      },
      {
        partId: '0.1',
        mimeType: 'text/html',
        filename: '',
        body: { data: 'PHA+SGk8L3A+', size: 10 },
      },
      {
        partId: '0.2',
        mimeType: 'image/png',
        filename: 'sig_logo.png',
        headers: [
          { name: 'Content-Disposition', value: 'inline; filename="sig_logo.png"' },
          { name: 'Content-ID', value: '<sig_logo@domain>' },
        ],
        body: { attachmentId: 'att_sig', size: 1200 },
      },
    ],
  },
  {
    partId: '1',
    mimeType: 'application/pdf',
    filename: 'signed_contract.pdf',
    headers: [
      { name: 'Content-Disposition', value: 'attachment; filename="signed_contract.pdf"' },
    ],
    body: { attachmentId: 'att_contract', size: 250000 },
  },
];
const nestedRes = extractAttachmentParts(nestedMultipart);
assert.strictEqual(nestedRes.length, 1, 'Nested multipart message must extract only the PDF');
assert.strictEqual(nestedRes[0].filename, 'signed_contract.pdf');
console.log('✓ Bonus Case Passed: Nested multipart extracts only the PDF');

console.log('\nALL 11 + BONUS GMAIL MIME REGRESSION TESTS PASSED CLEANLY!\n');
process.exit(0);
