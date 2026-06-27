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

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import AppToast from "../components/appToast";
import { getDisplayName } from "../utils/userDisplay";
import "../styles/issuerDashboardPage.css";
import "../styles/analytics.css";
import DonutChart from "../components/analytics/DonutChart";
import TrendBars from "../components/analytics/TrendBars";
import Sparkline from "../components/analytics/Sparkline";
import InterpretationBox from "../components/analytics/InterpretationBox";
import { computeIssuance, computeRevocationAudit, COLORS as ANALYTICS_COLORS } from "../components/analytics/analytics";
import { AppShell, Sidebar, Button, StatusPill, SpinnerBlock } from "../components/ui";
import StatusLegend from "../components/ui/StatusLegend";
import { effectiveCredentialStatus, minIssueExpiryDate } from "../utils/credentialStatus"; // F01
import { getCredentialLineage, isSameInstance } from "../utils/credentialLineage"; // Q1
import { LayoutDashboard, FilePlus, Award, Ban, List, BarChart3, Receipt, Building2, Bell } from "lucide-react";

export default function IssuerDashboard() {
  // - polo: get current issuer type to hide subordinate sections for subordinate issuers
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSubordinate = currentUser?.issuerType === "subordinate";
  const displayName = getDisplayName({ ...currentUser, role: "issuer" }, "Issuer");
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
  const [issueConfirmStep, setIssueConfirmStep] = useState(false); // two-step gate before API call - polo
  const [availableUsers, setAvailableUsers] = useState([]);
  const [noTemplateError, setNoTemplateError] = useState("");
  const [issueTemplateSearch, setIssueTemplateSearch] = useState("");
  const [issueTemplateTypeFilter, setIssueTemplateTypeFilter] = useState("all");
  const [issueRecipientSearch, setIssueRecipientSearch] = useState("");
  const [issueTemplateOpen, setIssueTemplateOpen] = useState(false);
  const [issueRecipientOpen, setIssueRecipientOpen] = useState(false);
  const [revokeCredentialOpen, setRevokeCredentialOpen] = useState(false);
  const [revokeCredentialSearch, setRevokeCredentialSearch] = useState("");
  const [revokeHolderOpen, setRevokeHolderOpen] = useState(false);
  const [revokeHolderSearch, setRevokeHolderSearch] = useState("");
  const [revokeSelectedHolder, setRevokeSelectedHolder] = useState("");

  // Revoke Credential Modal State
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeForm, setRevokeForm] = useState({
    credentialId: "",
    rejectionReason: "", // - polo
  });
  const [revokeError, setRevokeError] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);

  // R2: when the revoke modal is opened from a specific credential's row, lock the
  // holder + credential to that record (read-only) instead of showing the pickers.
  const [revokeLocked, setRevokeLocked] = useState(false);
  const [revokeLockedCred, setRevokeLockedCred] = useState(null);

  // separate state for TEMPLATE options (for dropdown)
  const [templateOptions, setTemplateOptions] = useState([]);

  // Filter state
  const [sortBy, setSortBy] = useState("issuedDate-desc");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateTypeFilter, setTemplateTypeFilter] = useState("all");
  const [templateSortBy, setTemplateSortBy] = useState("newest");
  const [issueSearch, setIssueSearch] = useState("");
  const [revokeStatusFilter, setRevokeStatusFilter] = useState("all");
  const [revokeTypeFilter, setRevokeTypeFilter] = useState("all");
  const [revokeSectionSearch, setRevokeSectionSearch] = useState("");
  const [revokeSortBy, setRevokeSortBy] = useState("newest");
  const [filterRecordKind, setFilterRecordKind] = useState("all");
  const [viewAllTypeFilter, setViewAllTypeFilter] = useState("all");
  const [viewAllSearch, setViewAllSearch] = useState("");
  const [viewAllSortBy, setViewAllSortBy] = useState("newest");

  // Root Authority → My Subordinates directory
  const [subordinateDirectory, setSubordinateDirectory] = useState([]);
  const [subordinateDirectoryLoading, setSubordinateDirectoryLoading] = useState(false);
  const [subordinateDirectoryError, setSubordinateDirectoryError] = useState("");
  const [subordinateDirectoryFilter, setSubordinateDirectoryFilter] = useState("all");
  const [totalSubordinateCount, setTotalSubordinateCount] = useState(0);

  const [rootSubordinateLogs, setRootSubordinateLogs] = useState([]);
  const [rootSubordinateLogsLoading, setRootSubordinateLogsLoading] = useState(false);
  const [rootSubordinateLogsError, setRootSubordinateLogsError] = useState("");
  // RA2: per-subordinate on-chain history modal (replaces the standalone decision-logs table)
  const [subHistoryOpen, setSubHistoryOpen] = useState(false);
  const [subHistorySubordinate, setSubHistorySubordinate] = useState(null);

  // N1: issuer in-app notifications (bell + panel on the dashboard home).
  const [issuerNotifications, setIssuerNotifications] = useState([]);
  const [issuerUnreadCount, setIssuerUnreadCount] = useState(0);
  const [issuerNotifOpen, setIssuerNotifOpen] = useState(false);
  const issuerNotifRef = useRef(null);

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

  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCredential, setHistoryCredential] = useState(null);
  const [descriptionModal, setDescriptionModal] = useState(null);

  // -------------------------------------------------------------------
  // EFFECTS (unchanged)
  // -------------------------------------------------------------------
  useEffect(() => {
    fetchCredentials();
    fetchTemplateOptions();
    fetchSubordinateDirectory("all");
    fetchRootSubordinateLogs("all");
    fetchIssuerNotifications();
  }, []);

  // N1: load this issuer's notifications (scope derived server-side from the JWT).
  const fetchIssuerNotifications = async () => {
    try {
      const [all, unread] = await Promise.all([
        apiService.getIssuerNotifications(),
        apiService.getUnreadIssuerNotifications(),
      ]);
      setIssuerNotifications(all?.notifications || []);
      setIssuerUnreadCount(unread?.unreadCount || 0);
    } catch (e) {
      console.error("[ISSUER NOTIFICATIONS] load failed:", e?.message || e);
    }
  };

  // N1: close the notification panel when clicking outside it.
  useEffect(() => {
    if (!issuerNotifOpen) return undefined;
    const onDown = (e) => {
      if (issuerNotifRef.current && !issuerNotifRef.current.contains(e.target)) {
        setIssuerNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [issuerNotifOpen]);

  // N1: mark one notification read.
  const handleIssuerNotifClick = async (notif) => {
    if (notif.read) return;
    try {
      await apiService.markIssuerNotificationAsRead(notif._id);
      setIssuerNotifications((prev) => prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n)));
      setIssuerUnreadCount((c) => Math.max(c - 1, 0));
    } catch (e) { console.error("[ISSUER NOTIFICATIONS] mark failed:", e?.message || e); }
  };

  // N1: mark all read.
  const handleIssuerMarkAllRead = async () => {
    const unread = issuerNotifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((n) => apiService.markIssuerNotificationAsRead(n._id)));
      setIssuerNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setIssuerUnreadCount(0);
    } catch (e) { console.error("[ISSUER NOTIFICATIONS] mark-all failed:", e?.message || e); }
  };

  const applyFilters = useCallback(() => {
    let result = [...credentials];
    if (filterType !== "all") result = result.filter((cred) => cred.credentialType === filterType);
    if (filterStatus !== "all") {
      result = result.filter((cred) => {
        const normalizedStatus = String(cred.status || "").toLowerCase();
        if (filterStatus === "issued") return normalizedStatus === "issued" || normalizedStatus === "active";
        return normalizedStatus === filterStatus;
      });
    }
    result = applySorting(result, sortBy);
    setFilteredCredentials(result);
  }, [credentials, sortBy, filterType, filterStatus]);

  useEffect(() => { applyFilters(); }, [applyFilters]);
  useEffect(() => { fetchSubordinateDirectory(subordinateDirectoryFilter); }, [subordinateDirectoryFilter]);

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
      if (mode === "all") setTotalSubordinateCount(list.filter((issuer) => issuer?.status === "approved").length);
      setSubordinateDirectory(list);
    } catch (err) {
      console.error("Error fetching subordinate directory:", err);
      setSubordinateDirectory([]);
      setSubordinateDirectoryError(err.response?.data?.message || "Failed to load subordinate directory.");
    } finally { setSubordinateDirectoryLoading(false); }
  };

  const fetchRootSubordinateLogs = async (filter = "all") => {
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

  // RA2: open the on-chain history for one subordinate (filters the already-fetched logs).
  const openSubordinateHistory = (issuer) => { setSubHistorySubordinate(issuer); setSubHistoryOpen(true); };
  const closeSubordinateHistory = () => { setSubHistoryOpen(false); setSubHistorySubordinate(null); };
  const subHistoryLogs = useMemo(() => {
    if (!subHistorySubordinate) return [];
    const sid = subHistorySubordinate._id || subHistorySubordinate.id;
    const semail = String(subHistorySubordinate.email || "").toLowerCase();
    return rootSubordinateLogs.filter((log) =>
      (log.issuerId && log.issuerId === sid) ||
      (log.issuerEmail && String(log.issuerEmail).toLowerCase() === semail)
    );
  }, [subHistorySubordinate, rootSubordinateLogs]);

  // Q1: all instances (reissues) of the credential currently open in the history modal,
  // derived from the already-fetched list by templateId+holderID. Oldest → newest.
  const historyLineage = useMemo(
    () => (historyCredential ? getCredentialLineage(historyCredential, credentials) : []),
    [historyCredential, credentials]
  );

  const handleRootApproveSubordinate = async (issuerId) => {
    try {
      await apiService.rootApproveSubordinateIssuer(issuerId, "");
      showToast("Subordinate issuer approved successfully!");
      fetchSubordinateDirectory(subordinateDirectoryFilter);
      fetchRootSubordinateLogs("all");
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
      fetchRootSubordinateLogs("all");
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

  const handleSeeHistory = async (cred) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      setHistoryData(null);
      setHistoryCredential(cred);
      setHistoryOpen(true);
      const blockchainId = cred?.blockchainId || cred?.id;
      if (!blockchainId) {
        setHistoryError("No blockchain ID found for this credential.");
        setHistoryLoading(false);
        return;
      }
      const result = await apiService.Get_CredentialHistory(blockchainId);
      setHistoryData({ ...result, history: filterHistoryEntries(result?.history) });
    } catch (err) {
      console.error("[ISSUER DASHBOARD] History fetch error:", err);
      setHistoryError("Failed to load credential history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryData(null);
    setHistoryError(null);
    setHistoryCredential(null);
  };

  const openRevokeForCredential = (credential) => {
    setRevokeForm({
      credentialId: credential?.blockchainId || credential?.id || "",
      rejectionReason: "",
    });
    // R2: lock the modal to this specific credential — no holder/credential pickers.
    setRevokeLockedCred(credential || null);
    setRevokeLocked(true);
    setRevokeError("");
    setShowRevokeModal(true);
  };

  const applySorting = (array, sortOption) => {
    const sorted = [...array];
    switch (sortOption) {
      case "issuedDate-desc": sorted.sort((a, b) => new Date(b.assignedDate || b.issuedDate || b.createdAt || 0) - new Date(a.assignedDate || a.issuedDate || a.createdAt || 0)); break;
      case "issuedDate-asc": sorted.sort((a, b) => new Date(a.assignedDate || a.issuedDate || a.createdAt || 0) - new Date(b.assignedDate || b.issuedDate || b.createdAt || 0)); break;
      case "expiryDate-desc": sorted.sort((a, b) => new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0)); break;
      case "expiryDate-asc": sorted.sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0)); break;
      case "credentialType-asc": sorted.sort((a, b) => (a.credentialType || "").localeCompare(b.credentialType || "")); break;
      default: break;
    }
    return sorted;
  };

  const getUniqueCredentialTypes = () => { const types = new Set(credentials.map((cred) => cred.credentialType).filter(Boolean)); return Array.from(types).sort(); };


  // R1: only genuinely revokable credentials. Use EFFECTIVE status so a credential
  // past its end-of-day-Manila expiry (stored status still "issued") is excluded too,
  // and drop the old `!c.status` loophole. Revoked/expired never appear here.
  const searchableIssuedCredentials = useMemo(() => credentials.filter((c) => {
    const eff = effectiveCredentialStatus(c);
    return eff === "issued" || eff === "active";
  }), [credentials]);
  const issueTemplateTypeOptions = useMemo(() => Array.from(new Set(templateOptions.map((template) => template.credentialType).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [templateOptions]);

  const filteredTemplateOptions = useMemo(() => {
    const query = issueTemplateSearch.trim().toLowerCase();
    let result = [...templateOptions];
    if (issueTemplateTypeFilter !== "all") {
      result = result.filter((template) => String(template.credentialType || "").toLowerCase() === issueTemplateTypeFilter.toLowerCase());
    }
    if (!query) return result;
    return result.filter((template) => [template.credentialName, template.credentialType, template.description, template.id, template._id].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [templateOptions, issueTemplateSearch, issueTemplateTypeFilter]);

  const filteredAvailableUsers = useMemo(() => {
    const query = issueRecipientSearch.trim().toLowerCase();
    if (!query) return availableUsers;
    return availableUsers.filter((user) => [user.name, user.fullName, user.username, user.email, user._id, user.id].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [availableUsers, issueRecipientSearch]);

  const revokeHolderOptions = useMemo(() => Array.from(new Set(searchableIssuedCredentials.map((cred) => cred.holderName || cred.holderID).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [searchableIssuedCredentials]);

  const filteredRevokeHolders = useMemo(() => {
    const query = revokeHolderSearch.trim().toLowerCase();
    const allHolders = revokeHolderOptions;
    if (!query) return allHolders;
    return allHolders.filter((holder) => holder.toLowerCase().includes(query));
  }, [revokeHolderOptions, revokeHolderSearch]);

  const getRevokedDateValue = useCallback((credential) => credential?.revokedAt || credential?.rejectedAt || (String(credential?.status || "").toLowerCase() === "revoked" ? credential?.updatedAt : ""), []);

  // R3: issued-date string for a credential (disambiguates same-type credentials for the
  // same holder). Prefer assignedDate = when it was actually issued TO THE HOLDER; the
  // chaincode's issuedDate is the TEMPLATE's creation date, so it's not per-issuance.
  const formatIssuedDate = useCallback((cred) => {
    const d = cred?.assignedDate || cred?.issuedDate || cred?.createdAt;
    return d ? new Date(d).toLocaleDateString() : "";
  }, []);

  const uniqueTemplateTypes = useMemo(() => Array.from(new Set(templateOptions.map((template) => template.credentialType).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [templateOptions]);

  const filteredTemplates = useMemo(() => {
    let result = [...(templateOptions || [])];
    if (templateTypeFilter !== "all") result = result.filter((t) => String(t.credentialType || "").toLowerCase() === templateTypeFilter.toLowerCase());
    const query = templateSearch.trim().toLowerCase();
    if (query) result = result.filter((t) => [t.credentialName, t.credentialType, t.description].filter(Boolean).join(" ").toLowerCase().includes(query));
    switch (templateSortBy) {
      case "oldest": result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)); break;
      case "name-asc": result.sort((a, b) => String(a.credentialName || "").localeCompare(String(b.credentialName || ""))); break;
      case "name-desc": result.sort((a, b) => String(b.credentialName || "").localeCompare(String(a.credentialName || ""))); break;
      case "newest":
      default: result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); break;
    }
    return result;
  }, [templateOptions, templateTypeFilter, templateSearch, templateSortBy]);

  const issueTableCredentials = useMemo(() => {
    const query = issueSearch.trim().toLowerCase();
    let result = [...filteredCredentials];
    if (query) result = result.filter((cred) => [cred.credentialName, cred.holderName, cred.holderID, cred.blockchainId, cred.id].filter(Boolean).join(" ").toLowerCase().includes(query));
    return result;
  }, [filteredCredentials, issueSearch]);

  const revokeTableCredentials = useMemo(() => {
    let result = [...credentials];
    if (revokeStatusFilter !== "all") {
      result = result.filter((cred) => {
        // ISSUER3: filter by EFFECTIVE status so it matches the badges (an
        // effectively-expired credential reads as "expired", not "issued").
        const eff = effectiveCredentialStatus(cred);
        if (revokeStatusFilter === "issued") return eff === "issued" || eff === "active";
        return eff === revokeStatusFilter;
      });
    }
    if (revokeTypeFilter !== "all") result = result.filter((cred) => String(cred.credentialType || "").toLowerCase() === revokeTypeFilter.toLowerCase());
    const query = revokeSectionSearch.trim().toLowerCase();
    if (query) result = result.filter((cred) => [cred.credentialName, cred.holderName, cred.holderID, cred.blockchainId, cred.id].filter(Boolean).join(" ").toLowerCase().includes(query));
    switch (revokeSortBy) {
      case "oldest": result.sort((a, b) => new Date(a.assignedDate || a.issuedDate || a.createdAt || 0) - new Date(b.assignedDate || b.issuedDate || b.createdAt || 0)); break;
      case "name-asc": result.sort((a, b) => String(a.credentialName || "").localeCompare(String(b.credentialName || ""))); break;
      case "name-desc": result.sort((a, b) => String(b.credentialName || "").localeCompare(String(a.credentialName || ""))); break;
      case "status-asc": result.sort((a, b) => String(a.status || "").localeCompare(String(b.status || ""))); break;
      case "newest":
      default: result.sort((a, b) => new Date(b.assignedDate || b.issuedDate || b.createdAt || 0) - new Date(a.assignedDate || a.issuedDate || a.createdAt || 0)); break;
    }
    return result;
  }, [credentials, revokeStatusFilter, revokeTypeFilter, revokeSectionSearch, revokeSortBy]);

  const allCredentialRows = useMemo(() => {
    const templateRows = (templateOptions || []).map((template) => ({
      rowType: "template",
      name: template.credentialName || template.credentialType || "N/A",
      type: template.credentialType || "N/A",
      status: "template",
      holderName: "—",
      createdDate: template.createdAt,
      expiryDate: null,
      source: template,
    }));
    const issuedRows = (credentials || []).map((cred) => ({
      rowType: String(cred.status || "issued").toLowerCase() === "revoked" ? "revoked" : String(cred.status || "issued").toLowerCase() === "expired" ? "expired" : "issued",
      name: cred.credentialName || cred.credentialType || "N/A",
      type: cred.credentialType || "N/A",
      status: cred.status || "issued",
      holderName: cred.holderName || cred.holderID || "—",
      createdDate: cred.assignedDate || cred.issuedDate || cred.createdAt,
      expiryDate: cred.expiryDate,
      source: cred,
    }));
    return [...templateRows, ...issuedRows];
  }, [templateOptions, credentials]);

  const renderDescriptionCell = useCallback((item, showPlaceholder = true) => {
    const rawDescription = typeof item?.description === "string" ? item.description : "";
    const trimmedDescription = rawDescription.trim();
    if (!trimmedDescription || trimmedDescription.toLowerCase() === "n/a") {
      return showPlaceholder ? <span style={{ opacity: 0.4 }}>—</span> : null;
    }

    return (
      <button
        type="button"
        className="action-btn"
        onClick={() => setDescriptionModal({ name: item?.credentialName || item?.name || "Credential", description: trimmedDescription })}
        style={{ padding: "4px 10px", fontSize: "11px", background: "var(--accent-weak)", color: "var(--accent-strong)", border: "1px solid var(--accent-weak)", borderRadius: "6px", cursor: "pointer" }}
      >
        View Description
      </button>
    );
  }, []);

  const filteredAllCredentialRows = useMemo(() => {
    let result = [...allCredentialRows];
    if (filterRecordKind !== "all") {
      result = result.filter((row) => filterRecordKind === "templates" ? row.rowType === "template" : row.rowType !== "template");
    }
    if (viewAllTypeFilter !== "all") result = result.filter((row) => String(row.type || "").toLowerCase() === viewAllTypeFilter.toLowerCase());
    const query = viewAllSearch.trim().toLowerCase();
    if (query) result = result.filter((row) => [row.name, row.type, row.status, row.holderName, row.source?.blockchainId, row.source?.id].filter(Boolean).join(" ").toLowerCase().includes(query));
    switch (viewAllSortBy) {
      case "name-asc": result.sort((a, b) => String(a.name).localeCompare(String(b.name))); break;
      case "name-desc": result.sort((a, b) => String(b.name).localeCompare(String(a.name))); break;
      case "oldest": result.sort((a, b) => new Date(a.createdDate || 0) - new Date(b.createdDate || 0)); break;
      case "newest":
      default: result.sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0)); break;
    }
    return result;
  }, [allCredentialRows, filterRecordKind, viewAllTypeFilter, viewAllSearch, viewAllSortBy]);

  const revokableCount = useMemo(
    () => credentials.filter((c) => c.status === "issued" || c.status === "active").length,
    [credentials]
  );


  const filteredRevokableCredentials = useMemo(() => {
    const query = revokeCredentialSearch.trim().toLowerCase();
    const result = searchableIssuedCredentials.filter((cred) => {
      const holderValue = cred.holderName || cred.holderID || "";
      const templateValue = cred.credentialName || cred.credentialType || "";
      const blockchainId = cred.blockchainId || cred.id || "";
      const matchesHolder = !revokeSelectedHolder || holderValue === revokeSelectedHolder;
      const matchesSearch = !query || [holderValue, cred.holderID, templateValue, cred.credentialType, blockchainId].filter(Boolean).join(" ").toLowerCase().includes(query);
      return matchesHolder && matchesSearch;
    });
    // BUGFIX: the picker was unsorted (raw fetch order), so the most-recent credential
    // wasn't on top. Sort most-recent-first by ACTUAL issuance time (assignedDate), which
    // matches the date now shown on each option (formatIssuedDate).
    return result.sort((a, b) =>
      new Date(b.assignedDate || b.issuedDate || b.createdAt || 0) -
      new Date(a.assignedDate || a.issuedDate || a.createdAt || 0)
    );
  }, [revokeCredentialSearch, revokeSelectedHolder, searchableIssuedCredentials]);

  const filterHistoryEntries = useCallback((history) => (Array.isArray(history) ? history : []).filter((entry) => {
    const id = entry?.credentialId || entry?.id || entry?.key || entry?.value?.credentialId || "";
    const action = String(entry?.action || "").toLowerCase();
    const derivedAction = entry?.value?.status === "revoked" || entry?.value?.revokedAt
      ? "revoked"
      : entry?.value?.assignedDate && entry?.value?.holderID
        ? "issued"
        : entry?.value?.isTemplate === true || entry?.value?.holderID === ""
          ? "created template"
          : "updated";
    const status = String(entry?.status || entry?.value?.status || "").toLowerCase();
    const credentialType = String(entry?.credentialType || entry?.value?.credentialType || "").toLowerCase();

    if (String(id).startsWith("vlog_")) return false;
    if ((action === "updated" || derivedAction === "updated") && (status === "status unknown" || status === "unknown")) return false;
    if ((action === "updated" || derivedAction === "updated") && (credentialType === "n/a" || credentialType === "")) return false;

    return true;
  }), []);

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (["issued", "active", "approved", "enabled"].includes(s)) return "var(--ok)";
    if (["revoked", "disabled", "rejected"].includes(s)) return "var(--danger)";
    if (["expired"].includes(s)) return "var(--warn)";
    if (["pending"].includes(s)) return "var(--warn)";
    if (["template"].includes(s)) return "var(--info)";
    return "inherit";
  };

  // Revoke Modal handlers
  const openRevokeModal = () => { setShowRevokeModal(true); setRevokeError(""); setRevokeLocked(false); setRevokeLockedCred(null); setRevokeHolderOpen(false); setRevokeHolderSearch(""); setRevokeSelectedHolder(""); setRevokeCredentialOpen(false); setRevokeCredentialSearch(""); setRevokeForm({ credentialId: "", rejectionReason: "" }); };
  const closeRevokeModal = () => { setShowRevokeModal(false); setRevokeError(""); setRevokeLoading(false); setRevokeLocked(false); setRevokeLockedCred(null); setRevokeHolderOpen(false); setRevokeHolderSearch(""); setRevokeSelectedHolder(""); setRevokeCredentialOpen(false); setRevokeCredentialSearch(""); };
  const handleRevokeFormChange = (e) => { const { name, value } = e.target; setRevokeForm((prev) => ({ ...prev, [name]: value })); };

  const handleSelectRevokeHolder = (holderName) => {
    setRevokeSelectedHolder(holderName);
    setRevokeHolderSearch(holderName);
    setRevokeHolderOpen(false);
    setRevokeForm((prev) => ({ ...prev, credentialId: "" }));
    setRevokeCredentialSearch("");
  };

  const handleSelectRevokeCredential = (cred) => {
    const blockchainId = cred.blockchainId || cred.id;
    setRevokeForm((prev) => ({ ...prev, credentialId: blockchainId }));
    setRevokeCredentialSearch(
      `${cred.holderName || "Unknown"} — ${cred.credentialName || "Untitled"}`
    );
    setRevokeCredentialOpen(false);
  };

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
      await apiService.Create_CredentialTemplate({ id: credentialId, credentialType: createForm.credentialType, credentialName: createForm.credentialName, description: createForm.description, metadata: createForm.metadata, skills: skillsList, badgeImage: badgeImageBase64, visibility: 'private' });
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
      setIssueTemplateSearch("");
      setIssueRecipientSearch("");
      setIssueTemplateOpen(false);
      setIssueRecipientOpen(false);
      setAvailableUsers([]);
      setShowIssueModal(true); setIssueForm({ credentialId: "", recipientId: "", expiryDate: "" });
    } catch (err) { setNoTemplateError("Failed to validate credential templates. Please try again."); }
  };
  const closeIssueModal = () => { setShowIssueModal(false); setIssueError(""); setIssueLoading(false); setIssueConfirmStep(false); setIssueTemplateSearch(""); setIssueRecipientSearch(""); setIssueTemplateOpen(false); setIssueRecipientOpen(false); setAvailableUsers([]); };

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

  const handleSelectTemplate = async (cred) => {
    const value = cred.id || cred._id;
    setIssueForm((prev) => ({ ...prev, credentialId: value, recipientId: "" }));
    setIssueTemplateSearch(cred.credentialName + " (" + cred.credentialType + ")");
    setIssueTemplateOpen(false);
    setIssueRecipientSearch("");
    try {
      setIssueError("");
      const result = await apiService.Get_EligibleUsersForTemplate(value);
      const list = result?.eligibleUsers || [];
      setAvailableUsers(Array.isArray(list) ? list : []);
    } catch (err) { setAvailableUsers([]); setIssueError("Failed to load eligible users for this template."); }
  };

  const handleSelectRecipient = (user) => {
    const value = user._id || user.id;
    setIssueForm((prev) => ({ ...prev, recipientId: value }));
    setIssueRecipientSearch(user.name || user.fullName || user.username || user.email || "");
    setIssueRecipientOpen(false);
  };


  // C2: confirm before flipping a template's visibility (styled modal, not window.confirm)
  const [pendingVisibilityTemplate, setPendingVisibilityTemplate] = useState(null);

  const handleToggleTemplateVisibility = (template) => {
    setPendingVisibilityTemplate(template);
  };

  const confirmToggleTemplateVisibility = async () => {
    const template = pendingVisibilityTemplate;
    setPendingVisibilityTemplate(null);
    const credentialKey = template?.id || template?._id;
    if (!credentialKey) return;

    const newVisibility = template.visibility === "public" ? "private" : "public";

    try {
      await apiService.Update_IssuerTemplateVisibility(credentialKey, newVisibility);
      setTemplateOptions((prev) => prev.map((item) => ((item.id || item._id) === credentialKey ? { ...item, visibility: newVisibility } : item)));
      showToast(`Template is now ${newVisibility}.`);
    } catch (err) {
      console.error("[ISSUER DASHBOARD] Failed to update template visibility:", err);
      showToast(err.response?.data?.message || "Failed to update template visibility.", "danger");
    }
  };

  // G2/I1: form submit only validates and opens the SEPARATE confirmation modal.
  const handleIssueCredential = (e) => {
    e.preventDefault();
    setIssueError("");
    if (!issueForm.credentialId || !issueForm.recipientId) {
      setIssueError("Please select both a credential and a recipient");
      return;
    }
    setIssueConfirmStep(true);
  };

  // G2/I1: the actual issuance — invoked from the confirmation modal's Confirm button.
  const confirmIssueCredential = async () => {
    setIssueLoading(true);
    setIssueError("");
    try {
      await apiService.Issue_Credential(issueForm.credentialId, issueForm.recipientId, issueForm.expiryDate);
      showToast("Credential issued successfully!");
      closeIssueModal();
      fetchCredentials();
    } catch (err) {
      setIssueError(err?.message || "Failed to issue credential");
    } finally {
      setIssueLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // CSS-CHANGE: Back button handler - polo
  // -------------------------------------------------------------------
  const resetCreateViewFilters = () => { setTemplateSearch(""); setTemplateTypeFilter("all"); setTemplateSortBy("newest"); };
  const resetIssueViewFilters = () => { setSortBy("issuedDate-desc"); setFilterType("all"); setFilterStatus("all"); setIssueSearch(""); };
  const resetRevokeViewFilters = () => { setRevokeStatusFilter("all"); setRevokeTypeFilter("all"); setRevokeSectionSearch(""); setRevokeSortBy("newest"); };
  const resetViewAllFilters = () => { setFilterRecordKind("all"); setViewAllTypeFilter("all"); setViewAllSearch(""); setViewAllSortBy("newest"); };

  const openDashboardView = (view) => {
    if (view === "create") resetCreateViewFilters();
    if (view === "issue") resetIssueViewFilters();
    if (view === "revoke") resetRevokeViewFilters();
    if (view === "viewall") resetViewAllFilters();
    setActiveView(view);
  };

  const goHome = () => { setSubordinateDirectoryFilter("all"); setActiveView("home"); };

  // Phase 4: Issuance Performance report (computed from already-loaded issued credentials)
  const issuance = useMemo(() => computeIssuance(credentials), [credentials]);
  // Phase 4 GOOD: Revocation Self-Audit (by template + time-to-revoke; reuses revokedAt/issuedDate)
  const revAudit = useMemo(() => computeRevocationAudit(credentials), [credentials]);

  // -------------------------------------------------------------------
  // LOADING / ERROR STATES
  // -------------------------------------------------------------------
  if (loading) return <div className="issuer-dashboard"><SpinnerBlock label="Loading credentials…" minHeight={240} /></div>;
  if (error) return (
    <div className="issuer-dashboard">
      <p style={{ color: "var(--danger)" }}><strong>Error loading credentials:</strong> {error}</p>
      <p style={{ color: "var(--text-subtle)" }}>Make sure backend is running at http://localhost:4000</p>
    </div>
  );

  // -------------------------------------------------------------------
  // CSS-CHANGE: Card definitions for home view - polo
  // -------------------------------------------------------------------
  const navItems = [
    { key: "home", label: "Dashboard", icon: LayoutDashboard },
    { key: "create", label: "Templates", icon: FilePlus },
    { key: "issue", label: "Issue", icon: Award },
    { key: "revoke", label: "Revoke", icon: Ban },
    { key: "viewall", label: "All Credentials", icon: List },
    { key: "analytics", label: "Performance", icon: BarChart3 },
    { key: "history", label: "History", icon: Receipt },
    ...(!isSubordinate ? [{ key: "subordinates", label: "Subordinates", icon: Building2 }] : []),
  ];

  const handleSidebarSelect = (key) => {
    if (key === "history") navigate("/issuer/history");
    else openDashboardView(key);
  };

  // -------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------
  return (
    <div className="issuer-dashboard">
      {/* Toast */}
      <AppToast show={toast.show} message={toast.message} type={toast.type} />

      <AppShell
        sidebar={
          <Sidebar
            title="Issuer"
            subtitle={displayName}
            items={navItems}
            activeKey={activeView}
            onSelect={handleSidebarSelect}
          />
        }
      >
      {/* ============================================================
          DASHBOARD OVERVIEW
          ============================================================ */}
      {activeView === "home" && (
        <>
          <div className="issuer-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <h1>Dashboard</h1>
              <p>Welcome back, {displayName}</p>
            </div>
            {/* N1: issuer notification bell + panel */}
            <div ref={issuerNotifRef} style={{ position: "relative" }}>
              <button type="button" onClick={() => setIssuerNotifOpen((o) => !o)} aria-label="Notifications"
                style={{ position: "relative", background: "var(--accent-weak)", border: "1px solid rgba(255,255,255,0.18)", color: "var(--accent-strong)", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
                <Bell size={18} aria-hidden="true" />
                {issuerUnreadCount > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, background: "var(--danger)", color: "var(--text)", fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{issuerUnreadCount}</span>
                )}
              </button>
              {issuerNotifOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 340, maxHeight: 420, overflowY: "auto", background: "var(--surface-2)", border: "1px solid var(--border-accent)", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.45)", zIndex: 50, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ fontSize: 14 }}>Notifications</strong>
                    {issuerNotifications.some((n) => !n.read) && (
                      <button type="button" onClick={handleIssuerMarkAllRead} style={{ background: "none", border: "none", color: "var(--accent-strong)", cursor: "pointer", fontSize: 12 }}>Mark all as read</button>
                    )}
                  </div>
                  {issuerNotifications.length === 0 ? (
                    <div style={{ padding: "12px 4px", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>No notifications yet.</div>
                  ) : (
                    issuerNotifications.map((n) => (
                      <button key={n._id} type="button" onClick={() => handleIssuerNotifClick(n)}
                        style={{ display: "block", width: "100%", textAlign: "left", background: n.read ? "transparent" : "var(--accent-weak)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", marginBottom: 6, cursor: "pointer", color: "var(--text)" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title || "Notification"}</div>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.4, margin: "2px 0" }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}{n.read ? "" : " • Unread"}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats row — each card jumps to its matching view */}
          <div className="issuer-stats-row">
            {[
              { num: templateOptions.length, label: "Templates", view: "create" },
              { num: credentials.length, label: "Issued", view: "issue" },
              { num: credentials.filter(c => c.status === "revoked").length, label: "Revoked", view: "revoke" },
              ...(!isSubordinate
                ? [{ num: totalSubordinateCount, label: "Subordinates", view: "subordinates" }]
                : []),
            ].map((card) => (
              <div
                key={card.label}
                className="issuer-stat-card"
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onClick={() => openDashboardView(card.view)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDashboardView(card.view);
                  }
                }}
                title={`Go to ${card.label}`}
              >
                <span className="issuer-stat-num">{card.num}</span>
                <span className="issuer-stat-label">{card.label}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="issuer-quick-actions">
            <Button icon={FilePlus} onClick={() => openDashboardView("create")}>Create template</Button>
            <Button variant="secondary" icon={Award} onClick={() => openDashboardView("issue")}>Issue credential</Button>
          </div>
        </>
      )}

      {/* ============================================================
          CREATE VIEW — Form + Templates Table
          ============================================================ */}
      {activeView === "create" && (
        <>
          <h2>Create Credential Templates</h2>

          <div style={{ margin: "20px 0" }}>
            <button onClick={openCreateModal} className="action-btn create-btn">+ Create New Template</button>
          </div>

          {/* Templates table */}
          <div className="table-container">
            <h3 style={{ marginBottom: 12 }}>Your Templates ({filteredTemplates.length})</h3>
            <div className="filter-row">
              <div className="filter-group"><label>Search:</label><input value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} placeholder="Search templates..." className="filter-select" /></div>
              <div className="filter-group"><label>Type:</label><select value={templateTypeFilter} onChange={(e) => setTemplateTypeFilter(e.target.value)} className="filter-select"><option value="all">All Types</option>{uniqueTemplateTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className="filter-group"><label>Sort by:</label><select value={templateSortBy} onChange={(e) => setTemplateSortBy(e.target.value)} className="filter-select"><option value="newest">Most Recent</option><option value="oldest">Oldest First</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option></select></div>
            </div>
            {filteredTemplates.length === 0 ? (
              <div className="no-results"><p>{templateOptions.length === 0 ? "No credential templates found. Create your first template." : "No templates match your filters."}</p></div>
            ) : (
              <table className="template-table">
                <thead><tr><th>Name</th><th>Type</th><th>Template ID</th><th>Description</th><th>Skills</th><th>Visibility</th><th>Created Date</th></tr></thead>
                <tbody>
                  {filteredTemplates.map((template) => {
                    const id = template.id || template._id;
                    return (
                      <tr key={id}>
                        <td>{template.credentialName || "N/A"}</td>
                        <td>{template.credentialType || "N/A"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{id || "N/A"}</td>
                        <td>{template.description || "—"}</td>
                        <td>{Array.isArray(template.skills) && template.skills.length > 0 ? template.skills.join(", ") : "—"}</td>
                        <td>
                          {/* C: per-template visibility toggle (same pattern as All Credentials) */}
                          <button type="button" className="action-btn" onClick={() => handleToggleTemplateVisibility(template)} style={{ padding: "4px 12px", fontSize: "11px", background: template?.visibility === "public" ? "var(--ok-weak)" : "var(--warn-weak)", color: template?.visibility === "public" ? "var(--ok)" : "var(--warn)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "999px", cursor: "pointer" }}>
                            {template?.visibility === "public" ? "Public" : "Private"}
                          </button>
                        </td>
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
          <h2>Issue Credentials</h2>

          <div style={{ margin: "20px 0" }}>
            <button onClick={openIssueModal} className="action-btn issue-btn">+ Issue Credential</button>
            {noTemplateError && <div className="no-template-warning">{noTemplateError}</div>}
          </div>

          {/* Filter Section */}
          <div className="filter-section">
            <h3>Filter &amp; sort</h3>
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="sortBy">Sort By:</label>
                <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                  <option value="issuedDate-desc">Most recent</option>
                  <option value="issuedDate-asc">Oldest</option>
                  <option value="expiryDate-desc">Latest expiry</option>
                  <option value="expiryDate-asc">Expiring soonest</option>
                  <option value="credentialType-asc">Type (A–Z)</option>
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
                  <option value="issued">Issued</option>
                  <option value="revoked">Revoked</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
            <div className="filter-row"><div className="filter-group"><label htmlFor="issueSearch">Search:</label><input id="issueSearch" value={issueSearch} onChange={(e) => setIssueSearch(e.target.value)} placeholder="Search by credential, holder, or ID..." className="filter-select" /></div></div><div className="results-info">Showing <strong>{issueTableCredentials.length}</strong> of <strong>{credentials.length}</strong> credentials</div>
          </div>

          {issueTableCredentials.length > 0 && (
            <StatusLegend
              label="Status key"
              style={{ marginBottom: 16 }}
              items={[
                { label: "Active / Issued", color: "var(--ok)", meaning: "issued and currently valid" },
                { label: "Revoked", color: "var(--danger)", meaning: "you cancelled it" },
                { label: "Expired", color: "var(--warn)", meaning: "past its expiry date" },
              ]}
            />
          )}

          {/* Issued credentials table */}
          {issueTableCredentials.length === 0 ? (
            <div className="no-results"><p>{credentials.length === 0 ? "No credentials found. Issue your first credential." : "No credentials match your filters."}</p></div>
          ) : (
            <div className="table-container">
              <table className="template-table">
                <thead><tr><th>Credential ID</th><th>Holder Name</th><th>Credential Name</th><th>Type</th><th>Created Date</th><th>Status</th><th>Visibility</th><th>Revoked Date</th><th>Expiry Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {issueTableCredentials.map((credential) => {
                    const blockchainId = credential.blockchainId || credential.id;
                    return (
                      <tr key={blockchainId}>
                        <td>{blockchainId || "N/A"}</td>
                        <td>{credential.holderName || "N/A"}</td>
                        <td>{credential.credentialName || "N/A"}</td>
                        <td>{credential.credentialType || "N/A"}</td>
                        <td>{(credential.assignedDate || credential.issuedDate) ? new Date(credential.assignedDate || credential.issuedDate).toLocaleDateString() : "N/A"}</td>
                        <td><span className={`status-badge status-${effectiveCredentialStatus(credential)}`}>{effectiveCredentialStatus(credential)}</span></td>
                        <td>{credential.visibility === "public" ? "Public" : "Private"}</td>
                        <td>{getRevokedDateValue(credential) ? new Date(getRevokedDateValue(credential)).toLocaleDateString() : "—"}</td>
                        <td>{credential.expiryDate ? new Date(credential.expiryDate).toLocaleDateString() : "N/A"}</td>
                        <td className="actions-cell">
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleSeeHistory(credential)}
                            style={{ padding: "6px 10px", fontSize: "12px", background: "var(--accent-weak)", color: "var(--accent-strong)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "8px", cursor: "pointer" }}
                          >
                            View BC History
                          </button>
                          {renderDescriptionCell(credential, false)}
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
          VIEW ALL CREDENTIALS — Unified table
          ============================================================ */}
      {activeView === "viewall" && (
        <>
          <h2>View Credentials</h2>
          <StatusLegend
            label="Status key"
            style={{ marginBottom: 16 }}
            items={[
              { label: "Issued / Active", color: "var(--ok)", meaning: "issued and currently valid" },
              { label: "Revoked", color: "var(--danger)", meaning: "cancelled by the issuer" },
              { label: "Expired", color: "var(--warn)", meaning: "past its expiry date" },
              { label: "Template", color: "var(--info)", meaning: "reusable template, not yet issued" },
            ]}
          />
          <div className="table-container">
            <div className="filter-row">
              <div className="filter-group"><label>Record Kind:</label><select value={filterRecordKind} onChange={(e) => setFilterRecordKind(e.target.value)} className="filter-select"><option value="all">All</option><option value="templates">Templates</option><option value="issued">Issued Credentials</option></select></div><div className="filter-group"><label>Type:</label><select value={viewAllTypeFilter} onChange={(e) => setViewAllTypeFilter(e.target.value)} className="filter-select"><option value="all">All Types</option>{getUniqueCredentialTypes().map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className="filter-group"><label>Search:</label><input value={viewAllSearch} onChange={(e) => setViewAllSearch(e.target.value)} placeholder="Search credentials..." className="filter-select" /></div>
              <div className="filter-group"><label>Sort by:</label><select value={viewAllSortBy} onChange={(e) => setViewAllSortBy(e.target.value)} className="filter-select"><option value="newest">Most Recent</option><option value="oldest">Oldest First</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option></select></div>
            </div>
            {filteredAllCredentialRows.length === 0 ? (
              <div className="no-results"><p>No credentials match your filters.</p></div>
            ) : (
              <table className="template-table">
                <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Holder Name</th><th>Visibility</th><th>Created Date</th><th>Expiry Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredAllCredentialRows.map((row, index) => (
                    <tr key={`${row.rowType}-${row.source?.id || row.source?._id || row.source?.blockchainId || index}`}>
                      <td>{row.name}</td>
                      <td>{row.type}</td>
                      <td>{(() => { const eff = row.rowType === "template" ? (row.status || row.rowType) : effectiveCredentialStatus(row); return <span className={`status-badge status-${String(eff).toLowerCase()}`} style={{ color: getStatusColor(eff), borderColor: `${getStatusColor(eff)}55` }}>{eff}</span>; })()}</td>
                      <td>{row.holderName}</td>
                      <td>{row.source?.visibility === "public" ? "Public" : "Private"}</td>
                      <td>{row.createdDate ? new Date(row.createdDate).toLocaleDateString() : "N/A"}</td>
                      <td>{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : "—"}</td>
                      <td className="actions-cell">{row.rowType === "template" ? <><button type="button" className="action-btn" onClick={() => handleToggleTemplateVisibility(row.source)} style={{ padding: "4px 12px", fontSize: "11px", background: row.source?.visibility === "public" ? "var(--ok-weak)" : "var(--warn-weak)", color: row.source?.visibility === "public" ? "var(--ok)" : "var(--warn)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "999px", cursor: "pointer" }}>{row.source?.visibility === "public" ? "Public" : "Private"}</button>{renderDescriptionCell(row.source, false)}</> : <><button type="button" className="action-btn" onClick={() => handleSeeHistory(row.source)} style={{ padding: "6px 10px", fontSize: "12px", background: "var(--accent-weak)", color: "var(--accent-strong)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "8px", cursor: "pointer" }}>View BC History</button>{renderDescriptionCell(row.source, false)}</>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ============================================================
          REVOKE VIEW — Revoke form + Revokable credentials list
          ============================================================ */}
      {activeView === "revoke" && (
        <>
          <h2>Revoke Credentials</h2>

          <StatusLegend
            label="Status key"
            style={{ margin: "12px 0 4px" }}
            items={[
              { label: "Issued / Active", color: "var(--ok)", meaning: "valid — can be revoked" },
              { label: "Revoked", color: "var(--danger)", meaning: "already cancelled" },
              { label: "Expired", color: "var(--warn)", meaning: "past its expiry date" },
            ]}
          />

          <div style={{ margin: "20px 0" }}>
            <button onClick={openRevokeModal} className="action-btn revoke-btn">Revoke a credential</button>
          </div>

          {/* Revokable credentials list */}
          <div className="table-container">
            <h3 style={{ marginBottom: 12 }}>Issued Credentials ({revokableCount} revokable)</h3>
            <div className="filter-row">
              <div className="filter-group"><label>Status:</label><select value={revokeStatusFilter} onChange={(e) => setRevokeStatusFilter(e.target.value)} className="filter-select"><option value="all">All Status</option><option value="issued">Issued</option><option value="revoked">Revoked</option><option value="expired">Expired</option></select></div>
              <div className="filter-group"><label>Type:</label><select value={revokeTypeFilter} onChange={(e) => setRevokeTypeFilter(e.target.value)} className="filter-select"><option value="all">All Types</option>{getUniqueCredentialTypes().map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className="filter-group"><label>Search:</label><input value={revokeSectionSearch} onChange={(e) => setRevokeSectionSearch(e.target.value)} placeholder="Search by credential, holder, or ID..." className="filter-select" /></div>
              <div className="filter-group"><label>Sort by:</label><select value={revokeSortBy} onChange={(e) => setRevokeSortBy(e.target.value)} className="filter-select"><option value="newest">Most Recent</option><option value="oldest">Oldest First</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option><option value="status-asc">Status A-Z</option></select></div>
            </div>
            {revokeTableCredentials.length === 0 ? (
              <div className="no-results"><p>{credentials.length === 0 ? "No issued credentials found." : "No credentials match your filters."}</p></div>
            ) : (
              <table className="template-table">
                <thead><tr><th>Credential ID</th><th>Name</th><th>Holder</th><th>Type</th><th>Status</th><th>Issued Date</th><th>Revoked Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {revokeTableCredentials.map((credential) => {
                    const blockchainId = credential.blockchainId || credential.id;
                    return (
                      <tr key={blockchainId}>
                        <td>{blockchainId || "N/A"}</td>
                        <td>{credential.credentialName || "N/A"}</td>
                        <td>{credential.holderName || "N/A"}</td>
                        <td>{credential.credentialType || "N/A"}</td>
                        <td><span className={`status-badge status-${effectiveCredentialStatus(credential)}`}>{effectiveCredentialStatus(credential)}</span></td>
                        <td>{(credential.assignedDate || credential.issuedDate) ? new Date(credential.assignedDate || credential.issuedDate).toLocaleDateString() : "N/A"}</td>
                        <td>{getRevokedDateValue(credential) ? new Date(getRevokedDateValue(credential)).toLocaleDateString() : "—"}</td>
                        <td className="actions-cell">
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleSeeHistory(credential)}
                            style={{ padding: "6px 10px", fontSize: "12px", background: "var(--accent-weak)", color: "var(--accent-strong)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "8px", cursor: "pointer", marginRight: "8px" }}
                          >
                            View BC History
                          </button>
                          {renderDescriptionCell(credential, false)}
                          {(() => {
                            // R1: gate on EFFECTIVE status so an effectively-expired credential
                            // (cron hasn't flipped it yet) shows "Expired", not a Revoke button the
                            // backend would reject.
                            const eff = effectiveCredentialStatus(credential);
                            return (eff === "issued" || eff === "active") ? (
                              <button onClick={() => openRevokeForCredential(credential)} className="action-btn revoke-btn">Revoke</button>
                            ) : (
                              // ISSUER2: Status column already shows the badge — don't repeat it here.
                              <span style={{ opacity: 0.4 }}>—</span>
                            );
                          })()}
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
          <h2>Subordinate Management</h2>

          <StatusLegend
            label="Status key"
            style={{ margin: "12px 0 0" }}
            items={[
              { label: "Approved", color: "var(--ok)", meaning: "fully approved — the subordinate can issue" },
              { label: "Pending / Root-approved", color: "var(--info)", meaning: "awaiting the next approval step" },
              { label: "Rejected", color: "var(--danger)", meaning: "denied by you or the admin" },
              { label: "Disabled", color: "var(--text-muted)", meaning: "turned off by an admin" },
            ]}
          />

          {/* My Subordinates */}
          <div className="table-container" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>My Subordinates</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="subordinateDirectoryFilter">View:</label>
                <select id="subordinateDirectoryFilter" value={subordinateDirectoryFilter} onChange={(e) => setSubordinateDirectoryFilter(e.target.value)} className="filter-select">
                  <option value="all">All Subordinates</option>
                  <option value="pending">Pending Root Approval</option>
                  <option value="root_approved">Root Approved</option>
                  <option value="root_rejected">Root Rejected</option>
                  <option value="approved">Fully Approved</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div style={{ margin: "0 0 12px", fontSize: "var(--fs-small)", color: "var(--text-muted)", lineHeight: 1.4, textAlign: "left" }}>
              <strong style={{ color: "var(--text)" }}>Description:</strong>{" "}
              {{
                all: "every subordinate that applied under you, in any state.",
                pending: "subordinates awaiting your approval (you're their root authority).",
                root_approved: "you've approved them — now awaiting ChainCert admin's final approval.",
                root_rejected: "applications you rejected at the root-authority stage.",
                approved: "fully approved (by you and admin) — they can issue credentials.",
                disabled: "approved subordinates that an admin has turned off.",
              }[subordinateDirectoryFilter]}
            </div>

            {subordinateDirectoryLoading ? <SpinnerBlock label="Loading subordinate directory…" />
            : subordinateDirectoryError ? <div className="no-results"><p style={{ color: "var(--danger)" }}>{subordinateDirectoryError}</p></div>
            : subordinateDirectory.length === 0 ? <div className="no-results"><p>No subordinate issuers found for this filter.</p></div>
            : (
              <table className="template-table subordinate-table">
                <thead><tr><th>Issuer ID</th><th>Org Name</th><th>Email</th><th>Category</th><th>Root Approval</th><th>Admin Approval</th><th>Overall Status</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {subordinateDirectory.map((issuer) => {
                    const issuerId = issuer._id || issuer.id;
                    const isPendingRootApproval = (issuer.rootApprovalStatus || "pending") === "pending";
                    const adminApproved = String(issuer.status || "").toLowerCase() === "approved";
                    const rootStatus = issuer.rootApprovalStatus || "pending";
                    const rootDate = rootStatus === "approved"
                      ? (issuer.rootApprovedAt ? new Date(issuer.rootApprovedAt).toLocaleDateString() : "—")
                      : rootStatus === "rejected" ? "Rejected" : "Awaiting";
                    const adminDate = adminApproved
                      ? (issuer.approvedAt ? new Date(issuer.approvedAt).toLocaleDateString() : "—")
                      : "Awaiting";
                    return (
                      <tr key={issuerId}>
                        <td title={issuerId}>{issuerId}</td>
                        <td>{issuer.orgName || "N/A"}</td>
                        <td>{issuer.email || "N/A"}</td>
                        <td>{issuer.category || "N/A"}</td>
                        <td><div className="cell-stack"><StatusPill status={rootStatus} /><span className="cell-sub">{rootDate}</span></div></td>
                        <td><div className="cell-stack"><StatusPill status={adminApproved ? "approved" : "pending"} /><span className="cell-sub">{adminDate}</span></div></td>
                        <td><StatusPill status={issuer.status || "pending"} /></td>
                        <td>{issuer.createdAt ? new Date(issuer.createdAt).toLocaleDateString() : "N/A"}</td>
                        <td>
                          <div className="cell-actions">
                            <Button variant="secondary" size="sm" onClick={() => openIssuerDocumentsModal(issuer)}>Documents</Button>
                            <Button variant="secondary" size="sm" onClick={() => openSubordinateHistory(issuer)}>BC History</Button>
                            {isPendingRootApproval && (
                              <>
                                <Button variant="primary" size="sm" onClick={() => handleRootApproveSubordinate(issuerId)}>Approve</Button>
                                <Button variant="danger" size="sm" onClick={() => openRejectSubordinateModal(issuer)}>Reject</Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* RA2: the standalone "Subordinate Decision Logs" table was removed — on-chain
              decision history is now per-subordinate via the "View BC History" button in
              the My Subordinates table above (openSubordinateHistory). */}
        </>
      )}

      {/* ============================================================
          ANALYTICS VIEW — Issuance Performance (Phase 4)
          ============================================================ */}
      {activeView === "analytics" && (
        <>
          <h2>Issuance Performance</h2>

          <div className="issuer-stats-row" style={{ marginTop: 16 }}>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{issuance.total}</span>
              <span className="issuer-stat-label">Total Issued</span>
              <Sparkline data={issuance.byMonth} dataKey="count" />
            </div>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{issuance.byType.length}</span>
              <span className="issuer-stat-label">Credential Types</span>
            </div>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{issuance.byMonth[issuance.byMonth.length - 1]?.count ?? 0}</span>
              <span className="issuer-stat-label">This Month</span>
            </div>
          </div>

          <div className="analytics-grid" style={{ marginTop: 18 }}>
            <div className="analytics-card">
              <h3>Issued by Type</h3>
              <TrendBars data={issuance.byType} xKey="type" yKey="count" color={ANALYTICS_COLORS.purple} />
            </div>
            <div className="analytics-card">
              <h3>Monthly Issuance Trend (last 6 months)</h3>
              <TrendBars data={issuance.byMonth} xKey="label" yKey="count" color={ANALYTICS_COLORS.blue} />
            </div>
          </div>

          <InterpretationBox>{issuance.summary}</InterpretationBox>

          {/* Phase 4 GOOD: Revocation Self-Audit — where is our issuance process breaking? */}
          <h2 style={{ marginTop: 32 }}>Revocation Self-Audit</h2>
          <div className="issuer-stats-row" style={{ marginTop: 16 }}>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{revAudit.revokedTotal}</span>
              <span className="issuer-stat-label">Revoked Total</span>
            </div>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{revAudit.topTemplate ? revAudit.topTemplate.count : 0}</span>
              <span className="issuer-stat-label">Worst Template</span>
            </div>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{revAudit.fastShare}%</span>
              <span className="issuer-stat-label">Revoked ≤14 Days</span>
            </div>
          </div>

          {revAudit.revokedTotal > 0 ? (
            <div className="analytics-grid" style={{ marginTop: 18 }}>
              <div className="analytics-card">
                <h3>Revocations by Template</h3>
                <TrendBars data={revAudit.byTemplate} xKey="label" yKey="count" color={ANALYTICS_COLORS.red} />
              </div>
              <div className="analytics-card">
                <h3>Time-to-Revoke (after issuance)</h3>
                <TrendBars data={revAudit.bySpeed} xKey="bucket" yKey="count" color={ANALYTICS_COLORS.amber} />
              </div>
            </div>
          ) : (
            <div className="analytics-card" style={{ marginTop: 18 }}>
              <div className="analytics-chart-empty" style={{ height: 120 }}>
                No revocations to audit — a clean record.
              </div>
            </div>
          )}

          <InterpretationBox>{revAudit.summary}</InterpretationBox>
        </>
      )}
      </AppShell>

      {/* ============================================================
          ALL MODALS (preserved exactly from original)
          ============================================================ */}

      {/* C2: confirm template visibility change */}
      {pendingVisibilityTemplate && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <h3>{pendingVisibilityTemplate.visibility === "public" ? "Make this template private?" : "Make this template public?"}</h3>
            <p style={{ margin: "8px 0 18px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              {pendingVisibilityTemplate.visibility === "public"
                ? `"${pendingVisibilityTemplate.credentialName || "This template"}" will be hidden from your public issuer profile.`
                : `"${pendingVisibilityTemplate.credentialName || "This template"}" will appear on your public issuer profile for anyone to see.`}
            </p>
            <div className="form-actions">
              <button type="button" className="action-btn" onClick={confirmToggleTemplateVisibility}>Confirm</button>
              <button type="button" className="action-btn btn-cancel" onClick={() => setPendingVisibilityTemplate(null)}>Cancel</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setPendingVisibilityTemplate(null)}></div>
        </div>
      )}

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
                <div className="skills-input-row"><input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); }}} placeholder="e.g. Python, Project Management" /><button type="button" className="add-skill-btn" onClick={handleAddSkill}>+ Add Skill</button></div>
                {skillsList.length > 0 && <div className="skills-tags">{skillsList.map((skill, idx) => <span key={idx} className="skill-tag"><span>{skill}</span><button type="button" onClick={() => handleRemoveSkill(skill)} aria-label={`Remove ${skill}`}>×</button></span>)}</div>}
              </div>
              <div className="form-group">
                <label>Badge Image <span className="form-label-hint">(optional)</span></label>
                <label className="file-input-label">
                  <span>Choose File</span>
                  <input type="file" accept="image/png, image/jpeg, image/gif" onChange={handleBadgeImageChange} className="file-input" />
                </label>
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
            <form onSubmit={handleIssueCredential}>
              <div className="modal-section-heading" style={{ marginTop: "12px" }}>Choose a template and recipient to issue a credential quickly.</div>
              <div className="issue-modal-grid">
                <div className="form-group compact-form-group">
                  <label>Template Type</label>
                  <select className="filter-select" value={issueTemplateTypeFilter} onChange={(e) => setIssueTemplateTypeFilter(e.target.value)}>
                    <option value="all">All Types</option>
                    {issueTemplateTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Credential Template <span className="required-star">*</span></label>
                <div className="searchable-select-wrapper">
                  <input
                    type="text"
                    value={issueTemplateSearch}
                    onChange={(e) => {
                      setIssueTemplateSearch(e.target.value);
                      setIssueTemplateOpen(true);
                      if (issueForm.credentialId) {
                        setIssueForm((prev) => ({ ...prev, credentialId: "", recipientId: "" }));
                        setAvailableUsers([]);
                        setIssueRecipientSearch("");
                      }
                    }}
                    onFocus={() => setIssueTemplateOpen(true)}
                    onBlur={() => setTimeout(() => setIssueTemplateOpen(false), 180)}
                    placeholder="Type to search templates..."
                    className="search-select-input"
                    autoComplete="off"
                  />
                  {issueForm.credentialId && (
                    <button type="button" className="searchable-select-clear" onClick={() => {
                      setIssueTemplateSearch("");
                      setIssueForm((prev) => ({ ...prev, credentialId: "", recipientId: "" }));
                      setAvailableUsers([]);
                      setIssueRecipientSearch("");
                      setIssueTemplateOpen(true);
                    }} aria-label="Clear selection">✕</button>
                  )}
                  {issueTemplateOpen && !issueForm.credentialId && (
                    <ul className="searchable-select-list">
                      {filteredTemplateOptions.length > 0 ? filteredTemplateOptions.map((cred) => (
                        <li key={cred.id || cred._id} className="searchable-select-item" onMouseDown={() => handleSelectTemplate(cred)}>
                          <span className="searchable-item-name">{cred.credentialName}</span>
                          <span className="searchable-item-meta">{cred.credentialType}</span>
                        </li>
                      )) : (
                        <li className="searchable-select-empty">{issueTemplateSearch ? "No templates match your search." : "No templates available."}</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Recipient <span className="required-star">*</span></label>
                <div className="searchable-select-wrapper">
                  <input
                    type="text"
                    value={issueRecipientSearch}
                    onChange={(e) => {
                      setIssueRecipientSearch(e.target.value);
                      setIssueRecipientOpen(true);
                      if (issueForm.recipientId) {
                        setIssueForm((prev) => ({ ...prev, recipientId: "" }));
                      }
                    }}
                    onFocus={() => { if (issueForm.credentialId) setIssueRecipientOpen(true); }}
                    onBlur={() => setTimeout(() => setIssueRecipientOpen(false), 180)}
                    placeholder={issueForm.credentialId ? "Type to search recipients..." : "Select a template first"}
                    className="search-select-input"
                    disabled={!issueForm.credentialId}
                    autoComplete="off"
                  />
                  {issueForm.recipientId && (
                    <button type="button" className="searchable-select-clear" onClick={() => {
                      setIssueRecipientSearch("");
                      setIssueForm((prev) => ({ ...prev, recipientId: "" }));
                      setIssueRecipientOpen(true);
                    }} aria-label="Clear selection">✕</button>
                  )}
                  {issueRecipientOpen && issueForm.credentialId && !issueForm.recipientId && (
                    <ul className="searchable-select-list">
                      {filteredAvailableUsers.length > 0 ? filteredAvailableUsers.map((user) => (
                        <li key={user._id || user.id} className="searchable-select-item" onMouseDown={() => handleSelectRecipient(user)}>
                          <span className="searchable-item-name">{user.name || user.fullName || user.username || user.email}</span>
                        </li>
                      )) : (
                        <li className="searchable-select-empty">{issueRecipientSearch ? "No recipients match your search." : "No eligible recipients for this template."}</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-group compact-form-group"><label>Expiry Date <span className="form-label-hint">(optional)</span></label><input type="date" name="expiryDate" value={issueForm.expiryDate} onChange={handleIssueFormChange} /* TEMP-TEST (F01): min={minIssueExpiryDate()} removed so past dates are selectable for expiry testing — RESTORE before demo */ /></div>
              {!issueConfirmStep && issueError && <div className="form-error">{issueError}</div>}
              <div className="form-actions">
                <button type="submit" className="action-btn issue-btn">Issue Credential</button>
                <button type="button" onClick={closeIssueModal} className="action-btn btn-cancel">Cancel</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeIssueModal}></div>
        </div>
      )}

      {/* G2/I1: separate confirmation modal, stacked on top of the Issue modal. The
          overlay's backdrop-filter blurs the issue form behind it. */}
      {showIssueModal && issueConfirmStep && (
        <div className="modal-overlay confirm-overlay">
          <div className="modal confirm-modal">
            <div className="modal-header"><h3>Confirm Issuance</h3></div>
            <p style={{ margin: "12px 0 4px", fontSize: "14px", lineHeight: 1.6, color: "var(--text)" }}>
              <strong style={{ color: "var(--warn)" }}>Are you sure?</strong> This will issue the credential to the selected recipient. The action is recorded on the blockchain and <strong>cannot be undone</strong>.
            </p>
            {issueError && <div className="form-error">{issueError}</div>}
            <div className="form-actions">
              <button type="button" className="action-btn issue-btn" onClick={confirmIssueCredential} disabled={issueLoading}>
                {issueLoading ? "Issuing..." : "Confirm Issue"}
              </button>
              <button type="button" className="action-btn btn-cancel" onClick={() => { setIssueConfirmStep(false); setIssueError(""); }} disabled={issueLoading}>
                Go Back
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { if (!issueLoading) { setIssueConfirmStep(false); setIssueError(""); } }}></div>
        </div>
      )}

      {/* Revoke Credential Modal */}
      {showRevokeModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Revoke Credential</h3>
            <p style={{ margin:"6px 0 12px",fontSize:"13px",color:"var(--warn)",opacity:0.9 }}>
              This action is <strong>irreversible</strong> and will be permanently recorded on the blockchain.
            </p>
            <form onSubmit={handleRevokeSubmit}>
              {revokeLocked ? (
                /* R2: launched from a specific credential row — show it read-only, no pickers. */
                <div className="form-group">
                  <div className="modal-section-heading">You are revoking this credential:</div>
                  {(() => {
                    const c = revokeLockedCred || {};
                    const dateStr = formatIssuedDate(c);
                    return (
                      <div className="selected-credential-card revoke-locked-card">
                        <div className="rlc-name">{c.credentialName || "Untitled"}</div>
                        <dl className="rlc-rows">
                          <div className="rlc-row"><dt>Type</dt><dd>{c.credentialType || "N/A"}</dd></div>
                          <div className="rlc-row"><dt>Holder</dt><dd>{c.holderName || c.holderID || "Unknown"}</dd></div>
                          {dateStr && <div className="rlc-row"><dt>Issued</dt><dd>{dateStr}</dd></div>}
                        </dl>
                      </div>
                    );
                  })()}
                </div>
              ) : (
              <>
              <div className="modal-section-heading">Select a holder then choose the credential to revoke.</div>
              <div className="form-group">
                <label>Holder / Recipient <span className="required-star">*</span></label>
                <div className="searchable-select-wrapper">
                  <input type="text" value={revokeHolderSearch}
                    onChange={(e) => { setRevokeHolderSearch(e.target.value); setRevokeHolderOpen(true); if (revokeSelectedHolder) { setRevokeSelectedHolder(""); setRevokeForm((prev) => ({ ...prev, credentialId: "" })); setRevokeCredentialSearch(""); } }}
                    onFocus={() => setRevokeHolderOpen(true)}
                    onBlur={() => setTimeout(() => setRevokeHolderOpen(false), 180)}
                    placeholder="Type to search holders..."
                    className="search-select-input" autoComplete="off" />
                  {revokeSelectedHolder && (
                    <button type="button" className="searchable-select-clear" onClick={() => { setRevokeHolderSearch(""); setRevokeSelectedHolder(""); setRevokeForm((prev) => ({ ...prev, credentialId: "" })); setRevokeCredentialSearch(""); setRevokeHolderOpen(true); }} aria-label="Clear selection">✕</button>
                  )}
                  {revokeHolderOpen && !revokeSelectedHolder && (
                    <ul className="searchable-select-list">
                      {filteredRevokeHolders.length > 0 ? filteredRevokeHolders.map((holder) => (
                        <li key={holder} className="searchable-select-item" onMouseDown={() => handleSelectRevokeHolder(holder)}>
                          <span className="searchable-item-name">{holder}</span>
                        </li>
                      )) : (
                        <li className="searchable-select-empty">{revokeHolderSearch ? "No holders match." : "No holders found."}</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Credential to Revoke <span className="required-star">*</span></label>
                <div className="searchable-select-wrapper">
                  <input
                    type="text"
                    value={revokeCredentialSearch}
                    onChange={(e) => {
                      setRevokeCredentialSearch(e.target.value);
                      setRevokeCredentialOpen(true);
                      if (revokeForm.credentialId) {
                        setRevokeForm((prev) => ({ ...prev, credentialId: "" }));
                      }
                    }}
                    onFocus={() => setRevokeCredentialOpen(true)}
                    onBlur={() => setTimeout(() => setRevokeCredentialOpen(false), 180)}
                    placeholder="Type to search credentials..."
                    className="search-select-input"
                    autoComplete="off"
                  />
                  {revokeForm.credentialId && (
                    <button type="button" className="searchable-select-clear" onClick={() => {
                      setRevokeCredentialSearch("");
                      setRevokeForm((prev) => ({ ...prev, credentialId: "" }));
                      setRevokeCredentialOpen(true);
                    }} aria-label="Clear selection">✕</button>
                  )}
                  {revokeCredentialOpen && !revokeForm.credentialId && (
                    <ul className="searchable-select-list">
                      {filteredRevokableCredentials.length > 0 ? filteredRevokableCredentials.map((cred) => {
                        const blockchainId = cred.blockchainId || cred.id;
                        const issuedStr = formatIssuedDate(cred); // R3
                        return (
                          <li key={blockchainId} className="searchable-select-item" onMouseDown={() => handleSelectRevokeCredential(cred)}>
                            <span className="searchable-item-name">{cred.credentialName || "Untitled"}</span>
                            <span className="searchable-item-sub">{cred.holderName || cred.holderID || "Unknown holder"}</span>
                            <span className="searchable-item-meta">{[cred.credentialType, issuedStr ? `Issued ${issuedStr}` : ""].filter(Boolean).join("  ·  ")}</span>
                          </li>
                        );
                      }) : (
                        <li className="searchable-select-empty">{revokeCredentialSearch ? "No credentials match." : "No revokable credentials."}</li>
                      )}
                    </ul>
                  )}
                </div>
                {revokeForm.credentialId && (() => {
                  const found = credentials.find((c) => (c.blockchainId || c.id) === revokeForm.credentialId);
                  if (!found) return <div className="selected-credential-card">{revokeForm.credentialId}</div>;
                  const dateStr = formatIssuedDate(found);
                  return (
                    <div className="selected-credential-card revoke-locked-card">
                      <div className="rlc-name">{found.credentialName || "Untitled"}</div>
                      <dl className="rlc-rows">
                        <div className="rlc-row"><dt>Type</dt><dd>{found.credentialType || "N/A"}</dd></div>
                        <div className="rlc-row"><dt>Holder</dt><dd>{found.holderName || found.holderID || "No holder"}</dd></div>
                        {dateStr && <div className="rlc-row"><dt>Issued</dt><dd>{dateStr}</dd></div>}
                      </dl>
                    </div>
                  );
                })()}
              </div>
              </>
              )}
              <div className="form-group"><label>Revocation Reason:</label><textarea name="rejectionReason" value={revokeForm.rejectionReason} onChange={handleRevokeFormChange} rows={3} placeholder="State the reason for revoking this credential..." required /></div>
              {revokeError && <div className="form-error">{revokeError}</div>}
              <div className="form-actions"><button type="submit" className="action-btn revoke-btn" disabled={revokeLoading}>{revokeLoading ? "Revoking..." : "Revoke"}</button><button type="button" onClick={closeRevokeModal} className="action-btn btn-cancel">Cancel</button></div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeRevokeModal}></div>
        </div>
      )}

      {/* RA2: per-subordinate on-chain decision history */}
      {subHistoryOpen && (
        <div className="modal-overlay">
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3>Subordinate BC History — {subHistorySubordinate?.orgName || subHistorySubordinate?.email || "Subordinate"}</h3>
              <button type="button" className="modal-close" onClick={closeSubordinateHistory}>✕</button>
            </div>
            <div className="modal-section-heading" style={{ marginTop: 8 }}>
              Immutable root-authority decisions recorded on the blockchain for this subordinate.
            </div>
            {rootSubordinateLogsLoading ? (
              <SpinnerBlock label="Loading history…" />
            ) : subHistoryLogs.length === 0 ? (
              <div className="no-results"><p>No on-chain decisions recorded for this subordinate yet.</p></div>
            ) : (
              <table className="template-table">
                <thead><tr><th>Decision</th><th>Reason</th><th>Performed By MSP</th><th>Timestamp</th><th>Tx ID</th></tr></thead>
                <tbody>
                  {subHistoryLogs.map((log, index) => {
                    const isApproved = String(log.decision || "").toLowerCase() === "approved";
                    return (
                      <tr key={log.txId || `${log.issuerId || "issuer"}-${index}`}>
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
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button type="button" onClick={closeSubordinateHistory} className="action-btn btn-cancel">Close</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeSubordinateHistory}></div>
        </div>
      )}

      {historyOpen && (
        <div className="modal-overlay">
          <div className="modal modal-wide history-modal" style={{ maxWidth: "900px", width: "90vw", padding: "28px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "16px" }}>
              <div style={{ flex: 1, minWidth: 0, marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "20px", whiteSpace: "nowrap" }}>Credential History (Blockchain Audit Trail)</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px", fontSize: "13px", lineHeight: "1.6", textAlign: "left" }}>
                  <div><strong>Credential:</strong> {historyCredential?.credentialName || "N/A"}</div>
                  <div style={{ wordBreak: "break-all", fontFamily: "monospace", fontSize: "11px" }}>
                    <strong style={{ fontFamily: "inherit", fontSize: "13px" }}>Blockchain ID:</strong>{" "}
                    {historyCredential?.blockchainId || historyCredential?.id || "N/A"}
                  </div>
                  {historyCredential?.holderName && <div><strong>Holder:</strong> {historyCredential.holderName}</div>}
                  {historyCredential?.issuerName && historyCredential.issuerName !== "N/A" && historyCredential?.holderName && <div><strong>Issuer:</strong> {historyCredential.issuerName}</div>}
                  {String(historyCredential?.status || "").toLowerCase() === "revoked" && getRevokedDateValue(historyCredential) && <div><strong>Revoked On:</strong> <span style={{ color: "var(--danger)" }}>{new Date(getRevokedDateValue(historyCredential)).toLocaleDateString()}</span></div>}
                </div>
              </div>
              <button type="button" className="modal-close history-modal-close" onClick={closeHistory}>✕</button>
            </div>

            {/* Q1: Credential Lineage — every issuance of this credential to this holder,
                across reissues (issued → revoked → reissued → expired → …). */}
            {historyLineage.length > 1 && (
              <div className="cred-lineage" style={{ marginBottom: 18, border: "1px solid var(--accent-weak)", borderRadius: 12, padding: "14px 16px", background: "var(--accent-weaker)" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Credential Lineage</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.62)", marginBottom: 10 }}>
                  {historyLineage.length} issuances of <strong>{historyCredential?.credentialName || "this credential"}</strong> to <strong>{historyCredential?.holderName || historyCredential?.holderID || "this holder"}</strong>, oldest first. The <strong>highlighted</strong> row's blockchain history is shown below — click another row's <strong>View</strong> to switch.
                </div>
                <table className="template-table">
                  <thead><tr><th>#</th><th>Status</th><th>Issued</th><th>Expiry</th><th>Revoked</th><th>Blockchain History</th></tr></thead>
                  <tbody>
                    {historyLineage.map((inst, i) => {
                      const eff = effectiveCredentialStatus(inst);
                      const current = isSameInstance(inst, historyCredential);
                      const revoked = getRevokedDateValue(inst);
                      return (
                        <tr key={inst.blockchainId || inst.id || i} style={current ? { background: "var(--accent-weak)" } : undefined}>
                          <td>{i + 1}{current ? " ◀" : ""}</td>
                          <td><span className={`status-badge status-${eff}`}>{eff}</span></td>
                          <td>{formatIssuedDate(inst) || "N/A"}</td>
                          <td>{inst.expiryDate ? new Date(inst.expiryDate).toLocaleDateString() : "—"}</td>
                          <td>{revoked ? new Date(revoked).toLocaleDateString() : "—"}</td>
                          <td>
                            {current ? (
                              <span style={{ opacity: 0.55, fontSize: 12 }}>Shown below</span>
                            ) : (
                              <button type="button" className="action-btn" onClick={() => handleSeeHistory(inst)} style={{ padding: "4px 10px", fontSize: 12, background: "var(--accent-weak)", color: "var(--accent-strong)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 6, cursor: "pointer" }}>View</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {historyLoading && <SpinnerBlock label="Loading blockchain history…" minHeight={100} />}
            {historyError && <div className="form-error">{historyError}</div>}

            {historyData && (() => {
              const cleanHistory = filterHistoryEntries(historyData.history);

              return cleanHistory.length > 0 ? (
                <div>
                  {historyLineage.length > 1 && (
                    <div style={{ fontWeight: 600, fontSize: 14, margin: "4px 0 8px" }}>
                      Blockchain history — selected instance ({historyCredential?.blockchainId || historyCredential?.id || "current"})
                    </div>
                  )}
                  <div style={{ fontSize: "13px", color: "var(--accent-strong)", marginBottom: "12px" }}>
                    Showing {cleanHistory.length} history record(s)
                  </div>
                  <div className="table-wrapper">
                    <table className="template-table history-modal-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Status</th>
                          <th>TX ID</th>
                          <th>Snapshot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cleanHistory.map((entry, idx) => {
                          return (
                            <tr key={entry.txId || idx}>
                              <td>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "N/A"}</td>
                              <td style={{ color: getStatusColor(entry.value?.status || entry.status), fontWeight: 600 }}>{entry.value?.status || entry.status || "N/A"}</td>
                              <td style={{ fontFamily: "monospace", fontSize: "11px" }}>
                                {entry.txId ? `${String(entry.txId).slice(0, 16)}...` : "N/A"}
                              </td>
                              <td style={{ fontSize: "12px" }}>
                                {entry.value?.credentialName || entry.credentialName || entry.value?.credentialType || entry.credentialType || "N/A"}
                                {(entry.value?.holderName || entry.holderName) ? ` | Holder: ${entry.value?.holderName || entry.holderName}` : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "20px", opacity: 0.7 }}>No history records found for this credential.</div>
              );
            })()}
          </div>
          <div className="modal-backdrop" onClick={closeHistory}></div>
        </div>
      )}

      {descriptionModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "600px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>{descriptionModal.name}</h3>
              <button type="button" className="modal-close" onClick={() => setDescriptionModal(null)}>✕</button>
            </div>
            <div style={{ fontSize: "14px", lineHeight: "1.7", color: "rgba(255,255,255,0.85)", whiteSpace: "pre-wrap" }}>
              {descriptionModal.description}
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDescriptionModal(null)}></div>
        </div>
      )}

      {/* Submitted Documents Modal */}
      {showIssuerDocumentsModal && ReactDOM.createPortal(
        <div onClick={closeIssuerDocumentsModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(900px, 95vw)", maxHeight: "85vh", overflow: "auto", background: "var(--surface-2)", borderRadius: "12px", border: "1px solid var(--border-strong)", padding: "18px", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", color: "var(--text)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div><h3 style={{ margin: 0 }}>Submitted Documents</h3><div style={{ fontSize: "13px", opacity: 0.85, marginTop: "6px" }}><div><strong>Issuer:</strong> {selectedIssuerForDocuments?.orgName || "N/A"}</div><div><strong>Email:</strong> {selectedIssuerForDocuments?.email || "N/A"}</div></div></div>
              <button onClick={closeIssuerDocumentsModal} type="button" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "var(--text)", borderRadius: "8px", padding: "8px 10px", cursor: "pointer" }}>✕ Close</button>
            </div>
            {issuerDocumentsLoading ? <SpinnerBlock label="Loading submitted documents…" minHeight={100} />
            : issuerDocumentsError ? <div style={{ padding: "12px", background: "var(--danger-weak)", border: "1px solid var(--danger-weak)", borderRadius: "10px", color: "var(--danger)" }}>{issuerDocumentsError}</div>
            : issuerDocuments.length > 0 ? (
              <div className="table-wrapper"><table className="template-table"><thead><tr><th>Doc Type</th><th>File Name</th><th>MIME Type</th><th>Size</th><th>Actions</th></tr></thead><tbody>
                {issuerDocuments.map((doc, idx) => (
                  <tr key={doc.attachmentName || idx}>
                    <td>{doc.docType || "N/A"}</td><td>{doc.originalname || "N/A"}</td><td>{doc.mimetype || "N/A"}</td>
                    <td>{typeof doc.size === "number" ? `${(doc.size / 1024).toFixed(1)} KB` : "N/A"}</td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => handleViewIssuerDocument(doc)} className="action-btn" style={{ padding: "6px 10px", fontSize: "12px", background: "var(--accent-weak)", color: "var(--accent-strong)", border: "1px solid rgba(255,255,255,0.18)" }}>View</button>
                      <button type="button" onClick={() => handleDownloadIssuerDocument(doc)} className="action-btn" style={{ padding: "6px 10px", fontSize: "12px", background: "var(--ok-weak)", color: "var(--ok)", border: "1px solid rgba(255,255,255,0.18)" }}>Download</button>
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
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 95vw)", background: "var(--surface-2)", borderRadius: "12px", border: "1px solid var(--border-strong)", padding: "18px", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", color: "var(--text)" }}>
            <h3 style={{ marginTop: 0 }}>Reject Subordinate Issuer</h3>
            <p style={{ opacity: 0.85, marginTop: "6px" }}>Please provide a rejection reason.</p>
            <form onSubmit={submitRejectSubordinate}>
              <textarea value={rejectSubordinateReason} onChange={(e) => setRejectSubordinateReason(e.target.value)} placeholder="Enter rejection reason..." rows={4} style={{ width: "100%", borderRadius: "10px", padding: "10px", marginTop: "10px", background: "var(--border)", border: "1px solid var(--border-strong)", color: "var(--text)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              {rejectSubordinateError && <div style={{ color: "var(--danger)", marginTop: "10px" }}>{rejectSubordinateError}</div>}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "14px" }}>
                <button type="button" onClick={closeRejectSubordinateModal} disabled={rejectSubordinateLoading} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "var(--text)", cursor: rejectSubordinateLoading ? "not-allowed" : "pointer", opacity: rejectSubordinateLoading ? 0.65 : 1, fontWeight: 700 }}>Cancel</button>
                <button type="submit" disabled={rejectSubordinateLoading} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.18)", background: "var(--danger-weak)", color: "var(--danger)", cursor: rejectSubordinateLoading ? "not-allowed" : "pointer", opacity: rejectSubordinateLoading ? 0.65 : 1, fontWeight: 800 }}>{rejectSubordinateLoading ? "Rejecting..." : "Confirm Reject"}</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
