// ==========================================================================================================================================================================
//                                                               pdfExportService.js
//  Technical: Handles PDF generation for credential export. Uses jsPDF + qrcode. Pure frontend.
//  Tropang Ex: Dito ginagawa yung PDF ng credential — bagong "professional" look (puti na, hindi
//              na dark/purple). Single export = detalyadong isang page (QR + verify, WALANG View
//              Profile). Export All = cover page + malinis na "transcript" na maraming credential
//              kada page (Credly-style), may QR + verify kada credential. - polo
//
//  PDF1-3 + share-link privacy fix (Batch 3):
//   - SINGLE export: detailed one page. NO "View Profile" (and no share-link minting) — a single
//     credential relies only on its OWN QR + verify link, never the full profile.
//   - EXPORT ALL: cover page (with View Profile on the ONE reused permanent link) + Credly-style
//     transcript rows, each with badge + always-visible Status + Issued by/to/on + description +
//     its own QR + verify link. Holder ID is NOT printed.
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
  band: [243, 244, 246],   // gray-100 — badge placeholder fill
  name: [30, 58, 138],     // blue-900 — credential name + section accents
  label: [71, 85, 105],    // slate-600 — field labels
  value: [17, 24, 39],     // gray-900 — field values / body text
  divider: [203, 213, 225],// slate-300 — hairline rules
  link: [29, 78, 216],     // blue-700 — clickable links
  muted: [100, 116, 139],  // slate-500 — captions / raw URL
  ok: [22, 163, 74],       // green-600 — active status
  revoked: [220, 38, 38],  // red-600
  expired: [217, 119, 6],  // amber-600
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
  `${process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000'}/verifier/dashboard?credentialId=${credential.blockchainId || ''}`;

// Human-readable status + its color (issued → "Active"). Used everywhere status is shown.
function statusDisplay(status) {
  const raw = String(status || '').toLowerCase();
  const label = raw === 'issued' ? 'Active'
    : raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'N/A';
  const color = (raw === 'issued' || raw === 'active') ? COLORS.ok
    : raw === 'revoked' ? COLORS.revoked
    : raw === 'expired' ? COLORS.expired
    : COLORS.value;
  return { label, color };
}

/*
  Helper: drawStatusBanner
  Technical: Draws a large REVOKED / EXPIRED banner near the top of a SINGLE credential page so a
  non-active credential can never be passed off as valid. Active/issued → no banner (returns y as-is).
*/
const STATUS_BANNER = {
  revoked: { label: 'REVOKED', rgb: COLORS.revoked },
  expired: { label: 'EXPIRED', rgb: COLORS.expired },
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
  Technical: White background, navy header bar ("ChainCert" + optional right caption), thin accent
  rule, navy footer ("CHAINCERT — Exported on <date>").
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
  doc.text(`CHAINCERT · Exported on ${exportedOn}`, pageW / 2, PAGE_H - 5.5, { align: 'center' });
}

/*
  Function: exportCredentialToPDF (SINGLE)
  Technical: One detailed page — picture → name → divider → details → divider → description →
  skills → lower-right verify block (QR + link). NO "View Profile" and NO share-link minting:
  a single credential relies only on its own QR + verify link, never the holder's full profile.
  Tropang Ex: Isang credential, isang page. May sariling QR + verify. Walang View Profile. - polo
*/
export async function exportCredentialToPDF(credential, templateDetails) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const exportedOn = new Date().toLocaleDateString('en-PH', PH_TIMEZONE);
  const verifyUrl = buildVerifyUrl(credential);

  drawChrome(doc, pageW, exportedOn, 'Verified Digital Credential');

  let y = 30;
  y = drawStatusBanner(doc, credential.status, pageW, y);

  // Picture
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

  // Name
  doc.setTextColor(...COLORS.name);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text(credential.credentialName || 'Credential', pageW / 2, y, { align: 'center' });
  y += 10;

  // top divider
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 9;

  // Details (Blockchain ID omitted — it's in the QR + verify link)
  const status = credential.status === 'issued' ? 'Active' : (credential.status || 'N/A');
  const details = [
    { label: 'Status',          value: status },
    { label: 'Credential Type', value: credential.credentialType || 'N/A' },
    { label: 'Issued To',       value: credential.holderName || 'N/A' },
    { label: 'Issued By',       value: credential.issuerName || 'N/A' },
    { label: 'Date Issued',     value: credential.savedToUserWalletAt ? formatPhilippineDate(credential.savedToUserWalletAt) : 'N/A' },
    { label: 'Expiry Date',     value: credential.expiryDate ? formatPhilippineDate(credential.expiryDate) : 'No Expiry' },
  ];
  // 3.2: surface renewal history when this credential line has been renewed (reissued) before.
  if (Number(credential.renewalCount) > 0) {
    // UAT: one clear line. The current copy's date is already the "Date Issued" row above, so we
    // don't repeat it (that was the confusing duplicate) — just the count + the original date.
    const orig = credential.originalIssuedDate ? `, first issued ${formatPhilippineDate(credential.originalIssuedDate)}` : '';
    details.push({ label: 'Renewed', value: `${credential.renewalCount}×${orig}` });
  }
  // Defense revision S2: the revocation reason must appear on the PDF, not only in the app.
  // Guarded — a credential revoked before the reason field existed (or whose CouchDB mirror
  // write failed) legitimately has none; we print nothing rather than "undefined".
  if (String(credential.status).toLowerCase() === 'revoked') {
    if (credential.revokedAt) {
      details.push({ label: 'Revoked On', value: formatPhilippineDate(credential.revokedAt) });
    }
    if (credential.rejectionReason && String(credential.rejectionReason).trim()) {
      details.push({ label: 'Revocation Reason', value: String(credential.rejectionReason).trim() });
    }
  }
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

  // bottom divider
  y += 3;
  doc.setDrawColor(...COLORS.divider);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 9;

  // Description
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

  // Skills
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

  const fullName = sanitizeFilename(credential.holderName || 'Credential Holder');
  const credName = sanitizeFilename(credential.credentialName || 'Credential');
  doc.save(`ChainCert - ${fullName} - ${credName}.pdf`);
}

// ==========================================================================================================================================================================
//  EXPORT ALL — cover page + Credly-style transcript (many credentials per page)
// ==========================================================================================================================================================================

/*
  Helper: drawTranscriptHeader
  Technical: "ChainCert" wordmark (left) + "OFFICIAL TRANSCRIPT • EXPORTED <date>" (right) + rule.
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
  Helper: estimateRowHeight
  Technical: Predicts a credential row's height (name + Status + 3 issued lines + wrapped
  description, with a minimum of the badge/QR block) so the loop can page-break BEFORE drawing a
  row that would overflow the page.
*/
function estimateRowHeight(doc, cred, textW, badgeSize, qrSize) {
  let h = 4 + 6 + 5 + 3 * 5; // name + Status line + 3 issued lines
  // Dynamic rows the drawer appends (Renewed / revocation Reason). These were
  // previously uncounted — a pre-existing gap for "Renewed" that would push a
  // tall row past the page-break check. Mirror the drawer's wrap math (size 9).
  doc.setFontSize(9);
  if (Number(cred.renewalCount) > 0) h += 5;
  if (String(cred.status).toLowerCase() === 'revoked' && String(cred.rejectionReason || '').trim()) {
    doc.setFont('helvetica', 'bold'); // drawer measures the label in bold
    const lblW = doc.getTextWidth('Reason:') + 2;
    doc.setFont('helvetica', 'normal');
    const rl = doc.splitTextToSize(String(cred.rejectionReason).trim(), textW - lblW);
    h += rl.length * 5;
  }
  const desc = cred.description || '';
  if (desc.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const dlw = doc.getTextWidth('Description: ');
    const dl = doc.splitTextToSize(desc, textW - dlw);
    h += 1 + dl.length * 4 + 5;
  }
  return Math.max(h, badgeSize + 4, qrSize + 8) + 7;
}

/*
  Helper: drawCredentialRow
  Technical: One compact transcript row — badge (left), name (clickable → verify) + always-visible
  colored Status + "Issued by/to/on" + wrapped description (middle), and the credential's own QR +
  "Verify" link (right). Closed by a hairline divider. Async (QR per row). Returns the next y.
  Tropang Ex: Isang entry sa transcript — badge, detalye, tapos sariling QR sa kanan. - polo
*/
async function drawCredentialRow(doc, cred, { pageW, y, studentName, badgeSize, qrSize, textX, textW }) {
  const verifyUrl = buildVerifyUrl(cred);
  const rowTop = y;
  const qrX = pageW - MARGIN - qrSize;

  // Badge (left)
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

  // QR (right) + "Verify" link under it
  try {
    const qr = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
    doc.addImage(qr, 'PNG', qrX, rowTop, qrSize, qrSize);
  } catch (e) {
    console.warn('[PDF] QR failed:', e);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.link);
  const vt = 'Verify';
  const vtw = doc.getTextWidth(vt);
  doc.textWithLink(vt, qrX + qrSize / 2 - vtw / 2, rowTop + qrSize + 4, { url: verifyUrl });

  let ty = rowTop + 4;

  // Name (clickable; wraps within the text column, never under the QR)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.link);
  const nameLines = doc.splitTextToSize(cred.credentialName || 'Credential', textW);
  doc.textWithLink(nameLines[0], textX, ty, { url: verifyUrl });
  for (let k = 1; k < nameLines.length; k++) {
    ty += 5;
    doc.text(nameLines[k], textX, ty);
  }
  ty += 6;

  // Status — ALWAYS shown, color-coded (never assume "no tag = active")
  const { label: stLabel, color: stColor } = statusDisplay(cred.status);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.label);
  doc.text('Status:', textX, ty);
  const slw = doc.getTextWidth('Status:') + 2;
  doc.setTextColor(...stColor);
  doc.text(stLabel, textX + slw, ty);
  ty += 5;

  // Issued by / to / on (+ renewal history when this credential line was reissued — 3.2)
  const rows = [
    ['Issued by:', cred.issuerName || 'N/A'],
    ['Issued to:', cred.holderName || studentName || 'N/A'],
    ['Issued on:', cred.savedToUserWalletAt ? formatPhilippineDate(cred.savedToUserWalletAt) : 'N/A'],
  ];
  if (Number(cred.renewalCount) > 0) {
    // UAT: one clear line — don't repeat the current copy's date (already the "Issued on" row).
    const orig = cred.originalIssuedDate ? `, first issued ${formatPhilippineDate(cred.originalIssuedDate)}` : '';
    rows.push(['Renewed:', `${cred.renewalCount}×${orig}`]);
  }
  // Defense revision S2: the revocation reason must appear on the exported PDF.
  // Guarded — legacy revocations without a stored reason print nothing.
  if (String(cred.status).toLowerCase() === 'revoked' && String(cred.rejectionReason || '').trim()) {
    rows.push(['Reason:', String(cred.rejectionReason).trim()]);
  }
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.label);
    doc.text(label, textX, ty);
    const lblW = doc.getTextWidth(label) + 2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.value);
    // Wrap long values (a free-text reason can be hundreds of chars) inside the
    // text column instead of running under the QR block on the right.
    const lines = doc.splitTextToSize(String(val), textW - lblW);
    doc.text(lines, textX + lblW, ty);
    ty += lines.length * 5;
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

  const rowBottom = Math.max(ty, rowTop + badgeSize + 4, rowTop + qrSize + 8);
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, rowBottom, pageW - MARGIN, rowBottom);
  return rowBottom + 7;
}

/*
  Function: exportAllCredentialsToPDF
  Technical: Cover page (ChainCert / Credential Portfolio / holder name + email + View Profile on
  the ONE reused permanent link / date / total) followed by a Credly-style transcript — compact
  credential rows, many per page with auto page-break, then "Page X of Y" on every page. PUBLIC
  creds only. Holder ID is NOT printed.
  Tropang Ex: Cover page muna, tapos malinis na listahan ng lahat ng credential. - polo
*/
export async function exportAllCredentialsToPDF(credentials, studentName) {
  if (!credentials || credentials.length === 0) return;
  // PUBLIC creds only; revoked/expired still appear (Status shown) so nothing is silently hidden.
  credentials = credentials.filter((c) => c.visibility === 'public');
  credentials.sort((a, b) => (a.currentOrder ?? Infinity) - (b.currentOrder ?? Infinity));
  if (credentials.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const exportedOn = new Date().toLocaleDateString('en-PH', PH_TIMEZONE);

  // The portfolio doc keeps a "View Profile" pointer — sourced from the ONE reused permanent public
  // link (the backend now reuses an existing active public link instead of minting a new one).
  let profileShareUrl = null;
  try {
    const shareResult = await apiService.generatePublicShareLink({
      source: 'pdf_export',
      description: 'Portfolio Export',
    });
    if (shareResult?.success && shareResult?.shareUrl) {
      profileShareUrl = shareResult.shareUrl;
    }
  } catch (e) {
    console.warn('[PDF] Profile link generation failed (non-fatal):', e);
  }

  // Holder email for the cover (read from the logged-in user; no caller change). ID intentionally omitted.
  let holderUser = {};
  try { holderUser = JSON.parse(localStorage.getItem('user') || '{}'); } catch { holderUser = {}; }
  const holderEmail = holderUser.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('email') : '') || '';

  const paintBg = () => {
    doc.setFillColor(...COLORS.pageBg);
    doc.rect(0, 0, pageW, PAGE_H, 'F');
  };

  // ── COVER PAGE ─────────────────────────────────────────────────────────────
  paintBg();
  doc.setTextColor(...COLORS.name);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text('ChainCert', pageW / 2, 95, { align: 'center' });

  doc.setTextColor(...COLORS.value);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('Credential Portfolio', pageW / 2, 108, { align: 'center' });

  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.5);
  doc.line(MARGIN + 20, 116, pageW - MARGIN - 20, 116);

  doc.setTextColor(...COLORS.name);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(studentName || 'Credential Holder', pageW / 2, 128, { align: 'center' });

  let cy = 136;
  if (holderEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(holderEmail, pageW / 2, cy, { align: 'center' });
    cy += 7;
  }
  if (profileShareUrl) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.link);
    const t = 'View Profile';
    const tw = doc.getTextWidth(t);
    doc.textWithLink(t, pageW / 2 - tw / 2, cy, { url: profileShareUrl });
    cy += 8;
  }
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Exported: ${exportedOn}`, pageW / 2, cy, { align: 'center' });
  doc.text(`Total Credentials: ${credentials.length}`, pageW / 2, cy + 7, { align: 'center' });

  // ── TRANSCRIPT ROWS ──────────────────────────────────────────────────────
  doc.addPage();
  paintBg();
  let y = drawTranscriptHeader(doc, pageW, exportedOn) + 8;

  const badgeSize = 24;
  const qrSize = 20;
  const textX = MARGIN + badgeSize + 7;
  const textW = (pageW - MARGIN - qrSize - 5) - textX; // leave room for the right-side QR column

  for (let i = 0; i < credentials.length; i++) {
    const cred = credentials[i];
    const estH = estimateRowHeight(doc, cred, textW, badgeSize, qrSize);
    if (y + estH > PAGE_H - 16) {
      doc.addPage();
      paintBg();
      y = drawTranscriptHeader(doc, pageW, exportedOn) + 8;
    }
    // eslint-disable-next-line no-await-in-loop
    y = await drawCredentialRow(doc, cred, { pageW, y, studentName, badgeSize, qrSize, textX, textW });
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
    doc.text(`CHAINCERT · Exported on ${exportedOn}`, MARGIN, PAGE_H - 6);
    doc.text(`Page ${p} of ${total}`, pageW - MARGIN, PAGE_H - 6, { align: 'right' });
  }

  const fullName = sanitizeFilename(studentName || 'Credential Holder');
  doc.save(`ChainCert - ${fullName} - Credential Portfolio.pdf`);
}
