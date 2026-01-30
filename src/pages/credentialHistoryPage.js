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

  useEffect(() => {
    fetchAllHistory();
  }, []);

  // 🔧 APPLY FILTERS WHENEVER ANY FILTER CHANGES
  useEffect(() => {
    let result = [...allHistory];

    // Filter by action
    if (filterAction !== "all") {
      result = result.filter(record => getActionType(allHistory, allHistory.indexOf(record)) === filterAction);
    }

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter(record => record.value?.status === filterStatus.toLowerCase());
    }

    // Filter by credential type
    if (filterType !== "all") {
      result = result.filter(record => record.value?.credentialType === filterType);
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

  const fetchAllHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const credentials = await apiService.getAllCredentials();
      console.log("Fetched credentials:", credentials);

      if (!credentials || credentials.length === 0) {
        setAllHistory([]);
        setLoading(false);
        return;
      }

      const allHistories = [];

      for (const cred of credentials) {
        try {
          const credId = cred.id || cred.credentialId;
          const data = await apiService.Get_CredentialTemplateOrIssuedCredentialHistory(credId);
          console.log(`Raw history for ${credId}:`, data);

          const recordsWithId = data.map(record => {
            let timestamp;

            if (record.Timestamp && record.Timestamp.seconds) {
              timestamp = new Date(record.Timestamp.seconds * 1000).toISOString();
            } else if (record.timestamp) {
              timestamp = record.timestamp;
            } else {
              timestamp = new Date().toISOString();
            }

            let value = record.value;
            if (typeof value === 'string') {
              value = JSON.parse(value);
            } else if (record.Value) {
              value = typeof record.Value === 'string' ? JSON.parse(record.Value.toString()) : record.Value;
            }

            return {
              credentialId: credId,
              timestamp: timestamp,
              txId: record.txId || record.TxId || 'unknown',
              value: value,
              isDeleted: record.isDelete || record.IsDelete || false
            };
          });

          allHistories.push(...recordsWithId);
        } catch (err) {
          console.error(`Error fetching history for ${cred.id}:`, err);
        }
      }

      const sortedHistory = allHistories.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      console.log("All sorted history:", sortedHistory);
      setAllHistory(sortedHistory);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to fetch history: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      try {
        setLoading(true);
        setError(null);

        const data = await apiService.Get_CredentialTemplateOrIssuedCredentialHistory(searchId.trim());
        console.log('Search result:', data);

        const sortedHistory = data.map(record => {
          let timestamp;
          if (record.Timestamp && record.Timestamp.seconds) {
            timestamp = new Date(record.Timestamp.seconds * 1000).toISOString();
          } else if (record.timestamp) {
            timestamp = record.timestamp;
          } else {
            timestamp = new Date().toISOString();
          }

          let value = record.value;
          if (typeof value === 'string') {
            value = JSON.parse(value);
          } else if (record.Value) {
            value = typeof record.Value === 'string' ? JSON.parse(record.Value.toString()) : record.Value;
          }

          return {
            credentialId: searchId.trim(),
            timestamp: timestamp,
            txId: record.txId || record.TxId || 'unknown',
            value: value,
            isDeleted: record.isDelete || record.IsDelete || false
          };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setAllHistory(sortedHistory);
      } catch (err) {
        console.error('Search error:', err);
        setError(`Failed to fetch history for ${searchId}: ${err.message}`);
        setAllHistory([]);
      } finally {
        setLoading(false);
      }
    } else {
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

  // 🔧 FIXED: Added safety checks for undefined records
  const getActionType = (records, currentIndex) => {
    if (!records || records.length === 0 || currentIndex < 0 || currentIndex >= records.length) {
      return "Created";
    }

    const currentRecord = records[currentIndex];
    if (!currentRecord || !currentRecord.credentialId) {
      return "Created";
    }

    const currentCredId = currentRecord.credentialId;
    const previousRecord = records.slice(currentIndex + 1).find(r => r && r.credentialId === currentCredId);

    if (!previousRecord) return "Created";
    if (previousRecord.value?.status === 'active' && currentRecord.value?.status === 'revoked') return "Revoked";
    return "Updated";
  };

  // 🔧 GET UNIQUE CREDENTIAL TYPES FOR FILTER
  const getUniqueCredentialTypes = () => {
    const types = new Set();
    allHistory.forEach(record => {
      if (record.value?.credentialType) {
        types.add(record.value.credentialType);
      }
    });
    return Array.from(types).sort();
  };

  return (
    <div className="issuer-dashboard">
      <h2>🔍 Credential History (Blockchain Audit Trail)</h2>

      <div style={{ marginBottom: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search specific credential (e.g., CRED002) or leave empty to see all"
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
          💡 Showing complete blockchain history for all credentials sorted by most recent activity
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
                <option value="Created">✅ Created</option>
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
                <option value="Active">🟢 Active</option>
                <option value="Revoked">🔴 Revoked</option>
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
          {error}
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
            <strong>📊 Showing {filteredHistory.length} of {allHistory.length} transaction(s)</strong>
            <br />
            <small>Filtered and sorted by selected criteria</small>
          </div>

          <table className="template-table">
            <thead>
              <tr>
                <th>Credential ID</th>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Status</th>
                <th>Credential Type</th>
                <th>Holder ID</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((record, index) => {
                // 🔧 FIXED: Use findIndex to safely get the correct record index
                const recordIndex = allHistory.findIndex(r => r.txId === record.txId && r.credentialId === record.credentialId);
                const action = getActionType(allHistory, recordIndex);

                return (
                  <tr key={`${record.credentialId}-${record.txId}-${index}`}>
                    <td><strong>{record.credentialId}</strong></td>
                    <td>{formatDate(record.timestamp)}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: action === 'Created' ? '#d4edda' :
                          action === 'Revoked' ? '#f8d7da' : '#fff3cd',
                        color: action === 'Created' ? '#155724' :
                          action === 'Revoked' ? '#721c24' : '#856404'
                      }}>
                        {action === 'Created' ? '✅ Created' :
                          action === 'Revoked' ? '❌ Revoked' : '🔄 Updated'}
                      </span>
                    </td>
                    <td>
                      {record.value?.status === 'active' ?
                        <span style={{ color: 'green', fontWeight: 'bold' }}>🟢 Active</span> :
                        <span style={{ color: 'red', fontWeight: 'bold' }}>🔴 Revoked</span>
                      }
                    </td>
                    <td>{record.value?.credentialType || 'N/A'}</td>
                    <td>{record.value?.holderID || 'N/A'}</td>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      {record.txId.substring(0, 16)}...
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
          <p>No history found. Issue some credentials first!</p>
        </div>
      )}
    </div>
  );
}
