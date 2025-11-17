import React from "react";
import { useNavigate, useParams } from "react-router-dom";  // ✅ import hooks
import '../styles/badgeDetailsPage.css';
import { getBadgeById } from '../data/badgeData'; // ✅ Import shared badge data

export default function BadgeDetailsPage() {
  const { id } = useParams();         // ✅ get badge id from URL
  const navigate = useNavigate();     // ✅ for navigation
  
  // Check if user is logged in (for conditional rendering)
  const isLoggedIn = !!localStorage.getItem('token');

  // Get badge from shared data
  const badge = getBadgeById(id);

  if (!badge) {
    return <h2 style={{ padding: "20px" }}>Badge not found</h2>;
  }

  return (
    <div className="badge-details-page">
      {/* Header */}
      <div className="details-header">
        <div className="header-info">
          <p>
            This badge was issued to <strong>{badge.issuedTo}</strong>
          </p>
          <span className="header-date">Date issued: {badge.issuedDate}</span>
        </div>
        <div className="actions">
          {/* Show Share button only if user is logged in */}
          {isLoggedIn ? (
            <>
              <button
                className="share-btn"
                onClick={() => navigate(`/share-credential/${id}`)}
              >
                📤 Share
              </button>
              <button className="more-btn" title="More options">⋮</button>
            </>
          ) : (
            <span className="public-view-badge">Public View</span>
          )}
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
