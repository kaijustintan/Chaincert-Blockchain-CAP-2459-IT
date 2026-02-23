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

  // Dynamic credentials from CouchDB (replaces static badges)
  // - polo
  const [credentials, setCredentials] = useState([]);
  const [credLoading, setCredLoading] = useState(true);

    useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response = await apiService.getUserInfo(userId);
        if (response.success && response.user) {
          setSummary(response.user.summary || '');

          // Fetch credentials for public profile display
          // - polo
          try {
            const data = await apiService.Get_UserCredentials(userId);
            // Only show public credentials 
            setCredentials(Array.isArray(data) ? data : []);
          } catch (err) {
            console.error("[PROFILE PREVIEW] Error fetching credentials:", err);
          } finally {
            setCredLoading(false);
          }

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

  if (loading) {
    return (
      <div className="profile-preview">
        <div className="loading">Loading public profile...</div>
      </div>
    );
  }

  // Derive skills from credentials (same as profilePage)
  // - polo
  const derivedSkills = [...new Set(credentials.map(c => c.credentialType).filter(Boolean))];

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
          {credLoading && <div>Loading credentials...</div>}
          {!credLoading && credentials.length === 0 && (
            <div>No public credentials yet.</div>
          )}
          {!credLoading && credentials.map((cred) => (
            <div key={cred._id} className={`badge-card ${cred.status === 'revoked' ? 'revoked-card' : ''}`}>
            <div className="badge-img">🎓</div>
            <h4>{cred.credentialName}</h4>
            {/* Show revoked status visually on public profile // - polo */}
            {cred.status === 'revoked' && (
              <span className="status-pill revoked">Revoked</span>
            )}
            <p className="issuer">{cred.issuerName}</p>
            <p className="date">{cred.savedToUserWalletAt ? new Date(cred.savedToUserWalletAt).toLocaleDateString() : "N/A"}</p>
          </div>
          ))}
        </div>
      </section>

      {/* Skills Section */}
      <section className="skills-section">
        <h3>Skills</h3>
        <div className="skills-grid">
          {derivedSkills.length === 0 ? (
            <div>No skills yet.</div>
          ) : (
            derivedSkills.map((skill, idx) => (
              <div key={idx} className="skill-badge">{skill}</div>
            ))
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="preview-footer">
        <p>Verified on ChainCert • Blockchain-Secured Credentials</p>
      </footer>
    </div>
  );
}
