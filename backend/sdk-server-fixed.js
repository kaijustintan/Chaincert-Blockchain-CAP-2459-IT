// ==========================================================================================================================================================================
//                                                                       sdk-server-fixed.js 
// ==========================================================================================================================================================================

/* [ OUTLINE ]
 =====================================================================
  FILE: sdk-server-fixed.js
  TECHNICAL: Main Express server + Fabric gateway + CouchDB infra + a few blockchain-facing endpoints
  TROPA: The “middleman” of your whole system | Nothing talks directly to the blockchain except this file.
 =====================================================================

  CATEGORY: CORE IMPORTS & APP SETUP
  - Express app initialization (const app = express())
  - Core requires: express, cors, fabric-network, path, fs, jwt, bcryptjs, multer, Docker, nano
  - JWT_SECRET, multer upload, couchdb service import

  CATEGORY: AUTH ROUTER MOUNTING
  - const authRoutes = require('../src/routes/authRoutes')
  - app.use('/api/auth', authRoutes)

  CATEGORY: GLOBAL MIDDLEWARE
  - Global Auth Middleware (JWT Parser) → app.use((req,res,next) => { req.user = jwt.verify(...) })
  - CORS Middleware → app.use(cors())
  - JSON Body Parser → app.use(express.json())

  CATEGORY: DOCKER & COUCHDB INITIALIZATION
  - Docker client initialization (const docker = new Docker(...))
  - FABRIC_SAMPLES_PATH, CORE_YAML_PATH
  - couchdb.initializeDatabases()
  - setupDatabaseIndexes()
  - setTimeout(setupDatabaseIndexes, 2000)

  CATEGORY: FABRIC / BLOCKCHAIN HELPERS
  - walletPath (path.join(..., 'wallet'))
  - Gateway cache variables: cachedGateway, lastConnectionTime, CONNECTION_CACHE_TTL
  - getContractAndGateway(identityName, orgName)
  - sleep(ms)
  - process.on('SIGINT', shutdown handler)

  CATEGORY: HTTP GET ENDPOINTS (GENERAL)
  - GET /api/health
  - GET /api/pending-issuers

  CATEGORY: HTTP GET ENDPOINTS (BLOCKCHAIN CREDENTIAL VIEWS)
  - GET /api/credentials/issued      (issuer/admin issued instances)
  - GET /api/credentials/templates   (issuer/admin templates)

  CATEGORY: HTTP POST ENDPOINTS (ISSUER CREDENTIAL OPERATIONS)
  - POST /api/issuer/credentials/create   (delegates to issuerCredentialController.createCredential / Create_CredentialTemplate)
  - POST /api/credentials/:credentialId/issue  (delegates to issuerCredentialController.issue_CredentialToUser)

  CATEGORY: SERVER STARTUP
  - const PORT = 4000
  - app.listen(PORT, ...)
  - setInterval(() => {}, 1000)
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

const issuerCredentialController = require('./controllers/issuerCredentialController');  // UBUNTU DIRECTORY BASED 
const verifierController = require('./controllers/verifierController');  // UBUNTU DIRECTORY BASED 
const adminDashboardController = require('./controllers/adminDashboardController'); // UBUNTU DIRECTORY BASED 
const authController = require('./controllers/authController');




// ==========================================================================================================================================================================
// MIDDLEWARE SECTION - ORDER MATTERS!
// ==========================================================================================================================================================================

/* 
  Function Name: CORS Middleware

  Technical:
  Enables Cross-Origin Resource Sharing so that frontend applications
  from different domains/ports can call the backend APIs.

  Tropang Ex:
  Para payagan yung frontend (ex: localhost:3000) na kumausap sa backend (localhost:4000).
  Kung wala ito, blocked agad ng browser.
  
  NOTE: MUST BE FIRST before any routes or other middleware
*/
app.use(cors({
  origin: 'http://localhost:3000',  // Allow requests from React frontend
  credentials: true
}));
// ==========================================================================================================================================================================

/* 
  Function Name: JSON Body Parser

  Technical:
  Automatically parses incoming request bodies with JSON payloads
  and makes them accessible via req.body.

  Tropang Ex:
  Para mabasa ng backend yung data na sinend ng frontend
  (ex: email, password, credential details).
  
  NOTE: MUST BE BEFORE routes so that req.body is populated before controllers run
*/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ==========================================================================================================================================================================

/* 
  Function Name: Global Auth Middleware (JWT Parser)

  Technical:
  Intercepts every incoming request, extracts the JWT token from the Authorization header,
  verifies it using JWT_SECRET, and attaches the decoded user data to req.user.

  Tropang Ex:
  Para siyang bouncer sa entrance. Bawat request chine-check kung may "ID" (JWT token).
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

// ==========================================================================================================================================================================
// ROUTES MOUNTING - MUST COME AFTER ALL MIDDLEWARE
// ==========================================================================================================================================================================

/* 
  Route Mounting: authRoutes
  
  Technical:
  Mounts the authentication router at /api/auth path.
  All routes defined in authRoutes.js will be prefixed with /api/auth.
  
  Tropang Ex:
  "Lahat ng request na nagsisimula sa /api/auth ibato mo sa authRoutes."
  Example: POST /api/auth/register → handled by authRoutes.js
*/
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
// ==========================================================================================================================================================================

/* 
  Function Name: Docker Client Initialization

  Technical:
  Creates a Docker client instance connected to the host's Docker daemon
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
  Ito yung "base folder" kung saan nakalagay lahat ng Fabric config files
  (connection profiles, core.yaml, org folders).
*/
const FABRIC_SAMPLES_PATH = '/home/kaitanz_/fabric-samples/fabric-samples'; // KAI
// ==========================================================================================================================================================================

/* 
  Variable Name: CORE_YAML_PATH

  Technical:
  Absolute path to Fabric's core.yaml configuration file.

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
  // ✅ DEBUG (added): prove which file + working dir is being used at runtime
  console.log('\n[getContractAndGateway][DEBUG] called with:', { identityName, orgName });
  console.log('[getContractAndGateway][DEBUG] __dirname =', __dirname);
  console.log('[getContractAndGateway][DEBUG] cwd =', process.cwd());

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
      __dirname,
      '..',
      'fabric-samples',
      'fabric-samples',
      'test-network',
      'organizations',
      'peerOrganizations',
      'dlsu.example.com',
      'connection-delasalleuniversity.json'
    );
  } else {
    // Default to Org1
    ccpPath = path.resolve(
      __dirname,
      '..',
      'fabric-samples',
      'fabric-samples',
      'test-network',
      'organizations',
      'peerOrganizations',
      'org1.example.com',
      'connection-org1.json'
    );
  }

  // ✅ DEBUG (added): confirm the exact CCP path chosen
  console.log('[getContractAndGateway][DEBUG] ccpPath =', ccpPath);

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
  // ✅ DEBUG (added): confirm walletPath being used
  console.log('[getContractAndGateway][DEBUG] walletPath =', walletPath);

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

  // ✅ DEBUG (added): show we are about to connect
  console.log('[getContractAndGateway][DEBUG] connecting gateway...');

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

  // ✅ DEBUG (added): confirm we are returning the expected shape
  console.log('[getContractAndGateway][DEBUG] ✅ returning { gateway, contract }');
  console.log('[getContractAndGateway][DEBUG] gateway exists =', !!gateway);
  console.log('[getContractAndGateway][DEBUG] contract exists =', !!contract, '\n');

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

// =========================================================================================================
// E. Issuer Issued Credentials (Blockchain → issued instances only)
// =========================================================================================================

/*
  Endpoint: GET /api/credentials/issued

  Technical:
  Returns all ISSUED (non-template) credentials for the current issuer/admin from the blockchain
  using the appropriate Fabric identity (issuer or admin).

  Tropang Ex:
  Dito kinukuha yung list ng credentials na na-issue na talaga ng issuer sa mga holders.
  - Kung issuer ka: sarili mong issued credentials lang ang lalabas.
  - Kung admin ka: gagamit siya ng admin identity para mag-query (config pa kung kaninong issuer ang tina-target).
*/
app.get('/api/credentials/issued', async (req, res) => {
  try {
    /* Step 1: Check if user is authenticated (JWT/session)

       Technical:
       Validates that req.user exists before proceeding. If missing, returns 401 Unauthorized.

       Tropang Ex:
       Chine-check muna kung naka-login ka. Kung wala kang token / session, bawal ka.
       Example: No Authorization header → 401 Unauthorized.
    */
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    /* Step 2: Determine which Fabric identity to use (issuer vs admin)

       Technical:
       - If role === 'issuer': load approved issuer doc from CouchDB and use its fabricIdentity + orgName.
       - If role === 'admin': use Org1 admin identity (for now).
       - Else: deny access.

       Tropang Ex:
       Dito dinidecide kung anong “blockchain account” ang gagamitin.
       - Issuer: gagamitin yung Fabric identity na naka-link sa school/org.
       - Admin: gagamit ng admin / Org1 identity.
    */
    let identityName, orgName;

    if (user.role === 'issuer') {
      /* Step 2A: Fetch approved issuer data from CouchDB via email

         Technical:
         Uses couchdb.getApprovedIssuer(user.email) to get fabricIdentity and orgName.

         Tropang Ex:
         Hinahanap sa DB kung approved issuer ka na at ano yung tamang Fabric identity
         na gagamitin sa blockchain.
      */
      const issuerDoc = await couchdb.getApprovedIssuer(user.email);

      if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or info missing.' });
      }

      identityName = issuerDoc.fabricIdentity;  // e.g. 'delasalleuniversity-admin'
      orgName = issuerDoc.orgName;             // e.g. 'De La Salle University'
    } else if (user.role === 'admin') {
      /* Step 2B: Use Org1 admin identity

         Technical:
         For now, uses 'admin' / 'Org1' as the Fabric identity/org for admin queries.

         Tropang Ex:
         Kapag admin, generic Org1 admin ang ginagamit para makapag-query sa blockchain.
         (Puwede pang i-refine later kung may hiwalay na admin org.)
      */
      identityName = 'chaincert-admin';
      orgName = 'Org1';
    } else {
      /* Step 2C: Block other roles

         Technical:
         Prevents non-issuer/non-admin roles (e.g., student/holder) from accessing this endpoint.

         Tropang Ex:
         Kung student ka lang, hindi ka puwedeng kumuha ng list ng issued credentials ng issuer dito.
      */
      return res.status(403).json({ success: false, error: 'Not authorized to view issued credentials.' });
    }

    /* Step 3: Connect to blockchain using chosen identity/org

       Technical:
       Calls getContractAndGateway(identityName, orgName) to obtain gateway + contract.

       Tropang Ex:
       Ito na yung actual connection step papunta sa Fabric network gamit yung napiling identity.
       Example: getContractAndGateway("delasalleuniversity-admin", "De La Salle University").
    */
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    /* Step 4: Determine issuer ID to query

       Technical:
       Chooses an identifier for the issuer that matches how issuerID is stored on-chain.
       For now:
       - issuer: uses user._id or user.email (same behavior as old code).
       - admin: placeholder 'ISSUER' (to be refined if admin wants to target a specific issuer).

       Tropang Ex:
       Kailangan natin ng “key” para sabihin sa chaincode: “bigay mo lahat ng issued credentials ni issuer X”.
    */
    const issuerIdToQuery = user.role === 'issuer' 
      ? user.id  // ✅ NEW - consistent with creation
      : 'ISSUER';


    /* Step 5: Query chaincode for ISSUED credentials only

       Technical:
       Calls contract.evaluateTransaction('Get_IssuerIssuedCredentials', issuerIdToQuery)
       which returns all non-template credentials for that issuer.

       Tropang Ex:
       Sa step na ’to, sumisigaw tayo sa chaincode ng:
       “Get_IssuerIssuedCredentials(issuerID)” → ibalik mo lahat ng credentials na na-issue na sa mga holders.
    */
    const resultBuffer = await contract.evaluateTransaction('Get_IssuerIssuedCredentials', issuerIdToQuery);
    const resultArray = JSON.parse(resultBuffer.toString());

    /* Step 6: Return standardized response

       Technical:
       Sends back success flag, list of credentials, count, and timestamp.

       Tropang Ex:
       Ibinabalik sa frontend yung list ng issued credentials + kung ilan sila + anong oras kinuha.
    */
    return res.json({
      success: true,
      credentials: resultArray,
      count: resultArray.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    /* Step 7: Handle unexpected errors

       Technical:
       Logs error and returns HTTP 500 with error message.

       Tropang Ex:
       Pag may sumabog sa blockchain o backend, dito siya papasok. Ibabalik na lang na may error.
    */
    console.error(`❌ Error (GET /api/credentials/issued): ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});
// ==========================================================================================================================================================================

// =========================================================================================================
// Issuer Credential Templates (Blockchain → templates only)
// =========================================================================================================

/*
  Endpoint: GET /api/credentials/templates

  Technical:
  Returns all TEMPLATE credentials (isTemplate: true, no holderID) for the current issuer/admin
  from the blockchain using the appropriate Fabric identity.

  Tropang Ex:
  Dito kinukuha yung list ng credential templates ng issuer (lahat ng diploma/certificate designs).
  - Kung issuer ka: sarili mong templates lang.
  - Kung admin ka: gumagamit ng admin identity para mag-query (config pa kung kaninong issuer).
*/
app.get('/api/credentials/templates', async (req, res) => {
  try {
    /* Step 1: Check if user is authenticated (JWT/session)

       Technical:
       Same auth check as issued endpoint; requires req.user to exist.

       Tropang Ex:
       Kailangan naka-login ka rin bago ka makakita ng templates.
    */
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    /* Step 2: Determine which Fabric identity to use (issuer vs admin)

       Technical:
       - Issuer: uses issuerDoc.fabricIdentity + issuerDoc.orgName (from CouchDB).
       - Admin: uses 'admin' / 'Org1'.
       - Others: forbidden.

       Tropang Ex:
       Pareho ng logic sa issued endpoint:
       - Issuer → sariling Fabric identity.
       - Admin → Org1 admin account.
    */
    let identityName, orgName;

    if (user.role === 'issuer') {
      /* Step 2A: Fetch approved issuer data from CouchDB via email */
      const issuerDoc = await couchdb.getApprovedIssuer(user.email);

      if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or info missing.' });
      }

      identityName = issuerDoc.fabricIdentity;
      orgName = issuerDoc.orgName;
    } else if (user.role === 'admin') {
      identityName = 'chaincert-admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({ success: false, error: 'Not authorized to view templates.' });
    }

    /* Step 3: Connect to blockchain using chosen identity/org */
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    /* Step 4: Determine issuer ID to query

       Technical:
       Same pattern as issued endpoint: uses user._id or user.email for issuer,
       and placeholder for admin.

       Tropang Ex:
       Ito yung “sino ang issuer na gusto nating kunan ng templates?”.
    */
    
    const issuerIdToQuery = user.role === 'issuer' 
      ? user.id  // ✅ NEW - consistent with creation
      : 'ISSUER';

    /* Step 5: Query chaincode for TEMPLATES only

       Technical:
       Calls contract.evaluateTransaction('Get_IssuerCredentialTemplates', issuerIdToQuery)
       which returns only records with isTemplate === true and no holderID.

       Tropang Ex:
       Sa step na ’to, humihingi tayo sa chaincode ng:
       “Get_IssuerCredentialTemplates(issuerID)” → ibalik mo lahat ng template niya (walang holder).
    */
    const resultBuffer = await contract.evaluateTransaction('Get_IssuerCredentialTemplates', issuerIdToQuery);
    const resultArray = JSON.parse(resultBuffer.toString());

    /* Step 6: Return standardized response

       Technical:
       Sends back success flag, template list, count, timestamp.

       Tropang Ex:
       Ibinabalik sa frontend yung list ng templates + ilan sila + anong oras kinuha.
    */
    return res.json({
      success: true,
      credentials: resultArray,
      count: resultArray.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    /* Step 7: Handle unexpected errors */
    console.error(`❌ Error (GET /api/credentials/templates): ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
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
      identityName = 'chaincert-admin';
      orgName = 'Org1';
    }
    /* Allow students to view credential history using chaincert-admin identity (read-only)
       Technical: Students can only read history, not submit transactions
       // - polo
    */
    else if (user.role === 'student' || user.role === 'user') {
      identityName = 'chaincert-admin';
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

    /* Step 4: Query blockchain for credential history using Calls chaincode function Get_CredentialTemplateOrIssuedCredentialHistory 

      Tropang Ex: Kinukuha lahat ng past versions at transactions ng isang credential.
      Example: creation → issue → update → revoke (if supported).
    */
    const result = await contract.evaluateTransaction('Get_CredentialTemplateOrIssuedCredentialHistory', req.params.id);
    
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
  Endpoint: GET /api/issuer/credentials/history

  Technical:
  Retrieves the complete audit trail of ALL credentials for the logged-in issuer.
  Delegates to issuerCredentialController.get_IssuerCredentialsHistory which handles:
    - Identity resolution (issuer's Fabric identity + org)
    - Blockchain query (Get_IssuerCredentialsHistory chaincode)
    - Flattening and sorting history entries
    - Optional filtering by credentialId

  Tropang Ex:
  Ito yung endpoint para makita ng issuer yung buong timeline ng lahat ng nangyari
  sa credentials niya — template creation, issuance, revocation, etc.
  Perfect for audit dashboard at blockchain transparency.

  Query Params:
  - credentialId (optional) → filter history to show only entries for that credential

  Response:
  {
    "success": true,
    "data": [ ...flattened history entries sorted by most recent... ],
    "count": 42,
    "isFiltered": false,
    "filter": null,
    "timestamp": "2026-02-03T17:10:00.000Z"
  }
*/
app.get('/api/issuer/credentials/history', (req, res) => {
  issuerCredentialController.get_IssuerCredentialsHistory(req, res, getContractAndGateway);
});

// ==========================================================================================================================================================================

// ==========================================================================================================================================================================

// ✅ VERIFY CREDENTIAL ENDPOINT (delegates to controller)
/*
  Endpoint: GET /api/credentials/:credentialId/verify

  Technical:
  - Thin route that forwards to credentialVerifyController.verifyCredential.
  Tropang Ex:
  - Si controller na ang bahala sa buong verification flow; si server dito taga‑pasa lang.
*/
app.get( '/api/credentials/:credentialId/verify', (req, res) => verifierController.verifyCredentialByID(req, res, getContractAndGateway));

// ==========================================================================================================================================================================

// ==========================================================================================================================================================================
//                                                                       POST Endpoints
// ==========================================================================================================================================================================


// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/issuer/credentials/create

  Technical: Delegates issuer credential creation logic to a controller, passing the blockchain gateway helper.
  Tropang Ex: Ito yung endpoint na tumatawag lang sa controller.
  Hindi dito ginagawa yung logic — dito lang siya “pinapasa” sa tamang file.

  Tropang explanation:
Parang receptionist lang siya. Tumatanggap ng request, tapos ituturo kung sino ang gagawa ng trabaho.
*/
// ✅ CORRECT
app.post('/api/issuer/credentials/create', (req, res) => {
  issuerCredentialController.Create_CredentialTemplate(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/credentials/:credentialId/issue

  Technical:
  Delegates credential issuance logic to issuerCredentialController.issueCredential.
*/
app.post('/api/credentials/:credentialId/issue', (req, res) => {
  issuerCredentialController.issue_CredentialToUser(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/credentials/:credentialId/revoke

  Technical:
  Delegates credential revocation logic to issuerCredentialController.revokeCredential.

  - Expects :credentialId to be the BLOCKCHAIN credential ID (e.g. "cred_1770...").
  - Controller is responsible for:
      1) Calling the chaincode function `RevokeCredential` via getContractAndGateway.
      2) Syncing revocation to CouchDB copies via couchDB_service.revokeCredential(blockchainId, issuerEmail).
*/
app.post('/api/credentials/:credentialId/revoke', (req, res) => {
  issuerCredentialController.revoke_Credential(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================

/* 
  Endpoint: POST /api/credentials/:credentialId/log-verification

  Technical:
  Delegates on-chain verification logging to verifierController.logVerificationEvent,
  passing the Fabric getContractAndGateway helper.

  Tropang Ex:
  Pagkatapos mag-Verify sa UI (may name/email), dito dadaan para magsulat ng
  verification log sa blockchain via LogVerification() chaincode function.
*/
app.post('/api/credentials/:credentialId/log-verification', (req, res) => {
  verifierController.logVerificationEvent(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================
// NEW: Verification logs (all)
app.get('/api/verification-logs', (req, res) =>
  verifierController.getAllVerificationLogs(req, res, getContractAndGateway)
);
// ==========================================================================================================================================================================

// NEW: Verification log by ID
app.get('/api/verification-logs/:logId', (req, res) =>
  verifierController.getVerificationLogById(req, res, getContractAndGateway)
);
// ==========================================================================================================================================================================

/*
  Endpoint: GET /api/admin/credentials/all

  Technical:
  Delegates the "global credentials view" logic to the adminDashboardController,
  which calls the CouchDB helper to aggregate all credentials across all issuers.
  Accepts optional query params:
    - issuerId: limit results to a specific issuer
    - type: 'issued' | 'templates' (or omitted for all)

  Tropang Ex:
  Ito yung endpoint na ginagamit ng Admin Dashboard para makuha
  lahat ng credentials (templates + issued) ng lahat ng issuers.
  Dito lang tumatanggap ng HTTP request — yung tunay na logic nasa controller/service.

  Tropang explanation:
  Parang receptionist lang din:
  - Tumatanggap ng GET request sa /api/admin/credentials/all
  - Sinasabi kay adminDashboardController: “Ikaw na bahala sa aggregation.”
*/
app.get('/api/admin/credentials/all', (req, res) => {
  adminDashboardController.getAllIssuerCredentialsAdminController(req, res);
});
// ==========================================================================================================================================================================

/*
  Endpoint: GET /api/admin/status-logs

  Technical:
  Returns blockchain audit logs for issuer/user status changes
  (disable/enable actions) via chaincode GetAllStatusLogs.
*/
app.get('/api/admin/status-logs', (req, res) => {
  authController.getAllStatusLogs(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/auth/disable-issuer/:issuerId

  Technical:
  - Admin-only action
  - Updates issuer status in CouchDB
  - Logs action to blockchain (LogIssuerStatusChange)
*/
app.get('/api/auth/disabled-issuers', (req, res) => {
  authController.getDisabledIssuers(req, res);
});
// ==========================================================================================================================================================================

app.post('/api/auth/disable-issuer/:issuerId', (req, res) => {
  authController.disableIssuer(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/auth/enable-issuer/:issuerId
*/
app.post('/api/auth/enable-issuer/:issuerId', (req, res) => {
  authController.enableIssuer(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/auth/disable-user/:userId
*/
app.post('/api/auth/disable-user/:userId', (req, res) => {
  authController.disableUser(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================

/*
  Endpoint: POST /api/auth/enable-user/:userId
*/
app.post('/api/auth/enable-user/:userId', (req, res) => {
  authController.enableUser(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================

// ✅ SDK routes for issuer decisions (blockchain-aware)
app.post('/api/approve-issuer/:issuerId', (req, res) => {
  authController.approveIssuer(req, res, getContractAndGateway);
});

// ==========================================================================================================================================================================

app.post('/api/reject-issuer/:issuerId', (req, res) => {
  authController.rejectIssuer(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================

app.get('/api/admin/issuer-decision-logs/:issuerEmail', (req, res) => {
  authController.getIssuerDecisionLogs(req, res, getContractAndGateway);
});
// ==========================================================================================================================================================================



module.exports = {
  getContractAndGateway
};

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ API running on :${PORT}`);
  console.log('✅ CouchDB databases selected');
  console.log('✅ Docker deployment endpoints ready');
});


setInterval(() => {}, 1000);
