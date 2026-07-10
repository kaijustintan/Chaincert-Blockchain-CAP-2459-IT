import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import apiService from "../services/apiService";
import { SpinnerBlock } from "../components/ui";
import { effectiveCredentialStatus } from "../utils/credentialStatus";
import '../styles/profilePreview.css';

// C10: live-check verdict meta for the "Verify all" results (colors = design tokens).
const VA_OUTCOME_META = {
  valid: { label: "VALID", color: "var(--ok)" },
  revoked: { label: "REVOKED", color: "var(--danger)" },
  expired: { label: "EXPIRED", color: "var(--warn)" },
  not_found: { label: "NOT FOUND", color: "var(--accent-strong)" },
  invalid: { label: "INVALID", color: "var(--danger)" },
  error: { label: "CHECK FAILED", color: "var(--text-muted)" },
};

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
  const publicIssuerId = urlParams.get('issuerId'); // E: public issuer-directory profile view (no OTP)
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const loggedInUserId = loggedInUser._id || loggedInUser.id || '';
  const isOwner = previewUserId && loggedInUserId && previewUserId === loggedInUserId;

  // check if this is a public link (no recipient email required)
  const [isPublicLink, setIsPublicLink] = useState(false);

  useEffect(() => {
    const checkLinkType = async () => {
      if (!token || isOwner || publicIssuerId) return;
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
  const [gateStage, setGateStage] = useState(isOwner || publicIssuerId ? 'verified' : 'loading'); // 'loading' | 'email' | 'otp' | 'verified'
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

  // ── C10: "Verify all" — bulk-check every listed credential against the blockchain ──
  // vaToken = 'verifier_email_proof' JWT. Specific-recipient links get it free from the
  // share-OTP verify; public links prove an email via the verifier OTP on first click.
  const [vaToken, setVaToken] = useState("");
  const [vaEmail, setVaEmail] = useState("");
  const [vaGate, setVaGate] = useState("hidden"); // 'hidden' | 'email' | 'code'
  const [vaModalOpen, setVaModalOpen] = useState(false); // B2: results shown in a popup card
  const [vaOtpEmail, setVaOtpEmail] = useState("");
  const [vaOtpCode, setVaOtpCode] = useState("");
  const [vaOtpError, setVaOtpError] = useState("");
  const [vaOtpLoading, setVaOtpLoading] = useState(false);
  const [vaRunning, setVaRunning] = useState(false);
  const [vaDone, setVaDone] = useState(false);
  const [vaProgress, setVaProgress] = useState({ done: 0, total: 0 });
  const [vaResults, setVaResults] = useState({}); // blockchainId -> { outcome }

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
            profilePicture: response.user.profilePicture || null,
            sharedCredentials: response.user.sharedCredentials || [],
            issuerStats: response.user.issuerStats || null
          };
          setProfileData(nextProfile);
          setSummary(nextProfile.summary || '');
          if (nextProfile.profilePicture) setAvatar(nextProfile.profilePicture);
          if (Array.isArray(response.user.sharedCredentials)) {
            setCredentials(filterVisibleProfileCredentials(response.user.sharedCredentials, response.user.role));
          }
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

  // ── Load PUBLIC issuer profile (issuer directory → ?issuerId=...) — no OTP ──
  useEffect(() => {
    if (!publicIssuerId) return;
    let active = true;
    const loadPublicIssuer = async () => {
      try {
        const response = await apiService.getUserInfo(publicIssuerId);
        if (!active) return;
        if (response.success && response.user) {
          const nextProfile = {
            id: response.user.id,
            userId: response.user.id,
            name: response.user.name,
            orgName: response.user.orgName || response.user.organizationName || '',
            email: response.user.email,
            role: response.user.role,
            summary: response.user.summary || '',
            profilePicture: response.user.profilePicture || null,
            sharedCredentials: response.user.sharedCredentials || [],
            issuerStats: response.user.issuerStats || null
          };
          setProfileData(nextProfile);
          setSummary(nextProfile.summary || '');
          if (nextProfile.profilePicture) setAvatar(nextProfile.profilePicture);
          if (Array.isArray(response.user.sharedCredentials)) {
            setCredentials(filterVisibleProfileCredentials(response.user.sharedCredentials, response.user.role));
          }
          setGateStage('verified');
        } else {
          setGateError('Issuer profile not found.');
          setGateStage('blocked');
        }
      } catch (err) {
        console.error('[PROFILE PREVIEW] Error loading public issuer:', err);
        if (active) { setGateError('Issuer profile not found.'); setGateStage('blocked'); }
      }
    };
    loadPublicIssuer();
    return () => { active = false; };
  }, [publicIssuerId]);

  // ── Load credentials after OTP verified - polo ─────────────────
  useEffect(() => {
    const effectiveUserId = isOwner ? previewUserId : userId;
    // Skip the holder-credentials fetch when the profile already carries sharedCredentials
    // (issuer templates come from buildShareProfilePayload — don't overwrite them).
    if (gateStage !== 'verified' || !effectiveUserId || Array.isArray(profileData?.sharedCredentials)) return;
    const fetchCredentials = async () => {
      setCredLoading(true);
      try {
        const data = await apiService.Get_UserCredentials(effectiveUserId);
        // Owner sees ALL their credentials; recipient sees only public ones.
        // filterVisibleProfileCredentials shows all statuses (incl. revoked/expired) with a
        // visible status pill — the holder controls exposure via each credential's visibility.
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
        // C10: the recipient's email is now OTP-proven — keep the verifier proof token so
        // "Verify all" can log checks under it without a second OTP.
        if (result.verifierProofToken) {
          setVaToken(result.verifierProofToken);
          setVaEmail(result.verifierEmail || gateEmail.trim());
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

  // ── C10: Verify-all handlers ─────────────────────────────────────
  // Every check reads the LIVE blockchain (never the cache) and is logged under the
  // OTP-proven email — bulk checks feed the same verification analytics as single ones.
  const startVerifyAll = () => {
    if (vaRunning) return;
    if (vaToken) { runVerifyAll(vaToken, vaEmail); return; }
    // Public link: no proven email yet — prove one via the verifier OTP first.
    setVaOtpEmail(gateEmail.trim() || "");
    setVaOtpCode(""); setVaOtpError("");
    setVaGate("email");
  };

  const sendVaOtp = async () => {
    const email = vaOtpEmail.trim();
    if (!email) { setVaOtpError("Please enter your email."); return; }
    setVaOtpLoading(true); setVaOtpError("");
    try {
      await apiService.requestVerifierOtp(email);
      setVaGate("code");
    } catch (err) {
      setVaOtpError(err.response?.data?.message || "Failed to send the code.");
    } finally { setVaOtpLoading(false); }
  };

  const confirmVaOtp = async () => {
    const email = vaOtpEmail.trim();
    if (!vaOtpCode.trim()) { setVaOtpError("Enter the 6-digit code from your email."); return; }
    setVaOtpLoading(true); setVaOtpError("");
    try {
      const res = await apiService.confirmVerifierOtp(email, vaOtpCode.trim());
      setVaToken(res.token);
      setVaEmail(email);
      setVaGate("hidden");
      runVerifyAll(res.token, email);
    } catch (err) {
      setVaOtpError(err.response?.data?.message || "Invalid or expired code.");
    } finally { setVaOtpLoading(false); }
  };

  // Sequential on purpose — each check is its own ledger read + on-chain log; the
  // progress counter stays honest and the API isn't hammered with parallel gateways.
  const runVerifyAll = async (tok, em) => {
    const list = credentials.filter((c) => c.blockchainId);
    if (list.length === 0) return;
    setVaRunning(true); setVaDone(false); setVaModalOpen(true);
    setVaResults({}); setVaProgress({ done: 0, total: list.length });
    const results = {};
    for (let i = 0; i < list.length; i++) {
      const id = list[i].blockchainId;
      try {
        const resp = await apiService.Verify_Credential(id);
        const status = String(resp.status || "").toLowerCase();
        results[id] = { outcome: resp.isValid ? "valid" : (VA_OUTCOME_META[status] ? status : "invalid") };
        try {
          await apiService.logVerificationOnChain(
            resp.credentialID || id, "", em,
            JSON.stringify({ isValid: !!resp.isValid, reason: resp.reason, status: resp.status, source: resp.sources?.primarySource || "unknown" }),
            tok
          );
        } catch (logErr) { console.warn("[VERIFY ALL] log failed (non-fatal):", logErr.message); }
      } catch (err) {
        if (err?.response?.status === 404) {
          results[id] = { outcome: "not_found" };
          try {
            await apiService.logVerificationOnChain(
              id, "", em,
              JSON.stringify({ valid: false, reason: "Credential not found", status: "not_found", source: "not_found" }),
              tok
            );
          } catch (logErr) { console.warn("[VERIFY ALL] not-found log failed (non-fatal):", logErr.message); }
        } else {
          results[id] = { outcome: "error" };
        }
      }
      setVaResults({ ...results });
      setVaProgress({ done: i + 1, total: list.length });
    }
    setVaRunning(false); setVaDone(true);
  };

  // Verify-all is for third parties viewing a HOLDER's shared profile — not the owner
  // checking themselves, and not issuer template galleries (drafts aren't verifiable).
  const vaEligible = gateStage === 'verified' && !isOwner && !publicIssuerId
    && String(profileData?.role || 'student').toLowerCase() !== 'issuer'
    && credentials.some((c) => c.blockchainId);

  const vaSummary = (() => {
    const vals = Object.values(vaResults);
    if (vals.length === 0) return null;
    const count = (o) => vals.filter((r) => r.outcome === o).length;
    const parts = [];
    if (count("valid")) parts.push(`${count("valid")} valid`);
    if (count("revoked")) parts.push(`${count("revoked")} revoked`);
    if (count("expired")) parts.push(`${count("expired")} expired`);
    if (count("not_found")) parts.push(`${count("not_found")} not found`);
    if (count("invalid")) parts.push(`${count("invalid")} invalid`);
    if (count("error")) parts.push(`${count("error")} failed`);
    return `${vals.length} checked — ${parts.join(" · ")}`;
  })();

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

      {/* PROFILE4: issuer credibility stats */}
      {profileData?.role === 'issuer' && profileData?.issuerStats && (
        <section className="about-section">
          <h3>Issuer Stats</h3>
          <div className="about-content">
            <div className="about-item">
              <span className="label">Credentials issued</span>
              <span className="value">{profileData.issuerStats.totalIssued}</span>
            </div>
            <div className="about-item">
              <span className="label">Recipients</span>
              <span className="value">{profileData.issuerStats.distinctHolders}</span>
            </div>
            {profileData.issuerStats.memberSince && (
              <div className="about-item">
                <span className="label">On ChainCert since</span>
                <span className="value">{new Date(profileData.issuerStats.memberSince).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
              </div>
            )}
            {Array.isArray(profileData.issuerStats.types) && profileData.issuerStats.types.length > 0 && (
              <div className="about-item">
                <span className="label">Offers</span>
                <span className="value">{profileData.issuerStats.types.join(' · ')}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Badge Wallet — vertical list with order numbers - polo */}
      <section className="badge-wallet">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Credentials &amp; Badges</h3>
          {/* C10: bulk verification — every credential checked live against the blockchain */}
          {vaEligible && (
            <button
              type="button"
              onClick={startVerifyAll}
              disabled={vaRunning}
              style={{ ...gateBtnStyle, width: 'auto', marginTop: 0, padding: '8px 16px', fontSize: 14, opacity: vaRunning ? 0.6 : 1, cursor: vaRunning ? 'wait' : 'pointer' }}
            >
              {vaRunning
                ? `Verifying ${Math.min(vaProgress.done + 1, vaProgress.total)} of ${vaProgress.total}…`
                : vaDone ? 'Verify all again' : 'Verify all on the blockchain'}
            </button>
          )}
        </div>
        <div className="badge-list">
          {credLoading && <SpinnerBlock label="Loading credentials…" minHeight={120} />}
          {!credLoading && credentials.length === 0 && (
            <div>No public credentials yet.</div>
          )}
          {!credLoading && credentials.map((cred, index) => {
            // Use effective (end-of-day-Manila) status so a cron-lagged past-expiry credential
            // reads "Expired" here, matching what the live "Verify all" check returns.
            const eff = effectiveCredentialStatus(cred);
            return (
            <div key={cred._id} className={`badge-list-item ${eff === 'revoked' ? 'revoked-card' : eff === 'expired' ? 'expired-card' : ''}`} onClick={() => setSelectedPreviewCred(cred)} style={{ cursor: 'pointer' }}>
              <div className="badge-order-num">{index + 1}</div>
              <div className="badge-img-small">
                {cred.badgeImage ? (
                  <img src={cred.badgeImage} alt="badge" style={{width: 40, height: 40, objectFit: 'cover', borderRadius: 6}} />
                ) : '🎓'}
              </div>
              <div className="badge-info">
                <h4>{cred.credentialName}</h4>
                <p className="issuer">{cred.issuerName || profileData?.orgName || profileData?.name}</p>
                <p className="date">{(cred.savedToUserWalletAt || cred.createdAt) ? new Date(cred.savedToUserWalletAt || cred.createdAt).toLocaleDateString() : "N/A"}</p>
                {profileData?.role === 'issuer' && cred.issuanceCount > 0 && (
                  <p className="issuance-count" style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--ok)' }}>
                    Issued {cred.issuanceCount} time{cred.issuanceCount !== 1 ? 's' : ''}
                  </p>
                )}
                {eff === 'revoked' && (
                  <span className="status-pill revoked">Revoked</span>
                )}
                {eff === 'expired' && (
                  <span className="status-pill expired">Expired</span>
                )}
                {eff === 'revoked' && cred.rejectionReason && (
                  <p style={{color: "var(--danger)", fontSize: "0.75rem", margin: "4px 0"}}>
                    Reason: {cred.rejectionReason}
                  </p>
                )}
              </div>
            </div>
            );
          })}
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

      {/* C10: mini OTP gate for PUBLIC links — prove an email once, then verify + log all */}
      {vaGate !== 'hidden' && (
        <div style={overlayStyle}>
          <div style={gateBoxStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{vaGate === 'email' ? '🛡️' : '📧'}</div>
              <h2 style={{ color: 'var(--accent-strong)', margin: 0, fontSize: '1.3rem' }}>
                {vaGate === 'email' ? 'Verify as yourself' : 'Check your email'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 8 }}>
                {vaGate === 'email'
                  ? 'Each check is logged on the blockchain under a confirmed email — enter yours to continue.'
                  : `Enter the 6-digit code we sent to ${vaOtpEmail}`}
              </p>
            </div>
            {vaGate === 'email' ? (
              <input
                type="email"
                placeholder="your@email.com"
                value={vaOtpEmail}
                onChange={(e) => setVaOtpEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendVaOtp()}
                style={gateInputStyle}
              />
            ) : (
              <input
                type="text"
                placeholder="000000"
                value={vaOtpCode}
                onChange={(e) => setVaOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && confirmVaOtp()}
                style={{ ...gateInputStyle, letterSpacing: '0.28em', textAlign: 'center', fontSize: '1.25rem' }}
                maxLength={6}
              />
            )}
            {vaOtpError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }}>{vaOtpError}</p>}
            <button onClick={vaGate === 'email' ? sendVaOtp : confirmVaOtp} disabled={vaOtpLoading} style={gateBtnStyle}>
              {vaOtpLoading ? 'Working…' : vaGate === 'email' ? 'Send verification code' : 'Verify & check all'}
            </button>
            <button
              onClick={() => setVaGate('hidden')}
              style={{ ...gateBtnStyle, background: 'var(--border)', border: '1px solid var(--border-strong)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* B2: verify-all progress + results in a popup card (portrait), not inline over the cards */}
      {vaModalOpen && (
        <div style={overlayStyle}>
          <div style={{ ...gateBoxStyle, maxWidth: 440, width: '92%', maxHeight: '82vh', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h2 style={{ color: 'var(--accent-strong)', margin: 0, fontSize: '1.15rem' }}>⛓ Live blockchain check</h2>
              {!vaRunning && (
                <button onClick={() => setVaModalOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
              )}
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${vaProgress.total ? Math.round((vaProgress.done / vaProgress.total) * 100) : 0}%`, background: 'var(--accent-strong)', transition: 'width .3s ease' }} />
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {vaRunning
                ? `Verifying ${Math.min(vaProgress.done + 1, vaProgress.total)} of ${vaProgress.total}… each check reads the live blockchain.`
                : vaSummary ? `${vaSummary}${vaEmail ? ` · logged under ${vaEmail}` : ''}` : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', paddingRight: 2 }}>
              {credentials.filter((c) => vaResults[c.blockchainId]).map((c) => {
                const m = VA_OUTCOME_META[vaResults[c.blockchainId].outcome] || VA_OUTCOME_META.error;
                return (
                  <div key={`vam-${c._id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.credentialName}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: m.color, flexShrink: 0 }}>{m.label}</span>
                  </div>
                );
              })}
            </div>
            {vaDone && (
              <button onClick={() => setVaModalOpen(false)} style={gateBtnStyle}>Done</button>
            )}
          </div>
        </div>
      )}

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
                <span className="detail-value">{(() => {
                  const e = effectiveCredentialStatus(selectedPreviewCred);
                  return (e === 'issued' || e === 'active') ? 'Active' : e ? e.charAt(0).toUpperCase() + e.slice(1) : 'N/A';
                })()}</span>
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