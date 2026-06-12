const couchDB = require('../couchDB_service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// M4 (Phase 5 hardening): a real bcrypt hash used ONLY to equalize response timing when an email
// doesn't exist. Without this, "no such user" returns instantly while "wrong password" spends time
// hashing — that timing gap is itself an account-enumeration oracle (KB A-6). We always run one
// bcrypt.compare so both paths take roughly the same time. Computed once at module load.
const DUMMY_BCRYPT_HASH = bcrypt.hashSync('chaincert-timing-equalizer', 10);

const authController = {
  register: async (req, res) => {
    try {
      console.log('🔥 HIT /api/auth/register, body =', req.body);

      const { username, email, password, role, org } = req.body;

      console.log('🧪 Extracted fields:', { username, email, hasPassword: !!password, role, org });

      if (!username || !password || !email) {
        console.log('❌ Missing required fields in register');
        return res.status(400).json({
          success: false,
          message: 'Username, password, and email are required'
        });
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

      console.log('🔐 Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('🔐 Password hashed');

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

      console.log('📦 Built userData =', { ...userData, password: '***hidden***' });

      console.log('💾 Calling couchDB.saveUser...');
      const result = await couchDB.saveUser(userData);
      console.log('✅ couchDB.saveUser result =', result);

      console.log('✅ Sending 201 response for register');
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        userId: result.id
      });
    } catch (error) {
      console.error('🔥 Registration error:', error);
      return res.status(500).json({
        success: false,
        message: `Registration error: ${error.message}`
      });
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
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: `Login error: ${error.message}`
      });
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

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await couchDB.updateUser(user._id, { password: hashedNewPassword });

      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ success: false, message: error.message });
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
      console.error('Issuer login error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = authController;
