# ChainCert — UAT Contents & Capstone Paper Section 6 (Validation and Testing)

**Purpose of this document.** This is a working reference for the group. It contains (A) the full content for the four role-based UAT Google Forms, and (B) fill-in templates for the capstone paper's **Section 6 — Validation and Testing** (per the required outline: 6.1.1 Description, 6.1.2 Results, 6.1.3 Analysis, then Section 7 Conclusion, and the Appendices/Bibliography/Resource Persons/Personal Vitae items). Finalize and paste into the actual forms and the paper as needed.

> **How the pieces connect:** the Google Forms collect the raw data (Pass/Fail per test case + tester ratings). Section 6.1 of the paper *writes up* that data. The same test-case list is used in both places, so author it once here.

---

# PART A — UAT Google Forms Content

There are **four forms, one per role**: Credential Holder, Issuer, Verifier, Admin/Internal. Each form has the same four sections:

1. **User Manual** (the manual PDF is embedded/attached at the top of the form)
2. **Tester Information** (short)
3. **Test Cases** (the role's checks — each answered Pass / Fail / remarks)
4. **Experience Rating + Open-Ended Feedback** (shared block, below)

> **How the form and the manual work together (read this first):** The **User Manual (UAT Edition)** is the *only* place that walks through the click-by-click steps and shows screenshots. This form does **not** repeat those steps — it only asks the tester to confirm what happened after they followed the manual. That's why each test case below has a **Manual Phase** column instead of a Steps column: it tells the tester exactly which phase to open in the manual to do that check. There's nothing to figure out on the form itself — just follow the phase, then come back and mark Pass/Fail.
>
> **Assumption used below:** every tester works through the manual's **full phase sequence** using the shared demo accounts (Phase 1 → 8, in order), so a Verifier-only tester still does Phases 1–4 first to produce their own credential ID to verify, rather than being handed a pre-made one. This matches how the manual is written. *(If your group instead pre-seeds data so each role only touches its own screens, tell me and the "Manual Phase" column / preconditions below need to change.)*

## A.0 — Section: Tester Information (all forms)

- Name *(optional)*
- Role you are testing *(pre-filled per form: Holder / Issuer / Verifier / Admin)*
- Date of testing
- Have you used a similar digital-credential or verification system before? *(Yes / No)*

## A.1 — Section format: Test Cases

Each row below has a **Manual Phase** (where to find the steps) and a **What to Confirm** question (what the tester should check happened). For each one the tester answers:

- **Result:** ☐ Passed ☐ Failed
- **Remarks (if failed / any observation):** *short text*

*(In the paper's 6.1.2 Results table, the same rows carry an "Actual Result" and "Status" column instead.)*

---

### Form 1 — Credential Holder (22 test cases)

*Intro line for the form: "Follow Phases 1, 3, 5, and 8 of the User Manual (attached above) as a Credential Holder. Answer each item below after doing the matching phase."*

| ID | Manual Phase | What to Confirm |
|---|---|---|
| H-01 | Phase 1 | Were you able to register a holder account and get redirected to the login page? |
| H-02 | Phase 1 | If you tried a short/common password, was it rejected with a clear message? |
| H-03 | Phase 1 | Were you able to log in and reach your wallet dashboard? |
| H-04 | Phase 1 | Did a brand-new account show an empty wallet (no credentials yet)? |
| H-05 | Phase 3 | After a credential was issued to you, did an in-app notification appear? |
| H-06 | Phase 3 | Did you also receive an email about the new credential? |
| H-07 | Phase 3 | Did the credential appear correctly in your wallet (badge, name, issuer, status *Issued*)? |
| H-08 | Phase 8 | Were you able to switch between Cards and List view? |
| H-09 | Phase 8 | Did search, status filter, and sort work as expected? |
| H-10 | Phase 3 | Did opening the credential show its full details (type, description, skills, dates, issuer, Credential ID)? |
| H-11 | Phase 3 | Were you able to find and copy the Credential ID? |
| H-12 | Phase 3 | Did Blockchain History show the on-chain timeline with timestamps? |
| H-13 | Phase 8 | Were you able to toggle a credential to Private and confirm it's hidden from your shared profile? |
| H-14 | Phase 8 | Were you able to edit your bio/picture and save it? |
| H-15 | Phase 8 | Were you able to drag-and-drop to reorder your credentials? |
| H-16 | Phase 8 | Were you able to generate a working public share link? |
| H-17 | Phase 8 | For a recipient-specific link, did the viewer need a 6-digit emailed code before seeing your profile? |
| H-18 | Phase 8 | After clicking Revoke on a share link, did it immediately stop working? |
| H-19 | Phase 8 | Did the exported PDF include the credential details, Credential ID, and a verification link? |
| H-20 | Phase 8 | Did the Holder Insights (Credential Health / Verification Insights / Renewal Alerts) render with an explanation? |
| H-21 | Phase 5 | After the issuer revoked your credential, did it show as *Revoked* with a notification? |
| H-22 | Phase 1 | Were you able to use Forgot Password (OTP email → new password) successfully? |

### Form 2 — Issuer (16 test cases)

*Intro line for the form: "Log in with a shared issuer account (see the manual's account table). Follow Phases 2, 5, 6, and 8. A newly self-registered issuer cannot actually issue — that's expected (see the manual's demo-limit note)."*

| ID | Manual Phase | What to Confirm |
|---|---|---|
| I-01 | Phase 2 | Were you able to log in and reach the Issuer Dashboard? |
| I-02 | Phase 2 | Did the dashboard home show totals for templates / issued / revoked? |
| I-03 | Phase 2 | Were you able to create a credential template successfully? |
| I-04 | Phase 2 | If you left a required field blank, was it blocked with a validation message? |
| I-05 | Phase 2 | Were you able to issue a credential to a recipient successfully? |
| I-06 | Phase 2 | If you tried issuing the same template to the same holder again, was it prevented? |
| I-07 | Phase 2 | Were you able to set an expiry date when issuing? |
| I-08 | Phase 2 | Did View All Credentials list your templates and issued credentials with their IDs? |
| I-09 | Phase 5 | Were you able to revoke a credential with a reason, and did the holder get notified? |
| I-10 | Phase 2 | Did Credential History show the on-chain trail (create / issue / revoke)? |
| I-11 | Phase 2 | Did the Issuance Performance report render with an interpretation? |
| I-12 | Phase 2 | Did the Revocation Self-Audit report show a breakdown by template and time-to-revoke? |
| I-13 | Phase 6 | Were you able to complete the issuer registration screens (Parts 1–4) and reach *Pending* status? |
| I-14 | Phase 6 | As the root authority, could you see pending subordinate applications? |
| I-15 | Phase 6 | Were you able to approve (or reject) a subordinate application, with the decision recorded? |
| I-16 | Phase 8 | Were you able to change your password successfully? |

### Form 3 — Verifier (9 test cases)

*Intro line for the form: "No login needed, but you first need a credential to check. If none is available yet, do Phases 1–3 of the manual once (as Holder + Issuer) to produce a credential ID, then follow Phases 4 and 5 as Verifier."*

| ID | Manual Phase | What to Confirm |
|---|---|---|
| V-01 | Phase 4 | Were you able to open the Verify page without logging in? |
| V-02 | Phase 4 | After entering your name and real email, did you receive a 6-digit code? |
| V-03 | Phase 4 | Were you able to enter the code and gain access to verify? |
| V-04 | Phase 4 | If you entered a wrong/expired code, was it rejected with a clear message? |
| V-05 | Phase 4 | Did verifying a valid credential return **VALID** with the correct details? |
| V-06 | Phase 5 | Did verifying a revoked credential return **REVOKED** with the reason shown? |
| V-07 | Phase 5 | Did verifying a past-expiry credential return **EXPIRED**? *(Requires the UAT-only past-expiry toggle to be enabled on the VM so the issuer can issue a past-dated credential — see the manual's Phase 5 note.)* |
| V-08 | Phase 5 | Did verifying a made-up ID return **NOT FOUND**? |
| V-09 | Phase 4 | (For the admin group to confirm in Phase 7) Was your verification later visible in the admin's logs? |

### Form 4 — Admin / Internal (20 test cases)

*Intro line for the form: "Log in as admin@email.com (or admin2@email.com). Follow Phases 6, 7, and 8. Items marked \[internal] need backend/database access — only the dev team should answer those."*

| ID | Manual Phase | What to Confirm |
|---|---|---|
| A-01 | Phase 7 | Were you able to log in and reach the Admin Dashboard? |
| A-02 | Phase 7 | Did the dashboard show system-wide counts/charts on first load? |
| A-03 | Phase 7 | Did the Credentials tab list templates and issued credentials across all issuers? |
| A-04 | Phase 7 | Did the issuer/type/status filters and search work as expected? |
| A-05 | Phase 7 | On untouched data, did the Integrity Check report all records as matched? |
| A-06 | Phase 7 **\[internal]** | After manually altering a database record, did the Integrity Check flag it with the specific mismatched field? |
| A-07 | Phase 6 | Did the Issuers tab show pending applications with the correct sub-filters? |
| A-08 | Phase 6 | Were you able to approve a pending issuer, with an identity assigned and the decision logged? |
| A-09 | Phase 6 | Were you able to reject a pending issuer, with the decision logged? |
| A-10 | Phase 6 | Was Approve correctly disabled for a subordinate until the root authority approved first? |
| A-11 | Phase 7 | Were you able to enable/disable an issuer's access? |
| A-12 | Phase 7 | Were you able to enable/disable a holder account? |
| A-13 | Phase 7 | Did the Verification Logs list events with verifier, credential, result, and time? |
| A-14 | Phase 7 | Did the Status Logs list issuer/user enable-disable events? |
| A-15 | Phase 7 | Did the Issuer Decision Logs list approvals/rejections with the acting admin's email? |
| A-16 | Phase 7 | Did the Root Subordinate Logs list the root authority's decisions? |
| A-17 | Phase 7 | Did Analytics & Reports render (verification summary, suspicious activity, demand, integrity insight)? |
| A-18 | Phase 7 | Did a credential's Dossier show its provenance timeline and verification proof trail? |
| A-19 | Phase 7 | When switching between admin@email.com and admin2@email.com, did the logs correctly show which admin did what? |
| A-20 | Phase 8 | Were you able to change the admin password successfully? |

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
> - The **ChainCert User Manual (UAT Edition)** — the step-by-step reference (with screenshots) that testers followed for every action; it was attached at the start of each form.
> - **Google Forms** — one per role, used to collect Pass/Fail results and tester feedback. Each form's test cases reference the specific manual phase the tester had just completed, so the manual supplied the *how* and the form recorded the *outcome*.
>
> Testing was performed **manually** by human testers to reflect real-world use; no automated test scripts were employed. A total of **[N]** testers participated: **[n1]** Holders, **[n2]** Issuers, **[n3]** Verifiers, and **[n4]** Admin/internal testers.

### 6.1.2 Results *(Table Format)*

**Table 6.1 — Functional test results (repeat per role, or combine).** Populate "Actual Result" and "Status" from the UAT responses. ("What to Confirm" is the same question shown to the tester in the form; see Part A for the full list, each already mapped to its User Manual phase.)

| TC ID | What to Confirm (Expected Result) | Actual Result | Status (Pass/Fail) |
|---|---|---|---|
| H-01 | Were you able to register a holder account and get redirected to the login page? | [ ] | [ ] |
| … | *(paste all Holder, Issuer, Verifier, Admin test cases from Part A)* | [ ] | [ ] |

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

- **Appendices:** include the ChainCert User Manual (UAT Edition) itself (it's what testers followed), the four UAT Google Forms (screenshots or exported copies), the raw/collated response data, and the completed Tables 6.1–6.3.
- **Bibliography:** references cited throughout the paper (APA/IEEE per your program's format). *Group to compile — outside UAT scope.*
- **Resource Persons:** the individuals consulted (e.g., the HR interviewees from Avesco Marketing Corporation and Sunlife Philippines cited in the problem baseline, adviser, panelists). *Group to fill.*
- **Personal Vitae:** each member's CV. *Group to fill.*

---

## Notes for the group

- **The forms and the manual are now unified** — every test case's "Manual Phase" column points to a real, existing phase in the User Manual (UAT Edition). The manual was extended slightly (a few short bullets added to Phases 2, 3, 6, 7, and 8) specifically so nothing in the forms is left unexplained. If you add or remove a test case, check that its corresponding manual phase actually covers it — otherwise re-add a short manual bullet rather than duplicating steps in the form.
- **Attach/embed the User Manual PDF at the top of each Google Form.** The forms intentionally do not repeat steps — testers are expected to open the manual, do the phase, then come back and answer.
- Test-case counts (Holder 22, Issuer 16, Verifier 9, Admin 20 = 67 total) already match Table 6.2 — no adjustment needed unless you add/remove rows.
- Items marked **\[internal]** (e.g., the integrity-check tamper demo) require backend/DB access — assign these to a dev-team tester, not an external UAT participant.
- **Assumption used for the "Manual Phase" mapping:** every tester follows the manual's full sequence (Phases 1–8, in order) using the shared demo accounts — including Verifier-only testers, who first do Phases 1–3 to produce their own credential ID. If your group instead pre-seeds credentials so role groups never leave their own screens, the Verifier form's intro line and precondition need to change (Form 3's note above already flags this).
- Keep the disclaimers from the User Manual in mind when scripting testers (e.g., a newly registered issuer cannot actually issue; verifier needs a real email; issuer/admin demo emails route to a central inbox).
