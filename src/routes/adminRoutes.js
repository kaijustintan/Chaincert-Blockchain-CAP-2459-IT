const express = require('express');

const adminIssuerController = require('../controllers/adminIssuerController');
const adminAuditController = require('../controllers/adminAuditController');
const rootAuthorityController = require('../controllers/rootAuthorityController');
const adminDashboardController = require('../controllers/adminDashboardController');

const router = express.Router();

// =========================
// ISSUER LISTING / FILTERS
// =========================

// GET /api/admin/pending-issuers
router.get('/pending-issuers', adminIssuerController.getPendingIssuers);

// GET /api/admin/pending-issuers-admin-actionable
router.get('/pending-issuers-admin-actionable', adminIssuerController.getAdminActionablePendingIssuers);

// GET /api/admin/approved-issuers
router.get('/approved-issuers', adminIssuerController.getApprovedIssuers);

// GET /api/admin/rejected-issuers
router.get('/rejected-issuers', adminIssuerController.getRejectedIssuers);

// GET /api/admin/disabled-issuers
router.get('/disabled-issuers', adminIssuerController.getDisabledIssuers);

// GET /api/admin/pending-root-issuers
router.get('/pending-root-issuers', adminIssuerController.getPendingRootIssuers);

// GET /api/admin/pending-subordinate-issuers
router.get('/pending-subordinate-issuers', adminIssuerController.getPendingSubordinateIssuers);

// GET /api/admin/pending-subordinate-awaiting-root
router.get('/pending-subordinate-awaiting-root', adminIssuerController.getPendingSubordinateIssuersAwaitingRootApproval);

// GET /api/admin/pending-subordinate-root-approved
router.get('/pending-subordinate-root-approved', adminIssuerController.getPendingSubordinateIssuersRootApproved);

// =========================
// ROOT AUTHORITY SUBORDINATES
// =========================

// GET /api/admin/root/subordinates/pending
router.get('/root/subordinates/pending', rootAuthorityController.getPendingSubordinatesForRoot);

// GET /api/admin/root/subordinates/all
router.get('/root/subordinates/all', rootAuthorityController.getAllSubordinatesForRoot);

// GET /api/admin/root/subordinates/root-approved
router.get('/root/subordinates/root-approved', rootAuthorityController.getRootApprovedSubordinatesForRoot);

// GET /api/admin/root/subordinates/root-rejected
router.get('/root/subordinates/root-rejected', rootAuthorityController.getRootRejectedSubordinatesForRoot);

// GET /api/admin/root/subordinates/approved
router.get('/root/subordinates/approved', rootAuthorityController.getApprovedSubordinatesForRoot);

// GET /api/admin/root/subordinates/disabled
router.get('/root/subordinates/disabled', rootAuthorityController.getDisabledSubordinatesForRoot);

// =========================
// ADMIN ACTIONS ON ISSUERS / USERS
// =========================

// POST /api/admin/approve-issuer/:issuerId
router.post('/approve-issuer/:issuerId', (req, res) => {
  adminIssuerController.Approve_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/reject-issuer/:issuerId
router.post('/reject-issuer/:issuerId', (req, res) => {
  adminIssuerController.Reject_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/disable-issuer/:issuerId
router.post('/disable-issuer/:issuerId', (req, res) => {
  adminIssuerController.Disable_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/enable-issuer/:issuerId
router.post('/enable-issuer/:issuerId', (req, res) => {
  adminIssuerController.Enable_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/disable-user/:userId
router.post('/disable-user/:userId', (req, res) => {
  adminAuditController.Disable_User(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/enable-user/:userId
router.post('/enable-user/:userId', (req, res) => {
  adminAuditController.Enable_User(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// ROOT APPROVE / REJECT SUBORDINATE
// =========================

// POST /api/admin/root-approve-subordinate/:issuerId
router.post('/root-approve-subordinate/:issuerId', (req, res) => {
  rootAuthorityController.rootApproveSubordinateIssuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/root-reject-subordinate/:issuerId
router.post('/root-reject-subordinate/:issuerId', (req, res) => {
  rootAuthorityController.rootRejectSubordinateIssuer(req, res, req.app.locals.getContractAndGateway);
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
  adminAuditController.changeAdminPasswordSecure(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// STATUS LOGS
// =========================

// GET /api/admin/status-logs
router.get('/status-logs', (req, res) => {
  adminAuditController.getAllStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/issuers
router.get('/status-logs/issuers', (req, res) => {
  adminAuditController.getAllIssuerStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/users
router.get('/status-logs/users', (req, res) => {
  adminAuditController.getAllUserStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/issuer/:issuerEmail
router.get('/status-logs/issuer/:issuerEmail', (req, res) => {
  adminAuditController.getIssuerStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/user/:userEmail
router.get('/status-logs/user/:userEmail', (req, res) => {
  adminAuditController.getUserStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// Optional legacy aliases
router.get('/status-logs/issuers/:issuerEmail', (req, res) => {
  adminAuditController.getIssuerStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

router.get('/status-logs/users/:userEmail', (req, res) => {
  adminAuditController.getUserStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// ISSUER DECISION LOGS
// =========================

// GET /api/admin/issuer-decision-logs
router.get('/issuer-decision-logs', (req, res) => {
  adminAuditController.getAllIssuerDecisionLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/issuer-decision-logs/approved
router.get('/issuer-decision-logs/approved', (req, res) => {
  adminAuditController.getAllIssuerApprovalLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/issuer-decision-logs/rejected
router.get('/issuer-decision-logs/rejected', (req, res) => {
  adminAuditController.getAllIssuerRejectionLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/issuer-decision-logs/:issuerEmail
router.get('/issuer-decision-logs/:issuerEmail', (req, res) => {
  adminAuditController.getIssuerDecisionLogs(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// ROOT SUBORDINATE DECISION LOGS (ADMIN AUDIT)
// =========================

// GET /api/admin/root-subordinate-logs
router.get('/root-subordinate-logs', (req, res) => {
  adminAuditController.GetAllRootSubordinateLogs(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/admin/root-subordinate-logs/approved
router.get('/root-subordinate-logs/approved', (req, res) => {
  adminAuditController.GetAllRootSubordinateApprovalLogs(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/admin/root-subordinate-logs/rejected
router.get('/root-subordinate-logs/rejected', (req, res) => {
  adminAuditController.GetAllRootSubordinateRejectionLogs(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// =========================
// ROOT AUTHORITY BLOCKCHAIN LOGS
// =========================

// GET /api/admin/root/subordinate-logs
router.get('/root/subordinate-logs', (req, res) => {
  rootAuthorityController.GetRootSubordinateLogsByRootAuthority(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/admin/root/subordinate-logs/approved
router.get('/root/subordinate-logs/approved', (req, res) => {
  rootAuthorityController.GetRootSubordinateApprovalLogsByRootAuthority(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/admin/root/subordinate-logs/rejected
router.get('/root/subordinate-logs/rejected', (req, res) => {
  rootAuthorityController.GetRootSubordinateRejectionLogsByRootAuthority(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

module.exports = router;
