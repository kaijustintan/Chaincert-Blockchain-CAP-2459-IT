import React from "react";
import { useParams } from "react-router-dom";
import '../styles/badgeDetailsPage.css';
import { getBadgeById } from '../data/badgeData'; // ✅ Import shared badge data

export default function BadgeDetails_ProfilePreviewPage() {
  const { id } = useParams();
  
  // Get badge from shared data (matches all other pages)
  const badge = getBadgeById(id);
  
  // If badge not found, show error
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
      {/* Header */}
      <div className="details-header">
        <p>
          This badge was issued to <strong>{badge.issuedTo}</strong> |{" "}
          <span>Date issued: {badge.issuedDate}</span>
        </p>
        <div className="actions">
          <button className="verify-btn">Verify</button>
          <button className="more-btn">⋮</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="details-body">
        <div className="badge-left">
          <img src={badge.image} alt={badge.title} className="big-badge" />
        </div>
        <div className="badge-right">
          <h2>{badge.title}</h2>
          <p>
            Issued by <a href="#">{badge.issuer}</a>
          </p>
          <p className="description">{badge.description}</p>
          <a href="#" className="learn-more">
            Learn more
          </a>

          <h3>Skills</h3>
          <div className="skills-list">
            {badge.skills.map((skill, index) => (
              <span key={index} className="skill-chip">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
