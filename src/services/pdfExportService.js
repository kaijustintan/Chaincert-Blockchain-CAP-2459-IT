// ==========================================================================================================================================================================
//                                                               pdfExportService.js
//  Technical: Handles PDF generation for credential export. Uses jsPDF + qrcode. - polo
//  Tropang Ex: Dito ginagawa yung PDF ng credential. Pure frontend, walang backend call.
// ==========================================================================================================================================================================

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/*
  Function: exportCredentialToPDF
  Technical: Generates a styled PDF for a credential with badge image, details, and QR code.
  Tropang Ex: Kapag pinindot ni student yung Export, dito nag-ge-generate yung PDF file. - polo
*/
export async function exportCredentialToPDF(credential, templateDetails) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

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

  // ── Badge Image ──────────────────────────────────────────────────────────
  const badgeImage = credential.badgeImage || templateDetails?.badgeImage || null;
  if (badgeImage && badgeImage.startsWith('data:image')) {
    try {
      const imgFormat = badgeImage.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(badgeImage, imgFormat, pageW / 2 - 20, y, 40, 40);
      y += 48;
    } catch (e) {
      console.warn('[PDF EXPORT] Badge image failed to load:', e);
      y += 4;
    }
  }

  // ── Credential Name ──────────────────────────────────────────────────────
  doc.setTextColor(196, 181, 253);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(credential.credentialName || 'Credential', pageW / 2, y, { align: 'center' });
  y += 10;

  // ── Divider ──────────────────────────────────────────────────────────────
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Detail rows ──────────────────────────────────────────────────────────
  const details = [
    { label: 'Credential Type', value: credential.credentialType || 'N/A' },
    { label: 'Issued By',       value: credential.issuerName || 'N/A' },
    { label: 'Status',          value: credential.status === 'issued' ? 'Active' : (credential.status || 'N/A') },
    { label: 'Date Issued',     value: credential.savedToUserWalletAt ? new Date(credential.savedToUserWalletAt).toLocaleDateString() : 'N/A' },
    { label: 'Expiry Date',     value: credential.expiryDate ? new Date(credential.expiryDate).toLocaleDateString() : 'No Expiry' },
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
    y += lines.length > 1 ? lines.length * 5 + 2 : 7;
  });

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

  // ── QR Code ──────────────────────────────────────────────────────────────
  const verifyUrl = `http://localhost:3000/verify?credentialId=${credential.blockchainId || ''}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#ffffff', light: '#0c0820' }
    });

    y += 4;
    doc.setDrawColor(139, 92, 246);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(167, 139, 250);
    doc.text('Verify this credential:', pageW / 2, y, { align: 'center' });
    y += 4;

    const qrSize = 36;
    doc.addImage(qrDataUrl, 'PNG', pageW / 2 - qrSize / 2, y, qrSize, qrSize);
    y += qrSize + 4;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(139, 92, 246);
    doc.text(verifyUrl, pageW / 2, y, { align: 'center' });
    y += 6;
  } catch (e) {
    console.warn('[PDF EXPORT] QR generation failed:', e);
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 285, pageW, 12, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Generated by ChainCert — Blockchain-Verified Credential Platform', pageW / 2, 292, { align: 'center' });

  // ── Save ─────────────────────────────────────────────────────────────────
  const filename = `ChainCert_${(credential.credentialName || 'credential').replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

/*
  Function: exportAllCredentialsToPDF
  Technical: Generates a multi-page PDF with all credentials. Cover page + one page per credential.
  Tropang Ex: Kapag pinindot ni student yung "Export All", lalabas isang PDF na may lahat ng creds. - polo (Task 3)
*/
export async function exportAllCredentialsToPDF(credentials, studentName) {
  if (!credentials || credentials.length === 0) return;
  credentials = credentials.filter(c => c.status !== 'revoked' && c.status !== 'expired');
  if (credentials.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;

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

  doc.setTextColor(136, 136, 136);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageW / 2, 134, { align: 'center' });
  doc.text(`Total Active Credentials: ${credentials.length}`, pageW / 2, 142, { align: 'center' }); 

  // Credential list summary on cover
  let coverY = 160;
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

    // Badge image
    const badgeImage = credential.badgeImage || null;
    if (badgeImage && badgeImage.startsWith('data:image')) {
      try {
        const imgFormat = badgeImage.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(badgeImage, imgFormat, pageW / 2 - 18, y, 36, 36);
        y += 44;
      } catch (e) {
        y += 4;
      }
    }

    // Credential name
    doc.setTextColor(196, 181, 253);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(credential.credentialName || 'Credential', pageW / 2, y, { align: 'center' });
    y += 10;

    // Divider
    doc.setDrawColor(139, 92, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // Detail rows
    const details = [
      { label: 'Credential Type', value: credential.credentialType || 'N/A' },
      { label: 'Issued By',       value: credential.issuerName || 'N/A' },
      { label: 'Status',          value: credential.status === 'issued' ? 'Active' : (credential.status || 'N/A') },
      { label: 'Date Issued',     value: credential.savedToUserWalletAt ? new Date(credential.savedToUserWalletAt).toLocaleDateString() : 'N/A' },
      { label: 'Expiry Date',     value: credential.expiryDate ? new Date(credential.expiryDate).toLocaleDateString() : 'No Expiry' },
      { label: 'Blockchain ID',   value: credential.blockchainId || 'N/A' },
    ];

    details.forEach(({ label, value }) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(167, 139, 250);
      doc.text(label + ':', margin, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      const lines = doc.splitTextToSize(value, pageW - margin - 60);
      doc.text(lines, margin + 42, y);
      y += lines.length > 1 ? lines.length * 5 + 2 : 7;
    });

    // Skills
    const skills = credential.skills || [];
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
      const skillLines = doc.splitTextToSize(skills.join('  •  '), pageW - margin * 2);
      doc.text(skillLines, margin, y);
      y += skillLines.length * 5 + 4;
    }

    // QR Code
    const verifyUrl = `http://localhost:3000/verify?credentialId=${credential.blockchainId || ''}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 200, margin: 1,
        color: { dark: '#ffffff', light: '#0c0820' }
      });
      y += 4;
      doc.setDrawColor(139, 92, 246);
      doc.line(margin, y, pageW - margin, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(167, 139, 250);
      doc.text('Verify this credential:', pageW / 2, y, { align: 'center' });
      y += 4;
      const qrSize = 32;
      doc.addImage(qrDataUrl, 'PNG', pageW / 2 - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 4;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(139, 92, 246);
      doc.text(verifyUrl, pageW / 2, y, { align: 'center' });
    } catch (e) {
      console.warn('[PDF EXPORT ALL] QR failed for credential', i, e);
    }

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