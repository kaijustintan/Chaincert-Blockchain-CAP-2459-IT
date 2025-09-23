// LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/loginPage.css";

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    console.log("Email:", email);
    console.log("Password:", password);

    navigate('/student/dashboard');
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
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn">Login</button>
          </form>

          <div className="extra-links">
            <a href="/forgot-password">Forgot Password?</a>
            <a href="/register">Create Account</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
