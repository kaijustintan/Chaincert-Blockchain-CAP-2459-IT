// ==========================================================================================================================================================================
//                                                                       sdk-server-fixed.js 
// ==========================================================================================================================================================================
/* sdk-server-fixed.js
    - The “middleman” of your whole system
    - Nothing talks directly to the blockchain except this file.
*/
const express = require('express');          // Express framework for building REST APIs
const cors = require('cors');                // Enables Cross-Origin Resource Sharing (CORS)
const { Gateway, Wallets } = require('fabric-network'); // Hyperledger Fabric SDK (connect to blockchain + manage identities)
const path = require('path');                // Node utility for handling file and directory paths
const fs = require('fs');                    // File system access (read CCP files, check existence)
const jwt = require('jsonwebtoken');         // Handles JWT creation and verification (auth/session)
const bcryptjs = require('bcryptjs');        // Password hashing and comparison (secure login)
const multer = require('multer');            // Middleware for handling file uploads (multipart/form-data)
const Docker = require('dockerode');          // Node.js Docker client (manage containers programmatically)
const nano = require('nano');                // CouchDB client for database operations
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key'; // Secret key used to sign and verify JWT tokens (uses env variable, falls back for dev)
const upload = multer({ storage: multer.memoryStorage() }); // Multer setup: stores uploaded files in memory (RAM) instead of disk
const couchdb = require('./couchDB_service'); // CouchDB service layer (handles all CouchDB-related operations)
const app = express(); // Initializes the Express application instance


/* 
  Function Name: Global Auth Middleware (JWT Parser)

  Technical:
  Intercepts every incoming request, extracts the JWT token from the Authorization header,
  verifies it using JWT_SECRET, and attaches the decoded user data to req.user.

  Tropang Ex:
  Para siyang bouncer sa entrance. Bawat request chine-check kung may “ID” (JWT token).
  - Kapag valid → papasukin at may req.user
  - Kapag wala / invalid → req.user = null (guest mode)
*/
app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
});
// ==========================================================================================================================================================================

/* 
  Function Name: CORS Middleware

  Technical:
  Enables Cross-Origin Resource Sharing so that frontend applications
  from different domains/ports can call the backend APIs.

  Tropang Ex:
  Para payagan yung frontend (ex: localhost:3000) na kumausap sa backend (localhost:4000).
  Kung wala ito, blocked agad ng browser.
*/
app.use(cors());
// ==========================================================================================================================================================================

/* 
  Function Name: JSON Body Parser

  Technical:
  Automatically parses incoming request bodies with JSON payloads
  and makes them accessible via req.body.

  Tropang Ex:
  Para mabasa ng backend yung data na sinend ng frontend
  (ex: email, password, credential details).
*/
app.use(express.json());
// ==========================================================================================================================================================================

/* 
  Function Name: Docker Client Initialization

  Technical:
  Creates a Docker client instance connected to the host’s Docker daemon
  via Unix socket.

  Tropang Ex:
  Dito nagkakaroon ng kapangyarihan yung backend na kumausap sa Docker
  (ex: mag-start, mag-stop, o mag-manage ng containers).
*/
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
// ==========================================================================================================================================================================

/* 
  Technical:
  Absolute path pointing to the local Hyperledger Fabric samples directory.

  Tropang Ex:
  Ito yung “base folder” kung saan nakalagay lahat ng Fabric config files
  (connection profiles, core.yaml, org folders).
*/
const FABRIC_SAMPLES_PATH = '/home/kaitanz_/fabric-samples/fabric-samples'; // KAI
// ==========================================================================================================================================================================

/* 
  Variable Name: CORE_YAML_PATH

  Technical:
  Absolute path to Fabric’s core.yaml configuration file.

  Tropang Ex:
  Config file ng Fabric peer — dito naka-set yung CouchDB, logging, at iba pang low-level blockchain settings.
*/
const CORE_YAML_PATH = `${FABRIC_SAMPLES_PATH}/config/core.yaml`;
// ==========================================================================================================================================================================

/* 
  Function Name: initializeDatabases

  Technical:
  Ensures all required CouchDB databases are created and ready when the server starts.

  Tropang Ex:
  Para siguradong may lalagyan agad yung data (users, issuers, wallets) bago pa tumanggap ng requests.
*/
couchdb.initializeDatabases().catch(err => {
  console.error('⚠️  CouchDB init error:', err.message);
});
// ==========================================================================================================================================================================

/* 
  Function Name: setupDatabaseIndexes

  Technical:
  Creates Mango indexes in CouchDB to improve query performance, especially for filtering and sorting issuer records.

  Tropang Ex:
  Parang index sa libro — para mas mabilis hanapin yung pending / approved issuers sa admin dashboard.
*/
const setupDatabaseIndexes = async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const db = couchdb.couch.use('issuers');

    await db.createIndex({
      index: {
        fields: ['type', 'status', 'createdAt']
      },
      name: 'idx-type-status-created',
      ddoc: 'indexes'
    });

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    if (error.statusCode === 409 || (error.message || '').includes('already')) {
      console.log('✅ Indexes already exist');
    } else {
      console.error('⚠️  Index creation error:', error.message);
    }
  }
};
// ==========================================================================================================================================================================

/* 
  Function Name: Delayed Index Initialization

  Technical:
  Delays execution of setupDatabaseIndexes to ensure CouchDB
  is fully ready before index creation.

  Tropang Ex:
  Parang pinaghihintay mo muna mag-boot yung database
  bago ka gumawa ng index para iwas error.
*/
setTimeout(setupDatabaseIndexes, 2000);
// ==========================================================================================================================================================================

/* 
  Variable Name: walletPath

  Technical:
  File-system path where Hyperledger Fabric identities (certificates and keys) are stored and loaded from.

  Tropang Ex:
  Ito yung “ID holder” ng blockchain. Kapag wala yung identity dito, hindi makakapirma ng transaction.
*/
const walletPath = path.join(__dirname, 'wallet');
// ==========================================================================================================================================================================

/* 
  Variables Name: Gateway Cache Controls

  Technical:
  Used to optionally cache and reuse an existing Fabric Gateway connection
  to reduce repeated connection overhead.

  Tropang Ex:
  Para hindi paulit-ulit connect sa blockchain bawat request
  (pang-optimization, optional).
*/
let cachedGateway = null;
let lastConnectionTime = 0;
const CONNECTION_CACHE_TTL = 5 * 60 * 1000;
// ==========================================================================================================================================================================

/* 
  Function Name: getContractAndGateway
  Technical: Prepare and returns a live connection to the blockchain using the correct organization’s identity.
  Tropang Ex: basically cumoconnect sa blockchain using a right identity / if wala to, no acc will be able to commit any transaction to BC 
*/
async function getContractAndGateway(identityName, orgName) {

  /* Step 1: Input validation

  Technical: Validates that the required parameters are provided.
  Tropang Ex: Dito chine-check kung may laman talaga yung identityName at orgName. Kung wala kahit isa, tigil agad kasi hindi pwedeng makipag-usap sa blockchain 
  kung hindi mo alam:
    * sino ang gagamit ng identity
    * anong organization ang nirerepresent
  */
  if (!identityName || !orgName) {
    throw new Error('identityName and orgName are required');
  }

  /* Step 2: Choose the correct connection profile (DLSU OR Org1)

    Technical: Selects which Fabric connection profile (CCP) JSON file to use based on orgName/identityName.
    Tropang Ex: Parang pumipili ka kung anong WiFi network yung kokonektan mo.
      - Kung DLSU ka → DLSU connection profile
      - Kung hindi → default Org1
    Example: getContractAndGateway("delasalleuniversity-admin", "De La Salle University") = use "connection-delasalleuniversity.json"
    
    NOTE! - as u can see hardcoded yung paths to get said files, so in the event a new org gets to be approved as an issuer, we MANUALLY create another ccppath for that said org 
  */
  let ccpPath;
  if (
    orgName.toLowerCase().includes('delasalleuniversity') ||
    identityName.trim().toLowerCase().replace(/\s+/g, '').includes('delasalleuniversity') 
  ) {
    ccpPath = path.resolve(
      __dirname,'..','fabric-samples','fabric-samples','test-network','organizations','peerOrganizations','dlsu.example.com','connection-delasalleuniversity.json'
    );
  } else {
    // Default to Org1
    ccpPath = path.resolve(
      __dirname,'..','fabric-samples','fabric-samples','test-network','organizations','peerOrganizations','org1.example.com','connection-org1.json'
    );
  }
  /* Step 3: Check if the connection profile file exists

    Technical: Ensures the chosen CCP file actually exists before attempting to read/connect.
    Tropang Ex: Parang chine-check mo muna kung nandiyan yung “mapa” bago bumiyahe. Kapag wala yung CCP file, hindi alam ng system kung saan hahanapin peers/orderer, 
    so error agad.
    Example: If connection-org1.json was moved/deleted → throws “Connection profile not found...”
  */
  if (!fs.existsSync(ccpPath)) {
    throw new Error(`Connection profile not found at: ${ccpPath}`);
  }
   /* Step 4: Read and parse the connection profile (CCP)
    
    Technical: Loads the CCP JSON content and parses it into an object used by Fabric Gateway.
    Tropang Ex: Binabasa dito yung JSON file na nagsasabi kung paano kumausap sa blockchain:
      * saan yung peers
      * saan yung orderer
      * anong TLS/certs ang gagamitin
    Example: ccp becomes a JS object that gateway.connect() will use.
  */
  const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
  const ccp = JSON.parse(ccpJSON);

  /* Step 5: Load wallet and fetch the signing identity

    Technical: Opens chaincert-api/wallet directory inside ubuntu/filesystem wallet and retrieves the identity that will sign transactions.
    Tropang Ex: Hinahanap dito yung “ID card” (cert + private key) ng gagamit.  Kung wala sa wallet, bawal mag-submit ng transaction kasi walang pipirma.
    Example: identityName = "delasalleuniversity-admin"
      → wallet.get("delasalleuniversity-admin") must exist or it throws Identity not found.
  */
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const identity = await wallet.get(identityName);
  if (!identity) throw new Error(`Identity ${identityName} not found`);


   /* Step 6: Create Gateway and connect to Fabric as this identity

    Technical: Establishes an authenticated connection to the Fabric network using the CCP + wallet identity.
    Tropang Ex: Ito na yung actual “login” sa blockchain as that org/user identity.
    From here, the backend can now talk to Fabric and submit/query transactions.
    Example: After gateway.connect(), you can access channels and chaincode through the gateway.
  */
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: identityName,
    discovery: { enabled: true, asLocalhost: true }
  });

  /* Step 7: Access the target channel (chaincert-channel)

    Technical: Gets a Network object for the specified Fabric channel.
    Tropang Ex: Pinipili mo kung saang “group chat” (channel) kayo magtatransact. Dito naka-deploy yung ChainCert chaincode kaya dito dapat kumonek.
    Example: network = gateway.getNetwork("chaincert-channel")

    NOTE! - talagang hardcoded yan to chaincert-channel kasi any org joining as must join the general channel, ang kulang dito org exclusive channel
          - ex: so dapat if identity n ccp path = dlsu related = join chaincert-channel AND dlsu-channel
  */
  const network = await gateway.getNetwork('chaincert-channel');


  /* Step 8: Get the chaincode/contract handle (chaincert)

    Technical: Retrieves the contract object used to invoke/evaluate chaincode functions.
    Tropang Ex: Ito na yung “remote control” ng blockchain functions. Dito mo tatawagin yung IssueCredential, CreateCredentialTemplate, etc ng chaincode/index.js 
    Example: contract.submitTransaction("IssueCredential", ...)
  */
  const contract = network.getContract('chaincert');

  /* Step 9: Cache gateway + return gateway and contract (PENDING NOTES)

    Technical: Stores the gateway in cache (optional reuse) and returns the gateway/contract to caller.
    Tropang Ex: Para hindi paulit-ulit connect (depende sa design), tinatandaan yung gateway. Tapos ibinabalik yung gateway at contract para magamit ng ibang API endpoints.
    Example: const { gateway, contract } = await getContractAndGateway(...)
      → then use contract.submitTransaction(...) or contract.evaluateTransaction(...)
  */
  cachedGateway = gateway;
  lastConnectionTime = Date.now();
  return { gateway, contract };
}
// ==========================================================================================================================================================================

/*
  Function Name: sleep
  Technical: Temporarily pauses execution for a specified amount of time (in milliseconds).
  Tropang Ex: Parang pinapatulog mo muna yung code bago siya mag-continue.
  Useful kapag kailangan mo maghintay sandali (ex: retry logic, delay between blockchain calls).

  NOTE! - PENDING, not sure when used
*/
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// ==========================================================================================================================================================================

/*
  Function Name: process.on('SIGINT', async () => {
  Technical: Handles server shutdown by safely disconnecting from the Hyperledger Fabric network.
  Tropang Ex: Kapag pinindot mo Ctrl + C habang tumatakbo yung backend:
              * hindi basta-basta namamatay yung app
              * sinasarado muna yung connection sa blockchain
              * saka lang tuluyang nag-e-exit
*/
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  if (cachedGateway) {
    try {
      await cachedGateway.disconnect();
      console.log('✅ Gateway disconnected');
    } catch (e) {
      console.error('Error disconnecting:', e.message);
    }
  }
  process.exit(0);
});
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================
//                                                                       GET Endpoints
// ==========================================================================================================================================================================

/*
  Endpoint: GET /api/health
  Technical: Returns a simple health status response to confirm that the backend server is running.
  Tropang Ex: Parang tinatanong mo yung server ng “Uy, buhay ka pa ba?”
*/
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});
// ==========================================================================================================================================================================

/*
  Endpoint: GET /api/pending-issuers

  Technical: Retrieves/gets all issuer registration applications that are still subject for admin approval 
  Tropang Ex: Dito kinukuha ng admin yung listahan ng mga schools/organizations na nag-apply bilang issuer pero hindi pa approved.
*/
app.get('/api/pending-issuers', async (req, res) => {
  try {

     /* Step 1: Fetch pending issuer records from CouchDB

      Technical: Queries the database for issuer documents with pending status.
      Tropang Ex: Kinukuha dito lahat ng issuer applications na lumalabas sa admin dashboard.
      Example: Newly registered school → appears here until approved/rejected.
    */
    const pendingIssuers = await couchdb.getPendingIssuers();
    
    /* Step 2: Return pending issuers list

      Technical: Sends the list of pending issuers to the client.
      Tropang Ex: Ibinabalik sa frontend yung mga application para makita ng admin.
    */
    res.status(200).json({
      success: true,
      data: pendingIssuers
    });
  } catch (error) {
    
     /* Step 3: Handle errors

      Technical: Catches and returns server-side errors.
      Tropang Ex: Kapag may problema sa database, mag-e-error na lang nang maayos.
    */
    console.error('Error fetching pending issuers:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
// ==========================================================================================================================================================================

/* PENDING/TO BE FIXED --> cc function "GetCredentialsByIssuer" returns both issuer templates AND issuer issued credentials, dapat isolated sa isa lang 
  Endpoint: GET /api/credentials 

  Technical: Returns credentials from the blockchain based on the requester’s role (issuer/admin).
  Tropang Ex: Dito kinukuha yung list ng ISSUER credentials/templates niya sa blockchain. Kung issuer ka, sarili mong credentials lang. 
              Kung admin ka, gagamit siya ng admin identity para makapag-query. EX: GINAGAMIT sa issuerdashboard, etc 
*/
app.get('/api/credentials', async (req, res) => {
  try {

    /* Step 1: Check if user is authenticated (JWT/session)

      Technical: Validates that req.user exists before proceeding.
      Tropang Ex: Chine-check muna kung naka-login ka. Kung wala kang token / session, bawal ka.
      Example: No Authorization header → 401 Unauthorized.
    */
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    /* Step 2: Determine which Fabric identity to use (issuer vs admin)

      Technical: Selects identityName and orgName based on the user’s role.
      Tropang Ex: Dito dinidecide kung anong “blockchain account” ang gagamitin pang-query.
        - Issuer: kukunin sa CouchDB yung linked Fabric identity (approved issuer)
        - Admin: hardcoded admin identity
      Example: Issuer (DLSU) → delasalleuniversity-admin / De La Salle University
               Admin → admin / Org1
    */
    let identityName, orgName;

    if (user.role === 'issuer') {
     
      /* Step 2A: Fetch approved issuer data from CouchDB via email 

        Technical: Loads the approved issuer record to retrieve fabricIdentity and orgName.
        Tropang Ex: Hinahanap dito sa database kung approved issuer ka na, at ano yung Fabric identity mo.
                    Dito nanggagaling yung values ng parameters na ipapasa kay getContractAndGateway().
        Example: issuerDoc.fabricIdentity = "delasalleuniversity-admin"
                 issuerDoc.orgName = "De La Salle University"
      */
      const issuerDoc = await couchdb.getApprovedIssuer(user.email);

      if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) 
      {
        return res.status(403).json({ success: false, error: 'Issuer not approved or info missing.' });
      }
      identityName = issuerDoc.fabricIdentity;  // E.g. 'delasalleuniversity-admin'
      orgName = issuerDoc.orgName;             // E.g. 'De La Salle University'

    } 
    else if (user.role === 'admin') {
      
      /* Step 2B: Use Org1 admin identity PENDING - dapat hindi ata ganito kasi it makes use of a node?? */
      identityName = 'admin';
      orgName = 'Org1';

    } 
    else {

       /* Step 2C: Block other roles

        Technical: Restricts access for non-issuer/non-admin roles.
        Tropang Ex: Kung student/user ka, hindi ka allowed sa endpoint na ito.
      */
      return res.status(403).json({ success: false, error: 'Not authorized to view credentials.' });
    }

    /* Step 3: Connect to blockchain using chosen identity/org

      Technical: Calls getContractAndGateway() to obtain gateway and contract for Fabric interaction.
      Tropang Ex: Ito na yung step na “kumokonek sa blockchain” gamit yung identity na pinili sa Step 2.
      Example: getContractAndGateway("delasalleuniversity-admin", "De La Salle University")
    */
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);


     /* Step 4: From Blockchain, get the credentials of issuer via its id or email

      Technical: assigns to a variable the id or email of issuer to be used as a parameter to query the blockchain for issuer credentials 
                  via chaincode function "evaluateTransaction" 
      Tropang Ex: kunin email or id ni issuer para maquery yung records niya sa blockchain
      Example: contract.evaluateTransaction("GetCredentialsByIssuer", "issuer@email.com")
    */
    const issuerIdToQuery = user.role === 'issuer' ? user._id || user.email : 'ISSUER'; // adjust as needed
    const result = await contract.evaluateTransaction('GetCredentialsByIssuer', issuerIdToQuery);
    
    /* Step 6: Return standardized response

      Technical: Parses chaincode response and sends credentials list with count and timestamp.
      Tropang Ex: Ibinabalik sa frontend yung list ng credentials + ilan lahat + anong oras kinuhang data.
    */
    res.json({ 
      success: true, 
      credentials: JSON.parse(result.toString()),
      count: JSON.parse(result.toString()).length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================================================================================================================================================

/*
  Endpoint: GET /api/credentials/issuer/:issuerID

  Technical: Fetches an issuer’s credential TEMPLATES from the issuer’s own COUCHDB wallet database.
  Tropang Ex: Para to sa display on the issuer dashboard. Instead na blockchain ang kukunin, diretso CouchDB wallet ng issuer para mabilis.
*/
app.get('/api/credentials/issuer/:issuerID', async (req, res) => {
  try {

    /* Step 1: Validate issuerID param

      Technical: Ensures issuerID is valid and not placeholder value.
      Tropang Ex: Hindi pwede blank o "ISSUER" kasi placeholder yan.
      Example: issuerID="ISSUER" → 400 error.
    */
    const { issuerID } = req.params;
    
    if (!issuerID || issuerID === 'ISSUER') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid issuer ID is required',
        message: 'Issuer ID cannot be empty or "ISSUER"'
      });
    }

     /* Step 2: Check if user is authenticated/logged in | PENDING parang ang redundant? need pa ba talaga to */
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }


     /* Step 3: Connect to admin CouchDB to get issuer record

      Technical: Uses admin CouchDB to read issuer info (especially couchDBUrl).
      Tropang Ex: Admin DB muna para malaman kung saan yung sariling CouchDB (its url) ni issuer.
      Example: issuersDB.get(issuerID) returns couchDBUrl.
    */
    const adminNano = nano('http://admin:adminpw@localhost:5985'); // hardcoded talaga to 
    const issuersDB = adminNano.use('issuers');
    
    let issuer;
    try 
    {
      issuer = await issuersDB.get(issuerID);
    } 
    catch (err) 
    {
      if (err.statusCode === 404) {
        return res.status(404).json({ 
          success: false, 
          error: 'Issuer not found'
        });
      }
      throw err;
    }

     /* Step 4: Ensure issuer has couchDBUrl

      Technical: Validates issuer record contains couchDBUrl.
      Tropang Ex: Kung wala yung URL, hindi natin ma-aaccess yung issuer’s own DB.
    */
    if (!issuer || !issuer.couchDBUrl) {
      return res.status(403).json({ 
        success: false, 
        error: 'Issuer not found or CouchDB URL missing' 
      });
    }

    /* Step 5: Connect to issuer’s own CouchDB and  access "wallet_issuer_credentials" database.*/
    const issuerNano = nano(issuer.couchDBUrl);
    const walletDb = issuerNano.use('wallet_issuer_credentials');


    // ✅ Use .find() instead of .view() - no design docs needed!
    /* Step 6: Query credentials using .find() selector

      Technical: Queries wallet DB documents filtered by issuerId.
      Tropang Ex: Kinukuha lahat ng docs na issued by that issuer.
      Note: Using .find() so no design docs/view needed.
    */
    const result = await walletDb.find({
      selector: {
        issuerId: issuerID
      }
    });

     /* Step 7: Return standardized response

      Technical: Returns docs, count, and timestamp.
      Tropang Ex: Ibinabalik sa dashboard yung list + count.
    */
    res.json({ 
      success: true, 
      credentials: result.docs || [],
      count: (result.docs || []).length,
      timestamp: new Date().toISOString()
    });


  } catch (error) {
    console.error(`❌ Error fetching issuer credentials: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ==========================================================================================================================================================================

/*
  Endpoint: GET /api/credentials/:id/history

  Technical: Retrieves the full blockchain transaction HISTORY of a SPECIFIC CREDENTIAL using its ID.
  Tropang Ex: Para to makita lahat ng nangyari sa isang credential mula umpisa hanggang ngayon
  (ex: creation, issuance, updates).
*/
app.get('/api/credentials/:id/history', async (req, res) => {
  try {

    /* Step 1: Check if user is authenticated/logged in (JWT/session)*/
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    /* Step 2: Determines which Fabric identity will be used to query blockchain history based on role
      Tropang Ex: Dito pinipili kung anong blockchain identity ang gagamitin para mag-query ng history.
    */
    let identityName, orgName;

    if (user.role === 'issuer') {

      /* Step 2A: Fetches issuer record to get fabricIdentity and orgName
          Tropang Ex: Kung issuer ka, dapat approved ka at may Fabric identity ka bago ka makakita ng history.
      */
      const issuer = await couchdb.getApprovedIssuer(user.email);
      if (!issuer || !issuer.fabricIdentity || !issuer.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or Fabric identity missing.' });
      }
      identityName = issuer.fabricIdentity;
      orgName = issuer.orgName;

    } 
    else if (user.role === 'admin') {
      identityName = 'admin';
      orgName = 'Org1';
    } 
    else {
      return res.status(403).json({ success: false, error: 'Forbidden: Not allowed.' });
    }

    /* Step 3: Connect to blockchain using resolved identity
      Tropang Ex: Kumokonek sa blockchain para makapag-query ng ledger history.
      Example: getContractAndGateway("delasalleuniversity-admin", "De La Salle University")
    */
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    /* Step 4: Query blockchain for credential history using Calls chaincode function GetCredentialHistory 

      Tropang Ex: Kinukuha lahat ng past versions at transactions ng isang credential.
      Example: creation → issue → update → revoke (if supported).
    */
    const result = await contract.evaluateTransaction('GetCredentialHistory', req.params.id);
    
     /* Step 5: Parse and return history

      Technical: Parses chaincode response and returns history list with timestamp.
      Tropang Ex: Ibinabalik yung buong audit trail ng credential para sa transparency at verification.
    */
    res.json({ 
      success: true, 
      history: JSON.parse(result.toString()),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ==========================================================================================================================================================================

/*
  Endpoint: GET /api/users

  Technical: Retrieves a filtered list of non-admin users from CouchDB.
  Tropang Ex: Kinukuha dito yung list ng regular users (e.g. students) na pwedeng pagpilian bilang credential holders.
  Ex: used para makita list of users na pwede sendan/issuhan ng credentials sa issuer dashboard 
*/
app.get('/api/users', async (req, res) => {
  try {

     /* Step 1: Fetch all users from CouchDB */
    const users = await couchdb.getAllUsers();

     /* Step 2: Filter out admin users to get normal users only*/
    const filtered = users.filter(u => !u.role || u.role === 'user');

    /* Step 3: Return simplified user list

      Technical: Maps user records to minimal fields (id, email) before returning.
      Tropang Ex: Hindi na binabalik lahat ng user info — sapat na yung ID at email para pumili ng credential holder.
    */
    res.json({
      success: true,
      users: filtered.map(u => ({ id: u._id, email: u.email })),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ==========================================================================================================================================================================

// ✅ VERIFY CREDENTIAL ENDPOINT (QUERY COUCHDB WORLD STATE)
/*
  Endpoint: GET /api/credentials/:credentialId/verify | PENDING/TO BE FIXED: remove backup verif kasi same lang naman, make it query bc instead

  Technical: Verifies a credential via its id in COUCHDB. With fallback to a direct database lookup if not found.
  Tropang Ex: Dito vine-verify kung legit yung credential ID. Una hahanapin sa “main verify method”
  (couchdb.verifyCredentialFromCouchDB), tapos pag wala, may fallback search sa wallet_user_credentials DB.
  NOTE: This endpoint verifies via CouchDB records, not direct Fabric chaincode query. PENDING/TO FIX, TALAGA BA SADYA NA WALANG BC QUERY DITO ?
*/
app.get('/api/credentials/:credentialId/verify', async (req, res) => {
  try {

    
    /* Step 1: Extract credentialId from URL params + validate

      Technical: Reads credentialId and ensures it exists.
      Example: /api/credentials/user_cred_123/verify
    */
    const { credentialId } = req.params;

    if (!credentialId) {
      return res.status(400).json({
        success: false,
        error: 'Credential ID is required'
      });
    }
    console.log(`[VERIFY] Verifying credential: ${credentialId}`);

     /* Step 2: Try primary verification via CouchDB service function

      Technical: Calls verifyCredentialFromCouchDB() which handles lookup and ID cleanup.
      Tropang Ex: Ito yung “main verification logic” mo sa couchDB_service.js. Siya ang unang maghahanap kung existing yung credential record.
    */
    const couchResult = await couchdb.verifyCredentialFromCouchDB(credentialId);
    

    /* Step 3: If not found yung credential id (and no error), do fallback database lookup

      Technical: If primary lookup says "not verified" but no error occurred, run a manual search in wallet_user_credentials.
      Tropang Ex: Pag hindi nakita sa unang method, may backup plan: hanapin direkta sa DB.
      Purpose: Support both direct verification and user wallet lookup even if ID formats differ.
    */
    if (couchResult.verified === false && !couchResult.error) {

      /* Step 3A: Connect to admin CouchDB instance
          Tropang Ex: Kumokonek sa CouchDB as admin para ma-access yung wallet_user_credentials DB.
          NOTE: This is CouchDB access (world state mirror), not Fabric chaincode query.
        */      
      try {
        const adminNano = nano('http://admin:adminpw@localhost:5985');
        const issuerDB = adminNano.use('wallet_user_credentials');
        
        /* Step 3B: Normalize credential ID format

          Technical: Removes optional prefix and rebuilds ID with expected 'user_cred_' prefix.
          Tropang Ex: Minsan iba-iba yung format ng credentialId na pinapasa (may prefix/no prefix), so nililinis muna then ginagawang consistent bago maghanap sa DB.
          Example:
            input:  "user_cred_ABC" → cleanId="ABC" → searchId="user_cred_ABC"
            input:  "ABC"           → cleanId="ABC" → searchId="user_cred_ABC"
        */
        const cleanId = credentialId.replace(/^user_cred_/, '');
        const searchId = `user_cred_${cleanId}`;
        
         /* Step 3C: Query CouchDB by _id using Mango find()
          Tropang Ex: Hinahanap yung specific credential record by exact document ID.
        */
        const result = await issuerDB.find({
          selector: {
            _id: searchId
          },
          limit: 1
        });
        
        /* Step 3D: If still not found, return 404
          Tropang Ex: Wala talaga yung credential sa database, so invalid / not existing.
        */
        if (result.docs.length === 0) {
          return res.status(404).json({
            success: false,
            valid: false,
            reason: 'Credential not found in database',
            credentialId: credentialId,
            timestamp: new Date().toISOString()
          });
        }
        
        /* Step 3E: Compute validity based on status/revocation/expiry

          Technical: Determines if credential is revoked or not issued.
          Tropang Ex: Kahit nakita yung record, hindi ibig sabihin valid agad.
          Check natin:
            - revoked ba?
            - status == issued ba?
            - expired na ba?
        */
        const credential = result.docs[0];
        const status = credential.status || 'unknown';
        const isRevoked = status === 'revoked' || credential.revoked === true;
        
        return res.status(200).json({
          success: true,
          verified: true,
          valid: !isRevoked && status === 'issued',
          credential: {
            id: credential._id,
            credentialType: credential.credentialType,
            credentialName: credential.credentialName,
            issuer: {
              id: credential.issuerID,
              name: credential.issuerName || 'Unknown'
            },
            holder: {
              id: credential.holderID
            },
            status: status,
            issuedDate: credential.savedToUserWalletAt || credential.createdAt,
            expiryDate: credential.expiryDate,
            isExpired: credential.expiryDate ? new Date(credential.expiryDate) < new Date() : false
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (blockchainErr) {

        /* Step 3F: Fallback lookup failed (return primary result)
          Tropang Ex: Kung pumalya yung backup DB lookup, babalik tayo sa result ng main verification method.
          NOTE: Returning couchResult directly might not match API format, so be careful later.
        */
        console.error(`[VERIFY] Blockchain lookup failed:`, blockchainErr.message);
        return couchResult;
      }
    }
    
    /* Step 4: If primary verification returned an error
      Technical: Returns 500 error if couchResult contains error.
      Tropang Ex: Kung nag-error yung verification service mismo, server error ito.
    */
    if (couchResult.error) {
      return res.status(500).json({
        success: false,
        error: couchResult.error,
        timestamp: new Date().toISOString()
      });
    }
    
     /* Step 5: Return primary verification result

      Technical: Sends couchResult fields as API response.
      Tropang Ex: Ito yung normal path: na-verify siya via couchDB_service, so ibabalik na result sa frontend.
    */
    return res.status(200).json({
      success: true,
      verified: couchResult.verified,
      valid: couchResult.verified,
      credentialId: couchResult.credentialId,
      holderID: couchResult.holderID,
      issuerName: couchResult.issuerName,
      credentialType: couchResult.credentialType,
      credentialName: couchResult.credentialName,
      status: couchResult.status,
      issuedAt: couchResult.issuedAt,
      expiryDate: couchResult.expiryDate,
      message: couchResult.message,
      timestamp: couchResult.timestamp
    });

  } catch (error) {
    console.error(`❌ Verification error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================
//                                                                       POST Endpoints
// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/register
  Technical: Registers a new user by storing their credentials and metadata in CouchDB.
  Tropang Ex: validation shi associated with registration \ Dito nagsasign up yung user para magkaroon ng account sa system. 
              Hindi pa ito blockchain-related — pang system access pa lang.
*/
app.post('/api/register', async (req, res) => {
  try {

     /* Step 1: Extract and validate required fields

      Technical: Validates required registration fields from request body.
      Tropang Ex: Chine-check kung kumpleto yung pinasa ng user. Kung may kulang, hindi na siya papayagang mag-register.
      Example: email, password, role dapat meron.
    */
    const { email, password, role, fullName } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    
    /* Step 2: Check if user already exists

      Technical: Prevents duplicate user accounts by checking existing records.
      Tropang Ex: Tinitingnan kung may account na yung ginamit na email.
      Example: Register twice with same email → error.
    */
    const existingUsers = await couchdb.getAllUsers();
    const userExists = existingUsers.find(u => u.email === email);
    if (userExists) {
      return res.status(409).json({ success: false, error: 'User already exists with this email.' });
    }
    
     /* Step 3: Generate walletId for the user

      Technical: Generates a unique wallet identifier for the user.
      Tropang Ex: Gumagawa ng unique ID na pwedeng i-associate sa future wallet or credentials.
      Example: wallet_1699999999999
    */
    const walletId = `wallet_${Date.now()}`;

    // Step 4: Save user to CouchDB with walletId included
    const result = await couchdb.saveUser({ email, password, role, fullName, walletId });
    
    /* Step 5: Return success response

      Technical: Sends success response with userId and walletId.
      Tropang Ex: Sinasabi sa frontend na successful yung registration.
    */
    res.json({ success: true, userId: result.id, walletId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }

});

// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/login

  Technical: Authenticates a user and returns a JWT token for session-based access.
  Tropang Ex: handles shi associated with login / dito naglo-login yung user para makapasok sa system at makagamit ng features.
*/
app.post('/api/login', async (req, res) => {
  try {

     /* Step 1: Validate login input

      Technical: Ensures email and password are provided.
      Tropang Ex: Basic check lang kung may email at password bago mag-login.
      Example: Missing password → error agad.
    */
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing email or password.' 
      });
    }


 /*   Step 2: Retrieve user from database

      Technical: Fetches user record from CouchDB via email.
      Tropang Ex: Hinahanap kung may account ba talaga na naka-register gamit yung email.
      Example: Email not found → invalid credentials.
    */    const users = await couchdb.getAllUsers();
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials.' 
      });
    }


 /*   Step 3: Verify password using bcrypt (not plain text)

      Technical: Compares plaintext password with hashed password.
      Tropang Ex: Chine-check kung tama yung password using secure hashing / Hindi plain text comparison para mas secure.
      Example: Wrong password → login denied.
    */  
    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials.' 
      });
    }


    /* Step 4: Generate JWT token

      Technical: Creates a signed JWT token containing user identity and role.
      Tropang Ex: Gumagawa ng access pass (token) na gagamitin sa mga next API calls.
      Example: Token is sent in Authorization header later.
    */    
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role || 'student' 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

     /* Step 5: Remove password from response

      Technical: Excludes sensitive data from API response.
      Tropang Ex: Para hindi accidentally maibalik yung password sa frontend.
    */
    const { password: pw, ...userData } = user;

    /* Step 6: Send login success response

      Technical: Returns token and user metadata to frontend.
      Tropang Ex: Successful login — may token na, pwede nang gumamit ng system.
    */
    res.json({ 
      success: true, 
      token, 
      user: {
        ...userData,
        role: user.role || 'student'
      }
    });
  } catch (err) {
    console.error('❌ User login error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
  
});

// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/login-issuer

  Technical: Authenticates an approved issuer account and returns a JWT token with issuer-specific claims.
  Tropang Ex: api called when an issuer logins. Hindi lahat pwedeng pumasok dito — approved issuers lang.
*/
app.post('/api/login-issuer', async (req, res) => {
  try {

     /* Step 1: Extract and validate login credentials

      Technical: Validates that email and password are provided in the request body.
      Tropang Ex: Basic check lang kung may email at password bago mag-login.
      Example: Kulang ang password → error agad.
    */
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

      /* Step 2: Retrieve approved issuer record

      Technical: Fetches issuer data from CouchDB, restricted to approved issuers only.
      Tropang Ex: Hinahanap dito kung approved na ba talaga yung issuer. Kahit may account ka, kung hindi ka pa approved, bawal ka pang mag-login.
      Example: Pending or rejected issuer → login denied.
    */
    const issuer = await couchdb.getApprovedIssuer(email);
    if (!issuer) {
      return res.status(401).json({ 
        success: false, 
        message: 'Issuer not found or not approved yet' 
      });
    }

    /* Step 3: Verify issuer password using bcrypt

      Technical: Compares the provided password with the stored hashed password.
      Tropang Ex: Chine-check kung tama yung password gamit secure hashing. Hindi plain text para iwas security issues.
      Example: Mali ang password → login denied.
    */    
    const passwordMatch = await bcryptjs.compare(password, issuer.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
      });
    }
    

     /* Step 4: Generate JWT token with issuer role and org info

      Technical: Creates a signed JWT token containing issuer identity and organization details.
      Tropang Ex: Gumagawa ng access pass na magsasabing:
        - issuer ka
        - anong organization ka
      Gagamitin ito sa mga next API calls (e.g., issue credential).
    */
    const token = jwt.sign(
      { 
        id: issuer._id, 
        email: issuer.email, 
        role: 'issuer',
        orgName: issuer.orgName 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

     /* Step 5: Send successful login response
     
      Technical: Returns the JWT token and issuer metadata to the frontend.
      Tropang Ex: Successful login — pwede nang pumasok sa issuer dashboard
      at mag-issue ng credentials.
    */
    res.status(200).json({
      success: true,
      token,
      user: {
        id: issuer._id,
        email: issuer.email,
        role: 'issuer',
        orgName: issuer.orgName,
        contactName: issuer.contactName
      }
    });
  } catch (error) {
    console.error('❌ Issuer login error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }

});

// ==========================================================================================================================================================================

// KAI - CHANGES - 2-STEP CREDENTIAL ISSUANCE (CouchDB FIRST, then Blockchain) PENDING, ANO TO??
/*
  Endpoint: POST /api/credentials PENDING/TO BE FIXED duplicate endpoint meron sa baba sa dulo, which to retain? 

  Technical: api used to create a CREDENTIAL TEMPLATE on the blockchain using the caller’s authorized Fabric identity.
  Tropang Ex: Dito gumagawa ng “credential template” yung issuer/admin (example: Diploma template). Template muna bago makapag-issue ng actual credential sa student.
*/
app.post('/api/credentials', async (req, res) => {
  try {

    /* Step 1: Extract template fields from request body

      Technical: Reads template data fields from req.body.
      Tropang Ex: Kinukuha dito yung mga details ng template galing frontend form.
      Example: id, issuerID, credentialType, credentialName, description, metadata
    */
    const { id, issuerID, credentialType, credentialName, description, metadata } = req.body;

    /* Step 2: Validate required fields to be filled up 

      Technical: Ensures required template fields are filled up before continuing.
      Tropang Ex: basically requires issuer to fill up all fields, otherwise error/would not push through 
      Example: missing credentialName → error 400.
    */
    if (!id || !issuerID || !credentialType || !credentialName) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, issuerID, credentialType, credentialName' 
      });
    }

     /* Step 3: Check if user is authenticated (JWT/session)

      Technical: Validates that req.user exists (meaning user is logged in).
      Tropang Ex: Dapat naka-login muna bago gumawa ng template.
      Example: no token → 401 Unauthorized.
    */
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

     /* Step 4: Resolve Fabric identityName + orgName based on role

      Technical: Determines which Fabric identity will sign the blockchain transaction.
      Tropang Ex: Dito nanggagaling yung values na ipapasa sa getContractAndGateway():
        - Issuer: kukunin sa CouchDB yung approved issuer record (fabricIdentity + orgName)
        - Admin: hardcoded admin identity (Org1)
      Example: issuerDoc.fabricIdentity="delasalleuniversity-admin"
               issuerDoc.orgName="De La Salle University"
    */
    let identityName, orgName;

    // PENDING - not sure exactly why aabot pa sa point na admin can create a credential template kasi wala namna sa frontend in the first place
    //         - question here would be, does block non-issuer roles when creating templates in the frontend, or pati sa ubuntu/backend/blockchain query invoke CC?
    if (user.role === 'issuer') {

      /* Step 4A: Load approved issuer data from CouchDB via its email

        Technical: Fetches issuerDoc to ensure issuer is approved and has Fabric identity info.
        Tropang Ex: Kung issuer ka, dapat approved ka muna bago gumawa ng template. Dito rin kinukuha yung actual Fabric identity mo.
      */
      const issuerDoc = await couchdb.getApprovedIssuer(user.email); 

      if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) 
      {
        return res.status(403).json({ 
          success: false, 
          error: 'Issuer not approved or Fabric identity missing.' 
        });
      }
      identityName = issuerDoc.fabricIdentity;
      orgName = issuerDoc.orgName; 
    } 
    else if (user.role === 'admin') {

       /* Step 4B: Admin uses Org1 admin identity for template creation*/

      identityName = 'admin';
      orgName = 'Org1';
    } 
    else {

      /* Step 4C: Rejects access for non-issuer/non-admin roles.*/

      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to create credentials.' 
      });
    }

     /* Step 5: Retry setup for blockchain submission

      Technical: Prepares retry loop parameters for Fabric submitTransaction failures.
      Tropang Ex: Blockchain minsan nag-e-error (endorsement mismatch, timeout). So instead na give up agad, susubok ulit up to MAXRETRIES times.
    */
    const MAXRETRIES = 3;
    let lastError;

       /* Step 6: Retry loop for CreateCredentialTemplate transaction | PENDING - not sure if needed pa, used this back then kasi hindi pumapasok sa BC yung transaction

      Technical: Attempts to submit the CreateCredentialTemplate transaction with exponential backoff.
      Tropang Ex: Paulit-ulit susubok gumawa ng template hanggang maipasok yung record sa blockchain 
      Example: attempt 1 fail → wait → attempt 2 → etc.
    */
    for (let attempt = 1; attempt <= MAXRETRIES; attempt++) {
      try {
        console.log(`\n📝 Attempting credential creation (${attempt}/${MAXRETRIES})...`);
        console.log(`   Identity: ${identityName}, Org: ${orgName}`);
        

        /* Step 6A: Connect to blockchain as the correct identity/org

          Tropang Ex: Ito yung “connect/login sa blockchain” part bago ka makapag-submit ng transaction.
          Example: getContractAndGateway("delasalleuniversity-admin", "De La Salle University")
        */
        const { gateway, contract } = await getContractAndGateway(identityName, orgName);
        
        /* Step 6B: Submit CreateCredentialTemplate to chaincode (WRITE)

          Technical: Calls submitTransaction to create the template on-chain.
          Tropang Ex: Ito yung actual pag-save ng template sa blockchain. Dito na siya nagiging immutable record.
        */
        const result = await contract.submitTransaction(
          'CreateCredentialTemplate',  // ← Correct function name
          id,
          issuerID,
          credentialType,
          credentialName,
          description || '',
          metadata || ''
        );
        // ← ADD THIS 3-SECOND WAIT HERE PARA LANG SURE NA NAPROCESS MUNA FOR A BIT 
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log(`✅ SUCCESS on attempt ${attempt}`);

        /* Step 6C: Disconnect gateway after success

          Technical: Closes the Fabric connection after finishing the operation.
          Tropang Ex: Para clean ang resources, nagdi-disconnect after matapos.
        */
        await gateway.disconnect();
        

        /* Step 6D: Return success response

          Technical: Returns created template data to client.
          Tropang Ex: Ibinabalik sa frontend yung created template + timestamp + which attempt succeeded.
        */
        return res.status(201).json({ 
          success: true, 
          credential: JSON.parse(result.toString()),
          timestamp: new Date().toISOString(),
          attempt: attempt
        });
        
      } catch (error) {
        lastError = error;
        const errorMsg = error.message.toLowerCase();
        
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
        

        /* Step 6E: Retry only for specific “retry-able” Fabric errors

          Technical: Detects known transient Fabric errors and retries with backoff.
          Tropang Ex: Hindi lahat ng errors dapat i-retry.
          Example: endorsement mismatch / deadline exceeded → retry
                   invalid input / access denied → do NOT retry
        */
        if (errorMsg.includes('peer endorsement') || 
            errorMsg.includes('do not match') || 
            errorMsg.includes('no valid responses') ||
            errorMsg.includes('deadline exceeded')) {
          
          if (attempt < MAXRETRIES) {
            const backoffMs = Math.pow(2, attempt - 1) * 1000;
            console.log(`⏳ Retrying in ${backoffMs}ms...`);
           
            /* Step 6F: Backoff wait before retry*/
            await sleep(backoffMs);
            continue;
          }
        }
        
        // If this is the last attempt, throw the error (max tries = 3)
        if (attempt === MAXRETRIES) {
          throw error;
        }
      }
    }
    // Safety net lang — kung wala talagang successful attempt.
    throw new Error(`Failed after ${MAXRETRIES} attempts: ${lastError.message}`);
    
  } catch (error) {
    console.error('❌ Error creating credential:', error.message);
    console.error('   Stack:', error.stack);
    
    // Tropang Ex: Ibinabalik sa frontend na nag-fail yung create template.
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/credentials/:credentialId/issue

  Technical: Issues a credential on the blockchain, then syncs the issued credential data to CouchDB.
  Tropang Ex: api used to SAVE the transcation of issue credential to user. Saved in BC, then couchDB, respectively. 
*/
app.post('/api/credentials/:credentialId/issue', async (req, res) => {
  try {

    /* Step 1: Extract credentialId from req.params and holderID/expiryDate from req.body.

      Tropang Ex: Kinukuha dito kung anong template/credential ID yung i-iissue, at kanino mapupunta (holderID).
      Example: /api/credentials/cred123/issue + { holderID: "stud001", expiryDate: "2026-12-31" }
    */
    const { credentialId } = req.params;
    const { holderID, expiryDate } = req.body;
    
     /* Step 2: Validate required field: holderID

      Tropang Ex: dapat filled up yung "recipient" field dun sa forms, otherwise mageerror
      Example: missing holderID → 400 error.
    */
    if (!holderID) {
      return res.status(400).json({ 
        success: false, 
        error: 'holderID is required' 
      });
    }

    /* Step 3: Check if user is authenticated (JWT/session)

      Tropang Ex: Dapat naka-login ka muna bago mag-issue.
      Example: no token → 401 Unauthorized.
    */
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    
    /* Step 4: Get Fabric identityName + orgName based on role (issuer/admin)

      Technical: Determines which Fabric identity will sign the IssueCredential transaction.
      Tropang Ex: sa operation na to kukunin yung values na ipapasa sa getContractAndGateway():
        - Issuer: kukunin sa CouchDB yung approved issuer record (fabricIdentity + orgName)
      Example: identityName="delasalleuniversity-admin", orgName="De La Salle University"
    */
    let identityName, orgName, issuerDoc;

    if (user.role === 'issuer') {

       /* Step 4A: Checks fabric identity AND status field issuers database from CouchDB via its email 

        Technical: Fetches issuerDoc and checks if issuer is approved + has Fabric identity info.
        Tropang Ex: basically chinecheck lang if yung issuer is approved and already has a fabric identity
      */
      issuerDoc = await couchdb.getApprovedIssuer(user.email);
      if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) {
        return res.status(403).json({ 
          success: false, 
          error: 'Issuer not approved or Fabric identity missing.' 
        });
      }
      identityName = issuerDoc.fabricIdentity;
      orgName = issuerDoc.orgName;

    } 
    else if (user.role === 'admin') {

       /* Step 4B: Admin uses Org1 admin identity*/
      identityName = 'admin';
      orgName = 'Org1';
    } 
    else {

      /* Step 4C: Block other roles*/
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to issue credentials.' 
      });
    }

    /* Step 5: Connect to blockchain as resolved identity/org

      Example: getContractAndGateway("delasalleuniversity-admin", "De La Salle University")
    */
    console.log(`[SDK] Issuing credential to blockchain...`);
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);
    

    /* RATIONALE/ADDITIONAL Notes for Step 6-7 
        * after step 6, "result" = raw bytes of data pa yan (NOT USABLE) --> ex: <Buffer 7b 22 69 64 22 3a 22 63 72 65 64 31 22 ... >
        * in step 7, "result.toString()" converts the raw data into a STRING --> ex: "{\"id\":\"cred1\",\"issuerId\":\"dlsu\",\"holderID\":\"stud1\"}"
        * after, "JSON.parse" converts the string into a JS OBJECT (USABLE) --> ex: { id: "cred1", issuerId: "dlsu", holderID: "stud1"}
        * WHY? --> if it is not in JS Object form, hindi mo siya masesave sa couchDB
    */
   
    /* Step 6: Submit IssueCredential transaction to BLOCKCHAIN

      Technical: Writes the issuance record to the blockchain using submitTransaction().
      Example: IssueCredential(credentialId, holderID, expiryDate)
    */
    const result = await contract.submitTransaction(
      'IssueCredential',
      credentialId,
      holderID,
      expiryDate || ''
    );

    /* Step 7: Parse blockchain response

      Technical: Converts chaincode response into JSON.
      Tropang Ex: Kinukuha yung returned credential data from chaincode para magamit sa response at CouchDB sync.
    */
    const credentialData = JSON.parse(result.toString());
    console.log(`✅ Blockchain success. Credential ID: ${credentialData.id}`);

    /* Step 8: Disconnect Fabric gateway after blockchain transaction*/
    await gateway.disconnect();

    /* Step 9: Save a copy of the issued credential transaction to COUCHDBs naman since done na sa Blockchain
      
      Tropang Ex: After ma-issue sa blockchain, isasave sa CouchDB para mabilis lumabas sa dashboard/history.
      NOTE! -->  SAVES IN COUCHDBs OF:
                    * ISSUER - "issued_credentials" | credentials issued by the issuer
                    * ADMIN - "wallet_user_credentials" | credentials of ALL users/students
    */
    try {
      console.log(`[SDK] Saving to BOTH CouchDB databases...`);
      
      const couchResult = await couchdb.saveIssuedCredentialToBothDBs(user.email, {
        ...credentialData,
        holderID: holderID,
        expiryDate: expiryDate || null
      });
      console.log(`[SDK] ✅ CouchDB save successful:`, couchResult.message);

      /* Step 10: Return COMPLETE success response (blockchain + couchdb pumasok)*/
      return res.status(200).json({ 
        success: true, 
        message: 'Credential issued successfully',
        credential: credentialData,
        couchDB: couchResult,
        timestamp: new Date().toISOString()
      });
      
    } catch (couchErr) {
      console.error(`⚠️ CouchDB save failed (non-fatal):`, couchErr.message);
      
      /* Step 10B: Return PARTIAL success response (blockchain lang), basically FAILED response to kasi hindi pumasok couchdb*/
      return res.status(200).json({ 
        success: true, 
        message: 'Credential issued to blockchain (CouchDB sync pending)',
        credential: credentialData,
        warning: couchErr.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error issuing credential:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ==========================================================================================================================================================================

const issuerCredentialController = require('./controllers/issuerCredentialController');
/*
  Endpoint: POST /api/issuer/credentials/create

  Technical: Delegates issuer credential creation logic to a controller, passing the blockchain gateway helper.
  Tropang Ex: Ito yung endpoint na tumatawag lang sa controller.
  Hindi dito ginagawa yung logic — dito lang siya “pinapasa” sa tamang file.

  Tropang explanation:
Parang receptionist lang siya. Tumatanggap ng request, tapos ituturo kung sino ang gagawa ng trabaho.
*/
app.post('/api/issuer/credentials/create', (req, res) => {
  issuerCredentialController.createCredential(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================


const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ API running on :${PORT}`);
  console.log('✅ CouchDB databases selected');
  console.log('✅ Docker deployment endpoints ready');
});


setInterval(() => {}, 1000);
