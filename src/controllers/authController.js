const couchDB = require('../couchDB_service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  validatePasswordStrength,
  sendServerError,
  generateOtp,      // CSPRNG 6-digit code (replaces Math.random)
  otpEquals,        // constant-time compare
  OTP_MAX_FAILURES  // wrong guesses before the code is burned
} = require('../securityHelpers'); // Phase 5 Tier 2
const mailerService = require('../mailerService'); // F28: password-change receipt

// M4 (Phase 5 hardening): a real bcrypt hash used ONLY to equalize response timing when an email
// doesn't exist. Without this, "no such user" returns instantly while "wrong password" spends time
// hashing — that timing gap is itself an account-enumeration oracle (KB A-6). We always run one
// bcrypt.compare so both paths take roughly the same time. Computed once at module load.
const DUMMY_BCRYPT_HASH = bcrypt.hashSync('chaincert-timing-equalizer', 10);

// ===========================================================================================
// SIGNUP EMAIL OTP (UAT): verify email ownership before a USER account goes live.
// Mirrors the verifier OTP engine (verifierController): in-memory transient store keyed by
// lowercased email, a short-lived 6-digit code, and on confirm a short-lived
// 'signup_email_proof' JWT that register() REQUIRES — so a new account's email is server-PROVEN,
// not just typed. Single-instance capstone scope (no DB schema change); a restart just forces a
// re-request. Issuer applications are NOT gated here (they already pass admin review before going
// live). TESTING TOGGLE: DISABLE_SIGNUP_OTP=true bypasses the gate in register().
// ===========================================================================================
// `failures` counts WRONG GUESSES (see confirmSignupOtp); `attempts` counts SENDS.
const signupOtpStore = new Map(); // email -> { otp, expiresAt, attempts, windowStart, failures }
const SIGNUP_OTP_TTL_MS = 10 * 60 * 1000;      // code valid 10 min
const SIGNUP_OTP_MAX = 3;                       // max sends per rate-limit window
const SIGNUP_OTP_WINDOW_MS = 10 * 60 * 1000;    // rate-limit window
const SIGNUP_TOKEN_TTL = '20m';                 // proof-token lifetime (must register soon after)
const SIGNUP_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const authController = {
  register: async (req, res) => {
    try {
      // `role` is deliberately NOT destructured from the body — see the userData block below.
      const { username, email, password, org } = req.body;

      if (!username || !password || !email) {
        return res.status(400).json({
          success: false,
          message: 'Username, password, and email are required'
        });
      }

      // M8 (Phase 5 hardening): enforce password strength on registration.
      const pwCheck = validatePasswordStrength(password);
      if (!pwCheck.ok) {
        return res.status(400).json({ success: false, message: pwCheck.message });
      }

      const normalizedEmail = String(email).trim().toLowerCase();

      const dupCheck = await couchDB.isEmailAlreadyUsed(normalizedEmail);
      if (dupCheck?.exists) {
        return res.status(409).json({
          success: false,
          message: 'Email is already registered in the system.',
          where: dupCheck.where
        });
      }

      // Signup email proof (UAT): require a valid 'signup_email_proof' token whose email matches
      // this registration, issued by confirmSignupOtp after the user enters the emailed code.
      // TESTING TOGGLE: DISABLE_SIGNUP_OTP=true skips this (parity with DISABLE_PASSWORD_POLICY).
      if (process.env.DISABLE_SIGNUP_OTP !== 'true') {
        const signupToken = req.body?.signupToken || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        let proofOk = false;
        try {
          const decoded = jwt.verify(signupToken, process.env.JWT_SECRET);
          proofOk = decoded?.purpose === 'signup_email_proof'
            && String(decoded.signupEmail || '').toLowerCase() === normalizedEmail;
        } catch (_) { proofOk = false; }
        if (!proofOk) {
          return res.status(401).json({ success: false, message: 'Please verify your email with the code we sent before creating your account.' });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      /* PRIVILEGE-ESCALATION FIX.

         LAYMAN (Tropang Ex): Dati, kung ano ang isinulat mo sa "role" ng request mo, yun ang
         ibinibigay sa'yo. Kaya kahit sino sa internet, kayang gawin ang sarili niyang ADMIN
         account — signup lang, tapos idagdag ang "role":"admin". Hindi nakatulong ang signup OTP,
         kasi pinapatunayan lang niyon na sa'yo ang email na ginamit mo. Ngayon, laging 'student'
         ang bagong account, kahit ano pa ang ipadala mo.

         TECHNICAL: `role` was read from req.body and written straight through as
         `role: role || 'student'`. The JWT is minted with `role: user.role` at login, so a
         self-declared 'admin' satisfied requireAdmin and every other admin gate — full takeover
         of the issuer-approval pipeline, audit logs, and user enable/disable, from an anonymous
         HTTP request.

         Public self-registration now always yields the lowest-privilege role. Issuer accounts are
         created by the separate admin-reviewed onboarding flow (issuerOnboardingController), and
         admin accounts are seeded out-of-band — neither goes through this endpoint. `org` is kept
         client-supplied: it selects a Fabric org for read routing and confers no privilege.
      */
      const userData = {
        type: 'user',
        username,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'student',
        org: org || 'org1',
        createdAt: new Date(),
        isActive: true
      };

      const result = await couchDB.saveUser(userData);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        userId: result.id
      });
    } catch (error) {
      return sendServerError(res, error, 'REGISTER'); // M9
    }
  },

  // Signup step 1: email an OTP to prove ownership before the account is created (public route).
  requestSignupOtp: async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email || !SIGNUP_EMAIL_RE.test(email)) {
        return res.status(400).json({ success: false, message: 'A valid email is required.' });
      }
      const dupCheck = await couchDB.isEmailAlreadyUsed(email);
      if (dupCheck?.exists) {
        return res.status(409).json({ success: false, message: 'Email is already registered in the system.' });
      }
      const now = Date.now();
      const existing = signupOtpStore.get(email);
      let attempts = 1, windowStart = now;
      if (existing && now - existing.windowStart < SIGNUP_OTP_WINDOW_MS) {
        if (existing.attempts >= SIGNUP_OTP_MAX) {
          return res.status(429).json({ success: false, message: 'Too many code requests. Please wait a few minutes and try again.' });
        }
        attempts = existing.attempts + 1;
        windowStart = existing.windowStart;
      }
      const otp = generateOtp(); // CSPRNG — was Math.random(), which is predictable from prior draws
      signupOtpStore.set(email, { otp, expiresAt: now + SIGNUP_OTP_TTL_MS, attempts, windowStart, failures: 0 });
      try {
        await mailerService.sendMail({
          to: email,
          realRecipient: true, // a new user is a real person — deliver to their inbox
          subject: 'CHAINCERT - Verify your email to create your account',
          html: mailerService.renderOtpEmail({
            heading: 'Confirm your email',
            intro: 'Enter this code in ChainCert to verify your email and finish creating your account.',
            otp,
            note: 'This code expires in 10 minutes. If you did not request it, you can ignore this email.'
          }),
          text: `Your ChainCert sign-up code is: ${otp}\nIt expires in 10 minutes.`
        });
      } catch (mailErr) {
        console.error('[SIGNUP OTP] send failed:', mailErr.message);
        return res.status(502).json({ success: false, message: 'Could not send the code. Check your email and try again.' });
      }
      return res.status(200).json({ success: true, message: 'Verification code sent.' });
    } catch (error) {
      return sendServerError(res, error, 'SIGNUP_OTP_REQUEST');
    }
  },

  // Signup step 2: confirm the OTP → issue the short-lived 'signup_email_proof' token (public route).
  confirmSignupOtp: async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const otp = String(req.body?.otp || '').trim();
      if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and code are required.' });
      }
      const entry = signupOtpStore.get(email);
      if (!entry) {
        return res.status(400).json({ success: false, message: 'Invalid verification code.' });
      }
      // Expiry is checked BEFORE the code compare so an expired entry is cleaned up rather than
      // consuming a failure slot.
      if (Date.now() > entry.expiresAt) {
        signupOtpStore.delete(email);
        return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
      }
      if (!otpEquals(entry.otp, otp)) {
        // Count the wrong guess and burn the code once the budget is spent. Without this, the code
        // stayed guessable for its full 10-minute life at whatever rate the attacker could send.
        entry.failures = (entry.failures || 0) + 1;
        if (entry.failures >= OTP_MAX_FAILURES) {
          signupOtpStore.delete(email);
          return res.status(429).json({
            success: false,
            message: 'Too many incorrect codes. Please request a new one.'
          });
        }
        signupOtpStore.set(email, entry);
        return res.status(400).json({ success: false, message: 'Invalid verification code.' });
      }
      signupOtpStore.delete(email); // single-use
      const signupToken = jwt.sign(
        { signupEmail: email, purpose: 'signup_email_proof' },
        process.env.JWT_SECRET,
        { expiresIn: SIGNUP_TOKEN_TTL }
      );
      return res.status(200).json({ success: true, signupToken, email });
    } catch (error) {
      return sendServerError(res, error, 'SIGNUP_OTP_CONFIRM');
    }
  },

  /*
    Function Name: checkEmail

    LAYMAN (Tropang Ex):
    Pang-check lang kung gamit na ba ang isang email bago pa matapos ang registration.
    Ginagamit ito ng issuer registration wizard sa Step 1 → 2 gate: kapag gamit na ang
    email, hindi makakalipat sa Part 2.

    TECHNICAL:
    Lightweight availability probe. Reuses the same system-wide duplicate rule as
    register (couchDB.isEmailAlreadyUsed) so the gate and the final submit agree —
    incl. the previously-rejected case (returns exists:false → available:true).
    Returns { success, available }.
  */
  checkEmail: async (req, res) => {
    try {
      const email = req.body?.email;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
      }
      const dup = await couchDB.isEmailAlreadyUsed(normalizedEmail);
      return res.json({ success: true, available: !dup?.exists });
    } catch (error) {
      return sendServerError(res, error, 'CHECK_EMAIL'); // M9
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const users = await couchDB.getAllUsers();
      const user = users.find(u => u.email === email);

      // M4: ONE generic failure for both "unknown email" and "wrong password" — identical message
      // AND identical status code — so an attacker can't tell which emails are registered (KB A-6).
      // Always run a bcrypt.compare (against a dummy hash when no user) to keep timing uniform.
      const passwordMatch = await bcrypt.compare(password, user ? user.password : DUMMY_BCRYPT_HASH);
      if (!user || !passwordMatch) {
        console.warn(`[LOGIN] Failed login for "${email}" — reason: ${user ? 'bad password' : 'no such user'}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Account-status checks happen only AFTER the password is proven correct, so the
      // "account disabled" message can't be used to confirm an email exists.
      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been disabled. Please contact administrator.'
        });
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role || 'student'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { password: pw, ...userData } = user;
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          ...userData,
          name: user.username,
          role: user.role || 'student'
        }
      });
    } catch (error) {
      return sendServerError(res, error, 'LOGIN'); // M9
    }
  },

  /*
    Function Name: changePassword

    LAYMAN (Tropang Ex): Pagpapalit ng sariling password. Dati, kung sinong email ang isulat mo sa
    request, yun ang bini-baguhan — at walang kailangang login. Dalawa ang naging problema: (1)
    sinasabi niya sa'yo kung existing ba ang isang email (404 kung wala, 401 kung meron pero mali
    ang password), kaya nagiging listahan ng valid na accounts; at (2) walang limit ang pagsubok,
    kaya pwedeng hulaan ang password nang walang hanggan — na siyang dumaan sa likod ng lahat ng
    proteksyon na nilagay natin sa /login. Ngayon, kailangan naka-login ka, at ang sarili mo lang
    na account ang kaya mong palitan.

    TECHNICAL: The account is now resolved from req.user (route carries requireAuth), never from
    req.body.email. This closes the account-enumeration oracle (the 404-vs-401 split) and removes
    the unauthenticated brute-force surface that bypassed the M4 uniform-response work on /login
    and the M5 authLimiter. The route also gains authLimiter in commit 7.

    PARAMS: req (req.user, req.body.currentPassword/newPassword), res.
    RETURNS: 200 | 400 | 401 | 500 via sendServerError.
  */
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const authedId = req.user?.id || req.user?._id;
      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      // Identity from the token. The email in the body (if any) is ignored.
      const allUsers = await couchDB.getAllUsers();
      let user = allUsers.find(u => String(u._id) === String(authedId));

      if (!user && req.user.email) {
        user = await couchDB.getApprovedIssuer(req.user.email);
      }

      if (!user) {
        // The token verified but the account is gone (deleted mid-session). Not an enumeration
        // signal — the caller already proved they hold a token for this id.
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Invalid current password' });
      }

      // M8 (Phase 5 hardening): the new password must meet the strength policy.
      const pwCheck = validatePasswordStrength(newPassword);
      if (!pwCheck.ok) {
        return res.status(400).json({ success: false, message: pwCheck.message });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await couchDB.updateUser(user._id, { password: hashedNewPassword });

      // F28: password-change security receipt (best-effort, non-fatal).
      // G3: fire-and-forget so the password change responds immediately.
      // Route by account type: holders use legit emails → real inbox; issuer/admin
      // accounts are test addresses → central inbox (SMTP_OVERRIDE_TO).
      // NOTE: the old fallback here was `user.email || email`, reading the body-supplied email.
      // That identifier no longer exists (identity comes from the token), so fall back to the
      // token's own email claim instead.
      const acctEmail = user.email || req.user.email;
      const acctIsTest = ['issuer', 'admin'].includes(String(user.role || '').toLowerCase()) || String(user._id || '').startsWith('issuer_');
      if (acctEmail) {
        mailerService.sendMailFireAndForget({
          to: acctEmail,
          realRecipient: !acctIsTest,
          subject: 'Your ChainCert Password Was Changed',
          html: mailerService.renderEmail({
            heading: 'Password Changed',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Hi,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">The password for your ChainCert account (<strong>${acctEmail}</strong>) was just <strong>changed</strong>. If this was you, no action is needed.</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">If you did <strong>not</strong> make this change, please contact the ChainCert administration team immediately.</p>`
          }),
          text: `The password for your ChainCert account (${acctEmail}) was just changed. If this was not you, contact the ChainCert administration team immediately.`
        }, '[changePassword]');
      }

      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      return sendServerError(res, error, 'CHANGE-PASSWORD'); // M9
    }
  },

  loginIssuer: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const issuer = await couchDB.getIssuerByEmail(email);

      // M4: uniform credential-failure path (unknown email OR wrong password) — same message,
      // same 401, timing equalized — so the issuer login can't be used to enumerate accounts (KB A-6).
      const passwordMatch = await bcrypt.compare(password, issuer ? issuer.password : DUMMY_BCRYPT_HASH);
      if (!issuer || !passwordMatch) {
        console.warn(`[ISSUER LOGIN] Failed login for "${email}" — reason: ${issuer ? 'bad password' : 'no such issuer'}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Status checks only AFTER the password is verified (so status can't be probed without creds).
      if (issuer.status === 'disabled') {
        return res.status(403).json({
          success: false,
          message: 'Your issuer account has been disabled. Please contact administrator.'
        });
      }

      if (issuer.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Your issuer account is not approved yet.'
        });
      }

      const token = jwt.sign(
        {
          id: issuer._id,
          email: issuer.email,
          role: 'issuer',
          orgName: issuer.orgName
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: issuer._id,
          email: issuer.email,
          role: 'issuer',
          orgName: issuer.orgName,
          contactName: issuer.contactName,
          issuerType: issuer.issuerType || 'root' 
        }
      });
    } catch (error) {
      return sendServerError(res, error, 'ISSUER-LOGIN'); // M9
    }
  },

  // Bonus (Phase 5 Tier 2): ONE login endpoint that figures out user-vs-issuer server-side.
  // LAYMAN (Tropang Ex): Dati, dalawang request ang login (subok-issuer muna, tapos subok-user) —
  // kaya laging may "expected" na 401 sa console. Ngayon, iisang tawag na lang: tinitignan ng server
  // kung user ka ba o issuer, tapos binibigay agad ang tamang token. Walang ingay na 401.
  // TECHNICAL: Checks the users store, then the approved-issuers store. Reuses the M3/M4-hardened
  // logic (JWT_SECRET required, generic credential-failure message + timing equalizer, status checks
  // only after the password is verified). The old /api/auth/login (user-only) and /api/issuer/login
  // remain as backward-compatible aliases.
  unifiedLogin: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      // 1) Regular user store.
      const users = await couchDB.getAllUsers();
      const user = users.find(u => u.email === email);
      const userMatch = user ? await bcrypt.compare(password, user.password) : false;

      if (user && userMatch) {
        if (user.isActive === false) {
          return res.status(403).json({ success: false, message: 'Your account has been disabled. Please contact administrator.' });
        }
        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role || 'student' },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        const { password: _pw, ...userData } = user;
        return res.status(200).json({
          success: true,
          accountType: 'user',
          token,
          user: { ...userData, name: user.username, role: user.role || 'student' }
        });
      }

      // 2) Issuer store (only approved issuers can actually log in; status checked post-password).
      const issuer = await couchDB.getIssuerByEmail(email);
      const issuerMatch = issuer ? await bcrypt.compare(password, issuer.password) : false;

      if (issuer && issuerMatch) {
        if (issuer.status === 'disabled') {
          return res.status(403).json({ success: false, message: 'Your issuer account has been disabled. Please contact administrator.' });
        }
        if (issuer.status !== 'approved') {
          return res.status(403).json({ success: false, message: 'Your issuer account is not approved yet.' });
        }
        const token = jwt.sign(
          { id: issuer._id, email: issuer.email, role: 'issuer', orgName: issuer.orgName },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        return res.status(200).json({
          success: true,
          accountType: 'issuer',
          token,
          user: {
            id: issuer._id,
            email: issuer.email,
            role: 'issuer',
            orgName: issuer.orgName,
            contactName: issuer.contactName,
            issuerType: issuer.issuerType || 'root'
          }
        });
      }

      // 3) No match. If neither store had this email, run a dummy compare so response timing is
      //    uniform whether the account exists or not (M4 anti-enumeration).
      if (!user && !issuer) {
        await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      }
      console.warn(`[LOGIN] Failed unified login for "${email}"`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    } catch (error) {
      return sendServerError(res, error, 'LOGIN'); // M9
    }
  }
};

module.exports = authController;
