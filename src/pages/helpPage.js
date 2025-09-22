// Help & FAQ page
// Admin dashboard for credential management

import React from 'react';
import '../styles/helpPage.css';

function helpPage() {
  return (
    <div className="help-container">
      <h2 className="help-title">Help & FAQ</h2>
      <p className="help-subtitle">
        Here are some common questions about using ChainCert:
      </p>

      <div className="faq-box">
        <h4>1. What is ChainCert?</h4>
        <p>
          ChainCert is a blockchain-based credential verification system built on
          Hyperledger Fabric. It ensures secure, transparent, and tamper-proof
          management of academic and professional credentials.
        </p>
      </div>

      <div className="faq-box">
        <h4>2. How do students access their credentials?</h4>
        <p>
          Students receive their credentials in a secure digital wallet tied to
          their blockchain identity. They can view, download, and share them via
          QR codes or secure links, with full control over who can access their data.
        </p>
      </div>

      <div className="faq-box">
        <h4>3. How do employers verify credentials?</h4>
        <p>
          Employers or verifiers can scan a QR code or click a verification link.
          The system checks the credential’s hash against the blockchain ledger to
          confirm authenticity, issuer, and current status — instantly and securely.
        </p>
      </div>

      <div className="faq-box">
        <h4>4. What if my credential details are incorrect?</h4>
        <p>
          Only authorized institutions can update or revoke credentials via the
          Admin Dashboard. Students must contact their school or certifying body
          for corrections.
        </p>
      </div>

      <div className="faq-box">
        <h4>5. How does ChainCert protect my privacy?</h4>
        <p>
          Only non-sensitive data like hashes, timestamps, and issuer information
          are stored on-chain. Full credential documents are stored off-chain in
          secure repositories, accessible only by the student and authorized verifiers.
        </p>
      </div>

      <div className="faq-box">
        <h4>6. Why blockchain and not a centralized database?</h4>
        <p>
          Traditional centralized systems are prone to fraud, delays, and single
          points of failure. ChainCert’s blockchain ensures decentralized, immutable
          verification, enhancing trust and efficiency across institutions.
        </p>
      </div>
    </div>
  );
}

export default helpPage;  // Ensure this export is in place
