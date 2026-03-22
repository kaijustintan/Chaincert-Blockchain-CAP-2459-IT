const couchDB = require('../couchDB_service');
const nodemailer = require('nodemailer'); 
const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');

// Inline approval email, same pattern as accountController.js forgotPassword 
async function sendIssuerApprovalEmail(issuerEmail, orgName) {
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    const info = await transporter.sendMail({
      from: '"ChainCert" <noreply@chaincert.com>',
      to: issuerEmail,
      subject: 'Your ChainCert Issuer Application Has Been Approved',
      html: `<p>Dear <strong>${orgName}</strong>,</p><p>Your issuer application on ChainCert has been <strong>approved</strong>. You may now log in and begin issuing credentials.</p>`
    });
    console.log(`[APPROVAL EMAIL] Sent to: ${issuerEmail}`);
    console.log(`[APPROVAL EMAIL] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (err) {
    console.error('[APPROVAL EMAIL] Failed to send:', err.message);
  }
}

const normalizeFabricIdentityPart = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

const getExpectedIssuerIdentityName = (issuerDoc) => {
  const issuerType = String(issuerDoc?.issuerType || 'root').trim().toLowerCase();

  if (issuerType === 'subordinate') {
    if (!issuerDoc?.rootAuthorityName || !issuerDoc?.orgName) {
      throw new Error('Subordinate issuer is missing rootAuthorityName or orgName for Fabric identity verification.');
    }

    return `${normalizeFabricIdentityPart(issuerDoc.rootAuthorityName)}-subordinate-${normalizeFabricIdentityPart(issuerDoc.orgName)}`;
  }

  if (!issuerDoc?.orgName) {
    throw new Error('Issuer orgName is required for Fabric identity verification.');
  }

  return `${normalizeFabricIdentityPart(issuerDoc.orgName)}-admin`;
};

const ensureIssuerFabricIdentityExists = async (issuerDoc) => {
  const identityName = getExpectedIssuerIdentityName(issuerDoc);
  const walletPath = path.resolve(__dirname, '../../backend/wallet');
  const identityFilePath = path.join(walletPath, `${identityName}.id`);
  const identityDirPath = path.join(walletPath, identityName);

  console.log('[Approve_Issuer][FabricCheck] Checking identity:', identityName);
  console.log('[Approve_Issuer][FabricCheck] Wallet path:', walletPath);
  console.log('[Approve_Issuer][FabricCheck] File exists:', fs.existsSync(identityFilePath), identityFilePath);
  console.log('[Approve_Issuer][FabricCheck] Directory exists:', fs.existsSync(identityDirPath), identityDirPath);

  if (fs.existsSync(identityFilePath) || fs.existsSync(identityDirPath)) {
    return identityName;
  }

  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const identity = await wallet.get(identityName);

  if (!identity) {
    const availableWalletEntries = fs.existsSync(walletPath)
      ? fs.readdirSync(walletPath).filter((entry) => entry.includes(identityName) || entry.endsWith('.id'))
      : [];
    console.log('[Approve_Issuer][FabricCheck] Matching wallet entries:', availableWalletEntries);

    const err = new Error(`Fabric identity '${identityName}' was not found in the wallet. Please create/enroll this identity before approving the issuer.`);
    err.statusCode = 400;
    throw err;
  }

  return identityName;
};

const adminIssuerController = {
  getPendingIssuers: async (req, res) => {
    try {
      const pendingIssuers = await couchDB.getPendingIssuers();
      res.status(200).json({
        success: true,
        data: pendingIssuers
      });
    } catch (error) {
      console.error('Error fetching pending issuers:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getPendingRootIssuers: async (req, res) => {
    try {
      const rows = await couchDB.getPendingRootIssuers();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching pending root issuers:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getPendingSubordinateIssuers: async (req, res) => {
    try {
      const rows = await couchDB.getPendingSubordinateIssuers();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching pending subordinate issuers:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getPendingSubordinateIssuersAwaitingRootApproval: async (req, res) => {
    try {
      const rows = await couchDB.getPendingSubordinateIssuersAwaitingRootApproval();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching subordinate issuers awaiting root approval:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getPendingSubordinateIssuersRootApproved: async (req, res) => {
    try {
      const rows = await couchDB.getPendingSubordinateIssuersRootApproved();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching root-approved subordinate issuers:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getAdminActionablePendingIssuers: async (req, res) => {
    try {
      const rows = await couchDB.getAdminActionablePendingIssuers();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching admin-actionable pending issuers:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getApprovedIssuers: async (req, res) => {
    try {
      const approvedIssuers = await couchDB.getApprovedIssuers();
      const safeIssuers = approvedIssuers.map(doc => ({
        id: doc._id,
        orgName: doc.orgName,
        contactName: doc.contactName,
        email: doc.email,
        status: doc.status,
        accredited: doc.accredited,
        accreditedType: doc.accreditedType,
        createdAt: doc.createdAt,
        approvedAt: doc.approvedAt,
        approvedBy: doc.approvedBy,
        walletId: doc.walletId,
        fabricIdentity: doc.fabricIdentity,
        couchDBUrl: doc.couchDBUrl,
        issuerType: doc.issuerType || 'root',
        rootAuthorityId: doc.rootAuthorityId || null,
        rootAuthorityName: doc.rootAuthorityName || null
      }));

      return res.status(200).json({
        success: true,
        message: 'Approved issuers retrieved successfully',
        data: safeIssuers,
        count: safeIssuers.length
      });
    } catch (error) {
      console.error('Error fetching approved issuers:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching approved issuers: ${error.message}`
      });
    }
  },

  getRejectedIssuers: async (req, res) => {
    try {
      const rejectedIssuers = await couchDB.getRejectedIssuers();
      const safeIssuers = rejectedIssuers.map(doc => ({
        id: doc._id,
        orgName: doc.orgName,
        contactName: doc.contactName,
        email: doc.email,
        status: doc.status,
        accredited: doc.accredited,
        accreditedType: doc.accreditedType,
        createdAt: doc.createdAt,
        rejectedAt: doc.rejectedAt || null,
        rejectedBy: doc.rejectedBy || null,
        rejectionReason: doc.rejectionReason || null,
        approvedAt: doc.approvedAt || null,
        approvedBy: doc.approvedBy || null,
        walletId: doc.walletId,
        fabricIdentity: doc.fabricIdentity,
        couchDBUrl: doc.couchDBUrl,
        issuerType: doc.issuerType || 'root',
        rootAuthorityId: doc.rootAuthorityId || null,
        rootAuthorityName: doc.rootAuthorityName || null
      }));

      return res.status(200).json({
        success: true,
        message: 'Rejected issuers retrieved successfully',
        data: safeIssuers,
        count: safeIssuers.length
      });
    } catch (error) {
      console.error('Error fetching rejected issuers:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching rejected issuers: ${error.message}`
      });
    }
  },

  getDisabledIssuers: async (req, res) => {
    try {
      const disabledIssuers = await couchDB.getDisabledIssuers();
      const safeIssuers = disabledIssuers.map(doc => ({
        id: doc._id,
        orgName: doc.orgName,
        contactName: doc.contactName,
        email: doc.email,
        status: doc.status,
        accredited: doc.accredited,
        accreditedType: doc.accreditedType,
        createdAt: doc.createdAt,
        approvedAt: doc.approvedAt || null,
        approvedBy: doc.approvedBy || null,
        disabledAt: doc.disabledAt || null,
        disabledBy: doc.disabledBy || null,
        disableReason: doc.disableReason || null,
        walletId: doc.walletId,
        fabricIdentity: doc.fabricIdentity,
        couchDBUrl: doc.couchDBUrl,
        issuerType: doc.issuerType || 'root',
        rootAuthorityId: doc.rootAuthorityId || null,
        rootAuthorityName: doc.rootAuthorityName || null
      }));

      return res.status(200).json({
        success: true,
        message: 'Disabled issuers retrieved successfully',
        data: safeIssuers,
        count: safeIssuers.length
      });
    } catch (error) {
      console.error('Error fetching disabled issuers:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching disabled issuers: ${error.message}`
      });
    }
  },

  Approve_Issuer: async (req, res, getContractAndGateway) => {
    let gateway = null;
    try {
      const { issuerId } = req.params;
      const { approvalReason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }

      const adminEmail = req.user.email;
      if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required.' });
      }

      const issuerDoc = await couchDB.getIssuerById(issuerId);
      if (!issuerDoc) {
        return res.status(404).json({ success: false, message: 'Issuer not found.' });
      }

      const issuerType = String(issuerDoc.issuerType || 'root').toLowerCase();
      const rootApprovalStatus = String(issuerDoc.rootApprovalStatus || 'not_required').toLowerCase();

      if (issuerType === 'subordinate' && rootApprovalStatus !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Cannot approve subordinate issuer until root authority approves first.',
          issuerType,
          rootApprovalStatus
        });
      }

      await ensureIssuerFabricIdentityExists(issuerDoc);

      const result = await couchDB.Approve_Issuer(issuerId, adminEmail);

      const issuerEmail = result.email;
      const orgName = result.orgName;
      const reason = approvalReason || 'Issuer application approved by admin';
      let blockchainWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway not provided');
        }

        const { gateway: gw, contract } = await getContractAndGateway('chaincert-admin', 'Org1');
        gateway = gw;

        await contract.submitTransaction('LogIssuerApproval', issuerId, issuerEmail, orgName, reason, adminEmail);
      } catch (bcErr) {
        blockchainWarning = bcErr?.message || String(bcErr);
        console.error('[Approve_Issuer] Blockchain log failed:', blockchainWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      // Fire-and-forget approval email
      sendIssuerApprovalEmail(issuerEmail, orgName).catch(() => {});

      return res.status(200).json({
        success: true,
        message: blockchainWarning
          ? 'Issuer approved, but blockchain log failed.'
          : 'Issuer approved successfully.',
        warning: blockchainWarning,
        data: result
      });
    } catch (error) {
      console.error('Error approving issuer:', error);
      if (res.headersSent) return;
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  Reject_Issuer: async (req, res, getContractAndGateway) => {
    let gateway = null;
    try {
      const { issuerId } = req.params;
      const { rejectionReason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }

      const adminEmail = req.user.email;
      if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required.' });
      }

      if (!rejectionReason || rejectionReason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
      }

      const result = await couchDB.Reject_Issuer(
        issuerId,
        rejectionReason,
        adminEmail
      );

      const issuerDoc = await couchDB.getIssuerById(issuerId);
      const issuerEmail = issuerDoc?.email || '';
      const orgName = issuerDoc?.orgName || '';

      let blockchainWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway not provided');
        }

        const { gateway: gw, contract } = await getContractAndGateway('chaincert-admin', 'Org1');
        gateway = gw;

        await contract.submitTransaction(
          'LogIssuerRejection',
          issuerId,
          issuerEmail,
          orgName,
          rejectionReason,
          adminEmail
        );
      } catch (bcErr) {
        blockchainWarning = bcErr?.message || String(bcErr);
        console.error('[Reject_Issuer] Blockchain log failed:', blockchainWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      return res.status(200).json({
        success: true,
        message: blockchainWarning
          ? 'Issuer rejected, but blockchain log failed.'
          : 'Issuer rejected successfully.',
        warning: blockchainWarning,
        data: result
      });
    } catch (error) {
      console.error('Error rejecting issuer:', error);
      if (res.headersSent) return;
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  Disable_Issuer: async (req, res, getContractAndGateway) => {
    let gateway = null;
    try {
      const { issuerId } = req.params;
      const { reason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }

      const adminEmail = req.user.email;
      if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required.' });
      }

      if (!reason || reason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Disabling reason is required.' });
      }

      const issuer = await couchDB.getIssuerById(issuerId);
      if (!issuer) {
        return res.status(404).json({ success: false, message: 'Issuer not found.' });
      }

      const previousStatus = issuer.status || '';

      if (previousStatus === 'disabled') {
        return res.status(400).json({ success: false, message: 'Issuer is already disabled.' });
      }

      await couchDB.Disable_Issuer(issuerId, adminEmail, reason);

      let blockchainLogWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway function not provided');
        }

        const identityName = 'chaincert-admin';
        const orgName = 'Org1';

        console.log('\n[Disable_Issuer][DEBUG] typeof getContractAndGateway =', typeof getContractAndGateway);
        console.log('[Disable_Issuer][DEBUG] identityName =', identityName, '| orgName =', orgName);
        console.log('[Disable_Issuer][DEBUG] issuerId =', issuerId, '| issuerEmail =', issuer.email);
        console.log('[Disable_Issuer][DEBUG] about to call getContractAndGateway...\n');

        const cg = await getContractAndGateway(identityName, orgName);

        console.log('\n[Disable_Issuer][DEBUG] getContractAndGateway returned:', cg);
        console.log('[Disable_Issuer][DEBUG] cg type =', typeof cg);
        console.log('[Disable_Issuer][DEBUG] cg keys =', cg ? Object.keys(cg) : null);
        console.log('[Disable_Issuer][DEBUG] cg.gateway exists =', !!(cg && cg.gateway));
        console.log('[Disable_Issuer][DEBUG] cg.contract exists =', !!(cg && cg.contract), '\n');

        if (!cg || !cg.gateway || !cg.contract) {
          throw new Error('getContractAndGateway returned an invalid connection object');
        }

        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogIssuerStatusChange',
          issuer.email,
          previousStatus,
          'disabled',
          reason,
          adminEmail
        );
      } catch (bcErr) {
        blockchainLogWarning = bcErr?.message || String(bcErr);
        console.error('[Disable_Issuer] Blockchain log failed:', blockchainLogWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      return res.status(200).json({
        success: true,
        message: blockchainLogWarning
          ? 'Issuer disabled successfully, but blockchain log failed.'
          : 'Issuer disabled successfully.',
        warning: blockchainLogWarning
      });
    } catch (error) {
      console.error('Disable_Issuer error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  Enable_Issuer: async (req, res, getContractAndGateway) => {
    let gateway = null;
    try {
      const { issuerId } = req.params;
      const { reason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }

      const adminEmail = req.user.email;
      if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required.' });
      }

      if (!reason || reason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Re-enable reason is required.' });
      }

      const issuer = await couchDB.getIssuerById(issuerId);
      if (!issuer) {
        return res.status(404).json({ success: false, message: 'Issuer not found.' });
      }

      const previousStatus = issuer.status || '';

      if (previousStatus === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Issuer is already enabled (approved).'
        });
      }

      await couchDB.Enable_Issuer(issuerId, adminEmail, reason);

      let blockchainLogWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway function not provided');
        }

        const cg = await getContractAndGateway('chaincert-admin', 'Org1');
        if (!cg || !cg.gateway || !cg.contract) {
          throw new Error('getContractAndGateway returned an invalid connection object');
        }

        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogIssuerStatusChange',
          issuer.email,
          previousStatus,
          'approved',
          reason,
          adminEmail
        );
      } catch (bcErr) {
        blockchainLogWarning = bcErr?.message || String(bcErr);
        console.error('[Enable_Issuer] Blockchain log failed:', blockchainLogWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      return res.status(200).json({
        success: true,
        message: blockchainLogWarning
          ? 'Issuer re-enabled successfully, but blockchain log failed.'
          : 'Issuer re-enabled successfully.',
        warning: blockchainLogWarning
      });
    } catch (error) {
      console.error('Enable_Issuer error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = adminIssuerController;
