// backend/couchDB_service.js
const nano = require('nano');
const bcryptjs = require('bcryptjs');

const COUCHDB_URL = 'http://admin:adminpw@localhost:5985';
const couch = nano(COUCHDB_URL);

let organizationsDb = null;
let usersDb = null;
let issuerRegistrationsDb = null;
let notificationsDb = null;
let deploymentsDb = null;

async function initializeDatabases() {
  try {
    organizationsDb = couch.use('organizations');
    usersDb = couch.use('users');
    issuerRegistrationsDb = couch.use('issuer_registrations');
    notificationsDb = couch.use('notifications');
    deploymentsDb = couch.use('deployments');
    console.log('✅ CouchDB databases selected');
  } catch (error) {
    console.error('⚠️  Error initializing databases:', error.message);
    throw error;
  }
}

async function saveUser(user) {
  if (!usersDb) await initializeDatabases();
  
  if (user.password && !user.password.startsWith('$2b$')) {
    user.password = await bcryptjs.hash(user.password, 10);
  }
  
  return await usersDb.insert(user);
}

async function saveOrganization(org) {
  if (!organizationsDb) await initializeDatabases();
  return await organizationsDb.insert(org);
}

async function getOrganization(id) {
  if (!organizationsDb) await initializeDatabases();
  return await organizationsDb.get(id);
}

async function getUser(userId) {
  try {
    const user = await usersDb.get(userId);
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

async function getAllOrganizations() {
  if (!organizationsDb) await initializeDatabases();
  const result = await organizationsDb.list({ include_docs: true });
  return result.rows.map(row => row.doc);
}

async function getAllUsers() {
  if (!usersDb) await initializeDatabases();
  const result = await usersDb.list({ include_docs: true });
  return result.rows.map(row => row.doc);
}

// NEWLY ADDED FUNCTION (For Change Password sa settings)
async function updateUser(userId, userData) {
  try {
    const currentDoc = await usersDb.get(userId);
    
    const updatedDoc = {
      ...currentDoc,
      ...userData,
      _id: currentDoc._id,
      _rev: currentDoc._rev
    };
    
    const response = await usersDb.insert(updatedDoc);
    console.log('User updated successfully:', response);
    return response;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

//  NEWLY ADDED - For Profile Summary
async function updateProfile(userId, profileData) {
  try {
    const currentDoc = await usersDb.get(userId);
    
    // Update profile fields
    const updatedDoc = {
      ...currentDoc,
      summary: profileData.summary || currentDoc.summary || '',
      isPublic: profileData.isPublic !== undefined ? profileData.isPublic : currentDoc.isPublic,
      profileUpdatedAt: new Date(),
      _id: currentDoc._id,
      _rev: currentDoc._rev
    };
    
    const response = await usersDb.insert(updatedDoc);
    console.log('Profile updated successfully:', response);
    return response;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

async function updateOrganization(id, updates) {
  if (!organizationsDb) await initializeDatabases();
  const doc = await organizationsDb.get(id);
  const updated = { ...doc, ...updates };
  return await organizationsDb.insert(updated);
}

async function deleteOrganization(id) {
  if (!organizationsDb) await initializeDatabases();
  const doc = await organizationsDb.get(id);
  return await organizationsDb.destroy(id, doc._rev);
}

// ===== ISSUER FUNCTIONS =====
async function createIssuerRegistration(issuerData) {
  if (!issuerRegistrationsDb) await initializeDatabases();
  
  const issuerDoc = {
    _id: `issuer_${issuerData.email.replace(/@/g, '_').replace(/\./g, '_')}_${Date.now()}`,
    type: 'issuer_registration',
    role: 'issuer',
    orgName: issuerData.orgName,
    contactName: issuerData.contactName,
    email: issuerData.email,
    password: issuerData.password,
    documents: issuerData.documents || [],
    status: 'pending',
    createdAt: new Date().toISOString(),
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null
  };
  
  return await issuerRegistrationsDb.insert(issuerDoc);
}

async function getPendingIssuers() {
  if (!issuerRegistrationsDb) await initializeDatabases();
  const result = await issuerRegistrationsDb.find({
    selector: {
      type: 'issuer_registration',
      status: 'pending'
    },
    sort: ['createdAt']
  });
  return result.docs;
}

async function getIssuerById(issuerId) {
  if (!issuerRegistrationsDb) await initializeDatabases();
  return await issuerRegistrationsDb.get(issuerId);
}

async function approveIssuer(issuerId, adminId) {
  if (!issuerRegistrationsDb) await initializeDatabases();
  
  console.log(`[COUCHDB] Approving issuer: ${issuerId}`);
  
  const issuerDoc = await issuerRegistrationsDb.get(issuerId);
  
  console.log(`[COUCHDB] Retrieved issuer:`, {
    _id: issuerDoc._id,
    contactName: issuerDoc.contactName,
    email: issuerDoc.email,
    orgName: issuerDoc.orgName
  });
  
  issuerDoc.status = 'deploying';
  issuerDoc.approvedBy = adminId;
  issuerDoc.approvedAt = new Date().toISOString();
  issuerDoc.deployStartTime = new Date().toISOString();
  
  await issuerRegistrationsDb.insert(issuerDoc);
  
  console.log(`[COUCHDB] Issuer status updated to 'deploying'`);
  
  return {
    _id: issuerDoc._id,
    contactName: issuerDoc.contactName,
    email: issuerDoc.email,
    orgName: issuerDoc.orgName,
    status: issuerDoc.status,
    _rev: issuerDoc._rev
  };
}

async function rejectIssuer(issuerId, rejectionReason) {
  if (!issuerRegistrationsDb) await initializeDatabases();
  const issuerDoc = await issuerRegistrationsDb.get(issuerId);
  issuerDoc.status = 'rejected';
  issuerDoc.rejectionReason = rejectionReason;
  issuerDoc.rejectedAt = new Date().toISOString();
  return await issuerRegistrationsDb.insert(issuerDoc);
}

async function getApprovedIssuer(email) {
  if (!issuerRegistrationsDb) await initializeDatabases();
  const result = await issuerRegistrationsDb.find({
    selector: {
      type: 'issuer_registration',
      email: email,
      status: 'approved'
    }
  });
  return result.docs.length > 0 ? result.docs[0] : null;
}

async function createNotification(notificationData) {
  if (!notificationsDb) await initializeDatabases();
  
  const notification = {
    _id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'notification',
    category: notificationData.category || 'issuer_registration',
    title: notificationData.title,
    message: notificationData.message,
    issuerId: notificationData.issuerId,
    issuerEmail: notificationData.issuerEmail,
    createdAt: new Date().toISOString(),
    read: false,
    targetRole: notificationData.targetRole || 'admin'
  };
  
  return await notificationsDb.insert(notification);
}

async function getAllNotifications() {
  if (!notificationsDb) await initializeDatabases();
  const result = await notificationsDb.list({ include_docs: true });
  return result.rows.map(row => row.doc);
}

async function getUnreadNotifications() {
  if (!notificationsDb) await initializeDatabases();
  const result = await notificationsDb.find({
    selector: {
      type: 'notification',
      read: false
    }
  });
  return result.docs;
}

async function markNotificationAsRead(notificationId) {
  if (!notificationsDb) await initializeDatabases();
  const notif = await notificationsDb.get(notificationId);
  notif.read = true;
  notif.readAt = new Date().toISOString();
  return await notificationsDb.insert(notif);
}

async function saveDeploymentInfo(data) {
  if (!deploymentsDb) await initializeDatabases();
  
  const deploymentDoc = {
    _id: `deploy_${data.issuerEmail.replace(/@/g, '_').replace(/\./g, '_')}_${Date.now()}`,
    type: 'deployment',
    issuerEmail: data.issuerEmail,
    peerName: data.peerName,
    peerPort: data.peerPort,
    couchDBName: data.couchDBName,
    couchDBPort: data.couchDBPort,
    status: data.status || 'deployed',
    deployedAt: data.deployedAt || new Date().toISOString()
  };
  
  return await deploymentsDb.insert(deploymentDoc);
}

async function getDeploymentByEmail(issuerEmail) {
  if (!deploymentsDb) await initializeDatabases();
  const result = await deploymentsDb.find({
    selector: {
      type: 'deployment',
      issuerEmail: issuerEmail
    }
  });
  return result.docs.length > 0 ? result.docs[0] : null;
}

module.exports = {
  nano,
  couch,
  issuerRegistrationsDb: issuerRegistrationsDb,  // ✅ Exported for external access
  initializeDatabases,
  saveOrganization,
  saveUser,
  getOrganization,
  getUser,
  updateUser, // ← NEWLY ADDED - OLOPS
  updateProfile,  // ← NEWLY ADDED - OLOPS
  getAllOrganizations,
  getAllUsers,
  updateOrganization,
  deleteOrganization,
  createIssuerRegistration,
  getPendingIssuers,
  getIssuerById,
  approveIssuer,
  rejectIssuer,
  getApprovedIssuer,
  createNotification,
  getAllNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  saveDeploymentInfo,
  getDeploymentByEmail
};


