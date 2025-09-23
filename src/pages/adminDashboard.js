// Admin dashboard for credential management
import React, { useState } from "react";
import "../styles/adminDashboard.css";

const MOCK_USERS = [
  { id: "u1", name: "Juan Dela Cruz", role: "student", status: "active" },
  { id: "u2", name: "Maria Santos", role: "verifier", status: "active" },
  { id: "u3", name: "Admin User", role: "admin", status: "active" },
];

const MOCK_CREDENTIALS = [
  { id: "c1", title: "BS Information Technology", owner: "Juan Dela Cruz", issuer: "DLSU", status: "active" },
  { id: "c2", title: "AWS Cloud Practitioner", owner: "Maria Santos", issuer: "AWS Academy", status: "revoked" },
];

const MOCK_LOGS = [
  { id: "l1", event: "Credential issued: AWS Cloud Practitioner", ts: "2025-05-10 10:00" },
  { id: "l2", event: "Verification request by ACME Corp", ts: "2025-05-12 14:30" },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState(MOCK_USERS);
  const [credentials, setCredentials] = useState(MOCK_CREDENTIALS);
  const [logs] = useState(MOCK_LOGS);

  const handleUserAction = (id, action) => {
    if (action === "suspend") {
      setUsers(users.map(u => u.id === id ? { ...u, status: "suspended" } : u));
    } else if (action === "delete") {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleCredentialAction = (id, action) => {
    if (action === "revoke") {
      setCredentials(credentials.map(c => c.id === id ? { ...c, status: "revoked" } : c));
    }
  };

  return (
    <div className="admin-container">
    <h1 className="admin-title">Admin Dashboard</h1>
      {/* Tabs */}
      <div className="admin-tabs">
        <button onClick={() => setTab("users")} className={tab === "users" ? "active" : ""}>User Management</button>
        <button onClick={() => setTab("credentials")} className={tab === "credentials" ? "active" : ""}>Credentials</button>
        <button onClick={() => setTab("verifications")} className={tab === "verifications" ? "active" : ""}>Verifications</button>
        <button onClick={() => setTab("logs")} className={tab === "logs" ? "active" : ""}>Logs</button>
        <button onClick={() => setTab("settings")} className={tab === "settings" ? "active" : ""}>Settings</button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {tab === "users" && (
          <div>
            <h2>User Management</h2>
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.role}</td>
                    <td>{u.status}</td>
                    <td>
                      <button onClick={() => handleUserAction(u.id, "suspend")}>Suspend</button>
                      <button onClick={() => handleUserAction(u.id, "delete")}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "credentials" && (
          <div>
            <h2>Credential Management</h2>
            <table className="admin-table">
              <thead>
                <tr><th>Title</th><th>Owner</th><th>Issuer</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {credentials.map(c => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{c.owner}</td>
                    <td>{c.issuer}</td>
                    <td>{c.status}</td>
                    <td>
                      <button onClick={() => handleCredentialAction(c.id, "revoke")}>Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "verifications" && (
          <div>
            <h2>Verification Oversight</h2>
            <ul>
              <li>ACME Corp → AWS Cloud Practitioner (Pending)</li>
              <li>HR Dept → BS IT (Approved)</li>
            </ul>
          </div>
        )}

        {tab === "logs" && (
          <div>
            <h2>Audit Logs</h2>
            <table className="admin-table">
              <thead><tr><th>Event</th><th>Timestamp</th></tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>{l.event}</td>
                    <td>{l.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

