// studentDashboard.js
/*
  FILE: studentDashboard.js
  LAYMAN (Tropang Ex): Ito yung personal na "wallet" ng holder/student. Dito niya nakikita lahat ng
  credentials na na-issue sa kanya (card o list view, may search/filter), pwede mag-export ng PDF,
  tingnan ang buong kasaysayan ng isang credential, at sa "Insights" tab makikita niya ang health ng
  mga credential niya, mga malapit nang mag-expire, at kung gaano kadalas siya na-ve-verify.

  TECHNICAL: Role=holder React page (default route after a student logs in). Wallet-first IA: a
  segmented control switches between "My Wallet" (credential grid/list, search/filter/sort, PDF export,
  per-credential history modal) and "Insights" (analytics). Data via apiService (own credentials,
  notifications, GET /api/wallet/my-verifications). Uses the shared analytics layer (computeHealth,
  computeExpirationAlerts, computeHolderVerificationInsights) + CredentialHistory for the unified
  provenance + verification proof trail, and effectiveCredentialStatus for compute-on-read expiry (F01).
  All presentation uses the design-system primitives (Card/Button/Modal/StatusPill/EmptyState/Spinner).

  OUTLINE:
    HELPERS                 formatDate, getNotificationTypeMeta (notification → icon/label/tone)
    MY WALLET tab           credentials list/card + search/filter/sort; Export PDF (single + all);
                            per-credential "See History" modal (→ CredentialHistory)
    INSIGHTS tab            Credential Health (donut) · Renewal Alerts · Verification Insights ·
                            Provenance timeline (analytics helpers + Donut/TrendBars/InterpretationBox)
    NOTIFICATIONS           bell panel (issued / revoked / expired)
*/

import React, { useState, useEffect, useMemo, useRef } from "react";
import apiService from "../services/apiService";
import "../styles/studentDashboard.css";
import "../styles/analytics.css";
import { exportCredentialToPDF, exportAllCredentialsToPDF } from '../services/pdfExportService';
import DonutChart from "../components/analytics/DonutChart";
import InterpretationBox from "../components/analytics/InterpretationBox";
import CredentialHistory from "../components/analytics/CredentialHistory";
import {
  computeHealth,
  computeExpirationAlerts,
  computeHolderVerificationInsights,
} from "../components/analytics/analytics";
import { Card, Button, Modal, StatusPill, EmptyState, Spinner, SpinnerBlock, SkeletonCardGrid } from "../components/ui";
import NotesCard from "../components/ui/NotesCard";
import { effectiveCredentialStatus } from "../utils/credentialStatus"; // F01: compute-on-read expiry
import { copyToClipboard } from "../utils/clipboard";
import {
  Bell, CheckCircle2, XCircle, Clock, Wallet, Activity, ShieldCheck,
  Download, ScrollText, Globe, Lock, Award, Search, Inbox, AlertTriangle, GitBranch, Copy, Check,
} from "lucide-react";

// ==========================================================================================================================================================================
// HELPERS
// ==========================================================================================================================================================================

const formatDate = (iso) => {
  if (!iso) return "N/A";

  const d = new Date(iso);
  if (isNaN(d.getTime())) return "N/A";

  return d.toLocaleDateString();
};

/* Notification type → lucide icon + label + semantic tone (de-emojified). */
const getNotificationTypeMeta = (notificationType) => {
  switch (notificationType) {
    case "credential_issued":
      return { Icon: CheckCircle2, label: "Issued", tone: "ok" };
    case "credential_revoked":
      return { Icon: XCircle, label: "Revoked", tone: "danger" };
    case "credential_expired":
      return { Icon: Clock, label: "Expired", tone: "warn" };
    default:
      return { Icon: Bell, label: "Notification", tone: "neutral" };
  }
};

// ==========================================================================================================================================================================
// MAIN COMPONENT
// ==========================================================================================================================================================================

export default function StudentDashboard() {
  // ── State ──────────────────────────────────────────────────────────────────

  /* Dynamic credentials from CouchDB (replaces MOCK_CREDENTIALS)
     // - polo
  */
  const [credentials, setCredentials] = useState([]);
  const [copiedId, setCopiedId] = useState(false); // D5: copy-Credential-ID feedback (local; studentDashboard has no toast infra)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Notifications */
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.read), [notifications]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationPanelRef = useRef(null);

  /* UI state */
  const [tab, setTab] = useState("wallet"); // 'wallet' | 'insights'
  const [view, setView] = useState("cards");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  /* Credential detail modal
     Technical: selectedCred holds the full CouchDB doc when user clicks a card
     // - polo
  */
  const [selectedCred, setSelectedCred] = useState(null);

  // - polo: stores skills + badgeImage fetched from issuer's template
  const [templateDetails, setTemplateDetails] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  // G1: in-flight guards for the wallet write-actions so double-clicks can't fire
  // duplicate API calls.
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [markAllLoading, setMarkAllLoading] = useState(false);

  /* See History modal (inside detail modal)
     Technical: Same pattern as admin dashboard See History
     // - polo
  */
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  /* CSS-CHANGE: Read username from localStorage for greeting display - polo */
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const displayName = user.fullName || user.name || user.username || user.email || "Student";

  // ── Fetch credentials + notifications on mount ────────────────────────────

  /*
    Technical:
    On component mount, reads logged-in user from localStorage (same as issuerDashboardPage.js)
    then calls Get_UserCredentials / getUserNotifications / getUnreadUserNotifications.
  */
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotificationsLoading(true);
        setNotificationsError(null);

        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser || !storedUser._id) {
          setError("User session not found. Please log in again.");
          return;
        }

        const holderID = storedUser._id;

        const [credentialsData, notificationsResponse, unreadResponse] = await Promise.all([
          apiService.Get_UserCredentials(holderID),
          apiService.getUserNotifications(holderID),
          apiService.getUnreadUserNotifications(holderID)
        ]);

        setCredentials(Array.isArray(credentialsData) ? credentialsData : []);
        setNotifications(
          Array.isArray(notificationsResponse?.notifications)
            ? notificationsResponse.notifications
            : []
        );

        setUnreadCount(
          typeof unreadResponse?.unreadCount === "number"
            ? unreadResponse.unreadCount
            : Array.isArray(unreadResponse?.notifications)
              ? unreadResponse.notifications.length
              : 0
        );
      } catch (err) {
        console.error("[STUDENT DASHBOARD] Error fetching dashboard data:", err);
        setError("Failed to load credentials. Please try again.");
        setNotificationsError("Failed to load notifications.");
      } finally {
        setLoading(false);
        setNotificationsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // ── Close notification panel when clicking outside ─────────────────────────

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationsOpen]);

  // ── Filter logic ───────────────────────────────────────────────────────────

  // C11/D2: collapse a renewal lineage (same template + same holder) to ONE card — the newest
  // instance — so a renewed credential shows a single "Renewed N×" card instead of the old (now
  // expired) copy plus the new one. Credentials without a templateId pass through unchanged.
  // The renewal system prevents re-issuing the same template to the same holder unless the prior
  // copy expired/was revoked, so a group here is always a genuine renewal chain.
  const collapsedCredentials = useMemo(() => {
    const dt = (x) => new Date(x.assignedDate || x.savedToUserWalletAt || x.createdAt || 0).getTime();
    const groups = new Map();
    const passthrough = [];
    for (const c of credentials) {
      const tid = c.templateId;
      if (!tid) { passthrough.push(c); continue; }
      const key = `${tid}|${c.holderID || c.holderId || ""}`;
      const existing = groups.get(key);
      if (!existing || dt(c) >= dt(existing)) groups.set(key, c);
    }
    return [...passthrough, ...groups.values()];
  }, [credentials]);

  // D2 / 3.2: how many times a credential line (same template + same holder) has been renewed.
  // Reused by the wallet "Renewed N×" badge AND stamped onto the PDF export.
  const getRenewalCount = (cred) => {
    if (!cred || !cred.templateId) return 0;
    const key = `${cred.templateId}|${cred.holderID || cred.holderId || ''}`;
    return credentials.filter((c) => `${c.templateId || ''}|${c.holderID || c.holderId || ''}` === key).length - 1;
  };

  const filtered = useMemo(() => {
    let result = collapsedCredentials.filter((c) => {
      const searchable = [c.credentialName, c.credentialType, c.issuerName]
        .join(" ")
        .toLowerCase();

      const matchesQ = searchable.includes(query.toLowerCase());

      const effStatus = effectiveCredentialStatus(c); // F01: reflect end-of-day-Manila expiry
      const normalizedStatus = effStatus === "issued" ? "active" : effStatus;
      const matchesS = statusFilter === "all" ? true : normalizedStatus === statusFilter;

      return matchesQ && matchesS;
    });

    if (sortBy === "newest") {
      result = [...result].sort((a, b) =>
        new Date(b.savedToUserWalletAt || 0) - new Date(a.savedToUserWalletAt || 0)
      );
    } else if (sortBy === "oldest") {
      result = [...result].sort((a, b) =>
        new Date(a.savedToUserWalletAt || 0) - new Date(b.savedToUserWalletAt || 0)
      );
    } else if (sortBy === "az") {
      result = [...result].sort((a, b) =>
        (a.credentialName || "").localeCompare(b.credentialName || "")
      );
    } else if (sortBy === "za") {
      result = [...result].sort((a, b) =>
        (b.credentialName || "").localeCompare(a.credentialName || "")
      );
    }

    return result;
  }, [collapsedCredentials, query, statusFilter, sortBy]);

  /* Compute stats from the collapsed set so the chip counts match the cards shown */
  const stats = useMemo(() => {
    // F01: count by effective (end-of-day-Manila) status so the chips match the badges.
    const eff = (c) => effectiveCredentialStatus(c);
    const active = collapsedCredentials.filter((c) => { const s = eff(c); return s === "issued" || s === "active"; }).length;
    const revoked = collapsedCredentials.filter((c) => eff(c) === "revoked").length;
    const expired = collapsedCredentials.filter((c) => eff(c) === "expired").length;

    return { total: collapsedCredentials.length, active, revoked, expired };
  }, [collapsedCredentials]);

  /* Phase 4: Personal Credential Health report (non-overlapping buckets + interpretation) */
  const health = useMemo(() => computeHealth(collapsedCredentials), [collapsedCredentials]);
  /* Phase 4 NICE: actionable renewal list (which credentials, soonest-first) */
  const [exportWarn, setExportWarn] = useState(null); // D6: styled revoked-in-export warning
  const renewal = useMemo(() => computeExpirationAlerts(collapsedCredentials), [collapsedCredentials]);

  // C11: renewal requests — blockchainIds of this holder's credentials with a PENDING request,
  // so the "Request renewal" button shows "Requested" across reloads. Identity derived server-side.
  const [renewalPending, setRenewalPending] = useState(new Set());
  const [renewalActionError, setRenewalActionError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const data = await apiService.getMyRenewalRequests();
        if (!live) return;
        const pend = new Set(
          (Array.isArray(data?.requests) ? data.requests : [])
            .filter((r) => r.status === "pending")
            .map((r) => String(r.credentialId))
        );
        setRenewalPending(pend);
      } catch (e) {
        // non-fatal — buttons just won't show the persisted "Requested" state
      }
    })();
    return () => { live = false; };
  }, []);

  // C11: holder asks the issuer to renew — the issuer decides from their own records;
  // ChainCert only routes the request (and the issuer re-issues via the normal flow).
  const handleRequestRenewal = async (cred) => {
    const cid = String(cred?.blockchainId || cred?.credentialId || cred?.id || "");
    if (!cid) { setRenewalActionError("This credential has no blockchain ID to reference."); return; }
    setRenewalActionError("");
    try {
      await apiService.requestCredentialRenewal(cid);
      setRenewalPending((prev) => new Set(prev).add(cid));
    } catch (err) {
      setRenewalActionError(err?.response?.data?.message || "Failed to send the renewal request. Please try again.");
    }
  };

  /* Phase 4: Verification Insights — the holder's OWN verification logs (server-side filtered) */
  const [myVerifications, setMyVerifications] = useState([]);
  const [viLoading, setViLoading] = useState(false);
  const [viFetched, setViFetched] = useState(false);
  const vinsights = useMemo(() => computeHolderVerificationInsights(myVerifications), [myVerifications]);

  // Perf: the verification-logs endpoint does a full-ledger scan whose cost grows with every logged
  // verification (bulk-verify testing inflates it a lot). Fetch it only AFTER credentials have loaded
  // (loading === false) so the heavy scan never competes with the credential fetch that the
  // "Loading credentials…" spinner actually waits on.
  useEffect(() => {
    if (loading || viFetched) return;
    setViFetched(true);
    let active = true;
    setViLoading(true);
    apiService
      .Get_MyVerifications()
      .then((res) => { if (active) setMyVerifications(res?.logs || []); })
      .catch(() => { if (active) setMyVerifications([]); })
      .finally(() => { if (active) setViLoading(false); });
    return () => { active = false; };
  }, [loading, viFetched]);

  // ── See History handler ────────────────────────────────────────────────────

  /*
    Technical: Same flow as admin dashboard "See History".
    Uses apiService.Get_CredentialHistory(blockchainId); blockchainId stored as
    cred.blockchainId in wallet_user_credentials docs. // - polo
  */
  const handleSeeHistory = async (cred) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      setHistoryData(null);
      setHistoryOpen(true);

      const blockchainId = cred.blockchainId;
      if (!blockchainId) {
        setHistoryError("No blockchain ID found for this credential.");
        setHistoryLoading(false);
        return;
      }

      // Merge the FULL renewal lineage (same template + same holder) so the timeline shows the
      // whole story — original Issued → Expired → Reissued — not just the newest credential's history.
      const tid = cred.templateId;
      const hid = cred.holderID || cred.holderId || "";
      const lineage = tid
        ? credentials.filter((c) => c.templateId === tid && (c.holderID || c.holderId || "") === hid && c.blockchainId)
        : [cred];
      const ids = [...new Set(lineage.map((c) => c.blockchainId).filter(Boolean))];
      const histories = await Promise.all(
        ids.map((id) => apiService.Get_CredentialHistory(id).then((r) => (Array.isArray(r?.history) ? r.history : [])).catch(() => []))
      );
      const merged = histories.flat();

      const cleanHistory = merged.filter((entry) => {
        const id = entry?.credentialId || entry?.id || entry?.key || entry?.value?.credentialId || "";
        const action = String(entry?.action || "").toLowerCase();
        const status = String(entry?.status || entry?.value?.status || "").toLowerCase();
        if (String(id).startsWith("vlog_")) return false;
        if (action === "updated" && (status === "status unknown" || status === "unknown")) return false;
        if (!action && status === "status unknown") return false;
        return true;
      });
      setHistoryData({ history: cleanHistory });
    } catch (err) {
      console.error("[STUDENT DASHBOARD] History fetch error:", err);
      setHistoryError("Failed to load credential history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // - polo: on card click, fetch template details (skills + badgeImage) from issuer's CouchDB
  const handleCardClick = async (cred) => {
    setSelectedCred(cred);
    setTemplateDetails(null);
    setTemplateLoading(true);

    try {
      if (cred.issuerID) {
        const templates = await apiService.Get_IssuerTemplatesByID(cred.issuerID);

        // extract templateId: first 3 underscore-separated parts of blockchainId
        const parts = (cred.blockchainId || "").split("_");
        const templateId = parts.slice(0, 3).join("_");

        const match = templates.find(
          (t) => t._id === templateId || t.id === templateId
        );

        if (match) setTemplateDetails(match);
      }
    } catch (err) {
      console.error("[STUDENT DASHBOARD] Failed to fetch template details:", err);
    } finally {
      setTemplateLoading(false);
    }
  };

  // ── Notification click handler ─────────────────────────────────────────────

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    try {
      if (!notification.read) {
        await apiService.markNotificationAsRead(notification._id);

        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id
              ? { ...item, read: true, readAt: new Date().toISOString() }
              : item
          )
        );

        setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
      }

      const matchedCredential = credentials.find((cred) => {
        const notifCredentialId = notification.credentialId;

        return (
          (cred.blockchainId && cred.blockchainId === notifCredentialId) ||
          (cred.id && cred.id === notifCredentialId) ||
          (cred._id && cred._id === notifCredentialId)
        );
      });

      if (matchedCredential) {
        setNotificationsOpen(false);
        await handleCardClick(matchedCredential);
      } else {
        console.warn(
          "[STUDENT DASHBOARD] No matching credential found for notification:",
          notification
        );
      }
    } catch (err) {
      console.error("[STUDENT DASHBOARD] Failed to handle notification click:", err);
    }
  };

  const closeDetailModal = () => {
    setSelectedCred(null);
    setTemplateDetails(null);
    setHistoryOpen(false);
    setHistoryData(null);
    setHistoryError(null);
  };

  const closeHistoryModal = () => {
    setHistoryOpen(false);
    setHistoryData(null);
    setHistoryError(null);
  };

  const handleMarkAllRead = async () => {
    if (markAllLoading) return; // G1: ignore re-clicks while in flight
    setMarkAllLoading(true);
    try {
      await Promise.all(unreadNotifications.map((notification) => apiService.markNotificationAsRead(notification._id)));
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true, readAt: notification.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[STUDENT DASHBOARD] Failed to mark all notifications as read:', err);
    } finally {
      setMarkAllLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!selectedCred || visibilityLoading) return; // G1: ignore re-clicks while in flight
    const credentialKey = selectedCred.blockchainId || selectedCred._id;
    const newVisibility = selectedCred.visibility === 'public' ? 'private' : 'public';

    setVisibilityLoading(true);
    try {
      await apiService.Update_CredentialVisibility(credentialKey, newVisibility);
      setCredentials((prev) => prev.map((cred) => ((cred.blockchainId || cred._id) === credentialKey ? { ...cred, visibility: newVisibility } : cred)));
      setSelectedCred((prev) => (prev ? { ...prev, visibility: newVisibility } : prev));
    } catch (err) {
      console.error('[STUDENT DASHBOARD] Failed to update credential visibility:', err);
    } finally {
      setVisibilityLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasCreds = !loading && !error && credentials.length > 0;
  // Group 9: Export-all only produces PUBLIC credentials. If none are public the button was a
  // silent no-op ("dead button"), so disable it with an explanatory tooltip instead.
  const hasPublicCreds = hasCreds && collapsedCredentials.some((c) => c.visibility === 'public');

  return (
    <div className="holder-page">
      {/* ── Header ── */}
      <header className="holder-head">
        <div className="holder-head-text">
          <h1 className="holder-title">Welcome back, {displayName}</h1>
          <p className="holder-sub">View, manage, and share your verified credentials.</p>
        </div>

        <div className="holder-head-actions" ref={notificationPanelRef}>
          <button
            type="button"
            className={`holder-bell ${notificationsOpen ? "is-open" : ""}`}
            onClick={() => setNotificationsOpen((prev) => !prev)}
            aria-label="Toggle notifications"
          >
            <Bell size={18} aria-hidden="true" />
            {unreadCount > 0 && <span className="holder-bell-badge">{unreadCount}</span>}
          </button>

          {notificationsOpen && (
            <div className="holder-notif-panel">
              <div className="holder-notif-head">
                <h3>Notifications</h3>
                {unreadNotifications.length > 0 && (
                  <button type="button" className="holder-notif-markall" onClick={handleMarkAllRead} disabled={markAllLoading}>
                    {markAllLoading ? "Marking..." : "Mark all as read"}
                  </button>
                )}
              </div>

              {notificationsLoading && <div className="holder-notif-state"><Spinner /> Loading notifications…</div>}
              {!notificationsLoading && notificationsError && (
                <div className="holder-notif-state is-error">{notificationsError}</div>
              )}
              {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                <div className="holder-notif-state">No notifications yet.</div>
              )}

              {!notificationsLoading && !notificationsError && notifications.length > 0 && (
                <div className="holder-notif-list">
                  {notifications.map((notif) => {
                    const meta = getNotificationTypeMeta(notif.notificationType);
                    const NotifIcon = meta.Icon;
                    const safeCreatedAt = notif.createdAt || new Date().toISOString();
                    return (
                      <button
                        key={notif._id}
                        type="button"
                        className={`holder-notif-item ${notif.read ? "is-read" : "is-unread"}`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <span className={`holder-notif-type holder-notif-type--${meta.tone}`}>
                          <NotifIcon size={13} aria-hidden="true" /> {meta.label}
                        </span>
                        <span className="holder-notif-msg">
                          {notif.message || "A new credential has been issued to you."}
                        </span>
                        <span className="holder-notif-meta">
                          {notif.credentialName || "Credential"} • {notif.issuerName || notif.issuerId || "Issuer"}
                        </span>
                        <span className="holder-notif-time">
                          {formatDate(safeCreatedAt)} • {notif.read ? "Read" : "Unread"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Segmented tabs ── */}
      <div className="holder-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "wallet"}
          className={tab === "wallet" ? "is-active" : ""}
          onClick={() => setTab("wallet")}
        >
          <Wallet size={16} aria-hidden="true" /> My Wallet
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "insights"}
          className={tab === "insights" ? "is-active" : ""}
          onClick={() => setTab("insights")}
        >
          <Activity size={16} aria-hidden="true" /> Insights
        </button>
      </div>

      {/* ══════════════════ WALLET TAB ══════════════════ */}
      {tab === "wallet" && (
        <section className="holder-section">
          {/* Stat chips — clickable filters */}
          {hasCreds && (
            <div className="holder-stats">
              <button
                type="button"
                className={`holder-stat-chip ${statusFilter === "all" ? "is-selected" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                <span className="holder-stat-num">{stats.total}</span>
                <span className="holder-stat-label">Total</span>
              </button>
              <button
                type="button"
                className={`holder-stat-chip tone-ok ${statusFilter === "active" ? "is-selected" : ""}`}
                onClick={() => setStatusFilter("active")}
              >
                <span className="holder-stat-num">{stats.active}</span>
                <span className="holder-stat-label">Active</span>
              </button>
              {stats.revoked > 0 && (
                <button
                  type="button"
                  className={`holder-stat-chip tone-danger ${statusFilter === "revoked" ? "is-selected" : ""}`}
                  onClick={() => setStatusFilter("revoked")}
                >
                  <span className="holder-stat-num">{stats.revoked}</span>
                  <span className="holder-stat-label">Revoked</span>
                </button>
              )}
              {stats.expired > 0 && (
                <button
                  type="button"
                  className={`holder-stat-chip tone-warn ${statusFilter === "expired" ? "is-selected" : ""}`}
                  onClick={() => setStatusFilter("expired")}
                >
                  <span className="holder-stat-num">{stats.expired}</span>
                  <span className="holder-stat-label">Expired</span>
                </button>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className="holder-toolbar">
            <div className="holder-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by name, type, or issuer…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <select className="cc-input holder-toolbar-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>

            <select className="cc-input holder-toolbar-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Most recent</option>
              <option value="oldest">Oldest first</option>
              <option value="az">Name A–Z</option>
              <option value="za">Name Z–A</option>
            </select>

            <div className="holder-view-toggle">
              <button className={view === "cards" ? "is-active" : ""} onClick={() => setView("cards")}>Cards</button>
              <button className={view === "list" ? "is-active" : ""} onClick={() => setView("list")}>List</button>
            </div>

            {hasCreds && (
              <span title={hasPublicCreds ? undefined : "No public credentials to export. Set at least one credential to public first."}>
                <Button variant="secondary" size="sm" icon={Download} disabled={!hasPublicCreds} onClick={() => {
                  if (!hasPublicCreds) return;
                  // D6: warn (styled modal) before exporting a bundle that includes a revoked credential.
                  const revoked = collapsedCredentials.filter((c) => c.visibility === "public" && effectiveCredentialStatus(c) === "revoked");
                  // 3.2: stamp each credential's renewal count so the PDF can show it.
                  const withRenewals = collapsedCredentials.map((c) => ({ ...c, renewalCount: getRenewalCount(c) }));
                  const doExport = () => exportAllCredentialsToPDF(withRenewals, displayName);
                  if (revoked.length > 0) setExportWarn({ names: revoked.map((c) => c.credentialName), proceed: doExport });
                  else doExport();
                }}>
                  Export all
                </Button>
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 360px", minWidth: 0 }}>

          {/* Content */}
          <div className="holder-content">
            {loading && <SkeletonCardGrid count={6} />}
            {!loading && error && (
              <Card><p className="holder-state is-error">{error}</p></Card>
            )}
            {!loading && !error && filtered.length === 0 && (
              <Card flush>
                <EmptyState
                  icon={Inbox}
                  title={credentials.length === 0 ? "No credentials yet" : "No matches"}
                  message={
                    credentials.length === 0
                      ? "Credentials issued to you will appear here."
                      : "No credentials match your current filters."
                  }
                />
              </Card>
            )}

            {!loading && !error && filtered.length > 0 && view === "cards" && (
              <div className="holder-wallet-grid">
                {filtered.map((cred) => (
                  <Card key={cred._id} interactive className="holder-cred-card" onClick={() => handleCardClick(cred)}>
                    {cred.badgeImage ? (
                      <img src={cred.badgeImage} alt="" className="holder-cred-badge" />
                    ) : (
                      <div className="holder-cred-badge-fallback"><Award size={24} aria-hidden="true" /></div>
                    )}
                    <div className="holder-cred-name">{cred.credentialName}</div>
                    <StatusPill status={effectiveCredentialStatus(cred)} />
                    {(() => {
                      // D2: how many times this credential line (same template + same holder) was renewed.
                      const n = getRenewalCount(cred);
                      return n > 0 ? (
                        <span style={{ display: 'inline-block', marginTop: 4, fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-strong)' }} title="This credential has been renewed — open See History for the full timeline.">Renewed {n}×</span>
                      ) : null;
                    })()}
                    {cred.issuerName && <p className="holder-cred-issuer">{cred.issuerName}</p>}
                    {cred.savedToUserWalletAt && (
                      <p className="holder-cred-date">Issued {formatDate(cred.savedToUserWalletAt)}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {!loading && !error && filtered.length > 0 && view === "list" && (
              <div className="cc-table-wrap">
                <table className="cc-table">
                  <thead>
                    <tr>
                      <th>Credential</th>
                      <th>Issuer</th>
                      <th>Date issued</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((cred) => (
                      <tr key={cred._id} className="holder-row-clickable" onClick={() => handleCardClick(cred)}>
                        <td>{cred.credentialName}</td>
                        <td>{cred.issuerName || "N/A"}</td>
                        <td>{formatDate(cred.savedToUserWalletAt)}</td>
                        <td><StatusPill status={effectiveCredentialStatus(cred)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </div>
            {!loading && !error && credentials.length > 0 && (
              <NotesCard
                legend={[
                  { label: "Active", color: "var(--ok)", meaning: "valid and in force" },
                  { label: "Expired", color: "var(--warn)", meaning: "past its expiry date" },
                  { label: "Revoked", color: "var(--danger)", meaning: "cancelled by the issuer" },
                ]}
              />
            )}
          </div>
        </section>
      )}

      {/* ══════════════════ INSIGHTS TAB ══════════════════ */}
      {tab === "insights" && (
        <section className="holder-section holder-insights">
          {loading && <Card><SpinnerBlock label="Loading insights…" /></Card>}
          {!loading && error && <Card><p className="holder-state is-error">{error}</p></Card>}
          {!loading && !error && credentials.length === 0 && (
            <Card flush>
              <EmptyState icon={Activity} title="No insights yet" message="Once you have credentials, health and verification insights will appear here." />
            </Card>
          )}

          {hasCreds && (
            <>
              {/* Credential Health */}
              <Card>
                <CardHeaderRow icon={ShieldCheck} title="Credential Health" />
                <DonutChart slices={health.slices} centerValue={health.total} centerLabel="Credentials" showBreakdown />
                <InterpretationBox>{health.summary}</InterpretationBox>

                <div className="holder-note">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <p>
                    <strong>Before you share:</strong>{" "}
                    {health.revoked > 0
                      ? `${health.revoked} of your credentials are revoked — don't share these; a verifier will see them as invalid. `
                      : ""}
                    {health.expiringSoon > 0
                      ? `${health.expiringSoon} expire soon — if an employer checks after the expiry date, they'll see "expired." `
                      : ""}
                    Anyone you share with sees your credential's live blockchain status at the moment they check it — not the version you sent.
                  </p>
                </div>

                {renewal.alerts.length > 0 && (
                  <div className="holder-subsection">
                    <h4 className="holder-subhead">Renewal alerts</h4>
                    <div className="analytics-flag-list">
                      {renewal.alerts.map((a, i) => {
                        const expired = a.urgency === "expired";
                        const critical = a.urgency === "critical";
                        const pillColor = expired || critical ? "var(--danger)" : "var(--warn)";
                        return (
                          <div key={`${a.credentialName}-${i}`} className={`analytics-flag-row${expired ? " flagged" : ""}`}>
                            <div>
                              <div className="analytics-flag-issuer">{a.credentialName}</div>
                              <div className="analytics-flag-reason">
                                {a.issuerName}{a.credentialType ? ` • ${a.credentialType}` : ""}
                              </div>
                            </div>
                            <div className="holder-alert-actions">
                              <span className="analytics-flag-rate" style={{ color: pillColor, fontSize: 14 }}>
                                {expired ? `Expired ${Math.abs(a.daysLeft)}d ago` : `${a.daysLeft}d left`}
                              </span>
                              <Button size="sm" variant="secondary" onClick={() => handleCardClick(a.cred)}>View</Button>
                              {/* C11: ask the issuer to renew — they decide from their own records */}
                              {(() => {
                                // D5: only offer renewal when the credential is renewable. Default to
                                // showing it unless the issuer explicitly marked it non-renewable, so
                                // pre-existing credentials (no `renewable` field yet) keep working until
                                // the chaincode field ships.
                                if (a.cred?.renewable === false) return null;
                                const cid = String(a.cred?.blockchainId || a.cred?.credentialId || a.cred?.id || "");
                                const requested = renewalPending.has(cid);
                                return (
                                  <Button size="sm" variant="secondary" disabled={requested} onClick={() => handleRequestRenewal(a.cred)}>
                                    {requested ? "Renewal requested" : "Request renewal"}
                                  </Button>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {renewalActionError && (
                      <p style={{ color: "var(--danger)", fontSize: 12.5, margin: "6px 0 0" }}>{renewalActionError}</p>
                    )}
                    <InterpretationBox>{renewal.summary}</InterpretationBox>
                  </div>
                )}
              </Card>

              {/* Verification Insights */}
              <Card>
                <CardHeaderRow icon={GitBranch} title="Verification Insights" />

                {viLoading ? (
                  <SpinnerBlock label="Loading your verification activity…" minHeight={120} />
                ) : vinsights.totalChecks === 0 ? (
                  <>
                    <div className="analytics-chart-empty" style={{ height: 120 }}>No verifications yet.</div>
                    <InterpretationBox>{vinsights.summary}</InterpretationBox>
                  </>
                ) : (
                  <>
                    <div className="holder-trust-row">
                      <div className="holder-trust-stat">
                        <span className="holder-trust-num">{vinsights.totalChecks}</span>
                        <span className="holder-trust-label">Total checks</span>
                      </div>
                      <div className="holder-trust-stat">
                        <span className="holder-trust-num">{vinsights.distinctVerifiers}</span>
                        <span className="holder-trust-label">Distinct verifiers</span>
                      </div>
                      <div className="holder-trust-stat">
                        <span className="holder-trust-num" style={{ color: vinsights.allValid ? "var(--ok)" : "var(--warn)" }}>
                          {vinsights.allValid ? "All valid" : `${vinsights.validCount}/${vinsights.totalChecks}`}
                        </span>
                        <span className="holder-trust-label">Valid results</span>
                      </div>
                    </div>

                    {/* Outcome breakdown merged into the trust row — shown only when there's a
                        non-valid result (all-valid is already covered by "Valid results" above). */}
                    {vinsights.slices.length > 1 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', margin: '4px 0 8px', fontSize: 12.5 }}>
                        {vinsights.slices.map((s, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
                            <span>{s.name}</span>
                            <strong>{s.value}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {vinsights.mostChecked.length > 0 && (
                      <div className="holder-subsection">
                        <h4 className="holder-subhead">Most-checked credentials</h4>
                        <div className="analytics-flag-list">
                          {vinsights.mostChecked.map((m, i) => (
                            <div className={`analytics-flag-row${m.invalidCount > 0 ? " flagged" : ""}`} key={`mc-${m.credentialId || i}`}>
                              <div>
                                <div className="analytics-flag-issuer">{m.credentialName}</div>
                                <div className="analytics-flag-reason">
                                  {m.count}× checked
                                  {m.invalidCount > 0
                                    ? ` • ${m.invalidCount} flagged result${m.invalidCount > 1 ? "s" : ""}`
                                    : " • all valid"}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <InterpretationBox>{vinsights.summary}</InterpretationBox>
                  </>
                )}
              </Card>
            </>
          )}
        </section>
      )}

      {/* Per-credential verification detail lives in the See History → Verification Proof Trail
          (single home for "who checked this"); the most-checked list above is the overview. */}

      {/* ── Credential Detail Modal ── */}
      <Modal
        open={!!selectedCred}
        onClose={closeDetailModal}
        title={selectedCred?.credentialName}
        size="md"
        footer={
          selectedCred && (
            <>
              <Button variant="secondary" icon={ScrollText} onClick={() => handleSeeHistory(selectedCred)}>See history</Button>
              <Button variant="primary" icon={Download} onClick={() => {
                // D6: warn (styled modal) before exporting a revoked credential.
                const doExport = () => exportCredentialToPDF({ ...selectedCred, renewalCount: getRenewalCount(selectedCred) }, templateDetails);
                if (effectiveCredentialStatus(selectedCred) === "revoked") setExportWarn({ names: [selectedCred.credentialName], proceed: doExport });
                else doExport();
              }}>Export PDF</Button>
            </>
          )
        }
      >
        {selectedCred && (
          <>
            {templateLoading && <SpinnerBlock label="Loading details…" minHeight={80} />}

            {!templateLoading && templateDetails?.badgeImage && (
              <div className="holder-modal-badge">
                <img src={templateDetails.badgeImage} alt="" />
              </div>
            )}

            <div className="holder-detail-list">
              <div className="holder-detail-row">
                <span className="holder-detail-label">Type</span>
                <span className="holder-detail-value">{selectedCred.credentialType || "N/A"}</span>
              </div>
              <div className="holder-detail-row">
                <span className="holder-detail-label">Issuer</span>
                <span className="holder-detail-value">{selectedCred.issuerName || "N/A"}</span>
              </div>
              <div className="holder-detail-row">
                <span className="holder-detail-label">Status</span>
                <span className="holder-detail-value"><StatusPill status={effectiveCredentialStatus(selectedCred)} /></span>
              </div>
              <div className="holder-detail-row">
                <span className="holder-detail-label">Visibility</span>
                <span className="holder-detail-value">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={selectedCred.visibility === "public" ? Globe : Lock}
                    onClick={handleToggleVisibility}
                    disabled={visibilityLoading}
                    title="Click to change"
                  >
                    {visibilityLoading ? "Updating…" : (selectedCred.visibility === "public" ? "Public" : "Private")}
                  </Button>
                </span>
              </div>

              {(selectedCred.status === "revoked" || selectedCred.status === "REVOKED") && selectedCred.rejectionReason && (
                <div className="holder-detail-row">
                  <span className="holder-detail-label">Revocation reason</span>
                  <span className="holder-detail-value" style={{ color: "var(--danger)" }}>{selectedCred.rejectionReason}</span>
                </div>
              )}

              <div className="holder-detail-row">
                <span className="holder-detail-label">Issued on</span>
                <span className="holder-detail-value">{formatDate(selectedCred.savedToUserWalletAt)}</span>
              </div>
              <div className="holder-detail-row">
                <span className="holder-detail-label">Expiry date</span>
                <span className="holder-detail-value">{selectedCred.expiryDate ? formatDate(selectedCred.expiryDate) : "No Expiry"}</span>
              </div>
              <div className="holder-detail-row">
                <span className="holder-detail-label">Blockchain ID</span>
                <span className="holder-detail-value holder-mono" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span>{selectedCred.blockchainId || "N/A"}</span>
                  {selectedCred.blockchainId && (
                    <button
                      type="button"
                      onClick={async () => { const ok = await copyToClipboard(selectedCred.blockchainId); if (ok) { setCopiedId(true); setTimeout(() => setCopiedId(false), 1500); } }}
                      title="Copy credential ID"
                      aria-label="Copy credential ID"
                      style={{ background: "none", border: "1px solid var(--border-strong)", color: copiedId ? "var(--ok)" : "var(--text-muted)", borderRadius: 6, padding: "3px 6px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                    >
                      {copiedId ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                    </button>
                  )}
                </span>
              </div>

              {!templateLoading && templateDetails?.skills && templateDetails.skills.length > 0 && (
                <div className="holder-detail-row holder-detail-row--stack">
                  <span className="holder-detail-label">Skills</span>
                  <div className="holder-chips">
                    {templateDetails.skills.map((skill, i) => (
                      <span key={i} className="holder-chip">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* History (expands inside the modal) */}
            {historyOpen && (
              <div className="holder-history">
                <div className="holder-history-head">
                  <h4>Blockchain History</h4>
                  <button className="holder-history-close" onClick={closeHistoryModal} aria-label="Close history"><XCircle size={16} /></button>
                </div>

                {/* BCHIST2 + INSIGHT5: unified timeline (tx hash + reason) + proof trail */}
                <CredentialHistory
                  history={historyData?.history || []}
                  verificationLogs={myVerifications}
                  credentialId={selectedCred?.blockchainId || selectedCred?._id}
                  showProofTrail
                  loading={historyLoading}
                  error={historyError}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      {/* D6: styled revoked-in-export warning (replaces the raw browser confirm) */}
      <Modal
        open={!!exportWarn}
        onClose={() => setExportWarn(null)}
        title="Heads up — this includes a revoked credential"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExportWarn(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => { const w = exportWarn; setExportWarn(null); w?.proceed?.(); }}>Export anyway</Button>
          </>
        }
      >
        {exportWarn && (
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>
            <p style={{ margin: "0 0 10px" }}>
              This export includes a <strong>revoked</strong> credential:
            </p>
            <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
              {exportWarn.names.map((n, i) => (
                <li key={i} style={{ color: "var(--danger)", fontWeight: 600 }}>{n}</li>
              ))}
            </ul>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
              Anyone who verifies it on the blockchain will see it's revoked. You can still export it — just make sure that's intended.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* Small local header row for Insights cards (icon + title), token-driven. */
function CardHeaderRow({ icon: Icon, title }) {
  return (
    <div className="holder-card-headrow">
      {Icon && <Icon size={18} aria-hidden="true" />}
      <h3>{title}</h3>
    </div>
  );
}
