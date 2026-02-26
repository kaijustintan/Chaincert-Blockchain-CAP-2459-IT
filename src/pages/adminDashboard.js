// Admin dashboard for credential management
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "../styles/adminDashboard.css";
import apiService from "../services/apiService";

export default function AdminDashboard() {
  const [tab, setTab] = useState("credentials");
  const [pendingIssuers, setPendingIssuers] = useState([]);
  const [approvedIssuers, setApprovedIssuers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [issuerFilter, setIssuerFilter] = useState("approved");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("active");

  const [logCategory, setLogCategory] = useState("verification");
  const [verificationLogs, setVerificationLogs] = useState([]);
  const [verificationLogsError, setVerificationLogsError] = useState(null);
  const [statusLogs, setStatusLogs] = useState([]);
  const [statusLogsError, setStatusLogsError] = useState(null);

  // NEW: Admin credentials view filters + data (global across issuers)
  const [adminCredIssuerFilter, setAdminCredIssuerFilter] = useState("all"); // 'all' or issuerId
  const [adminCredTypeFilter, setAdminCredTypeFilter] = useState("all"); // 'all' | 'issued' | 'templates'
  const [adminCredentials, setAdminCredentials] = useState([]);
  const [adminCredentialsLoading, setAdminCredentialsLoading] = useState(false);
  const [adminCredentialsError, setAdminCredentialsError] = useState(null);

  // ✅ NEW: local search (frontend-only) for admin credentials table
  const [adminCredSearchField, setAdminCredSearchField] = useState("holderName"); // 'holderName' | 'holderID' | 'credentialId' | 'credentialName'
  const [adminCredSearchQuery, setAdminCredSearchQuery] = useState("");
  const [filteredAdminCredentials, setFilteredAdminCredentials] = useState([]);

  // ✅ NEW: modal state for viewing a specific credential's blockchain history
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCredentialRow, setSelectedCredentialRow] = useState(null);
  const [credentialHistory, setCredentialHistory] = useState([]);
  const [credentialHistoryLoading, setCredentialHistoryLoading] = useState(false);
  const [credentialHistoryError, setCredentialHistoryError] = useState(null);

  // ✅ NEW: Reject Issuer modal state (required rejection reason)
const [showRejectIssuerModal, setShowRejectIssuerModal] = useState(false);
const [rejectIssuerId, setRejectIssuerId] = useState(null);
const [rejectReason, setRejectReason] = useState("");
const [rejectIssuerError, setRejectIssuerError] = useState("");
const [rejectIssuerLoading, setRejectIssuerLoading] = useState(false);

// ADDED 
const [rejectedIssuers, setRejectedIssuers] = useState([]);
const [disabledIssuers, setDisabledIssuers] = useState([]);

// ✅ NEW: Disable/Enable Issuer modal state (required reason)
const [showIssuerStatusModal, setShowIssuerStatusModal] = useState(false);
const [issuerStatusTarget, setIssuerStatusTarget] = useState(null); // issuer row object
const [issuerStatusAction, setIssuerStatusAction] = useState("disable"); // 'disable' | 'enable'
const [issuerStatusReason, setIssuerStatusReason] = useState("");
const [issuerStatusError, setIssuerStatusError] = useState("");
const [issuerStatusLoading, setIssuerStatusLoading] = useState(false);

// ✅ NEW: Disable/Enable User modal state (required reason)
const [showUserStatusModal, setShowUserStatusModal] = useState(false);
const [userStatusTarget, setUserStatusTarget] = useState(null);
const [userStatusAction, setUserStatusAction] = useState("disable");
const [userStatusReason, setUserStatusReason] = useState("");
const [userStatusError, setUserStatusError] = useState("");
const [userStatusLoading, setUserStatusLoading] = useState(false);
  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------
  const formatTimestamp = (ts) => {
    if (!ts) return "N/A";
    try {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return ts;
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  const getVisibleIssuers = () => {
    if (issuerFilter === "approved") return approvedIssuers;
    if (issuerFilter === "pending") return pendingIssuers;
    if (issuerFilter === "rejected") return rejectedIssuers;
    if (issuerFilter === "disabled") return disabledIssuers;
    return [];
  };

  const visibleIssuers = getVisibleIssuers();

  const getVisibleUsers = () => {
    if (userFilter === "disabled") return users.filter((u) => u.isActive === false);
    if (userFilter === "active") return users.filter((u) => u.isActive !== false);
    return users;
  };

  const visibleUsers = getVisibleUsers();

  const credentialIssuerOptions = [
    ...approvedIssuers,
    ...disabledIssuers
  ].filter((issuer, index, arr) => {
    const id = issuer._id || issuer.id;
    return id && arr.findIndex((x) => (x._id || x.id) === id) === index;
  });

  const getHistoryActionLabel = (entry, idx) => {
    if (!entry) return "Unknown";
    if (entry.isDelete) return "Deleted";

    const v = entry.value || {};
    if (v.status === "revoked" || v.revokedAt) return "Revoked";
    if (v.assignedDate && v.holderID) return "Issued";
    if (v.isTemplate === true || v.holderID === "") return "Created Template";

    if (idx === credentialHistory.length - 1) return "Created";
    return "Updated";
  };

  const openHistoryModalForRow = async (row) => {
    const typeLower = String(row?.type || "").toLowerCase();
    if (!row || typeLower !== "issued") return;

    try {
      // open modal immediately (even before API finishes)
      setSelectedCredentialRow(row);
      setShowHistoryModal(true);

      setCredentialHistory([]);
      setCredentialHistoryError(null);
      setCredentialHistoryLoading(true);

      const resp = await apiService.Get_CredentialHistoryById(row.credentialId);

      const list = Array.isArray(resp.history) ? resp.history : [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      setCredentialHistory(sorted);
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to load credential history";
      setCredentialHistoryError(msg);
      setCredentialHistory([]);
    } finally {
      setCredentialHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedCredentialRow(null);
    setCredentialHistory([]);
    setCredentialHistoryError(null);
    setCredentialHistoryLoading(false);
  };

  const closeRejectIssuerModal = () => {
  if (rejectIssuerLoading) return; // prevent closing while submitting
  setShowRejectIssuerModal(false);
  setRejectIssuerId(null);
  setRejectReason("");
  setRejectIssuerError("");
};

const submitRejectIssuer = async (e) => {
  e.preventDefault();

  const trimmed = rejectReason.trim();
  if (!trimmed) {
    setRejectIssuerError("Rejection reason is required.");
    return;
  }

  try {
    setRejectIssuerLoading(true);
    setRejectIssuerError("");

    await apiService.rejectIssuer(rejectIssuerId, trimmed);

    setMessage("✅ Issuer rejected successfully!");
    closeRejectIssuerModal();

    await fetchPendingIssuers();
    await fetchApprovedIssuers();
    await fetchRejectedIssuers();
    await fetchDisabledIssuers();
  } catch (error) {
    console.error("Error rejecting issuer:", error);
    setRejectIssuerError(
      error.response?.data?.message || "❌ Failed to reject issuer"
    );
  } finally {
    setRejectIssuerLoading(false);
  }
};

const openIssuerStatusModal = (issuer, action) => {
  setIssuerStatusTarget(issuer);
  setIssuerStatusAction(action); // 'disable' or 'enable'
  setIssuerStatusReason("");
  setIssuerStatusError("");
  setShowIssuerStatusModal(true);
};

const closeIssuerStatusModal = () => {
  if (issuerStatusLoading) return;
  setShowIssuerStatusModal(false);
  setIssuerStatusTarget(null);
  setIssuerStatusAction("disable");
  setIssuerStatusReason("");
  setIssuerStatusError("");
};

const submitIssuerStatusChange = async (e) => {
  e.preventDefault();

  const trimmed = issuerStatusReason.trim();
  if (!trimmed) {
    setIssuerStatusError("Reason is required.");
    return;
  }

  const issuerId = issuerStatusTarget?._id || issuerStatusTarget?.id;
  if (!issuerId) {
    setIssuerStatusError("Issuer ID not found.");
    return;
  }

  try {
    setIssuerStatusLoading(true);
    setIssuerStatusError("");

    if (issuerStatusAction === "disable") {
      await apiService.disableIssuer(issuerId, trimmed);
      setMessage("✅ Issuer disabled successfully!");
    } else {
      await apiService.enableIssuer(issuerId, trimmed);
      setMessage("✅ Issuer enabled successfully!");
    }

    closeIssuerStatusModal();

    // refresh lists so status reflects immediately
    await fetchApprovedIssuers();
    await fetchPendingIssuers();
    await fetchRejectedIssuers();
    await fetchDisabledIssuers();
  } catch (error) {
    console.error("Error updating issuer status:", error);
    setIssuerStatusError(
      error.response?.data?.message ||
        error.response?.data?.error ||
        "❌ Failed to update issuer status"
    );
  } finally {
    setIssuerStatusLoading(false);
  }
};



  // -------------------------------------------------------------------
  // ISSUERS
  // -------------------------------------------------------------------
  const fetchPendingIssuers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingIssuers();
      const pending = Array.isArray(response.data) ? response.data : [];
      setPendingIssuers(pending);
      setMessage("");
    } catch (error) {
      console.error("Error fetching pending issuers:", error);
      setMessage("Failed to load pending issuers");
      setPendingIssuers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedIssuers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getApprovedIssuers();
      const approved = Array.isArray(response.data) ? response.data : [];
      setApprovedIssuers(approved);
    } catch (error) {
      console.error("Error fetching approved issuers:", error);
      setApprovedIssuers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRejectedIssuers = async () => {
  try {
    setLoading(true);
    const response = await apiService.getRejectedIssuers();
    const rejected = Array.isArray(response.data) ? response.data : [];
    setRejectedIssuers(rejected);
  } catch (error) {
    console.error("Error fetching rejected issuers:", error);
    setRejectedIssuers([]);
  } finally {
    setLoading(false);
  }
};

  const fetchDisabledIssuers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDisabledIssuers();
      const disabled = Array.isArray(response.data) ? response.data : [];
      setDisabledIssuers(disabled);
    } catch (error) {
      console.error("Error fetching disabled issuers:", error);
      setDisabledIssuers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveIssuer = async (issuerId) => {
    try {
      await apiService.approveIssuer(issuerId);
      setMessage("✅ Issuer approved successfully!");
      await fetchPendingIssuers();
      await fetchApprovedIssuers();
    } catch (error) {
      console.error("Error approving issuer:", error);
      setMessage("❌ Failed to approve issuer");
    }
  };

  const handleRejectIssuer = async (issuerId) => {
  setRejectIssuerId(issuerId);
  setRejectReason("");
  setRejectIssuerError("");
  setShowRejectIssuerModal(true);
};

  // -------------------------------------------------------------------
  // USERS
  // -------------------------------------------------------------------
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await apiService.getAllUsers();
      const list = Array.isArray(data) ? data : [];
      setUsers(list);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };


  const openUserStatusModal = (user, action) => {
    setUserStatusTarget(user);
    setUserStatusAction(action);
    setUserStatusReason("");
    setUserStatusError("");
    setShowUserStatusModal(true);
  };

  const closeUserStatusModal = () => {
    if (userStatusLoading) return;
    setShowUserStatusModal(false);
    setUserStatusTarget(null);
    setUserStatusAction("disable");
    setUserStatusReason("");
    setUserStatusError("");
  };

  const submitUserStatusChange = async (e) => {
    e.preventDefault();

    const trimmed = userStatusReason.trim();
    if (!trimmed) {
      setUserStatusError("Reason is required.");
      return;
    }

    const userId = userStatusTarget?._id || userStatusTarget?.id;
    if (!userId) {
      setUserStatusError("User ID not found.");
      return;
    }

    try {
      setUserStatusLoading(true);
      setUserStatusError("");

      if (userStatusAction === "disable") {
        await apiService.disableUser(userId, trimmed);
        setMessage("✅ User disabled successfully!");
      } else {
        await apiService.enableUser(userId, trimmed);
        setMessage("✅ User enabled successfully!");
      }

      closeUserStatusModal();
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      setUserStatusError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          '❌ Failed to update user status'
      );
    } finally {
      setUserStatusLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // CREDENTIALS / VERIFICATIONS (OLD, PER-CREDENTIAL LIST)
  // -------------------------------------------------------------------
  const fetchCredentials = async () => {
    try {
      setCredentialsLoading(true);
      const data = await apiService.getAllCredentials();
      setCredentials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      setCredentials([]);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const fetchVerifications = async () => {
    try {
      setVerificationsLoading(true);
      const allCredentials = await apiService.getAllCredentials();
      const credentialsList = Array.isArray(allCredentials)
        ? allCredentials
        : [];

      const verificationData = credentialsList.map((cred) => ({
        id: cred.id,
        requester: cred.holderID || "Unknown",
        credential: cred.credentialType || "N/A",
        status: cred.verified ? "Approved" : "Pending",
        submitted: cred.issueDate || cred.timestamp || "N/A",
      }));

      setVerifications(verificationData);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      setVerifications([]);
    } finally {
      setVerificationsLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // NEW: ADMIN GLOBAL CREDENTIALS VIEW (across all issuers)
  // -------------------------------------------------------------------
  const fetchAdminCredentials = async () => {
    try {
      setAdminCredentialsLoading(true);
      setAdminCredentialsError(null);

      const params = {};
      if (adminCredIssuerFilter !== "all") {
        params.issuerId = adminCredIssuerFilter;
      }
      if (adminCredTypeFilter === "issued") {
        params.type = "issued";
      } else if (adminCredTypeFilter === "templates") {
        params.type = "templates";
      }

      const resp = await apiService.Get_AllAdminCredentials(params);
      const rows = Array.isArray(resp.data) ? resp.data : [];
      setAdminCredentials(rows);
    } catch (error) {
      console.error("Error loading admin credentials:", error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to load credentials";
      setAdminCredentials([]);
      setAdminCredentialsError(msg);
    } finally {
      setAdminCredentialsLoading(false);
    }
  };

  // ✅ Local filter/search for adminCredentials
  useEffect(() => {
    let result = [...adminCredentials];

    const q = adminCredSearchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((row) => {
        if (adminCredSearchField === "credentialId") {
          return String(row.credentialId || "").toLowerCase().includes(q);
        }
        if (adminCredSearchField === "holderID") {
          return String(row.holderID || "").toLowerCase().includes(q);
        }
        if (adminCredSearchField === "holderName") {
          return String(row.holderName || "").toLowerCase().includes(q);
        }
        if (adminCredSearchField === "credentialName") {
          return String(row.credentialName || row.credentialType || "")
            .toLowerCase()
            .includes(q);
        }
        return true;
      });
    }

    setFilteredAdminCredentials(result);
  }, [adminCredentials, adminCredSearchField, adminCredSearchQuery]);

  // -------------------------------------------------------------------
  // LOGS
  // -------------------------------------------------------------------
  const fetchVerificationLogs = async () => {
    try {
      setLogsLoading(true);
      setVerificationLogsError(null);
      const data = await apiService.Get_AllVerificationLogs();
      const logsArray = Array.isArray(data.logs) ? data.logs : [];
      setVerificationLogs(logsArray);
    } catch (error) {
      console.error("Error fetching verification logs:", error);
      const raw =
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        "Failed to load verification logs";
      const msg = typeof raw === "string" ? raw : JSON.stringify(raw);
      setVerificationLogs([]);
      setVerificationLogsError(msg);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchStatusLogs = async () => {
    try {
      setLogsLoading(true);
      setStatusLogsError(null);

      const data = await apiService.Get_AllStatusLogs();
      const rows = Array.isArray(data.logs) ? data.logs : [];

      const sortedRows = [...rows].sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta;
      });

      setStatusLogs(sortedRows);
    } catch (error) {
      console.error("Error fetching status logs:", error);
      setStatusLogs([]);
      setStatusLogsError(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to load status logs"
      );
    } finally {
      setLogsLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------
  useEffect(() => {
    if (tab === "issuers") {
      fetchPendingIssuers();
      fetchApprovedIssuers();
      fetchRejectedIssuers(); // ✅ NEW
      fetchDisabledIssuers();

      setIssuerFilter("approved");
    } else if (tab === "credentials") {
      fetchApprovedIssuers();
      fetchDisabledIssuers();
      fetchAdminCredentials();
    } else if (tab === "verifications") {
      fetchVerifications();
    } else if (tab === "logs") {
      if (logCategory === "verification") {
        fetchVerificationLogs();
      } else {
        fetchStatusLogs();
      }
    } else if (tab === "users") {
      fetchUsers();
      setUserFilter("active");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== "logs") return;
    if (logCategory === "verification") {
      fetchVerificationLogs();
    } else {
      fetchStatusLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logCategory]);

  useEffect(() => {
    if (tab !== "credentials") return;
    fetchAdminCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminCredIssuerFilter, adminCredTypeFilter]);

  // -------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------
  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Dashboard</h1>

      <div className="admin-tabs">
        <button
          onClick={() => setTab("credentials")}
          className={tab === "credentials" ? "active" : ""}
        >
          Credentials
        </button>
        <button
          onClick={() => setTab("issuers")}
          className={tab === "issuers" ? "active" : ""}
        >
          Manage Issuers
        </button>
        <button
          onClick={() => setTab("users")}
          className={tab === "users" ? "active" : ""}
        >
          Manage Users
        </button>
        <button
          onClick={() => setTab("verifications")}
          className={tab === "verifications" ? "active" : ""}
        >
          Verifications
        </button>
        <button
          onClick={() => setTab("logs")}
          className={tab === "logs" ? "active" : ""}
        >
          Logs
        </button>
        <button
          onClick={() => setTab("settings")}
          className={tab === "settings" ? "active" : ""}
        >
          Settings
        </button>
      </div>

      {message && <div className="admin-message">{message}</div>}

      {/* ✅ MODAL VIA PORTAL (fixes "click but nothing shows") */}
      {showHistoryModal &&
        ReactDOM.createPortal(
          <div
            onClick={closeHistoryModal}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 999999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(1000px, 95vw)",
                maxHeight: "85vh",
                overflow: "auto",
                background: "#101018",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.15)",
                padding: "18px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                color: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>
                    Credential History (Blockchain Audit Trail)
                  </h3>
                  <div
                    style={{
                      fontSize: "13px",
                      opacity: 0.85,
                      marginTop: "6px",
                    }}
                  >
                    <div>
                      <strong>Credential ID:</strong>{" "}
                      <span style={{ fontFamily: "monospace" }}>
                        {selectedCredentialRow?.credentialId || "N/A"}
                      </span>
                    </div>
                    <div>
                      <strong>Credential Name:</strong>{" "}
                      {selectedCredentialRow?.credentialName ||
                        selectedCredentialRow?.credentialType ||
                        "—"}
                    </div>
                    <div>
                      <strong>Issuer:</strong>{" "}
                      {selectedCredentialRow?.issuerName || "—"}
                    </div>
                    <div>
                      <strong>Holder:</strong>{" "}
                      {selectedCredentialRow?.holderName || "—"}{" "}
                      <span style={{ opacity: 0.8 }}>
                        ({selectedCredentialRow?.holderID || "—"})
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={closeHistoryModal}
                  type="button"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  ✕ Close
                </button>
              </div>

              {credentialHistoryLoading ? (
                <div style={{ padding: "16px", opacity: 0.9 }}>
                  Loading credential history...
                </div>
              ) : credentialHistoryError ? (
                <div
                  style={{
                    padding: "12px",
                    background: "rgba(255,0,0,0.12)",
                    border: "1px solid rgba(255,0,0,0.25)",
                    borderRadius: "10px",
                    color: "#ffd2d2",
                  }}
                >
                  ❌ {credentialHistoryError}
                </div>
              ) : credentialHistory.length > 0 ? (
                <div style={{ marginTop: "10px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      opacity: 0.85,
                      marginBottom: "10px",
                    }}
                  >
                    Showing {credentialHistory.length} history record(s)
                  </div>

                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Action</th>
                          <th>Status</th>
                          <th>Tx ID</th>
                          <th>Snapshot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {credentialHistory.map((entry, idx) => {
                            const action = getHistoryActionLabel(entry, idx);

                            const status =
                              entry?.value?.status ||
                              (entry.isDelete ? "deleted" : "N/A");

                            const statusLower = String(status || "").toLowerCase();
                            const isRevoked = statusLower === "revoked";

                            // ✅ NEW: pull rejection reason (supports both shapes)
                            const rejectionReason =
                              entry?.value?.rejectionReason || entry?.rejectionReason || "";

                            return (
                              <tr key={entry.txId || idx}>
                                <td>{formatTimestamp(entry.timestamp)}</td>

                                <td>{action}</td>

                                {/* ✅ UPDATED: make revoked status red + show rejection reason */}
                                <td>
                                  <span
                                    style={
                                      isRevoked
                                        ? { color: "#ff6b6b", fontWeight: 700 }
                                        : { fontWeight: 600 }
                                    }
                                  >
                                    {String(status)}
                                  </span>

                                  {isRevoked && rejectionReason ? (
                                    <div style={{ marginTop: "6px", color: "#ff6b6b", fontSize: "12px" }}>
                                      Rejection Reason: <strong>{rejectionReason}</strong>
                                    </div>
                                  ) : null}
                                </td>

                                <td
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: "12px",
                                  }}
                                >
                                  {String(entry.txId || "N/A").slice(0, 18)}...
                                </td>

                                <td style={{ fontSize: "12px", opacity: 0.95 }}>
                                  {entry.isDelete ? (
                                    <span>Record deleted</span>
                                  ) : (
                                    <span>
                                      {entry.value?.credentialName ||
                                        entry.value?.credentialType ||
                                        "—"}
                                      {" | "}
                                      Holder:{" "}
                                      <span style={{ fontFamily: "monospace" }}>
                                        {entry.value?.holderID || "—"}
                                      </span>
                                      {entry.value?.revokedAt ? (
                                        <>
                                          {" | "}
                                          RevokedAt: {formatTimestamp(entry.value.revokedAt)}
                                        </>
                                      ) : null}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "16px", opacity: 0.9 }}>
                  No history found for this credential.
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
        {
        showRejectIssuerModal &&
            ReactDOM.createPortal(
              <div
                onClick={closeRejectIssuerModal}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.6)",
                  zIndex: 999999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "min(520px, 95vw)",
                    background: "#101018",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    padding: "18px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                    color: "#fff",
                  }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: 10 }}>Reject Issuer</h3>

                  <form onSubmit={submitRejectIssuer}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 13, opacity: 0.9, marginBottom: 6 }}>
                        Rejection Reason: <span style={{ color: "#ff6b6b" }}>*</span>
                      </label>

                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="State the reason for rejecting this issuer application..."
                        rows={4}
                        style={{
                          width: "100%",
                          resize: "vertical",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 10,
                          padding: 12,
                          color: "#fff",
                          outline: "none",
                        }}
                      />
                    </div>

                    {rejectIssuerError ? (
                      <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 10 }}>
                        ⚠️ {rejectIssuerError}
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                      <button
                        type="submit"
                        disabled={rejectIssuerLoading}
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          background: "linear-gradient(180deg, #ff4d4d, #cc2b2b)",
                          color: "#fff",
                          opacity: rejectIssuerLoading ? 0.7 : 1,
                        }}
                      >
                        {rejectIssuerLoading ? "Rejecting..." : "Reject"}
                      </button>

                      <button
                        type="button"
                        onClick={closeRejectIssuerModal}
                        disabled={rejectIssuerLoading}
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.2)",
                          background: "transparent",
                          color: "#fff",
                          cursor: "pointer",
                          opacity: rejectIssuerLoading ? 0.7 : 1,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}

            {showIssuerStatusModal &&
  ReactDOM.createPortal(
    <div
      onClick={closeIssuerStatusModal}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 95vw)",
          background: "#101018",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.15)",
          padding: "18px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          color: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>
          {issuerStatusAction === "disable" ? "Disable Issuer" : "Enable Issuer"}
        </h3>

        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
          <div>
            <strong>Organization:</strong> {issuerStatusTarget?.orgName || "N/A"}
          </div>
          <div>
            <strong>Email:</strong> {issuerStatusTarget?.email || "N/A"}
          </div>
        </div>

        <form onSubmit={submitIssuerStatusChange}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                opacity: 0.9,
                marginBottom: 6,
              }}
            >
              Reason: <span style={{ color: "#ff6b6b" }}>*</span>
            </label>

            <textarea
              value={issuerStatusReason}
              onChange={(e) => setIssuerStatusReason(e.target.value)}
              placeholder={
                issuerStatusAction === "disable"
                  ? "State the reason for disabling this issuer..."
                  : "State the reason for re-enabling this issuer..."
              }
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: 12,
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          {issuerStatusError ? (
            <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 10 }}>
              ⚠️ {issuerStatusError}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              type="submit"
              disabled={issuerStatusLoading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                background:
                  issuerStatusAction === "disable"
                    ? "linear-gradient(180deg, #ff4d4d, #cc2b2b)"
                    : "linear-gradient(180deg, #4ade80, #1f9d55)",
                color: "#fff",
                opacity: issuerStatusLoading ? 0.7 : 1,
              }}
            >
              {issuerStatusLoading
                ? issuerStatusAction === "disable"
                  ? "Disabling..."
                  : "Enabling..."
                : issuerStatusAction === "disable"
                ? "Disable"
                : "Enable"}
            </button>

            <button
              type="button"
              onClick={closeIssuerStatusModal}
              disabled={issuerStatusLoading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
                opacity: issuerStatusLoading ? 0.7 : 1,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )}

            {showUserStatusModal &&
  ReactDOM.createPortal(
    <div
      onClick={closeUserStatusModal}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 95vw)",
          background: "#101018",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.15)",
          padding: "18px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          color: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>
          {userStatusAction === "disable" ? "Disable User" : "Enable User"}
        </h3>

        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
          <div>
            <strong>Email:</strong> {userStatusTarget?.email || "N/A"}
          </div>
          <div>
            <strong>Username:</strong> {userStatusTarget?.username || userStatusTarget?.fullName || "N/A"}
          </div>
        </div>

        <form onSubmit={submitUserStatusChange}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                opacity: 0.9,
                marginBottom: 6,
              }}
            >
              Reason: <span style={{ color: "#ff6b6b" }}>*</span>
            </label>

            <textarea
              value={userStatusReason}
              onChange={(e) => setUserStatusReason(e.target.value)}
              placeholder={
                userStatusAction === "disable"
                  ? "State the reason for disabling this user..."
                  : "State the reason for re-enabling this user..."
              }
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: 12,
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          {userStatusError ? (
            <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 10 }}>
              ⚠️ {userStatusError}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              type="submit"
              disabled={userStatusLoading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                background:
                  userStatusAction === "disable"
                    ? "linear-gradient(180deg, #ff4d4d, #cc2b2b)"
                    : "linear-gradient(180deg, #4ade80, #1f9d55)",
                color: "#fff",
                opacity: userStatusLoading ? 0.7 : 1,
              }}
            >
              {userStatusLoading
                ? userStatusAction === "disable"
                  ? "Disabling..."
                  : "Enabling..."
                : userStatusAction === "disable"
                ? "Disable"
                : "Enable"}
            </button>

            <button
              type="button"
              onClick={closeUserStatusModal}
              disabled={userStatusLoading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
                opacity: userStatusLoading ? 0.7 : 1,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )}

      {/* CREDENTIALS TAB - NOW USING GLOBAL ADMIN VIEW */}
      {tab === "credentials" && (
        <div className="tab-card">
          <h2>Credential Management</h2>
          <p className="tab-subtitle">
            View all templates and issued credentials across issuers.
          </p>

          <div className="filter-row">
            <div className="filter-item">
              <label>Issuer</label>
              <select
                value={adminCredIssuerFilter}
                onChange={(e) => setAdminCredIssuerFilter(e.target.value)}
              >
                <option value="all">All Issuers</option>
                {credentialIssuerOptions.map((issuer) => (
                  <option
                    key={issuer._id || issuer.id}
                    value={issuer._id || issuer.id}
                  >
                    {issuer.orgName || issuer.name || issuer.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Type</label>
              <select
                value={adminCredTypeFilter}
                onChange={(e) => setAdminCredTypeFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="issued">Issued Credentials</option>
                <option value="templates">Templates</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Search By</label>
              <select
                value={adminCredSearchField}
                onChange={(e) => setAdminCredSearchField(e.target.value)}
              >
                <option value="holderName">Holder Name</option>
                <option value="holderID">Holder ID</option>
                <option value="credentialId">Credential ID</option>
                <option value="credentialName">Credential Name</option>
              </select>
            </div>

            <div className="filter-item" style={{ flex: 1 }}>
              <label>Search</label>
              <input
                type="text"
                value={adminCredSearchQuery}
                onChange={(e) => setAdminCredSearchQuery(e.target.value)}
                placeholder={
                  adminCredSearchField === "holderName"
                    ? "Search holder name..."
                    : adminCredSearchField === "holderID"
                    ? "Search holder ID..."
                    : adminCredSearchField === "credentialId"
                    ? "Search credential ID..."
                    : "Search credential name..."
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
            </div>
          </div>

          {adminCredentialsLoading ? (
            <div className="tab-placeholder">Loading credentials...</div>
          ) : adminCredentialsError ? (
            <div className="tab-placeholder">{adminCredentialsError}</div>
          ) : filteredAdminCredentials.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Issuer</th>
                    <th>Credential Name</th>
                    <th>Credential ID</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Holder Name</th>
                    <th>Holder ID</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>History</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminCredentials.map((row, idx) => {
                    const typeLower = String(row?.type || "").toLowerCase();

                    return (
                      <tr key={row.credentialId || idx}>
                        <td>{row.issuerName}</td>
                        <td>{row.credentialName || "—"}</td>
                        <td>{row.credentialId}</td>
                        <td>{row.type}</td>
                        <td>{row.credentialType}</td>
                        <td>{row.holderName || "—"}</td>
                        <td>{row.holderID || "—"}</td>
                        <td>
                        {(() => {
                          const s = String(row.status || "").toLowerCase();
                          const isRevoked = s === "revoked";
                          return (
                            <span style={isRevoked ? { color: "#ff6b6b", fontWeight: 700 } : { fontWeight: 600 }}>
                              {isRevoked ? "● " : ""}{row.status || "—"}
                            </span>
                          );
                        })()}
                      </td>                        
                        <td>{formatTimestamp(row.createdAt)}</td>

                        <td>
                          {typeLower === "issued" ? (
                            <button
                              className="btn-history"
                              type="button"
                              onClick={() => openHistoryModalForRow(row)}
                              title="View blockchain history for this credential"
                            >
                              See History
                            </button>
                          ) : (
                            <span style={{ opacity: 0.6 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tab-placeholder">No credentials found.</div>
          )}
        </div>
      )}

      {/* ISSUERS TAB */}
      {tab === "issuers" && (
        <div className="tab-card">
          <h2>Issuer Management</h2>
          <p className="tab-subtitle">
            Review, approve, or reject issuer applications. Monitor onboarding
            activity in real time.
          </p>

          <div className="issuer-filter-row">
            <label htmlFor="issuerFilter">View:</label>
            <select
              id="issuerFilter"
              value={issuerFilter}
              onChange={(e) => setIssuerFilter(e.target.value)}
            >
              <option value="approved">Approved Issuers</option>
              <option value="pending">Pending Issuers</option>
              <option value="rejected">Rejected Issuers</option>
              <option value="disabled">Disabled Issuers</option>
            </select>
          </div>

          {loading ? (
            <div className="tab-placeholder">Loading issuers...</div>
          ) : (
            <>
              {issuerFilter === "pending" && (
                    <div className="issuer-section">
                      <div className="section-header">
                        <h3>Pending Issuers</h3>
                        <span className="section-count">{pendingIssuers.length}</span>
                      </div>

                      {pendingIssuers.length > 0 ? (
                        <div className="table-wrapper">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Organization</th>
                                <th>Contact Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Created At</th>
                                <th>Approved At</th>
                                <th>Approved By</th>
                                <th>Fabric Identity</th>
                                <th>CouchDB URL</th>
                                <th>Wallet ID</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendingIssuers.map((issuer) => (
                                <tr key={issuer._id}>
                                  <td>{issuer.orgName}</td>
                                  <td>{issuer.contactName}</td>
                                  <td>{issuer.email}</td>
                                  <td className="status-pending">{issuer.status}</td>
                                  <td>{formatTimestamp(issuer.createdAt)}</td>
                                  <td>{formatTimestamp(issuer.approvedAt)}</td>
                                  <td>{issuer.approvedBy || "N/A"}</td>
                                  <td>{issuer.fabricIdentity || "N/A"}</td>
                                  <td>{issuer.couchDBUrl || "N/A"}</td>
                                  <td>{issuer.walletId || issuer.walletID || "N/A"}</td>
                                  <td className="action-cell">
                                    <button
                                      className="btn-approve"
                                      onClick={() => handleApproveIssuer(issuer._id)}
                                    >
                                      ✅ Approve
                                    </button>
                                    <button
                                      className="btn-reject"
                                      onClick={() => handleRejectIssuer(issuer._id)}
                                    >
                                      ❌ Reject
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="tab-placeholder">
                          No pending issuer applications found.
                        </div>
                      )}
                    </div>
                  )}

              {issuerFilter === "approved" && (
                    <div className="issuer-section">
                      <div className="section-header">
                        <h3>Approved Issuers</h3>
                        <span className="section-count">{approvedIssuers.length}</span>
                      </div>

                      {approvedIssuers.length > 0 ? (
                        <div className="table-wrapper">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Organization</th>
                                <th>Contact Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Created At</th>
                                <th>Approved At</th>
                                <th>Approved By</th>
                                <th>Fabric Identity</th>
                                <th>CouchDB URL</th>
                                <th>Wallet ID</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                         <tbody>
                              {approvedIssuers.map((issuer) => {
                                const rowKey = issuer._id || issuer.id;

                                return (
                                  <tr key={rowKey}>
                                    <td>{issuer.orgName}</td>
                                    <td>{issuer.contactName}</td>
                                    <td>{issuer.email}</td>

                                    <td style={{ color: "#4ade80", fontWeight: 600 }}>
                                      {issuer.status}
                                    </td>

                                    <td>{formatTimestamp(issuer.createdAt)}</td>
                                    <td>{formatTimestamp(issuer.approvedAt)}</td>
                                    <td>{issuer.approvedBy || "N/A"}</td>
                                    <td>{issuer.fabricIdentity || "N/A"}</td>
                                    <td>{issuer.couchDBUrl || "N/A"}</td>
                                    <td>{issuer.walletId || issuer.walletID || "N/A"}</td>

                                    {/* ✅ NEW: Actions column */}
                                    <td>
                                      <button
                                        type="button"
                                        onClick={() => openIssuerStatusModal(issuer, "disable")}
                                        style={{
                                          padding: "8px 12px",
                                          borderRadius: 10,
                                          border: "1px solid rgba(255,255,255,0.18)",
                                          cursor: "pointer",
                                          fontWeight: 700,
                                          background: "rgba(255,107,107,0.12)",
                                          color: "#ff6b6b"
                                        }}
                                        title="Disable issuer"
                                      >
                                        Disable
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="tab-placeholder">
                          No approved issuers found.
                        </div>
                      )}
                    </div>
                  )}

              {issuerFilter === "disabled" && (
                  <div className="issuer-section">
                    <div className="section-header">
                      <h3>Disabled Issuers</h3>
                      <span className="section-count">{disabledIssuers.length}</span>
                    </div>

                    {disabledIssuers.length > 0 ? (
                      <div className="table-wrapper">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Organization</th>
                              <th>Contact Name</th>
                              <th>Email</th>
                              <th>Status</th>
                              <th>Created At</th>
                              <th>Disabled At</th>
                              <th>Disabled By</th>
                              <th>Disable Reason</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {disabledIssuers.map((issuer) => (
                              <tr key={issuer.id || issuer._id}>
                                <td>{issuer.orgName}</td>
                                <td>{issuer.contactName}</td>
                                <td>{issuer.email}</td>
                                <td style={{ color: "#ff6b6b", fontWeight: 700 }}>{issuer.status}</td>
                                <td>{formatTimestamp(issuer.createdAt)}</td>
                                <td>{formatTimestamp(issuer.disabledAt)}</td>
                                <td>{issuer.disabledBy || "N/A"}</td>
                                <td>{issuer.disableReason || "N/A"}</td>
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => openIssuerStatusModal(issuer, "enable")}
                                    style={{
                                      padding: "8px 12px",
                                      borderRadius: 10,
                                      border: "1px solid rgba(255,255,255,0.18)",
                                      cursor: "pointer",
                                      fontWeight: 700,
                                      background: "rgba(74,222,128,0.12)",
                                      color: "#4ade80"
                                    }}
                                    title="Re-enable issuer"
                                  >
                                    Enable
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="tab-placeholder">No disabled issuers found.</div>
                    )}
                  </div>
                )}

              {issuerFilter === "rejected" && (
                  <div className="issuer-section">
                    <div className="section-header">
                      <h3>Rejected Issuers</h3>
                      <span className="section-count">{rejectedIssuers.length}</span>
                    </div>

                    {rejectedIssuers.length > 0 ? (
                      <div className="table-wrapper">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Organization</th>
                              <th>Contact Name</th>
                              <th>Email</th>
                              <th>Status</th>
                              <th>Created At</th>
                              <th>Rejected At</th>
                              <th>Rejected By</th>
                              <th>Rejection Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rejectedIssuers.map((issuer) => (
                              <tr key={issuer.id || issuer._id}>
                                <td>{issuer.orgName}</td>
                                <td>{issuer.contactName}</td>
                                <td>{issuer.email}</td>

                                <td style={{ color: "#ff6b6b", fontWeight: 700 }}>
                                  {issuer.status}
                                </td>

                                <td>{formatTimestamp(issuer.createdAt)}</td>
                                <td>{formatTimestamp(issuer.rejectedAt)}</td>
                                <td>{issuer.rejectedBy || "N/A"}</td>
                                <td>{issuer.rejectionReason || "N/A"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="tab-placeholder">No rejected issuers found.</div>
                    )}
                  </div>
                )}
            </>
          )}
        </div>
      )}

      

      {/* USERS TAB */}
      {tab === "users" && (
        <div className="tab-card">
          <h2>User Management</h2>
          <p className="tab-subtitle">
            View all registered users (holders and admins) in the system.
          </p>

          <div className="issuer-filter-row">
            <label htmlFor="userFilter">View:</label>
            <select
              id="userFilter"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="active">Active Users</option>
              <option value="disabled">Disabled Users</option>
              <option value="all">All Users</option>
            </select>
          </div>

          {usersLoading ? (
            <div className="tab-placeholder">Loading users...</div>
          ) : visibleUsers.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Org</th>
                    <th>Created At</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => {
                    const isDisabled = user.isActive === false;
                    return (
                      <tr key={user._id || user.id}>
                        <td>{user._id || user.id}</td>
                        <td>{user.email || "N/A"}</td>
                        <td>{user.username || user.fullName || "N/A"}</td>
                        <td>{user.role || "user"}</td>
                        <td>{user.org || "N/A"}</td>
                        <td>{formatTimestamp(user.createdAt)}</td>
                        <td>
                          {isDisabled ? (
                            <span className="badge red">No</span>
                          ) : (
                            <span className="badge green">Yes</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              openUserStatusModal(user, isDisabled ? "enable" : "disable")
                            }
                            style={{
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(255,255,255,0.18)",
                              cursor: "pointer",
                              fontWeight: 700,
                              background: isDisabled
                                ? "rgba(74,222,128,0.12)"
                                : "rgba(255,107,107,0.12)",
                              color: isDisabled ? "#4ade80" : "#ff6b6b"
                            }}
                            title={isDisabled ? "Re-enable user" : "Disable user"}
                          >
                            {isDisabled ? "Enable" : "Disable"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tab-placeholder">No users found for selected view.</div>
          )}
        </div>
      )}

      {/* VERIFICATIONS TAB */}
      {tab === "verifications" && (
        <div className="tab-card">
          <h2>Verification Oversight</h2>
          <p className="tab-subtitle">
            Monitor credential verification requests and track their resolution
            status.
          </p>
          {verificationsLoading ? (
            <div className="tab-placeholder">Loading verifications...</div>
          ) : verifications.length > 0 ? (
            <>
              <div className="tab-grid">
                <div className="stat-card">
                  <span className="stat-label">Pending Requests</span>
                  <span className="stat-value">
                    {verifications.filter((v) => v.status === "Pending").length}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Approved</span>
                  <span className="stat-value">
                    {verifications.filter((v) => v.status === "Approved").length}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Total Requests</span>
                  <span className="stat-value">{verifications.length}</span>
                </div>
              </div>
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Requester</th>
                      <th>Credential</th>
                      <th>Status</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifications.map((verification, index) => (
                      <tr key={verification.id || index}>
                        <td>{verification.requester}</td>
                        <td>{verification.credential}</td>
                        <td
                          className={
                            verification.status === "Approved"
                              ? "status-approved"
                              : "status-pending"
                          }
                        >
                          {verification.status}
                        </td>
                        <td>{verification.submitted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="tab-placeholder">No verification requests found.</div>
          )}
        </div>
      )}

      {/* LOGS TAB */}
      {tab === "logs" && (
        <div className="tab-card">
          <h2>Audit Logs</h2>
          <p className="tab-subtitle">
            Trace key administrative actions for compliance and security reviews.
          </p>

          <div className="issuer-filter-row">
            <label htmlFor="logCategory">Log Category:</label>
            <select
              id="logCategory"
              value={logCategory}
              onChange={(e) => setLogCategory(e.target.value)}
            >
              <option value="verification">Verification Logs</option>
              <option value="admin">Admin Logs (status changes)</option>
            </select>
          </div>

          {logCategory === "verification" && (
            <>
              {logsLoading ? (
                <div className="tab-placeholder">Loading verification logs...</div>
              ) : verificationLogsError ? (
                <div className="tab-placeholder">{verificationLogsError}</div>
              ) : verificationLogs.length > 0 ? (
                <div className="table-wrapper">
                  <table className="admin-table">
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
                      {verificationLogs.map((log) => {
                        const safeResultSource =
                          log.result?.reason ||
                          log.result?.message ||
                          (typeof log.result === "string"
                            ? log.result
                            : log.verifyResult || log.result || null);

                        const safeResult =
                          typeof safeResultSource === "string"
                            ? safeResultSource
                            : safeResultSource
                            ? JSON.stringify(safeResultSource)
                            : "N/A";

                        const ts = log.verifiedAt || log.timestamp;

                        return (
                          <tr key={log.id}>
                            <td>{String(log.id)}</td>
                            <td>{log.verifierName || "N/A"}</td>
                            <td>{log.verifierEmail || "N/A"}</td>
                            <td>{log.credentialId || log.credentialID || "N/A"}</td>
                            <td>{log.holderID || "N/A"}</td>
                            <td>{log.holderName || "N/A"}</td>
                            <td>{safeResult}</td>
                            <td>{formatTimestamp(ts)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="tab-placeholder">No verification logs found.</div>
              )}
            </>
          )}

          {logCategory === "admin" && (
            <>
              {logsLoading ? (
                <div className="tab-placeholder">Loading audit logs...</div>
              ) : statusLogsError ? (
                <div className="tab-placeholder">{statusLogsError}</div>
              ) : statusLogs.length > 0 ? (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Email</th>
                        <th>Previous Status</th>
                        <th>New Status</th>
                        <th>Reason</th>
                        <th>Changed By</th>
                        <th>Tx ID</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusLogs.map((log, index) => (
                        <tr key={log.id || log.txId || index}>
                          <td>{log.type || "N/A"}</td>
                          <td>{log.email || "N/A"}</td>
                          <td>{log.previousStatus || "N/A"}</td>
                          <td>{log.newStatus || "N/A"}</td>
                          <td>{log.reason || "N/A"}</td>
                          <td>{log.changedBy || "N/A"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.txId ? `${String(log.txId).slice(0, 18)}...` : "N/A"}
                          </td>
                          <td>{formatTimestamp(log.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="tab-placeholder">No audit logs found.</div>
              )}
            </>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && (
        <div className="tab-card">
          <h2>System Settings</h2>
          <p className="tab-subtitle">
            Configure administrative controls for institutions, infrastructure,
            and integrations.
          </p>
          <div className="settings-grid">
            <button>+ Add Institution</button>
            <button>Configure Blockchain</button>
            <button>Manage API Keys</button>
            <button>Security Policies</button>
            <button>User Roles</button>
          </div>
        </div>
      )}
    </div>
  );
}
