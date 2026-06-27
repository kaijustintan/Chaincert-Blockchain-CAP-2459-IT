// ==========================================================================================================================================================================
//                                                               pdfExportService.js
//  Technical: Handles PDF generation for credential export. Uses jsPDF + qrcode. Pure frontend.
//  Tropang Ex: Dito ginagawa yung PDF ng credential — bagong "professional" look (puti na, hindi
//              na dark/purple). Single export = detalyadong isang page. Export All = malinis na
//              "transcript" na maraming credential kada page (Credly-style). - polo
//
//  PDF1-3 redesign (Batch 3): light professional theme, header = "ChainCert", footer =
//  "CHAINCERT — Exported on <date>". SINGLE export: one detailed page (Status → Type → Issued To →
//  Issued By → dates, Blockchain ID dropped — it's in the QR + verify link, verify block lower-right).
//  EXPORT ALL: Credly-style transcript — wordmark header + holder band + compact credential ROWS
//  (badge left, details right, description), many per page with auto page-break + "Page X of Y".
// ==========================================================================================================================================================================

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import apiService from './apiService';

const PH_TIMEZONE = { timeZone: 'Asia/Manila' };
const MARGIN = 20;
const PAGE_H = 297; // A4 height in mm

// Professional, print-friendly palette (deliberately NOT the dark/purple app theme — PDF1-3).
const COLORS = {
  pageBg: [255, 255, 255],
  bar: [30, 41, 59],       // slate-800 navy — header + footer bars (single export)
  barText: [255, 255, 255],
  band: [243, 244, 246],   // gray-100 — holder info band (transcript)
  name: [30, 58, 138],     // blue-900 — credential name + section accents
  label: [71, 85, 105],    // slate-600 — field labels
  value: [17, 24, 39],     // gray-900 — field values / body text
  divider: [203, 213, 225],// slate-300 — hairline rules
  link: [29, 78, 216],     // blue-700 — clickable links
  muted: [100, 116, 139],  // slate-500 — captions / raw URL
};

const formatPhilippineDate = (value) => {
  if (!value) return 'N/A';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-PH', PH_TIMEZONE);
  } catch {
    return 'N/A';
  }
};

// Strip characters that are illegal in Windows/macOS filenames; keep spaces and '#'.
const sanitizeFilename = (s) => String(s || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();

const buildVerifyUrl = (credential) =>
  `http://localhost:3000/verifier/dashboard?credentialId=${credential.blockchainId || ''}`;

/*
  Helper: drawStatusBanner
  Technical: Draws a large REVOKED / EXPIRED banner near the top of a SINGLE credential page so a
  non-active credential can never be passed off as valid. Active/issued → no banner (returns y as-is).
  Tropang Ex: Kapag na-revoke/na-expire na, may malaking tatak na hindi mo maikakaila. - polo
*/
const STATUS_BANNER = {
  revoked: { label: 'REVOKED', rgb: [220, 38, 38] },   // red-600
  expired: { label: 'EXPIRED', rgb: [217, 119, 6] },   // amber-600
};
function drawStatusBanner(doc, status, pageW, y) {
  const cfg = STATUS_BANNER[String(status || '').toLowerCase()];
  if (!cfg) return y;
  const [r, g, b] = cfg.rgb;
  const bannerW = 70;
  const bannerH = 13;
  const x = pageW / 2 - bannerW / 2;
  doc.setFillColor(r, g, b);
  doc.roundedRect(x, y, bannerW, bannerH, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text(cfg.label, pageW / 2, y + 9, { align: 'center' });
  return y + bannerH + 8;
}

/*
  Helper: drawChrome (SINGLE export)
  Technical: Paints the white background, the navy header bar ("ChainCert" + optional right caption),
  a thin accent rule, and the navy footer ("CHAINCERT — Exported on <date>"). Used by the single
  credential page only; the transcript (Export All) uses its own lighter header/footer.
*/
function drawChrome(doc, pageW, exportedOn, caption) {
  doc.setFillColor(...COLORS.pageBg);
  doc.rect(0, 0, pageW, PAGE_H, 'F');

  doc.setFillColor(...COLORS.bar);
  doc.rect(0, 0, pageW, 20, 'F');
  doc.setTextColor(...COLORS.barText);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ChainCert', MARGIN, 13);
  if (caption) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(String(caption).toUpperCase(), pageW - MARGIN, 13, { align: 'right' });
  }
  doc.setDrawColor(...COLORS.name);
  doc.setLineWidth(0.8);
  doc.line(0, 20, pageW, 20);

  doc.setFillColor(...COLORS.bar);
  doc.rect(0, PAGE_H - 14, pageW, 14, 'F');
  doc.setTextColor(...COLORS.barText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`CHAINCERT — Exported on ${exportedOn}`, pageW / 2, PAGE_H - 5.5, { align: 'center' });
}

/*
  Helper: renderCredentialPage (SINGLE export)
  Technical: Renders ONE credential as a full detailed page (picture → name → divider → details →
  divider → description → skills → lower-right verify block). Used by exportCredentialToPDF.
  Tropang Ex: Buong detalye ng isang credential sa isang page. - polo
*/
async function renderCredentialPage(doc, {
  credential,
  templateDetails = null,
  studentName,
  pageW,
  caption,
  exportedOn,
  profileShareUrl,
}) {
  const verifyUrl = buildVerifyUrl(credential);
  drawChrome(doc, pageW, exportedOn, caption);

  let y = 30;
  y = drawStatusBanner(doc, credential.status, pageW, y);

  const badgeImage = credential.badgeImage || templateDetails?.badgeImage || null;
  if (badgeImage && badgeImage.startsWith('data:image')) {
    try {
      const imgFormat = badgeImage.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(badgeImage, imgFormat, pageW / 2 - 24, y, 48, 48);
      y += 54;
    } catch (e) {
      console.warn('[PDF EXPORT] Badge image failed to load:', e);
      y += 4;
    }
  } else {
    y += 2;
  }

  doc.setTextColor(...COLORS.name);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text(credential.credentialName || 'Credential', pageW / 2, y, { align: 'center' });
  y += 8;

  if (profileShareUrl) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.link);
    const t = 'View Profile';
    const tw = doc.getTextWidth(t);
    doc.textWithLink(t, pageW / 2 - tw / 2, y, { url: profileShareUrl });
    y += 7;
  }

  y += 2;
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 9;

  const status = credential.status === 'issued' ? 'Active' : (credential.status || 'N/A');
  const details = [
    { label: 'Status',          value: status },
    { label: 'Credential Type', value: credential.credentialType || 'N/A' },
    { label: 'Issued To',       value: credential.holderName || studentName || 'N/A' },
    { label: 'Issued By',       value: credential.issuerName || 'N/A' },
    { label: 'Date Issued',     value: credential.savedToUserWalletAt ? formatPhilippineDate(credential.savedToUserWalletAt) : 'N/A' },
    { label: 'Expiry Date',     value: credential.expiryDate ? formatPhilippineDate(credential.expiryDate) : 'No Expiry' },
  ];
  details.forEach(({ label, value }) => {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.label);
    doc.text(`${label}:`, MARGIN, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.value);
    const lines = doc.splitTextToSize(String(value), pageW - MARGIN - 55);
    doc.text(lines, MARGIN + 45, y);
    y += lines.length > 1 ? lines.length * 6 + 1 : 8;
  });

  y += 3;
  doc.setDrawColor(...COLORS.divider);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 9;

  const description = credential.description || templateDetails?.description || '';
  if (description && description.trim()) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.label);
    doc.text('Description', MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.value);
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(description, pageW - MARGIN * 2);
    doc.text(descLines, MARGIN, y);
    y += descLines.length * 5 + 5;
  }

  const skills = templateDetails?.skills || credential.skills || [];
  if (skills.length > 0) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.label);
    doc.text('Skills', MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.value);
    doc.setFontSize(9);
    const skillLines = doc.splitTextToSize(skills.join('  •  '), pageW - MARGIN * 2);
    doc.text(skillLines, MARGIN, y);
    y += skillLines.length * 5 + 5;
  }

  // Verify block — lower right: heading → QR → link
  const qrSize = 34;
  const blockTop = Math.max(y + 6, 212);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.name);
  doc.text('Verify this credential', pageW - MARGIN, blockTop, { align: 'right' });

  let by = blockTop + 4;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 220, margin: 1, color: { dark: '#0f172a', light: '#ffffff' },
    });
    doc.addImage(qrDataUrl, 'PNG', pageW - MARGIN - qrSize, by, qrSize, qrSize);
  } catch (e) {
    console.warn('[PDF] QR failed:', e);
  }
  by += qrSize + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.link);
  const lbl = 'Open verification link';
  const lw = doc.getTextWidth(lbl);
  doc.textWithLink(lbl, pageW - MARGIN - lw, by, { url: verifyUrl });
  by += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.muted);
  const urlLines = doc.splitTextToSize(verifyUrl, 80);
  urlLines.forEach((ln, idx) => doc.text(ln, pageW - MARGIN, by + idx * 3, { align: 'right' }));
}

/*
  Function: exportCredentialToPDF
  Technical: Generates a single-page professional PDF for one credential (PDF1-3 layout).
  Tropang Ex: Kapag pinindot ni student yung Export, dito nag-ge-generate yung PDF file. - polo
*/
export async function exportCredentialToPDF(credential, templateDetails) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const exportedOn = new Date().toLocaleDateString('en-PH', PH_TIMEZONE);

  let profileShareUrl = null;
  let singleExportNumber = 1;
  try {
    const linksResult = await apiService.getMyShareLinks();
    if (linksResult?.success && linksResult?.links) {
      const singleLinks = linksResult.links.filter((link) => link.source === 'pdf_single_export');
      singleExportNumber = singleLinks.length + 1;
    }
  } catch (e) {
    console.warn('[PDF] Failed to count previous PDF exports:', e);
  }
  try {
    const shareResult = await apiService.generatePublicShareLink({
      source: 'pdf_single_export',
      description: `Single Export #${singleExportNumber}`,
    });
    if (shareResult?.success && shareResult?.shareUrl) {
      profileShareUrl = shareResult.shareUrl;
    }
  } catch (e) {
    console.warn('[PDF] Profile link generation failed (non-fatal):', e);
  }

  await renderCredentialPage(doc, {
    credential,
    templateDetails,
    studentName: credential.holderName,
    pageW,
    caption: 'Verified Digital Credential',
    exportedOn,
    profileShareUrl,
  });

  const fullName = sanitizeFilename(credential.holderName || 'Credential Holder');
  const credName = sanitizeFilename(credential.credentialName || 'Credential');
  doc.save(`ChainCert - ${fullName} - ${credName}.pdf`);
}

// ==========================================================================================================================================================================
//  EXPORT ALL — Credly-style transcript (many credentials per page)
// ==========================================================================================================================================================================

/*
  Helper: drawTranscriptHeader
  Technical: "ChainCert" wordmark (left) + "OFFICIAL TRANSCRIPT • EXPORTED <date>" (right) + a rule.
  Drawn at the top of every transcript page. Returns the y just below the rule.
*/
function drawTranscriptHeader(doc, pageW, exportedOn) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.name);
  doc.text('ChainCert', MARGIN, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.name);
  doc.text(`OFFICIAL TRANSCRIPT  •  EXPORTED ${String(exportedOn).toUpperCase()}`, pageW - MARGIN, 14, { align: 'right' });

  doc.setDrawColor(...COLORS.bar);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 23, pageW - MARGIN, 23);
  return 23;
}

/*
  Helper: drawHolderBand
  Technical: Gray info band — holder name + ID (left), Email + clickable Profile (right). Page 1 only.
*/
function drawHolderBand(doc, pageW, top, { name, id, email, profileShareUrl }) {
  const bandH = 20;
  doc.setFillColor(...COLORS.band);
  doc.rect(MARGIN, top, pageW - MARGIN * 2, bandH, 'F');

  const padX = MARGIN + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.value);
  doc.text(name || 'Credential Holder', padX, top + 9);
  if (id) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`ID: ${id}`, padX, top + 15);
  }

  const rightX = pageW - MARGIN - 5;
  let ry = top + 9;
  if (email) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.value);
    doc.text(`Email: ${email}`, rightX, ry, { align: 'right' });
    ry += 6;
  }
  if (profileShareUrl) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.link);
    const t = 'Profile: View Public Profile';
    const tw = doc.getTextWidth(t);
    doc.textWithLink(t, rightX - tw, ry, { url: profileShareUrl });
  }
  return top + bandH;
}

/*
  Helper: estimateRowHeight
  Technical: Predicts a credential row's height (name + 3 issued lines + wrapped description, min
  badge height) so the loop can page-break BEFORE drawing a row that would overflow the page.
*/
function estimateRowHeight(doc, cred, textW, badgeSize) {
  let h = 4 + 6 + 3 * 5; // name baseline offset + name + 3 issued lines
  const desc = cred.description || '';
  if (desc.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const dlw = doc.getTextWidth('Description: ');
    const dl = doc.splitTextToSize(desc, textW - dlw);
    h += 1 + dl.length * 4 + 5;
  }
  return Math.max(h, badgeSize + 4) + 7;
}

/*
  Helper: drawCredentialRow
  Technical: One compact credential row — badge (left), name (clickable → verify) + REVOKED/EXPIRED
  tag, "Issued by/to/on" lines, and a wrapped description, closed by a hairline divider. Returns the
  y for the next row.
  Tropang Ex: Parang isang entry sa transcript — maliit na badge tapos detalye sa tabi. - polo
*/
function drawCredentialRow(doc, cred, { pageW, y, studentName, badgeSize, textX, textW }) {
  const verifyUrl = buildVerifyUrl(cred);
  const rowTop = y;

  const badge = cred.badgeImage || null;
  if (badge && badge.startsWith('data:image')) {
    try {
      doc.addImage(badge, badge.includes('png') ? 'PNG' : 'JPEG', MARGIN, rowTop, badgeSize, badgeSize);
    } catch (e) {
      doc.setFillColor(...COLORS.band);
      doc.roundedRect(MARGIN, rowTop, badgeSize, badgeSize, 2, 2, 'F');
    }
  } else {
    doc.setFillColor(...COLORS.band);
    doc.roundedRect(MARGIN, rowTop, badgeSize, badgeSize, 2, 2, 'F');
  }

  let ty = rowTop + 4;

  // Name (clickable) + status tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.link);
  doc.textWithLink(cred.credentialName || 'Credential', textX, ty, { url: verifyUrl });

  const st = String(cred.status || '').toLowerCase();
  if (st === 'revoked' || st === 'expired') {
    const tag = st.toUpperCase();
    const [r, g, b] = st === 'revoked' ? [220, 38, 38] : [217, 119, 6];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const tw = doc.getTextWidth(tag) + 5;
    doc.setFillColor(r, g, b);
    doc.roundedRect(pageW - MARGIN - tw, ty - 3.6, tw, 5.6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(tag, pageW - MARGIN - tw + 2.5, ty + 0.3);
  }
  ty += 6;

  // Issued by / to / on
  const rows = [
    ['Issued by:', cred.issuerName || 'N/A'],
    ['Issued to:', cred.holderName || studentName || 'N/A'],
    ['Issued on:', cred.savedToUserWalletAt ? formatPhilippineDate(cred.savedToUserWalletAt) : 'N/A'],
  ];
  doc.setFontSize(9);
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.label);
    doc.text(label, textX, ty);
    const lblW = doc.getTextWidth(label) + 2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.value);
    doc.text(String(val), textX + lblW, ty);
    ty += 5;
  });

  // Description
  const desc = cred.description || '';
  if (desc.trim()) {
    ty += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.label);
    doc.text('Description:', textX, ty);
    const dlw = doc.getTextWidth('Description: ');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.value);
    const dl = doc.splitTextToSize(desc, textW - dlw);
    doc.text(dl[0] || '', textX + dlw, ty);
    for (let k = 1; k < dl.length; k++) {
      ty += 4;
      doc.text(dl[k], textX, ty);
    }
    ty += 5;
  }

  const rowBottom = Math.max(ty, rowTop + badgeSize + 4);
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, rowBottom, pageW - MARGIN, rowBottom);
  return rowBottom + 7;
}

/*
  Function: exportAllCredentialsToPDF
  Technical: Credly-style transcript PDF — wordmark header + holder band + compact credential rows,
  many per page with auto page-break, then "Page X of Y" stamped on every page. PUBLIC creds only.
  Tropang Ex: Kapag "Export All", hindi na isa-isang page — dinikit lahat sa malinis na listahan. - polo
*/
export async function exportAllCredentialsToPDF(credentials, studentName) {
  if (!credentials || credentials.length === 0) return;
  // PUBLIC creds only; revoked/expired still appear (with a tag) so nothing is silently hidden.
  credentials = credentials.filter((c) => c.visibility === 'public');
  credentials.sort((a, b) => (a.currentOrder ?? Infinity) - (b.currentOrder ?? Infinity));
  if (credentials.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const exportedOn = new Date().toLocaleDateString('en-PH', PH_TIMEZONE);

  // Reuse / generate the holder's public profile share link.
  let profileShareUrl = null;
  let pdfExportNumber = 1;
  try {
    const linksResult = await apiService.getMyShareLinks();
    if (linksResult?.success && linksResult?.links) {
      const pdfLinks = linksResult.links.filter((link) => link.source === 'pdf_export');
      pdfExportNumber = pdfLinks.length + 1;
    }
  } catch (e) {
    console.warn('[PDF] Failed to count previous PDF exports:', e);
  }
  try {
    const shareResult = await apiService.generatePublicShareLink({
      source: 'pdf_export',
      description: `Portfolio Export #${pdfExportNumber}`,
    });
    if (shareResult?.success && shareResult?.shareUrl) {
      profileShareUrl = shareResult.shareUrl;
    }
  } catch (e) {
    console.warn('[PDF] Profile link generation failed:', e);
  }

  // Holder identity for the band (no caller change — read from the logged-in user + first cred).
  let holderUser = {};
  try { holderUser = JSON.parse(localStorage.getItem('user') || '{}'); } catch { holderUser = {}; }
  const holderId = holderUser._id || credentials[0]?.holderID || '';
  const holderEmail = holderUser.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('email') : '') || '';

  const paintBg = () => {
    doc.setFillColor(...COLORS.pageBg);
    doc.rect(0, 0, pageW, PAGE_H, 'F');
  };

  paintBg();
  let y = drawTranscriptHeader(doc, pageW, exportedOn);
  y = drawHolderBand(doc, pageW, y + 4, {
    name: studentName, id: holderId, email: holderEmail, profileShareUrl,
  });
  y += 8;

  const badgeSize = 26;
  const textX = MARGIN + badgeSize + 8;
  const textW = pageW - textX - MARGIN;

  for (let i = 0; i < credentials.length; i++) {
    const cred = credentials[i];
    const estH = estimateRowHeight(doc, cred, textW, badgeSize);
    if (y + estH > PAGE_H - 16) {
      doc.addPage();
      paintBg();
      y = drawTranscriptHeader(doc, pageW, exportedOn) + 8;
    }
    y = drawCredentialRow(doc, cred, { pageW, y, studentName, badgeSize, textX, textW });
  }

  // Footer + "Page X of Y" on every page (page count known only after layout).
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(...COLORS.divider);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, PAGE_H - 12, pageW - MARGIN, PAGE_H - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(`CHAINCERT — Exported on ${exportedOn}`, MARGIN, PAGE_H - 6);
    doc.text(`Page ${p} of ${total}`, pageW - MARGIN, PAGE_H - 6, { align: 'right' });
  }

  const fullName = sanitizeFilename(studentName || 'Credential Holder');
  doc.save(`ChainCert - ${fullName} - Credential Portfolio.pdf`);
}
