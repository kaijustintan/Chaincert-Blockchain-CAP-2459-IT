# Known Limitations and Accepted Tradeoffs

ChainCert is an **academic capstone project**, not production software. This document records the
constraints that were accepted deliberately within that scope, and the reasoning behind each.

It exists because the alternative — leaving them undocumented for a reader to discover — is worse.
Everything here is a known decision, not an oversight. Where an item is a genuine flaw rather than
a scoping choice, it says so.

**If you intend to deploy this system to handle real credentials, treat this file as the work
list.**

---

## 1. The chaincode performs no authorization ⚠️

**This is the most important item in this document.**

The smart contract records who invoked a transaction but never *enforces* anything based on it.
`ctx.clientIdentity` is read in exactly one way across the entire contract — written into a log
field — and there is no `getMSPID()` comparison, no attribute check, and no ACL anywhere in the
file.

Concretely:

- `CreateCredentialTemplate(ctx, id, issuerID, …)` takes `issuerID` as a **parameter**. The ledger
  stores whatever it is told.
- `IssueCredential` copies `template.issuerID` onto the new credential without verifying the caller
  owns that template.
- `RevokeCredential` and `ExpireCredential` perform no ownership check at all.
- Every `Log*` function accepts `adminEmail`, `verifierEmail`, `decision`, and `reason` as
  parameters. Nothing verifies the invoker is that admin, or that root authority, or that verifier.

The API holds a single Fabric identity (`chaincert-admin`) used for system-level invokes, and the
contract accepts whatever that identity asserts.

**What this means:** authorization is **100% delegated to the Express layer**. The blockchain
guarantees *tamper-evidence of what was submitted*. It guarantees nothing about *whether the
submitter was entitled to submit it*.

**Threat model:** a compromised API host, a leaked `wallet/` identity, or an insider with CLI access
to a peer can forge credentials attributed to any issuer, revoke any credential, and write approval
logs naming an admin who never acted — all landing as cryptographically signed, permanently
immutable, apparently authentic ledger records. Under that threat model the audit trail is actively
misleading: `performedBy` faithfully records `chaincert-admin` while `adminEmail` records whatever
the attacker chose.

**Current mitigation:** ownership is enforced in the API before any ledger write.
`couchDB_service.getCredentialDocById()` loads the credential or template and the controller
compares `issuerID` against `req.user.id` **before** `submitTransaction` runs. This closes the
reachable path through the HTTP API. It does not change the trust boundary.

**Proper fix (not done):** enforce in-contract — derive `issuerID` from the client certificate
rather than accepting it as a parameter, compare `ctx.clientIdentity.getMSPID()` against the
credential's owning org for revoke/expire/issue, and gate the admin/root `Log*` functions on an MSP
or certificate attribute. This requires a chaincode redeploy and was out of scope.

---

## 2. Personal data is written permanently to the ledger ⚠️

Nothing on-chain can be deleted, corrected, or subjected to an erasure request. The following
personal data is written permanently:

| Data | Where |
|---|---|
| `holderID` | issued credentials, revocations, expiries, verification logs, renewal decisions |
| `verifierEmail`, `verifierName` | every verification log |
| `issuerEmail`, `userEmail`, `adminEmail` | every governance log |
| Free-text `reason` / `rejectionReason` | status changes, approvals, rejections, revocations |
| X.509 subject DN of the invoker | every `Log*` entry |

`ExpireCredential` and `RevokeCredential` deliberately preserve `metadata` and `skills`, so this
data survives every lifecycle transition. Because `getHistoryForKey` exposes every superseded
version, revoking a credential **appends** to its history rather than removing anything.

A verifier's email address is permanently published to every organization on the channel merely for
having checked a credential once — and bulk verification writes one such record per credential.

**This is a design flaw, not a scoping choice.** It is the exact criticism a privacy-aware reviewer
raises about putting personal data on a blockchain at all, and "it is a capstone" is a weak defence.

**Proper fix (not done):** store salted hashes or opaque pseudonymous identifiers on-chain and keep
the identifier↔person mapping in CouchDB where it can actually be deleted; move free-text reasons
off-chain and store only a hash commitment. This is a schema change requiring a redeploy, and it is
**not retroactive** — data already written stays written.

---

## 3. Query functions scan the entire ledger

Twenty-two query functions call `getStateByRange('', '')`, which walks **every key in the
namespace** — credentials, templates, and every log type — and then filters in JavaScript. There is
no pagination, no bookmark, and no result cap on any of them.

`Get_IssuerCredentialsHistory` is the worst by an order of magnitude: a full range scan to collect
ids, followed by a `getHistoryForKey` call per matching credential in a serial loop, all inside one
transaction.

**The amplification is self-inflicted.** Every verification writes a log record, and bulk
verification writes one per credential per uploaded PDF. Verification volume therefore grows the
ledger, which slows all twenty-two scans — including the ones on the dashboard critical path. This
has been observed in practice: holder and issuer dashboards became noticeably slow after heavy
bulk-verify testing.

**Current mitigation:** frontend-side only. The holder's verification fetch waits for the credential
list to load first, and the issuer's fires only when the relevant tab is opened. This staggers the
cost; it does not reduce it.

**Proper fix (not done):** CouchDB rich queries (`getQueryResult` with a Mango selector on `type`)
plus `getQueryResultWithPagination`, or composite keys so log reads never touch credential keys.
Requires a redeploy.

---

## 4. Authentication and session handling

**JWT in `localStorage`.** Readable by any successful XSS. Production would use `httpOnly`,
`SameSite` cookies with CSRF protection. Accepted for capstone scope; note that the codebase has no
XSS sinks (no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `document.write` anywhere), so
this is a defence-in-depth gap rather than an active hole.

**No token revocation on account disable.** Disabling a user flips a database flag, but their
existing JWT stays valid until it expires (24 hours). There is no blacklist or token-version check.
A disabled user retains access for up to a day.

**Client-side role state.** `protectedRoutes.js` and `adminProtectedRoutes.js` read the role from a
`localStorage` value rather than from the decoded token, so editing it renders the admin shell.
**The server does not honor it** — every `/api/admin` route enforces the role server-side, so the
tampered UI loads empty with 403s and no data leaks. It is cosmetic, but it looks alarming in a
demo and should be read from the token instead.

**bcrypt cost factor 10.** Current guidance is 12. Raising it is a one-line change with a
login-latency tradeoff.

---

## 5. Transport and deployment

**No HTTPS.** The reference deployment served plain HTTP. Every JWT, password, and OTP therefore
crossed the network in cleartext. TLS termination plus HSTS is the first thing to add for any real
deployment.

**Fabric CA TLS verification is disabled.** The connection profile sets
`"httpOptions": { "verify": false }` for all three certificate authorities, disabling certificate
validation during enrollment. This was almost certainly done to work around a hostname mismatch
between the certificate CN and `localhost` on the development network. It is a genuine
man-in-the-middle exposure on the enrollment path. **Not changed here** because flipping it
untested risks breaking enrollment on a working network — it needs to be fixed together with proper
certificate hostnames.

**Single orderer.** No Raft cluster. All infrastructure on one host. A single point of failure with
no consensus fault tolerance.

**`docker.sock` mounted into the peer container.** This is root-equivalent host access from inside
the container. It is **required** by Fabric's legacy Docker-in-Docker chaincode builder and matches
the upstream `fabric-samples` test network. Do not "fix" it in configuration — removing the need
for it means running chaincode as an external service, which is an architectural change.

**Default database credentials.** CouchDB uses `admin:adminpw` by default. `COUCHDB_URL` is now
honored at **every** call site (all seven previously-hardcoded ones were converted), so rotating the
password is a config change rather than a code change. The weak default itself remains: override it
for any deployment reachable by anyone else. Databases are not exposed publicly in the reference
deployment, so this is a defence-in-depth concern rather than a direct exposure.

**Upstream sample credentials.** Values such as `admin:adminpw`, `peer0pw`, and `user1pw` under
`backend/node_creation/` are the stock Hyperledger `fabric-samples` development credentials. They
are published upstream, safe to read here, and unsafe to deploy. Override them for any real use.

---

## 6. Application logic

**Duplicate-issuance prevention is CouchDB-based, not chaincode-level.** The API now enforces it
on the write path (it previously only filtered the recipient dropdown, so a direct POST or a batch
issue bypassed it entirely). The chaincode is still not a backstop: it mints a key containing the
transaction timestamp, so a duplicate never collides at the ledger level. Two genuinely concurrent
requests can therefore still both pass the check before either writes. Closing that fully needs a
composite key of `templateId + holderID` enforced on-chain, which requires a redeploy.

**Credential IDs use `Date.now()` plus `Math.random()`.** Not cryptographically secure and
theoretically predictable. Accepted because the ID is an identifier, not a security token —
possessing one grants nothing that is not already public via the verify endpoint. Note that
profile-share tokens *are* generated with `crypto.randomBytes` and OTPs with `crypto.randomInt`;
this exception is deliberate and scoped.

**The integrity check is one-directional.** It compares CouchDB rows against ledger records, so it
detects a mirror that has drifted from the ledger. It does not detect a ledger record with no
corresponding mirror row. It runs both on demand and on a daily schedule.

**Revoking a ledger-only credential now fails.** If a credential was written to the ledger but its
CouchDB mirror write failed (the documented partial-success path), the ownership check added in the
security pass cannot resolve it and revocation returns 404. This is deliberate fail-closed
behavior — the alternative is revoking without verifying ownership — but it means such orphans need
resolving through the mirror rather than the API.

**The past-expiry issuance guard is restored and on by default.** It was previously commented out
in source so that already-expired credentials could be minted for user-acceptance testing — the
worst form of a toggle, since it was invisible in both `.env` and the logs. It is now active, and
opt-out via `ALLOW_PAST_EXPIRY=true`, which prints a startup warning like every other toggle.

---

## 7. Build and tooling

**One remaining dependency advisory: `pdfjs-dist`.** The version in use is affected by
CVE-2024-4367, where a crafted font object can reach an `eval()` path and execute script simply
from opening a document. This matters here because the bulk-verify feature parses **untrusted**
PDFs uploaded by whoever is verifying.

**It is mitigated at the call site rather than by upgrading.** `getDocument` is now called with
`isEvalSupported: false` (plus `disableAutoFetch` and `disableStream`), which closes that path and
costs nothing because this code never *renders* a PDF — it only walks link annotations to extract
credential ids. The clean fix is a major version bump to pdfjs-dist 6.x, which changes the worker
API this project has already had to debug once, so it was deferred rather than done blind.

**The Hyperledger Fabric SDK carries unfixable advisories.** Committing a backend lockfile (which
previously did not exist, so `npm audit` could not run there at all) surfaced 18 advisories,
including two critical. Almost all of them arrive through `fabric-network` / `fabric-ca-client`
2.2.x transitives — `jsrsasign`, `protobufjs`, `elliptic`, `sjcl`, `@grpc/grpc-js`.

**They cannot be resolved by upgrading.** `npm audit` proposes "fixing" `fabric-network` by moving
to 1.4.20, which is a *downgrade* to an older major and would break against the deployed Fabric
network. The 2.2.x line is the terminal release of the legacy SDK; Hyperledger's forward path since
Fabric 2.4 is the separate `@hyperledger/fabric-gateway` client, which is a rewrite of the gateway
integration rather than a version bump.

They are pinned deliberately (and marked `ignore` in `.github/dependabot.yml` so the alerts do not
drown out actionable ones). Migrating to `fabric-gateway` is the real fix and is out of scope.

**Minimal automated test coverage.** There is no backend test script. The frontend has a Vitest
suite covering the shared credential-name collision rules only — chosen because that module gates
credential creation and is the one file shared verbatim between frontend and backend. Everything
else is verified manually against the UAT checklist. The CI workflow parses and lint-checks every
backend source file and builds the frontend, which catches syntax and scope errors but proves
nothing about behavior.

**Lint warnings are not enforced.** The codebase carries roughly 50 pre-existing warnings (unused
variables, `react-hooks/exhaustive-deps`). CI deliberately does not fail on them, because a
permanently red pipeline gets ignored. Clean them up, then turn enforcement on.

**A green build does not mean the app runs.** This repository has been bitten three times now by
changes that compile cleanly and fail only at runtime — twice by hook and render-order mistakes, and
once by the Vite migration itself, where `npm run build` passed while `npm start` crashed the entire
SPA to a white screen.

That third case is worth stating precisely, because it generalises: **the build and the dev server
are separate pipelines that share almost nothing.** `build.commonjsOptions` configures Rollup, which
only runs for `npm run build`. The dev server uses esbuild plus native browser ES modules and applies
no CommonJS interop to source files. So `src/utils/nameSimilarity.js` — which must remain CommonJS
because the Express backend loads the same file with `require()` — linked fine in the build and threw
`does not provide an export named 'default'` in dev, taking the whole app down with it because an
eagerly-loaded page imports it. It is now handled in both pipelines (`commonjsOptions` for the build,
a dev-only Vite plugin for serve). **Verify both commands after any build-config change.** Load the
affected page.

---

## 8. What was fixed rather than accepted

For contrast, the following were found and **fixed**, not accepted. They are listed so that a reader
comparing this document against the git history is not confused about what is still open:

- Self-registration as an administrator (the `role` field was read from the request body)
- Unauthenticated retrieval of all user documents, including password hashes and live
  password-reset codes
- Unauthenticated access to the complete verification log
- Any approved issuer being able to issue from, or revoke, another issuer's credentials
- Seven endpoints missing an authorization check entirely
- All four one-time-passcode flows using a non-cryptographic random source with no limit on wrong
  guesses
- Unbounded file upload on the unauthenticated issuer-registration endpoint
- Rate limiting that could not function behind a reverse proxy
- An unused `dockerode` client holding a handle to the Docker socket in the API process — dead code
  that granted root-equivalent host access for no functionality
- Migration off the deprecated Create React App toolchain, which reduced the dependency advisory
  count from 64 (4 critical, 35 high) to 4 (0 critical)

Fixed in the production-readiness pass that followed:

- **A template ID verifying as a valid credential.** `VerifyCredential` never checked `isTemplate`,
  and templates carry `status: 'active'`, so any template ID — discoverable through the public
  issuer directory — returned `valid: true` from the public verify endpoint. *(This one needed a
  chaincode redeploy, not just a source change; deployed locally at version 25.0 / sequence 25 on
  2026-08-12. Each environment's counters are independent, so confirm with `peer lifecycle chaincode
  querycommitted` before assuming any other environment has it.)*
- **Duplicate issuance being unenforced on the write path.** `getBlockedHolderIDsByTemplate` was
  called from exactly one place — the endpoint that populates the recipient dropdown — so the rule
  only ever filtered a UI list. A direct POST, or the batch-issue loop, wrote a second live copy
  without objection, and the chaincode was no backstop because `IssueCredential` mints a key
  containing the transaction timestamp and therefore never collides. The check now runs inside
  `Issue_Credential` itself and fails **closed** (503) if the lookup errors, on the reasoning that a
  retry costs the issuer a minute whereas proceeding writes an immutable duplicate that cannot be
  withdrawn.
- **`Enable_Issuer` bypassing the entire approval chain.** The service had no status guard and
  unconditionally set `status = "approved"`, letting an admin promote a subordinate the root
  authority never approved (or explicitly rejected), while skipping Fabric identity provisioning
  and leaving an unusable, unfixable account. Both `Enable_Issuer` and `Disable_Issuer` now enforce
  their legitimate transitions.
- **A connection leak on the public verify endpoint.** Four gateway disconnects sat on the happy
  path only, with `gateway` scoped inside the `try` so the catch could not clean up. Every failed
  verification leaked a gRPC connection on an unauthenticated, unthrottled route — a
  resource-exhaustion primitive reachable with a loop of invalid IDs.
- **Synchronous file I/O on every blockchain request.** The Fabric connection profile was read from
  disk and parsed per request, blocking the event loop process-wide, alongside abandoned
  connection-cache scaffolding that never cached anything.
- **29 admin route handlers discarding their controller promise**, so an escaped throw became an
  unhandled rejection and the client hung until timeout instead of receiving an error.
- **`getIssuerById` throwing on 404**, which made ten `if (!issuerDoc) return 404` branches
  unreachable and turned every nonexistent-issuer lookup into a generic 500.
- **Dual-write failures being reported as success.** The `warning` field returned when the ledger
  write succeeded but the mirror write failed was read by nothing; all three issuer actions showed
  an unconditional success toast.
- **A hardcoded third-party mockup on a live authenticated route** (`/share-credential/:id`), plus
  ~21 KB of other dead code.
- **Whole-corpus downloads behind two public endpoints.** The issuer directory and the share-profile
  payload each fetched every issued credential document — base64 badge images included — across
  every approved issuer, to compute a handful of counts. Both now request only the fields they read,
  so an anonymous caller can no longer force that transfer. The verification-stats endpoint got the
  same treatment: it still scans (the totals require it) but now returns four scalars per row
  instead of full documents.

**Still open, and deliberately so:** the query-shape problems that need a chaincode redeploy or a
schema change — the 29 full-ledger scans (§3), on-chain authorization (§1), and ledger PII (§2).
Those are design-level and are described above rather than patched.
