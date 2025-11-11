const nano = require('nano');
const bcryptjs = require('bcryptjs');

const COUCHDB_URL = 'http://admin:adminpw@localhost:5985';
const couch = nano(COUCHDB_URL);

let usersDb = null;
let issuersDB = null;
let notificationsDb = null;
let deploymentsDb = null;
let accreditedOrgsDb = null; // List of fully accredited orgs

async function initializeDatabases() {
  try {
    usersDb = couch.use('users');
    issuersDB = couch.use('issuers');
    notificationsDb = couch.use('notifications');
    deploymentsDb = couch.use('deployments');
    accreditedOrgsDb = couch.use('accredited_organizations');
    console.log('✅ CouchDB databases selected');
  } catch (error) {
    console.error('⚠️  Error initializing databases:', error.message);
    throw error;
  }
}

// User functions
async function saveUser(user) {
  if (!usersDb) await initializeDatabases();
  if (user.password && !user.password.startsWith('$2b$')) {
    user.password = await bcryptjs.hash(user.password, 10);
  }
  return await usersDb.insert(user);
}

async function getUser(id) {
  if (!usersDb) await initializeDatabases();
  return await usersDb.get(id);
}

async function getAllUsers() {
  if (!usersDb) await initializeDatabases();
  const result = await usersDb.list({ include_docs: true });
  return result.rows.map(row => row.doc);
}

// Accredited Organizations
async function saveAccreditedOrganization(org) {
  if (!accreditedOrgsDb) await initializeDatabases();
  return await accreditedOrgsDb.insert(org);
}

async function getAllAccreditedOrganizations() {
  if (!accreditedOrgsDb) await initializeDatabases();
  const result = await accreditedOrgsDb.list({ include_docs: true });
  return result.rows
    .filter(row => row.doc && !row.id.startsWith('_design/'))
    .map(row => row.doc);
}

// ✅ NEW: Check if organization is accredited
async function checkIfOrgAccredited(orgName) {
  try {
    if (!accreditedOrgsDb) await initializeDatabases();
    
    console.log(`[COUCHDB] Checking if "${orgName}" is accredited...`);

    // Search for the organization by name (try multiple possible field names)
    const result = await accreditedOrgsDb.find({
      selector: {
        $or: [
          { organizationName: orgName },
          { name: orgName },
          { orgName: orgName }
        ]
      },
      limit: 1
    });

    if (result.docs && result.docs.length > 0) {
      console.log(`[COUCHDB] ✅ "${orgName}" is ACCREDITED!`);
      const accreditedOrg = result.docs[0];
      return {
        isAccredited: true,
        accreditedType: accreditedOrg.type || accreditedOrg.accreditationType || 'Accredited'
      };
    } else {
      console.log(`[COUCHDB] ❌ "${orgName}" is NOT accredited`);
      return {
        isAccredited: false,
        accreditedType: null
      };
    }
  } catch (error) {
    console.error(`[COUCHDB] Error checking accreditation:`, error.message);
    return {
      isAccredited: false,
      accreditedType: null
    };
  }
}

// ===== ISSUER FUNCTIONS =====
async function createIssuerRegistration(issuerData) {
  if (!issuersDB) await initializeDatabases();

  console.log('[COUCHDB] Creating issuer registration with data:', {
    orgName: issuerData.orgName,
    accredited: issuerData.accredited,
    accreditedType: typeof issuerData.accredited
  });

  // ✅ CHECK IF ORG IS ACCREDITED
  const accreditationCheck = await checkIfOrgAccredited(issuerData.orgName);

  const issuerDoc = {
    _id: `issuer_${issuerData.email.replace(/@/g, '_').replace(/\./g, '_')}_${Date.now()}`,
    type: 'issuer_registration',
    role: 'issuer',
    orgName: issuerData.orgName,
    contactName: issuerData.contactName,
    email: issuerData.email,
    password: issuerData.password,
    documents: issuerData.documents || [],
    accredited: accreditationCheck.isAccredited,  // ✅ SET FROM CHECK
    accreditedType: accreditationCheck.accreditedType,  // ✅ SET FROM CHECK
    status: 'pending',
    createdAt: new Date().toISOString(),
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null
  };

  console.log('[COUCHDB] Final issuer doc before insert:', {
    _id: issuerDoc._id,
    accredited: issuerDoc.accredited,
    accreditedType: issuerDoc.accreditedType
  });

  return await issuersDB.insert(issuerDoc);
}

async function getPendingIssuers() {
  if (!issuersDB) await initializeDatabases();
  const result = await issuersDB.find({
    selector: {
      type: 'issuer_registration',
      status: 'pending'
    },
    sort: ['createdAt']
  });
  return result.docs;
}

async function getIssuerById(issuerId) {
  if (!issuersDB) await initializeDatabases();
  return await issuersDB.get(issuerId);
}

async function approveIssuer(issuerId, adminId) {
  if (!issuersDB) await initializeDatabases();

  console.log(`[COUCHDB] Approving issuer: ${issuerId}`);

  const issuerDoc = await issuersDB.get(issuerId);

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

  await issuersDB.insert(issuerDoc);

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
  if (!issuersDB) await initializeDatabases();
  const issuerDoc = await issuersDB.get(issuerId);
  issuerDoc.status = 'rejected';
  issuerDoc.rejectionReason = rejectionReason;
  issuerDoc.rejectedAt = new Date().toISOString();
  return await issuersDB.insert(issuerDoc);
}

async function getApprovedIssuer(email) {
  if (!issuersDB) await initializeDatabases();
  const result = await issuersDB.find({
    selector: {
      type: 'issuer_registration',
      email: email,
      status: 'approved'
    }
  });
  return result.docs.length > 0 ? result.docs[0] : null;
}

// ===== NOTIFICATION FUNCTIONS =====
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

// ===== DEPLOYMENT FUNCTIONS =====
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
  issuersDB: issuersDB,
  initializeDatabases,
  saveUser,
  getUser,
  getAllUsers,
  checkIfOrgAccredited,  // ✅ EXPORT NEW FUNCTION
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
  getDeploymentByEmail,
  saveAccreditedOrganization,
  getAllAccreditedOrganizations
};
