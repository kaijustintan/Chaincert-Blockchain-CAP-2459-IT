// landingHomePage.js
// CSS-CHANGE: Full redesign with hero, features, trust metrics, CTA - polo
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landingHomePage.css";
import landingVideo from "../assets/landinghomepage.webm";
import { GraduationCap, ShieldCheck, Building2, ArrowRight } from "lucide-react";

function LandingHomePage() {
  const navigate = useNavigate();
  const [videoReady, setVideoReady] = useState(true);
  const heroClassName = useMemo(() => `landing-hero ${videoReady ? "has-video" : "video-fallback"}`, [videoReady]);

  return (
    <div className="landing-container">

      {/* ── HERO SECTION ── */}
      <section className={heroClassName}>
        <div className="hero-media-layer" aria-hidden="true">
          {videoReady && (
            <video
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              onError={() => setVideoReady(false)}
            >
              <source src={landingVideo} type="video/webm" />
            </video>
          )}
          <div className="hero-overlay" />
          <div className="hero-glow hero-glow-left" />
          <div className="hero-glow hero-glow-right" />
        </div>
        <div className="hero-content">
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

        {/* H: role quick-select — icon + title + benefit + "Get started" affordance; hover lifts (CSS) */}
        <div className="hero-roles">
          {[
            { Icon: GraduationCap, title: "I am a Student", sub: "Receive & share your credentials", to: "/register" },
            { Icon: ShieldCheck, title: "I am an Employer", sub: "Verify a credential — no account needed", to: "/verifier/dashboard", badge: "No sign-up" },
            { Icon: Building2, title: "I am an Institution", sub: "Issue credentials to your holders", to: "/register" },
          ].map((r) => (
            <button key={r.title} type="button" className="hero-role-card" onClick={() => navigate(r.to)}>
              {r.badge && <span className="hero-role-badge">{r.badge}</span>}
              <span className="hero-role-icon"><r.Icon size={26} aria-hidden="true" /></span>
              <span className="hero-role-title">{r.title}</span>
              <span className="hero-role-sub">{r.sub}</span>
              <span className="hero-role-cta">Get started <ArrowRight size={16} aria-hidden="true" /></span>
            </button>
          ))}
        </div>

        {/* Trust metrics */}
        <div className="hero-metrics">
          <div className="metric">
            <span className="metric-num">100%</span>
            <span className="metric-label">Tamper-Proof</span>
          </div>
          <div className="metric-divider" />
          <div className="metric">
            <span className="metric-num">Instant</span>
            <span className="metric-label">On-chain Verification</span>
          </div>
          <div className="metric-divider" />
          <div className="metric">
            <span className="metric-num">24/7</span>
            <span className="metric-label">Always Available</span>
          </div>
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
            <p>Universities and organizations create credentials, issue verifiable digital certificates, and manage their credential lifecycle through a dedicated dashboard.</p>
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

      {/* ── TRUST SIGNALS SECTION ── */}
      <section className="landing-trust">
        <h2 className="section-title">Trusted by Modern Credential Ecosystems</h2>
        <p className="section-subtitle">Built for institutions that need security, interoperability, and auditability.</p>
        <div className="trust-grid">
          <div className="trust-card">Enterprise-Grade Security</div>
          <div className="trust-card">W3C Verifiable Credentials Ready</div>
          <div className="trust-card">Cross-Border Ready</div>
          <div className="trust-card">Designed for Higher Education</div>
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