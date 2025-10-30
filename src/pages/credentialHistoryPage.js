import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
import "../styles/issuerDashboardPage.css";

export default function CredentialHistoryPage() {
  const [searchId, setSearchId] = useState("");
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllHistory();
  }, []);

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
          const data = await apiService.getCredentialHistory(credId);
          console.log(`Raw history for ${credId}:`, data);
          
          // ✅ FIX: Handle different timestamp formats
          const recordsWithId = data.map(record => {
            let timestamp;
            
            // Check if Timestamp exists and has seconds
            if (record.Timestamp && record.Timestamp.seconds) {
              timestamp = new Date(record.Timestamp.seconds * 1000).toISOString();
            } 
            // Check if timestamp is already a string
            else if (record.timestamp) {
              timestamp = record.timestamp;
            }
            // Fallback to current time
            else {
              timestamp = new Date().toISOString();
            }
            
            // Parse value if it's a string
            let value = record.value;
            if (typeof value === 'string') {
              value = JSON.parse(value);
            } else if (record.Value) {
              // Handle capital V
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
        
        const data = await apiService.getCredentialHistory(searchId.trim());
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

  const getActionType = (records, currentIndex) => {
    const currentCredId = records[currentIndex].credentialId;
    const previousRecord = records.slice(currentIndex + 1).find(r => r.credentialId === currentCredId);
    
    if (!previousRecord) return "Created";
    if (previousRecord.value?.status === 'active' && records[currentIndex].value?.status === 'revoked') return "Revoked";
    return "Updated";
  };

  return (
    <div className="issuer-dashboard">
      <h2>🔍 Credential History (Blockchain Audit Trail)</h2>
      
      <div style={{marginBottom: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px'}}>
        <form onSubmit={handleSearch} style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
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
            style={{background: '#28a745'}}
          >
            Show All
          </button>
        </form>
        <p style={{marginTop: '10px', color: '#666', fontSize: '14px'}}>
          💡 Showing complete blockchain history for all credentials sorted by most recent activity
        </p>
      </div>

      {error && (
        <div style={{padding: '15px', background: '#fee', borderRadius: '8px', color: '#c00', marginBottom: '20px'}}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{textAlign: 'center', padding: '40px'}}>
          <h3>⏳ Fetching blockchain history...</h3>
        </div>
      )}

      {!loading && allHistory.length > 0 && (
        <>
          <div style={{marginBottom: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '8px'}}>
            <strong>📊 Showing {allHistory.length} transaction(s) across all credentials</strong>
            <br />
            <small>Sorted by most recent activity first</small>
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
              {allHistory.map((record, index) => {
                const action = getActionType(allHistory, index);
                
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
                        <span style={{color: 'green', fontWeight: 'bold'}}>Active</span> : 
                        <span style={{color: 'red', fontWeight: 'bold'}}>Revoked</span>
                      }
                    </td>
                    <td>{record.value?.credentialType || 'N/A'}</td>
                    <td>{record.value?.holderID || 'N/A'}</td>
                    <td style={{fontSize: '12px', fontFamily: 'monospace'}}>
                      {record.txId.substring(0, 16)}...
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {!loading && allHistory.length === 0 && (
        <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
          <p>No history found. Issue some credentials first!</p>
        </div>
      )}
    </div>
  );
}
