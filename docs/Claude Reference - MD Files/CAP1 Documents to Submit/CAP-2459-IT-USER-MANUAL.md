<!-- Auto-generated Markdown reference from "CAP-2459-IT-USER-MANUAL.pdf". The PDF remains the human-readable source of truth. -->

# ChainCert — User Manual

**ChainCert** — Blockchain-Based Credential Issuance and Verification Platform
March 25, 2026 — CAP-2459-IT

> Note: The source PDF contains screenshots that are not captured in this text extraction. Screenshot placeholders are noted inline as *[Screenshot: ...]*.

## Table of Contents

1. Introduction
2. Getting Started
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
13. Settings
14. Notifications and Alerts
15. Common Terms and Statuses
16. Troubleshooting
17. Support and Contact Information

---

## 1. Introduction

This User Manual provides step-by-step instructions for using the ChainCert platform. It is intended for administrators, issuers, credential holders, and verifiers.

ChainCert enables secure issuance, management, and verification of digital credentials using blockchain technology, ensuring that credentials are immutable, verifiable, and resistant to tampering.

All credential lifecycle events (issuance, revocation, verification, expiration) are recorded on a Hyperledger Fabric blockchain, providing an auditable and tamper-evident record that cannot be silently modified.

---

## 2. Getting Started

### 2.1 Accessing the Platform

Users may access ChainCert through a web browser by navigating to the platform URL. The landing page provides access to login, registration, verification, and information pages.

*[Screenshot: Landing Home Page]*

### 2.2 System Requirements

- Modern web browser (Chrome, Edge, Firefox, Safari)
- Stable internet connection
- JavaScript enabled in the browser

### 2.3 Navigation

The navigation bar at the top of the page provides access to the main sections of the platform. The navigation items change based on whether the user is logged in and their role (user, issuer, or administrator). A footer is displayed at the bottom of every page.

---

## 3. System Overview

ChainCert operates through a multi-role workflow:

1. Issuer submits registration with supporting documents
2. If subordinate issuer: Root Authority reviews and approves or rejects the application first
3. Administrator reviews and approves or rejects the issuer application
4. Approved issuer creates credential templates
5. Issuer issues credentials to holders
6. Credential holder receives credentials in their digital wallet
7. Verifier validates credential authenticity using a credential ID

All actions are recorded on the blockchain for audit and verification. The system uses a dual-write architecture where data is stored on the blockchain (source of truth) and in CouchDB (for fast dashboard reads).

---

## 4. User Roles Overview

| Role | Description |
|---|---|
| Administrator | Manages issuer onboarding, user accounts, system governance, credential oversight, integrity checks, and audit logs. |
| Root Authority | A type of approved issuer that can create templates, issue credentials, and review subordinate issuer applications under their organization. |
| Subordinate Issuer | Operates under a root authority. Requires two-tier approval (root authority first, then administrator) before gaining credential issuance privileges. |
| Credential Holder | Receives and manages credentials through a digital wallet. Can control visibility, share profiles, and view blockchain history. |
| Verifier | Validates credential authenticity by entering a credential ID. No account required. |

---

## 5. Account Registration

Navigate to the registration page by clicking **Create Account** from the login page or navigation bar. The first step is to select your account type.

*[Screenshot: Role Selection — User or Issuer]*

### 5.1 Creating a User Account (Credential Holder)

Select **User** to create a credential holder account. Fill in the following fields:

- First Name
- Last Name
- Email Address
- Username
- Password and Confirm Password

Click **Register** to create the account. After successful registration, you will be redirected to the login page.

*[Screenshot: User Registration Form]*

### 5.2 Registering as an Issuer

Select **Issuer** to register as a credential-issuing organization. The issuer registration form collects organizational and regulatory information.

*[Screenshot: Issuer Registration Form]*

**Step 1: Organization Details**
- Organization Name
- Organization Email
- Password and Confirm Password

**Step 2: Select Issuer Category**

Select the category that best describes your organization:

- University / Higher Education Institution
- Government Agency or Office
- Training Provider / Private Education Provider
- Industry Certifier / Professional Certification Body
- Others

Each category has specific document requirements. The required documents will be displayed dynamically after selecting a category. These documents are reviewed by the administrator during the approval process.

> **Note:** For details on which documents are required per category, refer to the Technical Manual, Section 8.2.

**Step 3: Select Issuer Type**

- **Root Authority:** An independent issuer that operates its own credential programs and may manage subordinate issuers.
- **Subordinate Issuer:** An issuer that operates under a root authority. If Subordinate is selected, you must also select the Root Authority you are applying under from a searchable dropdown of approved root issuers.

> **Note:** Subordinate issuers require a Root Authority Authorization Letter in addition to their category-specific documents.

**Step 4: Upload Required Documents**

Upload the required documents for your selected category. Each document has a specific purpose described on the form. All documents are stored as CouchDB attachments and reviewed by the administrator.

**Step 5: Submit Registration**

Click **Submit Registration**. Your application will enter Pending status. For subordinate issuers, the root authority must approve first, then the administrator. For root issuers, the administrator reviews and decides directly.

---

## 6. Logging In

Navigate to the login page. Enter your registered email and password, then click **Login**.

*[Screenshot: Login Page]*

The system automatically detects whether the email belongs to an issuer account, a user (credential holder) account, or an administrator account and redirects to the appropriate dashboard:

- Issuers are redirected to the Issuer Dashboard
- Users (credential holders) are redirected to the Student Dashboard (wallet)
- Administrators are redirected to the Admin Dashboard

> **Note:** Verifiers do not need to log in. The verification page is publicly accessible.

### 6.1 Forgot Password

If you forget your password:

1. Click **Forgot Password** on the login page
2. Enter your registered email address
3. An OTP (one-time password) will be sent to your email
4. Enter the OTP and your new password
5. Click **Reset Password**

*[Screenshot: Forgot Password — OTP Flow]*

---

## 7. Administrator Guide

The Admin Dashboard is accessible only to administrator accounts. It provides system-wide management capabilities across five main tabs: Credentials, Issuers, Users, Logs, and Settings.

*[Screenshot: Admin Dashboard — Overview]*

### 7.1 Credentials Tab

The Credentials tab provides a unified view of all credential templates and issued credentials across all approved issuers. Features include:

- Summary statistics: total credentials, issued count, templates count, status breakdown (active, issued, revoked, expired) with visual charts
- Filter by issuer, credential type (templates vs issued), and status
- Search by holder name, holder ID, credential ID, or credential name
- Sort by newest, oldest, or credential name
- View credential details in an expandable row

#### 7.1.1 Running an Integrity Check

The Credentials tab includes a **Run Integrity Check** button that triggers a field-by-field comparison of CouchDB records against blockchain records. The results show:

- Total records checked
- Matched records (CouchDB matches blockchain)
- Mismatched records (fields differ between CouchDB and blockchain)
- Missing records (exist in CouchDB but not on blockchain)
- Errors (records that could not be compared)

If mismatches are found, a detailed table shows which fields differ for each affected credential.

*[Screenshot: Integrity Check Results]*

### 7.2 Issuers Tab

The Issuers tab allows the administrator to manage all issuer accounts. Issuers can be filtered by status:

- **Approved** — currently active issuers
- **Pending** — awaiting admin action (with sub-filters: Admin Actionable, Awaiting Root Approval, Root Approved)
- **Rejected** — previously denied applications
- **Disabled** — issuers whose access has been restricted

#### 7.2.1 Reviewing Issuer Applications

1. Navigate to the Issuers tab and select **Pending**
2. Click on an issuer to view their application details
3. Review submitted documents by clicking the document links (documents are stored as CouchDB attachments and can be viewed or downloaded)
4. Click **Approve** or **Reject**
5. Confirm the action

Approval assigns a Fabric wallet identity and CouchDB connection to the issuer. Rejection records the decision on the blockchain. Both actions generate an admin notification.

> **Note:** For subordinate issuers, the Approve button is disabled until the root authority has approved the application first. The status will show as "Awaiting Root Approval" until then.

*[Screenshot: Issuer Application Review]*

#### 7.2.2 Enabling and Disabling Issuers

From the Approved or Disabled filter views, the administrator can toggle an issuer's status:

- **Disable** — restricts the issuer's access to the platform. Disabled issuers cannot create templates or issue credentials.
- **Enable** — restores a previously disabled issuer's access.

Both actions are recorded on the blockchain as status change logs.

### 7.3 Users Tab

The Users tab displays all registered credential holder accounts. Users can be filtered by:

- **Active** — currently enabled accounts
- **Disabled** — restricted accounts

The administrator can search users by name or email and can enable or disable user accounts. Status changes are logged on the blockchain.

*[Screenshot: Admin Users Tab]*

### 7.4 Logs Tab

The Logs tab provides access to all blockchain-recorded audit trails. Log categories include:

- **Verification Logs** — Records of every credential verification event, including verifier name, verifier email, credential ID, result (valid/revoked/expired/invalid), and timestamp.
- **Status Logs** — Records of issuer and user enable/disable events. Can be filtered by type (issuers only, users only, or all) and searched by email. Each entry can be expanded to see the full status change history for that entity.
- **Issuer Decision Logs** — Records of issuer approval and rejection decisions. Can be filtered by decision type (all, approved, rejected).
- **Root Subordinate Decision Logs** — Records of root authority decisions on subordinate issuer applications. Can be filtered by decision type and searched by organization name.

*[Screenshot: Admin Logs Tab — Verification Logs]*

### 7.5 Admin Notifications

The administrator receives notifications for:

- New issuer registration submissions
- Root authority subordinate decisions (approved or rejected)
- System events

Notifications can be viewed via the bell icon in the admin dashboard header. Individual notifications can be marked as read, or all notifications can be marked as read at once.

---

## 8. Root Authority Guide

Root authorities are approved issuers that have subordinate issuers operating under their organization. In addition to all standard issuer capabilities (creating templates, issuing credentials, revoking credentials), root authorities can manage subordinate issuers.

### 8.1 Accessing Subordinate Management

From the Issuer Dashboard, root authority issuers will see a Subordinate Management section. This section is not visible to subordinate issuers.

*[Screenshot: Issuer Dashboard — Subordinate Management]*

### 8.2 Reviewing Subordinate Applications

1. Navigate to the Subordinate Management view
2. Filter subordinates by status: All, Pending, Root-Approved, Root-Rejected, Approved (fully approved by admin), or Disabled
3. Select a subordinate to review their application details and documents
4. Click **Approve** or **Reject**
5. Confirm the decision

Root authority approval sets the subordinate's `rootApprovalStatus` to approved, making the application visible to the administrator for final approval. Root authority rejection blocks the application from proceeding.

All root authority subordinate decisions are recorded on the blockchain and generate an admin notification.

> **Note:** If no subordinate applications exist for a given filter, an empty state message will be displayed.

---

## 9. Issuer Guide

The Issuer Dashboard provides credential management capabilities for approved issuers. The dashboard has the following views: Home, Create Template, Issue Credential, View All Credentials, Revoke Credential, and Subordinate Management (root authorities only).

*[Screenshot: Issuer Dashboard — Home View]*

### 9.1 Home View

The home view displays summary statistics for the issuer:

- Total credentials (templates + issued)
- Active templates count
- Issued credentials count
- Revoked credentials count

Quick-action cards provide one-click access to Create Template, Issue Credential, Revoke Credential, and View All Credentials.

### 9.2 Creating a Credential Template

A credential template is the reusable blueprint of a credential before it is issued to any holder.

1. Navigate to the Create Template view
2. Fill in the required fields:
   - **Credential Name** — the title of the credential (e.g., "Bachelor of Science in IT")
   - **Credential Type** — category of the credential (e.g., Academic, Professional, Training)
   - **Description** — a detailed description of what the credential represents
   - **Skills** — add individual skills by typing and pressing Enter or clicking Add (e.g., Programming, Database Management)
   - **Badge Image** — upload an image that will be displayed as the credential badge
3. Click **Create Template**

The template is created on the blockchain first (source of truth), then saved to CouchDB for dashboard display. A success or error message will be shown.

*[Screenshot: Create Template Form]*

### 9.3 Issuing a Credential

Issuing a credential assigns a specific credential to a holder based on an existing template.

1. Navigate to the Issue Credential view
2. **Select a Template** — use the searchable dropdown to find and select the template. Templates can be filtered by type.
3. **Select a Recipient** — use the searchable dropdown to find and select the holder. The dropdown shows eligible users (users who have not already received this credential).
4. **Set an Expiry Date (optional)** — if the credential should expire, select a date
5. Click **Issue Credential**

The credential is recorded on the blockchain, saved to the issuer's CouchDB and the admin wallet CouchDB, and a notification is sent to the holder.

> **Note:** A credential cannot be issued to the same holder more than once for the same template. The system prevents duplicate issuance.

*[Screenshot: Issue Credential — Template and Recipient Selection]*

### 9.4 Viewing All Credentials

The View All Credentials section shows all templates and issued credentials belonging to the issuer. Credentials can be searched and filtered.

### 9.5 Revoking a Credential

Revoking a credential marks it as invalid on the blockchain.

1. Navigate to the Revoke Credential view
2. Select the credential to revoke using the searchable dropdown
3. Select the specific holder using the searchable dropdown
4. Provide a revocation reason
5. Click **Revoke Credential**

The revocation is recorded on the blockchain, both CouchDB copies are updated, and a revocation notification is sent to the holder.

*[Screenshot: Revoke Credential Form]*

### 9.6 Credential History

Issuers can view the full blockchain audit trail of their credentials by navigating to Credential History (accessible from the navigation bar). This shows every transaction recorded for each credential, including creation, issuance, revocation, and expiration events with transaction IDs and timestamps.

---

## 10. Credential Holder Guide

The Student Dashboard (wallet) is the primary interface for credential holders. It displays all credentials received from issuers.

*[Screenshot: Student Dashboard — Wallet]*

### 10.1 Dashboard Overview

The dashboard shows a greeting with the user's name and a summary section displaying total credentials, credential statistics, and recent activity. Below the summary, all credentials are displayed.

### 10.2 Viewing Credentials

Credentials can be displayed in two layouts:

- **Cards View** — visual card layout with badge images, credential names, issuer names, and status badges
- **List View** — compact table layout with credential details

Use the toggle buttons to switch between views. Credentials can be filtered and sorted using:

- **Search** — search by credential name, issuer, or type
- **Status filter** — filter by All, Issued, Revoked, or Expired
- **Sort** — sort by Newest, Oldest, or Name

### 10.3 Credential Details

Click on any credential card or list row to open the credential detail modal. The detail view shows:

- Credential name, type, description, and status
- Issuer name and organization
- Issuance date and expiry date (if applicable)
- Skills associated with the credential
- Badge image
- Template details (click to view the parent template information)

### 10.4 Blockchain History

From the credential detail modal, click **View Blockchain History** to see the full on-chain audit trail. Each entry shows the transaction ID, timestamp, and the credential state at that point in time. This proves the credential's lifecycle is immutably recorded.

*[Screenshot: Credential Detail — Blockchain History]*

### 10.5 Managing Credential Visibility

Each credential can be set to Public or Private:

- **Public** — the credential will appear when someone views your shared profile
- **Private** — the credential will be hidden from your shared profile but still visible in your own wallet

Toggle the visibility setting from the credential detail view.

### 10.6 Notifications

The notification bell icon in the dashboard header shows the number of unread notifications. Click it to open the notification panel. Notifications are generated for:

- New credential issuance ("You received a new credential")
- Credential revocation ("Your credential has been revoked")

Individual notifications can be marked as read by clicking on them.

---

## 11. Profile and Sharing

The Profile page allows credential holders and issuers to manage their public profile and share credentials with third parties.

*[Screenshot: Profile Page]*

### 11.1 Editing Profile Information

From the Profile page, you can:

- Update your profile summary/bio text
- Toggle profile visibility between Public and Private
- Upload or change your profile picture

Click **Save** to apply changes.

### 11.2 Credential Display on Profile

The Profile page shows your credentials with search, filter, and sort controls. You can:

- Search credentials by name
- Filter by status (All, Issued, Revoked, Expired)
- Filter by credential type
- Sort by newest, oldest, or name
- Reorder credentials by drag-and-drop to customize the display order on your shared profile

### 11.3 Sharing Your Profile

Click the **Share Profile** button to generate a shareable link. Two sharing modes are available:

- **Specific Recipient** — enter the recipient's email address. The recipient will need to verify their identity via an OTP code sent to that email before viewing your profile.
- **Public Link** — anyone with the link can view your profile without OTP verification.

For both modes, you can set:

- **Link duration** (how long the link remains active, e.g., 7 days, 30 days)
- **Description** (optional note about the purpose of sharing)

After generating the link, copy it to share with the intended recipient.

*[Screenshot: Share Profile Modal — Specific vs Public]*

### 11.4 Managing Share Links

The Profile page includes a Share Links section that displays all generated share links. For each link, the following information is shown:

- Recipient email (or "Anyone" for public links)
- Link type (Specific or Public)
- Status (Active, Expired, or Revoked)
- View count
- Expiration date
- The shareable URL (with a Copy button)

Active links can be revoked by clicking the **Revoke** button, which immediately invalidates the link.

### 11.5 Profile Preview

When a recipient accesses a share link, they see the Profile Preview page. This displays:

- The holder's name, profile picture, and summary
- All public credentials with badge images, names, types, and statuses
- Clicking a credential shows the Badge Details page with full credential information

For specific-recipient links, the viewer must first enter the OTP sent to their email before the profile is displayed.

---

## 12. Verifier Guide

The Verifier Dashboard is publicly accessible and does not require a login.

*[Screenshot: Verifier Dashboard]*

### 12.1 Providing Verifier Information

Before verifying credentials, the verifier is prompted to enter their name and email. This information is recorded on the blockchain as part of the verification log. Click **Continue** to proceed to the verification interface.

*[Screenshot: Verifier Info Form]*

### 12.2 Verifying a Credential

1. Enter the credential ID in the search field
2. Click **Verify**
3. The system checks the credential against both CouchDB and the blockchain
4. The verification result is displayed with a status badge

The verification event is recorded on the blockchain as an immutable log entry, including the verifier's name, email, the result, and a timestamp.

### 12.3 Understanding Verification Results

| Result | Meaning |
|---|---|
| Valid | The credential exists on the blockchain, has not been revoked, and has not expired. It is authentic. |
| Revoked | The credential was previously valid but has been revoked by the issuer. The revocation reason and date are shown. |
| Expired | The credential's expiry date has passed. The credential was valid but is no longer current. |
| Invalid | The credential ID does not exist on the blockchain. The credential may be fake or the ID may be incorrect. |

---

## 13. Settings

The Settings page is accessible to logged-in users and issuers via the navigation bar.

### 13.1 Account Settings

Displays your current account information including name, email, and role.

### 13.2 Changing Your Password

1. Navigate to Settings
2. Click **Change Password**
3. Enter your current password
4. Enter and confirm your new password
5. Click **Save**

A success or error message will be displayed.

### 13.3 Notification Preferences

The notification settings section allows you to toggle email notifications and push notifications on or off.

---

## 14. Notifications and Alerts

ChainCert generates notifications for key events. Notifications are accessible via the bell icon in the dashboard header.

### 14.1 User Notifications

Credential holders receive notifications for:

- **Credential issuance** — when a new credential is issued to your wallet
- **Credential revocation** — when an issuer revokes one of your credentials

### 14.2 Admin Notifications

Administrators receive notifications for:

- New issuer registration submissions
- Root authority subordinate decisions (approved or rejected)

Notifications can be marked as read individually or all at once using the "Mark All Read" button.

---

## 15. Common Terms and Statuses

| Term / Status | Description |
|---|---|
| Pending | Application is awaiting review and approval. |
| Awaiting Root Approval | Subordinate issuer application is waiting for the root authority to approve before the admin can act. |
| Root Approved | Root authority has approved the subordinate; now awaiting administrator approval. |
| Approved | Application or issuer has been fully approved and is active. |
| Rejected | Application has been denied. The reason is logged on the blockchain. |
| Disabled | Account or issuer access has been restricted by the administrator. |
| Active | Account or issuer is active. |
| Issued | Credential has been issued to a holder and is currently valid. |
| Revoked | Credential has been invalidated by the issuer. |
| Expired | Credential's expiry date has passed. No longer current. |
| Credential Template | A reusable blueprint that defines a credential's name, type, description, and skills before it is issued. |
| Issued Credential | A specific credential instance assigned to a holder, based on a template. |
| Blockchain | The immutable distributed ledger that records all credential lifecycle and governance events. |
| Integrity Check | An admin-triggered comparison of CouchDB records against blockchain records to detect mismatches. |
| Dual-Write | The pattern where data is written to blockchain first (source of truth), then to CouchDB (for fast reads). |
| Fabric Identity | The X.509 certificate-based identity used to sign blockchain transactions on behalf of an issuer. |
| OTP | One-Time Password sent via email for password reset or share link verification. |

---

## 16. Troubleshooting

| Issue | Resolution |
|---|---|
| Cannot log in | Verify that your email and password are correct. If your account has been disabled by an administrator, contact support. Use the Forgot Password flow if needed. |
| No credentials displayed in wallet | No credentials have been issued to your account yet. Ensure the issuer has issued a credential to your registered email. Check the status filter (make sure it is set to "All"). |
| Cannot issue credentials (issuer) | Ensure your issuer account is approved and not disabled. Ensure you have created at least one credential template first. |
| Credential verification fails | Verify that the credential ID is entered correctly (exact match required). Check the credential status — revoked or expired credentials will show those statuses rather than "valid." |
| Subordinate issuer cannot be approved | The root authority must approve the subordinate first. Check the issuer's `rootApprovalStatus` — admin approval is blocked until the root authority gate passes. |
| Share link does not work | The link may have expired or been revoked. Check the Share Links section in your profile to verify the link's status. |
| OTP not received | Check your spam/junk folder. Ensure the email address is correct. OTP codes are time-limited — request a new one if the previous code has expired. |
| Documents not uploading during registration | Ensure files are in a supported format and within size limits. Try a different browser if the issue persists. |
| Integrity check shows mismatches | Mismatches indicate that CouchDB data differs from blockchain records. This may result from a partial write failure. The blockchain record is the source of truth. |

---

## 17. Support and Contact Information

For issues not covered in this manual:

- Contact the system administrator through your organization
- Reach out to ChainCert platform support
- Consult the Technical Manual (CAP-2459-IT) for system architecture and deployment details
- Consult the Installation Manual (CAP-2459-IT) for setup and configuration procedures
