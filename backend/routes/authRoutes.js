// authRoutes.js - Express routes for authentication endpoints
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ========== EXISTING ROUTES ==========
// POST /api/auth/register - Register a new user
router.post('/register', authController.register);

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// GET /api/auth/user/:username - Get user information
router.get('/user/:id', authController.getUserInfo);   // Edited this for Profile Summary Display - olop

// GET /api/auth/users - Get all users
router.get('/users', authController.getAllUsers);

// ========== NEW ISSUER ROUTES ==========
// POST /api/auth/register-issuer - Register a new issuer
router.post('/register-issuer', authController.registerIssuer);

// POST /api/auth/login-issuer - Login issuer
router.post('/login-issuer', authController.loginIssuer);

// GET /api/auth/pending-issuers - Get pending issuer registrations (Admin)
router.get('/pending-issuers', authController.getPendingIssuers);

// POST /api/auth/approve-issuer/:issuerId - Approve issuer (Admin)
router.post('/approve-issuer/:issuerId', authController.approveIssuer);

// POST /api/auth/reject-issuer/:issuerId - Reject issuer (Admin)
router.post('/reject-issuer/:issuerId', authController.rejectIssuer);

// POST /api/auth/change-password - Change user password (NEWLY ADDED - OLOPS)
router.post('/change-password', authController.changePassword);

// POST /api/auth/update-profile - Update user profile Summary (NEWLY ADDED - OLOPS)
router.post('/update-profile', authController.updateProfile);

module.exports = router;
