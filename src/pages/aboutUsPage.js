// Page to explain the system and blockchain
// landingHomePage.js
import React from 'react';
import '../styles/aboutUsPage.css'; // Import the styles

function aboutUsPage() {
  return (
    <div className="about-container">
      <h2 className="about-title">About ChainCert</h2>
      <p className="about-intro">
        ChainCert is a blockchain-based credential verification system designed to ensure 
        secure, transparent, and tamper-proof management of academic and professional records.
        Built on Hyperledger Fabric, it addresses the challenges of fraud, fragmentation, and 
        delayed verification by providing real-time, verifiable, and immutable credentials.
      </p>

      <div className="about-section">
        <h3>Our Purpose</h3>
        <p>
          Traditional credential verification is often slow, fragmented, and vulnerable to fraud. 
          ChainCert eliminates these issues by creating a trusted platform where institutions can issue 
          credentials, students can securely store them in a digital wallet, and employers or agencies 
          can instantly verify authenticity through QR codes or secure links.
        </p>
      </div>

      <div className="about-section">
        <h3>How It Works</h3>
        <ul>
          <li><strong>Issuers:</strong> Schools and organizations upload credentials via the Admin Dashboard.</li>
          <li><strong>Students:</strong> Credentials are stored in a secure blockchain-linked wallet, with full ownership and control.</li>
          <li><strong>Verifiers:</strong> Employers and agencies use the Verifier Portal to check credentials in real time using blockchain validation.</li>
        </ul>
      </div>

      <div className="about-section">
        <h3>Technology Behind ChainCert</h3>
        <p>
          Powered by Hyperledger Fabric, ChainCert leverages a permissioned blockchain to ensure privacy 
          and compliance with regulations such as the Philippine Data Privacy Act of 2012. Smart contracts 
          enforce credential issuance, updates, and revocations, while CouchDB stores encoded credential 
          files securely off-chain.
        </p>
      </div>

      <div className="about-section">
        <h3>Who Benefits?</h3>
        <ul>
          <li><strong>Students:</strong> Full control and ownership of their academic and professional credentials.</li>
          <li><strong>Institutions:</strong> Reduced administrative burden with tamper-proof, easily managed records.</li>
          <li><strong>Employers & Agencies:</strong> Instant, fraud-free verification of candidate qualifications.</li>
          <li><strong>Regulators:</strong> A scalable, transparent system that improves compliance and trust.</li>
        </ul>
      </div>
    </div>
  );
}

export default aboutUsPage;  // Ensure this export is in place
