// Admin dashboard for credential management
import React, { useState, useEffect } from "react";
import "../styles/adminDashboard.css";
import apiService from "../services/apiService";

export default function AdminDashboard() {
  const [tab, setTab] = useState("credentials");
  const [pendingIssuers, setPendingIssuers] = useState([]);
  const [approvedIssuers, setApprovedIssuers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Proper data handling from API response
  const fetchPendingIssuers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingIssuers();
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
      setPendingIssuers([]);
      setApprovedIssuers([]);
    } finally {
      setLoading(false);
    }
  };

  // Approve issuer
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

  // Reject issuer
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

  // Fetch all credentials
  const fetchCredentials = async () => {
    try {
      setCredentialsLoading(true);
      const data = await apiService.getAllCredentials();
      setCredentials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      setCredentials([]);
    } finally {
      setCredentialsLoading(false);
    }
  };

  // Fetch verifications (using credential verification data)
  const fetchVerifications = async () => {
    try {
      setVerificationsLoading(true);
      // Fetch all credentials and filter for verification status
      const allCredentials = await apiService.getAllCredentials();
      const credentialsList = Array.isArray(allCredentials) ? allCredentials : [];
      
      // Get verification requests (credentials that have been verified or are pending verification)
      const verificationData = credentialsList.map(cred => ({
        id: cred.id,
        requester: cred.holderID || "Unknown",
        credential: cred.credentialType || "N/A",
        status: cred.verified ? "Approved" : "Pending",
        submitted: cred.issueDate || cred.timestamp || "N/A"
      }));
      
      setVerifications(verificationData);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      setVerifications([]);
    } finally {
      setVerificationsLoading(false);
    }
  };

  // Fetch audit logs (using credential history and issuer actions)
  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      // For now, we'll create logs from credential and issuer data
      // In a real system, this would come from a dedicated audit log endpoint
      const allCredentials = await apiService.getAllCredentials();
      const credentialsList = Array.isArray(allCredentials) ? allCredentials : [];
      
      const logData = credentialsList
        .filter(cred => cred.issueDate || cred.revokedDate)
        .map(cred => ({
          event: cred.revoked 
            ? `Credential revoked: ${cred.id}` 
            : `Credential issued: ${cred.credentialType || cred.id}`,
          timestamp: cred.revokedDate || cred.issueDate || cred.timestamp || "N/A",
          actor: cred.issuerID || "system"
        }))
        .slice(0, 50); // Limit to 50 most recent
      
      setLogs(logData);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (tab === "issuers") {
      fetchPendingIssuers();
    } else if (tab === "credentials") {
      fetchCredentials();
    } else if (tab === "verifications") {
      fetchVerifications();
    } else if (tab === "logs") {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
      {/* CREDENTIALS TAB */}
      {tab === "credentials" && (
        <div className="tab-card">
          <h2>Credential Management</h2>
          <p className="tab-subtitle">View and manage all credentials in the system.</p>
          {credentialsLoading ? (
            <div className="tab-placeholder">Loading credentials...</div>
          ) : credentials.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Credential ID</th>
                    <th>Type</th>
                    <th>Holder</th>
                    <th>Issuer</th>
                    <th>Status</th>
                    <th>Issue Date</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map(cred => (
                    <tr key={cred.id}>
                      <td>{cred.id}</td>
                      <td>{cred.credentialType || "N/A"}</td>
                      <td>{cred.holderID || "N/A"}</td>
                      <td>{cred.issuerID || "N/A"}</td>
                      <td>
                        {cred.revoked ? (
                          <span className="badge red">Revoked</span>
                        ) : cred.verified ? (
                          <span className="badge green">Verified</span>
                        ) : (
                          <span className="status-pending">Pending</span>
                        )}
                      </td>
                      <td>{cred.issueDate || cred.timestamp || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tab-placeholder">No credentials found.</div>
          )}
        </div>
      )}

      {/* ISSUERS TAB - MAIN FUNCTIONALITY */}
      {tab === "issuers" && (
        <div className="tab-card">
          <h2>Issuer Management</h2>
          <p className="tab-subtitle">
            Review, approve, or reject issuer applications. Monitor onboarding activity in real time.
          </p>
          {loading ? (
            <div className="tab-placeholder">Loading issuers...</div>
          ) : (
            <>
              {/* PENDING ISSUERS */}
              {pendingIssuers.length > 0 && (
                <div className="issuer-section">
                  <div className="section-header">
                    <h3>Pending Issuers</h3>
                    <span className="section-count">{pendingIssuers.length}</span>
                  </div>
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Organization</th>
                          <th>Contact Name</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Accredited</th>
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
                              {issuer.accredited ? (
                                <span className="badge green">Yes</span>
                              ) : (
                                <span className="badge red">No</span>
                              )}
                            </td>
                            <td className="action-cell">
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
                </div>
              )}

              {/* APPROVED ISSUERS */}
              {approvedIssuers.length > 0 && (
                <div className="issuer-section">
                  <div className="section-header">
                    <h3>Approved Issuers</h3>
                    <span className="section-count">{approvedIssuers.length}</span>
                  </div>
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Organization</th>
                          <th>Contact Name</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Accredited</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedIssuers.map(issuer => (
                          <tr key={issuer._id}>
                            <td>{issuer.orgName}</td>
                            <td>{issuer.contactName}</td>
                            <td>{issuer.email}</td>
                            <td className="status-approved">{issuer.status}</td>
                            <td>
                              {issuer.accredited ? (
                                <span className="badge green">Yes</span>
                              ) : (
                                <span className="badge red">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {pendingIssuers.length === 0 && approvedIssuers.length === 0 && (
                <div className="tab-placeholder">No issuers found.</div>
              )}
            </>
          )}
        </div>
      )}

      {/* VERIFICATIONS TAB */}
      {tab === "verifications" && (
        <div className="tab-card">
          <h2>Verification Oversight</h2>
          <p className="tab-subtitle">
            Monitor credential verification requests and track their resolution status.
          </p>
          {verificationsLoading ? (
            <div className="tab-placeholder">Loading verifications...</div>
          ) : verifications.length > 0 ? (
            <>
              <div className="tab-grid">
                <div className="stat-card">
                  <span className="stat-label">Pending Requests</span>
                  <span className="stat-value">
                    {verifications.filter(v => v.status === "Pending").length}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Approved</span>
                  <span className="stat-value">
                    {verifications.filter(v => v.status === "Approved").length}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Total Requests</span>
                  <span className="stat-value">{verifications.length}</span>
                </div>
              </div>
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Requester</th>
                      <th>Credential</th>
                      <th>Status</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifications.map((verification, index) => (
                      <tr key={verification.id || index}>
                        <td>{verification.requester}</td>
                        <td>{verification.credential}</td>
                        <td className={verification.status === "Approved" ? "status-approved" : "status-pending"}>
                          {verification.status}
                        </td>
                        <td>{verification.submitted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="tab-placeholder">No verification requests found.</div>
          )}
        </div>
      )}

      {/* LOGS TAB */}
      {tab === "logs" && (
        <div className="tab-card">
          <h2>Audit Logs</h2>
          <p className="tab-subtitle">
            Trace key administrative actions for compliance and security reviews.
          </p>
          {logsLoading ? (
            <div className="tab-placeholder">Loading audit logs...</div>
          ) : logs.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Timestamp</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={index}>
                      <td>{log.event}</td>
                      <td>{log.timestamp}</td>
                      <td>{log.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tab-placeholder">No audit logs found.</div>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && (
        <div className="tab-card">
          <h2>System Settings</h2>
          <p className="tab-subtitle">
            Configure administrative controls for institutions, infrastructure, and integrations.
          </p>
          <div className="settings-grid">
            <button>+ Add Institution</button>
            <button>Configure Blockchain</button>
            <button>Manage API Keys</button>
            <button>Security Policies</button>
            <button>User Roles</button>
          </div>
        </div>
      )}
    </div>
  );
}
