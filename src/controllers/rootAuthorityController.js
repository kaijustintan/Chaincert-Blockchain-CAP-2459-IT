const couchDB = require('../couchDB_service');
const { sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2 (M9)
const mailerService = require('../mailerService'); // F28: subordinate decision emails

const rootAuthorityController = {
  getPendingSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      if (req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getPendingSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching pending subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  getAllSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getAllSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({
        success: true,
        message: 'All subordinates retrieved successfully.',
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching all subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  getRootApprovedSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getRootApprovedSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({
        success: true,
        message: 'Root-approved subordinates retrieved successfully.',
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching root-approved subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  getRootRejectedSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getRootRejectedSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({
        success: true,
        message: 'Root-rejected subordinates retrieved successfully.',
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching root-rejected subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  getApprovedSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getApprovedSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({
        success: true,
        message: 'Approved subordinates retrieved successfully.',
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching approved subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  getDisabledSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getDisabledSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({
        success: true,
        message: 'Disabled subordinates retrieved successfully.',
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching disabled subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  rootApproveSubordinateIssuer: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { issuerId } = req.params;
      const { approvalReason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      if (req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rootAuthorityDoc = await couchDB.getIssuerById(rootAuthorityId);
      if (!rootAuthorityDoc) {
        return res.status(404).json({ success: false, message: 'Root authority issuer record not found.' });
      }

      const result = await couchDB.rootApproveSubordinateIssuer(
        issuerId,
        rootAuthorityId,
        approvalReason || ''
      );

      const subordinateDoc = await couchDB.getIssuerById(issuerId);

      let blockchainWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway not provided');
        }

        const identityName = rootAuthorityDoc.fabricIdentity;
        const orgName = rootAuthorityDoc.orgName;

        const cg = await getContractAndGateway(identityName, orgName);
        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogRootSubordinateApproval',
          issuerId,
          subordinateDoc.email,
          subordinateDoc.orgName,
          rootAuthorityId,
          rootAuthorityDoc.orgName || rootAuthorityDoc.contactName || rootAuthorityDoc.email,
          approvalReason || 'Approved by root authority'
        );
      } catch (bcErr) {
        blockchainWarning = bcErr?.message || String(bcErr);
        console.error('[rootApproveSubordinateIssuer] Blockchain log failed:', blockchainWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      try {
        await couchDB.createAdminNotification({
          category: 'subordinate_root_approved',
          title: 'Subordinate Approved by Root',
          message: `${subordinateDoc?.orgName || issuerId} was approved by root authority ${rootAuthorityDoc.orgName || rootAuthorityDoc.email}.`,
          issuerId,
          issuerEmail: subordinateDoc?.email || null
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create root approval notification:', notificationError.message);
      }

      // N1: notify the SUBORDINATE issuer (their own account) in-app.
      try {
        await couchDB.createNotification({
          targetRole: 'issuer', issuerId, issuerEmail: subordinateDoc?.email || null,
          category: 'subordinate_root_approved',
          title: 'Your root authority approved you',
          message: 'Your root authority approved your application. It now awaits final approval by the ChainCert admin.'
        });
      } catch (e) { console.warn('[ISSUER NOTIFICATION] root-approve:', e.message); }

      // F28 + G3: email the subordinate that its root authority approved it,
      // fire-and-forget so the action responds immediately.
      if (subordinateDoc?.email) {
        mailerService.sendMailFireAndForget({
          to: subordinateDoc.email,
          subject: 'Your ChainCert Subordinate Application Was Approved by Your Root Authority',
          html: mailerService.renderEmail({
            heading: 'Approved by Root Authority',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${subordinateDoc.orgName || 'Applicant'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Your subordinate issuer application has been <strong style="color:#16a34a;">approved</strong> by your root authority, <strong>${rootAuthorityDoc.orgName || rootAuthorityDoc.email}</strong>.</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Your application now moves to the ChainCert administration team for final approval. You will be notified once a decision is made.</p>`
          }),
          text: `Dear ${subordinateDoc.orgName || 'Applicant'},\n\nYour subordinate issuer application was approved by your root authority (${rootAuthorityDoc.orgName || rootAuthorityDoc.email}). It now awaits final approval by the ChainCert administration team.`
        }, '[rootApproveSubordinateIssuer]');
      }

      return res.status(200).json({
        success: true,
        message: blockchainWarning
          ? 'Subordinate issuer root-approved, but blockchain log failed.'
          : 'Subordinate issuer root-approved successfully.',
        warning: blockchainWarning,
        data: result
      });
    } catch (error) {
      console.error('Error root-approving subordinate issuer:', error);

      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }

      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  rootRejectSubordinateIssuer: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { issuerId } = req.params;
      const { rejectionReason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      if (req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      if (!rejectionReason || rejectionReason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
      }

      const rootAuthorityId = req.user.id;
      const rootAuthorityDoc = await couchDB.getIssuerById(rootAuthorityId);
      if (!rootAuthorityDoc) {
        return res.status(404).json({ success: false, message: 'Root authority issuer record not found.' });
      }

      const result = await couchDB.rootRejectSubordinateIssuer(
        issuerId,
        rootAuthorityId,
        rejectionReason
      );

      const subordinateDoc = await couchDB.getIssuerById(issuerId);

      let blockchainWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway not provided');
        }

        const identityName = rootAuthorityDoc.fabricIdentity;
        const orgName = rootAuthorityDoc.orgName;

        const cg = await getContractAndGateway(identityName, orgName);
        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogRootSubordinateRejection',
          issuerId,
          subordinateDoc.email,
          subordinateDoc.orgName,
          rootAuthorityId,
          rootAuthorityDoc.orgName || rootAuthorityDoc.contactName || rootAuthorityDoc.email,
          rejectionReason
        );
      } catch (bcErr) {
        blockchainWarning = bcErr?.message || String(bcErr);
        console.error('[rootRejectSubordinateIssuer] Blockchain log failed:', blockchainWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      try {
        await couchDB.createAdminNotification({
          category: 'subordinate_root_rejected',
          title: 'Subordinate Rejected by Root',
          message: `${subordinateDoc?.orgName || issuerId} was rejected by root authority ${rootAuthorityDoc.orgName || rootAuthorityDoc.email}.`,
          issuerId,
          issuerEmail: subordinateDoc?.email || null
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create root rejection notification:', notificationError.message);
      }

      // N1: notify the SUBORDINATE issuer (their own account) in-app.
      try {
        await couchDB.createNotification({
          targetRole: 'issuer', issuerId, issuerEmail: subordinateDoc?.email || null,
          category: 'subordinate_root_rejected',
          title: 'Update on your subordinate application',
          message: `Your root authority did not approve your application.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`
        });
      } catch (e) { console.warn('[ISSUER NOTIFICATION] root-reject:', e.message); }

      // F28 + G3: email the subordinate that its root authority rejected it,
      // fire-and-forget so the action responds immediately.
      if (subordinateDoc?.email) {
        mailerService.sendMailFireAndForget({
          to: subordinateDoc.email,
          subject: 'Update on Your ChainCert Subordinate Application',
          html: mailerService.renderEmail({
            heading: 'Not Approved by Root Authority',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${subordinateDoc.orgName || 'Applicant'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Your subordinate issuer application was <strong style="color:#b91c1c;">not approved</strong> by your root authority, <strong>${rootAuthorityDoc.orgName || rootAuthorityDoc.email}</strong>.</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${rejectionReason}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">You may address the points above and submit a new application.</p>`
          }),
          text: `Dear ${subordinateDoc.orgName || 'Applicant'},\n\nYour subordinate issuer application was not approved by your root authority (${rootAuthorityDoc.orgName || rootAuthorityDoc.email}).\nReason: ${rejectionReason}\n\nYou may submit a new application.`
        }, '[rootRejectSubordinateIssuer]');
      }

      return res.status(200).json({
        success: true,
        message: blockchainWarning
          ? 'Subordinate issuer root-rejected, but blockchain log failed.'
          : 'Subordinate issuer root-rejected successfully.',
        warning: blockchainWarning,
        data: result
      });
    } catch (error) {
      console.error('Error root-rejecting subordinate issuer:', error);

      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }

      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  // =========================================================================================================
// ROOT AUTHORITY BLOCKCHAIN LOGS
// =========================================================================================================

GetRootSubordinateLogsByRootAuthority: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (req.user.role !== 'issuer') {
      return res.status(403).json({ success: false, message: 'Issuer access required.' });
    }

    const rootAuthorityId = req.user.id;
    const rootAuthorityDoc = await couchDB.getIssuerById(rootAuthorityId);

    if (!rootAuthorityDoc) {
      return res.status(404).json({
        success: false,
        message: 'Root authority issuer record not found.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const identityName = rootAuthorityDoc.fabricIdentity;
    const orgName = rootAuthorityDoc.orgName;

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction(
      'GetRootSubordinateLogsByRootAuthority',
      rootAuthorityId
    );

    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching root subordinate logs by root authority:', error);
    return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

GetRootSubordinateApprovalLogsByRootAuthority: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (req.user.role !== 'issuer') {
      return res.status(403).json({ success: false, message: 'Issuer access required.' });
    }

    const rootAuthorityId = req.user.id;
    const rootAuthorityDoc = await couchDB.getIssuerById(rootAuthorityId);

    if (!rootAuthorityDoc) {
      return res.status(404).json({
        success: false,
        message: 'Root authority issuer record not found.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const identityName = rootAuthorityDoc.fabricIdentity;
    const orgName = rootAuthorityDoc.orgName;

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction(
      'GetRootSubordinateApprovalLogsByRootAuthority',
      rootAuthorityId
    );

    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate approval logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching root subordinate approval logs by root authority:', error);
    return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

GetRootSubordinateRejectionLogsByRootAuthority: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (req.user.role !== 'issuer') {
      return res.status(403).json({ success: false, message: 'Issuer access required.' });
    }

    const rootAuthorityId = req.user.id;
    const rootAuthorityDoc = await couchDB.getIssuerById(rootAuthorityId);

    if (!rootAuthorityDoc) {
      return res.status(404).json({
        success: false,
        message: 'Root authority issuer record not found.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const identityName = rootAuthorityDoc.fabricIdentity;
    const orgName = rootAuthorityDoc.orgName;

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction(
      'GetRootSubordinateRejectionLogsByRootAuthority',
      rootAuthorityId
    );

    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate rejection logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching root subordinate rejection logs by root authority:', error);
    return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
}
};

module.exports = rootAuthorityController;
