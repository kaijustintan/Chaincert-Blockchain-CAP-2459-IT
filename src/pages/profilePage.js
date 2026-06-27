import React, { useState, useEffect, useRef, useMemo } from "react";
import apiService from "../services/apiService";
import AppToast from "../components/appToast";
import { buildAvatarUrl, getDisplayName, syncStoredUser } from "../utils/userDisplay";
import { SpinnerBlock, SkeletonCardGrid } from "../components/ui";
import "../styles/profilePage.css";

export default function ProfilePage() {
  // Get user data from localStorage (set during login)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = user.email || localStorage.getItem("email") || "";
  const userRole = user.role || localStorage.getItem("role") || "student";
  const userId = user._id || user.id || "";
  const isIssuer = userRole === "issuer";
  const isAdmin = userRole === "admin";
  // - polo: displayName as state so it updates without full reload
  const [displayName, setDisplayName] = useState(getDisplayName({ ...user, role: userRole }));
  const userName = isIssuer ? (user.orgName || user.organizationName || displayName) : displayName;

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
  const [credSearch, setCredSearch] = useState('');
  const [credStatusFilter, setCredStatusFilter] = useState('all');
  const [credTypeFilter, setCredTypeFilter] = useState('all');
  const [credSortBy, setCredSortBy] = useState('newest');
  // - polo: 13C skill click → show source credential
  const [selectedSkill, setSelectedSkill] = useState(null);

  // Drag-to-reorder state - polo
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Share Profile modal state - polo
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareRecipientEmail, setShareRecipientEmail] = useState('');
  const [shareDuration, setShareDuration] = useState('7');
  const [shareDescription, setShareDescription] = useState('');
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
  const [avatar, setAvatar] = useState(buildAvatarUrl(user.profilePicture || user.avatar || "", user.profilePictureUpdatedAt || user.updatedAt || "") || "👤");

  // Toast state 
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // - polo: unified edit profile mode 
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editNameInput, setEditNameInput] = useState(userName);
  const [editSummaryInput, setEditSummaryInput] = useState(summary);
  const [editIsPublic, setEditIsPublic] = useState(isPublic);

  // Ref for the hidden file input
  const fileInputRef = useRef(null);

  // pending profile picture (not yet uploaded, only on Save Changes)
  const [pendingAvatar, setPendingAvatar] = useState(null); // { file, previewUrl }

  // Load user profile data on component mount
  useEffect(() => {
    loadUserProfile();
    if (userRole !== 'admin') fetchMyShareLinks(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await apiService.getUserInfo(userId);
      if (response.success && response.user) {
        const resolvedName = getDisplayName({ ...response.user, ...user, role: userRole });
        setDisplayName(resolvedName);
        setEditNameInput(resolvedName);
        setSummary(response.user.summary || "");
        setIsPublic(response.user.isPublic !== undefined ? response.user.isPublic : true);
        if (response.user.profilePicture) {
          setAvatar(buildAvatarUrl(response.user.profilePicture, response.user.profilePictureUpdatedAt || response.user.updatedAt || Date.now()));
        }
        syncStoredUser({ ...response.user, role: userRole, username: resolvedName, name: resolvedName });
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
      const cleanHistory = (Array.isArray(result?.history) ? result.history : []).filter((entry) => {
        const id = entry?.credentialId || entry?.id || entry?.key || entry?.value?.credentialId || "";
        const action = String(entry?.action || "").toLowerCase();
        const status = String(entry?.status || entry?.value?.status || "").toLowerCase();
        if (String(id).startsWith("vlog_")) return false;
        if (action === "updated" && (status === "status unknown" || status === "unknown")) return false;
        if (!action && status === "status unknown") return false;
        return true;
      });
      setHistoryData({ ...result, history: cleanHistory });
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

  // Toggle a credential's visibility between public and private - polo
  const handleToggleVisibility = async () => {
    if (!selectedCred) return;
    const credentialKey = selectedCred.blockchainId || selectedCred._id;
    const newVisibility = selectedCred.visibility === 'public' ? 'private' : 'public';
    try {
      await apiService.Update_CredentialVisibility(credentialKey, newVisibility);
      setCredentials((prev) => prev.map((cred) =>
        (cred.blockchainId || cred._id) === credentialKey ? { ...cred, visibility: newVisibility } : cred
      ));
      setSelectedCred((prev) => (prev ? { ...prev, visibility: newVisibility } : prev));
    } catch (err) {
      console.error('[PROFILE PAGE] Failed to update credential visibility:', err);
    }
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
      showToast('Failed to save order. Please try again.', 'danger');
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
        buildAvatarUrl(JSON.parse(localStorage.getItem('user') || '{}').profilePicture || '', JSON.parse(localStorage.getItem('user') || '{}').profilePictureUpdatedAt || '') || '👤'
      );
      setPendingAvatar(null);
    }
    setIsEditingProfile(false);
  };

  const handleSaveEditProfile = async () => {
    setIsSaving(true);
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
          const profilePictureUpdatedAt = Date.now();
          setAvatar(buildAvatarUrl(picResponse.imageUrl, profilePictureUpdatedAt));
          syncStoredUser({ profilePicture: picResponse.imageUrl, profilePictureUpdatedAt });
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
      syncStoredUser({ role: userRole, name: finalName, username: finalName, fullName: isIssuer ? (user.fullName || finalName) : finalName });
      setDisplayName(finalName); // - polo: update display immediately without reload
      setSummary(editSummaryInput);
      setIsPublic(editIsPublic);
      setEditNameInput(finalName);
      setIsEditingProfile(false);
      showToast("Profile updated successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      showToast("Something went wrong while saving your profile.", "danger"); 
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

  // My Share Links state 
  const [myShareLinks, setMyShareLinks] = useState([]);
  const [shareLinksLoading, setShareLinksLoading] = useState(false);
  const [revokingToken, setRevokingToken] = useState(null);
  const [linkSortBy, setLinkSortBy] = useState('newest');
  const [linkStatusFilter, setLinkStatusFilter] = useState('all');
  const [linkSourceFilter, setLinkSourceFilter] = useState('all');

  // Fetch all share links for current user
  const fetchMyShareLinks = async () => {
    setShareLinksLoading(true);
    try {
      const result = await apiService.getMyShareLinks();
      if (result.success) setMyShareLinks(result.links || []);
    } catch (err) {
      console.error('[PROFILE PAGE] Error fetching share links:', err);
    } finally {
      setShareLinksLoading(false);
    }
  };

  const profileCredentialTypes = useMemo(() => Array.from(new Set((credentials || []).map((cred) => cred.credentialType).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [credentials]);

  const filteredProfileCreds = useMemo(() => {
    let result = [...(credentials || [])];

    if (credStatusFilter !== 'all') {
      result = result.filter((cred) => {
        const normalizedStatus = String(cred.status || '').toLowerCase();
        if (credStatusFilter === 'active') return normalizedStatus === 'issued' || normalizedStatus === 'active';
        return normalizedStatus === credStatusFilter;
      });
    }

    if (credTypeFilter !== 'all') {
      result = result.filter((cred) => String(cred.credentialType || '').toLowerCase() === credTypeFilter.toLowerCase());
    }

    const query = credSearch.trim().toLowerCase();
    if (query) {
      result = result.filter((cred) =>
        [cred.credentialName, cred.issuerName].filter(Boolean).join(' ').toLowerCase().includes(query)
      );
    }

    switch (credSortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.savedToUserWalletAt || 0) - new Date(b.savedToUserWalletAt || 0));
        break;
      case 'name-asc':
        result.sort((a, b) => String(a.credentialName || '').localeCompare(String(b.credentialName || '')));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.savedToUserWalletAt || 0) - new Date(a.savedToUserWalletAt || 0));
        break;
    }

    return result;
  }, [credentials, credSearch, credSortBy, credStatusFilter, credTypeFilter]);

  // Compute status from share link doc fields 
  const getShareLinkStatus = (link) => {
    if (link.status === 'revoked' || !link.isActive) return 'Revoked';
    if (link.status === 'expired') return 'Expired';
    if (link.expiresAt) {
      const expiresAt = new Date(link.expiresAt);
      if (Number.isNaN(expiresAt.getTime()) || new Date() > expiresAt) return 'Expired';
    }
    if (link.viewCount > 0) return 'Viewed';
    return 'Unused';
  };

  const filteredLinks = useMemo(() => {
    let result = [...(myShareLinks || [])];

    if (linkStatusFilter !== 'all') {
      if (linkStatusFilter === 'active') {
        result = result.filter((link) => {
          const status = getShareLinkStatus(link);
          return status !== 'Revoked' && status !== 'Expired';
        });
      } else {
        const targetStatus = linkStatusFilter.toLowerCase();
        result = result.filter((link) => getShareLinkStatus(link).toLowerCase() === targetStatus);
      }
    }

    if (linkSourceFilter !== 'all') {
      if (linkSourceFilter === 'manual') {
        result = result.filter((link) => !link.source || link.source === 'manual');
      } else if (linkSourceFilter === 'pdf') {
        result = result.filter((link) => link.source === 'pdf_export' || link.source === 'pdf_single_export');
      } else if (linkSourceFilter === 'single') {
        result = result.filter((link) => link.source === 'pdf_single_export');
      }
    }

    result.sort((a, b) => {
      const left = new Date(a.createdAt || 0).getTime() || 0;
      const right = new Date(b.createdAt || 0).getTime() || 0;
      return linkSortBy === 'oldest' ? left - right : right - left;
    });

    return result;
  }, [myShareLinks, linkSortBy, linkStatusFilter, linkSourceFilter]);

  const handleRevokeShareLink = async (token) => {
    setRevokingToken(token);
    try {
      const result = await apiService.revokeShareLink(token);
      if (result.success) {
        showToast('Share link revoked successfully.');
        fetchMyShareLinks(); // refresh list 
      }
    } catch (err) {
      console.error('[PROFILE PAGE] Error revoking share link:', err);
      showToast('Failed to revoke link.', 'danger');
    } finally {
      setRevokingToken(null);
    }
  };


  // Share Profile handlers 
  const handleOpenShareModal = () => {
    setShareRecipientEmail('');
    setShareDuration('7');
    setShareDescription('');
    setShareGeneratedUrl('');
    setShareError('');
    setShareCopied(false);
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setShareGeneratedUrl('');
    setShareError('');
    setShareDescription('');
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
          durationDays: shareDuration,
          description: shareDescription.trim(),
          source: 'manual'
        });
      } else {
        result = await apiService.generatePublicShareLink({
          durationDays: shareDuration,
          description: shareDescription.trim(),
          source: 'manual'
        });
      }
      if (result.success) {
        setShareGeneratedUrl(result.shareUrl);
        fetchMyShareLinks(); // Refresh list after generating
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
    return <div className="profile-page"><SpinnerBlock label="Loading profile…" minHeight={260} /></div>;
  }

  return (
  <div className="profile-page">
    {/* Profile toast render */}
    <AppToast show={toast.show} message={toast.message} type={toast.type} />
    {/* Profile Header */}
    <div className="profile-header">

      {/* 4. MODIFIED THE AVATAR JSX */}
      <div className="avatar-wrapper">
        {/* THIS IS THE CHANGE */}
        <div className="avatar">
          {typeof avatar === 'string' && (avatar.startsWith('data:') || avatar.startsWith('blob:') || avatar.startsWith('http') || avatar.startsWith('/')) ? (
            <img src={avatar} alt="Profile" />
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
          {!isAdmin && (
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
          {!isAdmin && (
            !isEditingProfile ? (
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
                    color: "var(--text-muted)",
                  }}
                >
                  Cancel
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Account Information */}
      <section className="profile-section">
        <h3>Account Information</h3>
        <div className="info-grid">

          {/* Full Name — editable in edit mode, read-only otherwise - polo */}
          <div className="info-item">
            <label>{isIssuer ? "Organization Name" : "Full Name"}</label>
            {isEditingProfile ? (
              <input
                type="text"
                value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
                style={{
                  background: "var(--border)",
                  border: "1px solid var(--accent-strong)",
                  borderRadius: 8,
                  color: "var(--text)",
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
      {!isAdmin && (
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
          </div>
        ) : (
          <div>
            {summary ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>{summary}</p>
            ) : (
              <p style={{ color: "var(--text-subtle)", fontSize: 14 }}>No summary yet. Click Edit Profile to add one.</p>
            )}
            </div>
        )}
      </section>
      )} {/* end Personal Summary — hidden for admin */}

      {/* Credential Wallet — hidden for issuers and admin */}
      {!isIssuer && !isAdmin && (
      <section className="profile-section">
        <div className="section-header">
          <h3>Credential Wallet</h3>
        </div>

        {credLoading && <SkeletonCardGrid count={6} />}
        {!credLoading && credError && <div className="empty-card error">{credError}</div>}
        {!credLoading && !credError && credentials.length === 0 && (
          <div className="empty-card">No credentials have been issued to you yet.</div>
        )}

        {!credLoading && !credError && credentials.length > 0 && (
          <>
            <div className="filter-row">
              <input className="filter-input" type="text" value={credSearch} onChange={(e) => setCredSearch(e.target.value)} placeholder="Search by credential or issuer" />
              <select className="filter-select" value={credStatusFilter} onChange={(e) => setCredStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>
              <select className="filter-select" value={credTypeFilter} onChange={(e) => setCredTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                {profileCredentialTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select className="filter-select" value={credSortBy} onChange={(e) => setCredSortBy(e.target.value)}>
                <option value="newest">Most Recent</option>
                <option value="oldest">Oldest</option>
                <option value="name-asc">Name A-Z</option>
              </select>
            </div>
            {isSavingOrder && <div className="order-saving-msg">Saving order...</div>}
            <div className="badges-grid">
              {(showAll ? filteredProfileCreds : filteredProfileCreds.slice(0, 5)).map((cred, index) => (
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
            {filteredProfileCreds.length > 5 && (
              <button
                className="see-all-btn"
                onClick={() => setShowAll(prev => !prev)}
              >
                {showAll ? '▲ Show Less' : `▼ See All (${filteredProfileCreds.length})`}
              </button>
            )}
          </>
        )}
      </section>

      )} {/* end Credential Wallet — hidden for issuers */}

      {/* Skills Wallet — hidden for issuers and admin */}
      {!isIssuer && !isAdmin && (
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
                        <p style={{ color: 'var(--accent-strong)', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
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
                        border: '1px solid var(--border-accent)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        zIndex: 999,
                        minWidth: 200,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        whiteSpace: 'nowrap'
                      }}>
                        <p style={{ color: 'var(--accent-strong)', fontSize: '0.75rem', marginBottom: 6, fontWeight: 700 }}>
                          FROM CREDENTIAL:
                        </p>
                        {sourceCreds.length === 0 ? (
                          <p style={{ color: '#ccc', fontSize: '0.8rem' }}>Unknown</p>
                        ) : (
                          sourceCreds.map((c, i) => (
                            <p key={i} style={{ color: 'var(--text)', fontSize: '0.82rem', margin: '2px 0' }}>
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
                          borderTop: '7px solid var(--border-accent)'
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

      {/* My Share Links Section */}
      {!isAdmin && (
        <section className="profile-section">
          <div className="section-header">
            <h3>My Share Links</h3>
          </div>
          {shareLinksLoading && <SpinnerBlock label="Loading share links…" minHeight={90} />}
          {!shareLinksLoading && myShareLinks.length === 0 && (
            <div className="empty-card">No share links generated yet.</div>
          )}
          {!shareLinksLoading && myShareLinks.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '12px', marginRight: '6px' }}>Sort:</label>
                  <select className="filter-select" value={linkSortBy} onChange={(e) => setLinkSortBy(e.target.value)}>
                    <option value="newest">Most Recent</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', marginRight: '6px' }}>Status:</label>
                  <select className="filter-select" value={linkStatusFilter} onChange={(e) => setLinkStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', marginRight: '6px' }}>Source:</label>
                  <select className="filter-select" value={linkSourceFilter} onChange={(e) => setLinkSourceFilter(e.target.value)}>
                    <option value="all">All Sources</option>
                    <option value="manual">Manual</option>
                    <option value="pdf">PDF Export</option>
                    <option value="single">Single Export</option>
                  </select>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--accent-weak)' }}>
                    {['Recipient', 'Source', 'Description', 'Created', 'Expires', 'Share Link', 'Views', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', color: 'var(--accent-strong)', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((link) => {
                    const status = getShareLinkStatus(link);
                    const statusColors = {
                      Unused: { bg: 'rgba(99,102,241,0.15)', color: 'var(--accent)' },
                      Viewed: { bg: 'var(--ok-weak)', color: 'var(--ok)' },
                      Expired: { bg: 'rgba(251,191,36,0.15)', color: 'var(--warn)' },
                      Revoked: { bg: 'var(--danger-weak)', color: 'var(--danger)' }
                    };
                    const sc = statusColors[status];
                    return (
                      <tr key={link._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                          {link.recipientEmail || <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>Anyone</span>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: link.source === 'pdf_export' ? 'var(--info-weak)' : link.source === 'pdf_single_export' ? 'rgba(14,165,233,0.12)' : 'var(--accent-weak)',
                            color: link.source === 'pdf_export' ? 'var(--info)' : link.source === 'pdf_single_export' ? '#38bdf8' : 'var(--accent-strong)'
                          }}>
                            {link.source === 'pdf_export' ? 'Portfolio Export' : link.source === 'pdf_single_export' ? 'Single Export' : 'Manual'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                          {link.description || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {link.createdAt ? new Date(link.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'No Expiry'}
                        </td>
                        <td style={{ padding: '10px 12px', maxWidth: 320 }}>
                          <div className="share-link-cell">
                            <a href={(link.shareUrl || `${window.location.origin}/profile/${link.token}`)} target="_blank" rel="noreferrer" title={link.shareUrl || `${window.location.origin}/profile/${link.token}`}>
                              {link.shareUrl || `${window.location.origin}/profile/${link.token}`}
                            </a>
                            <button type="button" className="share-link-copy-btn" onClick={() => navigator.clipboard.writeText(link.shareUrl || `${window.location.origin}/profile/${link.token}`).then(() => showToast('Share link copied.')).catch(() => showToast('Failed to copy share link.', 'danger'))}>Copy</button>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                          {link.viewCount || 0}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {status === 'Revoked' && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Revoked</span>}
                          {status === 'Expired' && <span style={{ color: 'var(--warn)', fontWeight: 600 }}>Expired</span>}
                          {status !== 'Revoked' && status !== 'Expired' && <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600 }}>{status === 'Viewed' ? 'Viewed' : 'Active'}</span>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {status !== 'Revoked' && status !== 'Expired' ? (
                            <>
                              <button
                                onClick={() => handleRevokeShareLink(link.token)}
                                disabled={revokingToken === link.token}
                                style={{
                                  background: 'var(--danger-weak)',
                                  border: '1px solid var(--danger-weak)',
                                  borderRadius: 6, color: 'var(--danger)',
                                  padding: '4px 10px', fontSize: '0.78rem',
                                  cursor: 'pointer', fontFamily: 'Poppins, sans-serif'
                                }}
                              >
                                {revokingToken === link.token ? 'Revoking...' : 'Revoke'}
                              </button>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* Share Profile Modal */}
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
                        border: shareType === 'specific' ? 'none' : '1px solid var(--accent-weak)',
                        background: shareType === 'specific' ? 'linear-gradient(135deg, var(--accent), var(--accent-strong))' : 'transparent',
                        color: shareType === 'specific' ? 'var(--text)' : 'var(--accent-strong)'
                      }}
                    >
                      Specific Recipient
                    </button>
                    <button
                      onClick={() => { setShareType('public'); setShareError(''); }}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: '13px',
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                        border: shareType === 'public' ? 'none' : '1px solid var(--accent-weak)',
                        background: shareType === 'public' ? 'linear-gradient(135deg, var(--accent), var(--accent-strong))' : 'transparent',
                        color: shareType === 'public' ? 'var(--text)' : 'var(--accent-strong)'
                      }}
                    >
                      Anyone with Link
                    </button>
                  </div>

                  {shareType === 'specific' && (
                    <div className="detail-row" style={{ flexDirection: 'column', gap: 6 }}>
                      <label style={{ color: 'var(--accent-strong)', fontSize: '0.85rem', fontWeight: 600 }}>
                        Recipient Email <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <input
                        type="email"
                        value={shareRecipientEmail}
                        onChange={(e) => setShareRecipientEmail(e.target.value)}
                        placeholder="hr@company.com"
                        style={{
                          background: 'var(--border)',
                          border: '1px solid var(--accent-strong)',
                          borderRadius: 8, color: 'var(--text)',
                          padding: '8px 12px', fontSize: '14px',
                          outline: 'none', width: '100%'
                        }}
                      />
                    </div>
                  )}

                  {shareType === 'public' && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                      Anyone with this link can view your public profile. No email or verification required.
                    </p>
                  )}

                  <div className="detail-row" style={{ flexDirection: 'column', gap: 6, marginTop: 14 }}>
                    <label style={{ color: 'var(--accent-strong)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Link Duration
                    </label>
                    <select
                      value={shareDuration}
                      onChange={(e) => setShareDuration(e.target.value)}
                      style={{
                        background: 'rgba(20,10,40,0.95)',
                        border: '1px solid var(--accent-strong)',
                        borderRadius: 8, color: 'var(--text)',
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
                  <div className="detail-row" style={{ flexDirection: 'column', gap: 6, marginTop: 14 }}>
                    <label style={{ color: 'var(--accent-strong)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={shareDescription}
                      onChange={(e) => setShareDescription(e.target.value)}
                      placeholder="e.g., For employer at Company X"
                      maxLength={200}
                      style={{
                        background: 'var(--border)',
                        border: '1px solid var(--accent-strong)',
                        borderRadius: 8, color: 'var(--text)',
                        padding: '8px 12px', fontSize: '14px',
                        outline: 'none', width: '100%'
                      }}
                    />
                  </div>
                  {shareError && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 10 }}>{shareError}</p>
                  )}
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--accent-strong)', fontSize: '0.85rem', marginBottom: 10 }}>
                    ✅ Link generated! Share this with <strong style={{ color: 'var(--text)' }}>{shareRecipientEmail}</strong>:
                  </p>
                  <div style={{
                    background: 'var(--border)',
                    border: '1px solid var(--border-accent)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    wordBreak: 'break-all',
                    fontSize: '0.82rem',
                    color: 'var(--accent-strong)',
                    marginBottom: 12
                  }}>
                    {shareGeneratedUrl}
                  </div>
                  <button
                    onClick={handleCopyShareUrl}
                    style={{
                      background: shareCopied ? 'var(--ok-weak)' : 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                      border: 'none',
                      borderRadius: 8,
                      color: 'var(--text)',
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
              {selectedCred.badgeImage && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <img src={selectedCred.badgeImage} alt="Badge" style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain', borderRadius: '12px' }} />
                </div>
              )}
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
              <div className="detail-row">
                <span className="detail-label">Visibility</span>
                <span className="detail-value">
                  <button
                    type="button"
                    onClick={handleToggleVisibility}
                    style={{
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: selectedCred.visibility === 'public' ? 'var(--ok)' : 'var(--warn)',
                      background: selectedCred.visibility === 'public' ? 'var(--ok-weak)' : 'var(--warn-weak)',
                      color: selectedCred.visibility === 'public' ? 'var(--ok)' : 'var(--warn)',
                    }}
                  >
                    {selectedCred.visibility === 'public' ? '🌐 Public' : '🔒 Private'} — Click to toggle
                  </button>
                </span>
              </div>
              {(selectedCred.status === "revoked" || selectedCred.status === "REVOKED") && selectedCred.rejectionReason && (
                <div className="detail-row">
                  <span className="detail-label">Rejection Reason</span>
                  <span className="detail-value" style={{color: "var(--danger)"}}>{selectedCred.rejectionReason}</span>
                </div>
              )}
              {(selectedCred.status === "revoked" || selectedCred.status === "REVOKED") && (
                <div className="detail-row">
                  <span className="detail-label">Revoked Date</span>
                  <span className="detail-value">{formatDate(selectedCred.revokedAt || selectedCred.revokedDate || selectedCred.updatedAt)}</span>
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
                {historyLoading && <SpinnerBlock label="Loading history…" minHeight={80} />}
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
                          <div className="history-entry-status" style={{ color: "var(--danger)" }}>
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
