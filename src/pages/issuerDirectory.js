// issuerDirectory.js
/*
  FILE: issuerDirectory.js
  LAYMAN (Tropang Ex): Yung "directory" page — parang Facebook search ng mga issuer.
  Kahit sino (kahit hindi naka-login) pwedeng mag-browse/maghanap ng lahat ng approved
  issuers, makita ilan ang public templates nila at ilan na ang na-issue, tapos i-click
  para makita ang public profile nila.

  TECHNICAL: Public page. Fetches GET /api/issuer/directory (no auth) and renders a
  searchable grid of issuer cards. Search filters client-side by org name OR credential
  type. Each card links to the public issuer profile (/profile-preview?issuerId=<id>).
*/
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import { SkeletonCardGrid } from "../components/ui";
import Pagination, { usePagination } from "../components/ui/Pagination";
import "../styles/issuerDirectory.css";

export default function IssuerDirectory() {
  const navigate = useNavigate();
  const [issuers, setIssuers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all"); // final review: category filter (was missing)
  const [sortBy, setSortBy] = useState("name-asc");

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiService.getIssuerDirectory()
      .then((res) => { if (active) setIssuers(Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (active) setError("Could not load the issuer directory."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(issuers.map((i) => i.category).filter(Boolean))).sort(),
    [issuers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = issuers.filter((iss) => {
      if (catFilter !== "all" && iss.category !== catFilter) return false;
      if (!q) return true;
      return (
        String(iss.orgName || "").toLowerCase().includes(q) ||
        (Array.isArray(iss.types) && iss.types.some((t) => String(t).toLowerCase().includes(q)))
      );
    });
    return [...rows].sort((a, b) => {
      switch (sortBy) {
        case "name-desc": return String(b.orgName || "").localeCompare(String(a.orgName || ""));
        case "issued-desc": return (b.issuedCount || 0) - (a.issuedCount || 0);
        case "templates-desc": return (b.publicTemplateCount || 0) - (a.publicTemplateCount || 0);
        case "name-asc":
        default: return String(a.orgName || "").localeCompare(String(b.orgName || ""));
      }
    });
  }, [issuers, query, catFilter, sortBy]);
  const dirPg = usePagination(filtered, 12); // UAT: paginate the issuer directory grid

  return (
    <div className="directory-page">
      <header className="directory-hero">
        <h1>Issuer Directory</h1>
        <p>Browse and verify the institutions issuing credentials on ChainCert.</p>
        <input
          className="directory-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by organization or credential type…"
          aria-label="Search issuers"
        />
        <div className="directory-controls" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
          <select className="filter-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Filter by category">
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort issuers">
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="issued-desc">Most Issued</option>
            <option value="templates-desc">Most Public Credentials</option>
          </select>
        </div>
      </header>

      {loading && <SkeletonCardGrid count={6} />}
      {!loading && error && <div className="directory-empty">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="directory-empty">
          {issuers.length === 0 ? "No issuers listed yet." : "No issuers match your search."}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="directory-grid">
          {dirPg.pageItems.map((iss) => (
            <button
              key={iss.id}
              type="button"
              className="directory-card"
              onClick={() => navigate(`/profile-preview?issuerId=${encodeURIComponent(iss.id)}`)}
            >
              <div className="directory-card-avatar">
                {iss.profilePicture
                  ? <img src={iss.profilePicture} alt="" />
                  : (iss.orgName || "?").charAt(0).toUpperCase()}
              </div>
              <div className="directory-card-body">
                <h3>{iss.orgName}</h3>
                {iss.category && <span className="directory-card-cat">{iss.category}</span>}
                <div className="directory-card-stats">
                  <span><strong>{iss.publicTemplateCount}</strong> public credential{iss.publicTemplateCount !== 1 ? "s" : ""}</span>
                  <span><strong>{iss.issuedCount}</strong> issued</span>
                </div>
                {Array.isArray(iss.types) && iss.types.length > 0 && (
                  <div className="directory-card-types">{iss.types.slice(0, 3).join(" · ")}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      <Pagination {...dirPg} />
    </div>
  );
}
