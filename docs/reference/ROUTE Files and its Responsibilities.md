<!-- Auto-generated Markdown reference from "ROUTE Files and its Responsibilities.pdf". The PDF remains the human-readable source of truth. -->

# Updated Route File Responsibilities (Backend)

Internal reference for the dev team: which Express route file each new endpoint belongs in, grouped by API/domain. Pair this with the controller responsibilities doc (route = domain grouping; controller = business responsibility).

## 1. authRoutes.js

**Purpose:** Handles authentication and basic user account operations.

**When to put routes here:**

- User login (unified user-vs-issuer resolution in one request)
- User registration (now gated by an emailed signup OTP)
- Email-availability checks and signup OTP flow
- Profile updates
- Password changes
- Uploading profile pictures
- Fetching user info
- Fetching users
- Forgot / reset password (OTP-based)
- Profile share links (generate, public generate, my-links, info, record-view, OTP-gated access, revoke)

**Example endpoints:**

```
POST   /api/auth/register
POST   /api/auth/check-email
POST   /api/auth/signup/request-otp
POST   /api/auth/signup/confirm-otp
POST   /api/auth/login
GET    /api/auth/user/:id
GET    /api/auth/users
POST   /api/auth/change-password
POST   /api/auth/update-profile
POST   /api/auth/upload-pfp
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/profile-share/generate
POST   /api/auth/profile-share/generate-public
GET    /api/auth/profile-share/my-links
GET    /api/auth/profile-share/:token/info
POST   /api/auth/profile-share/:token/record-view
POST   /api/auth/profile-share/:token/request-otp
POST   /api/auth/profile-share/:token/verify-otp
DELETE /api/auth/profile-share/:token/revoke
```

**CAP2 note:** `POST /api/auth/login` is the unified login (resolves user vs issuer server-side in one request). `POST /api/auth/signup/request-otp` + `/signup/confirm-otp` and `POST /api/auth/check-email` were added so new-account registration verifies email ownership before `register` saves the user. Profile-share and forgot/reset-password routes are handled by `accountController`.

**Rule of thumb:** If the feature involves logging in or managing the general user account, it belongs here.

## 2. adminRoutes.js

**Purpose:** Handles system administration features. These routes are used by the admin dashboard.

**When to put routes here:**

- Approving issuers
- Rejecting issuers
- Enabling/disabling issuers
- Enabling/disabling users
- Viewing system logs (status logs, issuer decision logs, root-subordinate decision logs)
- Viewing issuer lists (pending / approved / rejected / disabled, plus root & subordinate filters)
- Root-authority views of subordinate issuers + root approve/reject
- Managing subordinate approvals
- Admin notifications (list, unread, mark-read, read-all)
- Admin dashboard aggregation (all issuer credentials)
- Triggering admin-only maintenance actions (expiry check, integrity check)
- Admin password change (blockchain-audited)

**Example endpoints:**

```
GET   /api/admin/pending-issuers
GET   /api/admin/pending-issuers-admin-actionable
GET   /api/admin/approved-issuers
GET   /api/admin/rejected-issuers
GET   /api/admin/disabled-issuers
GET   /api/admin/pending-root-issuers
GET   /api/admin/pending-subordinate-issuers
GET   /api/admin/pending-subordinate-awaiting-root
GET   /api/admin/pending-subordinate-root-approved
GET   /api/admin/root/subordinates/pending
GET   /api/admin/root/subordinates/all
GET   /api/admin/root/subordinates/root-approved
GET   /api/admin/root/subordinates/root-rejected
GET   /api/admin/root/subordinates/approved
GET   /api/admin/root/subordinates/disabled
POST  /api/admin/approve-issuer/:issuerId
POST  /api/admin/reject-issuer/:issuerId
POST  /api/admin/disable-issuer/:issuerId
POST  /api/admin/enable-issuer/:issuerId
POST  /api/admin/disable-user/:userId
POST  /api/admin/enable-user/:userId
POST  /api/admin/root-approve-subordinate/:issuerId
POST  /api/admin/root-reject-subordinate/:issuerId
GET   /api/admin/notifications
GET   /api/admin/notifications/unread
PATCH /api/admin/notifications/:notificationId/read
PATCH /api/admin/notifications/read-all
GET   /api/admin/credentials/all
POST  /api/admin/trigger-expiry-check
POST  /api/admin/integrity-check
POST  /api/admin/trigger-integrity-check
POST  /api/admin/change-password
GET   /api/admin/status-logs
GET   /api/admin/status-logs/issuers
GET   /api/admin/status-logs/users
GET   /api/admin/status-logs/issuer/:issuerEmail
GET   /api/admin/status-logs/user/:userEmail
GET   /api/admin/issuer-decision-logs
GET   /api/admin/issuer-decision-logs/approved
GET   /api/admin/issuer-decision-logs/rejected
GET   /api/admin/issuer-decision-logs/:issuerEmail
GET   /api/admin/root-subordinate-logs
GET   /api/admin/root-subordinate-logs/approved
GET   /api/admin/root-subordinate-logs/rejected
GET   /api/admin/root/subordinate-logs
GET   /api/admin/root/subordinate-logs/approved
GET   /api/admin/root/subordinate-logs/rejected
```

**CAP2 / hardening note:** The `/api/admin` mount enforces `requireAuth`; a per-route `requireAdmin` guard adds the admin-role check on the admin-only endpoints. Root-authority routes are intentionally left off `requireAdmin` (they require role `issuer` and are checked inside `rootAuthorityController`). `POST /api/admin/integrity-check` (and its `/trigger-integrity-check` alias) run the CouchDB→ledger integrity reconciliation. Issuer enable/disable can be frozen for UAT via `DISABLE_ISSUER_TOGGLE`.

**Rule of thumb:** If the feature is only accessible from the Admin Dashboard or is an admin-only action, it belongs here.

## 3. issuerRoutes.js

**Purpose:** Handles issuer-specific operations. Used by issuer dashboards, including root authorities and subordinates.

**When to put routes here:**

- Issuer registration
- Issuer login
- Issuer document viewing (metadata + individual document download)
- Checking issuer requirements
- Public root-authority list (for the registration form's parent picker)
- Public issuer directory (browse/search approved issuers)
- Fetching issuer credentials
- Creating credential templates
- Viewing eligible users
- Viewing issuer credential history
- Issuer-scoped Verification Reach (verifications of this issuer's own credentials)
- Renewal-request queue + approve/decline decision (logged on-chain)
- Issuer in-app notifications (list, unread, mark-read)

**Example endpoints:**

```
POST  /api/issuer/register
POST  /api/issuer/login
GET   /api/issuer/issuer-requirements/:category
GET   /api/issuer/root-authorities
GET   /api/issuer/directory
GET   /api/issuer/issuer/:issuerId/documents
GET   /api/issuer/issuer/:issuerId/documents/:attachmentName
GET   /api/issuer/issuer/templates/exists
GET   /api/issuer/issuer/:issuerId/credentials
GET   /api/issuer/issuer/templates/:templateId/eligible-users
POST  /api/issuer/credentials/create
GET   /api/issuer/credentials/history
GET   /api/issuer/my-verifications
GET   /api/issuer/renewal-requests
PATCH /api/issuer/renewal-requests/:requestId/decision
GET   /api/issuer/notifications
GET   /api/issuer/notifications/unread
PATCH /api/issuer/notifications/:notificationId/read
```

**CAP2 note:** `GET /api/issuer/my-verifications` returns the issuer's own Verification Reach, filtered server-side by `issuerID` derived from `req.user.id` (no IDOR). `GET /api/issuer/renewal-requests` + `PATCH /api/issuer/renewal-requests/:requestId/decision` handle the credential renewal queue; the decision endpoint is injected with the gateway so approve/decline is written on-chain via `LogRenewalDecision`. `GET /api/issuer/root-authorities` and `GET /api/issuer/directory` are public (no auth) for the registration form and public directory.

**Rule of thumb:** If the feature is something an issuer does or something tied to issuer onboarding/dashboard behavior, it belongs here.

## 4. credentialRoutes.js

**Purpose:** Handles the credential lifecycle. This file now focuses only on credential-related operations, not wallet UI behavior.

**When to put routes here:**

- Issuing credentials
- Revoking credentials
- Fetching credential templates
- Fetching issued credentials
- Fetching an issuer's credentials from the issuer CouchDB
- Fetching credential history
- Credential verification actions tied directly to a credential ID
- Verifier email-OTP flow (prove email ownership before logging a verification)

**Example endpoints:**

```
GET  /api/credentials/templates
GET  /api/credentials/issued
GET  /api/credentials/issuer/:issuerID
POST /api/credentials/:credentialId/issue
POST /api/credentials/:credentialId/revoke
GET  /api/credentials/:id/history
POST /api/credentials/verify/request-otp
POST /api/credentials/verify/confirm-otp
GET  /api/credentials/:credentialId/verify
POST /api/credentials/:credentialId/log-verification
```

**CAP2 note:** `POST /api/credentials/verify/request-otp` + `/verify/confirm-otp` (V1) let a verifier prove email ownership and receive a short-lived `verifier_email_proof` token; `POST /api/credentials/:credentialId/log-verification` requires that token so the logged verifier email cannot be spoofed. These literal `/verify/*` paths are declared before the `/:credentialId/*` routes so they are not param-matched.

**Rule of thumb:** If the route directly manipulates or reads the credential itself, it belongs here.

## 5. walletRoutes.js

**Purpose:** Handles student wallet-specific operations. This is for wallet display/state management, not credential issuance logic.

**When to put routes here:**

- Fetching a student's wallet credentials
- The holder's OWN verification logs (server-side filtered, no IDOR)
- Credential renewal requests (holder side: create + list own)
- Updating credential visibility
- Updating credential display order
- Updating issuer-template visibility
- Holder in-app notifications (list, unread, mark-read)

**Example endpoints:**

```
GET   /api/wallet/credentials/:holderID
GET   /api/wallet/my-verifications
POST  /api/wallet/renewal-requests
GET   /api/wallet/renewal-requests
PATCH /api/wallet/visibility/:credentialId
PATCH /api/wallet/order/:credentialId
PATCH /api/wallet/issuer-template-visibility/:credentialId
GET   /api/wallet/notifications/:holderID
GET   /api/wallet/notifications/:holderID/unread
PATCH /api/wallet/notifications/:notificationId/read
```

**CAP2 note:** `GET /api/wallet/my-verifications` returns the authenticated holder's own verification logs, filtered server-side (holder derived from `req.user.id`, not a URL param → no IDOR). `POST /api/wallet/renewal-requests` lets a holder ask an issuer to renew one of their credentials; `GET /api/wallet/renewal-requests` returns the holder's own pending requests. Both derive identity from the JWT.

**Rule of thumb:** If the feature is specifically about how credentials appear or behave in the student wallet UI, it belongs here.

## 6. verificationRoutes.js

**Purpose:** Handles credential verification. Used by verifiers and public verification systems.

**When to put routes here:**

- Verifying credentials
- Fetching verification logs
- Verification statistics

**Example endpoints:**

```
GET  /api/verify/verify/:credentialId
POST /api/verify/verify
GET  /api/verify/verify-stats
GET  /api/verify/verify-credential/:credentialId
GET  /api/verify/verification-logs
GET  /api/verify/verification-logs/:logId
```

**Note:** `GET /api/verify/verify-credential/:credentialId` is a legacy verification alias. Verification-log reads are admin-scoped.

**Rule of thumb:** If the feature involves checking whether a credential is valid, it belongs here.

## 7. systemRoutes.js

**Purpose:** Handles system-level endpoints. Currently used for server health checks.

**Example endpoint:**

```
GET /api/health
```

**Rule of thumb:** Used for diagnostics, health checks, or server monitoring -- not application business logic.

## Quick Mental Model

Think of your routes like departments:

| Route File | Department |
|---|---|
| `authRoutes` | User Accounts / Login |
| `adminRoutes` | Platform Administration |
| `issuerRoutes` | Issuer Management / Onboarding |
| `credentialRoutes` | Credential Lifecycle |
| `walletRoutes` | Student Wallet |
| `verificationRoutes` | Credential Verification |
| `systemRoutes` | System Health |

## Example: Where should a new endpoint go?

| Feature | Route File |
|---|---|
| Admin wants to download a list of disabled issuers | `adminRoutes.js` |
| Issuer wants to create a new credential template | `issuerRoutes.js` |
| Student wants to hide a credential from their wallet | `walletRoutes.js` |
| Verifier checks a credential's validity (by credential ID / link) | `verificationRoutes.js` |
| Issuer wants to revoke a credential | `credentialRoutes.js` |
