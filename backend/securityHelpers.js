// securityHelpers.js
/*
  FILE: securityHelpers.js
  LAYMAN (Tropang Ex): Ito yung "security toolbox" ng backend — tatlong gamit na pinagsama sa
    isang lugar para isa lang ang dapat bantayan/i-audit:
      (1) Password checker — pinipigilan ang mahihinang password tulad ng "123456".
      (2) File checker — tinitingnan kung ang TOTOONG laman ng in-upload na file ay tugma sa
          sinasabi nito (para hindi maipuslit ang nakatagong/disguised na file).
      (3) Safe error responder — kapag may pumalpak, full detail sa server logs lang; generic na
          mensahe lang ang nakikita ng user, para hindi maleak ang internals natin sa attacker.
      (4) Authorization guards — ang mga "bouncer" na nagdedesisyon kung sino ang papasok sa
          bawat route. Dati nasa loob sila ng sdk-server-fixed.js kaya hindi sila maabot ng
          mga route file; dinala sila rito para iisang kopya na lang ang totoo.
  TECHNICAL: Shared, dependency-light helper module (Phase 5 Tier 2). Required by controllers as
    '../securityHelpers'. Deploys to ~/chaincert-api/securityHelpers.js (same Windows→Ubuntu pattern
    as mailerService.js). No external dependencies — magic-number checks are hand-rolled.

    The guards live HERE, not in a new backend/authMiddleware.js, on purpose: deploy-sync.sh copies
    backend files BY EXPLICIT NAME, and this file is already in that list. A new module would need a
    new cp line, and commit 472b50f records exactly what happens when that step is missed —
    MODULE_NOT_FOUND at boot and a PM2 crash-loop. Adding to an already-synced file is zero deploy risk.
  OUTLINE:
    PASSWORD
      - validatePasswordStrength(password)         -> { ok, message }
    FILE UPLOAD
      - detectFileType(buffer)                      -> 'png' | 'jpg' | 'pdf' | null
      - validateUploadedFile(buffer, allowedTypes)  -> { ok, type, message }
    ERROR
      - sendServerError(res, error, tag)           -> Express 500 (generic message + errorId)
    RATE LIMITING
      - RATE_LIMIT_DISABLED                         -> testing bypass flag (DISABLE_RATE_LIMIT)
      - createRateLimiter({windowMs,max,message})   -> per-IP Express middleware
    OTP
      - OTP_MAX_FAILURES                            -> wrong guesses before a code is burned
      - generateOtp()                               -> CSPRNG 6-digit string
      - otpEquals(a, b)                             -> constant-time compare
    AUTHORIZATION GUARDS
      - requireAuth(req,res,next)                   -> 401 if no valid token
      - requireRole(role)                           -> middleware; 401 no token / 403 wrong role
      - requireAnyRole(...roles)                    -> middleware; allows any one of several roles
      - requireAdmin                                -> requireRole('admin')
      - requireIssuer                               -> requireRole('issuer')
*/

const crypto = require('crypto');

// ==========================================================================================
// PASSWORD STRENGTH  (M8)
// ==========================================================================================

const MIN_PASSWORD_LENGTH = 10;

// Small block-list of the most common/guessable passwords. Length is the primary defense
// (a long passphrase is exponentially harder to crack); this list just rejects the obvious ones.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'passw0rd', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'qwertyuiop', 'abc123', 'abcd1234', 'iloveyou', 'admin', 'admin123',
  'letmein', 'welcome', 'welcome1', 'monkey', 'dragon', '111111', '000000', 'chaincert',
  'chaincert1', 'changeme'
]);

/*
  Function Name: validatePasswordStrength

  LAYMAN (Tropang Ex): Tinitignan kung okay yung gustong gawing password. Kapag masyadong maikli o
  pangkaraniwan, tatanggihan. Pwede ring i-OFF habang nagte-test (DISABLE_PASSWORD_POLICY=true).

  TECHNICAL: Length-first policy (>= MIN_PASSWORD_LENGTH) plus a common-password block-list.
  Returns { ok, message }. Honors the DISABLE_PASSWORD_POLICY env escape hatch (returns ok=true).

  PARAMS:
  - password — the candidate plaintext password.

  RETURNS:
  { ok: boolean, message: string } — message is '' when ok.

  EXAMPLE
    validatePasswordStrength('123456')   -> { ok: false, message: 'Password must be at least 10 ...' }
    validatePasswordStrength('correct-horse-battery') -> { ok: true, message: '' }
*/
function validatePasswordStrength(password) {
  // Testing escape hatch — see DISABLE_PASSWORD_POLICY in ~/chaincert-api/.env. MUST be unset for demo.
  if (process.env.DISABLE_PASSWORD_POLICY === 'true') {
    return { ok: true, message: '' };
  }

  const pw = String(password || '');

  if (pw.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` };
  }
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) {
    return { ok: false, message: 'That password is too common. Please choose a less guessable one.' };
  }
  return { ok: true, message: '' };
}

// ==========================================================================================
// FILE UPLOAD VALIDATION  (M7)
// ==========================================================================================

// Magic-number signatures — the real leading bytes of each format, regardless of file extension
// or the client-supplied MIME type (both of which an attacker can fake).
const FILE_SIGNATURES = {
  png: [0x89, 0x50, 0x4e, 0x47], // "‰PNG"
  jpg: [0xff, 0xd8, 0xff],       // JPEG / JFIF
  pdf: [0x25, 0x50, 0x44, 0x46]  // "%PDF"
};

/*
  Function Name: detectFileType

  LAYMAN (Tropang Ex): Sinisilip ang unang ilang byte ng file para malaman kung ano talaga ito —
  PNG, JPG, o PDF — kahit ano pa ang pangalan o sinasabing type nito.

  TECHNICAL: Compares the buffer's leading bytes against known magic-number signatures.
  Returns the detected type string or null. Does NOT trust file extension / client mimetype.

  PARAMS:
  - buffer — the raw file bytes (Buffer), e.g. multer's file.buffer.

  RETURNS:
  'png' | 'jpg' | 'pdf' | null
*/
function detectFileType(buffer) {
  if (!buffer || buffer.length < 4) return null;
  for (const [type, sig] of Object.entries(FILE_SIGNATURES)) {
    if (sig.every((byte, i) => buffer[i] === byte)) return type;
  }
  return null;
}

/*
  Function Name: validateUploadedFile

  LAYMAN (Tropang Ex): "Tama ba talaga 'tong file?" — checks na PNG/JPG/PDF nga ito (sa totoong laman)
  AT pinapayagan ba sa lugar na 'to. Kung disguised file (hal. HTML na pinangalanang .png), bagsak.

  TECHNICAL: Detects the real type via magic number and confirms it's in allowedTypes.
  Returns { ok, type, message }.

  PARAMS:
  - buffer — raw file bytes.
  - allowedTypes — array of permitted types, e.g. ['png','jpg'] or ['pdf','png','jpg'].

  RETURNS:
  { ok: boolean, type: string|null, message: string }

  EXAMPLE
    validateUploadedFile(htmlBytesNamedPng, ['png','jpg']) -> { ok:false, type:null, message:'Unrecognized ...' }
    validateUploadedFile(realPngBytes, ['png','jpg'])      -> { ok:true,  type:'png', message:'' }
*/
function validateUploadedFile(buffer, allowedTypes) {
  const type = detectFileType(buffer);
  if (!type) {
    return { ok: false, type: null, message: 'Unrecognized or unsupported file. Only PNG, JPG, or PDF files are accepted.' };
  }
  if (!Array.isArray(allowedTypes) || !allowedTypes.includes(type)) {
    return { ok: false, type, message: `File type ".${type}" is not allowed here. Allowed: ${(allowedTypes || []).join(', ')}.` };
  }
  return { ok: true, type, message: '' };
}

// ==========================================================================================
// SAFE ERROR RESPONSE  (M9)
// ==========================================================================================

/*
  Function Name: sendServerError

  LAYMAN (Tropang Ex): Kapag may unexpected na error, dito dumadaan. Itinatago nito ang totoong
  detalye sa SERVER logs (Ubuntu terminal) at generic na mensahe lang ang ibinibigay sa user, kasama
  ang maikling errorId para madali mong i-match yung report ng user sa eksaktong log line.

  TECHNICAL: Logs the full error server-side with a correlation id, returns HTTP 500 with a generic
  body { success:false, message, errorId }. Prevents stack/DB/infra disclosure to the client (CWE-209).

  PARAMS:
  - res — Express response.
  - error — the caught error.
  - tag — short context label for the log line (e.g. 'LOGIN', 'WALLET').

  RETURNS:
  The Express response (500). Use as: return sendServerError(res, error, 'CTX');
*/
function sendServerError(res, error, tag = 'SERVER') {
  const errorId = crypto.randomBytes(4).toString('hex');
  console.error(`[${tag}][errorId=${errorId}]`, (error && error.stack) ? error.stack : error);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again.',
    errorId
  });
}

// ==========================================================================================
// RATE LIMITING  (M5)
// ------------------------------------------------------------------------------------------
// Moved here from sdk-server-fixed.js for the same reason the guards moved: route files could not
// reach it. Most limiters are still mounted by path prefix in sdk-server-fixed.js, but a prefix
// cannot express a path with a PARAMETER in the middle — /api/auth/profile-share/:token/verify-otp
// is unreachable by app.use('/literal/prefix', ...), and that flow needed a limiter more than any
// other (it has no send throttle at all). Those two get a per-route limiter in authRoutes.js.
// ==========================================================================================

// Temporary testing escape hatch: set DISABLE_RATE_LIMIT=true in ~/chaincert-api/.env to turn OFF
// all rate limiting (handy when repeatedly testing wrong-password logins). MUST be unset / false
// for any demo or deployment — sdk-server-fixed.js logs a loud warning at startup whenever it is on.
const RATE_LIMIT_DISABLED = process.env.DISABLE_RATE_LIMIT === 'true';

/*
  Function Name: createRateLimiter

  LAYMAN (Tropang Ex): Gumagawa ng "bouncer" na nagbibilang ng request kada IP. Kapag sobra na sa
  loob ng takdang panahon, 429 muna (Too many requests) hangga't hindi naka-reset ang window.

  TECHNICAL: Factory returning an Express middleware backed by an in-memory Map(ip -> {count, resetAt}),
  with an unref'd interval sweep so it cannot grow unbounded. Honors DISABLE_RATE_LIMIT (testing
  bypass). Sends Retry-After + 429 when count exceeds max within windowMs. Per-process (single-VM
  scope); a shared store (Redis) or express-rate-limit is the multi-instance upgrade path.

  NOTE on req.ip: this keys on the socket peer unless Express is told to trust the proxy. Behind
  the VM's Nginx, every request would otherwise carry the SAME proxy IP and share one bucket —
  making the limiter either useless or a global self-DoS. sdk-server-fixed.js therefore sets
  app.set('trust proxy', 1).

  PARAMS: { windowMs, max, message }.
  RETURNS: an (req, res, next) middleware.
*/
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

// ==========================================================================================
// ONE-TIME PASSCODES  (OTP)
// ------------------------------------------------------------------------------------------
// Four independent OTP flows exist (signup, verifier email-proof, password reset, profile-share).
// Each grew its own copy of the same two lines, and all four shared the same two defects:
//
//   1. Math.random() as the source. V8's Math.random is xorshift128+, not a CSPRNG, and its
//      internal state is recoverable from a modest run of observed outputs. All four flows draw
//      from the SAME process-global stream, so an attacker could harvest codes by requesting OTPs
//      to their own address and then PREDICT a victim's password-reset code rather than guess it.
//      (The project already used crypto.randomBytes correctly for share tokens — the OTP
//      generators simply never got the same treatment.)
//
//   2. No failed-attempt counter anywhere. Every flow throttled SENDING (3 per 10 min) but not
//      GUESSING, and no confirm endpoint was rate limited. A 6-digit code with a 10-minute TTL and
//      unlimited guesses is a 1-in-1,000,000 lock you may pick as fast as you can send requests.
//
// These helpers are the single implementation all four flows now use.
// ==========================================================================================

// A wrong code burns the CODE, not the account: on the 5th failure the entry is invalidated and
// the user simply requests a new one. Kept low because the guess space is only 10^6.
const OTP_MAX_FAILURES = 5;

/*
  Function Name: generateOtp

  LAYMAN (Tropang Ex): Gumagawa ng 6-digit na code na TALAGANG random. Yung dati kasing
  Math.random() ay hindi pang-seguridad — mahuhulaan ang susunod na code kung nakita mo ang ilang
  naunang code, kaya kayang manghula ng reset code ng iba.

  TECHNICAL: 6-digit numeric OTP from crypto.randomInt (CSPRNG, uniform, no modulo bias).
  Returns a STRING so it compares cleanly against the string that arrives in a request body.

  PARAMS: (none)

  RETURNS:
  A 6-character numeric string, '100000'..'999999'.

  EXAMPLE
    generateOtp()  ->  '407219'
*/
function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

/*
  Function Name: otpEquals

  LAYMAN (Tropang Ex): Paghahambing ng dalawang code sa paraang hindi nagpapakita ng clue kung
  gaano ka na kalapit sa tamang sagot. Sa normal na paghahambing, mas mabilis huminto kapag mali
  agad ang unang digit — at ang liit-liit na diperensya sa oras na yun ay pwedeng sukatin.

  TECHNICAL: Length-safe, constant-time comparison via crypto.timingSafeEqual. Both sides are
  coerced with String() first — the profile-share flow passed req.body.otp straight through with no
  coercion, so a non-string (e.g. a JSON number, or an object) could reach the comparison.
  timingSafeEqual throws on length mismatch, so that case is short-circuited to false.

  PARAMS:
  - a, b — the two codes to compare (either may be any type).

  RETURNS:
  boolean. False for empty/absent values on either side.

  EXAMPLE
    otpEquals('407219', '407219')  -> true
    otpEquals('407219', 407219)    -> true   (coerced)
    otpEquals('407219', '4072')    -> false  (no throw)
*/
function otpEquals(a, b) {
  const x = String(a ?? '');
  const y = String(b ?? '');
  if (!x || !y || x.length !== y.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(x, 'utf8'), Buffer.from(y, 'utf8'));
  } catch (_) {
    return false;
  }
}

// ==========================================================================================
// AUTHORIZATION GUARDS  (M2)
// ------------------------------------------------------------------------------------------
// The JWT middleware in sdk-server-fixed.js only DECODES the token into req.user (or null).
// It never blocks. These guards are the gate.
//
// Why they moved here: they used to be file-local function declarations inside
// sdk-server-fixed.js, which meant the seven route files had NO way to reach them — the only
// mechanism a router had for pulling anything off the server was req.app.locals, and the guards
// were never put there. The practical result was that four of six routers were mounted with no
// guard at all and security depended on ~40 individual handlers each remembering to check
// req.user. Seven of them did not. Exporting the guards from a module every router already
// requires is what makes "guard at the mount, opt out explicitly" possible.
//
// adminRoutes.js also carried its own duplicate requireAdmin. Two definitions of the same rule
// drift; this is now the single copy.
// ==========================================================================================

/*
  Function Name: requireAuth

  LAYMAN (Tropang Ex): Bouncer sa pinto — kung walang valid na token, hindi ka papasok (401).
  Wala siyang pakialam kung anong role ka, basta may patunay ka na naka-login ka.

  TECHNICAL: Express middleware. 401 when req.user is null (no Authorization header, or
  jwt.verify threw), otherwise next(). Mount-level usage is preferred over per-route so the
  default is closed.

  PARAMS:
  - req, res, next — standard Express middleware signature.

  RETURNS:
  A 401 JSON response, or calls next().
*/
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  next();
}

/*
  Function Name: requireRole

  LAYMAN (Tropang Ex): Bouncer na may guest list — kailangan naka-login ka AT tama yung role mo.
  Halimbawa requireRole('admin'): kahit naka-login ka, kung student ka, bawal (403).

  TECHNICAL: Guard factory. Returns an Express middleware that 401s on a missing token and 403s
  when req.user.role !== role. Kept as a factory (rather than five hand-written guards) so the
  401/403 bodies stay identical everywhere.

  PARAMS:
  - role — the single required role string, e.g. 'admin' | 'issuer' | 'student'.

  RETURNS:
  An (req, res, next) middleware.

  EXAMPLE
    router.post('/disable-user/:userId', requireRole('admin'), handler)
*/
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

/*
  Function Name: requireAnyRole

  LAYMAN (Tropang Ex): Parang requireRole pero pwede kang maglista ng maraming role. Ginagamit sa
  mga route na pareho namang ginagamit ng issuer at ng admin (hal. mag-issue o mag-revoke ng
  credential) — pareho silang pwede, pero yung student hindi.

  TECHNICAL: Guard factory for endpoints legitimately served by more than one role. Needed because
  the credential lifecycle routes accept both 'issuer' (acting on their own credentials) and
  'admin' (platform operator), and requireRole can only express one.

  NOTE: this authorizes the ROLE only. Per-object ownership (this issuer owns this credential) is
  a separate check that belongs in the controller — see getCredentialDocById in couchDB_service.js.

  PARAMS:
  - ...roles — one or more allowed role strings.

  RETURNS:
  An (req, res, next) middleware.

  EXAMPLE
    router.post('/:credentialId/revoke', requireAnyRole('issuer', 'admin'), handler)
*/
function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient privileges.' });
    }
    next();
  };
}

// Named shorthands for the two roles used most often. Same behavior as the factory calls.
const requireAdmin = requireRole('admin');
const requireIssuer = requireRole('issuer');

module.exports = {
  MIN_PASSWORD_LENGTH,
  validatePasswordStrength,
  detectFileType,
  validateUploadedFile,
  sendServerError,
  RATE_LIMIT_DISABLED,
  createRateLimiter,
  OTP_MAX_FAILURES,
  generateOtp,
  otpEquals,
  requireAuth,
  requireRole,
  requireAnyRole,
  requireAdmin,
  requireIssuer
};
