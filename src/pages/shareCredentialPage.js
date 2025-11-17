import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";  // ✅ useNavigate for navigation
import "../styles/shareCredentialPage.css";
import { getBadgeById } from '../data/badgeData'; // ✅ Import shared badge data

export default function ShareCredentialPage() {
  const { id } = useParams();
  const navigate = useNavigate(); // ✅ hook for navigation
  const [copied, setCopied] = useState(false);

  // Get badge from shared data (matches badgeDetailsPage)
  const badge = getBadgeById(id);

  // Generate public share link - uses badge-details route (now public)
  const generatePublicLink = () => {
    // Get current origin (works for localhost and production)
    const origin = window.location.origin;
    // Create public link using badge-details route (now accessible without login)
    return `${origin}/badge-details/${id}`;
  };

  const publicLink = generatePublicLink();

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000); // Reset after 3 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = publicLink;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        alert("Failed to copy link. Please copy manually: " + publicLink);
      }
      document.body.removeChild(textArea);
    }
  };

  // Open public link in new tab
  const handleOpenLink = () => {
    window.open(publicLink, "_blank");
  };

  if (!badge) {
    return (
      <div className="share-credential-page">
        <div className="share-credential-container">
          <h2 style={{ padding: "40px 20px", textAlign: "center", color: "#fff" }}>
            Badge not found
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="share-credential-page">
      <div className="share-credential-container">
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
            <h4>📢 Promote</h4>
            <p>Share your achievement on social media.</p>
            <ul>
              <li>🔗 LinkedIn</li>
              <li>🐦 X (Twitter)</li>
              <li>📘 Facebook</li>
            </ul>
          </div>

          <div className="share-box">
            <h4>📤 Publish</h4>
            <p>Send your badge or take it offline.</p>
            <ul>
              <li>📧 Email</li>
              <li>
                <div style={{ marginTop: "10px" }}>
                  <strong>🔗 Public Link</strong>
                  <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      background: "#f5f5f5",
                      padding: "8px",
                      borderRadius: "4px"
                    }}>
                      <input
                        type="text"
                        value={publicLink}
                        readOnly
                        style={{
                          flex: 1,
                          padding: "6px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontFamily: "monospace"
                        }}
                      />
                      <button
                        onClick={handleCopyLink}
                        style={{
                          padding: "6px 12px",
                          background: copied ? "#28a745" : "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {copied ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                    <button
                      onClick={handleOpenLink}
                      style={{
                        padding: "8px 16px",
                        background: "#17a2b8",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        width: "100%"
                      }}
                    >
                      👁️ Preview Public Link
                    </button>
                  </div>
                </div>
              </li>
              <li>⬇️ Download Badge</li>
              <li>📄 Download Certificate</li>
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
          <button className="primary-btn" onClick={() => navigate("/dashboard")}>
            View dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
