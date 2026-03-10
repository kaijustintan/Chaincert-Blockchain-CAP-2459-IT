// frontend/src/pages/loginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import "../styles/loginPage.css";


function LoginPage() {  
  const [email, setEmail] = useState('');  // ✅ CHANGED FROM 'username' TO 'email'
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // ✅ STEP 1: Try ISSUER login first (optimal - single request on success)
      console.log('🔍 Attempting issuer login...');
      const issuerResponse = await apiService.loginIssuer({ email, password });
      
      if (issuerResponse.success) {
        console.log('✅ Issuer login successful!');
        localStorage.setItem('token', issuerResponse.token);
        // - polo: include issuerType so subordinate dashboard can hide root-only sections
        localStorage.setItem('user', JSON.stringify({
          ...issuerResponse.user,
          issuerType: issuerResponse.user?.issuerType || issuerResponse.issuerType || 'root',
        }));
        localStorage.setItem('role', 'issuer');
        setLoading(false);
        navigate('/issuer/dashboard');
        return; // ✅ Exit - no need for fallback
      }
    } catch (issuerError) {
      const issuerStatus = issuerError?.response?.status;
      const issuerMessage = issuerError?.response?.data?.message;

      // Disabled issuer should stop fallback and show explicit UI message
      if (issuerStatus === 403) {
        setError(issuerMessage || 'Your issuer account has been disabled. Please contact administrator.');
        setLoading(false);
        return;
      }

      // For 401 (not issuer / not approved), continue to regular user fallback
      console.log('📌 Not an issuer account, checking regular user...');
    }


    // ✅ STEP 2: Try REGULAR USER login (fallback only if issuer fails)
    try {
      console.log('🔍 Attempting user login...');
      const userResponse = await apiService.login({ email, password });
      
      if (userResponse.success) {
        console.log('✅ User login successful!');
        localStorage.setItem('token', userResponse.token);
        localStorage.setItem('user', JSON.stringify(userResponse.user));
        const userRole = userResponse.user.role || 'student';
        localStorage.setItem('role', userRole);
        
        // Route based on role
        if (userRole === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/student/dashboard');
        }
        setLoading(false);
        return;
      }
      
      setError(userResponse.message || userResponse.error || 'Login failed.');
    } catch (userError) {
      const userMessage = userError?.response?.data?.message;
      setError(userMessage || 'Invalid credentials or server error.');
      console.error('Login error:', userError);
    }
    
    setLoading(false);
  };


  return (
    <div className="login-wrapper">
      {/* Left Side - Branding / Tagline */}
      <div className="login-left">
        {/* CSS-CHANGE: wrapped in login-left-card for dark box styling - polo */}
        <div className="login-left-card">
          <h1>Level up your future.</h1>
          <p>Join the ChainCert platform where you can:</p>
          <ul>
            <li>✔ Secure and verify your academic credentials</li>
            <li>✔ Share your achievements with employers</li>
            <li>✔ Build trust through blockchain technology</li>
            <li>✔ Unlock new career and education opportunities</li>
          </ul>
        </div>
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