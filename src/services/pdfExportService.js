// ==========================================================================================================================================================================
//                                                               pdfExportService.js
//  Technical: Handles PDF generation for credential export. Uses jsPDF + qrcode. Pure frontend.
//  Tropang Ex: Dito ginagawa yung PDF ng credential — bagong "professional" look (puti na, hindi
//              na dark/purple), bagong order ng fields, at QR + verify link sa kanang baba. - polo
//
//  PDF1-3 redesign (Batch 3): light professional theme, header = "ChainCert", footer =
//  "CHAINCERT — Exported on <date>", field order Status → Type → Issued To → Issued By → dates,
//  Blockchain ID DROPPED from the body (it lives in the QR + verify link), verify block (heading
//  → QR → link) anchored lower-right, filename "ChainCert - <Full Name> - <Credential Name>.pdf".
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
  bar: [30, 41, 59],       // slate-800 navy — header + footer bars
  barText: [255, 255, 255],
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
  Technical: Draws a large REVOKED / EXPIRED banner near the top of a credential page so a
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
  Helper: drawChrome
  Technical: Paints the white page background, the navy header bar ("ChainCert" left + an optional
  right caption), a thin accent rule under the header, and the navy footer ("CHAINCERT — Exported
  on <date>"). Shared by the cover page and every credential page so the look stays consistent.
*/
function drawChrome(doc, pageW, exportedOn, caption) {
  // Background
  doc.setFillColor(...COLORS.pageBg);
  doc.rect(0, 0, pageW, PAGE_H, 'F');

  // Header bar
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
  // Thin accent rule just under the header
  doc.setDrawColor(...COLORS.name);
  doc.setLineWidth(0.8);
  doc.line(0, 20, pageW, 20);

  // Footer bar
  doc.setFillColor(...COLORS.bar);
  doc.rect(0, PAGE_H - 14, pageW, 14, 'F');
  doc.setTextColor(...COLORS.barText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`CHAINCERT — Exported on ${exportedOn}`, pageW / 2, PAGE_H - 5.5, { align: 'center' });
}

/*
  Helper: renderCredentialPage
  Technical: Renders ONE credential onto the current page in the PDF1-3 layout (picture → name →
  divider → details → divider → description → skills → lower-right verify block). Used by both the
  single export and each page of the "Export All" portfolio so the format is identical.
  Tropang Ex: Iisang credential, iisang page, parehong format saan ka man galing. - polo
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

  // Large REVOKED/EXPIRED banner for non-active credentials
  y = drawStatusBanner(doc, credential.status, pageW, y);

  // Credential picture
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

  // Credential name
  doc.setTextColor(...COLORS.name);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text(credential.credentialName || 'Credential', pageW / 2, y, { align: 'center' });
  y += 8;

  // View Profile (retained — placed under the name)
  if (profileShareUrl) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.link);
    const t = 'View Profile';
    const tw = doc.getTextWidth(t);
    doc.textWithLink(t, pageW / 2 - tw / 2, y, { url: profileShareUrl });
    y += 7;
  }

  // ===== top divider =====
  y += 2;
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 9;

  // Detail rows — new order; Blockchain ID intentionally omitted (it's in the QR + verify link).
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

  // ===== bottom divider =====
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

  // ── Verify block — lower right: heading → QR → link ───────────────────────
  const qrSize = 34;
  // Anchor toward the lower area, but never above the content we just drew.
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

  // Clickable label, then the literal URL (small, right-aligned)
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

  // Reuse / generate the holder's public profile share link (View Profile target).
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

/*
  Function: exportAllCredentialsToPDF
  Technical: Multi-page portfolio PDF — a cover page (retained content, restyled) plus one page per
  PUBLIC credential, each in the same PDF1-3 layout as the single export.
  Tropang Ex: Kapag "Export All", may cover page tapos isang page bawat credential, pareho ng porma. - polo
*/
export async function exportAllCredentialsToPDF(credentials, studentName) {
  if (!credentials || credentials.length === 0) return;
  // Include all statuses (revoked/expired get the banner so they can't be mistaken for valid).
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

  // ── COVER PAGE (content retained, restyled to the professional theme) ──────
  drawChrome(doc, pageW, exportedOn, 'Credential Portfolio');

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
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(studentName || 'Credential Holder', pageW / 2, 128, { align: 'center' });

  let coverY = 138;
  if (profileShareUrl) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.link);
    const t = 'View Profile';
    const tw = doc.getTextWidth(t);
    doc.textWithLink(t, pageW / 2 - tw / 2, coverY, { url: profileShareUrl });
    coverY += 8;
  }

  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Exported: ${exportedOn}`, pageW / 2, coverY, { align: 'center' });
  doc.text(`Total Credentials: ${credentials.length}`, pageW / 2, coverY + 7, { align: 'center' });

  // Credential summary list on the cover
  coverY += 22;
  doc.setFontSize(9.5);
  credentials.forEach((cred, idx) => {
    if (coverY > 268) return; // stop if the list runs too long
    const status = cred.status === 'issued' ? 'Active' : (cred.status || 'N/A');
    doc.setTextColor(...COLORS.value);
    doc.text(`${idx + 1}. ${cred.credentialName || 'Unnamed'} — ${status}`, MARGIN + 10, coverY);
    coverY += 7;
  });

  // ── ONE PAGE PER CREDENTIAL (same layout as the single export) ────────────
  for (let i = 0; i < credentials.length; i++) {
    doc.addPage();
    // eslint-disable-next-line no-await-in-loop
    await renderCredentialPage(doc, {
      credential: credentials[i],
      studentName,
      pageW,
      caption: `${i + 1} of ${credentials.length}`,
      exportedOn,
      profileShareUrl,
    });
  }

  const fullName = sanitizeFilename(studentName || 'Credential Holder');
  doc.save(`ChainCert - ${fullName} - Credential Portfolio.pdf`);
}
