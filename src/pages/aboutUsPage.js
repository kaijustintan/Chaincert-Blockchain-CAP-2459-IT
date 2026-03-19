// aboutUsPage.js
// CSS-CHANGE: Full redesign with mission, architecture, stakeholders, tech stack - polo
import React from "react";
import "../styles/aboutUsPage.css";

function AboutUsPage() {
  return (
    <div className="about-container">

      {/* ── HERO ── */}
      <section className="about-hero">
        <div className="about-badge">About the Platform</div>
        <h1 className="about-hero-title">
          Built for Trust.<br />
          <span className="about-gradient">Powered by Blockchain.</span>
        </h1>
        <p className="about-hero-desc">
          ChainCert is a blockchain-based credential verification system designed to ensure
          secure, transparent, and tamper-proof management of academic and professional records.
          Built on Hyperledger Fabric, it eliminates fraud, fragmentation, and verification delays.
        </p>
      </section>

      {/* ── MISSION ── */}
      <section className="about-section-wrap">
        <h2 className="about-section-title">Our Mission</h2>
        <div className="about-card about-card-wide">
          <p>
            Traditional credential verification is slow, fragmented, and vulnerable to fraud.
            Paper certificates are easily forged. Centralized databases create single points of failure.
            Cross-border verification can take weeks.
          </p>
          <p>
            ChainCert eliminates these issues by creating a trusted platform where institutions issue
            verifiable credentials, students securely store them in a digital wallet, and employers
            instantly verify authenticity through QR codes or secure links — all anchored to an
            immutable blockchain ledger.
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="about-section-wrap">
        <h2 className="about-section-title">How It Works</h2>
        <p className="about-section-subtitle">Three stakeholders, one unified ecosystem</p>

        <div className="about-roles-grid">
          <div className="about-role-card">
            <h3>Issuers</h3>
            <p>Schools, universities, and certifying organizations register on ChainCert, create credential templates, and issue verifiable digital certificates to recipients through the Issuer Dashboard.</p>
          </div>
          <div className="about-role-card">
            <h3>Holders</h3>
            <p>Students and professionals receive credentials in a secure blockchain-linked wallet. They have full ownership — view, reorder, share via QR code, export as PDF, or send verification links.</p>
          </div>
          <div className="about-role-card">
            <h3>Verifiers</h3>
            <p>Employers and agencies verify credentials instantly through the Verifier Dashboard. Scan a QR code or enter a credential ID — the blockchain confirms authenticity, issuer, and status in seconds.</p>
          </div>
        </div>
      </section>

      {/* ── TECHNOLOGY ── */}
      <section className="about-section-wrap">
        <h2 className="about-section-title">Technology Stack</h2>
        <p className="about-section-subtitle">Enterprise-grade infrastructure for credential management</p>

        <div className="about-tech-grid">
          <div className="about-tech-item">
            <h4>Hyperledger Fabric</h4>
            <p>Permissioned blockchain with multi-organization network (Org1, Org2, DLSU) ensuring privacy, scalability, and regulatory compliance.</p>
          </div>
          <div className="about-tech-item">
            <h4>Smart Contracts</h4>
            <p>Chaincode enforces credential issuance, updates, revocations, and subordinate governance — all auditable on the ledger.</p>
          </div>
          <div className="about-tech-item">
            <h4>CouchDB (Off-Chain)</h4>
            <p>Credential documents, badge images, and user data stored securely off-chain with fine-grained access control per organization.</p>
          </div>
          <div className="about-tech-item">
            <h4>React + Node.js</h4>
            <p>Modern frontend and Express backend powering responsive dashboards for issuers, holders, verifiers, and administrators.</p>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="about-section-wrap">
        <h2 className="about-section-title">Who Benefits?</h2>

        <div className="about-benefits-grid">
          <div className="about-benefit">
            <h4>Students & Professionals</h4>
            <p>Full control and ownership of academic and professional credentials. Share, export, and verify on your terms.</p>
          </div>
          <div className="about-benefit">
            <h4>Institutions</h4>
            <p>Reduced administrative burden with tamper-proof, easily managed digital records. Subordinate issuer governance built in.</p>
          </div>
          <div className="about-benefit">
            <h4>Employers & Agencies</h4>
            <p>Instant, fraud-free verification of candidate qualifications. No phone calls, no waiting — trust the blockchain.</p>
          </div>
          <div className="about-benefit">
            <h4>Regulators</h4>
            <p>A scalable, transparent system that improves compliance, trust, and auditability across the credential ecosystem.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutUsPage;