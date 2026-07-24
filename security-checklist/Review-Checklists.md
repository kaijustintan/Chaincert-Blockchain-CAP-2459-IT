# Review Checklists

> Operational review checklists. Score each item PASS / FAIL / N/A / NEEDS-EVIDENCE. Pick the checklist matching the artifact under review; each cross-links to the relevant sections in `Domains.md` and `Reference.md`. Block release on any Critical/High FAIL.

## Contents

1. [03.01 — System Security Review Checklist](#0301-system-security-review-checklist)
2. [03.02 — Architecture Security Review Checklist](#0302-architecture-security-review-checklist)
3. [03.03 — Source Code Security Review Checklist](#0303-source-code-security-review-checklist)
4. [03.04 — Infrastructure Security Review Checklist](#0304-infrastructure-security-review-checklist)
5. [03.05 — API Security Review Checklist](#0305-api-security-review-checklist)
6. [03.06 — Database Security Review Checklist](#0306-database-security-review-checklist)
7. [03.07 — Authentication & Authorization Review Checklist](#0307-authentication-authorization-review-checklist)


---

# 03.01 — System Security Review Checklist

**Purpose:** End-to-end review of a whole system or feature. Use this as the top-level driver; it
fans out into the more specialized checklists (architecture, code, infra, API, database, authn/authz).

**How to score each item:** `PASS` / `FAIL` / `N/A` / `NEEDS-EVIDENCE`.
- `NEEDS-EVIDENCE` = the control may exist but no proof was supplied. Treat as FAIL until evidence is produced.
- Any `FAIL` on a **Critical**/**High** item should block release until remediated or risk-accepted in writing.

For the underlying "why", map each section back to the linked domain file.

---

## 0. Scoping & Context (answer first)

- [ ] What does the system do, and what are its **assets** (data, funds, reputation, availability)? → `Reference.md#04-worked-threat-model-coffee-ordering-web-app`
- [ ] Who are the **actors / roles** (anonymous, user, privileged, admin, service)? Is there a role/permission matrix?
- [ ] What are the **trust boundaries** (browser↔server, server↔DB, server↔third-party)? → `#0302-architecture-security-review-checklist`
- [ ] What is the **data classification** of what it stores/processes (public, internal, confidential, PII/PHI/PCI)? → `Domains.md#0206-data-protection-privacy`
- [ ] What compliance regimes apply (GDPR, PCI-DSS, internal policy)? → `Domains.md#0210-secure-sdlc-devsecops-supply-chain`
- [ ] Is there a **threat model** for this system, and is it current? → `Reference.md#04-threat-modeling-reference`

## 1. Authentication (→ `Domains.md#0201-authentication-identity`)

- [ ] Are user identifiers normalized (case-insensitive) and unique?
- [ ] Are passwords stored with a slow KDF (Argon2id/bcrypt), never plaintext or fast hashes (MD5/SHA-1/SHA-256)?
- [ ] Are credentials transmitted only over HTTPS, including the **login page itself**?
- [ ] Is the login error message **generic and identical** for "bad user" vs "bad password" (no enumeration)?
- [ ] Is brute force throttled (account lockout / rate limit / progressive delay / CAPTCHA)?
- [ ] Is MFA available/required for privileged or sensitive accounts?
- [ ] Is account recovery resistant to takeover (no secret-question-only resets, tokens expire, no enumeration)?
- [ ] If OAuth/OIDC/SSO is used, are tokens validated (signature, issuer, audience, expiry) server-side?

## 2. Authorization & Access Control (→ `Domains.md#0202-authorization-access-control`)

- [ ] Is authorization enforced **server-side on every request**, not just hidden in the UI?
- [ ] Is there an **object-level ownership check** on every resource access (defeats BOLA/IDOR)?
- [ ] Is least privilege applied to users, services, and DB accounts?
- [ ] Is authorization **centralized** (single decision point) rather than scattered/duplicated?
- [ ] Are privilege-granting fields (e.g., `role`, `isAdmin`) impossible to set from client input?

## 3. Session Management (→ `Domains.md#0203-session-management`)

- [ ] Are session IDs long (≥128 bit) and high-entropy (≥64 bit), from a CSPRNG?
- [ ] Are cookies `Secure`, `HttpOnly`, and `SameSite` set appropriately?
- [ ] Is the session ID **regenerated on login** (anti-fixation) and invalidated on logout?
- [ ] Is there an idle and/or absolute session timeout?

## 4. Input Validation & Web Security (→ `Domains.md#0205-data-validation-web-security`)

- [ ] Is **all** input validated server-side with an allow-list (type, length, format, range)?
- [ ] Are all DB queries parameterized (no string-concatenated SQL)? (defeats SQLi)
- [ ] Is all output context-encoded (defeats XSS)? Is a Content-Security-Policy set?
- [ ] Are state-changing actions CSRF-protected (token + `SameSite`)?
- [ ] Are file uploads validated by content/MIME (not extension), size-limited, and stored outside web root?
- [ ] Are path/file parameters canonicalized and confined (defeats path traversal / null-byte tricks)?

## 5. Cryptography & Data Protection (→ `Domains.md#0204-cryptography`, `06-data-protection-and-privacy.md`)

- [ ] Is TLS enforced everywhere (HSTS, redirect HTTP→HTTPS, no mixed content)?
- [ ] Is sensitive data encrypted at rest (e.g., AES-256)?
- [ ] Are secrets/keys kept out of source code and config-in-repo (vault / env / secret manager)?
- [ ] Is randomness for security purposes from a CSPRNG, not `rand()`/`Math.random()`?
- [ ] Is PII minimized, retention-limited, and is there a data-subject erasure path if GDPR applies?

## 6. API Security (→ `Domains.md#0207-api-security`, `#0305-api-security-review-checklist`)

- [ ] Does **every** endpoint enforce authn + authz (no "internal/unlisted = unprotected")?
- [ ] Are business-logic invariants enforced server-side (no negative quantities, no client-set prices/payment mode)?
- [ ] Is rate limiting in place per identity/IP?

## 7. Error Handling, Logging & Monitoring (→ `Domains.md#0209-error-handling-logging-monitoring`)

- [ ] Does the system **fail closed** (deny on error) for security decisions?
- [ ] Are error messages generic to the user, with details only in server logs (no stack traces leaked)?
- [ ] Are security-relevant events logged (authn success/failure, authz denials, admin actions, validation failures)?
- [ ] Are logs free of secrets/passwords/full PII, and protected from tampering?
- [ ] Is there monitoring/alerting on anomalies, and an incident-response plan?

## 8. Infrastructure & Deployment (→ `Domains.md#0208-network-infrastructure-cloud`, `#0304-infrastructure-security-review-checklist`)

- [ ] Is `DEBUG`/verbose error mode **off** in production?
- [ ] Are default/empty credentials removed (e.g., no empty DB password in prod)?
- [ ] Are network tiers segmented (web/app/data), with the database not publicly reachable?
- [ ] Are custom error pages configured (no server banner / framework version leakage)?
- [ ] Are hosts hardened and patched; dependencies scanned and current?

## 9. SDLC & Supply Chain (→ `Domains.md#0210-secure-sdlc-devsecops-supply-chain`)

- [ ] Was threat modeling done during design (not bolted on after)?
- [ ] Are SAST/DAST/SCA (dependency scanning) part of CI?
- [ ] Is there security code review for changes touching auth, crypto, or data handling?
- [ ] Are third-party dependencies pinned, verified, and free of known-vulnerable versions?

---

## Roll-up

- **Critical FAILs:** _______  (block release)
- **High FAILs:** _______  (remediate or formally risk-accept)
- **Medium/Low FAILs:** _______  (backlog with owner + date)
- **NEEDS-EVIDENCE count:** _______  (must resolve before sign-off)

**References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, SEC-POLICY, THREAT-MODEL-COFFEE, JUICE-SHOP, REF-IMPL


---

# 03.02 — Architecture Security Review Checklist

**Purpose:** Review architecture diagrams, data-flow diagrams (DFDs), and system designs **before**
code exists. This is where threat modeling happens. Pair with `Reference.md#04-threat-modeling-reference`.

**Scoring:** `PASS` / `FAIL` / `N/A` / `NEEDS-EVIDENCE`.

---

## 1. Diagram Completeness

- [ ] Is there a current architecture diagram or DFD that matches what is actually built?
- [ ] Are **all** external entities, processes, data stores, and data flows shown?
- [ ] Are **trust boundaries** drawn explicitly (e.g., Internet↔DMZ, app↔DB, app↔third-party API)?
- [ ] Is every data flow that **crosses a trust boundary** identified? (These are the highest-value threat targets.)
- [ ] Is the data classification of each store/flow labeled (public / internal / confidential / PII)?

## 2. STRIDE-per-Element (→ `Reference.md#04-threat-modeling-reference`)

For each element, ask whether the relevant STRIDE categories are addressed:

- [ ] **Spoofing** — Is every external entity and process authenticated where it interacts across a boundary?
- [ ] **Tampering** — Is data integrity protected in transit (TLS) and at rest (hashes/signatures, DB constraints)?
- [ ] **Repudiation** — Are security-relevant actions logged with attribution (who/what/when)?
- [ ] **Information Disclosure** — Is confidential data encrypted in transit and at rest; are errors non-revealing?
- [ ] **Denial of Service** — Are rate limiting, resource quotas, timeouts, and pagination in place?
- [ ] **Elevation of Privilege** — Is authorization enforced at each boundary; is least privilege applied between components?

## 3. Trust Boundary Controls

- [ ] Is **every** inbound flow across a boundary authenticated and authorized?
- [ ] Is **all** input crossing inward validated server-side (the server never trusts the client)?
- [ ] Are outbound calls to third parties authenticated, TLS-protected, and validated on return?
- [ ] Is the database reachable **only** from the application tier (never directly from the internet)?
- [ ] Are internal/admin interfaces network-isolated (VLAN/subnet/security group), not just "hidden"?

## 4. Authentication & Session Architecture

- [ ] Where is identity established, and is it verified at **every** boundary crossing (not just at the edge)?
- [ ] If an Identity Provider / SSO is used, is the token-validation responsibility clearly placed and correct (signature/issuer/audience/expiry)?
- [ ] Is session state managed securely (server-side or signed tokens), and consistently across services?

## 5. Authorization Architecture (→ `Domains.md#0202-authorization-access-control`)

- [ ] Is there a **single, centralized** authorization decision point (or a consistent pattern), not ad-hoc checks per screen?
- [ ] Are object-ownership checks part of the design for every resource type (anticipates BOLA/IDOR)?
- [ ] Does the design follow **complete mediation** (every access re-checked, nothing cached as "already allowed")?

## 6. Data Protection Architecture (→ `Domains.md#0206-data-protection-privacy`)

- [ ] Is sensitive data encrypted in transit (TLS) and at rest (e.g., AES at the DB/disk layer)?
- [ ] Are secrets/keys stored in a vault or secret manager — never in the diagram's "config file in repo"?
- [ ] Is data minimized by design (only collect/keep what's needed)?
- [ ] Is there a defined key-management lifecycle (generation, rotation, revocation)?

## 7. Secure-Design Principles (→ `Foundations.md`)

- [ ] **Defense in depth** — Are there multiple independent layers, so one failure isn't catastrophic?
- [ ] **Least privilege** — Does each component have only the access it needs?
- [ ] **Fail-safe defaults** — Does the system default to *deny/closed*?
- [ ] **Economy of mechanism** — Is the design as simple as possible (less attack surface)?
- [ ] **Open design** — Does security rely on keys/secrets, not on the secrecy of the design itself?
- [ ] **Separation of duties** — Are high-impact actions split so no single role/component can act unchecked?
- [ ] **Assume breach** — Does the design limit blast radius if one component is compromised (segmentation, scoped credentials)?

## 8. Availability & Resilience

- [ ] Are single points of failure identified and mitigated (redundancy, failover)?
- [ ] Are there backups, and is restore tested? Are backups protected and not publicly reachable?
- [ ] Are timeouts, retries with backoff, and circuit breakers used on external dependencies?

## 9. Third-Party & Supply Chain (→ `Domains.md#0210-secure-sdlc-devsecops-supply-chain`)

- [ ] Are external dependencies/services enumerated with their trust level and failure mode?
- [ ] Is each integration scoped to least privilege (no over-broad API keys/OAuth scopes)?

---

## Output of an Architecture Review

Produce: (1) an updated DFD with trust boundaries, (2) a STRIDE threat list per element with a
mitigation for each (see the worked example in `Reference.md#04-worked-threat-model-coffee-ordering-web-app`),
(3) a list of design-level FAILs ranked by severity (`Reference.md#04-severity-risk-scoring`).

**References:** THREAT-MODEL-COFFEE, THREAT-DRAGON-ACT2/3, LEC-FINAL-REVIEW, PRINCIPLES-REF, SEC-POLICY


---

# 03.03 — Source Code Security Review Checklist

**Purpose:** Concrete checks to run against source code / pull requests. Pair with
`Reference.md#04-secure-coding-patterns-reference-implementation` for the correct implementation of each item.

**Scoring:** `PASS` / `FAIL` / `N/A` / `NEEDS-EVIDENCE`. Grep patterns are starting points, not proof.

---

## 1. Injection — SQL / Command / LDAP (→ `Domains.md#0205-data-validation-web-security`)

- [ ] Are **all** SQL queries parameterized / prepared statements? No string concatenation of user input into SQL.
  - Grep red flags: `"SELECT ... " + `, `f"...{var}..."` in queries, `.query(`...${`, string-built `WHERE`.
- [ ] Is there **no** use of `exec`, `system`, `popen`, `eval`, `Runtime.exec`, backticks with user input?
- [ ] Are LDAP filters built with proper escaping / parameterization, not concatenation?
- [ ] Is dynamic code execution (`eval`, `new Function`, deserialization of untrusted data) absent?

## 2. Input Validation

- [ ] Is input validated **server-side** with an allow-list (type, length, range, format)? Client validation is UX only.
- [ ] Is validation applied at trust boundaries (request handlers), not assumed from upstream?
- [ ] Are numeric/quantity/price fields range-checked (no negatives where they don't make sense)?

## 3. Output Encoding / XSS

- [ ] Is all user-controlled data context-encoded on output (HTML body, attribute, JS, URL)?
  - Red flags: `innerHTML =`, `document.write(`, `dangerouslySetInnerHTML`, raw echo of request params.
- [ ] Is templating auto-escaping left **on** (no `| safe`, `{!! !!}`, `v-html` on user data)?
- [ ] Is a Content-Security-Policy header set?

## 4. Authentication & Passwords (→ `Domains.md#0201-authentication-identity`)

- [ ] Are passwords hashed with Argon2id/bcrypt via the platform API (`password_hash`, etc.)?
  - Red flags: `md5(`, `sha1(`, `sha256(`, `hashlib.sha256` on a password, custom "encryption" of passwords.
- [ ] Is password comparison done with the verify API (`password_verify`) — never `==` on hashes?
- [ ] Is the login error message identical for unknown-user vs wrong-password?
- [ ] Are failed attempts counted and lockout/throttling enforced?

## 5. Session & CSRF (→ `Domains.md#0203-session-management`)

- [ ] Is the session ID regenerated on privilege change/login (`session_regenerate_id(true)` or equivalent)?
- [ ] Are cookies set `Secure`, `HttpOnly`, `SameSite`?
- [ ] Are state-changing requests CSRF-protected with a token compared in **constant time** (`hash_equals`, not `==`)?

## 6. Authorization (→ `Domains.md#0202-authorization-access-control`)

- [ ] Does every sensitive handler check authorization server-side (role **and** object ownership)?
  - Red flags: a route that loads `record by id` from the request without checking it belongs to the caller (IDOR/BOLA).
- [ ] Are admin/privileged routes gated by a server-side `require_admin`-style check, not UI hiding?
- [ ] Is it impossible for client input to set privilege fields (`role`, `isAdmin`, `price`, `paymentMode`)?

## 7. Cryptography & Secrets (→ `Domains.md#0204-cryptography`)

- [ ] Is randomness for tokens/keys from a CSPRNG (`random_bytes`, `secrets`, `crypto.randomBytes`) — never `rand()`/`Math.random()`?
- [ ] Are there **no** hardcoded secrets/keys/passwords/API tokens in source?
  - Grep red flags: `password =`, `api_key =`, `secret =`, `AKIA`, private-key headers, connection strings with creds.
- [ ] Are only standard, current algorithms used (no DES/RC4/ECB; no custom crypto)?

## 8. Error Handling & Logging (→ `Domains.md#0209-error-handling-logging-monitoring`)

- [ ] Do error paths **fail closed** (deny on exception in a security decision)?
- [ ] Are stack traces / internal details kept out of responses (generic message to user, detail to logs)?
- [ ] Are security events logged, and are logs free of passwords/tokens/full PII?
- [ ] Is `DEBUG` / verbose mode controlled by config and off in production?

## 9. File & Path Handling

- [ ] Are uploads validated by real content type (`finfo`/magic bytes), size-limited, randomized names, stored outside web root?
- [ ] Are file paths from user input canonicalized and confined to an allowed base dir (no `../`, no null-byte `%00`)?

## 10. Dependencies (→ `Domains.md#0210-secure-sdlc-devsecops-supply-chain`)

- [ ] Are new/updated dependencies from trusted sources, pinned, and free of known CVEs (SCA run)?
- [ ] Is there no risky typosquat-style or unmaintained package introduced?

## 11. General Code Hygiene

- [ ] Is there no commented-out security code or "TODO: add auth later"?
- [ ] Are there no debug/backdoor endpoints, test accounts, or `if (user == 'test') skipAuth`?
- [ ] Is sensitive data not logged to console or left in temp/backup files in the web root (e.g., `/ftp`)?

---

## Severity guidance (→ `Reference.md#04-severity-risk-scoring`)

- SQLi, command injection, auth bypass, plaintext/fast-hashed passwords, hardcoded prod secrets, IDOR on sensitive data → **Critical/High**.
- Reflected XSS, missing CSRF on state change, verbose errors → **High/Medium**.
- Missing security headers, weak logging → **Medium/Low**.

**References:** REF-IMPL (security.php / auth.php / db.php / login.php / registration.php / logger.php / config.php), LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, JUICE-SHOP


---

# 03.04 — Infrastructure Security Review Checklist

**Purpose:** Checks for servers, containers, cloud services, networks, and deployments.
Pair with `Domains.md#0208-network-infrastructure-cloud`.

**Scoring:** `PASS` / `FAIL` / `N/A` / `NEEDS-EVIDENCE`.

---

## 1. Network Segmentation & Boundaries

- [ ] Are tiers segmented (web / app / data) via VLANs, subnets, or security groups?
- [ ] Is the database **not** publicly reachable (only the app tier can reach it)?
- [ ] Is inbound traffic restricted to required ports only (default-deny firewall)?
- [ ] Are admin/management interfaces restricted to a bastion/VPN/allow-listed IPs, not open to the internet?
- [ ] Is a WAF or reverse proxy in front of public web apps?

## 2. Transport Security

- [ ] Is TLS enforced on all external endpoints, with HTTP→HTTPS redirect and HSTS?
- [ ] Are only modern TLS versions/ciphers enabled (no SSLv3/TLS1.0/RC4/export ciphers)?
- [ ] Are certificates valid, not expired, and auto-renewed?
- [ ] Is internal service-to-service traffic encrypted where it crosses trust boundaries?

## 3. Host / OS Hardening

- [ ] Is the OS patched to current; is there an automated patch process?
- [ ] Are unnecessary services, packages, and ports removed/disabled (minimal footprint)?
- [ ] Is a hardening baseline applied (e.g., CIS Benchmark)?
- [ ] Is remote admin access key-based (no password SSH), MFA where possible, and logged?
- [ ] Are host file permissions least-privilege; no world-writable sensitive files?

## 4. Configuration & Secrets

- [ ] Is `DEBUG`/verbose error output **off** in production?
- [ ] Are default and empty credentials removed (no empty DB password, no `admin/admin`)?
- [ ] Are secrets injected via vault / secret manager / env — not baked into images or committed config?
- [ ] Are custom error pages (404/500) configured so banners/framework versions/stack traces don't leak?
- [ ] Are directory listing and source-file serving disabled; are backup/temp files (e.g., `/ftp`, `.bak`, `.git`) not web-accessible?

## 5. Containers (→ `Domains.md#0208-network-infrastructure-cloud`)

- [ ] Do containers run as a **non-root** user?
- [ ] Are Linux capabilities dropped to the minimum; is the filesystem read-only where possible?
- [ ] Are base images minimal, pinned by digest, and scanned for CVEs?
- [ ] Are no secrets embedded in image layers or env defaults in the Dockerfile?
- [ ] Is the container runtime isolated (no `--privileged`, no host network/PID unless required)?
- [ ] Are resource limits (CPU/memory) set to contain DoS?

## 6. Cloud (→ `Domains.md#0208-network-infrastructure-cloud`)

- [ ] Is cloud IAM least-privilege (no wildcard `*` admin roles attached broadly)?
- [ ] Are there no public storage buckets / blobs holding private data?
- [ ] Are security groups / NSGs tight (no `0.0.0.0/0` on sensitive ports like DB/SSH/RDP)?
- [ ] Is cloud audit logging (CloudTrail / activity logs) enabled and retained?
- [ ] Are managed-database backups, encryption-at-rest, and private endpoints enabled?
- [ ] Are keys/KMS managed with rotation; is root/owner account locked down with MFA?

## 7. Endpoint / Workload Protection

- [ ] Is endpoint protection / EDR present on servers where applicable?
- [ ] Is host/container monitoring and integrity checking in place?

## 8. Logging, Monitoring & Backup (→ `Domains.md#0209-error-handling-logging-monitoring`)

- [ ] Are infrastructure and access logs centralized and tamper-resistant?
- [ ] Is there alerting on anomalies (failed logins, config changes, new admin grants)?
- [ ] Are backups taken, encrypted, access-controlled, and **restore-tested**?
- [ ] Is time synchronized (NTP) so logs correlate?

## 9. Access Policy (→ SEC-POLICY)

- [ ] Is access granted via RBAC and reviewed periodically (joiners/movers/leavers)?
- [ ] Are exceptions to policy documented, time-bound, and approved?
- [ ] Is there a defined process for non-compliance and remediation?

---

## Deployment gate

Block deployment on any **Critical/High** FAIL: public database, `0.0.0.0/0` on SSH/DB, DEBUG on
in prod, empty/default prod credentials, public bucket with private data, expired/missing TLS.

**References:** SEC-POLICY, PRINCIPLES-REF, REF-IMPL (`config.php` DEBUG flag & empty DB password note, `_htaccess` force-HTTPS + custom error pages), LEC-FINAL-REVIEW, JUICE-SHOP (exposed `/ftp` backups)


---

# 03.05 — API Security Review Checklist

**Purpose:** Checks for APIs and integrations (REST/GraphQL/RPC). Pair with
`Domains.md#0207-api-security`. Many of the highest-impact real-world breaches are API
authorization failures (BOLA) — weight those heavily.

**Scoring:** `PASS` / `FAIL` / `N/A` / `NEEDS-EVIDENCE`.

---

## 1. Authentication on Every Endpoint

- [ ] Does **every** endpoint require authentication, except those explicitly and intentionally public?
- [ ] Is there no "internal" or "undocumented" endpoint that is unprotected because it's assumed hidden?
- [ ] Are API tokens/keys validated server-side (signature, expiry, issuer/audience for JWT/OIDC)?
- [ ] Are tokens transmitted only over TLS and never placed in URLs/query strings (logged/leaked)?

## 2. Object-Level Authorization (BOLA / IDOR) — highest priority

- [ ] For every endpoint that takes an object ID, is **ownership/permission re-checked server-side**?
  - Test: as user A, request user B's `/orders/{id}`, `/basket/{id}`, `/users/{id}` — must be denied.
- [ ] Are IDs that reference other users' resources rejected even if well-formed?
- [ ] Is mass-assignment blocked (client cannot set fields like `userId`, `role`, `price`, `paymentMode`)?

## 3. Function-Level Authorization

- [ ] Are admin/privileged operations gated server-side by role (not by the client hiding a button)?
- [ ] Can a normal user not invoke admin-only methods by calling the endpoint directly?

## 4. Business-Logic Invariants (→ JUICE-SHOP lessons)

- [ ] Are quantities/amounts validated server-side (no **negative quantity** to credit an account)?
- [ ] Are prices, totals, discounts, and payment modes computed/authorized **server-side**, never trusted from the client?
- [ ] Are workflow steps enforced in order (can't skip payment, can't re-use a coupon, can't reach `deletedAt`-style soft-deleted records via crafted filters)?
- [ ] Are quotas/limits enforced (e.g., one redemption, max items)?

## 5. Input Validation & Injection (→ `Domains.md#0205-data-validation-web-security`)

- [ ] Is every parameter (path, query, header, body) validated server-side against a strict schema?
- [ ] Are queries parameterized (no SQL/NoSQL/LDAP injection through API params)?
- [ ] Is the request body size limited and content-type enforced?
- [ ] Are file/URL parameters protected against SSRF (no fetching arbitrary internal URLs)?

## 6. Rate Limiting & Resource Control

- [ ] Is rate limiting applied per identity and/or IP (anti brute-force, anti scraping, anti DoS)?
- [ ] Is pagination enforced so a query can't return unbounded data?
- [ ] Are expensive operations (search, export, GraphQL nested queries) bounded (depth/complexity limits)?

## 7. Transport & CORS

- [ ] Is TLS required on all API traffic (HTTP rejected or redirected)?
- [ ] Is CORS configured with a specific allow-list of origins (no reflective `*` with credentials)?
- [ ] Are state-changing browser-facing endpoints CSRF-protected if they rely on cookie auth?

## 8. Output / Data Exposure

- [ ] Do responses return only needed fields (no over-fetching that leaks PII, password hashes, internal flags)?
- [ ] Are error responses generic (no stack traces, SQL errors, or internal hostnames)?
- [ ] Are different HTTP statuses not used in a way that enables enumeration (e.g., 404 vs 403 leaking existence)?

## 9. Versioning & Lifecycle (→ `Domains.md#0207-api-security`)

- [ ] Is the API versioned, and are deprecated versions retired (not left unpatched)?
- [ ] Is there a documented contract/schema that validation is enforced against?

## 10. Logging & Monitoring (→ `Domains.md#0209-error-handling-logging-monitoring`)

- [ ] Are authn failures, authz denials, and anomalous usage logged with attribution?
- [ ] Are logs free of tokens, credentials, and full PII?
- [ ] Is there alerting on spikes in 401/403, or in a single token hitting many object IDs (BOLA probing)?

---

## Quick attack tests to run

1. Drop the auth token → expect 401 everywhere non-public.
2. Use user A's token on user B's object IDs → expect 403/404, never data.
3. Send `role=admin` / `price=0` / `qty=-5` in the body → expect rejection.
4. Hammer the login/OTP endpoint → expect throttling.
5. Request `http://169.254.169.254/...` via any URL param → expect SSRF block.

**References:** THREAT-MODEL-COFFEE (CWE-862/863/306/269), JUICE-SHOP (BOLA basket, forged review via UserId, deluxe fraud, payback negative qty), PRINCIPLES-REF, LEC-FINAL-REVIEW


---

# 03.06 — Database Security Review Checklist

**Purpose:** Checks for databases and storage systems. Pair with
`Domains.md#0206-data-protection-privacy` and `Domains.md#0205-data-validation-web-security`.

**Scoring:** `PASS` / `FAIL` / `N/A` / `NEEDS-EVIDENCE`.

---

## 1. Query Construction (Injection) — highest priority

- [ ] Are **all** queries parameterized / prepared statements (PDO, bound parameters)? No concatenation of user input.
- [ ] Is the ORM used safely (no raw string queries built from user input; no unsafe `whereRaw`)?
- [ ] For NoSQL, are operators/queries built from validated structures (no `$where`, no object-injection of operators)?
- [ ] For LDAP/other backends, are filters escaped/parameterized?

## 2. Access Control & Accounts

- [ ] Does the application connect with a **least-privilege** DB account (no DBA/`root` for app runtime)?
- [ ] Are separate accounts used for migrations vs runtime vs read-only reporting?
- [ ] Are there **no** default/empty DB passwords (flagged in REF-IMPL demo config as not-for-production)?
- [ ] Is the DB reachable only from the app tier (not the public internet)?
- [ ] Is row/object ownership enforced in the **application** layer for every record fetch (defeats IDOR/BOLA at the data boundary)?

## 3. Encryption

- [ ] Is data encrypted **in transit** between app and DB (TLS), especially across hosts/networks?
- [ ] Is data encrypted **at rest** (e.g., AES-256: TDE, disk, or column-level for sensitive fields)?
- [ ] Are encryption keys stored separately from the data (KMS/vault), with a rotation plan?

## 4. Sensitive Data Handling (→ `Domains.md#0206-data-protection-privacy`)

- [ ] Are passwords stored only as Argon2id/bcrypt hashes (never plaintext, never reversible, never fast-hash)?
- [ ] Are other secrets (tokens, keys) not stored in plaintext?
- [ ] Is PII identified, minimized, and retention-limited (purge/anonymize on schedule)?
- [ ] Is there a working data-subject erasure path (GDPR) — and does it actually remove/anonymize, not just set a flag that crafted queries can bypass?
- [ ] Is sensitive data masked/redacted in non-production copies and in logs?

## 5. Integrity & Constraints

- [ ] Are uniqueness, foreign-key, and check constraints enforced at the DB level (not only in app code)?
- [ ] Are critical numeric fields constrained (e.g., no negative balances/quantities)?
- [ ] Are soft-delete / status fields safe from filter-tampering that exposes "deleted" rows?

## 6. Auditing & Logging (→ `Domains.md#0209-error-handling-logging-monitoring`)

- [ ] Are privileged DB actions and schema changes logged?
- [ ] Are application-level data-access events (especially admin reads of PII) auditable with attribution?
- [ ] Are DB error messages caught by the app and not surfaced to users (no leaking schema/SQL)?

## 7. Backups & Availability

- [ ] Are backups encrypted, access-controlled, and stored off the public web root / off the primary host?
- [ ] Is restore tested on a schedule?
- [ ] Are backups not exposed via the web app (no downloadable dumps, e.g., `/ftp`-style exposure from JUICE-SHOP)?
- [ ] Is there replication/failover for availability where required?

## 8. Configuration Hardening

- [ ] Are default sample databases/users/stored procedures removed?
- [ ] Is remote admin to the DB restricted and logged?
- [ ] Is the DB patched to current versions?
- [ ] Is verbose error reporting from the DB disabled toward the application's user-facing layer?

---

## Quick tests

1. Inject `' OR '1'='1`, `'--`, and `' OR deletedAt IS NOT NULL--` style payloads into every input → expect no injection, no extra rows.
2. As user A, attempt to read user B's rows through the app → expect denial.
3. Inspect the stored password column → expect Argon2/bcrypt hashes only.
4. Attempt to fetch a backup/dump via HTTP → expect 404/denied.

**References:** REF-IMPL (`db.php` PDO prepared statements, `config.php` empty-password note), JUICE-SHOP (SQLi login `'--`, GDPR erasure injection, exposed `/ftp` backups), SEC-POLICY (AES at rest, TLS in transit), THREAT-MODEL-COFFEE (CWE-89), PRINCIPLES-REF


---

# 03.07 — Authentication & Authorization Review Checklist

**Purpose:** Focused checks for identity, access control, permissions, and privilege management.
Pair with `Domains.md#0201-authentication-identity`, `Domains.md#0202-authorization-access-control`,
and `Domains.md#0203-session-management`.

**Scoring:** `PASS` / `FAIL` / `N/A` / `NEEDS-EVIDENCE`.

> Core distinction: **Authentication = "prove who you are."** **Authorization = "what you're allowed to do."**
> They are separate checks; passing authentication never implies authorization.

---

## PART A — AUTHENTICATION

### A1. Identifiers
- [ ] Are usernames normalized (case-insensitive) and unique at the DB level?
- [ ] If email is the identifier, is it validated (format, length) and output-encoded everywhere shown?

### A2. Passwords
- [ ] Is a minimum length enforced server-side, with passphrases allowed and common passwords rejected?
- [ ] Are passwords hashed with Argon2id/bcrypt (never plaintext, never MD5/SHA-1/SHA-256)?
- [ ] Is verification done via the platform verify API, not manual hash comparison?

### A3. Credential Transmission
- [ ] Is the **login page itself** served over HTTPS (not just the POST target)?
- [ ] Are all authenticated pages HTTPS, with HSTS?

### A4. Login Feedback & Brute Force
- [ ] Is the failed-login message **identical** for unknown user vs wrong password (no enumeration)?
- [ ] Is there account lockout / rate limiting / progressive delay / CAPTCHA after N failures? (REF-IMPL: 5 attempts → 10-min lockout)
- [ ] Are lockout and repeated-failure events logged?

### A5. Multi-Factor
- [ ] Is MFA available, and required for admin/sensitive accounts?
- [ ] Is the second factor verified server-side and resistant to replay?

### A6. Account Recovery & Lifecycle
- [ ] Are password resets token-based, single-use, time-limited, and non-enumerating?
- [ ] Is there no "security question only" reset path?
- [ ] Are accounts disabled/removed on offboarding; is there an account lifecycle (create/disable/delete)?

### A7. Federated / Modern Auth (OAuth / OIDC / SSO)
- [ ] If an Identity Provider is used, are tokens validated server-side (signature, issuer, audience, expiry/`nbf`)?
- [ ] Are the two key relationships correct: the IdP↔app trust (K1) and the user↔IdP credential (K2) — app never sees the user's IdP password?
- [ ] Are scopes/claims least-privilege and validated before use?
- [ ] Is the OAuth `state` parameter used to prevent CSRF on the callback?

---

## PART B — SESSION MANAGEMENT

- [ ] Are session IDs ≥128-bit length with ≥64-bit entropy from a CSPRNG?
- [ ] Are cookies `Secure`, `HttpOnly`, and `SameSite` set?
- [ ] Is the session ID **regenerated on login / privilege change** (anti-fixation)?
- [ ] Is the session fully invalidated server-side on logout?
- [ ] Is there an idle timeout and/or absolute timeout? (REF-IMPL: 1800s / 30-min timeout)
- [ ] Is the cookie scope correct (path/domain), and is "no Max-Age = session cookie" understood/intended?

---

## PART C — AUTHORIZATION

### C1. Enforcement Location
- [ ] Is authorization enforced **server-side on every request** (UI hiding is never the control)?
- [ ] Is there a **centralized** authorization mechanism (consistent, single decision point) rather than scattered per-screen checks?
- [ ] Is **complete mediation** applied (every access re-validated; nothing trusted because it was allowed earlier)?

### C2. Object-Level (BOLA / IDOR)
- [ ] For every resource accessed by ID, is **ownership/permission re-checked** for the current principal?
  - Test: user A requests user B's order/basket/profile by ID → must be denied.
- [ ] Are object references unguessable or always ownership-checked (preferably both)?

### C3. Function-Level & Privilege
- [ ] Are admin/privileged functions gated by a server-side role check (`require_admin`-style)?
- [ ] Is **least privilege** applied to users, roles, services, and DB accounts?
- [ ] Is privilege escalation prevented — client input cannot set `role`/`isAdmin`/group membership (no mass-assignment)?
- [ ] Is there separation of duties for high-impact actions (no single role can do everything unchecked)?

### C4. Model Fit
- [ ] Is the access-control model appropriate and correctly implemented (DAC / MAC / **RBAC** / ABAC)?
- [ ] Is there a documented **role × permission matrix** that matches the code?
- [ ] Are default permissions **deny** (fail-safe defaults), with access explicitly granted?

---

## PART D — EVIDENCE TO COLLECT

- Password-hashing call site + KDF parameters.
- Login handler showing generic error + lockout counter + session regeneration.
- Cookie-flag configuration.
- The centralized authorization function and an example object-ownership check.
- Role/permission matrix document.
- Token-validation code for any IdP/OAuth integration.
- Logs showing authn failures and authz denials with attribution.

---

## Highest-impact failures (treat as Critical/High)

- Plaintext or fast-hashed passwords.
- Login enumeration (different message/timing for unknown user).
- Missing object-ownership checks (BOLA/IDOR) on sensitive resources.
- Client-settable privilege fields (`role=admin`).
- No session regeneration on login (fixation).
- Authorization enforced only in the UI.

**References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2 (IdP/OAuth K1/K2, strict-vs-permissive sessions), PRINCIPLES-REF, REF-IMPL (`auth.php`, `login.php`, `config.php` MAX_FAILED_ATTEMPTS=5 / LOCKOUT=10min / SESSION_TIMEOUT=1800), THREAT-MODEL-COFFEE (CWE-287/306/862/863/269), JUICE-SHOP (SQLi login, admin registration role tamper, BOLA basket)
