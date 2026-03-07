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
// cron moved to adminDashboardController.js - poloconst 
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
const createSystemRoutes = require('./routes/systemRoutes');
const createCredentialApiRoutes = require('./routes/credentialApiRoutes');
const createIssuerApiRoutes = require('./routes/issuerApiRoutes');
const createVerificationApiRoutes = require('./routes/verificationApiRoutes');
const createAdminApiRoutes = require('./routes/adminApiRoutes');




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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
const authRoutes = require('../src/routes/authRoutes');
const adminRoutes = require('../src/routes/adminRoutes');
const issuerRoutes = require('../src/routes/issuerRoutes');
const credentialRoutes = require('../src/routes/credentialRoutes');
const verificationRoutes = require('../src/routes/verificationRoutes');

app.use('/api/auth', authRoutes);

// Transitional mounts: keep /api/auth route compatibility while introducing domain route groups.
app.use('/api/admin', adminRoutes);
app.use('/api/issuer', issuerRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/verify', verificationRoutes);

app.use('/api/auth', adminRoutes);
app.use('/api/auth', issuerRoutes);
app.use('/api/auth', credentialRoutes);
app.use('/api/auth', verificationRoutes);

app.use('/api', createSystemRoutes());

app.use('/api', createCredentialApiRoutes({
  couchdb,
  nano,
  getContractAndGateway,
  issuerCredentialController,
  verifierController,
}));

app.use('/api', createIssuerApiRoutes({
  getContractAndGateway,
  issuerCredentialController,
}));

app.use('/api', createVerificationApiRoutes({
  getContractAndGateway,
  verifierController,
}));

app.use('/api', createAdminApiRoutes({
  couchdb,
  getContractAndGateway,
  adminDashboardController,
  authController,
}));
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

// Initialize recurring expiry checks on startup.
adminDashboardController.initExpiryCron(getContractAndGateway);

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
