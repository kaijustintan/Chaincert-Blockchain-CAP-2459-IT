import React, { useMemo, useState } from "react";

// -----------------------------------------------------------------------------
// Student Dashboard / Wallet Page (MOCKUP ONLY)
// No backend calls, no external libs, no router imports.
// Everything below is static/mock data + simple UI to demonstrate layout.
// -----------------------------------------------------------------------------

// ---- Mock Data ---------------------------------------------------------------
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

// ---- Small Helpers -----------------------------------------------------------
const formatDate = (iso) => {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

const StatusPill = ({ status }) => {
  const color = {
    active: { bg: "#E8F5E9", fg: "#1B5E20", br: "#A5D6A7" },
    revoked: { bg: "#FFEBEE", fg: "#B71C1C", br: "#EF9A9A" },
    expired: { bg: "#FFF8E1", fg: "#E65100", br: "#FFE082" },
    pending: { bg: "#E3F2FD", fg: "#0D47A1", br: "#90CAF9" },
  }[status] || { bg: "#EEEEEE", fg: "#424242", br: "#E0E0E0" };
  return (
    <span style={{
      background: color.bg,
      color: color.fg,
      border: `1px solid ${color.br}`,
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 12,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color.fg, opacity: 0.7 }} />
      {String(status).charAt(0).toUpperCase() + String(status).slice(1)}
    </span>
  );
};

const Card = ({ children }) => (
  <div style={{
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    background: "#fff",
  }}>
    {children}
  </div>
);

// ---- Main (Mockup) ----------------------------------------------------------
export default function StudentDashboard() {
  const [view, setView] = useState("cards"); // 'cards' | 'list'
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

  const mockShareUrl = (cred) => `https://example.com/verify?code=${encodeURIComponent(cred.shareCode)}&id=${encodeURIComponent(cred.id)}`;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>My Credentials</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView("cards")} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: view === "cards" ? "#111827" : "#fff", color: view === "cards" ? "#fff" : "#111827" }}>Cards</button>
          <button onClick={() => setView("list")} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: view === "list" ? "#111827" : "#fff", color: view === "list" ? "#fff" : "#111827" }}>List</button>
        </div>
      </div>

      {/* Notifications (optional) */}
      {notifs.length > 0 && (
        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          {notifs.map((n) => (
            <Card key={n.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 14 }}>
                  <strong style={{ marginRight: 8 }}>{n.type === "issued" ? "🆕 Issued" : "🔎 Verify"}</strong>
                  {n.message}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>{n.ts}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ marginTop: 16, display: "grid", gap: 8, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <input
          placeholder="Search title, course, issuer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ gridColumn: "span 2", padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB" }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB" }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Content */}
      <div style={{ marginTop: 16 }}>
        {filtered.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>No credentials match your filters.</div>
          </Card>
        ) : view === "cards" ? (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {filtered.map((cred) => (
              <Card key={cred.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{cred.title}</div>
                    <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                      <div><strong>Course:</strong> {cred.course}</div>
                      <div><strong>Issuer:</strong> {cred.issuer}</div>
                      <div><strong>Issued:</strong> {formatDate(cred.dateIssued)}</div>
                    </div>
                  </div>
                  <StatusPill status={cred.status} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <button title="View details (mock)" style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }} onClick={() => alert(`View details for ${cred.id} (mock)`) }>View details</button>
                  <button title="Copy share link (mock)" style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }} onClick={() => { navigator.clipboard?.writeText(mockShareUrl(cred)); alert("Share link copied (mock)"); }}>Copy share link</button>
                  <button title="Show QR (mock)" style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }} onClick={() => { setQrLink(mockShareUrl(cred)); setQrOpen(true); }}>Show QR</button>
                  <button title="Download file (mock)" style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }} onClick={() => alert(`Downloading ${cred.fileName} (mock)`) }>Download PDF</button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    {['Title','Course','Issuer','Issued','Status','Actions'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cred) => (
                    <tr key={cred.id}>
                      <td style={{ padding: '10px 12px', borderTop: '1px solid #E5E7EB', fontWeight: 600 }}>{cred.title}</td>
                      <td style={{ padding: '10px 12px', borderTop: '1px solid #E5E7EB' }}>{cred.course}</td>
                      <td style={{ padding: '10px 12px', borderTop: '1px solid #E5E7EB' }}>{cred.issuer}</td>
                      <td style={{ padding: '10px 12px', borderTop: '1px solid #E5E7EB' }}>{formatDate(cred.dateIssued)}</td>
                      <td style={{ padding: '10px 12px', borderTop: '1px solid #E5E7EB' }}><StatusPill status={cred.status} /></td>
                      <td style={{ padding: '10px 12px', borderTop: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff' }} onClick={() => alert(`View details for ${cred.id} (mock)`) }>View</button>
                          <button style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff' }} onClick={() => { navigator.clipboard?.writeText(mockShareUrl(cred)); alert('Link copied (mock)'); }}>Share</button>
                          <button style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff' }} onClick={() => { setQrLink(mockShareUrl(cred)); setQrOpen(true); }}>QR</button>
                          <button style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff' }} onClick={() => alert(`Downloading ${cred.fileName} (mock)`) }>PDF</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* QR Mock Modal */}
      {qrOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Share via QR (Mock)</h3>
              <button onClick={() => setQrOpen(false)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff' }}>Close</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 12 }}>
              {/* Placeholder QR box */}
              <div style={{ width: 192, height: 192, background: '#F3F4F6', border: '1px dashed #D1D5DB', borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 12, color: '#6B7280' }}>
                QR Preview
              </div>
              <code style={{ fontSize: 12, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 8px', width: '100%', overflowX: 'auto' }}>{qrLink}</code>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Verifiers can scan the QR here in a real build. This is a visual placeholder only.</div>
            </div>
          </div>
        </div>
      )}

      {/* References note */}
      <div style={{ marginTop: 28, fontSize: 12, color: '#6B7280' }}>
        UI inspired by LinkedIn Certifications (overview list) and Blockcerts Wallet (QR-based verification). Mockup only.
      </div>
    </div>
  );
}
