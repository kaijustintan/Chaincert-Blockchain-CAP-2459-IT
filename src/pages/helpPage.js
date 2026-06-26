// helpPage.js
// CSS-CHANGE: Full redesign with accordion FAQ, quick links, contact card - polo
import React, { useState } from "react";
import "../styles/helpPage.css";

// HELP1/HELP2: FAQs are tagged by audience category; the tabs filter the list.
const CATEGORIES = [
  { key: "holders", label: "🎓 For Holders" },
  { key: "employers", label: "✅ For Employers" },
  { key: "issuers", label: "🏛️ For Issuers" },
  { key: "general", label: "⛓️ General" },
];

function HelpPage() {
  // HELP2: default to the "For Holders" category; FAQs filter to the active tab.
  const [activeCat, setActiveCat] = useState("holders");
  const [openFaq, setOpenFaq] = useState(null); // keyed by question text (stable across filtering)

  const toggleFaq = (key) => {
    setOpenFaq(openFaq === key ? null : key);
  };

  const selectCategory = (key) => {
    setActiveCat(key);
    setOpenFaq(null); // collapse any open answer when switching tabs
  };

  const faqs = [
    {
      cat: "general",
      q: "What is ChainCert?",
      a: "ChainCert is a blockchain-based credential verification system built on Hyperledger Fabric. It enables institutions to issue tamper-proof digital credentials, students to manage them in a secure wallet, and employers to verify them instantly."
    },
    {
      cat: "holders",
      q: "How do holders access their credentials?",
      a: "After an institution issues a credential, it appears automatically in your Holder Dashboard. You can view details, see blockchain history, export as PDF with a QR code, and share via secure verification links."
    },
    {
      cat: "employers",
      q: "How do employers verify credentials?",
      a: "Employers use the Verifier Dashboard to enter a credential ID or scan a QR code. The system checks the credential's data against the blockchain ledger to confirm authenticity, issuer identity, and current status — all in seconds."
    },
    {
      cat: "holders",
      q: "What if my credential details are incorrect?",
      a: "Only the issuing institution can update or revoke credentials through their Issuer Dashboard. Contact your school or certifying body directly to request corrections. All changes are permanently recorded on the blockchain."
    },
    {
      cat: "general",
      q: "How does ChainCert protect my privacy?",
      a: "Only non-sensitive metadata (hashes, timestamps, issuer IDs) are stored on the blockchain. Full credential documents, badge images, and personal data are stored off-chain in CouchDB with per-organization access control."
    },
    {
      cat: "general",
      q: "Why blockchain instead of a regular database?",
      a: "Centralized databases have single points of failure and can be tampered with. ChainCert's permissioned blockchain ensures decentralized validation, immutable records, and transparent audit trails that no single party can alter."
    },
    {
      cat: "holders",
      q: "Can I share my credentials with employers?",
      a: "Yes. You can share individual credentials via a secure verification link, export a PDF with an embedded QR code, or share your public profile page which displays your credential wallet."
    },
    {
      cat: "issuers",
      q: "What types of credentials can be issued?",
      a: "ChainCert supports any type of digital credential: degrees, diplomas, certificates, micro-credentials, professional licenses, awards, and more. Issuers define the type, skills, and metadata for each template."
    },
    {
      cat: "issuers",
      q: "How do issuers get approved?",
      a: "Issuer applications go through document review and approval workflows. Root authorities review subordinate issuers first when applicable, then administrators complete the final approval before credential issuance is enabled."
    },
    {
      cat: "employers",
      q: "What happens when a credential is revoked?",
      a: "A revoked credential remains in the audit trail, but its status changes immediately. Verifiers will see that the credential is no longer valid, and the blockchain history preserves when and why the change happened."
    },
    {
      cat: "holders",
      q: "Can I export my credentials?",
      a: "Yes. Holders can export credentials as PDF documents with verification data and QR support, while still keeping the original blockchain-backed record available for future checks."
    },
  ];

  const visibleFaqs = faqs.filter((faq) => faq.cat === activeCat);

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

      {/* ── CATEGORY TABS (filter FAQs) ── */}
      <section className="help-quick-links">
        {CATEGORIES.map((c) => (
          <div
            key={c.key}
            className={`quick-link${activeCat === c.key ? " active" : ""}`}
            onClick={() => selectCategory(c.key)}
          >
            <span className="ql-text">{c.label}</span>
          </div>
        ))}
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="help-faq-section">
        <h2 className="help-section-title">Frequently Asked Questions</h2>

        <div className="faq-list">
          {visibleFaqs.map((faq, index) => (
            <div
              key={faq.q}
              className={`faq-item ${openFaq === faq.q ? "faq-open" : ""}`}
              onClick={() => toggleFaq(faq.q)}
            >
              <div className="faq-question">
                <span className="faq-num">{String(index + 1).padStart(2, "0")}</span>
                <h4>{faq.q}</h4>
                <span className="faq-toggle">{openFaq === faq.q ? "−" : "+"}</span>
              </div>
              {openFaq === faq.q && (
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