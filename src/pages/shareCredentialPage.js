import React from "react";
import { useParams, useNavigate } from "react-router-dom";  // ✅ useNavigate for navigation
import "../styles/shareCredentialPage.css";

export default function ShareCredentialPage() {
  const { id } = useParams();
  const navigate = useNavigate(); // ✅ hook for navigation

  // Example badges (same structure as before)
  const allBadges = {
    1: {
      title: "CCNA: Enterprise Networking, Security, and Automation",
      issuer: "Cisco",
      image: "/images/badge1.png",
    },
    2: {
      title: "CCNA: Switching, Routing, and Wireless Essentials",
      issuer: "Cisco",
      image: "/images/badge2.png",
    },
    3: {
      title: "Network Defense",
      issuer: "Cisco",
      image: "/images/badge3.png",
    },
  };

  const badge = allBadges[id];

  if (!badge) {
    return <h2 style={{ padding: "20px" }}>Badge not found</h2>;
  }

  return (
    <div className="share-credential-page">
      <button className="back-btn" onClick={() => window.history.back()}>
        ← Back
      </button>

      <h2>Share your badge</h2>
      <p>Broadcast your achievement to friends and colleagues to get the recognition you deserve.</p>

      {/* Badge Info */}
      <div className="badge-info">
        <img src={badge.image} alt={badge.title} className="badge-img" />
        <div>
          <h3>{badge.title}</h3>
          <p>Issued by <a href="#">{badge.issuer}</a></p>
        </div>
      </div>

      {/* Share Options */}
      <div className="share-options">
        <div className="share-box">
          <h4>Promote</h4>
          <p>Share your achievement on social media.</p>
          <ul>
            <li>LinkedIn</li>
            <li>🐦 X (Twitter)</li>
            <li>📘 Facebook</li>
          </ul>
        </div>

        <div className="share-box">
          <h4>Publish</h4>
          <p>Send your badge or take it offline.</p>
          <ul>
            <li>📧 Email</li>
            <li>Public Link</li>
            <li>⬇️ Download Badge</li>
            <li>Download Certificate</li>
            <li>&lt;/&gt; Embed Code</li>
          </ul>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="share-footer">
        {/* ✅ Navigate back to ProfilePage */}
        <button className="secondary-btn" onClick={() => navigate("/profile")}>
          View profile
        </button>
        <button className="primary-btn">View dashboard</button>
      </div>
    </div>
  );
}
