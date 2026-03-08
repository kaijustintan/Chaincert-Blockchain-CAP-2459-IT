// Admin dashboard for credential management
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "../styles/adminDashboard.css";
import apiService from "../services/apiService";

export default function AdminDashboard() {
  const [tab, setTab] = useState("credentials");
  const [pendingIssuers, setPendingIssuers] = useState([]);
  const [approvedIssuers, setApprovedIssuers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [issuerFilter, setIssuerFilter] = useState("approved");

  // ✅ NEW: secondary filter for pending issuers only
  const [pendingIssuerFilter, setPendingIssuerFilter] = useState("admin_actionable");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("active");

  const [logCategory, setLogCategory] = useState("verification");
  const [verificationLogs, setVerificationLogs] = useState([]);
  const [verificationLogsError, setVerificationLogsError] = useState(null);
  const [statusLogs, setStatusLogs] = useState([]);
  const [statusLogsError, setStatusLogsError] = useState(null);
  const [statusLogFilter, setStatusLogFilter] = useState("all"); // 'all' | 'issuers' | 'users'
  const [statusLogEmailSearch, setStatusLogEmailSearch] = useState("");

  // Issuer Decision Logs
  const [issuerDecisionLogs, setIssuerDecisionLogs] = useState([]);
  const [issuerDecisionLogsError, setIssuerDecisionLogsError] = useState(null);
  const [issuerDecisionFilter, setIssuerDecisionFilter] = useState("all"); // 'all' | 'approved' | 'rejected'

  // See History Modal
  const [showHistoryStatusModal, setShowHistoryStatusModal] = useState(false);
  const [historyStatusTarget, setHistoryStatusTarget] = useState(null); // { email, type: 'issuer' | 'user' }
  const [historyStatusLogs, setHistoryStatusLogs] = useState([]);
  const [historyStatusLoading, setHistoryStatusLoading] = useState(false);
  const [historyStatusError, setHistoryStatusError] = useState(null);

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
  const [Reject_IssuerId, setRejectIssuerId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [Reject_IssuerError, setRejectIssuerError] = useState("");
  const [Reject_IssuerLoading, setRejectIssuerLoading] = useState(false);

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

  // ✅ NEW: issuer documents modal state
const [showIssuerDocumentsModal, setShowIssuerDocumentsModal] = useState(false);
const [selectedIssuerForDocuments, setSelectedIssuerForDocuments] = useState(null);
const [issuerDocuments, setIssuerDocuments] = useState([]);
const [issuerDocumentsLoading, setIssuerDocumentsLoading] = useState(false);
const [issuerDocumentsError, setIssuerDocumentsError] = useState(null);

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

  const renderCell = (v) => {
    if (v === null || v === undefined) return "N/A";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const openIssuerDocumentsModal = async (issuer) => {
  try {
    const issuerId = issuer?._id || issuer?.id;
    if (!issuerId) return;

    setSelectedIssuerForDocuments(issuer);
    setShowIssuerDocumentsModal(true);
    setIssuerDocuments([]);
    setIssuerDocumentsError(null);
    setIssuerDocumentsLoading(true);

    const resp = await apiService.getIssuerDocuments(issuerId);
    const docs = Array.isArray(resp.documents) ? resp.documents : [];
    setIssuerDocuments(docs);
  } catch (error) {
    const msg =
      error.response?.data?.message ||
      error.message ||
      "Failed to load issuer documents";
    setIssuerDocumentsError(msg);
    setIssuerDocuments([]);
  } finally {
    setIssuerDocumentsLoading(false);
  }
};

const closeIssuerDocumentsModal = () => {
  setShowIssuerDocumentsModal(false);
  setSelectedIssuerForDocuments(null);
  setIssuerDocuments([]);
  setIssuerDocumentsError(null);
  setIssuerDocumentsLoading(false);
};

const handleViewIssuerDocument = async (doc) => {
  try {
    const issuerId =
      selectedIssuerForDocuments?._id || selectedIssuerForDocuments?.id;
    if (!issuerId || !doc?.attachmentName) return;

    const blob = await apiService.viewIssuerDocumentBlob(
      issuerId,
      doc.attachmentName
    );

    const blobUrl = window.URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 60000);
  } catch (error) {
    alert(
      error.response?.data?.message ||
        error.message ||
        "Failed to open document"
    );
  }
};

const handleDownloadIssuerDocument = async (doc) => {
  try {
    const issuerId =
      selectedIssuerForDocuments?._id || selectedIssuerForDocuments?.id;
    if (!issuerId || !doc?.attachmentName) return;

    const blob = await apiService.downloadIssuerDocumentBlob(
      issuerId,
      doc.attachmentName
    );

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = doc.originalname || doc.attachmentName || "document";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 60000);
  } catch (error) {
    alert(
      error.response?.data?.message ||
        error.message ||
        "Failed to download document"
    );
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

  // ✅ keep ONLY one declaration
  const credentialIssuerOptions = [...approvedIssuers, ...disabledIssuers].filter(
    (issuer, index, arr) => {
      const id = issuer._id || issuer.id;
      return id && arr.findIndex((x) => (x._id || x.id) === id) === index;
    }
  );

  const getVisibleUsers = () => {
    if (userFilter === "disabled") return users.filter((u) => u.isActive === false);
    if (userFilter === "active") return users.filter((u) => u.isActive !== false);
    return users;
  };

  const visibleUsers = getVisibleUsers();

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
      setSelectedCredentialRow(row);
      setShowHistoryModal(true);

      setCredentialHistory([]);
      setCredentialHistoryError(null);
      setCredentialHistoryLoading(true);

      const resp = await apiService.Get_CredentialHistory(row.credentialId);

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
    if (Reject_IssuerLoading) return;
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

      await apiService.Reject_Issuer(Reject_IssuerId, trimmed);

      setMessage("✅ Issuer rejected successfully!");
      closeRejectIssuerModal();

      await fetchPendingIssuers(pendingIssuerFilter);
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
    setIssuerStatusAction(action);
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
        await apiService.Disable_Issuer(issuerId, trimmed);
        setMessage("✅ Issuer disabled successfully!");
      } else {
        await apiService.Enable_Issuer(issuerId, trimmed);
        setMessage("✅ Issuer enabled successfully!");
      }

      closeIssuerStatusModal();

      await fetchApprovedIssuers();
      await fetchPendingIssuers(pendingIssuerFilter);
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
  const fetchPendingIssuers = async (mode = pendingIssuerFilter) => {
    try {
      setLoading(true);

      let response;

      if (mode === "root_only") {
        response = await apiService.getPendingRootIssuers();
      } else if (mode === "subordinate_only") {
        response = await apiService.getPendingSubordinateIssuers();
      } else if (mode === "awaiting_root") {
        response = await apiService.getPendingSubordinateIssuersAwaitingRootApproval();
      } else if (mode === "root_approved") {
        response = await apiService.getPendingSubordinateIssuersRootApproved();
      } else if (mode === "all_pending") {
        response = await apiService.getPendingIssuers();
      } else {
        response = await apiService.getAdminActionablePendingIssuers();
      }

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
      await apiService.Approve_Issuer(issuerId);
      setMessage("✅ Issuer approved successfully!");
      await fetchPendingIssuers(pendingIssuerFilter);
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
        await apiService.Disable_User(userId, trimmed);
        setMessage("✅ User disabled successfully!");
      } else {
        await apiService.Enable_User(userId, trimmed);
        setMessage("✅ User enabled successfully!");
      }

      closeUserStatusModal();
      await fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      setUserStatusError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "❌ Failed to update user status"
      );
    } finally {
      setUserStatusLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // CREDENTIALS / VERIFICATIONS (OLD, PER-CREDENTIAL LIST)
  // -------------------------------------------------------------------
  const fetchVerifications = async () => {
    try {
      setVerificationsLoading(true);
      const allCredentials = await apiService.getAllCredentials();
      const credentialsList = Array.isArray(allCredentials) ? allCredentials : [];

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

  const fetchStatusLogs = async (filter = "all", email = "") => {
    try {
      setLogsLoading(true);
      setStatusLogsError(null);

      let data;
      const trimmedEmail = email.trim();

      if (trimmedEmail) {
        if (filter === "issuers") {
          data = await apiService.Get_IssuerStatusLogs_ByEmail(trimmedEmail);
        } else if (filter === "users") {
          data = await apiService.Get_UserStatusLogs_ByEmail(trimmedEmail);
        } else {
          const [issuerData, userData] = await Promise.allSettled([
            apiService.Get_IssuerStatusLogs_ByEmail(trimmedEmail),
            apiService.Get_UserStatusLogs_ByEmail(trimmedEmail),
          ]);
          const issuerLogs = issuerData.status === "fulfilled" ? (issuerData.value?.logs || []) : [];
          const userLogs = userData.status === "fulfilled" ? (userData.value?.logs || []) : [];
          data = { logs: [...issuerLogs, ...userLogs] };
        }
      } else {
        if (filter === "issuers") {
          data = await apiService.Get_AllIssuerStatusLogs();
        } else if (filter === "users") {
          data = await apiService.Get_AllUserStatusLogs();
        } else {
          data = await apiService.Get_AllStatusLogs();
        }
      }

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

  const fetchIssuerDecisionLogs = async (filter = issuerDecisionFilter) => {
    try {
      setLogsLoading(true);
      setIssuerDecisionLogsError(null);

      let data;
      if (filter === "approved") {
        data = await apiService.Get_AllIssuerApprovalLogs();
      } else if (filter === "rejected") {
        data = await apiService.Get_AllIssuerRejectionLogs();
      } else {
        data = await apiService.Get_AllIssuerDecisionLogs();
      }

      const rows = Array.isArray(data.logs) ? data.logs : [];
      const sortedRows = [...rows].sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta;
      });

      setIssuerDecisionLogs(sortedRows);
    } catch (error) {
      console.error("Error fetching issuer decision logs:", error);
      setIssuerDecisionLogs([]);
      setIssuerDecisionLogsError(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to load issuer decision logs"
      );
    } finally {
      setLogsLoading(false);
    }
  };

  const openHistoryStatusModal = async (email, type) => {
    setHistoryStatusTarget({ email, type });
    setHistoryStatusLogs([]);
    setHistoryStatusError(null);
    setHistoryStatusLoading(true);
    setShowHistoryStatusModal(true);

    try {
      let data;
      if (type === "issuer") {
        data = await apiService.Get_IssuerStatusLogs_ByEmail(email);
      } else {
        data = await apiService.Get_UserStatusLogs_ByEmail(email);
      }

      const rows = Array.isArray(data.logs) ? data.logs : [];
      const sorted = [...rows].sort((a, b) =>
        new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
      );
      setHistoryStatusLogs(sorted);
    } catch (error) {
      setHistoryStatusError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load history"
      );
    } finally {
      setHistoryStatusLoading(false);
    }
  };

  const closeHistoryStatusModal = () => {
    setShowHistoryStatusModal(false);
    setHistoryStatusTarget(null);
    setHistoryStatusLogs([]);
    setHistoryStatusError(null);
    setHistoryStatusLoading(false);
  };

  // -------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------
  useEffect(() => {
    if (tab === "issuers") {
      fetchApprovedIssuers();
      fetchRejectedIssuers();
      fetchDisabledIssuers();

      setIssuerFilter("approved");
      setPendingIssuerFilter("admin_actionable");
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

  // ✅ NEW: when pending sub-filter changes, refetch only pending list
  useEffect(() => {
    if (tab !== "issuers") return;
    if (issuerFilter !== "pending") return;

    fetchPendingIssuers(pendingIssuerFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIssuerFilter, issuerFilter, tab]);

  useEffect(() => {
    if (tab !== "logs") return;
    if (logCategory === "verification") {
      fetchVerificationLogs();
    } else if (logCategory === "status") {
      fetchStatusLogs(statusLogFilter, statusLogEmailSearch);
    } else if (logCategory === "decision") {
      fetchIssuerDecisionLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logCategory]);

  useEffect(() => {
    if (tab !== "logs" || logCategory !== "status") return;
    fetchStatusLogs(statusLogFilter, statusLogEmailSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusLogFilter]);

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

      {message && <div className="admin-message">{message}</div>}

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

                          const rejectionReason =
                            entry?.value?.rejectionReason ||
                            entry?.rejectionReason ||
                            "";

                          return (
                            <tr key={entry.txId || idx}>
                              <td>{formatTimestamp(entry.timestamp)}</td>

                              <td>{action}</td>

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
                                  <div
                                    style={{
                                      marginTop: "6px",
                                      color: "#ff6b6b",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Rejection Reason:{" "}
                                    <strong>{rejectionReason}</strong>
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
                                        RevokedAt:{" "}
                                        {formatTimestamp(entry.value.revokedAt)}
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

      {showRejectIssuerModal &&
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
              <h3 style={{ marginTop: 0 }}>Reject Issuer</h3>
              <p style={{ opacity: 0.85, marginTop: "6px" }}>
                Please provide a rejection reason. This is required and will be
                shown in the issuer record.
              </p>

              <form onSubmit={submitRejectIssuer}>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: "10px",
                    padding: "10px",
                    marginTop: "10px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    outline: "none",
                    resize: "vertical",
                  }}
                />

                {Reject_IssuerError ? (
                  <div style={{ color: "#ff6b6b", marginTop: "10px" }}>
                    ❌ {Reject_IssuerError}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                    marginTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeRejectIssuerModal}
                    disabled={Reject_IssuerLoading}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "transparent",
                      color: "#fff",
                      cursor: Reject_IssuerLoading ? "not-allowed" : "pointer",
                      opacity: Reject_IssuerLoading ? 0.65 : 1,
                      fontWeight: 700,
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={Reject_IssuerLoading}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,107,107,0.12)",
                      color: "#ff6b6b",
                      cursor: Reject_IssuerLoading ? "not-allowed" : "pointer",
                      opacity: Reject_IssuerLoading ? 0.65 : 1,
                      fontWeight: 800,
                    }}
                  >
                    {Reject_IssuerLoading ? "Rejecting..." : "Confirm Reject"}
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
              <h3 style={{ marginTop: 0 }}>
                {issuerStatusAction === "disable" ? "Disable Issuer" : "Enable Issuer"}
              </h3>
              <p style={{ opacity: 0.85, marginTop: "6px" }}>
                Please provide a reason. This will be recorded for audit purposes.
              </p>

              <form onSubmit={submitIssuerStatusChange}>
                <textarea
                  value={issuerStatusReason}
                  onChange={(e) => setIssuerStatusReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: "10px",
                    padding: "10px",
                    marginTop: "10px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    outline: "none",
                    resize: "vertical",
                  }}
                />

                {issuerStatusError ? (
                  <div style={{ color: "#ff6b6b", marginTop: "10px" }}>
                    ❌ {issuerStatusError}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                    marginTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeIssuerStatusModal}
                    disabled={issuerStatusLoading}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "transparent",
                      color: "#fff",
                      cursor: issuerStatusLoading ? "not-allowed" : "pointer",
                      opacity: issuerStatusLoading ? 0.65 : 1,
                      fontWeight: 700,
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={issuerStatusLoading}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.18)",
                      background:
                        issuerStatusAction === "disable"
                          ? "rgba(255,107,107,0.12)"
                          : "rgba(74,222,128,0.12)",
                      color:
                        issuerStatusAction === "disable" ? "#ff6b6b" : "#4ade80",
                      cursor: issuerStatusLoading ? "not-allowed" : "pointer",
                      opacity: issuerStatusLoading ? 0.65 : 1,
                      fontWeight: 800,
                    }}
                  >
                    {issuerStatusLoading
                      ? "Submitting..."
                      : issuerStatusAction === "disable"
                      ? "Confirm Disable"
                      : "Confirm Enable"}
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
              <h3 style={{ marginTop: 0 }}>
                {userStatusAction === "disable" ? "Disable User" : "Enable User"}
              </h3>
              <p style={{ opacity: 0.85, marginTop: "6px" }}>
                Please provide a reason. This will be recorded for audit purposes.
              </p>

              <form onSubmit={submitUserStatusChange}>
                <textarea
                  value={userStatusReason}
                  onChange={(e) => setUserStatusReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: "10px",
                    padding: "10px",
                    marginTop: "10px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    outline: "none",
                    resize: "vertical",
                  }}
                />

                {userStatusError ? (
                  <div style={{ color: "#ff6b6b", marginTop: "10px" }}>
                    ❌ {userStatusError}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                    marginTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeUserStatusModal}
                    disabled={userStatusLoading}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "transparent",
                      color: "#fff",
                      cursor: userStatusLoading ? "not-allowed" : "pointer",
                      opacity: userStatusLoading ? 0.65 : 1,
                      fontWeight: 700,
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={userStatusLoading}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.18)",
                      background:
                        userStatusAction === "disable"
                          ? "rgba(255,107,107,0.12)"
                          : "rgba(74,222,128,0.12)",
                      color:
                        userStatusAction === "disable" ? "#ff6b6b" : "#4ade80",
                      cursor: userStatusLoading ? "not-allowed" : "pointer",
                      opacity: userStatusLoading ? 0.65 : 1,
                      fontWeight: 800,
                    }}
                  >
                    {userStatusLoading
                      ? "Submitting..."
                      : userStatusAction === "disable"
                      ? "Confirm Disable"
                      : "Confirm Enable"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {showHistoryStatusModal &&
        ReactDOM.createPortal(
          <div
            onClick={closeHistoryStatusModal}
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
                width: "min(900px, 95vw)",
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Status Change History</h3>
                  <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "6px" }}>
                    <div><strong>Email:</strong> {historyStatusTarget?.email || "N/A"}</div>
                    <div><strong>Type:</strong> {historyStatusTarget?.type === "issuer" ? "Issuer" : "User"}</div>
                  </div>
                </div>
                <button
                  onClick={closeHistoryStatusModal}
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

              {historyStatusLoading ? (
                <div style={{ padding: "16px", opacity: 0.9 }}>Loading history...</div>
              ) : historyStatusError ? (
                <div style={{ padding: "12px", background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,0,0,0.25)", borderRadius: "10px", color: "#ffd2d2" }}>
                  ❌ {historyStatusError}
                </div>
              ) : historyStatusLogs.length > 0 ? (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Previous Status</th>
                        <th>New Status</th>
                        <th>Reason</th>
                        <th>Performed By</th>
                        <th>Tx ID</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyStatusLogs.map((log, idx) => (
                        <tr key={log.txId || idx}>
                          <td>{log.previousStatus || "N/A"}</td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              color: (log.newStatus || "").toLowerCase() === "disabled"
                                ? "#ff6b6b"
                                : "#4ade80",
                            }}>
                              {log.newStatus || "N/A"}
                            </span>
                          </td>
                          <td>{log.reason || "—"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.performedByMSP || log.performedBy || "N/A"}
                          </td>
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
                <div style={{ padding: "16px", opacity: 0.9 }}>No status change history found.</div>
              )}
            </div>
          </div>,
          document.body
        )}
      
      {showIssuerDocumentsModal &&
          ReactDOM.createPortal(
            <div
              onClick={closeIssuerDocumentsModal}
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
                  width: "min(900px, 95vw)",
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
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>Submitted Documents</h3>
                    <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "6px" }}>
                      <div>
                        <strong>Issuer:</strong>{" "}
                        {selectedIssuerForDocuments?.orgName ||
                          selectedIssuerForDocuments?.name ||
                          "N/A"}
                      </div>
                      <div>
                        <strong>Email:</strong>{" "}
                        {selectedIssuerForDocuments?.email || "N/A"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={closeIssuerDocumentsModal}
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

                {issuerDocumentsLoading ? (
                  <div style={{ padding: "16px", opacity: 0.9 }}>
                    Loading submitted documents...
                  </div>
                ) : issuerDocumentsError ? (
                  <div
                    style={{
                      padding: "12px",
                      background: "rgba(255,0,0,0.12)",
                      border: "1px solid rgba(255,0,0,0.25)",
                      borderRadius: "10px",
                      color: "#ffd2d2",
                    }}
                  >
                    ❌ {issuerDocumentsError}
                  </div>
                ) : issuerDocuments.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Doc Type</th>
                          <th>File Name</th>
                          <th>MIME Type</th>
                          <th>Size</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issuerDocuments.map((doc, idx) => (
                          <tr key={doc.attachmentName || idx}>
                            <td>{doc.docType || "N/A"}</td>
                            <td>{doc.originalname || "N/A"}</td>
                            <td>{doc.mimetype || "N/A"}</td>
                            <td>
                              {typeof doc.size === "number"
                                ? `${(doc.size / 1024).toFixed(1)} KB`
                                : "N/A"}
                            </td>
                            <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => handleViewIssuerDocument(doc)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  background: "rgba(139,92,246,0.15)",
                                  color: "#a78bfa",
                                }}
                              >
                                View
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadIssuerDocument(doc)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  background: "rgba(74,222,128,0.12)",
                                  color: "#4ade80",
                                }}
                              >
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "16px", opacity: 0.9 }}>
                    No submitted documents found.
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}

      {/* CREDENTIALS TAB */}
      {tab === "credentials" && (
        <div className="tab-card">
          <h2>Credentials (All Issuers)</h2>
          <p className="tab-subtitle">
            Unified view of templates + issued credentials across ALL approved issuers.
          </p>

          <div className="issuer-filter-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label htmlFor="adminIssuerFilter">Issuer:</label>
              <select
                id="adminIssuerFilter"
                value={adminCredIssuerFilter}
                onChange={(e) => setAdminCredIssuerFilter(e.target.value)}
              >
                <option value="all">All</option>
                {credentialIssuerOptions.map((issuer) => {
                  const id = issuer._id || issuer.id;
                  return (
                    <option key={id} value={id}>
                      {issuer.orgName || issuer.name || issuer.email || id}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label htmlFor="adminTypeFilter">Type:</label>
              <select
                id="adminTypeFilter"
                value={adminCredTypeFilter}
                onChange={(e) => setAdminCredTypeFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="issued">Issued</option>
                <option value="templates">Templates</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label htmlFor="adminSearchField">Search by:</label>
              <select
                id="adminSearchField"
                value={adminCredSearchField}
                onChange={(e) => setAdminCredSearchField(e.target.value)}
              >
                <option value="holderName">Holder Name</option>
                <option value="holderID">Holder ID</option>
                <option value="credentialId">Credential ID</option>
                <option value="credentialName">Credential Name</option>
              </select>
            </div>

            <input
              type="text"
              value={adminCredSearchQuery}
              onChange={(e) => setAdminCredSearchQuery(e.target.value)}
              placeholder="Search..."
              style={{
                flex: 1,
                minWidth: 220,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          {adminCredentialsLoading ? (
            <div className="tab-placeholder">Loading credentials...</div>
          ) : adminCredentialsError ? (
            <div className="tab-placeholder">❌ {adminCredentialsError}</div>
          ) : filteredAdminCredentials.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Issuer</th>
                    <th>Credential ID</th>
                    <th>Type</th>
                    <th>Credential Name</th>
                    <th>Holder ID</th>
                    <th>Holder Name</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminCredentials.map((row, idx) => {
                    const typeLower = String(row.type || "").toLowerCase();
                    const isIssued = typeLower === "issued";

                    return (
                      <tr key={`${row.credentialId || "row"}_${idx}`}>
                        <td>{row.issuerName || "Unknown"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {row.credentialId || "N/A"}
                        </td>
                        <td>{row.type || "N/A"}</td>
                        <td>{row.credentialName || row.credentialType || "N/A"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {row.holderID || "—"}
                        </td>
                        <td>{row.holderName || "—"}</td>
                        <td>{row.status || "unknown"}</td>
                        <td>{formatTimestamp(row.createdAt)}</td>
                        <td>
                          {isIssued ? (
                            <button
                              type="button"
                              onClick={() => openHistoryModalForRow(row)}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.18)",
                                cursor: "pointer",
                                background: "rgba(255,255,255,0.06)",
                                color: "#fff",
                                fontWeight: 700,
                              }}
                              title="View blockchain audit history"
                            >
                              View BC History
                            </button>
                          ) : (
                            <span style={{ opacity: 0.65 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tab-placeholder">No credentials found for selected filters.</div>
          )}
        </div>
      )}

      {/* ISSUERS TAB */}
      {tab === "issuers" && (
        <div className="tab-card">
          <h2>Issuer Management</h2>

          <div className="issuer-filter-row">
            <label htmlFor="issuerFilter">View:</label>
            <select
              id="issuerFilter"
              value={issuerFilter}
              onChange={async (e) => {
                const value = e.target.value;
                setIssuerFilter(value);

                if (value === "pending") {
                  setPendingIssuerFilter("admin_actionable");
                  await fetchPendingIssuers("admin_actionable");
                }
              }}
            >
              <option value="approved">Approved Issuers</option>
              <option value="pending">Pending Issuers</option>
              <option value="rejected">Rejected Issuers</option>
              <option value="disabled">Disabled Issuers</option>
            </select>
          </div>

          {issuerFilter === "pending" && (
            <div className="issuer-filter-row" style={{ marginTop: "10px" }}>
              <label htmlFor="pendingIssuerFilter">Pending Type:</label>
              <select
                id="pendingIssuerFilter"
                value={pendingIssuerFilter}
                onChange={(e) => setPendingIssuerFilter(e.target.value)}
              >
                <option value="admin_actionable">Admin Actionable Pending</option>
                <option value="all_pending">All Pending</option>
                <option value="root_only">Pending Root Issuers</option>
                <option value="subordinate_only">Pending Subordinate Issuers</option>
                <option value="awaiting_root">Subordinate Awaiting Root Approval</option>
                <option value="root_approved">Subordinate Root-Approved</option>
              </select>
            </div>
          )}

          {loading ? (
            <div className="tab-placeholder">Loading issuers...</div>
          ) : visibleIssuers.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
              <thead>
                <tr>
                  <th>Issuer ID</th>
                  <th>Org Name</th>
                  <th>Email</th>
                  <th>Issuer Type</th>
                  <th>Root Authority</th>
                  <th>Root Approval</th>
                  <th>Root Approved At</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
                <tbody>
                  {visibleIssuers.map((issuer) => {
                    const id = issuer._id || issuer.id;
                    const isDisabled = issuer.isDisabled === true || issuer.status === "disabled";

                    return (
                      <tr key={id}>
                        <td>{id}</td>
                        <td>{issuer.orgName || issuer.name || "N/A"}</td>
                        <td>{issuer.email || "N/A"}</td>

                        <td>
                          {issuer.issuerType === "subordinate" ? (
                            <span className="badge purple">Subordinate</span>
                          ) : (
                            <span className="badge blue">Root</span>
                          )}
                        </td>

  <td>
  {issuer.issuerType === "subordinate"
    ? (issuer.rootAuthorityName || issuer.rootAuthorityId || "N/A")
    : "—"}
</td>

<td>
  {issuer.issuerType === "subordinate" ? (
    <span
      className={
        issuer.rootApprovalStatus === "approved"
          ? "badge green"
          : issuer.rootApprovalStatus === "rejected"
          ? "badge red"
          : "badge purple"
      }
    >
      {issuer.rootApprovalStatus || "pending"}
    </span>
  ) : (
    "Not Required"
  )}
</td>

                        <td>
                          {issuer.issuerType === "subordinate"
                            ? (
                                issuer.rootApprovalStatus === "approved"
                                  ? formatTimestamp(issuer.rootApprovedAt)
                                  : issuer.rootApprovalStatus === "rejected"
                                  ? "Rejected by Root"
                                  : "Pending"
                              )
                            : "—"}
                        </td>

                        <td>
                          <span
                            className={
                              issuer.status === "approved"
                                ? "badge green"
                                : issuer.status === "rejected"
                                ? "badge red"
                                : issuer.status === "disabled"
                                ? "badge gray"
                                : "badge purple"
                            }
                          >
                            {issuer.status || (isDisabled ? "disabled" : "approved")}
                          </span>
                        </td>

                        <td>{formatTimestamp(issuer.createdAt)}</td>

                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {issuerFilter === "pending" ? (
                            <>
                              <button
                                onClick={() => handleApproveIssuer(id)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  background: "rgba(74,222,128,0.12)",
                                  color: "#4ade80",
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectIssuer(id)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  background: "rgba(255,107,107,0.12)",
                                  color: "#ff6b6b",
                                }}
                              >
                                Reject
                              </button>
                              <button
                                  onClick={() => openIssuerDocumentsModal(issuer)}                                
                                  style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  background: "rgba(139,92,246,0.15)",
                                  color: "#a78bfa",
                                }}
                                title="View submitted documents"
                              >
                                See Documents
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openIssuerStatusModal(issuer, isDisabled ? "enable" : "disable")
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
                                  color: isDisabled ? "#4ade80" : "#ff6b6b",
                                }}
                                title={isDisabled ? "Re-enable issuer" : "Disable issuer"}
                              >
                                {isDisabled ? "Enable" : "Disable"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openHistoryStatusModal(issuer.email, "issuer")}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  background: "rgba(139,92,246,0.15)",
                                  color: "#a78bfa",
                                }}
                                title="View status change history"
                              >
                                See History
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tab-placeholder">No issuers found for selected view.</div>
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
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                              color: isDisabled ? "#4ade80" : "#ff6b6b",
                            }}
                            title={isDisabled ? "Re-enable user" : "Disable user"}
                          >
                            {isDisabled ? "Enable" : "Disable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openHistoryStatusModal(user.email, "user")}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(255,255,255,0.18)",
                              cursor: "pointer",
                              fontWeight: 700,
                              background: "rgba(139,92,246,0.15)",
                              color: "#a78bfa",
                            }}
                            title="View status change history"
                          >
                            See History
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
            Monitor credential verification requests and track their resolution status.
          </p>
          {verificationsLoading ? (
            <div className="tab-placeholder">Loading verifications...</div>
          ) : verifications.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Verification ID</th>
                    <th>Requester</th>
                    <th>Credential</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.map((v) => (
                    <tr key={v.id}>
                      <td>{v.id}</td>
                      <td>{v.requester}</td>
                      <td>{v.credential}</td>
                      <td>{v.status}</td>
                      <td>{formatTimestamp(v.submitted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tab-placeholder">No verification records found.</div>
          )}
        </div>
      )}

      {/* LOGS TAB */}
      {tab === "logs" && (
        <div className="tab-card">
          <h2>Logs</h2>
          <p className="tab-subtitle">
            Blockchain audit logs for verification events and issuer/user status changes.
          </p>

          <div className="issuer-filter-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <label htmlFor="logCategory">Category:</label>
            <select
              id="logCategory"
              value={logCategory}
              onChange={(e) => setLogCategory(e.target.value)}
            >
              <option value="verification">Verification Logs</option>
              <option value="status">Status Change Logs</option>
              <option value="decision">Issuer Decision Logs</option>
            </select>

            {logCategory === "status" && (
              <>
                <label htmlFor="statusLogFilter">Filter:</label>
                <select
                  id="statusLogFilter"
                  value={statusLogFilter}
                  onChange={(e) => setStatusLogFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="issuers">Issuers</option>
                  <option value="users">Users</option>
                </select>

                <input
                  type="text"
                  value={statusLogEmailSearch}
                  onChange={(e) => setStatusLogEmailSearch(e.target.value)}
                  placeholder="Search by email..."
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    outline: "none",
                    minWidth: 220,
                  }}
                />
                <button
                  onClick={() => fetchStatusLogs(statusLogFilter, statusLogEmailSearch)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(139,92,246,0.15)",
                    color: "#a78bfa",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Search
                </button>
              </>
            )}
          </div>

          {logsLoading ? (
            <div className="tab-placeholder">Loading logs...</div>
          ) : logCategory === "decision" ? (
            <div>
              <div className="issuer-filter-row" style={{ gap: 12, marginTop: 12 }}>
                <label htmlFor="issuerDecisionFilter">Decision:</label>
                <select
                  id="issuerDecisionFilter"
                  value={issuerDecisionFilter}
                  onChange={(e) => {
                    setIssuerDecisionFilter(e.target.value);
                    fetchIssuerDecisionLogs(e.target.value);
                  }}
                >
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {issuerDecisionLogsError ? (
                <div className="tab-placeholder">❌ {issuerDecisionLogsError}</div>
              ) : (() => {
                const filtered = issuerDecisionLogs;

                return filtered.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Issuer Email</th>
                          <th>Org Name</th>
                          <th>Decision</th>
                          <th>Reason</th>
                          <th>Performed By</th>
                          <th>Tx ID</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((log) => {
                          const isApproved = (log.decision || "").toLowerCase() === "approved";
                          return (
                            <tr key={log.txId || log.id}>
                              <td>{log.issuerEmail || "N/A"}</td>
                              <td>{log.orgName || "N/A"}</td>
                              <td>
                                <span style={{
                                  fontWeight: 700,
                                  color: isApproved ? "#4ade80" : "#ff6b6b",
                                }}>
                                  {log.decision || "N/A"}
                                </span>
                              </td>
                              <td>{log.reason || "—"}</td>
                              <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                                {log.performedByMSP || "N/A"}
                              </td>
                              <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                                {log.txId ? `${String(log.txId).slice(0, 18)}...` : "N/A"}
                              </td>
                              <td>{formatTimestamp(log.timestamp)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="tab-placeholder">No issuer decision logs found.</div>
                );
              })()}
            </div>
          ) : logCategory === "verification" ? (
            <>
              {verificationLogsError ? (
                <div className="tab-placeholder">{verificationLogsError}</div>
              ) : verificationLogs.length > 0 ? (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Log ID</th>
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
                      {verificationLogs.map((log) => (
                        <tr key={log.logId || log.txId}>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.logId || "N/A"}
                          </td>
                          <td>{log.verifierName || "N/A"}</td>
                          <td>{log.verifierEmail || "N/A"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.credentialId || "N/A"}
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.holderID || "N/A"}
                          </td>
                          <td>{log.holderName || "N/A"}</td>
                          <td>{renderCell(log.resultMessage ?? log.result)}</td>
                          <td>{formatTimestamp(log.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="tab-placeholder">No verification logs found.</div>
              )}
            </>
          ) : (
            <>
              {statusLogsError ? (
                <div className="tab-placeholder">{statusLogsError}</div>
              ) : statusLogs.length > 0 ? (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Log ID</th>
                        <th>Target Type</th>
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
                      {statusLogs.map((log) => (
                        <tr key={log.id || log.txId}>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.id ? `${String(log.id).slice(0, 18)}...` : "N/A"}
                          </td>
                          <td>{log.entity || "N/A"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.issuerEmail || log.userEmail || log.targetEmail || "N/A"}
                          </td>
                          <td>{log.previousStatus || "N/A"}</td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              color: (log.newStatus || "").toLowerCase() === "disabled"
                                ? "#ff6b6b" : "#4ade80"
                            }}>
                              {log.newStatus || "N/A"}
                            </span>
                          </td>
                          <td>{log.reason || "N/A"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.performedByMSP || log.performedBy || "N/A"}
                          </td>
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