import React, { useState, useEffect, useRef } from "react";
import apiService from "../services/apiService";
import "../styles/profilePage.css";

export default function ProfilePage() {
  // Get user data from localStorage (set during login)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = user.email || localStorage.getItem("email") || "";
  const userRole = user.role || localStorage.getItem("role") || "student";
  const userId = user._id || user.id || "";
  // - polo: displayName as state so it updates without full reload
  const [displayName, setDisplayName] = useState(user.username || user.name || user.fullName || "User");
  const userName = displayName;

  const [summary, setSummary] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Dynamic credentials from CouchDB (replaces static badges array)
  // - polo
  const [credentials, setCredentials] = useState([]);
  const [credLoading, setCredLoading] = useState(true);
  const [credError, setCredError] = useState(null);
  const [selectedCred, setSelectedCred] = useState(null);

  // Show all toggle for credential wallet - polo
const [showAll, setShowAll] = useState(false);
  // - polo: 13C skill click → show source credential
  const [selectedSkill, setSelectedSkill] = useState(null);

  // Drag-to-reorder state - polo
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Share Profile modal state - polo
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareRecipientEmail, setShareRecipientEmail] = useState('');
  const [shareDuration, setShareDuration] = useState('7');
  const [shareGeneratedUrl, setShareGeneratedUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  // See History state (same as studentDashboard)
  // - polo
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [avatar, setAvatar] = useState("👤");

  // - polo: unified edit profile mode 
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editNameInput, setEditNameInput] = useState(userName);
  const [editSummaryInput, setEditSummaryInput] = useState(summary);
  const [editIsPublic, setEditIsPublic] = useState(isPublic);

  // Ref for the hidden file input
  const fileInputRef = useRef(null);

  // pending profile picture (not yet uploaded, only on Save Changes)
  const [pendingAvatar, setPendingAvatar] = useState(null); // { file, previewUrl }

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
        // Sort by currentOrder so user's custom order is preserved - polo
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => (a.currentOrder ?? 0) - (b.currentOrder ?? 0))
          : [];
        setCredentials(sorted);
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
      const result = await apiService.Get_CredentialHistory(blockchainId);
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

  // Derive skills from credentials — reads skills array first, falls back to credentialType - polo
  const derivedSkills = [...new Set(
    credentials.flatMap(c =>
      Array.isArray(c.skills) && c.skills.length > 0
        ? c.skills
        : (c.credentialType ? [c.credentialType] : [])
    )
  )];

  // Drag-to-reorder handlers - polo
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder credentials array locally
    const updated = [...credentials];
    const dragged = updated.splice(draggedIndex, 1)[0];
    updated.splice(index, 0, dragged);
    setDraggedIndex(index);
    setCredentials(updated);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    // Save new order to CouchDB - polo
    setIsSavingOrder(true);
    try {
      await Promise.all(
        credentials.map((cred, index) =>
          apiService.Update_CredentialOrder(cred.blockchainId, index + 1)
        )
      );
      // Update local currentOrder values to match saved order - polo
      setCredentials(prev =>
        prev.map((cred, index) => ({ ...cred, currentOrder: index + 1 }))
      );
    } catch (err) {
      console.error('[PROFILE PAGE] Error saving credential order:', err);
      alert('Failed to save order. Please try again.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  // unified edit profile save handler 
  const handleOpenEditProfile = () => {
    setEditNameInput(userName);
    setEditSummaryInput(summary);
    setEditIsPublic(isPublic);
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    // revert preview if picture was not saved
    if (pendingAvatar) {
      setAvatar(
        JSON.parse(localStorage.getItem('user') || '{}').profilePicture || '👤'
      );
      setPendingAvatar(null);
    }
    setIsEditingProfile(false);
  };

  const handleSaveEditProfile = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const trimmedName = editNameInput.trim();
      console.log("[DEBUG] Saving profile with name:", trimmedName);

      // upload pending profile picture if one was selected
      if (pendingAvatar?.file) {
        const formData = new FormData();
        formData.append('profilePicture', pendingAvatar.file);
        formData.append('userId', userId);
        const picResponse = await apiService.uploadProfilePicture(formData);
        if (picResponse.success) {
          setAvatar(picResponse.imageUrl);
        }
        setPendingAvatar(null); // clear pending after upload
      }

      await apiService.updateProfile({
        userId,
        username: trimmedName || userName,
        summary: editSummaryInput,
        isPublic: editIsPublic,
      });
      // Update localStorage and state immediately - no reload needed - polo
      const finalName = trimmedName || userName;
      const updatedUser = { ...user, name: finalName, username: finalName };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setDisplayName(finalName); // - polo: update display immediately without reload
      setSummary(editSummaryInput);
      setIsPublic(editIsPublic);
      setEditNameInput(finalName);
      setIsEditingProfile(false);
      setSaveMessage("✅ Your profile has been updated successfully.");
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setSaveMessage("❌ Something went wrong while saving your profile. Please try again."); 
      setTimeout(() => setSaveMessage(""), 4000);
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

  // Avatar: handle file selection — only preview locally, upload on Save Changes 
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPendingAvatar({ file, previewUrl }); // store for upload on save
    setAvatar(previewUrl); // show preview immediately in UI only
  };

  // share type toggle — 'specific' or 'public'
  const [shareType, setShareType] = useState('specific');

  // Share Profile handlers - polo
  const handleOpenShareModal = () => {
    setShareRecipientEmail('');
    setShareDuration('7');
    setShareGeneratedUrl('');
    setShareError('');
    setShareCopied(false);
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setShareGeneratedUrl('');
    setShareError('');
  };

  const handleGenerateShareLink = async () => {
    // handle both specific and public share types
    if (shareType === 'specific' && !shareRecipientEmail.trim()) {
      setShareError('Recipient email is required.');
      return;
    }
    setShareLoading(true);
    setShareError('');
    setShareGeneratedUrl('');
    try {
      let result;
      if (shareType === 'specific') {
        result = await apiService.generateProfileShareLink({
          recipientEmail: shareRecipientEmail.trim(),
          durationDays: shareDuration
        });
      } else {
        result = await apiService.generatePublicShareLink({
          durationDays: shareDuration
        });
      }
      if (result.success) {
        setShareGeneratedUrl(result.shareUrl);
      } else {
        setShareError(result.message || 'Failed to generate link.');
      }
    } catch (err) {
      console.error('[SHARE] Error generating link:', err);
      setShareError('Failed to generate link. Please try again.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareGeneratedUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
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
          {avatar.startsWith('data:') || avatar.startsWith('blob:') ? (
            <img src={avatar} alt="Profile" /> // handle both base64 and blob preview URLs
          ) : (
            avatar
          )}
        </div>

        {/* Avatar edit button — only clickable/visible in edit mode - polo */}
        {isEditingProfile && (
          <button
            className="avatar-edit-btn"
            onClick={handleAvatarClick}
            title="Change profile picture"
            style={{ opacity: 1, transform: "scale(1)" }}
          >
            ✏️
          </button>
        )}
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
          {/* Hide profile actions for admin role */}
          {userRole !== "admin" && (
            <div className="profile-actions">
              <button
                className="link-btn"
                onClick={() => window.open(`/profile-preview?userId=${userId}`, "_blank")}
              >
                Preview Public Profile
              </button>
              <span> | </span>
              <button className="link-btn" onClick={handleOpenShareModal}> 
                Share Profile
              </button>
            </div>
          )}

          {summary && !isEditingProfile && (
            <div className="profile-summary-display">
              <p>{summary}</p>
            </div>
          )}
        </div>
        {/* Edit Profile / Save / Cancel buttons - polo */}
        <div className="edit-btn">
          {!isEditingProfile ? (
            <button type="button" onClick={handleOpenEditProfile}>Edit Profile</button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleSaveEditProfile}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={handleCancelEditProfile}
                disabled={isSaving}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#aaa",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Information */}
      <section className="profile-section">
        <h3>Account Information</h3>
        <div className="info-grid">

          {/* Full Name — editable in edit mode, read-only otherwise - polo */}
          <div className="info-item">
            <label>Full Name</label>
            {isEditingProfile ? (
              <input
                type="text"
                value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid #a78bfa",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "6px 10px",
                  fontSize: "14px",
                  outline: "none",
                  width: "100%",
                }}
              />
            ) : (
              <span>{userName}</span>
            )}
          </div>

          {/* Email — always read only */}
          <div className="info-item">
            <label>Email Address</label>
            <span title="Email cannot be changed" style={{ cursor: "not-allowed", opacity: 0.7 }}>
              {userEmail}
            </span>
          </div>

          {/* Account Role — always read only */}
          <div className="info-item">
            <label>Account Role</label>
            <span title="Role is system-managed and cannot be changed" style={{ cursor: "not-allowed" }}>
              <span className="role-badge">{userRole}</span>
            </span>
          </div>

          {/* User ID — always read only */}
          <div className="info-item">
            <label>User ID</label>
            <span title="User ID is system-managed" className="user-id" style={{ cursor: "not-allowed", opacity: 0.7 }}>
              {userId || "N/A"}
            </span>
          </div>

        </div>
      </section>

      {/* Hide Personal Summary for admin) */}
      {userRole !== "admin" && (
      <section className="profile-section">
        <h3>Personal Summary</h3>
        {isEditingProfile ? (
          <div className="summary-box">
            <textarea
              value={editSummaryInput}
              onChange={(e) => setEditSummaryInput(e.target.value)}
              placeholder="Share your professional story, achievements, and career goals."
              maxLength={600}
              className="summary-textarea"
            />
            <div className="summary-footer">
              <span className="char-count">{editSummaryInput.length} / 600 characters</span>
              <div className="visibility-toggle">
                <label>Public Profile</label>
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={() => setEditIsPublic(prev => !prev)}
                />
              </div>
            </div>
            {/* Save/Cancel now in profile header - polo */}
            {saveMessage && (
              <div className={`save-message ${saveMessage.includes("✅") ? "success" : "error"}`}>
                {saveMessage}
              </div>
            )}
          </div>
        ) : (
          <div>
            {summary ? (
              <p style={{ color: "#d4d4d8", fontSize: 14, lineHeight: 1.6 }}>{summary}</p>
            ) : (
              <p style={{ color: "#666", fontSize: 14 }}>No summary yet. Click Edit Profile to add one.</p>
            )}
            {saveMessage && (
              <div className={`save-message ${saveMessage.includes("✅") ? "success" : "error"}`}>
                {saveMessage}
              </div>
            )}
          </div>
        )}
      </section>
      )} {/* end Personal Summary — hidden for admin */}

      {/* Credential Wallet — hidden for issuers and admin */}
      {userRole !== "issuer" && userRole !== "admin" && (
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
          <>
            {isSavingOrder && <div className="order-saving-msg">Saving order...</div>}
            <div className="badges-grid">
              {(showAll ? credentials : credentials.slice(0, 5)).map((cred, index) => (
                <div
                  key={cred._id}
                  className={`badge-card draggable${draggedIndex === index ? ' dragging' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => { setSelectedCred(cred); setHistoryOpen(false); setHistoryData(null); }}
                >
                  <div className="drag-handle" title="Drag to reorder">⠿</div>
                  {/* Public indicator — shows which credentials appear on public profile - polo */}
                  {cred.visibility === 'public' && (
                    <div className="public-indicator" title="Visible on your public profile">🌐</div>
                  )}
                  <div className="badge-image">
                    {cred.badgeImage ? (
                      <img src={cred.badgeImage} alt="badge" style={{width: 60, height: 60, objectFit: 'cover', borderRadius: 8}} />
                    ) : '🎓'}
                  </div>
                  <h4>{cred.credentialName}</h4>
                  <StatusPill status={cred.status} />
                  <p className="badge-issuer">Issued by {cred.issuerName}</p>
              </div>
              ))}
            </div>
            {credentials.length > 5 && (
              <button
                className="see-all-btn"
                onClick={() => setShowAll(prev => !prev)}
              >
                {showAll ? '▲ Show Less' : `▼ See All (${credentials.length})`}
              </button>
            )}
          </>
        )}
      </section>

      )} {/* end Credential Wallet — hidden for issuers */}

      {/* Skills Wallet — hidden for issuers and admin */}
      {userRole !== "issuer" && userRole !== "admin" && (
      <section className="profile-section">
        <div className="section-header">
          <h3>Skills Wallet</h3>
        </div>
        {derivedSkills.length === 0 ? (
          <div className="empty-card">No skills derived yet. Skills are based on your issued credentials.</div>
        ) : (
          <>
            <div className="skills-grid">
              {derivedSkills.map((skill, idx) => {
                // find all credentials that contain this skill - polo
                const sourceCreds = credentials.filter(c =>
                  Array.isArray(c.skills) && c.skills.includes(skill)
                );
                const isSelected = selectedSkill === skill;
                return (
                  <div
                    key={idx}
                    className="skill-card"
                    onClick={() => setSelectedSkill(isSelected ? null : skill)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    <div className="skill-info">
                      <h4>{skill}</h4>
                      {sourceCreds.length > 0 && (
                        <p style={{ color: '#a78bfa', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
                          Derived from {sourceCreds.map(c => c.credentialName).join(', ')}
                        </p>
                      )}
                    </div>
                    {/* Source credential popup - polo */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(20,10,40,0.97)',
                        border: '1px solid rgba(139,92,246,0.5)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        zIndex: 999,
                        minWidth: 200,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        whiteSpace: 'nowrap'
                      }}>
                        <p style={{ color: '#a78bfa', fontSize: '0.75rem', marginBottom: 6, fontWeight: 700 }}>
                          FROM CREDENTIAL:
                        </p>
                        {sourceCreds.length === 0 ? (
                          <p style={{ color: '#ccc', fontSize: '0.8rem' }}>Unknown</p>
                        ) : (
                          sourceCreds.map((c, i) => (
                            <p key={i} style={{ color: '#fff', fontSize: '0.82rem', margin: '2px 0' }}>
                              {c.credentialName}
                            </p>
                          ))
                        )}
                        {/* small arrow */}
                        <div style={{
                          position: 'absolute',
                          bottom: -7,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '7px solid transparent',
                          borderRight: '7px solid transparent',
                          borderTop: '7px solid rgba(139,92,246,0.5)'
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="skills-count">
              {derivedSkills.length} {derivedSkills.length !== 1 ? 'skills' : 'skill'} from{' '}
              {credentials.filter(c => Array.isArray(c.skills) && c.skills.length > 0).length}{' '}
              {credentials.filter(c => Array.isArray(c.skills) && c.skills.length > 0).length !== 1 ? 'credentials' : 'credential'}
            </div>
          </>
        )}
      </section>

      )} {/* end Skills Wallet — hidden for issuers */}

      {/* Share Profile Modal - polo */}
      {showShareModal && (
        <div className="modal-overlay" onClick={handleCloseShareModal}>
          <div className="modal detail-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Share Profile</h2>
              <button className="close-btn" onClick={handleCloseShareModal}>✕</button>
            </div>
            <div className="modal-body">
              {!shareGeneratedUrl ? (
                <>
                  {/* share type toggle */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button
                      onClick={() => { setShareType('specific'); setShareError(''); }}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: '13px',
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                        border: shareType === 'specific' ? 'none' : '1px solid rgba(139,92,246,0.3)',
                        background: shareType === 'specific' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                        color: shareType === 'specific' ? '#fff' : '#a78bfa'
                      }}
                    >
                      Specific Recipient
                    </button>
                    <button
                      onClick={() => { setShareType('public'); setShareError(''); }}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: '13px',
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                        border: shareType === 'public' ? 'none' : '1px solid rgba(139,92,246,0.3)',
                        background: shareType === 'public' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                        color: shareType === 'public' ? '#fff' : '#a78bfa'
                      }}
                    >
                      Anyone with Link
                    </button>
                  </div>

                  {shareType === 'specific' && (
                    <div className="detail-row" style={{ flexDirection: 'column', gap: 6 }}>
                      <label style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600 }}>
                        Recipient Email <span style={{ color: '#ff6b6b' }}>*</span>
                      </label>
                      <input
                        type="email"
                        value={shareRecipientEmail}
                        onChange={(e) => setShareRecipientEmail(e.target.value)}
                        placeholder="hr@company.com"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid #a78bfa',
                          borderRadius: 8, color: '#fff',
                          padding: '8px 12px', fontSize: '14px',
                          outline: 'none', width: '100%'
                        }}
                      />
                    </div>
                  )}

                  {shareType === 'public' && (
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                      Anyone with this link can view your public profile. No email or verification required.
                    </p>
                  )}

                  <div className="detail-row" style={{ flexDirection: 'column', gap: 6, marginTop: 14 }}>
                    <label style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600 }}>
                      Link Duration
                    </label>
                    <select
                      value={shareDuration}
                      onChange={(e) => setShareDuration(e.target.value)}
                      style={{
                        background: 'rgba(20,10,40,0.95)',
                        border: '1px solid #a78bfa',
                        borderRadius: 8, color: '#fff',
                        padding: '8px 12px', fontSize: '14px',
                        outline: 'none', width: '100%'
                      }}
                    >
                      <option value="1">1 Day</option>
                      <option value="3">3 Days</option>
                      <option value="7">7 Days</option>
                      <option value="30">30 Days</option>
                      <option value="none">No Expiry</option>
                    </select>
                  </div>
                  {shareError && (
                    <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginTop: 10 }}>{shareError}</p>
                  )}
                </>
              ) : (
                <>
                  <p style={{ color: '#a78bfa', fontSize: '0.85rem', marginBottom: 10 }}>
                    ✅ Link generated! Share this with <strong style={{ color: '#fff' }}>{shareRecipientEmail}</strong>:
                  </p>
                  <div style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(139,92,246,0.4)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    wordBreak: 'break-all',
                    fontSize: '0.82rem',
                    color: '#c4b5fd',
                    marginBottom: 12
                  }}>
                    {shareGeneratedUrl}
                  </div>
                  <button
                    onClick={handleCopyShareUrl}
                    style={{
                      background: shareCopied ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #667eea, #764ba2)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      padding: '8px 18px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      width: '100%'
                    }}
                  >
                    {shareCopied ? '✅ Copied!' : '📋 Copy Link'}
                  </button>
                </>
              )}
            </div>
            {!shareGeneratedUrl && (
              <div className="modal-footer">
                <button
                  className="action-btn history"
                  onClick={handleGenerateShareLink}
                  disabled={shareLoading}
                >
                  {shareLoading ? 'Generating...' : '🔗 Generate Link'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                        {(entry.value?.status === "revoked" || entry.status === "revoked") &&
                        (entry.value?.rejectionReason || entry.rejectionReason) && (
                          <div className="history-entry-status" style={{ color: "#ff6b6b" }}>
                            Rejection Reason:{" "}
                            <strong>{entry.value?.rejectionReason || entry.rejectionReason}</strong>
                          </div>
                        )}
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