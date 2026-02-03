import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import "../styles/createAccount.css";

export default function CreateAccount() {
  const navigate = useNavigate();

  // Step state: 'roleSelection', 'userForm', 'issuerForm'
  const [step, setStep] = useState("roleSelection");
  const [selectedRole, setSelectedRole] = useState(null);

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
    documents: null,
  });

  // State to track if issuer submitted
  const [issuerSubmitted, setIssuerSubmitted] = useState(false);
  const [userError, setUserError] = useState("");
  const [issuerError, setIssuerError] = useState("");
  const [userLoading, setUserLoading] = useState(false);
  const [issuerLoading, setIssuerLoading] = useState(false);

  // ========== ROLE SELECTION HANDLERS ==========
  const handleRoleSelection = (role) => {
    setSelectedRole(role);
    if (role === "user") {
      setStep("userForm");
    } else {
      setStep("issuerForm");
    }
  };

  const handleGoBack = () => {
    setStep("roleSelection");
    setSelectedRole(null);
    setUserError("");
    setIssuerError("");
    setUser({ fullName: "", email: "", password: "", confirmPassword: "" });
    setIssuer({
      orgName: "",
      contactName: "",
      email: "",
      password: "",
      confirmPassword: "",
      documents: null,
    });
    setIssuerSubmitted(false);
  };

  // ========== USER FORM HANDLERS ==========
  const handleUserChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const submitUser = async (e) => {
    e.preventDefault();
    setUserError("");
    console.log("USER SUBMIT FIRED", user);

    if (user.password !== user.confirmPassword) {
      setUserError("User passwords do not match.");
      return;
    }
    if (!user.email) {
      setUserError("Email is required.");
      return;
    }

    setUserLoading(true);
    try {
      console.log("CALLING USER REGISTRATION API");
      const response = await apiService.registerUser({
        // FIX: backend expects "username", not "fullName"
        username: user.fullName,
        email: user.email,
        password: user.password,
        role: "user",
        org: "org1", // optional, but matches backend default
      });

      if (response.success) {
        alert("User registration successful!");
        navigate("/login");
      } else {
        setUserError(
          response.message || response.error || "Registration failed."
        );
      }
    } catch (err) {
      console.log("USER REGISTRATION ERROR", err);
      setUserError(err.response?.data?.message || "Registration failed.");
    } finally {
      setUserLoading(false);
    }
  };

  // ========== ISSUER FORM HANDLERS ==========
  const handleIssuerChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "documents") {
      setIssuer({ ...issuer, documents: files });
    } else {
      setIssuer({ ...issuer, [name]: value });
    }
  };

  const submitIssuer = async (e) => {
    e.preventDefault();
    setIssuerError("");
    setIssuerLoading(true);
    setIssuerSubmitted(false); // ensure success state is reset

    if (issuer.password !== issuer.confirmPassword) {
      setIssuerError("Issuer passwords do not match.");
      setIssuerLoading(false);
      return;
    }

    if (!issuer.orgName || !issuer.contactName || !issuer.email) {
      setIssuerError("All fields are required.");
      setIssuerLoading(false);
      return;
    }

    try {
      console.log("CALLING ISSUER REGISTRATION API");

      // Prepare FormData for file upload
      const formData = new FormData();
      formData.append("orgName", issuer.orgName);
      formData.append("contactName", issuer.contactName);
      formData.append("email", issuer.email);
      formData.append("password", issuer.password);
      formData.append("confirmPassword", issuer.confirmPassword);

      if (issuer.documents && issuer.documents.length > 0) {
        for (let i = 0; i < issuer.documents.length; i++) {
          formData.append("documents", issuer.documents[i]);
        }
      }

      const response = await apiService.registerIssuer(formData);

      // Backend returns success:true ONLY if accredited (after controller fix)
      if (response?.success && response?.accredited === true) {
        setIssuerSubmitted(true); // show the “waitlisted” card ONLY for accredited orgs
        setIssuerLoading(false);
        return;
      }

      // Any other shape is a failure
      setIssuerError(
        response?.message || response?.error || "Registration failed."
      );
      setIssuerLoading(false);
    } catch (err) {
      console.error("ISSUER REGISTRATION ERROR", err);

      if (err?.response?.status === 403) {
        setIssuerError(
          "Your organization is not accredited. Registration denied."
        );
        setIssuerSubmitted(false);
        setIssuerLoading(false);
        return;
      }

      if (err?.response?.status === 400) {
        setIssuerError(err.response.data?.message || "Invalid input.");
      } else {
        setIssuerError(
          err.response?.data?.message ||
            err.message ||
            "Server error. Please try again later."
        );
      }

      setIssuerSubmitted(false);
      setIssuerLoading(false);
    }
  };

  // ========== ROLE SELECTION SCREEN ==========
  if (step === "roleSelection") {
    return (
      <div className="create-account-wrapper role-selection-wrapper">
        <div className="role-selection-container">
          <h1>What would you like to register as?</h1>
          <p>Choose your role to continue with registration</p>

          <div className="role-buttons">
            <button
              className="role-button user-role-btn"
              onClick={() => handleRoleSelection("user")}
            >
              <div className="role-icon">👤</div>
              <h3>Register as User</h3>
              <p>Submit and view credentials</p>
            </button>

            <button
              className="role-button issuer-role-btn"
              onClick={() => handleRoleSelection("issuer")}
            >
              <div className="role-icon">🏢</div>
              <h3>Register as Issuer</h3>
              <p>Create and manage credentials</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== USER REGISTRATION FORM ==========
  if (step === "userForm") {
    return (
      <div className="create-account-wrapper">
        <button className="back-button" onClick={handleGoBack}>
          ← Back
        </button>

        <div className="form-card">
          <h2>User Registration</h2>
          <form onSubmit={submitUser} method="post">
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
            {userError && (
              <div style={{ color: "red", marginBottom: "8px" }}>
                {userError}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={userLoading}>
              {userLoading ? "Creating Account..." : "Create User Account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ========== ISSUER REGISTRATION FORM ==========
  if (step === "issuerForm") {
    return (
      <div className="create-account-wrapper">
        <button className="back-button" onClick={handleGoBack}>
          ← Back
        </button>

        <div className="form-card">
          <h2>Issuer Registration</h2>
          {!issuerSubmitted ? (
            <form onSubmit={submitIssuer} method="post">
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
              <label>Supporting Documents (optional)</label>
              <input
                name="documents"
                type="file"
                multiple
                onChange={handleIssuerChange}
                accept=".pdf,.jpg,.png"
              />
              {issuerError && (
                <div style={{ color: "red", marginBottom: "8px" }}>
                  {issuerError}
                </div>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={issuerLoading}
              >
                {issuerLoading ? "Submitting..." : "Submit Issuer Registration"}
              </button>
            </form>
          ) : (
            <div className="issuer-message">
              <p>✅ Your registration has been submitted!</p>
              <p>
                You are waitlisted and your registration is subject to approval.
              </p>
              <p>Please wait for confirmation from the admin team.</p>
              <button className="btn-primary" onClick={() => navigate("/")}>
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
