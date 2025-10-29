import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
import "../styles/issuerDashboardPage.css";

export default function IssuerDashboardPage() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAllCredentials();
      setCredentials(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching credentials:', err);
      setError('Failed to fetch credentials from blockchain');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (credentialId) => {
    try {
      const result = await apiService.verifyCredential(credentialId);
      if (result.valid) {
        alert(`✅ Credential ${credentialId} is VALID!\n\nStatus: ${result.credential.status}\nIssued: ${result.credential.issuedDate}`);
      } else {
        alert(`❌ Credential ${credentialId} is INVALID!`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRevoke = async (credentialId) => {
    if (window.confirm(`Revoke credential ${credentialId}?`)) {
      try {
        await apiService.revokeCredential(credentialId);
        alert(`✅ Credential ${credentialId} revoked on blockchain!`);
        fetchCredentials();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="issuer-dashboard">
        <h2>Loading credentials from blockchain...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="issuer-dashboard">
        <h2>{error}</h2>
        <button onClick={fetchCredentials} className="create-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="issuer-dashboard">
      <h2>Credential Templates</h2>
      <div className="dashboard-header">
        <div className="tabs">
          <button className="active">Templates</button>
          <button onClick={() => window.location.href = '/issuer/history'}>
            📜 Credential History
          </button>
          <button>Earners</button>
          <button>Recommendations</button>
          <button>Collections</button>
          <button>Issue</button>
        </div>
        <button className="create-btn" onClick={fetchCredentials}>🔄 Refresh from Blockchain</button>
      </div>

      <table className="template-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Holder ID</th>
            <th>State</th>
            <th>Updated</th>
            <th>Issued</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {credentials.map((cred) => (
            <tr key={cred.id}>
              <td>{cred.credentialType}</td>
              <td>{cred.holderID}</td>
              <td>{cred.status === 'active' ? 'Published' : 'Revoked'}</td>
              <td>{formatDate(cred.issuedDate)}</td>
              <td>{cred.id}</td>
              <td>
                <button 
                  onClick={() => handleVerify(cred.id)}
                  style={{
                    marginRight: '5px',
                    padding: '5px 10px',
                    background: '#6B46C1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Verify
                </button>
                {cred.status === 'active' && (
                  <button 
                    onClick={() => handleRevoke(cred.id)}
                    style={{
                      padding: '5px 10px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Revoke
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
