const express = require('express');

function createVerificationApiRoutes({ getContractAndGateway, verifierController }) {
  const router = express.Router();

  // GET /api/verification-logs - Get all verification logs.
  router.get('/verification-logs', (req, res) =>
    verifierController.getAllVerificationLogs(req, res, getContractAndGateway));

  // GET /api/verification-logs/:logId - Get specific verification log.
  router.get('/verification-logs/:logId', (req, res) =>
    verifierController.getVerificationLogById(req, res, getContractAndGateway));

  return router;
}

module.exports = createVerificationApiRoutes;
