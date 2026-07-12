import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import "../styles/createAccount.css";
import AppToast from "../components/appToast";
import PasswordCriteria from "../components/passwordCriteria";
import PasswordInput from "../components/passwordInput";
import { User, Building2, AlertTriangle, Check } from "lucide-react";

const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  const [rootAuthorityOpen, setRootAuthorityOpen] = useState(false);
  const [rootAuthoritySearch, setRootAuthoritySearch] = useState("");

  const filteredRootAuthorities = useMemo(() => {
    const query = rootAuthoritySearch.trim().toLowerCase();
    if (!query) return approvedIssuers;
    return approvedIssuers.filter((root) =>
      [root?.orgName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [approvedIssuers, rootAuthoritySearch]);

  // State to track if issuer submitted
  const [issuerSubmitted, setIssuerSubmitted] = useState(false);

  // REG-UI1: issuer registration is a 3-step wizard (1 Basic → 2 Governance → 3 Docs).
  // Each step is a prerequisite to the next; Part 3's required docs depend on the
  // category chosen in Part 2, so forcing the order matches the real data dependency.
  const [wizardStep, setWizardStep] = useState(1);
  const [checkingEmail, setCheckingEmail] = useState(false); // REG: Step 1→2 email gate
  const ISSUER_STEPS = [
    { n: 1, label: "Basic Details" },
    { n: 2, label: "Governance" },
    { n: 3, label: "Documents" },
  ];
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
    setRootAuthorityOpen(false);
    setRootAuthoritySearch("");
    setWizardStep(1);
  };

  // UAT: signup email-OTP gate state (verify email ownership BEFORE the account is created).
  const [userOtpStep, setUserOtpStep] = useState(false);
  const [userOtp, setUserOtp] = useState("");

  // ========== USER FORM HANDLERS ==========
  const handleUserChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const submitUser = async (e) => {
    e.preventDefault();
    setUserError("");

    if (user.password !== user.confirmPassword) {
      setUserError("User passwords do not match.");
      return;
    }
    if (user.password.length < 10) {
      setUserError("Password must be at least 10 characters.");
      return;
    }
    if (!user.email) {
      setUserError("Email is required.");
      return;
    }
    if (!VALID_EMAIL_REGEX.test(String(user.email).trim())) {
      setUserError("Please enter a valid email address (e.g., name@example.com).");
      return;
    }

    // UAT: email-verify before creating the account — send a 6-digit code, then confirm it below.
    setUserLoading(true);
    try {
      await apiService.requestSignupOtp(String(user.email).trim().toLowerCase());
      setUserOtp("");
      setUserOtpStep(true);
      showToast("We sent a 6-digit code to your email.");
    } catch (err) {
      setUserError(err.response?.data?.message || "Could not send the verification code. Please try again.");
    } finally {
      setUserLoading(false);
    }
  };

  // UAT: step 2 — confirm the emailed code, then create the account with the proof token.
  const confirmUserSignup = async () => {
    setUserError("");
    if (!/^\d{6}$/.test(userOtp)) {
      setUserError("Enter the 6-digit code we emailed you.");
      return;
    }
    setUserLoading(true);
    try {
      const otpRes = await apiService.confirmSignupOtp(String(user.email).trim().toLowerCase(), userOtp);
      const signupToken = otpRes?.signupToken;
      if (!signupToken) {
        setUserError("Verification failed. Please try again.");
        setUserLoading(false);
        return;
      }
      const response = await apiService.registerUser({
        username: user.fullName,
        email: user.email,
        password: user.password,
        role: "user",
        org: "org1",
        signupToken,
      });

      if (response.success) {
        showToast("Account created successfully! Redirecting to login...");
        setTimeout(
          () => navigate("/login", { state: { successMessage: "Account created successfully! Please log in." } }),
          900
        );
      } else {
        setUserError(response.message || response.error || "Registration failed.");
      }
    } catch (err) {
      setUserError(err.response?.data?.message || "Registration failed.");
    } finally {
      setUserLoading(false);
    }
  };

  // UAT: resend the signup code (same rate-limit window applies server-side).
  const handleResendSignupOtp = async () => {
    setUserError("");
    setUserLoading(true);
    try {
      await apiService.requestSignupOtp(String(user.email).trim().toLowerCase());
      showToast("A new code has been sent to your email.");
    } catch (err) {
      setUserError(err.response?.data?.message || "Could not resend the code.");
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

      // Use the PUBLIC root-authorities endpoint — registration happens before the user has a
      // token, and /admin/approved-issuers is now admin-only (M2 — Phase 5 hardening).
      const response = await apiService.getPublicRootAuthorities?.();

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
      setRootAuthorityOpen(false);
      setRootAuthoritySearch("");
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
        setRootAuthoritySearch("");
        setRootAuthorityOpen(false);
      }

      // F06: the required-documents checklist depends on category + issuer type.
      // When either changes, drop any already-attached files so stale/duplicate
      // documents can't silently ride along to the wrong application (categories
      // can share a doc key, e.g. board_resolution_chaincert_authorization).
      if (name === "category" || name === "issuerType") {
        updated.documentsByType = {};
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

  // REG-UI1: per-step validation. Returns an error string, or "" if the step is valid.
  const validateStep1 = () => {
    if (
      !issuer.orgName ||
      !issuer.contactName ||
      !issuer.email ||
      !issuer.password ||
      !issuer.confirmPassword
    ) {
      return "All basic fields are required.";
    }
    if (!VALID_EMAIL_REGEX.test(String(issuer.email).trim())) {
      return "Please enter a valid email address (e.g., name@example.com).";
    }
    if (issuer.password !== issuer.confirmPassword) {
      return "Issuer passwords do not match.";
    }
    if (issuer.password.length < 10) {
      return "Password must be at least 10 characters.";
    }
    return "";
  };

  const validateStep2 = () => {
    if (!issuer.issuerType) return "Issuer type is required.";
    if (!issuer.category) return "Category is required.";
    if (issuer.issuerType === "subordinate" && !issuer.rootAuthorityId) {
      return "Please select a root authority.";
    }
    return "";
  };

  const goToNextStep = async () => {
    setIssuerError("");
    if (wizardStep === 1) {
      const err = validateStep1();
      if (err) return setIssuerError(err);
      // REG: block advancing to Part 2 if the email is already registered.
      setCheckingEmail(true);
      try {
        const resp = await apiService.checkEmailAvailability(issuer.email);
        if (resp && resp.available === false) {
          setIssuerError("This email is already registered. Please use a different email or log in instead.");
          return;
        }
      } catch (err2) {
        // Network/server hiccup: don't hard-block — the final submit still re-checks.
        console.warn("Email availability check failed:", err2?.response?.data?.message || err2?.message);
      } finally {
        setCheckingEmail(false);
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      const err = validateStep2();
      if (err) return setIssuerError(err);
      setWizardStep(3);
    }
  };

  const goToPrevStep = () => {
    setIssuerError("");
    setWizardStep((s) => Math.max(1, s - 1));
  };

  const submitIssuer = async (e) => {
    e.preventDefault();

    // Before the final step, a submit (e.g. pressing Enter) just advances the wizard.
    if (wizardStep < 3) {
      goToNextStep();
      return;
    }

    setIssuerError("");
    setIssuerLoading(true);
    setIssuerSubmitted(false);

    // Final guard: re-validate the earlier steps before sending.
    const step1Err = validateStep1();
    if (step1Err) {
      setIssuerError(step1Err);
      setWizardStep(1);
      setIssuerLoading(false);
      return;
    }
    const step2Err = validateStep2();
    if (step2Err) {
      setIssuerError(step2Err);
      setWizardStep(2);
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
              <div className="role-icon"><User size={28} aria-hidden="true" /></div>
              <h3>Register as User</h3>
              <p>Submit and view credentials</p>
            </button>

            <button
              className="role-button issuer-role-btn"
              onClick={() => handleRoleSelection("issuer")}
            >
              <div className="role-icon"><Building2 size={28} aria-hidden="true" /></div>
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
              <PasswordInput
                name="password"
                value={user.password}
                onChange={handleUserChange}
                placeholder="Choose a strong password"
                required
              />
              <PasswordCriteria password={user.password} confirmPassword={user.confirmPassword} />
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <PasswordInput
                name="confirmPassword"
                value={user.confirmPassword}
                onChange={handleUserChange}
                placeholder="Confirm password"
                required
              />
            </div>

            {userError && (
              <div className="form-error">
                <AlertTriangle size={14} aria-hidden="true" /> {userError}
              </div>
            )}

            {!userOtpStep ? (
              <button type="submit" className="btn-primary" disabled={userLoading}>
                {userLoading ? "Sending code..." : "Create User Account"}
              </button>
            ) : (
              <div className="signup-otp-gate" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                <div className="input-group">
                  <label>Enter the 6-digit code we emailed to <strong style={{ color: "var(--text)" }}>{user.email}</strong></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={userOtp}
                    onChange={(e) => setUserOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmUserSignup(); } }}
                    autoFocus
                  />
                </div>
                <button type="button" className="btn-primary" onClick={confirmUserSignup} disabled={userLoading}>
                  {userLoading ? "Verifying..." : "Verify & Create Account"}
                </button>
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button type="button" className="btn-link" onClick={handleResendSignupOtp} disabled={userLoading}>Resend code</button>
                  <button type="button" className="btn-link" onClick={() => { setUserOtpStep(false); setUserOtp(""); }}>Use a different email</button>
                </div>
              </div>
            )}
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
              {/* REG-UI1: step indicator */}
              <div className="wizard-stepper">
                {ISSUER_STEPS.map((s, i) => (
                  <React.Fragment key={s.n}>
                    <div
                      className={`wizard-step${wizardStep === s.n ? " active" : ""}${wizardStep > s.n ? " done" : ""}`}
                    >
                      <span className="wizard-step-circle">{wizardStep > s.n ? <Check size={13} aria-hidden="true" /> : s.n}</span>
                      <span className="wizard-step-label">{s.label}</span>
                    </div>
                    {i < ISSUER_STEPS.length - 1 && (
                      <div className={`wizard-connector${wizardStep > s.n ? " done" : ""}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* STEP 1 — PART 1: BASIC DETAILS */}
              {wizardStep === 1 && (
              <>
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
                  <PasswordInput
                    name="password"
                    value={issuer.password}
                    onChange={handleIssuerChange}
                    placeholder="Choose a strong password"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Confirm Password</label>
                  <PasswordInput
                    name="confirmPassword"
                    value={issuer.confirmPassword}
                    onChange={handleIssuerChange}
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
              <PasswordCriteria password={issuer.password} confirmPassword={issuer.confirmPassword} />

              </>
              )}

              {/* STEP 2 — PART 2: GOVERNANCE DETAILS */}
              {wizardStep === 2 && (
              <>
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

              {/* Legend: explain the two issuer tiers before they pick one */}
              <div className="form-legend">
                <p>
                  <strong>Root Authority</strong> — a sovereign institution (e.g., a
                  university or government body) with its own blockchain identity. It can
                  approve and oversee subordinate issuers under it.
                </p>
                <p>
                  <strong>Subordinate Issuer</strong> — a unit operating under a root
                  authority (e.g., a college, department, or training arm). It issues under
                  the root's umbrella and must be approved by its chosen root authority first.
                </p>
              </div>

              {issuer.issuerType === "subordinate" && (
                <div className="input-group">
                  <label>Root Authority</label>
                  <div className="searchable-select-wrapper">
                    <input
                      type="text"
                      name="rootAuthorityId"
                      value={rootAuthoritySearch}
                      onChange={(e) => {
                        setRootAuthoritySearch(e.target.value);
                        setRootAuthorityOpen(true);
                        if (issuer.rootAuthorityId) {
                          setIssuer((prev) => ({ ...prev, rootAuthorityId: "" }));
                        }
                      }}
                      onFocus={() => setRootAuthorityOpen(true)}
                      onBlur={() => setTimeout(() => setRootAuthorityOpen(false), 180)}
                      placeholder={rootIssuersLoading ? "Loading root authorities..." : "Type to search root authorities..."}
                      className="search-select-input"
                      autoComplete="off"
                      required
                    />
                    {issuer.rootAuthorityId && (
                      <button
                        type="button"
                        className="searchable-select-clear"
                        onClick={() => {
                          setRootAuthoritySearch("");
                          setIssuer((prev) => ({ ...prev, rootAuthorityId: "" }));
                          setRootAuthorityOpen(true);
                        }}
                        aria-label="Clear selection"
                      >
                        ✕
                      </button>
                    )}
                    {rootAuthorityOpen && !issuer.rootAuthorityId && (
                      <ul className="searchable-select-list">
                        {filteredRootAuthorities.length > 0 ? (
                          filteredRootAuthorities.map((root) => {
                            const rootId = root.id || root._id;
                            return (
                              <li
                                key={rootId}
                                className="searchable-select-item"
                                onMouseDown={() => {
                                  setIssuer((prev) => ({ ...prev, rootAuthorityId: rootId }));
                                  setRootAuthoritySearch(root.orgName);
                                  setRootAuthorityOpen(false);
                                }}
                              >
                                <span className="searchable-item-name">{root.orgName}</span>
                              </li>
                            );
                          })
                        ) : (
                          <li className="searchable-select-empty">
                            {rootIssuersLoading ? "Loading root authorities..." : "No root authorities found."}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              </>
              )}

              {/* STEP 3 — PART 3: REQUIRED DOCUMENTS */}
              {wizardStep === 3 && (
              <>
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
                    // F06: key by doc + category so the native <input type="file">
                    // re-mounts (and visually clears) whenever the category changes.
                    <div key={`${doc.key}-${issuer.category}`} className="input-group file-input-group">
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

              </>
              )}

              {issuerError && (
                <div className="form-error">
                  <AlertTriangle size={14} aria-hidden="true" /> {issuerError}
                </div>
              )}

              <div className="wizard-nav">
                {wizardStep > 1 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={goToPrevStep}
                    disabled={issuerLoading}
                  >
                    ← Back
                  </button>
                )}
                {wizardStep < 3 ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={goToNextStep}
                    disabled={checkingEmail}
                  >
                    {checkingEmail ? "Checking…" : "Next →"}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={issuerLoading}
                  >
                    {issuerLoading ? "Submitting..." : "Submit Issuer Registration"}
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="issuer-message"> 
              <div className="success-icon-wrapper">
                <div className="success-icon-circle"><Check size={24} aria-hidden="true" /></div>
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
