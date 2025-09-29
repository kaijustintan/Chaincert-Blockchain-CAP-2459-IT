// createAccount.js

// CreateAccount.js

// CreateAccount.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/createAccount.css';



export default function CreateAccount() {
  const navigate = useNavigate();

  // User form state
  const [user, setUser] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Issuer form state
  const [issuer, setIssuer] = useState({
    orgName: "",
    contactName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    documents: null,
  });

  // State to track if issuer submitted
  const [issuerSubmitted, setIssuerSubmitted] = useState(false);

  const handleUserChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleIssuerChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "documents") {
      setIssuer({ ...issuer, documents: files });
    } else {
      setIssuer({ ...issuer, [name]: value });
    }
  };

  const submitUser = (e) => {
    e.preventDefault();
    if (user.password !== user.confirmPassword) {
      alert("User passwords do not match.");
      return;
    }
    console.log("Create user payload:", user);

    // ✅ After success, go back to login
    navigate("/login");
  };

  const submitIssuer = (e) => {
    e.preventDefault();
    if (issuer.password !== issuer.confirmPassword) {
      alert("Issuer passwords do not match.");
      return;
    }
    console.log("Create issuer payload:", issuer);

    // ✅ Show waitlist message instead of redirecting right away
    setIssuerSubmitted(true);
  };

  return (
    <div className="create-account-wrapper">
      {/* USER REGISTRATION */}
      <div className="form-card">
        <h2>User Registration</h2>
        <form onSubmit={submitUser}>
          <label>Full Name</label>
          <input
            name="fullName"
            value={user.fullName}
            onChange={handleUserChange}
            placeholder="Juan Dela Cruz"
            required
          />

          <label>Email</label>
          <input
            name="email"
            type="email"
            value={user.email}
            onChange={handleUserChange}
            placeholder="you@example.com"
            required
          />

          <label>Password</label>
          <input
            name="password"
            type="password"
            value={user.password}
            onChange={handleUserChange}
            placeholder="Choose a strong password"
            required
          />

          <label>Confirm Password</label>
          <input
            name="confirmPassword"
            type="password"
            value={user.confirmPassword}
            onChange={handleUserChange}
            placeholder="Confirm password"
            required
          />

          <button type="submit" className="btn-primary">Create User Account</button>
        </form>
      </div>

      {/* ISSUER REGISTRATION */}
      <div className="form-card">
        <h2>Issuer Registration</h2>

        {!issuerSubmitted ? (
          <form onSubmit={submitIssuer}>
            <label>Organization Name</label>
            <input
              name="orgName"
              value={issuer.orgName}
              onChange={handleIssuerChange}
              placeholder="University / Company"
              required
            />

            <label>Contact Person</label>
            <input
              name="contactName"
              value={issuer.contactName}
              onChange={handleIssuerChange}
              placeholder="Juan dela Cruz (Registrar)"
              required
            />

            <label>Email</label>
            <input
              name="email"
              type="email"
              value={issuer.email}
              onChange={handleIssuerChange}
              placeholder="contact@school.edu"
              required
            />

            <label>Password</label>
            <input
              name="password"
              type="password"
              value={issuer.password}
              onChange={handleIssuerChange}
              placeholder="Choose a strong password"
              required
            />

            <label>Confirm Password</label>
            <input
              name="confirmPassword"
              type="password"
              value={issuer.confirmPassword}
              onChange={handleIssuerChange}
              placeholder="Confirm password"
              required
            />

            <label>Role / Type</label>
            <select name="role" value={issuer.role} onChange={handleIssuerChange} required>
              <option value="">Select Role</option>
              <option value="certifying_body">Certifying Body</option>
              <option value="training_center">Training Center</option>
              <option value="employer">Employer</option>
            </select>

            <label>Supporting Documents (optional)</label>
            <input
              name="documents"
              type="file"
              multiple
              onChange={handleIssuerChange}
              accept=".pdf,.jpg,.png"
            />

            <button type="submit" className="btn-primary">Create Issuer Account</button>
          </form>
        ) : (
          <div className="issuer-message">
            <p>
              ✅ Your registration has been submitted.  
              You are waitlisted and your registration is subject to approval.  
              Please wait for confirmation from the admin team.
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
