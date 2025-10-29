// Verifier dashboard for credential verification

import React, { useState } from "react";
import "../styles/verifierDashboard.css";

const MOCK_CREDENTIALS = [
  {
    id: "cred-001",
    title: "Bachelor of Science in Information Technology",
    owner: "Juan Dela Cruz",
    issuer: "De La Salle University - Manila",
    dateIssued: "2025-03-21",
    status: "active",
  },
  {
    id: "cred-002",
    title: "AWS Cloud Practitioner (Microcredential)",
    owner: "Maria Santos",
    issuer: "AWS Academy",
    dateIssued: "2025-05-10",
    status: "active",
  },
];

export default function VerifierDashboard() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);

  const handleVerify = () => {
    const found = MOCK_CREDENTIALS.find(
      (c) => c.id.toLowerCase() === query.toLowerCase()
    );
    setResult(found || { error: "Credential not found or invalid." });
    setLogs([
      ...logs,
      {
        id: Date.now(),
        query,
        status: found ? "Success" : "Failed",
        ts: new Date().toLocaleString(),
      },
    ]);
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
        />
        <button onClick={handleVerify}>Verify</button>
      </div>

      {/* Verification result */}
      {result && (
        <div className="verify-result">
          {result.error ? (
            <p className="error">{result.error}</p>
          ) : (
            <div>
              <h3>✅ Credential Verified</h3>
              <p>
                <strong>Title:</strong> {result.title}
              </p>
              <p>
                <strong>Owner:</strong> {result.owner}
              </p>
              <p>
                <strong>Issuer:</strong> {result.issuer}
              </p>
              <p>
                <strong>Date Issued:</strong> {result.dateIssued}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`status-pill ${result.status}`}>
                  {result.status}
                </span>
              </p>
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
                  <td>{log.status}</td>
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