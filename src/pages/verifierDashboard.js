// Verifier dashboard for credential verification
import React, { useState } from 'react';
import "../styles/verifierDashboard.css";
import apiService from "../services/apiService";

export default function VerifierDashboard() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      // Call API to verify credential
      const response = await apiService.verifyCredential(query);
      
      if (response.verified || response.data) {
        setResult(response.data || response);
        addLog(query, "Success", response.data || response);
      } else {
        setResult({ error: "Credential not found or invalid." });
        addLog(query, "Failed", null);
      }
    } catch (err) {
      console.error("[VERIFY ERROR]", err);
      const errorMsg = err.response?.data?.message || err.message || "Verification failed";
      setResult({ error: errorMsg });
      addLog(query, "Failed", null);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to add to logs
  const addLog = (queryStr, status, data) => {
    setLogs([
      ...logs,
      {
        id: Date.now(),
        query: queryStr,
        status: status,
        ts: new Date().toLocaleString(),
        data: data,
      },
    ]);
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

      {/* Verification result */}
      {result && (
        <div className={`verify-result ${result.error ? "error" : "success"}`}>
          {result.error ? (
            <p className="error">{result.error}</p>
          ) : (
            <div>
              <h3>✅ Credential Verified</h3>
              <p>
                <strong>Title:</strong> {result.credentialName || result.credentialType || "N/A"}
              </p>
              <p>
                <strong>Owner:</strong> {result.holderID || "N/A"}
              </p>
              <p>
                <strong>Issuer:</strong> {result.issuerName || "N/A"}
              </p>
              <p>
                <strong>Status:</strong> {result.status || "active"}
              </p>
              {result.expiryDate && (
                <p>
                  <strong>Expires:</strong> {new Date(result.expiryDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Logs */}
      <div className="verify-logs">
        <h2>Verification Logs</h2>
        {logs.length === 0 ? (
          <p className="empty">No verification attempts yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Query</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.query}</td>
                  <td>
                    <span className={`status-badge ${log.status.toLowerCase()}`}>
                      {log.status}
                    </span>
                  </td>
                  <td>{log.ts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
