const express = require('express');

function createCredentialApiRoutes({
  couchdb,
  nano,
  getContractAndGateway,
  issuerCredentialController,
  verifierController,
}) {
  const router = express.Router();

  // GET /api/credentials/issued - Get issued credentials for issuer/admin.
  router.get('/credentials/issued', (req, res) => {
    return issuerCredentialController.get_IssuerIssuedCredentials(req, res, getContractAndGateway);
  });

  // GET /api/credentials/templates - Get credential templates from blockchain.
  router.get('/credentials/templates', (req, res) => {
    issuerCredentialController.getCredentialTemplates(req, res, getContractAndGateway);
  });

  // GET /api/credentials/issuer/:issuerID - Get issuer credentials from issuer CouchDB.
  router.get('/credentials/issuer/:issuerID', async (req, res) => {
    try {
      const { issuerID } = req.params;
      if (!issuerID || issuerID === 'ISSUER') {
        return res.status(400).json({
          success: false,
          error: 'Valid issuer ID is required',
          message: 'Issuer ID cannot be empty or "ISSUER"',
        });
      }

      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const adminNano = nano('http://admin:adminpw@localhost:5985');
      const issuersDB = adminNano.use('issuers');

      let issuer;
      try {
        issuer = await issuersDB.get(issuerID);
      } catch (err) {
        if (err.statusCode === 404) {
          return res.status(404).json({ success: false, error: 'Issuer not found' });
        }
        throw err;
      }

      if (!issuer || !issuer.couchDBUrl) {
        return res.status(403).json({ success: false, error: 'Issuer not found or CouchDB URL missing' });
      }

      const issuerNano = nano(issuer.couchDBUrl);
      const walletDb = issuerNano.use('wallet_issuer_credentials');
      const result = await walletDb.find({ selector: { issuerId: issuerID } });

      return res.json({
        success: true,
        credentials: result.docs || [],
        count: (result.docs || []).length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ Error fetching issuer credentials: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/credentials/:id/history - Get blockchain history of a credential.
  router.get('/credentials/:id/history', async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      let identityName;
      let orgName;
      if (user.role === 'issuer') {
        const issuer = await couchdb.getApprovedIssuer(user.email);
        if (!issuer || !issuer.fabricIdentity || !issuer.orgName) {
          return res.status(403).json({ success: false, error: 'Issuer not approved or Fabric identity missing.' });
        }
        identityName = issuer.fabricIdentity;
        orgName = issuer.orgName;
      } else if (user.role === 'admin' || user.role === 'student' || user.role === 'user') {
        identityName = 'chaincert-admin';
        orgName = 'Org1';
      } else {
        return res.status(403).json({ success: false, error: 'Forbidden: Not allowed.' });
      }

      const { contract } = await getContractAndGateway(identityName, orgName);
      const result = await contract.evaluateTransaction('Get_CredentialTemplateOrIssuedCredentialHistory', req.params.id);

      return res.json({
        success: true,
        history: JSON.parse(result.toString()),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/credentials/:credentialId/verify - Verify credential by id.
  router.get('/credentials/:credentialId/verify', (req, res) =>
    verifierController.verifyCredentialByID(req, res, getContractAndGateway));

  // POST /api/credentials/:credentialId/issue - Issue credential to a holder.
  router.post('/credentials/:credentialId/issue', (req, res) => {
    issuerCredentialController.issue_CredentialToUser(req, res, getContractAndGateway);
  });

  // POST /api/credentials/:credentialId/revoke - Revoke credential.
  router.post('/credentials/:credentialId/revoke', (req, res) => {
    issuerCredentialController.revoke_Credential(req, res, getContractAndGateway);
  });

  // POST /api/credentials/:credentialId/log-verification - Write verification log on-chain.
  router.post('/credentials/:credentialId/log-verification', (req, res) => {
    verifierController.logVerificationEvent(req, res, getContractAndGateway);
  });

  return router;
}

module.exports = createCredentialApiRoutes;
