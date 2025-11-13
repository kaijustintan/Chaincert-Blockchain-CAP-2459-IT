import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
import '../styles/profilePreview.css';

export default function ProfilePreview() {
  // Get user data from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.username || user.name || user.fullName || 'User';
  const userEmail = user.email || localStorage.getItem('email') || '';
  const userRole = user.role || localStorage.getItem('role') || 'student';
  const userId = user._id || user.id || '';

  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [avatar, setAvatar] = useState("👤"); // ✅ avatar state

    useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response = await apiService.getUserInfo(userId);
        if (response.success && response.user) {
          setSummary(response.user.summary || '');

          // ✅ load avatar if profilePicture exists
          if (response.user.profilePicture) {
            setAvatar(response.user.profilePicture);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId]);

  const badges = [
    {
      id: 1,
      title: "CCNA: Enterprise Networking, Security, and Automation",
      issuer: "Cisco",
      date: "Issued Aug 1, 2024",
      image: "🎓",
    },
    {
      id: 2,
      title: "CCNA: Switching, Routing, and Wireless Essentials",
      issuer: "Cisco",
      date: "Issued Apr 16, 2024",
      image: "🌐",
    },
    {
      id: 3,
      title: "Network Defense",
      issuer: "Cisco",
      date: "Issued Nov 26, 2024",
      image: "🛡️",
    },
  ];

  const skills = [
    { id: 1, name: "Access Control" },
    { id: 2, name: "Application Security" },
    { id: 3, name: "Network Defense" },
  ];

  if (loading) {
    return (
      <div className="profile-preview">
        <div className="loading">Loading public profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-preview">
      {/* Header */}
      <div className="preview-header">
        {/* ✅ avatar now supports data URL image or emoji */}
        <div className="avatar">
          {avatar && avatar.startsWith('data:') ? (
            <img src={avatar} alt="Profile" />
          ) : (
            avatar
          )}
        </div>

        <h2>{userName}</h2>
        <p className="user-role">{userRole}</p>
        {summary && (
          <p className="user-summary">{summary}</p>
        )}
      </div>

      {/* About Section */}
      <section className="about-section">
        <h3>About</h3>
        <div className="about-content">
          <div className="about-item">
            <span className="label">Email</span>
            <span className="value">{userEmail}</span>
          </div>
          <div className="about-item">
            <span className="label">Role</span>
            <span className="value" style={{ textTransform: 'capitalize' }}>{userRole}</span>
          </div>
        </div>
      </section>

      {/* Badge Wallet */}
      <section className="badge-wallet">
        <h3>Credentials & Badges</h3>
        <div className="badge-grid">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="badge-card"
              onClick={() =>
                window.open(`/profile-preview/badge-details/${badge.id}`, "_blank")
              }
            >
              <div className="badge-img">{badge.image}</div>
              <h4>{badge.title}</h4>
              <p className="issuer">{badge.issuer}</p>
              <p className="date">{badge.date}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Skills Section */}
      <section className="skills-section">
        <h3>Skills</h3>
        <div className="skills-grid">
          {skills.map((skill) => (
            <div key={skill.id} className="skill-badge">
              {skill.name}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="preview-footer">
        <p>Verified on ChainCert • Blockchain-Secured Credentials</p>
      </footer>
    </div>
  );
}
