// ✅ CORRECTED PATHS FOR UBUNTU (no /services/ subdirectory)
const couchdb = require('../couchDB_service');
const jwt = require('jsonwebtoken');
const IssuerDeploymentService = require('../issuerDeploymentService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const deploymentService = new IssuerDeploymentService();

// ✅ Approve issuer (triggers FULL org deployment: CA + CouchDB + Peer)
const approveIssuer = async (req, res) => {
  try {
    const { issuerId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin role required' });
    }

    console.log(`🔄 [APPROVAL] Starting approval for issuer: ${issuerId}`);

    // ✅ Get issuer from database
    const issuer = await couchdb.approveIssuer(issuerId, decoded.id);
    console.log(`✅ [APPROVAL] Status updated to deploying for: ${issuer.contactName}`);

    // ✅ Deploy async using the NEW MERGED service (CA + CouchDB + Peer)
    deploymentService.deployCompleteIssuer(issuer.email)
      .then(async (deployment) => {
        console.log(`✅ [DEPLOY] Deployment succeeded for: ${issuer.contactName}`);

        // Initialize databases first
        await couchdb.initializeDatabases();

        // Update status to 'approved'
        const db = couchdb.couch.use('issuers');
        const updatedIssuer = await db.get(issuer._id);
        updatedIssuer.status = 'approved';
        updatedIssuer.deploymentInfo = deployment;
        await db.insert(updatedIssuer);

        await couchdb.createNotification({
          title: `Issuer Approved: ${issuer.orgName}`,
          message: `${issuer.contactName} has been approved! Full deployment (CA + Peer) completed.`,
          issuerEmail: issuer.email,
          category: 'issuer_approved',
          targetRole: 'admin'
        });
      })
      .catch(async (error) => {
        console.error(`❌ [DEPLOY] Deployment failed: ${error.message}`);

        // Initialize databases first
        await couchdb.initializeDatabases();

        const db = couchdb.couch.use('issuers');
        const failedIssuer = await db.get(issuer._id);
        failedIssuer.status = 'failed';
        failedIssuer.deploymentError = error.message;
        await db.insert(failedIssuer);

        await couchdb.createNotification({
          title: `Issuer Deployment Failed: ${issuer.orgName}`,
          message: `Deployment error: ${error.message}`,
          issuerEmail: issuer.email,
          category: 'deployment_failed',
          targetRole: 'admin'
        });
      });

    res.status(200).json({
      success: true,
      message: 'Issuer approved. Full deployment (CA + CouchDB + Peer) in progress...',
      issuer: {
        id: issuer._id,
        email: issuer.email,
        orgName: issuer.orgName,
        status: 'deploying'
      }
    });

  } catch (error) {
    console.error(`❌ [APPROVAL] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Reject issuer
const rejectIssuer = async (req, res) => {
  try {
    const { issuerId } = req.params;
    const { rejectionReason } = req.body;

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin role required' });
    }

    const issuer = await couchdb.rejectIssuer(issuerId, rejectionReason);

    await couchdb.createNotification({
      title: `Issuer Rejected: ${issuer.orgName}`,
      message: `Reason: ${rejectionReason}`,
      issuerEmail: issuer.email,
      category: 'issuer_rejected',
      targetRole: 'admin'
    });

    res.status(200).json({
      success: true,
      message: 'Issuer rejected successfully',
      issuer
    });

  } catch (error) {
    console.error(`❌ [REJECTION] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  approveIssuer,
  rejectIssuer
};
