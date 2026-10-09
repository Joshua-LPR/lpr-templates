// Clipboard fixtures for paste tests. ALL names, addresses and amounts are
// made up — this folder is published with the site.

const P = (t, style = 'font-size:11pt;font-family:Arial;color:#b45f06;') =>
  `<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="${style}">${t}</span></p>`;
const B = t => `<span style="font-size:11pt;font-family:Arial;font-weight:700;color:#000000;">${t}</span>`;

const LONG = 'Tenant acknowledges and agrees that they are currently delinquent on their tenant portion of monthly rent under the Lease Agreement, and explicitly acknowledges owing a total outstanding balance in unpaid tenant rent as of the execution date of this agreement.';

// Google Docs: everything inside <b style="font-weight:normal" id="docs-internal-guid-…">
export const GDOCS = '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-abc123">' +
  `<h2 dir="ltr"><span style="font-size:16pt;font-family:Arial;color:#000;">SAMPLE PAYMENT AGREEMENT</span></h2>` +
  Array.from({ length: 5 }, (_, i) =>
    `<h3 dir="ltr"><span style="font-size:13pt;font-weight:700;">${i + 1}. Docs Section ${i + 1}</span></h3>` +
    P(`Docs paragraph ${i + 1}A. ${LONG}`) +
    `<ol style="margin-top:0;"><li dir="ltr" style="list-style-type:decimal;"><p dir="ltr"><span style="color:#b45f06;">Docs item ${i + 1}.1 — the full tenant portion is due on the first.</span></p></li>` +
    `<li dir="ltr"><p dir="ltr"><span>Docs item ${i + 1}.2 — the fixed installment is due on the fifteenth.</span></p></li></ol>` +
    P(`Docs paragraph ${i + 1}B. ${B('This sentence is bold.')} ${LONG}`)).join('') +
  '</b><br class="Apple-interchange-newline">';
export const GDOCS_SENTINELS = ['SAMPLE PAYMENT AGREEMENT', 'Docs Section 5', 'Docs paragraph 5B', 'Docs item 3.2', 'This sentence is bold.'];

// Microsoft Word: MsoNormal paragraphs, <o:p>, conditional list markers, inline styles.
export const WORD = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><style><!-- p.MsoNormal {margin:0in;} --></style></head><body lang=EN-US>
<!--StartFragment--><p class=MsoTitle style='font-family:"Calibri Light";font-size:28pt;color:#2F5496'>Word Sample Addendum<o:p></o:p></p>
${Array.from({ length: 6 }, (_, i) => `<p class=MsoNormal><b><span style='font-size:12pt;color:#C00000'>${i + 1}. Word Heading ${i + 1}<o:p></o:p></span></b></p>
<p class=MsoNormal style='line-height:150%'><span style='font-family:"Times New Roman";color:#538135'>Word paragraph ${i + 1}. ${LONG}<o:p></o:p></span></p>
<p class=MsoListParagraphCxSpFirst style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;</span></span><![endif]>Word list item one for section ${i + 1}.<o:p></o:p></p>`).join('\n')}
<!--EndFragment--></body></html>`;
export const WORD_SENTINELS = ['Word Sample Addendum', 'Word Heading 6', 'Word paragraph 6.', 'Word list item one for section 4.'];

// An AI chat answer copied as rich text.
export const AI_HTML = '<h2>Sample Repayment Plan</h2><p><strong>Landlord:</strong> Sample Holdings LLC</p><p><strong>Tenant(s):</strong> Jane Doe</p>' +
  '<h3>1. Acknowledgment</h3><p>' + LONG + '</p>' +
  '<h3>2. Repayment Schedule</h3><ol><li><p><strong>1st of the Month (Tenant Rent Portion):</strong></p><p>On or before the <strong>1st day</strong> of each month, ' + LONG + '</p>' +
  '<ul><li><strong>Adjustment Clause:</strong> ' + LONG + '</li></ul></li><li><p><strong>15th of the Month (Fixed Repayment):</strong></p><p>' + LONG + '</p></li>' +
  '<li><p><strong>Duration:</strong></p><p>Payments continue until the balance is zero.</p></li></ol>' +
  '<h3>3. Default</h3><p>' + LONG + '</p><ul><li>AI bullet one. ' + LONG + '</li><li>AI bullet two. ' + LONG + '</li><li>AI bullet three. ' + LONG + '</li></ul>' +
  '<h3>4. Non-Waiver</h3><p>' + LONG + '</p><h3>5. Integration</h3><p>' + LONG + '</p>';
export const AI_SENTINELS = ['Sample Repayment Plan', 'Adjustment Clause:', 'AI bullet three.', '5. Integration', 'Payments continue until the balance is zero.'];

// The same answer as plain text with Markdown (what "paste values only" gives).
export const MARKDOWN = `# Sample Repayment Plan

**Landlord:** Sample Holdings LLC
**Tenant(s):** Jane Doe

### 1. Acknowledgment
${LONG}

### 2. Repayment Schedule
1. **1st of the Month (Tenant Rent Portion):**
   On or before the **1st day** of each month, ${LONG}
   - **Adjustment Clause:** ${LONG}
2. **15th of the Month (Fixed Repayment):**
   ${LONG}
3. **Duration:**
   Payments continue until the balance is zero.

### 3. Default
${LONG}
- MD bullet one. ${LONG}
- MD bullet two. *Italic words here.* ${LONG}
- MD bullet three. ${LONG}

### 4. Non-Waiver
${LONG}
`;
export const MARKDOWN_SENTINELS = ['Sample Repayment Plan', 'Adjustment Clause:', 'MD bullet three.', 'Payments continue until the balance is zero.', 'Italic words here.'];

// Plain text from Word / Notepad: one paragraph per line, no Markdown.
export const PLAIN = Array.from({ length: 10 }, (_, i) => `Plain paragraph ${i + 1}. ${LONG}`).join('\r\n');
export const PLAIN_SENTINELS = ['Plain paragraph 1.', 'Plain paragraph 10.'];
