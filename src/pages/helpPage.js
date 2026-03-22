// helpPage.js
// CSS-CHANGE: Full redesign with accordion FAQ, quick links, contact card - polo
import React, { useState } from "react";
import "../styles/helpPage.css";

function HelpPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "What is ChainCert?",
      a: "ChainCert is a blockchain-based credential verification system built on Hyperledger Fabric. It enables institutions to issue tamper-proof digital credentials, students to manage them in a secure wallet, and employers to verify them instantly."
    },
    {
      q: "How do students access their credentials?",
      a: "After an institution issues a credential, it appears automatically in your Student Dashboard. You can view details, see blockchain history, export as PDF with a QR code, and share via secure verification links."
    },
    {
      q: "How do employers verify credentials?",
      a: "Employers use the Verifier Dashboard to enter a credential ID or scan a QR code. The system checks the credential's data against the blockchain ledger to confirm authenticity, issuer identity, and current status — all in seconds."
    },
    {
      q: "What if my credential details are incorrect?",
      a: "Only the issuing institution can update or revoke credentials through their Issuer Dashboard. Contact your school or certifying body directly to request corrections. All changes are permanently recorded on the blockchain."
    },
    {
      q: "How does ChainCert protect my privacy?",
      a: "Only non-sensitive metadata (hashes, timestamps, issuer IDs) are stored on the blockchain. Full credential documents, badge images, and personal data are stored off-chain in CouchDB with per-organization access control."
    },
    {
      q: "Why blockchain instead of a regular database?",
      a: "Centralized databases have single points of failure and can be tampered with. ChainCert's permissioned blockchain ensures decentralized validation, immutable records, and transparent audit trails that no single party can alter."
    },
    {
      q: "Can I share my credentials with employers?",
      a: "Yes. You can share individual credentials via a secure verification link, export a PDF with an embedded QR code, or share your public profile page which displays your credential wallet."
    },
    {
      q: "What types of credentials can be issued?",
      a: "ChainCert supports any type of digital credential: degrees, diplomas, certificates, micro-credentials, professional licenses, awards, and more. Issuers define the type, skills, and metadata for each template."
    },
    {
      q: "How do issuers get approved?",
      a: "Issuer applications go through document review and approval workflows. Root authorities review subordinate issuers first when applicable, then administrators complete the final approval before credential issuance is enabled."
    },
    {
      q: "What happens when a credential is revoked?",
      a: "A revoked credential remains in the audit trail, but its status changes immediately. Verifiers will see that the credential is no longer valid, and the blockchain history preserves when and why the change happened."
    },
    {
      q: "Can I export my credentials?",
      a: "Yes. Holders can export credentials as PDF documents with verification data and QR support, while still keeping the original blockchain-backed record available for future checks."
    },
  ];

  return (
    <div className="help-container">

      {/* ── HERO ── */}
      <section className="help-hero">
        <div className="help-badge">Support Center</div>
        <h1 className="help-hero-title">How can we help?</h1>
        <p className="help-hero-desc">
          Find answers to common questions about using ChainCert, managing credentials,
          and navigating the platform.
        </p>
      </section>

      {/* ── QUICK LINKS ── */}
      <section className="help-quick-links">
        <div className="quick-link" onClick={() => setOpenFaq(0)}>
          <span className="ql-text">🎓 For Students</span>
        </div>
        <div className="quick-link" onClick={() => setOpenFaq(2)}>
          <span className="ql-text">✅ For Employers</span>
        </div>
        <div className="quick-link" onClick={() => setOpenFaq(5)}>
          <span className="ql-text">⛓️ Why Blockchain?</span>
        </div>
        <div className="quick-link" onClick={() => setOpenFaq(4)}>
          <span className="ql-text">🔒 Privacy & Security</span>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="help-faq-section">
        <h2 className="help-section-title">Frequently Asked Questions</h2>

        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${openFaq === index ? "faq-open" : ""}`}
              onClick={() => toggleFaq(index)}
            >
              <div className="faq-question">
                <span className="faq-num">{String(index + 1).padStart(2, "0")}</span>
                <h4>{faq.q}</h4>
                <span className="faq-toggle">{openFaq === index ? "−" : "+"}</span>
              </div>
              {openFaq === index && (
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT CARD ── */}
      <section className="help-contact">
        <div className="contact-card">
          <h3>Still need help?</h3>
          <p>Can't find what you're looking for? Reach out to our support team and we'll get back to you.</p>
          <div className="contact-info-row">
            <div className="contact-item">
              <span>info@chaincert.com</span>
            </div>
            <div className="contact-item">
              <span>+63 912 345 6789</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HelpPage;