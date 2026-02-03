import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
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

  useEffect(() => {
    fetchAllHistory();
  }, []);

  // 🔧 APPLY LOCAL FILTERS WHENEVER ANY FILTER CHANGES
  useEffect(() => {
    let result = [...allHistory];

    // Filter by action
    if (filterAction !== "all") {
      result = result.filter(record => getActionType(record) === filterAction);
    }

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter(record => 
        record.value?.status?.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // Filter by credential type
    if (filterType !== "all") {
      result = result.filter(record => 
        record.value?.credentialType === filterType
      );
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
  }, [allHistory, sortBy, filterAction, filterStatus, filterType]);

  // ✅ NEW: Simplified fetch using new API endpoint
  const fetchAllHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Call new API endpoint - returns pre-sorted, flattened history
      const response = await apiService.Get_IssuerCredentialsHistory();
      
      console.log("Fetched history response:", response);

      // ✅ Backend already returns sorted + flattened data
      setAllHistory(response.data || []);
      setTotalCount(response.count || 0);
      setIsFiltered(response.isFiltered || false);
      setSearchId(""); // Clear search when showing all

    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to fetch history: ' + err.message);
      setAllHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Simplified search using new API endpoint
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (searchId.trim()) {
      try {
        setLoading(true);
        setError(null);

        // ✅ Call API with credentialId filter
        const response = await apiService.Get_IssuerCredentialsHistory(searchId.trim());
        
        console.log('Search result:', response);

        // ✅ Backend returns filtered results
        setAllHistory(response.data || []);
        setTotalCount(response.count || 0);
        setIsFiltered(response.isFiltered || false);

      } catch (err) {
        console.error('Search error:', err);
        setError(`Failed to fetch history for ${searchId}: ${err.message}`);
        setAllHistory([]);
      } finally {
        setLoading(false);
      }
    } else {
      // Empty search → show all
      fetchAllHistory();
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // ✅ SIMPLIFIED: Determine action type from single record
  const getActionType = (record) => {
    if (!record || !record.value) return "Unknown";

    const value = record.value;
    
    // Check if this is a template creation (no holderID)
    if (value.isTemplate === true || (value.holderID === "" || !value.holderID)) {
      return "Created Template";
    }
    
    // Check if this is credential issuance (has holderID and assignedDate)
    if (value.holderID && value.assignedDate) {
      return "Issued";
    }
    
    // Check if revoked
    if (value.status === 'revoked' || value.revokedAt) {
      return "Revoked";
    }
    
    // Check if updated
    if (value.status === 'active' && value.holderID) {
      return "Updated";
    }

    return "Created";
  };

  // 🔧 GET UNIQUE CREDENTIAL TYPES FOR FILTER
  const getUniqueCredentialTypes = () => {
    const types = new Set();
    allHistory.forEach(record => {
      if (record.credentialType) {
        types.add(record.credentialType);
      }
    });
    return Array.from(types).sort();
  };

  // ✅ GET UNIQUE CREDENTIAL NAMES
  const getUniqueCredentialNames = () => {
    const names = new Set();
    allHistory.forEach(record => {
      if (record.credentialName) {
        names.add(record.credentialName);
      }
    });
    return Array.from(names).sort();
  };

  return (
    <div className="issuer-dashboard">
      <h2>🔍 Credential History (Blockchain Audit Trail)</h2>

      <div style={{ marginBottom: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search by credential ID (e.g., cred_1770034187089_16z191x77)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
          <button
            type="submit"
            className="create-btn"
            disabled={loading}
          >
            {loading ? '🔄 Loading...' : '🔍 Search'}
          </button>
          <button
            type="button"
            onClick={fetchAllHistory}
            className="create-btn"
            disabled={loading}
            style={{ background: '#28a745' }}
          >
            Show All
          </button>
        </form>
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          💡 {isFiltered 
            ? `Showing filtered history for: ${searchId}` 
            : 'Showing complete blockchain history for all credentials sorted by most recent activity'}
        </p>
      </div>

      {/* 🔧 FILTER SECTION */}
      {!loading && allHistory.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#f0f8ff',
          borderRadius: '8px',
          border: '1px solid #cce5ff'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px' }}>🔎 Filter & Sort History</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            {/* Action Filter */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                Action
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Actions</option>
                <option value="Created Template">✅ Created Template</option>
                <option value="Issued">📝 Issued</option>
                <option value="Revoked">❌ Revoked</option>
                <option value="Updated">🔄 Updated</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">🟢 Active</option>
                <option value="issued">🟢 Issued</option>
                <option value="revoked">🔴 Revoked</option>
              </select>
            </div>

            {/* Credential Type Filter */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                Credential Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Types</option>
                {getUniqueCredentialTypes().map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="timestamp-desc">📅 Most Recent</option>
                <option value="timestamp-asc">📅 Oldest First</option>
                <option value="credentialId-asc">🔤 Credential ID (A-Z)</option>
                <option value="credentialId-desc">🔤 Credential ID (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '15px', background: '#fee', borderRadius: '8px', color: '#c00', marginBottom: '20px' }}>
          ❌ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>⏳ Fetching blockchain history...</h3>
        </div>
      )}

      {!loading && filteredHistory.length > 0 && (
        <>
          <div style={{ marginBottom: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '8px' }}>
            <strong>📊 Showing {filteredHistory.length} of {totalCount} transaction(s)</strong>
            <br />
            <small>Filtered and sorted by selected criteria</small>
          </div>

          <table className="template-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Credential Name</th>
                <th>Credential Type</th>
                <th>Status</th>
                <th>Holder ID</th>
                <th>Credential ID</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((record, index) => {
                const action = getActionType(record);

                return (
                  <tr key={`${record.credentialId}-${record.txId}-${index}`}>
                    <td>{formatDate(record.timestamp)}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: 
                          action === 'Created Template' ? '#d4edda' :
                          action === 'Issued' ? '#cfe2ff' :
                          action === 'Revoked' ? '#f8d7da' : '#fff3cd',
                        color: 
                          action === 'Created Template' ? '#155724' :
                          action === 'Issued' ? '#084298' :
                          action === 'Revoked' ? '#721c24' : '#856404'
                      }}>
                        {action === 'Created Template' ? '✅ Created Template' :
                          action === 'Issued' ? '📝 Issued' :
                          action === 'Revoked' ? '❌ Revoked' : '🔄 Updated'}
                      </span>
                    </td>
                    <td><strong>{record.credentialName || 'N/A'}</strong></td>
                    <td>{record.credentialType || 'N/A'}</td>
                    <td>
                      {record.currentStatus === 'active' || record.value?.status === 'active' ?
                        <span style={{ color: 'green', fontWeight: 'bold' }}>🟢 Active</span> :
                        record.currentStatus === 'issued' || record.value?.status === 'issued' ?
                        <span style={{ color: 'green', fontWeight: 'bold' }}>🟢 Issued</span> :
                        <span style={{ color: 'red', fontWeight: 'bold' }}>🔴 Revoked</span>
                      }
                    </td>
                    <td>{record.value?.holderID || 'N/A'}</td>
                    <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                      {record.credentialId.substring(0, 20)}...
                    </td>
                    <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                      {record.txId.substring(0, 12)}...
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {!loading && allHistory.length > 0 && filteredHistory.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No records match your filters. Try adjusting the filter options.</p>
        </div>
      )}

      {!loading && allHistory.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No history found. {isFiltered ? 'Try a different credential ID.' : 'Issue some credentials first!'}</p>
        </div>
      )}
    </div>
  );
}
