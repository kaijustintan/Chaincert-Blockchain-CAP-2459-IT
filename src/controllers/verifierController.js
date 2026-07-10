// ==========================================================================================================================================================================
//                                                               verifierController.js 
// ==========================================================================================================================================================================

/*
  verifierController.js

  Technical:
  Centralizes all credential verification logic for the verifier module, using CouchDB as the primary data source
  (admin wallet DB: wallet_user_credentials) with optional blockchain VerifyCredential() cross-check.

  Tropang Ex:
  Ito yung “utak” ng verification feature. Kapag may nag-input ng credential ID para i-check kung legit, dito napupunta yung trabaho:
  - hahanapin sa CouchDB
  - kukunin status (active, revoked, expired)
  - optionally magtatanong sa blockchain VerifyCredential()
  - magbabalik ng malinaw na verification result.

  NOTE:
  - CouchDB is still the fast path.
  - Blockchain verify is added mainly for end-to-end testing and high-trust checks.
*/

const nano = require('nano');
const jwt = require('jsonwebtoken');                  // V1: proven-email token
const mailerService = require('../mailerService');    // V1: OTP email
const couchdbService = require('../couchDB_service'); // for future issuer/admin lookups if needed

// couchDB connection where wallet_user_credentials is
const COUCHDB_URL = 'http://admin:adminpw@localhost:5985';

// End-of-day-Manila expiry (mirrors chaincode VerifyCredential + the frontend isEffectivelyExpired):
// a bare "YYYY-MM-DD" expiryDate is valid THROUGH 23:59:59.999 of that day in Asia/Manila (+08:00).
// The old naive `new Date(expiryDate) < now` treated a same-day-expiry credential as already expired
// from 08:00 Manila, flipping a still-valid credential to EXPIRED on the CouchDB-fallback path.
function isExpiredManila(expiryDate) {
  if (!expiryDate || String(expiryDate).trim() === '') return false;
  const datePart = String(expiryDate).slice(0, 10);
  const endOfDayManila = Date.parse(`${datePart}T23:59:59.999+08:00`);
  if (Number.isNaN(endOfDayManila)) return false;
  return Date.now() > endOfDayManila;
}

// ==========================================================================================================================================================================
// V1: VERIFIER EMAIL OTP (prove email ownership once per window before a verification is LOGGED)
// ==========================================================================================================================================================================
/*
  In-memory transient OTP store, keyed by lowercased email → { otp, expiresAt, attempts, windowStart }.
  Single-instance capstone scope: not persisted on purpose (no DB schema change). OTPs are short-lived,
  so a server restart just forces a re-request. On successful OTP confirm we issue a short-lived JWT
  ('verifier_email_proof') that the verify-LOG endpoint requires — so the logged verifier email is
  server-PROVEN, not self-reported. The credential VERIFY (read) endpoint stays public/unchanged.
*/
const verifierOtpStore = new Map();
const VERIFIER_OTP_TTL_MS = 10 * 60 * 1000;     // code valid 10 min
const VERIFIER_OTP_MAX = 3;                      // max sends per window
const VERIFIER_OTP_WINDOW_MS = 10 * 60 * 1000;   // rate-limit window
const VERIFIER_TOKEN_TTL = '2h';                 // proven-email token = the "once per window" lifetime
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// V1: request an email OTP. Synchronous send so a failure surfaces (verifier waits for the code).
const requestVerifierOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email is required.' });
    }
    const now = Date.now();
    const existing = verifierOtpStore.get(email);
    let attempts = 1, windowStart = now;
    if (existing && now - existing.windowStart < VERIFIER_OTP_WINDOW_MS) {
      if (existing.attempts >= VERIFIER_OTP_MAX) {
        return res.status(429).json({ success: false, message: 'Too many code requests. Please wait a few minutes and try again.' });
      }
      attempts = existing.attempts + 1;
      windowStart = existing.windowStart;
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    verifierOtpStore.set(email, { otp, expiresAt: now + VERIFIER_OTP_TTL_MS, attempts, windowStart });

    try {
      await mailerService.sendMail({
        to: email,
        realRecipient: true, // a verifier is a real person — deliver to their inbox
        subject: 'CHAINCERT - Verification Code to Verify',
        html: mailerService.renderOtpEmail({
          heading: 'Verify your email',
          intro: 'Enter this code in ChainCert to confirm your email before verifying credentials.',
          otp,
          note: 'This code expires in 10 minutes. If you did not request it, you can ignore this email.'
        }),
        text: `Your ChainCert verification code is: ${otp}\nIt expires in 10 minutes.`
      });
    } catch (mailErr) {
      console.error('[VERIFIER OTP] send failed:', mailErr.message);
      return res.status(502).json({ success: false, message: 'Could not send the code. Check your email and try again.' });
    }
    return res.status(200).json({ success: true, message: 'Verification code sent.' });
  } catch (e) {
    console.error('[VERIFIER OTP] request error:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to send code.' });
  }
};

// V1: confirm the OTP → issue a short-lived proven-email token (the "window").
const confirmVerifierOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || '').trim();
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and code are required.' });
    }
    const entry = verifierOtpStore.get(email);
    if (!entry || entry.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }
    if (Date.now() > entry.expiresAt) {
      verifierOtpStore.delete(email);
      return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
    }
    verifierOtpStore.delete(email); // single-use
    const token = jwt.sign(
      { verifierEmail: email, purpose: 'verifier_email_proof' },
      process.env.JWT_SECRET,
      { expiresIn: VERIFIER_TOKEN_TTL }
    );
    return res.status(200).json({ success: true, token, email });
  } catch (e) {
    console.error('[VERIFIER OTP] confirm error:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to confirm code.' });
  }
};

/**
 * Helper: normalize credential ID to user_cred_<cleanId> (CouchDB convention)
 */
function normalizeCredentialId(credentialId) {
  const cleanId = credentialId.replace(/^user_cred_/, '');
  return `user_cred_${cleanId}`;
}

/**
 * Function Name: Verify_Credential
 *
 * Technical:
 * Verifies a credential by its ID using:
 *  - Step 1: CouchDB (admin wallet_user_credentials) as primary source.
 *  - Step 2: Optional blockchain VerifyCredential() cross-check using a generic Org1 admin identity.
 *
 * Validation rules on the CouchDB side mirror the chaincode VerifyCredential logic:
 *  - Not found           -> verified false, isValid false
 *  - status === 'revoked' -> invalid
 *  - expiryDate in past   -> invalid
 *  - status not in ['active','issued'] -> invalid
 *
 * Expected req.params:
 * {
 *   credentialId: "user_cred_12345" // or similar
 * }
 *
 * Expected extra param injected from router:
 *   getContractAndGateway(identityName, orgName) => { gateway, contract }
 */
const Verify_Credential = async (req, res, getContractAndGateway) => {
  try {
    const { credentialId } = req.params;

    if (!credentialId) {
      return res.status(400).json({
        success: false,
        message: 'Credential ID is required',
      });
    }

    let mainPayload = null;
    let finalIsValid = false;
    let finalReason = 'Credential not found';
    let sourceUsed = 'none';
    let blockchainError = null;

    // ✅ STEP 1: Try BLOCKCHAIN FIRST (trust anchor)
    if (getContractAndGateway) {
      try {
        const identityName = 'admin';
        const orgName = 'Org1';
        const { gateway, contract } = await getContractAndGateway(identityName, orgName);
        const bcResultBuffer = await contract.evaluateTransaction('VerifyCredential', credentialId);
        const bcResult = JSON.parse(bcResultBuffer.toString());
        await gateway.disconnect();

        if (bcResult.valid !== undefined) {
          // Blockchain returned a definitive answer
          const c = bcResult.credential || {};
          const now = new Date();
          let chainStatus = c.status || '';
          if (!chainStatus || String(chainStatus).toLowerCase() === 'unknown') {
            if (bcResult.valid) {
              chainStatus = 'active';
            } else {
              const reasonLower = (bcResult.reason || '').toLowerCase();
              if (reasonLower.includes('revoked')) chainStatus = 'revoked';
              else if (reasonLower.includes('expired')) chainStatus = 'expired';
              else chainStatus = 'invalid';
            }
          }
          chainStatus = String(chainStatus).toLowerCase();
          const chainIsRevoked = chainStatus === 'revoked' || (!bcResult.valid && (bcResult.reason || '').toLowerCase().includes('revoked'));
          const chainIsExpired = c.expiryDate ? isExpiredManila(c.expiryDate) : (!bcResult.valid && (bcResult.reason || '').toLowerCase().includes('expired'));

          mainPayload = {
            credentialID: credentialId,
            credentialType: c.credentialType || undefined,
            credentialName: c.credentialName || undefined,
            issuerID: c.issuerID || undefined,
            issuerName: c.issuerID || c.issuerName || undefined,
            holderID: c.holderID || undefined,
            status: chainStatus,
            isValid: bcResult.valid,
            isRevoked: chainIsRevoked,
            isExpired: chainIsExpired,
            expiryDate: c.expiryDate || undefined,
            verifiedAt: new Date().toISOString(),
            source: 'blockchain',
          };
          mainPayload.status = String(mainPayload.status || 'unknown').toLowerCase();
          finalIsValid = bcResult.valid;
          finalReason = bcResult.reason || (bcResult.valid ? 'Credential is valid (blockchain-verified)' : 'Credential is invalid (blockchain)');
          sourceUsed = 'blockchain';
        }
      } catch (bcErr) {
        console.error('[VERIFY] Blockchain VerifyCredential failed:', bcErr.message);
        blockchainError = bcErr.message;
        // Fall through to CouchDB
      }
    }

    if (mainPayload) {
      try {
        const searchId = normalizeCredentialId(credentialId);
        const adminCouch = nano(COUCHDB_URL);
        const userWalletDb = adminCouch.use('wallet_user_credentials');
        const couchResult = await userWalletDb.find({
          selector: { _id: searchId },
          limit: 1,
        });

        if (couchResult.docs && couchResult.docs.length > 0) {
          const couchCred = couchResult.docs[0];
          mainPayload.credentialName = mainPayload.credentialName || couchCred.credentialName || undefined;
          mainPayload.credentialType = mainPayload.credentialType || couchCred.credentialType || undefined;
          mainPayload.issuerName = couchCred.issuerName || mainPayload.issuerName || undefined;
          mainPayload.holderName = couchCred.holderName || couchCred.holderID || mainPayload.holderID || undefined;
          mainPayload.holderID = mainPayload.holderID || couchCred.holderID || undefined;
          mainPayload.badgeImage = couchCred.badgeImage || undefined;
          mainPayload.skills = couchCred.skills || [];
          mainPayload.description = couchCred.description || undefined;
          mainPayload.savedToUserWalletAt = couchCred.savedToUserWalletAt || undefined;
          // V-06: surface the issuer's revocation reason to the verifier. The reason
          // the issuer typed at revoke time is mirrored onto the wallet doc as
          // rejectionReason (couchDB_service.Revoke_Credential_DB). VerifyCredential
          // on-chain only returns a generic 'Credential has been revoked' string, so
          // this CouchDB field is the only source of the specific reason text.
          mainPayload.revocationReason = couchCred.rejectionReason || undefined;
        }

        if (mainPayload.holderID && !mainPayload.holderName) {
          try {
            const holderUser = await couchdbService.getUser(mainPayload.holderID);
            if (holderUser) {
              // VERIFY2: never fall back to the holder's email or raw ID — that would leak
              // PII to an unauthenticated verifier. Use a neutral placeholder instead.
              mainPayload.holderName = holderUser.username || holderUser.fullName || holderUser.name || 'Credential Holder';
            }
          } catch (e) { /* non-critical */ }
        }

        const issuerLookupId = mainPayload.issuerID || mainPayload.issuerName;
        if (issuerLookupId && typeof issuerLookupId === 'string' && issuerLookupId.startsWith('issuer_')) {
          try {
            const issuerDoc = await couchdbService.getUser(issuerLookupId);
            if (issuerDoc) {
              mainPayload.issuerName = issuerDoc.orgName || issuerDoc.contactName || issuerDoc.username || mainPayload.issuerName;
            }
          } catch (e) { /* non-critical */ }
        }
      } catch (enrichErr) {
        console.warn('[VERIFY] CouchDB enrichment failed (non-fatal):', enrichErr.message);
      }
    }

    // ✅ STEP 2: FALLBACK to CouchDB if blockchain didn't provide an answer
    if (!mainPayload) {
      const searchId = normalizeCredentialId(credentialId);
      const adminCouch = nano(COUCHDB_URL);
      const userWalletDb = adminCouch.use('wallet_user_credentials');

      let couchResult;
      try {
        couchResult = await userWalletDb.find({
          selector: { _id: searchId },
          limit: 1,
        });
      } catch (couchErr) {
        console.log('[VERIFY] CouchDB query error:', couchErr.message);
        couchResult = { docs: [] };
      }

      if (couchResult.docs && couchResult.docs.length > 0) {
        const credential = couchResult.docs[0];
        const now = new Date();
        let status = credential.status || '';
        if (!status || String(status).toLowerCase() === 'unknown') {
          if (credential.isRevoked === true || credential.revoked === true) status = 'revoked';
          else if (credential.expiryDate && isExpiredManila(credential.expiryDate)) status = 'expired';
          else if (credential.blockchainId || credential._id) status = 'active';
          else status = 'invalid';
        }
        status = String(status).toLowerCase();
        const isRevoked = status === 'revoked' || credential.isRevoked === true || credential.revoked === true;
        const isExpired = credential.expiryDate ? isExpiredManila(credential.expiryDate) : false;
        const isStatusValid = status === 'active' || status === 'issued';
        const isValid = !isRevoked && !isExpired && isStatusValid;

        let reason;
        if (isRevoked) reason = 'Credential has been revoked';
        else if (isExpired) reason = 'Credential has expired';
        else if (!isStatusValid) reason = `Credential is not in a valid status (${status})`;
        else reason = 'Credential is valid (CouchDB fallback — blockchain unavailable)';

        mainPayload = {
          credentialID: credentialId,
          credentialType: credential.credentialType,
          credentialName: credential.credentialName,
          issuerName: credential.issuerName || 'Unknown',
          holderID: credential.holderID,
          status,
          isValid,
          isRevoked,
          isExpired,
          expiryDate: credential.expiryDate,
          verifiedAt: new Date().toISOString(),
          source: 'couchdb_fallback',
          // V-06: same revocation-reason surfacing on the CouchDB-only fallback path.
          revocationReason: credential.rejectionReason || undefined,
        };
        mainPayload.status = String(mainPayload.status || 'unknown').toLowerCase();
        finalIsValid = isValid;
        finalReason = reason;
        sourceUsed = 'couchdb_fallback';
      }
    }

    // ✅ STEP 3: Return response
    if (!mainPayload) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Credential not found',
        credentialID: credentialId,
        verifiedAt: new Date().toISOString(),
        sources: { blockchain: sourceUsed === 'blockchain', couchDB: sourceUsed === 'couchdb_fallback', blockchainError },
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      credentialID: mainPayload.credentialID,
      credentialType: mainPayload.credentialType,
      credentialName: mainPayload.credentialName,
      issuerName: mainPayload.issuerName,
      // VERIFY2: holderID (internal user id) intentionally NOT returned to verifiers.
      holderName: mainPayload.holderName || undefined,
      badgeImage: mainPayload.badgeImage || undefined,
      skills: mainPayload.skills || [],
      description: mainPayload.description || undefined,
      status: mainPayload.status,
      isValid: finalIsValid,
      isRevoked: mainPayload.isRevoked,
      isExpired: mainPayload.isExpired,
      expiryDate: mainPayload.expiryDate,
      reason: finalReason,
      // V-06: only expose the specific revocation reason when the credential is
      // actually revoked (it is meaningless / unset otherwise).
      revocationReason: mainPayload.isRevoked ? (mainPayload.revocationReason || undefined) : undefined,
      sources: {
        blockchain: sourceUsed === 'blockchain',
        couchDB: sourceUsed === 'couchdb_fallback',
        blockchainError,
        primarySource: sourceUsed,
      },
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[VERIFY ERROR]', error.message);

    return res.status(500).json({
      success: false,
      verified: false,
      message: 'Error verifying credential',
      credentialID: req.params.credentialId,
      verifiedAt: new Date().toISOString(),
    });
  }
};

/**
 * Function Name: getVerificationStats
 *
 * Technical:
 * Aggregates basic statistics over all credentials stored in wallet_user_credentials.
 * - total: all credentials
 * - active: status === 'issued' or 'active'
 * - revoked: status === 'revoked' or isRevoked === true
 * - expired: expiryDate < now
 * - pending: status === 'pending' or 'pending_blockchain'
 *
 * Tropang Ex:
 * Ito yung pang-dashboard na summary. Parang "overview card" na nagsasabi:
 * - Ilan na lahat ng credentials
 * - Ilan ang active
 * - Ilan ang revoked
 * - Ilan ang expired
 * - Ilan ang pending/di pa fully synced sa blockchain
 */
const getVerificationStats = async (req, res) => {
  try {
    const adminCouch = nano(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    const result = await userWalletDb.find({
      selector: {
        _id: { $gt: null },
      },
    });

    const allCredentials = result.docs || [];
    const now = new Date();

    const stats = {
      total: allCredentials.length,
      active: allCredentials.filter(
        (c) => c.status === 'issued' || c.status === 'active',
      ).length,
      revoked: allCredentials.filter(
        (c) => c.status === 'revoked' || c.isRevoked,
      ).length,
      expired: allCredentials.filter(
        (c) => c.expiryDate && isExpiredManila(c.expiryDate),
      ).length,
      pending: allCredentials.filter(
        (c) => c.status === 'pending' || c.status === 'pending_blockchain',
      ).length,
    };

    return res.status(200).json({
      success: true,
      stats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[VERIFY ERROR]', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error fetching verification statistics',
      error: error.message,
    });
  }
};

/**
 * Function Name: logVerificationEvent
 *
 * Technical:
 * Creates an on-chain verification log entry by calling the chaincode
 * function LogVerification(ctx, credentialId, verifierName, verifierEmail, resultJson).
 *
 * PLUS: Best-effort lookup of holderID + holderName from CouchDB (wallet_user_credentials + users),
 * then i-aattach sa HTTP response (off-chain enrichment).
 *
 * Expected req.params:
 *   { credentialId: "<BLOCKCHAIN_CREDENTIAL_ID>" }
 *
 * Expected req.body:
 *   {
 *     verifierName: "Juan Dela Cruz",
 *     verifierEmail: "juan@example.com",
 *     verifyResult: {
 *       valid: true,
 *       reason: "Credential is valid on-chain"
 *     }
 *   }
 *
 * Expected extra param from router:
 *   getContractAndGateway(identityName, orgName) => { gateway, contract }
 */
const logVerificationEvent = async (req, res, getContractAndGateway) => {
  try {
    const { credentialId } = req.params;
    const { verifierName, verifierEmail, verifyResult, name, email, resultJson } = req.body || {};

    // Step 0: Basic validation
    if (!credentialId) {
      return res.status(400).json({
        success: false,
        message: 'credentialId (path param) is required',
      });
    }

    // V1: require a PROVEN-email token (issued by confirm-otp). The logged verifier email
    // comes from the token, never from the client body — so it can't be spoofed. The
    // credential VERIFY (read) endpoint stays public; only LOGGING requires proof.
    // Prefer the explicit body token (the axios interceptor may put a logged-in user's
    // ACCOUNT token in the Authorization header, which must not shadow the verifier proof).
    const authHeader = req.headers.authorization || '';
    const bearer = String(req.body?.verifierToken || '') ||
      (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');
    let provenEmail = '';
    try {
      const decoded = jwt.verify(bearer, process.env.JWT_SECRET);
      if (decoded?.purpose !== 'verifier_email_proof' || !decoded?.verifierEmail) {
        throw new Error('wrong token purpose');
      }
      provenEmail = String(decoded.verifierEmail).toLowerCase();
    } catch (tokErr) {
      return res.status(401).json({
        success: false,
        message: 'Email verification required. Please confirm your email with the code before verifying.'
      });
    }

    const resolvedName = verifierName || name || '';
    const resolvedEmail = provenEmail; // V1: proven, not self-reported

    // --- Try to resolve holderID + holderName from CouchDB ---
    let holderID = null;
    let holderName = null;

    try {
      const adminCouch = nano(COUCHDB_URL);
      const userWalletDb = adminCouch.use('wallet_user_credentials');

      // reuse same normalization pattern as Verify_Credential
      const normalizedId = normalizeCredentialId(credentialId);

      const result = await userWalletDb.find({
        selector: { _id: normalizedId },
        limit: 1,
      });

      if (result.docs && result.docs.length > 0) {
        const credDoc = result.docs[0];
        holderID = credDoc.holderID || null;

        if (holderID) {
          try {
            // getUser() already chooses usersDb vs issuersDb based on ID prefix
            const user = await couchdbService.getUser(holderID);

            // users doc (see Fauxton) has `fullName`, plus these fallbacks.
            // getUser returns null for holders not in the users/issuers DB — guard it
            // so the enrichment stays best-effort instead of throwing on null.fullName.
            holderName = user
              ? (user.fullName ||
                 user.username ||
                 user.name ||
                 user.displayName ||
                 user.email ||
                 null)
              : null;
          } catch (userErr) {
            console.warn(
              '[VERIFY-LOG] Failed to resolve holder user by holderID:',
              userErr.message
            );
          }
        }
      }
    } catch (resolveErr) {
      console.warn(
        '[VERIFY-LOG] Failed to resolve holder info from CouchDB:',
        resolveErr.message
      );
    }
    // --- END holder resolve ---

    // Take result from previous /verify call (backend/chaincode output)
    const resultSummary = verifyResult || {};
    const serializedResultJson = resultJson || JSON.stringify({
      valid: !!(resultSummary.valid ?? resultSummary.isValid),
      reason: resultSummary.reason || '',
      status: resultSummary.status || '',
      source: resultSummary.source || '',
    });

    // Step 1: Choose Fabric identity/org for logging
    // You can later switch this to DLSU identity if you want.
    const identityName = 'admin';
    const orgName = 'Org1';

    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    // Step 2: Submit LogVerification transaction
    const logBuffer = await contract.submitTransaction(
      'LogVerification',
      credentialId,
      resolvedName,
      resolvedEmail,
      serializedResultJson
    );

    await gateway.disconnect();

    const log = JSON.parse(logBuffer.toString());
    console.log('[VERIFY-LOG] On-chain verification log created:', log.id);

    // Attach holderName/holderID in HTTP response (off-chain enrichment only)
    const enrichedLog = {
      ...log,
      holderID: log.holderID || holderID,
      holderName: holderName || null,
    };

    return res.status(201).json({
      success: true,
      message: 'Verification log created on-chain',
      log: enrichedLog,
    });
  } catch (error) {
    console.error('[VERIFY-LOG ERROR]', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error creating verification log',
      error: error.message,
      credentialID: req.params.credentialId,
    });
  }
};

// ============================================================================
// VERIFICATION LOGS: Blockchain-sourced audit
// ============================================================================

/*
  Function Name: getAllVerificationLogs

  Technical:
  - Dynamically chooses which Org1 Fabric identity to use:
    - If called by a logged-in admin user (admin dashboard):
      uses 'chaincert-admin' (public admin identity for admin accounts).
    - Otherwise (verifier dashboard / CLI / no user context):
      uses 'admin' (generic Org1 verifier/non-user Fabric identity).
  - Uses getContractAndGateway to connect to Fabric.
  - Calls chaincode function GetAllVerificationLogs (evaluateTransaction).
  - THEN best-effort enriches each log with holderName from CouchDB users DB
    using holderID (via couchdbService.getUser).
  - Returns array of enriched verification log objects.

  Tropang Ex:
  Ito yung pang-dashboard na listahan ng LAHAT ng verification attempts
  na na-log sa blockchain (UI + CLI), good for audit view, PLUS may
  Holder Name na galing sa users DB kung ma-resolve. Kapag galing sa
  admin dashboard, gagamit ng chaincert-admin identity; kapag galing
  sa verifier side na walang user context, generic admin identity lang.
*/
const getAllVerificationLogs = async (req, res, getContractAndGateway) => {
  try {
    // Step 1: Resolve identity based on context
    // - Admin dashboard (logged-in admin user) -> chaincert-admin
    // - Verifier dashboard / CLI / no user     -> admin
    let identityName;
    const orgName = 'Org1';

    if (req.user && req.user.role === 'admin') {
      identityName = 'chaincert-admin';
    } else {
      identityName = 'admin';
    }

    // Step 2: Connect to blockchain
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    // Step 3: Call chaincode GetAllVerificationLogs (read-only)
    const resultBuffer = await contract.evaluateTransaction('GetAllVerificationLogs');
    const logs = JSON.parse(resultBuffer.toString());

    await gateway.disconnect();

    // Step 4: Best-effort enrichment from CouchDB users DB
    // Para mabigyan ng Holder Name based on holderID.
    const enrichedLogs = await Promise.all(
      (logs || []).map(async (log) => {
        let holderName = null;

        try {
          const holderID = log.holderID;

          if (holderID) {
            // getUser() already chooses usersDb vs issuersDb based on ID prefix
            const user = await couchdbService.getUser(holderID);

            // getUser returns null for holders not in the users/issuers DB — guard it
            // so the enrichment stays best-effort instead of throwing on null.fullName
            // (this loop runs for every log, so an unguarded null spams the console).
            holderName = user
              ? (user.fullName ||
                 user.username ||
                 user.name ||
                 user.displayName ||
                 user.email ||
                 null)
              : null;
          }
        } catch (e) {
          console.warn(
            '[VERIFY-LOGS] Failed to enrich holderName for log',
            log.id,
            e.message
          );
        }

        return {
          ...log,
          holderName,
        };
      })
    );

    // Step 5: Return enriched logs
    return res.status(200).json({
      success: true,
      logs: enrichedLogs,
      count: enrichedLogs.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('VERIFY LOGS ERROR (all):', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error fetching verification logs from blockchain',
      error: error.message,
    });
  }
};

/*
  Function Name: getVerificationLogById

  Technical:
  - Uses getContractAndGateway to connect as Org1 admin.
  - Calls chaincode function GetVerificationLogById with a specific logId.
  - Returns the single log object if found.

  Tropang Ex:
  Kapag may pinili kang specific log sa UI (e.g. vlog_123...),
  dito makukuha yung buong detalye niya galing blockchain.
*/
const getVerificationLogById = async (req, res, getContractAndGateway) => {
  try {
    const logId = req.params.logId;
    if (!logId) {
      return res.status(400).json({
        success: false,
        message: 'logId is required',
      });
    }

    const identityName = 'admin';
    const orgName = 'Org1';

    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    const resultBuffer = await contract.evaluateTransaction(
      'GetVerificationLogById',
      logId
    );
    const log = JSON.parse(resultBuffer.toString());

    await gateway.disconnect();

    return res.status(200).json({
      success: true,
      log,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('VERIFY LOGS ERROR (byId):', error.message);

    // 404-style response if chaincode throws "does not exist"
    if (error.message && error.message.includes('does not exist')) {
      return res.status(404).json({
        success: false,
        message: 'Verification log not found on blockchain',
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error fetching verification log from blockchain',
      error: error.message,
    });
  }
};


/* Ito yung pinapagamit natin sa router. Kapag may tumawag ng /verify o stats endpoint, dito rin babagsak. */
module.exports = {
  Verify_Credential,
  getVerificationStats,
  logVerificationEvent,
  getAllVerificationLogs,
  getVerificationLogById,
  requestVerifierOtp,   // V1
  confirmVerifierOtp,   // V1
};
