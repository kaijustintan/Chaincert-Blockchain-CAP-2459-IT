import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import apiService from "../services/apiService";
import { SpinnerBlock } from "../components/ui";
import '../styles/profilePreview.css';

const filterVisibleProfileCredentials = (items, role) => {
  const normalizedRole = String(role || '').toLowerCase();

  return (Array.isArray(items) ? items : [])
    .filter((cred) => {
      const isTemplate = cred?.isTemplate === true || String(cred?.type || '').toLowerCase() === 'credential_template';
      const isPublic = cred?.visibility === 'public';

      // Show ALL statuses (incl. revoked/expired) WITH a visible status indicator — transparency
      // over hiding (immutable-ledger value prop). Holder still controls exposure via visibility. - polo
      if (!isPublic) return false;
      if (normalizedRole === 'issuer') return isTemplate;
      return true;
    })
    .sort((a, b) => (a.currentOrder ?? 0) - (b.currentOrder ?? 0));
};


export default function ProfilePreview() {
  const { token } = useParams(); // token from URL /profile/:token

  // ── Owner bypass check ──────────────────────────────────
  // If userId query param matches logged-in user, skip OTP gate entirely
  const urlParams = new URLSearchParams(window.location.search);
  const previewUserId = urlParams.get('userId');
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const loggedInUserId = loggedInUser._id || loggedInUser.id || '';
  const isOwner = previewUserId && loggedInUserId && previewUserId === loggedInUserId;

  // check if this is a public link (no recipient email required)
  const [isPublicLink, setIsPublicLink] = useState(false);

  useEffect(() => {
    const checkLinkType = async () => {
      if (!token || isOwner) return;
      try {
        const result = await apiService.getShareLinkInfo(token);
        if (result.success && result.valid && result.recipientEmail === null) {
          setIsPublicLink(true);
          setGateStage('verified');
          apiService.recordShareLinkView(token).catch(() => {});
        } else if (result.success && result.valid) {
          setGateStage('email');
        }
      } catch (err) {
        console.error('[PROFILE PREVIEW] Error checking link type:', err);
        const status = err.response?.status;
        const message = err.response?.data?.message || '';
        if (status === 403 || status === 404) {
          setGateError(message || 'This link is no longer available.');
          setGateStage('blocked');
        }
      }
    };
    checkLinkType();
  }, [token, isOwner]); 

  // ── Gate state ──────────────────────────────────────────
  const [gateStage, setGateStage] = useState(isOwner ? 'verified' : 'loading'); // 'loading' | 'email' | 'otp' | 'verified'
  const [gateEmail, setGateEmail] = useState('');
  const [gateOtp, setGateOtp] = useState('');
  const [gateError, setGateError] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // seconds remaining

  // ── Profile data state  ──────────────────────────────────
  const [profileData, setProfileData] = useState(null); // set after OTP verified
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState('👤');

  // ── Credentials state - polo ───────────────────────────────────
  const [credentials, setCredentials] = useState([]);
  const [credLoading, setCredLoading] = useState(false);
  const [selectedPreviewCred, setSelectedPreviewCred] = useState(null);

  // ── Derived skills (MUST be before any early returns) ──────────
  const derivedSkills = useMemo(() => [...new Set(
    credentials.flatMap(c =>
      Array.isArray(c.skills) && c.skills.length > 0
        ? c.skills
        : (c.credentialType ? [c.credentialType] : [])
    )
  )], [credentials]);

  const skillsByCredential = useMemo(() => {
    const groups = [];
    (credentials || []).forEach((cred) => {
      if (cred.skills && cred.skills.length > 0) {
        groups.push({ credentialName: cred.credentialName || 'Unknown Credential', skills: cred.skills });
      }
    });
    return groups;
  }, [credentials]);

  // Derived display values - polo
  const userName = profileData?.role === 'issuer' ? (profileData?.orgName || profileData?.name || 'Issuer') : (profileData?.name || 'User');
  const userEmail = profileData?.email || '';
  const userRole = profileData?.role || 'student';
  const userId = profileData?.id || profileData?.userId || '';

  // ── Resend cooldown timer - polo ───────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ── Load owner profile directly if owner is previewing
  useEffect(() => {
    if (!isOwner || !previewUserId) return;
    const loadOwnerProfile = async () => {
      try {
        const response = await apiService.getUserInfo(previewUserId);
        if (response.success && response.user) {
          const nextProfile = {
            id: response.user.id,
            userId: response.user.id,
            name: response.user.name,
            orgName: response.user.orgName || response.user.organizationName || '',
            email: response.user.email,
            role: response.user.role,
            summary: response.user.summary || '',
            profilePicture: response.user.profilePicture || null
          };
          setProfileData(nextProfile);
          setSummary(nextProfile.summary || '');
          if (nextProfile.profilePicture) setAvatar(nextProfile.profilePicture);
        }
      } catch (err) {
        console.error('[PROFILE PREVIEW] Error loading owner profile:', err);
      }
    };
    loadOwnerProfile();
  }, [isOwner, previewUserId]); 

  // ── Load profile for public link visitors ───────────────
  useEffect(() => {
    if (!isPublicLink || isOwner) return;
    const loadPublicProfile = async () => {
      try {
        const doc = await apiService.getShareLinkInfo(token);
        if (!doc.success) return;
        if (doc.profile) {
          setProfileData(doc.profile);
          setSummary(doc.profile.summary || '');
          if (doc.profile.profilePicture) setAvatar(doc.profile.profilePicture);
          if (Array.isArray(doc.profile.sharedCredentials)) {
            setCredentials(filterVisibleProfileCredentials(doc.profile.sharedCredentials, doc.profile.role));
          }
          return;
        }
        const response = await apiService.getUserInfo(doc.userId);
        if (response.success && response.user) {
          const nextProfile = {
            id: response.user.id,
            userId: response.user.id,
            name: response.user.name,
            orgName: response.user.orgName || response.user.organizationName || '',
            email: response.user.email,
            role: response.user.role,
            summary: response.user.summary || '',
            profilePicture: response.user.profilePicture || null
          };
          setProfileData(nextProfile);
          setSummary(nextProfile.summary || '');
          if (nextProfile.profilePicture) setAvatar(nextProfile.profilePicture);
        }
      } catch (err) {
        console.error('[PROFILE PREVIEW] Error loading public profile:', err);
      }
    };
    loadPublicProfile();
  }, [isPublicLink, isOwner, token]); 

  // ── Load credentials after OTP verified - polo ─────────────────
  useEffect(() => {
    const effectiveUserId = isOwner ? previewUserId : userId;
    if (gateStage !== 'verified' || !effectiveUserId || (!isOwner && Array.isArray(profileData?.sharedCredentials))) return;
    const fetchCredentials = async () => {
      setCredLoading(true);
      try {
        const data = await apiService.Get_UserCredentials(effectiveUserId);
        // Owner sees ALL credentials, recipient sees only public ones 
        // Hide revoked/expired on public preview for all viewers including owner 
        const filtered = filterVisibleProfileCredentials(data, profileData?.role || loggedInUser?.role);
        setCredentials(filtered);
      } catch (err) {
        console.error('[PROFILE PREVIEW] Error fetching credentials:', err);
      } finally {
        setCredLoading(false);
      }
    };
    fetchCredentials();
  }, [gateStage, userId, isOwner, previewUserId, profileData]); 

  // ── Gate handlers - polo ───────────────────────────────────────
  const handleRequestOTP = async () => {
    if (!gateEmail.trim()) {
      setGateError('Please enter your email.');
      return;
    }
    setGateLoading(true);
    setGateError('');
    try {
      const result = await apiService.requestShareLinkOTP(token, gateEmail.trim());
      if (result.success) {
        setGateStage('otp');
        setResendCooldown(60);
      } else {
        setGateError(result.message || 'Failed to send code.');
      }
    } catch (err) {
      setGateError(err.response?.data?.message || 'Failed to send code.');
    } finally {
      setGateLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!gateOtp.trim()) {
      setGateError('Please enter the verification code.');
      return;
    }
    setGateLoading(true);
    setGateError('');
    try {
      const result = await apiService.verifyShareLinkOTP(token, gateOtp.trim());
      if (result.success) {
        setProfileData(result.profile);
        setSummary(result.profile?.summary || '');
        if (result.profile?.profilePicture) setAvatar(result.profile.profilePicture);
        if (Array.isArray(result.profile?.sharedCredentials)) {
          setCredentials(filterVisibleProfileCredentials(result.profile.sharedCredentials, result.profile?.role));
        }
        setGateStage('verified');
      } else {
        setGateError(result.message || 'Invalid code.');
      }
    } catch (err) {
      setGateError(err.response?.data?.message || 'Invalid code.');
    } finally {
      setGateLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setGateLoading(true);
    setGateError('');
    try {
      await apiService.requestShareLinkOTP(token, gateEmail.trim());
      setResendCooldown(60);
    } catch (err) {
      setGateError('Failed to resend code.');
    } finally {
      setGateLoading(false);
    }
  };

  // ── Gate overlay styles - polo ─────────────────────────────────
  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(8,4,20,0.88)',
    backdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000
  };
  const gateBoxStyle = {
    background: 'rgba(12,8,32,0.97)',
    border: '1px solid var(--border-accent)',
    borderRadius: 16,
    padding: '36px 32px',
    width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', gap: 16
  };
  const gateInputStyle = {
    background: 'var(--border)',
    border: '1px solid var(--accent-strong)',
    borderRadius: 12, color: 'var(--text)',
    padding: '12px 16px', fontSize: '15px', lineHeight: 1.5,
    outline: 'none', width: '100%', minHeight: '48px', boxSizing: 'border-box'
  };
  const gateBtnStyle = {
    background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
    border: 'none', borderRadius: 8, color: 'var(--text)',
    padding: '10px 0', fontSize: '15px',
    cursor: 'pointer', width: '100%', marginTop: 4
  };

  // ── Render gate stages - polo ──────────────────────────────────
  if (gateStage === 'loading') {
    return (
      <div className="profile-preview">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SpinnerBlock label="Loading…" />
        </div>
      </div>
    );
  }

  if (gateStage === 'blocked') {
    return (
      <div className="profile-preview">
        <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4, minHeight: '100vh' }} />
        <div style={overlayStyle}>
          <div style={gateBoxStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🚫</div>
              <h2 style={{ color: 'var(--danger)', margin: 0, fontSize: '1.3rem' }}>Link Unavailable</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 12, lineHeight: 1.6 }}>
                {gateError || 'This share link is no longer available.'}
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              style={{ ...gateBtnStyle, background: 'var(--border)', border: '1px solid var(--border-strong)', marginTop: 8 }}
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gateStage === 'email') {
    return (
      <div className="profile-preview">
        <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4, minHeight: '100vh' }} />
        <div style={overlayStyle}>
          <div style={gateBoxStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
              <h2 style={{ color: 'var(--accent-strong)', margin: 0, fontSize: '1.3rem' }}>Verify Your Identity</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 8 }}>
                Enter your email to access this profile
              </p>
            </div>
            <div className="gate-input-shell">
            <input
              type="email"
              placeholder="your@email.com"
              value={gateEmail}
              onChange={(e) => setGateEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRequestOTP()}
              style={gateInputStyle}
            />
            </div>
            {gateError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }}>{gateError}</p>}
            <button onClick={handleRequestOTP} disabled={gateLoading} style={gateBtnStyle}>
              {gateLoading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gateStage === 'otp') {
    return (
      <div className="profile-preview">
        <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4, minHeight: '100vh' }} />
        <div style={overlayStyle}>
          <div style={gateBoxStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
              <h2 style={{ color: 'var(--accent-strong)', margin: 0, fontSize: '1.3rem' }}>Check Your Email</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 8 }}>
                Enter the 6-digit code sent to <strong style={{ color: 'var(--text)' }}>{gateEmail}</strong>
              </p>
            </div>
            <div className="gate-input-shell otp-shell">
            <input
              type="text"
              placeholder="000000"
              value={gateOtp}
              onChange={(e) => setGateOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
              style={{ ...gateInputStyle, letterSpacing: '0.28em', textAlign: 'center', fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums' }}
              maxLength={6}
            />
            </div>
            {gateError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }}>{gateError}</p>}
            <button onClick={handleVerifyOTP} disabled={gateLoading} style={gateBtnStyle}>
              {gateLoading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              onClick={handleResendOTP}
              disabled={resendCooldown > 0 || gateLoading}
              style={{ background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent-strong)', padding: '8px 0', fontSize: '0.88rem', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', width: '100%' }}
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-preview">
        <SpinnerBlock label="Loading public profile…" minHeight={200} />
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

      {/* Badge Wallet — vertical list with order numbers - polo */}
      <section className="badge-wallet">
        <h3>Credentials & Badges</h3>
        <div className="badge-list">
          {credLoading && <SpinnerBlock label="Loading credentials…" minHeight={120} />}
          {!credLoading && credentials.length === 0 && (
            <div>No public credentials yet.</div>
          )}
          {!credLoading && credentials.map((cred, index) => (
            <div key={cred._id} className={`badge-list-item ${cred.status === 'revoked' ? 'revoked-card' : cred.status === 'expired' ? 'expired-card' : ''}`} onClick={() => setSelectedPreviewCred(cred)} style={{ cursor: 'pointer' }}>
              <div className="badge-order-num">{index + 1}</div>
              <div className="badge-img-small">
                {cred.badgeImage ? (
                  <img src={cred.badgeImage} alt="badge" style={{width: 40, height: 40, objectFit: 'cover', borderRadius: 6}} />
                ) : '🎓'}
              </div>
              <div className="badge-info">
                <h4>{cred.credentialName}</h4>
                <p className="issuer">{cred.issuerName}</p>
                <p className="date">{cred.savedToUserWalletAt ? new Date(cred.savedToUserWalletAt).toLocaleDateString() : "N/A"}</p>
                {cred.status === 'revoked' && (
                  <span className="status-pill revoked">Revoked</span>
                )}
                {cred.status === 'expired' && (
                  <span className="status-pill expired">Expired</span>
                )}
                {cred.status === 'revoked' && cred.rejectionReason && (
                  <p style={{color: "var(--danger)", fontSize: "0.75rem", margin: "4px 0"}}>
                    Reason: {cred.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills Section — reads skills array from credentials, falls back to credentialType - polo */}
      <section className="skills-section">
        <h3>Skills</h3>
        <div className="skills-grid">
          {derivedSkills.length === 0 ? (
            <div>No skills yet.</div>
          ) : skillsByCredential.length === 0 ? (
            derivedSkills.map((skill, idx) => (
              <div key={idx} className="skill-badge">{skill}</div>
            ))
          ) : (
            skillsByCredential.map((group, idx) => (
              <div key={`${group.credentialName}-${idx}`} className="skill-group">
                <p className="skill-group-label">From: {group.credentialName}</p>
                <div className="skill-group-pills">
                  {group.skills.map((skill, skillIdx) => (
                    <div key={`${group.credentialName}-${skill}-${skillIdx}`} className="skill-badge">{skill}</div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        {derivedSkills.length > 0 && (
          <p className="skills-count-preview">
            {derivedSkills.length} {derivedSkills.length !== 1 ? 'skills' : 'skill'} verified via blockchain
          </p>
        )}
      </section>

      {/* Footer */}
      <footer className="preview-footer">
        <p>Verified on ChainCert • Blockchain-Secured Credentials</p>
      </footer>

      {selectedPreviewCred && (
        <div className="modal-overlay" onClick={() => setSelectedPreviewCred(null)}>
          <div className="modal detail-modal preview-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPreviewCred.credentialName || 'Credential'}</h2>
              <button className="close-btn" onClick={() => setSelectedPreviewCred(null)}>✕</button>
            </div>
            <div className="modal-body">
              {selectedPreviewCred.badgeImage && (
                <div className="preview-modal-badge">
                  <img src={selectedPreviewCred.badgeImage} alt="Badge" />
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Type</span>
                <span className="detail-value">{selectedPreviewCred.credentialType || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Issuer</span>
                <span className="detail-value">{selectedPreviewCred.issuerName || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">{selectedPreviewCred.status || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Issued On</span>
                <span className="detail-value">{selectedPreviewCred.savedToUserWalletAt ? new Date(selectedPreviewCred.savedToUserWalletAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Expiry Date</span>
                <span className="detail-value">{selectedPreviewCred.expiryDate ? new Date(selectedPreviewCred.expiryDate).toLocaleDateString() : 'No Expiry'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Blockchain ID</span>
                <span className="detail-value mono">{selectedPreviewCred.blockchainId || 'N/A'}</span>
              </div>
              {Array.isArray(selectedPreviewCred.skills) && selectedPreviewCred.skills.length > 0 && (
                <div className="preview-modal-skills">
                  <span className="detail-label">Skills</span>
                  <div className="skill-group-pills">
                    {selectedPreviewCred.skills.map((skill, idx) => (
                      <span key={`${skill}-${idx}`} className="skill-badge">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}