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

  const [issuerFilter, setIssuerFilter] = useState("approved");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [logCategory, setLogCategory] = useState("verification");
  const [verificationLogs, setVerificationLogs] = useState([]);
  const [verificationLogsError, setVerificationLogsError] = useState(null);

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------
  const formatTimestamp = (ts) => {
    if (!ts) return "N/A";
    try {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return ts;
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  const getVisibleIssuers = () => {
    if (issuerFilter === "approved") return approvedIssuers;
    if (issuerFilter === "pending") return pendingIssuers;
    if (issuerFilter === "rejected") return [];
    return [];
  };

  const visibleIssuers = getVisibleIssuers();

  // -------------------------------------------------------------------
  // ISSUERS
  // -------------------------------------------------------------------
  const fetchPendingIssuers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingIssuers();
      const pending = Array.isArray(response.data) ? response.data : [];
      setPendingIssuers(pending);
      setMessage("");
    } catch (error) {
      console.error("Error fetching pending issuers:", error);
      setMessage("Failed to load pending issuers");
      setPendingIssuers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedIssuers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getApprovedIssuers();
      const approved = Array.isArray(response.data) ? response.data : [];
      setApprovedIssuers(approved);
    } catch (error) {
      console.error("Error fetching approved issuers:", error);
      setApprovedIssuers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveIssuer = async (issuerId) => {
    try {
      await apiService.approveIssuer(issuerId);
      setMessage("✅ Issuer approved successfully!");
      await fetchPendingIssuers();
      await fetchApprovedIssuers();
    } catch (error) {
      console.error("Error approving issuer:", error);
      setMessage("❌ Failed to approve issuer");
    }
  };

  const handleRejectIssuer = async (issuerId) => {
    const rejectionReason = prompt("Enter rejection reason (optional):");
    try {
      await apiService.rejectIssuer(issuerId, rejectionReason || "");
      setMessage("✅ Issuer rejected successfully!");
      await fetchPendingIssuers();
      await fetchApprovedIssuers();
    } catch (error) {
      console.error("Error rejecting issuer:", error);
      setMessage("❌ Failed to reject issuer");
    }
  };

  // -------------------------------------------------------------------
  // USERS
  // -------------------------------------------------------------------
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await apiService.getAllUsers();
      const list = Array.isArray(data) ? data : [];
      setUsers(list);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // CREDENTIALS / VERIFICATIONS
  // -------------------------------------------------------------------
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

  const fetchVerifications = async () => {
    try {
      setVerificationsLoading(true);
      const allCredentials = await apiService.getAllCredentials();
      const credentialsList = Array.isArray(allCredentials)
        ? allCredentials
        : [];

      const verificationData = credentialsList.map((cred) => ({
        id: cred.id,
        requester: cred.holderID || "Unknown",
        credential: cred.credentialType || "N/A",
        status: cred.verified ? "Approved" : "Pending",
        submitted: cred.issueDate || cred.timestamp || "N/A",
      }));

      setVerifications(verificationData);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      setVerifications([]);
    } finally {
      setVerificationsLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // LOGS
  // -------------------------------------------------------------------
  const fetchVerificationLogs = async () => {
    try {
      setLogsLoading(true);
      setVerificationLogsError(null);
      const data = await apiService.Get_AllVerificationLogs();
      const logsArray = Array.isArray(data.logs) ? data.logs : [];
      setVerificationLogs(logsArray);
    } catch (error) {
      console.error("Error fetching verification logs:", error);
      console.log(
        "RAW verification logs error payload =",
        error?.response?.data
      );
      const raw =
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        "Failed to load verification logs";
      const msg = typeof raw === "string" ? raw : JSON.stringify(raw);
      setVerificationLogs([]);
      setVerificationLogsError(msg);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const allCredentials = await apiService.getAllCredentials();
      const credentialsList = Array.isArray(allCredentials)
        ? allCredentials
        : [];

      const logData = credentialsList
        .filter((cred) => cred.issueDate || cred.revokedDate)
        .map((cred) => ({
          event: cred.revoked
            ? `Credential revoked: ${cred.id}`
            : `Credential issued: ${cred.credentialType || cred.id}`,
          timestamp:
            cred.revokedDate || cred.issueDate || cred.timestamp || "N/A",
          actor: cred.issuerID || "system",
        }))
        .slice(0, 50);

      setLogs(logData);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------
  useEffect(() => {
    if (tab === "issuers") {
      fetchPendingIssuers();
      fetchApprovedIssuers();
      setIssuerFilter("approved");
    } else if (tab === "credentials") {
      fetchCredentials();
    } else if (tab === "verifications") {
      fetchVerifications();
    } else if (tab === "logs") {
      if (logCategory === "verification") {
        fetchVerificationLogs();
      } else {
        fetchLogs();
      }
    } else if (tab === "users") {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== "logs") return;
    if (logCategory === "verification") {
      fetchVerificationLogs();
    } else {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logCategory]);

  // -------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------
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
          onClick={() => setTab("users")}
          className={tab === "users" ? "active" : ""}
        >
          Manage Users
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

      {message && <div className="admin-message">{message}</div>}

      {/* CREDENTIALS TAB */}
      {tab === "credentials" && (
        <div className="tab-card">
          <h2>Credential Management</h2>
          <p className="tab-subtitle">
            View and manage all credentials in the system.
          </p>
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
                  {credentials.map((cred) => (
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
                      <td>
                        {formatTimestamp(cred.issueDate || cred.timestamp)}
                      </td>
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

      {/* ISSUERS TAB */}
      {tab === "issuers" && (
        <div className="tab-card">
          <h2>Issuer Management</h2>
          <p className="tab-subtitle">
            Review, approve, or reject issuer applications. Monitor onboarding
            activity in real time.
          </p>

          <div className="issuer-filter-row">
            <label htmlFor="issuerFilter">View:</label>
            <select
              id="issuerFilter"
              value={issuerFilter}
              onChange={(e) => setIssuerFilter(e.target.value)}
            >
              <option value="approved">Approved Issuers</option>
              <option value="pending">Pending Issuers</option>
              <option value="rejected">Rejected Issuers</option>
            </select>
          </div>

          {loading ? (
            <div className="tab-placeholder">Loading issuers...</div>
          ) : (
            <>
              {issuerFilter === "pending" && pendingIssuers.length > 0 && (
                <div className="issuer-section">
                  <div className="section-header">
                    <h3>Pending Issuers</h3>
                    <span className="section-count">
                      {pendingIssuers.length}
                    </span>
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
                          <th>Created At</th>
                          <th>Approved At</th>
                          <th>Approved By</th>
                          <th>Fabric Identity</th>
                          <th>CouchDB URL</th>
                          <th>Wallet ID</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingIssuers.map((issuer) => (
                          <tr key={issuer._id}>
                            <td>{issuer.orgName}</td>
                            <td>{issuer.contactName}</td>
                            <td>{issuer.email}</td>
                            <td className="status-pending">
                              {issuer.status}
                            </td>
                            <td>
                              {issuer.accredited ? (
                                <span className="badge green">Yes</span>
                              ) : (
                                <span className="badge red">No</span>
                              )}
                            </td>
                            <td>{formatTimestamp(issuer.createdAt)}</td>
                            <td>{formatTimestamp(issuer.approvedAt)}</td>
                            <td>{issuer.approvedBy || "N/A"}</td>
                            <td>{issuer.fabricIdentity || "N/A"}</td>
                            <td>{issuer.couchDBUrl || "N/A"}</td>
                            <td>
                              {issuer.walletId ||
                                issuer.walletID ||
                                "N/A"}
                            </td>
                            <td className="action-cell">
                              <button
                                className="btn-approve"
                                onClick={() =>
                                  handleApproveIssuer(issuer._id)
                                }
                              >
                                ✅ Approve
                              </button>
                              <button
                                className="btn-reject"
                                onClick={() =>
                                  handleRejectIssuer(issuer._id)
                                }
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

              {issuerFilter === "approved" && approvedIssuers.length > 0 && (
                <div className="issuer-section">
                  <div className="section-header">
                    <h3>Approved Issuers</h3>
                    <span className="section-count">
                      {approvedIssuers.length}
                    </span>
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
                          <th>Created At</th>
                          <th>Approved At</th>
                          <th>Approved By</th>
                          <th>Fabric Identity</th>
                          <th>CouchDB URL</th>
                          <th>Wallet ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedIssuers.map((issuer) => (
                          <tr key={issuer.id || issuer._id}>
                            <td>{issuer.orgName}</td>
                            <td>{issuer.contactName}</td>
                            <td>{issuer.email}</td>
                            <td className="status-approved">
                              {issuer.status}
                            </td>
                            <td>
                              {issuer.accredited ? (
                                <span className="badge green">Yes</span>
                              ) : (
                                <span className="badge red">No</span>
                              )}
                            </td>
                            <td>{formatTimestamp(issuer.createdAt)}</td>
                            <td>{formatTimestamp(issuer.approvedAt)}</td>
                            <td>{issuer.approvedBy || "N/A"}</td>
                            <td>{issuer.fabricIdentity || "N/A"}</td>
                            <td>{issuer.couchDBUrl || "N/A"}</td>
                            <td>
                              {issuer.walletId ||
                                issuer.walletID ||
                                "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {issuerFilter === "rejected" && (
                <div className="issuer-section">
                  <div className="section-header">
                    <h3>Rejected Issuers</h3>
                    <span className="section-count">0</span>
                  </div>
                  <div className="tab-placeholder">
                    Rejected issuers view not implemented yet.
                  </div>
                </div>
              )}

              {visibleIssuers.length === 0 && (
                <div className="tab-placeholder">No issuers found.</div>
              )}
            </>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {tab === "users" && (
        <div className="tab-card">
          <h2>User Management</h2>
          <p className="tab-subtitle">
            View all registered users (holders and admins) in the system.
          </p>
          {usersLoading ? (
            <div className="tab-placeholder">Loading users...</div>
          ) : users.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Org</th>
                    <th>Created At</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id || user.id}>
                      <td>{user._id || user.id}</td>
                      <td>{user.email || "N/A"}</td>
                      <td>{user.username || user.fullName || "N/A"}</td>
                      <td>{user.role || "user"}</td>
                      <td>{user.org || "N/A"}</td>
                      <td>{formatTimestamp(user.createdAt)}</td>
                      <td>
                        {user.isActive === false ? (
                          <span className="badge red">No</span>
                        ) : (
                          <span className="badge green">Yes</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tab-placeholder">No users found.</div>
          )}
        </div>
      )}

      {/* VERIFICATIONS TAB */}
      {tab === "verifications" && (
        <div className="tab-card">
          <h2>Verification Oversight</h2>
          <p className="tab-subtitle">
            Monitor credential verification requests and track their resolution
            status.
          </p>
          {verificationsLoading ? (
            <div className="tab-placeholder">Loading verifications...</div>
          ) : verifications.length > 0 ? (
            <>
              <div className="tab-grid">
                <div className="stat-card">
                  <span className="stat-label">Pending Requests</span>
                  <span className="stat-value">
                    {
                      verifications.filter((v) => v.status === "Pending")
                        .length
                    }
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Approved</span>
                  <span className="stat-value">
                    {
                      verifications.filter((v) => v.status === "Approved")
                        .length
                    }
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Total Requests</span>
                  <span className="stat-value">
                    {verifications.length}
                  </span>
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
                        <td
                          className={
                            verification.status === "Approved"
                              ? "status-approved"
                              : "status-pending"
                          }
                        >
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
            <div className="tab-placeholder">
              No verification requests found.
            </div>
          )}
        </div>
      )}

      {/* LOGS TAB */}
      {tab === "logs" && (
        <div className="tab-card">
          <h2>Audit Logs</h2>
          <p className="tab-subtitle">
            Trace key administrative actions for compliance and security
            reviews.
          </p>

          <div className="issuer-filter-row">
            <label htmlFor="logCategory">Log Category:</label>
            <select
              id="logCategory"
              value={logCategory}
              onChange={(e) => setLogCategory(e.target.value)}
            >
              <option value="verification">Verification Logs</option>
              <option value="admin">Admin Logs (from credentials)</option>
            </select>
          </div>

          {/* VERIFICATION LOGS VIEW */}
          {logCategory === "verification" && (
            <>
              {logsLoading ? (
                <div className="tab-placeholder">
                  Loading verification logs...
                </div>
              ) : verificationLogsError ? (
                <div className="tab-placeholder">
                  {verificationLogsError}
                </div>
              ) : verificationLogs.length > 0 ? (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Verification Log ID</th>
                        <th>Verifier Name</th>
                        <th>Verifier Email</th>
                        <th>Credential ID</th>
                        <th>Holder ID</th>
                        <th>Holder Name</th>
                        <th>Result</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verificationLogs.map((log) => {
                        const safeResultSource =
                          log.result?.reason ||
                          log.result?.message ||
                          (typeof log.result === "string"
                            ? log.result
                            : log.verifyResult ||
                              log.result ||
                              null);

                        const safeResult =
                          typeof safeResultSource === "string"
                            ? safeResultSource
                            : safeResultSource
                            ? JSON.stringify(safeResultSource)
                            : "N/A";

                        const ts = log.verifiedAt || log.timestamp;

                        return (
                          <tr key={log.id}>
                            <td>{String(log.id)}</td>
                            <td>{log.verifierName || "N/A"}</td>
                            <td>{log.verifierEmail || "N/A"}</td>
                            <td>
                              {log.credentialId ||
                                log.credentialID ||
                                "N/A"}
                            </td>
                            <td>{log.holderID || "N/A"}</td>
                            <td>{log.holderName || "N/A"}</td>
                            <td>{safeResult}</td>
                            <td>{formatTimestamp(ts)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="tab-placeholder">
                  No verification logs found.
                </div>
              )}
            </>
          )}

          {/* ADMIN/SYNTHETIC LOGS VIEW */}
          {logCategory === "admin" && (
            <>
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
                          <td>{formatTimestamp(log.timestamp)}</td>
                          <td>{log.actor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="tab-placeholder">No audit logs found.</div>
              )}
            </>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && (
        <div className="tab-card">
          <h2>System Settings</h2>
          <p className="tab-subtitle">
            Configure administrative controls for institutions,
            infrastructure, and integrations.
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
