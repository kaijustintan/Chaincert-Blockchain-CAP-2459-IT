// frontend/src/pages/loginPage.js
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { login } from '../services/authenticationService';
import PasswordInput from '../components/passwordInput';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { syncStoredUser } from '../utils/userDisplay';
import "../styles/loginPage.css";


function LoginPage() {  
  const [email, setEmail] = useState('');  // ✅ CHANGED FROM 'username' TO 'email'
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.successMessage || '';


  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Bonus (Phase 5 Tier 2): ONE unified call. The backend resolves user-vs-issuer and returns the
    // right token + role, so there's no more "try issuer, fall back to user" double-request (which
    // produced an expected-but-ugly 401 in the console on every normal login).
    try {
      const response = await apiService.login({ email, password });

      if (response.success) {
        const role = response.user?.role || 'student';
        let nextUser = { ...response.user, role };
        const uid = response.user?._id || response.user?.id;
        if (uid) {
          try {
            const profileResp = await apiService.getUserInfo(uid);
            if (profileResp?.success && profileResp.user) {
              nextUser = { ...nextUser, ...profileResp.user, role };
            }
          } catch (e) { /* non-critical profile enrichment */ }
        }

        login(response.token, nextUser, role, nextUser?.email || response.user?.email || email);
        syncStoredUser(nextUser);
        setLoading(false);

        if (role === 'issuer') {
          navigate('/issuer/dashboard');
        } else if (role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/student/dashboard');
        }
        return;
      }

      setError(response.message || response.error || 'Login failed.');
      setLoading(false);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 429) {
        // Rate limited (M5).
        setError(msg || 'Too many attempts. Please wait a few minutes and try again.');
      } else if (status === 403) {
        // Disabled / not-yet-approved account — surface the server's explicit reason.
        setError(msg || 'Your account cannot be accessed. Please contact an administrator.');
      } else {
        // Generic credential failure (M4 anti-enumeration).
        setError(msg || 'Invalid credentials.');
      }
      console.error('Login error:', err);
      setLoading(false);
    }
  };


  return (
    <div
      className="login-wrapper"
      style={{
        backgroundImage: `linear-gradient(rgba(10, 14, 28, 0.40), rgba(10, 14, 28, 0.60)), url(${process.env.PUBLIC_URL}/assets/background3.png)`,
      }}
    >
      {/* Left Side - Branding / Tagline */}
      <div className="login-left">
        {/* CSS-CHANGE: wrapped in login-left-card for dark box styling - polo */}
        <div className="login-left-card">
          <h1>Your Credentials, Verified.</h1>
          <p className="login-left-tagline">
            Tamper-proof credentials on the blockchain — yours to hold, share, and prove in seconds.
          </p>
        </div>
      </div>


      {/* Right Side - Login Form */}
      <div className="login-right">
        <div className="login-box">
          <h2 className="brand-name">ChainCert</h2>
          <p className="tagline">Secure • Verifiable • Blockchain Credentials</p>


          <form className="login-form" onSubmit={handleLogin}>
            {successMessage && !error && (
              <div className="success-banner" style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(74, 222, 128, 0.12)', border: '1px solid rgba(74, 222, 128, 0.24)', color: '#86efac', fontWeight: 600 }}>
                <CheckCircle2 size={14} aria-hidden="true" /> {successMessage}
              </div>
            )}
            {error && (
              <div className="error-banner">
                <AlertTriangle size={14} aria-hidden="true" /> {error}
              </div>
            )}


            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              className="login-btn"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>


          <div className="extra-links">
            <a href="/forgot-password">Forgot Password?</a>
            <a href="/register">Create Account</a>
          </div>


          {/*removed demo accounts*/}
        </div>
      </div>
    </div>
  );
}


export default LoginPage;