// forgotPassword.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/loginPage.css"; // reuse login styles for consistency

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleReset = (e) => {
    e.preventDefault();
    console.log("Password reset requested for:", email);

    // Later: Call backend API or Firebase resetPassword function
    alert("If this email is registered, you’ll receive a password reset link.");

    navigate("/login"); // Redirect back to login
  };

  return (
    <div className="login-wrapper">
      <div className="login-right">
        <div className="login-box">
          <h2 className="brand-name">Reset Password</h2>
          <p className="tagline">Enter your email to reset your password</p>

          <form className="login-form" onSubmit={handleReset}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn">Send Reset Link</button>
          </form>

          <div className="extra-links">
            <a href="/login">Back to Login</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
