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


// ===== USER FUNCTIONS =====
async function saveUser(user) {
  if (!usersDb) await initializeDatabases();
  if (user.password && !user.password.startsWith('$2b$')) {
    user.password = await bcryptjs.hash(user.password, 10);
  }
  return await usersDb.insert(user);
}


async function getUser(userId) {
  try {
    // ✅ Smart DB logic: Check the ID prefix
    const db = userId.startsWith('issuer_') ? issuersDB : usersDb;
    const user = await db.get(userId); // Use the correct DB
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}


async function getAllUsers() {
  if (!usersDb) await initializeDatabases();
  const result = await usersDb.list({ include_docs: true });
  return result.rows.map(row => row.doc);
}


// ✅ NEWLY ADDED FUNCTION (For Change Password in settings)
async function updateUser(userId, userData) {
  try {
    // ✅ Smart DB logic: Check the ID prefix
    const db = userId.startsWith('issuer_') ? issuersDB : usersDb;
    
    const currentDoc = await db.get(userId); // Get from correct DB
    
    const updatedDoc = {
      ...currentDoc,
      ...userData,
      _id: currentDoc._id,
      _rev: currentDoc._rev
    };
    
    const response = await db.insert(updatedDoc); // Insert into correct DB
    console.log('User/Issuer updated successfully:', response);
    return response;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}


// ✅ NEWLY ADDED - For Profile Summary
async function updateProfile(userId, profileData) {
  try {
    // ✅ Smart DB logic: Check the ID prefix
    const db = userId.startsWith('issuer_') ? issuersDB : usersDb;


    const currentDoc = await db.get(userId); // Get from correct DB
    
    // Update profile fields
    const updatedDoc = {
      ...currentDoc,
      summary: profileData.summary || currentDoc.summary || '',
      isPublic: profileData.isPublic !== undefined ? profileData.isPublic : currentDoc.isPublic,
      profileUpdatedAt: new Date(),
      _id: currentDoc._id,
      _rev: currentDoc._rev
    };
    
    const response = await db.insert(updatedDoc); // Insert into correct DB
    console.log('Profile updated successfully:', response);
    return response;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}


async function updateProfilePicture(userId, imageUrl) {
  try {
    const user = await usersDb.get(userId);
    user.profilePicture = imageUrl;
    const result = await usersDb.insert(user);
    console.log('Profile picture updated:', result);
    return result;
  } catch (error) {
    console.error('Error updating profile picture:', error);
    throw error;
  }
}


// ===== ACCREDITED ORGANIZATIONS FUNCTIONS =====
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
async function createIssuerRegistration(issuerData, accreditationCheck) {
  if (!issuersDB) await initializeDatabases();


  console.log('[COUCHDB] Creating issuer registration with data:', {
    orgName: issuerData.orgName,
    accredited: accreditationCheck.isAccredited,
    accreditedType: accreditationCheck.accreditedType
  });


  const issuerDoc = {
    _id: `issuer_${issuerData.email.replace(/@/g, '_').replace(/\./g, '_')}_${Date.now()}`,
    type: 'issuer_registration',
    role: 'issuer',
    orgName: issuerData.orgName,
    contactName: issuerData.contactName,
    email: issuerData.email,
    password: issuerData.password,
    documents: issuerData.documents || [],
    accredited: accreditationCheck.isAccredited,
    accreditedType: accreditationCheck.accreditedType,
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


async function getIssuerByEmail(email) {
  if (!issuersDB) await initializeDatabases();
  const result = await issuersDB.find({
    selector: {
      email: email
    }
  });
  return result.docs.length > 0 ? result.docs[0] : null;
}


// ✅ APPROVE ISSUER with wallet and couchDB setup
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


  // DYNAMIC identity assignment (no spaces, all lowercase)
  if (issuerDoc.orgName) {
    const fabricId = issuerDoc.orgName.trim().toLowerCase().replace(/\s+/g, '') + '-admin';
    issuerDoc.fabricIdentity = fabricId;
  } else {
    issuerDoc.fabricIdentity = undefined;
  }


  // ===== NEW: Attach CouchDB connection info via normalized orgName =====
  const normalizedOrgName = issuerDoc.orgName.toLowerCase().replace(/\s+/g, "");
  const nanoAdmin = require('nano')('http://admin:adminpw@localhost:5985');
  const connDb = nanoAdmin.use('couchdb_connections');
  const result = await connDb.find({ selector: { orgName: normalizedOrgName } });
  if (result.docs.length > 0) {
    issuerDoc.couchDBUrl = result.docs[0].couchDBUrl;
    console.log(`[COUCHDB] Assigned couchDBUrl for issuer:`, issuerDoc.couchDBUrl);
  } else {
    throw new Error('No CouchDB connection found for org: ' + normalizedOrgName);
  }
  // ===== END NEW BLOCK =====


  // WALLET ID GENERATION
  const walletId = `wallet_${Date.now()}`;
  issuerDoc.walletId = walletId;


  issuerDoc.status = 'approved';
  issuerDoc.approvedBy = adminId;
  issuerDoc.approvedAt = new Date().toISOString();


  await issuersDB.insert(issuerDoc);
  console.log(`[COUCHDB] Issuer status updated to 'approved'`);


  return {
    _id: issuerDoc._id,
    contactName: issuerDoc.contactName,
    email: issuerDoc.email,
    orgName: issuerDoc.orgName,
    status: issuerDoc.status,
    fabricIdentity: issuerDoc.fabricIdentity,
    couchDBUrl: issuerDoc.couchDBUrl,
    walletId: issuerDoc.walletId,
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


// ===== CREDENTIAL CATALOG FUNCTIONS =====
async function saveCredentialCatalog(credentialCatalog, issuerDoc) {
  if (!issuerDoc || !issuerDoc.couchDBUrl) {
    throw new Error('issuerDoc with couchDBUrl is required');
  }
  // Create nano instance for this org's CouchDB
  const nanoOrg = require('nano')(issuerDoc.couchDBUrl);
  const orgDb = nanoOrg.use('credentials');
  const doc = {
    ...credentialCatalog,
    type: 'credential_catalog',
    _id: `catalog_${credentialCatalog.issuerID}_${Date.now()}`
  };
  return await orgDb.insert(doc);
}


// ===== CREDENTIAL INSTANCE FUNCTIONS (For the 2-step process) =====


// Save credential metadata to CouchDB FIRST (Step 1)
async function saveCredentialToCouchDB(credentialData, issuerDoc) {
  if (!issuerDoc || !issuerDoc.couchDBUrl) {
    throw new Error('issuerDoc with couchDBUrl is required');
  }
  
  // Use the issuer's own CouchDB
  const nanoOrg = require('nano')(issuerDoc.couchDBUrl);
  const orgDb = nanoOrg.use('wallet_issuer_credentials');
  
  const doc = {
    _id: `credential_${credentialData.id}_${Date.now()}`,
    type: 'credential_instance',
    credentialId: credentialData.id,
    holderID: credentialData.holderID || '',
    issuerID: credentialData.issuerID,
    credentialType: credentialData.credentialType,
    credentialName: credentialData.credentialName,
    description: credentialData.description || '',
    expiryDate: credentialData.expiryDate || null,
    metadata: credentialData.metadata || '',
    documentHash: credentialData.documentHash || '',
    status: 'pending_blockchain',
    blockchainSynced: false,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  
  console.log(`[COUCHDB] Saving credential to ${issuerDoc.couchDBUrl}/wallet_issuer_credentials`);
  return await orgDb.insert(doc);
}


// Update credential status after blockchain write (Step 2)
async function updateCredentialStatus(credentialId, status, issuerDoc) {
  if (!issuerDoc || !issuerDoc.couchDBUrl) {
    throw new Error('issuerDoc with couchDBUrl is required');
  }
  
  const nanoOrg = require('nano')(issuerDoc.couchDBUrl);
  const orgDb = nanoOrg.use('wallet_issuer_credentials');
  
  // Find the credential doc
  const result = await orgDb.find({
    selector: {
      type: 'credential_instance',
      credentialId: credentialId
    },
    limit: 1
  });
  
  if (result.docs.length === 0) {
    throw new Error(`Credential ${credentialId} not found in CouchDB`);
  }
  
  const doc = result.docs[0];
  doc.status = status;
  doc.blockchainSynced = (status === 'synced');
  doc.lastUpdated = new Date().toISOString();
  
  console.log(`[COUCHDB] Updating credential ${credentialId} status to: ${status}`);
  return await orgDb.insert(doc);
}


// ✅ DEPRECATED: Use saveIssuedCredentialToBothDBs instead
async function saveCredentialToIssuerWallet(issuerEmail, credentialData) {
  try {
    const issuer = await getIssuerByEmail(issuerEmail);
    
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`❌ Issuer ${issuerEmail} has no CouchDB URL configured`);
    }


    // ✅ Use the issuer's couchDBUrl directly
    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const walletDb = issuerCouch.use('wallet_issuer_credentials');
    
    // ✅ Ensure credential has all required fields
    const credentialWithMeta = {
      ...credentialData,
      _id: `cred_${credentialData.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'credential_instance',
      issuerEmail: issuerEmail,
      createdAt: new Date().toISOString(),
      status: credentialData.status || 'pending'
    };
    
    return await walletDb.insert(credentialWithMeta);
    
  } catch (error) {
    console.error(`❌ Error saving credential to issuer wallet:`, error.message);
    throw error;
  }
}


// ✅ NEW: Save issued credential to BOTH CouchDB instances
// ✅ FIXED: Save issued credential to BOTH CouchDB instances (AFTER blockchain)
async function saveIssuedCredentialToBothDBs(issuerEmail, credentialData) {
  try {
    // 1️⃣ Get issuer info
    if (!issuersDB) await initializeDatabases();
    const issuer = await getIssuerByEmail(issuerEmail);
    
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`❌ Issuer ${issuerEmail} has no CouchDB URL configured`);
    }


    // ✅ Use blockchain-provided ID (deterministic)
    const blockchainId = credentialData.id || credentialData.blockchainId;
    
    if (!blockchainId) {
      throw new Error('❌ No blockchain ID provided in credentialData');
    }


    // 2️⃣ SAVE TO ISSUER'S COUCHDB (DLSU's CouchDB at issuer.couchDBUrl)
    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const issuerWalletDb = issuerCouch.use('issued_credentials');  // ✅ FIXED: changed from wallet_issuer_credentials
    
    const credentialDoc = {
      ...credentialData,
      _id: `issuer_cred_${blockchainId}`,  // ✅ Use blockchain ID
      type: 'credential_instance',
      issuerEmail: issuerEmail,
      issuerID: issuer._id,
      issuerName: issuer.orgName || issuer.contactName,
      blockchainId: blockchainId,
      savedToCouchDBAt: new Date().toISOString(),
      status: credentialData.status || 'issued'
    };
    
    console.log(`[COUCHDB] 1️⃣ Saving to ISSUER DB: ${issuer.couchDBUrl}/issued_credentials`);
    const issuerResult = await issuerWalletDb.insert(credentialDoc);
    console.log(`[COUCHDB] ✅ Issuer DB save success:`, issuerResult.id);


    // 3️⃣ SAVE TO ADMIN COUCHDB (Main CouchDB for user wallets at localhost:5985)
    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');
    
    const userCredentialDoc = {
      ...credentialDoc,
      _id: `user_cred_${blockchainId}`,  // ✅ Use blockchain ID
      holderID: credentialData.holderID,
      savedToUserWalletAt: new Date().toISOString()
    };
    
    console.log(`[COUCHDB] 2️⃣ Saving to ADMIN DB: ${COUCHDB_URL}/wallet_user_credentials`);
    const adminResult = await userWalletDb.insert(userCredentialDoc);
    console.log(`[COUCHDB] ✅ Admin DB save success:`, adminResult.id);


    return {
      success: true,
      issuerSave: issuerResult,
      adminSave: adminResult,
      message: 'Credential saved to both databases successfully'
    };
    
  } catch (error) {
    console.error(`❌ Error saving credential to both DBs:`, error.message);
    throw error;
  }
}


async function getCredentialsByIssuerEmail(issuerEmail) {
  try {
    if (!issuersDB) await initializeDatabases();
    const issuer = await getIssuerByEmail(issuerEmail);
    
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`❌ Issuer ${issuerEmail} has no CouchDB URL configured`);
    }


    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const walletDb = issuerCouch.use('wallet_issuer_credentials');
    
    const result = await walletDb.find({
      selector: {
        type: 'credential_instance',
        issuerEmail: issuerEmail
      }
    });
    
    console.log(`[COUCHDB] Found ${result.docs.length} credentials for ${issuerEmail}`);
    return result.docs;
    
  } catch (error) {
    console.error(`❌ Error fetching credentials:`, error.message);
    return [];
  }
}


// ✅ NEW: Get credentials by issuer ID (using the issuer doc directly)
async function getCredentialsByIssuerId(issuerId) {
  try {
    if (!issuersDB) await initializeDatabases();
    const issuer = await getIssuerById(issuerId);
    
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`❌ Issuer ${issuerId} has no CouchDB URL configured`);
    }


    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const walletDb = issuerCouch.use('wallet_issuer_credentials');
    
    const result = await walletDb.find({
      selector: {
        type: 'credential_instance'
      }
    });
    
    console.log(`[COUCHDB] Found ${result.docs.length} credentials for issuer ${issuerId}`);
    return result.docs;
    
  } catch (error) {
    console.error(`❌ Error fetching credentials:`, error.message);
    return [];
  }
}


// ✅ NEW FUNCTION: Get issuer credentials (for the GET route)
async function getIssuerCredentials(issuerId) {
  try {
    console.log(`[COUCHDB] Fetching credentials for issuer: ${issuerId}`);
    
    if (!issuersDB) await initializeDatabases();
    
    // Get the issuer document to access their CouchDB URL
    const issuer = await getIssuerById(issuerId);
    
    if (!issuer) {
      throw new Error(`Issuer ${issuerId} not found`);
    }
    
    if (!issuer.couchDBUrl) {
      console.log(`[COUCHDB] ⚠️ Issuer has no CouchDB URL configured`);
      return [];
    }
    
    // Connect to the issuer's CouchDB and fetch credentials
    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const walletDb = issuerCouch.use('wallet_issuer_credentials');
    
    // Fetch all credential_instance documents
    const result = await walletDb.find({
      selector: {
        type: 'credential_instance'
      }
    });
    
    console.log(`[COUCHDB] ✅ Found ${result.docs.length} credentials for issuer ${issuerId}`);
    
    // Return with issuer metadata
    return {
      issuerId: issuerId,
      issuerName: issuer.orgName || issuer.contactName,
      email: issuer.email,
      credentialCount: result.docs.length,
      credentials: result.docs
    };
    
  } catch (error) {
    console.error(`[COUCHDB] ❌ Error fetching issuer credentials:`, error.message);
    throw error;
  }
}


// ✅ NEW: Get credentials by holder ID (from ADMIN CouchDB)
async function getCredentialsByHolderId(holderID) {
  try {
    console.log(`[COUCHDB] Fetching credentials for holder: ${holderID}`);
    
    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');
    
    const result = await userWalletDb.find({
      selector: {
        holderID: holderID
      }
    });
    
    console.log(`[COUCHDB] ✅ Found ${result.docs.length} credentials for holder ${holderID}`);
    return result.docs;
    
  } catch (error) {
    console.error(`[COUCHDB] ❌ Error fetching credentials by holder:`, error.message);
    return [];
  }
}


async function deleteCredentialByIssuer(credentialId, issuerEmail) {
  try {
    const issuer = await getIssuerByEmail(issuerEmail);
    
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`Issuer ${issuerEmail} not found`);
    }


    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const walletDb = issuerCouch.use('wallet_issuer_credentials');
    
    const result = await walletDb.find({
      selector: {
        type: 'credential_instance',
        _id: credentialId
      },
      limit: 1
    });
    
    if (result.docs.length === 0) {
      throw new Error(`Credential ${credentialId} not found`);
    }
    
    const doc = result.docs[0];
    await walletDb.destroy(doc._id, doc._rev);
    
    console.log(`[COUCHDB] Credential ${credentialId} deleted`);
    return { success: true };
    
  } catch (error) {
    console.error(`Error deleting credential:`, error.message);
    throw error;
  }
}


async function revokeCredential(credentialId, issuerEmail) {
  try {
    const issuer = await getIssuerByEmail(issuerEmail);
    
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`Issuer ${issuerEmail} not found`);
    }


    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const walletDb = issuerCouch.use('wallet_issuer_credentials');
    
    const result = await walletDb.find({
      selector: {
        _id: credentialId
      },
      limit: 1
    });
    
    if (result.docs.length === 0) {
      throw new Error(`Credential ${credentialId} not found`);
    }
    
    const doc = result.docs[0];
    doc.status = 'revoked';
    doc.revokedAt = new Date().toISOString();
    await walletDb.insert(doc);
    
    console.log(`[COUCHDB] Credential ${credentialId} revoked`);
    return { success: true, message: 'Credential revoked successfully' };
    
  } catch (error) {
    console.error(`Error revoking credential:`, error.message);
    throw error;
  }
}


// ✅ UPDATED: Verify Credential from CouchDB (with ID cleaning for verification)
async function verifyCredentialFromCouchDB(credentialId) {
  try {
    console.log(`[COUCHDB] Verifying credential: ${credentialId}`);
    
    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');
    
    // ✅ Clean the credential ID (remove double prefix if exists)
    const cleanId = credentialId.replace(/^user_cred_/, '');
    const searchId = `user_cred_${cleanId}`;
    
    console.log(`[COUCHDB] Searching for ID: ${searchId}`);
    
    const result = await userWalletDb.find({
      selector: {
        _id: searchId
      },
      limit: 1
    });
    
    if (result.docs.length === 0) {
      console.log(`[COUCHDB] ❌ Credential not found: ${searchId}`);
      return {
        verified: false,
        message: 'Credential not found in database',
        credentialId: searchId,
        timestamp: new Date().toISOString()
      };
    }
    
    const credential = result.docs[0];
    
    console.log(`[COUCHDB] ✅ Credential verified: ${credential._id}`);
    
    return {
      verified: true,
      credentialId: credential.blockchainId || credential.credentialId || credential._id,
      holderID: credential.holderID,
      issuerName: credential.issuerName,
      credentialType: credential.credentialType,
      credentialName: credential.credentialName,
      status: credential.status,
      issuedAt: credential.savedToUserWalletAt || credential.createdAt,
      expiryDate: credential.expiryDate,
      message: 'Credential verified successfully',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[COUCHDB] ❌ Error verifying credential:`, error.message);
    return {
      verified: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}


module.exports = {
  // Core initialization
  nano,
  couch,
  issuersDB,
  initializeDatabases,


  // User functions
  saveUser,
  getUser,
  updateUser,
  updateProfile,
  updateProfilePicture,
  getAllUsers,


  // Accreditation
  checkIfOrgAccredited,
  saveAccreditedOrganization,
  getAllAccreditedOrganizations,


  // Issuer lifecycle
  createIssuerRegistration,
  getPendingIssuers,
  getIssuerById,
  getIssuerByEmail,
  approveIssuer,
  rejectIssuer,
  getApprovedIssuer,


  // Notifications
  createNotification,
  getAllNotifications,
  getUnreadNotifications,
  markNotificationAsRead,


  // Deployments
  saveDeploymentInfo,
  getDeploymentByEmail,


  // Credentials (Star Feature!)
  saveCredentialCatalog,
  saveCredentialToCouchDB,
  updateCredentialStatus,
  saveCredentialToIssuerWallet,          // ⚠️ DEPRECATED but kept for compatibility
  saveIssuedCredentialToBothDBs,         // ✅ NEW - Use this!
  getCredentialsByIssuerEmail,
  getCredentialsByIssuerId,
  getCredentialsByHolderId,
  getIssuerCredentials,
  deleteCredentialByIssuer,
  revokeCredential,
  verifyCredentialFromCouchDB            // ✅ UPDATED: Now properly cleans credential IDs
};
