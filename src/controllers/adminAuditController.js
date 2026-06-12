const couchDB = require('../couchDB_service');
const { sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2 (M9)

const adminAuditController = {
  Disable_User: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      const { userId } = req.params;
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

      const user = await couchDB.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const previousStatus = user.isActive ? 'active' : 'disabled';

      if (!user.isActive) {
        return res.status(400).json({ success: false, message: 'User is already disabled.' });
      }

      await couchDB.Disable_User(userId, adminEmail, reason);

      let blockchainLogWarning = null;
      const identityName = 'chaincert-admin';
      const orgName = 'Org1';

      if (typeof getContractAndGateway === 'function') {
        const cg = await getContractAndGateway(identityName, orgName);
        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogUserStatusChange',
          user.email,
          previousStatus,
          'disabled',
          reason,
          adminEmail
        );
      }

      return res.status(200).json({
        success: true,
        message: blockchainLogWarning
          ? 'User disabled successfully, but blockchain log failed.'
          : 'User disabled successfully.',
        warning: blockchainLogWarning
      });
    } catch (error) {
      console.error('Disable_User error:', error);
      if (res.headersSent) return;
      return sendServerError(res, error, 'ADMIN-AUDIT'); // M9
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  Enable_User: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      const { userId } = req.params;
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

      const user = await couchDB.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const previousStatus = user.isActive ? 'active' : 'disabled';

      if (user.isActive) {
        return res.status(400).json({ success: false, message: 'User is already active.' });
      }

      await couchDB.Enable_User(userId, adminEmail, reason);

      let blockchainLogWarning = null;
      const identityName = 'chaincert-admin';
      const orgName = 'Org1';

      if (typeof getContractAndGateway === 'function') {
        const cg = await getContractAndGateway(identityName, orgName);
        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogUserStatusChange',
          user.email,
          previousStatus,
          'active',
          reason,
          adminEmail
        );
      }

      return res.status(200).json({
        success: true,
        message: blockchainLogWarning
          ? 'User re-enabled successfully, but blockchain log failed.'
          : 'User re-enabled successfully.',
        warning: blockchainLogWarning
      });
    } catch (error) {
      console.error('Enable_User error:', error);
      if (res.headersSent) return;
      return sendServerError(res, error, 'ADMIN-AUDIT'); // M9
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  getAllStatusLogs: async (req, res, getContractAndGateway) => {
    let gateway;
    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllStatusLogs');
      const raw = resultBuffer.toString();
      let logs;

      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      return res.status(200).json({
        success: true,
        logs: Array.isArray(logs) ? logs : [],
        count: Array.isArray(logs) ? logs.length : 0
      });
    } catch (error) {
      console.error('getAllStatusLogs error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch status logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  changeAdminPasswordSecure: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'currentPassword and newPassword are required.'
        });
      }

      const adminEmail = req.user.email;
      if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required.' });
      }

      await couchDB.changeAdminPassword(
        adminEmail,
        currentPassword,
        newPassword,
        adminEmail,
        {
          via: 'ui',
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      );

      let blockchainWarning = null;
      const changeType = 'self_change';
      const reason = '';

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway not provided');
        }

        const cg = await getContractAndGateway('chaincert-admin', 'Org1');

        if (!cg || !cg.gateway || !cg.contract) {
          throw new Error('getContractAndGateway returned an invalid connection object');
        }

        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction('LogAdminChangePassword', adminEmail, changeType, reason, adminEmail);
      } catch (bcErr) {
        blockchainWarning = bcErr?.message || String(bcErr);
        console.error('[changeAdminPasswordSecure] Blockchain log failed:', blockchainWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      return res.status(200).json({
        success: true,
        message: blockchainWarning
          ? 'Password changed, but blockchain log failed.'
          : 'Password changed successfully.',
        warning: blockchainWarning
      });
    } catch (error) {
      console.error('changeAdminPasswordSecure error:', error);
      if (res.headersSent) return;
      return sendServerError(res, error, 'ADMIN-AUDIT'); // M9
    }
  },

  getAllIssuerStatusLogs: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllIssuerStatusLogs');
      const raw = resultBuffer.toString();

      let logs;
      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      return res.status(200).json({
        success: true,
        logs: Array.isArray(logs) ? logs : [],
        count: Array.isArray(logs) ? logs.length : 0
      });
    } catch (error) {
      console.error('getAllIssuerStatusLogs error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer status logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  getAllUserStatusLogs: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllUserStatusLogs');
      const raw = resultBuffer.toString();

      let logs;
      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      return res.status(200).json({
        success: true,
        logs: Array.isArray(logs) ? logs : [],
        count: Array.isArray(logs) ? logs.length : 0
      });
    } catch (error) {
      console.error('getAllUserStatusLogs error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch user status logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  getAllIssuerDecisionLogs: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllIssuerDecisionLogs');
      const raw = resultBuffer.toString();

      let logs;
      try { logs = JSON.parse(raw || '[]'); } catch (_) { logs = []; }
      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getAllIssuerDecisionLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer decision logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  getAllIssuerApprovalLogs: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllIssuerApprovalLogs');
      const raw = resultBuffer.toString();

      let logs;
      try { logs = JSON.parse(raw || '[]'); } catch (_) { logs = []; }
      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getAllIssuerApprovalLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer approval logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  getAllIssuerRejectionLogs: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllIssuerRejectionLogs');
      const raw = resultBuffer.toString();

      let logs;
      try { logs = JSON.parse(raw || '[]'); } catch (_) { logs = []; }
      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getAllIssuerRejectionLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer rejection logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  getIssuerDecisionLogs: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { issuerEmail } = req.params;

      if (!issuerEmail) {
        return res.status(400).json({ success: false, message: 'issuerEmail is required' });
      }

      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetIssuerDecisionLogs', issuerEmail);
      const raw = resultBuffer.toString();

      let logs;
      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getIssuerDecisionLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer decision logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  getIssuerStatusLogs: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { issuerEmail } = req.params;

      if (!issuerEmail) {
        return res.status(400).json({ success: false, message: 'issuerEmail is required' });
      }

      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetIssuerStatusLogs', issuerEmail);
      const raw = resultBuffer.toString();

      let logs;
      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getIssuerStatusLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer status logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  getUserStatusLogs: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { userEmail } = req.params;

      if (!userEmail) {
        return res.status(400).json({ success: false, message: 'userEmail is required' });
      }

      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetUserStatusLogs', userEmail);
      const raw = resultBuffer.toString();

      let logs;
      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getUserStatusLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch user status logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  // =========================================================================================================
// ROOT SUBORDINATE DECISION LOGS (ADMIN AUDIT)
// =========================================================================================================

GetAllRootSubordinateLogs: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const cg = await getContractAndGateway('chaincert-admin', 'Org1');
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction('GetAllRootSubordinateLogs');
    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching all root subordinate logs:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

GetAllRootSubordinateApprovalLogs: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const cg = await getContractAndGateway('chaincert-admin', 'Org1');
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction('GetAllRootSubordinateApprovalLogs');
    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate approval logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching all root subordinate approval logs:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

GetAllRootSubordinateRejectionLogs: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const cg = await getContractAndGateway('chaincert-admin', 'Org1');
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction('GetAllRootSubordinateRejectionLogs');
    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate rejection logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching all root subordinate rejection logs:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
}
};

module.exports = adminAuditController;
