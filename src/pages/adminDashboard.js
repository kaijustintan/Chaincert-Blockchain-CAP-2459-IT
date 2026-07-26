// adminDashboard.js
/*
  FILE: adminDashboard.js
  LAYMAN (Tropang Ex): Ito yung "control center" ng admin. Dito niya pinamamahalaan ang mga issuer
  (approve/reject/enable/disable, kasama ang pending queues), tinitingnan ang lahat ng credentials at
  users, binabasa ang immutable Audit Logs mula sa blockchain, pinapatakbo ang integrity check (CouchDB
  vs ledger), at nakikita ang Analytics & Reports (verification summary, suspicious activity, demand,
  integrity insight) — lahat ng raw na log ay pinoproseso muna bago ipakita.

  TECHNICAL: Role=admin React page behind adminProtectedRoutes. Tab-driven (credentials · issuers ·
  users · logs · analytics) inside the design-system AppShell/Sidebar. Heavy apiService usage; reads are
  lazy per tab. Logs tab is the unified "Audit Logs" view (ADMIN5 — Status + Issuer Decision merged with
  a Type filter) plus Verification + Root-Subordinate categories. Analytics uses the shared helpers
  (computeVerificationOutcomes / computeSuspiciousIssuers / computeIntegritySummary) and
  a per-credential "Credential Dossier" modal (computeProvenance / computeProofTrail). effectiveCredential
  Status (F01) for compute-on-read expiry. Verification logs are admin-only globally.

  OUTLINE:
    CREDENTIALS tab     all issued credentials (cross-issuer) + Credential Dossier modal
    ISSUERS tab         pending/approved/rejected/disabled queues + approve/reject/enable/disable
    USERS tab           holder accounts + enable/disable
    LOGS tab            unified Audit Logs (ADMIN5) + Verification + Root-Subordinate (blockchain reads)
    ANALYTICS tab       KPI strip + Verification Summary / Suspicious Activity / Demand / Integrity insight
*/
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import "../styles/adminDashboard.css";
import "../styles/analytics.css";
import apiService from "../services/apiService";
import AppToast from "../components/appToast";
import DonutChart from "../components/analytics/DonutChart";
import InterpretationBox from "../components/analytics/InterpretationBox";
import {
  computeVerificationOutcomes,
  computeSuspiciousIssuers,
  computeIntegritySummary,
  computeProvenance,
  computeProofTrail,
  computeIssuerApprovalTurnaround,
  QUEUE_AGING_NOTE_DAYS,
} from "../components/analytics/analytics";
import { AppShell, Sidebar, Spinner, SpinnerBlock, InfoHint } from "../components/ui";
import Pagination, { usePagination } from "../components/ui/Pagination";
import CredentialHistory from "../components/analytics/CredentialHistory";
import NotesCard from "../components/ui/NotesCard";
import StatusLegend from "../components/ui/StatusLegend";
import { effectiveCredentialStatus } from "../utils/credentialStatus"; // F01: compute-on-read expiry
import { Bell, Layers, Building2, Users, ClipboardList, BarChart3, ShieldCheck, Flag, Clock, Timer, Check } from "lucide-react";

export default function AdminDashboard() {
  // Admin lands on Manage Issuers → Pending: clearing the pending-issuer queue is the
  // admin's most time-sensitive job (issuers wait to onboard), not browsing credentials.
  const [tab, setTab] = useState("issuers");
  const [pendingIssuers, setPendingIssuers] = useState([]);
  const [approvedIssuers, setApprovedIssuers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [issuerStatsLoaded, setIssuerStatsLoaded] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const feedbackTimerRef = useRef(null);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [adminNotificationsLoading, setAdminNotificationsLoading] = useState(true);
  const [adminNotificationsError, setAdminNotificationsError] = useState(null);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [adminNotificationsOpen, setAdminNotificationsOpen] = useState(false);
  const adminNotificationPanelRef = useRef(null);
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [integrityConfirmOpen, setIntegrityConfirmOpen] = useState(false); // ADMIN2: styled confirm

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

  const adminUnreadNotifications = useMemo(
    () => adminNotifications.filter((notification) => !notification.read),
    [adminNotifications]
  );

  const [issuerFilter, setIssuerFilter] = useState("pending");

  // ✅ NEW: secondary filter for pending issuers only
  const [pendingIssuerFilter, setPendingIssuerFilter] = useState("all_pending");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("active");
  const [userSearch, setUserSearch] = useState("");

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
  const [adminCredStatusFilter, setAdminCredStatusFilter] = useState("all");
  const [adminCredentials, setAdminCredentials] = useState([]);
  const [adminCredentialsLoading, setAdminCredentialsLoading] = useState(false);
  const [adminCredentialsError, setAdminCredentialsError] = useState(null);

  // ✅ NEW: local search (frontend-only) for admin credentials table
  const [adminCredSearchField, setAdminCredSearchField] = useState("holderName"); // 'holderName' | 'holderID' | 'credentialId' | 'credentialName'
  const [adminCredSearchQuery, setAdminCredSearchQuery] = useState("");
  const [filteredAdminCredentials, setFilteredAdminCredentials] = useState([]);

  const [adminCredentialSortBy, setAdminCredentialSortBy] = useState("newest");
  const [issuerSortBy, setIssuerSortBy] = useState("newest");
  const [issuerTypeFilter, setIssuerTypeFilter] = useState("all");
  const [rejectedByFilter, setRejectedByFilter] = useState("all"); // A1: all | root | admin
  const [disabledByFilter, setDisabledByFilter] = useState("all"); // A2: all | me | others
  const [issuerSearch, setIssuerSearch] = useState("");
  const [userSortBy, setUserSortBy] = useState("newest");
  const [verificationSortBy, setVerificationSortBy] = useState("newest");
  const [verificationResultFilter, setVerificationResultFilter] = useState("all"); // final review: filter verification logs by outcome
  const [verificationLogSearch, setVerificationLogSearch] = useState(""); // final review: search verification logs
  const [statusLogSortBy, setStatusLogSortBy] = useState("newest");
  const [issuerDecisionLogSortBy, setIssuerDecisionLogSortBy] = useState("newest");
  const [rootSubordinateLogSortBy, setRootSubordinateLogSortBy] = useState("newest");
  // ADMIN5: merged "Audit Logs" view (status changes + issuer decisions in one table)
  const [auditTypeFilter, setAuditTypeFilter] = useState("all"); // all | status | decision
  const [auditSearch, setAuditSearch] = useState("");

  // ✅ NEW: modal state for viewing a specific credential's blockchain history
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCredentialRow, setSelectedCredentialRow] = useState(null);
  const [credentialHistory, setCredentialHistory] = useState([]);
  const [credentialHistoryLoading, setCredentialHistoryLoading] = useState(false);
  const [credentialHistoryError, setCredentialHistoryError] = useState(null);
  // ADMIN7: raw audit table removed from the dossier (insight-first).
  const [descriptionModal, setDescriptionModal] = useState(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityResult, setIntegrityResult] = useState(null);

  // Approve Issuer confirmation modal state - polo
  const [showApproveIssuerModal, setShowApproveIssuerModal] = useState(false);
  const [approveIssuerId, setApproveIssuerId] = useState(null);
  const [approveIssuerName, setApproveIssuerName] = useState('');
  const [approveIssuerLoading, setApproveIssuerLoading] = useState(false);
  const [approveIssuerError, setApproveIssuerError] = useState('');

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
    if (["issued", "active", "approved", "enabled"].includes(s)) return "var(--ok)";
    if (["revoked", "disabled", "rejected"].includes(s)) return "var(--danger)";
    if (["expired"].includes(s)) return "var(--warn)";
    if (["pending"].includes(s)) return "var(--warn)";
    if (["template"].includes(s)) return "var(--info)";
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

  const renderDescriptionCell = useCallback((row, showPlaceholder = true) => {
    const rawDescription = typeof row?.description === "string" ? row.description : "";
    const trimmedDescription = rawDescription.trim();
    if (!trimmedDescription || trimmedDescription.toLowerCase() === "n/a") {
      return showPlaceholder ? <span style={{ opacity: 0.4 }}>—</span> : null;
    }

    return (
      <button
        type="button"
        className="action-btn"
        onClick={() => setDescriptionModal({ name: row?.credentialName || row?.credentialType || "Credential", description: trimmedDescription })}
        style={{ padding: "4px 10px", fontSize: "11px", background: "var(--accent-weak)", color: "var(--accent-strong)", border: "1px solid var(--accent-weak)", borderRadius: "6px", cursor: "pointer" }}
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
    if (issuerFilter === "approved") {
      const approvedAndDisabled = [
        ...(approvedIssuers || []),
        ...(disabledIssuers || []).filter((issuer) => issuer.previousStatus === 'approved' || issuer.approvedAt || issuer.approvedBy),
      ];
      return approvedAndDisabled.filter((issuer, index, arr) => {
        const id = issuer._id || issuer.id;
        return id && arr.findIndex((item) => (item._id || item.id) === id) === index;
      });
    }
    if (issuerFilter === "pending") return pendingIssuers;
    if (issuerFilter === "rejected") return rejectedIssuers;
    if (issuerFilter === "disabled") return disabledIssuers;
    return [];
  };

  const visibleIssuers = getVisibleIssuers();

  // Current admin's email (for the A2 "disabled by me" filter). disabledBy/rejectedBy
  // are stored as the admin's email (req.user.email) on the backend.
  const currentAdminEmail = (JSON.parse(localStorage.getItem("user") || "{}").email || localStorage.getItem("email") || "").toLowerCase();

  const filteredVisibleIssuers = useMemo(() => {
    let result = [...visibleIssuers];
    const query = issuerSearch.trim().toLowerCase();

    if (issuerFilter === 'approved' && issuerTypeFilter !== 'all') {
      result = result.filter((issuer) => String(issuer.issuerType || 'root').toLowerCase() === issuerTypeFilter);
    }

    // A1: distinguish who rejected. A subordinate rejected by its ROOT keeps
    // rootApprovalStatus='rejected'; an admin rejection does not (it sets status='rejected').
    if (issuerFilter === 'rejected' && rejectedByFilter !== 'all') {
      result = result.filter((issuer) => {
        const rootRejected = String(issuer.rootApprovalStatus || '').toLowerCase() === 'rejected';
        return rejectedByFilter === 'root' ? rootRejected : !rootRejected;
      });
    }

    // A2: disabled by me vs others (disabledBy = the admin email who disabled it).
    if (issuerFilter === 'disabled' && disabledByFilter !== 'all') {
      result = result.filter((issuer) => {
        const by = String(issuer.disabledBy || '').toLowerCase();
        if (!by) return false; // unknown disabler shows only under "All"
        return disabledByFilter === 'me' ? by === currentAdminEmail : by !== currentAdminEmail;
      });
    }

    if (query) {
      result = result.filter((issuer) => [issuer.orgName, issuer.name, issuer.email].filter(Boolean).join(' ').toLowerCase().includes(query));
    }

    return result;
  }, [issuerFilter, issuerSearch, issuerTypeFilter, rejectedByFilter, disabledByFilter, currentAdminEmail, visibleIssuers]);

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

  const filteredVisibleUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return visibleUsers;
    return visibleUsers.filter((user) => [user.email, user.username, user._id, user.id].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [userSearch, visibleUsers]);

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
  // UX pagination (10/page) for the admin Credentials table — client-side over the filtered/sorted set.
  const adminCredsPg = usePagination(sortedAdminCredentials, 10);

  const sortedVisibleIssuers = useMemo(() => sortByDateThenName(filteredVisibleIssuers, issuerSortBy, { dateFields: ["createdAt"], nameFields: ["orgName", "name", "email"], statusField: "status" }), [filteredVisibleIssuers, issuerSortBy]);

  const sortedVisibleUsers = useMemo(() => sortByDateThenName(filteredVisibleUsers, userSortBy, { dateFields: ["createdAt"], nameFields: ["username", "fullName", "email"], statusField: "email" }), [filteredVisibleUsers, userSortBy]);


  const sortedStatusLogs = useMemo(() => sortByDateThenName(statusLogs, statusLogSortBy, { dateFields: ["timestamp", "createdAt"], nameFields: ["email", "adminEmail"], statusField: "newStatus" }), [statusLogs, statusLogSortBy]);

  const sortedIssuerDecisionLogs = useMemo(() => sortByDateThenName(issuerDecisionLogs, issuerDecisionLogSortBy, { dateFields: ["timestamp", "createdAt"], nameFields: ["issuerEmail", "orgName"], statusField: "decision" }), [issuerDecisionLogs, issuerDecisionLogSortBy]);

  const sortedRootSubordinateLogs = useMemo(() => sortByDateThenName(rootSubordinateLogs, rootSubordinateLogSortBy, { dateFields: ["timestamp", "createdAt"], nameFields: ["issuerEmail", "orgName"], statusField: "decision" }), [rootSubordinateLogs, rootSubordinateLogSortBy]);

  // ADMIN5: unify Status Change Logs + Issuer Decision Logs into one "Audit Logs"
  // feed. Normalize both shapes into a common row, apply the Type sub-filter +
  // a client-side search, and order by timestamp (direction from statusLogSortBy).
  const auditLogs = useMemo(() => {
    const fromStatus = (sortedStatusLogs || []).map((log) => ({
      _kind: "status",
      type: "Status Change",
      timestamp: log.timestamp || log.createdAt,
      target: log.issuerEmail || log.userEmail || log.targetEmail || "N/A",
      targetType: log.entity || "",
      prev: log.previousStatus,
      next: log.newStatus,
      decision: null,
      reason: log.reason,
      performedBy: log.adminEmail || "N/A",
      txId: log.txId || log.id,
    }));
    const fromDecision = (sortedIssuerDecisionLogs || []).map((log) => ({
      _kind: "decision",
      type: "Issuer Decision",
      timestamp: log.timestamp || log.createdAt,
      target: log.issuerEmail || "N/A",
      targetType: log.orgName || "",
      prev: null,
      next: null,
      decision: log.decision || "N/A",
      reason: log.reason,
      performedBy: log.adminEmail || "N/A",
      txId: log.txId || log.id,
    }));

    let merged = [...fromStatus, ...fromDecision];
    if (auditTypeFilter === "status") merged = merged.filter((m) => m._kind === "status");
    else if (auditTypeFilter === "decision") merged = merged.filter((m) => m._kind === "decision");

    const q = auditSearch.trim().toLowerCase();
    if (q) {
      merged = merged.filter((m) =>
        [m.target, m.targetType, m.performedBy, m.reason, m.decision, m.prev, m.next]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    const dir = statusLogSortBy === "oldest" ? 1 : -1;
    merged.sort(
      (a, b) =>
        dir *
        ((new Date(a.timestamp).getTime() || 0) - (new Date(b.timestamp).getTime() || 0))
    );
    return merged;
  }, [sortedStatusLogs, sortedIssuerDecisionLogs, auditTypeFilter, auditSearch, statusLogSortBy]);

  // Final review: derive a normalized outcome for a verification log (mirrors the badge logic in the table).
  const verifLogOutcome = (log) => {
    const r = (log && log.result) || {};
    const reason = String(r.reason || log?.resultMessage || "").toLowerCase();
    const status = String(r.status || "").toLowerCase();
    if (status === "not_found" || reason.includes("not found")) return "not_found";
    if (r.valid === true || (reason.includes("valid") && !reason.includes("invalid"))) return "valid";
    if (reason.includes("revoked")) return "revoked";
    if (reason.includes("expired")) return "expired";
    if (r.valid === false) return "invalid";
    return "other";
  };
  // Final review: verification logs gained a Result filter + Search (had a Result column but no way to filter it).
  const filteredVerificationLogs = useMemo(() => {
    let rows = verificationLogs;
    if (verificationResultFilter !== "all") rows = rows.filter((log) => verifLogOutcome(log) === verificationResultFilter);
    const q = verificationLogSearch.trim().toLowerCase();
    if (q) rows = rows.filter((log) => [log.verifierName, log.verifierEmail, log.credentialId, log.holderID, log.holderName, log.logId].filter(Boolean).join(" ").toLowerCase().includes(q));
    return rows;
  }, [verificationLogs, verificationResultFilter, verificationLogSearch]);
  const sortedVerificationLogs = useMemo(() => sortByDateThenName(filteredVerificationLogs, verificationSortBy, { dateFields: ["timestamp", "verifiedAt", "createdAt"], nameFields: ["verifierName", "holderName", "credentialId"], statusField: "resultMessage" }), [filteredVerificationLogs, verificationSortBy]);
  // UAT: pagination (10/page) for the admin tables — client-side over the filtered/sorted sets.
  const issuersPg = usePagination(sortedVisibleIssuers, 10);
  const usersPg = usePagination(sortedVisibleUsers, 10);
  const auditPg = usePagination(auditLogs, 10);
  const verifyPg = usePagination(sortedVerificationLogs, 10);
  // Root-subordinate decision logs: filter the SORTED list (the previous inline filter
  // searched the raw unsorted array, so an active search silently ignored the Sort control),
  // then paginate like every other log table.
  const filteredRootSubordinateLogs = useMemo(() => {
    const query = rootSubordinateSearchQuery.trim().toLowerCase();
    if (!query) return sortedRootSubordinateLogs;
    return sortedRootSubordinateLogs.filter((log) =>
      [log.rootAuthorityName, log.issuerEmail, log.orgName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [sortedRootSubordinateLogs, rootSubordinateSearchQuery]);
  const rootSubPg = usePagination(filteredRootSubordinateLogs, 10);

  // Phase 4: Analytics & Reports tab — Verification Result Summary + Suspicious Activity
  const verificationOutcomes = useMemo(() => computeVerificationOutcomes(verificationLogs), [verificationLogs]);
  const suspicious = useMemo(() => computeSuspiciousIssuers(adminCredentials), [adminCredentials]);
  /* Phase 4 NICE: processed view of the last CouchDB-vs-ledger integrity check (reuses existing result) */
  const integrity = useMemo(() => computeIntegritySummary(integrityResult), [integrityResult]);
  /* C6: issuer approval queue (aging) + turnaround — what an admin actually acts on (per Sir Danny) */
  const approvalQueue = useMemo(() => computeIssuerApprovalTurnaround(pendingIssuers, approvedIssuers), [pendingIssuers, approvedIssuers]);
  /* C12: verification volume per month — honest usage/load signal (peak seasons like graduation) */
  /* Phase 4 GOOD: per-credential dossier (processed lifecycle timeline + immutable verification trail) */
  const provenance = useMemo(() => computeProvenance(credentialHistory), [credentialHistory]);
  const proofTrail = useMemo(
    () => computeProofTrail(verificationLogs, selectedCredentialRow?.credentialId || selectedCredentialRow?.blockchainId || selectedCredentialRow?.id),
    [verificationLogs, selectedCredentialRow]
  );

  const issuerColumnConfig = {
    approved: ["orgName", "issuerId", "email", "issuerType", "rootAuthority", "status", "approvedAt", "approvedBy", "actions"],
    pending: ["orgName", "issuerId", "email", "issuerType", "rootAuthority", "rootApproval", "status", "createdAt", "daysWaiting", "actions"],
    rejected: ["orgName", "issuerId", "email", "issuerType", "rejectedBy", "rejectedAt"],
    disabled: ["orgName", "issuerId", "email", "issuerType", "disabledBy", "disabledAt", "actions"],
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
    approvedAt: "Approved At",
    approvedBy: "Approved By",
    rejectedBy: "Rejected By",
    rejectedAt: "Rejected At",
    disabledBy: "Disabled By",
    disabledAt: "Disabled At",
    enabledBy: "Enabled By",
    createdAt: "Created At",
    daysWaiting: "Days Waiting",
    actions: "Actions",
  };

  const activeIssuerColumns = issuerColumnConfig[issuerFilter] || issuerColumnConfig.approved;

  const getHistoryColumns = (filter) => {
    const base = ['credentialName', 'credentialType', 'status', 'createdAt'];
    if (filter === 'active' || filter === 'template') return [...base, 'credentialId'];
    if (filter === 'revoked') return [...base, 'holderName', 'revokedAt', 'revocationReason', 'credentialId'];
    if (filter === 'issued') return [...base, 'holderName', 'holderID', 'credentialId'];
    return [...base, 'holderName', 'holderID', 'credentialId'];
  };

  const historyColumnLabels = {
    credentialName: 'Credential Name',
    credentialType: 'Credential Type',
    status: 'Status',
    createdAt: 'Created At',
    holderName: 'Holder Name',
    holderID: 'Holder ID',
    revokedAt: 'Revoked Date',
    revocationReason: 'Revocation Reason',
    credentialId: 'Credential ID',
  };

  const activeHistoryColumns = getHistoryColumns(adminCredStatusFilter);

  const openHistoryModalForRow = async (row) => {
    try {
      const credentialId = row?.credentialId || row?.blockchainId || row?.id;
      setSelectedCredentialRow(row);
      setShowHistoryModal(true);
      setCredentialHistoryLoading(true);
      setCredentialHistoryError(null);
      setCredentialHistory([]);

      if (!credentialId) {
        setCredentialHistoryError('No blockchain ID found for this credential.');
        return;
      }

      // Phase 4 GOOD: the dossier's Verification Proof Trail reads from verificationLogs, which
      // are only auto-loaded on the analytics/logs tabs. Load them on demand if empty.
      if (!Array.isArray(verificationLogs) || verificationLogs.length === 0) {
        fetchVerificationLogs();
      }

      const resp = await apiService.Get_CredentialHistory(credentialId);
      const list = Array.isArray(resp.history) ? resp.history : [];
      const cleanHistory = list.filter((entry) => {
        const id = entry?.credentialId || entry?.id || entry?.key || entry?.value?.credentialId || '';
        const action = String(entry?.action || '').toLowerCase();
        const derivedAction = entry?.value?.status?.toLowerCase() === 'revoked' || entry?.value?.revokedAt
          ? 'revoked'
          : entry?.value?.assignedDate && entry?.value?.holderID
            ? 'issued'
            : entry?.value?.isTemplate === true || entry?.value?.holderID === '' || !entry?.value?.holderID
              ? 'created template'
              : 'updated';
        const status = String(entry?.status || entry?.value?.status || '').toLowerCase();
        const credentialType = String(entry?.credentialType || entry?.value?.credentialType || '').toLowerCase();

        if (String(id).startsWith('vlog_')) return false;
        if ((action === 'updated' || derivedAction === 'updated') && (status === 'status unknown' || status === 'unknown')) return false;
        if ((action === 'updated' || derivedAction === 'updated') && (credentialType === 'n/a' || credentialType === '')) return false;
        return true;
      });

      const sorted = [...cleanHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setCredentialHistory(sorted);
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to load credential history';
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

  // Group 5 (UAT): env toggle to hide issuer enable/disable during UAT so testers can't lock
  // out an issuer account. Set REACT_APP_DISABLE_ISSUER_TOGGLE=true (build-time); the backend
  // also enforces it (403). REMOVE before demo/prod.
  const ISSUER_TOGGLE_DISABLED = process.env.REACT_APP_DISABLE_ISSUER_TOGGLE === 'true';

  const openIssuerStatusModal = (issuer, action) => {
    if (ISSUER_TOGGLE_DISABLED) {
      showFeedback("info", "Issuer enable/disable is turned off during UAT.");
      return;
    }
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
        "Failed to update issuer status";
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

  // Opens the approve confirmation modal — actual API call is in submitApproveIssuer - polo
  const handleApproveIssuer = (issuerId, issuerName) => {
    setApproveIssuerId(issuerId);
    setApproveIssuerName(issuerName || issuerId);
    setApproveIssuerError('');
    setShowApproveIssuerModal(true);
  };

  const closeApproveIssuerModal = () => {
    if (approveIssuerLoading) return;
    setShowApproveIssuerModal(false);
    setApproveIssuerId(null);
    setApproveIssuerName('');
    setApproveIssuerError('');
  };

  const submitApproveIssuer = async () => {
    try {
      setApproveIssuerLoading(true);
      setApproveIssuerError('');
      await apiService.Approve_Issuer(approveIssuerId);
      showFeedback("success", "Approve issuer successful.");
      closeApproveIssuerModal();
      await fetchPendingIssuers(pendingIssuerFilter);
      await fetchApprovedIssuers();
    } catch (error) {
      console.error("Error approving issuer:", error);
      const msg = error.response?.data?.message || error.message || "Unknown error";
      setApproveIssuerError(`Failed to approve: ${msg}`);
      showFeedback("danger", `Failed to approve issuer: ${msg}`);
    } finally {
      setApproveIssuerLoading(false);
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

  const fetchAdminNotifications = useCallback(async () => {
    try {
      setAdminNotificationsLoading(true);
      setAdminNotificationsError(null);

      const [notificationsResponse, unreadResponse] = await Promise.all([
        apiService.getAdminNotifications(),
        apiService.getUnreadAdminNotifications(),
      ]);

      setAdminNotifications(
        Array.isArray(notificationsResponse?.notifications)
          ? notificationsResponse.notifications
          : []
      );
      setAdminUnreadCount(
        typeof unreadResponse?.unreadCount === "number"
          ? unreadResponse.unreadCount
          : Array.isArray(unreadResponse?.notifications)
            ? unreadResponse.notifications.length
            : 0
      );
    } catch (error) {
      console.error("[ADMIN DASHBOARD] Failed to fetch admin notifications:", error);
      setAdminNotificationsError("Failed to load notifications.");
    } finally {
      setAdminNotificationsLoading(false);
    }
  }, []);

  const handleAdminNotificationClick = async (notification) => {
    if (!notification) return;

    try {
      if (!notification.read) {
        await apiService.markAdminNotificationAsRead(notification._id);
        setAdminNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id
              ? { ...item, read: true, readAt: item.readAt || new Date().toISOString() }
              : item
          )
        );
        setAdminUnreadCount((prev) => Math.max(prev - 1, 0));
      }

      // Integrity-check notifications carry the full results in `details` — clicking opens the same
      // results modal as the manual button, no re-run needed. (Phase 5 M13 follow-up)
      if (notification.category === "integrity_check" && notification.details) {
        setIntegrityResult(notification.details);
        setShowIntegrityModal(true);
      }

      setAdminNotificationsOpen(false);
    } catch (error) {
      console.error("[ADMIN DASHBOARD] Failed to mark admin notification as read:", error);
    }
  };

  const handleMarkAllAdminNotificationsRead = async () => {
    try {
      await apiService.markAllAdminNotificationsAsRead();
      setAdminNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
          readAt: notification.readAt || new Date().toISOString(),
        }))
      );
      setAdminUnreadCount(0);
    } catch (error) {
      console.error("[ADMIN DASHBOARD] Failed to mark all admin notifications as read:", error);
    }
  };

  // -------------------------------------------------------------------
  // ADMIN GLOBAL CREDENTIALS VIEW (across all issuers)
  // -------------------------------------------------------------------
  // ADMIN2: open a styled in-app confirm instead of the native browser confirm.
  const handleIntegrityCheck = () => setIntegrityConfirmOpen(true);

  const runIntegrityCheck = async () => {
    setIntegrityConfirmOpen(false);
    setIntegrityLoading(true);
    setIntegrityResult(null);
    try {
      const result = await apiService.triggerIntegrityCheck();
      setIntegrityResult(result);
      setShowIntegrityModal(true);
      showFeedback('success', result.message);
    } catch (error) {
      showFeedback('danger', `Integrity check failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
      setIntegrityLoading(false);
    }
  };

  const fetchAdminCredentials = async (opts = {}) => {
    try {
      setAdminCredentialsLoading(true);
      setAdminCredentialsError(null);

      // Analytics passes { unfiltered: true } so whole-system aggregates (Suspicious Activity /
      // "Revocation Rate by Issuer", KPIs) don't silently inherit the Credentials-tab issuer/type filter.
      const params = {};
      if (!opts.unfiltered) {
        if (adminCredIssuerFilter !== "all") {
          params.issuerId = adminCredIssuerFilter;
        }
        if (adminCredTypeFilter === "issued") {
          params.type = "issued";
        } else if (adminCredTypeFilter === "templates") {
          params.type = "templates";
        }
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
    if (adminCredStatusFilter !== 'all') {
      result = result.filter((row) => {
        const normalizedStatus = String(row.status || '').toLowerCase();
        const normalizedType = String(row.type || '').toLowerCase();
        if (adminCredStatusFilter === 'template') return normalizedType === 'template';
        if (adminCredStatusFilter === 'issued') return normalizedStatus === 'issued' || normalizedStatus === 'active';
        return normalizedStatus === adminCredStatusFilter;
      });
    }

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
  }, [adminCredSearchField, adminCredSearchQuery, adminCredStatusFilter, adminCredentials]);

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
      categoryKey: "all",
    },
    {
      label: "Issued",
      value: getStatDisplayValue(
        adminCredentialsLoading,
        adminCredentials.filter((r) => (r.type || "").toLowerCase() === "issued").length
      ),
      className: "stat-green",
      categoryKey: "issued",
    },
    {
      label: "Revoked",
      value: getStatDisplayValue(
        adminCredentialsLoading,
        adminCredentials.filter((r) => (r.status || "").toLowerCase() === "revoked").length
      ),
      className: "stat-red",
      categoryKey: "revoked",
    },
    {
      label: "Expired",
      value: getStatDisplayValue(
        adminCredentialsLoading,
        adminCredentials.filter((r) => (r.status || "").toLowerCase() === "expired").length
      ),
      className: "stat-blue",
      categoryKey: "expired",
    },
    {
      label: "Drafts",
      value: getStatDisplayValue(
        adminCredentialsLoading,
        adminCredentials.filter((r) => (r.type || "").toLowerCase() === "template").length
      ),
      className: "stat-purple",
      categoryKey: "template",
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
      categoryKey: "approved",
    },
    {
      label: "Disabled Issuers",
      value: getStatDisplayValue(loading, disabledIssuers.length),
      className: "stat-red",
      categoryKey: "disabled",
    },
    {
      label: "Pending Issuers",
      value: getStatDisplayValue(loading, pendingIssuerCount),
      className: "stat-blue",
      categoryKey: "pending",
    },
    {
      label: "Rejected Issuers",
      value: getStatDisplayValue(loading, rejectedIssuers.length),
      className: "stat-red",
      categoryKey: "rejected",
    },
  ];

  const userStats = [
    {
      label: "Total Users",
      value: getStatDisplayValue(usersLoading, users.length),
      categoryKey: "all",
    },
    {
      label: "Active Users",
      value: getStatDisplayValue(usersLoading, users.filter((u) => u.isActive !== false).length),
      className: "stat-green",
      categoryKey: "active",
    },
    {
      label: "Disabled Users",
      value: getStatDisplayValue(usersLoading, users.filter((u) => u.isActive === false).length),
      className: "stat-red",
      categoryKey: "disabled",
    },
  ];

  const logStats = [
    {
      label: "Verification Logs",
      value: getStatDisplayValue(logsLoading, verificationLogsCount),
      categoryKey: "verification",
    },
    {
      // ADMIN5: merged Status Logs + Issuer Decisions into one "Audit Logs" card
      label: "Audit Logs",
      value: getStatDisplayValue(
        logsLoading,
        (statusLogsCount || 0) + (issuerDecisionLogsCount || 0)
      ),
      className: "stat-blue",
      categoryKey: "audit",
    },
    {
      label: "Root Decisions",
      value: getStatDisplayValue(
        logsLoading,
        rootSubordinateLogsCount
      ),
      className: "stat-green",
      categoryKey: "root_subordinate_decision",
    },
  ];

  // renderStatsGrid stays a plain display grid by default. Pass
  // { onCardClick, activeKey } to make cards act as clickable category
  // switchers (used by the Logs tab so cards + dropdown both navigate).
  const renderStatsGrid = (stats, options = {}) => {
    const { onCardClick, activeKey } = options;
    return (
      <div className="admin-stats-grid">
        {stats.map((stat) => {
          const clickable = typeof onCardClick === "function" && !!stat.categoryKey;
          const isActive = clickable && activeKey === stat.categoryKey;
          return (
            <div
              key={stat.label}
              className={`admin-stat-card${stat.className ? ` ${stat.className}` : ""}${clickable ? " admin-stat-card-clickable" : ""}${isActive ? " admin-stat-card-active" : ""}`}
              onClick={clickable ? () => onCardClick(stat.categoryKey) : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onCardClick(stat.categoryKey);
                      }
                    }
                  : undefined
              }
              style={
                clickable
                  ? {
                      cursor: "pointer",
                      transition: "border-color .15s ease, transform .15s ease",
                      ...(isActive
                        ? {
                            outline: "2px solid var(--accent, var(--accent))",
                            outlineOffset: "1px",
                          }
                        : {}),
                    }
                  : undefined
              }
            >
              <span className="admin-stat-num">{stat.value}</span>
              <span className="admin-stat-label">{stat.label}</span>
            </div>
          );
        })}
      </div>
    );
  };


  // -------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------
  useEffect(() => {
    if (tab === "issuers" && !issuerStatsLoaded) {
      setIssuerFilter("pending");
      setPendingIssuerFilter("all_pending");
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
    } else if (tab === "analytics") {
      // Phase 4: needs verification logs (Verification Summary) + cross-issuer credentials (Suspicious
      // Activity / KPIs). Fetch UNFILTERED so these whole-system numbers ignore the Credentials-tab filter.
      fetchVerificationLogs();
      fetchAdminCredentials({ unfiltered: true });
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

  useEffect(() => {
    fetchAdminNotifications();
  }, [fetchAdminNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        adminNotificationPanelRef.current &&
        !adminNotificationPanelRef.current.contains(event.target)
      ) {
        setAdminNotificationsOpen(false);
      }
    };

    if (adminNotificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [adminNotificationsOpen]);

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
      <div className="admin-header-row" ref={adminNotificationPanelRef}>
        <h1 className="admin-title">Admin Dashboard</h1>
        <div className="admin-notification-bell-wrap">
          <button
            type="button"
            className={`admin-notification-bell-btn ${adminNotificationsOpen ? "open" : ""}`}
            onClick={() => setAdminNotificationsOpen((prev) => !prev)}
            aria-label="Toggle admin notifications"
          >
            <Bell size={18} aria-hidden="true" />
            {adminUnreadCount > 0 && (
              <span className="admin-notification-badge">{adminUnreadCount}</span>
            )}
          </button>

          {adminNotificationsOpen && (
            <div className="admin-notification-panel">
              <div className="admin-notification-panel-header">
                <h3>Notifications</h3>
                {adminUnreadNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAdminNotificationsRead}
                    style={{ padding: "6px 14px", fontSize: "12px", background: "var(--accent-weak)", color: "var(--accent-strong)", border: "1px solid var(--accent-weak)", borderRadius: "8px", cursor: "pointer" }}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              {adminNotificationsLoading && (
                <div className="admin-notification-panel-state"><Spinner /> Loading notifications…</div>
              )}

              {!adminNotificationsLoading && adminNotificationsError && (
                <div className="admin-notification-panel-state error">
                  {adminNotificationsError}
                </div>
              )}

              {!adminNotificationsLoading && !adminNotificationsError && adminNotifications.length === 0 && (
                <div className="admin-notification-panel-state">No notifications yet.</div>
              )}

              {!adminNotificationsLoading && !adminNotificationsError && adminNotifications.length > 0 && (
                <div className="admin-notification-list">
                  {adminNotifications.map((notification) => (
                    <button
                      key={notification._id}
                      type="button"
                      className={`admin-notification-item ${notification.read ? "read" : "unread"}`}
                      onClick={() => handleAdminNotificationClick(notification)}
                    >
                      <div className="admin-notification-item-type">{notification.title || "Admin Notification"}</div>
                      <div className="admin-notification-item-message">
                        {notification.message || "Notification update."}
                      </div>
                      <div className="admin-notification-item-meta">
                        Category: {notification.category || "system"}
                      </div>
                      <div className="admin-notification-item-time">
                        {formatTimestamp(notification.createdAt)} • {notification.read ? "Read" : "Unread"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AppShell
        sidebar={
          <Sidebar
            title="Admin"
            items={[
              { key: "credentials", label: "Credentials", icon: Layers },
              { key: "issuers", label: "Manage Issuers", icon: Building2 },
              { key: "users", label: "Manage Users", icon: Users },
              { key: "logs", label: "Logs", icon: ClipboardList },
              { key: "analytics", label: "Analytics & Reports", icon: BarChart3 },
            ]}
            activeKey={tab}
            onSelect={setTab}
          />
        }
      >

      <AppToast show={!!message} message={message} type={messageType} />

      {/* ADMIN2: styled confirmation before running the integrity check */}
      {integrityConfirmOpen &&
        ReactDOM.createPortal(
          <div
            onClick={() => setIntegrityConfirmOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(440px, 92vw)", background: "var(--surface-2)", borderRadius: "12px", border: "1px solid var(--border-strong)", padding: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", color: "var(--text)" }}
            >
              <h3 style={{ margin: "0 0 8px" }}>Run integrity check?</h3>
              <p style={{ margin: "0 0 20px", fontSize: "13px", lineHeight: 1.5, color: "var(--text-muted)" }}>
                This compares every credential's database copy against its permanent blockchain record. It may take a moment on large datasets.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIntegrityConfirmOpen(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "var(--text)", borderRadius: "8px", padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="button" onClick={runIntegrityCheck} style={{ background: "var(--accent)", border: "none", color: "var(--text)", borderRadius: "8px", padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>
                  Run check
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showIntegrityModal &&
        integrityResult &&
        ReactDOM.createPortal(
          <div
            onClick={() => setShowIntegrityModal(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(1180px, 95vw)", maxHeight: "85vh", overflow: "auto", background: "var(--surface-2)", borderRadius: "12px", border: "1px solid var(--border-strong)", padding: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", color: "var(--text)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Integrity Check Results</h3>
                  <div style={{ marginTop: "8px", opacity: 0.85, fontSize: "13px", maxWidth: "660px", lineHeight: 1.5 }}>
                    Each credential's fast <strong>database copy</strong> is compared against the permanent{" "}
                    <strong>blockchain record</strong>. The blockchain is the source of truth — anything flagged
                    below doesn't match and should be investigated.
                    {(integrityResult.checkedAt || integrityResult.timestamp) && (
                      <span style={{ opacity: 0.7 }}> · Checked {formatTimestamp(integrityResult.checkedAt || integrityResult.timestamp)}</span>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => setShowIntegrityModal(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "var(--text)", borderRadius: "8px", padding: "8px 10px", cursor: "pointer" }}>
                  ✕ Close
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "12px", marginBottom: "18px" }}>
                {[
                  ["Total", integrityResult.totalChecked, "var(--accent-strong)"],
                  ["Matched", integrityResult.matched, "#34B27B"],
                  ["Mismatched", integrityResult.mismatched, "var(--warn)"],
                  ["Missing", integrityResult.missing, "var(--danger)"],
                  ["Errors", integrityResult.errors, "var(--danger)"],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ background: "var(--border)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ color, fontWeight: 700, fontSize: "22px" }}>{value}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{label}</div>
                  </div>
                ))}
              </div>

              {(() => {
                const FIELD_LABELS = {
                  credentialName: "Credential Name", credentialType: "Credential Type",
                  holderID: "Holder ID", status: "Status", issuedDate: "Issued Date",
                  expiryDate: "Expiry Date", description: "Description", issuerID: "Issuer ID",
                };
                const fieldLabel = (f) => FIELD_LABELS[f] || f;
                const problems = (integrityResult.results || []).filter(
                  (r) => r.verdict === "mismatched" || r.verdict === "missing" || r.verdict === "error"
                );

                if (problems.length === 0) {
                  return (
                    <div style={{ padding: "16px", borderRadius: "12px", background: "var(--ok-weak)", border: "1px solid var(--ok-weak)", color: "var(--ok)" }}>
                      All checked credentials match the blockchain ledger. No issues found.
                    </div>
                  );
                }

                const badgeFor = (v) =>
                  v === "mismatched" ? { text: "Mismatched", color: "var(--warn)" }
                  : v === "missing" ? { text: "Missing from blockchain", color: "var(--danger)" }
                  : { text: "Error", color: "var(--danger)" };

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {problems.map((row, i) => {
                      const badge = badgeFor(row.verdict);
                      return (
                        <div key={`${row.blockchainId}-${i}`} style={{ background: "var(--border)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "baseline" }}>
                            <div style={{ fontWeight: 700, fontSize: "15px" }}>{row.credentialName || "Unknown credential"}</div>
                            <div style={{ color: badge.color, fontWeight: 700, fontSize: "13px" }}>{badge.text}</div>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 10px" }}>
                            Issuer: {row.issuerOrgName || "Unknown"} &nbsp;·&nbsp; ID: <span style={{ fontFamily: "monospace" }}>{row.blockchainId || "N/A"}</span>
                          </div>

                          {row.verdict === "mismatched" && (row.mismatches || []).map((m, j) => (
                            <div key={j} style={{ fontSize: "13px", padding: "7px 0", borderTop: j === 0 ? "none" : "1px solid var(--border)" }}>
                              <span style={{ color: "#e5e7eb", fontWeight: 600 }}>{fieldLabel(m.field)}: </span>
                              <span style={{ color: "var(--danger)", textDecoration: "line-through" }}>{String(m.couchValue || "—")}</span>
                              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}> (database) </span>
                              <span style={{ color: "var(--text-muted)" }}>→ </span>
                              <span style={{ color: "var(--ok)", fontWeight: 700 }}>{String(m.blockchainValue || "—")}</span>
                              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}> (on blockchain)</span>
                            </div>
                          ))}

                          {row.verdict === "missing" && (
                            <div style={{ fontSize: "13px", color: "var(--danger)" }}>
                              This credential exists in the database but was <strong>not found on the blockchain ledger</strong>.
                            </div>
                          )}

                          {row.verdict === "error" && (
                            <div style={{ fontSize: "13px", color: "var(--danger)" }}>
                              Could not verify against the blockchain: {row.error || "unknown error"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>,
          document.body
        )}

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
                background: "var(--surface-2)",
                borderRadius: "12px",
                border: "1px solid var(--border-strong)",
                padding: "clamp(16px, 4vw, 28px)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                color: "var(--text)",
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
                    🪪 Credential Dossier
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
                    color: "var(--text)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  ✕ Close
                </button>
              </div>

              {/* Unified dossier — same clean timeline + proof trail as the holder's See History
                  (shared CredentialHistory component handles loading/error/empty internally). */}
              <CredentialHistory
                history={credentialHistory}
                verificationLogs={verificationLogs}
                credentialId={selectedCredentialRow?.credentialId || selectedCredentialRow?.blockchainId || selectedCredentialRow?.id}
                credential={selectedCredentialRow}
                showProofTrail
                loading={credentialHistoryLoading}
                error={credentialHistoryError}
                proofTrailLoading={logsLoading}
              />
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
                background: "var(--surface-2)",
                borderRadius: "12px",
                border: "1px solid var(--border-strong)",
                padding: "24px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                color: "var(--text)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px" }}>{descriptionModal.name}</h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setDescriptionModal(null)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "var(--text)",
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

      {showApproveIssuerModal &&
        ReactDOM.createPortal(
          <div
            onClick={closeApproveIssuerModal}
            style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:999999,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width:"min(480px,95vw)",background:"var(--surface-2)",borderRadius:"12px",border:"1px solid var(--border-strong)",padding:"24px",boxShadow:"0 10px 40px rgba(0,0,0,0.4)",color:"var(--text)" }}
            >
              <h3 style={{ marginTop:0 }}>Approve Issuer</h3>
              <p style={{ opacity:0.85,marginTop:"6px",lineHeight:1.6 }}>
                You are about to approve <strong>{approveIssuerName}</strong>. This grants them issuer access on ChainCert and is permanently recorded on the blockchain.
              </p>
              {approveIssuerError && (
                <div style={{ color:"var(--danger)",marginTop:"10px" }}>{approveIssuerError}</div>
              )}
              <div style={{ display:"flex",gap:"10px",justifyContent:"flex-end",marginTop:"20px" }}>
                <button
                  type="button"
                  onClick={closeApproveIssuerModal}
                  disabled={approveIssuerLoading}
                  style={{ padding:"10px 14px",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.18)",background:"transparent",color:"var(--text)",cursor:approveIssuerLoading?"not-allowed":"pointer",opacity:approveIssuerLoading?0.65:1,fontWeight:700 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitApproveIssuer}
                  disabled={approveIssuerLoading}
                  style={{ padding:"10px 14px",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.18)",background:"var(--ok-weak)",color:"var(--ok)",cursor:approveIssuerLoading?"not-allowed":"pointer",opacity:approveIssuerLoading?0.65:1,fontWeight:800 }}
                >
                  {approveIssuerLoading ? "Approving..." : "Confirm Approve"}
                </button>
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
                background: "var(--surface-2)",
                borderRadius: "12px",
                border: "1px solid var(--border-strong)",
                padding: "18px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                color: "var(--text)",
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
                    background: "var(--border)",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text)",
                    outline: "none",
                    resize: "vertical",
                  }}
                />

                {Reject_IssuerError ? (
                  <div style={{ color: "var(--danger)", marginTop: "10px" }}>
                    {Reject_IssuerError}
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
                      color: "var(--text)",
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
                      background: "var(--danger-weak)",
                      color: "var(--danger)",
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
                background: "var(--surface-2)",
                borderRadius: "12px",
                border: "1px solid var(--border-strong)",
                padding: "18px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                color: "var(--text)",
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
                    background: "var(--border)",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text)",
                    outline: "none",
                    resize: "vertical",
                  }}
                />

                {issuerStatusError ? (
                  <div style={{ color: "var(--danger)", marginTop: "10px" }}>
                    {issuerStatusError}
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
                      color: "var(--text)",
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
                          ? "var(--danger-weak)"
                          : "var(--ok-weak)",
                      color:
                        issuerStatusAction === "disable" ? "var(--danger)" : "var(--ok)",
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
                background: "var(--surface-2)",
                borderRadius: "12px",
                border: "1px solid var(--border-strong)",
                padding: "18px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                color: "var(--text)",
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
                    background: "var(--border)",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text)",
                    outline: "none",
                    resize: "vertical",
                  }}
                />

                {userStatusError ? (
                  <div style={{ color: "var(--danger)", marginTop: "10px" }}>
                    {userStatusError}
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
                      color: "var(--text)",
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
                          ? "var(--danger-weak)"
                          : "var(--ok-weak)",
                      color:
                        userStatusAction === "disable" ? "var(--danger)" : "var(--ok)",
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
                background: "var(--surface-2)",
                borderRadius: "12px",
                border: "1px solid var(--border-strong)",
                padding: "18px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                color: "var(--text)",
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
                    color: "var(--text)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  ✕ Close
                </button>
              </div>

              {historyStatusLoading ? (
                <SpinnerBlock label="Loading history…" minHeight={100} />
              ) : historyStatusError ? (
                <div style={{ padding: "12px", background: "var(--danger-weak)", border: "1px solid var(--danger-weak)", borderRadius: "10px", color: "var(--danger)" }}>
                  {historyStatusError}
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
                  width: "min(1100px, 95vw)",
                  maxHeight: "85vh",
                  overflow: "auto",
                  background: "var(--surface-2)",
                  borderRadius: "12px",
                  border: "1px solid var(--border-strong)",
                  padding: "18px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                  color: "var(--text)",
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
                      color: "var(--text)",
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
                      background: "var(--danger-weak)",
                      border: "1px solid var(--danger-weak)",
                      borderRadius: "10px",
                      color: "var(--danger)",
                    }}
                  >
                    {issuerDocumentsError}
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
                            <td>{doc.docType ? doc.docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "N/A"}</td>
                            <td style={{ maxWidth: "220px", wordBreak: "break-word" }}>{doc.originalname || "N/A"}</td>
                            <td>{doc.mimetype || "N/A"}</td>
                            <td>
                              {typeof doc.size === "number"
                                ? `${(doc.size / 1024).toFixed(1)} KB`
                                : "N/A"}
                            </td>
                            <td style={{ display: "flex", gap: 8, flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onClick={() => handleViewIssuerDocument(doc)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  background: "var(--accent-weak)",
                                  color: "var(--accent-strong)",
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
                                  background: "var(--ok-weak)",
                                  color: "var(--ok)",
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
          {renderStatsGrid(credentialStats, {
            onCardClick: setAdminCredStatusFilter,
            activeKey: adminCredStatusFilter,
          })}

          {/* ── Charts Row ── */}
          <div className="admin-analytics-row">
            {/* Bar Chart — Credentials by Issuer */}
            <div className="admin-chart-card">
              <h3>Credentials by Issuer</h3>
              <p className="tab-subtitle" style={{ marginTop: -4 }}>Total records (drafts + issued) per issuer, top 6.</p>
              <div className="chart-bars" style={{ marginBottom: 28 }}>
                {(() => {
                  const issuerCounts = {};
                  adminCredentials.forEach(r => {
                    const name = r.issuerName || "Unknown";
                    issuerCounts[name] = (issuerCounts[name] || 0) + 1;
                  });
                  const entries = Object.entries(issuerCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
                  const max = Math.max(...entries.map(e => e[1]), 1);
                  const colors = ["var(--accent)", "var(--accent)", "var(--accent-strong)", "var(--ok)", "var(--warn)", "var(--info)"];
                  return entries.length > 0 ? entries.map(([name, count], i) => (
                    <div
                      key={name}
                      className="chart-bar"
                      style={{
                        height: `${(count / max) * 100}%`,
                        // ADMIN1: was `${color}88` (invalid for CSS vars) → gradient dropped → blank bars. Solid token color.
                        background: colors[i % colors.length],
                        minHeight: 8,
                      }}
                      title={`${name}: ${count}`}
                    >
                      <span className="chart-bar-value">{count}</span>
                      <span className="chart-bar-label">{name.length > 16 ? name.slice(0, 16) + "…" : name}</span>
                    </div>
                  )) : (
                    <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", width: "100%", paddingTop: 40 }}>No credential data yet</div>
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
                    { label: "Active", count: active, color: "var(--ok)" },
                    { label: "Revoked", count: revoked, color: "var(--danger)" },
                    { label: "Expired", count: expired, color: "var(--warn)" },
                    { label: "Drafts", count: templates, color: "var(--accent-strong)" },
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
            <h2>Credentials</h2>
            <p className="tab-subtitle">
              Unified view of credentials across all approved issuers — filter by a specific issuer below.
            </p>

            {/* ADMIN3: integrity check moved to the Analytics & Reports tab. */}

            <StatusLegend
              label="Status key"
              style={{ marginBottom: 16 }}
              items={[
                { label: "Issued / Active", color: "var(--ok)", meaning: "issued and currently valid" },
                { label: "Revoked", color: "var(--danger)", meaning: "cancelled by the issuer" },
                { label: "Expired", color: "var(--warn)", meaning: "past its expiry date" },
                { label: "Draft", color: "var(--info)", meaning: "a credential created but not yet issued" },
              ]}
            />

            <div style={{ display: "flex", flexDirection: "column-reverse", gap: 16 }}>
            <div style={{ flex: "1 1 380px", minWidth: 0 }}>

            <div className="issuer-filter-row filter-row" style={{ gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="adminIssuerFilter">Issuer:</label>
                <select
                  className="filter-select"
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
                  className="filter-select"
                  id="adminTypeFilter"
                  value={adminCredTypeFilter}
                  onChange={(e) => setAdminCredTypeFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="issued">Issued</option>
                  <option value="templates">Credentials</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="adminStatusFilter">Status:</label>
                <select
                  className="filter-select"
                  id="adminStatusFilter"
                  value={adminCredStatusFilter}
                  onChange={(e) => setAdminCredStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="issued">Issued</option>
                  <option value="revoked">Revoked</option>
                  <option value="template">Draft</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="adminSearchField">Search by:</label>
                <select
                  className="filter-select"
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
                  className="filter-select"
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
                className="filter-input"
                type="text"
                value={adminCredSearchQuery}
                onChange={(e) => setAdminCredSearchQuery(e.target.value)}
                placeholder="Search..."
              />
            </div>

            {adminCredentialsLoading ? (
              <SpinnerBlock label="Loading credentials…" />
            ) : adminCredentialsError ? (
              <div className="tab-placeholder">{adminCredentialsError}</div>
            ) : sortedAdminCredentials.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-table has-sticky-actions">
                  <thead>
                    <tr>
                      <th>Issuer</th>
                      {activeHistoryColumns.map((column) => (
                        <th key={column}>{historyColumnLabels[column]}</th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminCredsPg.pageItems.map((row, idx) => {
                      const typeLower = String(row.type || "").toLowerCase();
                      const isIssued = typeLower === "issued";
                      const historyCellMap = {
                        credentialName: row.credentialName || row.credentialType || "N/A",
                        credentialType: row.type || row.credentialType || "N/A",
                        status: renderStatusText(isIssued ? effectiveCredentialStatus(row) : (row.status || "unknown"), "unknown"), // F01
                        createdAt: formatTimestamp(row.createdAt),
                        holderName: row.holderName || "—",
                        holderID: <span style={{ fontFamily: "monospace", fontSize: 12 }}>{row.holderID || "—"}</span>,
                        revokedAt: formatTimestamp(row.revokedAt || row.revokedDate || row.updatedAt),
                        revocationReason: row.rejectionReason || row.revocationReason || "—",
                        credentialId: <span style={{ fontFamily: "monospace", fontSize: 12 }}>{row.credentialId || "N/A"}</span>,
                      };

                      return (
                        <tr key={`${row.credentialId || "row"}_${idx}`}>
                          <td>{row.issuerName || "Unknown"}</td>
                          {activeHistoryColumns.map((column) => (
                            <td key={`${row.credentialId || idx}-${column}`}>{historyCellMap[column]}</td>
                          ))}
                          <td className="actions-cell">
                            {isIssued ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openHistoryModalForRow(row)}
                                  style={{
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    border: "1px solid rgba(255,255,255,0.18)",
                                    cursor: "pointer",
                                    background: "var(--border)",
                                    color: "var(--text)",
                                    fontWeight: 700,
                                  }}
                                  title="View blockchain audit history"
                                >
                                  View BC History
                                </button>
                                {renderDescriptionCell(row, false)}
                              </>
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
            <Pagination {...adminCredsPg} />
            </div>
            </div>
          </div>
        </>
      )}

      {/* ISSUERS TAB */}
      {tab === "issuers" && (
        <div className="tab-card">
          <h2>Issuer Management</h2>
          {renderStatsGrid(issuerStats, {
            onCardClick: setIssuerFilter,
            activeKey: issuerFilter,
          })}

          <div style={{ display: "flex", flexDirection: "column-reverse", gap: 16 }}>
          <div style={{ flex: "1 1 380px", minWidth: 0 }}>

          <div className="issuer-filter-row filter-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label htmlFor="issuerFilter">View:</label>
              <select
                className="filter-select"
                id="issuerFilter"
                value={issuerFilter}
                onChange={async (e) => {
                  const value = e.target.value;
                  setIssuerFilter(value);

                  if (value === "pending") {
                    setPendingIssuerFilter("all_pending");
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
                className="filter-select"
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

            {issuerFilter === "approved" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="issuerTypeFilter">Type:</label>
                <select
                  className="filter-select"
                  id="issuerTypeFilter"
                  value={issuerTypeFilter}
                  onChange={(e) => setIssuerTypeFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="root">Root Authority</option>
                  <option value="subordinate">Subordinate</option>
                </select>
              </div>
            )}

            {issuerFilter === "rejected" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="rejectedByFilter">Rejected by:</label>
                <select
                  className="filter-select"
                  id="rejectedByFilter"
                  value={rejectedByFilter}
                  onChange={(e) => setRejectedByFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="root">Root Authority</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}

            {issuerFilter === "disabled" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="disabledByFilter">Disabled by:</label>
                <select
                  className="filter-select"
                  id="disabledByFilter"
                  value={disabledByFilter}
                  onChange={(e) => setDisabledByFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="me">Me</option>
                  <option value="others">Others</option>
                </select>
              </div>
            )}

            <input
              className="filter-input"
              type="text"
              value={issuerSearch}
              onChange={(e) => setIssuerSearch(e.target.value)}
              placeholder="Search org name or email"
            />
          </div>

          {issuerFilter === "pending" && (
            <div className="issuer-filter-row filter-row" style={{ marginTop: "10px" }}>
              <label htmlFor="pendingIssuerFilter">Pending Type:</label>
              <select
                className="filter-select"
                id="pendingIssuerFilter"
                value={pendingIssuerFilter}
                onChange={(e) => setPendingIssuerFilter(e.target.value)}
              >
                <option value="all_pending">All Pending</option>
                <option value="admin_actionable">Ready for Review</option>
                <option value="awaiting_root">Awaiting Root Approval</option>
              </select>
            </div>
          )}

          {/* D1: Approval Queue & Turnaround lives here (with the approve buttons), not in Analytics —
              so the count is never stale. Every pending row also shows its own "Days Waiting" column;
              sort by "Oldest First" to work the longest-waiting applications first. */}
          {issuerFilter === "pending" && (
            <div className="analytics-card" style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
                <h3 style={{ margin: 0 }}>Approval Queue &amp; Turnaround</h3>
                <InfoHint text='Applications waiting, how long they have waited, and your average time to decide. Work the longest-waiting first — sort the table by "Oldest First".' />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, margin: "14px 0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: "rgba(124,92,252,0.06)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: "rgba(124,92,252,0.14)", color: "var(--accent-strong)", flexShrink: 0 }}><ClipboardList size={20} aria-hidden="true" /></div>
                  <div><div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{approvalQueue.pendingCount}</div><div className="analytics-card-sub" style={{ marginTop: 5 }}>Pending</div></div>
                </div>
                {/* Defense revision S4: aging emphasis is a NEUTRAL accent highlight driven by the
                    named QUEUE_AGING_NOTE_DAYS constant (a team-chosen attention marker, not a
                    lateness verdict — review cadence varies by organization). */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: approvalQueue.oldestDays > QUEUE_AGING_NOTE_DAYS ? "rgba(124,92,252,0.10)" : "rgba(255,255,255,0.03)", border: `1px solid ${approvalQueue.oldestDays > QUEUE_AGING_NOTE_DAYS ? "var(--border-accent, rgba(124,92,252,0.4))" : "var(--border)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: approvalQueue.oldestDays > QUEUE_AGING_NOTE_DAYS ? "rgba(124,92,252,0.16)" : "rgba(255,255,255,0.06)", color: approvalQueue.oldestDays > QUEUE_AGING_NOTE_DAYS ? "var(--accent-strong)" : "var(--text-muted)", flexShrink: 0 }}><Clock size={20} aria-hidden="true" /></div>
                  <div><div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: "var(--text)" }}>{approvalQueue.oldestDays}<span style={{ fontSize: 15, fontWeight: 700 }}>d</span></div><div className="analytics-card-sub" style={{ marginTop: 5 }}>Oldest waiting</div></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: "rgba(52,178,123,0.06)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: "rgba(52,178,123,0.14)", color: "var(--ok)", flexShrink: 0 }}><Timer size={20} aria-hidden="true" /></div>
                  <div><div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{approvalQueue.avgDays != null ? <>{approvalQueue.avgDays}<span style={{ fontSize: 15, fontWeight: 700 }}>d</span></> : "—"}</div><div className="analytics-card-sub" style={{ marginTop: 5 }}>Avg approval</div></div>
                </div>
              </div>
              <InterpretationBox>{approvalQueue.summary}</InterpretationBox>
            </div>
          )}

          {loading ? (
            <SpinnerBlock label="Loading issuers…" />
          ) : sortedVisibleIssuers.length > 0 ? (
            <div className="table-wrapper">
              {/* Columns are view-dependent here: the Rejected view has no Actions column,
                  so only pin when Actions is genuinely the last one. */}
              <table className={`admin-table${activeIssuerColumns[activeIssuerColumns.length - 1] === "actions" ? " has-sticky-actions" : ""}`}>
                <thead>
                  <tr>
                    {activeIssuerColumns.map((column) => (
                      <th key={column}>{issuerColumnLabels[column]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {issuersPg.pageItems.map((issuer) => {
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
                            {!ISSUER_TOGGLE_DISABLED && (
                            <button
                              type="button"
                              onClick={() => openIssuerStatusModal(issuer, isDisabled ? "enable" : "disable")}
                              style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.18)",
                                cursor: "pointer",
                                fontWeight: 700,
                                background: isDisabled ? "var(--ok-weak)" : "var(--danger-weak)",
                                color: isDisabled ? "var(--ok)" : "var(--danger)",
                              }}
                              title={isDisabled ? "Re-enable issuer" : "Disable issuer"}
                            >
                              {isDisabled ? "Enable" : "Disable"}
                            </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openHistoryStatusModal(issuer.email, "issuer")}
                              style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.18)",
                                cursor: "pointer",
                                fontWeight: 700,
                                background: "var(--accent-weak)",
                                color: "var(--accent-strong)",
                              }}
                              title="View status change history"
                            >
                              See History
                            </button>
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
                                  background: "var(--accent-weak)",
                                  color: "var(--accent-strong)",
                                }}
                                title="View submitted documents"
                              >
                                See Documents
                              </button>
                            )}
                          </>
                        );
                      }

                      if (issuerFilter === "disabled") {
                        if (ISSUER_TOGGLE_DISABLED) {
                          return <span style={{ opacity: 0.65 }}>—</span>;
                        }
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
                              background: "var(--ok-weak)",
                              color: "var(--ok)",
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

                      // Gate Approve/Reject per ROW, not by the selected filter:
                      // a subordinate is only admin-actionable once its root
                      // authority has approved it. Root authorities have no gate.
                      // This keeps the mixed "All Pending" view correct (F05).
                      const isSubordinate = issuer.issuerType === "subordinate";
                      const rootHasApproved = !isSubordinate || issuer.rootApprovalStatus === "approved";
                      const showAdminDecision =
                        pendingIssuerFilter !== "awaiting_root" && rootHasApproved;

                      return (
                        <>
                          {showAdminDecision ? (
                            <>
                              <button
                                onClick={() => handleApproveIssuer(id, issuer.orgName || issuer.email)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  background: "var(--ok-weak)",
                                  color: "var(--ok)",
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
                                  background: "var(--danger-weak)",
                                  color: "var(--danger)",
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
                                background: "var(--accent-weak)",
                                color: "var(--accent-strong)",
                              }}
                              title="View submitted documents"
                            >
                              See Documents
                            </button>
                          )}
                        </>
                      );
                    })();

                    // F04: a subordinate rejected by its root authority keeps
                    // status 'pending' but is effectively rejected — show it as
                    // such so the Rejected view doesn't read "pending".
                    const isRootRejected =
                      issuer.issuerType === "subordinate" &&
                      issuer.rootApprovalStatus === "rejected" &&
                      issuer.status !== "approved" &&
                      !isDisabled;
                    const effectiveStatus = isRootRejected
                      ? "rejected"
                      : issuer.status || (isDisabled ? "disabled" : "approved");

                    const issuerCellMap = {
                      issuerId: id || "N/A",
                      orgName: issuer.orgName || issuer.name || "N/A",
                      email: issuer.email || "N/A",
                      issuerType: issuer.issuerType === "subordinate" ? <span className="badge purple">Subordinate</span> : <span className="badge blue">Root</span>,
                      rootAuthority: issuer.issuerType === "subordinate" ? (issuer.rootAuthorityName || "N/A") : "—",
                      rootApproval: rootApprovalBadge,
                      rootApprovedAt: issuer.issuerType === "subordinate" ? (issuer.rootApprovalStatus === "approved" ? formatTimestamp(issuer.rootApprovedAt) : issuer.rootApprovalStatus === "rejected" ? "Rejected by Root" : "Pending") : "—",
                      status: renderStatusText(effectiveStatus, isDisabled ? "disabled" : "approved"),
                      approvedAt: formatTimestamp(issuer.approvedAt || issuer.updatedAt),
                      approvedBy: <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{adminMeta.approvedBy}</span>,
                      rejectedBy: <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{isRootRejected ? "Root Authority" : adminMeta.rejectedBy}</span>,
                      rejectedAt: formatTimestamp(issuer.rejectedAt || issuer.rootRejectedAt || issuer.updatedAt),
                      disabledBy: <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{adminMeta.disabledBy}</span>,
                      disabledAt: formatTimestamp(issuer.disabledAt || issuer.updatedAt),
                      enabledBy: <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{adminMeta.enabledBy}</span>,
                      createdAt: formatTimestamp(issuer.createdAt),
                      daysWaiting: (() => {
                        const t = issuer.createdAt ? new Date(issuer.createdAt).getTime() : NaN;
                        if (Number.isNaN(t)) return "—";
                        const d = Math.max(0, Math.floor((Date.now() - t) / 86400000));
                        return <span style={{ fontWeight: 700, color: d > 14 ? "var(--danger)" : "var(--text)" }}>{d}d</span>;
                      })(),
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
          <Pagination {...issuersPg} />
          </div>
            <NotesCard
              description={
                issuerFilter === "pending"
                  ? {
                      all_pending:
                        "every application still awaiting a decision (mixed — some you can act on now, some are still waiting on a root authority).",
                      admin_actionable:
                        "applications you can approve or reject right now — root authorities, plus subordinates already approved by their root authority.",
                      awaiting_root:
                        "subordinate applications still waiting on their root authority's approval — you can't act on these yet.",
                    }[pendingIssuerFilter]
                  : {
                      approved:
                        "issuers that are fully approved and can issue credentials (filter further by type below).",
                      rejected: "applications that were denied.",
                      disabled: "previously-approved issuers that an admin has turned off.",
                    }[issuerFilter]
              }
              legend={[
                { label: "Approved / Active", color: "var(--ok)", meaning: "fully approved, can issue" },
                { label: "Pending", color: "var(--warn)", meaning: "awaiting admin decision" },
                { label: "Rejected / Disabled", color: "var(--danger)", meaning: "denied, or turned off by admin" },
                { label: "Awaiting Root", color: "var(--accent-strong)", meaning: "subordinate waiting on its root authority (purple badge)" },
              ]}
            />
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === "users" && (
        <div className="tab-card">
          <h2>User Management</h2>
          <p className="tab-subtitle">
            View all registered users (holders and admins) in the system.
          </p>
          {renderStatsGrid(userStats, {
            onCardClick: setUserFilter,
            activeKey: userFilter,
          })}

          <div className="issuer-filter-row filter-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label htmlFor="userFilter">View:</label>
              <select
                className="filter-select"
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
              <select className="filter-select" id="userSortBy" value={userSortBy} onChange={(e) => setUserSortBy(e.target.value)}>
                <option value="newest">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Username A-Z</option>
                <option value="name-desc">Username Z-A</option>
                <option value="status-asc">Email A-Z</option>
              </select>
            </div>
            <input
              className="filter-input"
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by email, username, or user ID"
            />
          </div>

          {usersLoading ? (
            <SpinnerBlock label="Loading users…" />
          ) : sortedVisibleUsers.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table has-sticky-actions">
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
                  {usersPg.pageItems.map((user) => {
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
                                ? "var(--ok-weak)"
                                : "var(--danger-weak)",
                              color: isDisabled ? "var(--ok)" : "var(--danger)",
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
                              background: "var(--accent-weak)",
                              color: "var(--accent-strong)",
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
          <Pagination {...usersPg} />
        </div>
      )}

      {/* LOGS TAB */}
      {tab === "logs" && (
        <div className="tab-card">
          <h2>Logs</h2>
          <p className="tab-subtitle">
            Blockchain audit logs for verification events and issuer/user status changes.
          </p>
          {renderStatsGrid(logStats, {
            onCardClick: setLogCategory,
            activeKey: logCategory,
          })}

          <div style={{ display: "flex", flexDirection: "column-reverse", gap: 16 }}>
          <div style={{ flex: "1 1 380px", minWidth: 0 }}>

          <div className="issuer-filter-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <label htmlFor="logCategory">Category:</label>
            <select
              id="logCategory"
              value={logCategory}
              onChange={(e) => setLogCategory(e.target.value)}
            >
              <option value="verification">Verification Logs</option>
              <option value="audit">Audit Logs</option>
              <option value="root_subordinate_decision">Root Subordinate Decision Logs</option>
            </select>

            <label htmlFor="activeLogSort">Sort by:</label>
            <select
              id="activeLogSort"
              value={logCategory === "audit" ? statusLogSortBy : logCategory === "root_subordinate_decision" ? rootSubordinateLogSortBy : verificationSortBy}
              onChange={(e) => {
                const value = e.target.value;
                if (logCategory === "audit") setStatusLogSortBy(value);
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

            {logCategory === "verification" && (
              <>
                <label htmlFor="verifResultFilter">Result:</label>
                <select
                  id="verifResultFilter"
                  value={verificationResultFilter}
                  onChange={(e) => setVerificationResultFilter(e.target.value)}
                >
                  <option value="all">All Results</option>
                  <option value="valid">Valid</option>
                  <option value="revoked">Revoked</option>
                  <option value="expired">Expired</option>
                  <option value="not_found">Not Found</option>
                  <option value="invalid">Invalid</option>
                </select>
                <input
                  type="text"
                  value={verificationLogSearch}
                  onChange={(e) => setVerificationLogSearch(e.target.value)}
                  placeholder="Search verifier / holder / credential ID…"
                  aria-label="Search verification logs"
                  className="filter-input"
                  style={{ flex: "0 1 260px" }}
                />
              </>
            )}

            {/* Final review: removed the dead `logCategory === "status"` filter block —
                "status" is not a selectable category (options are verification / audit /
                root_subordinate_decision), so it never rendered. */}

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
                    background: "var(--border)",
                    color: "var(--text)",
                    outline: "none",
                    minWidth: 260,
                  }}
                />
              </>
            )}
          </div>

          {logsLoading ? (
            <SpinnerBlock label="Loading logs…" />
          ) : logCategory === "audit" ? (
            <div>
              {/* ADMIN5: one unified Audit Logs table — status changes + issuer decisions */}
              <div className="issuer-filter-row" style={{ gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <label htmlFor="auditTypeFilter">Type:</label>
                <select
                  id="auditTypeFilter"
                  value={auditTypeFilter}
                  onChange={(e) => setAuditTypeFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="status">Status Changes</option>
                  <option value="decision">Issuer Decisions</option>
                </select>

                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search email, reason, performed by..."
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "var(--border)",
                    color: "var(--text)",
                    outline: "none",
                    minWidth: 240,
                  }}
                />
              </div>

              {(statusLogsError || issuerDecisionLogsError) ? (
                <div className="tab-placeholder">{statusLogsError || issuerDecisionLogsError}</div>
              ) : auditLogs.length > 0 ? (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Type</th>
                        <th>Target</th>
                        <th>Action</th>
                        <th>Reason</th>
                        <th>Performed By</th>
                        <th>Tx ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditPg.pageItems.map((log, index) => (
                        <tr key={log.txId || `${log._kind}-${index}`}>
                          <td>{formatTimestamp(log.timestamp)}</td>
                          <td>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 10px",
                              borderRadius: 999,
                              fontWeight: 700,
                              fontSize: 12,
                              whiteSpace: "nowrap",
                              color: log._kind === "decision" ? "var(--accent-strong)" : "var(--text-muted)",
                              background: log._kind === "decision" ? "var(--accent-weak)" : "var(--border)",
                            }}>
                              {log.type}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontFamily: "monospace", fontSize: "12px" }}>{log.target}</div>
                            {log.targetType ? (
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{log.targetType}</div>
                            ) : null}
                          </td>
                          <td>
                            {log._kind === "status" ? (
                              <span>
                                {renderStatusText(log.prev)} → {renderStatusText(log.next)}
                              </span>
                            ) : (
                              <span style={{
                                fontWeight: 700,
                                color: String(log.decision || "").toLowerCase() === "approved" ? "var(--ok)" : "var(--danger)",
                              }}>
                                {log.decision}
                              </span>
                            )}
                          </td>
                          <td>{log.reason || "—"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.performedBy}
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {log.txId ? `${String(log.txId).slice(0, 18)}...` : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="tab-placeholder">No audit logs found.</div>
              )}
              <Pagination {...auditPg} />
            </div>
          ) : logCategory === "root_subordinate_decision" ? (
            <>
              {rootSubordinateLogsError ? (
                <div className="tab-placeholder">{rootSubordinateLogsError}</div>
              ) : (
                filteredRootSubordinateLogs.length > 0 ? (
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
                        {rootSubPg.pageItems.map((log, index) => {
                          const isApproved =
                            String(log.decision || "").toLowerCase() === "approved";
                          return (
                            <tr key={log.txId || `${log.rootAuthorityName || "root"}-${index}`}>
                              <td>{log.rootAuthorityName || "N/A"}</td>
                              <td>{log.issuerEmail || "N/A"}</td>
                              <td>{log.orgName || "N/A"}</td>
                              <td>
                                <span style={{ fontWeight: 700, color: isApproved ? "var(--ok)" : "var(--danger)" }}>
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
                )
              )}
              <Pagination {...rootSubPg} />
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
                      {verifyPg.pageItems.map((log) => (
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
                          <td>
                            {(() => {
                              const r = log.result || {};
                              const reason = (r.reason || log.resultMessage || "").toLowerCase();
                              const status = (r.status || "").toLowerCase();
                              let label = "Checked";
                              let color = "var(--text-muted)";
                              if (status === "not_found" || reason.includes("not found")) {
                                label = "Not Found"; color = "var(--accent-strong)";
                              } else if (r.valid === true || (reason.includes("valid") && !reason.includes("invalid"))) {
                                label = "Valid"; color = "var(--ok)";
                              } else if (reason.includes("revoked")) {
                                label = "Revoked"; color = "var(--danger)";
                              } else if (reason.includes("expired")) {
                                label = "Expired"; color = "var(--warn)";
                              } else if (r.valid === false) {
                                label = "Invalid"; color = "var(--danger)";
                              }
                              return (
                                <span
                                  title={r.reason || log.resultMessage || ""}
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 10px",
                                    borderRadius: 999,
                                    fontWeight: 700,
                                    fontSize: 12,
                                    color,
                                    background: `${color}1f`,
                                    border: `1px solid ${color}55`,
                                  }}
                                >
                                  {label}
                                </span>
                              );
                            })()}
                          </td>
                          <td>{formatTimestamp(log.timestamp || log.verifiedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="tab-placeholder">No verification logs found.</div>
              )}
              <Pagination {...verifyPg} />
            </>
          ) : null}
          </div>
            <NotesCard
              description={
                {
                  verification: "logs a verification, showing who verified and its outcome.",
                  audit: "one combined on-chain trail of admin governance: issuer application approvals/rejections AND account enable/disable status changes — with who performed it, the reason, and the transaction ID. Use the Type filter to narrow to one kind.",
                  root_subordinate_decision: "logs root authority activity of approving or rejecting a subordinate issuer that applied under them.",
                }[logCategory]
              }
              legend={
                logCategory === "verification"
                  ? [
                      { label: "Valid", color: "var(--ok)", meaning: "authentic and active" },
                      { label: "Revoked", color: "var(--danger)", meaning: "cancelled by the issuer" },
                      { label: "Expired", color: "var(--warn)", meaning: "past its expiry date" },
                      { label: "Not Found", color: "var(--accent-strong)", meaning: "no such credential — it does not exist on the ledger" },
                    ]
                  : []
              }
            />
          </div>
        </div>
      )}

      {/* ANALYTICS & REPORTS TAB (Phase 4) */}
      {tab === "analytics" && (
        <div className="tab-card">
          <h2>Analytics &amp; Reports</h2>
          <p className="tab-subtitle">
            Processed, interpreted insights from the blockchain audit trail —
            not raw logs.
          </p>

          {/* ADMIN6: KPI strip — real current totals (no fabricated period deltas) */}
          <div className="analytics-kpis">
            {[
              { label: "Total Verifications", value: verificationOutcomes.total, Icon: ShieldCheck },
              { label: "Issuers w/ Credentials", value: suspicious.issuers.length, Icon: Building2 },
              { label: "Credentials Issued", value: adminCredentials.filter((r) => (r.type || "").toLowerCase() === "issued").length, Icon: Layers },
              { label: "Revocations", value: adminCredentials.filter((r) => (r.status || "").toLowerCase() === "revoked").length, Icon: Flag },
            ].map(({ label, value, Icon }) => (
              <div className="analytics-kpi" key={label}>
                <div className="analytics-kpi-icon"><Icon size={18} aria-hidden="true" /></div>
                <div>
                  <div className="analytics-kpi-value">{value}</div>
                  <div className="analytics-kpi-label">{label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="analytics-grid" style={{ marginTop: 8 }}>
            {/* Verification Result Summary (Verifier report, hosted in admin) */}
            <div className="analytics-card">
              <h3 style={{ display: "flex", alignItems: "center" }}>1. Verification Result Summary<InfoHint text="Outcome breakdown for all verification attempts — a capability/awareness view; no admin action is implied." /></h3>
              <DonutChart
                slices={verificationOutcomes.slices}
                centerValue={verificationOutcomes.total}
                centerLabel="Verifications"
                showBreakdown
              />
              <InterpretationBox>{verificationOutcomes.summary}</InterpretationBox>
            </div>

            {/* Revocation Rate by Issuer — descriptive ranking (defense revision S1/S4:
                renamed from "Issuers to Review"; band marker, no flag icon, no accusatory
                styling — the rate is information, not a verdict). */}
            <div className="analytics-card">
              <h3 style={{ display: "flex", alignItems: "center" }}>2. Revocation Rate by Issuer<InfoHint text="All active issuers ranked by their recent revocation rate. The band boundary is a team-chosen marker to surface unusual activity — not an external standard, and not a verdict." /></h3>
              <div className="analytics-rule-pill">Band: revocation rate &ge; {suspicious.thresholdPct}% in the last {suspicious.windowDays} days &middot; issuers with fewer than {suspicious.minSample} credentials are not banded</div>
              <div className="analytics-flag-list">
                {suspicious.issuers.length === 0 && (
                  <div className="analytics-chart-empty" style={{ height: 120 }}>
                    No issued-credential activity to analyze yet.
                  </div>
                )}
                {suspicious.issuers.map((iss) => (
                  <div key={iss.issuerId} className="analytics-flag-row">
                    <div>
                      <div className="analytics-flag-issuer">{iss.issuerName}</div>
                      <div className="analytics-flag-reason">{iss.reason}</div>
                      {iss.flagged && (
                        <button
                          type="button"
                          onClick={() => {
                            setTab("issuers");
                            setIssuerFilter("approved");
                            setIssuerSearch(iss.issuerName);
                          }}
                          style={{ background: "none", border: "none", padding: 0, marginTop: 4, color: "var(--accent-strong)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}
                        >
                          View this issuer &rarr;
                        </button>
                      )}
                    </div>
                    <span className={`analytics-flag-rate ${iss.flagged ? "flagged" : "ok"}`}>
                      {iss.ratePct}%
                    </span>
                  </div>
                ))}
              </div>
              <InterpretationBox>{suspicious.summary}</InterpretationBox>
            </div>

            {/* Integrity-Check Insight — surfaces the last CouchDB-vs-ledger check (no auto-run) */}
            <div className="analytics-card">
              <h3 style={{ display: "flex", alignItems: "center" }}>3. Integrity-Check Insight<InfoHint text="Checks each record in the fast-read database against the blockchain, so tampering outside the app is flagged (the blockchain is the source of truth)." /></h3>
              {integrity.available ? (
                <>
                  <DonutChart
                    slices={integrity.slices}
                    centerValue={integrity.totalChecked}
                    centerLabel="Records"
                    showBreakdown
                  />
                  {integrity.checkedAt && (
                    <p className="analytics-flag-reason" style={{ marginTop: 8 }}>
                      Last checked: {new Date(integrity.checkedAt).toLocaleString()}
                    </p>
                  )}
                  <InterpretationBox>{integrity.summary}</InterpretationBox>
                  <button
                    type="button"
                    onClick={handleIntegrityCheck}
                    disabled={integrityLoading}
                    style={{ marginTop: 10, marginRight: 8 }}
                  >
                    {integrityLoading ? "Running…" : "Re-run integrity check"}
                  </button>
                  {!integrity.healthy && (
                    <button
                      type="button"
                      onClick={() => setShowIntegrityModal(true)}
                      style={{ marginTop: 10 }}
                    >
                      View full integrity report
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="analytics-chart-empty" style={{ height: 140 }}>
                    No integrity check run yet this session.
                  </div>
                  <InterpretationBox>{integrity.summary}</InterpretationBox>
                  <button
                    type="button"
                    onClick={handleIntegrityCheck}
                    disabled={integrityLoading}
                    style={{ marginTop: 10 }}
                  >
                    {integrityLoading ? "Running…" : "Run integrity check"}
                  </button>
                </>
              )}
            </div>

          </div>
          <p className="analytics-footer-note">
            All insights are derived from on-chain audit trails and system checks. Data updates in near real-time.
          </p>
        </div>
      )}

      </AppShell>
    </div>
  );
}
