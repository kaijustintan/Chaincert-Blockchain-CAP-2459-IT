const express = require('express');

function createAdminApiRoutes({ couchdb, getContractAndGateway, adminDashboardController, authController }) {
  const router = express.Router();

  // GET /api/pending-issuers - Get all pending issuer applications.
  router.get('/pending-issuers', async (req, res) => {
    try {
      const pendingIssuers = await couchdb.getPendingIssuers();
      res.status(200).json({ success: true, data: pendingIssuers });
    } catch (error) {
      console.error('Error fetching pending issuers:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET /api/admin/credentials/all - Get all credentials for admin dashboard.
  router.get('/admin/credentials/all', (req, res) => {
    adminDashboardController.getAllIssuerCredentialsAdminController(req, res);
  });

  // GET /api/admin/status-logs - Get status logs (all types).
  router.get('/admin/status-logs', (req, res) => {
    authController.getAllStatusLogs(req, res, getContractAndGateway);
  });

  // GET /api/auth/disabled-issuers - Get disabled issuers.
  router.get('/auth/disabled-issuers', (req, res) => {
    authController.getDisabledIssuers(req, res);
  });

  // POST /api/auth/disable-issuer/:issuerId - Disable issuer.
  router.post('/auth/disable-issuer/:issuerId', (req, res) => {
    authController.disableIssuer(req, res, getContractAndGateway);
  });

  // POST /api/auth/enable-issuer/:issuerId - Enable issuer.
  router.post('/auth/enable-issuer/:issuerId', (req, res) => {
    authController.enableIssuer(req, res, getContractAndGateway);
  });

  // POST /api/auth/disable-user/:userId - Disable user.
  router.post('/auth/disable-user/:userId', (req, res) => {
    authController.disableUser(req, res, getContractAndGateway);
  });

  // POST /api/auth/enable-user/:userId - Enable user.
  router.post('/auth/enable-user/:userId', (req, res) => {
    authController.enableUser(req, res, getContractAndGateway);
  });

  // POST /api/approve-issuer/:issuerId - Approve issuer.
  router.post('/approve-issuer/:issuerId', (req, res) => {
    authController.approveIssuer(req, res, getContractAndGateway);
  });

  // POST /api/reject-issuer/:issuerId - Reject issuer.
  router.post('/reject-issuer/:issuerId', (req, res) => {
    authController.rejectIssuer(req, res, getContractAndGateway);
  });

  // POST /api/root-approve-subordinate/:issuerId - Root approve subordinate issuer.
  router.post('/root-approve-subordinate/:issuerId', (req, res) => {
    authController.rootApproveSubordinateIssuer(req, res, getContractAndGateway);
  });

  // POST /api/root-reject-subordinate/:issuerId - Root reject subordinate issuer.
  router.post('/root-reject-subordinate/:issuerId', (req, res) => {
    authController.rootRejectSubordinateIssuer(req, res, getContractAndGateway);
  });

  // GET /api/root/subordinates/pending - Get pending subordinates for root.
  router.get('/root/subordinates/pending', (req, res) => {
    authController.getPendingSubordinatesForRoot(req, res);
  });

  // GET /api/admin/issuer-decision-logs - Get all issuer decision logs.
  router.get('/admin/issuer-decision-logs', (req, res) => {
    authController.getAllIssuerDecisionLogs(req, res, getContractAndGateway);
  });

  // GET /api/admin/issuer-decision-logs/approved - Get all issuer approval logs.
  router.get('/admin/issuer-decision-logs/approved', (req, res) => {
    authController.getAllIssuerApprovalLogs(req, res, getContractAndGateway);
  });

  // GET /api/admin/issuer-decision-logs/rejected - Get all issuer rejection logs.
  router.get('/admin/issuer-decision-logs/rejected', (req, res) => {
    authController.getAllIssuerRejectionLogs(req, res, getContractAndGateway);
  });

  // GET /api/admin/issuer-decision-logs/:issuerEmail - Get issuer decision logs for one issuer.
  router.get('/admin/issuer-decision-logs/:issuerEmail', (req, res) => {
    authController.getIssuerDecisionLogs(req, res, getContractAndGateway);
  });

  // POST /api/admin/change-password - Change admin password.
  router.post('/admin/change-password', (req, res) => {
    authController.changeAdminPasswordSecure(req, res, getContractAndGateway);
  });

  // GET /api/admin/status-logs/issuers - Get issuer status logs.
  router.get('/admin/status-logs/issuers', (req, res) => {
    authController.getAllIssuerStatusLogs(req, res, getContractAndGateway);
  });

  // GET /api/admin/status-logs/users - Get user status logs.
  router.get('/admin/status-logs/users', (req, res) => {
    authController.getAllUserStatusLogs(req, res, getContractAndGateway);
  });

  // GET /api/admin/status-logs/issuer/:email - Get status logs for one issuer.
  router.get('/admin/status-logs/issuer/:email', (req, res) => {
    authController.getIssuerStatusLogs(req, res, getContractAndGateway);
  });

  // GET /api/admin/status-logs/user/:email - Get status logs for one user.
  router.get('/admin/status-logs/user/:email', (req, res) => {
    authController.getUserStatusLogs(req, res, getContractAndGateway);
  });

  // GET /api/admin/status-logs/issuers/:issuerEmail - Get status logs for one issuer (plural path alias).
  router.get('/admin/status-logs/issuers/:issuerEmail', (req, res) => {
    authController.getIssuerStatusLogs(req, res, getContractAndGateway);
  });

  // GET /api/admin/status-logs/users/:userEmail - Get status logs for one user (plural path alias).
  router.get('/admin/status-logs/users/:userEmail', (req, res) => {
    authController.getUserStatusLogs(req, res, getContractAndGateway);
  });

  // POST /api/admin/trigger-expiry-check - Trigger manual expiry check.
  router.post('/admin/trigger-expiry-check', (req, res) => {
    adminDashboardController.triggerExpiryCheck(req, res, getContractAndGateway);
  });

  return router;
}

module.exports = createAdminApiRoutes;
