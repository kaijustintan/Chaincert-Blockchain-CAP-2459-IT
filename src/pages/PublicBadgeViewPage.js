import React from "react";
import { useParams } from "react-router-dom";
import "../styles/badgeDetailsPage.css";
import { getBadgeById } from '../data/badgeData'; // ✅ Import shared badge data

export default function PublicBadgeViewPage() {
  const { id } = useParams();

  // Get badge from shared data (matches all other pages)
  const badge = getBadgeById(id);

  if (!badge) {
    return (
      <div className="badge-details-page" style={{ padding: "50px", textAlign: "center" }}>
        <h2>Badge not found</h2>
        <p>The badge you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="badge-details-page">
      {/* Public View Header */}
      <div className="details-header" style={{ background: "#f5f5f5", padding: "15px 20px" }}>
        <p style={{ margin: 0, color: "#666" }}>
          <strong>Public Badge View</strong> | This badge was issued to <strong>{badge.issuedTo}</strong> |{" "}
          <span>Date issued: {badge.issuedDate}</span>
        </p>
      </div>

      {/* Main Content */}
      <div className="details-body">
        <div className="badge-left">
          <img src={badge.image} alt={badge.title} className="big-badge" />
        </div>
        <div className="badge-right">
          <h2>{badge.title}</h2>
          <p>
            Issued by <strong>{badge.issuer}</strong>
          </p>
          <p className="description">{badge.description}</p>

          <h3>Skills</h3>
          <div className="skills-list">
            {badge.skills.map((skill, index) => (
              <span key={index} className="skill-chip">
                {skill}
              </span>
            ))}
          </div>

          {/* Verification Note */}
          <div style={{ marginTop: "30px", padding: "15px", background: "#e8f4f8", borderRadius: "8px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#555" }}>
              <strong>ℹ️ Note:</strong> This is a public view of the badge. For official verification, 
              please use the verification system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

