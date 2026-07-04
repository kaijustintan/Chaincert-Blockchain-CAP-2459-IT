# ChainCert — UAT Contents & Capstone Paper Section 6 (Validation and Testing)

**Purpose of this document.** This is a working reference for the group. It contains (A) the full content for the four role-based UAT Google Forms, and (B) fill-in templates for the capstone paper's **Section 6 — Validation and Testing** (per the required outline: 6.1.1 Description, 6.1.2 Results, 6.1.3 Analysis, then Section 7 Conclusion, and the Appendices/Bibliography/Resource Persons/Personal Vitae items). Finalize and paste into the actual forms and the paper as needed.

> **How the pieces connect:** the Google Forms collect the raw data (Pass/Fail per test case + tester ratings). Section 6.1 of the paper *writes up* that data. The same test-case list is used in both places, so author it once here.

---

# PART A — UAT Google Forms Content

There are **four forms, one per role**: Credential Holder, Issuer, Verifier, Admin/Internal. Each form has the same three sections:

1. **Tester Information** (short)
2. **Test Cases** (the role's scenarios — each answered Pass / Fail / remarks)
3. **Experience Rating + Open-Ended Feedback** (shared block, below)

## A.0 — Section 1: Tester Information (all forms)

- Name *(optional)*
- Role you are testing *(pre-filled per form: Holder / Issuer / Verifier / Admin)*
- Date of testing
- Have you used a similar digital-credential or verification system before? *(Yes / No)*

## A.1 — Section 2 format: Test Cases

Each test case below is shown to the tester with its **Scenario** and **Steps**, and the **Expected Result**. For each one the tester answers:

- **Result:** ☐ Passed ☐ Failed
- **Remarks (if failed / any observation):** *short text*

*(In the paper's 6.1.2 Results table, the same rows carry an "Actual Result" and "Status" column.)*

---

### Form 1 — Credential Holder (target ≈ 21 test cases)

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| H-01 | Register a holder account | Create Account → User → fill details → Register | Account is created; redirected to login |
| H-02 | Password strength is enforced | Register using a short/common password | Rejected with a message (min. 10 chars, not a common password) |
| H-03 | Log in as holder | Enter email + password → Login | Redirected to the wallet dashboard |
| H-04 | Empty wallet state | Log in as a new holder with no credentials | Wallet shows an empty state (no credentials yet) |
| H-05 | In-app issuance notification | After an issuer issues to you, open the bell | "You received a new credential" notification appears |
| H-06 | Email issuance notification | Check your email inbox after issuance | An email about the new credential is received |
| H-07 | Credential appears in wallet | Open the wallet | Credential card shows badge, name, issuer, status *Issued* |
| H-08 | Switch Cards / List view | Toggle the view buttons | Layout switches between cards and list |
| H-09 | Search / filter / sort | Use search, status filter, and sort controls | Credential list updates accordingly |
| H-10 | Open credential details | Click a credential | Detail view shows type, description, skills, dates, issuer, Credential ID |
| H-11 | Obtain the Credential ID | Open details | The Credential ID is visible and can be copied |
| H-12 | View blockchain history | Details → View Blockchain History | On-chain timeline shows events with transaction IDs and timestamps |
| H-13 | Toggle visibility Public/Private | Set a credential to Private | Saved; Private credentials are hidden from the shared profile |
| H-14 | Edit profile (bio, picture) | Profile → edit summary / upload picture → Save | Changes are saved |
| H-15 | Reorder credentials on profile | Drag-and-drop to reorder | New order persists on the shared profile |
| H-16 | Generate a public share link | Share Profile → Public link → copy | A working link is generated and copyable |
| H-17 | Generate a recipient-specific link | Share Profile → Specific recipient → enter email | Recipient must enter a 6-digit emailed code before the profile shows |
| H-18 | Revoke a share link | Share Links → Revoke | The link immediately becomes invalid |
| H-19 | Export credential as PDF | Credential → Export PDF | PDF includes details, Credential ID, and a verification link |
| H-20 | Holder insights render | Open Credential Health / Verification Insights / Renewal Alerts | Charts render with a "what this means" note |
| H-21 | Revoked credential reflects in wallet | After an issuer revokes, view the credential | Status shows *Revoked* + a revocation notification appears |
| H-22 | Forgot / reset password | Login → Forgot Password → OTP → new password | OTP email received; password reset succeeds |

### Form 2 — Issuer (target ≈ 16 test cases)

*(Log in with a shared, pre-provisioned issuer account — e.g. `dlsu@email.com`. See demo limit: a newly self-registered issuer cannot actually issue.)*

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| I-01 | Log in as issuer | Enter issuer email + password | Redirected to the Issuer Dashboard |
| I-02 | Home statistics display | Open the dashboard home | Totals for templates / issued / revoked are shown |
| I-03 | Create a credential template | Create Template → fill fields → Create | Template is created; success message shown |
| I-04 | Required fields enforced | Submit a template with a missing field | Blocked with a validation message |
| I-05 | Issue a credential | Issue Credential → select template + recipient → Issue | Success; the holder is notified (in-app + email) |
| I-06 | Duplicate issuance prevented | Try to issue the same template to the same holder again | The holder is not listed as eligible / issuance is blocked |
| I-07 | Issue with an expiry date | Set an expiry date, then issue | Credential is issued carrying that expiry |
| I-08 | View all credentials | Open View All Credentials | Templates + issued credentials listed with their IDs |
| I-09 | Revoke a credential | Revoke Credential → select + reason → Revoke | Success; holder notified; status becomes *Revoked* |
| I-10 | Credential history | Open Credential History | On-chain trail of create / issue / revoke events |
| I-11 | Issuance Performance report | Analytics → Issuance Performance | Chart renders with interpretation |
| I-12 | Revocation Self-Audit report | Analytics → Revocation Self-Audit | Breakdown by template and time-to-revoke buckets |
| I-13 | Issuer onboarding (screens only) | Create Account → Issuer → complete Parts 1–4 → Submit | Application status becomes *Pending* |
| I-14 | Root: view pending subordinates | As `dlsu@email.com` → Subordinate Management → Pending | Pending subordinate applications are listed |
| I-15 | Root: approve/reject subordinate | Open an application → Approve/Reject | Status → *Root Approved* (or rejected); decision logged on-chain |
| I-16 | Change password | Settings → Change Password | Password change succeeds |

### Form 3 — Verifier (target = 9 test cases)

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| V-01 | Access Verify page (no login) | Open the Verify page | Page loads and prompts for verifier identity |
| V-02 | Request email code | Enter name + real email → Send verification code | A 6-digit code is emailed to that address |
| V-03 | Confirm email code | Enter the code → Verify & continue | Access granted; email marked verified |
| V-04 | Invalid/expired code handling | Enter a wrong or old code | An error message is shown; access not granted |
| V-05 | Verify a VALID credential | Paste a valid Credential ID → Verify | **VALID** with issued-to, issuer, status, Credential ID |
| V-06 | Verify a REVOKED credential | Verify a revoked credential's ID | **REVOKED**, with the revocation reason shown |
| V-07 | Verify an EXPIRED credential | Verify a past-expiry credential's ID | **EXPIRED** |
| V-08 | Verify a fake ID | Enter a made-up / non-existent ID | **NOT FOUND** |
| V-09 | Verification is recorded | Complete any verification | The event is logged on-chain (visible to the admin) with time and source |

### Form 4 — Admin / Internal (target ≈ 20 test cases)

*(Items marked **\[internal]** need backend/DB access and are for the dev team, not external testers.)*

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| A-01 | Log in as admin | Enter admin email + password | Redirected to the Admin Dashboard |
| A-02 | Dashboard overview | Open the dashboard | System-wide counts and charts are shown |
| A-03 | Credentials tab — view all | Open Credentials tab | Templates + issued credentials across all issuers |
| A-04 | Filter / search credentials | Apply issuer/type/status filters and search | Results update accordingly |
| A-05 | Integrity check (clean) | Run Integrity Check on untouched data | All records reported as matched |
| A-06 | Integrity check detects tampering **\[internal]** | Alter a CouchDB record in Fauxton → re-run | The tampered record is flagged with the mismatched field |
| A-07 | Issuers tab — pending list | Issuers → Pending | Pending applications shown with sub-filters |
| A-08 | Approve an issuer | Open a pending app → Approve | Status → *Approved*; identity assigned; decision logged |
| A-09 | Reject an issuer | Open a pending app → Reject | Status → *Rejected*; decision logged |
| A-10 | Subordinate gate | Try to approve a subordinate before root approval | Approve is disabled; status shows *Awaiting Root Approval* |
| A-11 | Enable / disable an issuer | Toggle an issuer's status | Status toggles; change logged on-chain |
| A-12 | Enable / disable a user | Users tab → toggle a holder | Status toggles; change logged on-chain |
| A-13 | Verification logs | Logs → Verification | Verification events listed (verifier, credential, result, time) |
| A-14 | Status logs | Logs → Status | Issuer/user enable-disable events listed |
| A-15 | Issuer decision logs | Logs → Issuer Decisions | Approvals/rejections listed with the acting admin's email |
| A-16 | Root subordinate logs | Logs → Root Subordinate | Root authority decisions listed |
| A-17 | Analytics & Reports | Open Analytics & Reports | Verification summary, suspicious activity, demand, integrity insight render |
| A-18 | Credential Dossier | Open a credential's Dossier | Provenance timeline + verification proof trail shown |
| A-19 | Admin attribution | Perform actions as `admin1` and `admin2` | Logs show which admin performed each action |
| A-20 | Change admin password | Settings → Change Password | Succeeds; change is logged on-chain |

---

## A.2 — Section 3: Experience Rating + Open-Ended (shared block, all forms)

**Rating scale (5-point Likert):** 5 = Strongly Agree · 4 = Agree · 3 = Neutral · 2 = Disagree · 1 = Strongly Disagree.

**Core statements (all four forms):**

| # | Criterion | Statement |
|---|---|---|
| R1 | Functionality | The features I tested worked the way I expected. |
| R2 | Usability | The system was easy to use and the screens were easy to understand. |
| R3 | Reliability | The system responded correctly and consistently, without errors. |
| R4 | Efficiency | I was able to complete each task quickly, without unnecessary steps. |
| R5 | Satisfaction | Overall, I am satisfied with this part of the system. |

**Role-specific statements (add to the matching form):**

- **Holder:** "It was clear how to view, share, and control the visibility of my credentials." · "I trust that my credentials are secure and cannot be tampered with."
- **Issuer:** "Creating a template and issuing a credential was straightforward." · "The revoke and history features give me confidence I can manage credentials over time."
- **Verifier:** "Confirming my email and verifying a credential was quick and clear." · "The result (Valid / Revoked / Expired / Not Found) was easy to understand."
- **Admin:** "The oversight tools (logs, integrity check, analytics) gave me a clear view of system activity." · "I could tell whether records were authentic and untampered."

**Open-ended (all forms):**

1. What did you like most about this part of the system?
2. What problems, errors, or confusing parts did you encounter (if any)?
3. What would you suggest to improve it?

---

# PART B — Capstone Paper Section 6 (Validation and Testing)

Below are ready-to-fill templates matching the required outline. Replace every `[ ]` after the UAT is run.

## 6.1 Test Cases

### 6.1.1 Description (Scripts and Tools)

> ChainCert was validated through **User Acceptance Testing (UAT)** — a black-box testing method in which actual end users, rather than the developers, operate the system and confirm that it satisfies their needs. Testers were grouped according to the four system roles — **Credential Holder, Issuer, Verifier, and Administrator** — and each group executed a set of role-specific test scenarios ("test scripts") against the live deployment hosted on the DLSU CCSCloud virtual machine (`http://ccscloud.dlsu.edu.ph:20173`).
>
> For each scenario, the tester followed the documented steps, compared the **actual result** against the **expected result**, and recorded the outcome as **Passed** or **Failed**, with remarks for any failure. After completing the scenarios, each tester rated their experience on a **five-point Likert scale** across five criteria (functionality, usability, reliability, efficiency, and satisfaction) and answered open-ended feedback questions.
>
> **Tools and materials used:**
> - The deployed ChainCert web application (React frontend, Node/Express API, and a Hyperledger Fabric blockchain network with CouchDB).
> - A modern web browser (Chrome / Edge / Firefox).
> - **Google Forms** — used to distribute the role-specific test scripts and to collect tester responses.
> - The **ChainCert User Manual (UAT Edition)** — provided to testers as the step-by-step reference.
>
> Testing was performed **manually** by human testers to reflect real-world use; no automated test scripts were employed. A total of **[N]** testers participated: **[n1]** Holders, **[n2]** Issuers, **[n3]** Verifiers, and **[n4]** Admin/internal testers.

### 6.1.2 Results *(Table Format)*

**Table 6.1 — Functional test results (repeat per role, or combine).** Populate "Actual Result" and "Status" from the UAT responses.

| TC ID | Test Scenario | Expected Result | Actual Result | Status (Pass/Fail) |
|---|---|---|---|---|
| H-01 | Register a holder account | Account created; redirected to login | [ ] | [ ] |
| … | *(paste all Holder, Issuer, Verifier, Admin test cases from Part A)* | | [ ] | [ ] |

**Table 6.2 — Summary of test results by role.**

| Role | Total Test Cases | Passed | Failed | Pass Rate (%) |
|---|---|---|---|---|
| Credential Holder | [22] | [ ] | [ ] | [ ] |
| Issuer | [16] | [ ] | [ ] | [ ] |
| Verifier | [9] | [ ] | [ ] | [ ] |
| Admin / Internal | [20] | [ ] | [ ] | [ ] |
| **Total** | **[67]** | **[ ]** | **[ ]** | **[ ]** |

**Table 6.3 — User acceptance ratings (weighted mean per criterion).** Verbal interpretation uses the scale below.

| Criterion | Holder | Issuer | Verifier | Admin | Overall Mean | Verbal Interpretation |
|---|---|---|---|---|---|---|
| Functionality (R1) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Usability (R2) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Reliability (R3) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Efficiency (R4) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Satisfaction (R5) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Overall** | **[ ]** | **[ ]** | **[ ]** | **[ ]** | **[ ]** | **[ ]** |

**Verbal interpretation of the mean (5-point Likert):**

| Mean Range | Interpretation |
|---|---|
| 4.21 – 5.00 | Strongly Agree — Highly Acceptable |
| 3.41 – 4.20 | Agree — Acceptable |
| 2.61 – 3.40 | Neutral — Moderately Acceptable |
| 1.81 – 2.60 | Disagree — Slightly Acceptable |
| 1.00 – 1.80 | Strongly Disagree — Not Acceptable |

### 6.1.3 Analysis

> Of the **[67]** total test cases executed across the four roles, **[ ]** passed and **[ ]** failed, for an overall pass rate of **[ ]%**. [Discuss the failures: which test cases failed, the nature of each issue (e.g., minor UI/labeling vs. functional), and how they were or will be addressed.]
>
> On the user-acceptance survey, ChainCert obtained an overall weighted mean of **[ ]**, interpreted as **"[ ]"**. The highest-rated criterion was **[ ]** (mean **[ ]**), indicating [ ]; the lowest was **[ ]** (mean **[ ]**), suggesting [area for improvement]. [Summarize open-ended feedback themes: common praise, recurring problems, and notable suggestions.]
>
> These results indicate that ChainCert is **functionally correct** and **acceptable to its intended end users** across all four roles, validating that the system meets its objectives of secure credential issuance, holder-controlled management, instant verification, and administrative oversight. [Note any accepted limitations surfaced during testing.]

## 7. Conclusion and Recommendations *(template)*

> **Conclusion.** [Restate the problem ChainCert solves and confirm, based on the UAT results, that the objectives were met — the pass rate and acceptance mean show the system works and is accepted by users.]
>
> **Recommendations.** [List future work — e.g., HTTPS/TLS deployment, httpOnly-cookie sessions, automated provisioning of new issuers, issuer-scoped verification analytics, and any improvements raised by testers.]

## Appendices / Bibliography / Resource Persons / Personal Vitae *(mapping — group to finalize)*

- **Appendices:** include the four UAT Google Forms (screenshots or exported copies), the raw/collated response data, and the completed Tables 6.1–6.3. The ChainCert User Manual (UAT Edition) may also be appended.
- **Bibliography:** references cited throughout the paper (APA/IEEE per your program's format). *Group to compile — outside UAT scope.*
- **Resource Persons:** the individuals consulted (e.g., the HR interviewees from Avesco Marketing Corporation and Sunlife Philippines cited in the problem baseline, adviser, panelists). *Group to fill.*
- **Personal Vitae:** each member's CV. *Group to fill.*

---

## Notes for the group

- Test-case counts above are close to the existing form counts (Holder 21, Issuer 16, Verifier 9, Admin 20). Add/trim rows to match your actual forms; adjust the totals in Table 6.2 accordingly.
- Items marked **\[internal]** (e.g., the integrity-check tamper demo) require backend/DB access — assign these to a dev-team tester, not an external UAT participant.
- Keep the disclaimers from the User Manual in mind when scripting testers (e.g., a newly registered issuer cannot actually issue; verifier needs a real email; issuer/admin demo emails route to a central inbox).
