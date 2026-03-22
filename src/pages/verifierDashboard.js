// Verifier dashboard for credential verification
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import "../styles/verifierDashboard.css";
import apiService from "../services/apiService";

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

    setVerifierFormError("");
    setHasVerifierInfo(true);

    // Optional: persist for next visits
    localStorage.setItem("verifierName", trimmedName);
    localStorage.setItem("verifierEmail", trimmedEmail);
  };

  // If walang verifier info pa, show prereq form card
  if (!hasVerifierInfo) {
    return (
      <div className="verifier-container">
        <div className="verifier-form-card">
          <h1>Verifier Information</h1>
          <p>Please enter your details before accessing the verification dashboard.</p>

          <form onSubmit={handleVerifierFormSubmit} className="verifier-form">
            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="e.g. Kai Verifier"
                value={verifierName}
                onChange={(e) => setVerifierName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Your Email</label>
              <input
                type="email"
                placeholder="e.g. verifier@example.com"
                value={verifierEmail}
                onChange={(e) => setVerifierEmail(e.target.value)}
              />
            </div>

            {verifierFormError && (
              <div className="error-banner">
                <p>❌ {verifierFormError}</p>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="primary">
                Continue to Verifier Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Normal dashboard view once verifier info is set
  const normalizedStatus = String(result?.status || '').toLowerCase();
  const renderedStatusLabel = normalizedStatus === 'issued' || normalizedStatus === 'active'
    ? 'Active'
    : normalizedStatus === 'revoked'
      ? 'Revoked'
      : normalizedStatus === 'expired'
        ? 'Expired'
        : normalizedStatus
          ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
          : 'Unknown';

  return (
    <div className="verifier-container">
      <h1>Verifier Dashboard</h1>
      <p>Enter a credential ID or code to verify authenticity.</p>

      {/* Small reminder of who is logged as verifier */}
      <div className="verifier-summary">
        <span>
          Verifier: <strong>{verifierName}</strong> ({verifierEmail})
        </span>
        <button
          className="link-button"
          onClick={() => {
            // allow changing verifier info
            setHasVerifierInfo(false);
          }}
        >
          Change
        </button>
      </div>

      {/* Search box */}
      <div className="verify-controls">
        <input
          type="text"
          placeholder="Enter credential ID or code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button onClick={handleVerify} disabled={loading}>
          {loading ? "Verifying..." : "Verify"}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-banner">
          <p>❌ {error}</p>
        </div>
      )}

      {/*log status banners removed*/}

      {/* Verification result */}
      {result && result.error && (
        <div className="verify-result error">
          <p className="error">{result.error}</p>
        </div>
      )}

      {result && !result.error && (
        <div className={`verify-result ${result.isValid ? "success" : "error"}`}>
          <h3 style={{ textAlign: 'left' }}>{result.isValid ? "✅ Credential Valid" : "⚠️ Credential Invalid"}</h3>
          {result.reason && <p style={{ textAlign: 'left', marginBottom: '16px' }}><strong>Reason:</strong> {result.reason}</p>}

          <div className="verify-detail-card" style={{ flexDirection: 'row', alignItems: 'flex-start', textAlign: 'left' }}>
            {result.badgeImage && (
              <div className="verify-badge-image">
                <img src={result.badgeImage} alt="Badge" style={{ width: '150px', height: '150px', objectFit: 'contain', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', padding: '8px' }} />
              </div>
            )}
            <div className="verify-detail-rows" style={{ textAlign: 'left' }}>
              {result.credentialName && <p style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>{result.credentialName}</p>}
              <p><strong>Issued To:</strong> {result.holderName || 'N/A'}</p>
              <p><strong>Issued By:</strong> {result.issuerName || 'N/A'}</p>
              <p><strong>Status:</strong>{' '}<span style={{ color: normalizedStatus === 'issued' || normalizedStatus === 'active' ? '#22c55e' : normalizedStatus === 'revoked' ? '#ef4444' : normalizedStatus === 'expired' ? '#f59e0b' : 'inherit', fontWeight: 600 }}>{renderedStatusLabel}</span></p>
              {result.expiryDate && <p><strong>Expires:</strong> {new Date(result.expiryDate).toLocaleDateString()}</p>}

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: '11px', opacity: 0.5, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  Credential ID: {result.credentialID || 'N/A'}
                </p>
                <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                  Verified via: {result.sources?.primarySource || 'unknown'} • {result.verifiedAt ? new Date(result.verifiedAt).toLocaleString() : 'Unknown time'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*verification logs section removed*/}
    </div>
  );
}
