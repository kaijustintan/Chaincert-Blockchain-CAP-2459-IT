import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
import { useNavigate } from "react-router-dom";
import "../styles/issuerDashboardPage.css";

export default function CredentialHistoryPage() {
  const [searchId, setSearchId] = useState("");
  const [allHistory, setAllHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔧 FILTER STATES
  const [sortBy, setSortBy] = useState("timestamp-desc");
  const [filterAction, setFilterAction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // 🔧 METADATA FROM API
  const [totalCount, setTotalCount] = useState(0);
  const [isFiltered, setIsFiltered] = useState(false);

  // NEW: which field to search on (frontend-only)
  const [searchField, setSearchField] = useState("credentialId"); // "credentialId" | "holderId" | "holderName" | "credentialName"
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllHistory();
  }, []);

  // 🔧 APPLY LOCAL FILTERS WHENEVER ANY FILTER CHANGES
  useEffect(() => {
    let result = [...allHistory];

    // Filter by action
    if (filterAction !== "all") {
      result = result.filter((record) => getActionType(record) === filterAction);
    }

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter(
        (record) =>
          record.value?.status?.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // Filter by credential type
    if (filterType !== "all") {
      result = result.filter(
        (record) => record.value?.credentialType === filterType
      );
    }

    // NEW: local search by selected field
    const query = searchId.trim().toLowerCase();
    if (query) {
      result = result.filter((record) => {
        if (searchField === "credentialId") {
          const cid = (record.credentialId || "").toLowerCase();
          return cid.includes(query);
        }
        if (searchField === "holderId") {
          const hid = (record.value?.holderID || "").toLowerCase();
          return hid.includes(query);
        }
        if (searchField === "holderName") {
          const hname = (record.holderName || "").toLowerCase(); // NEW
          return hname.includes(query);
        }
        if (searchField === "credentialName") {
          const cname = (record.credentialName || "").toLowerCase();
          return cname.includes(query);
        }
        return true;
      });
    }

    // Apply sorting
    if (sortBy === "timestamp-desc") {
      result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortBy === "timestamp-asc") {
      result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (sortBy === "credentialId-asc") {
      result.sort((a, b) => a.credentialId.localeCompare(b.credentialId));
    } else if (sortBy === "credentialId-desc") {
      result.sort((a, b) => b.credentialId.localeCompare(a.credentialId));
    }

    setFilteredHistory(result);
  }, [
    allHistory,
    sortBy,
    filterAction,
    filterStatus,
    filterType,
    searchId,      // NEW dep
    searchField,   // NEW dep
  ]);

  // ✅ NEW: Simplified fetch using new API endpoint
  const fetchAllHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.Get_IssuerCredentialsHistory();

      console.log("Fetched history response:", response);

      setAllHistory(response.data || []);
      setTotalCount(response.count || 0);
      setIsFiltered(response.isFiltered || false);
      setSearchId("");
    } catch (err) {
      console.error("Error fetching history:", err);
      setError("Failed to fetch history: " + err.message);
      setAllHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: keep API call as-is, but let frontend handle multi-field search
  const handleSearch = async (e) => {
    e.preventDefault();

    // OPTIONAL: keep current backend search by credentialId if field is credentialId
    if (searchId.trim() && searchField === "credentialId") {
      try {
        setLoading(true);
        setError(null);

        const response = await apiService.Get_IssuerCredentialsHistory(
          searchId.trim()
        );

        console.log("Search result:", response);

        setAllHistory(response.data || []);
        setTotalCount(response.count || 0);
        setIsFiltered(response.isFiltered || false);
      } catch (err) {
        console.error("Search error:", err);
        setError(`Failed to fetch history for ${searchId}: ${err.message}`);
        setAllHistory([]);
      } finally {
        setLoading(false);
      }
    } else if (searchId.trim()) {
      // For holderId / holderName / credentialName, we just rely on local filtering.
      // No backend changes needed; allHistory stays as last loaded dataset.
      setIsFiltered(true);
    } else {
      fetchAllHistory();
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  // ✅ SIMPLIFIED: Determine action type from single record
  const getActionType = (record) => {
  if (!record || !record.value) return "Unknown";

  const value = record.value;

  // ✅ 1) Revoked should win over everything else
  if (value.status?.toLowerCase() === "revoked" || value.revokedAt) {
    return "Revoked";
  }

  // ✅ 2) Template creation
  if (value.isTemplate === true || (value.holderID === "" || !value.holderID)) {
    return "Created Template";
  }

  // ✅ 3) Issued
  if (value.holderID && value.assignedDate) {
    return "Issued";
  }

  // ✅ 4) Updated (if you really want this as a separate type)
  if (value.status?.toLowerCase() === "active" && value.holderID) {
    return "Updated";
  }

  return "Created";
};

  // 🔧 GET UNIQUE CREDENTIAL TYPES FOR FILTER
  const getUniqueCredentialTypes = () => {
    const types = new Set();
    allHistory.forEach((record) => {
      if (record.credentialType) {
        types.add(record.credentialType);
      }
    });
    return Array.from(types).sort();
  };

  // ✅ GET UNIQUE CREDENTIAL NAMES
  const getUniqueCredentialNames = () => {
    const names = new Set();
    allHistory.forEach((record) => {
      if (record.credentialName) {
        names.add(record.credentialName);
      }
    });
    return Array.from(names).sort();
  };

  /* CSS-CHANGE: helper to get action badge class name based on action type */
  const getActionBadgeClass = (action) => {
    switch (action) {
      case "Created Template": return "history-action-badge history-action-badge--created";
      case "Issued": return "history-action-badge history-action-badge--issued";
      case "Revoked": return "history-action-badge history-action-badge--revoked";
      default: return "history-action-badge history-action-badge--updated";
    }
  };

  /* CSS-CHANGE: helper to get action display text */
  const getActionDisplayText = (action) => {
    switch (action) {
      case "Created Template": return "✅ Created Template";
      case "Issued": return "📝 Issued";
      case "Revoked": return "❌ Revoked";
      default: return "🔄 Updated";
    }
  };

  /* CSS-CHANGE: helper to get status class and text */
  const getStatusInfo = (record) => {
  const rawStatus = record.value?.status || record.currentStatus || "";
  const status = String(rawStatus).toLowerCase();
  if (status === "revoked") return { className: "history-status history-status--revoked", text: "🔴 Revoked" };
  if (status === "active") return { className: "history-status history-status--active", text: "🟢 Active" };
  if (status === "issued") return { className: "history-status history-status--issued", text: "🟢 Issued" };
  return { className: "history-status history-status--unknown", text: "Status Unknown" };
};

  return (
    <div className="issuer-dashboard">
      <h2>🔍 Credential History (Blockchain Audit Trail)</h2>

      {/* CSS-CHANGE: Return to Dashboard button - polo */}
        <button className="btn-return-dashboard" onClick={() => navigate("/issuer/dashboard")}>
          ← Return to Dashboard
        </button>

      {/* CSS-CHANGE: replaced inline style div with className */}
      <div className="history-search-container">
        <form
          onSubmit={handleSearch}
          className="history-search-form" /* CSS-CHANGE: replaced inline style */
        >
          {/* NEW: dropdown to pick which field to search */}
          {/* CSS-CHANGE: replaced inline style with className */}
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="history-search-select" /* CSS-CHANGE: replaced inline style */
          >
            <option value="credentialId">Credential ID</option>
            <option value="holderId">Holder ID</option>
            <option value="holderName">Holder Name</option> {/* NEW */}
            <option value="credentialName">Credential Name</option>
          </select>

          {/* CSS-CHANGE: replaced inline style with className */}
          <input
            type="text"
            placeholder={
              searchField === "credentialId"
                ? "Search by credential ID (e.g., cred_1770034187089_16z191x77)"
                : searchField === "holderId"
                ? "Search by holder ID"
                : searchField === "holderName"
                ? "Search by holder name"
                : "Search by credential name"
            }
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="history-search-input" /* CSS-CHANGE: replaced inline style */
          />
          {/* CSS-CHANGE: replaced className="create-btn" with themed button class */}
          <button
            type="submit"
            className="history-search-btn history-search-btn--primary"
            disabled={loading}
          >
            {loading ? "🔄 Loading..." : "🔍 Search"}
          </button>
          {/* CSS-CHANGE: replaced inline style background with themed class */}
          <button
            type="button"
            onClick={fetchAllHistory}
            className="history-search-btn history-search-btn--success"
            disabled={loading}
          >
            Show All
          </button>
        </form>
        {/* CSS-CHANGE: replaced inline style with className */}
        <p className="history-search-hint">
          💡{" "}
          {isFiltered && searchId.trim()
            ? `Showing filtered history for ${searchField}: ${searchId}`
            : "Showing complete blockchain history for all credentials sorted by most recent activity"}
        </p>
      </div>

      {/* 🔧 FILTER SECTION */}
      {/* CSS-CHANGE: replaced inline styles with classNames */}
      {!loading && allHistory.length > 0 && (
        <div className="history-filter-section">
          <h4 className="history-filter-title">
            🔎 Filter & Sort History
          </h4>
          <div className="history-filter-grid">
            {/* Action Filter */}
            <div className="history-filter-group">
              <label className="history-filter-label">
                Action
              </label>
              {/* CSS-CHANGE: replaced inline style with className */}
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="history-filter-select"
              >
                <option value="all">All Actions</option>
                <option value="Created Template">✅ Created Template</option>
                <option value="Issued">📝 Issued</option>
                <option value="Revoked">❌ Revoked</option>
                <option value="Updated">🔄 Updated</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="history-filter-group">
              <label className="history-filter-label">
                Status
              </label>
              {/* CSS-CHANGE: replaced inline style with className */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="history-filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="active">🟢 Active</option>
                <option value="issued">🟢 Issued</option>
                <option value="revoked">🔴 Revoked</option>
              </select>
            </div>

            {/* Credential Type Filter */}
            <div className="history-filter-group">
              <label className="history-filter-label">
                Credential Type
              </label>
              {/* CSS-CHANGE: replaced inline style with className */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="history-filter-select"
              >
                <option value="all">All Types</option>
                {getUniqueCredentialTypes().map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="history-filter-group">
              <label className="history-filter-label">
                Sort By
              </label>
              {/* CSS-CHANGE: replaced inline style with className */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="history-filter-select"
              >
                <option value="timestamp-desc">📅 Most Recent</option>
                <option value="timestamp-asc">📅 Oldest First</option>
                <option value="credentialId-asc">
                  🔤 Credential ID (A-Z)
                </option>
                <option value="credentialId-desc">
                  🔤 Credential ID (Z-A)
                </option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* CSS-CHANGE: replaced inline style with className */}
      {error && (
        <div className="history-error-box">
          ❌ {error}
        </div>
      )}

      {/* CSS-CHANGE: replaced inline style with className */}
      {loading && (
        <div className="history-loading">
          <h3>⏳ Fetching blockchain history...</h3>
        </div>
      )}

      {!loading && filteredHistory.length > 0 && (
        <>
          {/* CSS-CHANGE: replaced inline style with className */}
          <div className="history-stats-box">
            <strong>
              📊 Showing {filteredHistory.length} of {totalCount} transaction(s)
            </strong>
            <br />
            <small>Filtered and sorted by selected criteria</small>
          </div>

         {/* Wrapped in scrollable container, full IDs shown */}
         <div className="table-container" style={{ overflowX: "auto" }}>
         <table className="template-table" style={{ minWidth: 1100 }}>
  <thead>
    <tr>
      <th>Timestamp</th>
      <th>Action</th>
      <th>Credential Name</th>
      <th>Credential Type</th>
      <th>Status</th>
      <th>Holder Name</th>
      <th>Holder ID</th>
      <th>Credential ID</th>
      <th>Transaction ID</th>
    </tr>
  </thead>

  <tbody>
    {filteredHistory.map((record, index) => {
      const action = getActionType(record);
      const statusInfo = getStatusInfo(record);

      return (
        <tr key={`${record.credentialId}-${record.txId}-${index}`}>
          <td style={{ whiteSpace: "nowrap" }}>{formatDate(record.timestamp)}</td>

          <td>
            <span className={getActionBadgeClass(action)}>
              {getActionDisplayText(action)}
            </span>
          </td>

          <td>
            <strong>{record.credentialName || "N/A"}</strong>
          </td>

          <td>{record.credentialType || "N/A"}</td>

          <td>
            <span className={statusInfo.className}>
              {statusInfo.text}
            </span>
          </td>

          <td>{record.holderName || "N/A"}</td>

          {/* /Full Holder ID — no truncation */}
          <td className="history-mono-cell" style={{ whiteSpace: "nowrap" }}>
            {record.value?.holderID || "N/A"}
          </td>

          {/* Full Credential ID — no truncation */}
          <td className="history-mono-cell" style={{ whiteSpace: "nowrap" }}>
            {record.credentialId || "N/A"}
          </td>

          {/* Full Tx ID — no truncation */}
          <td className="history-mono-cell" style={{ whiteSpace: "nowrap" }}>
            {record.txId || "N/A"}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
</div>
        </>
      )}

      {/* CSS-CHANGE: replaced inline style with className */}
      {!loading &&
        allHistory.length > 0 &&
        filteredHistory.length === 0 && (
          <div className="history-empty">
            <p>
              No records match your filters. Try adjusting the filter options.
            </p>
          </div>
        )}

      {/* CSS-CHANGE: replaced inline style with className */}
      {!loading && allHistory.length === 0 && (
        <div className="history-empty">
          <p>
            No history found.{" "}
            {isFiltered
              ? "Try a different credential ID."
              : "Issue some credentials first!"}
          </p>
        </div>
      )}
    </div>
  );
}