// ==========================================================================================================================================================================
//                                                               studentDashboard.js
// ==========================================================================================================================================================================

/* [ OUTLINE ]
  =====================================================================
  FILE: studentDashboard.js
  TECHNICAL: Student/user dashboard — displays credentials from CouchDB (wallet_user_credentials)
  TROPA: Personal credential wallet ng student. Dito niya makikita lahat ng credentials na na-issue sa kanya.
  =====================================================================

  CHANGES FROM STATIC → DYNAMIC (// - polo):
  - Removed MOCK_CREDENTIALS static array
  - Added useEffect to fetch real credentials from CouchDB via apiService.Get_UserCredentials(holderID)
  - holderID pulled from localStorage "user" object (same pattern as issuerDashboardPage.js)
  - Added loading + error states
  - UI: credential name only on cards (first sight), click → modal with full details + See History
  - See History uses apiService.Get_CredentialHistoryById (same as admin dashboard)
*/

import React, { useState, useEffect, useMemo } from "react";
import apiService from "../services/apiService";
import "../styles/studentDashboard.css";

// ==========================================================================================================================================================================
// HELPERS
// ==========================================================================================================================================================================

const formatDate = (iso) => {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
};

/*
  StatusPill
  Technical: Maps CouchDB status values to display pills
  CouchDB uses "issued" but we display as "Active" for readability
  // - polo
*/
const StatusPill = ({ status }) => {
  const normalized = status === "issued" ? "active" : status;
  return (
    <span className={`status-pill ${normalized}`}>
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </span>
  );
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* UI state */
  const [view, setView] = useState("cards");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  /* Credential detail modal
     Technical: selectedCred holds the full CouchDB doc when user clicks a card
     // - polo
  */
  const [selectedCred, setSelectedCred] = useState(null);
  // - polo: stores skills + badgeImage fetched from issuer's template
  const [templateDetails, setTemplateDetails] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  /* See History modal (inside detail modal)
     Technical: Same pattern as admin dashboard See History
     // - polo
  */
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ── Fetch credentials on mount ─────────────────────────────────────────────

  /*
    Technical:
    On component mount, reads logged-in user from localStorage (same as issuerDashboardPage.js line 78)
    then calls apiService.Get_UserCredentials(holderID) to fetch from CouchDB.

    Tropang Ex:
    Pagload ng dashboard, kunin agad yung credentials ni student.

    // - polo
  */
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setLoading(true);
        setError(null);

        /* Step 1: Get logged-in user from localStorage
           Technical: Same pattern as issuerDashboardPage.js
           // - polo
        */
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user._id) {
          setError("User session not found. Please log in again.");
          setLoading(false);
          return;
        }

        const holderID = user._id;
        console.log("[STUDENT DASHBOARD] Fetching credentials for holder:", holderID); // - polo

        /* Step 2: Fetch from CouchDB via apiService
           // - polo
        */
        const data = await apiService.Get_UserCredentials(holderID);
        console.log("[STUDENT DASHBOARD] Credentials fetched:", data?.length); // - polo

        setCredentials(Array.isArray(data) ? data : []);

      } catch (err) {
        console.error("[STUDENT DASHBOARD] Error fetching credentials:", err);
        setError("Failed to load credentials. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, []);

  // ── Filter logic ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return credentials.filter((c) => {
      const searchable = [c.credentialName, c.credentialType, c.issuerName].join(" ").toLowerCase();
      const matchesQ = searchable.includes(query.toLowerCase());
      /* Technical: CouchDB uses "issued" status, normalize for filter comparison
         // - polo
      */
      const normalizedStatus = c.status === "issued" ? "active" : c.status;
      const matchesS = statusFilter === "all" ? true : normalizedStatus === statusFilter;
      return matchesQ && matchesS;
    });
  }, [credentials, query, statusFilter]);

  // ── See History handler ────────────────────────────────────────────────────

  /*
    Technical:
    Same flow as admin dashboard "See History" button.
    Uses apiService.Get_CredentialHistoryById(blockchainId)
    blockchainId is stored as cred.blockchainId in wallet_user_credentials docs.

    // - polo
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

      console.log("[STUDENT DASHBOARD] Fetching history for:", blockchainId); // - polo
      const result = await apiService.Get_CredentialHistoryById(blockchainId);
      setHistoryData(result);

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
        // extract templateId: first 2 underscore-separated parts of blockchainId
        // e.g. cred_1772386809672_bjmh2b0hs_holderID_timestamp → cred_1772386809672_bjmh2b0hs
        const parts = (cred.blockchainId || '').split('_');
        const templateId = parts.slice(0, 3).join('_'); // cred_TIMESTAMP_RANDOMID
        const match = templates.find(t => t._id === templateId || t.id === templateId);
        if (match) setTemplateDetails(match);
      }
    } catch (err) {
      console.error('[STUDENT DASHBOARD] Failed to fetch template details:', err);
    } finally {
      setTemplateLoading(false);
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-container">

      {/* Header */}
      <div className="dashboard-header">
        <h1>My Credentials</h1>
        <div className="view-toggle">
          <button className={view === "cards" ? "active" : ""} onClick={() => setView("cards")}>
            Cards
          </button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
            List
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <input
          type="text"
          placeholder="Search credential name, type, issuer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {/* Content */}
      <div className="content">

        {/* Loading state */}
        {loading && (
          <div className="empty-card">Loading credentials...</div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="empty-card error">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="empty-card">
            {credentials.length === 0
              ? "No credentials have been issued to you yet."
              : "No credentials match your filters."}
          </div>
        )}

        {/* Cards view
            Technical: Shows credential name + status only on first sight (per Kyle)
            Click → opens detail modal
            // - polo
        */}
        {!loading && !error && filtered.length > 0 && view === "cards" && (
          <div className="card-grid">
            {filtered.map((cred) => (
              <div
                key={cred._id}
                className="cred-card clickable"
                onClick={() => handleCardClick(cred)}
              >
                {cred.badgeImage ? (
                  <img src={cred.badgeImage} alt="badge" style={{width: 64, height: 64, objectFit: 'cover', borderRadius: 8, marginBottom: 8}} />
                ) : (
                  <div className="cred-card-icon">🎓</div>
                )}
                <div className="cred-card-name">{cred.credentialName}</div>
                <StatusPill status={cred.status} />
                {cred.issuerName && <p className="cred-card-issuer">{cred.issuerName}</p>}
                {cred.savedToUserWalletAt && <p className="cred-card-date">Issued {formatDate(cred.savedToUserWalletAt)}</p>}
              </div>
            ))}
          </div>
        )}

        {/* List view
            Technical: Shows credential name + status only (per Kyle), click for details
            // - polo
        */}
        {!loading && !error && filtered.length > 0 && view === "list" && (
          <table className="cred-table">
            <thead>
              <tr>
                <th>Credential Name</th>
                <th>Issuer</th>
                <th>Date Issued</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cred) => (
                <tr
                  key={cred._id}
                  className="clickable-row"
                  onClick={() => handleCardClick(cred)}
                >
                  <td>{cred.credentialName}</td>
                  <td>{cred.issuerName || 'N/A'}</td>
                  <td>{formatDate(cred.savedToUserWalletAt)}</td>
                  <td><StatusPill status={cred.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Credential Detail Modal ──────────────────────────────────────────
          Technical: Shows full details of selected credential
          Kapag pinindot yung card → lalabas ito (per Kyle's Credly-style UX)
          // - polo
      */}
      {selectedCred && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <h2>{selectedCred.credentialName}</h2>
              <button className="close-btn" onClick={closeDetailModal}>✕</button>
            </div>

            <div className="modal-body">
              {/* Badge image from template - polo */}
              {templateLoading && <p style={{textAlign:'center', opacity:0.7}}>Loading details...</p>}
              {!templateLoading && templateDetails?.badgeImage && (
                <div style={{textAlign:'center', marginBottom:16}}>
                  <img
                    src={templateDetails.badgeImage}
                    alt="badge"
                    style={{width:96, height:96, objectFit:'cover', borderRadius:12}}
                  />
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Type</span>
                <span className="detail-value">{selectedCred.credentialType || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Issuer</span>
                <span className="detail-value">{selectedCred.issuerName || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value"><StatusPill status={selectedCred.status} /></span>
              </div>
              {(selectedCred.status === "revoked" || selectedCred.status === "REVOKED") && selectedCred.rejectionReason && (
                <div className="detail-row">
                  <span className="detail-label">Rejection Reason</span>
                  <span className="detail-value" style={{color: "#ff6b6b"}}>{selectedCred.rejectionReason}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Issued On</span>
                <span className="detail-value">{formatDate(selectedCred.savedToUserWalletAt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Expiry Date</span>
                <span className="detail-value">{formatDate(selectedCred.expiryDate)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Blockchain ID</span>
                <span className="detail-value mono">{selectedCred.blockchainId || "N/A"}</span>
              </div>
            {/* Skills from template - polo */}
              {!templateLoading && templateDetails?.skills && templateDetails.skills.length > 0 && (
                <div className="detail-row" style={{flexDirection:'column', alignItems:'flex-start', gap:8}}>
                  <span className="detail-label">Skills</span>
                  <div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:4}}>
                    {templateDetails.skills.map((skill, i) => (
                      <span key={i} style={{
                        background:'rgba(139,92,246,0.2)',
                        border:'1px solid rgba(139,92,246,0.4)',
                        borderRadius:20,
                        padding:'3px 12px',
                        fontSize:'0.8rem',
                        color:'#c4b5fd'
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* See History button — same as admin dashboard
                Technical: Calls Get_CredentialHistoryById using cred.blockchainId
                // - polo
            */}
            <div className="modal-footer">
              <button
                className="action-btn history"
                onClick={() => handleSeeHistory(selectedCred)}
              >
                📜 See History
              </button>
            </div>

            {/* History section (inside detail modal)
                // - polo
            */}
            {historyOpen && (
              <div className="history-section">
                <div className="history-header">
                  <h3>Blockchain History</h3>
                  <button className="close-btn small" onClick={closeHistoryModal}>✕</button>
                </div>

                {historyLoading && <p className="history-loading">Loading history...</p>}
                {historyError && <p className="history-error">{historyError}</p>}

                {historyData && historyData.history && (
                  <div className="history-list">
                    {historyData.history.map((entry, idx) => (
                      <div key={idx} className="history-entry">
                        <div className="history-entry-header">
                          <span className="history-tx-id">{entry.txId || `TX-${idx + 1}`}</span>
                          <span className="history-timestamp">
                            {entry.timestamp ? formatDate(entry.timestamp) : "N/A"}
                          </span>
                        </div>
                        <div className="history-entry-status">
                          Status: <strong>{entry.value?.status || entry.status || "N/A"}</strong>
                        </div>
                        {(entry.value?.status === "revoked" || entry.status === "revoked") && (entry.value?.rejectionReason || entry.rejectionReason) && (
                          <div className="history-entry-status" style={{color: "#ff6b6b"}}>
                            Rejection Reason: <strong>{entry.value?.rejectionReason || entry.rejectionReason}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}