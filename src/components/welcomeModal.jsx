// welcomeModal.jsx
/*
  FILE: welcomeModal.jsx
  LAYMAN (Tropang Ex): Yung maliit na "Welcome" pop-up na lumalabas SA UNANG PAGBISITA lang — para
    sa mga first-timer na hindi pamilyar sa blockchain, sinasabi agad kung sino-sino ang gumagamit
    (Holder / Verifier / Issuer) at paano mag-navigate. Pindutin ang "Got it" at hindi na uulit
    (naka-save sa localStorage). Sagot ito sa pinakamadalas na UAT complaint: "nakakalito mag-navigate."
  TECHNICAL: Self-contained, self-gating first-visit modal. On mount it checks a localStorage flag;
    if unset it shows once, and dismissing sets the flag so it never reappears. No router/props
    needed — mounted once in App.js. Token-styled inline (no new stylesheet); own fixed overlay so
    it does not depend on the design-system Modal's API. lucide-react icons (already a dep).
  OUTLINE:
    MODAL
      - WelcomeModal()   one-time first-visit role/navigation primer
*/

import React, { useEffect, useState } from 'react';
import { GraduationCap, ShieldCheck, Building2, X } from 'lucide-react';

const SEEN_KEY = 'chaincert_seenIntro';

/*
  Function Name: WelcomeModal

  LAYMAN (Tropang Ex):
  Ilagay lang sa App.js; siya na bahala mag-decide kung ipapakita (unang bisita) o hindi.

  TECHNICAL:
  Reads localStorage[SEEN_KEY] on mount; renders null if already seen. Dismiss writes the flag and
  hides. Overlay click and the X both dismiss.

  RETURNS:
  The primer overlay, or null once seen. Never throws (localStorage wrapped in try/catch).
*/
export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem(SEEN_KEY)) setOpen(true); } catch (_) { /* private mode */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (_) { /* ignore */ }
    setOpen(false);
  };

  if (!open) return null;

  const roles = [
    { Icon: Building2, title: 'Issuers', body: 'Institutions create and issue verifiable credentials to holders.' },
    { Icon: GraduationCap, title: 'Holders', body: 'Students & professionals receive credentials in a secure wallet and share them.' },
    { Icon: ShieldCheck, title: 'Verifiers', body: 'Employers verify a credential on the blockchain — no account needed.' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to ChainCert"
      onClick={dismiss}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--surface, #12141a)', border: '1px solid var(--border-strong, rgba(255,255,255,0.16))', borderRadius: 16, maxWidth: 520, width: '100%', padding: 24, boxShadow: 'var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.5))', color: 'var(--text, #e5e7eb)', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Welcome to ChainCert</h2>
          <button type="button" onClick={dismiss} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted, #9aa0aa)', cursor: 'pointer', display: 'inline-flex' }}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p style={{ color: 'var(--text-muted, #9aa0aa)', fontSize: 14, marginTop: 8 }}>
          A blockchain-backed platform for issuing, holding, and verifying credentials. Here's who does what:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '16px 0' }}>
          {roles.map((r) => (
            <div key={r.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent, #8b7cf6)', flexShrink: 0, marginTop: 2 }}><r.Icon size={20} aria-hidden="true" /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted, #9aa0aa)' }}>{r.body}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #9aa0aa)', margin: '0 0 16px' }}>
          Use the top navigation to move between pages — hover any nav item for a hint.
        </p>
        <button
          type="button"
          onClick={dismiss}
          style={{ background: 'var(--accent, #8b7cf6)', color: 'var(--text-on-accent, #fff)', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', width: '100%', fontSize: 14 }}
        >
          Got it — let's go
        </button>
      </div>
    </div>
  );
}
