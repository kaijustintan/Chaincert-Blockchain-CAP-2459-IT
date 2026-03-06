import React, { useEffect, useState } from "react";
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
    issuerType: "root",
    category: "",
    rootAuthorityId: "",
    documentsByType: {},
  });

  // Dynamic issuer helper state
  const [requiredDocuments, setRequiredDocuments] = useState([]);
  const [approvedIssuers, setApprovedIssuers] = useState([]);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [rootIssuersLoading, setRootIssuersLoading] = useState(false);

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
    setRequiredDocuments([]);
    setApprovedIssuers([]);
    setUser({ fullName: "", email: "", password: "", confirmPassword: "" });
    setIssuer({
      orgName: "",
      contactName: "",
      email: "",
      password: "",
      confirmPassword: "",
      issuerType: "root",
      category: "",
      rootAuthorityId: "",
      documentsByType: {},
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
        username: user.fullName,
        email: user.email,
        password: user.password,
        role: "user",
        org: "org1",
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

  // ========== ISSUER FORM HELPERS ==========
  const formatDocumentLabel = (docKey) => {
    return String(docKey || "")
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const fetchApprovedIssuers = async () => {
    try {
      setRootIssuersLoading(true);
      setIssuerError("");

      // Reuse existing backend flow for approved issuers if available.
      // Expected flexible shapes:
      // 1) array directly
      // 2) { data: [...] }
      // 3) { issuers: [...] }
      const response = await apiService.getApprovedIssuers?.();

      let issuersList = [];
      if (Array.isArray(response)) {
        issuersList = response;
      } else if (Array.isArray(response?.data)) {
        issuersList = response.data;
      } else if (Array.isArray(response?.issuers)) {
        issuersList = response.issuers;
      }

      setApprovedIssuers(issuersList);
    } catch (err) {
      console.error("Error fetching approved issuers:", err);
      setApprovedIssuers([]);
      setIssuerError(
        err.response?.data?.message ||
          "Failed to load approved root authorities."
      );
    } finally {
      setRootIssuersLoading(false);
    }
  };

  const fetchCategoryRequirements = async (categoryValue, issuerTypeValue) => {
    if (!categoryValue) {
      setRequiredDocuments([]);
      return;
    }

    try {
      setRequirementsLoading(true);
      setIssuerError("");

      const response = await apiService.getIssuerRequirementsByCategory(
        categoryValue
      );

      let docs = response?.requiredDocuments || [];

      if (issuerTypeValue === "subordinate") {
        docs = [...docs, "root_authorization_letter"];
      }

      setRequiredDocuments(docs);
    } catch (err) {
      console.error("Error fetching issuer requirements:", err);
      setRequiredDocuments([]);
      setIssuerError(
        err.response?.data?.message ||
          "Failed to load required documents for the selected category."
      );
    } finally {
      setRequirementsLoading(false);
    }
  };

  // Re-fetch requirements whenever category or issuerType changes
  useEffect(() => {
    if (step !== "issuerForm") return;

    fetchCategoryRequirements(issuer.category, issuer.issuerType);

    // Clear uploaded docs that are no longer relevant
    setIssuer((prev) => {
      const currentRequired = [];
      if (prev.category && requiredDocuments.length > 0) {
        currentRequired.push(...requiredDocuments);
      }

      // Since requiredDocuments updates async, keep current docs for now.
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuer.category, issuer.issuerType, step]);

  // Fetch approved issuers only when subordinate is selected
  useEffect(() => {
    if (step !== "issuerForm") return;
    if (issuer.issuerType === "subordinate") {
      fetchApprovedIssuers();
    } else {
      setApprovedIssuers([]);
      setIssuer((prev) => ({ ...prev, rootAuthorityId: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuer.issuerType, step]);

  // ========== ISSUER FORM HANDLERS ==========
  const handleIssuerChange = (e) => {
    const { name, value } = e.target;

    setIssuer((prev) => {
      const updated = { ...prev, [name]: value };

      // If issuerType changes away from subordinate, clear rootAuthorityId
      if (name === "issuerType" && value !== "subordinate") {
        updated.rootAuthorityId = "";
      }

      return updated;
    });
  };

  const handleIssuerDocumentChange = (docType, file) => {
    setIssuer((prev) => ({
      ...prev,
      documentsByType: {
        ...prev.documentsByType,
        [docType]: file || null,
      },
    }));
  };

  const submitIssuer = async (e) => {
    e.preventDefault();
    setIssuerError("");
    setIssuerLoading(true);
    setIssuerSubmitted(false);

    if (issuer.password !== issuer.confirmPassword) {
      setIssuerError("Issuer passwords do not match.");
      setIssuerLoading(false);
      return;
    }

    if (
      !issuer.orgName ||
      !issuer.contactName ||
      !issuer.email ||
      !issuer.password ||
      !issuer.confirmPassword
    ) {
      setIssuerError("All basic fields are required.");
      setIssuerLoading(false);
      return;
    }

    if (!issuer.issuerType) {
      setIssuerError("Issuer type is required.");
      setIssuerLoading(false);
      return;
    }

    if (!issuer.category) {
      setIssuerError("Category is required.");
      setIssuerLoading(false);
      return;
    }

    if (
      issuer.issuerType === "subordinate" &&
      !issuer.rootAuthorityId
    ) {
      setIssuerError("Please select a root authority.");
      setIssuerLoading(false);
      return;
    }

    const missingDocuments = requiredDocuments.filter(
      (docKey) => !issuer.documentsByType?.[docKey]
    );

    if (missingDocuments.length > 0) {
      setIssuerError(
        `Please upload all required documents: ${missingDocuments
          .map(formatDocumentLabel)
          .join(", ")}`
      );
      setIssuerLoading(false);
      return;
    }

    try {
      console.log("CALLING ISSUER REGISTRATION API");

      const formData = new FormData();
      formData.append("orgName", issuer.orgName);
      formData.append("contactName", issuer.contactName);
      formData.append("email", issuer.email);
      formData.append("password", issuer.password);
      formData.append("confirmPassword", issuer.confirmPassword);
      formData.append("issuerType", issuer.issuerType);
      formData.append("category", issuer.category);

      if (issuer.issuerType === "subordinate") {
        formData.append("rootAuthorityId", issuer.rootAuthorityId);
      }

      requiredDocuments.forEach((docKey) => {
        const file = issuer.documentsByType?.[docKey];
        if (file) {
          formData.append(docKey, file);
        }
      });

      const response = await apiService.registerIssuer(formData);

      if (response?.success) {
        setIssuerSubmitted(true);
        setIssuerLoading(false);
        return;
      }

      setIssuerError(
        response?.message || response?.error || "Registration failed."
      );
      setIssuerLoading(false);
    } catch (err) {
      console.error("ISSUER REGISTRATION ERROR", err);

      if (err?.response?.status === 403) {
        setIssuerError(err.response?.data?.message || "Access denied.");
        setIssuerSubmitted(false);
        setIssuerLoading(false);
        return;
      }

      if (err?.response?.status === 400) {
        const backendMessage =
          err.response?.data?.message || "Invalid input.";
        const missingDocs = err.response?.data?.missingDocuments;

        if (Array.isArray(missingDocs) && missingDocs.length > 0) {
          setIssuerError(
            `${backendMessage} Missing: ${missingDocs
              .map(formatDocumentLabel)
              .join(", ")}`
          );
        } else {
          setIssuerError(backendMessage);
        }
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
              {/* PART 1: BASIC DETAILS */}
              <h3>Part 1: Basic Details</h3>

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

              {/* PART 2: GOVERNANCE DETAILS */}
              <h3 style={{ marginTop: "20px" }}>Part 2: Governance Details</h3>

              <label>Issuer Type</label>
              <select
                name="issuerType"
                value={issuer.issuerType}
                onChange={handleIssuerChange}
                required
              >
                <option value="root">Root Authority</option>
                <option value="subordinate">Subordinate Issuer</option>
              </select>

              <label>Category</label>
              <select
                name="category"
                value={issuer.category}
                onChange={handleIssuerChange}
                required
              >
                <option value="">-- Select category --</option>
                <option value="university">University</option>
                <option value="government">Government</option>
                <option value="training_provider">Training Provider</option>
                <option value="industry_certifier">Industry Certifier</option>
              </select>

              {issuer.issuerType === "subordinate" && (
                <>
                  <label>Root Authority</label>
                  <select
                    name="rootAuthorityId"
                    value={issuer.rootAuthorityId}
                    onChange={handleIssuerChange}
                    required
                  >
                    <option value="">
                      {rootIssuersLoading
                        ? "Loading root authorities..."
                        : "-- Select root authority --"}
                    </option>

                    {approvedIssuers.map((root) => (
                      <option key={root.id || root._id} value={root.id || root._id}>
                        {root.orgName || root.contactName || root.email}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* PART 3: REQUIRED DOCUMENTS */}
              <h3 style={{ marginTop: "20px" }}>Part 3: Required Documents</h3>

              {!issuer.category && (
                <p style={{ color: "#666", marginBottom: "12px" }}>
                  Select a category first to load required documents.
                </p>
              )}

              {requirementsLoading && (
                <p style={{ color: "#666", marginBottom: "12px" }}>
                  Loading document requirements...
                </p>
              )}

              {!requirementsLoading && issuer.category && requiredDocuments.length > 0 && (
                <>
                  <p style={{ marginBottom: "12px" }}>
                    Please upload all required documents below.
                  </p>

                  {requiredDocuments.map((docKey) => (
                    <div key={docKey} style={{ marginBottom: "14px" }}>
                      <label>{formatDocumentLabel(docKey)}</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleIssuerDocumentChange(
                            docKey,
                            e.target.files?.[0] || null
                          )
                        }
                        required
                      />
                      {issuer.documentsByType?.[docKey] && (
                        <small style={{ display: "block", marginTop: "4px" }}>
                          Selected: {issuer.documentsByType[docKey].name}
                        </small>
                      )}
                    </div>
                  ))}
                </>
              )}

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

              {issuer.issuerType === "subordinate" ? (
                <>
                  <p>
                    Your subordinate issuer application is now pending root
                    authority review.
                  </p>
                  <p>
                    Once approved by the selected root authority, it will proceed
                    to ChainCert admin review.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    You are waitlisted and your registration is subject to admin
                    approval.
                  </p>
                  <p>Please wait for confirmation from the admin team.</p>
                </>
              )}

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