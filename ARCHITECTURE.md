# ChainCert — Architecture

Blockchain-backed academic and professional credential platform built on Hyperledger Fabric.
Issuers (universities, government bodies, training providers) issue tamper-evident digital
credentials to holders, who share them with verifiers.

This document is the technical reference for the system's design. For known constraints and
accepted tradeoffs, see [`LIMITATIONS.md`](LIMITATIONS.md).

---

## 1. Three cooperating layers

```
React SPA  ──Axios──▶  Express API  ──Fabric Gateway SDK──▶  Hyperledger Fabric
                            │                                  (chaincert chaincode)
                            └──────────▶  CouchDB
                                          (off-chain mirror + state DB)
```

| Layer | Location | Role |
|---|---|---|
| **Frontend** | `src/` (excluding `controllers/`, `routes/`) | React SPA. Talks *only* to the Express API. |
| **Backend API** | `backend/` + `src/controllers/` + `src/routes/` | Express. Holds the Fabric wallets. The single chokepoint for all ledger access. |
| **Chaincode** | `chaincode/` | Fabric smart contract (`ChainCertContract`), contract name `chaincert`. |

### The `src/` layout quirk

`src/controllers/*.js` and `src/routes/*.js` are **Express backend files, not React**. They live
under `src/` for historical repo-organization reasons but deploy to the API host alongside
`backend/`. Their relative `require('../couchDB_service')` paths resolve against the *deployed*
layout, not the repo layout:

```
repo                              deployed (API host)
────────────────────────────────  ──────────────────────────
backend/sdk-server-fixed.js   →   ~/chaincert-api/sdk-server-fixed.js
backend/couchDB_service.js    →   ~/chaincert-api/couchDB_service.js
backend/securityHelpers.js    →   ~/chaincert-api/securityHelpers.js
src/controllers/*.js          →   ~/chaincert-api/controllers/*.js
src/routes/*.js               →   ~/chaincert-api/routes/*.js
src/utils/nameSimilarity.js   →   ~/chaincert-api/utils/nameSimilarity.js
chaincode/index.js            →   ~/chaincert-chaincode/index.js
```

Do not "fix" these paths to resolve in the repo — that breaks deployment. `deploy-sync.sh`
performs this mapping. It copies backend root files **by explicit name** and globs only
`src/controllers/` and `src/routes/`, so **a new backend module requires a new line in that
script** or the API fails at boot with `MODULE_NOT_FOUND`.

`src/utils/` is otherwise frontend ES-module code. `nameSimilarity.js` is the single exception
(CommonJS, shared by both sides) and is copied by name, never by glob.

---

## 2. Request flow

The SPA never touches Fabric or CouchDB directly. Every request passes through the API, which:

1. **Decodes** the JWT (`Authorization: Bearer …`) into `req.user`, or `null`.
2. **Authorizes** via guards in `backend/securityHelpers.js` (see §3).
3. **Reads/writes** off-chain state through `couchDB_service.js`.
4. **Submits/queries** on-chain through `getContractAndGateway(identityName, orgName)`.

`getContractAndGateway` is exposed to routers as `app.locals.getContractAndGateway` and passed
*into* controllers as a parameter rather than imported — so controllers never own a gateway
lifecycle. Background jobs follow the same shape (`initExpiryCron(getContractAndGateway)`).

---

## 3. Authorization model

Guards live in `backend/securityHelpers.js` and are importable by every router:

| Guard | Behavior |
|---|---|
| `requireAuth` | 401 unless a valid token is present |
| `requireRole(role)` | 401 without a token, 403 on role mismatch |
| `requireAnyRole(...roles)` | Same, but accepts several roles (e.g. issuer *or* admin) |
| `requireAdmin` / `requireIssuer` | Named shorthands |

**The default is closed.** Routers declare their public routes first, then apply
`router.use(requireAuth)`; everything below the line is protected. Where public and private routes
genuinely interleave (`authRoutes.js` — login and register must stay open), guards are applied
per-route instead, and the file says so explicitly at the top.

Role authorization is not sufficient on its own. **Per-object ownership is a separate check that
belongs in the controller.** `walletController.js` is the reference implementation: identity always
comes from `req.user.id`, never from a URL or body parameter, and mutations verify the target
belongs to the caller before touching it.

### Route mounting

```
/api              → systemRoutes         health checks
/api/auth         → authRoutes           login, register, profile, password, share links
/api/admin        → adminRoutes          admin actions + root-authority actions
/api/issuer       → issuerRoutes         issuer onboarding + dashboard
/api/credentials  → credentialRoutes     credential lifecycle
/api/verify       → verificationRoutes   verification + logs
/api/wallet       → walletRoutes         holder wallet state
```

### Controller placement

New endpoints go in the controller that owns the responsibility, not whichever file is largest:

| Controller | Responsibility |
|---|---|
| `authController` | Login, register, password change — authentication entry only |
| `accountController` | Profile/account data, share links |
| `issuerOnboardingController` | Issuer registration, requirements, document review |
| `issuerCredentialController` | Issuer credential lifecycle: create, issue, revoke, history |
| `adminIssuerController` | Admin issuer queues: approve/reject/enable/disable |
| `rootAuthorityController` | Root authority over its subordinates |
| `adminAuditController` | Audit logs, admin password change, user enable/disable |
| `adminDashboardController` | Admin aggregation + maintenance (expiry cron, integrity check) |
| `walletController` | Holder wallet display state |
| `verifierController` | Verification + verification logs |

---

## 4. Governance model

ChainCert operates as a **consortium**, not a single-authority registry. Two issuer tiers:

**Root Authority** (e.g. a university) — has its own MSP and peer, maintains a ledger copy, and
participates in endorsement. Adding one requires a channel configuration update.

**Subordinate Issuer** (e.g. a department under that university) — does *not* get a peer or its own
MSP. It receives a Fabric identity registered under the root authority's CA and operates under the
root's MSP. No channel change needed. Subordinates get their own CouchDB instance; a central
`couchdb_connections` database maps `orgName → couchDBUrl` so the API routes writes correctly.

### Approval flow

```
Issuer submits registration
        │
        ├── subordinate? ──▶ root authority approves  ──▶ LogRootSubordinateApproval (on-chain)
        │                                                        │
        └────────────────────────────────────────────────────────┤
                                                                 ▼
                                            admin approves ──▶ LogIssuerApproval (on-chain)
                                                                 │
                                                                 ▼
                                        fabricIdentity + couchDBUrl + walletId assigned
```

Admin approval of a subordinate is **blocked** until the root authority has approved
(`rootApprovalStatus` is checked in `adminIssuerController.Approve_Issuer`). Both decisions emit
immutable on-chain log entries. This gate is enforced in two independent places — the controller
and `couchDB_service.rootApproveSubordinateIssuer` — deliberately.

Registration is **category-driven**: `backend/issuerRequirements.js` defines the required document
set per category (university, government, training_provider, industry_certifier, others), and the
frontend renders the upload checklist from `GET /api/auth/issuer-requirements/:category`. Document
validation happens in the application layer; Fabric handles identity, endorsement, and immutable
logging only.

### Issuer status lifecycle

`pending_review` → `pending_root_approval` → `root_approved` → `approved`/`active`
with `rejected` and `disabled` as terminal-ish branches (disabled is reversible).

---

## 5. Data layer and the dual-write pattern

**Every** credential lifecycle action and every governance action writes **blockchain first, then
CouchDB**. The ledger is the source of truth; the CouchDB mirror exists so dashboards render
without round-tripping Fabric.

**Failure semantics:** if the chaincode invoke succeeds but the CouchDB write fails, the controller
returns a *partial success* with a warning — it does **not** roll back. CouchDB has no
cross-database transactions, and the immutable record already exists. When adding a lifecycle
operation, follow the same order and the same partial-failure response shape. Do not attempt to
roll back a chaincode write.

Reconciliation is handled by the admin integrity check, which compares CouchDB rows against ledger
records field-by-field. It is one-directional (CouchDB → ledger).

### Databases

Central CouchDB holds `users`, `issuers`, `user_notifications`, `admin_notifications`,
`profile_share_links`, `couchdb_connections`, and the holder-side credential mirror
(`wallet_user_credentials`). Each issuer has its own CouchDB holding
`wallet_issuer_credentials` (templates) and `issued_credentials` (instances).

A credential document is reachable by three keys depending on where it lives — the raw id for
templates, `issuer_cred_<id>` for issuer-side instances, `user_cred_<id>` for the holder mirror.
`couchDB_service.getCredentialDocById()` resolves all three and is what ownership checks use.

### Identity types

Four distinct things called "identity" — do not conflate them:

| Type | Example | Purpose |
|---|---|---|
| System account | `admin1@email.com` | CouchDB login row for the web dashboard |
| Fabric admin identity | `chaincert-admin` | System-level chaincode invokes from the API |
| Root authority identity | `<university>-admin` | That institution's credential operations |
| Subordinate identity | `<university>-subordinate-<dept>` | Issued under the root's CA, root's MSP |

---

## 6. Chaincode

Single class `ChainCertContract`, three operational areas:

- **Templates** — `CreateCredentialTemplate` stores a record with `isTemplate: true`, empty `holderID`.
- **Issued instances** — `IssueCredential(templateId, holderID, expiryDate, renewedFrom)` derives a
  credential from a template, inheriting the template's `issuerID`. Plus `RevokeCredential`,
  `ExpireCredential`, `VerifyCredential`, and the `Get_*` query family.
- **Immutable audit logs** — every governance action is mirrored on-chain: `LogIssuerApproval`,
  `LogIssuerRejection`, `LogIssuerStatusChange`, `LogRootSubordinateApproval/Rejection`,
  `LogUserStatusChange`, `LogAdminChangePassword`, `LogRenewalDecision`, `LogVerification`.

Expiry is evaluated at verification time against **end-of-day Manila (+08:00)**, so a past-expiry
credential reads as expired immediately without waiting for the daily cron. The cron additionally
flips the stored status for dashboard listings.

⚠️ **The chaincode does not perform authorization.** See `LIMITATIONS.md` §1 — this is the single
most important thing to understand before building on this codebase.

---

## 7. Background jobs

`adminDashboardController.initExpiryCron(getContractAndGateway)` and `initIntegrityCron` are wired
at server startup and use `node-cron`. New periodic work should follow that shape: an `init`
function called from the server with the gateway injected.

---

## 8. Configuration

All environment-specific values are environment variables with local-development defaults, so a
fresh clone runs locally with no configuration.

**Backend** (`backend/.env.example`): `JWT_SECRET` (**required** — the app refuses to boot without
it), `COUCHDB_URL`, `CORS_ORIGIN`, `FRONTEND_URL`, `SMTP_USER`, `SMTP_APP_PASSWORD`.

**Frontend** (build-time, baked into the bundle by Vite): `REACT_APP_API_URL`,
`REACT_APP_FRONTEND_URL`. Everything prefixed `REACT_APP_` is **public** in the built bundle —
never put a secret there.

The build is **Vite**, not Create React App. The `REACT_APP_` prefix is retained deliberately
(`envPrefix` in `vite.config.js`) so that existing `.env` files, deployment runbooks and the Nginx
setup did not need to change. In source, these are read from `import.meta.env`, not `process.env`.
Output goes to `build/`, also to match the existing deployment. Two Vite settings are load-bearing
and explained in the config: `.js` files are loaded as JSX (this codebase puts JSX in `.js`), and
`src/utils/nameSimilarity.js` is added to the CommonJS interop list because it is shared verbatim
with the backend and must stay `module.exports`.

**Testing toggles** — all must be unset for any deployment. Each logs a loud startup warning:
`DISABLE_RATE_LIMIT`, `DISABLE_PASSWORD_POLICY`, `DISABLE_SIGNUP_OTP`, `DISABLE_ISSUER_TOGGLE`.

---

## 9. Conventions

- **File-level outline comments** at the top of major backend files list public functions by
  category. Keep them in sync when adding or renaming exports.
- **Doc comments** lead with a plain-language explanation, then the technical one.
- **Design system** — `src/styles/tokens.css` holds every design token; `src/components/ui/` holds
  the `cc-*` primitives. Use tokens, not hardcoded values, and the primitives, not hand-rolled
  buttons and modals. Chart colors are the exception: recharts SVG cannot read CSS variables, so
  `components/analytics/analytics.js` uses literal token hex values.
- **Errors** — controllers return `sendServerError(res, error, 'TAG')`, which logs the full error
  server-side with a correlation id and returns a generic message plus that id to the client. Never
  return `error.message` directly.
