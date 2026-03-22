// ==========================================================================================================================================================================
//                                                                       couchDB_service.js 
// ==========================================================================================================================================================================

/* [ OUTLINE ]
  =====================================================================
  FILE: couchDB_service.js
  TECHNICAL: CouchDB data access layer (users, issuers, wallets, credentials)
  TROPA: “DB middleman” – lahat ng basa/sulat sa CouchDB dito dumadaan.
  =====================================================================

  CATEGORY: CORE SETUP
  - initializeDatabases()
  - ensureDatabaseExists(name)

  CATEGORY: USER DATA (STUDENTS / ADMINS)
  - saveUser(userData)
  - getUser(id)
  - getAllUsers()
  - updateUser(id, updateFields)
  - updateProfile(userId, fields)

  CATEGORY: ISSUER REGISTRATION / STATUS
  - createIssuerRegistration(issuerData, accreditationCheck)
  - deleteIssuerDoc(docId, docRev)
  - getPendingIssuers()
  - Approve_Issuer(issuerId, adminId)
  - Reject_Issuer(issuerId, rejectionReason)
  - getApprovedIssuer(email)

  CATEGORY: ISSUER DASHBOARD / FAST CREDENTIAL VIEWS
  - getIssuerCredentials(issuerId)

  CATEGORY: ISSUED CREDENTIALS STORAGE (COPIES)
  - Issue_Credential_DB(issuerEmail, credentialDataExtended)

  CATEGORY: LOW-LEVEL EXPORTS
  - couch (nano root client)
*/

const nano = require('nano');
const bcryptjs = require('bcryptjs');
const COUCHDB_URL = 'http://admin:adminpw@localhost:5985';
const couch = nano(COUCHDB_URL);


let usersDb = null;
let issuersDB = null;
let notificationsDb = null;
let adminNotificationsDb = null;
let profileShareLinksDb = null; // Profile share links - polo

/* 
  Function Name: initializeDatabases

  Technical:
  Initializes and selects all required CouchDB databases used by the system.
  It assigns database handles (users, issuers, notifications, admin notifications, deployments)
  so they can be reused by other service functions.

  Tropang Ex:
  Parang “opening ng lahat ng folders” sa CouchDB bago magtrabaho.
  Kapag hindi pa naka-select yung DBs, walang ibang function ang pwedeng magbasa o magsulat ng data.
*/
async function initializeDatabases() {
  try {
    usersDb = couch.use('users');
    issuersDB = couch.use('issuers');
    notificationsDb = couch.use('user_notifications');
    adminNotificationsDb = couch.use('admin_notifications');
    profileShareLinksDb = couch.use('profile_share_links'); // - polo
    console.log('✅ CouchDB databases selected');
  } catch (error) {
    console.error('⚠️  Error initializing databases:', error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================
//                                                                       USER Related Functions
// ==========================================================================================================================================================================

/*
  Function Name: saveUser

  Technical:
  Saves a new user document into the users database.
  Automatically hashes the password using bcrypt if it is not yet hashed.

  Tropang Ex:
  Dito sinasave yung bagong user sa CouchDB.
  Kung plain text pa yung password, siya na ang bahalang mag-hash bago i-save.
  Kaya safe kahit may mag-leak ng DB — hindi plain password ang makikita.
*/
async function saveUser(user) {
  if (!usersDb) await initializeDatabases();
  if (user.password && !user.password.startsWith('$2b$')) {
    user.password = await bcryptjs.hash(user.password, 10);
  }
  return await usersDb.insert(user);
}
// ==========================================================================================================================================================================

/*
  Function Name: getUser

  Technical:
  Retrieves a single user OR issuer document from CouchDB based on the ID.
  Automatically selects the correct database by checking the ID prefix.

  Tropang Ex:
  Matalino siyang kumuha ng user.
  Kapag ang ID ay nagsisimula sa "issuer_", sa issuers DB siya titingin.
  Kapag hindi, automatic sa users DB.
  Isang function lang, pero gumagana sa dalawang klase ng account.
*/
/*
  Function Name: getUser (SAFE)

  Technical:
  Retrieves a user document by ID.
  - If ID starts with issuer_ → fetch from issuersDB
  - else → fetch from usersDb

  Tropang Ex:
  Pang lookup ng holder info (name/email) or issuer info depending sa ID prefix.
*/
async function getUser(userId) {
  try {
    if (!userId) throw new Error('userId is required');
    if (!usersDb || !issuersDB) await initializeDatabases();

    // ✅ Smart DB logic: Check the ID prefix
    const db = userId.startsWith('issuer_') ? issuersDB : usersDb;

    const user = await db.get(userId);
    return user;

  } catch (error) {
    // Optional: if you want "not found" to return null instead of throwing
    if (error.statusCode === 404) return null;

    console.error('Error getting user:', error.message || error);
    throw error;
  }
}
// ==========================================================================================================================================================================

/*
  Function Name: isEmailAlreadyUsed

  Technical:
  Checks if an email is already used by:
   - any user doc (type: 'user') in users DB
   - any issuer doc in issuers DB (issuer_registration / approved issuer docs)

  Tropang Ex:
  Pang iwas duplicate emails sa buong system (user man o issuer).
*/
async function isEmailAlreadyUsed(email) {
  if (!email) return { exists: false, where: null };

  if (!usersDb || !issuersDB) await initializeDatabases();

  const normalizedEmail = String(email).trim().toLowerCase();

  // 1) Check users DB
  const userRes = await usersDb.find({
    selector: {
      type: 'user',
      email: normalizedEmail
    },
    limit: 1
  });

  if (userRes.docs && userRes.docs.length > 0) {
    return { exists: true, where: 'users', doc: userRes.docs[0] };
  }

  // 2) Check issuers DB (issuer_registration + approved issuer docs also have email)
  const issuerRes = await issuersDB.find({
    selector: {
      email: normalizedEmail
    },
    limit: 1
  });

  if (issuerRes.docs && issuerRes.docs.length > 0) {
    const issuerDoc = issuerRes.docs[0];
    const issuerStatus = String(issuerDoc.status || '').trim().toLowerCase();

    if (issuerStatus === 'rejected') {
      return {
        exists: false,
        where: 'issuers',
        doc: issuerDoc,
        previouslyRejected: true,
        rejectedDocId: issuerDoc._id,
        rejectedDocRev: issuerDoc._rev
      };
    }

    return { exists: true, where: 'issuers', doc: issuerDoc };
  }

  return { exists: false, where: null };
}
// ==========================================================================================================================================================================

/*
  Function Name: deleteIssuerDoc

  Technical:
  Deletes an existing issuer document from the issuers database using its current _id and _rev.

  Tropang Ex:
  Pang-delete ito ng lumang rejected issuer record para makapag-register ulit gamit same email.

  Step 1: Siguraduhin na ready yung issuers DB.
  Step 2: Kunin yung mismong issuer doc gamit docId.
  Step 3: I-delete yung doc gamit latest _rev para walang conflict.
*/
async function deleteIssuerDoc(docId, docRev) {
  if (!issuersDB) await initializeDatabases();
  if (!docId || !docRev) throw new Error('docId and docRev are required');
  return await issuersDB.destroy(docId, docRev);
}
// ==========================================================================================================================================================================

/*
  Function Name: getAllUsers

  Technical:
  Retrieves all NON-ADMIN user documents from the users database.
  - Filters out any docs that are not real user accounts.
  - Excludes admin roles.
  Returns the full documents instead of just document IDs.

  Tropang Ex:
  Kinukuha lahat ng pwedeng gawing credential holder (students/regular users)
  para sa dropdown, dashboards, reports.
*/
// couchDB_service.js
async function getAllUsers() {
  if (!usersDb) await initializeDatabases();
  const result = await usersDb.list({ include_docs: true });
  return result.rows.map(row => row.doc);  // raw user docs
}
// ==========================================================================================================================================================================

/*
  Function Name: updateUser

  Technical:
  Updates an existing user OR issuer document in CouchDB.
  Preserves CouchDB revision control (_id and _rev) to avoid conflicts.

  Tropang Ex:
  Pang-update ng user info — password change, settings update, etc.
  Hindi siya gumagawa ng bagong user; ina-update lang yung existing record.
  Gumagana rin sa issuer accounts automatically.
*/
async function updateUser(userId, userData) {
  try {
    // ✅ Smart DB logic: Check the ID prefix
    if (!usersDb || !issuersDB) await initializeDatabases(); // Guard added, same pattern as other functions
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
// ==========================================================================================================================================================================

/*
  Function Name: updateProfile

  Technical:
  Updates profile-related fields such as summary and visibility.
  Tracks profile update timestamp for audit or UI refresh purposes.

  Tropang Ex:
  Ito yung pang-update ng profile bio / summary.
  Halimbawa: “About me”, public profile toggle, etc.
  Ginagamit sa profile settings page.
*/
async function updateProfile(userId, profileData) {
  try {
    // ✅ Smart DB logic: Check the ID prefix
    const db = userId.startsWith('issuer_') ? issuersDB : usersDb;

    const currentDoc = await db.get(userId); // Get from correct DB
    
    // Update profile fields
    const updatedDoc = {
      ...currentDoc,
      summary: profileData.summary !== undefined ? profileData.summary : (currentDoc.summary || ''),
      isPublic: profileData.isPublic !== undefined ? profileData.isPublic : currentDoc.isPublic,
      // - polo: allow username update from edit profile
      ...(profileData.username ? { username: profileData.username } : {}),
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
// ==========================================================================================================================================================================

/*
  Function Name: updateProfilePicture

  Technical:
  Updates the profilePicture field of a user document in the users CouchDB database.
  Fetches the existing user document, modifies the image URL, and saves the updated record.

  Tropang Ex:
  Pang-update ng profile picture ng user.
  Ipapalit lang niya yung bagong image URL sa profile, tapos ise-save ulit sa database.
  Ginagamit to kapag nag-upload o nagpalit ng avatar yung user.
*/
async function updateProfilePicture(userId, imageUrl) {
  try {
    if (!usersDb) await initializeDatabases();
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

// ==========================================================================================================================================================================
//                                                                 ISSUER Functions
// ==========================================================================================================================================================================

/*
  Function Name: createIssuerRegistration

  Technical:
  Creates a new issuer registration document in the "issuers" CouchDB database with pending status.

  UPDATED:
  - Accreditation gating removed: ANY org can register (pending approval).
  - Duplicate prevention added: blocks if same email + orgName already exists with status pending/approved.
  - Accreditation fields retained for future use (default false/null if not provided).
  - NEW: Saves uploaded issuer files as REAL CouchDB attachments on the same issuer doc.
  - NEW: documents[] keeps metadata + attachmentName so files can later be viewed/downloaded.
*/
async function createIssuerRegistration(issuerData, accreditationCheck = null) {
  try {
    /* Step 1: Ensure issuers DB is initialized */
    if (!issuersDB) await initializeDatabases();

    /* Step 2: Duplicate check (email + orgName) */
    const dup = await checkDuplicateIssuerRegistration(issuerData.email, issuerData.orgName);
    if (dup.isDuplicate) {
      const err = new Error(
        `Issuer registration already exists for ${issuerData.email} (${issuerData.orgName}). ` +
        `Existing status: ${dup.existing.status}`
      );
      err.statusCode = 409;
      err.details = dup.existing;
      throw err;
    }

    /* Step 3: Normalize governance fields */
    const issuerType = String(issuerData.issuerType || 'root').trim().toLowerCase();
    const isSubordinate = issuerType === 'subordinate';
    const rootApprovalStatus = isSubordinate ? 'pending' : 'not_required';

    /* Step 5: Build issuer registration document
       NOTE:
       issuerData.documents is expected to contain metadata objects like:
       {
         docType,
         originalname,
         mimetype,
         size,
         buffer   // NEW: actual file bytes from multer
       }
    */
    const issuerDoc = {
      _id: `issuer_${issuerData.email.replace(/@/g, '_').replace(/\./g, '_')}_${Date.now()}`,
      type: 'issuer_registration',
      role: 'issuer',

      orgName: issuerData.orgName,
      contactName: issuerData.contactName,
      email: issuerData.email,
      password: issuerData.password,

      // ✅ Will be updated below with attachmentName after attachment insert
      documents: [],

      issuerType: issuerType,
      category: issuerData.category,

      rootAuthorityId: isSubordinate ? (issuerData.rootAuthorityId || null) : null,
      rootAuthorityName: isSubordinate ? (issuerData.rootAuthorityName || null) : null,

      rootApprovalStatus: rootApprovalStatus,
      rootApprovedAt: null,
      rootApprovedBy: null,
      rootRejectionReason: null,

      status: 'pending',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,

      rejectionReason: null,
      rejectedAt: null,
      rejectedBy: null
    };

    const incomingDocs = Array.isArray(issuerData.documents) ? issuerData.documents : [];

    console.log('[COUCHDB] Final issuer doc before insert:', {
      _id: issuerDoc._id,
      orgName: issuerDoc.orgName,
      email: issuerDoc.email,
      status: issuerDoc.status,
      issuerType: issuerDoc.issuerType,
      category: issuerDoc.category,
      rootApprovalStatus: issuerDoc.rootApprovalStatus,
      rootAuthorityId: issuerDoc.rootAuthorityId,
      documentCount: incomingDocs.length
    });

    /* Step 6: Insert base issuer registration doc first */
    let insertResult = await issuersDB.insert(issuerDoc);

    /* Step 7: Save each uploaded file as a CouchDB attachment
       Then build clean documents[] metadata that includes attachmentName.
    */
    const savedDocuments = [];

    for (let i = 0; i < incomingDocs.length; i++) {
      const file = incomingDocs[i];

      const docType = String(file.docType || `document_${i + 1}`).trim().toLowerCase();
      const originalname = file.originalname || `file_${i + 1}`;
      const mimetype = file.mimetype || 'application/octet-stream';
      const size = file.size || 0;
      const buffer = file.buffer;

      if (!buffer) {
        console.warn(`[COUCHDB] Skipping attachment for ${originalname} because buffer is missing.`);
        savedDocuments.push({
          docType,
          originalname,
          mimetype,
          size,
          attachmentName: null
        });
        continue;
      }

      // Safe-ish attachment filename
      const safeOriginalName = String(originalname).replace(/[^\w.\- ]/g, '_');
      const attachmentName = `${docType}__${Date.now()}__${safeOriginalName}`;

      const attachResult = await issuersDB.attachment.insert(
        issuerDoc._id,
        attachmentName,
        buffer,
        mimetype,
        { rev: insertResult.rev }
      );

      // Update local latest rev for next attachment insert
      insertResult.rev = attachResult.rev;

      savedDocuments.push({
        docType,
        originalname,
        mimetype,
        size,
        attachmentName
      });
    }

    /* Step 8: Update issuer doc.documents with metadata + attachmentName */
    const insertedIssuerDoc = await issuersDB.get(issuerDoc._id);
    insertedIssuerDoc.documents = savedDocuments;

    const finalResult = await issuersDB.insert(insertedIssuerDoc);

    /* Step 9: Return final insert result */
    return finalResult;

  } catch (error) {
    console.error('Error creating issuer registration:', error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================

/*
  Function Name: getPendingIssuers

  Technical: Fetches all issuer registration documents with status = "pending".
  Tropang Ex: Pangkuha ng lahat ng issuer applications na for admin approval.
*/
async function getPendingIssuers() {
  try {

    /* Step 1: Ensure issuers DB is initialized
      Tropang Ex: Para sure na ready yung DB connection.
    */
    if (!issuersDB) await initializeDatabases();

    /* Step 2: Query pending issuer registrations

      Technical: Mango query filtering by:
        - type = issuer_registration
        - status = pending
      Tropang Ex: Kinukuha lahat ng application na hindi pa approved or rejected.
    */
    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        status: 'pending'
      },
      sort: ['createdAt']
    });

    /* Step 3: Return pending issuer documents

      Technical: Returns raw issuer docs.
      Tropang Ex: Ibinabalik yung list ng pending issuers sa admin dashboard.
    */
    return result.docs;

  } catch (error) {
    console.error('Error getting pending issuers:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================

/*
  Function Name: getPendingRootIssuers

  Technical:
  Fetches all PENDING issuer applications where issuerType = "root".

  Tropang Ex:
  Pending applications na root authority ang ina-applyan.
*/
async function getPendingRootIssuers() {
  try {
    if (!issuersDB) await initializeDatabases();

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        status: 'pending',
        issuerType: 'root'
      },
      sort: ['createdAt']
    });

    return result.docs;
  } catch (error) {
    console.error('Error getting pending root issuers:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

/*
  Function Name: getPendingSubordinateIssuers

  Technical:
  Fetches all PENDING issuer applications where issuerType = "subordinate".

  Tropang Ex:
  Pending applications na subordinate issuer ang ina-applyan.
*/
async function getPendingSubordinateIssuers() {
  try {
    if (!issuersDB) await initializeDatabases();

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        status: 'pending',
        issuerType: 'subordinate'
      },
      sort: ['createdAt']
    });

    return result.docs;
  } catch (error) {
    console.error('Error getting pending subordinate issuers:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

/*
  Function Name: getPendingSubordinateIssuersAwaitingRootApproval

  Technical:
  Fetches subordinate issuer applications that are still pending overall
  AND still waiting for root approval.

  Tropang Ex:
  Ito yung subordinate issuers na hindi pa maa-actionan ng admin kasi
  hinihintay pa muna root authority approval.
*/
async function getPendingSubordinateIssuersAwaitingRootApproval() {
  try {
    if (!issuersDB) await initializeDatabases();

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        status: 'pending',
        issuerType: 'subordinate',
        rootApprovalStatus: 'pending'
      },
      sort: ['createdAt']
    });

    return result.docs;
  } catch (error) {
    console.error('Error getting subordinate issuers awaiting root approval:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

/*
  Function Name: getPendingSubordinateIssuersRootApproved

  Technical:
  Fetches subordinate issuer applications that are still pending overall
  BUT already approved by root authority.

  Tropang Ex:
  Ito yung subordinate issuers na puwede nang i-review/i-approve ng admin.
*/
async function getPendingSubordinateIssuersRootApproved() {
  try {
    if (!issuersDB) await initializeDatabases();

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        status: 'pending',
        issuerType: 'subordinate',
        rootApprovalStatus: 'approved'
      },
      sort: ['createdAt']
    });

    return result.docs;
  } catch (error) {
    console.error('Error getting root-approved subordinate issuers:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

/*
  Function Name: getAdminActionablePendingIssuers

  Technical:
  Fetches only pending issuer applications that admin can actually act on right now:
  - all pending root issuers
  - pending subordinate issuers whose rootApprovalStatus = "approved"

  Tropang Ex:
  Ito yung clean admin queue.
  Walang kasamang subordinate na naghihintay pa lang kay root.
*/
async function getAdminActionablePendingIssuers() {
  try {
    if (!issuersDB) await initializeDatabases();

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        status: 'pending',
        $or: [
          { issuerType: 'root' },
          {
            issuerType: 'subordinate',
            rootApprovalStatus: 'approved'
          }
        ]
      },
      sort: ['createdAt']
    });

    return result.docs;
  } catch (error) {
    console.error('Error getting admin-actionable pending issuers:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================


/*
  Function Name: getIssuerById
  Technical: Retrieves a single issuer document by its CouchDB _id.
  Tropang Ex: Pangkuha ng specific issuer record using issuer ID.
*/
async function getIssuerById(issuerId) {
  try {

    /* Step 1: Ensure issuers DB is initialized*/
    if (!issuersDB) await initializeDatabases();

    /* Step 2: Fetch issuer document by ID
      Technical: Uses direct .get() lookup.
    */
    return await issuersDB.get(issuerId);

  } catch (error) {
    console.error('Error getting issuer by ID:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

async function getIssuerDocuments(issuerId) {
  try {
    if (!issuersDB) await initializeDatabases();

    const issuer = await issuersDB.get(issuerId);

    return issuer.documents || [];

  } catch (error) {
    console.error('Error getting issuer documents:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

async function getIssuerDocumentStream(issuerId, attachmentName) {
  try {
    if (!issuersDB) await initializeDatabases();

    return await issuersDB.attachment.get(issuerId, attachmentName);

  } catch (error) {
    console.error('Error getting issuer document attachment:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================


/*
  Function Name: getIssuerByEmail

  Technical: Retrieves an issuer document by matching email address.
  Tropang Ex: Panghanap ng issuer gamit email (commonly used during login / approval checks).
*/
async function getIssuerByEmail(email) {
  try {

    /* Step 1: Ensure issuers DB is initialized*/
    if (!issuersDB) await initializeDatabases();

    /* Step 2: Query issuer by email*/
    const result = await issuersDB.find({
      selector: { email: email }
    });

    /* Step 3: Return issuer if found, else null */
    return result.docs.length > 0 ? result.docs[0] : null;

  } catch (error) {
    console.error('Error getting issuer by email:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

/*
  Function Name: checkDuplicateIssuerRegistration

  Technical:
  Checks if an issuer registration already exists for the same email/orgName.
  Blocks duplicates if existing status is pending/approved (optionally include rejected).

  Tropang Ex:
  Pang-iwas double registration. Kapag may existing na application/account gamit same email/org,
  bawal na mag-register ulit.
*/
async function checkDuplicateIssuerRegistration(email, orgName) {
  if (!issuersDB) await initializeDatabases();

  // Normalize to avoid "De La Salle University" vs "de la salle university" issues
  const normalizedOrg = (orgName || "").trim().toLowerCase();

  const result = await issuersDB.find({
    selector: {
      type: 'issuer_registration',
      email: email
    },
    limit: 50
  });

  const matches = (result.docs || []).filter(doc => {
    const docOrg = (doc.orgName || "").trim().toLowerCase();

    // must match org too (as per your requirement)
    const sameOrg = docOrg === normalizedOrg;

    // block only if still active-ish
    const blockedStatus = doc.status === 'pending' || doc.status === 'approved';

    return sameOrg && blockedStatus;
  });

  if (matches.length > 0) {
    return {
      isDuplicate: true,
      existing: {
        id: matches[0]._id,
        status: matches[0].status,
        createdAt: matches[0].createdAt
      }
    };
  }

  return { isDuplicate: false, existing: null };
}
// ==========================================================================================================================================================================

/* 
  Function Name: Approve_Issuer

  Technical: Approves an issuer application by updating its CouchDB record (status, admin approver, Fabric identity, CouchDB URL, walletId).
  Tropang Ex: Ito yung “Approve” button logic ni admin. Pag na-approve si issuer, lalagyan siya ng:
            - status = approved
            - fabric identity (pang blockchain)
            - couchDBUrl (kung saan DB niya naka-host)
            - walletId (pang wallet tracking)

  ✅ ADDED (NEW DESIGN):
  - If issuerType === "subordinate", admin approval is BLOCKED unless rootApprovalStatus === "approved"
  - Prevent approving if status is not "pending" (avoid re-approve / invalid transitions)
*/
async function Approve_Issuer(issuerId, adminEmail) {
  try {
    /* Step 1: Ensure issuersDB is ready */
    if (!issuersDB) await initializeDatabases();

    console.log(`[COUCHDB] Approving issuer: ${issuerId}`);

    /* Step 3: Fetch issuer application document */
    const issuerDoc = await issuersDB.get(issuerId);

    console.log(`[COUCHDB] Retrieved issuer:`, {
      _id: issuerDoc._id,
      contactName: issuerDoc.contactName,
      email: issuerDoc.email,
      orgName: issuerDoc.orgName
    });

    // ✅ ADDED: block invalid approval transitions (optional but recommended)
    if (String(issuerDoc.status || '').toLowerCase() !== 'pending') {
      const err = new Error(
        `Issuer cannot be approved because current status is '${issuerDoc.status}'.`
      );
      err.statusCode = 409;
      throw err;
    }

    // ✅ ADDED: subordinate gate — root must approve first
    const issuerType = String(issuerDoc.issuerType || 'root').trim().toLowerCase();
    const rootApprovalStatus = String(issuerDoc.rootApprovalStatus || 'not_required')
      .trim()
      .toLowerCase();

    if (issuerType === 'subordinate' && rootApprovalStatus !== 'approved') {
      const err = new Error(
        'Cannot approve subordinate issuer until root authority approves first.'
      );
      err.statusCode = 403;
      throw err;
    }

    /* Step 5: Assign Fabric identity dynamically */
    const normalize = (value) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');

    if (issuerType === 'subordinate') {
      if (!issuerDoc.rootAuthorityName || !issuerDoc.orgName) {
        const err = new Error(
          'Subordinate issuer is missing rootAuthorityName or orgName for fabric identity assignment.'
        );
        err.statusCode = 400;
        throw err;
      }
      issuerDoc.fabricIdentity = `${normalize(issuerDoc.rootAuthorityName)}-subordinate-${normalize(issuerDoc.orgName)}`;
    } else if (issuerDoc.orgName) {
      issuerDoc.fabricIdentity = `${normalize(issuerDoc.orgName)}-admin`;
    } else {
      issuerDoc.fabricIdentity = undefined;
    }

    /* Step 6: Resolve issuer-specific CouchDB URL using "couchdb_connections" DB */
    const normalizedOrgName = issuerDoc.orgName.toLowerCase().replace(/\s+/g, "");
    const nanoAdmin = require('nano')('http://admin:adminpw@localhost:5985');
    const connDb = nanoAdmin.use('couchdb_connections');

    const result = await connDb.find({ selector: { orgName: normalizedOrgName } });

    /* Step 7: Attach couchDBUrl */
    if (result.docs.length > 0) {
      issuerDoc.couchDBUrl = result.docs[0].couchDBUrl;
      console.log(`[COUCHDB] Assigned couchDBUrl for issuer:`, issuerDoc.couchDBUrl);
    } else {
      throw new Error('No CouchDB connection found for org: ' + normalizedOrgName);
    }

    /* Step 8: Generate unique walletId for issuer */
    const walletId = `wallet_${Date.now()}`;
    issuerDoc.walletId = walletId;

    /* Step 9: Update approval fields */
    issuerDoc.status = 'approved';
    issuerDoc.approvedBy = adminEmail;
    issuerDoc.approvedAt = new Date().toISOString();

    // ✅ ADDED: clear rejection fields if previously set (keeps doc clean)
    issuerDoc.rejectionReason = null;
    issuerDoc.rejectedAt = null;
    issuerDoc.rejectedBy = null;

    /* Step 10: Save updated issuer doc */
    await issuersDB.insert(issuerDoc);
    console.log(`[COUCHDB] Issuer status updated to 'approved'`);

    /* Step 11: Return summary response */
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

  } catch (error) {
    console.error(`[COUCHDB] ❌ Approve_Issuer failed:`, error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================

/* 
  Function Name: Reject_Issuer

  Technical: Rejects an issuer application by updating its CouchDB record (status, rejectionReason, rejectedAt).
  Tropang Ex: Ito yung “Reject” button logic ni admin. Pag nireject si issuer, lalagyan siya ng:
            - status = rejected
            - rejection reason (bakit siya bagsak)
            - rejectedAt timestamp (kelan nireject)

  ✅ ADDED (recommended):
  - Prevent rejecting if status is not "pending" (avoid rejecting already approved/rejected)
*/
async function Reject_Issuer(issuerId, rejectionReason, adminEmail) {
  if (!issuersDB) await initializeDatabases();

  const issuerDoc = await issuersDB.get(issuerId);

  // ✅ ADDED: block invalid rejection transitions (optional but recommended)
  if (String(issuerDoc.status || '').toLowerCase() !== 'pending') {
    const err = new Error(
      `Issuer cannot be rejected because current status is '${issuerDoc.status}'.`
    );
    err.statusCode = 409;
    throw err;
  }

  issuerDoc.status = 'rejected';
  issuerDoc.rejectionReason = rejectionReason;
  issuerDoc.rejectedAt = new Date().toISOString();
  issuerDoc.rejectedBy = adminEmail;

  return await issuersDB.insert(issuerDoc);
}
// ==========================================================================================================================================================================

/* 
  Function Name: getApprovedIssuer

  Technical: Fetches an approved issuer registration record from CouchDB using the issuer’s email.
  Tropang Ex: Ginagamit to pang-check kung approved na si issuer bago siya makapag-login / gumawa ng templates / mag-issue ng credentials.
*/
async function getApprovedIssuer(email) {

  /* Step 1: Ensure issuersDB is initialized */
  if (!issuersDB) await initializeDatabases();

  /* Step 2: Query CouchDB for approved issuer by email */
  const result = await issuersDB.find({
    selector: {
      type: 'issuer_registration',
      email: email,
      status: 'approved'
    }
  });

  /* Step 3: Return issuer doc if exists, else null
    Technical: Returns first match (if any).
    Tropang Ex: Pag meron → approved issuer siya; pag wala → hindi approved / wala record.
  */
  return result.docs.length > 0 ? result.docs[0] : null;
}

// ==========================================================================================================================================================================
// ROOT AUTHORITY → SUBORDINATE ISSUER APPROVAL FUNCTIONS
// ==========================================================================================================================================================================

/*
  Function Name: getPendingSubordinatesForRoot

  Technical:
  Fetches all pending subordinate issuer applications assigned to a specific root authority.
  Filters by:
    - type = issuer_registration
    - status = pending
    - issuerType = subordinate
    - rootAuthorityId = <logged in root issuer id>
    - rootApprovalStatus = pending

  Tropang Ex:
  Ito yung listahan ng mga subordinate applications na naghihintay
  ng approval ng specific root authority.
*/
async function getPendingSubordinatesForRoot(rootAuthorityId) {
  try {
    if (!issuersDB) await initializeDatabases();

    if (!rootAuthorityId) {
      throw new Error('rootAuthorityId is required');
    }

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        status: 'pending',
        issuerType: 'subordinate',
        rootAuthorityId: rootAuthorityId,
        rootApprovalStatus: 'pending'
      },
      sort: ['createdAt']
    });

    return result.docs || [];

  } catch (error) {
    console.error('[COUCHDB] Error getting pending subordinates for root:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================
// ==========================================================================================================================================================================

/*
  Function Name: getAllSubordinatesForRoot

  Technical:
  Fetches ALL subordinate issuer applications assigned to a specific root authority,
  regardless of overall status or root-approval status.

  Filters by:
    - type = issuer_registration
    - issuerType = subordinate
    - rootAuthorityId = <logged in root issuer id>

  Tropang Ex:
  Ito yung buong listahan ng lahat ng subordinates sa ilalim ng root authority na 'to,
  whether pending, approved, rejected, or disabled.
*/
async function getAllSubordinatesForRoot(rootAuthorityId) {
  try {
    if (!issuersDB) await initializeDatabases();

    if (!rootAuthorityId) {
      throw new Error('rootAuthorityId is required');
    }

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        issuerType: 'subordinate',
        rootAuthorityId: rootAuthorityId
      }
    });

    const rows = result.docs || [];
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return rows;

  } catch (error) {
    console.error('[COUCHDB] Error getting all subordinates for root:', error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================

/*
  Function Name: getRootApprovedSubordinatesForRoot

  Technical:
  Fetches subordinate issuer applications assigned to a specific root authority
  where rootApprovalStatus = approved.

  Filters by:
    - type = issuer_registration
    - issuerType = subordinate
    - rootAuthorityId = <logged in root issuer id>
    - rootApprovalStatus = approved

  Tropang Ex:
  Ito yung mga subordinate applications na na-approve na ni root authority,
  regardless of whether fully approved na sila ng admin or not.
*/
async function getRootApprovedSubordinatesForRoot(rootAuthorityId) {
  try {
    if (!issuersDB) await initializeDatabases();

    if (!rootAuthorityId) {
      throw new Error('rootAuthorityId is required');
    }

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        issuerType: 'subordinate',
        rootAuthorityId: rootAuthorityId,
        rootApprovalStatus: 'approved'
      }
    });

    const rows = result.docs || [];
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return rows;

  } catch (error) {
    console.error('[COUCHDB] Error getting root-approved subordinates for root:', error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================

/*
  Function Name: getRootRejectedSubordinatesForRoot

  Technical:
  Fetches subordinate issuer applications assigned to a specific root authority
  where rootApprovalStatus = rejected.

  Filters by:
    - type = issuer_registration
    - issuerType = subordinate
    - rootAuthorityId = <logged in root issuer id>
    - rootApprovalStatus = rejected

  Tropang Ex:
  Ito yung mga subordinate applications na ni-reject ni root authority.
*/
async function getRootRejectedSubordinatesForRoot(rootAuthorityId) {
  try {
    if (!issuersDB) await initializeDatabases();

    if (!rootAuthorityId) {
      throw new Error('rootAuthorityId is required');
    }

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        issuerType: 'subordinate',
        rootAuthorityId: rootAuthorityId,
        rootApprovalStatus: 'rejected'
      }
    });

    const rows = result.docs || [];
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return rows;

  } catch (error) {
    console.error('[COUCHDB] Error getting root-rejected subordinates for root:', error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================

/*
  Function Name: getApprovedSubordinatesForRoot

  Technical:
  Fetches subordinate issuer applications assigned to a specific root authority
  that are fully approved by admin.

  Filters by:
    - type = issuer_registration
    - issuerType = subordinate
    - rootAuthorityId = <logged in root issuer id>
    - status = approved

  Tropang Ex:
  Ito yung mga subordinate issuers na fully approved na sa system
  (meaning pasado na sa root authority at admin).
*/
async function getApprovedSubordinatesForRoot(rootAuthorityId) {
  try {
    if (!issuersDB) await initializeDatabases();

    if (!rootAuthorityId) {
      throw new Error('rootAuthorityId is required');
    }

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        issuerType: 'subordinate',
        rootAuthorityId: rootAuthorityId,
        status: 'approved'
      }
    });

    const rows = result.docs || [];
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return rows;

  } catch (error) {
    console.error('[COUCHDB] Error getting approved subordinates for root:', error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================

/*
  Function Name: getDisabledSubordinatesForRoot

  Technical:
  Fetches subordinate issuer applications assigned to a specific root authority
  that are currently disabled.

  Filters by:
    - type = issuer_registration
    - issuerType = subordinate
    - rootAuthorityId = <logged in root issuer id>
    - status = disabled

  Tropang Ex:
  Ito yung mga subordinate issuers na dati nang approved / existing,
  pero na-disable na sa system.
*/
async function getDisabledSubordinatesForRoot(rootAuthorityId) {
  try {
    if (!issuersDB) await initializeDatabases();

    if (!rootAuthorityId) {
      throw new Error('rootAuthorityId is required');
    }

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        issuerType: 'subordinate',
        rootAuthorityId: rootAuthorityId,
        status: 'disabled'
      }
    });

    const rows = result.docs || [];
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return rows;

  } catch (error) {
    console.error('[COUCHDB] Error getting disabled subordinates for root:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

/*
  Function Name: rootApproveSubordinateIssuer

  Technical:
  Root authority approves a subordinate issuer application.
  Updates ONLY the root-approval layer, not the final admin approval.
  Does NOT change status from pending.
  Updates:
    - rootApprovalStatus = approved
    - rootApprovedAt
    - rootApprovedBy
    - rootApprovalReason

  Tropang Ex:
  First gate pa lang ito.
  Ibig sabihin:
    Root authority says "okay, under me ka"
  Pero pending pa rin siya overall until ChainCert-admin approves.
*/
async function rootApproveSubordinateIssuer(issuerId, rootAuthorityId, approvalReason = '') {
  try {
    if (!issuersDB) await initializeDatabases();

    if (!issuerId) {
      throw new Error('issuerId is required');
    }
    if (!rootAuthorityId) {
      throw new Error('rootAuthorityId is required');
    }

    const issuerDoc = await issuersDB.get(issuerId);

    if (!issuerDoc) {
      const err = new Error('Issuer not found');
      err.statusCode = 404;
      throw err;
    }

    if (String(issuerDoc.status || '').toLowerCase() !== 'pending') {
      const err = new Error(
        `Subordinate issuer cannot be root-approved because current status is '${issuerDoc.status}'.`
      );
      err.statusCode = 409;
      throw err;
    }

    if (String(issuerDoc.issuerType || '').toLowerCase() !== 'subordinate') {
      const err = new Error('Only subordinate issuers can be root-approved.');
      err.statusCode = 400;
      throw err;
    }

    if ((issuerDoc.rootAuthorityId || '') !== rootAuthorityId) {
      const err = new Error('This subordinate issuer is not assigned to the current root authority.');
      err.statusCode = 403;
      throw err;
    }

    if (String(issuerDoc.rootApprovalStatus || '').toLowerCase() === 'approved') {
      const err = new Error('Subordinate issuer is already root-approved.');
      err.statusCode = 409;
      throw err;
    }

    issuerDoc.rootApprovalStatus = 'approved';
    issuerDoc.rootApprovedAt = new Date().toISOString();
    issuerDoc.rootApprovedBy = rootAuthorityId;
    issuerDoc.rootApprovalReason = approvalReason || 'Approved by root authority';

    // clear root rejection fields if any
    issuerDoc.rootRejectionReason = null;

    const result = await issuersDB.insert(issuerDoc);

    return {
      _id: issuerDoc._id,
      orgName: issuerDoc.orgName,
      email: issuerDoc.email,
      status: issuerDoc.status,
      issuerType: issuerDoc.issuerType,
      rootAuthorityId: issuerDoc.rootAuthorityId,
      rootAuthorityName: issuerDoc.rootAuthorityName || null,
      rootApprovalStatus: issuerDoc.rootApprovalStatus,
      rootApprovedAt: issuerDoc.rootApprovedAt,
      rootApprovedBy: issuerDoc.rootApprovedBy,
      rootApprovalReason: issuerDoc.rootApprovalReason,
      _rev: result.rev
    };

  } catch (error) {
    console.error('[COUCHDB] ❌ rootApproveSubordinateIssuer failed:', error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================

/*
  Function Name: rootRejectSubordinateIssuer

  Technical:
  Root authority rejects a subordinate issuer application.
  Keeps overall status as pending OR marks rootApprovalStatus as rejected,
  so admin cannot approve it.

  Tropang Ex:
  Root authority says:
    "Hindi kita ina-approve under me."
  So kahit nasa pending list pa siya, blocked siya until maayos/reapply.
*/
async function rootRejectSubordinateIssuer(issuerId, rootAuthorityId, rejectionReason) {
  try {
    if (!issuersDB) await initializeDatabases();

    if (!issuerId) {
      throw new Error('issuerId is required');
    }
    if (!rootAuthorityId) {
      throw new Error('rootAuthorityId is required');
    }
    if (!rejectionReason || rejectionReason.trim() === '') {
      const err = new Error('Root rejection reason is required.');
      err.statusCode = 400;
      throw err;
    }

    const issuerDoc = await issuersDB.get(issuerId);

    if (!issuerDoc) {
      const err = new Error('Issuer not found');
      err.statusCode = 404;
      throw err;
    }

    if (String(issuerDoc.status || '').toLowerCase() !== 'pending') {
      const err = new Error(
        `Subordinate issuer cannot be root-rejected because current status is '${issuerDoc.status}'.`
      );
      err.statusCode = 409;
      throw err;
    }

    if (String(issuerDoc.issuerType || '').toLowerCase() !== 'subordinate') {
      const err = new Error('Only subordinate issuers can be root-rejected.');
      err.statusCode = 400;
      throw err;
    }

    if ((issuerDoc.rootAuthorityId || '') !== rootAuthorityId) {
      const err = new Error('This subordinate issuer is not assigned to the current root authority.');
      err.statusCode = 403;
      throw err;
    }

    issuerDoc.rootApprovalStatus = 'rejected';
    issuerDoc.rootApprovedAt = null;
    issuerDoc.rootApprovedBy = null;
    issuerDoc.rootApprovalReason = null;
    issuerDoc.rootRejectionReason = rejectionReason;
    issuerDoc.rootRejectedAt = new Date().toISOString();

    const result = await issuersDB.insert(issuerDoc);

    return {
      _id: issuerDoc._id,
      orgName: issuerDoc.orgName,
      email: issuerDoc.email,
      status: issuerDoc.status,
      issuerType: issuerDoc.issuerType,
      rootAuthorityId: issuerDoc.rootAuthorityId,
      rootAuthorityName: issuerDoc.rootAuthorityName || null,
      rootApprovalStatus: issuerDoc.rootApprovalStatus,
      rootRejectionReason: issuerDoc.rootRejectionReason,
      rootRejectedAt: issuerDoc.rootRejectedAt,
      _rev: result.rev
    };

  } catch (error) {
    console.error('[COUCHDB] ❌ rootRejectSubordinateIssuer failed:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================
//                                                                       NOTIFICATION Functions
// ==========================================================================================================================================================================

/* 
  Function Name: createNotification

  Technical: Creates and stores a notification document in CouchDB.
  Tropang Ex: Ginagamit to para gumawa ng notifications (ex: may bagong issuer application, approval, rejection, etc.)
*/
async function createNotification(notificationData) {

  /* Step 1: Ensure notifications DB is initialized */
  if (!notificationsDb) await initializeDatabases();

  /* Step 2: Build notification document

    Technical: Constructs a notification object with metadata and defaults.
    Tropang Ex: Binubuo dito yung laman ng notification (title, message, kanino, at kung nabasa na ba).
  */
  const notification = {
    _id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // unique notif ID
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

  /* Step 3: Save notification to CouchDB
    Tropang Ex: Official na yung notification, lalabas na sa admin/user dashboard.
  */
  return await notificationsDb.insert(notification);
}
// ==========================================================================================================================================================================

/* 
  Function Name: getAllNotifications

  Technical: Retrieves all notification documents from CouchDB.
  Tropang Ex: Kinukuha lahat ng notifications (read at unread) para sa dashboard.
*/
async function getAllNotifications() {

  /* Step 1: Ensure notifications DB is initialized */
  if (!notificationsDb) await initializeDatabases();

  /* Step 2: List all documents including full content */
  const result = await notificationsDb.list({ include_docs: true });

  /* Step 3: Extract and return documents only
    Tropang Ex: Nililinis yung response, docs lang ang binabalik.
  */
  return result.rows.map(row => row.doc);
}
// ==========================================================================================================================================================================

/* 
  Function Name: getUnreadNotifications

  Technical: Fetches only unread notification documents from CouchDB.
  Tropang Ex: Ginagamit para sa notification badge / unread count.
*/
async function getUnreadNotifications() {

  /* Step 1: Ensure notifications DB is initialized */
  if (!notificationsDb) await initializeDatabases();

  /* Step 2: Query unread notifications*/
  const result = await notificationsDb.find({
    selector: {
      type: 'notification',
      read: false
    }
  });

  /* Step 3: Return unread notification docs */
  return result.docs;
}
// ==========================================================================================================================================================================

/* 
  Function Name: markNotificationAsRead

  Technical: Marks a specific notification as read and updates its timestamp.
  Tropang Ex: Tinatawag kapag binuksan o clinick na yung notification.
*/
async function markNotificationAsRead(notificationId) {

  /* Step 1: Ensure notifications DB is initialized */
  if (!notificationsDb) await initializeDatabases();

  /* Step 2: Fetch notification document by ID
    Tropang Ex: Kinukuha yung exact notification na babaguhin.
  */
  const notif = await notificationsDb.get(notificationId);

  /* Step 3: Idempotent update
    Technical: Skip DB write if already marked as read.
  */
  if (notif.read) {
    return {
      ok: true,
      id: notif._id,
      rev: notif._rev,
      skipped: true
    };
  }

  /* Step 4: Update read status and timestamp then save */
  notif.read = true;
  notif.readAt = new Date().toISOString();

  return await notificationsDb.insert(notif);
}


// ==========================================================================================================================================================================

/* 
  Function Name: createAdminNotification

  Technical: Creates and stores an admin-specific notification document in the admin_notifications database.
  Tropang Ex: Dito ginagawa yung bell notification ng admin kapag may bagong issuer event o issuer decision.

  Step 1: I-ready ang admin notification DB handle.
  Step 2: Buoin ang notification document with defaults.
  Step 3: I-save sa admin_notifications para mabasa ng dashboard.
*/
async function createAdminNotification(notificationData) {
  if (!adminNotificationsDb) await initializeDatabases();

  const notification = {
    _id: `admin_notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    type: 'admin_notification',
    category: notificationData.category || 'system',
    title: notificationData.title || 'Admin Notification',
    message: notificationData.message || '',
    issuerId: notificationData.issuerId || null,
    issuerEmail: notificationData.issuerEmail || null,
    createdAt: new Date().toISOString(),
    read: false
  };

  return await adminNotificationsDb.insert(notification);
}

/* 
  Function Name: getAdminNotifications

  Technical: Retrieves all admin notification documents sorted by newest first.
  Tropang Ex: Ito yung source ng full admin notification panel list.

  Step 1: I-ready ang admin notification DB.
  Step 2: Kunin lahat ng docs.
  Step 3: I-filter out design docs at i-sort newest first.
*/
async function getAdminNotifications() {
  if (!adminNotificationsDb) await initializeDatabases();
  const result = await adminNotificationsDb.list({ include_docs: true });
  return (result.rows || [])
    .map((row) => row.doc)
    .filter((doc) => doc && !String(doc._id || '').startsWith('_design/'))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/* 
  Function Name: getUnreadAdminNotifications

  Technical: Fetches only unread admin notifications sorted by newest first.
  Tropang Ex: Ginagamit ito para sa unread badge count ng admin bell.

  Step 1: I-ready ang DB.
  Step 2: Mag-query ng read=false docs.
  Step 3: I-sort newest first bago ibalik.
*/
async function getUnreadAdminNotifications() {
  if (!adminNotificationsDb) await initializeDatabases();
  const result = await adminNotificationsDb.find({
    selector: {
      type: 'admin_notification',
      read: false
    },
    limit: 1000
  });
  return (result.docs || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/* 
  Function Name: markAdminNotificationAsRead

  Technical: Marks one admin notification as read and sets readAt.
  Tropang Ex: Kapag na-click na ni admin ang notif, dito siya nagiging read.

  Step 1: I-ready ang DB at kunin ang notif doc.
  Step 2: Kung read na, ibalik agad without extra write.
  Step 3: Mark as read then save.
*/
async function markAdminNotificationAsRead(notificationId) {
  if (!adminNotificationsDb) await initializeDatabases();
  const notif = await adminNotificationsDb.get(notificationId);
  if (notif.read) return { ok: true, id: notif._id, rev: notif._rev, skipped: true };
  notif.read = true;
  notif.readAt = new Date().toISOString();
  return await adminNotificationsDb.insert(notif);
}

/* 
  Function Name: markAllAdminNotificationsAsRead

  Technical: Marks every unread admin notification as read using bulk update.
  Tropang Ex: Isang pindot, lahat ng admin notifications mababasa na.

  Step 1: Kunin muna lahat ng unread admin notifications.
  Step 2: Lagyan ng read/readAt yung bawat doc.
  Step 3: I-save sila gamit bulk operation.
*/
async function markAllAdminNotificationsAsRead() {
  if (!adminNotificationsDb) await initializeDatabases();
  const unreadDocs = await getUnreadAdminNotifications();
  if (!unreadDocs.length) return { ok: true, updated: 0 };
  const now = new Date().toISOString();
  const docs = unreadDocs.map((doc) => ({ ...doc, read: true, readAt: doc.readAt || now }));
  await adminNotificationsDb.bulk({ docs });
  return { ok: true, updated: docs.length };
}

/*
  Function Name: Create_CredentialNotification

  Technical:
  Creates holder-specific credential issuance notifications.
  Stored in user_notifications DB for student wallet notifications.
*/
async function Create_CredentialNotification(holderID, notificationData = {}) {
  if (!notificationsDb) await initializeDatabases();

  if (!holderID) {
    throw new Error('holderID is required for credential notification');
  }

  const now = new Date().toISOString();
  const credentialId =
    notificationData.credentialId ||
    notificationData.id ||
    notificationData.blockchainId ||
    null;

  const credentialName =
    notificationData.credentialName ||
    notificationData.credentialType ||
    'Credential';

  const issuerName =
    notificationData.issuerName ||
    notificationData.issuerOrgName ||
    notificationData.issuerId ||
    'Issuer';

  const notification = {
    _id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    type: 'credential_notification',
    notificationType: notificationData.notificationType || 'credential_issued', 
    holderID,
    credentialId,
    credentialName,
    issuerId: notificationData.issuerId || null,
    issuerName,
    issuerEmail: notificationData.issuerEmail || null,
    message: notificationData.message || 'A new credential has been issued to you.',
    read: false,
    createdAt: now
  };

  return await notificationsDb.insert(notification);
}

/*
  Function Name: getUserNotifications

  Technical:
  Fetches holder-specific credential notifications, newest first.
*/
async function getUserNotifications(holderID) {
  if (!notificationsDb) await initializeDatabases();
  if (!holderID) throw new Error('holderID is required');

  const result = await notificationsDb.find({
    selector: {
      type: 'credential_notification',
      holderID
    },
    limit: 1000
  });

  return (result.docs || [])
    .filter((doc) => doc && !String(doc._id || '').startsWith('_design/'))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/*
  Function Name: getUnreadUserNotifications

  Technical:
  Fetches unread holder-specific notifications, newest first.
*/
async function getUnreadUserNotifications(holderID) {
  if (!notificationsDb) await initializeDatabases();
  if (!holderID) throw new Error('holderID is required');

  const result = await notificationsDb.find({
    selector: {
      type: 'credential_notification',
      holderID,
      read: false
    },
    limit: 1000
  });

  return (result.docs || [])
    .filter((doc) => doc && !String(doc._id || '').startsWith('_design/'))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// ==========================================================================================================================================================================
//                                                                       CREDENTIAL TEMPLATE Functions
// ==========================================================================================================================================================================
/* 
  Function Name: Create_CredentialTemplate_DB

  Technical:
  Saves a single credential TEMPLATE document into the issuer’s OWN CouchDB database
  (DB: wallet_issuer_credentials) using its couchDBUrl.

  Tropang Ex:
  Ito yung function na nagse-save ng isang template record
  (halimbawa: "Diploma Template 2026") sa personal CouchDB ni issuer.
  Hindi ito blockchain call, pure CouchDB lang para sa dashboard listing.
*/
async function Create_CredentialTemplate_DB(issuerDoc, credentialDoc) {

  /* Step 1: Validate issuer document and CouchDB URL
     
     Technical:
     Ensures issuerDoc exists and contains a valid couchDBUrl.
     Without this, we don’t know which CouchDB instance to write to.

     Tropang Ex:
     Hindi tayo pwedeng mag-save kung hindi alam kung saan DB ilalagay.
     Walang couchDBUrl = no save, throw error.
  */
  if (!issuerDoc || !issuerDoc.couchDBUrl) {
    throw new Error('issuerDoc with couchDBUrl is required');
  }

  /* Step 2: Create Nano client for issuer’s own CouchDB
     
     Technical:
     Uses the issuer’s couchDBUrl to create a dedicated Nano client.

     Tropang Ex:
     Kumokonek tayo sa PERSONAL CouchDB ni issuer,
     hindi sa admin CouchDB ng system.
  */
  const nanoOrg = require('nano')(issuerDoc.couchDBUrl);

  /* Step 3: Select issuer’s wallet_issuer_credentials database
     
     Technical:
     Targets the wallet_issuer_credentials DB where both templates and
     (in the future) issued credentials can live.

     Tropang Ex:
     Dito talaga nakatira yung mga credential records ni issuer,
     kasama na yung mga templates na pinapakita sa dashboard.
  */
  const orgDb = nanoOrg.use('wallet_issuer_credentials');

  /* Step 4: Prepare the credential TEMPLATE document
     
     Technical:
     Assumes credentialDoc already contains the correct structure
     (e.g., _id/credentialId, issuerId, credentialType, credentialName, etc.).
     This function does NOT mutate or auto-generate fields beyond what’s given.

     Tropang Ex:
     Parang “final na” yung credentialDoc na ipapasa dito —
     kumpleto na details, ang trabaho lang nitong function ay i-save sa DB.
  */
  const docToSave = {
    ...credentialDoc
    // NOTE: caller (controller) is responsible for:
    // - _id matching blockchain credentialId
    // - flags like isTemplate: true
    // - timestamps createdAt / updatedAt
  };

  /* Step 5: Insert credential template into issuer’s CouchDB
     
     Technical:
     Inserts docToSave into wallet_issuer_credentials and returns CouchDB response.

     Tropang Ex:
     Ito na yung actual save — pagkatapos nito,
     lalabas na yung template sa list ng issuer dashboard.
  */
  return await orgDb.insert(docToSave);
}
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================
//                                                                       CREDENTIAL ISSUANCE Functions
// ==========================================================================================================================================================================

/* 
  Function Name: Issue_Credential_DB (UPDATED)

  Technical:
  Saves an ISSUED credential (AFTER blockchain success) to:
    (1) Issuer’s CouchDB → issued_credentials
    (2) Admin/Main CouchDB → wallet_user_credentials

  IMPORTANT UPDATE:
    ✅ Persists templateId in both DB copies so we can:
       - query by templateId + holderID
       - prevent duplicate issuance
       - filter eligible recipients

  Tropang Ex:
  After ma-issue na sa blockchain, kailangan may “copies” sa databases para:
    - mabilis i-display sa issuer dashboard (issuer DB)
    - makita sa user wallet / verify flow (admin DB)
*/
async function Issue_Credential_DB(issuerEmail, credentialData) {
  try {

    /* Step 1: Ensure issuersDB initialized + resolve issuer record by email

      Tropang Ex:
      Kailangan natin issuer doc para makuha couchDBUrl + issuer metadata.
    */
    if (!issuersDB) await initializeDatabases();
    const issuer = await getIssuerByEmail(issuerEmail);

    /* Step 2: Validate issuer has couchDBUrl */
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`❌ Issuer ${issuerEmail} has no CouchDB URL configured`);
    }

    /* Step 3: Get deterministic blockchain ID */
    const blockchainId = credentialData.id || credentialData.blockchainId;
    if (!blockchainId) {
      throw new Error('❌ No blockchain ID provided in credentialData');
    }

    /* Step 3.5: Extract templateId (NEW)
      Technical:
      Should come from controller/chaincode.
      Tropang Ex:
      Para alam natin kung anong template pinanggalingan nitong issued credential.
    */
    const templateId = credentialData.templateId || credentialData.templateID || null;

    /* Step 4: Save to ISSUER CouchDB (issued_credentials) */
    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const issuerWalletDb = issuerCouch.use('issued_credentials');

    const credentialDoc = {
      ...credentialData,
      _id: `issuer_cred_${blockchainId}`,
      type: 'credential_instance',
      issuerEmail: issuerEmail,
      issuerID: issuer._id,
      issuerName: issuer.orgName || issuer.contactName,
      blockchainId: blockchainId,

      // ✅ NEW FIELD
      templateId: templateId,

      savedToCouchDBAt: new Date().toISOString(),
      status: credentialData.status || 'issued',
      visibility: 'private',
      skills: credentialData.skills || [],
      badgeImage: credentialData.badgeImage || ''
    };

    console.log(`[COUCHDB] 1️⃣ Saving to ISSUER DB: ${issuer.couchDBUrl}/issued_credentials`);
    const issuerResult = await issuerWalletDb.insert(credentialDoc);

    /* Step 4.5: Determine display order for this holder - polo */
    let nextOrder = 1;
    try {
      const tempAdminCouch = require('nano')(COUCHDB_URL);
      const tempWalletDb = tempAdminCouch.use('wallet_user_credentials');

      const existing = await tempWalletDb.find({
        selector: { holderID: credentialData.holderID },
        fields: ['currentOrder']
      });

      if (existing.docs.length > 0) {
        const maxOrder = Math.max(...existing.docs.map(d => d.currentOrder || 0));
        nextOrder = maxOrder + 1;
      }
    } catch (err) {
      console.warn('[COUCHDB] Could not determine display order, defaulting to 1:', err.message);
    }

    /* Step 5: Save to ADMIN/Main CouchDB (wallet_user_credentials) */
    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    const userCredentialDoc = {
      ...credentialDoc,
      _id: `user_cred_${blockchainId}`,
      holderID: credentialData.holderID,
      savedToUserWalletAt: new Date().toISOString(),
      visibility: 'private',
      originalOrder: nextOrder,
      currentOrder: nextOrder
    };

    console.log(`[COUCHDB] 2️⃣ Saving to ADMIN DB: ${COUCHDB_URL}/wallet_user_credentials`);
    const adminResult = await userWalletDb.insert(userCredentialDoc);

    /* Step 6: Return success summary */
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
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================

/* 
  Function Name: getIssuerCredentials

  Technical: “Wrapper” fetcher for issuer credentials used by GET route.
            Returns credentials PLUS issuer metadata (issuerName/email/count).
  Tropang Ex: Ito yung pang-API response na kompleto: hindi lang list, pati details about the issuer.

  ⚠️ Note: Same DB target: wallet_issuer_credentials.
*/
async function getIssuerCredentials(issuerId) {
  try {
    console.log(`[COUCHDB] Fetching credentials for issuer: ${issuerId}`);
    
    if (!issuersDB) await initializeDatabases();
    
    /* Step 1: Get issuer record (to get couchDBUrl + metadata)
       Tropang Ex: Kailangan muna issuer doc para alam natin saan yung DB niya.
    */
    const issuer = await getIssuerById(issuerId);
    
    if (!issuer) {
      throw new Error(`Issuer ${issuerId} not found`);
    }
    
    /* Step 2: If no couchDBUrl, return empty list (soft fail)
       Tropang Ex: Walang configured DB si issuer, so wala tayong mahuhugot.
    */
    if (!issuer.couchDBUrl) {
      console.log(`[COUCHDB] ⚠️ Issuer has no CouchDB URL configured`);
      return [];
    }
    
    /* Step 3: Connect to issuer CouchDB + fetch credential_instance docs
       Tropang Ex: Kunin lahat ng credentials sa DB niya.
    */
    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const walletDb = issuerCouch.use('wallet_issuer_credentials');
    
    const result = await walletDb.find({
      selector: { type: 'credential_instance' }
    });
    
    console.log(`[COUCHDB] ✅ Found ${result.docs.length} credentials for issuer ${issuerId}`);
    
    /* Step 4: Return enriched response object
       Tropang Ex: Ito yung “pang frontend” na response: may count + issuer info + list.
    */
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
// ==========================================================================================================================================================================

/* 
  Function Name: getUserCredentialsByHolderId

  Technical: Fetches credentials for a specific holderID from ADMIN CouchDB (wallet_user_credentials).
  Tropang Ex: Pang “user wallet” fetch. Kunin lahat ng credentials na naka-assign sa student/user.
  Note: This is admin-side DB (centralized) not issuer private DB.
*/
async function getUserCredentialsByHolderId(holderID) {
  try {
    console.log(`[COUCHDB] Fetching credentials for holder: ${holderID}`);
    
    /* Step 1: Connect to admin CouchDB + select wallet_user_credentials
       Tropang Ex: Ito yung central DB kung saan naka-store lahat ng user credentials.
    */
    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');
    
    /* Step 2: Find docs that match holderID
       Tropang Ex: Filter by user/student ID.
    */
    const result = await userWalletDb.find({
      selector: { holderID: holderID }
    });
    
    console.log(`[COUCHDB] ✅ Found ${result.docs.length} credentials for holder ${holderID}`);
    return result.docs;
    
  } catch (error) {
    console.error(`[COUCHDB] ❌ Error fetching credentials by holder:`, error.message);
    return [];
  }
}
// ==========================================================================================================================================================================
/*
  Function Name: updateCredentialVisibility

  Technical:
  Updates the visibility field of a credential in wallet_user_credentials.
  Called when user toggles public/private on their profile page.
  CouchDB only — no blockchain call needed (visibility is UI/privacy preference)
  // - polo
*/
async function updateCredentialVisibility(credentialId, newVisibility) {
  try {
    console.log(`[COUCHDB] Updating visibility for: ${credentialId} → ${newVisibility}`);

    // --- 1) Update in ADMIN DB: wallet_user_credentials ---
    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    const userDocId = `user_cred_${credentialId.replace(/^user_cred_/, '')}`;
    const userDoc = await userWalletDb.get(userDocId);
    userDoc.visibility = newVisibility;
    const userResult = await userWalletDb.insert(userDoc);
    console.log(`[COUCHDB] ✅ Visibility updated in wallet_user_credentials: ${userDocId}`);

    // --- 2) Update in ISSUER DB: issued_credentials ---
    const issuerEmail = userDoc.issuerEmail;
    if (issuerEmail) {
      const issuer = await getIssuerByEmail(issuerEmail);
      if (issuer && issuer.couchDBUrl) {
        const issuerCouch = require('nano')(issuer.couchDBUrl);
        const issuedDb = issuerCouch.use('issued_credentials');

        const issuerDocId = `issuer_cred_${credentialId.replace(/^user_cred_/, '').replace(/^issuer_cred_/, '')}`;
        try {
          const issuerDoc = await issuedDb.get(issuerDocId);
          issuerDoc.visibility = newVisibility;
          await issuedDb.insert(issuerDoc);
          console.log(`[COUCHDB] ✅ Visibility updated in issued_credentials: ${issuerDocId}`);
        } catch (err) {
          console.warn(`[COUCHDB] ⚠️ Could not update issuer-side visibility (${issuerDocId}):`, err.message);
        }
      }
    }

    return userResult;

  } catch (error) {
    console.error(`[COUCHDB] ❌ Error updating visibility:`, error.message);
    throw error;
  }
}


/*
  Function Name: updateIssuerTemplateVisibility

  Technical:
  Updates the visibility field of a TEMPLATE in an issuer's own
  wallet_issuer_credentials database.
  CouchDB only — no blockchain call needed.
*/
async function updateIssuerTemplateVisibility(issuerId, credentialId, newVisibility) {
  try {
    if (!issuerId) throw new Error('issuerId is required');
    if (!credentialId) throw new Error('credentialId is required');
    if (!['public', 'private'].includes(newVisibility)) {
      throw new Error('visibility must be "public" or "private"');
    }

    const issuer = await getIssuerById(issuerId);
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`Issuer ${issuerId} not found or missing CouchDB URL`);
    }

    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const walletDb = issuerCouch.use('wallet_issuer_credentials');

    const normalizedCredentialId = credentialId.replace(/^issuer_cred_/, '').replace(/^user_cred_/, '');
    const candidateIds = Array.from(new Set([
      credentialId,
      normalizedCredentialId,
      `issuer_cred_${normalizedCredentialId}`,
      `user_cred_${normalizedCredentialId}`
    ].filter(Boolean)));

    let templateDoc = null;
    for (const candidateId of candidateIds) {
      try {
        templateDoc = await walletDb.get(candidateId);
        break;
      } catch (error) {
        if (error.statusCode !== 404) throw error;
      }
    }

    if (!templateDoc) {
      const result = await walletDb.find({
        selector: {
          $and: [
            {
              $or: [
                { _id: { $in: candidateIds } },
                { id: { $in: candidateIds } },
                { credentialId: { $in: candidateIds } },
                { blockchainId: { $in: candidateIds } }
              ]
            },
            {
              $or: [
                { isTemplate: true },
                { type: 'credential_template' }
              ]
            }
          ]
        },
        limit: 1
      });
      templateDoc = result.docs?.[0] || null;
    }

    if (!templateDoc) {
      throw new Error(`Template ${credentialId} not found for issuer ${issuerId}`);
    }

    templateDoc.visibility = newVisibility;
    templateDoc.updatedAt = new Date().toISOString();
    await walletDb.insert(templateDoc);

    return templateDoc;
  } catch (error) {
    console.error('[COUCHDB] ❌ Error updating issuer template visibility:', error.message);
    throw error;
  }
}

/*
  Function Name: updateCredentialOrder
  Technical: Updates the currentOrder field of a credential in wallet_user_credentials.
  Called when user drags/reorders credentials on their profile page.
  CouchDB only — no blockchain call needed. // - polo
*/
async function updateCredentialOrder(credentialId, newOrder) {
  try {
    console.log(`[COUCHDB] Updating order for: ${credentialId} → ${newOrder}`);

    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    const docId = `user_cred_${credentialId.replace(/^user_cred_/, '')}`;
    const doc = await userWalletDb.get(docId);
    doc.currentOrder = newOrder;

    const result = await userWalletDb.insert(doc);
    console.log(`[COUCHDB] ✅ Order updated for: ${docId} → ${newOrder}`);
    return result;

  } catch (error) {
    console.error(`[COUCHDB] ❌ Error updating order:`, error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================

/* 
  Function Name: deleteIssuerCredentialTemplate

  Technical: Deletes a credential doc/template from issuer’s CouchDB (wallet_issuer_credentials) by _id.
  Tropang Ex: Pang “delete template/record” sa issuer side. Hanapin yung doc, then delete using _id + _rev.
*/
async function deleteIssuerCredentialTemplate(credentialId, issuerEmail) {
  try {

    /* Step 1: Resolve issuer + couchDBUrl
       Tropang Ex: Need natin yung DB URL ni issuer.
    */
    const issuer = await getIssuerByEmail(issuerEmail);
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`Issuer ${issuerEmail} not found`);
    }

    /* Step 2: Connect to issuer CouchDB and wallet DB */
    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const walletDb = issuerCouch.use('wallet_issuer_credentials');
    
    /* Step 3: Find the target credential doc
       Tropang Ex: Hanapin yung exact doc bago i-delete (need _rev).
    */
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
    
    /* Step 4: Delete using destroy(_id, _rev)
       Tropang Ex: CouchDB requires _rev to delete safely.
    */
    const doc = result.docs[0];
    await walletDb.destroy(doc._id, doc._rev);
    
    console.log(`[COUCHDB] Credential ${credentialId} deleted`);
    return { success: true };
    
  } catch (error) {
    console.error(`Error deleting credential:`, error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

/*
  Function Name: Revoke_Credential_DB

  Technical:
  Revokes an issued credential in BOTH:
  1) Issuer's CouchDB (`issued_credentials` DB)
  2) Admin/main CouchDB (`wallet_user_credentials` DB)

  Rules:
  - Does NOT delete any document.
  - Sets:
      status = 'revoked'
      revokedAt = <ISO timestamp>
  - Expects the caller to pass the BLOCKCHAIN credential ID (credentialData.id),
    NOT the CouchDB-prefixed IDs.

  Tropang Ex:
  Pag nag-revoke ka ng credential:
  - Ia-update yung kopya sa DB ni issuer (para sa issuer dashboard).
  - Ia-update din yung kopya sa admin DB / user wallet (para sa holder view / verification).
*/

async function Revoke_Credential_DB(blockchainId, issuerEmail, rejectionReason) {
  try {
    if (!blockchainId) {
      throw new Error('blockchainId is required to revoke credential');
    }

    // =========================================================
    // Step 1: Resolve issuer & basic validation
    // =========================================================
    if (!issuersDB) {
      await initializeDatabases();
    }

    const issuer = await getIssuerByEmail(issuerEmail);
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`Issuer ${issuerEmail} not found or has no CouchDB URL configured`);
    }

    // =========================================================
    // Step 2: Revoke in ISSUER CouchDB (issued_credentials)
    // =========================================================
    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const issuerIssuedDb = issuerCouch.use('issued_credentials');

    // Match Issue_Credential_DB: issuer_cred_<blockchainId>
    const issuerDocId = `issuer_cred_${blockchainId}`;

    let issuerDoc;
    try {
      issuerDoc = await issuerIssuedDb.get(issuerDocId);
    } catch (err) {
      if (err.statusCode === 404) {
        throw new Error(`Issuer credential document not found: ${issuerDocId}`);
      }
      throw err;
    }

    issuerDoc.status = 'revoked';
    issuerDoc.revokedAt = new Date().toISOString();
    issuerDoc.rejectionReason = rejectionReason || ''; // - polo

    const issuerSaveResult = await issuerIssuedDb.insert(issuerDoc);
    console.log(`COUCHDB: Issuer credential revoked in issued_credentials: ${issuerDocId}`);

    // =========================================================
    // Step 3: Revoke in ADMIN CouchDB (wallet_user_credentials)
    // =========================================================
    const adminCouch = require('nano')(COUCHDB_URL); // same constant used above
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    // Match Issue_Credential_DB: user_cred_<blockchainId>
    const userDocId = `user_cred_${blockchainId}`;

    let userDoc;
    try {
      userDoc = await userWalletDb.get(userDocId);
    } catch (err) {
      if (err.statusCode === 404) {
        console.warn(`COUCHDB: User wallet credential not found for revoke: ${userDocId}`);
        // We DO NOT throw here; issuer-side revoke already succeeded.
        userDoc = null;
      } else {
        throw err;
      }
    }

    let adminSaveResult = null;
    if (userDoc) {
      userDoc.status = 'revoked';
      userDoc.revokedAt = new Date().toISOString();
      userDoc.rejectionReason = rejectionReason || ''; // - polo

      adminSaveResult = await userWalletDb.insert(userDoc);
      console.log(`COUCHDB: User wallet credential revoked in wallet_user_credentials: ${userDocId}`);
    }

    // =========================================================
    // Step 4: Return combined result
    // =========================================================
    return {
      success: true,
      message: 'Credential revoked successfully in CouchDB copies',
      blockchainId,
      issuerDocId,
      userDocId,
      issuerSave: issuerSaveResult,
      userWalletSave: adminSaveResult
    };

  } catch (error) {
    console.error('COUCHDB: Error revoking credential in CouchDB:', error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================
/* 
  Function Name: Verify_Credential_DB

  Technical: Verifies if a credential exists in ADMIN CouchDB (wallet_user_credentials) using document _id.
            It normalizes the input ID to always search as user_cred_<id>.
  Tropang Ex: Pang verify endpoint: chine-check kung may record sa user wallet DB, meaning “known credential”.
*/
async function Verify_Credential_DB(credentialId) {
  try {
    console.log(`[COUCHDB] Verifying credential: ${credentialId}`);
    
    /* Step 1: Connect to admin CouchDB + wallet_user_credentials */
    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');
    
    /* Step 2: Normalize credential ID format
       Technical: If input already has prefix, remove then re-add once.
       Tropang Ex: Para iwas "user_cred_user_cred_xxx" cases.
    */
    const cleanId = credentialId.replace(/^user_cred_/, '');
    const searchId = `user_cred_${cleanId}`;
    
    console.log(`[COUCHDB] Searching for ID: ${searchId}`);
    
    /* Step 3: Find exact doc by _id */
    const result = await userWalletDb.find({
      selector: { _id: searchId },
      limit: 1
    });
    
    /* Step 4: If not found, return verified=false */
    if (result.docs.length === 0) {
      console.log(`[COUCHDB] ❌ Credential not found: ${searchId}`);
      return {
        verified: false,
        message: 'Credential not found in database',
        credentialId: searchId,
        timestamp: new Date().toISOString()
      };
    }
    
    /* Step 5: If found, return verification payload */
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
// ==========================================================================================================================================================================

// =================================================================================================
// NEW: Get all APPROVED issuers (for admin dashboard)
// =================================================================================================

/*
  Function Name: getApprovedIssuers
  Technical: Fetches all issuer registration documents with status = "approved", sorted by createdAt.
  Tropang Ex: Pangkuha ng lahat ng issuers na na-approve na ni admin para lumabas sa "Approved Issuers"
              section ng admin dashboard.
*/
async function getApprovedIssuers() {
  try {
    /* Step 1: Ensure issuers DB is initialized
       
       Technical: Make sure na naka-setup na yung CouchDB connection / handle bago mag-query.
       Tropang Ex: Para siguradong may nakakabit na "kable" papunta sa issuers database bago tayo humingi
                   ng listahan ng approved orgs.
    */
    if (!issuersDB) await initializeDatabases();

    /* Step 2: Query approved issuer registrations
       
       Technical:
         - Mango query filtering by:
             type   = "issuer_registration"
             status = "approved"
         - Sorted by "createdAt" (same style as getPendingIssuers) para pinaka-recent applications
           ang nasa unahan.
       Tropang Ex: Pareho lang sa pending issuers, pero status = approved. Iniisa-isa niya lahat ng org
                   na pasado na at inaayos yung list ayon sa kung kelan sila nag-apply / na-approve.
    */
    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        status: 'approved'
      },
      sort: ['createdAt'] // CHANGES: same sort as pending issuers; avoids no_usable_index on orgName
    });

    /* Step 3: Return approved issuer documents
       
       Technical: Returns raw issuer docs (full CouchDB documents).
       Tropang Ex: Ibinabalik yung buong info ng approved issuers (orgName, contactName, email, status,
                   accredited, etc.) para ma-display sa "Approved Issuers" table sa frontend.
    */
    return result.docs;

  } catch (error) {
    /* Step 4: Error handling
       
       Technical: Logs and rethrows any CouchDB / query errors for upstream handling.
       Tropang Ex: Kapag pumalpak yung query (ex: down yung DB), maglo-log tayo ng malinaw na error
                   tapos ibabalik sa caller para ma-convert niya to 500 response.
    */
    console.error('[COUCHDB] Error getting approved issuers:', error.message);
    throw error;
  }
}

/*
  Function Name: getRejectedIssuers
  Technical: Fetches all issuer registration documents with status = "rejected", sorted by createdAt.
  Tropang Ex: Pangkuha ng lahat ng issuers na ni-reject ni admin para lumabas sa "Rejected Issuers"
              section ng admin dashboard.
*/
async function getRejectedIssuers() {
  try {
    /* Step 1: Ensure issuers DB is initialized

       Technical: Make sure na naka-setup na yung CouchDB connection / handle bago mag-query.
       Tropang Ex: Para siguradong may nakakabit na "kable" papunta sa issuers database bago tayo humingi
                   ng listahan ng rejected orgs.
    */
    if (!issuersDB) await initializeDatabases();

    /* Step 2: Query rejected issuer registrations

       Technical:
         - Mango query filtering by:
             type   = "issuer_registration"
             status = "rejected"
         - Sorted by "createdAt" para consistent sa pending/approved.
       Tropang Ex: Pareho lang sa approved issuers, pero status = rejected.
    */
    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        status: 'rejected'
      },
      sort: ['createdAt']
    });

    /* Step 3: Return rejected issuer documents
       Tropang Ex: Ibinabalik yung buong info ng rejected issuers kasama rejection reason.
    */
    return result.docs;

  } catch (error) {
    /* Step 4: Error handling */
    console.error('[COUCHDB] Error getting rejected issuers:', error.message);
    throw error;
  }
}
/*
  Function Name: getDisabledIssuers
  Technical: Fetches issuer registration documents with status = "disabled".
*/
async function getDisabledIssuers() {
  try {
    if (!issuersDB) await initializeDatabases();

    const result = await issuersDB.find({
      selector: {
        type: 'issuer_registration',
        status: 'disabled'
      },
      sort: ['createdAt']
    });

    return result.docs;
  } catch (error) {
    console.error('[COUCHDB] Error getting disabled issuers:', error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================

async function getIssuerTemplatesByIssuerId(issuerId) {
  try {
    if (!issuersDB) await initializeDatabases();
    const issuer = await getIssuerById(issuerId);

    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`❌ Issuer ${issuerId} has no CouchDB URL configured`);
    }

    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const db = issuerCouch.use('wallet_issuer_credentials');

    // Based on your screenshot: templates are marked with isTemplate: true
    const result = await db.find({
      selector: {
        $or: [
          { isTemplate: true },
          { type: 'credential_template' } // optional fallback if you ever use this later
        ]
      }
    });

    console.log(`[COUCHDB] Found ${result.docs.length} TEMPLATE(s) for issuer ${issuerId}`);
    return result.docs;

  } catch (error) {
    console.error(`❌ Error fetching templates for issuer ${issuerId}:`, error.message);
    return [];
  }
}
// ==========================================================================================================================================================================
/*
  Function Name: checkIssuerHasCredentialTemplates

  Technical:
  Checks the issuer's OWN CouchDB (ex: DLSU port 9084 via issuer.couchDBUrl),
  database: wallet_issuer_credentials
  to determine whether the issuer has at least one credential template.

  Returns:
    { hasTemplates: boolean, count: number }

  Tropang Ex:
  Pang-check bago payagan mag “+ Issue Credential”.
  Kapag wala pang template si issuer, bawal muna mag-issue.
*/
async function checkIssuerHasCredentialTemplates(issuerId) {
  try {
    if (!issuerId) {
      throw new Error('issuerId is required');
    }

    if (!issuersDB) await initializeDatabases();
    const issuer = await getIssuerById(issuerId);

    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`Issuer ${issuerId} has no CouchDB URL configured`);
    }

    // Connect to issuer CouchDB (ex: DLSU = :9084)
    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const db = issuerCouch.use('wallet_issuer_credentials');

    // Templates are marked with isTemplate: true (plus optional fallback type)
    const result = await db.find({
      selector: {
        $or: [
          { isTemplate: true },
          { type: 'credential_template' }
        ]
      }
    });

    const count = Array.isArray(result?.docs) ? result.docs.length : 0;

    console.log(`[COUCHDB] Template existence check for issuer ${issuerId}: ${count} template(s)`);

    return {
      hasTemplates: count > 0,
      count
    };

  } catch (error) {
    console.error(`❌ Error checking templates for issuer ${issuerId}:`, error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

async function getIssuerIssuedByIssuerId(issuerId) {
  try {
    if (!issuersDB) await initializeDatabases();
    const issuer = await getIssuerById(issuerId);

    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`❌ Issuer ${issuerId} has no CouchDB URL configured`);
    }

    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const db = issuerCouch.use('issued_credentials');

    // Based on your screenshot: issued copies have type: "credential_instance"
    const result = await db.find({
      selector: { type: 'credential_instance' }
      // Optional strict filter (not required since per-issuer DB):
      // selector: { type: 'credential_instance', issuerID: issuerId }
    });

    console.log(`[COUCHDB] Found ${result.docs.length} ISSUED credential(s) for issuer ${issuerId}`);
    return result.docs;

  } catch (error) {
    console.error(`❌ Error fetching issued credentials for issuer ${issuerId}:`, error.message);
    return [];
  }
}
// ==========================================================================================================================================================================

async function getAllIssuerCredentialsAdmin(options = {}) {
  try {
    const issuerIdFilter = options.issuerId || null; // optional specific issuer
    const typeFilter = options.type || null;         // 'issued' | 'templates' | null

    // Step 1: Get issuers that should remain visible in admin credentials (approved + disabled)
    const approvedIssuers = await getApprovedIssuers();
    const disabledIssuers = await getDisabledIssuers();
    const issuers = [
      ...(Array.isArray(approvedIssuers) ? approvedIssuers : []),
      ...(Array.isArray(disabledIssuers) ? disabledIssuers : [])
    ];

    const allRows = [];

    for (const issuer of issuers) {
      const issuerId = issuer._id || issuer.id;
      if (!issuerId) continue;

      // Optional issuer filter
      if (issuerIdFilter && issuerIdFilter !== issuerId) continue;

      // Step 2: Fetch docs depending on type filter
      let templateDocs = [];
      let issuedDocs = [];

      if (typeFilter === 'templates') {
        templateDocs = await getIssuerTemplatesByIssuerId(issuerId);
      } else if (typeFilter === 'issued') {
        issuedDocs = await getIssuerIssuedByIssuerId(issuerId);
      } else {
        templateDocs = await getIssuerTemplatesByIssuerId(issuerId);
        issuedDocs = await getIssuerIssuedByIssuerId(issuerId);
      }

      const docs = [...templateDocs, ...issuedDocs];

      // Step 3: Normalize into flat rows for the admin dashboard
      for (const doc of docs) {
        const isTemplate = doc.isTemplate === true;
        const isIssued = doc.type === 'credential_instance';

        const nested =
          doc.blockchain && doc.blockchain.credentialData
            ? doc.blockchain.credentialData
            : {};

        const credentialType =
          doc.credentialType ||
          nested.credentialType ||
          'N/A';

        const credentialName =
          doc.credentialName ||
          nested.credentialName ||
          doc.title ||
          'N/A';

        const holderID =
          doc.holderID ||
          nested.holderID ||
          null;

        const createdAt =
          doc.createdAt ||
          doc.savedToCouchDBAt ||
          doc.savedToUserWalletAt ||
          doc.issueDate ||
          doc.issuedDate ||
          null;

        allRows.push({
          issuerId,
          issuerName:
            issuer.orgName ||
            issuer.name ||
            issuer.contactName ||
            'Unknown Issuer',
          issuerEmail: issuer.email || 'N/A',

          credentialId:
            doc.blockchainId ||
            doc.credentialId ||
            doc.id ||
            doc._id ||
            null,

          type: isTemplate ? 'Template' : (isIssued ? 'Issued' : 'Unknown'),

          credentialType,
          credentialName,
          holderID,
          holderName: null, // will enrich below
          status: doc.status || nested.status || 'unknown',
          createdAt
        });
      }
    }

    // ✅ STEP A: Enrich holderName (same logic as verifier logs)
    for (const row of allRows) {
      if (row.type !== 'Issued' || !row.holderID) {
        row.holderName = '—';
        continue;
      }

      try {
        const user = await getUser(row.holderID);

        row.holderName =
          user.fullName ||
          user.username ||
          user.name ||
          user.displayName ||
          user.email ||
          'Unknown';
      } catch (err) {
        console.warn(
          '[ADMIN] Failed to resolve holderName for',
          row.holderID,
          err.message
        );
        row.holderName = 'Unknown';
      }
    }

    // Step 4: Sort newest first
    allRows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return allRows;

  } catch (error) {
    console.error('Error in getAllIssuerCredentialsAdmin:', error.message);
    throw error;
  }
}

async function Disable_Issuer(issuerId, adminEmail, reason) {
  if (!issuersDB) await initializeDatabases();

  if (!reason || reason.trim() === "") {
    throw new Error("Disable reason is required");
  }

  const issuerDoc = await issuersDB.get(issuerId);

  issuerDoc.status = "disabled";
  issuerDoc.disabledAt = new Date().toISOString();
  issuerDoc.disabledBy = adminEmail;
  issuerDoc.disableReason = reason;

  return await issuersDB.insert(issuerDoc);
}

async function Enable_Issuer(issuerId, adminEmail, reason) {
  if (!issuersDB) await initializeDatabases();

  if (!reason || reason.trim() === "") {
    throw new Error("Enable reason is required");
  }

  const issuerDoc = await issuersDB.get(issuerId);

  issuerDoc.status = "approved";
  issuerDoc.enabledAt = new Date().toISOString();
  issuerDoc.enabledBy = adminEmail;
  issuerDoc.enableReason = reason;

  return await issuersDB.insert(issuerDoc);
}

async function Disable_User(userId, adminEmail, reason) {
  if (!usersDb) await initializeDatabases();

  if (!reason || reason.trim() === "") {
    throw new Error("Disable reason is required");
  }

  const userDoc = await usersDb.get(userId);

  userDoc.isActive = false;
  userDoc.disabledAt = new Date().toISOString();
  userDoc.disabledBy = adminEmail;
  userDoc.disableReason = reason;

  return await usersDb.insert(userDoc);
}

async function Enable_User(userId, adminEmail, reason) {
  if (!usersDb) await initializeDatabases();

  if (!reason || reason.trim() === "") {
    throw new Error("Enable reason is required");
  }

  const userDoc = await usersDb.get(userId);

  userDoc.isActive = true;
  userDoc.enabledAt = new Date().toISOString();
  userDoc.enabledBy = adminEmail;
  userDoc.enableReason = reason;

  return await usersDb.insert(userDoc);
}

// ==========================================================================================================================================================================
/*
  Function Name: checkAndExpireCredentials

  Technical:
  Scans ALL credentials in wallet_user_credentials and issued_credentials.
  For each credential where:
    - status is 'issued' or 'active'
    - expiryDate exists AND current date has passed it
  → Updates CouchDB status to 'expired' in both DBs
  → Returns list of expired credential IDs for blockchain logging by caller

  Called by: midnight cron job in sdk-server-fixed.js
  CouchDB update only — blockchain log handled separately by caller // - polo
*/
async function checkAndExpireCredentials() {
  try {
    console.log('[EXPIRY] Starting credential expiry check...');

    const now = new Date();
    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    /* Step 1: Fetch all credentials from wallet_user_credentials - polo */
    const result = await userWalletDb.find({
      selector: {
        $or: [
          { status: 'issued' },
          { status: 'active' }
        ]
      }
    });

    const expiredIds = [];

    /* Step 2: Check each credential's expiryDate - polo */
    for (const doc of result.docs) {
      if (!doc.expiryDate) continue;

      const expiry = new Date(doc.expiryDate);
      if (now <= expiry) continue;

      /* Step 3: Update wallet_user_credentials - polo */
      doc.status = 'expired';
      doc.expiredAt = now.toISOString();
      await userWalletDb.insert(doc);
      console.log(`[EXPIRY] ✅ Expired in wallet_user_credentials: ${doc._id}`);

      /* Step 4: Update issued_credentials on issuer side - polo */
      if (doc.issuerEmail) {
        try {
          const issuer = await getIssuerByEmail(doc.issuerEmail);
          if (issuer && issuer.couchDBUrl) {
            const issuerCouch = require('nano')(issuer.couchDBUrl);
            const issuedDb = issuerCouch.use('issued_credentials');
            const issuerDocId = `issuer_cred_${doc.blockchainId}`;
            try {
              const issuerDoc = await issuedDb.get(issuerDocId);
              issuerDoc.status = 'expired';
              issuerDoc.expiredAt = now.toISOString();
              await issuedDb.insert(issuerDoc);
              console.log(`[EXPIRY] ✅ Expired in issued_credentials: ${issuerDocId}`);
            } catch (err) {
              console.warn(`[EXPIRY] ⚠️ Could not update issuer-side doc (${issuerDocId}):`, err.message);
            }
          }
        } catch (err) {
          console.warn(`[EXPIRY] ⚠️ Could not resolve issuer for ${doc._id}:`, err.message);
        }
      }

      /* Step 5: Collect blockchainId for blockchain logging by caller - polo */
      if (doc.blockchainId) {
        expiredIds.push({
          blockchainId: doc.blockchainId,
          holderID: doc.holderID
        });
      }
    }

    console.log(`[EXPIRY] ✅ Done. ${expiredIds.length} credential(s) expired.`);
    return expiredIds;

  } catch (error) {
    console.error('[EXPIRY] ❌ Error during expiry check:', error.message);
    throw error;
  }
}

// =========================================================================================================
// ADMIN: CHANGE PASSWORD (WITH CURRENT PASSWORD CHECK + AUDIT LOG)
// =========================================================================================================

/*
  Helper: fetch admin user doc by email
  - Admins are stored in users DB with role === 'admin'
*/
async function getAdminByEmail(adminEmail) {
  if (!usersDb) await initializeDatabases();

  const result = await usersDb.find({
    selector: {
      type: 'user',
      role: 'admin',
      email: adminEmail
    },
    limit: 1
  });

  return (result.docs && result.docs.length > 0) ? result.docs[0] : null;
}

/*
  Function Name: verifyAdminCurrentPassword

  Technical:
  - Finds admin account by email (role: admin)
  - bcrypt compares currentPassword with stored hash
  - Returns { valid: boolean, reason?: string }

  Tropang Ex:
  - Pang-check kung tama yung current password bago payagan magpalit.
*/
async function verifyAdminCurrentPassword(adminEmail, currentPassword) {
  try {
    if (!adminEmail || !currentPassword) {
      return { valid: false, reason: 'adminEmail and currentPassword are required' };
    }

    const adminDoc = await getAdminByEmail(adminEmail);
    if (!adminDoc) {
      return { valid: false, reason: 'Admin not found' };
    }

    const ok = await bcryptjs.compare(currentPassword, adminDoc.password);
    return ok ? { valid: true } : { valid: false, reason: 'Invalid current password' };

  } catch (error) {
    return { valid: false, reason: error.message };
  }
}

/*
  Function Name: changeAdminPassword

  Technical:
  - Requires currentPassword (re-entry) for safety
  - Verifies currentPassword
  - Hashes newPassword
  - Updates admin doc in users DB
  - Writes an audit record to admin_audit_logs (admin CouchDB on port 5985 via `couch`)

  Parameters:
  - adminEmail: who is changing password (target)
  - currentPassword: must match existing password
  - newPassword: new password (plain; will be hashed)
  - performedBy: who performed it (usually same as adminEmail; could be superadmin email/id)
  - meta (optional): extra safe metadata like { ip, userAgent, reason, via }

  Tropang Ex:
  - Official change password flow na may check + may audit log.
*/
async function changeAdminPassword(adminEmail, currentPassword, newPassword, performedBy, meta = {}) {
  if (!usersDb) await initializeDatabases();

  if (!adminEmail || !currentPassword || !newPassword) {
    throw new Error('adminEmail, currentPassword, and newPassword are required');
  }

  // 1) Fetch admin doc
  const adminDoc = await getAdminByEmail(adminEmail);
  if (!adminDoc) {
    throw new Error('Admin not found');
  }

  // 2) Verify current password
  const ok = await bcryptjs.compare(currentPassword, adminDoc.password);
  if (!ok) {
    throw new Error('Invalid current password');
  }

  // 3) Hash new password + update doc
  const hashedNewPassword = await bcryptjs.hash(newPassword, 10);
  adminDoc.password = hashedNewPassword;
  adminDoc.updatedAt = new Date().toISOString();

  const updateResult = await usersDb.insert(adminDoc);

  // 4) Best-effort audit log (DO NOT break password change if audit insert fails)
  try {
    const auditDb = couch.use('admin_audit_logs');

    const now = new Date().toISOString();
    const auditId = `admin\_pwchange\_${Date.now()}\_${Math.random().toString(36).slice(2, 10)}`;

    const auditDoc = {
      _id: auditId,
      type: 'admin_audit',
      action: 'admin_password_change',
      targetAdminEmail: adminEmail,
      performedBy: performedBy || adminEmail,
      timestamp: now,

      // Optional metadata (safe only; never store passwords)
      meta: {
        via: meta.via || 'ui',
        ip: meta.ip || null,
        userAgent: meta.userAgent || null,
        reason: meta.reason || null
      },

      version: 1
    };

    await auditDb.insert(auditDoc);

 } catch (auditErr) {
   console.warn('[COUCHDB][admin_audit_logs] Failed to write audit log:', auditErr.message);
 }

 return {
   ok: true,
   id: adminDoc._id,
   rev: updateResult.rev
 };
}

// ==========================================================================================================================================================================

/*
  Function Name: getBlockedHolderIDsByTemplate

  Technical:
  Fetches all issued credential instances from ADMIN/Main CouchDB (wallet_user_credentials)
  that match a given templateId, then returns a UNIQUE list of holderIDs that should be BLOCKED
  from receiving the same template again.

  Blocking rule:
    - If credential is REVOKED → do NOT block (allowed to re-issue)
    - If credential is EXPIRED → do NOT block (allowed to re-issue)
    - If credential has no expiryDate → treat as ACTIVE → block
    - If expiryDate exists and is in the future → ACTIVE → block

  Tropang Ex:
  Ito yung “bawal muna” list.
  Kapag pumili ka ng template sa dropdown, dito natin kukunin yung mga users
  na meron pang active/non-expired copy ng same template,
  para hindi sila lumabas sa users dropdown.
*/
async function getBlockedHolderIDsByTemplate(templateId) {
  try {

    /* Step 1: Validate input

      Tropang Ex:
      Kailangan natin malaman kung anong template ang pinili,
      kasi yun yung basis ng pag-filter.
    */
    if (!templateId) {
      throw new Error('templateId is required');
    }

    /* Step 2: Ensure databases are initialized (usersDb needed for admin-role filtering)

      Tropang Ex:
      Kailangan natin ma-check yung role ng holderIDs (para ma-exclude admins).
    */
    if (!usersDb) await initializeDatabases();

    /* Step 3: Connect to ADMIN/Main CouchDB + select wallet_user_credentials

      Tropang Ex:
      Dito naka-store lahat ng issued credentials ng lahat ng users.
    */
    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    /* Step 4: Query all credentials that match templateId

      Technical:
      We only pull minimal fields needed for blocking logic:
        - holderID
        - expiryDate
        - status

      Tropang Ex:
      Kunin lahat ng credentials na galing sa template na ’to.
    */
    const result = await userWalletDb.find({
      selector: { templateId: templateId },
      fields: ['holderID', 'expiryDate', 'status']
    });

    /* Step 5: Build blocked set (unique holderIDs)

      Rules recap:
      - revoked => allowed (not blocked)
      - expired => allowed (not blocked)
      - expiryDate missing/empty => active => blocked
      - expiryDate in future => blocked

      Tropang Ex:
      Ito yung initial list ng mga "bawal muna" bigyan ulit.
    */
    const now = new Date();
    const blockedSet = new Set();

    for (const doc of (result.docs || [])) {
      if (!doc || !doc.holderID) continue;

      const status = (doc.status || '').toLowerCase();

      // Step 5A: If revoked, skip (allowed again)
      if (status === 'revoked') continue;

      // Step 5B: If already marked expired, skip (allowed again)
      if (status === 'expired') continue;

      // Step 5C: If no expiryDate, treat as active => block
      if (!doc.expiryDate || String(doc.expiryDate).trim() === '') {
        blockedSet.add(doc.holderID);
        continue;
      }

      // Step 5D: If expiryDate exists, compare to now
      const expiry = new Date(doc.expiryDate);
      if (!isNaN(expiry.getTime()) && expiry > now) {
        blockedSet.add(doc.holderID);
      }
    }

    /* Step 6: Remove ADMIN holderIDs from blockedSet (NEW)

      Technical:
      Some admin accounts may have wallet_user_credentials entries.
      We don't want admin IDs to affect dropdown filtering, so we remove them.

      Tropang Ex:
      Kahit may credentials si admin, di siya dapat kasama sa logic ng issuance dropdown.
    */
    const blockedIDs = Array.from(blockedSet);

    if (blockedIDs.length > 0) {
      // fetch user docs in batch; ignore missing docs
      const userDocs = await usersDb.fetch({ keys: blockedIDs });

      for (const row of (userDocs.rows || [])) {
        const doc = row.doc;
        if (!doc) continue;

        const role = String(doc.role || '').toLowerCase();
        if (role === 'admin') {
          blockedSet.delete(doc._id);
        }
      }
    }

    /* Step 7: Return list of blocked holderIDs

      Tropang Ex:
      Ito yung gagamitin ng controller para alisin sila sa dropdown list.
    */
    return Array.from(blockedSet);

  } catch (error) {
    console.error('[COUCHDB] ❌ Error in getBlockedHolderIDsByTemplate:', error.message);
    throw error;
  }
}

// ==========================================================================================================================================================================
//                                                                 PROFILE SHARE LINK Functions
// ==========================================================================================================================================================================

/*
  Function Name: createProfileShareLink
  Technical: Creates a new profile share link doc in profile_share_links DB.
  Tropang Ex: Ginagawa yung shareable link doc kapag nag-click ng "Share Profile" si user. // - polo
*/
async function createProfileShareLink(userId, token, recipientEmail, expiresAt, options = {}) {
  if (!profileShareLinksDb) await initializeDatabases();
  const normalizedSource = typeof options.source === 'string' && options.source.trim()
    ? options.source.trim()
    : 'manual';
  const normalizedDescription = typeof options.description === 'string'
    ? options.description.trim()
    : '';
  const doc = {
    _id: `share_${userId}_${Date.now()}`,
    type: 'profile_share_link',
    userId,
    token,
    recipientEmail,
    source: normalizedSource,
    description: normalizedDescription || null,
    expiresAt: expiresAt || null,
    createdAt: new Date().toISOString(),
    isActive: true,
    otp: null,
    otpExpiresAt: null,
    otpVerified: false
  };
  return await profileShareLinksDb.insert(doc);
}

/*
  Function Name: getProfileShareLink
  Technical: Fetches a share link doc by its token field.
  Tropang Ex: Ginagamit kapag bumukas yung recipient ng link — hahanapin yung doc gamit token. // - polo
*/
async function getProfileShareLink(token) {
  if (!profileShareLinksDb) await initializeDatabases();
  const result = await profileShareLinksDb.find({ selector: { token } });
  return result.docs[0] || null;
}

/*
  Function Name: saveOTPToShareLink
  Technical: Saves generated OTP + expiry into the share link doc.
  Tropang Ex: Pagka-send ng OTP sa email, sinasave dito para ma-validate later. // - polo
*/
async function saveOTPToShareLink(token, otp, otpExpiresAt) {
  if (!profileShareLinksDb) await initializeDatabases();
  const doc = await getProfileShareLink(token);
  if (!doc) throw new Error('Share link not found');
  doc.otp = otp;
  doc.otpExpiresAt = otpExpiresAt;
  doc.otpVerified = false;
  return await profileShareLinksDb.insert(doc);
}

/*
  Function Name: verifyOTPAndGetUserId
  Technical: Validates OTP + expiry, marks otpVerified = true, returns userId.
  Tropang Ex: Kapag nag-submit ng OTP si recipient, dito ini-check kung tama at hindi pa expired. // - polo
*/
async function verifyOTPAndGetUserId(token, otp) {
  if (!profileShareLinksDb) await initializeDatabases();
  const doc = await getProfileShareLink(token);
  if (!doc) throw new Error('Share link not found');
  if (doc.otp !== otp) throw new Error('Invalid verification code.');
  if (new Date() > new Date(doc.otpExpiresAt)) throw new Error('Code has expired. Request a new one.');
  const now = new Date().toISOString();
  doc.otpVerified = true;
  doc.otpVerifiedAt = now; // OTP verification timestamp
  doc.viewCount = (doc.viewCount || 0) + 1; // Increment view count
  if (!doc.firstViewedAt) doc.firstViewedAt = now; // Set only once
  doc.lastViewedAt = now; // Always update on each verify
  await profileShareLinksDb.insert(doc);
  return doc.userId;
}

/*
  Function Name: recordShareLinkView
  Technical: Increments viewCount on a share link doc without requiring OTP.
  Tropang Ex: Para sa public links — pag binuksan ng visitor, dito ini-increment yung view count.
*/
async function recordShareLinkView(token) {
  if (!profileShareLinksDb) await initializeDatabases();
  const doc = await getProfileShareLink(token);
  if (!doc) throw new Error('Share link not found');
  if (!doc.isActive || doc.status === 'revoked') throw new Error('This link has been revoked.');
  if (doc.status === 'expired') throw new Error('This link has expired.');
  if (doc.expiresAt) {
    const expiresAt = new Date(doc.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || new Date() > expiresAt) {
      doc.status = 'expired';
      await profileShareLinksDb.insert(doc);
      throw new Error('This link has expired.');
    }
  }
  const now = new Date().toISOString();
  doc.viewCount = (doc.viewCount || 0) + 1;
  if (!doc.firstViewedAt) doc.firstViewedAt = now;
  doc.lastViewedAt = now;
  await profileShareLinksDb.insert(doc);
  return doc.viewCount;
}

/*
  Function Name: revokeProfileShareLink
  Technical: Sets isActive = false on the share link doc (soft delete).
  Tropang Ex: Kapag pinindot ni user ang "Revoke", dito nagiging inactive yung link. 
*/
async function revokeProfileShareLink(token, userId) {
  if (!profileShareLinksDb) await initializeDatabases();
  const doc = await getProfileShareLink(token);
  if (!doc) throw new Error('Share link not found');
  if (doc.userId !== userId) throw new Error('Unauthorized');
  doc.isActive = false;
  doc.revokedAt = new Date().toISOString(); // Manual revocation timestamp
  return await profileShareLinksDb.insert(doc);
}

async function updateShareLinkStatus(docId, newStatus) {
  if (!profileShareLinksDb) await initializeDatabases();
  const doc = await profileShareLinksDb.get(docId);
  doc.status = newStatus;
  return await profileShareLinksDb.insert(doc);
}


/*
  Function Name: getShareLinksByUserId
  Technical: Fetches all share link docs belonging to a specific userId.
  Tropang Ex: Ginagamit para ipakita lahat ng generated links ng user sa "My Share Links" section. // - polo
*/
async function getShareLinksByUserId(userId) {
  if (!profileShareLinksDb) await initializeDatabases();
  const result = await profileShareLinksDb.find({
    selector: { type: 'profile_share_link', userId },
    limit: 100
  });
  // Sort newest first 
  return (result.docs || []).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}


/*
  Function Name: getAllIssuedCredentialsForIntegrity
  Technical: Fetches all credential docs with blockchainId across every approved issuer CouchDB database for admin integrity checks.
  Tropang Ex: Iniipon nito lahat ng issued credentials ng bawat issuer para maikumpara sa blockchain.

  Step 1: Kunin lahat ng approved issuers na may couchDBUrl.
  Step 2: I-query bawat issuer DB for docs with blockchainId.
  Step 3: I-return flattened rows kasama issuer metadata.
*/
async function getAllIssuedCredentialsForIntegrity() {
  const approvedIssuers = await getApprovedIssuers();
  const rows = [];

  for (const issuer of approvedIssuers || []) {
    if (!issuer?.couchDBUrl) continue;

    try {
      const issuerDb = nano(issuer.couchDBUrl);
      const queryResult = await issuerDb.find({
        selector: {
          blockchainId: { $exists: true }
        },
        limit: 5000
      });

      (queryResult.docs || []).forEach((doc) => {
        if (!doc?.blockchainId) return;
        rows.push({
          couchDoc: doc,
          issuerOrgName: issuer.orgName || issuer.email || issuer._id,
          issuerId: issuer._id
        });
      });
    } catch (error) {
      rows.push({
        couchDoc: null,
        issuerOrgName: issuer.orgName || issuer.email || issuer._id,
        issuerId: issuer._id,
        error: error.message
      });
    }
  }

  return rows;
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
  updateCredentialVisibility, // - Newly added - olops
  updateIssuerTemplateVisibility,
  updateCredentialOrder,     // - polo
  isEmailAlreadyUsed,
  deleteIssuerDoc,


  // Issuer lifecycle
  createIssuerRegistration,
  getPendingIssuers,
  getPendingRootIssuers,
  getPendingSubordinateIssuers,
  getPendingSubordinateIssuersAwaitingRootApproval,
  getPendingSubordinateIssuersRootApproved,
  getAdminActionablePendingIssuers,
  getRejectedIssuers,
  getDisabledIssuers,
  getIssuerById,
  getIssuerDocuments,
  getIssuerDocumentStream,
  getIssuerByEmail,
  checkDuplicateIssuerRegistration,
  Approve_Issuer,
  Reject_Issuer,
  getApprovedIssuer,


  // Notifications
  createNotification,
  Create_CredentialNotification,
  getAllNotifications,
  getUnreadNotifications,
  getUserNotifications,
  getUnreadUserNotifications,
  markNotificationAsRead,

  // Credentials (Star Feature!)
  Issue_Credential_DB,         // ✅ NEW - Use this!
  getUserCredentialsByHolderId,
  getIssuerCredentials,
  Create_CredentialTemplate_DB,
  deleteIssuerCredentialTemplate,
  Revoke_Credential_DB,
  Verify_Credential_DB, // ✅ UPDATED: Now properly cleans credential IDs
  checkAndExpireCredentials,  // - polo

  // ADMIN DASHBOARD
  getApprovedIssuers,
  getIssuerTemplatesByIssuerId,
  checkIssuerHasCredentialTemplates,
  getIssuerIssuedByIssuerId,
  getAllIssuerCredentialsAdmin,

  Disable_Issuer,
  Enable_Issuer,
  Disable_User,
  Enable_User,

  verifyAdminCurrentPassword,
  changeAdminPassword, 
  getAdminByEmail,
  getBlockedHolderIDsByTemplate,

  getPendingSubordinatesForRoot,
  createProfileShareLink,   
  getProfileShareLink,      
  saveOTPToShareLink,       
  verifyOTPAndGetUserId,    
  recordShareLinkView,
  revokeProfileShareLink,  
  updateShareLinkStatus,
  getShareLinksByUserId,    
  getAllSubordinatesForRoot,
  getRootApprovedSubordinatesForRoot,
  getRootRejectedSubordinatesForRoot,
  getApprovedSubordinatesForRoot,
  getDisabledSubordinatesForRoot,
  rootApproveSubordinateIssuer,
  rootRejectSubordinateIssuer,

  createAdminNotification,
  getAdminNotifications,
  getUnreadAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,

  getAllIssuedCredentialsForIntegrity 

};
