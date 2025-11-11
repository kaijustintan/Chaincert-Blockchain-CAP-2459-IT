import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import "../styles/issuerDashboardPage.css";

export default function IssuerDashboard() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState([]);
  const [filteredCredentials, setFilteredCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [sortBy, setSortBy] = useState("issuedDate-desc");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch all credentials on page load
  useEffect(() => {
    fetchCredentials();
  }, []);

  // 🔧 MEMOIZE applyFilters function
  const applyFilters = useCallback(() => {
    let result = [...credentials];

    // Filter by credential type
    if (filterType !== "all") {
      result = result.filter((cred) => cred.credentialType === filterType);
    }

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter((cred) => cred.status === filterStatus);
    }

    // Sort
    result = applySorting(result, sortBy);

    setFilteredCredentials(result);
  }, [credentials, sortBy, filterType, filterStatus]);

  // Apply filters whenever filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]); // ✅ NOW applyFilters is in the dependency array

  const fetchCredentials = async () => {
    try {
      setLoading(true);
<<<<<<< Updated upstream
      const data = await apiService.getCredentialsByIssuer("ISSUER");
=======
      setError(null); // Reset error before fetching
      
      // Try to fetch credentials
      const data = await apiService.getCredentialsByIssuer('ISSUER-DLSU');
>>>>>>> Stashed changes
      console.log("Fetched credentials:", data);
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setCredentials(data);
      } else if (data && Array.isArray(data.credentials)) {
        setCredentials(data.credentials);
      } else if (data && data.data && Array.isArray(data.data)) {
        setCredentials(data.data);
      } else {
        console.warn("Unexpected data format:", data);
        setCredentials([]);
      }
    } catch (err) {
      console.error("Error fetching credentials:", err);
      
      // More detailed error message
      if (err.response) {
        // The request was made and the server responded with a status code
        setError(`Server error: ${err.response.status} - ${err.response.data?.message || err.message}`);
      } else if (err.request) {
        // The request was made but no response was received
        setError("No response from server. Make sure backend is running at http://localhost:4000");
      } else {
        // Something happened in setting up the request
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sorting logic
  const applySorting = (array, sortOption) => {
    const sorted = [...array];

    switch (sortOption) {
      case "issuedDate-desc":
        sorted.sort(
          (a, b) => new Date(b.issuedDate) - new Date(a.issuedDate)
        );
        break;

      case "issuedDate-asc":
        sorted.sort(
          (a, b) => new Date(a.issuedDate) - new Date(b.issuedDate)
        );
        break;

      case "expiryDate-desc":
        sorted.sort(
          (a, b) => new Date(b.expiryDate) - new Date(a.expiryDate)
        );
        break;

      case "expiryDate-asc":
        sorted.sort(
          (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
        );
        break;

      case "credentialType-asc":
        sorted.sort((a, b) =>
          (a.credentialType || "").localeCompare(b.credentialType || "")
        );
        break;

      default:
        break;
    }

    return sorted;
  };

  // Get unique credential types for dropdown
  const getUniqueCredentialTypes = () => {
    const types = new Set(
      credentials.map((cred) => cred.credentialType).filter(Boolean)
    );
    return Array.from(types).sort();
  };

  // Navigate to credential history page
  const handleViewHistory = () => {
    navigate("/issuer/history");
  };

  // Revoke credential
  const handleRevoke = async (credentialId) => {
    if (window.confirm("Are you sure you want to revoke this credential?")) {
      try {
        await apiService.revokeCredential(credentialId);
        alert("Credential revoked successfully!");
        fetchCredentials();
      } catch (err) {
        alert("Error revoking credential: " + err.message);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="issuer-dashboard">
        <p>Loading credentials...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="issuer-dashboard">
<<<<<<< Updated upstream
        <p style={{ color: "#ff6b6b" }}>
          <strong>Error loading credentials:</strong> {error}
        </p>
        <p style={{ color: "#999" }}>
          Make sure backend is running at http://localhost:4000
        </p>
=======
        <h2>Issuer Dashboard</h2>
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '20px', 
          borderRadius: '8px', 
          margin: '20px 0' 
        }}>
          <p><strong>Error loading credentials:</strong></p>
          <p>{error}</p>
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
>>>>>>> Stashed changes
      </div>
    );
  }

  return (
    <div className="issuer-dashboard">
      <h2>Issuer Dashboard</h2>

      {/* View History Button */}
      <div className="dashboard-header">
        <div className="tabs">
          <button onClick={handleViewHistory} className="action-btn">
            📋 View Credential History
          </button>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="filter-section">
        <h3>🔍 Filter & Sort Credentials</h3>

        <div className="filter-row">
          {/* Sort By */}
          <div className="filter-group">
            <label htmlFor="sortBy">Sort By:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="issuedDate-desc">
                📅 Most Recent (Issued)
              </option>
              <option value="issuedDate-asc">📅 Oldest (Issued)</option>
              <option value="expiryDate-desc">⏰ Latest Expiry Date</option>
              <option value="expiryDate-asc">⏰ Expiring Soonest</option>
              <option value="credentialType-asc">🏆 Credential Type (A-Z)</option>
            </select>
          </div>

          {/* Filter by Type */}
          <div className="filter-group">
            <label htmlFor="filterType">Credential Type:</label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              {getUniqueCredentialTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div className="filter-group">
            <label htmlFor="filterStatus">Status:</label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">✅ Active</option>
              <option value="revoked">❌ Revoked</option>
              <option value="expired">⚠️ Expired</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="results-info">
          Showing <strong>{filteredCredentials.length}</strong> of{" "}
          <strong>{credentials.length}</strong> credentials
        </div>
      </div>

      {/* CREDENTIALS TABLE */}
      {filteredCredentials.length === 0 ? (
        <div className="no-results">
          <p>
            {credentials.length === 0
              ? "📭 No credentials found. Issue your first credential!"
              : "❌ No credentials match your filters."}
          </p>
        </div>
      ) : (
<<<<<<< Updated upstream
        <div className="table-container">
          <table className="template-table">
            <thead>
              <tr>
                <th>Credential ID</th>
                <th>Holder ID</th>
                <th>Type</th>
                <th>Metadata</th>
                <th>Status</th>
                <th>Issued Date</th>
                <th>Expiry Date</th>
                <th>Actions</th>
=======
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
                <td>{credential.issuedDate ? new Date(credential.issuedDate).toLocaleDateString() : 'N/A'}</td>
                <td>{credential.expiryDate ? new Date(credential.expiryDate).toLocaleDateString() : 'N/A'}</td>
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
>>>>>>> Stashed changes
              </tr>
            </thead>
            <tbody>
              {filteredCredentials.map((credential) => (
                <tr key={credential.id}>
                  <td>{credential.id}</td>
                  <td>{credential.holderID || "N/A"}</td>
                  <td>{credential.credentialType || "N/A"}</td>
                  <td>{credential.metadata || "N/A"}</td>
                  <td>
                    <span
                      className={`status-badge status-${credential.status}`}
                    >
                      {credential.status}
                    </span>
                  </td>
                  <td>
                    {new Date(credential.issuedDate).toLocaleDateString()}
                  </td>
                  <td>
                    {new Date(credential.expiryDate).toLocaleDateString()}
                  </td>
                  <td>
                    {credential.status === "active" && (
                      <button
                        onClick={() => handleRevoke(credential.id)}
                        className="action-btn revoke-btn"
                      >
                        Revoke
                      </button>
                    )}
                    {credential.status !== "active" && (
                      <span className="action-text">
                        {credential.status === "revoked" ? "Revoked" : "Expired"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}