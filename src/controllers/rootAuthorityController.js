const couchDB = require('../couchDB_service');

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
      return res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: error.message });
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

      return res.status(500).json({ success: false, message: error.message });
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

      return res.status(500).json({ success: false, message: error.message });
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
    return res.status(500).json({ success: false, message: error.message });
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
    return res.status(500).json({ success: false, message: error.message });
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
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
}
};

module.exports = rootAuthorityController;
