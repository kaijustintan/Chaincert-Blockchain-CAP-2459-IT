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

  // Skills state for create form - polo
  const [skillInput, setSkillInput] = useState("");
  const [skillsList, setSkillsList] = useState([]);

  // Badge image state for create form - polo
  const [badgeImageBase64, setBadgeImageBase64] = useState("");
  const [badgeImagePreview, setBadgeImagePreview] = useState("");

  // Issue Credential Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    credentialId: "",
    recipientId: "",
    expiryDate: "",
  });
  const [issueError, setIssueError] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Revoke Credential Modal State
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeForm, setRevokeForm] = useState({
    credentialId: "",
    rejectionReason: "", // - polo
  });
  const [revokeError, setRevokeError] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);

  // separate state for TEMPLATE options (for dropdown)
  const [templateOptions, setTemplateOptions] = useState([]);

  // Filter state
  const [sortBy, setSortBy] = useState("issuedDate-desc");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch credentials on page load
  useEffect(() => {
    fetchCredentials();
    fetchTemplateOptions();
    fetchAvailableUsers();
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
      console.log("Fetching ISSUED credentials for issuer:", user?.id);

      const data = await apiService.Get_IssuedCredentials();

      setCredentials(Array.isArray(data) ? data : []);
      console.log("Fetched issued credentials:", data);
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

  // fetch TEMPLATE credentials for dropdown
  const fetchTemplateOptions = async () => {
    try {
      const data = await apiService.Get_CredentialTemplates();
      setTemplateOptions(Array.isArray(data) ? data : []);
      console.log("Fetched credential TEMPLATES:", data);
    } catch (err) {
      console.error("Error fetching credential templates:", err);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const users = await apiService.getAllUsers();
      setAvailableUsers(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  // Sorting logic
  const applySorting = (array, sortOption) => {
    const sorted = [...array];
    switch (sortOption) {
      case "issuedDate-desc":
        sorted.sort(
          (a, b) =>
            new Date(b.issuedDate || b.createdAt || 0) -
            new Date(a.issuedDate || a.createdAt || 0)
        );
        break;
      case "issuedDate-asc":
        sorted.sort(
          (a, b) =>
            new Date(a.issuedDate || a.createdAt || 0) -
            new Date(b.issuedDate || b.createdAt || 0)
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

  // Revoke Modal handlers
  const openRevokeModal = () => {
    setShowRevokeModal(true);
    setRevokeError("");
    setRevokeForm({ credentialId: "", rejectionReason: "" }); // - polo
  };

  const closeRevokeModal = () => {
    setShowRevokeModal(false);
    setRevokeError("");
    setRevokeLoading(false);
  };

  const handleRevokeFormChange = (e) => {
    const { name, value } = e.target;
    setRevokeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    setRevokeLoading(true);
    setRevokeError("");

    try {
      if (!revokeForm.credentialId) {
        setRevokeError("Please select a credential to revoke");
        setRevokeLoading(false);
        return;
      }
      // Rejection reason is required before revoke pushes through // - polo
      if (!revokeForm.rejectionReason.trim()) {
        setRevokeError("Please provide a rejection reason");
        setRevokeLoading(false);
        return;
      }

      await apiService.Revoke_CredentialInstance(revokeForm.credentialId, revokeForm.rejectionReason); // - polo
      alert("Credential revoked successfully!");
      closeRevokeModal();
      fetchCredentials();
    } catch (err) {
      console.error("Error revoking credential:", err);
      setRevokeError(err?.message || "Failed to revoke credential");
    } finally {
      setRevokeLoading(false);
    }
  };

  // Skills handlers - polo
  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (skillsList.includes(trimmed)) {
      alert('Skill already added.');
      return;
    }
    setSkillsList(prev => [...prev, trimmed]);
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkillsList(prev => prev.filter(s => s !== skillToRemove));
  };

  // Badge image handler - polo
  const handleBadgeImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setBadgeImageBase64(reader.result);
      setBadgeImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setCreateError("");
    setCreateForm({
      credentialType: "",
      credentialName: "",
      description: "",
      metadata: "",
    });
    setSkillsList([]);       // - polo
    setSkillInput("");       // - polo
    setBadgeImageBase64(""); // - polo
    setBadgeImagePreview(""); // - polo
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError("");
    setCreateLoading(false);
    setSkillsList([]);        // - polo
    setSkillInput("");        // - polo
    setBadgeImageBase64("");  // - polo
    setBadgeImagePreview(""); // - polo
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
      if (!createForm.credentialType || !createForm.credentialName) {
        setCreateError("Please fill in Credential Type and Name");
        setCreateLoading(false);
        return;
      }

      const credentialId = `cred_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 17)}`;

      console.log(`[CLIENT] Generated credential ID: ${credentialId}`);

      await apiService.Create_CredentialTemplate({
        id: credentialId,
        credentialType: createForm.credentialType,
        credentialName: createForm.credentialName,
        description: createForm.description,
        metadata: createForm.metadata,
        skills: skillsList,           // - polo
        badgeImage: badgeImageBase64, // - polo
      });

      alert("Credential created successfully!");
      closeCreateModal();
      fetchCredentials();
      fetchTemplateOptions();
    } catch (err) {
      setCreateError(err?.message || "Failed to create credential");
    } finally {
      setCreateLoading(false);
    }
  };

  // Issue Modal handlers
  const openIssueModal = () => {
    setShowIssueModal(true);
    setIssueError("");
    setIssueForm({
      credentialId: "",
      recipientId: "",
      expiryDate: "",
    });
  };

  const closeIssueModal = () => {
    setShowIssueModal(false);
    setIssueError("");
    setIssueLoading(false);
  };

  const handleIssueFormChange = (e) => {
    const { name, value } = e.target;
    setIssueForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleIssueCredential = async (e) => {
    e.preventDefault();
    setIssueLoading(true);
    setIssueError("");

    try {
      if (!issueForm.credentialId || !issueForm.recipientId) {
        setIssueError("Please select both a credential and a recipient");
        setIssueLoading(false);
        return;
      }

      await apiService.Issue_CredentialToUser(
        issueForm.credentialId,
        issueForm.recipientId,
        issueForm.expiryDate
      );

      alert("Credential issued successfully!");
      closeIssueModal();
      fetchCredentials();
    } catch (err) {
      setIssueError(err?.message || "Failed to issue credential");
    } finally {
      setIssueLoading(false);
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

      {/* Issue Credential Button */}
      <div style={{ margin: "20px 0" }}>
        <button onClick={openIssueModal} className="action-btn issue-btn">
          + Issue Credential
        </button>
      </div>

      {/* Revoke Credential Button */}
      <div style={{ margin: "20px 0" }}>
        <button
          onClick={openRevokeModal}
          className="action-btn revoke-btn"
        >
          Revoke Credential
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

              {/* Skills field - polo */}
              <div className="form-group">
                <label>Skills (optional):</label>
                <div className="skills-input-row">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); }}}
                    placeholder="e.g. Python, Project Management"
                  />
                  <button type="button" className="add-skill-btn" onClick={handleAddSkill}>
                    + Add Skill
                  </button>
                </div>
                {skillsList.length > 0 && (
                  <div className="skills-tags">
                    {skillsList.map((skill, idx) => (
                      <span key={idx} className="skill-tag">
                        {skill}
                        <button type="button" onClick={() => handleRemoveSkill(skill)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Badge image upload - polo */}
              <div className="form-group">
                <label>Badge Image (optional):</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/gif"
                  onChange={handleBadgeImageChange}
                />
                {badgeImagePreview && (
                  <div className="badge-preview">
                    <img src={badgeImagePreview} alt="Badge preview" style={{width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8}} />
                    <button type="button" onClick={() => { setBadgeImageBase64(""); setBadgeImagePreview(""); }} style={{marginLeft: 8, fontSize: '0.8rem'}}>
                      Remove
                    </button>
                  </div>
                )}
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
          <div className="modal-backdrop" onClick={closeCreateModal}></div>
        </div>
      )}

      {/* Issue Credential Modal */}
      {showIssueModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Issue Credential</h3>
            <form onSubmit={handleIssueCredential}>
              <div className="form-group">
                <label>Select Credential:</label>
                <select
                  name="credentialId"
                  value={issueForm.credentialId}
                  onChange={handleIssueFormChange}
                  required
                >
                  <option value="">-- Select a credential --</option>
                  {templateOptions.map((cred) => (
                    <option key={cred.id || cred._id} value={cred.id || cred._id}>
                      {cred.credentialName} ({cred.credentialType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select Recipient:</label>
                <select
                  name="recipientId"
                  value={issueForm.recipientId}
                  onChange={handleIssueFormChange}
                  required
                >
                  <option value="">-- Select a recipient --</option>
                  {availableUsers.map((user) => (
                    <option key={user._id || user.id} value={user._id || user.id}>
                      {user.name || user.username || user.email}
                      {user.email && ` (${user.email})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Expiry Date (optional):</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={issueForm.expiryDate}
                  onChange={handleIssueFormChange}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              {issueError && (
                <div className="form-error" style={{ color: "red" }}>
                  {issueError}
                </div>
              )}

              <div style={{ marginTop: "1em" }}>
                <button
                  type="submit"
                  className="action-btn"
                  disabled={issueLoading}
                >
                  {issueLoading ? "Issuing..." : "Issue"}
                </button>
                <button
                  type="button"
                  onClick={closeIssueModal}
                  className="action-btn"
                  style={{ marginLeft: 8 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeIssueModal}></div>
        </div>
      )}

      {/* Revoke Credential Modal */}
      {showRevokeModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Revoke Credential</h3>
            <form onSubmit={handleRevokeSubmit}>
              <div className="form-group">
                <label>Select Issued Credential:</label>
                <select
                  name="credentialId"
                  value={revokeForm.credentialId}
                  onChange={handleRevokeFormChange}
                  required
                >
                  <option value="">-- Select issued credential --</option>
                  {credentials
                    .filter(
                      (c) =>
                        c.status === "issued" ||
                        !c.status ||
                        c.status === "active"
                    )
                    .map((cred) => {
                      const blockchainId = cred.blockchainId || cred.id;
                      const shortId = blockchainId?.slice(0, 16) || "";
                      return (
                        <option key={blockchainId} value={blockchainId}>
                          {cred.credentialName || "Untitled"} (
                          {cred.credentialType || "N/A"})
                          {cred.holderID ? ` – ${cred.holderID}` : ""}
                          {shortId ? ` – ${shortId}…` : ""}
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Rejection Reason — required before revoke pushes through // - polo */}
              <div className="form-group">
                <label>Rejection Reason:</label>
                <textarea
                  name="rejectionReason"
                  value={revokeForm.rejectionReason}
                  onChange={handleRevokeFormChange}
                  rows={3}
                  placeholder="State the reason for revoking this credential..."
                  required
                />
              </div>

              {revokeError && (
                <div className="form-error" style={{ color: "red" }}>
                  {revokeError}
                </div>
              )}

              <div style={{ marginTop: "1em" }}>
                <button
                  type="submit"
                  className="action-btn revoke-btn"
                  disabled={revokeLoading}
                >
                  {revokeLoading ? "Revoking..." : "Revoke"}
                </button>
                <button
                  type="button"
                  onClick={closeRevokeModal}
                  className="action-btn"
                  style={{ marginLeft: 8 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeRevokeModal}></div>
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
                <th>Description</th>
                <th>Created Date</th>
                <th>Status</th>
                <th>Expiry Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCredentials.map((credential) => {
                const blockchainId = credential.blockchainId || credential.id;

                return (
                  <tr key={blockchainId}>
                    <td>{blockchainId || "N/A"}</td>
                    <td>{credential.credentialType || "N/A"}</td>
                    <td>{credential.credentialName || "N/A"}</td>
                    <td>{credential.description || "N/A"}</td>
                    <td>
                      {credential.issuedDate
                        ? new Date(credential.issuedDate).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td>
                      <span
                        className={`status-badge status-${
                          credential.status || "active"
                        }`}
                      >
                        {credential.status || "active"}
                      </span>
                    </td>
                    <td>
                      {credential.expiryDate
                        ? new Date(credential.expiryDate).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td>
                      {credential.status &&
                        credential.status !== "issued" &&
                        credential.status !== "active" && (
                          <span className="action-text">
                            {credential.status === "revoked"
                              ? "Revoked"
                              : "Expired"}
                          </span>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
