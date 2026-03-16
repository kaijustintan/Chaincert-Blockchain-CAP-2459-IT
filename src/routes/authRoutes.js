const express = require('express');
const multer = require('multer');

const authController = require('../controllers/authController');
const accountController = require('../controllers/accountController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/auth/register - Register a new user account.
router.post('/register', authController.register);

// POST /api/auth/login - Authenticate a user account.
router.post('/login', authController.login);

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

// POST /api/auth/profile-share/:token/request-otp - Validate email + send OTP (public, no auth). - polo
router.post('/profile-share/:token/request-otp', accountController.requestOTP);

// POST /api/auth/profile-share/:token/verify-otp - Verify OTP + return profile data (public, no auth). - polo
router.post('/profile-share/:token/verify-otp', accountController.verifyOTP);

// DELETE /api/auth/profile-share/:token/revoke - Revoke a share link (auth required). 
router.delete('/profile-share/:token/revoke', accountController.revokeShareLink);

// POST /api/auth/profile-share/generate-public - Generate a public share link (no recipient).
router.post('/profile-share/generate-public', accountController.generatePublicShareLink);

// POST /api/auth/forgot-password - Request password reset OTP. 
router.post('/forgot-password', accountController.forgotPassword);

// POST /api/auth/reset-password - Verify OTP and set new password. 
router.post('/reset-password', accountController.resetPassword);

module.exports = router;
