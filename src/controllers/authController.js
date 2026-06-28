const couchDB = require('../couchDB_service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validatePasswordStrength, sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2
const mailerService = require('../mailerService'); // F28: password-change receipt

// M4 (Phase 5 hardening): a real bcrypt hash used ONLY to equalize response timing when an email
// doesn't exist. Without this, "no such user" returns instantly while "wrong password" spends time
// hashing — that timing gap is itself an account-enumeration oracle (KB A-6). We always run one
// bcrypt.compare so both paths take roughly the same time. Computed once at module load.
const DUMMY_BCRYPT_HASH = bcrypt.hashSync('chaincert-timing-equalizer', 10);

const authController = {
  register: async (req, res) => {
    try {
      const { username, email, password, role, org } = req.body;

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

      const hashedPassword = await bcrypt.hash(password, 10);

      const userData = {
        type: 'user',
        username,
        email: normalizedEmail,
        password: hashedPassword,
        role: role || 'student',
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

  changePassword: async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;

      const allUsers = await couchDB.getAllUsers();
      let user = allUsers.find(u => u.email === email);

      if (!user) {
        user = await couchDB.getApprovedIssuer(email);
      }

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
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
      const acctEmail = user.email || email;
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
