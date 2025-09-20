import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for programmatic navigation


function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();  // Hook for navigation

  const handleLogin = (e) => {
    e.preventDefault();

    // For now, just log the email and password
    console.log("Email:", email);
    console.log("Password:", password);

    // Simulate a successful login by redirecting the user to the Dashboard
    navigate('/student/dashboard');  // Redirects to the Student Dashboard after login
  };

  return (
    <div className="login-page">
      <header>
        <h1>Login</h1>
        <p>Enter your credentials to log in</p>

        <form onSubmit={handleLogin}>
          <div>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)} // Update email state
              required
            />
          </div>

          <div>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)} // Update password state
              required
            />
          </div>

          <button type="submit">Login</button>
        </form>

        
      </header>
    </div>
  );
}

export default LoginPage;
