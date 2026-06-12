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
  TECHNICAL: Shared, dependency-light helper module (Phase 5 Tier 2). Required by controllers as
    '../securityHelpers'. Deploys to ~/chaincert-api/securityHelpers.js (same Windows→Ubuntu pattern
    as mailerService.js). No external dependencies — magic-number checks are hand-rolled.
  OUTLINE:
    PASSWORD
      - validatePasswordStrength(password)         -> { ok, message }
    FILE UPLOAD
      - detectFileType(buffer)                      -> 'png' | 'jpg' | 'pdf' | null
      - validateUploadedFile(buffer, allowedTypes)  -> { ok, type, message }
    ERROR
      - sendServerError(res, error, tag)           -> Express 500 (generic message + errorId)
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

module.exports = {
  MIN_PASSWORD_LENGTH,
  validatePasswordStrength,
  detectFileType,
  validateUploadedFile,
  sendServerError
};
