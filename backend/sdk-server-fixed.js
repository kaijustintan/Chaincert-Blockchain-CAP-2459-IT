// ==========================================================================================================================================================================
//                                                                       sdk-server-fixed.js
// ==========================================================================================================================================================================

require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first'); // E1: prefer IPv4 globally (WSL2 has no IPv6 egress → Gmail SMTP fails on AAAA)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const multer = require('multer');
const Docker = require('dockerode');
const nano = require('nano');

// ------------------------------------------------------------------------------------------------
// M3 (Phase 5 hardening): FAIL CLOSED on a missing JWT signing secret.
// Previously this fell back to a hardcoded 'dev_secret_key'. A signing key that lives in the
// source code means anyone who can read the repo can forge a valid token for ANY account
// (including admin) — total authentication bypass. We now refuse to boot without a real secret
// supplied via the environment (set JWT_SECRET in ~/chaincert-api/.env).
// ------------------------------------------------------------------------------------------------
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set.');
  console.error('   Refusing to start with an insecure default signing key.');
  console.error('   Add a long random JWT_SECRET to ~/chaincert-api/.env and restart.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const upload = multer({ storage: multer.memoryStorage() });

const couchdb = require('./couchDB_service');
const { sendServerError } = require('./securityHelpers');

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

// M6 (Phase 5 hardening): security response headers. This API serves JSON cross-origin to the SPA on
// :3000, so two helmet defaults are tuned to NOT break that flow:
//   - contentSecurityPolicy: false  — CSP governs HTML page resources; it belongs on the frontend host,
//     not on a JSON API, and helmet's default CSP would otherwise interfere.
//   - crossOriginResourcePolicy: cross-origin — lets the browser allow the :3000 SPA to read :4000 responses.
// Everything valuable stays ON: X-Frame-Options (clickjacking), X-Content-Type-Options: nosniff,
// Referrer-Policy, X-Powered-By removal, etc. HSTS is emitted but browsers ignore it over plain HTTP —
// it only takes effect in Tier 3 once HTTPS fronts the app.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
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
// M2 (Phase 5 hardening): CENTRALIZED AUTHORIZATION GUARDS
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// The middleware above only DECODES the token into req.user (or null). It never blocks anyone.
// These two guards are the gate. They are applied once at the router-mount points below so every
// route under a guarded prefix is protected in a single place (KB Z-2: centralized authorization —
// one fix applies everywhere, instead of copy-pasting a check into every handler and forgetting one).
//   requireAuth        — reject any request that has no valid token.
//   requireRole(role)  — reject any request whose token role doesn't match.
// ==========================================================================================================================================================================

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient privileges.' });
    }
    next();
  };
}

// ==========================================================================================================================================================================
// M5 (Phase 5 hardening): LIGHTWEIGHT IN-MEMORY RATE LIMITER
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Caps requests per client IP per time window on sensitive auth endpoints to blunt online
// password brute-force, credential stuffing, and OTP-email spam (KB A-7, P-5). In-memory and
// per-process is sufficient for the single-VM capstone deployment; a shared store (Redis) or the
// express-rate-limit library would be the upgrade path for a multi-instance production setup.
// A separate per-account OTP counter (in accountController.forgotPassword) complements this with
// a persisted, cross-restart limit tied to identity rather than IP.
// ==========================================================================================================================================================================

// Temporary testing escape hatch: set DISABLE_RATE_LIMIT=true in ~/chaincert-api/.env to turn OFF
// all rate limiting (handy when repeatedly testing wrong-password logins). MUST be unset / false
// for any demo or deployment — a loud warning is logged at startup whenever it is on.
const RATE_LIMIT_DISABLED = process.env.DISABLE_RATE_LIMIT === 'true';

function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Periodic sweep so the Map can't grow unbounded with unique IPs. unref() lets the process exit.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (now > entry.resetAt) hits.delete(ip);
    }
  }, windowMs);
  if (typeof sweep.unref === 'function') sweep.unref();

  return (req, res, next) => {
    if (RATE_LIMIT_DISABLED) return next(); // testing bypass — see DISABLE_RATE_LIMIT above
    const now = Date.now();
    const ip = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
    let entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests. Please try again later.'
      });
    }
    next();
  };
}

// 10 attempts per IP per 15 minutes on the sensitive auth routes (login / forgot / reset).
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts from this IP. Please wait a few minutes and try again.'
});

if (RATE_LIMIT_DISABLED) {
  console.warn('⚠️  ⚠️  RATE LIMITING IS DISABLED (DISABLE_RATE_LIMIT=true in .env). FOR TESTING ONLY — remove it before any demo or deployment.  ⚠️  ⚠️');
}

// M8 (Phase 5 hardening): same testing escape hatch for the password-strength policy.
if (process.env.DISABLE_PASSWORD_POLICY === 'true') {
  console.warn('⚠️  ⚠️  PASSWORD STRENGTH POLICY IS DISABLED (DISABLE_PASSWORD_POLICY=true in .env). FOR TESTING ONLY — remove it before any demo or deployment.  ⚠️  ⚠️');
}

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
const walletRoutes = require('./routes/walletRoutes');


// ==========================================================================================================================================================================
// ROUTE MOUNTING
// ==========================================================================================================================================================================

app.use('/api', systemRoutes);

// M5: rate-limit the sensitive auth endpoints. These run BEFORE the routers that ultimately
// handle the request, so excess attempts are rejected with 429 before any auth work happens.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/issuer/login', authLimiter);

app.use('/api/auth', authRoutes);

// M2: every /api/admin route now requires a valid token (closes anonymous access to admin data,
// e.g. the issuer-listing endpoints that previously had no auth at all). Fine-grained role checks
// (admin vs issuer-as-root-authority) are enforced inside adminRoutes / the controllers, because
// this router intentionally serves BOTH admin actions and issuer root-authority actions.
app.use('/api/admin', requireAuth, adminRoutes);

app.use('/api/issuer', issuerRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/verify', verificationRoutes);

// M2 + M1: wallet endpoints require authentication; per-handler ownership checks (M1) then ensure
// a logged-in user can only touch their OWN credentials/notifications.
app.use('/api/wallet', requireAuth, walletRoutes);

// M9 (Phase 5 hardening): global error safety-net. Controllers mostly use sendServerError directly,
// but anything thrown/next'd that reaches here returns a sanitized response (generic message +
// errorId) instead of leaking a stack trace to the client. Must be registered AFTER all routes.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  return sendServerError(res, err, 'UNHANDLED');
});

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
adminDashboardController.initIntegrityCron(getContractAndGateway); // Phase 5 M13 — daily 8 AM integrity check + admin alerts

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