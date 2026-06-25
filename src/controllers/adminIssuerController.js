const couchDB = require('../couchDB_service');
const mailerService = require('../mailerService');
const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');
const { sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2 (M9)

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
  const walletPath = path.join(__dirname, '../../chaincert-api/wallet');
  const identityFilePath = path.join(walletPath, `${identityName}.id`);
  const identityDirPath = path.join(walletPath, identityName);

  console.log('[Approve_Issuer][FabricCheck] Checking identity:', identityName);
  console.log('[Approve_Issuer][FabricCheck] Resolved wallet path:', walletPath);
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
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  getPendingRootIssuers: async (req, res) => {
    try {
      const rows = await couchDB.getPendingRootIssuers();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching pending root issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  getPendingSubordinateIssuers: async (req, res) => {
    try {
      const rows = await couchDB.getPendingSubordinateIssuers();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching pending subordinate issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  getPendingSubordinateIssuersAwaitingRootApproval: async (req, res) => {
    try {
      const rows = await couchDB.getPendingSubordinateIssuersAwaitingRootApproval();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching subordinate issuers awaiting root approval:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  getPendingSubordinateIssuersRootApproved: async (req, res) => {
    try {
      const rows = await couchDB.getPendingSubordinateIssuersRootApproved();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching root-approved subordinate issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  getAdminActionablePendingIssuers: async (req, res) => {
    try {
      const rows = await couchDB.getAdminActionablePendingIssuers();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching admin-actionable pending issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
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
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
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
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
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
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
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

      try {
        await couchDB.createAdminNotification({
          category: 'issuer_approved',
          title: 'Issuer Approved',
          message: `${orgName} was approved by admin ${adminEmail}.`,
          issuerId,
          issuerEmail
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create issuer approval notification:', notificationError.message);
      }

      // F28 + G3: fire-and-forget so approval responds immediately (no emailWarning in
      // the response anymore — the send completes after we've already replied).
      mailerService.sendMailFireAndForget({
        to: issuerEmail,
        subject: 'Your ChainCert Issuer Application Has Been Approved',
        html: mailerService.renderEmail({
          heading: '✅ Issuer Application Approved',
          bodyHtml: `
              <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${orgName}</strong>,</p>
              <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Great news &mdash; your issuer application on ChainCert has been <strong style="color:#16a34a;">approved</strong>. You may now log in and begin issuing verifiable credentials to your holders.</p>
              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Log in using the email and password you registered with.</p>`
        }),
        text: `Dear ${orgName},\n\nYour issuer application on ChainCert has been approved. You may now log in and begin issuing credentials.`
      }, '[Approve_Issuer]');

      const warnings = [];
      if (blockchainWarning) warnings.push('blockchain log failed');

      return res.status(200).json({
        success: true,
        message: warnings.length
          ? `Issuer approved, but ${warnings.join(' and ')}.`
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
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
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

      try {
        await couchDB.createAdminNotification({
          category: 'issuer_rejected',
          title: 'Issuer Rejected',
          message: `${orgName || issuerEmail || issuerId} was rejected by admin ${adminEmail}.`,
          issuerId,
          issuerEmail
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create issuer rejection notification:', notificationError.message);
      }

      // F28 + G3: notify the issuer by email, fire-and-forget so rejection responds
      // immediately (no emailWarning in the response — send completes after we reply).
      if (issuerEmail) {
        mailerService.sendMailFireAndForget({
          to: issuerEmail,
          subject: 'Update on Your ChainCert Issuer Application',
          html: mailerService.renderEmail({
            heading: 'Issuer Application Not Approved',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${orgName || 'Applicant'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">After review, your issuer application on ChainCert was <strong style="color:#b91c1c;">not approved</strong> at this time.</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${rejectionReason}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">You may address the points above and submit a new application.</p>`
          }),
          text: `Dear ${orgName || 'Applicant'},\n\nYour issuer application on ChainCert was not approved.\nReason: ${rejectionReason}\n\nYou may address the points above and submit a new application.`
        }, '[Reject_Issuer]');
      }

      const warnings = [];
      if (blockchainWarning) warnings.push('blockchain log failed');

      return res.status(200).json({
        success: true,
        message: warnings.length
          ? `Issuer rejected, but ${warnings.join(' and ')}.`
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
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
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

      try {
        await couchDB.createAdminNotification({
          category: 'issuer_disabled',
          title: 'Issuer Disabled',
          message: `${issuer.orgName || issuer.email || issuerId} was disabled by admin ${adminEmail}.`,
          issuerId,
          issuerEmail: issuer.email || null
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create issuer disable notification:', notificationError.message);
      }

      // F28 + G3: notify the issuer their account was disabled, fire-and-forget so the
      // action responds immediately (no emailWarning in the response anymore).
      if (issuer.email) {
        mailerService.sendMailFireAndForget({
          to: issuer.email,
          subject: 'Your ChainCert Issuer Account Has Been Disabled',
          html: mailerService.renderEmail({
            heading: 'Issuer Account Disabled',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${issuer.orgName || 'Issuer'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Your issuer account on ChainCert has been <strong style="color:#b91c1c;">disabled</strong> by an administrator. While disabled, you cannot log in or issue credentials.</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${reason}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">If you believe this was in error, please contact the ChainCert administration team.</p>`
          }),
          text: `Dear ${issuer.orgName || 'Issuer'},\n\nYour issuer account on ChainCert has been disabled by an administrator.\nReason: ${reason}\n\nIf you believe this was in error, please contact the ChainCert administration team.`
        }, '[Disable_Issuer]');
      }

      const warnings = [];
      if (blockchainLogWarning) warnings.push('blockchain log failed');

      return res.status(200).json({
        success: true,
        message: warnings.length
          ? `Issuer disabled successfully, but ${warnings.join(' and ')}.`
          : 'Issuer disabled successfully.',
        warning: blockchainLogWarning
      });
    } catch (error) {
      console.error('Disable_Issuer error:', error);
      if (res.headersSent) return;
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
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

      // F28 + G3: notify the issuer their account was re-enabled, fire-and-forget so the
      // action responds immediately (no emailWarning in the response anymore).
      if (issuer.email) {
        mailerService.sendMailFireAndForget({
          to: issuer.email,
          subject: 'Your ChainCert Issuer Account Has Been Re-enabled',
          html: mailerService.renderEmail({
            heading: 'Issuer Account Re-enabled',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${issuer.orgName || 'Issuer'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Good news &mdash; your issuer account on ChainCert has been <strong style="color:#16a34a;">re-enabled</strong>. You may log in again and resume issuing credentials.</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Log in using the email and password you registered with.</p>`
          }),
          text: `Dear ${issuer.orgName || 'Issuer'},\n\nYour issuer account on ChainCert has been re-enabled. You may log in again and resume issuing credentials.`
        }, '[Enable_Issuer]');
      }

      // F28 / R41: Enable had no admin notification — add the in-app one, and
      // email the whole admin team that this issuer was re-enabled (best-effort).
      try {
        await couchDB.createAdminNotification({
          category: 'issuer_enabled',
          title: 'Issuer Re-enabled',
          message: `${issuer.orgName || issuer.email || issuerId} was re-enabled by admin ${adminEmail}.`,
          issuerId,
          issuerEmail: issuer.email || null
        });
      } catch (notifErr) {
        console.warn('[ADMIN NOTIFICATION] Failed to create issuer enable notification:', notifErr.message);
      }
      // G3: fire-and-forget each send; the try/catch stays because getAdminEmails()
      // above is a DB read that can throw.
      try {
        const adminEmails = await couchDB.getAdminEmails();
        for (const aEmail of adminEmails) {
          mailerService.sendMailFireAndForget({
            to: aEmail,
            subject: 'ChainCert Issuer Re-enabled',
            html: mailerService.renderEmail({
              heading: 'Issuer Re-enabled',
              bodyHtml: `<p style="margin:0;color:#374151;font-size:14px;line-height:1.6;"><strong>${issuer.orgName || issuer.email || issuerId}</strong> was re-enabled by admin <strong>${adminEmail}</strong>.</p>`
            }),
            text: `${issuer.orgName || issuer.email || issuerId} was re-enabled by admin ${adminEmail}.`
          }, '[Enable_Issuer]');
        }
      } catch (adminEmailErr) {
        console.error('[Enable_Issuer] Admin email lookup failed (non-fatal):', adminEmailErr?.message || adminEmailErr);
      }

      const warnings = [];
      if (blockchainLogWarning) warnings.push('blockchain log failed');

      return res.status(200).json({
        success: true,
        message: warnings.length
          ? `Issuer re-enabled successfully, but ${warnings.join(' and ')}.`
          : 'Issuer re-enabled successfully.',
        warning: blockchainLogWarning
      });
    } catch (error) {
      console.error('Enable_Issuer error:', error);
      if (res.headersSent) return;
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  }
};

module.exports = adminIssuerController;
