import React, { useMemo, useState } from "react";
import "../styles/studentDashboard.css"; // new CSS file

const MOCK_CREDENTIALS = [
  {
    id: "cred-001",
    title: "Bachelor of Science in Information Technology",
    course: "BS Information Technology",
    issuer: "De La Salle University - Manila",
    dateIssued: "2025-03-21",
    status: "active",
    fileName: "cred-001.pdf",
    shareCode: "sc_01w4l1dExAMPLe",
  },
  {
    id: "cred-002",
    title: "AWS Cloud Practitioner (Microcredential)",
    course: "AWS Cloud Fundamentals",
    issuer: "AWS Academy",
    dateIssued: "2025-05-10",
    status: "active",
    fileName: "cred-002.pdf",
    shareCode: "sc_02w4l1dExAMPLe",
  },
  {
    id: "cred-003",
    title: "TESDA NC II – Computer Systems Servicing",
    course: "Computer Systems Servicing NC II",
    issuer: "TESDA",
    dateIssued: "2023-11-01",
    status: "expired",
    fileName: "cred-003.pdf",
    shareCode: "sc_03w4l1dExAMPLe",
  },
];

const MOCK_NOTIFS = [
  { id: "n1", type: "issued", message: "New credential issued: AWS Cloud Practitioner", ts: "2025-05-10 16:20" },
  { id: "n2", type: "verify", message: "Verification request from: ACME Corp (HR)", ts: "2025-06-01 10:30" },
];

const formatDate = (iso) => new Date(iso).toLocaleDateString();

const StatusPill = ({ status }) => (
  <span className={`status-pill ${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
);

export default function StudentDashboard() {
  const [view, setView] = useState("cards");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notifs] = useState(MOCK_NOTIFS);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLink, setQrLink] = useState("");

  const filtered = useMemo(() => {
    return MOCK_CREDENTIALS.filter((c) => {
      const matchesQ = [c.title, c.course, c.issuer].join(" ").toLowerCase().includes(query.toLowerCase());
      const matchesS = statusFilter === "all" ? true : c.status === statusFilter;
      return matchesQ && matchesS;
    });
  }, [query, statusFilter]);

  const mockShareUrl = (cred) =>
    `https://example.com/verify?code=${encodeURIComponent(cred.shareCode)}&id=${encodeURIComponent(cred.id)}`;

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

      {/* Notifications */}
      {notifs.length > 0 && (
        <div className="notif-section">
          {notifs.map((n) => (
            <div key={n.id} className="notif-card">
              <div>
                <strong>{n.type === "issued" ? "🆕 Issued" : "🔎 Verify"}:</strong> {n.message}
              </div>
              <span className="notif-time">{n.ts}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="controls">
        <input
          type="text"
          placeholder="Search title, course, issuer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Content */}
      <div className="content">
        {filtered.length === 0 ? (
          <div className="empty-card">No credentials match your filters.</div>
        ) : view === "cards" ? (
          <div className="card-grid">
            {filtered.map((cred) => (
              <div key={cred.id} className="cred-card">
                <div className="cred-header">
                  <div>
                    <h3>{cred.title}</h3>
                    <p>
                      <strong>Course:</strong> {cred.course}
                      <br />
                      <strong>Issuer:</strong> {cred.issuer}
                      <br />
                      <strong>Issued:</strong> {formatDate(cred.dateIssued)}
                    </p>
                  </div>
                  <StatusPill status={cred.status} />
                </div>
                <div className="cred-actions">
                  <button className="action-btn view" onClick={() => alert(`View details for ${cred.id} (mock)`)}>👁 View</button>
                  <button className="action-btn share" onClick={() => { navigator.clipboard?.writeText(mockShareUrl(cred)); alert("Share link copied!"); }}>🔗 Share</button>
                  <button className="action-btn qr" onClick={() => { setQrLink(mockShareUrl(cred)); setQrOpen(true); }}>📱 QR</button>
                  <button className="action-btn pdf" onClick={() => alert(`Downloading ${cred.fileName} (mock)`)}>⬇ PDF</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="cred-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Course</th>
                <th>Issuer</th>
                <th>Issued</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cred) => (
                <tr key={cred.id}>
                  <td>{cred.title}</td>
                  <td>{cred.course}</td>
                  <td>{cred.issuer}</td>
                  <td>{formatDate(cred.dateIssued)}</td>
                  <td><StatusPill status={cred.status} /></td>
                  <td>
                  <div className="cred-actions">
                    <button className="action-btn view" onClick={() => alert(`View details for ${cred.id} (mock)`)}>👁 View</button>
                    <button className="action-btn share" onClick={() => { navigator.clipboard?.writeText(mockShareUrl(cred)); alert("Link copied!"); }}>🔗 Share</button>
                    <button className="action-btn qr" onClick={() => { setQrLink(mockShareUrl(cred)); setQrOpen(true); }}>📱 QR</button>
                    <button className="action-btn pdf" onClick={() => alert(`Downloading ${cred.fileName} (mock)`)}>⬇ PDF</button>
                  </div>
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* QR Modal */}
      {qrOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Share via QR (Mock)</h3>
            <button className="close-btn" onClick={() => setQrOpen(false)}>Close</button>
            <div className="qr-preview">QR Preview</div>
            <code className="qr-link">{qrLink}</code>
            <p className="qr-note">In a real build, a scannable QR code would appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}