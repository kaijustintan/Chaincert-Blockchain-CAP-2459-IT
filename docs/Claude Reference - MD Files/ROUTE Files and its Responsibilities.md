<!-- Auto-generated Markdown reference from "ROUTE Files and its Responsibilities.pdf". The PDF remains the human-readable source of truth. -->

# Updated Route File Responsibilities (Backend)

## 1. authRoutes.js

**Purpose:** Handles authentication and basic user account operations.

**When to put routes here:**

- User login
- User registration
- Profile updates
- Password changes
- Uploading profile pictures
- Fetching user info
- Fetching users

**Example endpoints:**

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/user/:id
GET  /api/auth/users
POST /api/auth/change-password
POST /api/auth/update-profile
POST /api/auth/upload-pfp
```

**Rule of thumb:** If the feature involves logging in or managing the general user account, it belongs here.

## 2. adminRoutes.js

**Purpose:** Handles system administration features. These routes are used by the admin dashboard.

**When to put routes here:**

- Approving issuers
- Rejecting issuers
- Enabling/disabling issuers
- Enabling/disabling users
- Viewing system logs
- Viewing issuer lists
- Managing subordinate approvals
- Triggering admin-only maintenance actions

**Example endpoints:**

```
GET  /api/admin/pending-issuers
GET  /api/admin/approved-issuers
POST /api/admin/approve-issuer/:issuerId
POST /api/admin/reject-issuer/:issuerId
POST /api/admin/disable-issuer/:issuerId
POST /api/admin/enable-user/:userId
GET  /api/admin/status-logs
POST /api/admin/trigger-expiry-check
```

**Rule of thumb:** If the feature is only accessible from the Admin Dashboard or is an admin-only action, it belongs here.

## 3. issuerRoutes.js

**Purpose:** Handles issuer-specific operations. Used by issuer dashboards, including root authorities and subordinates.

**When to put routes here:**

- Issuer registration
- Issuer login
- Issuer document viewing
- Checking issuer requirements
- Fetching issuer credentials
- Creating credential templates
- Viewing eligible users
- Viewing issuer credential history

**Example endpoints:**

```
POST /api/issuer/register
POST /api/issuer/login
GET  /api/issuer/issuer-requirements/:category
GET  /api/issuer/issuer/:issuerId/documents
GET  /api/issuer/issuer/templates/:templateId/eligible-users
POST /api/issuer/credentials/create
GET  /api/issuer/credentials/history
```

**Rule of thumb:** If the feature is something an issuer does or something tied to issuer onboarding/dashboard behavior, it belongs here.

## 4. credentialRoutes.js

**Purpose:** Handles the credential lifecycle. This file now focuses only on credential-related operations, not wallet UI behavior.

**When to put routes here:**

- Issuing credentials
- Revoking credentials
- Fetching credential templates
- Fetching issued credentials
- Fetching credential history
- Credential verification actions tied directly to a credential ID

**Example endpoints:**

```
GET  /api/credentials/templates
GET  /api/credentials/issued
POST /api/credentials/:credentialId/issue
POST /api/credentials/:credentialId/revoke
GET  /api/credentials/:credentialId/history
GET  /api/credentials/:credentialId/verify
POST /api/credentials/:credentialId/log-verification
```

**Rule of thumb:** If the route directly manipulates or reads the credential itself, it belongs here.

## 5. walletRoutes.js

**Purpose:** Handles student wallet-specific operations. This is for wallet display/state management, not credential issuance logic.

**When to put routes here:**

- Fetching a student's wallet credentials
- Updating credential visibility
- Updating credential display order

**Example endpoints:**

```
GET   /api/wallet/credentials/:holderID
PATCH /api/wallet/visibility/:credentialId
PATCH /api/wallet/order/:credentialId
```

**Rule of thumb:** If the feature is specifically about how credentials appear or behave in the student wallet UI, it belongs here.

## 6. verificationRoutes.js

**Purpose:** Handles credential verification. Used by verifiers and public verification systems.

**When to put routes here:**

- Verifying credentials
- Fetching verification logs
- Verification statistics

**Example endpoints:**

```
GET  /api/verify/verify/:credentialID
POST /api/verify/verify
GET  /api/verify/verification-logs
GET  /api/verify/verification-logs/:logId
GET  /api/verify/verify-stats
```

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
| Verifier scans a QR code and checks credential validity | `verificationRoutes.js` |
| Issuer wants to revoke a credential | `credentialRoutes.js` |
