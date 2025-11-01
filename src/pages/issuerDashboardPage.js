import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import "../styles/issuerDashboardPage.css";

export default function IssuerDashboard() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all credentials on page load
  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
     const data = await apiService.getCredentialsByIssuer('ISSUER');
      console.log("Fetched credentials:", data);
      setCredentials(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching credentials:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to credential history page
  const handleViewHistory = () => {
    navigate("/issuer/history");
  };

  // Loading state
  if (loading) {
    return (
      <div className="issuer-dashboard">
        <h2>Issuer Dashboard</h2>
        <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          Loading credentials...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="issuer-dashboard">
        <h2>Issuer Dashboard</h2>
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '20px', 
          borderRadius: '8px', 
          margin: '20px 0' 
        }}>
          <p><strong>Error loading credentials:</strong> {error}</p>
          <p>Make sure backend is running at http://localhost:4000</p>
          <button 
            onClick={fetchCredentials}
            style={{
              background: '#721c24',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="issuer-dashboard">
      <h2>Issuer Dashboard</h2>
      
      {/* Action Buttons */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="create-btn">Issue New Credential</button>
          <button 
            className="create-btn" 
            onClick={handleViewHistory}
            style={{ background: '#28a745' }}
          >
            See Credential History
          </button>
          <button 
            className="create-btn" 
            onClick={fetchCredentials}
            style={{ background: '#6c757d' }}
          >
            Refresh List
          </button>
        </div>
      </div>

      {/* Credentials Count */}
      <h3 style={{ marginTop: '30px', marginBottom: '20px' }}>
        Issued Credentials ({credentials.length})
      </h3>

      {/* Credentials Table */}
      {credentials.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          No credentials found. Issue your first credential!
        </p>
      ) : (
        <table className="template-table">
          <thead>
            <tr>
              <th>Credential ID</th>
              <th>Holder ID</th>
              <th>Credential Type</th>
              <th>Metadata</th>
              <th>Status</th>
              <th>Issued Date</th>
              <th>Expiry Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((credential) => (
              <tr key={credential.id}>
                <td><strong>{credential.id}</strong></td>
                <td>{credential.holderID || 'N/A'}</td>
                <td>{credential.credentialType || 'N/A'}</td>
                <td>{credential.metadata || 'N/A'}</td>
                <td>
                  <span 
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      background: credential.status === 'active' ? '#d4edda' : '#f8d7da',
                      color: credential.status === 'active' ? '#155724' : '#721c24'
                    }}
                  >
                    {credential.status}
                  </span>
                </td>
                <td>{new Date(credential.issuedDate).toLocaleDateString()}</td>
                <td>{new Date(credential.expiryDate).toLocaleDateString()}</td>
                <td>
                  {credential.status === 'active' && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Revoke credential ${credential.id}?`)) {
                          apiService.revokeCredential(credential.id)
                            .then(() => {
                              alert('Credential revoked successfully!');
                              fetchCredentials();
                            })
                            .catch(err => alert('Failed to revoke: ' + err.message));
                        }
                      }}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
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
      )}
    </div>
  );
}
