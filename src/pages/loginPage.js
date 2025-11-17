// frontend/src/pages/loginPage.js - FIXED VERSION
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import "../styles/loginPage.css";

function LoginPage() {  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // ✅ STEP 1: Try ISSUER login first
      console.log('🔍 Attempting issuer login...');
      const issuerResponse = await apiService.loginIssuer({ email, password });
      
      if (issuerResponse.success) {
        console.log('✅ Issuer login successful!');
        localStorage.setItem('token', issuerResponse.token);
        localStorage.setItem('user', JSON.stringify(issuerResponse.user));
        localStorage.setItem('role', 'issuer');
        setLoading(false);
        
        // ✅ FIXED: Navigate to landing home page instead of dashboard
        navigate('/home');
        return;
      }
    } catch (issuerError) {
      console.log('📌 Not an issuer account, checking regular user...');
    }

    // ✅ STEP 2: Try REGULAR USER login
    try {
      console.log('🔍 Attempting user login...');
      const userResponse = await apiService.login({ email, password });
      
      if (userResponse.success) {
        console.log('✅ User login successful!');
        localStorage.setItem('token', userResponse.token);
        localStorage.setItem('user', JSON.stringify(userResponse.user));
        const userRole = userResponse.user.role || 'student';
        localStorage.setItem('role', userRole);
        
        // ✅ FIXED: ALL roles go to landing home page
        // The landing page will show different content based on role
        navigate('/home');
        
        setLoading(false);
        return;
      }
      
      setError(userResponse.error || 'Login failed.');
    } catch (userError) {
      setError('Invalid credentials or server error.');
      console.error('Login error:', userError);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      {/* Left Side - Branding / Tagline */}
      <div className="login-left">
        <h1>Level up your future.</h1>
        <p>Join the ChainCert platform where you can:</p>
        <ul>
          <li>✔ Secure and verify your academic credentials</li>
          <li>✔ Share your achievements with employers</li>
          <li>✔ Build trust through blockchain technology</li>
          <li>✔ Unlock new career and education opportunities</li>
        </ul>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right">
        <div className="login-box">
          <h2 className="brand-name">ChainCert</h2>
          <p className="tagline">Secure • Verifiable • Blockchain Credentials</p>

          <form className="login-form" onSubmit={handleLogin}>
            {error && (
              <div className="error-banner">
                <span>⚠️</span> {error}
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
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error}</div>}
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

          <div className="demo-credentials">
            <p><strong>Demo Accounts:</strong></p>
            <small>Issuer: issuer1@example.com / password123</small><br/>
            <small>Holder: student1@example.com / password123</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;