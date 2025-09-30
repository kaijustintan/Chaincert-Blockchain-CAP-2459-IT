import React, { useState } from "react";
import "../styles/profilePage.css";

export default function ProfilePage() {
  const [summary, setSummary] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const badges = [
    {
      id: 1,
      title: "CCNA: Enterprise Networking, Security, and Automation",
      issuer: "Cisco",
      description: "Cisco verifies the earner of this badge successfully.",
      date: "Aug 1, 2024",
      expires: "This credential does not expire",
      credentialId: "b6b4f34c-5053-431c-8cd9-8d2dc22bcc22",
      image: "/images/badge1.png",
    },
    {
      id: 2,
      title: "CCNA: Switching, Routing, and Wireless Essentials",
      issuer: "Cisco",
      description: "Cisco certifies the skills in routing and switching.",
      date: "Apr 16, 2024",
      expires: "This credential does not expire",
      credentialId: "a7e1f34c-2223-431c-8cd9-9d2dc22bcc11",
      image: "/images/badge2.png",
    },
    {
      id: 3,
      title: "Network Defense",
      issuer: "Cisco",
      description: "Cisco certifies knowledge in Network Defense strategies.",
      date: "Nov 26, 2024",
      expires: "This credential does not expire",
      credentialId: "c8f4d44a-3333-555c-9cd9-1a2bc22bcc55",
      image: "/images/badge3.png",
    },
  ];

  const skills = [
    { id: 1, name: "Access Control", evidence: "2 sources of skill evidence" },
    { id: 2, name: "Application Security", evidence: "1 source of skill evidence" },
  ];

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="avatar">👤</div>
        <div className="profile-info">
          <h2>Kyle Justin Tan</h2>
          <p className="profile-link">https://www.chaincert.com/users/kyle-justin-tan</p>
          <div className="profile-actions">
            <button className="link-btn">Edit URL</button> |{" "}
            <button className="link-btn">Copy URL</button> |{" "}
            <button
              className="link-btn"
              onClick={() => window.open("/profile-preview", "_blank")}
            >
              Preview Public Profile
            </button>
          </div>
        </div>
        <div className="edit-btn">
          <button>Edit</button>
        </div>
      </div>

      {/* Profile Summary */}
      <section className="profile-section">
        <h3>Profile</h3>
        <div className="summary-box">
          <label>Personal Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Share more about yourself. This will show on your public profile."
            maxLength={600}
          />
          <div className="summary-footer">
            <span>{summary.length} / 600 characters</span>
            <div className="visibility-toggle">
              <label>Allow my profile to be publicly visible</label>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={() => setIsPublic(!isPublic)}
              />
            </div>
          </div>
          <button className="save-btn">Save</button>
        </div>
      </section>

      {/* Badge Wallet */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Badge Wallet</h3>
          <button className="secondary-btn">+ Upload Other Badges</button>
        </div>
        <div className="badges">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="badge-card"
              onClick={() => setSelectedBadge(badge)}
            >
              <img src={badge.image} alt={badge.title} className="badge-image" />
              <h4>{badge.title}</h4>
              <p>{badge.date}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Skills Wallet */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Skills Wallet</h3>
          <button className="secondary-btn">+ Add Skills</button>
        </div>
        <div className="skills">
          {skills.map((skill) => (
            <div key={skill.id} className="skill-card">
              <h4>{skill.name}</h4>
              <p>{skill.evidence}</p>
              <button className="small-btn">Reorder/Edit</button>
            </div>
          ))}
        </div>
      </section>

      {/* Badge Details Modal */}
      {selectedBadge && (
        <div className="modal-overlay" onClick={() => setSelectedBadge(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Badge Details</h3>
              <button className="close-btn" onClick={() => setSelectedBadge(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <img
                src={selectedBadge.image}
                alt={selectedBadge.title}
                className="modal-img"
              />
              <h4>{selectedBadge.title}</h4>
              <p>
                <strong>Issuing Organization:</strong> {selectedBadge.issuer}
              </p>
              <p>
                <strong>Description:</strong> {selectedBadge.description}
              </p>
              <p>
                <strong>Issuing Date:</strong> {selectedBadge.date}
              </p>
              <p>
                <strong>Expiration Date:</strong> {selectedBadge.expires}
              </p>
              <p>
                <strong>Credential ID:</strong> {selectedBadge.credentialId}
              </p>
              <p>
                <strong>Credential URL:</strong>{" "}
                <a
                  href={`/badge-details/${selectedBadge.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  See Badge Details Page
                </a>
              </p>
            </div>
            <div className="modal-footer">
              {/* ✅ Opens shareCredentialPage */}
              <button
                className="share-btn"
                onClick={() =>
                  window.open(`/share-credential/${selectedBadge.id}`, "_blank")
                }
              >
                Share Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
