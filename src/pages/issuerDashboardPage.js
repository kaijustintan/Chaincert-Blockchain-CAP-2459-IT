// issuerDashboardPage.js
/*
  FILE: issuerDashboardPage.js
  LAYMAN (Tropang Ex): Ito yung workspace ng isang issuer (paaralan/organisasyon). Dito siya gumagawa ng
  credential templates, nag-i-issue ng credential sa mga holder, nagre-revoke, tumitingin ng blockchain
  history, at nakikita ang analytics (ilang na-issue, revocation self-audit). Kung ROOT authority siya,
  may dagdag na "Subordinates" view para aprubahan/i-reject ang mga subordinate na nag-apply sa kanya.

  TECHNICAL: Role=issuer React page (AppShell/Sidebar, card-based navigation via an activeView state).
  Data via apiService (templates, issued, revocable, history, subordinates). Analytics uses the shared
  helpers (computeIssuance, computeRevocationAudit) + Donut/TrendBars/Sparkline/InterpretationBox, and
  CredentialHistory for the unified blockchain history. isSubordinate/root gating controls the
  Subordinates view. Template Public/Private visibility toggles (with confirm) live here. No verification
  proof trail (issuers have no verification endpoint — see CLAUDE.md).

  OUTLINE (activeView states):
    'home'          card grid (Create, Issue, Revoke, History, Analytics, Subordinates)
    'create'        create-template form + templates list (+ visibility toggle)
    'issue'         issue-credential step wizard + issued-credentials table
    'revoke'        revoke form + revocable-credentials list
    'history'       per-credential blockchain history (→ CredentialHistory)
    'analytics'     Issuance Performance + Revocation Self-Audit
    'subordinates'  My Subordinates + Decision Logs (ROOT authority only)
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
import { computeIssuance, computeRevocationAudit, computeHolderVerificationInsights, computeCirculationHealth, COLORS as ANALYTICS_COLORS } from "../components/analytics/analytics";
import { AppShell, Sidebar, Button, StatusPill, SpinnerBlock, Spinner, InfoHint, useEscapeClose, EmptyState } from "../components/ui";
import Pagination, { usePagination } from "../components/ui/Pagination";
import StatusLegend from "../components/ui/StatusLegend";
import CredentialHistory from "../components/analytics/CredentialHistory";
import { effectiveCredentialStatus, minIssueExpiryDate, maxIssueExpiryDate } from "../utils/credentialStatus"; // F01
// S3-a: exact + near-match name detection.
// nameSimilarity.js is the ONE file under src/utils/ that is CommonJS, because it is shared
// verbatim with the Express backend (deploy-sync.sh copies it to ~/chaincert-api/utils/). Webpack
// silently interoped `module.exports` into named ESM imports; Rollup (Vite) does not, and errors
// with "findNameMatches is not exported by nameSimilarity.js".
// Importing the default and destructuring works under both bundlers and leaves the shared file
// untouched — converting it to ESM would break `require()` on the backend.
import nameSimilarity from "../utils/nameSimilarity";
const { findNameMatches } = nameSimilarity;
import { getCredentialLineage, isSameInstance } from "../utils/credentialLineage"; // Q1
import { LayoutDashboard, FilePlus, Award, Ban, List, BarChart3, Receipt, Building2, Bell, Check, X, ChevronDown } from "lucide-react";

// Group 4.2: collapse credential-type strings case-insensitively (trim + first-seen casing
// wins) so "Academic" / "academic" / "Academic " become ONE dropdown option. The create form
// takes credentialType as free text, so variants are otherwise possible ("Double Academic").
function dedupeTypesCI(values) {
  const seen = new Map();
  for (const v of values || []) {
    const raw = String(v || "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!seen.has(key)) seen.set(key, raw);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

// Group 4.2b: curated credential-type list for the Create Template form. Replacing the old
// free-text input with this dropdown kills the accidental "Academic"/"AcademiK" variant
// proliferation the type filters/analytics suffered from. "Other…" (handled as a special
// select value, NOT part of this array) reveals a free-text input for the rare case a type
// here doesn't cover — so the common path is constrained without boxing issuers in.
const CREDENTIAL_TYPE_OPTIONS = [
  "Academic Degree",
  "Diploma",
  "Certificate",
  "Professional Certification",
  "License",
  "Award / Honor",
  "Badge / Micro-credential",
  "Training / Completion",
  "Membership",
];
const CREDENTIAL_TYPE_OTHER = "__other__";

export default function IssuerDashboard() {
  // - polo: get current issuer type to hide subordinate sections for subordinate issuers
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSubordinate = currentUser?.issuerType === "subordinate";
  const displayName = getDisplayName({ ...currentUser, role: "issuer" }, "Issuer");
  const navigate = useNavigate();

  // CSS-CHANGE: View state machine - polo
  const [activeView, setActiveView] = useState("home");

  const [credentials, setCredentials] = useState([]);
  // filteredCredentials is a useMemo (declared below) — was effect-set state, which lagged one
  // render and flashed a "no credentials" message before the rows populated on load.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    credentialType: "",
    credentialName: "",
    description: "",
    metadata: "",
    renewable: true, // D5: can holders request renewal? (default yes)
  });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  // Group 4.2b: true when "Other…" is picked in the type dropdown — reveals the custom
  // free-text input. createForm.credentialType still holds the actual value either way.
  const [typeIsOther, setTypeIsOther] = useState(false);
  const [createConfirmStep, setCreateConfirmStep] = useState(false); // Group 4.5: confirm before create

  // Skills state for create form - polo
  const [skillInput, setSkillInput] = useState("");
  const [skillsList, setSkillsList] = useState([]);

  // Badge image state for create form - polo
  const [badgeImageBase64, setBadgeImageBase64] = useState("");
  const [badgeImagePreview, setBadgeImagePreview] = useState("");
  const [badgeImageName, setBadgeImageName] = useState(""); // Group 4.3: show chosen filename

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
  const [revokeConfirmStep, setRevokeConfirmStep] = useState(false); // Group 4.5: confirm before revoke

  // R2: when the revoke modal is opened from a specific credential's row, lock the
  // holder + credential to that record (read-only) instead of showing the pickers.
  const [revokeLocked, setRevokeLocked] = useState(false);
  const [revokeLockedCred, setRevokeLockedCred] = useState(null);

  // separate state for TEMPLATE options (for dropdown)
  const [templateOptions, setTemplateOptions] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true); // UAT: gate the templates empty-state so it can't flash before the fetch resolves
  const [lineageOpen, setLineageOpen] = useState(false); // UAT: reissue Lineage table collapsed by default (declutter the history modal)

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
  const [viewAllStatusFilter, setViewAllStatusFilter] = useState("all"); // final review: View-Credentials status filter (was missing)
  const [viewAllSearch, setViewAllSearch] = useState("");
  const [viewAllSortBy, setViewAllSortBy] = useState("newest");

  // Root Authority → My Subordinates directory
  const [subordinateDirectory, setSubordinateDirectory] = useState([]);
  const [subordinateDirectoryLoading, setSubordinateDirectoryLoading] = useState(false);
  const [subordinateDirectoryError, setSubordinateDirectoryError] = useState("");
  const [subordinateDirectoryFilter, setSubordinateDirectoryFilter] = useState("all");
  const [subordinateSearch, setSubordinateSearch] = useState(""); // final review: search subordinates (was missing)
  const [renewalStatusFilter, setRenewalStatusFilter] = useState("all"); // final review: renewal queue controls (were missing)
  const [renewalSearch, setRenewalSearch] = useState("");
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

  /* Every credential lifecycle action is a DUAL WRITE: blockchain first, then the CouchDB mirror.
     When the chain write succeeds and the mirror write fails, the backend deliberately does NOT
     roll back — the ledger entry is immutable and already permanent — so it returns HTTP 200 with
     the chain result plus a `warning` field describing what did not get mirrored.

     Nothing on the frontend read that field. All three call sites below discarded the response and
     showed an unconditional green "success" toast. The practical effect: an issuer revokes a
     credential, the ledger records it permanently, the mirror write throws, the UI says "revoked
     successfully" — and the holder's wallet still shows the credential as active, with nobody
     aware the two disagree.

     This surfaces it as a warning toast instead. It does not fix the divergence (that needs a
     reconcile path, tracked separately) — it stops the divergence being invisible, which is the
     part that makes it dangerous. Longer timeout because it needs to actually be read. */
  const showResultToast = (response, successMessage) => {
    const warning = response?.data?.warning || response?.warning;
    if (warning) {
      setToast({
        show: true,
        type: "warning",
        message: `Saved to the blockchain, but the local copy did not update (${warning}). The record on-chain is correct; some screens may look out of date until this is reconciled.`
      });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 9000);
      console.warn("[DUAL-WRITE] chain write succeeded, mirror write failed:", warning);
      return;
    }
    showToast(successMessage);
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
  // C5: this issuer's Verification Reach (verifications of their OWN credentials, server-filtered)
  const [issuerVerifications, setIssuerVerifications] = useState([]);
  const [reachLoading, setReachLoading] = useState(false);
  // C17: batch revocation — checkbox/CSV selection + sequential runner state
  const [batchSelected, setBatchSelected] = useState(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchReason, setBatchReason] = useState("");
  const [batchConfirmStep, setBatchConfirmStep] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [batchResults, setBatchResults] = useState([]);
  const [batchError, setBatchError] = useState("");

  // D4: batch issuance state (mirrors batch revocation) — issue ONE credential to many holders
  const [showBatchIssueModal, setShowBatchIssueModal] = useState(false);
  const [batchIssueTemplateId, setBatchIssueTemplateId] = useState("");
  const [batchIssueExpiry, setBatchIssueExpiry] = useState("");
  const [batchIssueEligible, setBatchIssueEligible] = useState([]);
  const [batchIssueRecipients, setBatchIssueRecipients] = useState([]);
  const [batchIssueUnknown, setBatchIssueUnknown] = useState([]);
  const [batchIssueFileName, setBatchIssueFileName] = useState("");
  const [batchIssueConfirmStep, setBatchIssueConfirmStep] = useState(false);
  const [batchIssueRunning, setBatchIssueRunning] = useState(false);
  const [batchIssueDone, setBatchIssueDone] = useState(false);
  const [batchIssueProgress, setBatchIssueProgress] = useState({ done: 0, total: 0 });
  const [batchIssueResults, setBatchIssueResults] = useState([]);
  const [batchIssueError, setBatchIssueError] = useState("");
  const [renewalOpen, setRenewalOpen] = useState(false); // C11: collapse the renewal queue into a card
  // C11: renewal requests queue (holder-initiated; the issuer decides from their OWN records)
  const [renewalRequests, setRenewalRequests] = useState([]);
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [renewalDecide, setRenewalDecide] = useState(null); // { request, action } drives the decision modal
  const [renewalExpiry, setRenewalExpiry] = useState("");
  const [renewalDeclineReason, setRenewalDeclineReason] = useState("");
  const [renewalActionLoading, setRenewalActionLoading] = useState(false);
  const [renewalError, setRenewalError] = useState("");

  // -------------------------------------------------------------------
  // EFFECTS (unchanged)
  // -------------------------------------------------------------------
  useEffect(() => {
    fetchCredentials();
    fetchTemplateOptions();
    // fetchSubordinateDirectory("all") is already fired by the [subordinateDirectoryFilter] effect
    // below (default filter = "all") — don't double-fetch it here.
    // fetchIssuerVerifications is DEFERRED to the Performance view (it runs a full-ledger verification-
    // log scan that grows with every logged verification and must not block the initial credential render).
    fetchRootSubordinateLogs("all");
    fetchIssuerNotifications();
    fetchRenewalRequests();
  }, []);

  // Perf: load Verification Reach only when the Performance (analytics) view is first opened.
  // Once-guard is a ref (not state) so setting it never retriggers this effect — same class of
  // bug as the holder's viFetched self-cancelling fetch.
  const reachFetchedRef = useRef(false);
  useEffect(() => {
    if (activeView !== "analytics" || reachFetchedRef.current) return;
    reachFetchedRef.current = true;
    fetchIssuerVerifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // C11: load this issuer's renewal-request queue (scope derived server-side from the JWT).
  const fetchRenewalRequests = async () => {
    setRenewalLoading(true);
    try {
      const data = await apiService.getIssuerRenewalRequests();
      setRenewalRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (err) {
      console.error("Error fetching renewal requests:", err);
    } finally {
      setRenewalLoading(false);
    }
  };

  const openRenewalDecision = (request, action) => {
    setRenewalDecide({ request, action });
    setRenewalExpiry("");
    setRenewalDeclineReason("");
    setRenewalError("");
  };

  // C11: approve = re-issue via the EXISTING issuance flow (same chaincode + dual-write +
  // holder email as a manual issue), THEN mark the request approved with the new instance id
  // (lineage old → new lives on the request doc). Decline = mark + reason → holder notified.
  const confirmRenewalDecision = async () => {
    const { request, action } = renewalDecide || {};
    if (!request) return;
    setRenewalError("");
    if (action === "decline" && !renewalDeclineReason.trim()) {
      setRenewalError("Please give the holder a reason — they will see it.");
      return;
    }
    if (action === "approve" && !request.templateId) {
      setRenewalError("This request has no credential reference to re-issue from — issue it manually via + Issue Credential instead.");
      return;
    }
    setRenewalActionLoading(true);
    try {
      let newCredentialId = "";
      if (action === "approve") {
        // D2: stamp the new credential with the OLD credential id (renewal lineage).
        const issueRes = await apiService.Issue_Credential(request.templateId, request.holderId, renewalExpiry || null, request.credentialId);
        newCredentialId = issueRes?.credential?.id || issueRes?.credential?.credentialId || "";
      }
      await apiService.decideRenewalRequest(
        request._id,
        action,
        action === "approve"
          ? { newCredentialId, newExpiryDate: renewalExpiry || "" }
          : { declineReason: renewalDeclineReason.trim() }
      );
      showToast(action === "approve" ? "Renewal approved — a renewed credential was issued and the holder was emailed." : "Renewal declined.");
      setRenewalDecide(null);
      fetchRenewalRequests();
      if (action === "approve") fetchCredentials();
    } catch (err) {
      setRenewalError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to process the decision.");
    } finally {
      setRenewalActionLoading(false);
    }
  };

  // C5: load this issuer's Verification Reach (server derives the issuer from the JWT — no IDOR).
  const fetchIssuerVerifications = async () => {
    setReachLoading(true);
    try {
      const data = await apiService.Get_IssuerVerifications();
      setIssuerVerifications(Array.isArray(data?.verifications) ? data.verifications : []);
    } catch (err) {
      console.error("Error fetching issuer verifications:", err);
      setIssuerVerifications([]);
    } finally {
      setReachLoading(false);
    }
  };

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

  // NOTE: filteredCredentials is declared BELOW, right after applySorting — it calls applySorting
  // during render, so applySorting must be initialized first (else TDZ "cannot access before init").
  useEffect(() => { fetchSubordinateDirectory(subordinateDirectoryFilter); }, [subordinateDirectoryFilter]);

  // -------------------------------------------------------------------
  // ALL FETCH / HANDLER FUNCTIONS (unchanged — preserved exactly)
  // -------------------------------------------------------------------
  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const data = await apiService.Get_IssuedCredentials();
      setCredentials(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.response) setError(`Server error: ${err.response.status} - ${err.response.data?.message || err.message}`);
      else if (err.request) setError("No response from server. Make sure backend is running at http://localhost:4000");
      else setError(err.message);
    } finally { setLoading(false); }
  };

  const fetchTemplateOptions = async () => {
    setTemplatesLoading(true);
    try {
      const data = await apiService.Get_CredentialTemplates();
      setTemplateOptions(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Error fetching credential templates:", err); }
    finally { setTemplatesLoading(false); }
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

  // UAT: derive synchronously so there's no one-render lag (the old effect-set state flashed an
  // empty "no credentials" before the rows appeared). Declared AFTER applySorting because the
  // memo factory runs during render and calls applySorting.
  const filteredCredentials = useMemo(() => {
    let result = [...credentials];
    if (filterType !== "all") result = result.filter((cred) => String(cred.credentialType || "").toLowerCase() === String(filterType).toLowerCase());
    if (filterStatus !== "all") {
      result = result.filter((cred) => {
        // Use effective (end-of-day-Manila) status so the filter matches the row badges.
        const normalizedStatus = effectiveCredentialStatus(cred);
        if (filterStatus === "issued") return normalizedStatus === "issued" || normalizedStatus === "active";
        return normalizedStatus === filterStatus;
      });
    }
    return applySorting(result, sortBy);
  }, [credentials, sortBy, filterType, filterStatus]);

  const getUniqueCredentialTypes = () => dedupeTypesCI(credentials.map((cred) => cred.credentialType));


  // R1: only genuinely revokable credentials. Use EFFECTIVE status so a credential
  // past its end-of-day-Manila expiry (stored status still "issued") is excluded too,
  // and drop the old `!c.status` loophole. Revoked/expired never appear here.
  const searchableIssuedCredentials = useMemo(() => credentials.filter((c) => {
    const eff = effectiveCredentialStatus(c);
    return eff === "issued" || eff === "active";
  }), [credentials]);
  const issueTemplateTypeOptions = useMemo(() => dedupeTypesCI(templateOptions.map((template) => template.credentialType)), [templateOptions]);

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

  const uniqueTemplateTypes = useMemo(() => dedupeTypesCI(templateOptions.map((template) => template.credentialType)), [templateOptions]);

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

  // UX pagination (10/page) over the already-filtered/sorted lists — keeps pages short without
  // breaking the client-side search/filter/sort that spans the whole list.
  const templatesPg = usePagination(filteredTemplates, 10);
  const issuedPg = usePagination(issueTableCredentials, 10);
  const revokePg = usePagination(revokeTableCredentials, 10);

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
    // Final review: status filter (was missing on View Credentials). Uses EFFECTIVE status so it
    // matches the badges — an effectively-expired-but-not-cron-flipped credential filters as expired.
    if (viewAllStatusFilter !== "all") {
      result = result.filter((row) => {
        if (row.rowType === "template") return viewAllStatusFilter === "draft";
        const eff = effectiveCredentialStatus(row.source);
        if (viewAllStatusFilter === "issued") return eff === "issued" || eff === "active";
        return eff === viewAllStatusFilter;
      });
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
  }, [allCredentialRows, filterRecordKind, viewAllStatusFilter, viewAllTypeFilter, viewAllSearch, viewAllSortBy]);

  // UAT: pagination (10/page) for the view-all + subordinates tables.
  const allCredsPg = usePagination(filteredAllCredentialRows, 10);
  // Final review: client-side search over the (already status-filtered) subordinate directory.
  const filteredSubordinates = useMemo(() => {
    const q = subordinateSearch.trim().toLowerCase();
    if (!q) return subordinateDirectory;
    return subordinateDirectory.filter((s) =>
      [s._id, s.id, s.organizationName, s.orgName, s.email, s.category].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [subordinateDirectory, subordinateSearch]);
  const subsPg = usePagination(filteredSubordinates, 10);
  // Final review: renewal queue gained status filter + search + pagination.
  const filteredRenewalRequests = useMemo(() => {
    let rows = renewalRequests || [];
    if (renewalStatusFilter !== "all") rows = rows.filter((r) => (r.status || "pending") === renewalStatusFilter);
    const q = renewalSearch.trim().toLowerCase();
    if (q) rows = rows.filter((r) => [r.credentialName, r.credentialId, r.holderName, r.holderId].filter(Boolean).join(" ").toLowerCase().includes(q));
    return rows;
  }, [renewalRequests, renewalStatusFilter, renewalSearch]);
  const renewalPg = usePagination(filteredRenewalRequests, 10);

  const revokableCount = useMemo(
    // Effective status so the "(N revokable)" header matches the rows that actually show a
    // Revoke button — effectively-expired-but-not-cron-flipped credentials are excluded.
    () => credentials.filter((c) => {
      const eff = effectiveCredentialStatus(c);
      return eff === "issued" || eff === "active";
    }).length,
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
          ? "created credential"
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
  const closeRevokeModal = () => { setShowRevokeModal(false); setRevokeError(""); setRevokeLoading(false); setRevokeConfirmStep(false); setRevokeLocked(false); setRevokeLockedCred(null); setRevokeHolderOpen(false); setRevokeHolderSearch(""); setRevokeSelectedHolder(""); setRevokeCredentialOpen(false); setRevokeCredentialSearch(""); };
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

  // Group 4.5: validate, then open the confirmation step (no write yet).
  const handleRevokeSubmit = (e) => {
    e.preventDefault();
    setRevokeError("");
    if (!revokeForm.credentialId) { setRevokeError("Please select a credential to revoke"); return; }
    if (!revokeForm.rejectionReason.trim()) { setRevokeError("Please provide a rejection reason"); return; }
    setRevokeConfirmStep(true);
  };

  // Group 4.5: the actual revocation — invoked from the confirmation modal's Confirm button.
  const confirmRevokeCredential = async () => {
    setRevokeLoading(true); setRevokeError("");
    try {
      const revokeRes = await apiService.Revoke_Credential(revokeForm.credentialId, revokeForm.rejectionReason);
      showResultToast(revokeRes, "Credential revoked successfully!"); closeRevokeModal(); fetchCredentials();
    } catch (err) {
      setRevokeError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to revoke credential");
    } finally { setRevokeLoading(false); }
  };

  // ── C17: batch revocation ────────────────────────────────────────────────
  // The issuer's business rules produce the LIST (checkboxes or a CSV of IDs);
  // ChainCert just executes — looping the proven single-revoke endpoint per ID so
  // dual-write + notifications behave exactly like a manual revoke, N at once.

  // ids of the currently-visible revocable rows (drives the select-all checkbox)
  const revocableVisibleIds = useMemo(
    () => revokeTableCredentials
      .filter((c) => { const eff = effectiveCredentialStatus(c); return eff === "issued" || eff === "active"; })
      .map((c) => c.blockchainId || c.id),
    [revokeTableCredentials]
  );

  const toggleBatchSelect = (id) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleBatchSelectAll = () => {
    setBatchSelected((prev) => {
      const allIn = revocableVisibleIds.length > 0 && revocableVisibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allIn) revocableVisibleIds.forEach((id) => next.delete(id));
      else revocableVisibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // CSV import → selects matching revocable credentials (one credential ID per line/comma).
  // Unknown / already-revoked / expired IDs are reported and skipped — pre-validated client-side
  // so we never waste a chaincode call on an ID that would fail anyway.
  const handleBatchCsvImport = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const tokens = String(reader.result || "")
        .split(/[\r\n,;]+/)
        .map((t) => t.trim().replace(/^"|"$/g, ""))
        .filter((t) => t && !["credentialid", "credential id", "id", "blockchainid"].includes(t.toLowerCase()));
      if (tokens.length === 0) { showToast("No credential IDs found in that file.", "danger"); return; }

      const byId = new Map();
      credentials.forEach((c) => {
        [c.blockchainId, c.id, c._id].filter(Boolean).forEach((k) => byId.set(String(k).toLowerCase(), c));
      });

      // Count SYNCHRONOUSLY (outside the setState updater) so the toast reports the real numbers —
      // the old code read the counters before React ran the updater, so it always said "0 selected".
      let matched = 0, notRevocable = 0, unknown = 0;
      const toAdd = [];
      tokens.forEach((t) => {
        const cred = byId.get(t.toLowerCase());
        if (!cred) { unknown++; return; }
        const eff = effectiveCredentialStatus(cred);
        if (eff !== "issued" && eff !== "active") { notRevocable++; return; }
        toAdd.push(cred.blockchainId || cred.id);
        matched++;
      });
      setBatchSelected((prev) => {
        const next = new Set(prev);
        toAdd.forEach((id) => next.add(id));
        return next;
      });

      const parts = [`${matched} selected`];
      if (notRevocable) parts.push(`${notRevocable} skipped (already revoked/expired)`);
      if (unknown) parts.push(`${unknown} not found in your issued credentials`);
      showToast(`Import: ${parts.join(", ")}.`, matched > 0 ? "success" : "danger");
    };
    reader.readAsText(file);
  };

  const openBatchRevokeModal = () => {
    if (batchSelected.size === 0) { showToast("Select credentials first (checkboxes or CSV import).", "danger"); return; }
    setBatchReason(""); setBatchError(""); setBatchConfirmStep(false);
    setBatchDone(false); setBatchResults([]); setBatchProgress({ done: 0, total: 0 });
    setShowBatchModal(true);
  };

  const closeBatchRevokeModal = () => {
    if (batchRunning) return; // never close mid-run — revocations are in flight
    setShowBatchModal(false); setBatchConfirmStep(false); setBatchError("");
    if (batchDone) { setBatchSelected(new Set()); setBatchDone(false); setBatchResults([]); }
  };

  const handleBatchSubmit = () => {
    setBatchError("");
    if (!batchReason.trim()) { setBatchError("Please provide a revocation reason — it applies to every selected credential."); return; }
    setBatchConfirmStep(true);
  };

  const runBatchRevoke = async () => {
    const ids = [...batchSelected];
    const reason = batchReason.trim();
    setBatchRunning(true); setBatchDone(false); setBatchError("");
    setBatchResults([]); setBatchProgress({ done: 0, total: ids.length });
    const results = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const cred = credentials.find((c) => (c.blockchainId || c.id) === id);
      try {
        // Sequential on purpose: each revoke is its own chaincode invoke (blockchain is slow);
        // one-at-a-time keeps the progress honest and avoids parallel gateway churn.
        // eslint-disable-next-line no-await-in-loop
        await apiService.Revoke_Credential(id, reason);
        results.push({ id, name: cred?.credentialName || id, holder: cred?.holderName || "", success: true });
      } catch (err) {
        results.push({
          id, name: cred?.credentialName || id, holder: cred?.holderName || "", success: false,
          error: err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed",
        });
      }
      setBatchResults([...results]);
      setBatchProgress({ done: i + 1, total: ids.length });
    }
    setBatchRunning(false); setBatchDone(true);
    fetchCredentials(); // refresh statuses (table + circulation + self-audit all recompute)
  };

  // ── D4: batch issuance — issue ONE credential to many holders in one pass ──────
  const openBatchIssueModal = async () => {
    try {
      const result = await apiService.Check_IssuerHasTemplates();
      if (!result?.hasTemplates) { setNoTemplateError("No credentials yet to issue. Please create a credential first."); return; }
    } catch (_) { /* non-fatal — the credential dropdown will just be empty */ }
    setBatchIssueTemplateId(""); setBatchIssueExpiry(""); setBatchIssueEligible([]);
    setBatchIssueRecipients([]); setBatchIssueUnknown([]); setBatchIssueFileName("");
    setBatchIssueConfirmStep(false); setBatchIssueDone(false); setBatchIssueResults([]);
    setBatchIssueProgress({ done: 0, total: 0 }); setBatchIssueError("");
    setShowBatchIssueModal(true);
  };

  const closeBatchIssueModal = () => {
    if (batchIssueRunning) return; // never close mid-run — issuances are in flight
    setShowBatchIssueModal(false); setBatchIssueConfirmStep(false); setBatchIssueError("");
    if (batchIssueDone) { setBatchIssueDone(false); setBatchIssueResults([]); setBatchIssueRecipients([]); }
  };

  // Pick the credential → load the holders eligible to receive it (same source as single issue).
  const handleBatchIssueTemplateChange = async (e) => {
    const value = e.target.value;
    setBatchIssueTemplateId(value);
    setBatchIssueRecipients([]); setBatchIssueUnknown([]); setBatchIssueFileName(""); setBatchIssueError("");
    if (!value) { setBatchIssueEligible([]); return; }
    try {
      const result = await apiService.Get_EligibleUsersForTemplate(value);
      const list = result?.eligibleUsers || [];
      setBatchIssueEligible(Array.isArray(list) ? list : []);
    } catch (err) { setBatchIssueEligible([]); setBatchIssueError("Failed to load eligible recipients for this credential."); }
  };

  // Import a CSV/TXT of holder emails or IDs → match against the eligible list.
  const handleBatchIssueCsv = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!batchIssueTemplateId) { showToast("Pick a credential first, then import recipients.", "danger"); return; }
    setBatchIssueFileName(file.name); setBatchIssueError("");
    const reader = new FileReader();
    reader.onload = () => {
      const tokens = String(reader.result || "")
        .split(/[\r\n,;]+/)
        .map((t) => t.trim().replace(/^"|"$/g, ""))
        .filter((t) => t && !["email", "holder", "holderid", "id", "recipient"].includes(t.toLowerCase()));
      if (tokens.length === 0) { setBatchIssueError("No recipient emails or IDs found in that file."); return; }

      const byKey = new Map();
      batchIssueEligible.forEach((u) => {
        [u._id, u.id, u.email, u.username].filter(Boolean).forEach((k) => byKey.set(String(k).toLowerCase(), u));
      });
      const recipients = [];
      const unknown = [];
      const seen = new Set();
      tokens.forEach((t) => {
        const u = byKey.get(t.toLowerCase());
        if (!u) { unknown.push(t); return; }
        const rid = u._id || u.id;
        if (!rid || seen.has(rid)) return;
        seen.add(rid);
        recipients.push({ id: rid, label: u.name || u.fullName || u.username || u.email || String(rid) });
      });
      setBatchIssueRecipients(recipients);
      setBatchIssueUnknown(unknown);
      const parts = [`${recipients.length} recipient(s) matched`];
      if (unknown.length) parts.push(`${unknown.length} not eligible / not found`);
      showToast(`Import: ${parts.join(", ")}.`, recipients.length > 0 ? "success" : "danger");
    };
    reader.readAsText(file);
  };

  const handleBatchIssueSubmit = () => {
    setBatchIssueError("");
    if (!batchIssueTemplateId) { setBatchIssueError("Select a credential to issue."); return; }
    if (batchIssueRecipients.length === 0) { setBatchIssueError("Import a .csv / .txt of recipient emails or IDs first."); return; }
    setBatchIssueConfirmStep(true);
  };

  const runBatchIssue = async () => {
    const templateId = batchIssueTemplateId;
    const expiry = batchIssueExpiry || "";
    const recipients = [...batchIssueRecipients];
    setBatchIssueRunning(true); setBatchIssueDone(false); setBatchIssueError("");
    setBatchIssueResults([]); setBatchIssueProgress({ done: 0, total: recipients.length });
    const results = [];
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      try {
        // Sequential on purpose: each issuance is its own chaincode invoke (same as single issue).
        // eslint-disable-next-line no-await-in-loop
        await apiService.Issue_Credential(templateId, r.id, expiry);
        results.push({ id: r.id, label: r.label, success: true });
      } catch (err) {
        results.push({ id: r.id, label: r.label, success: false, error: err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed" });
      }
      setBatchIssueResults([...results]);
      setBatchIssueProgress({ done: i + 1, total: recipients.length });
    }
    setBatchIssueRunning(false); setBatchIssueDone(true);
    fetchCredentials();
  };

  // Skills handlers - polo
  const handleAddSkill = () => { const trimmed = skillInput.trim(); if (!trimmed) return; if (skillsList.includes(trimmed)) { showToast('Skill already added.', 'danger'); return; } setSkillsList(prev => [...prev, trimmed]); setSkillInput(""); };
  const handleRemoveSkill = (skillToRemove) => { setSkillsList(prev => prev.filter(s => s !== skillToRemove)); };

  // Badge image handler - polo
  const handleBadgeImageChange = (e) => { const file = e.target.files?.[0]; if (!file) return; setBadgeImageName(file.name); const reader = new FileReader(); reader.onloadend = () => { setBadgeImageBase64(reader.result); setBadgeImagePreview(reader.result); }; reader.readAsDataURL(file); };

  const openCreateModal = () => { setShowCreateModal(true); setCreateError(""); setCreateConfirmStep(false); setTypeIsOther(false); setCreateForm({ credentialType: "", credentialName: "", description: "", metadata: "", renewable: true }); setSkillsList([]); setSkillInput(""); setBadgeImageBase64(""); setBadgeImagePreview(""); setBadgeImageName(""); };
  const closeCreateModal = () => { setShowCreateModal(false); setCreateError(""); setCreateLoading(false); setCreateConfirmStep(false); setTypeIsOther(false); setSkillsList([]); setSkillInput(""); setBadgeImageBase64(""); setBadgeImagePreview(""); setBadgeImageName(""); };
  const handleCreateFormChange = (e) => { const { name, value } = e.target; setCreateForm((prev) => ({ ...prev, [name]: value })); };
  // Group 4.2b: type dropdown change. Picking "Other…" flips to custom-text mode and clears the
  // value so the issuer types fresh; picking a preset stores it directly and exits Other mode.
  const handleCreateTypeSelect = (e) => {
    const value = e.target.value;
    if (value === CREDENTIAL_TYPE_OTHER) {
      setTypeIsOther(true);
      setCreateForm((prev) => ({ ...prev, credentialType: "" }));
    } else {
      setTypeIsOther(false);
      setCreateForm((prev) => ({ ...prev, credentialType: value }));
    }
  };

  // Batch A (I-04) + defense revision S3-a: live name check against the issuer's own
  // ACTIVE templates in memory. Now two-tier via utils/nameSimilarity: exact (normalized
  // equality, catches punctuation/spacing variants — BLOCKS) and similar (truncation/
  // abbreviation pattern like "Python Cert" vs "Python Certificate" — WARNS, creatable
  // via the existing confirm step). Advisory only; the backend 409s remain the hard guard.
  const nameClash = useMemo(() => {
    const wanted = String(createForm.credentialName || "").trim();
    if (!wanted) return { exact: [], similar: [] };
    const activeNames = (Array.isArray(templateOptions) ? templateOptions : [])
      .filter((t) => {
        const s = String(t?.status || "").toLowerCase();
        return s !== "revoked" && s !== "disabled" && s !== "inactive" && s !== "archived";
      })
      .map((t) => String(t?.credentialName || "").trim())
      .filter(Boolean);
    return findNameMatches(wanted, activeNames);
  }, [templateOptions, createForm.credentialName]);

  /* Defense revision S3-c (UAT 5.2): one-click skill suggestions in the create modal,
     drawn from THIS issuer's OWN past credentials and filtered by the selected
     credential type (falls back to all of the issuer's skills while the type has no
     history yet). Deliberately self-scoped: no cross-issuer vocabulary, no new
     endpoint — computed from templateOptions already in memory. Free-text stays
     untouched; chips are shortcuts, not a restriction. */
  const skillSuggestions = useMemo(() => {
    if (!showCreateModal) return [];
    const selType = String(createForm.credentialType || "").trim().toLowerCase();
    const added = new Set(skillsList.map((s) => String(s).trim().toLowerCase()));
    const byNorm = new Map(); // normalized skill -> { display, count, typeMatch }
    for (const t of (Array.isArray(templateOptions) ? templateOptions : [])) {
      const tType = String(t?.credentialType || "").trim().toLowerCase();
      for (const raw of (Array.isArray(t?.skills) ? t.skills : [])) {
        const display = String(raw || "").trim();
        if (!display) continue;
        const norm = display.toLowerCase();
        if (added.has(norm)) continue;
        const e = byNorm.get(norm) || { display, count: 0, typeMatch: false };
        e.count += 1;
        if (selType && tType === selType) e.typeMatch = true;
        byNorm.set(norm, e);
      }
    }
    const all = [...byNorm.values()];
    const pool = selType && all.some((e) => e.typeMatch) ? all.filter((e) => e.typeMatch) : all;
    return pool
      .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display))
      .slice(0, 8)
      .map((e) => e.display);
  }, [showCreateModal, templateOptions, createForm.credentialType, skillsList]);

  // Group 4.5: validate + normalize the type, then open the confirmation step (no write yet).
  const handleCreateCredential = (e) => {
    e.preventDefault();
    setCreateError("");
    const type = createForm.credentialType.trim();
    const name = createForm.credentialName.trim();
    if (!type || !name) { setCreateError("Please fill in Credential Type and Name"); return; }
    if (nameClash.exact.length > 0) { setCreateError("You already have an active credential with this name. Please choose a different name."); return; }
    // Near-matches do NOT block — the warning is visible on the name field and repeated in
    // the confirm step; proceeding through Confirm is the explicit "create anyway".
    setCreateConfirmStep(true);
  };

  // Group 4.5: the actual template creation — invoked from the confirmation modal's Confirm button.
  const confirmCreateCredential = async () => {
    setCreateLoading(true); setCreateError("");
    try {
      // NOTE: no client-side id is generated here any more. The previous line built a
      // `cred_<timestamp>_<random>` id and passed it as `id`, but Create_CredentialTemplate's POST
      // body does not include that field and the server mints its own id regardless — so the value
      // was computed, sent nowhere, and only served to imply that the client chooses ledger keys.
      // confirmSimilar: user has seen the near-match warning and clicked Confirm. Direct API
      // callers without this flag still get the backend's SIMILAR_NAME 409.
      const createRes = await apiService.Create_CredentialTemplate({ credentialType: createForm.credentialType.trim(), credentialName: createForm.credentialName.trim(), description: createForm.description, metadata: createForm.metadata, renewable: createForm.renewable !== false, skills: skillsList, badgeImage: badgeImageBase64, visibility: 'private', confirmSimilar: nameClash.similar.length > 0 });
      showResultToast(createRes, "Credential created successfully!"); closeCreateModal(); fetchCredentials(); fetchTemplateOptions();
    } catch (err) {
      // Keep the confirm modal open and surface the server message (e.g. duplicate-name 409).
      setCreateError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to create credential");
    } finally { setCreateLoading(false); }
  };

  // Issue Modal handlers
  const openIssueModal = async () => {
    try {
      setIssueError(""); setNoTemplateError("");
      const result = await apiService.Check_IssuerHasTemplates();
      if (!result?.hasTemplates) { setNoTemplateError("No credentials yet to issue. Please create a credential first."); return; }
      setIssueTemplateSearch("");
      setIssueRecipientSearch("");
      setIssueTemplateOpen(false);
      setIssueRecipientOpen(false);
      setAvailableUsers([]);
      setShowIssueModal(true); setIssueForm({ credentialId: "", recipientId: "", expiryDate: "" });
    } catch (err) { setNoTemplateError("Failed to validate credentials. Please try again."); }
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
      } catch (err) { setAvailableUsers([]); setIssueError("Failed to load eligible users for this credential."); }
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
    } catch (err) { setAvailableUsers([]); setIssueError("Failed to load eligible users for this credential."); }
  };

  const handleSelectRecipient = (user) => {
    const value = user._id || user.id;
    setIssueForm((prev) => ({ ...prev, recipientId: value }));
    setIssueRecipientSearch(user.name || user.fullName || user.username || user.email || "");
    setIssueRecipientOpen(false);
  };


  // C2: confirm before flipping a template's visibility (styled modal, not window.confirm)
  const [pendingVisibilityTemplate, setPendingVisibilityTemplate] = useState(null);

  // U-4: Escape closes the topmost open modal. Order = stacking priority (confirm
  // overlays before their parents). Each close mirrors that modal's own Cancel/✕,
  // including its in-flight guards — Escape can never do more than a click could.
  // Placed BELOW every referenced const (TDZ: a hook-call expression that reads a
  // later `const` crashes at runtime even though the build compiles — see the
  // filteredCredentials lesson in the final-review batch).
  useEscapeClose([
    [!!descriptionModal, () => setDescriptionModal(null)],
    [showCreateModal && createConfirmStep, () => { if (!createLoading) { setCreateConfirmStep(false); setCreateError(""); } }],
    [showIssueModal && issueConfirmStep, () => { if (!issueLoading) { setIssueConfirmStep(false); setIssueError(""); } }],
    [showRevokeModal && revokeConfirmStep, () => { if (!revokeLoading) { setRevokeConfirmStep(false); setRevokeError(""); } }],
    [!!renewalDecide, () => { if (!renewalActionLoading) setRenewalDecide(null); }],
    [!!pendingVisibilityTemplate, () => setPendingVisibilityTemplate(null)],
    [showCreateModal, closeCreateModal],
    [showIssueModal, closeIssueModal],
    [showRevokeModal, closeRevokeModal],
    [showBatchModal, closeBatchRevokeModal],           // self-guards on batchRunning
    [showBatchIssueModal, closeBatchIssueModal],       // self-guards on batchIssueRunning
    [subHistoryOpen, closeSubordinateHistory],
    [historyOpen, closeHistory],
    [showIssuerDocumentsModal, closeIssuerDocumentsModal],
    [showRejectSubordinateModal, closeRejectSubordinateModal], // self-guards on rejectSubordinateLoading
  ]);

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
      showToast(`Credential is now ${newVisibility}.`);
    } catch (err) {
      console.error("[ISSUER DASHBOARD] Failed to update template visibility:", err);
      showToast(err.response?.data?.message || "Failed to update credential visibility.", "danger");
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
      const issueRes = await apiService.Issue_Credential(issueForm.credentialId, issueForm.recipientId, issueForm.expiryDate);
      showResultToast(issueRes, "Credential issued — a notification email was sent to the holder.");
      closeIssueModal();
      fetchCredentials();
    } catch (err) {
      // Was `err?.message` only, which rendered axios's "Request failed with status code 409"
      // instead of the server's actual reason (cross-issuer block, duplicate holder, bad template).
      // Matches the fallback chain every sibling handler in this file already uses.
      setIssueError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to issue credential");
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
  // C5 Verification Reach + C14 (revoked/expired copies still being checked) — reuses the holder
  // insights helper on THIS issuer's verification logs (verifications of their own credentials).
  const reach = useMemo(() => computeHolderVerificationInsights(issuerVerifications), [issuerVerifications]);
  const reachStale = useMemo(() => (reach.alerts || []).filter((a) => a.outcome === "revoked" || a.outcome === "expired"), [reach]);
  // C13: circulation health — active/expiring/expired/revoked share of everything this issuer issued
  const circulation = useMemo(() => computeCirculationHealth(credentials), [credentials]);
  // C14: resolve the OWNER of a credential still being checked — the issuer's own issued-credential
  // list already carries holderName, so this is a pure frontend join (no backend change needed).
  const credOwnerById = useMemo(() => {
    const m = new Map();
    credentials.forEach((c) => {
      [c.blockchainId, c.id, c._id].filter(Boolean).forEach((k) => m.set(String(k), c));
    });
    return m;
  }, [credentials]);

  // -------------------------------------------------------------------
  // LOADING / ERROR STATES
  // -------------------------------------------------------------------
  if (loading) return <div className="issuer-dashboard"><SpinnerBlock label="Loading…" minHeight={240} /></div>;
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
    { key: "create", label: "Credentials", icon: FilePlus },
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
              { num: templateOptions.length, label: "Credentials", view: "create" },
              { num: credentials.length, label: "Total issued", view: "issue" },
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
            <Button icon={FilePlus} onClick={() => openDashboardView("create")}>Create credential</Button>
            <Button variant="secondary" icon={Award} onClick={() => openDashboardView("issue")}>Issue credential</Button>
          </div>
        </>
      )}

      {/* ============================================================
          CREATE VIEW — Form + Templates Table
          ============================================================ */}
      {activeView === "create" && (
        <>
          <h2>Create Credential</h2>

          <div style={{ margin: "20px 0" }}>
            <button onClick={openCreateModal} className="action-btn create-btn">+ Create New Credential</button>
          </div>

          {/* Templates table */}
          <div className="table-container">
            <h3 style={{ marginBottom: 12 }}>Your Credentials ({filteredTemplates.length})</h3>
            <div className="filter-row">
              <div className="filter-group"><label>Search:</label><input value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} placeholder="Search credentials…" className="filter-select" /></div>
              <div className="filter-group"><label>Type:</label><select value={templateTypeFilter} onChange={(e) => setTemplateTypeFilter(e.target.value)} className="filter-select"><option value="all">All Types</option>{uniqueTemplateTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className="filter-group"><label>Sort by:</label><select value={templateSortBy} onChange={(e) => setTemplateSortBy(e.target.value)} className="filter-select"><option value="newest">Most Recent</option><option value="oldest">Oldest First</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option></select></div>
            </div>
            {templatesLoading ? (
              <SpinnerBlock label="Loading credentials…" minHeight={160} />
            ) : filteredTemplates.length === 0 ? (
              <div className="no-results"><p>{templateOptions.length === 0 ? "No credentials found. Create your first credential." : "No credentials match your filters."}</p></div>
            ) : (
              <table className="template-table">
                <thead><tr><th>Name</th><th>Type</th><th>Credential ID</th><th>Description</th><th>Skills</th><th>Visibility</th><th>Created Date</th></tr></thead>
                <tbody>
                  {templatesPg.pageItems.map((template) => {
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
          <Pagination {...templatesPg} />
        </>
      )}

      {/* ============================================================
          ISSUE VIEW — Issue Form + Issued Credentials Table
          ============================================================ */}
      {activeView === "issue" && (
        <>
          <h2>Issue Credentials</h2>

          <div style={{ margin: "20px 0" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={openIssueModal} className="action-btn issue-btn">+ Issue Credential</button>
              <span style={{ opacity: 0.45, alignSelf: "center" }}>— or batch —</span>
              {/* D4: issue ONE credential to many holders from a CSV/TXT of emails or IDs */}
              <button onClick={openBatchIssueModal} className="action-btn issue-btn">Batch issue from list</button>
            </div>
            {noTemplateError && <div className="no-template-warning">{noTemplateError}</div>}
          </div>

          {/* C11: Renewal Requests — collapsed into a card; click the header to expand the queue
              (keeps the Issue view clean instead of a long list pinned at the top). */}
          {(() => {
            const pendingCount = renewalRequests.filter((r) => r.status === "pending").length;
            return (
              <div className="analytics-card" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setRenewalOpen((o) => !o)}
                  aria-expanded={renewalOpen}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "var(--text)" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "1.02rem", fontWeight: 700 }}>Renewal Requests</span>
                    {pendingCount > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-strong)", background: "rgba(124,92,252,0.14)", borderRadius: 999, padding: "2px 10px" }}>{pendingCount} pending</span>
                    )}
                    <InfoHint text="Holders asking to re-issue an expiring credential. Approving re-issues the same credential with a new expiry — check your own records first; ChainCert routes the request, it doesn't verify requalification." />
                  </span>
                  <span style={{ display: "inline-flex", color: "var(--text-muted)", transform: renewalOpen ? "rotate(180deg)" : "none", transition: "transform .2s ease", flexShrink: 0 }} aria-hidden="true"><ChevronDown size={16} /></span>
                </button>
                {renewalOpen && (
                  <div style={{ padding: "0 18px 16px" }}>
                    {renewalLoading ? (
                      <SpinnerBlock label="Loading renewal requests…" minHeight={60} />
                    ) : renewalRequests.length === 0 ? (
                      <div className="no-results"><p>No renewal requests yet. When a holder taps "Request renewal," it appears here.</p></div>
                    ) : (
                      <>
                      <div className="filter-row" style={{ marginBottom: 12 }}>
                        <div className="filter-group">
                          <label htmlFor="renewalStatusFilter">Status:</label>
                          <select id="renewalStatusFilter" value={renewalStatusFilter} onChange={(e) => setRenewalStatusFilter(e.target.value)} className="filter-select">
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="declined">Declined</option>
                          </select>
                        </div>
                        <div className="filter-group">
                          <label htmlFor="renewalSearch">Search:</label>
                          <input id="renewalSearch" type="text" value={renewalSearch} onChange={(e) => setRenewalSearch(e.target.value)} placeholder="Credential / holder…" className="filter-select" />
                        </div>
                      </div>
                      {filteredRenewalRequests.length === 0 ? (
                        <EmptyState title="No renewal requests match your filter" />
                      ) : (
                      <div className="analytics-flag-list">
                        {renewalPg.pageItems.map((r) => (
                          <div className="analytics-flag-row" key={r._id}>
                            <div>
                              <div className="analytics-flag-issuer">{r.credentialName || r.credentialId}</div>
                              <div className="analytics-flag-reason">
                                {r.holderName || r.holderId}
                                {r.requestedAt ? ` • requested ${new Date(r.requestedAt).toLocaleDateString()}` : ""}
                                {r.status === "declined" && r.declineReason ? ` • declined: ${r.declineReason}` : ""}
                                {r.status === "approved" ? ` • renewed${r.newExpiryDate ? ` until ${new Date(r.newExpiryDate).toLocaleDateString()}` : ""}` : ""}
                              </div>
                            </div>
                            {r.status === "pending" ? (
                              <div style={{ display: "flex", gap: 8 }}>
                                <button type="button" className="action-btn" onClick={() => openRenewalDecision(r, "approve")}>Approve</button>
                                <button type="button" className="action-btn btn-cancel" onClick={() => openRenewalDecision(r, "decline")}>Decline</button>
                              </div>
                            ) : (
                              <span className={`status-badge status-${r.status === "approved" ? "issued" : "revoked"}`}>{r.status}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      )}
                      <Pagination {...renewalPg} />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

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
            <div className="filter-row"><div className="filter-group"><label htmlFor="issueSearch">Search:</label><input id="issueSearch" value={issueSearch} onChange={(e) => setIssueSearch(e.target.value)} placeholder="Search by credential, holder, or ID…" className="filter-select" /></div></div><div className="results-info">Showing <strong>{issueTableCredentials.length}</strong> of <strong>{credentials.length}</strong> credentials</div>
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
              <table className="template-table has-sticky-actions">
                <thead><tr><th>Credential ID</th><th>Holder Name</th><th>Credential Name</th><th>Type</th><th>Created Date</th><th>Status</th><th>Visibility</th><th>Revoked Date</th><th>Expiry Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {issuedPg.pageItems.map((credential) => {
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
          <Pagination {...issuedPg} />
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
              { label: "Draft", color: "var(--info)", meaning: "a credential created but not yet issued to anyone" },
            ]}
          />
          <div className="table-container">
            <div className="filter-row">
              <div className="filter-group"><label>Record Kind:</label><select value={filterRecordKind} onChange={(e) => setFilterRecordKind(e.target.value)} className="filter-select"><option value="all">All</option><option value="templates">Credentials</option><option value="issued">Issued Credentials</option></select></div><div className="filter-group"><label>Status:</label><select value={viewAllStatusFilter} onChange={(e) => setViewAllStatusFilter(e.target.value)} className="filter-select"><option value="all">All Statuses</option><option value="issued">Issued / Active</option><option value="expired">Expired</option><option value="revoked">Revoked</option><option value="draft">Draft</option></select></div><div className="filter-group"><label>Type:</label><select value={viewAllTypeFilter} onChange={(e) => setViewAllTypeFilter(e.target.value)} className="filter-select"><option value="all">All Types</option>{getUniqueCredentialTypes().map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className="filter-group"><label>Search:</label><input value={viewAllSearch} onChange={(e) => setViewAllSearch(e.target.value)} placeholder="Search credentials…" className="filter-select" /></div>
              <div className="filter-group"><label>Sort by:</label><select value={viewAllSortBy} onChange={(e) => setViewAllSortBy(e.target.value)} className="filter-select"><option value="newest">Most Recent</option><option value="oldest">Oldest First</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option></select></div>
            </div>
            {filteredAllCredentialRows.length === 0 ? (
              <EmptyState title="No credentials match your filters" />
            ) : (
              <table className="template-table has-sticky-actions">
                <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Holder Name</th><th>Visibility</th><th>Created Date</th><th>Expiry Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {allCredsPg.pageItems.map((row, index) => (
                    <tr key={`${row.rowType}-${row.source?.id || row.source?._id || row.source?.blockchainId || index}`}>
                      <td>{row.name}</td>
                      <td>{row.type}</td>
                      <td>{(() => { const eff = row.rowType === "template" ? (row.status || row.rowType) : effectiveCredentialStatus(row); return <span className={`status-badge status-${String(eff).toLowerCase()}`} style={{ color: getStatusColor(eff), borderColor: `${getStatusColor(eff)}55` }}>{eff === "template" ? "Draft" : eff}</span>; })()}</td>
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
            <Pagination {...allCredsPg} />
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

          {/* B3: clear hierarchy — single revoke, then the batch group (select rows / import IDs),
              with the ID-format hint visible up front instead of discovered by trial and error. */}
          <div style={{ margin: "20px 0" }}>
            <div className="revoke-action-row" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={openRevokeModal} className="action-btn revoke-btn">Revoke a credential</button>
              <span style={{ opacity: 0.45, alignSelf: "center" }}>— or batch —</span>
              <button
                onClick={openBatchRevokeModal}
                className="action-btn revoke-btn"
                disabled={batchSelected.size === 0}
                style={batchSelected.size === 0 ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
              >
                Revoke selected ({batchSelected.size})
              </button>
              {batchSelected.size > 0 && (
                <button type="button" className="action-btn btn-cancel" onClick={() => setBatchSelected(new Set())}>Clear</button>
              )}
              {/* 4.4: was pushed to the far right by margin-left:auto, leaving a big gap — keep it
                  inline with the action cluster so the row reads as one tight group. */}
              <label className="action-btn" style={{ cursor: "pointer" }}>
                Import .csv / .txt of IDs
                <input type="file" accept=".csv,.txt" onChange={handleBatchCsvImport} style={{ display: "none" }} />
              </label>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
              <strong>Batch revoke:</strong> tick the credentials in the table below, or import a{" "}
              <strong>.csv / .txt</strong> of credential IDs (one per line, or comma-separated). Only
              issued/active credentials can be selected.
            </p>
          </div>

          {/* Revokable credentials list */}
          <div className="table-container">
            <h3 style={{ marginBottom: 12 }}>Issued Credentials ({revokableCount} revokable)</h3>
            <div className="filter-row">
              <div className="filter-group"><label>Status:</label><select value={revokeStatusFilter} onChange={(e) => setRevokeStatusFilter(e.target.value)} className="filter-select"><option value="all">All Status</option><option value="issued">Issued</option><option value="revoked">Revoked</option><option value="expired">Expired</option></select></div>
              <div className="filter-group"><label>Type:</label><select value={revokeTypeFilter} onChange={(e) => setRevokeTypeFilter(e.target.value)} className="filter-select"><option value="all">All Types</option>{getUniqueCredentialTypes().map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className="filter-group"><label>Search:</label><input value={revokeSectionSearch} onChange={(e) => setRevokeSectionSearch(e.target.value)} placeholder="Search by credential, holder, or ID…" className="filter-select" /></div>
              <div className="filter-group"><label>Sort by:</label><select value={revokeSortBy} onChange={(e) => setRevokeSortBy(e.target.value)} className="filter-select"><option value="newest">Most Recent</option><option value="oldest">Oldest First</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option><option value="status-asc">Status A-Z</option></select></div>
            </div>
            {revokeTableCredentials.length === 0 ? (
              <div className="no-results"><p>{credentials.length === 0 ? "No issued credentials found." : "No credentials match your filters."}</p></div>
            ) : (
              <table className="template-table has-sticky-actions">
                <thead><tr><th style={{ width: 34 }}><input type="checkbox" aria-label="Select all revocable credentials" checked={revocableVisibleIds.length > 0 && revocableVisibleIds.every((id) => batchSelected.has(id))} disabled={revocableVisibleIds.length === 0} onChange={toggleBatchSelectAll} /></th><th>Credential ID</th><th>Name</th><th>Holder</th><th>Type</th><th>Status</th><th>Issued Date</th><th>Revoked Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {revokePg.pageItems.map((credential) => {
                    const blockchainId = credential.blockchainId || credential.id;
                    return (
                      <tr key={blockchainId}>
                        <td>
                          {(() => {
                            const eff = effectiveCredentialStatus(credential);
                            const revocable = eff === "issued" || eff === "active";
                            return (
                              <input
                                type="checkbox"
                                aria-label={`Select ${credential.credentialName || blockchainId}`}
                                checked={batchSelected.has(blockchainId)}
                                disabled={!revocable}
                                onChange={() => toggleBatchSelect(blockchainId)}
                              />
                            );
                          })()}
                        </td>
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
          <Pagination {...revokePg} />
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
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  value={subordinateSearch}
                  onChange={(e) => setSubordinateSearch(e.target.value)}
                  placeholder="Search org / email / ID…"
                  aria-label="Search subordinates"
                  className="filter-select"
                  style={{ flex: "0 1 220px" }}
                />
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
            : filteredSubordinates.length === 0 ? <EmptyState title="No subordinate issuers found" message="Try a different filter." />
            : (
              <table className="template-table subordinate-table has-sticky-actions">
                <thead><tr><th>Issuer ID</th><th>Org Name</th><th>Email</th><th>Category</th><th>Root Approval</th><th>Admin Approval</th><th>Overall Status</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {subsPg.pageItems.map((issuer) => {
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
            <Pagination {...subsPg} />
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
          {/* C5: Verification Reach — reframed as a usage/trust signal (not a decision tool);
              lead with the actionable C14 signal (outdated copies circulating + the owner to contact). */}
          <h2 style={{ display: "flex", alignItems: "center" }}>Verification Reach<InfoHint text="How often outside parties check the credentials you've issued — proof that what you issue is relied upon. A usage & trust signal, not a decision tool." /></h2>
          {reachLoading ? (
            <SpinnerBlock label="Loading verification activity…" minHeight={100} />
          ) : reach.totalChecks === 0 ? (
            <div className="analytics-card" style={{ marginTop: 12 }}>
              <div className="analytics-chart-empty" style={{ height: 100 }}>
                None of your credentials have been verified yet. When an employer or third party checks one, it's recorded on the blockchain and counted here.
              </div>
            </div>
          ) : (
            <>
              <div className="issuer-stats-row" style={{ marginTop: 16 }}>
                {/* Lead with trust (distinct verifiers + valid rate); the raw total is demoted to last. */}
                <div className="issuer-stat-card">
                  <span className="issuer-stat-num">{reach.distinctVerifiers}</span>
                  <span className="issuer-stat-label">Distinct verifiers</span>
                </div>
                <div className="issuer-stat-card">
                  <span className="issuer-stat-num" style={{ color: reach.allValid ? "var(--ok)" : "var(--warn)" }}>{reach.validCount}/{reach.totalChecks}</span>
                  <span className="issuer-stat-label">Returned valid</span>
                </div>
                <div className="issuer-stat-card">
                  <span className="issuer-stat-num">{reach.totalChecks}</span>
                  <span className="issuer-stat-label">Total checks</span>
                </div>
              </div>

              {/* C14 FIRST — the one actionable signal: an outdated copy is circulating; show the owner to contact. */}
              {reachStale.length > 0 && (
                <div className="analytics-card" style={{ marginTop: 18 }}>
                  <h3>Revoked / expired credentials still being checked</h3>
                  <p className="analytics-card-sub">{reachStale.length} check(s) hit a revoked or expired credential — an outdated copy may still be circulating. Contact the owner to confirm.</p>
                  <div className="analytics-flag-list">
                    {reachStale.slice(0, 6).map((a, i) => {
                      const owner = credOwnerById.get(String(a.credentialId));
                      const ownerLabel = owner ? (owner.holderName || owner.holderID || "Unknown owner") : "Unknown owner";
                      return (
                        <div className="analytics-flag-row flagged" key={`c14-${i}`}>
                          <div>
                            <div className="analytics-flag-issuer">{a.credentialName}</div>
                            <div className="analytics-flag-reason">Owner: {ownerLabel}</div>
                          </div>
                          <span className="analytics-flag-rate flagged">{a.outcome}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {reach.mostChecked.length > 0 && (
                <div className="analytics-card" style={{ marginTop: 14 }}>
                  <h3>Most-verified credentials</h3>
                  <div className="analytics-flag-list">
                    {reach.mostChecked.map((m, i) => (
                      <div className={`analytics-flag-row${m.invalidCount > 0 ? " flagged" : ""}`} key={`reach-${m.credentialId || i}`}>
                        <div>
                          <div className="analytics-flag-issuer">{m.credentialName}</div>
                          <div className="analytics-flag-reason">{m.count}× verified{m.invalidCount > 0 ? ` • ${m.invalidCount} returned revoked/expired` : ""}</div>
                        </div>
                        <span className="analytics-flag-rate">{m.count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <InterpretationBox>
                {reach.allValid
                  ? `Your issued credentials have been verified ${reach.totalChecks} time(s) by ${reach.distinctVerifiers} distinct verifier(s) — every check returned valid. Third-party proof that what you issue is actively trusted and used.`
                  : `Your issued credentials have been verified ${reach.totalChecks} time(s) by ${reach.distinctVerifiers} distinct verifier(s); ${reach.validCount} returned valid. ${reachStale.length} check(s) hit a revoked/expired credential (see above).`}
              </InterpretationBox>
            </>
          )}

          <h2 style={{ marginTop: 32 }}>Issuance Performance</h2>

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

          {/* C13: Credentials in Circulation — lead with the interpretation/nudge (validity-period
              review), then the status-breakdown donut. */}
          <h2 style={{ marginTop: 32 }}>Credentials in Circulation</h2>
          <InterpretationBox>{circulation.summary}</InterpretationBox>
          <div className="analytics-grid" style={{ marginTop: 12 }}>
            <div className="analytics-card">
              <h3>Status of issued credentials</h3>
              <DonutChart slices={circulation.slices} centerValue={circulation.total} centerLabel="Issued" showBreakdown />
            </div>
          </div>

          {/* Phase 4 GOOD: Revocation Self-Audit — where is our issuance process breaking? */}
          <h2 style={{ marginTop: 32 }}>Revocation Self-Audit</h2>
          <div className="issuer-stats-row" style={{ marginTop: 16 }}>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{revAudit.revokedTotal}</span>
              <span className="issuer-stat-label">Revoked Total</span>
            </div>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{revAudit.topTemplate ? revAudit.topTemplate.count : 0}</span>
              <span className="issuer-stat-label">Most-Revoked Credential</span>
            </div>
            <div className="issuer-stat-card">
              <span className="issuer-stat-num">{revAudit.fastShare}%</span>
              <span className="issuer-stat-label">Revoked ≤14 Days</span>
            </div>
          </div>

          {revAudit.revokedTotal > 0 ? (
            <div className="analytics-grid" style={{ marginTop: 18 }}>
              <div className="analytics-card">
                <h3>Revocations by Credential</h3>
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

      {/* C11: renewal decision modal — approve (new expiry → re-issue) or decline (reason) */}
      {renewalDecide && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>{renewalDecide.action === "approve" ? "Approve renewal?" : "Decline renewal?"}</h3>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => !renewalActionLoading && setRenewalDecide(null)}>✕</button>
            </div>
            <p style={{ margin: "8px 0 12px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              {renewalDecide.action === "approve" ? (
                <>A fresh <strong>{renewalDecide.request.credentialName || "credential"}</strong> will be issued to{" "}
                <strong>{renewalDecide.request.holderName || renewalDecide.request.holderId}</strong> with the expiry you set —
                the old copy stays in their history, clearly labeled.</>
              ) : (
                <>Tell <strong>{renewalDecide.request.holderName || "the holder"}</strong> why their renewal of{" "}
                <strong>{renewalDecide.request.credentialName || "this credential"}</strong> is declined.</>
              )}
            </p>
            {renewalDecide.action === "approve" ? (
              <div className="form-group compact-form-group">
                <label>New expiry date <span className="form-label-hint">(optional — blank = no expiry)</span></label>
                <input type="date" value={renewalExpiry} onChange={(e) => setRenewalExpiry(e.target.value)} min={minIssueExpiryDate()} max={maxIssueExpiryDate()} />
              </div>
            ) : (
              <div className="form-group">
                <label>Reason <span className="required-star">*</span></label>
                <textarea rows={2} value={renewalDeclineReason} onChange={(e) => setRenewalDeclineReason(e.target.value)} placeholder="e.g. CPD hours not yet completed" />
              </div>
            )}
            {renewalError && <div className="form-error">{renewalError}</div>}
            <div className="form-actions">
              <button type="button" className="action-btn" onClick={confirmRenewalDecision} disabled={renewalActionLoading}>
                {renewalActionLoading
                  ? <span className="btn-loading"><Spinner className="btn-spinner" /> Working…</span>
                  : (renewalDecide.action === "approve" ? "Approve & issue" : "Decline")}
              </button>
              <button type="button" className="action-btn btn-cancel" onClick={() => setRenewalDecide(null)} disabled={renewalActionLoading}>Cancel</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !renewalActionLoading && setRenewalDecide(null)}></div>
        </div>
      )}

      {/* C17: batch revocation modal — form → confirm → sequential run with live progress */}
      {showBatchModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>
                {batchDone ? "Batch revocation results"
                  : batchRunning ? "Revoking…"
                  : batchConfirmStep ? "Confirm batch revocation"
                  : `Revoke ${batchSelected.size} credential(s)`}
              </h3>
              {!batchRunning && <button type="button" className="modal-close" aria-label="Close" onClick={closeBatchRevokeModal}>✕</button>}
            </div>

            {!batchRunning && !batchDone && !batchConfirmStep && (
              <>
                <p style={{ margin: "8px 0 12px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  One reason applies to all selected credentials. Each is revoked on the blockchain
                  individually — exactly like a manual revoke, just several at once.
                </p>
                <div className="analytics-flag-list" style={{ maxHeight: 180, overflowY: "auto", marginBottom: 12 }}>
                  {[...batchSelected].slice(0, 8).map((id) => {
                    const cred = credentials.find((c) => (c.blockchainId || c.id) === id);
                    return (
                      <div className="analytics-flag-row" key={`bsel-${id}`}>
                        <div>
                          <div className="analytics-flag-issuer">{cred?.credentialName || id}</div>
                          <div className="analytics-flag-reason">{cred?.holderName || ""}</div>
                        </div>
                      </div>
                    );
                  })}
                  {batchSelected.size > 8 && (
                    <div className="analytics-flag-reason" style={{ padding: "6px 0" }}>…and {batchSelected.size - 8} more</div>
                  )}
                </div>
                <div className="form-group">
                  <label>Revocation reason <span className="required-star">*</span></label>
                  <textarea rows={2} value={batchReason} onChange={(e) => setBatchReason(e.target.value)} placeholder="e.g. Membership lapsed for AY 2025–2026" />
                </div>
                {batchError && <div className="form-error">{batchError}</div>}
                <div className="form-actions">
                  <button type="button" className="action-btn revoke-btn" onClick={handleBatchSubmit}>Continue</button>
                  <button type="button" className="action-btn btn-cancel" onClick={closeBatchRevokeModal}>Cancel</button>
                </div>
              </>
            )}

            {!batchRunning && !batchDone && batchConfirmStep && (
              <>
                <p style={{ margin: "12px 0 4px", fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>
                  You're about to revoke <strong>{batchSelected.size}</strong> credential(s) with the reason{" "}
                  <strong>"{batchReason.trim()}"</strong>. This is written to the blockchain and <strong>cannot be undone</strong>.
                </p>
                <div className="form-actions">
                  <button type="button" className="action-btn revoke-btn" onClick={runBatchRevoke}>Confirm — revoke {batchSelected.size}</button>
                  <button type="button" className="action-btn btn-cancel" onClick={() => setBatchConfirmStep(false)}>Go back</button>
                </div>
              </>
            )}

            {(batchRunning || batchDone) && (
              <>
                <p style={{ margin: "8px 0 10px", fontSize: 13, color: "var(--text-muted)" }}>
                  {batchRunning
                    ? `Revoking ${Math.min(batchProgress.done + 1, batchProgress.total)} of ${batchProgress.total}… each revocation is its own blockchain transaction, so this takes a moment.`
                    : `Done — ${batchResults.filter((r) => r.success).length} revoked, ${batchResults.filter((r) => !r.success).length} failed.`}
                </p>
                <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ height: "100%", width: `${batchProgress.total ? Math.round((batchProgress.done / batchProgress.total) * 100) : 0}%`, background: "var(--danger)", transition: "width .3s ease" }} />
                </div>
                <div className="analytics-flag-list" style={{ maxHeight: 220, overflowY: "auto" }}>
                  {batchResults.map((r) => (
                    <div className={`analytics-flag-row${r.success ? "" : " flagged"}`} key={`bres-${r.id}`}>
                      <div>
                        <div className="analytics-flag-issuer">{r.success ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />} {r.name}</div>
                        <div className="analytics-flag-reason">{r.success ? (r.holder || "Revoked") : (r.error || "Failed")}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {batchDone && (
                  <div className="form-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="action-btn" onClick={closeBatchRevokeModal}>Close</button>
                  </div>
                )}
              </>
            )}
          </div>
          {!batchRunning && <div className="modal-backdrop" onClick={closeBatchRevokeModal}></div>}
        </div>
      )}

      {/* D4: batch issuance modal — pick credential + import recipients → confirm → sequential run */}
      {showBatchIssueModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>
                {batchIssueDone ? "Batch issuance results"
                  : batchIssueRunning ? "Issuing…"
                  : batchIssueConfirmStep ? "Confirm batch issuance"
                  : "Issuance (Batch)"}
              </h3>
              {!batchIssueRunning && <button type="button" className="modal-close" aria-label="Close" onClick={closeBatchIssueModal}>✕</button>}
            </div>

            {!batchIssueRunning && !batchIssueDone && !batchIssueConfirmStep && (
              <>
                <p style={{ margin: "8px 0 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Import a <strong>.csv / .txt</strong> of recipient emails or holder IDs (one per line, or
                  comma-separated). Only holders eligible for that credential are matched.
                </p>
                <div className="form-group">
                  <label>Credential <span className="required-star">*</span></label>
                  <select value={batchIssueTemplateId} onChange={handleBatchIssueTemplateChange}>
                    <option value="">Select a credential…</option>
                    {templateOptions.map((t) => (
                      <option key={t.id || t._id} value={t.id || t._id}>{t.credentialName} ({t.credentialType})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Expiry date (optional — blank = no expiry)</label>
                  <input type="date" min={minIssueExpiryDate()} max={maxIssueExpiryDate()} value={batchIssueExpiry} onChange={(e) => setBatchIssueExpiry(e.target.value)} />
                </div>
                <div className="form-group">
                  <label style={{ display: "block", marginBottom: 8 }}>Recipients <span className="required-star">*</span></label>
                  <label className="action-btn issue-btn" style={{ display: "inline-flex", alignItems: "center", width: "auto", margin: 0, cursor: batchIssueTemplateId ? "pointer" : "not-allowed", opacity: batchIssueTemplateId ? 1 : 0.5 }}>
                    Import .csv / .txt of recipients
                    <input type="file" accept=".csv,.txt" onChange={handleBatchIssueCsv} disabled={!batchIssueTemplateId} style={{ display: "none" }} />
                  </label>
                  {batchIssueFileName && (
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 8 }}>
                      {batchIssueFileName} — <strong>{batchIssueRecipients.length}</strong> eligible
                      {batchIssueUnknown.length > 0 ? `, ${batchIssueUnknown.length} not eligible / not found` : ""}
                    </div>
                  )}
                </div>
                {(batchIssueRecipients.length > 0 || batchIssueUnknown.length > 0) && (
                  <div className="analytics-flag-list" style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                    {batchIssueRecipients.map((r) => (
                      <div className="analytics-flag-row" key={`bi-${r.id}`} style={{ alignItems: "center" }}>
                        <div style={{ minWidth: 0 }}><div className="analytics-flag-issuer" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div></div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ok)", flexShrink: 0, whiteSpace: "nowrap" }}>Eligible</span>
                      </div>
                    ))}
                    {batchIssueUnknown.map((t, i) => (
                      <div className="analytics-flag-row" key={`biu-${i}`} style={{ alignItems: "center" }}>
                        <div style={{ minWidth: 0 }}><div className="analytics-flag-issuer" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.7 }}>{t}</div></div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", flexShrink: 0, whiteSpace: "nowrap" }}>Not eligible</span>
                      </div>
                    ))}
                  </div>
                )}
                {batchIssueError && <div className="form-error">{batchIssueError}</div>}
                <div className="form-actions">
                  <button type="button" className="action-btn issue-btn" onClick={handleBatchIssueSubmit}>Continue</button>
                  <button type="button" className="action-btn btn-cancel" onClick={closeBatchIssueModal}>Cancel</button>
                </div>
              </>
            )}

            {!batchIssueRunning && !batchIssueDone && batchIssueConfirmStep && (
              <>
                <p style={{ margin: "12px 0 4px", fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>
                  You're about to issue this credential to <strong>{batchIssueRecipients.length}</strong> holder(s)
                  {batchIssueExpiry ? <> with expiry <strong>{batchIssueExpiry}</strong></> : <> with <strong>no expiry</strong></>}.
                  Each issuance is written to the blockchain individually.
                </p>
                <div className="form-actions">
                  <button type="button" className="action-btn issue-btn" onClick={runBatchIssue}>Confirm — issue {batchIssueRecipients.length}</button>
                  <button type="button" className="action-btn btn-cancel" onClick={() => setBatchIssueConfirmStep(false)}>Go back</button>
                </div>
              </>
            )}

            {(batchIssueRunning || batchIssueDone) && (
              <>
                <p style={{ margin: "8px 0 10px", fontSize: 13, color: "var(--text-muted)" }}>
                  {batchIssueRunning
                    ? `Issuing ${Math.min(batchIssueProgress.done + 1, batchIssueProgress.total)} of ${batchIssueProgress.total}… each issuance is its own blockchain transaction, so this takes a moment.`
                    : `Done — ${batchIssueResults.filter((r) => r.success).length} issued, ${batchIssueResults.filter((r) => !r.success).length} failed.`}
                </p>
                <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ height: "100%", width: `${batchIssueProgress.total ? Math.round((batchIssueProgress.done / batchIssueProgress.total) * 100) : 0}%`, background: "var(--ok)", transition: "width .3s ease" }} />
                </div>
                <div className="analytics-flag-list" style={{ maxHeight: 220, overflowY: "auto" }}>
                  {batchIssueResults.map((r) => (
                    <div className={`analytics-flag-row${r.success ? "" : " flagged"}`} key={`bires-${r.id}`}>
                      <div>
                        <div className="analytics-flag-issuer">{r.success ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />} {r.label}</div>
                        <div className="analytics-flag-reason">{r.success ? "Issued" : (r.error || "Failed")}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {batchIssueDone && (
                  <div className="form-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="action-btn" onClick={closeBatchIssueModal}>Close</button>
                  </div>
                )}
              </>
            )}
          </div>
          {!batchIssueRunning && <div className="modal-backdrop" onClick={closeBatchIssueModal}></div>}
        </div>
      )}

      {/* C2: confirm template visibility change */}
      {pendingVisibilityTemplate && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <h3>{pendingVisibilityTemplate.visibility === "public" ? "Make this credential private?" : "Make this credential public?"}</h3>
            <p style={{ margin: "8px 0 18px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              {pendingVisibilityTemplate.visibility === "public"
                ? `"${pendingVisibilityTemplate.credentialName || "This credential"}" will be hidden from your public issuer profile.`
                : `"${pendingVisibilityTemplate.credentialName || "This credential"}" will appear on your public issuer profile for anyone to see.`}
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
              <h3>Create Credential</h3>
              <button type="button" className="modal-close" aria-label="Close" onClick={closeCreateModal}>✕</button>
            </div>
            <form onSubmit={handleCreateCredential}>
              <div className="modal-two-col">
                <div className="form-group">
                  <label>Credential Type <span className="required-star">*</span></label>
                  <select name="credentialTypeSelect" value={typeIsOther ? CREDENTIAL_TYPE_OTHER : createForm.credentialType} onChange={handleCreateTypeSelect} required>
                    <option value="" disabled>Select a type…</option>
                    {CREDENTIAL_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    <option value={CREDENTIAL_TYPE_OTHER}>Other…</option>
                  </select>
                  {typeIsOther && (
                    <input type="text" name="credentialType" value={createForm.credentialType} onChange={handleCreateFormChange} placeholder="Enter a custom credential type" maxLength={60} required style={{ marginTop: "8px" }} />
                  )}
                </div>
                <div className="form-group"><label>Credential Name <span className="required-star">*</span></label><input type="text" name="credentialName" value={createForm.credentialName} onChange={handleCreateFormChange} placeholder="e.g. Company Staff Card" required />
                  {nameClash.exact.length > 0 && <span className="form-label-hint" style={{ color: "var(--danger)", display: "block", marginTop: 6 }}>You already have an active credential with this name — names must be unique.</span>}
                  {nameClash.exact.length === 0 && nameClash.similar.length > 0 && <span className="form-label-hint" style={{ color: "var(--warn)", display: "block", marginTop: 6 }}>Similar to your existing {nameClash.similar.map((n) => `"${n}"`).join(", ")} — holders may confuse the two. You can still create it if it is intentionally distinct.</span>}
                </div>
              </div>
              <div className="form-group"><label>Description</label><textarea name="description" value={createForm.description} onChange={handleCreateFormChange} rows={2} placeholder="Describe the credential's purpose…" /></div>
              <div className="form-group"><label>Metadata <span className="form-label-hint">(optional)</span></label><input type="text" name="metadata" value={createForm.metadata} onChange={handleCreateFormChange} placeholder="e.g. Level: Manager" /></div>
              {/* D5: renewable flag — controls whether holders see a "Request renewal" button.
                  N1: the "?" is a SIBLING of the label (not inside it) so clicking it can never
                  forward a toggle to the checkbox via native label behavior. */}
              <div className="form-group">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={createForm.renewable !== false} onChange={(e) => setCreateForm((prev) => ({ ...prev, renewable: e.target.checked }))} style={{ width: "auto" }} />
                    Allow holders to request renewal
                  </label>
                  <InfoHint text="Leave on for credentials that expire and can be renewed (IDs, memberships). Turn off for one-time credentials (diplomas, certificates)." />
                </div>
              </div>
              <div className="form-group">
                <label>Skills <span className="form-label-hint">(optional — recipients will earn these)</span></label>
                <div className="skills-input-row"><input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); }}} placeholder="e.g. Python, Project Management" /><button type="button" className="add-skill-btn" onClick={handleAddSkill}>+ Add Skill</button></div>
                {skillSuggestions.length > 0 && (
                  <div className="skills-suggest-row">
                    <span className="skills-suggest-label">From your past credentials:</span>
                    {skillSuggestions.map((s) => (
                      <button key={s} type="button" className="skill-suggest-chip" onClick={() => setSkillsList((prev) => (prev.includes(s) ? prev : [...prev, s]))}>
                        + {s}
                      </button>
                    ))}
                  </div>
                )}
                {skillsList.length > 0 && <div className="skills-tags">{skillsList.map((skill, idx) => <span key={idx} className="skill-tag"><span>{skill}</span><button type="button" onClick={() => handleRemoveSkill(skill)} aria-label={`Remove ${skill}`}>×</button></span>)}</div>}
              </div>
              <div className="form-group">
                <label>Badge Image <span className="form-label-hint">(optional)</span></label>
                <div className="badge-file-row" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label className="file-input-label" style={{ display: "inline-flex", alignItems: "center", padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border-strong)", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", margin: 0 }}>
                    <span>Choose file</span>
                    <input type="file" accept="image/png, image/jpeg, image/gif" onChange={handleBadgeImageChange} className="file-input" style={{ display: "none" }} />
                  </label>
                  <span className="badge-file-name" title={badgeImageName} style={{ fontSize: 13, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{badgeImageName || "No file chosen"}</span>
                </div>
                {badgeImagePreview && <div className="badge-preview" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}><img src={badgeImagePreview} alt="Badge preview" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} /><button type="button" className="badge-remove-btn" onClick={() => { setBadgeImageBase64(""); setBadgeImagePreview(""); setBadgeImageName(""); }}>✕ Remove</button></div>}
              </div>
              {createError && <div className="form-error">{createError}</div>}
              <div className="form-actions"><button type="submit" className="action-btn">Create Credential</button><button type="button" onClick={closeCreateModal} className="action-btn btn-cancel">Cancel</button></div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeCreateModal}></div>
        </div>
      )}

      {/* Group 4.5: create-template confirmation, stacked over the create modal. */}
      {showCreateModal && createConfirmStep && (
        <div className="modal-overlay confirm-overlay">
          <div className="modal confirm-modal">
            <div className="modal-header"><h3>Create this credential?</h3></div>
            <p style={{ margin: "12px 0 4px", fontSize: "14px", lineHeight: 1.6, color: "var(--text)" }}>
              You're about to create the credential <strong>"{createForm.credentialName.trim()}"</strong> (type: <strong>{createForm.credentialType.trim()}</strong>). You can issue it to recipients right after.
            </p>
            {nameClash.similar.length > 0 && (
              <p style={{ margin: "4px 0", fontSize: "13px", lineHeight: 1.6, color: "var(--warn)" }}>
                Heads up: this name is similar to your existing {nameClash.similar.map((n) => `"${n}"`).join(", ")}. Confirming creates it anyway.
              </p>
            )}
            {createError && <div className="form-error">{createError}</div>}
            <div className="form-actions">
              <button type="button" className="action-btn" onClick={confirmCreateCredential} disabled={createLoading}>
                {createLoading ? <span className="btn-loading"><Spinner className="btn-spinner" /> Creating…</span> : "Confirm Create"}
              </button>
              <button type="button" className="action-btn btn-cancel" onClick={() => { setCreateConfirmStep(false); setCreateError(""); }} disabled={createLoading}>Go Back</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { if (!createLoading) { setCreateConfirmStep(false); setCreateError(""); } }}></div>
        </div>
      )}

      {/* Issue Credential Modal */}
      {showIssueModal && (
        <div className="modal-overlay">
          <div className="modal modal-wide">
            <div className="modal-header"><h3>Issue Credential</h3><button type="button" className="modal-close" aria-label="Close" onClick={closeIssueModal}>✕</button></div>
            <form onSubmit={handleIssueCredential}>
              <div className="modal-section-heading" style={{ marginTop: "12px" }}>Choose a credential and recipient to issue quickly.</div>
              <div className="issue-modal-grid">
                <div className="form-group compact-form-group">
                  <label>Credential Type</label>
                  <select className="filter-select" value={issueTemplateTypeFilter} onChange={(e) => setIssueTemplateTypeFilter(e.target.value)}>
                    <option value="all">All Types</option>
                    {issueTemplateTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Credential <span className="required-star">*</span></label>
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
                    placeholder="Type to search credentials…"
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
                        <li className="searchable-select-empty">{issueTemplateSearch ? "No credentials match your search." : "No credentials available."}</li>
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
                    placeholder={issueForm.credentialId ? "Type to search recipients…" : "Select a credential first"}
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
                        <li className="searchable-select-empty">{issueRecipientSearch ? "No recipients match your search." : "No eligible recipients for this credential."}</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-group compact-form-group"><label>Expiry Date <span className="form-label-hint">(optional)</span></label><input type="date" name="expiryDate" value={issueForm.expiryDate} onChange={handleIssueFormChange} min={minIssueExpiryDate()} max={maxIssueExpiryDate()} /></div>
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
                {issueLoading ? <span className="btn-loading"><Spinner className="btn-spinner" /> Issuing…</span> : "Confirm Issue"}
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
                    placeholder="Type to search holders…"
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
                    placeholder="Type to search credentials…"
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
              <div className="form-group"><label>Revocation Reason:</label><textarea name="rejectionReason" value={revokeForm.rejectionReason} onChange={handleRevokeFormChange} rows={3} placeholder="State the reason for revoking this credential…" required /></div>
              {revokeError && <div className="form-error">{revokeError}</div>}
              <div className="form-actions"><button type="submit" className="action-btn revoke-btn">Revoke</button><button type="button" onClick={closeRevokeModal} className="action-btn btn-cancel">Cancel</button></div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeRevokeModal}></div>
        </div>
      )}

      {/* Group 4.5: revoke confirmation, stacked over the revoke modal. */}
      {showRevokeModal && revokeConfirmStep && (
        <div className="modal-overlay confirm-overlay">
          <div className="modal confirm-modal">
            <div className="modal-header"><h3>Confirm Revocation</h3></div>
            <p style={{ margin: "12px 0 4px", fontSize: "14px", lineHeight: 1.6, color: "var(--text)" }}>
              <strong style={{ color: "var(--danger)" }}>Are you sure?</strong> This revokes the selected credential. The action is recorded on the blockchain and <strong>cannot be undone</strong>.
            </p>
            {revokeError && <div className="form-error">{revokeError}</div>}
            <div className="form-actions">
              <button type="button" className="action-btn revoke-btn" onClick={confirmRevokeCredential} disabled={revokeLoading}>
                {revokeLoading ? <span className="btn-loading"><Spinner className="btn-spinner" /> Revoking…</span> : "Confirm Revoke"}
              </button>
              <button type="button" className="action-btn btn-cancel" onClick={() => { setRevokeConfirmStep(false); setRevokeError(""); }} disabled={revokeLoading}>Go Back</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { if (!revokeLoading) { setRevokeConfirmStep(false); setRevokeError(""); } }}></div>
        </div>
      )}

      {/* RA2: per-subordinate on-chain decision history */}
      {subHistoryOpen && (
        <div className="modal-overlay">
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3>Subordinate BC History — {subHistorySubordinate?.orgName || subHistorySubordinate?.email || "Subordinate"}</h3>
              <button type="button" className="modal-close" aria-label="Close" onClick={closeSubordinateHistory}>✕</button>
            </div>
            <div className="modal-section-heading" style={{ marginTop: 8 }}>
              Immutable root-authority decisions recorded on the blockchain for this subordinate.
            </div>
            {rootSubordinateLogsLoading ? (
              <SpinnerBlock label="Loading history…" />
            ) : subHistoryLogs.length === 0 ? (
              <EmptyState title="No on-chain decisions recorded yet" />
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
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{log.txId ? `${String(log.txId).slice(0, 18)}…` : "N/A"}</td>
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
          <div className="modal modal-wide history-modal" style={{ maxWidth: "900px", width: "90vw", padding: "clamp(16px, 4vw, 28px)", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "16px" }}>
              <div style={{ flex: 1, minWidth: 0, marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "20px" }}>Credential History (Blockchain Audit Trail)</h3>
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
                <button type="button" onClick={() => setLineageOpen((o) => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Credential Lineage — {historyLineage.length} issuances</span>
                  <span style={{ fontSize: 12, color: "var(--accent-strong)" }}>{lineageOpen ? "Hide ▲" : "Show ▼"}</span>
                </button>
                {lineageOpen && (
                <>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.62)", margin: "8px 0 10px" }}>
                  {historyLineage.length} issuances of <strong>{historyCredential?.credentialName || "this credential"}</strong> to <strong>{historyCredential?.holderName || historyCredential?.holderID || "this holder"}</strong>, newest first. The <strong>highlighted</strong> row's blockchain history is shown below — click another row's <strong>View</strong> to switch.
                </div>
                <div style={{ overflowX: "auto" }}>
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
                </>
                )}
              </div>
            )}

            {historyLoading && <SpinnerBlock label="Loading blockchain history…" minHeight={100} />}
            {historyError && <div className="form-error">{historyError}</div>}

            {/* BCHIST2: unified timeline (tx hash + reason). Issuer has no verification endpoint → no proof trail. */}
            {historyData && (
              <CredentialHistory
                history={filterHistoryEntries(historyData.history)}
                credential={historyCredential}
                showProofTrail={false}
              />
            )}
          </div>
          <div className="modal-backdrop" onClick={closeHistory}></div>
        </div>
      )}

      {descriptionModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "600px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>{descriptionModal.name}</h3>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setDescriptionModal(null)}>✕</button>
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
        <div onClick={closeIssuerDocumentsModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
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
                    <td>{typeof doc.size === "number" ? `${(doc.size / 1024).toFixed(1)}…` : "N/A"}</td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => handleViewIssuerDocument(doc)} className="action-btn" style={{ padding: "6px 10px", fontSize: "12px", background: "var(--accent-weak)", color: "var(--accent-strong)", border: "1px solid rgba(255,255,255,0.18)" }}>View</button>
                      <button type="button" onClick={() => handleDownloadIssuerDocument(doc)} className="action-btn" style={{ padding: "6px 10px", fontSize: "12px", background: "var(--ok-weak)", color: "var(--ok)", border: "1px solid rgba(255,255,255,0.18)" }}>Download</button>
                    </td>
                  </tr>
                ))}
              </tbody></table></div>
            ) : <EmptyState title="No submitted documents found" />}
          </div>
        </div>, document.body
      )}

      {/* Reject Subordinate Modal */}
      {showRejectSubordinateModal && ReactDOM.createPortal(
        <div onClick={closeRejectSubordinateModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: "var(--z-modal)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 95vw)", background: "var(--surface-2)", borderRadius: "12px", border: "1px solid var(--border-strong)", padding: "18px", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", color: "var(--text)" }}>
            <h3 style={{ marginTop: 0 }}>Reject Subordinate Issuer</h3>
            <p style={{ opacity: 0.85, marginTop: "6px" }}>Please provide a rejection reason.</p>
            <form onSubmit={submitRejectSubordinate}>
              <textarea value={rejectSubordinateReason} onChange={(e) => setRejectSubordinateReason(e.target.value)} placeholder="Enter rejection reason…" rows={4} style={{ width: "100%", borderRadius: "10px", padding: "10px", marginTop: "10px", background: "var(--border)", border: "1px solid var(--border-strong)", color: "var(--text)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              {rejectSubordinateError && <div style={{ color: "var(--danger)", marginTop: "10px" }}>{rejectSubordinateError}</div>}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "14px" }}>
                <button type="button" onClick={closeRejectSubordinateModal} disabled={rejectSubordinateLoading} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "var(--text)", cursor: rejectSubordinateLoading ? "not-allowed" : "pointer", opacity: rejectSubordinateLoading ? 0.65 : 1, fontWeight: 700 }}>Cancel</button>
                <button type="submit" disabled={rejectSubordinateLoading} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.18)", background: "var(--danger-weak)", color: "var(--danger)", cursor: rejectSubordinateLoading ? "not-allowed" : "pointer", opacity: rejectSubordinateLoading ? 0.65 : 1, fontWeight: 800 }}>{rejectSubordinateLoading ? "Rejecting…" : "Confirm Reject"}</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
