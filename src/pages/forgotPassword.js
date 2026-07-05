// forgotPassword.js - polo
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordCriteria from "../components/passwordCriteria";
import "../styles/loginPage.css";

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // 'email' | 'reset' | 'success' 
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Step 1: Submit email ──────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000/api'}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (data.success && data.otpSent) { 
        setStep("reset");
      } else if (data.success && !data.otpSent) {
        setError("No account found with that email address.");
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch (err) {
      setError("Server error. Please try again.");
    }

    setLoading(false);
  };

  // ── Step 2: OTP collected together with new password 

  // ── Step 3: Submit new password ───────────────────────────────
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000/api'}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await response.json();

      if (data.success) {
        setStep("success");
      } else {
        setError(data.message || "Reset failed. Please try again.");
      }
    } catch (err) {
      setError("Server error. Please try again.");
    }

    setLoading(false);
  };

  // ── Shared card wrapper ───────────────────────────────────────
  const renderCard = (content) => (
    <div className="login-wrapper">
      <div className="login-right">
        <div className="login-box">
          <h2 className="brand-name">ChainCert</h2>
          <p className="tagline">Password Reset</p>
          {error && (
            <div className="error-banner">
              <span>⚠️</span> {error}
            </div>
          )}
          {content}
          <div className="extra-links" style={{ justifyContent: "center" }}>
            <a href="/login">Back to Login</a>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step: Email ───────────────────────────────────────────────
  if (step === "email") {
    return renderCard(
      <>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "20px", textAlign: "left" }}>
          Enter your registered email address and we will send you a verification code to reset your password.
        </p>
        <form className="login-form" onSubmit={handleEmailSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Sending Code..." : "Send Verification Code"}
          </button>
        </form>
      </>
    );
  }

  // ── Step: OTP + New Password (combined) ──────────────────────
  if (step === "reset") {
    return renderCard(
      <>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "20px", textAlign: "left" }}>
          A 6-digit verification code has been sent to <strong style={{ color: "#a5b4fc" }}>{email}</strong>. Enter the code and your new password below.
        </p>
        <form className="login-form" onSubmit={handleResetSubmit}>
          <div className="input-group">
            <label htmlFor="otp">Verification Code</label>
            <input
              type="text"
              id="otp"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
              disabled={loading}
            />
          </div>
          <div className="input-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
            />
            <PasswordCriteria password={newPassword} tone="dark" />
          </div>
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <button
            onClick={() => { setStep("email"); setError(""); }}
            style={{ background: "none", border: "none", color: "#748ffc", cursor: "pointer", fontSize: "12px", fontFamily: "Poppins, sans-serif" }}
          >
            ← Use a different email
          </button>
        </div>
      </>
    );
  }

  // ── Step: Success ─────────────────────────────────────────────
  if (step === "success") {
    return renderCard(
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
        <h3 style={{ color: "#fff", fontSize: "18px", marginBottom: "12px" }}>Password Reset Successful</h3>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "24px", lineHeight: "1.6" }}>
          Your password has been updated successfully. You may now log in with your new password.
        </p>
        <button className="login-btn" onClick={() => navigate("/login")}>
          Return to Login
        </button>
      </div>
    );
  }

  return null;
}

export default ForgotPassword;