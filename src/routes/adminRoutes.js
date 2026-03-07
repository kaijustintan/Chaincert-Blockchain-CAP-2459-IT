const express = require('express');

const authController = require('../controllers/authController');

const router = express.Router();

// GET /api/admin/pending-issuers - Get all pending issuer applications.
router.get('/pending-issuers', authController.getPendingIssuers);

// GET /api/admin/pending-issuers-admin-actionable - Get pending issuer applications admin can action now.
router.get('/pending-issuers-admin-actionable', authController.getAdminActionablePendingIssuers);

// GET /api/admin/approved-issuers - Get approved issuers.
router.get('/approved-issuers', authController.getApprovedIssuers);

// GET /api/admin/rejected-issuers - Get rejected issuers.
router.get('/rejected-issuers', authController.getRejectedIssuers);

// GET /api/admin/pending-root-issuers - Get pending root issuer applications.
router.get('/pending-root-issuers', authController.getPendingRootIssuers);

// GET /api/admin/pending-subordinate-issuers - Get pending subordinate issuer applications.
router.get('/pending-subordinate-issuers', authController.getPendingSubordinateIssuers);

// GET /api/admin/pending-subordinate-awaiting-root - Get subordinates pending root decision.
router.get('/pending-subordinate-awaiting-root', authController.getPendingSubordinateIssuersAwaitingRootApproval);

// GET /api/admin/pending-subordinate-root-approved - Get subordinates already root-approved.
router.get('/pending-subordinate-root-approved', authController.getPendingSubordinateIssuersRootApproved);

// GET /api/admin/root/subordinates/all - List all subordinate issuers visible to root authority.
router.get('/root/subordinates/all', authController.getAllSubordinatesForRoot);

// GET /api/admin/root/subordinates/root-approved - List root-approved subordinate issuers.
router.get('/root/subordinates/root-approved', authController.getRootApprovedSubordinatesForRoot);

// GET /api/admin/root/subordinates/root-rejected - List root-rejected subordinate issuers.
router.get('/root/subordinates/root-rejected', authController.getRootRejectedSubordinatesForRoot);

// GET /api/admin/root/subordinates/approved - List fully approved subordinate issuers.
router.get('/root/subordinates/approved', authController.getApprovedSubordinatesForRoot);

// GET /api/admin/root/subordinates/disabled - List disabled subordinate issuers.
router.get('/root/subordinates/disabled', authController.getDisabledSubordinatesForRoot);

module.exports = router;
