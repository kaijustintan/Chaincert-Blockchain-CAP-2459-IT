// Verifier dashboard for credential verification
import React, { useState, useEffect } from 'react';
import "../styles/verifierDashboard.css";
import apiService from "../services/apiService";

export default function VerifierDashboard() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);

  // On-chain audit logs from backend/blockchain
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // verifier identity + on-chain log status
  const [verifierName, setVerifierName] = useState("");
  const [verifierEmail, setVerifierEmail] = useState("");
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState(null);
  const [logSuccess, setLogSuccess] = useState(null);

  // loading state for audit log fetch
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);

  // Helper: load verification logs from backend (blockchain audit)
  const fetchVerificationLogs = async () => {
    try {
      setLogsLoading(true);
      setLogsError(null);
      const res = await apiService.Get_AllVerificationLogs();
      setLogs(res.logs || []);
    } catch (err) {
      console.error("[VERIFY-LOGS FETCH ERROR]", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to load verification logs.";
      setLogsError(msg);
    } finally {
      setLogsLoading(false);
    }
  };

  // Initial load of audit logs
  useEffect(() => {
    fetchVerificationLogs();
  }, []);

  // Helper: call backend to write on-chain verification log
  const saveVerificationLogOnChain = async (credentialId, verifyResponse) => {
    // Optional: skip if walang name/email
    if (!verifierName.trim() && !verifierEmail.trim()) {
      return;
    }

    try {
      setLogSaving(true);
      setLogError(null);
      setLogSuccess(null);

      await apiService.Log_VerificationEvent(
        credentialId,
        verifierName,
        verifierEmail,
        {
          valid: verifyResponse.isValid,
          reason: verifyResponse.reason,
        }
      );

      setLogSuccess("Verification event logged on-chain.");

      // Refresh audit logs table after successful write
      await fetchVerificationLogs();
    } catch (err) {
      console.error("[VERIFY-LOG ERROR]", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to log verification on-chain.";
      setLogError(msg);
    } finally {
      setLogSaving(false);
    }
  };

  // Handle verification via credential ID
  const handleVerify = async () => {
    if (!query.trim()) {
      setError("Please enter a credential ID or code");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLogError(null);
    setLogSuccess(null);

    try {
      // Call API to verify credential (CouchDB + optional blockchain)
      const response = await apiService.Verify_CredentialById(query);

      // response shape:
      // {
      //   success, verified, credentialID, credentialName, holderID,
      //   issuerName, status, isValid, isRevoked, isExpired, expiryDate, reason, ...
      // }

      if (response.verified && response.success) {
        setResult(response);

        // write on-chain verification log (if verifier info provided)
        const credIdForLog = response.credentialID || query;
        await saveVerificationLogOnChain(credIdForLog, response);
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

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  return (
    <div className="verifier-container">
      <h1>Verifier Dashboard</h1>
      <p>Enter a credential ID or code to verify authenticity.</p>

      {/* Search box */}
      <div className="verify-controls">
        <input
          type="text"
          placeholder="Enter credential ID or code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading || logSaving}
        />
        <button onClick={handleVerify} disabled={loading || logSaving}>
          {loading ? "Verifying..." : "Verify"}
        </button>
      </div>

      {/* Verifier identity (for on-chain audit logs) */}
      <div className="verifier-info">
        <input
          type="text"
          placeholder="Your name (for audit logs)"
          value={verifierName}
          onChange={(e) => setVerifierName(e.target.value)}
          disabled={loading || logSaving}
        />
        <input
          type="email"
          placeholder="Your email (for audit logs)"
          value={verifierEmail}
          onChange={(e) => setVerifierEmail(e.target.value)}
          disabled={loading || logSaving}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="error-banner">
          <p>❌ {error}</p>
        </div>
      )}

      {/* On-chain log status */}
      {logError && (
        <div className="error-banner">
          <p>⚠️ {logError}</p>
        </div>
      )}
      {logSuccess && (
        <div className="success-banner">
          <p>✅ {logSuccess}</p>
        </div>
      )}

      {/* Verification result */}
      {result && (
        <div
          className={`verify-result ${
            result.error ? "error" : result.isValid ? "success" : "error"
          }`}
        >
          {result.error ? (
            <p className="error">{result.error}</p>
          ) : (
            <div>
              <h3>
                {result.isValid ? "✅ Credential Valid" : "⚠️ Credential Invalid"}
              </h3>
              {result.reason && (
                <p>
                  <strong>Reason:</strong> {result.reason}
                </p>
              )}
              <p>
                <strong>Credential ID:</strong> {result.credentialID || "N/A"}
              </p>
              <p>
                <strong>Title:</strong>{" "}
                {result.credentialName || result.credentialType || "N/A"}
              </p>
              <p>
                <strong>Owner:</strong> {result.holderID || "N/A"}
              </p>
              <p>
                <strong>Issuer:</strong> {result.issuerName || "N/A"}
              </p>
              <p>
                <strong>Status:</strong> {result.status || "unknown"}
              </p>
              {result.expiryDate && (
                <p>
                  <strong>Expires:</strong>{" "}
                  {new Date(result.expiryDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Logs (on-chain audit history from backend) */}
      <div className="verify-logs">
        <h2>Verification Logs (On-chain Audit)</h2>

        {logsLoading && <p className="empty">Loading verification logs...</p>}
        {logsError && (
          <div className="error-banner">
            <p>⚠️ {logsError}</p>
          </div>
        )}

        {!logsLoading && !logsError && logs.length === 0 && (
          <p className="empty">No verification logs found.</p>
        )}

        {!logsLoading && !logsError && logs.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Verification Log ID</th>
                <th>Verifier Name</th>
                <th>Verifier Email</th>
                <th>Credential ID</th>
                <th>Holder ID</th>
                <th>Holder Name</th>
                <th>Result</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  {/* 1) Verification Log ID */}
                  <td>{log.id}</td>

                  {/* 2) Verifier Name */}
                  <td>{log.verifierName || "N/A"}</td>

                  {/* 3) Verifier Email */}
                  <td>{log.verifierEmail || "N/A"}</td>

                  {/* 4) Credential ID */}
                  <td>{log.credentialId || log.credentialID || "N/A"}</td>

                  {/* 5) Holder ID */}
                  <td>{log.holderID || "N/A"}</td>

                  {/* 6) Holder Name */}
                  <td>{log.holderName || "N/A"}</td>

                  {/* 7) Result */}
                  <td>
                    {log.result?.reason ||
                      log.result?.message ||
                      (typeof log.result === "string" ? log.result : "N/A")}
                  </td>

                  {/* 8) Timestamp */}
                  <td>{log.verifiedAt || log.timestamp || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
