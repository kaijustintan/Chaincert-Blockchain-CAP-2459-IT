// ==========================================================================================================================================================================
//                                                               pdfExportService.js
//  Technical: Handles PDF generation for credential export. Uses jsPDF. - polo
//  Tropang Ex: Dito ginagawa yung PDF ng credential. Pure frontend, walang backend call.
// ==========================================================================================================================================================================

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import apiService from './apiService';

const PH_TIMEZONE = { timeZone: 'Asia/Manila' };
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

/*
  Function: exportCredentialToPDF
  Technical: Generates a styled PDF for a credential with badge image, details, and verification link.
  Tropang Ex: Kapag pinindot ni student yung Export, dito nag-ge-generate yung PDF file. - polo
*/
export async function exportCredentialToPDF(credential, templateDetails) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;
  const verifyUrl = `http://localhost:3000/verifier/dashboard?credentialId=${credential.blockchainId || ''}`;
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
      description: `Single Export #${singleExportNumber}`
    });
    if (shareResult?.success && shareResult?.shareUrl) {
      profileShareUrl = shareResult.shareUrl;
    }
  } catch (e) {
    console.warn('[PDF] Profile link generation failed (non-fatal):', e);
  }

  // ── Background ───────────────────────────────────────────────────────────
  doc.setFillColor(12, 8, 32);
  doc.rect(0, 0, pageW, 297, 'F');

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ChainCert — Verified Digital Credential', pageW / 2, 12, { align: 'center' });

  y = 30;

  if (credential.holderName) {
    doc.setTextColor(196, 181, 253);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(credential.holderName, pageW / 2, y, { align: 'center' });
    y += 8;
  }

  if (profileShareUrl) {
    doc.setTextColor(102, 126, 234);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.textWithLink('View Profile', pageW / 2, y, { align: 'center', url: profileShareUrl });
    y += 8;
  }

  // ── Badge Image ──────────────────────────────────────────────────────────
  const badgeImage = credential.badgeImage || templateDetails?.badgeImage || null;
  if (badgeImage && badgeImage.startsWith('data:image')) {
    try {
      const imgFormat = badgeImage.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(badgeImage, imgFormat, pageW / 2 - 25, y, 50, 50);
      y += 58;
    } catch (e) {
      console.warn('[PDF EXPORT] Badge image failed to load:', e);
      y += 4;
    }
  }

  // ── Credential Name ──────────────────────────────────────────────────────
  const credentialTitle = credential.credentialName || 'Credential';
  doc.setTextColor(102, 126, 234);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.textWithLink(credentialTitle, pageW / 2, y, { align: 'center', url: verifyUrl });
  y += 10;

  // ── Divider ──────────────────────────────────────────────────────────────
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Detail rows ──────────────────────────────────────────────────────────
  const details = [
    { label: 'Credential Type', value: credential.credentialType || 'N/A' },
    { label: 'Issued To',       value: credential.holderName || 'N/A' },
    { label: 'Issued By',       value: credential.issuerName || 'N/A' },
    { label: 'Status',          value: credential.status === 'issued' ? 'Active' : (credential.status || 'N/A') },
    { label: 'Date Issued',     value: credential.savedToUserWalletAt ? formatPhilippineDate(credential.savedToUserWalletAt) : 'N/A' },
    { label: 'Expiry Date',     value: credential.expiryDate ? formatPhilippineDate(credential.expiryDate) : 'No Expiry' },
    { label: 'Blockchain ID',   value: credential.blockchainId || 'N/A' },
  ];

  details.forEach(({ label, value }) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(167, 139, 250);
    doc.text(label + ':', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    // wrap long values like blockchainId
    const lines = doc.splitTextToSize(value, pageW - margin - 60);
    doc.text(lines, margin + 42, y);
    y += lines.length > 1 ? lines.length * 7 + 2 : 9;
  });

  const description = credential.description || templateDetails?.description || '';
  if (description && description.trim()) {
    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(167, 139, 250);
    doc.text('Description:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    const descLines = doc.splitTextToSize(description, pageW - margin * 2);
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 4;
  }

  // ── Skills ───────────────────────────────────────────────────────────────
  const skills = templateDetails?.skills || credential.skills || [];
  if (skills.length > 0) {
    y += 2;
    doc.setDrawColor(139, 92, 246);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(167, 139, 250);
    doc.text('Skills:', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    const skillText = skills.join('  •  ');
    const skillLines = doc.splitTextToSize(skillText, pageW - margin * 2);
    doc.text(skillLines, margin, y);
    y += skillLines.length * 5 + 4;
  }

  // ── Verification Link ─────────────────────────────────────────
  y += 4;
  doc.setDrawColor(139, 92, 246);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(167, 139, 250);
  doc.text('Verify this credential:', margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 126, 234);
  const verifyLines = doc.splitTextToSize(verifyUrl, pageW - margin * 2);
  doc.textWithLink(verifyLines.join('\n'), margin, y, { url: verifyUrl });
  y += verifyLines.length * 4 + 4;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
    const qrSize = 40;
    doc.addImage(qrDataUrl, 'PNG', pageW / 2 - qrSize / 2, y, qrSize, qrSize);
    y += qrSize + 4;
  } catch (e) { console.warn('[PDF] QR failed:', e); }

  if (profileShareUrl) {
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(167, 139, 250);
    doc.text('Holder Profile:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 126, 234);
    doc.textWithLink('View Profile', margin + 30, y, { url: profileShareUrl });
    y += 8;
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 285, pageW, 12, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Generated by ChainCert — Blockchain-Verified Credential Platform', pageW / 2, 292, { align: 'center' });

  // ── Save ─────────────────────────────────────────────────────────────────
  const holderPart = (credential.holderName || 'credential').replace(/\s+/g, '_');
  const credPart = (credential.credentialName || 'credential').replace(/\s+/g, '_');
  const filename = `ChainCert_${holderPart}_${credPart}.pdf`;
  doc.save(filename);
}

/*
  Function: exportAllCredentialsToPDF
  Technical: Generates a multi-page PDF with all credentials. Cover page + compact credential pages.
  Tropang Ex: Kapag pinindot ni student yung "Export All", lalabas isang PDF na may lahat ng creds. - polo (Task 3)
*/
export async function exportAllCredentialsToPDF(credentials, studentName) {
  if (!credentials || credentials.length === 0) return;
  credentials = credentials.filter(c =>
    c.status !== 'revoked' &&
    c.status !== 'expired' &&
    c.visibility === 'public'
  );
  credentials.sort((a, b) => (a.currentOrder ?? Infinity) - (b.currentOrder ?? Infinity));
  if (credentials.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
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
      description: `Portfolio Export #${pdfExportNumber}`
    });
    if (shareResult?.success && shareResult?.shareUrl) {
      profileShareUrl = shareResult.shareUrl;
    }
  } catch (e) {
    console.warn('[PDF] Profile link generation failed:', e);
  }

  // ── COVER PAGE ────────────────────────────────────────────────────────────
  doc.setFillColor(12, 8, 32);
  doc.rect(0, 0, pageW, 297, 'F');

  // Header bar
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ChainCert — Verified Digital Credential Portfolio', pageW / 2, 12, { align: 'center' });

  // Logo / title area
  doc.setTextColor(196, 181, 253);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('ChainCert', pageW / 2, 90, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Credential Portfolio', pageW / 2, 104, { align: 'center' });

  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.line(margin + 20, 112, pageW - margin - 20, 112);

  doc.setTextColor(167, 139, 250);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(studentName || 'Credential Holder', pageW / 2, 124, { align: 'center' });

  let coverY = 134;
  if (profileShareUrl) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 126, 234);
    doc.textWithLink('View Profile', pageW / 2, coverY, { align: 'center', url: profileShareUrl });
    coverY += 8;
  }

  doc.setTextColor(136, 136, 136);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-PH', PH_TIMEZONE)}`, pageW / 2, coverY, { align: 'center' });
  doc.text(`Total Active Credentials: ${credentials.length}`, pageW / 2, coverY + 8, { align: 'center' }); 

  // Credential list summary on cover
  coverY += 26;
  doc.setFontSize(9);
  credentials.forEach((cred, idx) => {
    if (coverY > 270) return; // stop if too long
    const status = cred.status === 'issued' ? 'Active' : (cred.status || 'N/A');
    const line = `${idx + 1}. ${cred.credentialName || 'Unnamed'} — ${status}`;
    doc.setTextColor(212, 212, 216);
    doc.text(line, margin + 10, coverY);
    coverY += 7;
  });

  // Footer
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 285, pageW, 12, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Generated by ChainCert — Blockchain-Verified Credential Platform', pageW / 2, 292, { align: 'center' });

  // ── ONE PAGE PER CREDENTIAL ───────────────────────────────────────────────
  for (let i = 0; i < credentials.length; i++) {
    const credential = credentials[i];
    const verifyUrl = `http://localhost:3000/verifier/dashboard?credentialId=${credential.blockchainId || ''}`;
    doc.addPage();

    let y = 20;

    // Background
    doc.setFillColor(12, 8, 32);
    doc.rect(0, 0, pageW, 297, 'F');

    // Header bar
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`ChainCert  •  ${i + 1} of ${credentials.length}`, pageW / 2, 12, { align: 'center' });

    y = 30;

    const badgeImage = credential.badgeImage || null;
    if (badgeImage && badgeImage.startsWith('data:image')) {
      try {
        const imgFormat = badgeImage.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(badgeImage, imgFormat, pageW / 2 - 22.5, y, 45, 45);
        y += 53;
      } catch (e) { y += 4; }
    }

    // Credential name
    doc.setTextColor(102, 126, 234);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.textWithLink(credential.credentialName || 'Credential', margin, y, { url: verifyUrl });
    y += 8;

    // Divider
    doc.setDrawColor(139, 92, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // Detail rows
    const details = [
      { label: 'Credential Type', value: credential.credentialType || 'N/A' },
      { label: 'Issued To', value: credential.holderName || studentName || 'N/A' },
      { label: 'Issued By', value: credential.issuerName || 'N/A' },
      { label: 'Status', value: credential.status === 'issued' ? 'Active' : (credential.status || 'N/A') },
      { label: 'Date Issued', value: credential.savedToUserWalletAt ? formatPhilippineDate(credential.savedToUserWalletAt) : 'N/A' },
      { label: 'Expiry Date', value: credential.expiryDate ? formatPhilippineDate(credential.expiryDate) : 'No Expiry' },
      { label: 'Blockchain ID', value: credential.blockchainId || 'N/A' },
    ];

    details.forEach(({ label, value }) => {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(167, 139, 250);
      doc.text(`${label}:`, margin, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      const lines = doc.splitTextToSize(value, pageW - margin - 50);
      doc.text(lines, margin + 36, y);
      y += lines.length > 1 ? lines.length * 6 + 1 : 7;
    });

    const description = credential.description || '';
    if (description && description.trim()) {
      y += 4;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(167, 139, 250);
      doc.text('Description:', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      const descLines = doc.splitTextToSize(description, pageW - margin * 2);
      doc.text(descLines, margin, y);
      y += descLines.length * 5 + 4;
    }

    const skills = credential.skills || [];
    if (skills.length > 0) {
      y += 1;
      doc.setDrawColor(139, 92, 246);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(167, 139, 250);
      doc.text('Skills:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      const skillLines = doc.splitTextToSize(skills.join('  •  '), pageW - margin * 2);
      doc.text(skillLines, margin, y);
      y += skillLines.length * 4 + 3;
    }

    // ── Verification Link ─────────────────────────────────────────
    y += 4;
    doc.setDrawColor(139, 92, 246);
    doc.line(margin, y, pageW - margin, y);
    y += 14;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(167, 139, 250);
    doc.text('Verify this credential:', margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 126, 234);
    const verifyLines = doc.splitTextToSize(verifyUrl, pageW - margin * 2);
    doc.textWithLink(verifyLines.join('\n'), margin, y, { url: verifyUrl });
    y += verifyLines.length * 4 + 4;
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
      const qrSize = 40;
      doc.addImage(qrDataUrl, 'PNG', pageW / 2 - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 4;
    } catch (e) { console.warn('[PDF] QR failed:', e); }

    // Footer
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 285, pageW, 12, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text('Generated by ChainCert — Blockchain-Verified Credential Platform', pageW / 2, 292, { align: 'center' });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const filename = `ChainCert_Portfolio_${(studentName || 'credentials').replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
