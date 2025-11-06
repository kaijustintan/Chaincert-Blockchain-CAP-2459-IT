// Admin dashboard for credential management
import React, { useState, useEffect } from "react";
import "../styles/adminDashboard.css";
import apiService from "../services/apiService";

export default function AdminDashboard() {
  const [tab, setTab] = useState("credentials");
  const [pendingIssuers, setPendingIssuers] = useState([]);
  const [approvedIssuers, setApprovedIssuers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Fetch pending issuers on component load
  useEffect(() => {
    fetchPendingIssuers();
  }, []);

  // ✅ FIXED: Proper data handling from API response
  const fetchPendingIssuers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingIssuers();
      
      // ✅ Handle API response structure: { success: true, data: [...] }
      const allIssuers = Array.isArray(response.data) ? response.data : [];
      
      // Separate into pending and approved
      const pending = allIssuers.filter(issuer => issuer.status === "pending");
      const approved = allIssuers.filter(issuer => issuer.status === "approved");
      
      setPendingIssuers(pending);
      setApprovedIssuers(approved);
      setMessage("");
    } catch (error) {
      console.error("Error fetching issuers:", error);
      setMessage("Failed to load issuers");
      // Set empty arrays on error
      setPendingIssuers([]);
      setApprovedIssuers([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Approve issuer
  const handleApproveIssuer = async (issuerId) => {
    try {
      await apiService.approveIssuer(issuerId);
      setMessage("✅ Issuer approved successfully!");
      fetchPendingIssuers(); // Refresh list
    } catch (error) {
      console.error("Error approving issuer:", error);
      setMessage("❌ Failed to approve issuer");
    }
  };

  // ✅ Reject issuer
  const handleRejectIssuer = async (issuerId) => {
    const rejectionReason = prompt("Enter rejection reason (optional):");
    try {
      await apiService.rejectIssuer(issuerId, rejectionReason || "");
      setMessage("✅ Issuer rejected successfully!");
      fetchPendingIssuers(); // Refresh list
    } catch (error) {
      console.error("Error rejecting issuer:", error);
      setMessage("❌ Failed to reject issuer");
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          onClick={() => setTab("credentials")} 
          className={tab === "credentials" ? "active" : ""}
        >
          Credentials
        </button>
        <button 
          onClick={() => setTab("issuers")} 
          className={tab === "issuers" ? "active" : ""}
        >
          Manage Issuers
        </button>
        <button 
          onClick={() => setTab("verifications")} 
          className={tab === "verifications" ? "active" : ""}
        >
          Verifications
        </button>
        <button 
          onClick={() => setTab("logs")} 
          className={tab === "logs" ? "active" : ""}
        >
          Logs
        </button>
        <button 
          onClick={() => setTab("settings")} 
          className={tab === "settings" ? "active" : ""}
        >
          Settings
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className="admin-message">
          {message}
        </div>
      )}

      {/* Content */}
      <div className="admin-content">
        {/* CREDENTIALS TAB */}
        {tab === "credentials" && (
          <div>
            <h2>Credential Management</h2>
            <p>View and manage all credentials in the system</p>
          </div>
        )}

        {/* ISSUERS TAB - MAIN FUNCTIONALITY */}
        {tab === "issuers" && (
          <div>
            <h2>Issuer Management</h2>
            
            {loading ? (
              <p>Loading issuers...</p>
            ) : (
              <>
                {/* PENDING ISSUERS */}
                {pendingIssuers.length > 0 && (
                  <div className="issuer-section">
                    <h3>📋 Pending Issuers ({pendingIssuers.length})</h3>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Organization</th>
                          <th>Contact Name</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingIssuers.map(issuer => (
                          <tr key={issuer._id}>
                            <td>{issuer.orgName}</td>
                            <td>{issuer.contactName}</td>
                            <td>{issuer.email}</td>
                            <td className="status-pending">{issuer.status}</td>
                            <td>
                              <button 
                                className="btn-approve"
                                onClick={() => handleApproveIssuer(issuer._id)}
                              >
                                ✅ Approve
                              </button>
                              <button 
                                className="btn-reject"
                                onClick={() => handleRejectIssuer(issuer._id)}
                              >
                                ❌ Reject
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* APPROVED ISSUERS */}
                {approvedIssuers.length > 0 && (
                  <div className="issuer-section">
                    <h3>✅ Approved Issuers ({approvedIssuers.length})</h3>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Organization</th>
                          <th>Contact Name</th>
                          <th>Email</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedIssuers.map(issuer => (
                          <tr key={issuer._id}>
                            <td>{issuer.orgName}</td>
                            <td>{issuer.contactName}</td>
                            <td>{issuer.email}</td>
                            <td className="status-approved">{issuer.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {pendingIssuers.length === 0 && approvedIssuers.length === 0 && (
                  <p>No issuers found</p>
                )}
              </>
            )}
          </div>
        )}

        {/* VERIFICATIONS TAB */}
        {tab === "verifications" && (
          <div>
            <h2>Verification Oversight</h2>
            <ul>
              <li>ACME Corp → AWS Cloud Practitioner (Pending)</li>
              <li>HR Dept → BS IT (Approved)</li>
            </ul>
          </div>
        )}

        {/* LOGS TAB */}
        {tab === "logs" && (
          <div>
            <h2>Audit Logs</h2>
            <table className="admin-table">
              <thead>
                <tr><th>Event</th><th>Timestamp</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Issuer registered: DLSU</td>
                  <td>2025-11-06 19:00</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div>
            <h2>System Settings</h2>
            <button>+ Add Institution</button>
            <button>Configure Blockchain</button>
            <button>Manage API Keys</button>
          </div>
        )}
      </div>
    </div>
  );
}
