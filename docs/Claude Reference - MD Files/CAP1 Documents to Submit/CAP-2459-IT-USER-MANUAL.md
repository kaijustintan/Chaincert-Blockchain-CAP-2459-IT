<!-- Maintained user manual — UAT edition. Refreshed 2026-07-04 to match the deployed CCSCloud VM build.
     This supersedes the March 2026 PDF snapshot (which reflects the pre-VM, pre-analytics, pre-verifier-OTP system).
     Screenshot placeholders are marked inline as *[Screenshot: ...]* — replace each with a real screen capture. -->

# ChainCert — User Manual (UAT Edition)

**ChainCert** — Blockchain-Based Credential Issuance and Verification Platform
Updated: July 4, 2026 — CAP-2459-IT

> **How to read this manual:** If you are a **User Acceptance Testing (UAT) tester**, start with **Section 2 — For UAT Testers (Start Here)**. It tells you where to log in, what accounts to use, the recommended order to test things, and a few important things the demo environment *cannot* do. The rest of the manual is a role-by-role reference you can jump into as needed.
>
> *Screenshots in this manual are marked as [Screenshot: ...]. Replace each placeholder with an actual capture of that screen.*

## Table of Contents

1. Introduction
2. For UAT Testers (Start Here)
3. System Overview
4. User Roles Overview
5. Account Registration
6. Logging In
7. Administrator Guide
8. Root Authority Guide
9. Issuer Guide
10. Credential Holder Guide
11. Profile and Sharing
12. Verifier Guide
13. Reports and Insights
14. Settings
15. Notifications and Alerts
16. Common Terms and Statuses
17. Troubleshooting
18. Support and Contact Information

---

## 1. Introduction

This User Manual provides step-by-step instructions for using the ChainCert platform. It is intended for administrators, issuers, credential holders, and verifiers.

ChainCert enables secure issuance, management, and verification of digital credentials using blockchain technology, ensuring that credentials are immutable, verifiable, and resistant to tampering.

All credential lifecycle events (issuance, revocation, verification, expiration) are recorded on a Hyperledger Fabric blockchain, providing an auditable and tamper-evident record that cannot be silently modified.

> **Note:** ChainCert is a capstone **prototype** with a set of consciously accepted limitations. It is not a production system. Some behaviors described below (for example, provisioning a brand-new issuer end-to-end) are intentionally out of scope for the demo environment — these are called out clearly in Section 2.

---

## 2. For UAT Testers (Start Here)

This section is written for testers helping us evaluate ChainCert. Read it fully before you begin — it will save you time and prevent confusion about what the demo environment can and cannot do.

### 2.1 Accessing the Platform

Open a modern web browser and go to:

**http://ccscloud.dlsu.edu.ph:20173**

This is the live deployment hosted on the DLSU CCSCloud virtual machine. Everyone tests against the same shared environment, so you may see data created by other testers — that is expected.

*[Screenshot: Landing Home Page]*

> **Heads-up on the browser "Not secure" label:** The demo runs over plain HTTP (no padlock). Your browser may show a "Not secure" note in the address bar. This is expected for the capstone prototype — secure HTTPS is planned future work. It does not affect your testing.

### 2.2 System Requirements

- A modern web browser (Chrome, Edge, Firefox, or Safari)
- A stable internet connection
- JavaScript enabled
- A **real email address you can check** — you will need it for the Verifier flow and for any credential/profile emails sent to your own account

### 2.3 Your Test Accounts

How you log in depends on the role you are testing.

**Credential Holder — register your own account.**
Create a fresh holder account (Section 5.1). This lets you test the sign-up flow and gives you your own wallet. Use a real email so you receive credential notifications.

**Issuer, Root Authority, and Administrator — use the shared demo accounts below.**
These accounts are already fully set up on the blockchain, so they can actually create and issue credentials. Please treat them gently (see Disclaimers, Section 2.5).

| Role | Email | Password | Notes |
|---|---|---|---|
| Administrator | admin1@email.com | pw123 | Shared. A second admin, admin2@email.com (pw123), also exists so you can see per-admin attribution in the logs. |
| Root Authority Issuer (De La Salle University) | dlsu@email.com | pw123 | Shared. Fully provisioned — can create templates and issue real credentials. Also used for Root Authority governance testing. |
| Subordinate Issuer (La Salle Computer Society) | lasallecomputersociety@email.com | pw123 | Shared. Fully provisioned — can create templates and issue real credentials. |
| Credential Holder | *register your own* | *you choose* | A pre-seeded demo holder, kylejustin.tan7@gmail.com (pw123), also exists if you want to see an account that already has sample credentials. |
| Verifier | *no login* | — | Just enter your real name and email; you will confirm the email with a 6-digit code. |

### 2.4 The Recommended Test Sequence

ChainCert is a chain of connected steps: an issuer issues a credential, a holder receives it, and a verifier checks it. The smoothest way to test is to follow that same chain, because each step produces what the next step needs. **There are no pre-made sample credential IDs — you will create your own and then verify them.**

1. **[Holder]** Register your own holder account and log in. Your wallet starts empty. *(Section 5.1, 10)*
2. **[Issuer]** Log in with a shared issuer account (e.g., `dlsu@email.com`). Create a credential **template**, then **issue** a credential — select your holder account from Step 1 as the recipient. *(Section 9.2, 9.3)*
3. **[Holder]** Log back in as your holder. The new credential appears with a notification. Open its details and note (copy) the **Credential ID**. *(Section 10.3)*
4. **[Verifier]** Open the public Verify page. Confirm your email with the 6-digit code, then paste the **Credential ID** from Step 3. You should see **VALID**. *(Section 12)*
5. **[Issuer + Verifier]** Back as the issuer, **revoke** that credential with a reason, then re-verify the same ID — you should now see **REVOKED**. To see the remaining outcomes: issue a credential with a near-past expiry date (→ **EXPIRED**), or type a made-up ID into the verifier (→ **NOT FOUND**). *(Section 9.5, 12.3)*
6. **[Admin]** Log in with the shared admin account. Review the issuer queues, browse the blockchain audit logs, run the **Integrity Check**, and open **Analytics & Reports**. *(Section 7, 13)*
7. **[Root Authority]** Log in as `dlsu@email.com` and review subordinate issuer applications in the Root Authority Governance section. *(Section 8)*

> **If you are only assigned the Verifier role:** you still need a credential ID to check. The quickest path is to log in once with a shared issuer account, issue a single credential to yourself (or to the demo holder), copy its Credential ID, then log out and test the verifier with it.

### 2.5 Important Disclaimers (Please Read)

These are intentional limits of the shared demo environment — not bugs. Knowing them up front will keep your testing on track.

1. **Approving a brand-new issuer will NOT produce a working issuer.**
   You are welcome to test the full onboarding flow: register a new issuer, and (as Admin or Root Authority) approve it. The status will correctly change to *Approved*. **However, that newly-approved issuer cannot actually create templates or issue credentials.** A working issuer needs a one-time blockchain-identity setup that our team performs manually behind the scenes. Only the **pre-provisioned demo issuers** (De La Salle University, La Salle Computer Society) can truly issue. So: test the registration and approval *screens* freely, but do your real credential-issuance testing with the shared issuer accounts.

2. **The Issuer, Root Authority, and Admin accounts are shared.**
   Please **do not change their passwords** and **do not disable them or each other's accounts**. Expect to see templates, credentials, and log entries created by other testers — that is normal in a shared environment.

3. **The Verifier needs a real email, and you make your own credential IDs.**
   To record a verification, the verifier confirms email ownership with a 6-digit code — so use an email you can actually open. There are no seeded sample IDs; you obtain a Credential ID by issuing a credential yourself (Step 2 above), then verifying it. Revoke it, expire it, or invent an ID to exercise the other three results.

4. **Some notification emails will not reach you.**
   The demo Issuer and Admin accounts use placeholder addresses, so their notification emails are funneled to a single central inbox and will **not** land in your mailbox. Emails tied to **real** addresses you enter — your self-registered holder account, the Verifier's email code, and profile-share codes — **will** arrive normally.

### 2.6 Giving Feedback

After testing your assigned role, please complete the feedback form for that role. Your facilitator will provide the correct link. Feedback is collected separately for the **Holder**, **Issuer**, **Verifier**, and **Admin** experiences.

---

## 3. System Overview

ChainCert operates through a multi-role workflow:

1. Issuer submits registration with supporting documents
2. If a subordinate issuer: the Root Authority reviews and approves or rejects the application first
3. Administrator reviews and approves or rejects the issuer application
4. Approved issuer creates credential templates
5. Issuer issues credentials to holders
6. Credential holder receives credentials in their digital wallet
7. Verifier validates credential authenticity using a credential ID

All actions are recorded on the blockchain for audit and verification. The system uses a **dual-write** architecture where data is stored on the blockchain (the source of truth) and in a fast-read database (CouchDB) for responsive dashboards.

---

## 4. User Roles Overview

| Role | Description |
|---|---|
| Administrator | Manages issuer onboarding, user accounts, system governance, credential oversight, integrity checks, analytics, and audit logs. |
| Root Authority | A type of approved issuer that can create templates, issue credentials, and review subordinate issuer applications under their organization. |
| Subordinate Issuer | Operates under a root authority. Requires two-tier approval (root authority first, then administrator) before gaining credential issuance privileges. |
| Credential Holder | Receives and manages credentials through a digital wallet. Can control visibility, share profiles, and view blockchain history. |
| Verifier | Validates credential authenticity by entering a credential ID. No account required, but must confirm their email with a one-time code before a verification is recorded. |

---

## 5. Account Registration

Navigate to the registration page by clicking **Create Account** from the login page or navigation bar. The first step is to select your account type.

*[Screenshot: Role Selection — User or Issuer]*

### 5.1 Creating a User Account (Credential Holder)

Select **User** to create a credential holder account. Fill in the following fields:

- First Name
- Last Name
- Email Address *(use a real email so you receive credential notifications)*
- Username
- Password and Confirm Password

Click **Register** to create the account. After successful registration, you will be redirected to the login page.

*[Screenshot: User Registration Form]*

> **Password rule:** Passwords must be at least 10 characters and must not be a common, easily-guessed password. If your password is rejected, choose a longer, less predictable one.

### 5.2 Registering as an Issuer

Select **Issuer** to register as a credential-issuing organization. The issuer registration form collects organizational and regulatory information across four parts.

*[Screenshot: Issuer Registration Form]*

**Part 1: Organization Details**
- Organization Name
- Organization Email
- Password and Confirm Password

*[Screenshot: Issuer Registration — Part 1 Organization Details]*

**Part 2: Select Issuer Category**

Select the category that best describes your organization:

- University / Higher Education Institution
- Government Agency or Office
- Training Provider / Private Education Provider
- Industry Certifier / Professional Certification Body
- Others

Each category has its own required-documents list, which appears dynamically after you pick a category. These documents are reviewed by the administrator during approval.

*[Screenshot: Issuer Registration — Part 2 Category Selection with dynamic document list]*

**Part 3: Select Issuer Type**

- **Root Authority:** An independent issuer that operates its own credential programs and may manage subordinate issuers.
- **Subordinate Issuer:** An issuer that operates under a root authority. If Subordinate is selected, you must also choose the Root Authority you are applying under from a searchable dropdown of approved root issuers. Subordinates additionally upload a Root Authority Authorization Letter.

*[Screenshot: Issuer Registration — Part 3 Issuer Type (Root vs Subordinate)]*

**Part 4: Upload Documents and Submit**

Upload the required documents for your selected category, review your application, and click **Submit Registration**. Your application enters *Pending* status.

*[Screenshot: Issuer Registration — Part 4 Document Upload and Review]*

- For **subordinate** issuers: the Root Authority must approve first, then the Administrator.
- For **root** issuers: the Administrator reviews and decides directly.

> **UAT reminder (see Section 2.5, Disclaimer 1):** You can test this entire flow, but a newly-registered-and-approved issuer will not be able to actually issue credentials in the demo. Use the shared, pre-provisioned issuer accounts for real issuance.

---

## 6. Logging In

Navigate to the login page. Enter your registered email and password, then click **Login**.

*[Screenshot: Login Page]*

The system automatically detects whether the email belongs to an issuer, a user (credential holder), or an administrator, and redirects to the appropriate dashboard:

- Issuers → Issuer Dashboard
- Users (credential holders) → Student Dashboard (wallet)
- Administrators → Admin Dashboard

> **Note:** Verifiers do not log in. The verification page is publicly accessible.

### 6.1 Forgot Password

If you forget your password:

1. Click **Forgot Password** on the login page
2. Enter your registered email address
   *[Screenshot: Forgot Password — enter email]*
3. A one-time password (OTP) is sent to your email
4. Enter the OTP and your new password
5. Click **Reset Password**
   *[Screenshot: Forgot Password — enter OTP and new password]*

> **UAT reminder:** This only works for accounts whose email you can actually check. Shared issuer/admin demo emails route to a central inbox (Section 2.5, Disclaimer 4), so use this flow with your own holder account.

---

## 7. Administrator Guide

*Log in with the shared admin account `admin1@email.com` (or `admin2@email.com`).* The Admin Dashboard provides system-wide management across several tabs, including Credentials, Issuers, Users, Logs, Analytics & Reports, and Settings.

*[Screenshot: Admin Dashboard — Overview]*

### 7.1 Credentials Tab

A unified view of all credential templates and issued credentials across every approved issuer. Features:

- Summary statistics: total credentials, issued count, template count, and status breakdown (active, issued, revoked, expired) with charts
- Filter by issuer, credential type (templates vs. issued), and status
- Search by holder name, holder ID, credential ID, or credential name
- Sort by newest, oldest, or name
- Expandable rows for credential details

#### 7.1.1 Running an Integrity Check

The **Run Integrity Check** button compares each CouchDB record against its blockchain record, field by field. Results show:

- Total records checked
- Matched records (CouchDB matches blockchain)
- Mismatched records (fields differ)
- Missing records (in CouchDB but not on-chain)
- Errors (records that could not be compared)

If mismatches are found, a detailed table shows which fields differ for each affected credential. This proves the off-chain mirror is faithful to the blockchain source of truth.

*[Screenshot: Integrity Check Results]*

### 7.2 Issuers Tab

Manage all issuer accounts, filtered by status:

- **Approved** — currently active issuers
- **Pending** — awaiting admin action (sub-filters: Admin Actionable, Awaiting Root Approval, Root Approved)
- **Rejected** — previously denied applications
- **Disabled** — issuers whose access has been restricted

#### 7.2.1 Reviewing Issuer Applications

1. Open the Issuers tab and select **Pending**
   *[Screenshot: Issuers Tab — Pending queue]*
2. Click an issuer to view application details
   *[Screenshot: Issuer Application — details view]*
3. Review the submitted documents (stored as attachments; click to view or download)
   *[Screenshot: Issuer Application — document viewer]*
4. Click **Approve** or **Reject** and confirm
   *[Screenshot: Issuer Application — Approve/Reject confirmation]*

Approval assigns a blockchain wallet identity and database connection to the issuer and records the decision on-chain. Rejection records the decision on-chain. Both generate an admin notification.

> **Note:** For subordinate issuers, **Approve** is disabled until the Root Authority has approved first. The status shows *Awaiting Root Approval* until then.
>
> **UAT reminder (Disclaimer 1):** Approving a new registration flips its status correctly, but does not make that issuer able to issue credentials in the demo environment.

#### 7.2.2 Enabling and Disabling Issuers

From the Approved or Disabled views, toggle an issuer's status:

- **Disable** — restricts access; disabled issuers cannot create templates or issue credentials
- **Enable** — restores a previously disabled issuer

Both actions are recorded on the blockchain. *(Please avoid disabling the shared demo issuers during UAT — Section 2.5, Disclaimer 2.)*

### 7.3 Users Tab

Displays all registered credential holders, filtered by **Active** or **Disabled**. The admin can search by name or email and enable or disable accounts. Status changes are logged on the blockchain.

*[Screenshot: Admin Users Tab]*

### 7.4 Logs Tab

Access to all blockchain-recorded audit trails:

- **Verification Logs** — every credential verification event (verifier name, verifier email, credential ID, result, timestamp)
- **Status Logs** — issuer and user enable/disable events; filterable by type and searchable by email; expandable per entity
- **Issuer Decision Logs** — issuer approval/rejection decisions; filterable by decision type
- **Root Subordinate Decision Logs** — root authority decisions on subordinate applications; filterable and searchable by organization name

*[Screenshot: Admin Logs Tab — Verification Logs]*

### 7.5 Analytics & Reports Tab

Interpreted, plain-language insights (not raw tables). See Section 13.3.

### 7.6 Admin Notifications

The administrator is notified of new issuer registrations, root authority subordinate decisions, and system events. Open the bell icon in the dashboard header; mark notifications read individually or all at once.

---

## 8. Root Authority Guide

*Log in with `dlsu@email.com`.* Root authorities are approved issuers that oversee subordinate issuers under their organization. They have all standard issuer capabilities (templates, issuance, revocation) **plus** subordinate management.

### 8.1 Accessing Subordinate Management

From the Issuer Dashboard, a root authority sees a **Subordinate Management** section. This section is not visible to subordinate issuers.

*[Screenshot: Issuer Dashboard — Subordinate Management]*

### 8.2 Reviewing Subordinate Applications

1. Open the Subordinate Management view
2. Filter by status: All, Pending, Root-Approved, Root-Rejected, Approved (fully approved by admin), or Disabled
   *[Screenshot: Subordinate Management — pending applications list]*
3. Select a subordinate to review its details and documents
   *[Screenshot: Subordinate Application — details and documents]*
4. Click **Approve** or **Reject** and confirm
   *[Screenshot: Subordinate Application — Approve/Reject confirmation]*

Root approval sets the subordinate's root-approval status to *approved*, making the application visible to the administrator for final approval. Root rejection blocks the application. All decisions are recorded on the blockchain and generate an admin notification.

> **Note:** If no subordinate applications match a filter, an empty-state message is shown.
>
> **UAT reminder (Disclaimer 1):** Approving a subordinate here (and then as Admin) is valid to test, but the subordinate will not gain real issuing ability without the manual blockchain-identity setup.

---

## 9. Issuer Guide

*Log in with a shared issuer account (`dlsu@email.com` or `lasallecomputersociety@email.com`).* The Issuer Dashboard offers: Home, Create Template, Issue Credential, View All Credentials, Revoke Credential, Analytics, and (root authorities only) Subordinate Management.

*[Screenshot: Issuer Dashboard — Home View]*

### 9.1 Home View

Summary statistics for the issuer:

- Total credentials (templates + issued)
- Active templates count
- Issued credentials count
- Revoked credentials count

Quick-action cards link to Create Template, Issue Credential, Revoke Credential, and View All Credentials.

### 9.2 Creating a Credential Template

A template is the reusable blueprint of a credential before it is issued to anyone.

1. Open the Create Template view
2. Fill in the fields:
   - **Credential Name** — the title (e.g., "Bachelor of Science in Information Technology")
   - **Credential Type** — category (e.g., Academic, Professional, Training)
   - **Description** — what the credential represents
   - **Skills** — add individual skills by typing and pressing Enter or clicking Add
   - **Badge Image** — upload an image displayed as the credential badge
   *[Screenshot: Create Template — form with fields filled]*
3. Click **Create Template**

The template is written to the blockchain first (source of truth), then saved for fast dashboard display. A success or error message appears.

*[Screenshot: Create Template — success message]*

### 9.3 Issuing a Credential

Issuing assigns a specific credential to a holder based on an existing template.

1. Open the Issue Credential view
2. **Select a Template** using the searchable dropdown (filterable by type)
   *[Screenshot: Issue Credential — template dropdown]*
3. **Select a Recipient** using the searchable dropdown — it lists eligible holders (those who don't already hold this credential). *During UAT, pick your own self-registered holder account here.*
   *[Screenshot: Issue Credential — recipient dropdown]*
4. **Set an Expiry Date (optional)** — choose a date if the credential should expire
5. Click **Issue Credential**

The credential is recorded on the blockchain, saved for fast reads, and a notification is sent to the holder.

*[Screenshot: Issue Credential — success confirmation]*

> **Note:** A holder cannot be issued the same template twice. Duplicate issuance is prevented.
>
> **UAT tip:** To later test the **Expired** result, set an expiry date in the recent past. To generate a Credential ID for verification testing, this is the step that produces it.

### 9.4 Viewing All Credentials

Shows all templates and issued credentials belonging to the issuer, with search and filters. Each issued credential displays its **Credential ID** — useful for verification testing.

### 9.5 Revoking a Credential

Revoking marks a credential invalid on the blockchain.

1. Open the Revoke Credential view
2. Select the credential to revoke (searchable dropdown)
3. Select the specific holder (searchable dropdown)
4. Provide a revocation reason
   *[Screenshot: Revoke Credential — form with credential, holder, and reason]*
5. Click **Revoke Credential**

The revocation is recorded on the blockchain, the fast-read copies update, and a revocation notification goes to the holder. Verifying that credential afterward returns **REVOKED** with the reason.

*[Screenshot: Revoke Credential — success confirmation]*

### 9.6 Credential History

From the navigation bar, open **Credential History** to see the full blockchain audit trail of the issuer's credentials — every creation, issuance, revocation, and expiration event with transaction IDs and timestamps.

### 9.7 Issuer Analytics

See Section 13.2.

---

## 10. Credential Holder Guide

*Log in with your own self-registered holder account.* The Student Dashboard (wallet) is the main interface for holders and displays all credentials received from issuers.

*[Screenshot: Student Dashboard — Wallet]*

### 10.1 Dashboard Overview

A greeting with your name and a summary of total credentials, statistics, and recent activity, followed by your credentials. *A newly-registered holder starts with an empty wallet until an issuer issues a credential to it.*

### 10.2 Viewing Credentials

Two layouts:

- **Cards View** — visual cards with badge images, names, issuers, and status badges
- **List View** — compact table layout

Filter and sort with:

- **Search** — by credential name, issuer, or type
- **Status filter** — All, Issued, Revoked, or Expired
- **Sort** — Newest, Oldest, or Name

### 10.3 Credential Details

Click any credential to open its detail view, which shows the name, type, description, status, issuer, issuance and expiry dates, skills, badge image, parent template, and the **Credential ID**.

*[Screenshot: Credential Detail — with Credential ID highlighted]*

> **UAT tip:** This is where you copy the **Credential ID** to paste into the Verifier (Section 12). You can also find it on the exported PDF (Section 11) and on the verification result screen.

### 10.4 Blockchain History

From the credential detail view, click **View Blockchain History** to see the full on-chain audit trail — each entry showing the transaction ID, timestamp, and credential state at that point. This proves the credential's lifecycle is immutably recorded.

*[Screenshot: Credential Detail — Blockchain History]*

### 10.5 Managing Credential Visibility

Each credential can be **Public** or **Private**:

- **Public** — appears when someone views your shared profile
- **Private** — hidden from your shared profile but still visible in your own wallet

Toggle visibility from the credential detail view.

### 10.6 Notifications

The bell icon shows unread notifications. Holders are notified when a credential is issued to them and when one of their credentials is revoked. Click a notification to mark it read.

### 10.7 Holder Insights

See Section 13.1.

---

## 11. Profile and Sharing

The Profile page lets holders (and issuers) manage a public profile and share credentials with third parties.

*[Screenshot: Profile Page]*

### 11.1 Editing Profile Information

From the Profile page you can update your bio/summary, toggle profile visibility (Public/Private), and upload or change your profile picture. Click **Save** to apply.

### 11.2 Credential Display on Profile

Search, filter (by status and type), and sort your credentials, and **drag-and-drop to reorder** how they appear on your shared profile.

### 11.3 Sharing Your Profile

Click **Share Profile** to generate a shareable link. Two modes:

- **Specific Recipient** — enter the recipient's email. They must confirm their identity via a 6-digit code sent to that email before viewing your profile.
- **Public Link** — anyone with the link can view your profile without a code.

For both modes you can set a **link duration** (e.g., 7 or 30 days) and an optional **description**. After generating, copy the link to share.

*[Screenshot: Share Profile Modal — Specific vs Public]*

### 11.4 Managing Share Links

The Share Links section lists every link with its recipient (or "Anyone"), type, status (Active/Expired/Revoked), view count, expiration date, and the URL (with Copy). Active links can be **Revoked** to invalidate them immediately.

### 11.5 Profile Preview and PDF Export

When a recipient opens a share link, they see your Profile Preview — your name, picture, summary, and **public** credentials. Clicking a credential shows its full details. For specific-recipient links, the viewer must first enter the emailed code.

Holders can also **export credentials as PDF** (single credential or a full portfolio). The PDF includes holder and credential details, the issuer, the **blockchain Credential ID**, and a verification link.

---

## 12. Verifier Guide

The Verifier page is **publicly accessible** — no login required. However, before a verification is *recorded*, the verifier must confirm ownership of their email with a one-time code.

*[Screenshot: Verifier — Email Confirmation]*

### 12.1 Confirming Your Email (One-Time Code)

1. On the Verifier page, enter **Your Name** and **Your Email** (use a real email you can check)
2. Click **Send verification code**
3. Check your email for a **6-digit code** and enter it
4. Click **Verify & continue**

You are now confirmed for this browser session and can verify credentials. Your **name** is display-only; your **email** is the confirmed identity attached to each verification you record. Use the **Change** link to switch to a different email.

*[Screenshot: Verifier — Enter 6-digit Code]*

> **UAT reminder (Disclaimer 3):** The email code is why the verifier needs a real, checkable email. There are no seeded credential IDs — get one by issuing a credential first (Section 9.3), then verify it here.

### 12.2 Verifying a Credential

1. Enter (or paste) the **Credential ID** in the search field
   *[Screenshot: Verifier — credential ID entered in the search field]*
2. Click **Verify**
3. The system checks the credential against the blockchain and displays a verdict
4. The verification event is recorded on the blockchain, using the email you confirmed

A credential's verification result screen shows who it was issued to, the issuer, the status, expiry (if any), the Credential ID, and when/how it was verified.

*[Screenshot: Verification Result — VALID]*

> A verification link (for example, from an exported PDF) can open this page with the Credential ID pre-filled, so it verifies automatically after your email is confirmed.

### 12.3 Understanding Verification Results

| Result | Meaning |
|---|---|
| **VALID** | The credential exists on the blockchain, has not been revoked, and has not expired. It is authentic and active. |
| **REVOKED** | The credential was valid but has been revoked by the issuer. The reason is shown. |
| **EXPIRED** | The credential has passed its expiry date. It was valid but is no longer current. |
| **NOT FOUND** | No matching credential exists on the blockchain. The ID is likely fake, forged, or mistyped. |

*[Screenshot: Verification Result — REVOKED]*
*[Screenshot: Verification Result — EXPIRED]*
*[Screenshot: Verification Result — NOT FOUND]*

> **How to see all four during UAT:** verify a freshly issued credential (**VALID**), revoke it and re-verify (**REVOKED**), issue one with a near-past expiry (**EXPIRED**), and type a made-up ID (**NOT FOUND**). Not-found attempts are also logged, so forgery attempts appear in the admin analytics.

---

## 13. Reports and Insights

ChainCert's reports present **interpreted, plain-language insights**, not raw tables. Every chart is paired with a short "what this means" explanation. Because the demo environment may start with little data, some reports appear empty until credentials have been issued and verified — so run through the test sequence (Section 2.4) first.

### 13.1 Holder Insights (Student Dashboard)

- **Credential Health** — an at-a-glance view of how many of your credentials are active vs. expiring or revoked
- **Renewal Alerts** — flags credentials nearing expiry, with a quick View action
- **Verification Insights** — a trust signal, an outcomes breakdown, a 6-month verification trend, your most-checked credential, and alerts on unusual outcomes
- **Provenance Timeline** — the credential's full history, shown when you open its blockchain history
- **Safe-to-share verdict** — a simple indicator of whether a credential is currently safe to share

### 13.2 Issuer Analytics (Issuer Dashboard → Analytics)

- **Issuance Performance** — how many credentials you've issued over time
- **Revocation Self-Audit** — revocations broken down by template and by how long after issuance they were revoked

### 13.3 Admin Analytics & Reports (Admin Dashboard → Analytics & Reports)

- **Verification Result Summary** — the mix of valid / revoked / expired / not-found checks across the platform
- **Suspicious Activity** — issuers or patterns worth a closer look
- **Demand Index** — which credentials are most in demand
- **Integrity-Check Insight** — a plain-language reading of the latest integrity check
- **Credential Dossier** (per credential) — a Provenance Timeline plus a Verification Proof Trail, with the raw audit table available but collapsed by default

*[Screenshot: Admin Analytics & Reports]*

---

## 14. Settings

The Settings page is available to logged-in users and issuers via the navigation bar.

### 14.1 Account Settings

Displays your current account information (name, email, role).

### 14.2 Changing Your Password

1. Open Settings
2. Click **Change Password**
3. Enter your current password
4. Enter and confirm your new password (min. 10 characters, not a common password)
5. Click **Save**

*Please do not change the passwords on the shared demo accounts (Section 2.5, Disclaimer 2).*

### 14.3 Notification Preferences

Toggle email and push notifications on or off.

---

## 15. Notifications and Alerts

Notifications are accessible via the bell icon in the dashboard header.

### 15.1 User Notifications

Credential holders are notified when a credential is **issued** to their wallet and when a credential is **revoked**.

### 15.2 Admin Notifications

Administrators are notified of new issuer registrations and root authority subordinate decisions. Mark notifications read individually or all at once.

> **UAT reminder (Disclaimer 4):** In-app notifications always appear. **Email** copies of notifications only arrive for real addresses — the shared issuer/admin demo addresses route to a central inbox instead.

---

## 16. Common Terms and Statuses

| Term / Status | Description |
|---|---|
| Pending | Application is awaiting review and approval. |
| Awaiting Root Approval | Subordinate application is waiting for the root authority before the admin can act. |
| Root Approved | Root authority has approved the subordinate; awaiting administrator approval. |
| Approved | Application or issuer is fully approved and active. |
| Rejected | Application has been denied. The reason is logged on the blockchain. |
| Disabled | Account or issuer access has been restricted by the administrator. |
| Active | Account or issuer is active. |
| Issued | Credential has been issued to a holder and is currently valid. |
| Revoked | Credential has been invalidated by the issuer. |
| Expired | Credential's expiry date has passed. No longer current. |
| Not Found | No credential with that ID exists on the blockchain (likely fake or mistyped). |
| Credential Template | A reusable blueprint defining a credential's name, type, description, and skills before issuance. |
| Issued Credential | A specific credential instance assigned to a holder, based on a template. |
| Blockchain | The immutable distributed ledger recording all credential lifecycle and governance events. |
| Integrity Check | An admin-triggered comparison of fast-read records against blockchain records to detect mismatches. |
| Dual-Write | Writing to the blockchain first (source of truth), then to the fast-read database. |
| Credential ID | The unique identifier of an issued credential, used by verifiers to check it. |
| OTP / One-Time Code | A short code sent by email to confirm identity (password reset, verifier email, profile-share access). |

---

## 17. Troubleshooting

| Issue | Resolution |
|---|---|
| Cannot open the site | Confirm the URL: **http://ccscloud.dlsu.edu.ph:20173**. A "Not secure" browser label is expected (Section 2.1). Check your internet connection. |
| Cannot log in | Verify your email and password. If your account was disabled, contact the facilitator. Use Forgot Password if needed (own accounts only). |
| Newly-approved issuer can't issue | Expected in the demo (Section 2.5, Disclaimer 1). Use the shared, pre-provisioned issuer accounts for real issuance. |
| No credentials in my wallet | None have been issued to your account yet. Have an issuer issue one to your registered account, and set the status filter to "All". |
| Verifier won't let me verify | You must confirm your email first — enter the 6-digit code sent to your address. Use a real, checkable email. |
| Verification returns NOT FOUND for a real credential | Check the Credential ID is exact (copy-paste it). Confirm the credential was actually issued. |
| Verification returns REVOKED / EXPIRED | That is the true current status — the credential was revoked by its issuer or has passed its expiry date. |
| Didn't receive a notification email | Emails for shared issuer/admin demo accounts route to a central inbox (Section 2.5, Disclaimer 4). Real addresses (your holder account, verifier email, share codes) do receive email. |
| OTP / code not received | Check spam/junk. Confirm the email is correct. Codes are time-limited — request a new one if it expired. |
| Documents won't upload during registration | Use a supported file type within the size limit (profile pictures: PNG/JPG; issuer documents: PDF; max 5 MB). Try another browser if needed. |
| Share link doesn't work | It may have expired or been revoked. Check the Share Links section in your profile. |
| Integrity check shows mismatches | A mismatch means a fast-read record differs from the blockchain (e.g., a manual edit or partial write). The blockchain record is the source of truth. |

---

## 18. Support and Contact Information

For issues not covered in this manual:

- Contact your UAT facilitator or the system administrator
- Reach out to the ChainCert project team
- Consult the Technical Manual (CAP-2459-IT) for system architecture and API details
- Consult the Installation Manual (CAP-2459-IT) for setup and configuration procedures
