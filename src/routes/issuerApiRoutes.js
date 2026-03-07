const express = require('express');

function createIssuerApiRoutes({ getContractAndGateway, issuerCredentialController }) {
  const router = express.Router();

  // GET /api/issuer/credentials/history - Get issuer credential history.
  router.get('/issuer/credentials/history', (req, res) => {
    issuerCredentialController.get_IssuerCredentialsHistory(req, res, getContractAndGateway);
  });

  // POST /api/issuer/credentials/create - Create a credential template.
  router.post('/issuer/credentials/create', (req, res) => {
    issuerCredentialController.Create_CredentialTemplate(req, res, getContractAndGateway);
  });

  return router;
}

module.exports = createIssuerApiRoutes;
