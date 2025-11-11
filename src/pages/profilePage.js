import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
import "../styles/profilePage.css";

export default function ProfilePage() {
  // Get user data from localStorage (set during login)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userEmail = user.email || localStorage.getItem('email') || '';
  const userName = user.username || user.name || user.fullName || 'User';
  const userRole = user.role || localStorage.getItem('role') || 'student';
  const userId = user._id || user.id || '';

  const [summary, setSummary] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState(null);
<<<<<<< Updated upstream
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Generate profile URL based on username
  const profileUrl = `https://www.chaincert.com/users/${userName.toLowerCase().replace(/\s+/g, '-')}`;

  // Load user profile data on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await apiService.getUserInfo(userId);
      if (response.success && response.user) {
        setSummary(response.user.summary || '');
        setIsPublic(response.user.isPublic !== undefined ? response.user.isPublic : true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await apiService.updateProfile({
        userId: userId,
        summary: summary,
        isPublic: isPublic
      });

      if (response.success) {
        setSaveMessage('✅ Profile saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('❌ Failed to save profile');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };
=======
  const [isEditingProfile, setIsEditingProfile] = useState(false);
>>>>>>> Stashed changes

  const badges = [
    {
      id: 1,
      title: "CCNA: Enterprise Networking, Security, and Automation",
      issuer: "Cisco",
      description: "Cisco verifies the earner of this badge successfully completed the CCNA: Enterprise Networking, Security, and Automation course.",
      date: "Aug 1, 2024",
      expires: "This credential does not expire",
      credentialId: "b6b4f34c-5053-431c-8cd9-8d2dc22bcc22",
<<<<<<< Updated upstream
      image: "🎓",
=======
      image: "/images/badge1.png",
      skills: ["Network Security", "Automation", "Enterprise Networking"]
>>>>>>> Stashed changes
    },
    {
      id: 2,
      title: "CCNA: Switching, Routing, and Wireless Essentials",
      issuer: "Cisco",
      description: "Cisco certifies the skills in routing and switching fundamentals and wireless network implementation.",
      date: "Apr 16, 2024",
      expires: "This credential does not expire",
      credentialId: "a7e1f34c-2223-431c-8cd9-9d2dc22bcc11",
<<<<<<< Updated upstream
      image: "🌐",
=======
      image: "/images/badge2.png",
      skills: ["Routing", "Switching", "Wireless Networks"]
>>>>>>> Stashed changes
    },
    {
      id: 3,
      title: "Network Defense",
      issuer: "Cisco",
      description: "Cisco certifies knowledge in Network Defense strategies and cybersecurity best practices.",
      date: "Nov 26, 2024",
      expires: "This credential does not expire",
      credentialId: "c8f4d44a-3333-555c-9cd9-1a2bc22bcc55",
<<<<<<< Updated upstream
      image: "🛡️",
=======
      image: "/images/badge3.png",
      skills: ["Network Defense", "Cybersecurity", "Threat Detection"]
>>>>>>> Stashed changes
    },
  ];

  const skills = [
    { id: 1, name: "Access Control", evidence: "2 sources of skill evidence", level: "Advanced" },
    { id: 2, name: "Application Security", evidence: "1 source of skill evidence", level: "Intermediate" },
    { id: 3, name: "Network Security", evidence: "3 sources of skill evidence", level: "Advanced" },
    { id: 4, name: "Threat Detection", evidence: "2 sources of skill evidence", level: "Intermediate" },
  ];

  const handleCopyUrl = () => {
<<<<<<< Updated upstream
    navigator.clipboard.writeText(profileUrl);
    alert('Profile URL copied to clipboard!');
  };

  if (loading) {
    return <div className="profile-page">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="avatar">👤</div>
        <div className="profile-info">
          <h2>{userName}</h2>
          <p className="profile-link">{profileUrl}</p>
          <div className="profile-actions">
            <button className="link-btn">Edit URL</button>
            <span> | </span>
            <button className="link-btn" onClick={handleCopyUrl}>Copy URL</button>
            <span> | </span>
            <button
              className="link-btn"
              onClick={() => window.open("/profile-preview", "_blank")}
            >
              Preview Public Profile
            </button>
          </div>
                {summary && (
            <div className="profile-summary-display">
              <p>{summary}</p>
            </div>
          )}
        </div>
        <div className="edit-btn">
          <button>Edit Profile</button>
        </div>
      </div>

      {/* Account Information */}
      <section className="profile-section">
        <h3>Account Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Full Name</label>
            <span>{userName}</span>
          </div>
          <div className="info-item">
            <label>Email Address</label>
            <span>{userEmail}</span>
          </div>
          <div className="info-item">
            <label>Account Role</label>
            <span className="role-badge">{userRole}</span>
          </div>
          <div className="info-item">
            <label>User ID</label>
            <span className="user-id">{userId || 'N/A'}</span>
          </div>
        </div>
      </section>

      {/* Profile Summary */}
      <section className="profile-section">
        <h3>Personal Summary</h3>
        <div className="summary-box">
=======
    navigator.clipboard.writeText("https://www.chaincert.com/users/kyle-justin-tan");
    alert("Profile URL copied to clipboard!");
  };

  return (
    <div className="profile-page">
      {/* Enhanced Profile Header */}
      <div className="profile-header-card">
        <div className="profile-banner"></div>
        <div className="profile-header-content">
          <div className="avatar-section">
            <div className="avatar-wrapper">
              <div className="avatar">
                <span className="avatar-icon">👤</span>
              </div>
              <button className="avatar-edit-btn" title="Change Profile Picture">
                <span>📷</span>
              </button>
            </div>
          </div>
          
          <div className="profile-details">
            <div className="profile-name-section">
              <h1 className="profile-name">Kyle Justin Tan</h1>
              <span className="profile-badge">✓ Verified User</span>
            </div>
            
            <div className="profile-url-section">
              <span className="profile-url">https://www.chaincert.com/users/kyle-justin-tan</span>
              <div className="url-actions">
                <button className="action-link" onClick={() => setIsEditingProfile(true)}>
                  <span className="icon">✏️</span> Edit URL
                </button>
                <span className="separator">•</span>
                <button className="action-link" onClick={handleCopyUrl}>
                  <span className="icon">📋</span> Copy URL
                </button>
                <span className="separator">•</span>
                <button 
                  className="action-link primary"
                  onClick={() => window.open("/profile-preview", "_blank")}
                >
                  <span className="icon">👁️</span> Preview Public Profile
                </button>
              </div>
            </div>
            
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{badges.length}</span>
                <span className="stat-label">Badges Earned</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">{skills.length}</span>
                <span className="stat-label">Skills</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">100%</span>
                <span className="stat-label">Profile Complete</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Profile Summary Section */}
      <section className="section-card">
        <div className="section-header-enhanced">
          <div className="section-title-group">
            <span className="section-icon">📝</span>
            <h2 className="section-title">Profile Summary</h2>
          </div>
        </div>
        
        <div className="summary-container">
>>>>>>> Stashed changes
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Share your professional story, achievements, and career goals. This will appear on your public profile and help others understand your expertise."
            maxLength={600}
            className="summary-textarea"
          />
<<<<<<< Updated upstream
          <div className="summary-footer">
            <span className="char-count">{summary.length} / 600 characters</span>
            <div className="visibility-toggle">
              <label>Public Profile</label>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={() => setIsPublic(!isPublic)}
              />
            </div>
          </div>
          <button 
            className="save-btn" 
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('✅') ? 'success' : 'error'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      </section>

      {/* Badge Wallet */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Badge Wallet</h3>
          <button className="secondary-btn">+ Upload Badge</button>
=======
          
          <div className="summary-meta">
            <div className="character-count">
              <span className={summary.length > 550 ? "warning" : ""}>
                {summary.length} / 600 characters
              </span>
            </div>
            
            <div className="visibility-control">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={() => setIsPublic(!isPublic)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">
                {isPublic ? "🌐 Profile is Public" : "🔒 Profile is Private"}
              </span>
            </div>
          </div>
          
          <button className="save-btn-enhanced">
            <span className="btn-icon">💾</span>
            Save Changes
          </button>
        </div>
      </section>

      {/* Enhanced Badge Wallet */}
      <section className="section-card">
        <div className="section-header-enhanced">
          <div className="section-title-group">
            <span className="section-icon">🏆</span>
            <h2 className="section-title">Badge Wallet</h2>
            <span className="badge-count">{badges.length} Badges</span>
          </div>
          <button className="add-btn">
            <span className="btn-icon">➕</span>
            Upload Other Badges
          </button>
>>>>>>> Stashed changes
        </div>
        
        <div className="badges-grid">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="badge-card-enhanced"
              onClick={() => setSelectedBadge(badge)}
            >
<<<<<<< Updated upstream
              <div className="badge-image">{badge.image}</div>
              <h4>{badge.title}</h4>
              <p className="badge-date">{badge.date}</p>
              <p className="badge-issuer">Issued by {badge.issuer}</p>
=======
              <div className="badge-image-wrapper">
                <img src={badge.image} alt={badge.title} className="badge-image" />
                <div className="badge-overlay">
                  <span className="view-details">View Details</span>
                </div>
              </div>
              
              <div className="badge-content">
                <h3 className="badge-title">{badge.title}</h3>
                <p className="badge-issuer">
                  <span className="issuer-icon">🏢</span>
                  {badge.issuer}
                </p>
                <p className="badge-date">
                  <span className="date-icon">📅</span>
                  Issued {badge.date}
                </p>
                
                <div className="badge-skills">
                  {badge.skills.slice(0, 2).map((skill, idx) => (
                    <span key={idx} className="skill-tag">{skill}</span>
                  ))}
                  {badge.skills.length > 2 && (
                    <span className="skill-tag more">+{badge.skills.length - 2}</span>
                  )}
                </div>
              </div>
              
              <div className="badge-actions">
                <button className="badge-action-btn share" onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/share-credential/${badge.id}`, "_blank");
                }}>
                  <span>🔗</span> Share
                </button>
                <button className="badge-action-btn download" onClick={(e) => e.stopPropagation()}>
                  <span>⬇️</span> Download
                </button>
              </div>
>>>>>>> Stashed changes
            </div>
          ))}
          
          {/* Add New Badge Card */}
          <div className="badge-card-enhanced add-new">
            <div className="add-new-content">
              <span className="add-icon">➕</span>
              <h3>Add New Badge</h3>
              <p>Upload external credentials</p>
            </div>
          </div>
        </div>
      </section>

<<<<<<< Updated upstream
      {/* Skills Wallet */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Skills Wallet</h3>
          <button className="secondary-btn">+ Add Skill</button>
=======
      {/* Enhanced Skills Wallet */}
      <section className="section-card">
        <div className="section-header-enhanced">
          <div className="section-title-group">
            <span className="section-icon">💡</span>
            <h2 className="section-title">Skills Wallet</h2>
            <span className="badge-count">{skills.length} Skills</span>
          </div>
          <button className="add-btn">
            <span className="btn-icon">➕</span>
            Add Skills
          </button>
>>>>>>> Stashed changes
        </div>
        
        <div className="skills-grid">
          {skills.map((skill) => (
<<<<<<< Updated upstream
            <div key={skill.id} className="skill-card">
              <div className="skill-info">
                <h4>{skill.name}</h4>
                <p>{skill.evidence}</p>
              </div>
              <button className="small-btn">Edit</button>
=======
            <div key={skill.id} className="skill-card-enhanced">
              <div className="skill-header">
                <div className="skill-info">
                  <h3 className="skill-name">{skill.name}</h3>
                  <span className={`skill-level ${skill.level.toLowerCase()}`}>
                    {skill.level}
                  </span>
                </div>
                <button className="skill-menu-btn">⋮</button>
              </div>
              
              <p className="skill-evidence">
                <span className="evidence-icon">📊</span>
                {skill.evidence}
              </p>
              
              <div className="skill-actions">
                <button className="skill-action-btn">
                  <span>✏️</span> Edit
                </button>
                <button className="skill-action-btn">
                  <span>🔄</span> Reorder
                </button>
              </div>
>>>>>>> Stashed changes
            </div>
          ))}
        </div>
      </section>

      {/* Enhanced Modal */}
      {selectedBadge && (
<<<<<<< Updated upstream
        <div className="modal-overlay" onClick={() => setSelectedBadge(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Badge Details</h3>
              <button className="close-btn" onClick={() => setSelectedBadge(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-badge-image">{selectedBadge.image}</div>
              <h4>{selectedBadge.title}</h4>
              <div className="modal-details">
                <p><strong>Issuing Organization:</strong> {selectedBadge.issuer}</p>
                <p><strong>Description:</strong> {selectedBadge.description}</p>
                <p><strong>Issuing Date:</strong> {selectedBadge.date}</p>
                <p><strong>Expiration Date:</strong> {selectedBadge.expires}</p>
                <p><strong>Credential ID:</strong> {selectedBadge.credentialId}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="share-btn"
                onClick={() =>
                  window.open(`/share-credential/${selectedBadge.id}`, "_blank")
                }
              >
                Share Badge
              </button>
=======
        <div className="modal-overlay-enhanced" onClick={() => setSelectedBadge(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedBadge(null)}>
              ✕
            </button>
            
            <div className="modal-content-enhanced">
              <div className="modal-header-section">
                <div className="modal-badge-image">
                  <img src={selectedBadge.image} alt={selectedBadge.title} />
                </div>
                <div className="modal-badge-info">
                  <h2>{selectedBadge.title}</h2>
                  <p className="modal-issuer">
                    <span className="icon">🏢</span>
                    Issued by {selectedBadge.issuer}
                  </p>
                </div>
              </div>
              
              <div className="modal-body-section">
                <div className="info-group">
                  <label>Description</label>
                  <p>{selectedBadge.description}</p>
                </div>
                
                <div className="info-row">
                  <div className="info-group">
                    <label>📅 Issue Date</label>
                    <p>{selectedBadge.date}</p>
                  </div>
                  <div className="info-group">
                    <label>⏰ Expiration</label>
                    <p>{selectedBadge.expires}</p>
                  </div>
                </div>
                
                <div className="info-group">
                  <label>🆔 Credential ID</label>
                  <p className="credential-id">{selectedBadge.credentialId}</p>
                </div>
                
                <div className="info-group">
                  <label>💼 Skills Demonstrated</label>
                  <div className="modal-skills">
                    {selectedBadge.skills.map((skill, idx) => (
                      <span key={idx} className="modal-skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
                
                <div className="info-group">
                  <label>🔗 Verification URL</label>
                  <a
                    href={`/badge-details/${selectedBadge.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="verification-link"
                  >
                    View Full Badge Details →
                  </a>
                </div>
              </div>
              
              <div className="modal-footer-section">
                <button
                  className="modal-btn primary"
                  onClick={() => window.open(`/share-credential/${selectedBadge.id}`, "_blank")}
                >
                  <span>🔗</span> Share Badge
                </button>
                <button className="modal-btn secondary">
                  <span>⬇️</span> Download Certificate
                </button>
                <button className="modal-btn secondary">
                  <span>📧</span> Email Verification
                </button>
              </div>
>>>>>>> Stashed changes
            </div>
          </div>
        </div>
      )}
    </div>
  );
}