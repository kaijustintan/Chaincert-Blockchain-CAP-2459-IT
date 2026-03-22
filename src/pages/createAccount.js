import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import "../styles/createAccount.css";
import AppToast from "../components/appToast";

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
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

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
        showToast("Account created successfully! Redirecting to login...");
        setTimeout(
          () => navigate("/login", { state: { successMessage: "Account created successfully! Please log in." } }),
          900
        ); /* CSS-CHANGE: redirect to login after success - polo */
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
  const customLabels = {
    ched_recognition_or_government_recognition:
      "CHED / Government Recognition",
    legal_personality_document:
      "Legal Personality Document",
    board_resolution_chaincert_authorization:
      "Board Resolution – ChainCert Authorization",
    quality_accreditation_certificate_optional:
      "Quality Accreditation Certificate (Optional)",

    legal_creation_instrument:
      "Legal Creation Instrument",
    mandate_or_function_document:
      "Mandate / Function Document",
    office_order_chaincert_authorization:
      "Office Order / Memorandum – ChainCert Authorization",
    sample_official_credential_template:
      "Sample Official Credential Template",

    sec_or_dti_registration:
      "SEC or DTI Registration",
    lgu_business_permit:
      "LGU Business / Mayor’s Permit",
    tesda_copr_or_equivalent_program_approval:
      "TESDA CoPR / Program Approval",
    program_brief_or_training_regulation_alignment:
      "Program Brief / Training Regulation Alignment",

    sec_registration_or_charter:
      "SEC Registration or Charter",
    industry_or_professional_recognition:
      "Industry / Professional Recognition",
    documented_certification_scheme_iso17024_aligned:
      "Documented Certification Scheme (ISO/IEC 17024-aligned)",
    board_resolution_chaincert_and_scheme_approval:
      "Board Resolution – Scheme & ChainCert Approval",

    root_authorization_letter:
      "Root Authority Authorization Letter"
  };

  if (customLabels[docKey]) return customLabels[docKey];

  return String(docKey || "")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getDocumentDescription = (docKey) => {
  const descriptions = {
    ched_recognition_or_government_recognition:
      "Copy of CHED Government or Institutional Recognition confirming authority to operate and grant degrees.",

    legal_personality_document:
      "SEC Certificate of Incorporation or charter establishing the institution's legal existence.",

    board_resolution_chaincert_authorization:
      "Board resolution authorizing participation in ChainCert and designating officials responsible for issuing credentials.",

    quality_accreditation_certificate_optional:
      "Optional accreditation certificate from a recognized accrediting body (e.g., PAASCU, PACUCOA, AACCUP).",

    legal_creation_instrument:
      "Republic Act, Executive Order, or local ordinance formally creating the government office or agency.",

    mandate_or_function_document:
      "Official documentation showing the agency's mandate to issue the relevant credentials.",

    office_order_chaincert_authorization:
      "Office Order designating officials authorized to issue credentials through ChainCert.",

    sample_official_credential_template:
      "Sample certificate, license, or eligibility document currently issued by the agency.",

    sec_or_dti_registration:
      "SEC Certificate of Incorporation or DTI Business Registration.",

    lgu_business_permit:
      "Latest Mayor’s or LGU Business Permit confirming authority to operate.",

    tesda_copr_or_equivalent_program_approval:
      "TESDA Certificate of Program Registration (CoPR) or equivalent accreditation.",

    program_brief_or_training_regulation_alignment:
      "Program description showing learning outcomes, curriculum, and alignment with standards.",

    sec_registration_or_charter:
      "SEC certificate or charter establishing the certification body's legal existence.",

    industry_or_professional_recognition:
      "Evidence of recognition from professional or industry bodies.",

    documented_certification_scheme_iso17024_aligned:
      "Documentation describing the certification scheme aligned with ISO/IEC 17024 principles.",

    board_resolution_chaincert_and_scheme_approval:
      "Board resolution approving the certification scheme and ChainCert participation.",

    root_authorization_letter:
      "Formal letter from the root authority authorizing the subordinate issuer to operate under its supervision."
  };

  return descriptions[docKey] || "";
};



  const fetchApprovedIssuers = async () => {
    try {
      setRootIssuersLoading(true);
      setIssuerError("");

      const response = await apiService.getApprovedIssuers?.();

      let issuersList = [];
      if (Array.isArray(response)) {
        issuersList = response;
      } else if (Array.isArray(response?.data)) {
        issuersList = response.data;
      } else if (Array.isArray(response?.issuers)) {
        issuersList = response.issuers;
      }

      const rootOnlyIssuers = issuersList.filter(
        (issuer) => {
          const t = String(issuer.issuerType || '').toLowerCase();
          return t === 'root' || t === 'root_authority';
        }
      );
      setApprovedIssuers(rootOnlyIssuers);
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
          const alreadyHasRootAuth = docs.some(
            (doc) => doc.key === "root_authorization_letter"
          );

          if (!alreadyHasRootAuth) {
            docs = [
              ...docs,
              {
                key: "root_authorization_letter",
                label: "Root Authority Authorization Letter",
                description:
                  "Formal letter from the root authority authorizing the subordinate issuer to operate under its supervision."
              }
            ];
          }
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

    setIssuer((prev) => {
      const currentRequired = [];
      if (prev.category && requiredDocuments.length > 0) {
        currentRequired.push(...requiredDocuments);
      }
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
      (doc) => !issuer.documentsByType?.[doc.key]
    );

    if (missingDocuments.length > 0) {
      setIssuerError(
        `Please upload all required documents: ${missingDocuments
          .map((doc) => doc.label)
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

      requiredDocuments.forEach((doc) => {
        const file = issuer.documentsByType?.[doc.key];
        if (file) {
          formData.append(doc.key, file);
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
      <>
        <AppToast show={toast.show} message={toast.message} type={toast.type} />
        <div className="create-account-wrapper role-selection-wrapper">
        <div className="role-selection-container">
          {/* CSS-CHANGE: added brand name and improved heading - polo */}
          <h1 className="register-brand">ChainCert</h1>
          <h2 className="register-heading">Create an Account</h2>
          <p className="register-subtitle">Choose your role to continue with registration</p>

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

          {/* CSS-CHANGE: added Return to Login button - polo */}
          <div className="return-login-row">
            <p>Already have an account?</p>
            <button className="btn-return-login" onClick={() => navigate("/login")}>
              Return to Login
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ========== USER REGISTRATION FORM ==========
  if (step === "userForm") {
    return (
      <>
        <AppToast show={toast.show} message={toast.message} type={toast.type} />
        <div className="create-account-wrapper">
        <div className="form-card">
          {/* CSS-CHANGE: brand + heading inside form card - polo */}
          <div className="form-card-header">
            <h1 className="form-brand">ChainCert</h1>
            <h2>User Registration</h2>
            <p className="form-subtitle">Create your credential wallet account</p>
          </div>

          <form onSubmit={submitUser} method="post">
            <div className="input-group">
              <label>Full Name</label>
              <input
                name="fullName"
                value={user.fullName}
                onChange={handleUserChange}
                placeholder="Juan Dela Cruz"
                required
              />
            </div>

            <div className="input-group">
              <label>Email</label>
              <input
                name="email"
                type="email"
                value={user.email}
                onChange={handleUserChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                name="password"
                type="password"
                value={user.password}
                onChange={handleUserChange}
                placeholder="Choose a strong password"
                required
              />
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <input
                name="confirmPassword"
                type="password"
                value={user.confirmPassword}
                onChange={handleUserChange}
                placeholder="Confirm password"
                required
              />
            </div>

            {userError && (
              <div className="form-error">
                <span>⚠️</span> {userError}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={userLoading}>
              {userLoading ? "Creating Account..." : "Create User Account"}
            </button>
          </form>

          {/* CSS-CHANGE: bottom links row - polo */}
          <div className="form-bottom-links">
            <button className="btn-link" onClick={handleGoBack}>← Back to Role Selection</button>
            <button className="btn-link" onClick={() => navigate("/login")}>Return to Login</button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ========== ISSUER REGISTRATION FORM ==========
  if (step === "issuerForm") {
    return (
      <>
        <AppToast show={toast.show} message={toast.message} type={toast.type} />
        <div className="create-account-wrapper">
        <div className="form-card form-card-wide">
          {/* CSS-CHANGE: brand + heading inside form card - polo */}
          <div className="form-card-header">
            <h1 className="form-brand">ChainCert</h1>
            <h2>Issuer Registration</h2>
            <p className="form-subtitle">Apply to become an authorized credential issuer</p>
          </div>

          {!issuerSubmitted ? (
            <form onSubmit={submitIssuer} method="post">
              {/* PART 1: BASIC DETAILS */}
              <div className="form-section-title">Part 1: Basic Details</div>

              <div className="form-grid">
                <div className="input-group">
                  <label>Organization Name</label>
                  <input
                    name="orgName"
                    value={issuer.orgName}
                    onChange={handleIssuerChange}
                    placeholder="University / Company"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Contact Person</label>
                  <input
                    name="contactName"
                    value={issuer.contactName}
                    onChange={handleIssuerChange}
                    placeholder="Juan dela Cruz (Registrar)"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  value={issuer.email}
                  onChange={handleIssuerChange}
                  placeholder="contact@school.edu"
                  required
                />
              </div>

              <div className="form-grid">
                <div className="input-group">
                  <label>Password</label>
                  <input
                    name="password"
                    type="password"
                    value={issuer.password}
                    onChange={handleIssuerChange}
                    placeholder="Choose a strong password"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Confirm Password</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={issuer.confirmPassword}
                    onChange={handleIssuerChange}
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>

              {/* PART 2: GOVERNANCE DETAILS */}
              <div className="form-section-title">Part 2: Governance Details</div>

              <div className="form-grid">
                <div className="input-group">
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
                </div>

                <div className="input-group">
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
                    <option value="others">Others</option> 
                  </select>
                </div>
              </div>

              {issuer.issuerType === "subordinate" && (
                <div className="input-group">
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
                        {root.orgName} ({root.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* PART 3: REQUIRED DOCUMENTS */}
              <div className="form-section-title">Part 3: Required Documents</div>

              {!issuer.category && (
                <p className="form-hint">
                  Select a category first to load required documents.
                </p>
              )}

              {requirementsLoading && (
                <p className="form-hint">
                  Loading document requirements...
                </p>
              )}

              {!requirementsLoading && issuer.category && requiredDocuments.length > 0 && (
                <>
                  <p className="form-hint">
                    Please upload all required documents below.
                  </p>

                  {requiredDocuments.map((doc) => (
                    <div key={doc.key} className="input-group file-input-group">
                      <label>{doc.label}</label>

                      <small className="document-description">
                        {doc.description}
                      </small>

                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleIssuerDocumentChange(
                            doc.key,
                            e.target.files?.[0] || null
                          )
                        }
                        required
                      />
                      {issuer.documentsByType?.[doc.key] && (
                        <small className="file-name-display">
                          Selected: {issuer.documentsByType[doc.key].name}
                        </small>
                      )}
                    </div>
                  ))}
                </>
              )}

              {issuerError && (
                <div className="form-error">
                  <span>⚠️</span> {issuerError}
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
              <div className="success-icon-wrapper">
                <div className="success-icon-circle">✓</div>
              </div>
              <h3>Application Received</h3>

              {issuer.issuerType === "subordinate" ? (
                <div className="issuer-message-body">
                  <p>
                    Your application has been received and is currently pending review
                    by your selected root authority. Upon their approval, it will be
                    forwarded to the ChainCert administration team for final evaluation.
                  </p>
                  <p>
                    Please ensure that your submitted documents are complete and accurate
                    to avoid delays in the review process.
                  </p>
                </div>
              ) : (
                <div className="issuer-message-body">
                  <p>
                    Your application has been successfully submitted and is now under
                    review by the ChainCert administration team. You will be notified
                    once a decision has been made regarding your application.
                  </p>
                  <p>
                    Please allow some time for the review process to be completed.
                    Ensure your contact email is active for any correspondence.
                  </p>
                </div>
              )} 

              <button className="btn-primary" onClick={() => navigate("/login")}>
                Return to Login
              </button>
            </div>
          )}

          {/* CSS-CHANGE: bottom links row - polo */}
          {!issuerSubmitted && (
            <div className="form-bottom-links">
              <button className="btn-link" onClick={handleGoBack}>← Back to Role Selection</button>
              <button className="btn-link" onClick={() => navigate("/login")}>Return to Login</button>
            </div>
          )}
        </div>
      </div>
      </>
    );
  }

  return null;
}