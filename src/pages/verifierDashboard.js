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

  // Optional: load saved verifier info from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem("verifierName") || "";
    const savedEmail = localStorage.getItem("verifierEmail") || "";
    if (savedName || savedEmail) {
      setVerifierName(savedName);
      setVerifierEmail(savedEmail);
      setHasVerifierInfo(true);
    }
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
          <h3>{result.isValid ? "✅ Credential Valid" : "⚠️ Credential Invalid"}</h3>
          {result.reason && <p><strong>Reason:</strong> {result.reason}</p>}
          <p><strong>Credential ID:</strong> {result.credentialID || "N/A"}</p>

          <div className="verify-detail-card">
            {result.badgeImage && (
              <div className="verify-badge-image">
                <img src={result.badgeImage} alt="Badge" style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain', borderRadius: '12px' }} />
              </div>
            )}
            <div className="verify-detail-rows">
              {result.credentialName && <p><strong>Credential:</strong> {result.credentialName}</p>}
              {result.credentialType && <p><strong>Type:</strong> {result.credentialType}</p>}
              <p><strong>Issued To:</strong> {result.holderName || result.holderID || "N/A"}</p>
              <p><strong>Holder ID:</strong> {result.holderID || "N/A"}</p>
              <p><strong>Issued By:</strong> {result.issuerName || "N/A"}</p>
              <p><strong>Status:</strong> {result.status === 'issued' ? 'Active' : (result.status || "unknown")}</p>
              {result.expiryDate && <p><strong>Expires:</strong> {new Date(result.expiryDate).toLocaleDateString()}</p>}
              {result.skills && result.skills.length > 0 && (
                <div className="verify-skills-row">
                  <strong>Skills:</strong>
                  <div className="verify-skill-pills">
                    {result.skills.map((skill) => (
                      <span key={skill} className="verify-skill-pill">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.description && <p><strong>Description:</strong> {result.description}</p>}
              <p className="verify-source-info">
                Verified via: {result.sources?.primarySource || 'unknown'} • {new Date(result.verifiedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/*verification logs section removed*/}
    </div>
  );
}
