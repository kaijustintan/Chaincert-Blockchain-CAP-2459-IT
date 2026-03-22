const couchDB = require('../couchDB_service');
const nodemailer = require('nodemailer'); // - polo
const crypto = require('crypto'); // - polo

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
      return res.status(500).json({
        success: false,
        message: `User lookup error: ${error.message}`
      });
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
      return res.status(500).json({
        success: false,
        message: `Retrieve users error: ${error.message}`
      });
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
      return res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: error.message });
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

      return res.status(200).json({ 
        success: true, 
        valid: true,
        recipientEmail: doc.recipientEmail || null, // null means public link
        userId: doc.userId // needed for public link profile load
      });
    } catch (error) {
      console.error('[SHARE] getShareLinkInfo error:', error);
      return res.status(500).json({ success: false, message: error.message });
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

     // Send OTP email via Ethereal (test SMTP) - polo
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      const info = await transporter.sendMail({
        from: '"ChainCert" <noreply@chaincert.com>',
        to: email,
        subject: 'Your ChainCert Profile Access Code',
        text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`
      });

      console.log('[OTP] Preview URL:', nodemailer.getTestMessageUrl(info)); // - polo

      return res.status(200).json({ success: true, message: 'Verification code sent.' });
    } catch (error) {
      console.error('[SHARE] requestOTP error:', error);
      return res.status(500).json({ success: false, message: error.message });
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

      // Fetch the user's profile data to return - polo
      const user = await couchDB.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Verified.',
        userId,
        profile: {
          id: user._id,
          name: user.username,
          email: user.email,
          summary: user.summary || '',
          profilePicture: user.profilePicture || null,
          isPublic: user.isPublic
        }
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

      // Look up user by email
      const nano = require('nano')('http://admin:adminpw@localhost:5985');
      const usersDb = nano.use('users');
      const result = await usersDb.find({ selector: { email: email.toLowerCase().trim() }, limit: 1 });

      // Always return success to prevent email enumeration 
      // (don't reveal if email exists or not)
      if (!result.docs || result.docs.length === 0) {
        return res.status(200).json({ success: true, otpSent: false, message: 'If this email is registered, a reset code has been sent.' }); 
      }

      const user = result.docs[0];

      // Generate 6-digit OTP 
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Save OTP to user doc 
      await couchDB.updateUser(user._id, {
        resetOtp: otp,
        resetOtpExpiresAt: otpExpiresAt,
        resetOtpUsed: false
      });

      // Send OTP email via Ethereal
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      const info = await transporter.sendMail({
        from: '"ChainCert" <noreply@chaincert.com>',
        to: email,
        subject: 'ChainCert Password Reset Code',
        text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`
      });

      console.log('[FORGOT-PW] OTP Preview URL:', nodemailer.getTestMessageUrl(info)); // - polo

      return res.status(200).json({ success: true, otpSent: true, message: 'If this email is registered, a reset code has been sent.' }); 
    } catch (error) {
      console.error('[FORGOT-PW] forgotPassword error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      }

      // Look up user
      const nano = require('nano')('http://admin:adminpw@localhost:5985');
      const usersDb = nano.use('users');
      const result = await usersDb.find({ selector: { email: email.toLowerCase().trim() }, limit: 1 });

      if (!result.docs || result.docs.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
      }

      const user = result.docs[0];

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

      // Update user doc
      await couchDB.updateUser(user._id, {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpiresAt: null,
        resetOtpUsed: true
      });

      return res.status(200).json({ success: true, message: 'Password reset successful. You may now log in.' });
    } catch (error) {
      console.error('[FORGOT-PW] resetPassword error:', error);
      return res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  forceExpireShareLink: async (req, res) => {
    try {
      const { token } = req.params;
      if (!token) return res.status(400).json({ success: false, message: 'Token is required' });
      await couchDB.forceExpireShareLink(token);
      return res.status(200).json({ success: true, message: 'Share link expired successfully.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: error.message });
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
      const fileType = file.mimetype;
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
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = accountController;
