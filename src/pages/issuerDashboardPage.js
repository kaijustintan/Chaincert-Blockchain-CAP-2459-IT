// ==========================================================================================================================================================================
//                                                               issuerDashboardPage.js
// ==========================================================================================================================================================================
/* [ OUTLINE ]
  =====================================================================
  CSS-CHANGE: Full UI restructure into card-based navigation - polo
  
  VIEW STATES:
    'home'          → Card grid (Create, Issue, Revoke, History, Subordinates)
    'create'        → Create template form + templates list
    'issue'         → Issue credential (step wizard) + issued credentials table
    'revoke'        → Revoke form + revokable credentials list
    'subordinates'  → My Subordinates + Decision Logs (root-only)

  ZERO LOGIC CHANGES:
    - All state variables preserved
    - All API calls preserved
    - All modal logic preserved (create, issue, revoke, reject subordinate, documents)
    - All filter/sort logic preserved
    - Toast notifications preserved
    - isSubordinate check preserved
  =====================================================================
*/

import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import "../styles/issuerDashboardPage.css";

export default function IssuerDashboard() {
  // - polo: get current issuer type to hide subordinate sections for subordinate issuers
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSubordinate = currentUser?.issuerType === "subordinate";
  const displayName = currentUser?.contactName || currentUser?.fullName || currentUser?.username || currentUser?.email || "Issuer";
  const navigate = useNavigate();

  // CSS-CHANGE: View state machine - polo
  const [activeView, setActiveView] = useState("home");

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
  const [noTemplateError, setNoTemplateError] = useState("");

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

  // Root Authority → My Subordinates directory
  const [subordinateDirectory, setSubordinateDirectory] = useState([]);
  const [subordinateDirectoryLoading, setSubordinateDirectoryLoading] = useState(false);
  const [subordinateDirectoryError, setSubordinateDirectoryError] = useState("");
  const [subordinateDirectoryFilter, setSubordinateDirectoryFilter] = useState("all");

  const [rootSubordinateLogs, setRootSubordinateLogs] = useState([]);
  const [rootSubordinateLogsLoading, setRootSubordinateLogsLoading] = useState(false);
  const [rootSubordinateLogsError, setRootSubordinateLogsError] = useState("");
  const [rootSubordinateLogFilter, setRootSubordinateLogFilter] = useState("all");

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // Root Authority → Reject subordinate modal
  const [showRejectSubordinateModal, setShowRejectSubordinateModal] = useState(false);
  const [rejectSubordinateTarget, setRejectSubordinateTarget] = useState(null);
  const [rejectSubordinateReason, setRejectSubordinateReason] = useState("");
  const [rejectSubordinateError, setRejectSubordinateError] = useState("");
  const [rejectSubordinateLoading, setRejectSubordinateLoading] = useState(false);

  // Submitted documents modal
  const [showIssuerDocumentsModal, setShowIssuerDocumentsModal] = useState(false);
  const [selectedIssuerForDocuments, setSelectedIssuerForDocuments] = useState(null);
  const [issuerDocuments, setIssuerDocuments] = useState([]);
  const [issuerDocumentsLoading, setIssuerDocumentsLoading] = useState(false);
  const [issuerDocumentsError, setIssuerDocumentsError] = useState("");

  // -------------------------------------------------------------------
  // EFFECTS (unchanged)
  // -------------------------------------------------------------------
  useEffect(() => {
    fetchCredentials();
    fetchTemplateOptions();
    fetchSubordinateDirectory("all");
    fetchRootSubordinateLogs("all");
  }, []);

  const applyFilters = useCallback(() => {
    let result = [...credentials];
    if (filterType !== "all") result = result.filter((cred) => cred.credentialType === filterType);
    if (filterStatus !== "all") result = result.filter((cred) => cred.status === filterStatus);
    result = applySorting(result, sortBy);
    setFilteredCredentials(result);
  }, [credentials, sortBy, filterType, filterStatus]);

  useEffect(() => { applyFilters(); }, [applyFilters]);
  useEffect(() => { fetchSubordinateDirectory(subordinateDirectoryFilter); }, [subordinateDirectoryFilter]);
  useEffect(() => { fetchRootSubordinateLogs(rootSubordinateLogFilter); }, [rootSubordinateLogFilter]);

  // -------------------------------------------------------------------
  // ALL FETCH / HANDLER FUNCTIONS (unchanged — preserved exactly)
  // -------------------------------------------------------------------
  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user"));
      console.log("Fetching ISSUED credentials for issuer:", user?.id);
      const data = await apiService.Get_IssuedCredentials();
      setCredentials(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.response) setError(`Server error: ${err.response.status} - ${err.response.data?.message || err.message}`);
      else if (err.request) setError("No response from server. Make sure backend is running at http://localhost:4000");
      else setError(err.message);
    } finally { setLoading(false); }
  };

  const fetchTemplateOptions = async () => {
    try {
      const data = await apiService.Get_CredentialTemplates();
      setTemplateOptions(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Error fetching credential templates:", err); }
  };

  const fetchSubordinateDirectory = async (mode = subordinateDirectoryFilter) => {
    try {
      setSubordinateDirectoryLoading(true);
      setSubordinateDirectoryError("");
      let response;
      if (mode === "root_approved") response = await apiService.getRootApprovedSubordinatesForRoot();
      else if (mode === "root_rejected") response = await apiService.getRootRejectedSubordinatesForRoot();
      else if (mode === "approved") response = await apiService.getApprovedSubordinatesForRoot();
      else if (mode === "disabled") response = await apiService.getDisabledSubordinatesForRoot();
      else if (mode === "pending") response = await apiService.getPendingSubordinatesForRoot();
      else response = await apiService.getAllSubordinatesForRoot();
      const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      setSubordinateDirectory(list);
    } catch (err) {
      console.error("Error fetching subordinate directory:", err);
      setSubordinateDirectory([]);
      setSubordinateDirectoryError(err.response?.data?.message || "Failed to load subordinate directory.");
    } finally { setSubordinateDirectoryLoading(false); }
  };

  const fetchRootSubordinateLogs = async (filter = rootSubordinateLogFilter) => {
    try {
      setRootSubordinateLogsLoading(true);
      setRootSubordinateLogsError("");
      let response;
      if (filter === "approved") response = await apiService.GetRootSubordinateApprovalLogsByRootAuthority();
      else if (filter === "rejected") response = await apiService.GetRootSubordinateRejectionLogsByRootAuthority();
      else response = await apiService.GetRootSubordinateLogsByRootAuthority();
      const list = Array.isArray(response?.logs) ? response.logs : Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      const sorted = [...list].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      setRootSubordinateLogs(sorted);
    } catch (err) {
      console.error("Error fetching root subordinate logs:", err);
      setRootSubordinateLogs([]);
      setRootSubordinateLogsError(err.response?.data?.message || "Failed to load subordinate decision logs.");
    } finally { setRootSubordinateLogsLoading(false); }
  };

  const handleRootApproveSubordinate = async (issuerId) => {
    try {
      await apiService.rootApproveSubordinateIssuer(issuerId, "");
      showToast("Subordinate issuer approved successfully!");
      fetchSubordinateDirectory(subordinateDirectoryFilter);
      fetchRootSubordinateLogs(rootSubordinateLogFilter);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to approve subordinate issuer.", "danger");
    }
  };

  const openRejectSubordinateModal = (issuer) => { setRejectSubordinateTarget(issuer); setRejectSubordinateReason(""); setRejectSubordinateError(""); setShowRejectSubordinateModal(true); };
  const closeRejectSubordinateModal = () => { if (rejectSubordinateLoading) return; setShowRejectSubordinateModal(false); setRejectSubordinateTarget(null); setRejectSubordinateReason(""); setRejectSubordinateError(""); };

  const submitRejectSubordinate = async (e) => {
    e.preventDefault();
    const trimmed = rejectSubordinateReason.trim();
    if (!trimmed) { setRejectSubordinateError("Rejection reason is required."); return; }
    const issuerId = rejectSubordinateTarget?._id || rejectSubordinateTarget?.id;
    if (!issuerId) { setRejectSubordinateError("Subordinate issuer ID not found."); return; }
    try {
      setRejectSubordinateLoading(true); setRejectSubordinateError("");
      await apiService.rootRejectSubordinateIssuer(issuerId, trimmed);
      showToast("Subordinate issuer rejected successfully!");
      closeRejectSubordinateModal();
      fetchSubordinateDirectory(subordinateDirectoryFilter);
      fetchRootSubordinateLogs(rootSubordinateLogFilter);
    } catch (err) { setRejectSubordinateError(err.response?.data?.message || "Failed to reject subordinate issuer."); }
    finally { setRejectSubordinateLoading(false); }
  };

  const openIssuerDocumentsModal = async (issuer) => {
    try {
      const issuerId = issuer?._id || issuer?.id; if (!issuerId) return;
      setSelectedIssuerForDocuments(issuer); setShowIssuerDocumentsModal(true); setIssuerDocuments([]); setIssuerDocumentsError(""); setIssuerDocumentsLoading(true);
      const resp = await apiService.getIssuerDocuments(issuerId);
      setIssuerDocuments(Array.isArray(resp.documents) ? resp.documents : []);
    } catch (error) { setIssuerDocumentsError(error.response?.data?.message || error.message || "Failed to load issuer documents"); setIssuerDocuments([]); }
    finally { setIssuerDocumentsLoading(false); }
  };

  const closeIssuerDocumentsModal = () => { setShowIssuerDocumentsModal(false); setSelectedIssuerForDocuments(null); setIssuerDocuments([]); setIssuerDocumentsError(""); };

  const handleViewIssuerDocument = async (doc) => {
    try {
      const issuerId = selectedIssuerForDocuments?._id || selectedIssuerForDocuments?.id;
      if (!issuerId || !doc?.attachmentName) return;
      const blob = await apiService.viewIssuerDocumentBlob(issuerId, doc.attachmentName);
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => { window.URL.revokeObjectURL(blobUrl); }, 60000);
    } catch (error) { showToast(error.response?.data?.message || error.message || "Failed to open document", "danger"); }
  };

  const handleDownloadIssuerDocument = async (doc) => {
    try {
      const issuerId = selectedIssuerForDocuments?._id || selectedIssuerForDocuments?.id;
      if (!issuerId || !doc?.attachmentName) return;
      const blob = await apiService.downloadIssuerDocumentBlob(issuerId, doc.attachmentName);
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = blobUrl; a.download = doc.originalname || doc.attachmentName || "document";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => { window.URL.revokeObjectURL(blobUrl); }, 60000);
    } catch (error) { showToast(error.response?.data?.message || error.message || "Failed to download document", "danger"); }
  };

  const applySorting = (array, sortOption) => {
    const sorted = [...array];
    switch (sortOption) {
      case "issuedDate-desc": sorted.sort((a, b) => new Date(b.issuedDate || b.createdAt || 0) - new Date(a.issuedDate || a.createdAt || 0)); break;
      case "issuedDate-asc": sorted.sort((a, b) => new Date(a.issuedDate || a.createdAt || 0) - new Date(b.issuedDate || b.createdAt || 0)); break;
      case "expiryDate-desc": sorted.sort((a, b) => new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0)); break;
      case "expiryDate-asc": sorted.sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0)); break;
      case "credentialType-asc": sorted.sort((a, b) => (a.credentialType || "").localeCompare(b.credentialType || "")); break;
      default: break;
    }
    return sorted;
  };

  const getUniqueCredentialTypes = () => { const types = new Set(credentials.map((cred) => cred.credentialType).filter(Boolean)); return Array.from(types).sort(); };

  // Revoke Modal handlers
  const openRevokeModal = () => { setShowRevokeModal(true); setRevokeError(""); setRevokeForm({ credentialId: "", rejectionReason: "" }); };
  const closeRevokeModal = () => { setShowRevokeModal(false); setRevokeError(""); setRevokeLoading(false); };
  const handleRevokeFormChange = (e) => { const { name, value } = e.target; setRevokeForm((prev) => ({ ...prev, [name]: value })); };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault(); setRevokeLoading(true); setRevokeError("");
    try {
      if (!revokeForm.credentialId) { setRevokeError("Please select a credential to revoke"); setRevokeLoading(false); return; }
      if (!revokeForm.rejectionReason.trim()) { setRevokeError("Please provide a rejection reason"); setRevokeLoading(false); return; }
      await apiService.Revoke_Credential(revokeForm.credentialId, revokeForm.rejectionReason);
      showToast("Credential revoked successfully!"); closeRevokeModal(); fetchCredentials();
    } catch (err) { setRevokeError(err?.message || "Failed to revoke credential"); }
    finally { setRevokeLoading(false); }
  };

  // Skills handlers - polo
  const handleAddSkill = () => { const trimmed = skillInput.trim(); if (!trimmed) return; if (skillsList.includes(trimmed)) { showToast('Skill already added.', 'danger'); return; } setSkillsList(prev => [...prev, trimmed]); setSkillInput(""); };
  const handleRemoveSkill = (skillToRemove) => { setSkillsList(prev => prev.filter(s => s !== skillToRemove)); };

  // Badge image handler - polo
  const handleBadgeImageChange = (e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => { setBadgeImageBase64(reader.result); setBadgeImagePreview(reader.result); }; reader.readAsDataURL(file); };

  const openCreateModal = () => { setShowCreateModal(true); setCreateError(""); setCreateForm({ credentialType: "", credentialName: "", description: "", metadata: "" }); setSkillsList([]); setSkillInput(""); setBadgeImageBase64(""); setBadgeImagePreview(""); };
  const closeCreateModal = () => { setShowCreateModal(false); setCreateError(""); setCreateLoading(false); setSkillsList([]); setSkillInput(""); setBadgeImageBase64(""); setBadgeImagePreview(""); };
  const handleCreateFormChange = (e) => { const { name, value } = e.target; setCreateForm((prev) => ({ ...prev, [name]: value })); };

  const handleCreateCredential = async (e) => {
    e.preventDefault(); setCreateLoading(true); setCreateError("");
    try {
      if (!createForm.credentialType || !createForm.credentialName) { setCreateError("Please fill in Credential Type and Name"); setCreateLoading(false); return; }
      const credentialId = `cred_${Date.now()}_${Math.random().toString(36).substring(2, 17)}`;
      await apiService.Create_CredentialTemplate({ id: credentialId, credentialType: createForm.credentialType, credentialName: createForm.credentialName, description: createForm.description, metadata: createForm.metadata, skills: skillsList, badgeImage: badgeImageBase64 });
      showToast("Credential Template created successfully!"); closeCreateModal(); fetchCredentials(); fetchTemplateOptions();
    } catch (err) { setCreateError(err?.message || "Failed to create credential"); }
    finally { setCreateLoading(false); }
  };

  // Issue Modal handlers
  const openIssueModal = async () => {
    try {
      setIssueError(""); setNoTemplateError("");
      const result = await apiService.Check_IssuerHasTemplates();
      if (!result?.hasTemplates) { setNoTemplateError("No Credential Template Yet To Issue. Please create a template first."); return; }
      setShowIssueModal(true); setIssueForm({ credentialId: "", recipientId: "", expiryDate: "" });
    } catch (err) { setNoTemplateError("Failed to validate credential templates. Please try again."); }
  };
  const closeIssueModal = () => { setShowIssueModal(false); setIssueError(""); setIssueLoading(false); };

  const handleIssueFormChange = async (e) => {
    const { name, value } = e.target;
    setIssueForm((prev) => ({ ...prev, [name]: value }));
    if (name === "credentialId") {
      try {
        setIssueError("");
        setIssueForm((prev) => ({ ...prev, credentialId: value, recipientId: "" }));
        if (!value) { setAvailableUsers([]); return; }
        const result = await apiService.Get_EligibleUsersForTemplate(value);
        const list = result?.eligibleUsers || [];
        setAvailableUsers(Array.isArray(list) ? list : []);
      } catch (err) { setAvailableUsers([]); setIssueError("Failed to load eligible users for this template."); }
    }
  };

  const handleIssueCredential = async (e) => {
    e.preventDefault(); setIssueLoading(true); setIssueError("");
    try {
      if (!issueForm.credentialId || !issueForm.recipientId) { setIssueError("Please select both a credential and a recipient"); setIssueLoading(false); return; }
      await apiService.Issue_Credential(issueForm.credentialId, issueForm.recipientId, issueForm.expiryDate);
      showToast("Credential issued successfully!"); closeIssueModal(); fetchCredentials();
    } catch (err) { setIssueError(err?.message || "Failed to issue credential"); }
    finally { setIssueLoading(false); }
  };

  // -------------------------------------------------------------------
  // CSS-CHANGE: Back button handler - polo
  // -------------------------------------------------------------------
  const goHome = () => setActiveView("home");

  // -------------------------------------------------------------------
  // LOADING / ERROR STATES
  // -------------------------------------------------------------------
  if (loading) return <div className="issuer-dashboard"><p>Loading credentials...</p></div>;
  if (error) return (
    <div className="issuer-dashboard">
      <p style={{ color: "#ff6b6b" }}><strong>Error loading credentials:</strong> {error}</p>
      <p style={{ color: "#999" }}>Make sure backend is running at http://localhost:4000</p>
    </div>
  );

  // -------------------------------------------------------------------
  // CSS-CHANGE: Card definitions for home view - polo
  // -------------------------------------------------------------------
  const navCards = [
    { id: "create", icon: "📝", title: "Create Template", desc: "Design and publish credential templates", color: "#667eea" },
    { id: "issue", icon: "🎓", title: "Issue Credential", desc: "Assign credentials to recipients", color: "#8b5cf6" },
    { id: "revoke", icon: "🚫", title: "Revoke Credential", desc: "Revoke issued credentials", color: "#ef4444" },
    { id: "history", icon: "📋", title: "Credential History", desc: "View blockchain audit trail", color: "#f59e0b" },
    ...(!isSubordinate ? [{ id: "subordinates", icon: "🏢", title: "Subordinates", desc: "Manage subordinate issuers & logs", color: "#22c55e" }] : []),
  ];

  // -------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------
  return (
    <div className="issuer-dashboard">
      {/* Toast */}
      {toast.show && (
        <div className={`issuer-toast issuer-toast--${toast.type}`}>
          <div className="issuer-toast-icon">{toast.type === "success" ? "✓" : "✕"}</div>
          <div className="issuer-toast-message">{toast.message}</div>
        </div>
      )}

      {/* ============================================================
          HOME VIEW — Card Grid Navigation
          ============================================================ */}
      {activeView === "home" && (
        <>
          <div className="issuer-home-header">
            <h2>Issuer Dashboard</h2>
            <p className="issuer-home-subtitle">Welcome back, {displayName}</p>
          </div>

          {/* Stats row */}
          <div className="issuer-stats-row">
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{templateOptions.length}</span>
              <span className="issuer-stat-label">Templates</span>
            </div>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{credentials.length}</span>
              <span className="issuer-stat-label">Issued</span>
            </div>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{credentials.filter(c => c.status === "revoked").length}</span>
              <span className="issuer-stat-label">Revoked</span>
            </div>
            {!isSubordinate && (
              <div className="issuer-stat-card">
                <span className="issuer-stat-num">{subordinateDirectory.length}</span>
                <span className="issuer-stat-label">Subordinates</span>
              </div>
            )}
          </div>

          {/* Card grid */}
          <div className="issuer-nav-grid">
            {navCards.map((card) => (
              <button
                key={card.id}
                className="issuer-nav-card"
                onClick={() => card.id === "history" ? navigate("/issuer/history") : setActiveView(card.id)}
              >
                <div className="nav-card-icon" style={{ background: `${card.color}22`, color: card.color, borderColor: `${card.color}44` }}>{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <span className="nav-card-arrow">→</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ============================================================
          CREATE VIEW — Form + Templates Table
          ============================================================ */}
      {activeView === "create" && (
        <>
          <button className="btn-back-home" onClick={goHome}>← Back to Dashboard</button>
          <h2>Create Credential Templates</h2>

          <div style={{ margin: "20px 0" }}>
            <button onClick={openCreateModal} className="action-btn create-btn">+ Create New Template</button>
          </div>

          {/* Templates table */}
          <div className="table-container">
            <h3 style={{ marginBottom: 12 }}>Your Templates ({templateOptions.length})</h3>
            {templateOptions.length === 0 ? (
              <div className="no-results"><p>📭 No credential templates found. Create your first template!</p></div>
            ) : (
              <table className="template-table">
                <thead><tr><th>Template ID</th><th>Type</th><th>Name</th><th>Description</th><th>Skills</th><th>Created Date</th></tr></thead>
                <tbody>
                  {templateOptions.map((template) => {
                    const id = template.id || template._id;
                    return (
                      <tr key={id}>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{id || "N/A"}</td>
                        <td>{template.credentialType || "N/A"}</td>
                        <td>{template.credentialName || "N/A"}</td>
                        <td>{template.description || "—"}</td>
                        <td>{Array.isArray(template.skills) && template.skills.length > 0 ? template.skills.join(", ") : "—"}</td>
                        <td>{template.createdAt ? new Date(template.createdAt).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ============================================================
          ISSUE VIEW — Issue Form + Issued Credentials Table
          ============================================================ */}
      {activeView === "issue" && (
        <>
          <button className="btn-back-home" onClick={goHome}>← Back to Dashboard</button>
          <h2>Issue Credentials</h2>

          <div style={{ margin: "20px 0" }}>
            <button onClick={openIssueModal} className="action-btn issue-btn">+ Issue Credential</button>
            {noTemplateError && <div className="no-template-warning">⚠️ {noTemplateError}</div>}
          </div>

          {/* Filter Section */}
          <div className="filter-section">
            <h3>🔍 Filter & Sort Credentials</h3>
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="sortBy">Sort By:</label>
                <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                  <option value="issuedDate-desc">📅 Most Recent</option>
                  <option value="issuedDate-asc">📅 Oldest</option>
                  <option value="expiryDate-desc">⏰ Latest Expiry</option>
                  <option value="expiryDate-asc">⏰ Expiring Soonest</option>
                  <option value="credentialType-asc">🏆 Type (A-Z)</option>
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="filterType">Type:</label>
                <select id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
                  <option value="all">All Types</option>
                  {getUniqueCredentialTypes().map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="filterStatus">Status:</label>
                <select id="filterStatus" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
                  <option value="all">All Status</option>
                  <option value="active">✅ Active</option>
                  <option value="revoked">❌ Revoked</option>
                  <option value="expired">⚠️ Expired</option>
                </select>
              </div>
            </div>
            <div className="results-info">Showing <strong>{filteredCredentials.length}</strong> of <strong>{credentials.length}</strong> credentials</div>
          </div>

          {/* Issued credentials table */}
          {filteredCredentials.length === 0 ? (
            <div className="no-results"><p>{credentials.length === 0 ? "📭 No credentials found. Issue your first credential!" : "❌ No credentials match your filters."}</p></div>
          ) : (
            <div className="table-container">
              <table className="template-table">
                <thead><tr><th>Credential ID</th><th>Type</th><th>Name</th><th>Holder Name</th><th>Description</th><th>Created Date</th><th>Status</th><th>Expiry Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredCredentials.map((credential) => {
                    const blockchainId = credential.blockchainId || credential.id;
                    const isRevokable = credential.status === "issued" || credential.status === "active" || !credential.status;
                    return (
                      <tr key={blockchainId}>
                        <td>{blockchainId || "N/A"}</td>
                        <td>{credential.credentialType || "N/A"}</td>
                        <td>{credential.credentialName || "N/A"}</td>
                        <td>{credential.holderName || credential.holderID || "N/A"}</td>
                        <td>{credential.description || "N/A"}</td>
                        <td>{credential.issuedDate ? new Date(credential.issuedDate).toLocaleDateString() : "N/A"}</td>
                        <td><span className={`status-badge status-${credential.status || "active"}`}>{credential.status || "active"}</span></td>
                        <td>{credential.expiryDate ? new Date(credential.expiryDate).toLocaleDateString() : "N/A"}</td>
                        <td>
                          {isRevokable ? (
                            <button type="button" onClick={() => { setRevokeForm({ credentialId: blockchainId, rejectionReason: "" }); setRevokeError(""); setShowRevokeModal(true); }} className="action-btn revoke-btn" style={{ padding: "6px 10px", fontSize: "12px" }}>Revoke</button>
                          ) : (
                            <span className="action-text">{credential.status === "revoked" ? "Revoked" : "Expired"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ============================================================
          REVOKE VIEW — Revoke form + Revokable credentials list
          ============================================================ */}
      {activeView === "revoke" && (
        <>
          <button className="btn-back-home" onClick={goHome}>← Back to Dashboard</button>
          <h2>Revoke Credentials</h2>

          <div style={{ margin: "20px 0" }}>
            <button onClick={openRevokeModal} className="action-btn revoke-btn">🚫 Revoke a Credential</button>
          </div>

          {/* Revokable credentials list */}
          <div className="table-container">
            <h3 style={{ marginBottom: 12 }}>Issued Credentials ({credentials.filter(c => c.status === "issued" || c.status === "active" || !c.status).length} revokable)</h3>
            {credentials.length === 0 ? (
              <div className="no-results"><p>📭 No issued credentials found.</p></div>
            ) : (
              <table className="template-table">
                <thead><tr><th>Credential ID</th><th>Name</th><th>Holder</th><th>Status</th><th>Issued Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {credentials.map((credential) => {
                    const blockchainId = credential.blockchainId || credential.id;
                    const isRevokable = credential.status === "issued" || credential.status === "active" || !credential.status;
                    return (
                      <tr key={blockchainId}>
                        <td>{blockchainId || "N/A"}</td>
                        <td>{credential.credentialName || "N/A"}</td>
                        <td>{credential.holderName || credential.holderID || "N/A"}</td>
                        <td><span className={`status-badge status-${credential.status || "active"}`}>{credential.status || "active"}</span></td>
                        <td>{credential.issuedDate ? new Date(credential.issuedDate).toLocaleDateString() : "N/A"}</td>
                        <td>
                          {isRevokable ? (
                            <button type="button" onClick={() => { setRevokeForm({ credentialId: blockchainId, rejectionReason: "" }); setRevokeError(""); setShowRevokeModal(true); }} className="action-btn revoke-btn" style={{ padding: "6px 10px", fontSize: "12px" }}>Revoke</button>
                          ) : (
                            <span className="action-text">{credential.status === "revoked" ? "Revoked" : "Expired"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ============================================================
          SUBORDINATES VIEW — My Subordinates + Decision Logs (root-only)
          ============================================================ */}
      {activeView === "subordinates" && !isSubordinate && (
        <>
          <button className="btn-back-home" onClick={goHome}>← Back to Dashboard</button>
          <h2>Subordinate Management</h2>

          {/* My Subordinates */}
          <div className="table-container" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>My Subordinates</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="subordinateDirectoryFilter">View:</label>
                <select id="subordinateDirectoryFilter" value={subordinateDirectoryFilter} onChange={(e) => setSubordinateDirectoryFilter(e.target.value)}>
                  <option value="all">All Subordinates</option>
                  <option value="pending">Pending Root Approval</option>
                  <option value="root_approved">Root Approved</option>
                  <option value="root_rejected">Root Rejected</option>
                  <option value="approved">Fully Approved</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            {subordinateDirectoryLoading ? <div className="no-results"><p>Loading subordinate directory...</p></div>
            : subordinateDirectoryError ? <div className="no-results"><p style={{ color: "#ff6b6b" }}>{subordinateDirectoryError}</p></div>
            : subordinateDirectory.length === 0 ? <div className="no-results"><p>No subordinate issuers found for this filter.</p></div>
            : (
              <table className="template-table">
                <thead><tr><th>Issuer ID</th><th>Org Name</th><th>Email</th><th>Category</th><th>Root Approval</th><th>Root Approved At</th><th>Overall Status</th><th>Created At</th><th>Documents</th><th>Actions</th></tr></thead>
                <tbody>
                  {subordinateDirectory.map((issuer) => {
                    const issuerId = issuer._id || issuer.id;
                    const isPendingRootApproval = (issuer.rootApprovalStatus || "pending") === "pending";
                    return (
                      <tr key={issuerId}>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{issuerId}</td>
                        <td>{issuer.orgName || "N/A"}</td>
                        <td>{issuer.email || "N/A"}</td>
                        <td>{issuer.category || "N/A"}</td>
                        <td><span className={issuer.rootApprovalStatus === "approved" ? "badge green" : issuer.rootApprovalStatus === "rejected" ? "badge red" : "badge purple"}>{issuer.rootApprovalStatus || "pending"}</span></td>
                        <td>{issuer.rootApprovalStatus === "approved" ? (issuer.rootApprovedAt ? new Date(issuer.rootApprovedAt).toLocaleString() : "N/A") : issuer.rootApprovalStatus === "rejected" ? "Rejected by Root" : "Pending"}</td>
                        <td><span className={issuer.status === "approved" ? "badge green" : issuer.status === "disabled" ? "badge gray" : issuer.status === "rejected" ? "badge red" : "badge purple"}>{issuer.status || "pending"}</span></td>
                        <td>{issuer.createdAt ? new Date(issuer.createdAt).toLocaleString() : "N/A"}</td>
                        <td><button type="button" onClick={() => openIssuerDocumentsModal(issuer)} className="action-btn" style={{ padding: "6px 10px", fontSize: "12px", background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(255,255,255,0.18)" }}>See Documents</button></td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {isPendingRootApproval ? (
                            <>
                              <button type="button" onClick={() => handleRootApproveSubordinate(issuerId)} className="action-btn" style={{ padding: "6px 10px", fontSize: "12px", background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(255,255,255,0.18)" }}>Approve</button>
                              <button type="button" onClick={() => openRejectSubordinateModal(issuer)} className="action-btn" style={{ padding: "6px 10px", fontSize: "12px", background: "rgba(255,107,107,0.12)", color: "#ff6b6b", border: "1px solid rgba(255,255,255,0.18)" }}>Reject</button>
                            </>
                          ) : <span style={{ opacity: 0.7 }}>No actions</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Subordinate Decision Logs */}
          <div className="table-container" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Subordinate Decision Logs</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="rootSubordinateLogFilter">View:</label>
                <select id="rootSubordinateLogFilter" value={rootSubordinateLogFilter} onChange={(e) => setRootSubordinateLogFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {rootSubordinateLogsLoading ? <div className="no-results"><p>Loading subordinate decision logs...</p></div>
            : rootSubordinateLogsError ? <div className="no-results"><p style={{ color: "#ff6b6b" }}>{rootSubordinateLogsError}</p></div>
            : rootSubordinateLogs.length === 0 ? <div className="no-results"><p>No subordinate decision logs found.</p></div>
            : (
              <table className="template-table">
                <thead><tr><th>Subordinate Issuer ID</th><th>Subordinate Email</th><th>Organization Name</th><th>Decision</th><th>Reason</th><th>Performed By MSP</th><th>Timestamp</th><th>Tx ID</th></tr></thead>
                <tbody>
                  {rootSubordinateLogs.map((log, index) => {
                    const isApproved = String(log.decision || "").toLowerCase() === "approved";
                    return (
                      <tr key={log.txId || `${log.issuerId || "issuer"}-${index}`}>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{log.issuerId || "N/A"}</td>
                        <td>{log.issuerEmail || "N/A"}</td>
                        <td>{log.orgName || "N/A"}</td>
                        <td><span className={isApproved ? "badge green" : "badge red"} style={{ textTransform: "capitalize" }}>{log.decision || "N/A"}</span></td>
                        <td>{log.reason || "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{log.performedByMSP || "N/A"}</td>
                        <td>{log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{log.txId ? `${String(log.txId).slice(0, 18)}...` : "N/A"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ============================================================
          ALL MODALS (preserved exactly from original)
          ============================================================ */}

      {/* Create Credential Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3>Create Credential Template</h3>
              <button type="button" className="modal-close" onClick={closeCreateModal}>✕</button>
            </div>
            <form onSubmit={handleCreateCredential}>
              <div className="modal-two-col">
                <div className="form-group"><label>Credential Type <span className="required-star">*</span></label><input type="text" name="credentialType" value={createForm.credentialType} onChange={handleCreateFormChange} placeholder="e.g. Certificate, ID, Award" required /></div>
                <div className="form-group"><label>Credential Name <span className="required-star">*</span></label><input type="text" name="credentialName" value={createForm.credentialName} onChange={handleCreateFormChange} placeholder="e.g. Company Staff Card" required /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea name="description" value={createForm.description} onChange={handleCreateFormChange} rows={2} placeholder="Describe the credential's purpose..." /></div>
              <div className="form-group"><label>Metadata <span className="form-label-hint">(optional)</span></label><input type="text" name="metadata" value={createForm.metadata} onChange={handleCreateFormChange} placeholder="e.g. Level: Manager" /></div>
              <div className="form-group">
                <label>Skills <span className="form-label-hint">(optional — recipients will earn these)</span></label>
                <div className="skills-input-row"><input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); }}} placeholder="e.g. Python, Project Management" /><button type="button" className="add-skill-btn" onClick={handleAddSkill}>+ Add</button></div>
                {skillsList.length > 0 && <div className="skills-tags">{skillsList.map((skill, idx) => <span key={idx} className="skill-tag">{skill}<button type="button" onClick={() => handleRemoveSkill(skill)}>×</button></span>)}</div>}
              </div>
              <div className="form-group">
                <label>Badge Image <span className="form-label-hint">(optional)</span></label>
                <input type="file" accept="image/png, image/jpeg, image/gif" onChange={handleBadgeImageChange} className="file-input" />
                {badgeImagePreview && <div className="badge-preview"><img src={badgeImagePreview} alt="Badge preview" /><button type="button" className="badge-remove-btn" onClick={() => { setBadgeImageBase64(""); setBadgeImagePreview(""); }}>✕ Remove</button></div>}
              </div>
              {createError && <div className="form-error">{createError}</div>}
              <div className="form-actions"><button type="submit" className="action-btn" disabled={createLoading}>{createLoading ? "Creating..." : "Create Template"}</button><button type="button" onClick={closeCreateModal} className="action-btn btn-cancel">Cancel</button></div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeCreateModal}></div>
        </div>
      )}

      {/* Issue Credential Modal */}
      {showIssueModal && (
        <div className="modal-overlay">
          <div className="modal modal-wide">
            <div className="modal-header"><h3>Issue Credential</h3><button type="button" className="modal-close" onClick={closeIssueModal}>✕</button></div>
            <div className="issue-steps">
              <div className={`issue-step ${issueForm.credentialId ? "step-done" : "step-active"}`}><span className="step-num">1</span><span className="step-label">Select Template</span></div>
              <div className="step-connector" />
              <div className={`issue-step ${issueForm.credentialId && issueForm.recipientId ? "step-done" : issueForm.credentialId ? "step-active" : "step-inactive"}`}><span className="step-num">2</span><span className="step-label">Select Recipient</span></div>
              <div className="step-connector" />
              <div className={`issue-step ${issueForm.recipientId ? "step-active" : "step-inactive"}`}><span className="step-num">3</span><span className="step-label">Set Expiry</span></div>
            </div>
            <form onSubmit={handleIssueCredential}>
              <div className="form-group"><label>Credential Template <span className="required-star">*</span></label><select name="credentialId" value={issueForm.credentialId} onChange={handleIssueFormChange} required><option value="">— Select a template —</option>{templateOptions.map((cred) => <option key={cred.id || cred._id} value={cred.id || cred._id}>{cred.credentialName} ({cred.credentialType})</option>)}</select></div>
              <div className="form-group"><label>Recipient <span className="required-star">*</span></label><select name="recipientId" value={issueForm.recipientId} onChange={handleIssueFormChange} required disabled={!issueForm.credentialId}><option value="">{issueForm.credentialId ? "— Select a recipient —" : "Select a template first"}</option>{availableUsers.map((user) => <option key={user._id || user.id} value={user._id || user.id}>{user.name || user.username || user.email}{user.email && ` (${user.email})`}</option>)}</select></div>
              <div className="form-group"><label>Expiry Date <span className="form-label-hint">(optional)</span></label><input type="date" name="expiryDate" value={issueForm.expiryDate} onChange={handleIssueFormChange} min={new Date().toISOString().split("T")[0]} /></div>
              {issueError && <div className="form-error">{issueError}</div>}
              <div className="form-actions"><button type="submit" className="action-btn issue-btn" disabled={issueLoading}>{issueLoading ? "Issuing..." : "Issue Credential"}</button><button type="button" onClick={closeIssueModal} className="action-btn btn-cancel">Cancel</button></div>
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
                <label>Credential:</label>
                {revokeForm.credentialId ? (
                  <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontFamily: "monospace", fontSize: "13px" }}>
                    {(() => { const found = credentials.find(c => (c.blockchainId || c.id) === revokeForm.credentialId); return found ? `${found.credentialName || "Untitled"} (${found.credentialType || "N/A"}) – ${revokeForm.credentialId.slice(0, 20)}…` : revokeForm.credentialId; })()}
                  </div>
                ) : (
                  <select name="credentialId" value={revokeForm.credentialId} onChange={handleRevokeFormChange} required>
                    <option value="">-- Select issued credential --</option>
                    {credentials.filter((c) => c.status === "issued" || !c.status || c.status === "active").map((cred) => { const blockchainId = cred.blockchainId || cred.id; return <option key={blockchainId} value={blockchainId}>{cred.credentialName || "Untitled"} ({cred.credentialType || "N/A"}) – {(blockchainId || "").slice(0, 16)}…</option>; })}
                  </select>
                )}
              </div>
              <div className="form-group"><label>Rejection Reason:</label><textarea name="rejectionReason" value={revokeForm.rejectionReason} onChange={handleRevokeFormChange} rows={3} placeholder="State the reason for revoking this credential..." required /></div>
              {revokeError && <div className="form-error">{revokeError}</div>}
              <div className="form-actions"><button type="submit" className="action-btn revoke-btn" disabled={revokeLoading}>{revokeLoading ? "Revoking..." : "Revoke"}</button><button type="button" onClick={closeRevokeModal} className="action-btn btn-cancel">Cancel</button></div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeRevokeModal}></div>
        </div>
      )}

      {/* Submitted Documents Modal */}
      {showIssuerDocumentsModal && ReactDOM.createPortal(
        <div onClick={closeIssuerDocumentsModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(900px, 95vw)", maxHeight: "85vh", overflow: "auto", background: "#101018", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)", padding: "18px", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div><h3 style={{ margin: 0 }}>Submitted Documents</h3><div style={{ fontSize: "13px", opacity: 0.85, marginTop: "6px" }}><div><strong>Issuer:</strong> {selectedIssuerForDocuments?.orgName || "N/A"}</div><div><strong>Email:</strong> {selectedIssuerForDocuments?.email || "N/A"}</div></div></div>
              <button onClick={closeIssuerDocumentsModal} type="button" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: "8px", padding: "8px 10px", cursor: "pointer" }}>✕ Close</button>
            </div>
            {issuerDocumentsLoading ? <div style={{ padding: "16px", opacity: 0.9 }}>Loading submitted documents...</div>
            : issuerDocumentsError ? <div style={{ padding: "12px", background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,0,0,0.25)", borderRadius: "10px", color: "#ffd2d2" }}>❌ {issuerDocumentsError}</div>
            : issuerDocuments.length > 0 ? (
              <div className="table-wrapper"><table className="template-table"><thead><tr><th>Doc Type</th><th>File Name</th><th>MIME Type</th><th>Size</th><th>Actions</th></tr></thead><tbody>
                {issuerDocuments.map((doc, idx) => (
                  <tr key={doc.attachmentName || idx}>
                    <td>{doc.docType || "N/A"}</td><td>{doc.originalname || "N/A"}</td><td>{doc.mimetype || "N/A"}</td>
                    <td>{typeof doc.size === "number" ? `${(doc.size / 1024).toFixed(1)} KB` : "N/A"}</td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => handleViewIssuerDocument(doc)} className="action-btn" style={{ padding: "6px 10px", fontSize: "12px", background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(255,255,255,0.18)" }}>View</button>
                      <button type="button" onClick={() => handleDownloadIssuerDocument(doc)} className="action-btn" style={{ padding: "6px 10px", fontSize: "12px", background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(255,255,255,0.18)" }}>Download</button>
                    </td>
                  </tr>
                ))}
              </tbody></table></div>
            ) : <div style={{ padding: "16px", opacity: 0.9 }}>No submitted documents found.</div>}
          </div>
        </div>, document.body
      )}

      {/* Reject Subordinate Modal */}
      {showRejectSubordinateModal && ReactDOM.createPortal(
        <div onClick={closeRejectSubordinateModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 95vw)", background: "#101018", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)", padding: "18px", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", color: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Reject Subordinate Issuer</h3>
            <p style={{ opacity: 0.85, marginTop: "6px" }}>Please provide a rejection reason.</p>
            <form onSubmit={submitRejectSubordinate}>
              <textarea value={rejectSubordinateReason} onChange={(e) => setRejectSubordinateReason(e.target.value)} placeholder="Enter rejection reason..." rows={4} style={{ width: "100%", borderRadius: "10px", padding: "10px", marginTop: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              {rejectSubordinateError && <div style={{ color: "#ff6b6b", marginTop: "10px" }}>❌ {rejectSubordinateError}</div>}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "14px" }}>
                <button type="button" onClick={closeRejectSubordinateModal} disabled={rejectSubordinateLoading} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#fff", cursor: rejectSubordinateLoading ? "not-allowed" : "pointer", opacity: rejectSubordinateLoading ? 0.65 : 1, fontWeight: 700 }}>Cancel</button>
                <button type="submit" disabled={rejectSubordinateLoading} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,107,107,0.12)", color: "#ff6b6b", cursor: rejectSubordinateLoading ? "not-allowed" : "pointer", opacity: rejectSubordinateLoading ? 0.65 : 1, fontWeight: 800 }}>{rejectSubordinateLoading ? "Rejecting..." : "Confirm Reject"}</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
}