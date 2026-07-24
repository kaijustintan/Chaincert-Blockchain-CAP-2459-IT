<!-- Auto-generated Markdown reference from "CONTROLLER Files and its Responsibilities.pdf". The PDF remains the human-readable source of truth. -->

# Updated Controller File Responsibilities (Backend)

Discusses the use case and distinction between controller files.

## 1. authController.js

**Purpose:** Handles authentication and account entry logic.

**When to put functions here:**

- User registration (gated by an emailed signup OTP)
- Signup email-OTP flow + email-availability check
- User login (legacy) and unified user-vs-issuer login
- Issuer login
- Password changes related to authentication/account access

**Example functions:**

- `register`
- `requestSignupOtp`
- `confirmSignupOtp`
- `checkEmail`
- `login`
- `unifiedLogin`
- `loginIssuer`
- `changePassword`

**CAP2 additions:** `requestSignupOtp` emails a 6-digit code and `confirmSignupOtp` issues a short-lived `signup_email_proof` JWT; `register` now REQUIRES that token (purpose + matching email) before saving the user, so a new account's email is server-proven (behind a `DISABLE_SIGNUP_OTP` testing toggle). `checkEmail` is a lightweight email-availability probe for the registration wizard. `unifiedLogin` resolves user-vs-issuer server-side in one request; the legacy `login` and `loginIssuer` remain available (the latter is aliased at `/api/issuer/login`).

**Rule of thumb:** If the feature is about logging in, registering, or proving identity/access, it belongs here.

## 2. accountController.js

**Purpose:** Handles general user account and profile management.

**When to put functions here:**

- Fetching user info
- Fetching all users
- Updating profile details
- Uploading profile pictures
- Profile share links (generate, public generate, my-links, info, record-view, OTP-gated access, revoke)
- Forgot / reset password (OTP-based)

**Example functions:**

- `getUserInfo`
- `getAllUsers`
- `updateProfile`
- `uploadProfilePicture`
- `generateShareLink`
- `generatePublicShareLink`
- `getMyShareLinks`
- `getShareLinkInfo`
- `recordView`
- `requestOTP`
- `verifyOTP`
- `revokeShareLink`
- `forgotPassword`
- `resetPassword`

**Note:** The profile-share functions back the `/api/auth/profile-share/*` routes; `requestOTP` + `verifyOTP` gate recipient-specific share access (and `verifyOTP` also returns a `verifierProofToken` reused by bulk verification). `forgotPassword` + `resetPassword` handle the OTP-based password reset.

**Rule of thumb:** If the feature is about the user's account details or profile, but not login/auth itself, it belongs here.

## 3. issuerOnboardingController.js

**Purpose:** Handles issuer onboarding, issuer application requirements, and issuer-submitted documents.

**When to put functions here:**

- Issuer registration
- Fetching issuer requirements by category
- Viewing submitted issuer documents
- Reviewing onboarding-related issuer files
- Public root-authority list (registration form parent picker)
- Public issuer directory (browse/search approved issuers)

**Example functions:**

- `registerIssuer`
- `getIssuerRequirementsByCategory`
- `getIssuerDocuments`
- `viewIssuerDocument`
- `getPublicRootAuthorities`
- `getPublicDirectory`

**CAP2 additions:** `getPublicRootAuthorities` serves the minimal approved-root-authority list to the registration form (public, no auth — a subordinate picks its parent before it has an account; replaces the old admin-only approved-issuers call). `getPublicDirectory` powers the public issuer directory with credibility aggregates.

**Rule of thumb:** If the feature is about becoming an issuer, submitting onboarding requirements, or viewing issuer application documents, it belongs here.

## 4. issuerCredentialController.js

**Purpose:** Handles issuer-side credential lifecycle operations tied to creation, issuance, revocation, history, and issuer credential reads.

**When to put functions here:**

- Creating credential templates
- Issuing credentials
- Revoking credentials
- Fetching issuer templates
- Fetching issued credentials
- Checking if issuer has templates
- Fetching credential history
- Getting eligible users for a template
- Issuer-scoped Verification Reach (verifications of the issuer's own credentials)
- Handling credential renewal requests (issuer queue + approve/decline decision)
- Issuer in-app notifications (list, unread, mark-read)

**Example functions:**

- `Create_CredentialTemplate`
- `Issue_Credential`
- `revoke_Credential`
- `get_CredentialTemplatesByIssuerID`
- `get_IssuerIssuedCredentials`
- `check_IssuerHasTemplates`
- `Get_CredentialHistory`
- `getEligibleUsersForTemplate`
- `getCredentialTemplates`
- `getIssuerCredentials`
- `getIssuerVerifications`
- `getRenewalRequests`
- `decideRenewalRequest`
- `getIssuerNotifications`
- `getUnreadIssuerNotifications`
- `markIssuerNotificationAsRead`

**CAP2 additions:** `getIssuerVerifications` returns the issuer's own Verification Reach by filtering the global verification log server-side on `issuerID` (derived from `req.user.id`, so no IDOR; forged/not-found logs have empty `issuerID` and are excluded). `getRenewalRequests` reads this issuer's renewal-request queue; `decideRenewalRequest` records the approve/decline outcome and submits `LogRenewalDecision` on-chain for both decisions (best-effort — a log failure never fails the decision). The notification functions are scoped to the issuer via `req.user.id`.

**Rule of thumb:** If the feature is about the issuer creating, issuing, revoking, or viewing credentials, it belongs here.

## 5. adminIssuerController.js

**Purpose:** Handles admin-side issuer lifecycle management.

**When to put functions here:**

- Viewing issuer lists by status
- Approving issuers
- Rejecting issuers
- Enabling/disabling issuers
- Fetching pending root/subordinate issuers
- Fetching admin-actionable issuer queues

**Example functions:**

- `getPendingIssuers`
- `getAdminActionablePendingIssuers`
- `getApprovedIssuers`
- `getRejectedIssuers`
- `getDisabledIssuers`
- `getPendingRootIssuers`
- `getPendingSubordinateIssuers`
- `getPendingSubordinateIssuersAwaitingRootApproval`
- `getPendingSubordinateIssuersRootApproved`
- `Approve_Issuer`
- `Reject_Issuer`
- `Disable_Issuer`
- `Enable_Issuer`

**Rule of thumb:** If the feature is about the admin managing issuers and issuer statuses, it belongs here.

## 6. rootAuthorityController.js

**Purpose:** Handles root authority governance over subordinate issuers.

**When to put functions here:**

- Viewing subordinate issuers under a root authority
- Approving subordinate issuers at root level
- Rejecting subordinate issuers at root level
- Filtering subordinate issuers by status

**Example functions:**

- `getPendingSubordinatesForRoot`
- `getAllSubordinatesForRoot`
- `getRootApprovedSubordinatesForRoot`
- `getRootRejectedSubordinatesForRoot`
- `getApprovedSubordinatesForRoot`
- `getDisabledSubordinatesForRoot`
- `rootApproveSubordinateIssuer`
- `rootRejectSubordinateIssuer`

**Rule of thumb:** If the feature is about a root authority managing subordinate issuers, it belongs here.

## 7. adminAuditController.js

**Purpose:** Handles admin-only logs, audit trails, security-sensitive admin actions, and user status management.

**When to put functions here:**

- Admin password change with blockchain audit log
- Viewing status logs
- Viewing issuer/user status logs
- Viewing issuer decision logs
- Enabling/disabling users
- Security/audit-related admin actions

**Example functions:**

- `changeAdminPasswordSecure`
- `getAllStatusLogs`
- `getAllIssuerStatusLogs`
- `getAllUserStatusLogs`
- `getIssuerStatusLogs`
- `getUserStatusLogs`
- `getAllIssuerDecisionLogs`
- `getAllIssuerApprovalLogs`
- `getAllIssuerRejectionLogs`
- `getIssuerDecisionLogs`
- `Disable_User`
- `Enable_User`

**Rule of thumb:** If the feature is about logs, audit trail, admin security actions, or admin-controlled user status changes, it belongs here.

## 8. adminDashboardController.js

**Purpose:** Handles admin dashboard aggregation and dashboard-wide maintenance actions.

**When to put functions here:**

- Fetching admin-wide credential dashboard data
- Triggering expiry checks
- Dashboard summary/overview operations
- Admin dashboard data aggregation

**Example functions:**

- `getAllIssuerCredentialsAdminController`
- `triggerExpiryCheck`

**Rule of thumb:** If the feature is specifically for the Admin Dashboard overview or maintenance tools, it belongs here.

## 9. walletController.js

**Purpose:** Handles student wallet behavior and wallet-specific credential display/state.

**When to put functions here:**

- Fetching wallet credentials
- Fetching the holder's OWN verification logs (server-side filtered)
- Credential renewal requests (holder create + list own)
- Updating credential visibility
- Updating credential order
- Updating issuer-template visibility
- Holder in-app notifications (list, unread, mark-read)
- Wallet-only credential presentation logic

**Example functions:**

- `getUserCredentials`
- `getMyVerifications`
- `requestCredentialRenewal`
- `getMyRenewalRequests`
- `updateCredentialVisibility`
- `updateCredentialOrder`
- `updateIssuerTemplateVisibility`
- `getUserNotifications`
- `getUnreadUserNotifications`
- `markNotificationAsRead`

**CAP2 additions:** `getMyVerifications` resolves the holder's own credential IDs and filters the global verification log server-side, deriving the holder from `req.user.id` (not a URL param → no IDOR). `requestCredentialRenewal` (C11) lets a holder ask the issuer to renew one of their credentials, stored as a `renewal_request` doc in the existing `user_notifications` DB; `getMyRenewalRequests` returns the holder's own requests (drives the pending "Requested" button state). All are scoped by the JWT identity.

**Rule of thumb:** If the feature is about how credentials appear or behave in the student wallet, it belongs here.

## 10. verifierController.js

**Purpose:** Handles credential verification and verification logging/statistics.

**When to put functions here:**

- Verifying credentials
- Verifier email-OTP flow (prove email ownership before logging)
- Logging verification events (OTP-proven verifier email)
- Fetching verification logs
- Fetching verification stats

**Example functions:**

- `Verify_Credential`
- `requestVerifierOtp`
- `confirmVerifierOtp`
- `logVerificationEvent`
- `getAllVerificationLogs`
- `getVerificationLogById`
- `getVerificationStats`

**CAP2 additions (V1):** `requestVerifierOtp` emails a 6-digit code and `confirmVerifierOtp` issues a short-lived `verifier_email_proof` JWT. `logVerificationEvent` REQUIRES that token and logs the verifier email FROM the token (not the request body), so the recorded verifier email cannot be spoofed. The verify-READ path (`Verify_Credential`) stays public; only LOGGING requires the token. The verifier's display NAME is still self-reported. Not-found verifications are also logged so forgery attempts appear in analytics.

**Rule of thumb:** If the feature is about checking whether a credential is valid, or about verification logs and stats, it belongs here.

## Quick Mental Model

Think of your controllers like backend workers with specialties:

| Controller File | Responsibility |
|---|---|
| `authController` | Authentication / Access Entry |
| `accountController` | User Profile / Account Data |
| `issuerOnboardingController` | Issuer Application / Requirements / Documents |
| `issuerCredentialController` | Issuer Credential Operations |
| `adminIssuerController` | Admin Management of Issuers |
| `rootAuthorityController` | Root Authority over Subordinates |
| `adminAuditController` | Admin Logs / Audit / Security / User Status |
| `adminDashboardController` | Admin Dashboard Aggregation / Maintenance |
| `walletController` | Student Wallet Behavior |
| `verifierController` | Credential Verification |

## Example: Which controller should a new feature use?

| Feature | Controller |
|---|---|
| User wants to update their profile picture | `accountController.js` |
| Issuer submits onboarding documents during registration | `issuerOnboardingController.js` |
| Issuer wants to issue a certificate to a student | `issuerCredentialController.js` |
| Admin wants to reject an aspiring issuer | `adminIssuerController.js` |
| Root authority wants to approve a subordinate issuer | `rootAuthorityController.js` |
| Admin wants to view all issuer rejection logs | `adminAuditController.js` |
| Admin wants dashboard-wide credential counts | `adminDashboardController.js` |
| Student wants to hide a credential in wallet | `walletController.js` |
| Verifier checks a credential's validity (by credential ID / link) | `verifierController.js` |
| User logs into the platform | `authController.js` |

## Easy Rule for Future Development

When adding a new backend feature, ask:

**1. Who is performing the action?**

- user/account holder → maybe `accountController`
- issuer → maybe `issuerOnboardingController` or `issuerCredentialController`
- admin → maybe `adminIssuerController`, `adminAuditController`, or `adminDashboardController`
- root authority → `rootAuthorityController`
- verifier/public checker → `verifierController`

**2. What is the action mainly about?**

- login/auth → `authController`
- profile/account info → `accountController`
- onboarding/documents → `issuerOnboardingController`
- credential lifecycle → `issuerCredentialController`
- issuer governance → `adminIssuerController`
- subordinate governance → `rootAuthorityController`
- logs/audit/security → `adminAuditController`
- dashboard aggregation → `adminDashboardController`
- wallet display/state → `walletController`
- verification → `verifierController`

## Suggested Rule of Thumb Per Layer

This helps avoid confusion next time:

- **Route file** = based on API/domain grouping
- **Controller file** = based on business responsibility
- **Service file** = shared data access / DB / helper logic
- **Chaincode** = blockchain source of truth logic

So:

- If you're deciding which endpoint file gets the route → check the route responsibilities
- If you're deciding where the backend logic should live → check the controller responsibilities
