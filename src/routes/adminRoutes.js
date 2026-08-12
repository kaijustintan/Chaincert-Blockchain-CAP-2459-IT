const express = require('express');

const adminIssuerController = require('../controllers/adminIssuerController');
const adminAuditController = require('../controllers/adminAuditController');
const rootAuthorityController = require('../controllers/rootAuthorityController');
const adminDashboardController = require('../controllers/adminDashboardController');

// ==========================================================================================
// M2 (Phase 5 hardening): admin-only role guard.
// The /api/admin mount already enforces requireAuth (a valid token), so req.user is present here.
// This adds the role check on top, applied to the admin-only routes below. It is intentionally
// NOT applied to the root-authority routes (those require role 'issuer' and are checked inside
// rootAuthorityController) — this admin router serves both audiences, so the guard is per-route,
// not blanket. Previously these listing/data endpoints had NO role check at all, so any logged-in
// user (even a student) could read the entire issuer pipeline and audit logs.
//
// requireAdmin used to be declared locally in this file, duplicating the identical rule in
// sdk-server-fixed.js. Both copies now come from securityHelpers so they cannot drift.
// (The old local copy said 'Forbidden: admin access required.'; the shared one says
// 'Forbidden: insufficient privileges.' — no frontend matches on either string.)
// ==========================================================================================
const { requireAdmin } = require('../securityHelpers');

const router = express.Router();

// =========================
// ISSUER LISTING / FILTERS  (admin-only)
// =========================

// GET /api/admin/pending-issuers
router.get('/pending-issuers', requireAdmin, adminIssuerController.getPendingIssuers);

// GET /api/admin/pending-issuers-admin-actionable
router.get('/pending-issuers-admin-actionable', requireAdmin, adminIssuerController.getAdminActionablePendingIssuers);

// GET /api/admin/approved-issuers
router.get('/approved-issuers', requireAdmin, adminIssuerController.getApprovedIssuers);

// GET /api/admin/rejected-issuers
router.get('/rejected-issuers', requireAdmin, adminIssuerController.getRejectedIssuers);

// GET /api/admin/disabled-issuers
router.get('/disabled-issuers', requireAdmin, adminIssuerController.getDisabledIssuers);

// GET /api/admin/pending-root-issuers
router.get('/pending-root-issuers', requireAdmin, adminIssuerController.getPendingRootIssuers);

// GET /api/admin/pending-subordinate-issuers
router.get('/pending-subordinate-issuers', requireAdmin, adminIssuerController.getPendingSubordinateIssuers);

// GET /api/admin/pending-subordinate-awaiting-root
router.get('/pending-subordinate-awaiting-root', requireAdmin, adminIssuerController.getPendingSubordinateIssuersAwaitingRootApproval);

// GET /api/admin/pending-subordinate-root-approved
router.get('/pending-subordinate-root-approved', requireAdmin, adminIssuerController.getPendingSubordinateIssuersRootApproved);

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
// Every route in this block now carries requireAdmin at the ROUTE level. Most of these handlers
// already do their own `req.user.role !== 'admin'` check inside the controller
// (adminIssuerController.js:381/531/674/827, adminAuditController.js:328), so for those this is
// defense in depth, not a fix — but relying on ~40 handlers to each remember the check is exactly
// how trigger-expiry-check below ended up with no check at all. The guard belongs on the route.

/* NOTE ON `return` IN EVERY HANDLER BELOW.
   Each wrapper RETURNS the controller's promise. Express 5 auto-forwards a rejected promise to the
   error middleware, but only if the promise actually reaches Express — a brace body that calls the
   controller and returns undefined discards it.

   Before this, all 29 handlers in this file dropped their promise (every other router in the
   project returned it — this file was the outlier). Any throw escaping a controller's own
   try/catch — realistically a second res.json() after headers were sent — became an unhandled
   rejection: the client hung until timeout and the global handler in sdk-server-fixed.js never
   saw it. Keep the `return`. */

// POST /api/admin/approve-issuer/:issuerId
router.post('/approve-issuer/:issuerId', requireAdmin, (req, res) => {
  return adminIssuerController.Approve_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/reject-issuer/:issuerId
router.post('/reject-issuer/:issuerId', requireAdmin, (req, res) => {
  return adminIssuerController.Reject_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// Group 5 (UAT): env toggle to freeze issuer enable/disable so testers can't lock out an
// issuer account mid-UAT. Set DISABLE_ISSUER_TOGGLE=true in .env; REMOVE before demo/prod.
const issuerToggleFrozen = (req, res, next) => {
  if (process.env.DISABLE_ISSUER_TOGGLE === 'true') {
    return res.status(403).json({ success: false, message: 'Issuer enable/disable is temporarily turned off (UAT).' });
  }
  next();
};

// POST /api/admin/disable-issuer/:issuerId
router.post('/disable-issuer/:issuerId', requireAdmin, issuerToggleFrozen, (req, res) => {
  return adminIssuerController.Disable_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/enable-issuer/:issuerId
router.post('/enable-issuer/:issuerId', requireAdmin, issuerToggleFrozen, (req, res) => {
  return adminIssuerController.Enable_Issuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/disable-user/:userId
router.post('/disable-user/:userId', requireAdmin, (req, res) => {
  return adminAuditController.Disable_User(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/enable-user/:userId
router.post('/enable-user/:userId', requireAdmin, (req, res) => {
  return adminAuditController.Enable_User(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// ROOT APPROVE / REJECT SUBORDINATE
// =========================

// POST /api/admin/root-approve-subordinate/:issuerId
router.post('/root-approve-subordinate/:issuerId', (req, res) => {
  return rootAuthorityController.rootApproveSubordinateIssuer(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/root-reject-subordinate/:issuerId
router.post('/root-reject-subordinate/:issuerId', (req, res) => {
  return rootAuthorityController.rootRejectSubordinateIssuer(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// ADMIN DASHBOARD DATA
// =========================

// GET /api/admin/notifications
router.get('/notifications', requireAdmin, adminDashboardController.getAdminNotificationsController);

// GET /api/admin/notifications/unread
router.get('/notifications/unread', requireAdmin, adminDashboardController.getUnreadAdminNotificationsController);

// PATCH /api/admin/notifications/:notificationId/read
router.patch('/notifications/:notificationId/read', requireAdmin, adminDashboardController.markAdminNotificationAsReadController);

// PATCH /api/admin/notifications/read-all
router.patch('/notifications/read-all', requireAdmin, adminDashboardController.markAllAdminNotificationsAsReadController);

// GET /api/admin/credentials/all
router.get('/credentials/all', requireAdmin, adminDashboardController.getAllIssuerCredentialsAdminController);

// POST /api/admin/trigger-expiry-check
// THE genuine hole in this router: adminDashboardController.triggerExpiryCheck has NO role check of
// its own (unlike its sibling triggerIntegrityCheck, which calls ensureAdminRequest). With only the
// mount-level requireAuth, ANY logged-in user — a student — could fire a full-ledger expiry sweep
// that submits an ExpireCredential transaction per expired credential, repeatedly.
router.post('/trigger-expiry-check', requireAdmin, (req, res) => {
  return adminDashboardController.triggerExpiryCheck(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/integrity-check
router.post('/integrity-check', requireAdmin, (req, res) => {
  return adminDashboardController.triggerIntegrityCheck(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/trigger-integrity-check
router.post('/trigger-integrity-check', requireAdmin, (req, res) => {
  return adminDashboardController.triggerIntegrityCheck(req, res, req.app.locals.getContractAndGateway);
});

// POST /api/admin/change-password
router.post('/change-password', requireAdmin, (req, res) => {
  return adminAuditController.changeAdminPasswordSecure(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// STATUS LOGS
// =========================

// GET /api/admin/status-logs
router.get('/status-logs', requireAdmin, (req, res) => {
  return adminAuditController.getAllStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/issuers
router.get('/status-logs/issuers', requireAdmin, (req, res) => {
  return adminAuditController.getAllIssuerStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/users
router.get('/status-logs/users', requireAdmin, (req, res) => {
  return adminAuditController.getAllUserStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/issuer/:issuerEmail
router.get('/status-logs/issuer/:issuerEmail', requireAdmin, (req, res) => {
  return adminAuditController.getIssuerStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/status-logs/user/:userEmail
router.get('/status-logs/user/:userEmail', requireAdmin, (req, res) => {
  return adminAuditController.getUserStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// Optional legacy aliases
router.get('/status-logs/issuers/:issuerEmail', requireAdmin, (req, res) => {
  return adminAuditController.getIssuerStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

router.get('/status-logs/users/:userEmail', requireAdmin, (req, res) => {
  return adminAuditController.getUserStatusLogs(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// ISSUER DECISION LOGS  (admin-only)
// =========================

// GET /api/admin/issuer-decision-logs
router.get('/issuer-decision-logs', requireAdmin, (req, res) => {
  return adminAuditController.getAllIssuerDecisionLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/issuer-decision-logs/approved
router.get('/issuer-decision-logs/approved', requireAdmin, (req, res) => {
  return adminAuditController.getAllIssuerApprovalLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/issuer-decision-logs/rejected
router.get('/issuer-decision-logs/rejected', requireAdmin, (req, res) => {
  return adminAuditController.getAllIssuerRejectionLogs(req, res, req.app.locals.getContractAndGateway);
});

// GET /api/admin/issuer-decision-logs/:issuerEmail
router.get('/issuer-decision-logs/:issuerEmail', requireAdmin, (req, res) => {
  return adminAuditController.getIssuerDecisionLogs(req, res, req.app.locals.getContractAndGateway);
});

// =========================
// ROOT SUBORDINATE DECISION LOGS (ADMIN AUDIT — admin-only)
// =========================

// GET /api/admin/root-subordinate-logs
router.get('/root-subordinate-logs', requireAdmin, (req, res) => {
  return adminAuditController.GetAllRootSubordinateLogs(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/admin/root-subordinate-logs/approved
router.get('/root-subordinate-logs/approved', requireAdmin, (req, res) => {
  return adminAuditController.GetAllRootSubordinateApprovalLogs(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/admin/root-subordinate-logs/rejected
router.get('/root-subordinate-logs/rejected', requireAdmin, (req, res) => {
  return adminAuditController.GetAllRootSubordinateRejectionLogs(
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
  return rootAuthorityController.GetRootSubordinateLogsByRootAuthority(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/admin/root/subordinate-logs/approved
router.get('/root/subordinate-logs/approved', (req, res) => {
  return rootAuthorityController.GetRootSubordinateApprovalLogsByRootAuthority(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/admin/root/subordinate-logs/rejected
router.get('/root/subordinate-logs/rejected', (req, res) => {
  return rootAuthorityController.GetRootSubordinateRejectionLogsByRootAuthority(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

module.exports = router;
