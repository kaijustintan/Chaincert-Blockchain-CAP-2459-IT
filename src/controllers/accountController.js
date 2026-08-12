// accountController.js
/*
  FILE: accountController.js
  LAYMAN (Tropang Ex): Ito yung "account + profile" desk. Dito kinukuha ang impormasyon ng user,
  ina-update ang profile at profile picture, at dito rin nakasalalay ang LAHAT ng profile-sharing:
  ang specific na link na may OTP (para sa isang tao lang), ang PUBLIC na link (iisa, permanente,
  reused — yung ginagamit ng PDF export), pati ang "forgot/reset password" via email OTP.

  TECHNICAL: Express controller for profile/account + profile-share + password-reset. Sharing has two
  models: SPECIFIC-recipient links (generateShareLink → requestOTP → verifyOTP, time-limited, email-OTP
  gated) and the PUBLIC link (generatePublicShareLink — a single permanent, reused, no-recipient link;
  see the privacy model). buildShareProfilePayload is the shared, role-aware projection used by every
  read path (owner preview, share-link info, post-OTP) — public-only credentials/templates + issuer
  credibility stats. Password reset is anti-enumeration (always-200) + per-account OTP rate-limited
  (M5) + strength-checked (M8). Uploads are magic-number validated (M7). Errors → sendServerError (M9).
  Profile-share tokens use crypto.randomBytes (secure); OTPs are 6-digit, 10-min TTL.

  OUTLINE:
    SHARED HELPER
      - buildShareProfilePayload(ownerId)     role-aware public profile payload (holder vs issuer)
    PROFILE
      - getUserInfo(req,res)                  full profile + share-profile data (owner preview)
      - getAllUsers(req,res)                  list non-staff users
      - updateProfile(req,res)                update summary/isPublic/username
      - uploadProfilePicture(req,res)         avatar upload (M7 magic-number PNG/JPG)
    SPECIFIC SHARE LINK (recipient + OTP)
      - generateShareLink(req,res)            mint a recipient-scoped link (optional expiry)
      - getShareLinkInfo(req,res)             validate a token + (for public) return profile
      - recordView(req,res)                   increment a link's view count
      - requestOTP(req,res) / verifyOTP(req,res)   email-OTP gate for recipient links
    PUBLIC SHARE LINK (no recipient)
      - generatePublicShareLink(req,res)      single PERMANENT reused public link
      - revokeShareLink(req,res)              revoke a token (owner only)
      - getMyShareLinks(req,res)              list the caller's links
    PASSWORD RESET (anti-enumeration + M5 rate-limit + M8 strength)
      - forgotPassword(req,res) / resetPassword(req,res)
*/

const couchDB = require('../couchDB_service');
const mailerService = require('../mailerService'); // - polo
const crypto = require('crypto'); // - polo
const {
  validateUploadedFile,
  validatePasswordStrength,
  sendServerError,
  generateOtp,      // CSPRNG 6-digit code (replaces Math.random)
  otpEquals,        // constant-time compare
  OTP_MAX_FAILURES  // wrong guesses before the code is burned
} = require('../securityHelpers'); // Phase 5 Tier 2

/*
  Function Name: buildShareProfilePayload

  LAYMAN (Tropang Ex):
  Ginagawa nito yung "nakikita ng publiko" na bersyon ng profile. Kung HOLDER, k: ang public niyang
  credentials. Kung ISSUER, ang public niyang templates (may bilang kung ilang beses na-issue) plus
  credibility stats (kabuuang na-issue, ilang distinct holders, member-since, mga uri ng credential).

  TECHNICAL:
  Shared, role-aware projection used by getUserInfo / getShareLinkInfo / verifyOTP. For issuers it
  Promise.all's templates + issued, computes per-template issuanceCount + issuerStats; for holders it
  loads the holder's credentials. Then filters to PUBLIC-only (issuers: templates only) — all statuses
  kept (frontend shows a status indicator). Returns a safe profile shape (no password).

  PARAMS:
  - ownerId — the user/issuer _id.

  RETURNS:
  Profile object { id, userId, name, orgName, email, role, summary, profilePicture, isPublic,
  sharedCredentials[], issuerStats|null }, or null if the user doesn't exist.
*/
const buildShareProfilePayload = async (ownerId) => {
  const user = await couchDB.getUser(ownerId);
  if (!user) return null;

  const role = String(user.role || (String(ownerId || '').startsWith('issuer_') ? 'issuer' : 'student')).toLowerCase();

  let sharedCredentials;
  let issuerStats = null;

  if (role === 'issuer') {
    // PROFILE3/PROFILE4: an issuer's public profile shows their templates, each with
    // how many times it's been issued, plus issuer-level credibility stats.
    /* `issued` is PROJECTED: the loop below reads only templateId and holderID from it, and
       issuedList.length. Without the projection this pulled every issued credential document —
       each carrying a copy of the template's base64 badgeImage — for two tallies and a count.
       This runs on getUserInfo, which is a PUBLIC unauthenticated route, so an anonymous caller
       could force that dump on demand.

       `templates` deliberately stays FULL: the results are spread into sharedCredentials below and
       rendered on the profile, badge images included. */
    const [templates, issued] = await Promise.all([
      couchDB.getIssuerTemplatesByIssuerId(ownerId),
      couchDB.getIssuerIssuedByIssuerId(ownerId, ['templateId', 'holderID']),
    ]);
    const issuedList = Array.isArray(issued) ? issued : [];
    const countByTemplate = {};
    const holders = new Set();
    for (const c of issuedList) {
      if (c?.templateId) countByTemplate[c.templateId] = (countByTemplate[c.templateId] || 0) + 1;
      if (c?.holderID) holders.add(c.holderID);
    }
    sharedCredentials = (Array.isArray(templates) ? templates : []).map((t) => ({
      ...t,
      issuanceCount: countByTemplate[t._id] || 0, // PROFILE4: per-template issuance count
    }));
    const publicTypes = [...new Set(
      sharedCredentials.filter((t) => t?.visibility === 'public').map((t) => t.credentialType).filter(Boolean)
    )];
    issuerStats = {
      totalIssued: issuedList.length,            // PROFILE4: total credentials issued
      distinctHolders: holders.size,             // PROFILE4: unique recipients
      memberSince: user.approvedAt || user.createdAt || null, // PROFILE4: on ChainCert since
      types: publicTypes,                        // PROFILE4: credential types offered
    };
  } else {
    sharedCredentials = await couchDB.getUserCredentialsByHolderId(ownerId);
  }

  // PROFILE3 (per decision): keep public-only gating for templates/credentials.
  // Show ALL statuses (incl. revoked/expired) — the frontend renders a status indicator. - polo
  const visibleCredentials = (Array.isArray(sharedCredentials) ? sharedCredentials : []).filter((cred) => (
    cred?.visibility === 'public' &&
    (role !== 'issuer' || cred?.isTemplate === true || String(cred?.type || '').toLowerCase() === 'credential_template')
  ));

  return {
    id: user._id,
    userId: user._id,
    name: user.username || user.orgName || user.contactName || user.fullName || user.name || 'User',
    orgName: user.orgName || user.organizationName || '',
    email: user.email || '',
    role,
    summary: user.summary || '',
    profilePicture: user.profilePicture || user.avatar || null,
    isPublic: user.isPublic,
    sharedCredentials: visibleCredentials,
    issuerStats,
  };
};

const accountController = {
  /*
    Function Name: getUserInfo
    LAYMAN (Tropang Ex): Kinukuha ang buong profile info ng isang user/issuer (kasama na ang public
    share-profile data) — ginagamit ng profile page at ng owner na "Preview Public Profile".
    TECHNICAL: Public GET by :id. Loads the user (404 if missing), then buildShareProfilePayload(id) to
    attach sharedCredentials + issuerStats, so the owner preview matches a share link exactly.
    PARAMS: req (req.params.id), res.
    RETURNS: 200 { success, user:{...,sharedCredentials,issuerStats} } | 404 | 500 via sendServerError.
  */
  getUserInfo: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await couchDB.getUser(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // PROFILE3/4: include the public share-profile data (templates + issuer stats)
      // so the owner "Preview Public Profile" path renders the same as a share link.
      const shareProfile = await buildShareProfilePayload(id);

      /* Confidentiality gate (M1-adjacent).

         This route is intentionally PUBLIC — profilePreview.js calls it with no token for the
         share-link profile fallback and the public issuer-directory view, so adding requireAuth
         would break the directory. What it must NOT do is hand a personal email address to an
         anonymous caller who merely guessed or enumerated a user id.

         So: the owner (and admin) sees the full record; everyone else gets the public-facing
         subset. Issuer ORGANISATION contact details stay visible for any approved issuer, because
         a public directory listing whose whole purpose is "who issued this, how do I reach them"
         is meaningless without them — that is published business contact info, not personal PII.
      */
      const viewerId = req.user?.id || req.user?._id || null;
      const isOwner = viewerId && String(viewerId) === String(user._id);
      const isAdmin = req.user?.role === 'admin';
      const isIssuerOrg = user.role === 'issuer';
      const canSeePrivate = isOwner || isAdmin || isIssuerOrg;

      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.username || user.orgName || user.contactName || user.name || '',
          username: user.username || '',
          orgName: user.orgName || '',
          organizationName: user.organizationName || user.orgName || '',
          contactName: canSeePrivate ? (user.contactName || '') : '',
          fullName: user.fullName || user.username || user.orgName || '',
          email: canSeePrivate ? user.email : '',
          role: user.role,
          summary: user.summary || '',
          isPublic: user.isPublic,
          profilePicture: user.profilePicture || user.avatar || null,
          profilePictureUpdatedAt: user.profilePictureUpdatedAt || user.updatedAt || null,
          sharedCredentials: shareProfile?.sharedCredentials || [],
          issuerStats: shareProfile?.issuerStats || null
        }
      });
    } catch (error) {
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  /*
    Function Name: getAllUsers

    LAYMAN (Tropang Ex): Listahan ng mga regular na user (holder) para sa admin dashboard. Dati,
    IBINABALIK NITO ANG BUONG DOCUMENT ng bawat user — kasama ang naka-hash na password at ang
    live na reset OTP kapag may kasalukuyang password-reset. At walang auth. Kaya kahit sino,
    kahit hindi naka-login, pwedeng humingi ng reset code ng kahit sinong account, basahin ito
    rito, tapos i-reset ang password nila. Ngayon: admin-only, at piling-piling field lang.

    TECHNICAL: couchDB.getAllUsers() returns RAW docs (usersDb.list({include_docs:true}) ->
    rows.map(row => row.doc)), which carry `password` (bcrypt hash, set in saveUser) plus
    `resetOtp` / `resetOtpExpiresAt` / `resetOtpUsed` written by forgotPassword. This handler
    forwarded them verbatim. Route is now requireAdmin (authRoutes.js) and the response is an
    explicit allow-list — new sensitive fields added to the user doc cannot leak by default.

    NOTE the pre-existing role mismatch, deliberately NOT changed here: this filters
    (!role || role === 'user') while register() writes role 'student'. Both values exist in the
    deployment. Fixing that is a data-consistency question, not a security one — audit separately.

    PARAMS: req, res. RETURNS: 200 { success, message, users:[], count } | 500.
  */
  getAllUsers: async (req, res) => {
    try {
      const users = await couchDB.getAllUsers();
      const filteredUsers = users.filter(u => !u.role || u.role === 'user');

      // Allow-list projection. Never spread the raw doc — it carries password/resetOtp.
      const safeUsers = filteredUsers.map(u => ({
        _id: u._id,
        email: u.email,
        username: u.username || '',
        fullName: u.fullName || u.username || '',
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        role: u.role || 'user',
        isActive: u.isActive !== false,
        createdAt: u.createdAt || null,
        profilePicture: u.profilePicture || null
      }));

      return res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        users: safeUsers,
        count: safeUsers.length
      });
    } catch (error) {
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  /*
    Function Name: updateProfile

    LAYMAN (Tropang Ex): Ina-update ang profile fields ng user — summary, public/private toggle,
    username. Dati, yung userId ay galing sa REQUEST BODY at walang auth, kaya kahit sino kayang
    palitan ang pangalan o summary ng kahit sinong user o issuer, o gawing PUBLIC ang isang
    private na profile. Ngayon, sarili mo lang ang kaya mong baguhin — galing sa token ang id.

    TECHNICAL: Identity is now derived from req.user (M1 pattern, matching walletController). The
    body's userId is IGNORED for ownership; it is only honored for an admin acting on another
    account. updateProfile itself is field-limited in couchDB_service, so this was never mass
    assignment — but it was an unauthenticated write to an arbitrary document.

    PARAMS: req (req.user, req.body.summary/isPublic/username, optional req.body.userId for admin), res.
    RETURNS: 200 { success, message, data } | 401 | 500 via sendServerError.
  */
  updateProfile: async (req, res) => {
    try {
      const authedId = req.user?.id || req.user?._id;
      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      const { summary, isPublic, username } = req.body;

      // Admin may target another account; everyone else is pinned to their own id regardless of
      // what the body says.
      const userId = (req.user.role === 'admin' && req.body.userId)
        ? req.body.userId
        : authedId;

      const result = await couchDB.updateProfile(userId, { summary, isPublic, username });

      return res.status(200).json({
        success: true,
        message: 'Profile updated',
        data: result
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  // ============================================================
  // PROFILE SHARE LINK HANDLERS - polo
  // ============================================================

  /*
    Function Name: generateShareLink

    LAYMAN (Tropang Ex):
    Gumagawa ng share link na para sa ISANG TAO lang (by email) — pwedeng may expiry. Para ma-view ng
    tatanggap, kailangan muna nilang i-verify ang email nila gamit ang OTP (tingnan requestOTP/verifyOTP).

    TECHNICAL:
    Auth required. Mints a recipient-scoped profile_share_link with a crypto.randomBytes token and an
    optional expiry (durationDays → expiresAt; 'none'/absent = no expiry). Distinct from the public link.

    PARAMS:
    - req — req.user (owner), req.body { recipientEmail (required), durationDays?, source?, description? }.
    - res — Express response.

    RETURNS:
    200 { success, message, shareUrl, token } | 400 missing recipientEmail | 401 unauth | 500.

    STEPS
      Step 1 — Auth + require recipientEmail.
      Step 2 — Compute expiresAt from durationDays (null when 'none').
      Step 3 — crypto.randomBytes(24) token; couchDB.createProfileShareLink(userId, token, recipientEmail, expiresAt, meta).

    EXAMPLE
      POST /api/auth/profile-share/generate  body { recipientEmail:"hr@co.com", durationDays:"7" }
      → 200 { success:true, shareUrl:"<FRONTEND_URL>/profile/<token>", token:"<token>" }
  */
  generateShareLink: async (req, res) => {
    try {
      const { recipientEmail, durationDays, source, description } = req.body;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
      if (!recipientEmail) {
        return res.status(400).json({ success: false, message: 'Recipient email is required.' });
      }

      // Calculate expiry - polo
      let expiresAt = null;
      if (durationDays && durationDays !== 'none') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + parseInt(durationDays));
        expiresAt = expiry.toISOString();
      }

      // Generate unique token - polo
      const token = crypto.randomBytes(24).toString('hex');

      await couchDB.createProfileShareLink(userId, token, recipientEmail, expiresAt, {
        source,
        description
      });

      const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/${token}`;

      // Group 9: email the specific recipient the link directly. They're a real, owner-chosen
      // address (realRecipient bypasses the demo catch-all). Fire-and-forget so a mail hiccup
      // never fails the link generation — the link is still returned to the owner regardless.
      mailerService.sendMailFireAndForget({
        to: recipientEmail,
        realRecipient: true,
        subject: 'A ChainCert profile has been shared with you',
        html: mailerService.renderEmail({
          heading: 'A ChainCert profile was shared with you',
          bodyHtml: `
            <p style="margin:0 0 16px;color:#3a3a4c;font-size:15px;line-height:1.6;">Someone has shared their verified ChainCert credential profile with you. Open it below &mdash; you'll be asked for a one-time verification code sent to this email address.</p>
            ${mailerService.renderButton(shareUrl, 'View Shared Profile')}
            <p style="margin:14px 0 0;color:#8a8a99;font-size:12px;line-height:1.6;word-break:break-all;">Or paste this link into your browser:<br>${shareUrl}</p>`
        }),
        text: `A ChainCert profile was shared with you. Open it here (a verification code will be required): ${shareUrl}`
      }, '[SHARE-LINK]');

      return res.status(200).json({
        success: true,
        message: 'Share link generated.',
        shareUrl,
        token
      });
    } catch (error) {
      console.error('[SHARE] generateShareLink error:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  /*
    Function Name: getShareLinkInfo
    LAYMAN (Tropang Ex): Tinitingnan kung valid pa ang isang share link (hindi revoked/expired). Kung
    PUBLIC link, ibinabalik na rin ang profile; kung specific (may recipient), kailangan pa ng OTP.
    TECHNICAL: Public. Loads the token (404), rejects inactive/revoked/expired (lazy-expires past expiresAt),
    and returns { recipientEmail (null ⇒ public), userId, profile (built for public links) }.
    PARAMS: req (req.params.token), res.
    RETURNS: 200 { success, valid, recipientEmail, userId, profile } | 403 revoked/expired | 404 | 500.
  */
  getShareLinkInfo: async (req, res) => {
    try {
      const { token } = req.params;
      const doc = await couchDB.getProfileShareLink(token);

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Invalid or deleted link.' });
      }
      if (!doc.isActive) {
        return res.status(403).json({ success: false, message: 'This link has been revoked.' });
      }
      if (doc.status === 'revoked' || doc.status === 'expired') {
        return res.status(403).json({
          success: false,
          message: doc.status === 'revoked' ? 'This link has been revoked.' : 'This link has expired.'
        });
      }
      if (doc.expiresAt) {
        const expiresAt = new Date(doc.expiresAt);
        if (Number.isNaN(expiresAt.getTime()) || new Date() > expiresAt) {
          try { await couchDB.updateShareLinkStatus(doc._id, 'expired'); } catch (e) { /* non-critical */ }
          return res.status(403).json({ success: false, message: 'This link has expired.' });
        }
      }

      const profile = doc.userId ? await buildShareProfilePayload(doc.userId) : null;

      return res.status(200).json({ 
        success: true, 
        valid: true,
        recipientEmail: doc.recipientEmail || null, // null means public link
        userId: doc.userId, // needed for public link profile load
        profile
      });
    } catch (error) {
      console.error('[SHARE] getShareLinkInfo error:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  /*
    Function Name: recordView
    LAYMAN (Tropang Ex): Binibilang kung ilang beses na na-view ang isang share link.
    TECHNICAL: Public write wrapper — couchDB.recordShareLinkView(token); maps not-found→404, revoked/
    expired→403, else 500.
    PARAMS: req (req.params.token), res. RETURNS: 200 { success, viewCount } | 403 | 404 | 500.
  */
  recordView: async (req, res) => {
    try {
      const { token } = req.params;
      const viewCount = await couchDB.recordShareLinkView(token);
      return res.status(200).json({ success: true, viewCount });
    } catch (error) {
      console.error('[SHARE] recordView error:', error);
      const status = error.message.includes('not found') ? 404
                   : error.message.includes('revoked') || error.message.includes('expired') ? 403
                   : 500;
      return res.status(status).json({ success: false, message: error.message });
    }
  },

  /*
    Function Name: requestOTP

    LAYMAN (Tropang Ex):
    Para sa specific (recipient) link: pinapadala ang 6-digit code sa email ng tatanggap. Dapat tugma
    ang email nila sa email na pinag-share-an, kung hindi, hindi sila bibigyan ng code.

    TECHNICAL:
    Public. Validates the token (active/not-revoked/not-expired) and that the supplied email matches
    doc.recipientEmail (case-insensitive). Generates a 6-digit OTP (10-min TTL), persists it via
    couchDB.saveOTPToShareLink, and emails it SYNCHRONOUSLY with realRecipient:true (the viewer is a
    real, owner-chosen address — bypass the demo catch-all).

    PARAMS: req (req.params.token, req.body.email), res.
    RETURNS: 200 { success, message } | 400 no email | 403 revoked/expired/email-mismatch | 404 | 500.

    STEPS
      Step 1 — Require email; load + validate the token.
      Step 2 — Enforce email === doc.recipientEmail.
      Step 3 — Generate OTP + 10-min expiry; saveOTPToShareLink.
      Step 4 — sendMail (realRecipient:true) the code.
  */
  requestOTP: async (req, res) => {
    try {
      const { token } = req.params;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
      }

      const doc = await couchDB.getProfileShareLink(token);

      if (!doc) return res.status(404).json({ success: false, message: 'Invalid or deleted link.' });
      if (!doc.isActive || doc.status === 'revoked') return res.status(403).json({ success: false, message: 'This link has been revoked.' });
      if (doc.status === 'expired') return res.status(403).json({ success: false, message: 'This link has expired.' });
      if (doc.expiresAt) {
        const expiresAt = new Date(doc.expiresAt);
        if (Number.isNaN(expiresAt.getTime()) || new Date() > expiresAt) {
          try { await couchDB.updateShareLinkStatus(doc._id, 'expired'); } catch (e) { /* non-critical */ }
          return res.status(403).json({ success: false, message: 'This link has expired.' });
        }
      }
      if (doc.recipientEmail.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).json({ success: false, message: 'This link is not accessible with your email.' });
      }

      // Generate 6-digit OTP - polo  (now CSPRNG-backed; was Math.random)
      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      await couchDB.saveOTPToShareLink(token, otp, otpExpiresAt);

      // Send OTP email via Gmail SMTP - polo
      // Recipient is the external viewer the holder explicitly shared with (validated
      // against doc.recipientEmail above) → always a real address, deliver directly.
      await mailerService.sendMail({
        to: email,
        realRecipient: true,
        subject: 'CHAINCERT - Verification Code to Access Profile',
        html: mailerService.renderOtpEmail({
          heading: 'Profile Access Code',
          intro: `This code was requested to view a shared ChainCert profile, for <strong>${email}</strong>. Enter it on the access page to continue.`,
          otp,
          note: 'This code expires in 10 minutes. If you did not request access to a profile, you can safely ignore this email.'
        }),
        text: `This code was requested for: ${email}\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`
      });

      return res.status(200).json({ success: true, message: 'Verification code sent.' });
    } catch (error) {
      console.error('[SHARE] requestOTP error:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  /*
    Function Name: verifyOTP
    LAYMAN (Tropang Ex): Tinitingnan kung tama ang inilagay na 6-digit code; kung oo, binubuksan na ang
    profile para sa tatanggap.
    TECHNICAL: Public. Re-validates the token, then couchDB.verifyOTPAndGetUserId(token, otp) → resolves
    the owner, returns buildShareProfilePayload(userId). Known OTP errors map to 400, else 500.
    PARAMS: req (req.params.token, req.body.otp), res.
    RETURNS: 200 { success, message, userId, profile } | 400 invalid/expired OTP | 403 link state | 404 | 500.
  */
  verifyOTP: async (req, res) => {
    try {
      const { token } = req.params;
      const { otp } = req.body;

      if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP is required.' });
      }

      const doc = await couchDB.getProfileShareLink(token);
      if (!doc) return res.status(404).json({ success: false, message: 'Invalid or deleted link.' });
      if (!doc.isActive || doc.status === 'revoked') return res.status(403).json({ success: false, message: 'This link has been revoked.' });
      if (doc.status === 'expired') return res.status(403).json({ success: false, message: 'This link has expired.' });
      if (doc.expiresAt) {
        const expiresAt = new Date(doc.expiresAt);
        if (Number.isNaN(expiresAt.getTime()) || new Date() > expiresAt) {
          try { await couchDB.updateShareLinkStatus(doc._id, 'expired'); } catch (e) { /* non-critical */ }
          return res.status(403).json({ success: false, message: 'This link has expired.' });
        }
      }

      const userId = await couchDB.verifyOTPAndGetUserId(token, otp);

      const profile = await buildShareProfilePayload(userId);
      if (!profile) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // C10: the recipient's email was just OTP-proven (same guarantee as the verifier OTP),
      // so issue the same 'verifier_email_proof' JWT verifierController.confirmVerifierOtp
      // issues. The profile page uses it to LOG "Verify all" checks under this proven email
      // WITHOUT a second OTP. Best-effort — profile viewing works even if signing fails.
      let verifierProofToken = null;
      if (doc.recipientEmail && process.env.JWT_SECRET) {
        try {
          const jwt = require('jsonwebtoken');
          verifierProofToken = jwt.sign(
            { verifierEmail: String(doc.recipientEmail).toLowerCase(), purpose: 'verifier_email_proof' },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
          );
        } catch (tErr) {
          console.warn('[SHARE] verifier proof-token sign failed (non-fatal):', tErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Verified.',
        userId,
        profile,
        verifierProofToken,
        verifierEmail: doc.recipientEmail || null
      });
    } catch (error) {
      console.error('[SHARE] verifyOTP error:', error);
      // Pass through specific error messages from couchDB_service - polo
      const knownErrors = [
        'Invalid verification code.',
        'Code has expired. Request a new one.',
        'Share link not found'
      ];
      // The wrong-guess budget (OTP pass) throws its own message and is a 429, not a 400 — it must
      // be listed here or the generic branch would turn a normal rate-limit response into a 500.
      if (error.message === 'Too many incorrect codes. Request a new one.') {
        return res.status(429).json({ success: false, message: error.message });
      }
      const status = knownErrors.includes(error.message) ? 400 : 500;
      return res.status(status).json({ success: false, message: error.message });
    }
  },

  // ============================================================
  // FORGOT PASSWORD HANDLERS 
  // ============================================================

  /*
    Function Name: forgotPassword

    LAYMAN (Tropang Ex):
    Nagpapadala ng password-reset code sa email. Para hindi malaman ng masama kung registered ba ang
    isang email, LAGING "success" ang sagot kahit wala yung email. May limit din (3 beses bawat 10
    minuto) para hindi ma-spam ang inbox ng biktima.

    TECHNICAL:
    Public, anti-enumeration: always returns a generic 200 (otpSent flag varies) whether or not the
    account exists. Looks up users first, then approved issuers (only approved issuers can log in).
    M5 per-account OTP rate-limit (3 / 10-min window, persisted on the account doc; DISABLE_RATE_LIMIT
    bypass for testing) — the 429 is only reachable for a REAL account, so it's not an oracle. Generates
    a 6-digit OTP (10-min TTL), saves it, and emails it (routing: holders → real inbox; issuer/admin
    test accounts → central catch-all). Email failure is non-fatal (still returns generic 200).

    PARAMS: req (req.body.email), res.
    RETURNS: 200 { success, otpSent, message } (generic); 400 no email; 429 rate-limited (real acct only);
    else 500 via sendServerError.

    STEPS
      Step 1 — Require email; resolve account (users → approved issuers); unknown → generic 200.
      Step 2 — M5 window check → 429 if over the cap inside the active window.
      Step 3 — Generate OTP + expiry; updateUser with OTP + rate-limit counters.
      Step 4 — Email the code (non-fatal); return generic 200.
  */
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
      }

      // Look up account by email — check users first, then approved issuers only.
      // Only approved issuers can log in (authController loginIssuer blocks all other statuses),
      // so password reset is only meaningful for approved issuer accounts.
      // couchDB.updateUser routes by _id prefix (issuer_ → issuersDB), so both account types
      // share the same downstream OTP-save and password-update path.
      // M11: env-driven so a CouchDB password rotation takes effect everywhere, not just in
      // couchDB_service.js. The literal remains only as the local-dev default.
      const nano = require('nano')(process.env.COUCHDB_URL || 'http://admin:adminpw@localhost:5985');
      const usersDb = nano.use('users');

      let foundDoc = null;

      const userResult = await usersDb.find({ selector: { email: email.toLowerCase().trim() }, limit: 1 });
      if (userResult.docs && userResult.docs.length > 0) {
        foundDoc = userResult.docs[0];
      } else {
        // Fall back to approved issuers — only status that can actually log in
        const issuerDoc = await couchDB.getApprovedIssuer(email.toLowerCase().trim());
        if (issuerDoc) foundDoc = issuerDoc;
      }

      // Always return success to prevent email enumeration
      // (don't reveal if email exists or not)
      if (!foundDoc) {
        return res.status(200).json({ success: true, otpSent: false, message: 'If this email is registered, a reset code has been sent.' });
      }

      const user = foundDoc;

      // M5 (Phase 5 hardening): per-account OTP request rate-limit (KB A-7 / P-5).
      // Cap reset-code requests to 3 per 10-minute window per account, so nobody can spam a
      // victim's inbox or grind reset codes. This counter is persisted on the account doc, so it
      // survives server restarts and works across instances (unlike the per-IP limiter at the
      // server layer). The 429 below is only ever reachable for a REAL account — unknown emails
      // never reach this point (they already returned the generic 200 above), so this adds no
      // enumeration oracle. The counter is reset on a successful password reset.
      const OTP_WINDOW_MS = 10 * 60 * 1000;
      const OTP_MAX_ATTEMPTS = 3;
      const nowMs = Date.now();
      const windowAnchor = user.resetOtpAttemptsAt ? new Date(user.resetOtpAttemptsAt).getTime() : null;

      let otpAttempts;
      let otpAttemptsAt;
      if (!windowAnchor || nowMs - windowAnchor > OTP_WINDOW_MS) {
        // Window expired or first-ever request → open a fresh window.
        otpAttempts = 1;
        otpAttemptsAt = new Date(nowMs).toISOString();
      } else {
        // Inside the active window. (DISABLE_RATE_LIMIT=true skips enforcement for local testing.)
        if (process.env.DISABLE_RATE_LIMIT !== 'true' && (user.resetOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
          return res.status(429).json({
            success: false,
            message: 'Too many reset requests. Please wait a few minutes and try again.'
          });
        }
        otpAttempts = (user.resetOtpAttempts || 0) + 1;
        otpAttemptsAt = user.resetOtpAttemptsAt; // keep the same window anchor
      }

      // Generate 6-digit OTP  (now CSPRNG-backed; was Math.random)
      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Save OTP + rate-limit counters to user doc (single write).
      // resetOtpFailures resets to 0 with each new code — the budget is per-code, not per-account.
      await couchDB.updateUser(user._id, {
        resetOtp: otp,
        resetOtpExpiresAt: otpExpiresAt,
        resetOtpUsed: false,
        resetOtpFailures: 0,
        resetOtpAttempts: otpAttempts,
        resetOtpAttemptsAt: otpAttemptsAt
      });

      // Send OTP email via Gmail SMTP - polo
      // Inner try/catch: email failure is non-fatal here — anti-enumeration: always return
      // the same generic 200 response whether email lands or not.
      // Route by account type: holders → real inbox; issuer/admin (test) → central.
      const acctIsTest = ['issuer', 'admin'].includes(String(user.role || '').toLowerCase()) || String(user._id || '').startsWith('issuer_');
      try {
        await mailerService.sendMail({
          to: email,
          realRecipient: !acctIsTest,
          subject: 'CHAINCERT - Verification Code to Reset Password',
          html: mailerService.renderOtpEmail({
            heading: 'Password Reset Code',
            intro: 'We received a request to reset your ChainCert password. Use the code below to set a new one.',
            otp,
            note: 'This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email &mdash; your password will stay the same.'
          }),
          text: `Your ChainCert password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`
        });
      } catch (emailErr) {
        console.warn('[FORGOT-PW] Email send failed (non-fatal):', emailErr.message);
      }

      return res.status(200).json({ success: true, otpSent: true, message: 'If this email is registered, a reset code has been sent.' }); 
    } catch (error) {
      console.error('[FORGOT-PW] forgotPassword error:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  /*
    Function Name: resetPassword

    LAYMAN (Tropang Ex):
    Pinapalit ang password gamit ang code na natanggap sa email. Tina-tsek kung tama at hindi pa
    expired/nagamit ang code, at kung iba sa lumang password. Pag-success, may security receipt email.

    TECHNICAL:
    Public. M8 password-strength check. Resolves account (users → approved issuers). Validates the OTP
    (matches, unused, not expired), rejects reuse of the same password (bcrypt.compare), hashes + saves
    the new one, and clears the OTP + M5 rate-limit counters. Sends a fire-and-forget "password changed"
    receipt (routed by account type). Known states → 400.

    PARAMS: req (req.body { email, otp, newPassword }), res.
    RETURNS: 200 { success, message } | 400 (missing fields / weak / invalid|used|expired OTP / same
    password / no account) | 500 via sendServerError.

    STEPS
      Step 1 — Require fields; M8 strength check.
      Step 2 — Resolve account; validate OTP (match/unused/not-expired).
      Step 3 — Reject same-as-current; bcrypt.hash; updateUser (clear OTP + counters).
      Step 4 — Fire-and-forget security-receipt email.
  */
  resetPassword: async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
      }

      // M8 (Phase 5 hardening): enforce the full password-strength policy (replaces the old length-6 check).
      const pwCheck = validatePasswordStrength(newPassword);
      if (!pwCheck.ok) {
        return res.status(400).json({ success: false, message: pwCheck.message });
      }

      // Look up account by email — check users first, then approved issuers only.
      // M11: env-driven so a CouchDB password rotation takes effect everywhere, not just in
      // couchDB_service.js. The literal remains only as the local-dev default.
      const nano = require('nano')(process.env.COUCHDB_URL || 'http://admin:adminpw@localhost:5985');
      const usersDb = nano.use('users');

      let foundDoc = null;

      const userResult = await usersDb.find({ selector: { email: email.toLowerCase().trim() }, limit: 1 });
      if (userResult.docs && userResult.docs.length > 0) {
        foundDoc = userResult.docs[0];
      } else {
        const issuerDoc = await couchDB.getApprovedIssuer(email.toLowerCase().trim());
        if (issuerDoc) foundDoc = issuerDoc;
      }

      if (!foundDoc) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
      }

      const user = foundDoc;

      // Validate OTP
      // Order matters: used/expired are checked BEFORE the code compare so a stale entry does not
      // consume a failure slot, and so the failure budget only ever counts real wrong guesses.
      if (!user.resetOtp) {
        return res.status(400).json({ success: false, message: 'Invalid reset code.' });
      }
      if (user.resetOtpUsed) {
        return res.status(400).json({ success: false, message: 'Reset code has already been used.' });
      }
      if (!user.resetOtpExpiresAt || new Date() > new Date(user.resetOtpExpiresAt)) {
        return res.status(400).json({ success: false, message: 'Reset code has expired. Please request a new one.' });
      }
      if (!otpEquals(user.resetOtp, otp)) {
        /* Wrong-guess budget. Previously a failed attempt wrote NOTHING, so the code stayed valid
           for its full 10 minutes against unlimited guesses — and this is the flow that ends in a
           password change. The per-IP authLimiter (10 per 15 min) was the only brake, and it is
           per-IP, not per-account. On the 5th wrong guess the code is invalidated; the user
           requests a new one (subject to the existing 3-sends-per-10-minutes cap). */
        const failures = (user.resetOtpFailures || 0) + 1;
        if (failures >= OTP_MAX_FAILURES) {
          await couchDB.updateUser(user._id, {
            resetOtp: null,
            resetOtpExpiresAt: null,
            resetOtpFailures: 0
          });
          return res.status(429).json({
            success: false,
            message: 'Too many incorrect codes. Please request a new reset code.'
          });
        }
        await couchDB.updateUser(user._id, { resetOtpFailures: failures });
        return res.status(400).json({ success: false, message: 'Invalid reset code.' });
      }

      // Hash new password
      const bcrypt = require('bcryptjs');
      const isSamePassword = await bcrypt.compare(newPassword, user.password || '');
      if (isSamePassword) {
        return res.status(400).json({ success: false, message: 'New password must be different from your current password.' });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user doc — clear OTP + rate-limit counters so a successful reset starts fresh (M5).
      await couchDB.updateUser(user._id, {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpiresAt: null,
        resetOtpUsed: true,
        resetOtpAttempts: 0,
        resetOtpAttemptsAt: null,
        resetOtpFailures: 0
      });

      // F28: password-change security receipt (best-effort, non-fatal).
      // G3: fire-and-forget so the reset responds immediately (this is a notification,
      // not the OTP itself — the reset CODE email above stays synchronous).
      // Route by account type: holders → real inbox; issuer/admin (test) → central.
      const acctIsTest = ['issuer', 'admin'].includes(String(user.role || '').toLowerCase()) || String(user._id || '').startsWith('issuer_');
      if (user.email) {
        mailerService.sendMailFireAndForget({
          to: user.email,
          realRecipient: !acctIsTest,
          subject: 'Your ChainCert Password Was Changed',
          html: mailerService.renderEmail({
            heading: 'Password Changed',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Hi,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">The password for your ChainCert account (<strong>${user.email}</strong>) was just <strong>reset</strong>. If this was you, no action is needed.</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">If you did <strong>not</strong> request this, please contact the ChainCert administration team immediately.</p>`
          }),
          text: `The password for your ChainCert account (${user.email}) was just reset. If this was not you, contact the ChainCert administration team immediately.`
        }, '[resetPassword]');
      }

      return res.status(200).json({ success: true, message: 'Password reset successful. You may now log in.' });
    } catch (error) {
      console.error('[FORGOT-PW] resetPassword error:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  // ============================================================
  // PUBLIC SHARE LINK (no recipient, no OTP) 
  // ============================================================

  /*
    Function Name: generatePublicShareLink

    LAYMAN (Tropang Ex):
    Gumagawa (o ginagamit ulit) ng IISANG permanenteng PUBLIC link ng profile — walang recipient,
    walang OTP, walang expiry. Kahit ilang beses i-click o mag-PDF-export, IISA lang ang link (para
    hindi dumami ang "pinto" sa profile mo). Ito ang ginagamit ng View Profile sa PDF.

    TECHNICAL:
    Auth required. Reuses the newest active public (no-recipient) link via
    couchDB.findActivePublicShareLink (returns reused:true); otherwise mints one with a
    crypto.randomBytes token and NO expiry. Applies to holders AND issuers (kills PDF-export sprawl).
    Specific-recipient/OTP links are a separate path and unaffected.

    PARAMS: req (req.user, req.body { source?, description? }), res.
    RETURNS: 200 { success, message, shareUrl, token, reused? } | 401 unauth | 500 via sendServerError.
  */
  generatePublicShareLink: async (req, res) => {
    try {
      const { source, description } = req.body;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      // A user's public profile is a SINGLE PERMANENT link (holder OR issuer). Reuse the existing
      // active public (no-recipient) link instead of minting a new token on every Share click /
      // PDF export — this kills link sprawl (one revocable "public door" per user) and keeps the
      // privacy model consistent. Specific-recipient / OTP links are separate and unaffected.
      const existing = await couchDB.findActivePublicShareLink(userId);
      if (existing?.token) {
        return res.status(200).json({
          success: true,
          message: 'Public share link ready.',
          shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/${existing.token}`,
          token: existing.token,
          reused: true
        });
      }

      // No active public link yet — create one. Public links are permanent (no expiry); duration
      // only ever applied to specific-recipient links, which go through a different path.
      const token = crypto.randomBytes(24).toString('hex');

      await couchDB.createProfileShareLink(userId, token, null, null, {
        source,
        description
      });

      const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/${token}`;

      return res.status(200).json({
        success: true,
        message: 'Public share link generated.',
        shareUrl,
        token
      });
    } catch (error) {
      console.error('[SHARE] generatePublicShareLink error:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  /*
    Function Name: revokeShareLink
    LAYMAN (Tropang Ex): Kina-cancel ang isang share link para hindi na ma-access (kahit public o specific).
    TECHNICAL: Auth required — couchDB.revokeProfileShareLink(token, userId) (ownership enforced in service).
    PARAMS: req (req.params.token, req.user), res. RETURNS: 200 { success, message } | 401 | 500.
  */
  revokeShareLink: async (req, res) => {
    try {
      const { token } = req.params;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      await couchDB.revokeProfileShareLink(token, userId);

      return res.status(200).json({ success: true, message: 'Share link revoked.' });
    } catch (error) {
      console.error('[SHARE] revokeShareLink error:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  // ============================================================
  // GET MY SHARE LINKS 
  // ============================================================

  /*
    Function Name: getMyShareLinks
    LAYMAN (Tropang Ex): Listahan ng lahat ng share links ng nakalogin na user (para makita/ma-revoke).
    TECHNICAL: Auth required — couchDB.getShareLinksByUserId(userId). Also used by the PDF export to
    count/locate prior links.
    PARAMS: req (req.user), res. RETURNS: 200 { success, links:[] } | 401 | 500.
  */
  getMyShareLinks: async (req, res) => {
    try {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
      const links = await couchDB.getShareLinksByUserId(userId);
      return res.status(200).json({ success: true, links });
    } catch (error) {
      console.error('[SHARE] getMyShareLinks error:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  /*
    Function Name: uploadProfilePicture
    LAYMAN (Tropang Ex): Nag-a-upload ng profile picture. Tina-tsek muna ang TOTOONG type ng file
    (PNG/JPG lang) bago i-save bilang data URI sa user doc.
    TECHNICAL: M7 magic-number validation (validateUploadedFile ['png','jpg']) on the real bytes — the
    client mimetype is ignored; the DETECTED type builds the base64 data URI saved via couchDB.updateUser.
    PARAMS: req (req.body.userId, req.file via multer memoryStorage), res.
    RETURNS: 200 { success, message, imageUrl } | 400 (no file / no userId / bad type) | 500.
  */
  uploadProfilePicture: async (req, res) => {
    try {
      const authedId = req.user?.id || req.user?._id;
      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      const file = req.file;

      // Identity from the token, not the body. This was previously unauthenticated with a
      // body-supplied userId, so anyone could overwrite any account's avatar — including an
      // institution's public issuer profile picture. Admin may still target another account.
      const userId = (req.user.role === 'admin' && req.body.userId)
        ? req.body.userId
        : authedId;

      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }

      const fileBuffer = file.buffer;

      // M7 (Phase 5 hardening): verify the file's REAL type by magic number — never trust the
      // client-supplied mimetype/extension. Only real PNG/JPG images are accepted for avatars.
      const check = validateUploadedFile(fileBuffer, ['png', 'jpg']);
      if (!check.ok) {
        return res.status(400).json({ success: false, message: check.message });
      }
      // Use the DETECTED type for the data URI, not the (untrusted) client mimetype.
      const fileType = check.type === 'jpg' ? 'image/jpeg' : 'image/png';
      const base64Image = `data:${fileType};base64,${fileBuffer.toString('base64')}`;

      await couchDB.updateUser(userId, {
        profilePicture: base64Image
      });

      return res.status(200).json({
        success: true,
        message: 'Profile picture updated!',
        imageUrl: base64Image
      });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  }
};

module.exports = accountController;
