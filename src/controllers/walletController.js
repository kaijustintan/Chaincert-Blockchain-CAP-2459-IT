const couchDB = require('../couchDB_service');

// ==========================================================================================
// M1 (Phase 5 hardening): OWNERSHIP HELPERS  (fixes BOLA / IDOR — KB Z-3, CWE-639)
// ------------------------------------------------------------------------------------------
// LAYMAN (Tropang Ex): Dati, basta nag-request ka ng "credentials ni user X", binibigay agad —
// kahit hindi ikaw si X. Pwede mong palitan yung ID sa URL at makita ang buong wallet ng iba.
// Ngayon, kinukuha natin kung sino ka galing sa TOKEN mo (req.user.id), hindi sa ID na pinasa
// ng browser, tapos cinecheck kung sa'yo nga ba talaga yung hinihingi mong record.
// TECHNICAL: The authenticated identity is the JWT subject (req.user.id), which equals the
// holderID stored on credential/notification docs. Reads are scoped to req.user.id; mutations
// verify the target object belongs to req.user.id before touching it. Never trust the URL/body id.
// ==========================================================================================

// Strip the storage-prefix so blockchainId / _id / cred-id forms all compare equal.
const stripCredPrefix = (value) =>
  String(value || '').replace(/^user_cred_/, '').replace(/^issuer_cred_/, '');

// Returns true only if `credentialId` (in any of its id forms) belongs to `holderId`.
async function holderOwnsCredential(holderId, credentialId) {
  const target = stripCredPrefix(credentialId);
  if (!holderId || !target) return false;

  const ownDocs = await couchDB.getUserCredentialsByHolderId(holderId);
  return (ownDocs || []).some((doc) => {
    const ids = [doc._id, doc.blockchainId, doc.credentialId, doc.id]
      .filter(Boolean)
      .map(stripCredPrefix);
    return ids.includes(target);
  });
}

// Returns true only if `notificationId` belongs to `holderId`.
async function holderOwnsNotification(holderId, notificationId) {
  if (!holderId || !notificationId) return false;
  const notifs = await couchDB.getUserNotifications(holderId);
  return (notifs || []).some((n) => n && n._id === notificationId);
}

const walletController = {
  getUserCredentials: async (req, res) => {
    try {
      const { holderID } = req.params;
      const authedId = req.user?.id;

      // M1: identity comes from the token, not the URL.
      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (holderID && holderID !== authedId) {
        return res.status(403).json({ success: false, message: 'You can only access your own credentials.' });
      }

      const credentials = await couchDB.getUserCredentialsByHolderId(authedId);

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
      const authedId = req.user?.id;

      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required' });
      }
      if (!visibility || !['public', 'private'].includes(visibility)) {
        return res.status(400).json({ success: false, message: 'visibility must be "public" or "private"' });
      }

      // M1: only the credential's owner may change its visibility.
      const owns = await holderOwnsCredential(authedId, credentialId);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'You can only modify your own credentials.' });
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
      console.error('[WALLET CONTROLLER] Error updating credential visibility:', error);
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

      // Already owner-scoped: the service looks up the template under THIS issuer's CouchDB.
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
      const authedId = req.user?.id;

      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required' });
      }
      if (newOrder === undefined || newOrder === null || typeof newOrder !== 'number') {
        return res.status(400).json({ success: false, message: 'newOrder must be a number' });
      }

      // M1: only the credential's owner may reorder it.
      const owns = await holderOwnsCredential(authedId, credentialId);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'You can only modify your own credentials.' });
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
      console.error('[WALLET CONTROLLER] Error updating credential order:', error);
      return res.status(500).json({ success: false, message: `Error updating order: ${error.message}` });
    }
  },

  getUserNotifications: async (req, res) => {
    try {
      const { holderID } = req.params;
      const authedId = req.user?.id;

      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (holderID && holderID !== authedId) {
        return res.status(403).json({ success: false, message: 'You can only access your own notifications.' });
      }

      const notifications = await couchDB.getUserNotifications(authedId);

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
      const authedId = req.user?.id;

      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (holderID && holderID !== authedId) {
        return res.status(403).json({ success: false, message: 'You can only access your own notifications.' });
      }

      const notifications = await couchDB.getUnreadUserNotifications(authedId);

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
      const authedId = req.user?.id;

      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (!notificationId) {
        return res.status(400).json({
          success: false,
          message: 'notificationId is required'
        });
      }

      // M1: only the notification's owner may mark it read.
      const owns = await holderOwnsNotification(authedId, notificationId);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'You can only modify your own notifications.' });
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
