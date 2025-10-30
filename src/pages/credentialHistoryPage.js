import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
import "../styles/issuerDashboardPage.css";

export default function CredentialHistoryPage() {
  const [searchId, setSearchId] = useState("");
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch ALL credential history on page load
  useEffect(() => {
    fetchAllHistory();
  }, []);

  const fetchAllHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all credentials first
      const credentials = await apiService.getAllCredentials();
      console.log("Fetched credentials:", credentials);
      
      if (!credentials || credentials.length === 0) {
        setAllHistory([]);
        setLoading(false);
        return;
      }
      
      const allHistories = [];
      
      // Fetch history for each credential
      for (const cred of credentials) {
        try {
          // Use 'id' field from backend response
          const credId = cred.id || cred.credentialId;
          const data = await apiService.getCredentialHistory(credId);
          console.log(`History for ${credId}:`, data);
          
          // Transform Fabric history format to display format
          const recordsWithId = data.map(record => ({
            credentialId: credId,
            timestamp: new Date(record.Timestamp.seconds * 1000).toISOString(),
            txId: record.TxId,
            value: JSON.parse(record.Value.toString()),
            isDeleted: record.IsDelete || false
          }));
          
          allHistories.push(...recordsWithId);
        } catch (err) {
          console.log(`No history for ${cred.id}:`, err);
        }
      }
      
      // Sort ALL records by timestamp (most recent first)
      const sortedHistory = allHistories.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      console.log("All sorted history:", sortedHistory);
      setAllHistory(sortedHistory);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to fetch history from blockchain: ' + err.message);
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
        
        const sortedHistory = data.map(record => ({
          credentialId: searchId.trim(),
          timestamp: new Date(record.Timestamp.seconds * 1000).toISOString(),
          txId: record.TxId,
          value: JSON.parse(record.Value.toString()),
          isDeleted: record.IsDelete || false
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setAllHistory(sortedHistory);
      } catch (err) {
        setError(`Failed to fetch history for ${searchId}: ${err.message}`);
        setAllHistory([]);
      } finally {
        setLoading(false);
      }
    } else {
      // If search is empty, fetch all again
      fetchAllHistory();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionType = (records, currentIndex) => {
    // Find previous record for THIS credential
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
                  <tr key={`${record.credentialId}-${record.txId}`}>
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
