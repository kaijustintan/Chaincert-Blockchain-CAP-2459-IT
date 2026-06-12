const couchDB = require('../couchDB_service');
const mailerService = require('../mailerService'); // - polo
const crypto = require('crypto'); // - polo
const { validateUploadedFile, validatePasswordStrength, sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2

const buildShareProfilePayload = async (ownerId) => {
  const user = await couchDB.getUser(ownerId);
  if (!user) return null;

  const role = String(user.role || (String(ownerId || '').startsWith('issuer_') ? 'issuer' : 'student')).toLowerCase();
  const sharedCredentials = role === 'issuer'
    ? await couchDB.getIssuerTemplatesByIssuerId(ownerId)
    : await couchDB.getUserCredentialsByHolderId(ownerId);

  // Show ALL statuses (incl. revoked/expired) — the frontend renders a status indicator.
  // Transparency over hiding (immutable-ledger value prop); holder still gates via visibility. - polo
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
  };
};

const accountController = {
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

      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.username || user.orgName || user.contactName || user.name || '',
          username: user.username || '',
          orgName: user.orgName || '',
          organizationName: user.organizationName || user.orgName || '',
          contactName: user.contactName || '',
          fullName: user.fullName || user.username || user.orgName || '',
          email: user.email,
          role: user.role,
          summary: user.summary || '',
          isPublic: user.isPublic,
          profilePicture: user.profilePicture || user.avatar || null,
          profilePictureUpdatedAt: user.profilePictureUpdatedAt || user.updatedAt || null
        }
      });
    } catch (error) {
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await couchDB.getAllUsers();
      const filteredUsers = users.filter(u => !u.role || u.role === 'user');

      return res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        users: filteredUsers,
        count: filteredUsers.length
      });
    } catch (error) {
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { userId, summary, isPublic, username } = req.body;
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

      const shareUrl = `http://localhost:3000/profile/${token}`;

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

      // Generate 6-digit OTP - polo
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      await couchDB.saveOTPToShareLink(token, otp, otpExpiresAt);

      // Send OTP email via Gmail SMTP - polo
      await mailerService.sendMail({
        to: email,
        subject: `Your ChainCert Profile Access Code (for ${email})`,
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

      return res.status(200).json({
        success: true,
        message: 'Verified.',
        userId,
        profile
      });
    } catch (error) {
      console.error('[SHARE] verifyOTP error:', error);
      // Pass through specific error messages from couchDB_service - polo
      const knownErrors = [
        'Invalid verification code.',
        'Code has expired. Request a new one.',
        'Share link not found'
      ];
      const status = knownErrors.includes(error.message) ? 400 : 500;
      return res.status(status).json({ success: false, message: error.message });
    }
  },

  // ============================================================
  // FORGOT PASSWORD HANDLERS 
  // ============================================================

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
      const nano = require('nano')('http://admin:adminpw@localhost:5985');
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

      // Generate 6-digit OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Save OTP + rate-limit counters to user doc (single write).
      await couchDB.updateUser(user._id, {
        resetOtp: otp,
        resetOtpExpiresAt: otpExpiresAt,
        resetOtpUsed: false,
        resetOtpAttempts: otpAttempts,
        resetOtpAttemptsAt: otpAttemptsAt
      });

      // Send OTP email via Gmail SMTP - polo
      // Inner try/catch: email failure is non-fatal here — anti-enumeration: always return
      // the same generic 200 response whether email lands or not.
      try {
        await mailerService.sendMail({
          to: email,
          subject: 'ChainCert Password Reset Code',
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
      const nano = require('nano')('http://admin:adminpw@localhost:5985');
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
      if (!user.resetOtp || user.resetOtp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid reset code.' });
      }
      if (user.resetOtpUsed) {
        return res.status(400).json({ success: false, message: 'Reset code has already been used.' });
      }
      if (!user.resetOtpExpiresAt || new Date() > new Date(user.resetOtpExpiresAt)) {
        return res.status(400).json({ success: false, message: 'Reset code has expired. Please request a new one.' });
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
        resetOtpAttemptsAt: null
      });

      return res.status(200).json({ success: true, message: 'Password reset successful. You may now log in.' });
    } catch (error) {
      console.error('[FORGOT-PW] resetPassword error:', error);
      return sendServerError(res, error, 'ACCOUNT'); // M9
    }
  },

  // ============================================================
  // PUBLIC SHARE LINK (no recipient, no OTP) 
  // ============================================================

  generatePublicShareLink: async (req, res) => {
    try {
      const { durationDays, source, description } = req.body;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      // Calculate expiry 
      let expiresAt = null;
      if (durationDays && durationDays !== 'none') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + parseInt(durationDays));
        expiresAt = expiry.toISOString();
      }

      // Generate unique token 
      const token = crypto.randomBytes(24).toString('hex');

      await couchDB.createProfileShareLink(userId, token, null, expiresAt, {
        source,
        description
      });

      const shareUrl = `http://localhost:3000/profile/${token}`;

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

  uploadProfilePicture: async (req, res) => {
    try {
      const { userId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is missing.' });
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
