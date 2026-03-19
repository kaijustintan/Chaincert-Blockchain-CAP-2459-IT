// landingHomePage.js
// CSS-CHANGE: Full redesign with hero, features, trust metrics, CTA - polo
import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landingHomePage.css";

function LandingHomePage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">

      {/* ── HERO SECTION ── */}
      <section className="landing-hero">
        <div className="hero-badge">Powered by Hyperledger Fabric</div>
        <h1 className="hero-title">
          The New Standard for<br />
          <span className="hero-gradient">Verifiable Trust</span>
        </h1>
        <p className="hero-desc">
          ChainCert anchors every credential to a tamper-proof, permissioned blockchain.
          Every degree, certificate, or micro-credential becomes a secure, verifiable
          digital asset that employers and institutions can trust instantly.
        </p>
        <div className="hero-buttons">
          <button className="hero-btn hero-btn-primary" onClick={() => navigate("/register")}>
            Get Started
          </button>
          <button className="hero-btn hero-btn-secondary" onClick={() => navigate("/about")}>
            Learn More
          </button>
        </div>

        {/* Trust metrics */}
        <div className="hero-metrics">
          <div className="metric">
            <span className="metric-num">100%</span>
            <span className="metric-label">Tamper-Proof</span>
          </div>
          <div className="metric-divider" />
          <div className="metric">
            <span className="metric-num">&lt;3s</span>
            <span className="metric-label">Verification Time</span>
          </div>
          <div className="metric-divider" />
          <div className="metric">
            <span className="metric-num">24/7</span>
            <span className="metric-label">Always Available</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="landing-features">
        <h2 className="section-title">How ChainCert Works</h2>
        <p className="section-subtitle">Three roles, one trusted ecosystem</p>

        <div className="features-grid">
          <div className="feature-card">
            <h3>Issuers</h3>
            <p>Universities and organizations create credential templates, issue verifiable digital certificates, and manage their credential lifecycle through a dedicated dashboard.</p>
          </div>

          <div className="feature-card">
            <h3>Holders</h3>
            <p>Students and professionals receive credentials in a secure digital wallet. Full ownership and control — share via QR codes, export as PDF, or send verification links.</p>
          </div>

          <div className="feature-card">
            <h3>Verifiers</h3>
            <p>Employers and agencies verify credentials instantly through the blockchain. No phone calls, no waiting — just scan, verify, and trust the result.</p>
          </div>
        </div>
      </section>

      {/* ── WHY BLOCKCHAIN SECTION ── */}
      <section className="landing-why">
        <h2 className="section-title">Why Blockchain?</h2>
        <p className="section-subtitle">Traditional systems fail. ChainCert doesn't.</p>

        <div className="why-grid">
          <div className="why-card">
            <span className="why-num">01</span>
            <h4>Immutable Records</h4>
            <p>Once written to the ledger, credentials cannot be altered or forged. Every change is permanently auditable.</p>
          </div>
          <div className="why-card">
            <span className="why-num">02</span>
            <h4>Decentralized Trust</h4>
            <p>No single point of failure. Multiple organizations validate transactions across the permissioned network.</p>
          </div>
          <div className="why-card">
            <span className="why-num">03</span>
            <h4>Privacy by Design</h4>
            <p>Only hashes and metadata live on-chain. Sensitive documents stay off-chain, accessible only by authorized parties.</p>
          </div>
          <div className="why-card">
            <span className="why-num">04</span>
            <h4>Instant Verification</h4>
            <p>Employers verify in seconds, not days. QR codes and secure links replace manual processes entirely.</p>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="landing-cta">
        <div className="cta-card">
          <h2>Ready to issue your first credential?</h2>
          <p>Join ChainCert and bring trust, speed, and security to your credential ecosystem.</p>
          <div className="cta-buttons">
            <button className="hero-btn hero-btn-primary" onClick={() => navigate("/register")}>
              Create an Account
            </button>
            <button className="hero-btn hero-btn-secondary" onClick={() => navigate("/help")}>
              View FAQ
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}

export default LandingHomePage;