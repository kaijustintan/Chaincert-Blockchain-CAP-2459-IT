import React, { useState, useEffect, useRef } from "react";
import apiService from "../services/apiService";
import "../styles/profilePage.css";

export default function ProfilePage() {
  // Get user data from localStorage (set during login)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = user.email || localStorage.getItem("email") || "";
  const userName = user.username || user.name || user.fullName || "User";
  const userRole = user.role || localStorage.getItem("role") || "student";
  const userId = user._id || user.id || "";

  const [summary, setSummary] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Dynamic credentials from CouchDB (replaces static badges array)
  // - polo
  const [credentials, setCredentials] = useState([]);
  const [credLoading, setCredLoading] = useState(true);
  const [credError, setCredError] = useState(null);
  const [selectedCred, setSelectedCred] = useState(null);

  // See History state (same as studentDashboard)
  // - polo
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [avatar, setAvatar] = useState("👤"); // ✅ <-- ADD THIS LINE

  // Ref for the hidden file input
  const fileInputRef = useRef(null);

  // Generate profile URL based on username
  const profileUrl = `https://www.chaincert.com/users/${userName
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  // Load user profile data on component mount
  useEffect(() => {
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await apiService.getUserInfo(userId);
      if (response.success && response.user) {
        setSummary(response.user.summary || '');
        setIsPublic(response.user.isPublic !== undefined ? response.user.isPublic : true);
        if (response.user.profilePicture) { // ✅ <-- ADD THIS
          setAvatar(response.user.profilePicture); // ✅ <-- ADD THIS
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch credentials from CouchDB on mount (same as studentDashboard)
  // - polo
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setCredLoading(true);
        setCredError(null);
        const data = await apiService.Get_UserCredentials(userId);
        setCredentials(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("[PROFILE PAGE] Error fetching credentials:", err);
        setCredError("Failed to load credentials.");
      } finally {
        setCredLoading(false);
      }
    };
    if (userId) fetchCredentials();
  }, [userId]);

  // formatDate helper
  // - polo
  const formatDate = (iso) => {
    if (!iso) return "N/A";
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  };

  // StatusPill helper
  // - polo
  const StatusPill = ({ status }) => {
    const normalized = status === "issued" ? "active" : status;
    return (
      <span className={`status-pill ${normalized}`}>
        {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
      </span>
    );
  };

  // See History handler (same as studentDashboard)
  // - polo
  const handleSeeHistory = async (cred) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      setHistoryData(null);
      setHistoryOpen(true);
      const blockchainId = cred.blockchainId;
      if (!blockchainId) {
        setHistoryError("No blockchain ID found for this credential.");
        setHistoryLoading(false);
        return;
      }
      console.log("[PROFILE PAGE] Fetching history for:", blockchainId);
      const result = await apiService.Get_CredentialHistoryById(blockchainId);
      setHistoryData(result);
    } catch (err) {
      console.error("[PROFILE PAGE] History fetch error:", err);
      setHistoryError("Failed to load credential history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeCredModal = () => {
    setSelectedCred(null);
    setHistoryOpen(false);
    setHistoryData(null);
    setHistoryError(null);
  };

  const closeHistorySection = () => {
    setHistoryOpen(false);
    setHistoryData(null);
    setHistoryError(null);
  };

  // Derive skills from credentials (same source, no extra fetch)
  // - polo
  const derivedSkills = [...new Set(credentials.map(c => c.credentialType).filter(Boolean))];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      const response = await apiService.updateProfile({
        userId: userId,
        summary: summary,
        isPublic: isPublic,
      });

      if (response.success) {
        setSaveMessage("✅ Profile saved successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("❌ Failed to save profile");
        setTimeout(() => setSaveMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveMessage("❌ Failed to save profile");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Avatar: open file picker
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Avatar: handle file selection
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("File selected:", file.name);
    alert(
      `File selected: ${file.name}\n\nIn the next step, we'll hook this up to the backend.`
    );
    // This is the new logic
    try {
      const formData = new FormData();
      formData.append('profilePicture', file); // 'profilePicture' must match the backend
      formData.append('userId', userId);      // Send the userId too
      
      const response = await apiService.uploadProfilePicture(formData);
      
      if (response.success) {
        alert('Profile picture updated successfully!');
        setAvatar(response.imageUrl); // ✅ <-- ADD THIS (replaces the TODO)
        // TODO: We will add code here to make the new image
        // appear immediately without a refresh.
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert('An error occurred while uploading the image.');
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard
      .writeText(profileUrl)
      .then(() => {
        alert("Profile URL copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy URL:", err);
      });
  };

  if (loading) {
    return <div className="profile-page">Loading profile...</div>;
  }

  return (
  <div className="profile-page">
    {/* Profile Header */}
    <div className="profile-header">

      {/* 4. MODIFIED THE AVATAR JSX */}
      <div className="avatar-wrapper">
        {/* THIS IS THE CHANGE */}
        <div className="avatar">
          {avatar.startsWith('data:') ? (
            <img src={avatar} alt="Profile" />
          ) : (
            avatar
          )}
        </div>

        <button
          className="avatar-edit-btn"
          onClick={handleAvatarClick}
          title="Change profile picture"
        >
            ✏️
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/gif"
          />
        </div>

        <div className="profile-info">
          <h2>{userName}</h2>
          <p className="profile-link">{profileUrl}</p>
          <div className="profile-actions">
            <button className="link-btn">Edit URL</button>
            <span> | </span>
            <button className="link-btn" onClick={handleCopyUrl}>
              Copy URL
            </button>
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
            <span className="user-id">{userId || "N/A"}</span>
          </div>
        </div>
      </section>

      {/* Profile Summary */}
      <section className="profile-section">
        <h3>Personal Summary</h3>
        <div className="summary-box">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Share your professional story, achievements, and career goals. This will appear on your public profile and help others understand your expertise."
            maxLength={600}
            className="summary-textarea"
          />
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
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          {saveMessage && (
            <div
              className={`save-message ${
                saveMessage.includes("✅") ? "success" : "error"
              }`}
            >
              {saveMessage}
            </div>
          )}
        </div>
      </section>

      {/* Credential Wallet — dynamic from CouchDB (replaces static badges)
          Technical: Same fetch + modal pattern as studentDashboard.js
          // - polo
      */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Credential Wallet</h3>
        </div>

        {credLoading && <div className="empty-card">Loading credentials...</div>}
        {!credLoading && credError && <div className="empty-card error">{credError}</div>}
        {!credLoading && !credError && credentials.length === 0 && (
          <div className="empty-card">No credentials have been issued to you yet.</div>
        )}

        {!credLoading && !credError && credentials.length > 0 && (
          <div className="badges-grid">
            {credentials.map((cred) => (
              <div
                key={cred._id}
                className="badge-card"
                onClick={() => { setSelectedCred(cred); setHistoryOpen(false); setHistoryData(null); }}
              >
                <div className="badge-image">🎓</div>
                <h4>{cred.credentialName}</h4>
                <StatusPill status={cred.status} />
                <p className="badge-issuer">Issued by {cred.issuerName}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Skills Wallet — derived from credentials (no separate fetch)
          Technical: Extracts unique credentialTypes from fetched credentials
          // - polo
      */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Skills Wallet</h3>
        </div>
        {derivedSkills.length === 0 ? (
          <div className="empty-card">No skills derived yet. Skills are based on your issued credentials.</div>
        ) : (
          <div className="skills-grid">
            {derivedSkills.map((skill, idx) => (
              <div key={idx} className="skill-card">
                <div className="skill-info">
                  <h4>{skill}</h4>
                  <p>Derived from your issued credentials</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Credential Detail Modal (same as studentDashboard)
          // - polo
      */}
      {selectedCred && (
        <div className="modal-overlay" onClick={closeCredModal}>
          <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCred.credentialName}</h2>
              <button className="close-btn" onClick={closeCredModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Type</span>
                <span className="detail-value">{selectedCred.credentialType || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Issuer</span>
                <span className="detail-value">{selectedCred.issuerName || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value"><StatusPill status={selectedCred.status} /></span>
              </div>
              {(selectedCred.status === "revoked" || selectedCred.status === "REVOKED") && selectedCred.rejectionReason && (
                <div className="detail-row">
                  <span className="detail-label">Rejection Reason</span>
                  <span className="detail-value" style={{color: "#ff6b6b"}}>{selectedCred.rejectionReason}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Issued On</span>
                <span className="detail-value">{formatDate(selectedCred.savedToUserWalletAt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Expiry Date</span>
                <span className="detail-value">{formatDate(selectedCred.expiryDate)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Blockchain ID</span>
                <span className="detail-value mono">{selectedCred.blockchainId || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Visibility</span>
                <span className="detail-value">
                  <button
                    className={`visibility-toggle-btn ${selectedCred.visibility === 'private' ? 'private' : 'public'}`}
                    onClick={async (e) => {
                      e.stopPropagation();
                      console.log('[DEBUG] Full selectedCred object:', JSON.stringify(selectedCred, null, 2));
                      console.log('[DEBUG] blockchainId value:', selectedCred.blockchainId);
                      const newVisibility = selectedCred.visibility === 'private' ? 'public' : 'private';
                      try {
                        await apiService.Update_CredentialVisibility(selectedCred.blockchainId, newVisibility);
                        // Update local state so UI reflects change immediately
                        // - polo
                        setSelectedCred(prev => ({ ...prev, visibility: newVisibility }));
                        setCredentials(prev => prev.map(c =>
                          c._id === selectedCred._id ? { ...c, visibility: newVisibility } : c
                        ));
                      } catch (err) {
                        console.error('[PROFILE PAGE] Error updating visibility:', err);
                        alert('Failed to update visibility. Please try again.');
                      }
                    }}
                  >
                    {selectedCred.visibility === 'private' ? '🔒 Private' : '🌐 Public'}
                  </button>
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="action-btn history" onClick={() => handleSeeHistory(selectedCred)}>
                📜 See History
              </button>
            </div>
            {historyOpen && (
              <div className="history-section">
                <div className="history-header">
                  <h3>Blockchain History</h3>
                  <button className="close-btn small" onClick={closeHistorySection}>✕</button>
                </div>
                {historyLoading && <p className="history-loading">Loading history...</p>}
                {historyError && <p className="history-error">{historyError}</p>}
                {historyData && historyData.history && (
                  <div className="history-list">
                    {historyData.history.map((entry, idx) => (
                      <div key={idx} className="history-entry">
                        <div className="history-entry-header">
                          <span className="history-tx-id">{entry.txId || `TX-${idx + 1}`}</span>
                          <span className="history-timestamp">
                            {entry.timestamp ? formatDate(entry.timestamp) : "N/A"}
                          </span>
                        </div>
                        <div className="history-entry-status">
                          Status: <strong>{entry.value?.status || entry.status || "N/A"}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}