// ==========================================================================================================================================================================
//                                                                       sdk-server-fixed.js
// ==========================================================================================================================================================================

const express = require('express');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const multer = require('multer');
const Docker = require('dockerode');
const nano = require('nano');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const upload = multer({ storage: multer.memoryStorage() });

const couchdb = require('./couchDB_service');

const issuerCredentialController = require('./controllers/issuerCredentialController');
const verifierController = require('./controllers/verifierController');
const adminDashboardController = require('./controllers/adminDashboardController');
const authController = require('./controllers/authController');

const app = express();

// ==========================================================================================================================================================================
// MIDDLEWARE SECTION - ORDER MATTERS!
// ==========================================================================================================================================================================

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
// DOCKER & DB INIT
// ==========================================================================================================================================================================

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const FABRIC_SAMPLES_PATH = '/home/kaitanz_/fabric-samples/fabric-samples';
const CORE_YAML_PATH = `${FABRIC_SAMPLES_PATH}/config/core.yaml`;

couchdb.initializeDatabases().catch(err => {
  console.error('⚠️  CouchDB init error:', err.message);
});

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

setTimeout(setupDatabaseIndexes, 2000);

// ==========================================================================================================================================================================
// FABRIC / BLOCKCHAIN HELPERS
// ==========================================================================================================================================================================

const walletPath = path.join(__dirname, 'wallet');

let cachedGateway = null;
let lastConnectionTime = 0;
const CONNECTION_CACHE_TTL = 5 * 60 * 1000;

async function getContractAndGateway(identityName, orgName) {
  console.log('\n[getContractAndGateway][DEBUG] called with:', { identityName, orgName });
  console.log('[getContractAndGateway][DEBUG] __dirname =', __dirname);
  console.log('[getContractAndGateway][DEBUG] cwd =', process.cwd());

  if (!identityName || !orgName) {
    throw new Error('identityName and orgName are required');
  }

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

  console.log('[getContractAndGateway][DEBUG] ccpPath =', ccpPath);

  if (!fs.existsSync(ccpPath)) {
    throw new Error(`Connection profile not found at: ${ccpPath}`);
  }

  const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
  const ccp = JSON.parse(ccpJSON);

  console.log('[getContractAndGateway][DEBUG] walletPath =', walletPath);

  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const identity = await wallet.get(identityName);
  if (!identity) throw new Error(`Identity ${identityName} not found`);

  const gateway = new Gateway();

  console.log('[getContractAndGateway][DEBUG] connecting gateway...');

  await gateway.connect(ccp, {
    wallet,
    identity: identityName,
    discovery: { enabled: true, asLocalhost: true }
  });

  const network = await gateway.getNetwork('chaincert-channel');
  const contract = network.getContract('chaincert');

  console.log('[getContractAndGateway][DEBUG] ✅ returning { gateway, contract }');
  console.log('[getContractAndGateway][DEBUG] gateway exists =', !!gateway);
  console.log('[getContractAndGateway][DEBUG] contract exists =', !!contract, '\n');

  cachedGateway = gateway;
  lastConnectionTime = Date.now();
  return { gateway, contract };
}

// Expose Fabric gateway helper to route handlers
app.locals.getContractAndGateway = getContractAndGateway;

// ==========================================================================================================================================================================
// ROUTE IMPORTS
// ==========================================================================================================================================================================

const systemRoutes = require('./routes/systemRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const issuerRoutes = require('./routes/issuerRoutes');
const credentialRoutes = require('./routes/credentialRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

// ==========================================================================================================================================================================
// ROUTE MOUNTING
// ==========================================================================================================================================================================

app.use('/api', systemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/issuer', issuerRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/verify', verificationRoutes);

// ==========================================================================================================================================================================
// HELPERS / SHUTDOWN
// ==========================================================================================================================================================================

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
// STARTUP HOOKS
// ==========================================================================================================================================================================

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