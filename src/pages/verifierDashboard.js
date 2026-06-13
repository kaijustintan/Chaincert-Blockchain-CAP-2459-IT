// Verifier dashboard for credential verification
/*
  UI/UX REDESIGN (refined dark, Phase 2b):
  - Focused single-column verification tool. The verify input is the hero; the result
    is a strong, formal verdict (colored banner + lucide icon + bold label) — not an emoji.
  - Adopts shared primitives (Card, Button, Field, Input, StatusPill).
  - All verification + on-chain logging logic is unchanged.
*/
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import "../styles/verifierDashboard.css";
import apiService from "../services/apiService";
import { Card, Button, Field, Input, StatusPill } from "../components/ui";
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

  // Optional: prefill saved verifier info from localStorage, but always require confirmation first
  useEffect(() => {
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
            })
          );
          console.log('[VERIFY] On-chain log written successfully');
        } catch (logErr) {
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
            JSON.stringify({ valid: false, reason: 'Credential not found', status: 'not_found', source: 'not_found' })
          );
          console.log('[VERIFY] Not-found attempt logged on-chain');
        } catch (logErr) {
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

  // NEW: submit handler for verifier info form
  const handleVerifierFormSubmit = (e) => {
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

    setVerifierFormError("");
    setHasVerifierInfo(true);

    // Optional: persist for next visits
    localStorage.setItem("verifierName", trimmedName);
    localStorage.setItem("verifierEmail", trimmedEmail);
  };

  // If walang verifier info pa, show prereq form card
  if (!hasVerifierInfo) {
    return (
      <div className="verifier-page verifier-gate">
        <Card className="verifier-gate-card">
          <div className="verifier-head-icon"><ShieldCheck size={26} aria-hidden="true" /></div>
          <h1 className="verifier-gate-title">Verifier Information</h1>
          <p className="verifier-gate-sub">Enter your details before accessing the verification dashboard.</p>

          <form onSubmit={handleVerifierFormSubmit}>
            <Field label="Your Name" htmlFor="vName">
              <Input id="vName" type="text" placeholder="e.g. Kai Verifier" value={verifierName} onChange={(e) => setVerifierName(e.target.value)} />
            </Field>
            <Field label="Your Email" htmlFor="vEmail">
              <Input id="vEmail" type="email" placeholder="e.g. verifier@example.com" value={verifierEmail} onChange={(e) => setVerifierEmail(e.target.value)} />
            </Field>

            {verifierFormError && (
              <div className="verifier-banner is-error"><XCircle size={16} aria-hidden="true" /><span>{verifierFormError}</span></div>
            )}

            <Button as="button" type="submit" variant="primary" style={{ width: '100%', marginTop: 8 }}>
              Continue to dashboard
            </Button>
          </form>
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
        <span>Verifying as <strong>{verifierName}</strong> · {verifierEmail}</span>
        <button className="verifier-change" onClick={() => setHasVerifierInfo(false)}>Change</button>
      </div>

      {/* Hero search */}
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
              <h2>{result.isValid ? "Credential Valid" : "Credential Invalid"}</h2>
              {result.reason && <p>{result.reason}</p>}
            </div>
          </div>

          <div className="verifier-result-body">
            {result.badgeImage && (
              <div className="verifier-badge">
                <img src={result.badgeImage} alt="" />
              </div>
            )}
            <div className="verifier-detail-list">
              {result.credentialName && <h3 className="verifier-cred-name">{result.credentialName}</h3>}

              <div className="verifier-detail-row">
                <span className="verifier-detail-label">Issued to</span>
                <span className="verifier-detail-value">{result.holderName || 'N/A'}</span>
              </div>
              <div className="verifier-detail-row">
                <span className="verifier-detail-label">Issued by</span>
                <span className="verifier-detail-value">{result.issuerName || 'N/A'}</span>
              </div>
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
