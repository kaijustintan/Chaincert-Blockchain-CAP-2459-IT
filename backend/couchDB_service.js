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
  - checkIfOrgAccredited(orgName) UNUSED
  - createIssuerRegistration(issuerData, accreditationCheck)
  - getPendingIssuers()
  - approveIssuer(issuerId, adminId)
  - rejectIssuer(issuerId, rejectionReason)
  - getApprovedIssuer(email)

  CATEGORY: ISSUER DASHBOARD / FAST CREDENTIAL VIEWS
  - getIssuerCredentials(issuerId)

  CATEGORY: ISSUED CREDENTIALS STORAGE (COPIES)
  - saveIssuedCredentialToBothDBs(issuerEmail, credentialDataExtended)

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
let accreditedOrgsDb = null; // List of fully accredited orgs

/* 
  Function Name: initializeDatabases

  Technical:
  Initializes and selects all required CouchDB databases used by the system.
  It assigns database handles (users, issuers, notifications, deployments, accredited orgs)
  so they can be reused by other service functions.

  Tropang Ex:
  Parang “opening ng lahat ng folders” sa CouchDB bago magtrabaho.
  Kapag hindi pa naka-select yung DBs, walang ibang function ang pwedeng magbasa o magsulat ng data.
*/
async function initializeDatabases() {
  try {
    usersDb = couch.use('users');
    issuersDB = couch.use('issuers');
    notificationsDb = couch.use('notifications');
    accreditedOrgsDb = couch.use('accredited_organizations');
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
//                                                                 ACCREDITED ORGANIZATIONS Functions
// ==========================================================================================================================================================================

/*
  Function Name: saveAccreditedOrganization

  Technical:
  Saves (inserts) a new accredited organization document into the "accredited_organizations" CouchDB database.
*/
async function saveAccreditedOrganization(org) {
  if (!accreditedOrgsDb) await initializeDatabases();
  return await accreditedOrgsDb.insert(org);
}
// ==========================================================================================================================================================================

/*
  Function Name: getAllAccreditedOrganizations

  Technical:
  Fetches all documents from the "accredited_organizations" database and returns them as an array.
  Filters out CouchDB design docs (_design/...) so only real organization records are returned.

  Tropang Ex:
  Pangkuha ng lahat ng accredited orgs sa database.
  Nililinis niya yung list para di maisama yung internal CouchDB design docs.
*/
async function getAllAccreditedOrganizations() {
  if (!accreditedOrgsDb) await initializeDatabases();
  const result = await accreditedOrgsDb.list({ include_docs: true });
  return result.rows
    .filter(row => row.doc && !row.id.startsWith('_design/'))
    .map(row => row.doc);
}
// ==========================================================================================================================================================================

/* UNUSED 

  Function Name: checkIfOrgAccredited

  Technical: Checks if an organization exists in the "accredited_organizations" database by matching its name.
  Tropang Ex: hinahanap yung name ng org dun sa "accredited_organizations" database if andun via its name
*/
async function checkIfOrgAccredited(orgName) {
  try {

    /* Step 1: Ensure accredited_organizations DB is ready

      Technical: Initializes DB handles if not yet initialized.
      Tropang Ex: Para sure na naka-connect tayo sa DB bago mag-check.
    */
    if (!accreditedOrgsDb) await initializeDatabases();

    /* Step 2: Query CouchDB using Mango find()

      Technical: Looks for a matching org name across possible fields:
        - organizationName
        - name
        - orgName
      Tropang Ex: Hinahanap yung orgName kahit ano pa yung field name na ginamit sa doc (kasi minsan inconsistent).
    */
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

    /* Step 3: If found, return accredited = true + type

      Technical: If at least 1 doc exists, the org is accredited.
      Tropang Ex: Kapag may nahanap na doc, ibig sabihin legit/accredited siya, ibabalik din anong type.
    */
    if (result.docs && result.docs.length > 0) {
      const accreditedOrg = result.docs[0];
      return {
        isAccredited: true,
        accreditedType: accreditedOrg.type || accreditedOrg.accreditationType || 'Accredited'
      };
    }

    /* Step 4: If not found, return accredited = false

      Technical: No document matched → not accredited.
      Tropang Ex: Walang record sa DB → hindi accredited.
    */
    return { isAccredited: false, accreditedType: null };

  } catch (error) {

    /* Step 5: Fail-safe return if query errors out

      Technical: On error, returns not accredited to avoid breaking flow.
      Tropang Ex: Pag nagka-error, safe default: treat as not accredited.
    */
    console.error(`[COUCHDB] Error checking accreditation:`, error.message);
    return { isAccredited: false, accreditedType: null };
  }
}


// ==========================================================================================================================================================================
//                                                                 ISSUER Functions
// ==========================================================================================================================================================================

/*
  Function Name: createIssuerRegistration

  Technical: Creates a new issuer registration document in the "issuers" CouchDB database with pending status.
  Tropang Ex: Pang-register ng school/org bilang issuer (subject for admin approval).

  UPDATED:
  - Accreditation gating removed: ANY org can register (pending approval).
  - Duplicate prevention added: blocks if same email + orgName already exists with status pending/approved.
  - Accreditation fields retained for future use (default false/null if not provided).
*/
async function createIssuerRegistration(issuerData, accreditationCheck = null) {
  try {

    /* Step 1: Ensure issuers DB is initialized

      Technical: Makes sure issuersDB is ready before inserting data.
      Tropang Ex: Chine-check muna kung naka-connect na sa issuers database.
    */
    if (!issuersDB) await initializeDatabases();

    /* Step 2: Duplicate check (email + orgName)

      Technical:
        - Prevent duplicate issuer registrations when there is already an existing record
          with same email + orgName AND status is pending/approved.
      Tropang Ex:
        - Kapag may existing na application/account gamit same email + org, bawal na ulit.
    */
    const dup = await checkDuplicateIssuerRegistration(issuerData.email, issuerData.orgName);
    if (dup.isDuplicate) {
      const err = new Error(
        `Issuer registration already exists for ${issuerData.email} (${issuerData.orgName}). ` +
        `Existing status: ${dup.existing.status}`
      );
      err.statusCode = 409; // Conflict
      err.details = dup.existing;
      throw err;
    }

    /* Step 3: Normalize accreditation info (optional / non-blocking)

      Technical: If accreditationCheck is not provided, default values are used.
      Tropang Ex: Kahit walang accreditation check, tuloy pa rin yung registration.
    */
    const accreditationInfo = {
      isAccredited: accreditationCheck?.isAccredited ?? false,
      accreditedType: accreditationCheck?.accreditedType ?? null
    };

    /* Step 4: Log registration info (debugging / trace)

      Technical: Logs org name + accreditation (if any).
      Tropang Ex: Pang-check lang ng info habang nagre-register.
    */
    console.log('[COUCHDB] Creating issuer registration with data:', {
      orgName: issuerData.orgName,
      email: issuerData.email,
      accredited: accreditationInfo.isAccredited,
      accreditedType: accreditationInfo.accreditedType,
      note: 'Accreditation gating disabled (non-blocking). Duplicate prevention enabled.'
    });

    /* Step 5: Build issuer registration document

      Technical: Constructs the issuer registration object with:
        - unique issuer_ ID
        - pending status
        - (optional) accreditation info kept for future
      Tropang Ex: Gumagawa ng “application form” document ng issuer.
    */
    const issuerDoc = {
      _id: `issuer_${issuerData.email.replace(/@/g, '_').replace(/\./g, '_')}_${Date.now()}`,
      type: 'issuer_registration',
      role: 'issuer',
      orgName: issuerData.orgName,
      contactName: issuerData.contactName,
      email: issuerData.email,
      password: issuerData.password,
      documents: issuerData.documents || [],

      // kept for future use, but no longer used to block registration
      accredited: accreditationInfo.isAccredited,
      accreditedType: accreditationInfo.accreditedType,

      status: 'pending',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,

      // rejection fields (used when admin rejects)
      rejectionReason: null,
      rejectedAt: null,
      rejectedBy: null
    };

    /* Step 6: Final log before insert
      Tropang Ex: Last check bago i-save sa DB.
    */
    console.log('[COUCHDB] Final issuer doc before insert:', {
      _id: issuerDoc._id,
      orgName: issuerDoc.orgName,
      email: issuerDoc.email,
      status: issuerDoc.status,
      accredited: issuerDoc.accredited,
      accreditedType: issuerDoc.accreditedType
    });

    /* Step 7: Insert issuer registration into CouchDB
      Technical: Saves issuer application into issuers DB.
    */
    return await issuersDB.insert(issuerDoc);

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
  Function Name: approveIssuer

  Technical: Approves an issuer application by updating its CouchDB record (status, admin approver, Fabric identity, CouchDB URL, walletId).
  Tropang Ex: Ito yung “Approve” button logic ni admin. Pag na-approve si issuer, lalagyan siya ng:
            - status = approved
            - fabric identity (pang blockchain)
            - couchDBUrl (kung saan DB niya naka-host)
            - walletId (pang wallet tracking)
*/
async function approveIssuer(issuerId, adminId) {
  try {

    /* Step 1: Ensure issuersDB is ready */
    if (!issuersDB) await initializeDatabases();

    /* Step 2: Logs which issuerId is being approved. (DEBUG Purposes)
      Tropang Ex: Pang-trace lang para alam mo kung sino ina-approve sa logs.
    */
    console.log(`[COUCHDB] Approving issuer: ${issuerId}`);

    /* Step 3: Fetch issuer application document from issuers DB via its ID
      Tropang Ex: Kinukuha yung application record ni issuer para ma-update natin fields niya.
    */
    const issuerDoc = await issuersDB.get(issuerId);

    /* Step 4: Log key issuer info (debug snapshot)
      Tropang Ex: Quick sanity check kung tama yung issuer doc na nakuha (name/email/org).
    */
    console.log(`[COUCHDB] Retrieved issuer:`, {
      _id: issuerDoc._id,
      contactName: issuerDoc.contactName,
      email: issuerDoc.email,
      orgName: issuerDoc.orgName
    });

    /* Step 5: Assign Fabric identity dynamically

      Technical: Creates a Fabric identity string from orgName:
                orgName -> lowercase + remove spaces + "-admin"
      Tropang Ex: Gumagawa ng blockchain identity name based sa orgName para consistent.
      Example: "De La Salle University" -> "delasalleuniversity-admin"
      NOTE: This assumes may corresponding identity w the EXACT name talaga sa wallet/CA side.
            So yung id na nacreate during node setupWallet etc, = to delasalleuniversity-admin rin dapat
    */
    if (issuerDoc.orgName) {
      const fabricId = issuerDoc.orgName.trim().toLowerCase().replace(/\s+/g, '') + '-admin';
      issuerDoc.fabricIdentity = fabricId;
    } else {
      issuerDoc.fabricIdentity = undefined;
    }

    /* Step 6: Resolve issuer-specific CouchDB URL using "couchdb_connections" DB

      Technical:
        --> Normalize orgName (lowercase + remove spaces)
        --> Query admin CouchDB DB "couchdb_connections"
        --> Find matching orgName doc to get couchDBUrl
      Example:
        orgName = "De La Salle University"
        normalized = "delasalleuniversity"
        -> find doc { orgName: "delasalleuniversity", couchDBUrl: "http://..." }
      NOTE! --> couchDB connection of an org was MANUALLY inserted sa "couchdb_connections" database 
    */
    const normalizedOrgName = issuerDoc.orgName.toLowerCase().replace(/\s+/g, "");
    const nanoAdmin = require('nano')('http://admin:adminpw@localhost:5985');
    const connDb = nanoAdmin.use('couchdb_connections');

    const result = await connDb.find({ selector: { orgName: normalizedOrgName } });

    /* Step 7: Attach couchDBUrl if nahanap/meron
      Technical:
        - If match found, set issuerDoc.couchDBUrl
        - If none found, throw error (approval stops)
      Tropang Ex:
        - Pag walang CouchDB URL mapping, bawal i-approve kasi di makakapag-save ng wallet/credentials later.
        - So hard fail siya para ma-fix muna mapping.
    */
    if (result.docs.length > 0) {
      issuerDoc.couchDBUrl = result.docs[0].couchDBUrl;
      console.log(`[COUCHDB] Assigned couchDBUrl for issuer:`, issuerDoc.couchDBUrl);
    } else {
      throw new Error('No CouchDB connection found for org: ' + normalizedOrgName);
    }

    /* Step 8: Generate unique walletId for issuer

      Technical: Creates a unique walletId based on timestamp.
      Tropang Ex: Gumagawa ng wallet identifier para ma-track yung “wallet” ni issuer sa system.
    */
    const walletId = `wallet_${Date.now()}`;
    issuerDoc.walletId = walletId;

    /* Step 9: Update approval fields (status + approver + timestamp)
      Technical:
        - status = approved
        - approvedBy = adminId
        - approvedAt = now
      Tropang Ex:
        - Eto yung actual “approval stamp” sa record.
        - Makikita sa admin dashboard / audit later.
    */
    issuerDoc.status = 'approved';
    issuerDoc.approvedBy = adminId;
    issuerDoc.approvedAt = new Date().toISOString();

    /* Step 10: Save updated issuer doc back to CouchDB
      Tropang Ex: Sine-save na natin yung updated issuer record sa database.
    */
    await issuersDB.insert(issuerDoc);
    console.log(`[COUCHDB] Issuer status updated to 'approved'`);

    /* Step 11: Return important issuer fields (summary response)
      Technical: Returns a trimmed object for callers (controllers/endpoints).
      Tropang Ex: Ito yung ibabalik sa API response para makita agad ni frontend yung updated status/info.
      “Okay, approved na yung issuer. I wont give d full issuerDoc. Eto lang yung info na kailangan mong malaman ngayon—
       hindi ko ibibigay lahat, kasi hindi mo naman kailangan at delikado pa. (ex: password)”
    */
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
    // Optional: if you want consistent error logs for this function
    console.error(`[COUCHDB] ❌ approveIssuer failed:`, error.message);
    throw error;
  }
}
// ==========================================================================================================================================================================

/* 
  Function Name: rejectIssuer

  Technical: Rejects an issuer application by updating its CouchDB record (status, rejectionReason, rejectedAt).
  Tropang Ex: Ito yung “Reject” button logic ni admin. Pag nireject si issuer, lalagyan siya ng:
            - status = rejected
            - rejection reason (bakit siya bagsak)
            - rejectedAt timestamp (kelan nireject)
*/
async function rejectIssuer(issuerId, rejectionReason) {

  /* Step 1: Ensure issuersDB is initialized */
  if (!issuersDB) await initializeDatabases();

  /* Step 2: Retrieve issuer record by ID
    Technical: Fetch issuer application document from CouchDB.
  */
  const issuerDoc = await issuersDB.get(issuerId);

  /* Step 3: Update fields for rejection
    Technical: Mark as rejected + store reason + timestamp.
    Tropang Ex: Nilalagay na yung “rejected” status + bakit + kelan.
  */
  issuerDoc.status = 'rejected';
  issuerDoc.rejectionReason = rejectionReason;
  issuerDoc.rejectedAt = new Date().toISOString();

  /* Step 4: Save updated doc back to CouchDB
    Technical: Inserts updated issuerDoc (same _id, new _rev).
    Tropang Ex: Official na yung rejection, naka-save na sa DB.
  */
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

  /* Step 3: Update read status and timestamp
    Tropang Ex: Minamarkahan na as “nabasa” yung notification.
  */
  notif.read = true;
  notif.readAt = new Date().toISOString();

  /* Step 4: Save updated notification back to CouchDB */
  return await notificationsDb.insert(notif);
}

// ==========================================================================================================================================================================
//                                                                       CREDENTIAL TEMPLATE Functions
// ==========================================================================================================================================================================
/* 
  Function Name: save_CredentialTemplateToIssuerDB

  Technical:
  Saves a single credential TEMPLATE document into the issuer’s OWN CouchDB database
  (DB: wallet_issuer_credentials) using its couchDBUrl.

  Tropang Ex:
  Ito yung function na nagse-save ng isang template record
  (halimbawa: "Diploma Template 2026") sa personal CouchDB ni issuer.
  Hindi ito blockchain call, pure CouchDB lang para sa dashboard listing.
*/
async function save_CredentialTemplateToIssuerDB(issuerDoc, credentialDoc) {

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
  Function Name: saveIssuedCredentialToBothDBs (CURRENT / FIXED) 

  Technical: Saves an ISSUED credential (AFTER blockchain success) to:
            (1) Issuer’s CouchDB → issued_credentials
            (2) Admin/Main CouchDB → wallet_user_credentials (acts like “user wallet” registry)

            Uses the blockchain ID (credentialData.id / credentialData.blockchainId) as the deterministic base,
            so stable yung document IDs:
              - issuer_cred_<blockchainId>
              - user_cred_<blockchainId>

  Tropang Ex: After ma-issue na sa blockchain, kailangan may “copies” sa databases para:
            - mabilis i-display sa issuer dashboard (issuer DB)
            - makita sa user wallet / verify flow (admin DB)
            Kasi blockchain is source of truth, pero CouchDB is pang mabilis + pang UI.

  Notes (important): 
    * issued_credentials = credentials issued by the issuer
    * wallet_user_credentials = list of all wallets/credentials issued to a user 
*/
async function saveIssuedCredentialToBothDBs(issuerEmail, credentialData) {
  try {

    /* Step 1: Ensure issuersDB initialized + resolve issuer record by email
       Technical: initializeDatabases() ensures issuersDB exists, then getIssuerByEmail().
       Tropang Ex: Kailangan natin si issuer doc para makuha couchDBUrl + issuer metadata.
    */
    if (!issuersDB) await initializeDatabases();
    const issuer = await getIssuerByEmail(issuerEmail);
    
    /* Step 2: Validate issuer has couchDBUrl
       Technical: Blocks if missing, since we can’t save to issuer’s DB.
    */
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`❌ Issuer ${issuerEmail} has no CouchDB URL configured`);
    }

    /* Step 3: Get deterministic blockchain ID
       Technical: Uses credentialData.id OR credentialData.blockchainId.
       Tropang Ex: Dapat may ID galing blockchain para consistent yung _id naming.
    */
    const blockchainId = credentialData.id || credentialData.blockchainId;
    if (!blockchainId) {
      throw new Error('❌ No blockchain ID provided in credentialData');
    }

    /* Step 4: Save to ISSUER CouchDB (issued_credentials)
       Technical: Connect to issuer.couchDBUrl and insert issuer_cred_<blockchainId>.
       Tropang Ex: Copy ng issued credential para makita sa issuer dashboard/history.
    */
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
      savedToCouchDBAt: new Date().toISOString(),
      status: credentialData.status || 'issued',
      visibility: 'private',
      skills: credentialData.skills || [],          // - polo
      badgeImage: credentialData.badgeImage || ''   // - polo
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

    /* Step 5: Save to ADMIN/Main CouchDB (wallet_user_credentials)
       Technical: Connect to COUCHDB_URL (main admin couch), insert user_cred_<blockchainId>.
       Tropang Ex: This becomes the user-wallet side record (pang verify + user dashboard).
    */
    const adminCouch = require('nano')(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');
    
    const userCredentialDoc = {
      ...credentialDoc,
      _id: `user_cred_${blockchainId}`,
      holderID: credentialData.holderID,
      savedToUserWalletAt: new Date().toISOString(),
      visibility: 'private',
      originalOrder: nextOrder,  // - polo
      currentOrder: nextOrder    // - polo
    };
    console.log(`[COUCHDB] 2️⃣ Saving to ADMIN DB: ${COUCHDB_URL}/wallet_user_credentials`);
    const adminResult = await userWalletDb.insert(userCredentialDoc);

    /* Step 6: Return success summary (both inserts)
       Technical: Returns both CouchDB insert responses so caller can confirm.
       Tropang Ex: Para alam ng endpoint kung pumasok ba sa both DBs.
    */
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

/* 
  Function Name: getIssuerCredentialsByIssuerId

  Technical: Fetches credential_instance docs from issuer’s CouchDB by issuerId (uses issuer doc directly).
  Tropang Ex: Same idea as above, pero issuerId ang input, hindi email.

  ⚠️ Note: Currently returns ALL credential_instance in wallet_issuer_credentials (no issuerId filter),
            so this assumes that DB is “owned” per issuer anyway (single-tenant). PENDING - BADINGif so, why need via email and issuerId? why not sa isa nalang?
*/
async function getIssuerCredentialsByIssuerId(issuerId) {
  try {
    if (!issuersDB) await initializeDatabases();
    const issuer = await getIssuerById(issuerId);
    
    if (!issuer || !issuer.couchDBUrl) {
      throw new Error(`❌ Issuer ${issuerId} has no CouchDB URL configured`);
    }

    /* Step 1: Connect to issuer CouchDB
       Tropang Ex: Diretsong connect sa DB ni issuer using couchDBUrl.
    */
    const issuerCouch = require('nano')(issuer.couchDBUrl);
    const walletDb = issuerCouch.use('wallet_issuer_credentials');
    
    /* Step 2: Fetch all credential_instance docs
       Tropang Ex: Kasi sarili naman niyang DB yan, lahat ng credential_instance ay kanya.
    */
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
  Function Name: revokeCredential

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

async function revokeCredential(blockchainId, issuerEmail, rejectionReason) {
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

    // Match saveIssuedCredentialToBothDBs: issuer_cred_<blockchainId>
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

    // Match saveIssuedCredentialToBothDBs: user_cred_<blockchainId>
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
  Function Name: verifyCredentialFromCouchDB

  Technical: Verifies if a credential exists in ADMIN CouchDB (wallet_user_credentials) using document _id.
            It normalizes the input ID to always search as user_cred_<id>.
  Tropang Ex: Pang verify endpoint: chine-check kung may record sa user wallet DB, meaning “known credential”.
*/
async function verifyCredentialFromCouchDB(credentialId) {
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

async function disableIssuer(issuerId, adminId, reason) {
  if (!issuersDB) await initializeDatabases();

  if (!reason || reason.trim() === "") {
    throw new Error("Disable reason is required");
  }

  const issuerDoc = await issuersDB.get(issuerId);

  issuerDoc.status = "disabled";
  issuerDoc.disabledAt = new Date().toISOString();
  issuerDoc.disabledBy = adminId;
  issuerDoc.disableReason = reason;

  return await issuersDB.insert(issuerDoc);
}

async function enableIssuer(issuerId, adminId, reason) {
  if (!issuersDB) await initializeDatabases();

  if (!reason || reason.trim() === "") {
    throw new Error("Enable reason is required");
  }

  const issuerDoc = await issuersDB.get(issuerId);

  issuerDoc.status = "approved";
  issuerDoc.enabledAt = new Date().toISOString();
  issuerDoc.enabledBy = adminId;
  issuerDoc.enableReason = reason;

  return await issuersDB.insert(issuerDoc);
}

async function disableUser(userId, adminId, reason) {
  if (!usersDb) await initializeDatabases();

  if (!reason || reason.trim() === "") {
    throw new Error("Disable reason is required");
  }

  const userDoc = await usersDb.get(userId);

  userDoc.isActive = false;
  userDoc.disabledAt = new Date().toISOString();
  userDoc.disabledBy = adminId;
  userDoc.disableReason = reason;

  return await usersDb.insert(userDoc);
}

async function enableUser(userId, adminId, reason) {
  if (!usersDb) await initializeDatabases();

  if (!reason || reason.trim() === "") {
    throw new Error("Enable reason is required");
  }

  const userDoc = await usersDb.get(userId);

  userDoc.isActive = true;
  userDoc.enabledAt = new Date().toISOString();
  userDoc.enabledBy = adminId;
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

// ==========================================================================================================================================================================

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
  updateCredentialOrder,     // - polo

  // Accreditation
  checkIfOrgAccredited,
  saveAccreditedOrganization,
  getAllAccreditedOrganizations,


  // Issuer lifecycle
  createIssuerRegistration,
  getPendingIssuers,
  getRejectedIssuers,
  getDisabledIssuers,
  getIssuerById,
  getIssuerByEmail,
  checkDuplicateIssuerRegistration,
  approveIssuer,
  rejectIssuer,
  getApprovedIssuer,


  // Notifications
  createNotification,
  getAllNotifications,
  getUnreadNotifications,
  markNotificationAsRead,

  // Credentials (Star Feature!)
  saveIssuedCredentialToBothDBs,         // ✅ NEW - Use this!
  getIssuerCredentialsByIssuerId,
  getUserCredentialsByHolderId,
  getIssuerCredentials,
  save_CredentialTemplateToIssuerDB,
  deleteIssuerCredentialTemplate,
  revokeCredential,
  verifyCredentialFromCouchDB, // ✅ UPDATED: Now properly cleans credential IDs
  checkAndExpireCredentials,  // - polo

  // ADMIN DASHBOARD
  getApprovedIssuers,
  getIssuerTemplatesByIssuerId,
  getIssuerIssuedByIssuerId,
  getAllIssuerCredentialsAdmin,

  disableIssuer,
  enableIssuer,
  disableUser,
  enableUser
};
