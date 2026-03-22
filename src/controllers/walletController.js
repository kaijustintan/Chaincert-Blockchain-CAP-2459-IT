const couchDB = require('../couchDB_service');

const walletController = {
  getUserCredentials: async (req, res) => {
    try {
      const { holderID } = req.params;

      if (!holderID) {
        return res.status(400).json({
          success: false,
          message: 'holderID is required'
        });
      }

      const credentials = await couchDB.getUserCredentialsByHolderId(holderID);

      return res.status(200).json({
        success: true,
        credentials: credentials || [],
        count: (credentials || []).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching user credentials:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching credentials: ${error.message}`
      });
    }
  },

  updateCredentialVisibility: async (req, res) => {
    try {
      const { credentialId } = req.params;
      const { visibility } = req.body;

      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required' });
      }
      if (!visibility || !['public', 'private'].includes(visibility)) {
        return res.status(400).json({ success: false, message: 'visibility must be "public" or "private"' });
      }

      await couchDB.updateCredentialVisibility(credentialId, visibility);

      return res.status(200).json({
        success: true,
        message: `Credential visibility updated to ${visibility}`,
        credentialId,
        visibility,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[AUTH CONTROLLER] Error updating credential visibility:', error);
      return res.status(500).json({ success: false, message: `Error updating visibility: ${error.message}` });
    }
  },

  updateIssuerTemplateVisibility: async (req, res) => {
    try {
      const { credentialId } = req.params;
      const { visibility } = req.body;
      const issuerId = req.user?.id;

      if (!issuerId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required' });
      }
      if (!visibility || !['public', 'private'].includes(visibility)) {
        return res.status(400).json({ success: false, message: 'visibility must be "public" or "private"' });
      }

      const result = await couchDB.updateIssuerTemplateVisibility(issuerId, credentialId, visibility);

      return res.status(200).json({
        success: true,
        message: `Issuer template visibility updated to ${visibility}`,
        credentialId,
        issuerId,
        visibility,
        doc: result?.doc || null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[WALLET CONTROLLER] Error updating issuer template visibility:', error);
      return res.status(500).json({ success: false, message: `Error updating issuer template visibility: ${error.message}` });
    }
  },

  updateCredentialOrder: async (req, res) => {
    try {
      const { credentialId } = req.params;
      const { newOrder } = req.body;

      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required' });
      }
      if (newOrder === undefined || newOrder === null || typeof newOrder !== 'number') {
        return res.status(400).json({ success: false, message: 'newOrder must be a number' });
      }

      await couchDB.updateCredentialOrder(credentialId, newOrder);

      return res.status(200).json({
        success: true,
        message: `Credential order updated to ${newOrder}`,
        credentialId,
        newOrder,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[AUTH CONTROLLER] Error updating credential order:', error);
      return res.status(500).json({ success: false, message: `Error updating order: ${error.message}` });
    }
  },

  getUserNotifications: async (req, res) => {
    try {
      const { holderID } = req.params;

      if (!holderID) {
        return res.status(400).json({
          success: false,
          message: 'holderID is required'
        });
      }

      const notifications = await couchDB.getUserNotifications(holderID);

      return res.status(200).json({
        success: true,
        notifications: notifications || [],
        count: (notifications || []).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching notifications: ${error.message}`
      });
    }
  },

  getUnreadUserNotifications: async (req, res) => {
    try {
      const { holderID } = req.params;

      if (!holderID) {
        return res.status(400).json({
          success: false,
          message: 'holderID is required'
        });
      }

      const notifications = await couchDB.getUnreadUserNotifications(holderID);

      return res.status(200).json({
        success: true,
        notifications: notifications || [],
        unreadCount: (notifications || []).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching unread user notifications:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching unread notifications: ${error.message}`
      });
    }
  },

  markNotificationAsRead: async (req, res) => {
    try {
      const { notificationId } = req.params;

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          message: 'notificationId is required'
        });
      }

      await couchDB.markNotificationAsRead(notificationId);

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        notificationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({
        success: false,
        message: `Error marking notification as read: ${error.message}`
      });
    }
  }
};

module.exports = walletController;
