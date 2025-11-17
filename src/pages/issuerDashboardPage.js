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


  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    credentialType: "",
    credentialName: "",
    description: "",
    metadata: "",
  });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);


  // Filter state
  const [sortBy, setSortBy] = useState("issuedDate-desc");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");


  // Fetch credentials on page load
  useEffect(() => {
    fetchCredentials();
  }, []);


  // Filtering logic
  const applyFilters = useCallback(() => {
    let result = [...credentials];
    if (filterType !== "all") {
      result = result.filter((cred) => cred.credentialType === filterType);
    }
    if (filterStatus !== "all") {
      result = result.filter((cred) => cred.status === filterStatus);
    }
    result = applySorting(result, sortBy);
    setFilteredCredentials(result);
  }, [credentials, sortBy, filterType, filterStatus]);


  useEffect(() => {
    applyFilters();
  }, [applyFilters]);


  const fetchCredentials = async () => {
  try {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem("user"));
    const issuerID = user.id;
    console.log(issuerID);
    
    // ✅ CHANGE ONLY THIS - Remove the nested checks, keep it simple:
    const data = await apiService.getCredentialsByIssuer(issuerID);
    setCredentials(Array.isArray(data) ? data : []);  // ONE LINE CHANGE
     console.log("Raw API response:", data);
    console.log("First credential:", data && data[0]);
    
  } catch (err) {
    if (err.response) {
      setError(
        `Server error: ${err.response.status} - ${
          err.response.data?.message || err.message
        }`
      );
    } else if (err.request) {
      setError(
        "No response from server. Make sure backend is running at http://localhost:4000"
      );
    } else {
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
          (a, b) => new Date(b.createdAt || b.issuedDate) - new Date(a.createdAt || a.issuedDate)
        );
        break;
      case "issuedDate-asc":
        sorted.sort(
          (a, b) => new Date(a.createdAt || a.issuedDate) - new Date(b.createdAt || b.issuedDate)
        );
        break;
      case "expiryDate-desc":
        sorted.sort(
          (a, b) => new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0)
        );
        break;
      case "expiryDate-asc":
        sorted.sort(
          (a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0)
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


  const getUniqueCredentialTypes = () => {
    const types = new Set(
      credentials.map((cred) => cred.credentialType).filter(Boolean)
    );
    return Array.from(types).sort();
  };


  const handleViewHistory = () => {
    navigate("/issuer/history");
  };


  const handleRevoke = async (credentialId) => {
    if (
      window.confirm("Are you sure you want to revoke this credential?")
    ) {
      try {
        await apiService.revokeCredential(credentialId);
        alert("Credential revoked successfully!");
        fetchCredentials();
      } catch (err) {
        alert("Error revoking credential: " + err.message);
      }
    }
  };


  // Modal handlers
  const openCreateModal = () => {
    setShowCreateModal(true);
    setCreateError("");
    setCreateForm({
      credentialType: "",
      credentialName: "",
      description: "",
      metadata: "",
    });
  };


  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError("");
    setCreateLoading(false);
  };


  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };


  const handleCreateCredential = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");


    try {
      const issuerID = localStorage.getItem("issuerID") || "ISSUER";


      if (!createForm.credentialType || !createForm.credentialName) {
        setCreateError("Please fill in Credential Type and Name");
        setCreateLoading(false);
        return;
      }


      // Generate unique ID for credential
      const id = `cred_${issuerID}_${Date.now()}`;


      await apiService.createCredentialAsIssuer({
        ...createForm,
        issuerID,
        id,
      });


      closeCreateModal();
      fetchCredentials();
    } catch (err) {
      setCreateError(err?.message || "Failed to create credential");
    } finally {
      setCreateLoading(false);
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
        <p style={{ color: "#ff6b6b" }}>
          <strong>Error loading credentials:</strong> {error}
        </p>
        <p style={{ color: "#999" }}>
          Make sure backend is running at http://localhost:4000
        </p>
      </div>
    );
  }


  return (
    <div className="issuer-dashboard">
      <h2>Issuer Dashboard</h2>
      {/* Create Credential Button */}
      <div style={{ margin: "20px 0" }}>
        <button onClick={openCreateModal} className="action-btn create-btn">
          + Create Credential
        </button>
      </div>


      {/* Create Credential Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Credential</h3>
            <form onSubmit={handleCreateCredential}>
              <div className="form-group">
                <label>Credential Type:</label>
                <input
                  type="text"
                  name="credentialType"
                  value={createForm.credentialType}
                  onChange={handleCreateFormChange}
                  placeholder="e.g. Certificate, ID, Award"
                  required
                />
              </div>


              <div className="form-group">
                <label>Credential Name:</label>
                <input
                  type="text"
                  name="credentialName"
                  value={createForm.credentialName}
                  onChange={handleCreateFormChange}
                  placeholder="e.g. Company Staff Card"
                  required
                />
              </div>


              <div className="form-group">
                <label>Description:</label>
                <textarea
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateFormChange}
                  rows={2}
                  placeholder="Describe the credential's purpose..."
                />
              </div>


              <div className="form-group">
                <label>Metadata (optional):</label>
                <input
                  type="text"
                  name="metadata"
                  value={createForm.metadata}
                  onChange={handleCreateFormChange}
                  placeholder="e.g. Level: Manager"
                />
              </div>


              {createError && (
                <div className="form-error" style={{ color: "red" }}>
                  {createError}
                </div>
              )}


              <div style={{ marginTop: "1em" }}>
                <button
                  type="submit"
                  className="action-btn"
                  disabled={createLoading}
                >
                  {createLoading ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="action-btn"
                  style={{ marginLeft: 8 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
          <div
            className="modal-backdrop"
            onClick={closeCreateModal}
          ></div>
        </div>
      )}


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
          <div className="filter-group">
            <label htmlFor="sortBy">Sort By:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="issuedDate-desc">📅 Most Recent (Created)</option>
              <option value="issuedDate-asc">📅 Oldest (Created)</option>
              <option value="expiryDate-desc">⏰ Latest Expiry Date</option>
              <option value="expiryDate-asc">⏰ Expiring Soonest</option>
              <option value="credentialType-asc">
                🏆 Credential Type (A-Z)
              </option>
            </select>
          </div>


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
        <div className="table-container">
          <table className="template-table">
            <thead>
              <tr>
                <th>Credential ID</th>
                <th>Type</th>
                <th>Name</th>
                <th>Metadata</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Expiry Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCredentials.map((credential) => (
                <tr key={credential.id}>
                  <td>{credential.id}</td>
                  <td>{credential.credentialType || "N/A"}</td>
                  <td>{credential.credentialName || "N/A"}</td>
                  <td>{credential.metadata || "N/A"}</td>
                  <td>
                    <span className={`status-badge status-${credential.status || 'active'}`}>
                      {credential.status || "active"}
                    </span>
                  </td>
                  <td>
                    {credential.createdAt
                      ? new Date(credential.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td>
                    {credential.expiryDate
                      ? new Date(credential.expiryDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td>
                    {(credential.status === "active" || !credential.status) && (
                      <button
                        onClick={() => handleRevoke(credential.id)}
                        className="action-btn revoke-btn"
                      >
                        Revoke
                      </button>
                    )}
                    {credential.status && credential.status !== "active" && (
                      <span className="action-text">
                        {credential.status === "revoked"
                          ? "Revoked"
                          : "Expired"}
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