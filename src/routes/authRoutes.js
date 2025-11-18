// authRoutes.js - Express routes for authentication endpoints
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const issuerCredentialController = require('../controllers/issuerCredentialController');


// ========== EXISTING ROUTES ==========
// POST /api/auth/register - Register a new user
router.post('/register', authController.register);


// POST /api/auth/login - Login user
router.post('/login', authController.login);


// GET /api/auth/user/:username - Get user information
router.get('/user/:id', authController.getUserInfo);


// GET /api/auth/users - Get all users
router.get('/users', authController.getAllUsers);


// ========== ADD THESE TWO LINES ==========
router.post('/update-profile', authController.updateProfile);
router.post('/change-password', authController.changePassword);


// ========== ADD THIS NEW LINE ==========
router.post('/upload-pfp', upload.single('profilePicture'), authController.uploadProfilePicture);


// ========== NEW ISSUER ROUTES ==========
// POST /api/auth/register-issuer - Register a new issuer
router.post('/register-issuer', upload.single('documents'), authController.registerIssuer);


// POST /api/auth/login-issuer - Login issuer
router.post('/login-issuer', authController.loginIssuer);


// GET /api/auth/pending-issuers - Get pending issuer registrations (Admin)
router.get('/pending-issuers', authController.getPendingIssuers);


// POST /api/auth/approve-issuer/:issuerId - Approve issuer (Admin)
router.post('/approve-issuer/:issuerId', authController.approveIssuer);


// POST /api/auth/reject-issuer/:issuerId - Reject issuer (Admin)
router.post('/reject-issuer/:issuerId', authController.rejectIssuer);


// ========== CREDENTIAL ROUTES ==========
// ✅ REMOVED: This line was causing the issue!
// ⚠️ REASON: It was NOT passing getContractAndGateway function - use the one in sdk-server-fixed.js instead!


// ✅ NEW - Issue credential to holder (Step 2)
// NOTE: This is registered in sdk-server-fixed.js as app.post('/api/credentials/:credentialId/issue')
// But you can also add it here if you want it under /api/auth namespace:
// router.post('/issuer/credentials/:credentialId/issue', issuerCredentialController.issueCredential);


// ✅ NEW - Get issuer credentials
router.get('/issuer/:issuerId/credentials', authController.getIssuerCredentials);




module.exports = router;
