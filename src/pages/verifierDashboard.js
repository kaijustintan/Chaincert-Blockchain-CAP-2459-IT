// verifierDashboard.js
/*
  FILE: verifierDashboard.js
  LAYMAN (Tropang Ex): Ito yung tool ng isang verifier (hal. HR, employer). Magpe-paste sila ng
  credential ID (o galing sa QR/link), kukumpirmahin muna ang sariling email gamit ang 6-digit code
  (OTP), tapos makikita nila ang malinaw na verdict — VALID / REVOKED / EXPIRED / NOT FOUND.

  TECHNICAL: Role-agnostic public-facing React page (single-column). V1 identity: the verifier's EMAIL
  is OTP-proven — a 2h 'verifier_email_proof' JWT (sessionStorage, once per window) is required before a
  verification is LOGGED; the verify-READ stays public. Flow: enter name/email → request OTP
  (POST /api/credentials/verify/request-otp) → confirm (/confirm-otp) → verify a credential id
  (GET .../:id/verify) → on success the event is logged with the email FROM the token (not spoofable).
  Not-found (404) attempts are still logged as status:'not_found' so forgery shows in analytics. Result
  renders as a tinted verdict banner (VERIFY1) with a single-word verdict + one-line explanation.

  OUTLINE:
    IDENTITY + OTP GATE     name/email form → send code → enter code → proven-email token (sessionStorage)
    VERIFY INPUT            credential-id field (hero); also accepts ?credentialId= from a QR/link
    RESULT                  verdict banner (valid/revoked/expired/not_found) + explanation + NotesCard legend
*/
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import "../styles/verifierDashboard.css";
import apiService from "../services/apiService";
import { Card, Button, Field, Input, StatusPill } from "../components/ui";
import NotesCard from "../components/ui/NotesCard";
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Search } from "lucide-react";

const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


export default function VerifierDashboard() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);

  // verification logs section removed

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // verifier identity + on-chain log status
  const [verifierName, setVerifierName] = useState("");
  const [verifierEmail, setVerifierEmail] = useState("");

  // log state removed

  // NEW: gate – kailangan muna ma-fill up verifier form
  const [hasVerifierInfo, setHasVerifierInfo] = useState(false);
  const [verifierFormError, setVerifierFormError] = useState("");

  // V1: proven-email token + OTP gate state (verifier must confirm email ownership once
  // per session/window before any verification is LOGGED with their email).
  const [verifierToken, setVerifierToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpInfo, setOtpInfo] = useState("");

  // On mount: restore a still-valid proven-email token from this session (once-per-window).
  // Otherwise just prefill the name/email fields; OTP is always required to enter the dashboard.
  useEffect(() => {
    const t = sessionStorage.getItem("verifierToken");
    const te = sessionStorage.getItem("verifierTokenEmail");
    const tx = Number(sessionStorage.getItem("verifierTokenExp") || 0);
    if (t && te && Date.now() < tx) {
      setVerifierToken(t);
      setVerifierEmail(te);
      setVerifierName(localStorage.getItem("verifierName") || "");
      setHasVerifierInfo(true);
      return;
    }
    const savedName = localStorage.getItem("verifierName") || "";
    const savedEmail = localStorage.getItem("verifierEmail") || "";
    if (savedName) setVerifierName(savedName);
    if (savedEmail) setVerifierEmail(savedEmail);
  }, []);

  useEffect(() => {
    const urlCredentialId = searchParams.get('credentialId');
    if (urlCredentialId && hasVerifierInfo && !query) {
      setQuery(urlCredentialId);
    }
  }, [searchParams, hasVerifierInfo, query]);

  useEffect(() => {
    const urlCredentialId = searchParams.get('credentialId');
    if (urlCredentialId && hasVerifierInfo && query === urlCredentialId && !result && !loading) {
      handleVerify();
    }
  }, [query, hasVerifierInfo]);

  // fetchVerificationLogs and its useEffect removed

  // saveVerificationLogOnChain removed

  // Handle verification via credential ID
  const handleVerify = async () => {
    if (!query.trim()) {
      setError("Please enter a credential ID or code");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Call API to verify credential (CouchDB + optional blockchain)
      const response = await apiService.Verify_Credential(query);

      if (response.verified && response.success) {
        setResult(response);
        try {
          await apiService.logVerificationOnChain(
            response.credentialID || query,
            verifierName,
            verifierEmail,
            JSON.stringify({
              isValid: response.isValid,
              reason: response.reason,
              status: response.status,
              source: response.sources?.primarySource || 'unknown'
            }),
            verifierToken
          );
        } catch (logErr) {
          if (logErr.response?.status === 401) {
            resetVerifierEmail();
            setError("Your email session expired. Please verify your email again to record verifications.");
          }
          console.warn('[VERIFY] On-chain log write failed (non-fatal):', logErr.message);
        }
      } else {
        const msg = response.reason || "Credential not found or invalid.";
        setResult({ error: msg });
      }
    } catch (err) {
      console.error("[VERIFY ERROR]", err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.reason ||
        err.message ||
        "Verification failed";
      // Log not-found attempts on-chain so fraud/forgery attempts appear in analytics (Report 6)
      if (err.response?.status === 404) {
        try {
          await apiService.logVerificationOnChain(
            query,
            verifierName,
            verifierEmail,
            JSON.stringify({ valid: false, reason: 'Credential not found', status: 'not_found', source: 'not_found' }),
            verifierToken
          );
        } catch (logErr) {
          if (logErr.response?.status === 401) {
            resetVerifierEmail();
            setError("Your email session expired. Please verify your email again to record verifications.");
          }
          console.warn('[VERIFY] Not-found log failed (non-fatal):', logErr.message);
        }
      }
      setResult({ error: errorMsg });
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press sa credential input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  // V1 step 1: validate name+email, send the OTP to the email.
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const trimmedName = verifierName.trim();
    const trimmedEmail = verifierEmail.trim();
    if (!trimmedName || !trimmedEmail) {
      setVerifierFormError("Please provide both your name and email to continue.");
      return;
    }
    if (!VALID_EMAIL_REGEX.test(trimmedEmail)) {
      setVerifierFormError("Please enter a valid email address (e.g., name@example.com).");
      return;
    }
    setVerifierFormError(""); setOtpError(""); setOtpInfo(""); setOtpLoading(true);
    try {
      await apiService.requestVerifierOtp(trimmedEmail);
      localStorage.setItem("verifierName", trimmedName);
      localStorage.setItem("verifierEmail", trimmedEmail);
      setOtpSent(true);
      setOtpInfo(`Enter the 6-digit code we sent to ${trimmedEmail}.`);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Could not send the code. Please try again.");
    } finally { setOtpLoading(false); }
  };

  // V1 step 2: confirm OTP → receive the proven-email token → enter the dashboard.
  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    const trimmedEmail = verifierEmail.trim();
    if (!otpCode.trim()) { setOtpError("Enter the 6-digit code from your email."); return; }
    setOtpError(""); setOtpLoading(true);
    try {
      const res = await apiService.confirmVerifierOtp(trimmedEmail, otpCode.trim());
      const expMs = Date.now() + 2 * 60 * 60 * 1000; // mirror the 2h token window (UX only; server enforces the real expiry)
      setVerifierToken(res.token);
      sessionStorage.setItem("verifierToken", res.token);
      sessionStorage.setItem("verifierTokenEmail", trimmedEmail);
      sessionStorage.setItem("verifierTokenExp", String(expMs));
      setHasVerifierInfo(true);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid or expired code. Please try again.");
    } finally { setOtpLoading(false); }
  };

  // V1: clear the proven-email session (the "Change" link, or when the token expires).
  const resetVerifierEmail = () => {
    setHasVerifierInfo(false); setOtpSent(false); setOtpCode("");
    setVerifierToken(""); setOtpError(""); setOtpInfo("");
    sessionStorage.removeItem("verifierToken");
    sessionStorage.removeItem("verifierTokenEmail");
    sessionStorage.removeItem("verifierTokenExp");
  };

  // Gate: verifier must provide name+email AND prove email ownership via OTP (V1) before
  // entering the dashboard. Step 1 = details + send code; step 2 = enter code.
  if (!hasVerifierInfo) {
    return (
      <div className="verifier-page verifier-gate">
        <Card className="verifier-gate-card">
          <div className="verifier-head-icon"><ShieldCheck size={26} aria-hidden="true" /></div>
          <h1 className="verifier-gate-title">Verifier Information</h1>
          {!otpSent && (
            <p className="verifier-gate-sub">
              Enter your details — we'll email you a code to confirm your address before you verify.
            </p>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp}>
              <Field label="Your Name" htmlFor="vName">
                <Input id="vName" type="text" placeholder="e.g. Kai Verifier" value={verifierName} onChange={(e) => setVerifierName(e.target.value)} />
              </Field>
              <Field label="Your Email" htmlFor="vEmail">
                <Input id="vEmail" type="email" placeholder="e.g. verifier@example.com" value={verifierEmail} onChange={(e) => setVerifierEmail(e.target.value)} />
              </Field>

              {verifierFormError && (
                <div className="verifier-banner is-error"><XCircle size={16} aria-hidden="true" /><span>{verifierFormError}</span></div>
              )}
              {otpError && (
                <div className="verifier-banner is-error"><XCircle size={16} aria-hidden="true" /><span>{otpError}</span></div>
              )}

              <Button as="button" type="submit" variant="primary" loading={otpLoading} disabled={otpLoading} style={{ width: '100%', marginTop: 8 }}>
                {otpLoading ? "Sending code…" : "Send verification code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmOtp}>
              {otpInfo && (
                <div className="verifier-banner"><CheckCircle2 size={16} aria-hidden="true" /><span>{otpInfo}</span></div>
              )}
              <Field label="6-digit code" htmlFor="vOtp">
                <Input id="vOtp" type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
              </Field>

              {otpError && (
                <div className="verifier-banner is-error"><XCircle size={16} aria-hidden="true" /><span>{otpError}</span></div>
              )}

              <Button as="button" type="submit" variant="primary" loading={otpLoading} disabled={otpLoading} style={{ width: '100%', marginTop: 8 }}>
                {otpLoading ? "Verifying…" : "Verify & continue"}
              </Button>
              <button type="button" className="verifier-change" style={{ marginTop: 10 }} onClick={() => { setOtpSent(false); setOtpCode(""); setOtpError(""); setOtpInfo(""); }}>
                Use a different email
              </button>
            </form>
          )}
        </Card>
      </div>
    );
  }

  // Normal dashboard view once verifier info is set
  return (
    <div className="verifier-page">
      <div className="verifier-head">
        <div className="verifier-head-icon"><ShieldCheck size={26} aria-hidden="true" /></div>
        <h1>Verify a Credential</h1>
        <p>Enter a credential ID or code to check its authenticity on the blockchain.</p>
      </div>

      {/* Who is verifying */}
      <div className="verifier-summary">
        <span>Verifying as <strong>{verifierName}</strong> · {verifierEmail} <span style={{ color: "var(--ok, var(--ok))", fontSize: 12 }}>✓ email verified</span></span>
        <button className="verifier-change" onClick={resetVerifierEmail}>Change</button>
      </div>

      {/* Hero search */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
      <div className="verifier-searchbar">
        <Search size={18} aria-hidden="true" />
        <input
          type="text"
          placeholder="Enter credential ID or code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <Button onClick={handleVerify} loading={loading} disabled={loading}>Verify</Button>
      </div>
        </div>
        <NotesCard
          legendLabel="What a result means"
          legend={[
            { label: "Valid", color: "var(--ok)", meaning: "authentic and active" },
            { label: "Revoked", color: "var(--danger)", meaning: "cancelled by the issuer" },
            { label: "Expired", color: "var(--warn)", meaning: "past its expiry date" },
            { label: "Not Found", color: "var(--accent-strong)", meaning: "no such credential — likely a fake / forged ID" },
          ]}
        />
      </div>

      {/* Inline error */}
      {error && !result && (
        <div className="verifier-banner is-error"><XCircle size={16} aria-hidden="true" /><span>{error}</span></div>
      )}

      {/* Could-not-verify verdict */}
      {result && result.error && (
        <div className="verifier-verdict is-invalid">
          <div className="verifier-verdict-head">
            <XCircle size={28} aria-hidden="true" />
            <div>
              <h2>Could not verify</h2>
              <p>{result.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result verdict */}
      {result && !result.error && (
        <div className={`verifier-verdict ${result.isValid ? "is-valid" : "is-invalid"}`}>
          <div className="verifier-verdict-head">
            {result.isValid ? <CheckCircle2 size={28} aria-hidden="true" /> : <AlertTriangle size={28} aria-hidden="true" />}
            <div>
              <h2>
                {result.isValid
                  ? "VALID"
                  : String(result.status).toLowerCase() === "revoked"
                  ? "REVOKED"
                  : String(result.status).toLowerCase() === "expired"
                  ? "EXPIRED"
                  : String(result.status).toLowerCase() === "not_found"
                  ? "NOT FOUND"
                  : "INVALID"}
              </h2>
              <p>
                {result.isValid
                  ? "This credential is authentic and currently valid."
                  : String(result.status).toLowerCase() === "revoked"
                  ? "This credential was revoked by the issuer."
                  : String(result.status).toLowerCase() === "expired"
                  ? "This credential has passed its expiry date."
                  : String(result.status).toLowerCase() === "not_found"
                  ? "No matching credential exists on the blockchain."
                  : "This credential could not be verified."}
              </p>
            </div>
          </div>

          {result.credentialName && <h3 className="verifier-cred-name">{result.credentialName}</h3>}

          <div className="verifier-result-body">
            {result.badgeImage && (
              <div className="verifier-badge">
                <img src={result.badgeImage} alt="" />
              </div>
            )}
            <div className="verifier-detail-list">

              <div className="verifier-detail-row">
                <span className="verifier-detail-label">Issued to</span>
                <span className="verifier-detail-value">{result.holderName || 'N/A'}</span>
              </div>
              <div className="verifier-detail-row">
                <span className="verifier-detail-label">Issued by</span>
                <span className="verifier-detail-value">{result.issuerName || 'N/A'}</span>
              </div>
              {result.credentialType && (
                <div className="verifier-detail-row">
                  <span className="verifier-detail-label">Type</span>
                  <span className="verifier-detail-value">{result.credentialType}</span>
                </div>
              )}
              <div className="verifier-detail-row">
                <span className="verifier-detail-label">Status</span>
                <span className="verifier-detail-value"><StatusPill status={result.status} /></span>
              </div>
              {result.expiryDate && (
                <div className="verifier-detail-row">
                  <span className="verifier-detail-label">Expires</span>
                  <span className="verifier-detail-value">{new Date(result.expiryDate).toLocaleDateString()}</span>
                </div>
              )}
              {result.description && (
                <div className="verifier-detail-block">
                  <span className="verifier-detail-label">Description</span>
                  <p className="verifier-detail-desc">{result.description}</p>
                </div>
              )}
              {Array.isArray(result.skills) && result.skills.length > 0 && (
                <div className="verifier-detail-block">
                  <span className="verifier-detail-label">Skills</span>
                  <div className="verifier-skills">
                    {result.skills.map((skill, i) => <span key={i} className="verifier-skill-chip">{skill}</span>)}
                  </div>
                </div>
              )}

              <div className="verifier-meta">
                <p>Credential ID: <span className="verifier-mono">{result.credentialID || 'N/A'}</span></p>
                <p>Verified via {result.sources?.primarySource || 'unknown'} · {result.verifiedAt ? new Date(result.verifiedAt).toLocaleString() : 'Unknown time'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
