const express = require('express');
const multer = require('multer');

const authController = require('../controllers/authController');
const accountController = require('../controllers/accountController');
const { requireAuth, requireAdmin, createRateLimiter } = require('../securityHelpers');

const router = express.Router();

// M5: the share-link OTP routes carry a :token segment in the MIDDLE of the path, so they cannot
// be covered by the app.use('/literal/prefix', limiter) mounts in sdk-server-fixed.js. They get a
// per-route limiter here instead. This flow needed one most of all: unlike the other three OTP
// flows it has NO per-account send throttle — requestOTP regenerates a code on every call — so
// before this it was completely unbounded from both directions.
const shareOtpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many verification-code requests from this IP. Please wait a few minutes and try again.'
});

// ==========================================================================================
// M2 — AUTH ON THIS ROUTER IS PER-ROUTE, NOT AT THE MOUNT.
// ------------------------------------------------------------------------------------------
// Unlike issuerRoutes/credentialRoutes, /api/auth cannot take a blanket router.use(requireAuth):
// login, register, signup-OTP, forgot/reset-password and the public share-link endpoints must all
// work with no token, and they are interleaved with the private ones. So each route that needs a
// guard carries it explicitly.
//
// NOTE for anyone adding a route here: the default on THIS router is OPEN. Decide deliberately,
// and add requireAuth/requireAdmin unless the endpoint is genuinely public.
// ==========================================================================================
// M7 (Phase 5 hardening): cap upload size at 5 MB to prevent memory/disk-exhaustion DoS.
// (Actual file-type validation by magic number happens in the controller via securityHelpers.)
// files:1 / parts:5 added in the upload-limits pass — this endpoint takes exactly ONE avatar plus
// a couple of text fields, so anything beyond that is abuse. Unlike the issuer route this one is
// single(), which already rejects extra files, but the explicit caps make the intent enforceable
// rather than incidental.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, parts: 5 }
});

// Converts multer's MulterError into an actionable 4xx instead of a generic 500 from the M9
// handler. Mirrors the same helper in issuerRoutes.js.
const handleUpload = (mw) => (req, res, next) => mw(req, res, (err) => {
  if (err && err instanceof multer.MulterError) {
    const status = (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT') ? 413 : 400;
    return res.status(status).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'That image is too large. Profile pictures must be 5 MB or less.'
        : 'Upload rejected.'
    });
  }
  if (err) return next(err);
  next();
});

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
// DELIBERATELY PUBLIC. profilePreview.js calls this with NO token for two public flows: the
// share-link profile fallback (:199) and the public issuer directory's ?issuerId= view (:228).
// Guarding it would make the public issuer directory a dead end. Confidentiality is handled
// INSIDE the controller instead, which redacts email and other private fields for non-owners.
router.get('/user/:id', accountController.getUserInfo);

// GET /api/auth/users - List users. ADMIN ONLY.
// This returned RAW CouchDB user documents to anyone, with no auth and no field projection —
// including the bcrypt password hash and any live resetOtp/resetOtpExpiresAt. That gave a complete
// unauthenticated takeover chain: POST /forgot-password for a victim, read their OTP straight out
// of this response, then POST /reset-password. Only adminDashboard.js:966 consumes it.
router.get('/users', requireAdmin, accountController.getAllUsers);

// POST /api/auth/update-profile - Update user profile fields.
// Was unauthenticated with a body-supplied userId: anyone could rename any user or issuer, rewrite
// their summary, or flip a private profile to public.
router.post('/update-profile', requireAuth, accountController.updateProfile);

// POST /api/auth/change-password - Change account password.
// Was unauthenticated AND unthrottled, trusting req.body.email. Its 404-vs-401 responses formed a
// clean account-enumeration oracle and an unlimited password-guessing endpoint, which defeated the
// M4 uniform-response work and the M5 limiter on /login (an attacker just used this route instead).
router.post('/change-password', requireAuth, authController.changePassword);

// POST /api/auth/upload-pfp - Upload/update profile picture.
// Was unauthenticated with a body-supplied userId: a 5 MB write to any account, including
// defacing an institution's public issuer profile.
router.post('/upload-pfp', requireAuth, handleUpload(upload.single('profilePicture')), accountController.uploadProfilePicture);

// POST /api/auth/profile-share/generate - Generate a share link for user profile. - polo
router.post('/profile-share/generate', requireAuth, accountController.generateShareLink);

// GET /api/auth/profile-share/:token/info - Check token validity (public, no auth). - polo
router.get('/profile-share/:token/info', accountController.getShareLinkInfo);

// POST /api/auth/profile-share/:token/record-view - Record a view on a public share link (no auth required).
router.post('/profile-share/:token/record-view', accountController.recordView);

// POST /api/auth/profile-share/:token/request-otp - Validate email + send OTP (public, no auth). - polo
router.post('/profile-share/:token/request-otp', shareOtpLimiter, accountController.requestOTP);

// POST /api/auth/profile-share/:token/verify-otp - Verify OTP + return profile data (public, no auth). - polo
router.post('/profile-share/:token/verify-otp', shareOtpLimiter, accountController.verifyOTP);

// DELETE /api/auth/profile-share/:token/revoke - Revoke a share link (auth required).
// The comment already said "auth required"; nothing enforced it until now.
router.delete('/profile-share/:token/revoke', requireAuth, accountController.revokeShareLink);

// POST /api/auth/profile-share/generate-public - Generate a public share link (no recipient).
router.post('/profile-share/generate-public', requireAuth, accountController.generatePublicShareLink);

// GET /api/auth/profile-share/my-links - Get all share links for logged-in user.
router.get('/profile-share/my-links', requireAuth, accountController.getMyShareLinks);

// POST /api/auth/forgot-password - Request password reset OTP. 
router.post('/forgot-password', accountController.forgotPassword);

// POST /api/auth/reset-password - Verify OTP and set new password. 
router.post('/reset-password', accountController.resetPassword);

module.exports = router;
