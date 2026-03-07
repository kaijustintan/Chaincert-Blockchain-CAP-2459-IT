const express = require('express');

const authController = require('../controllers/authController');
const issuerCredentialController = require('../controllers/issuerCredentialController');

const router = express.Router();

// GET /api/issuer/issuer-requirements/:category - Get required documents for issuer registration category.
router.get('/issuer-requirements/:category', authController.getIssuerRequirementsByCategory);

// GET /api/issuer/issuer/:issuerId/documents - Get issuer document metadata.
router.get('/issuer/:issuerId/documents', authController.getIssuerDocuments);

// GET /api/issuer/issuer/:issuerId/documents/:attachmentName - View/download a specific issuer document.
router.get('/issuer/:issuerId/documents/:attachmentName', authController.viewIssuerDocument);

// GET /api/issuer/issuer/templates/exists - Check if issuer has templates.
router.get('/issuer/templates/exists', issuerCredentialController.check_IssuerHasTemplates);

// GET /api/issuer/issuer/:issuerId/credentials - Get issuer credentials (fast reads / dashboard).
router.get('/issuer/:issuerId/credentials', authController.getIssuerCredentials);

// GET /api/issuer/issuer/templates/:templateId/eligible-users - Get users eligible for template issuance.
router.get(
  '/issuer/templates/:templateId/eligible-users',
  issuerCredentialController.getEligibleUsersForTemplate,
);

module.exports = router;
