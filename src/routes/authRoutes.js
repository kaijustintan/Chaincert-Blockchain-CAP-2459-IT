const express = require('express');
const multer = require('multer');

const authController = require('../controllers/authController');
const accountController = require('../controllers/accountController');

const router = express.Router();
// M7 (Phase 5 hardening): cap upload size at 5 MB to prevent memory/disk-exhaustion DoS.
// (Actual file-type validation by magic number happens in the controller via securityHelpers.)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/auth/register - Register a new user account.
router.post('/register', authController.register);

// POST /api/auth/check-email - Lightweight email-availability probe for the
// registration wizard's Step 1 -> 2 gate. Returns { available }.
router.post('/check-email', authController.checkEmail);

// POST /api/auth/signup/request-otp - Email an OTP to verify a new account's email (public, no auth).
router.post('/signup/request-otp', authController.requestSignupOtp);

// POST /api/auth/signup/confirm-otp - Confirm the OTP -> return a signup_email_proof token (public).
router.post('/signup/confirm-otp', authController.confirmSignupOtp);

// POST /api/auth/login - Unified login: resolves user-vs-issuer server-side in ONE request
// (Bonus, Phase 5 Tier 2). The legacy user-only handler stays available via authController.login,
// and /api/issuer/login remains as a backward-compatible alias.
router.post('/login', authController.unifiedLogin);

// GET /api/auth/user/:id - Fetch user profile details by user id.
router.get('/user/:id', accountController.getUserInfo);

// GET /api/auth/users - List users.
router.get('/users', accountController.getAllUsers);

// POST /api/auth/update-profile - Update user profile fields.
router.post('/update-profile', accountController.updateProfile);

// POST /api/auth/change-password - Change account password.
router.post('/change-password', authController.changePassword);

// POST /api/auth/upload-pfp - Upload/update profile picture.
router.post('/upload-pfp', upload.single('profilePicture'), accountController.uploadProfilePicture);

// POST /api/auth/profile-share/generate - Generate a share link for user profile. - polo
router.post('/profile-share/generate', accountController.generateShareLink);

// GET /api/auth/profile-share/:token/info - Check token validity (public, no auth). - polo
router.get('/profile-share/:token/info', accountController.getShareLinkInfo);

// POST /api/auth/profile-share/:token/record-view - Record a view on a public share link (no auth required).
router.post('/profile-share/:token/record-view', accountController.recordView);

// POST /api/auth/profile-share/:token/request-otp - Validate email + send OTP (public, no auth). - polo
router.post('/profile-share/:token/request-otp', accountController.requestOTP);

// POST /api/auth/profile-share/:token/verify-otp - Verify OTP + return profile data (public, no auth). - polo
router.post('/profile-share/:token/verify-otp', accountController.verifyOTP);

// DELETE /api/auth/profile-share/:token/revoke - Revoke a share link (auth required). 
router.delete('/profile-share/:token/revoke', accountController.revokeShareLink);

// POST /api/auth/profile-share/generate-public - Generate a public share link (no recipient).
router.post('/profile-share/generate-public', accountController.generatePublicShareLink);

// GET /api/auth/profile-share/my-links - Get all share links for logged-in user.
router.get('/profile-share/my-links', accountController.getMyShareLinks);

// POST /api/auth/forgot-password - Request password reset OTP. 
router.post('/forgot-password', accountController.forgotPassword);

// POST /api/auth/reset-password - Verify OTP and set new password. 
router.post('/reset-password', accountController.resetPassword);

module.exports = router;
