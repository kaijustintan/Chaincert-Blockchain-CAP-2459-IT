// Admin dashboard for credential management
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import "../styles/adminDashboard.css";
import apiService from "../services/apiService";
import AppToast from "../components/appToast";

export default function AdminDashboard() {
  const [tab, setTab] = useState("credentials");
  const [pendingIssuers, setPendingIssuers] = useState([]);
  const [approvedIssuers, setApprovedIssuers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [issuerStatsLoaded, setIssuerStatsLoaded] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const feedbackTimerRef = useRef(null);

  const showFeedback = useCallback((type, feedbackMessage) => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }

    setMessageType(type);
    setMessage(feedbackMessage);

    feedbackTimerRef.current = window.setTimeout(() => {
      setMessage("");
      feedbackTimerRef.current = null;
    }, 5000);
  }, []);

  const [issuerFilter, setIssuerFilter] = useState("approved");

  // ✅ NEW: secondary filter for pending issuers only
  const [pendingIssuerFilter, setPendingIssuerFilter] = useState("admin_actionable");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("active");

  const [logCategory, setLogCategory] = useState("verification");
  const [verificationLogs, setVerificationLogs] = useState([]);
  const [verificationLogsCount, setVerificationLogsCount] = useState(0);
  const [verificationLogsError, setVerificationLogsError] = useState(null);
  const [statusLogs, setStatusLogs] = useState([]);
  const [statusLogsCount, setStatusLogsCount] = useState(0);
  const [statusLogsError, setStatusLogsError] = useState(null);
  const [statusLogFilter, setStatusLogFilter] = useState("all"); // 'all' | 'issuers' | 'users'
  const [statusLogEmailSearch, setStatusLogEmailSearch] = useState("");

  // Issuer Decision Logs
  const [issuerDecisionLogs, setIssuerDecisionLogs] = useState([]);
  const [issuerDecisionLogsCount, setIssuerDecisionLogsCount] = useState(0);
  const [issuerDecisionLogsError, setIssuerDecisionLogsError] = useState(null);
  const [issuerDecisionFilter, setIssuerDecisionFilter] = useState("all"); // 'all' | 'approved' | 'rejected'

  const [rootSubordinateLogs, setRootSubordinateLogs] = useState([]);
  const [rootSubordinateLogsCount, setRootSubordinateLogsCount] = useState(0);
  const [rootSubordinateLogsError, setRootSubordinateLogsError] = useState(null);
  const [rootSubordinateDecisionFilter, setRootSubordinateDecisionFilter] = useState("all");
  const [rootSubordinateSearchQuery, setRootSubordinateSearchQuery] = useState("");

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

  const [adminCredentialSortBy, setAdminCredentialSortBy] = useState("newest");
  const [issuerSortBy, setIssuerSortBy] = useState("newest");
  const [userSortBy, setUserSortBy] = useState("newest");
  const [verificationSortBy, setVerificationSortBy] = useState("newest");
  const [statusLogSortBy, setStatusLogSortBy] = useState("newest");
  const [issuerDecisionLogSortBy, setIssuerDecisionLogSortBy] = useState("newest");
  const [rootSubordinateLogSortBy, setRootSubordinateLogSortBy] = useState("newest");

  // ✅ NEW: modal state for viewing a specific credential's blockchain history
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCredentialRow, setSelectedCredentialRow] = useState(null);
  const [credentialHistory, setCredentialHistory] = useState([]);
  const [credentialHistoryLoading, setCredentialHistoryLoading] = useState(false);
  const [credentialHistoryError, setCredentialHistoryError] = useState(null);
  const [descriptionModal, setDescriptionModal] = useState(null);

  // ✅ NEW: Reject Issuer modal state (required rejection reason)
  const [showRejectIssuerModal, setShowRejectIssuerModal] = useState(false);
  const [Reject_IssuerId, setRejectIssuerId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [Reject_IssuerError, setRejectIssuerError] = useState("");
  const [Reject_IssuerLoading, setRejectIssuerLoading] = useState(false);

  // ADDED
  const [rejectedIssuers, setRejectedIssuers] = useState([]);
  const [disabledIssuers, setDisabledIssuers] = useState([]);
  const [pendingIssuerCount, setPendingIssuerCount] = useState(0);

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


  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (["issued", "active", "approved", "enabled"].includes(s)) return "#22c55e";
    if (["revoked", "disabled", "rejected"].includes(s)) return "#ef4444";
    if (["expired"].includes(s)) return "#f59e0b";
    if (["pending"].includes(s)) return "#eab308";
    if (["template"].includes(s)) return "#3b82f6";
    return "inherit";
  };

  const renderStatusText = (status, fallback = "N/A") => (
    <span className="status-value" style={{ color: getStatusColor(status), fontWeight: 600 }}>
      {status || fallback}
    </span>
  );

  const refreshIssuerCollections = useCallback(async () => {
    await Promise.all([
      fetchApprovedIssuers(),
      fetchPendingIssuers("all_pending"),
      fetchRejectedIssuers(),
      fetchDisabledIssuers(),
    ]);
    setIssuerStatsLoaded(true);
  }, []);

  const renderCell = (v) => {
    if (v === null || v === undefined) return "N/A";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const renderDescriptionCell = useCallback((row) => {
    const rawDescription = typeof row?.description === "string" ? row.description : "";
    const trimmedDescription = rawDescription.trim();
    if (!trimmedDescription || trimmedDescription.toLowerCase() === "n/a") {
      return <span style={{ opacity: 0.4 }}>—</span>;
    }

    return (
      <button
        type="button"
        className="action-btn"
        onClick={() => setDescriptionModal({ name: row?.credentialName || row?.credentialType || "Credential", description: trimmedDescription })}
        style={{ padding: "4px 10px", fontSize: "11px", background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "6px", cursor: "pointer" }}
      >
        View Description
      </button>
    );
  }, []);

  const getIssuerAdminMeta = (issuer) => ({
    approvedBy: issuer?.approvedBy || "N/A",
    rejectedBy: issuer?.rejectedBy || "N/A",
    disabledBy: issuer?.disabledBy || "N/A",
    enabledBy: issuer?.enabledBy || "N/A",
  });

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
    showFeedback("danger", `Failed to open document: ${error.response?.data?.message || error.message || "Unknown error"}`);
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
    showFeedback("danger", `Failed to download document: ${error.response?.data?.message || error.message || "Unknown error"}`);
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

  const sortByDateThenName = (items, sortOption, config = {}) => {
    const { dateFields = ["createdAt"], nameFields = [], statusField = "status" } = config;
    const getDateValue = (item) => {
      for (const field of dateFields) {
        if (item?.[field]) return new Date(item[field]).getTime() || 0;
      }
      return 0;
    };
    const getNameValue = (item) => {
      for (const field of nameFields) {
        if (item?.[field]) return String(item[field]).toLowerCase();
      }
      return "";
    };
    const getStatusValue = (item) => String(item?.[statusField] || "").toLowerCase();
    const sorted = [...items];

    switch (sortOption) {
      case "oldest":
        return sorted.sort((a, b) => getDateValue(a) - getDateValue(b));
      case "name-asc":
        return sorted.sort((a, b) => getNameValue(a).localeCompare(getNameValue(b)));
      case "name-desc":
        return sorted.sort((a, b) => getNameValue(b).localeCompare(getNameValue(a)));
      case "status-asc":
        return sorted.sort((a, b) => getStatusValue(a).localeCompare(getStatusValue(b)));
      case "status-desc":
        return sorted.sort((a, b) => getStatusValue(b).localeCompare(getStatusValue(a)));
      case "newest":
      default:
        return sorted.sort((a, b) => getDateValue(b) - getDateValue(a));
    }
  };

  const sortedAdminCredentials = useMemo(() => sortByDateThenName(filteredAdminCredentials, adminCredentialSortBy, { dateFields: ["createdAt", "issuedDate"], nameFields: ["credentialName", "credentialType"], statusField: "status" }), [filteredAdminCredentials, adminCredentialSortBy]);

  const sortedVisibleIssuers = useMemo(() => sortByDateThenName(visibleIssuers, issuerSortBy, { dateFields: ["createdAt"], nameFields: ["orgName", "name", "email"], statusField: "status" }), [visibleIssuers, issuerSortBy]);

  const sortedVisibleUsers = useMemo(() => sortByDateThenName(visibleUsers, userSortBy, { dateFields: ["createdAt"], nameFields: ["username", "fullName", "email"], statusField: "email" }), [visibleUsers, userSortBy]);

  const sortedVerifications = useMemo(() => sortByDateThenName(verifications, verificationSortBy, { dateFields: ["createdAt", "timestamp", "updatedAt"], nameFields: ["credentialName", "holderName", "issuerName"], statusField: "status" }), [verifications, verificationSortBy]);

  const sortedStatusLogs = useMemo(() => sortByDateThenName(statusLogs, statusLogSortBy, { dateFields: ["timestamp", "createdAt"], nameFields: ["email", "adminEmail"], statusField: "newStatus" }), [statusLogs, statusLogSortBy]);

  const sortedIssuerDecisionLogs = useMemo(() => sortByDateThenName(issuerDecisionLogs, issuerDecisionLogSortBy, { dateFields: ["timestamp", "createdAt"], nameFields: ["issuerEmail", "orgName"], statusField: "decision" }), [issuerDecisionLogs, issuerDecisionLogSortBy]);

  const sortedRootSubordinateLogs = useMemo(() => sortByDateThenName(rootSubordinateLogs, rootSubordinateLogSortBy, { dateFields: ["timestamp", "createdAt"], nameFields: ["issuerEmail", "orgName"], statusField: "decision" }), [rootSubordinateLogs, rootSubordinateLogSortBy]);

  const sortedVerificationLogs = useMemo(() => sortByDateThenName(verificationLogs, verificationSortBy, { dateFields: ["timestamp", "verifiedAt", "createdAt"], nameFields: ["verifierName", "holderName", "credentialId"], statusField: "resultMessage" }), [verificationLogs, verificationSortBy]);

  const issuerColumnConfig = {
    approved: ["issuerId", "orgName", "email", "issuerType", "rootAuthority", "rootApproval", "status", "approvedBy", "createdAt", "actions"],
    pending: ["issuerId", "orgName", "email", "issuerType", "rootAuthority", "rootApproval", "rootApprovedAt", "status", "createdAt", "actions"],
    rejected: ["issuerId", "orgName", "email", "issuerType", "rootAuthority", "status", "rejectedBy", "createdAt", "actions"],
    disabled: ["issuerId", "orgName", "email", "issuerType", "rootAuthority", "status", "disabledBy", "enabledBy", "createdAt", "actions"],
  };

  const issuerColumnLabels = {
    issuerId: "Issuer ID",
    orgName: "Org Name",
    email: "Email",
    issuerType: "Issuer Type",
    rootAuthority: "Root Authority",
    rootApproval: "Root Approval",
    rootApprovedAt: "Root Approved At",
    status: "Status",
    approvedBy: "Approved By",
    rejectedBy: "Rejected By",
    disabledBy: "Disabled By",
    enabledBy: "Enabled By",
    createdAt: "Created At",
    actions: "Actions",
  };

  const activeIssuerColumns = issuerColumnConfig[issuerFilter] || issuerColumnConfig.approved;

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
      const cleanHistory = list.filter((entry) => {
        const id = entry?.credentialId || entry?.id || entry?.key || entry?.value?.credentialId || "";
        const action = String(entry?.action || "").toLowerCase();
        const status = String(entry?.status || entry?.value?.status || "").toLowerCase();
        if (String(id).startsWith("vlog_")) return false;
        if (action === "updated" && (status === "status unknown" || status === "unknown")) return false;
        if (!action && status === "status unknown") return false;
        return true;
      });
      const sorted = [...cleanHistory].sort(
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

      showFeedback("success", "Reject issuer successful.");
      closeRejectIssuerModal();

      await fetchPendingIssuers(pendingIssuerFilter);
      await fetchApprovedIssuers();
      await fetchRejectedIssuers();
      await fetchDisabledIssuers();
    } catch (error) {
      console.error("Error rejecting issuer:", error);
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      setRejectIssuerError(`Failed to reject issuer: ${errorMessage}`);
      showFeedback("danger", `Failed to reject issuer: ${errorMessage}`);
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
        showFeedback("success", "Disable issuer successful.");
      } else {
        await apiService.Enable_Issuer(issuerId, trimmed);
        showFeedback("success", "Enable issuer successful.");
      }

      closeIssuerStatusModal();

      await refreshIssuerCollections();
      if (issuerFilter === "pending") {
        await fetchPendingIssuers(pendingIssuerFilter);
      }
    } catch (error) {
      console.error("Error updating issuer status:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "❌ Failed to update issuer status";
      setIssuerStatusError(errorMessage);
      showFeedback("danger", `Failed to ${issuerStatusAction} issuer: ${errorMessage}`);
    } finally {
      setIssuerStatusLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // ISSUERS
  // -------------------------------------------------------------------
  const fetchPendingIssuers = async (mode = pendingIssuerFilter, options = {}) => {
    const { updateCount = mode === "all_pending" } = options;
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
      if (updateCount) setPendingIssuerCount(pending.length);
      setPendingIssuers(pending);

    } catch (error) {
      console.error("Error fetching pending issuers:", error);
      showFeedback("danger", `Failed to load pending issuers: ${error.response?.data?.message || error.message || "Unknown error"}`);
      if (updateCount) setPendingIssuerCount(0);
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
      showFeedback("success", "Approve issuer successful.");
      await fetchPendingIssuers(pendingIssuerFilter);
      await fetchApprovedIssuers();
    } catch (error) {
      console.error("Error approving issuer:", error);
      showFeedback("danger", `Failed to approve issuer: ${error.response?.data?.message || error.message || "Unknown error"}`);
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
        showFeedback("success", "Disable user successful.");
      } else {
        await apiService.Enable_User(userId, trimmed);
        showFeedback("success", "Enable user successful.");
      }

      closeUserStatusModal();
      await fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Unknown error";
      setUserStatusError(`Failed to ${userStatusAction} user: ${errorMessage}`);
      showFeedback("danger", `Failed to ${userStatusAction} user: ${errorMessage}`);
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
      const normalizedRows = rows.map((row) => {
        const normalizedType = String(row.type || row.recordType || "").toLowerCase();
        return {
          ...row,
          type: normalizedType === "templates" ? "template" : normalizedType === "issued" ? "issued" : (row.isTemplate ? "template" : normalizedType),
        };
      });
      setAdminCredentials(normalizedRows);
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
      setVerificationLogsCount(logsArray.length);
    } catch (error) {
      console.error("Error fetching verification logs:", error);
      const raw =
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        "Failed to load verification logs";
      const msg = typeof raw === "string" ? raw : JSON.stringify(raw);
      setVerificationLogs([]);
      setVerificationLogsCount(0);
      setVerificationLogsError(msg);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchStatusLogs = async (filter = "all", email = "", options = {}) => {
    const { updateCount = filter === "all" && !email.trim() } = options;
    try {
      setLogsLoading(true);
      setStatusLogsError(null);

      // Always fetch ALL logs first, then filter locally for partial email match (Task 9 fix)
      let data;
      if (filter === "issuers") {
        data = await apiService.Get_AllIssuerStatusLogs();
      } else if (filter === "users") {
        data = await apiService.Get_AllUserStatusLogs();
      } else {
        data = await apiService.Get_AllStatusLogs();
      }

      let rows = Array.isArray(data.logs) ? data.logs : [];
      if (updateCount) setStatusLogsCount(rows.length);

      // Apply partial email search on frontend
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail) {
        rows = rows.filter((log) => {
          const logEmail = (
            log.issuerEmail || log.userEmail || log.targetEmail || log.adminEmail || ""
          ).toLowerCase();
          return logEmail.includes(trimmedEmail);
        });
      }

      const sortedRows = [...rows].sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta;
      });

      setStatusLogs(sortedRows);
    } catch (error) {
      console.error("Error fetching status logs:", error);
      setStatusLogs([]);
      if (updateCount) setStatusLogsCount(0);
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

  const fetchIssuerDecisionLogs = async (filter = issuerDecisionFilter, options = {}) => {
    const { updateCount = filter === "all" } = options;
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
      if (updateCount) setIssuerDecisionLogsCount(rows.length);
      const sortedRows = [...rows].sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta;
      });

      setIssuerDecisionLogs(sortedRows);
    } catch (error) {
      console.error("Error fetching issuer decision logs:", error);
      setIssuerDecisionLogs([]);
      if (updateCount) setIssuerDecisionLogsCount(0);
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

  const fetchRootSubordinateDecisionLogs = async (
    filter = rootSubordinateDecisionFilter,
    options = {}
  ) => {
    const { updateCount = filter === "all" } = options;
    try {
      setLogsLoading(true);
      setRootSubordinateLogsError(null);

      let data;
      if (filter === "approved") {
        data = await apiService.GetAllRootSubordinateApprovalLogs();
      } else if (filter === "rejected") {
        data = await apiService.GetAllRootSubordinateRejectionLogs();
      } else {
        data = await apiService.GetAllRootSubordinateLogs();
      }

      const rows = Array.isArray(data.logs) ? data.logs : [];
      if (updateCount) setRootSubordinateLogsCount(rows.length);
      const sortedRows = [...rows].sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta;
      });

      setRootSubordinateLogs(sortedRows);
    } catch (error) {
      console.error("Error fetching root subordinate decision logs:", error);
      setRootSubordinateLogs([]);
      if (updateCount) setRootSubordinateLogsCount(0);
      setRootSubordinateLogsError(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to load root subordinate decision logs"
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

  const getStatDisplayValue = (isLoading, value) => (isLoading ? "—" : value);

  const credentialStats = [
    {
      label: "Total Records",
      value: getStatDisplayValue(adminCredentialsLoading, adminCredentials.length),
    },
    {
      label: "Issued",
      value: getStatDisplayValue(
        adminCredentialsLoading,
        adminCredentials.filter((r) => (r.type || "").toLowerCase() === "issued").length
      ),
      className: "stat-green",
    },
    {
      label: "Revoked",
      value: getStatDisplayValue(
        adminCredentialsLoading,
        adminCredentials.filter((r) => (r.status || "").toLowerCase() === "revoked").length
      ),
      className: "stat-red",
    },
    {
      label: "Expired",
      value: getStatDisplayValue(
        adminCredentialsLoading,
        adminCredentials.filter((r) => (r.status || "").toLowerCase() === "expired").length
      ),
      className: "stat-blue",
    },
    {
      label: "Templates",
      value: getStatDisplayValue(
        adminCredentialsLoading,
        adminCredentials.filter((r) => (r.type || "").toLowerCase() === "template").length
      ),
      className: "stat-purple",
    },
  ];

  const issuerStats = [
    {
      label: "Total Issuers",
      value: getStatDisplayValue(loading, approvedIssuers.length + disabledIssuers.length + pendingIssuerCount + rejectedIssuers.length),
    },
    {
      label: "Active Issuers",
      value: getStatDisplayValue(loading, approvedIssuers.length),
      className: "stat-green",
    },
    {
      label: "Disabled Issuers",
      value: getStatDisplayValue(loading, disabledIssuers.length),
      className: "stat-red",
    },
    {
      label: "Pending Issuers",
      value: getStatDisplayValue(loading, pendingIssuerCount),
      className: "stat-blue",
    },
    {
      label: "Rejected Issuers",
      value: getStatDisplayValue(loading, rejectedIssuers.length),
      className: "stat-red",
    },
  ];

  const userStats = [
    {
      label: "Total Users",
      value: getStatDisplayValue(usersLoading, users.length),
    },
    {
      label: "Active Users",
      value: getStatDisplayValue(usersLoading, users.filter((u) => u.isActive !== false).length),
      className: "stat-green",
    },
    {
      label: "Disabled Users",
      value: getStatDisplayValue(usersLoading, users.filter((u) => u.isActive === false).length),
      className: "stat-red",
    },
  ];

  const logStats = [
    {
      label: "Verification Logs",
      value: getStatDisplayValue(logsLoading, verificationLogsCount),
    },
    {
      label: "Status Logs",
      value: getStatDisplayValue(logsLoading, statusLogsCount),
      className: "stat-blue",
    },
    {
      label: "Issuer Decisions",
      value: getStatDisplayValue(logsLoading, issuerDecisionLogsCount),
      className: "stat-purple",
    },
    {
      label: "Root Decisions",
      value: getStatDisplayValue(
        logsLoading,
        rootSubordinateLogsCount
      ),
      className: "stat-green",
    },
  ];

  const renderStatsGrid = (stats) => (
    <div className="admin-stats-grid">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`admin-stat-card${stat.className ? ` ${stat.className}` : ""}`}
        >
          <span className="admin-stat-num">{stat.value}</span>
          <span className="admin-stat-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );

  // -------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------
  useEffect(() => {
    if (tab === "issuers" && !issuerStatsLoaded) {
      setIssuerFilter("approved");
      setPendingIssuerFilter("admin_actionable");
      refreshIssuerCollections();
    } else if (tab === "credentials") {
      fetchApprovedIssuers();
      fetchDisabledIssuers();
      fetchAdminCredentials();
    } else if (tab === "logs" && !logsLoaded) {
      Promise.all([
        fetchVerificationLogs(),
        fetchStatusLogs(statusLogFilter, statusLogEmailSearch, { updateCount: true }),
        fetchIssuerDecisionLogs(issuerDecisionFilter, { updateCount: true }),
        fetchRootSubordinateDecisionLogs(rootSubordinateDecisionFilter, { updateCount: true }),
      ]).then(() => setLogsLoaded(true));
    } else if (tab === "users") {
      fetchUsers();
      setUserFilter("active");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, issuerStatsLoaded, logsLoaded, issuerDecisionFilter, refreshIssuerCollections, rootSubordinateDecisionFilter, statusLogEmailSearch, statusLogFilter]);

  useEffect(() => {
    if (tab !== "issuers") {
      setIssuerStatsLoaded(false);
    }
  }, [tab]);

  // ✅ NEW: when pending sub-filter changes, refetch only pending list
  useEffect(() => {
    if (tab !== "issuers") return;
    if (issuerFilter !== "pending") return;

    fetchPendingIssuers(pendingIssuerFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIssuerFilter, issuerFilter, tab]);

  useEffect(() => {
    if (tab !== "logs") {
      setLogsLoaded(false);
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== "logs" || logCategory !== "status") return;
    fetchStatusLogs(statusLogFilter, statusLogEmailSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusLogFilter]);

  useEffect(() => {
    if (tab !== "logs" || logCategory !== "root_subordinate_decision") return;
    fetchRootSubordinateDecisionLogs(rootSubordinateDecisionFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootSubordinateDecisionFilter]);

  useEffect(() => {
    if (tab !== "credentials") return;
    fetchAdminCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminCredIssuerFilter, adminCredTypeFilter]);

  useEffect(() => () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
  }, []);

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

      <AppToast show={!!message} message={message} type={messageType} />

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
                width: "90vw",
                maxWidth: "900px",
                maxHeight: "80vh",
                overflowY: "auto",
                background: "#101018",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.15)",
                padding: "28px",
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: "0 0 16px 0" }}>
                    Credential History (Blockchain Audit Trail)
                  </h3>
                  <div
                    style={{
                      fontSize: "13px",
                      opacity: 0.85,
                      marginTop: "6px",
                      textAlign: "left",
                      display: "grid",
                      gap: "6px",
                    }}
                  >
                    <div>
                      <strong>Blockchain ID:</strong>{" "}
                      <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
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
                      {selectedCredentialRow?.holderName || "—"}
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
                    <table className="admin-table history-modal-table">
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
                              <td style={{ padding: "12px 16px" }}>{formatTimestamp(entry.timestamp)}</td>

                              <td style={{ padding: "12px 16px" }}>
                                <span
                                  className={`history-action-badge ${(action || "").toLowerCase().replace(/\s+/g, "-")}`}
                                  style={{ background: `${getStatusColor(action) === "inherit" ? "rgba(139,92,246,0.18)" : getStatusColor(action)}22`, color: getStatusColor(action) === "inherit" ? "#c4b5fd" : getStatusColor(action), border: `1px solid ${getStatusColor(action) === "inherit" ? "rgba(139,92,246,0.35)" : `${getStatusColor(action)}55`}` }}
                                >
                                  {action}
                                </span>
                              </td>

                              <td style={{ padding: "12px 16px" }}>
                                <span
                                  className="status-value"
                                  style={{ color: getStatusColor(status), fontWeight: 700 }}
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
                                  padding: "12px 16px",
                                  fontFamily: "monospace",
                                  fontSize: "12px",
                                }}
                              >
                                {String(entry.txId || "N/A").slice(0, 18)}...
                              </td>

                              <td style={{ padding: "12px 16px", fontSize: "12px", opacity: 0.95 }}>
                                {entry.isDelete ? (
                                  <span>Record deleted</span>
                                ) : (
                                  <span>
                                    {entry.value?.credentialName ||
                                      entry.value?.credentialType ||
                                      "—"}
                                    {" | "}
                                    Holder:{" "}
                                    <span>
                                      {entry.value?.holderName || entry.holderName || "—"}
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

      {descriptionModal &&
        ReactDOM.createPortal(
          <div
            onClick={() => setDescriptionModal(null)}
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
                width: "min(600px, 95vw)",
                background: "#101018",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.15)",
                padding: "24px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                color: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px" }}>{descriptionModal.name}</h3>
                <button
                  type="button"
                  onClick={() => setDescriptionModal(null)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: "14px", lineHeight: "1.7", color: "rgba(255,255,255,0.85)", whiteSpace: "pre-wrap" }}>
                {descriptionModal.description}
              </div>
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
                          <td>{renderStatusText(log.previousStatus)}</td>
                          <td>
                            {renderStatusText(log.newStatus)}
                          </td>
                          <td>{log.reason || "—"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.adminEmail || "N/A"}
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
        <>
          {/* ── Analytics Overview ── */}
          {renderStatsGrid(credentialStats)}

          {/* ── Charts Row ── */}
          <div className="admin-analytics-row">
            {/* Bar Chart — Credentials by Issuer */}
            <div className="admin-chart-card">
              <h3>Credentials by Issuer</h3>
              <div className="chart-bars" style={{ marginBottom: 28 }}>
                {(() => {
                  const issuerCounts = {};
                  adminCredentials.forEach(r => {
                    const name = r.issuerName || "Unknown";
                    issuerCounts[name] = (issuerCounts[name] || 0) + 1;
                  });
                  const entries = Object.entries(issuerCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
                  const max = Math.max(...entries.map(e => e[1]), 1);
                  const colors = ["#667eea", "#8b5cf6", "#a78bfa", "#22c55e", "#f59e0b", "#60a5fa"];
                  return entries.length > 0 ? entries.map(([name, count], i) => (
                    <div
                      key={name}
                      className="chart-bar"
                      style={{
                        height: `${(count / max) * 100}%`,
                        background: `linear-gradient(180deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}88)`,
                        minHeight: 8,
                      }}
                      title={`${name}: ${count}`}
                    >
                      <span className="chart-bar-value">{count}</span>
                      <span className="chart-bar-label">{name.length > 12 ? name.slice(0, 12) + "…" : name}</span>
                    </div>
                  )) : (
                    <div style={{ color: "#888", fontSize: 13, textAlign: "center", width: "100%", paddingTop: 40 }}>No credential data yet</div>
                  );
                })()}
              </div>
            </div>

            {/* Donut Chart — Status Breakdown */}
            <div className="admin-chart-card">
              <h3>Status Breakdown</h3>
              <div className="chart-donut-wrap">
                {(() => {
                  const issued = adminCredentials.filter(r => r.type === "issued");
                  const active = issued.filter(r => r.status === "issued" || r.status === "active").length;
                  const revoked = issued.filter(r => r.status === "revoked").length;
                  const expired = issued.filter(r => r.status === "expired").length;
                  const templates = adminCredentials.filter(r => r.type === "template").length;
                  const total = active + revoked + expired + templates || 1;

                  const segments = [
                    { label: "Active", count: active, color: "#4ade80" },
                    { label: "Revoked", count: revoked, color: "#f87171" },
                    { label: "Expired", count: expired, color: "#fbbf24" },
                    { label: "Templates", count: templates, color: "#a78bfa" },
                  ];

                  let cumPercent = 0;
                  const gradientParts = segments.map(s => {
                    const start = cumPercent;
                    const pct = (s.count / total) * 100;
                    cumPercent += pct;
                    return `${s.color} ${start}% ${cumPercent}%`;
                  });

                  return (
                    <>
                      <div
                        className="chart-donut"
                        style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
                      >
                        <div className="chart-donut-center">{issued.length}</div>
                      </div>
                      <div className="chart-donut-legend">
                        {segments.map(s => (
                          <div key={s.label} className="legend-item">
                            <span className="legend-dot" style={{ background: s.color }} />
                            {s.label}: <strong>{s.count}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ── Credentials Table ── */}
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
                        {issuer.orgName || issuer.name || id}
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

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="adminCredentialSortBy">Sort by:</label>
                <select
                  id="adminCredentialSortBy"
                  value={adminCredentialSortBy}
                  onChange={(e) => setAdminCredentialSortBy(e.target.value)}
                >
                  <option value="newest">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Credential Name A-Z</option>
                  <option value="name-desc">Credential Name Z-A</option>
                  <option value="status-asc">Status A-Z</option>
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
            ) : sortedAdminCredentials.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Issuer</th>
                      <th>Credential ID</th>
                      <th>Type</th>
                      <th>Credential Name</th>
                      <th>Description</th>
                      <th>Holder ID</th>
                      <th>Holder Name</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAdminCredentials.map((row, idx) => {
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
                          <td>{renderDescriptionCell(row)}</td>
                          <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                            {row.holderID || "—"}
                          </td>
                          <td>{row.holderName || "—"}</td>
                          <td>{renderStatusText(row.status || "unknown", "unknown")}</td>
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
        </>
      )}

      {/* ISSUERS TAB */}
      {tab === "issuers" && (
        <div className="tab-card">
          <h2>Issuer Management</h2>
          {renderStatsGrid(issuerStats)}

          <div className="issuer-filter-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label htmlFor="issuerFilter">View:</label>
              <select
                id="issuerFilter"
                value={issuerFilter}
                onChange={async (e) => {
                  const value = e.target.value;
                  setIssuerFilter(value);

                  if (value === "pending") {
                    setPendingIssuerFilter("admin_actionable");
                  }
                }}
              >
                <option value="approved">Approved Issuers</option>
                <option value="pending">Pending Issuers</option>
                <option value="rejected">Rejected Issuers</option>
                <option value="disabled">Disabled Issuers</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label htmlFor="issuerSortBy">Sort by:</label>
              <select
                id="issuerSortBy"
                value={issuerSortBy}
                onChange={(e) => setIssuerSortBy(e.target.value)}
              >
                <option value="newest">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Org Name A-Z</option>
                <option value="name-desc">Org Name Z-A</option>
                <option value="status-asc">Status A-Z</option>
              </select>
            </div>
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
          ) : sortedVisibleIssuers.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    {activeIssuerColumns.map((column) => (
                      <th key={column}>{issuerColumnLabels[column]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedVisibleIssuers.map((issuer) => {
                    const id = issuer._id || issuer.id;
                    const isDisabled = issuer.isDisabled === true || issuer.status === "disabled";
                    const adminMeta = getIssuerAdminMeta(issuer);
                    const canSeeDocuments = issuer.documents?.length > 0 || issuer.hasUploadedDocuments || issuer.hasDocuments;

                    const rootApprovalBadge = issuer.issuerType === "subordinate" ? (
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
                    );

                    const actionsCell = (() => {
                      if (issuerFilter === "approved") {
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => openIssuerStatusModal(issuer, isDisabled ? "enable" : "disable")}
                              style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.18)",
                                cursor: "pointer",
                                fontWeight: 700,
                                background: isDisabled ? "rgba(74,222,128,0.12)" : "rgba(255,107,107,0.12)",
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
                        );
                      }

                      if (issuerFilter === "disabled") {
                        return (
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
                              color: "#4ade80",
                            }}
                            title="Re-enable issuer"
                          >
                            Enable
                          </button>
                        );
                      }

                      if (issuerFilter === "rejected") {
                        return <span style={{ opacity: 0.65 }}>—</span>;
                      }

                      const isAwaitingRoot = pendingIssuerFilter === "awaiting_root";
                      const isPendingRoot = pendingIssuerFilter === "root_only";
                      const isRootApproved = pendingIssuerFilter === "root_approved" || pendingIssuerFilter === "admin_actionable";
                      const showAdminDecision = !isAwaitingRoot && (isPendingRoot || isRootApproved || pendingIssuerFilter === "all_pending" || pendingIssuerFilter === "subordinate_only");

                      return (
                        <>
                          {showAdminDecision ? (
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
                            </>
                          ) : (
                            <span style={{ opacity: 0.5, fontSize: "12px", fontStyle: "italic" }}>Awaiting Root Approval</span>
                          )}

                          {canSeeDocuments && (
                            <button
                              type="button"
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
                          )}
                        </>
                      );
                    })();

                    const issuerCellMap = {
                      issuerId: id || "N/A",
                      orgName: issuer.orgName || issuer.name || "N/A",
                      email: issuer.email || "N/A",
                      issuerType: issuer.issuerType === "subordinate" ? <span className="badge purple">Subordinate</span> : <span className="badge blue">Root</span>,
                      rootAuthority: issuer.issuerType === "subordinate" ? (issuer.rootAuthorityName || "N/A") : "—",
                      rootApproval: rootApprovalBadge,
                      rootApprovedAt: issuer.issuerType === "subordinate" ? (issuer.rootApprovalStatus === "approved" ? formatTimestamp(issuer.rootApprovedAt) : issuer.rootApprovalStatus === "rejected" ? "Rejected by Root" : "Pending") : "—",
                      status: renderStatusText(issuer.status || (isDisabled ? "disabled" : "approved"), isDisabled ? "disabled" : "approved"),
                      approvedBy: <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{adminMeta.approvedBy}</span>,
                      rejectedBy: <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{adminMeta.rejectedBy}</span>,
                      disabledBy: <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{adminMeta.disabledBy}</span>,
                      enabledBy: <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{adminMeta.enabledBy}</span>,
                      createdAt: formatTimestamp(issuer.createdAt),
                      actions: <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actionsCell}</div>,
                    };

                    return (
                      <tr key={id}>
                        {activeIssuerColumns.map((column) => (
                          <td key={`${id}-${column}`}>{issuerCellMap[column]}</td>
                        ))}
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
          {renderStatsGrid(userStats)}

          <div className="issuer-filter-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label htmlFor="userSortBy">Sort by:</label>
              <select id="userSortBy" value={userSortBy} onChange={(e) => setUserSortBy(e.target.value)}>
                <option value="newest">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Username A-Z</option>
                <option value="name-desc">Username Z-A</option>
                <option value="status-asc">Email A-Z</option>
              </select>
            </div>
          </div>

          {usersLoading ? (
            <div className="tab-placeholder">Loading users...</div>
          ) : sortedVisibleUsers.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Created At</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVisibleUsers.map((user) => {
                    const isDisabled = user.isActive === false;
                    return (
                      <tr key={user._id || user.id}>
                        <td>{user._id || user.id}</td>
                        <td>{user.email || "N/A"}</td>
                        <td>{user.username || user.fullName || "N/A"}</td>
                        <td>{user.role || "user"}</td>
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
          <div className="issuer-filter-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <label htmlFor="verificationSortBy">Sort by:</label>
            <select id="verificationSortBy" value={verificationSortBy} onChange={(e) => setVerificationSortBy(e.target.value)}>
              <option value="newest">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Credential Name A-Z</option>
              <option value="name-desc">Credential Name Z-A</option>
              <option value="status-asc">Status A-Z</option>
            </select>
          </div>
          {verificationsLoading ? (
            <div className="tab-placeholder">Loading verifications...</div>
          ) : sortedVerifications.length > 0 ? (
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
                  {sortedVerifications.map((v) => (
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
          {renderStatsGrid(logStats)}

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
              <option value="root_subordinate_decision">Root Subordinate Decision Logs</option>
            </select>

            <label htmlFor="activeLogSort">Sort by:</label>
            <select
              id="activeLogSort"
              value={logCategory === "status" ? statusLogSortBy : logCategory === "decision" ? issuerDecisionLogSortBy : logCategory === "root_subordinate_decision" ? rootSubordinateLogSortBy : verificationSortBy}
              onChange={(e) => {
                const value = e.target.value;
                if (logCategory === "status") setStatusLogSortBy(value);
                else if (logCategory === "decision") setIssuerDecisionLogSortBy(value);
                else if (logCategory === "root_subordinate_decision") setRootSubordinateLogSortBy(value);
                else setVerificationSortBy(value);
              }}
            >
              <option value="newest">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="status-asc">Status A-Z</option>
            </select>

            {logCategory === "status" && (
              <>
                <label htmlFor="statusLogFilter">Filter:</label>
                <select
                  id="statusLogFilter"
                  value={statusLogFilter}
                  onChange={(e) => {
                    setStatusLogFilter(e.target.value)
                  }}
                >
                  <option value="all">All</option>
                  <option value="issuers">Issuers</option>
                  <option value="users">Users</option>
                </select>

                <input
                  type="text"
                  value={statusLogEmailSearch}
                  onChange={(e) => setStatusLogEmailSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") fetchStatusLogs(statusLogFilter, e.target.value); }}
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

            {logCategory === "root_subordinate_decision" && (
              <>
                <label htmlFor="rootSubordinateDecisionFilter">Decision:</label>
                <select
                  id="rootSubordinateDecisionFilter"
                  value={rootSubordinateDecisionFilter}
                  onChange={(e) => setRootSubordinateDecisionFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <input
                  type="text"
                  value={rootSubordinateSearchQuery}
                  onChange={(e) => setRootSubordinateSearchQuery(e.target.value)}
                  placeholder="Search root authority name..."
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    outline: "none",
                    minWidth: 260,
                  }}
                />
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
                    if (logsLoaded) fetchIssuerDecisionLogs(e.target.value);
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
                const filtered = sortedIssuerDecisionLogs;

                return filtered.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Issuer Email</th>
                          <th>Org Name</th>
                          <th>Decision</th>
                          <th>Reason</th>
                          <th>Approved / Rejected By</th>
                          <th>Performed By</th>
                          <th>MSP</th>
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
                                {log.adminEmail || "N/A"}
                              </td>
                              <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                                {log.performedBy || "N/A"}
                              </td>
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
          ) : logCategory === "root_subordinate_decision" ? (
            <>
              {rootSubordinateLogsError ? (
                <div className="tab-placeholder">❌ {rootSubordinateLogsError}</div>
              ) : (() => {
                const query = rootSubordinateSearchQuery.trim().toLowerCase();
                const filtered = query
                  ? rootSubordinateLogs.filter((log) => {
                      const searchable = [
                        log.rootAuthorityName,
                        log.issuerEmail,
                        log.orgName,
                      ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();
                      return searchable.includes(query);
                    })
                  : sortedRootSubordinateLogs;

                return filtered.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Root Authority Name</th>
                          <th>Subordinate Issuer Email</th>
                          <th>Organization Name</th>
                          <th>Decision</th>
                          <th>Reason</th>
                          <th>Performed By MSP</th>
                          <th>Tx ID</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((log, index) => {
                          const isApproved =
                            String(log.decision || "").toLowerCase() === "approved";
                          return (
                            <tr key={log.txId || `${log.rootAuthorityName || "root"}-${index}`}>
                              <td>{log.rootAuthorityName || "N/A"}</td>
                              <td>{log.issuerEmail || "N/A"}</td>
                              <td>{log.orgName || "N/A"}</td>
                              <td>
                                <span style={{ fontWeight: 700, color: isApproved ? "#4ade80" : "#ff6b6b" }}>
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
                  <div className="tab-placeholder">No root subordinate logs found.</div>
                );
              })()}
            </>
          ) : logCategory === "verification" ? (
            <>
              {verificationLogsError ? (
                <div className="tab-placeholder">{verificationLogsError}</div>
              ) : sortedVerificationLogs.length > 0 ? (
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
                      {sortedVerificationLogs.map((log) => (
                        <tr key={log.logId || log.txId}>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.logId || log.id || "N/A"}
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
                          <td>{log.result?.reason || log.resultMessage || "N/A"}</td>
                          <td>{formatTimestamp(log.timestamp || log.verifiedAt)}</td>
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
              ) : sortedStatusLogs.length > 0 ? (
                <div className="table-wrapper">
                  <table className="admin-table">
                    {/* Removed Admin Email + Performed By (fabric) columns, renamed Performed By MSP → Performed By */}
                    <thead>
                      <tr>
                        <th>Log ID</th>
                        <th>Target Type</th>
                        <th>Email</th>
                        <th>Previous Status</th>
                        <th>New Status</th>
                        <th>Reason</th>
                        <th>Performed By</th>
                        <th>Tx ID</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStatusLogs.map((log) => (
                        <tr key={log.id || log.txId}>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.id ? `${String(log.id).slice(0, 18)}...` : "N/A"}
                          </td>
                          <td>{log.entity || "N/A"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.issuerEmail || log.userEmail || log.targetEmail || "N/A"}
                          </td>
                          <td>{renderStatusText(log.previousStatus)}</td>
                          <td>
                            {renderStatusText(log.newStatus)}
                          </td>
                          <td>{log.reason || "N/A"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.adminEmail || "N/A"}
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
