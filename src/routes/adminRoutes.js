const express = require('express');

const authController = require('../controllers/authController');
const adminDashboardController = require('../controllers/adminDashboardController');

const router = express.Router();

// =========================
// ISSUER LISTING / FILTERS
// =========================

// GET /api/admin/pending-issuers
router.get('/pending-issuers', authController.getPendingIssuers);

// GET /api/admin/pending-issuers-admin-actionable
router.get('/pending-issuers-admin-actionable', authController.getAdminActionablePendingIssuers);

// GET /api/admin/approved-issuers
router.get('/approved-issuers', authController.getApprovedIssuers);

// GET /api/admin/rejected-issuers
router.get('/rejected-issuers', authController.getRejectedIssuers);

// GET /api/admin/disabled-issuers
router.get('/disabled-issuers', authController.getDisabledIssuers);

// GET /api/admin/pending-root-issuers
router.get('/pending-root-issuers', authController.getPendingRootIssuers);

// GET /api/admin/pending-subordinate-issuers
router.get('/pending-subordinate-issuers', authController.getPendingSubordinateIssuers);

// GET /api/admin/pending-subordinate-awaiting-root
router.get('/pending-subordinate-awaiting-root', authController.getPendingSubordinateIssuersAwaitingRootApproval);

// GET /api/admin/pending-subordinate-root-approved
router.get('/pending-subordinate-root-approved', authController.getPendingSubordinateIssuersRootApproved);

// =========================
// ROOT AUTHORITY SUBORDINATES
// =========================

// GET /api/admin/root/subordinates/pending
router.get('/root/subordinates/pending', authController.getPendingSubordinatesForRoot);

// GET /api/admin/root/subordinates/all
router.get('/root/subordinates/all', authController.getAllSubordinatesForRoot);

// GET /api/admin/root/subordinates/root-approved
router.get('/root/subordinates/root-approved', authController.getRootApprovedSubordinatesForRoot);

// GET /api/admin/root/subordinates/root-rejected
router.get('/root/subordinates/root-rejected', authController.getRootRejectedSubordinatesForRoot);

// GET /api/admin/root/subordinates/approved
router.get('/root/subordinates/approved', authController.getApprovedSubordinatesForRoot);

// GET /api/admin/root/subordinates/disabled
router.get('/root/subordinates/disabled', authController.getDisabledSubordinatesForRoot);

// =========================
// ADMIN ACTIONS ON ISSUERS / USERS
// =========================

// POST /api/admin/approve-issuer/:issuerId
router.post('/approve-issuer/:issuerId', (req, res) => {
  authController.Approve_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/reject-issuer/:issuerId
router.post('/reject-issuer/:issuerId', (req, res) => {
  authController.Reject_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/disable-issuer/:issuerId
router.post('/disable-issuer/:issuerId', (req, res) => {
  authController.Disable_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/enable-issuer/:issuerId
router.post('/enable-issuer/:issuerId', (req, res) => {
  authController.Enable_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/disable-user/:userId
router.post('/disable-user/:userId', (req, res) => {
  authController.Disable_User(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/enable-user/:userId
router.post('/enable-user/:userId', (req, res) => {
  authController.Enable_User(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// ROOT APPROVE / REJECT SUBORDINATE
// =========================

// POST /api/admin/root-approve-subordinate/:issuerId
router.post('/root-approve-subordinate/:issuerId', (req, res) => {
  authController.rootApproveSubordinateIssuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/root-reject-subordinate/:issuerId
router.post('/root-reject-subordinate/:issuerId', (req, res) => {
  authController.rootRejectSubordinateIssuer(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// ADMIN DASHBOARD DATA
// =========================

// GET /api/admin/credentials/all
router.get('/credentials/all', adminDashboardController.getAllIssuerCredentialsAdminController);

// POST /api/admin/trigger-expiry-check
router.post('/trigger-expiry-check', (req, res) => {
  adminDashboardController.triggerExpiryCheck(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/change-password
router.post('/change-password', (req, res) => {
  authController.changeAdminPasswordSecure(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// STATUS LOGS
// =========================

// GET /api/admin/status-logs
router.get('/status-logs', (req, res) => {
  authController.getAllStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/issuers
router.get('/status-logs/issuers', (req, res) => {
  authController.getAllIssuerStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/users
router.get('/status-logs/users', (req, res) => {
  authController.getAllUserStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/issuer/:email
router.get('/status-logs/issuer/:email', (req, res) => {
  authController.getIssuerStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/user/:email
router.get('/status-logs/user/:email', (req, res) => {
  authController.getUserStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// Optional legacy aliases
router.get('/status-logs/issuers/:issuerEmail', (req, res) => {
  authController.getIssuerStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

router.get('/status-logs/users/:userEmail', (req, res) => {
  authController.getUserStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// ISSUER DECISION LOGS
// =========================

// GET /api/admin/issuer-decision-logs
router.get('/issuer-decision-logs', (req, res) => {
  authController.getAllIssuerDecisionLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/issuer-decision-logs/approved
router.get('/issuer-decision-logs/approved', (req, res) => {
  authController.getAllIssuerApprovalLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/issuer-decision-logs/rejected
router.get('/issuer-decision-logs/rejected', (req, res) => {
  authController.getAllIssuerRejectionLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/issuer-decision-logs/:issuerEmail
router.get('/issuer-decision-logs/:issuerEmail', (req, res) => {
  authController.getIssuerDecisionLogs(req, res, req.app.locals.getContractAndGateway);
});

module.exports = router;