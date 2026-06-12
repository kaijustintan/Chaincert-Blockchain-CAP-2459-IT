# Domains

> Consolidated domain knowledge: requirements, risks, detection, mitigations, and validation for every security domain. Each control follows the fixed schema (Principle / Requirement / Risk / Common Vulnerabilities / Detection / Mitigations / Validation Checklist / Evidence Required / Severity / References). See `README.md` for usage, and `Reference.md` / `Review-Checklists.md` for scoring and operational checks.

## Contents

1. [02.01 — Authentication & Identity](#0201-authentication-identity)
2. [02.02 — Authorization & Access Control](#0202-authorization-access-control)
3. [02.03 — Session Management](#0203-session-management)
4. [02.04 — Cryptography](#0204-cryptography)
5. [02.05 — Data Validation & Web Application Security](#0205-data-validation-web-application-security)
6. [02.06 — Data Protection & Privacy](#0206-data-protection-privacy)
7. [02.07 — API Security](#0207-api-security)
8. [02.08 — Network, Infrastructure & Cloud Security](#0208-network-infrastructure-cloud-security)
9. [02.09 — Error Handling, Logging, Monitoring & Incident Response](#0209-error-handling-logging-monitoring-incident-response)
10. [02.10 — Secure SDLC, DevSecOps & Supply Chain](#0210-secure-sdlc-devsecops-supply-chain)


---

# 02.01 — Authentication & Identity

**Authentication = "Prove who you are."** Verifying that an entity (person, device, or software
process) is who it claims to be. Distinct from authorization ("what you can do").

---

## A-1. User Identifiers

- **Principle:** A stable, unambiguous identity is the anchor for all access decisions.
- **Requirement:**
  - User IDs should be **case-insensitive** (`Smith` == `smith` == `SMITH`) and **unique** (no duplicates).
  - For high-security apps, consider **system-assigned usernames**.
  - If email is the username, **validate it**: check local part (≤ 64 chars), domain (≤ 255 chars), presence of `@`, and verify deliverability.
- **Risk:** Case-sensitive IDs create duplicate/ghost accounts, user confusion, and let attackers
  enumerate variants. Unvalidated email used as a username can carry an XSS payload that fires when displayed.
- **Common Vulnerabilities:** User enumeration, stored XSS via identifier (CWE-79), account collision.
- **Detection Methods:** Register `User`/`user`/`USER`; submit script/markup in the email field and check rendered output.
- **Mitigations:** Normalize (case-fold) before storage/compare; uniqueness constraint; allow-list email validation; output-encode identifiers everywhere displayed.
- **Validation Checklist:**
  - Are usernames normalized case-insensitively before comparison and storage?
  - Is uniqueness enforced at the database level?
  - If email is the identifier, are local/domain length limits and format validated server-side?
- **Evidence Required:** Schema unique constraint; normalization code; validation function; encoded output.
- **Severity:** Medium
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, REF-IMPL (`is_valid_email`)

---

## A-2. Password Strength

- **Principle:** Passwords must resist guessing and cracking.
- **Requirement:** Evaluate by **length**, **complexity**, and **topology** (avoid common patterns).
  **Length is the most important factor.**
- **Risk:** Weak/short passwords are brute-forced or guessed quickly.
- **Key reasoning (length > complexity):** An 8-char password over 95 possible chars ≈ 6.6 trillion
  combinations; a 20-char password using only lowercase (26 chars) ≈ 19.9 quintillion — about
  3 million times more. Each extra character multiplies difficulty exponentially. `P@$$w0rd`
  (8 chars, common topology) cracks in minutes; a long passphrase is effectively uncrackable.
- **Common Vulnerabilities:** Brute force, credential stuffing, dictionary attacks (CWE-521 weak password requirements).
- **Detection Methods:** Inspect password policy; test acceptance of short/common passwords.
- **Mitigations:** Enforce minimum length (favor passphrases); reject common-password lists; allow long passwords (e.g., up to 128); avoid forcing only-complexity rules that reduce usability without adding entropy.
- **Validation Checklist:**
  - Is a minimum length enforced server-side?
  - Are common passwords rejected (blocklist)?
  - Is an upper bound set high enough to allow passphrases?
- **Evidence Required:** Strength-validation function; common-password list; server-side enforcement.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, REF-IMPL (`validate_password_strength`, `is_common_password`)

---

## A-3. Password Storage

- **Principle:** A breach of the credential store must not yield usable passwords.
- **Requirement:** **NEVER store plaintext.** Use a slow, salted password-hashing function: **bcrypt** or **Argon2 (Argon2id)**.
- **Risk:** Plaintext storage = total compromise of every user on breach.
- **Common Vulnerabilities:** Plaintext/weakly-hashed passwords (CWE-256, CWE-916), reversible storage.
- **> CONFLICT / NUANCE (important):** SHA-256 is **NOT broken**, but it is the **wrong tool** for
  passwords because it is **too fast** — attackers compute billions/sec. Use it for file integrity,
  not passwords. bcrypt/Argon2 are intentionally slow (tunable work factor). General-purpose fast
  hashes (MD5, SHA-1) are *also* obsolete/insecure for any sensitive use.
- **Detection Methods:** Inspect storage code/schema; confirm KDF and work factor; look for `md5(`, `sha1(`, `sha256(` on passwords.
- **Mitigations:** `password_hash(..., PASSWORD_ARGON2ID)` or bcrypt; per-user salt (automatic in these KDFs); tune work factor to hardware; re-hash on login when parameters change.
- **Validation Checklist:**
  - Is a memory-hard / slow KDF (Argon2id/bcrypt) used, not a fast hash?
  - Are salts unique per user (implicit in Argon2/bcrypt)?
  - Is the work factor tuned and documented?
- **Evidence Required:** Hashing call site; KDF parameters; absence of fast-hash usage on passwords.
- **Severity:** Critical
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, REF-IMPL (`PASSWORD_ARGON2ID`)

---

## A-4. Password & Credential Transmission

- **Principle:** Credentials and session material must never traverse the network in cleartext.
- **Requirement:** Transmit **only over TLS (HTTPS)**. The **login page itself must be HTTPS**, not
  just the form submission target. Every authenticated page must also be HTTPS.
- **Risk:** A man-in-the-middle can rewrite an HTTP login page so the form posts to an attacker
  domain; the user types a password into a page that *looks* real. After login, any single HTTP
  request leaks the session cookie in plaintext → session hijack.
- **Common Vulnerabilities:** Cleartext transmission (CWE-319), MitM, SSL-strip.
- **Detection Methods:** Check that login page loads over HTTPS; check redirect from HTTP→HTTPS; confirm HSTS; verify `Secure` cookie attribute (see Session Management).
- **Mitigations:** Force HTTPS site-wide (redirect + HSTS); set `Secure` on cookies; TLS 1.2+ with strong ciphers.
- **Validation Checklist:**
  - Does the login page load over HTTPS (not just the POST endpoint)?
  - Is HTTP redirected to HTTPS and is HSTS set?
  - Are all post-login pages HTTPS with `Secure` cookies?
- **Evidence Required:** TLS config; redirect rule (e.g., `.htaccess` force-HTTPS); HSTS header; cookie flags.
- **Severity:** Critical
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, REF-IMPL (`_htaccess` force-HTTPS)

---

## A-5. Re-authentication for Sensitive Actions

- **Principle:** High-impact changes need a fresh proof of identity, not just an active session.
- **Requirement:** Before changing password, email, or shipping/payment destination, **re-prompt for
  the current password** (step-up auth).
- **Risk:** An attacker who hijacks a session via CSRF/XSS can perform irreversible sensitive actions.
- **Common Vulnerabilities:** Insufficient verification of sensitive operations, CSRF (CWE-352), session riding.
- **Mitigations:** Require current password / step-up MFA for sensitive flows; combine with CSRF tokens.
- **Validation Checklist:**
  - Are password/email/financial-destination changes gated by re-authentication?
  - Is step-up auth required for the most sensitive operations?
- **Evidence Required:** Sensitive-action handlers requiring current credentials.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2

---

## A-6. Authentication Error Messages & Response Uniformity

- **Principle:** Authentication failures must not reveal which factor was wrong.
- **Requirement:** Use **one generic message for ALL failures** — e.g., *"Login failed; invalid user
  ID or password."* **The HTTP status code must also be identical** across all failure types.
- **Risk:** Distinct messages or status codes (e.g., 200 vs 403) let attackers enumerate valid users.
- **Examples:**
  - ❌ "Login for User foo: invalid password" → reveals a valid username.
  - ❌ "Login failed, invalid user ID" → reveals the username is the issue.
  - ❌ "Login failed; account disabled" → reveals account exists + status.
  - ✅ "Login failed; Invalid user ID or password" → reveals nothing specific.
- **Common Vulnerabilities:** User enumeration via message or status-code differences (CWE-203 observable discrepancy).
- **Detection Methods:** Compare responses (body + status + timing) for valid-user/wrong-password vs invalid-user.
- **Mitigations:** Single generic failure path; identical status codes; constant-time-ish behavior; rate limiting.
- **Validation Checklist:**
  - Is the failure message identical regardless of which field is wrong?
  - Are HTTP status codes identical for all failure types?
  - Is timing roughly uniform (no obvious oracle)?
- **Evidence Required:** Login handler showing a single generic error branch.
- **Severity:** Medium
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, REF-IMPL (`login.php` generic "Invalid email or password")

---

## A-7. Brute-Force & Credential-Stuffing Prevention

- **Principle:** Make online guessing economically infeasible without enabling self-inflicted DoS.
- **Requirement:** **Account lockout** after X failed attempts within a window, and/or **MFA**.
- **Risk:** Unlimited attempts → password guessing, credential stuffing.
- **> CONFLICT / NUANCE:** Lockout itself can be **abused as DoS** (attacker deliberately fails logins
  on a victim's account to lock them out). **MFA avoids this problem** and is a "moving target" — even
  a guessed password fails without the second factor. With MFA active, lockout may not even be needed.
- **Common Vulnerabilities:** No rate limiting / lockout (CWE-307 improper restriction of excessive auth attempts).
- **Detection Methods:** Script repeated failed logins; observe whether/when blocking occurs; check logs.
- **Mitigations:** Track attempts per account/IP within a time window; exponential backoff; CAPTCHA / step-up after threshold; MFA; log all attempts.
- **Validation Checklist:**
  - Are failed attempts counted and throttled per account and per IP?
  - Is there a lockout window or progressive delay?
  - Is MFA available/required for sensitive accounts?
  - Is lockout-as-DoS considered (prefer MFA / soft locks)?
- **Evidence Required:** Attempt-logging table, lockout logic, configurable thresholds.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, REF-IMPL (`record_login_attempt`, `is_locked_out`, `MAX_FAILED_ATTEMPTS=5`, `LOCKOUT_MINUTES=10`)

---

## A-8. Multi-Factor Authentication (MFA)

- **Principle:** Multiple independent factors (know / have / are) drastically raise the bar.
- **Requirement:** Support MFA for sensitive actions — TOTP, WebAuthn, push, hardware keys.
- **Risk:** Single-factor auth fully compromised by one stolen secret.
- **Mitigations:** TOTP/WebAuthn/hardware keys; step-up for high-risk operations; invalidate sessions on MFA changes.
- **Validation Checklist:** Is MFA available? Required for privileged/admin accounts? Enforced on sensitive actions?
- **Evidence Required:** MFA enrollment + enforcement configuration.
- **Severity:** High
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW, SEC-POLICY

---

## A-9. Secure Password Recovery

- **Principle:** Recovery flows are themselves an attack surface and must be as strong as login.
- **Requirement:** Recovery must not rely on **publicly researchable** secrets.
- **Risk:** Security questions answerable via OSINT (social media, public profiles) are bypassable.
  *(Juice Shop: "eldest sibling's middle name" answered by Googling; "favourite pet" found on Twitter/photo wall.)*
- **Common Vulnerabilities:** Weak knowledge-based recovery (CWE-640 weak password recovery mechanism).
- **Mitigations:** Time-limited single-use reset tokens sent to a verified channel; avoid static security questions; rate-limit and log resets; require re-auth/MFA for high-value accounts.
- **Validation Checklist:**
  - Does recovery avoid static, guessable/OSINT-able questions?
  - Are reset tokens single-use, high-entropy, and short-lived?
  - Are recovery attempts logged and rate-limited?
- **Evidence Required:** Reset-token generation/expiry code; recovery logging.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, JUICE-SHOP (Bjoern's Pet, Jim's security question)

---

## A-10. OAuth 2.0 / Passwordless Third-Party Auth

- **Principle:** Delegate authentication so the relying app never handles the user's primary credential.
- **Requirement:** Use OAuth2/OIDC properly; the relying party receives a **revocable token**, never the password.
- **Flow (canonical "Log in with Google" example):** (1) App redirects to provider's login page →
  (2) user enters password on the **provider's** page (app never sees it) → (3) provider asks consent
  for requested scopes → (4) user allows → (5) provider returns a **token** (not the password) →
  (6) app uses the token to fetch authorized profile data. If the relying app is breached, the
  attacker gets only a revocable token, not the provider password.
- **Risk:** Direct password sharing creates a massive attack surface; improper OAuth (missing state,
  redirect validation) enables token theft/CSRF.
- **Common Vulnerabilities:** Open redirect / improper redirect_uri validation, missing `state` (CSRF), token leakage.
- **Mitigations:** Validate `redirect_uri` against allow-list; use `state`/PKCE; least-privilege scopes; validate token signature/issuer/audience/expiry.
- **Validation Checklist:** Is the password never sent to the relying app? Are redirect URIs allow-listed? Is `state`/PKCE used? Are tokens validated and revocable?
- **Evidence Required:** OAuth client config, redirect allow-list, token-validation code.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2

---

## A-11. Identity Providers (IdP) & Single Sign-On (SSO)

- **Principle:** Centralize authentication so users authenticate once and a signed token grants access
  across multiple services.
- **Requirement:** Authenticate against an IdP, receive a **cryptographically signed security token**
  containing **claims**, and validate it at each relying service.
- **Old vs new:** Old way — credentials sent directly to every server (N servers = N logins, N
  password stores to breach). Modern — authenticate once to an IdP, get a token usable across services (SSO).
- **Security token claims (validate all):**
  | Claim | Meaning | Why it matters |
  |---|---|---|
  | **Subject** | Immutable, non-reusable user identifier | Display name can change; subject ID never changes / is never reassigned |
  | **Issued At** | When token was created | Detect stale/expired tokens |
  | **Expiration** | When token stops being valid | Limits window of compromise |
  | **Audience** | Which service the token is for | Prevents token replay across services |
- **Why the `audience` claim matters:** Without it, Service 1 could forward *your* token to Service 2
  impersonating you. The audience claim locks a token to a specific service; a mismatched audience is rejected.
- **Two distinct signing keys (common exam/realworld confusion):**
  - **K1 = IdP's key** signs the **token**.
  - **K2 = the relying website's OWN key** signs the **session cookie**.
  - They are completely separate. The cookie is signed by the website's key, *not* the IdP's.
- **Full web authentication flow:** user visits site → site sees no cookie → site **redirects** browser
  to IdP (params in URL) → user authenticates with IdP → IdP issues **signed token** with claims →
  token returned to site **via POST through the browser** → site validates token using the **IdP's
  public signing key** → site checks the **audience** claim → site creates a **session cookie signed
  with its own key (K2)** → browser stores cookie and sends it on every request → session established.
- **Why POST (not GET) for the token:** GET params land in browser history, server access logs, and
  referrer headers, and have length limits. POST body avoids those exposures. **POST is not encrypted
  by default** — HTTPS encrypts GET and POST equally; the reason for POST is *log/history exposure*, not encryption.
- **Standard protocols:**
  | Protocol | Encoding | Notes |
  |---|---|---|
  | SAML | XML | Older, enterprise-heavy |
  | WS-Federation | XML | Microsoft ecosystem |
  | OpenID Connect | JSON | Modern, built on OAuth 2.0 |
- **Who is the IdP:** third-party (Microsoft Entra ID, Google Workspace, Okta, Auth0) or
  internal/self-hosted (Active Directory + ADFS); many orgs run hybrid.
- **Common Vulnerabilities:** Missing/incorrect audience validation, accepting unsigned/`alg=none`
  tokens, weak signature verification, token replay, missing expiry checks.
- **Mitigations:** Verify signature against IdP public key; enforce issuer/audience/expiry; short-lived
  tokens + rotation/revocation; reject `alg=none`.
- **Validation Checklist:**
  - Is the token signature verified with the IdP's public key?
  - Are issuer, audience, and expiration all validated?
  - Is the session cookie signed by the relying app's own key (separate from the IdP key)?
  - Is the token returned via POST, and is HTTPS enforced throughout?
- **Evidence Required:** Token-validation routine; key configuration showing separate IdP vs app keys; redirect/POST flow.
- **Severity:** Critical
- **References:** LEC-FINAL-REVIEW-V2 (IdP/OAuth section)

---

## A-12. Account Lifecycle & Session Invalidation

- **Principle:** Identity must be governed from onboarding to deprovisioning.
- **Requirement:** Strong onboarding verification for privileged accounts; enforce password
  complexity/reuse rules if passwords are supported; **automate deprovisioning** when users leave or
  roles change; **invalidate sessions/tokens on password or MFA change**.
- **Risk:** Orphaned accounts and stale sessions enable persistent unauthorized access.
- **Mitigations:** Joiner/mover/leaver automation; token revocation lists; session invalidation hooks; periodic access recertification.
- **Validation Checklist:** Are leavers deprovisioned automatically? Are sessions/tokens revoked on credential change? Is access recertified periodically?
- **Evidence Required:** Deprovisioning workflow; revocation-on-change logic; recertification records.
- **Severity:** High
- **References:** PRINCIPLES-REF, SEC-POLICY (review & recertification of access control)

---

## A-13. Authentication Logging & Monitoring

- **Principle:** "If you can't see it, you can't stop it."
- **Requirement:** Log **all** authentication events in real time — login successes/failures, password
  failures, account lockouts — with timestamps and source IP; review regularly.
- **Risk:** Undetected brute force/credential stuffing (e.g., 500 failed attempts in 5 minutes).
- **Mitigations:** Structured auth logs; alerting on anomalies; tamper-resistant log storage (see Logging domain).
- **Validation Checklist:** Are all auth events logged with timestamp + IP? Are logs reviewed/alerted on? Are they tamper-protected?
- **Evidence Required:** Auth log channel; sample entries; alert rules.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, PRINCIPLES-REF, REF-IMPL (`log_auth`)


---

# 02.02 — Authorization & Access Control

**Authorization = "What are you allowed to do?"** Distinct from authentication. Authentication
proves identity; authorization enforces permissions. A correctly authenticated user can still be
unauthorized for a given resource or action.

---

## Z-1. Principle of Least Privilege

- **Principle:** Give users and code **only the minimum access needed** — nothing more.
- **Requirement:** Apply least privilege across the entire stack: web-server config, OS/service
  accounts, database grants, API tokens, and business logic. (Analogy: a receptionist sees schedules
  but not medical records.)
- **Risk:** Over-privileged accounts/processes widen blast radius after any single compromise.
- **Common Vulnerabilities:** Improper privilege management (CWE-269), excessive DB grants, over-scoped tokens.
- **Detection Methods:** Review role/permission matrix, DB grants, token scopes, service-account rights.
- **Mitigations:** Scope every role/token to the minimum; separate service accounts per app; deny by default.
- **Validation Checklist:**
  - Does each role have only the permissions its function requires?
  - Do service/DB accounts run with minimal grants (not admin/root)?
  - Are API tokens scoped narrowly?
- **Evidence Required:** Role-permission matrix; DB grant statements; token scope config.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, PRINCIPLES-REF, SEC-POLICY, REF-IMPL (`require_admin`)

---

## Z-2. Centralized Authorization Routines

- **Principle:** Authorization logic must live in one place so a rule change applies everywhere at once.
- **Requirement:** Route all access checks through a **central module / policy engine**; do not copy
  ad-hoc checks into every page/endpoint.
- **Risk:** Distributed copies drift. *(Example: a system with 50 pages each with its own copied check;
  a rule change is applied to 48 but 2 are missed — those 2 are now vulnerable.)* Centralization means
  one fix, applied everywhere, with no missed pages.
- **Common Vulnerabilities:** Inconsistent/missing authorization (CWE-862 missing authorization, CWE-863 incorrect authorization).
- **Detection Methods:** Search for inline/ad-hoc permission checks scattered across handlers; look for endpoints with no check.
- **Mitigations:** Single authorization service/middleware; deny-by-default; tests that every protected route invokes it.
- **Validation Checklist:**
  - Is authorization enforced by shared middleware/a policy engine rather than per-page copies?
  - Is there any endpoint lacking an authorization check?
  - Does a rule change require editing only one location?
- **Evidence Required:** Central authz module; middleware wiring; route protection map.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, REF-IMPL (`auth.php`: `require_login`/`require_admin`)

---

## Z-3. Authorize the Resource, Not Just the Action (BOLA / IDOR)

- **Principle:** Check **resource ownership**, not only whether the action type is allowed.
- **Requirement:** For every object access, verify the authenticated user is allowed to act on **that
  specific object** (e.g., `if (resource.owner_id != current_user.id) return 403;`).
- **Risk:** The **most common authorization mistake**: the app checks "*Can this user transfer?*" ✔ but
  not "*Is the source account actually theirs?*" ✘. An attacker changes an ID in the request (via proxy
  like Burp Suite) to act on another user's resource.
- **Worked example (banking):** User logged in as themselves requests a transfer from account 1001
  (theirs). Attacker edits the request to `From: 5555` (someone else's). App checks "can this user
  transfer?" → yes → transfer executes from the victim's account. The action was authorized; the
  *resource* was not. This is exactly Juice Shop's basket challenge (**BOLA — Broken Object-Level Authorization**).
- **> CONFLICT / NUANCE (boundary of BOLA):** Accessing *another user's* resource is BOLA. By contrast,
  missing a *"to account"* validation (a constraint on your own action) is a **business-logic** flaw,
  not BOLA. Classify precisely: BOLA = cross-user object access; business logic = invariant on the operation.
- **Common Vulnerabilities:** BOLA / IDOR (CWE-639 authorization bypass through user-controlled key, CWE-862, CWE-863).
- **Detection Methods:** Enumerate/modify object IDs in requests as a low-privileged user; observe access to others' data.
- **Mitigations:** Server-side ownership check on every object; scoped queries (`WHERE id=? AND user_id=?`); deny by default; centralized checks.
- **Validation Checklist:**
  - Does every object access verify ownership/eligibility for *that* object server-side?
  - Are queries scoped to the current user (`AND user_id = ?`)?
  - Can a low-priv user reach another user's object by changing an ID?
- **Evidence Required:** Ownership-check code; scoped query examples (the reference impl uses `WHERE id=? AND user_id=?` for review delete/cancel).
- **Severity:** Critical
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, JUICE-SHOP (basket/BOLA, Forged Feedback/Review), REF-IMPL (`book.php` scoped deletes)

---

## Z-4. Access Control Models (DAC / MAC / RBAC / ABAC)

- **Principle:** Choose and correctly implement the access-control model that matches the domain.
- **The four models:**
  | Model | Based on | Key trait | Decided by |
  |---|---|---|---|
  | **DAC** (Discretionary) | Identity / need-to-know | Owner can pass access to others | **Owner decides** |
  | **MAC** (Mandatory) | Sensitivity labels + formal authorization | System enforces; users **cannot** override | **System decides** |
  | **RBAC** (Role-Based) | Roles / security groups | Access inherited by role membership | **Role decides** |
  | **ABAC** (Attribute-Based) | Properties of request/resource/context | Most flexible; uses time, location, device, risk score | **Context decides** |
- **> Common confusions to avoid:**
  - **Government classification (Secret / Top Secret) is MAC, not RBAC.** Tell: the classification is on
    the *documents* and the *system* enforces it; users can't override. In RBAC, "Editor" is a job
    function; in MAC, "Secret" is a security classification.
  - **ABAC** is the model with **contextual attributes** (time of day, location, device) — do not confuse
    with DAC. DAC = owner decides; ABAC = context decides.
- **Requirement:** Document which model(s) apply; for complex org logic combine RBAC + ABAC; centralize the policy.
- **Risk:** Wrong/loose model → over-broad access or unenforceable policy.
- **Mitigations:** RBAC baseline with least privilege; ABAC for contextual constraints; MAC where mandatory labels are required.
- **Validation Checklist:**
  - Is the chosen model documented and consistently enforced?
  - Are roles/labels/attributes defined with least privilege?
  - Is the policy centralized (see Z-2)?
- **Evidence Required:** Model definition; role/label/attribute config; permission matrix.
- **Severity:** Medium
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, SEC-POLICY (RBAC), THREAT-MODEL-COFFEE (role matrix)

---

## Z-5. Role / Permission Matrix (CRUD-style, from worked model)

- **Principle:** Every functionality must have an explicit, least-privilege permission per role.
- **Requirement:** Maintain a matrix mapping each function to each role using
  **C**reate / **R**ead / **U**pdate / **D**elete / e**X**ecute / **-** (no access). Deny by default
  (blank = no access). *(Worked example: Customer / Barista / Manager / Administrator across account,
  ordering, reporting, and configuration functions — see `Reference.md#04-worked-threat-model-coffee-ordering-web-app`.)*
- **Risk:** Undocumented permissions lead to gaps (missing authorization) or excess (privilege creep).
- **Mitigations:** Single source-of-truth matrix; enforce via centralized authz; test each cell.
- **Validation Checklist:** Is there a complete function×role matrix? Is "no access" the default? Is it enforced and tested?
- **Evidence Required:** The matrix + tests mapping cells to enforced checks.
- **Severity:** Medium
- **References:** THREAT-MODEL-COFFEE, SEC-POLICY

---

## Z-6. Privilege Escalation (Vertical & Horizontal)

- **Principle:** A user must never gain rights beyond their assignment.
- **Requirement:** Server-side enforcement of role and ownership on **every** privileged action; never
  trust client-supplied role/identity fields.
- **Risk:**
  - **Vertical escalation** — lower role gains higher-role functions (Customer→Staff, Barista/Manager→Admin).
    *(Juice Shop "Admin Registration": intercept the registration request and set `role: "admin"`.)*
  - **Horizontal escalation** — access another user's account at the same privilege level (a form of BOLA).
- **Common Vulnerabilities:** Mass assignment of privileged fields, missing server-side role checks
  (CWE-269 improper privilege management, CWE-862/863).
- **Detection Methods:** Tamper with role/identity fields in requests; attempt admin-only endpoints as a normal user.
- **Mitigations:** Never accept role from the client; allow-list bindable fields; re-check role/ownership server-side; centralized authz.
- **Validation Checklist:**
  - Are role/privilege fields ever taken from client input? (Must be NO.)
  - Are privileged endpoints re-checked server-side regardless of UI?
  - Are mass-assignment / overposting protections in place?
- **Evidence Required:** Server-side role checks; field allow-lists; tests for escalation.
- **Severity:** Critical
- **References:** LEC-FINAL-REVIEW, JUICE-SHOP (Admin Registration), THREAT-MODEL-COFFEE (T-016/T-017/T-018), THREAT-DRAGON-ACT2/3

---

## Z-7. Separate Identity from Permissions; Complete Mediation

- **Principle:** "Who you are" (identity) must be separate from "what you can do" (permissions), and
  every access must be checked **every time**.
- **Requirement:** No trusting cached permissions across security boundaries; re-evaluate authorization
  at each protected operation.
- **Risk:** Stale/cached permission decisions enable access after a role/permission change.
- **Mitigations:** Complete mediation; revalidate on each request; invalidate on permission change.
- **Validation Checklist:** Is authorization re-checked on each access (not cached past a boundary)? Are permission changes effective immediately?
- **Evidence Required:** Per-request authorization enforcement; cache-invalidation on permission change.
- **Severity:** High
- **References:** PRINCIPLES-REF


---

# 02.03 — Session Management

**Why sessions exist:** HTTP is **stateless** — the server has "amnesia." Sessions let the server
recognize the same user across requests. The **session ID is temporarily equivalent to the user's
strongest authentication method**: stealing the session ID = stealing the identity (**session hijacking**).

---

## S-1. Session ID Properties

- **Principle:** Session identifiers must be unguessable, unpredictable, and meaningless.
- **Requirement:**
  | Property | Requirement | Why |
  |---|---|---|
  | **Name** | Generic (e.g., `id`); **not** `PHPSESSID`/`JSESSIONID` | Avoids tech-stack disclosure |
  | **Length** | **≥ 128 bits (16 bytes)** | Prevents brute force (2¹²⁸ ≈ 340 undecillion combinations) |
  | **Entropy** | **≥ 64 bits** of true randomness | Prevents prediction/guessing |
  | **Content** | Meaningless; no sensitive/user data | Prevents information disclosure |
- **Risk:** Short/low-entropy IDs are brute-forced or predicted; meaningful IDs leak data; framework
  default names fingerprint the stack.
- **Common Vulnerabilities:** Insufficient session randomness (CWE-330/CWE-331), predictable IDs, info in token.
- **Detection Methods:** Inspect cookie name; collect many IDs and test for patterns/short length; check RNG source.
- **Mitigations:** Generate with a CSPRNG (e.g., `SecureRandom`); ≥128-bit length, ≥64-bit entropy; generic name; opaque content.
- **Validation Checklist:**
  - Is the session ID ≥ 128 bits with ≥ 64 bits entropy from a CSPRNG?
  - Is the cookie name generic (not a framework default)?
  - Does the ID contain no sensitive/user data?
- **Evidence Required:** Session-ID generation config/code; RNG source; cookie name.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2

---

## S-2. Cookie Attributes

- **Principle:** Cookie attributes are browser instructions controlling *when/how* a cookie is sent;
  the server sets them but never receives them back (the browser returns only `name=value`).
- **Requirement:** Set the protective attributes correctly:
  | Attribute | What it does | Without it |
  |---|---|---|
  | **Secure** | Cookie sent **only over HTTPS** | Sent over HTTP too → MitM can sniff it |
  | **HttpOnly** | JavaScript **cannot** access the cookie (blocks `document.cookie`) | XSS steals session via `document.cookie` |
  | **SameSite** (Lax/Strict) | Restricts cross-site sending | CSRF surface increases |
  | **Domain** | Scopes cookie to domain + subdomains | May leak to wrong domains |
  | **Path** | Scopes cookie to URL paths | Sent to all paths → larger attack surface |
  | **Max-Age / Expires** | Controls lifetime | Absent → **session cookie** (memory, dies on browser close); present → **persistent** (disk) |
- **> Two frequently-confused points (memorize):**
  - **`Secure` does NOT encrypt the cookie.** It only restricts transport to HTTPS. Encryption comes
    from TLS itself. *(Slide quote: "Using HTTPS without this [Secure] attribute is useless.")*
  - **`HttpOnly` blocks JavaScript access** (`document.cookie`); it is unrelated to transport.
  - **No `Max-Age`/`Expires` = SESSION cookie** (dies on close), **not** persistent. (Common reversal error.)
- **Risk:** Missing `Secure` → sniffable over HTTP; missing `HttpOnly` → XSS session theft; missing
  `SameSite` → CSRF.
- **Common Vulnerabilities:** Sensitive cookie without `Secure`/`HttpOnly` (CWE-614, CWE-1004), CSRF (CWE-352).
- **Detection Methods:** Inspect `Set-Cookie` headers for flags; attempt `document.cookie` read; test HTTP transmission.
- **Mitigations:** Set `Secure; HttpOnly; SameSite` on session cookies; scope `Domain`/`Path` tightly; choose lifetime deliberately.
- **Validation Checklist:**
  - Are `Secure`, `HttpOnly`, and `SameSite` all set on session cookies?
  - Are `Domain`/`Path` scoped as narrowly as possible?
  - Is the lifetime (session vs persistent) intentional and documented?
- **Evidence Required:** `Set-Cookie` header / cookie config showing flags.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF

---

## S-3. Session Fixation

- **Principle:** A change in privilege level must produce a new session ID.
- **Requirement:** **Regenerate the session ID after login** (and after every privilege-level change).
- **Risk / mechanism:** (1) Attacker obtains a session ID; (2) crafts a link presetting that ID for the
  victim; (3) victim logs in; (4) server does **not** regenerate the ID; (5) attacker, holding the same
  ID, is now authenticated as the victim.
- **Common Vulnerabilities:** Session fixation (CWE-384).
- **Detection Methods:** Capture pre-login session ID; log in; check whether the ID changed.
- **Mitigations:** `session_regenerate_id(true)` (or framework equivalent) on authentication and privilege changes.
- **Validation Checklist:**
  - Is the session ID regenerated immediately after successful login?
  - Is it regenerated on any privilege-level change?
- **Evidence Required:** Regeneration call in the login/privilege-change path.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, REF-IMPL (`login.php`: `session_regenerate_id(true)`)

---

## S-4. Session Expiration & Lifecycle

- **Principle:** Sessions must not live indefinitely; they must die predictably.
- **Requirement:** Implement **idle timeout**, **absolute timeout**, **manual logout** (destroy server
  session **and** clear the cookie), and **force logout on browser close** (session cookie).
- **Risk:** Long-lived sessions widen the hijack window; logout that only clears the cookie but leaves
  the server session valid is exploitable.
- **Common Vulnerabilities:** Insufficient session expiration (CWE-613), incomplete logout.
- **Detection Methods:** Idle past the timeout and retry; after logout, replay the old session ID.
- **Mitigations:** Server-side idle + absolute timeouts; destroy server-side session on logout; clear cookie; invalidate on credential change.
- **Validation Checklist:**
  - Are both idle and absolute timeouts enforced server-side?
  - Does logout destroy the server session *and* clear the cookie?
  - Is the session invalidated on password/MFA change?
- **Evidence Required:** Timeout config (e.g., 30-minute idle), logout handler, invalidation hooks.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, REF-IMPL (`auth.php`: `check_session_timeout`, `SESSION_TIMEOUT=1800`), PRINCIPLES-REF

---

## S-5. Strict vs Permissive Session Management

- **Principle:** The server should accept only session IDs it generated.
- **Requirement:** Use **Strict** session management (accept only server-generated IDs). Avoid
  **Permissive** (accept any client-supplied ID).
- **Risk:** Permissive sessions are vulnerable to **session fixation** (the server adopts an
  attacker-supplied ID).
- **> Note:** The two session-management types in this canon are **Strict** and **Permissive** only —
  there is no "stateless" or "token-based" classification in this context.
- **Common Vulnerabilities:** Session fixation (CWE-384).
- **Mitigations:** Reject unknown/client-set IDs; always (re)issue server-generated IDs; regenerate on login.
- **Validation Checklist:** Does the server reject session IDs it didn't generate? Are only server-issued IDs honored?
- **Evidence Required:** Session-handling config proving strict mode / regeneration.
- **Severity:** Medium
- **References:** LEC-FINAL-REVIEW-V2

---

## S-6. Tokens (stateless / API sessions)

- **Principle:** Token-based sessions need the same secrecy, integrity, and lifecycle guarantees.
- **Requirement:** Use secure, **signed**, ideally **short-lived** tokens (JWT, PASETO, or opaque
  DB-backed tokens); implement **rotation**, **revocation lists**, and **invalidation on password/MFA change**.
- **Risk:** Long-lived or unrevocable tokens extend compromise; unsigned/weakly-validated tokens are forgeable.
- **Common Vulnerabilities:** Accepting `alg=none`, missing expiry/audience checks, no revocation.
- **Mitigations:** Short TTL + refresh/rotation; verify signature/issuer/audience/expiry; maintain revocation list; bind cookie flags when stored in cookies.
- **Validation Checklist:** Are tokens signed and fully validated? Short-lived with rotation? Revocable, and revoked on credential change?
- **Evidence Required:** Token config, validation code, revocation mechanism.
- **Severity:** High
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW-V2 (token signed by app key K2)


---

# 02.04 — Cryptography

Cryptography flow: `Plaintext → Encrypt(Key) → Ciphertext → Decrypt(Key) → Plaintext`.
Crypto is easy to misuse; prefer vetted libraries and standard constructions over custom code.

---

## C-1. The Four Cryptographic Functions

- **Authentication** — verify the identity of a remote user/system (e.g., an SSL certificate proves server identity).
- **Non-Repudiation** — prove a user performed a transaction so they can't deny it (digital signatures on transfers).
- **Confidentiality** — keep data secret from unauthorized parties (encrypting records).
- **Integrity** — ensure data was not altered (hash checksums / HMAC).
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2

---

## C-2. Algorithm Types (and what to use / avoid)

| Type | Keys | Speed/profile | Examples (✅ use / ❌ avoid) |
|---|---|---|---|
| **Symmetric (private key)** | 1 shared key | Fast | AES ✅ ; DES ❌, 3DES ❌ |
| **Asymmetric (public key)** | 2 mathematically related keys (public + private) | Slow | RSA ✅ ; modern curves ✅ |
| **Hybrid** | Asymmetric handshake → symmetric for bulk data | Best of both | SSL/TLS ✅ |
| **Hashing** | One-way, no reversal | N/A | SHA-256 ✅ ; MD5 ❌, SHA-1 ❌ |

- **Principle:** Match the primitive to the job; never invent your own.
- **Asymmetric intuition:** Public key encrypts / private key decrypts. Mailbox analogy — anyone can
  drop a letter through the slot (public key = encrypt), only the owner's key opens it (private key =
  decrypt). The keys are linked via large-prime multiplication: easy one way, infeasible to reverse;
  knowing the public key does not reveal the private key.
- **Common Vulnerabilities:** Use of broken algorithms (CWE-327), custom crypto, weak keys.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF

---

## C-3. SSL/TLS Handshake (Hybrid Cryptography)

- **Principle:** Combine slow asymmetric crypto (for key exchange) with fast symmetric crypto (for data).
- **Flow:** (1) Browser requests the server identify itself → (2) server sends its certificate with a
  **public key** → (3) browser generates a symmetric **session key**, encrypts it with the server's
  **public key**, and sends it → (4) server decrypts it with its **private key** → (5) both sides
  encrypt all subsequent data with the shared **symmetric session key**.
- **Heavy-lock analogy:** The public key is a heavy lock anyone can lock with; you lock a small package
  containing a lightweight padlock key (symmetric key) and send it; the server opens the heavy lock with
  its private key, retrieves the lightweight key; both then use the lightweight key for everything.
  Heavy lock = RSA (used once); lightweight key = AES (used for all data).
- **Requirement:** Enforce **TLS 1.2+** (disable TLS 1.0/1.1, SSLv3) with strong cipher suites; valid certificates; HSTS.
- **Risk:** Downgrade/MitM, weak ciphers, expired/invalid certs.
- **Validation Checklist:** Is TLS 1.2+ enforced? Legacy protocols/ciphers disabled? Certs valid and HSTS set?
- **Evidence Required:** TLS configuration, cipher list, cert details, HSTS header.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, SEC-POLICY (TLS for data in transit)

---

## C-4. Hashing Properties (do not conflate)

- **One-Way Function:** Cannot reverse the hash to recover the input.
- **Avalanche Effect:** A small input change produces a dramatically different output.
- **Collision Resistance:** Hard to find two distinct inputs with the same output.
- **> These are three DIFFERENT properties** (a common confusion: avalanche ≠ one-way).
- **Requirement:** Use SHA-256+ for integrity; for *passwords* use a slow KDF (see C-7).
- **References:** LEC-FINAL-REVIEW-V2

---

## C-5. Cipher Modes

- **Principle:** The mode of operation determines security as much as the cipher.
- **Requirement / ranking:**
  - **ECB ❌** — encrypts each block independently → identical plaintext blocks produce identical
    ciphertext (you can literally see outlines of an encrypted image). Never use for real data.
  - **CBC ✅** — chains blocks so identical inputs produce different outputs.
  - **GCM ✅ (AEAD)** — provides encryption **and** integrity in one step; best for network traffic
    (TLS 1.3 uses AES-GCM). ChaCha20-Poly1305 is an equivalent AEAD choice.
- **Risk:** ECB leaks structure; non-AEAD modes lack built-in integrity.
- **Common Vulnerabilities:** ECB usage / missing integrity (CWE-327), nonce reuse.
- **Mitigations:** Prefer AEAD (AES-GCM, ChaCha20-Poly1305); generate IVs/nonces with a CSPRNG; **never reuse a nonce** for AEAD.
- **Validation Checklist:** Is ECB avoided? Is an AEAD mode used? Are IVs/nonces unique and CSPRNG-generated?
- **Evidence Required:** Cipher/mode configuration; IV/nonce generation code.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF

---

## C-6. Randomness (CSPRNG)

- **Principle:** Security tokens, keys, IVs, and session IDs require cryptographically secure randomness.
- **Requirement:** Use a **CSPRNG** — e.g., Java `SecureRandom`, `random_bytes()`/`bin2hex(random_bytes())`.
  **Do NOT** use `Random` (deterministic — knowing the seed predicts all future values) or time-of-day (guessable).
- **Risk:** Predictable session IDs/tokens/keys → prediction attacks.
- **Common Vulnerabilities:** Use of insufficiently random values (CWE-330), predictable seed (CWE-337).
- **Mitigations:** CSPRNG everywhere randomness is security-relevant; proper IV/nonce sizes and uniqueness.
- **Validation Checklist:** Are all security-relevant random values from a CSPRNG (never `Random`/time)?
- **Evidence Required:** RNG call sites for tokens/keys/IVs/session IDs.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, REF-IMPL (`random_bytes` for CSRF token & filenames)

---

## C-7. Password Hashing vs General Hashing

- **Principle:** Password storage needs *slow*, memory-hard hashing — the opposite of fast integrity hashing.
- **Requirement:** Use **bcrypt**, **scrypt**, **Argon2 (Argon2id)**, or **PBKDF2** with a tuned work
  factor/iteration count for modern hardware.
- **> CONFLICT / NUANCE:** **SHA-256 is not broken**, but it is **too fast** for passwords — attackers
  compute billions/sec. SHA-256 is correct for *file integrity*, wrong for *passwords*. (MD5/SHA-1 are
  obsolete for any sensitive use.)
- **Risk:** Fast-hashed passwords are cracked en masse after a breach.
- **Mitigations:** Argon2id/bcrypt with tuned cost; per-user salt (automatic); re-hash on parameter upgrade.
- **Validation Checklist:** Is a slow, memory-hard KDF used for passwords (not SHA-256/MD5/SHA-1)? Is the work factor tuned?
- **Evidence Required:** Password-hash call site + parameters.
- **Severity:** Critical
- **References:** LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, REF-IMPL (`PASSWORD_ARGON2ID`)

---

## C-8. The Eight Recommended Cryptography Practices

1. **Don't implement your own algorithms** — use established, well-maintained libraries (OpenSSL, libsodium, BoringSSL, NaCl, platform crypto APIs).
2. **Avoid obsolete algorithms** — **AVOID: DES, 3DES, MD5, SHA-1.**
3. **Use reasonable key lengths** — check current guidance (e.g., keylength.com).
4. **Use a good source of random numbers** — `SecureRandom`/CSPRNG ✅; `Random` ❌; time ❌.
5. **Key rotation and storage** — rotate periodically and on incident; **never store keys in source code
   or in the database**; use a Key Management System / HSM (AWS KMS, HashiCorp Vault), OS keyrings.
   *(Reasoning: compute roughly doubles every ~18 months; without rotation, one cracked key exposes
   years of data; with rotation each key protects only its window. Keys in code = anyone with repo
   access has them; keys in the DB = a breach yields data + key together.)*
6. **Use the right cipher mode** — ECB ❌ (patterns visible), CBC ✅, GCM ✅ (AEAD, encryption + integrity).
7. **Separate signing and encryption keys** — if one is compromised, the other still functions (separation of duties).
8. **Don't believe the hype** — ask: who made it? has it been tested? is it standards-compliant?
- **Additional library-level details (low-level):** prefer AEAD; correct IV/nonce sizes & uniqueness via
  CSPRNG; check return codes from crypto APIs and **fail closed** on any error; protect keys at rest
  (file perms, keyrings, HSMs); use constant-time comparison (e.g., `hash_equals`) for secrets to avoid
  timing side-channels.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, REF-IMPL (`hash_equals` for CSRF)

---

## C-9. Key & Secret Management

- **Principle:** Reduce blast radius — secrets must be stored, accessed, rotated, and audited carefully.
- **Requirement:** Store secrets in dedicated secret managers/HSMs (not code/configs/env where avoidable);
  rotate regularly and on incident; strong access control + auditing around key usage; separate signing
  vs encryption keys; use HMAC/signatures for critical data and tokens.
- **Risk:** Hard-coded credentials (CWE-798), key leakage, unlimited compromise window.
- **Detection Methods:** Secret scanning of repos/images/history; review of config and env handling.
- **Mitigations:** KMS/Vault/HSM; rotation policy; least-privilege key access; secret scanning in CI; never log secrets.
- **Validation Checklist:**
  - Are secrets stored in a manager/HSM rather than code/DB?
  - Are keys rotated on a schedule and on incident?
  - Are signing and encryption keys separated?
  - Is key access least-privileged and audited?
- **Evidence Required:** Secret-manager config; rotation policy; key-access audit; secret-scan results.
- **Severity:** Critical
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW (KMS), SEC-POLICY (AES at rest)


---

# 02.05 — Data Validation & Web Application Security

**The single most common web application weakness is failure to validate input.** It is the root of
SQL injection, XSS, command injection, and most major vulnerabilities.

> **REMEMBER:** Data from the client should **NEVER** be trusted — including dropdowns, hidden fields,
> headers, and cookies. Anything from the client can be tampered with (proxies like Burp Suite edit
> requests after they leave the browser). The server must independently verify everything.

---

## V-1. The Three Components of Validation

- **Validation** — correct **syntax/type/length/character set/range** (e.g., US zip matches `^\d{5}(-\d{4})?$`).
- **Integrity Checks** — data not tampered while crossing trust boundaries (e.g., hidden field or payment-gateway response unchanged).
- **Business Rules** — data correct per business logic (e.g., interest rate within 0–30%; the account belongs to the user).
- **Principle:** All three layers are needed; syntactic validity alone is insufficient.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2

---

## V-2. Validation Strategies — Ranked

| # | Strategy | How it works | Verdict |
|---|---|---|---|
| 1 | **Whitelist (Accept Known Good)** | Allow only explicitly permitted values (often via regex) | ✅ **BEST** |
| 2 | **Blacklist (Reject Known Bad)** | Block known-dangerous patterns | ⚠ Bypassable |
| 3 | **Sanitize** | Transform input into a "safe" form | ⚠ Risky |
| 4 | **No Validation** | — | ❌ NEVER |

- **Principle:** Prefer allow-listing; deny by default.
- **Requirement:** Validate at the **boundary of each service**, server-side; **normalize before
  validating** (decode percent-encoding, Unicode-normalize, case-fold) to defeat encoding-trick bypasses.
- **Risk:** Blacklists miss novel payloads/encodings; sanitization can be incomplete.
- **Regex note:** Whitelist validation commonly uses regex. Key symbols: `^`=start, `$`=end, `\d`=digit,
  `{5}`=exactly five, `[a-z]`=range, `?`=optional. Example zip: `^\d{5}(-\d{4})?$`.
- **Validation Checklist:** Is input allow-listed server-side? Normalized before validation? Length/type/range bounded?
- **Evidence Required:** Validation functions with allow-list rules / regex; normalization step.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF

---

## V-3. Client-Side vs Server-Side Validation

- **Principle:** Client-side validation is **UX only**; server-side validation is the real security gate.
- **Requirement:** Re-validate everything on the server regardless of client checks.
- **Risk:** Client checks (e.g., HTML `type="email"`/`required`) are trivially removed via DevTools or
  bypassed via a proxy that edits the request after it leaves the browser.
- **Analogy:** Client-side = a rope barrier that politely guides normal people (anyone can step over).
  Server-side = the actual bouncer.
- **Validation Checklist:** Is every client-side check duplicated server-side? Does the server reject tampered input even when the UI "passed"?
- **Evidence Required:** Server-side validation for each input that has client-side validation.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, JUICE-SHOP (Forged Feedback/Review, Deluxe Fraud, Payback Time)

---

## V-4. SQL Injection (SQLi)

- **Principle:** User input must be treated as **data, not code**.
- **Requirement:** Use **parameterized queries / prepared statements** (or a well-used ORM) for all DB
  access; restrict DB account permissions to the minimum.
- **> CRITICAL CLARIFICATION:** **Input validation is NOT the primary defense against SQLi** — it is
  defense-in-depth. **Parameterized queries are the real fix.** "Just sanitize the input" is not a real defense.
- **Risk:** Authentication bypass, data theft/modification, full DB compromise.
- **Worked exploits (Juice Shop):** Logging in as Jim with `jim@juice-sh.op'--` and any password bypassed
  auth because input was concatenated into the SQL query; `' OR deletedAt IS NOT NULL--` logged into a
  *deleted* account (an unanticipated injection path).
- **Common Vulnerabilities:** SQL injection (CWE-89), improper neutralization of special elements.
- **Detection Methods:** Inject `'`, `--`, `OR 1=1`, UNION payloads; SAST for string-concatenated queries; DAST.
- **Mitigations:** Parameterized statements with bound parameters; least-privilege DB user; allow-list validation as defense-in-depth; ORM with safe query building.
- **Validation Checklist:**
  - Are **all** queries parameterized (no string concatenation of user input)?
  - Does the DB account have least privilege?
  - Is validation present as a secondary layer (not the sole defense)?
- **Evidence Required:** Prepared-statement call sites; absence of concatenated SQL; DB grant config.
- **Severity:** Critical
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, JUICE-SHOP (Login Jim/Bender, GDPR Data Erasure), THREAT-DRAGON-ACT2/3 (SQL injection), THREAT-MODEL-COFFEE (CWE-89), REF-IMPL (`db()->prepare(...)` everywhere)

---

## V-5. Cross-Site Scripting (XSS)

- **Principle:** Untrusted data rendered into a page must be encoded for its output context.
- **Requirement:** **Output-encode** per context (HTML, attribute, JS, URL); add **Content Security
  Policy (CSP)**; sanitize stored/user-generated content server-side (and for rich editors, client-side too).
- **> CRITICAL CLARIFICATION:** Input validation is **not** the primary defense against XSS —
  **output encoding** is. Validation is defense-in-depth.
- **The three XSS types:**
  | | **DOM** | **Reflected** | **Persistent (Stored)** |
  |---|---|---|---|
  | Payload path | Stays in the browser | Client → Server → Client (not stored) | Client → Server → **DB** → all visitors |
  | Server involved? | No | Yes, but doesn't store | Yes, stores permanently |
  | Who's affected? | Only the triggering user | Only who clicks the malicious link | **EVERYONE** who views the page |
  | Danger | Low–medium | Medium | **HIGH** |
  | Juice Shop example | Search-bar iframe | Order-tracking ID reflected | `True-Client-IP` header stored → Last-Login page |
- **Risk:** Session theft (if cookie lacks `HttpOnly`), defacement, worm-like spread (stored), credential phishing.
- **Common Vulnerabilities:** XSS (CWE-79).
- **Detection Methods:** Inject `<script>`/`"><img onerror>`/iframe payloads in inputs, headers, and reflected params; check rendered output; SAST/DAST.
- **Mitigations:** Context-aware output encoding (e.g., `htmlspecialchars`), CSP, `HttpOnly` cookies, sanitize all stored data including headers.
- **Validation Checklist:**
  - Is all untrusted output encoded for its exact context?
  - Is a CSP deployed?
  - Are stored values (including headers like client IP) sanitized before storage/display?
  - Do session cookies have `HttpOnly`?
- **Evidence Required:** Output-encoding call sites; CSP header; sanitization of stored inputs.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, THREAT-MODEL-COFFEE (CWE-79), REF-IMPL (`htmlspecialchars` across views)

---

## V-6. Cross-Site Request Forgery (CSRF)

- **Principle:** State-changing requests must prove they originated from the legitimate UI.
- **Requirement:** Anti-CSRF tokens (per-session/per-request), validated server-side on every POST/state
  change; `SameSite` cookies; re-auth for sensitive actions.
- **Risk:** An attacker page triggers authenticated state-changing requests in the victim's browser.
- **Common Vulnerabilities:** CSRF (CWE-352).
- **Detection Methods:** Replay a state-changing request without a valid token / from another origin.
- **Mitigations:** CSRF token with **constant-time comparison** (e.g., `hash_equals`); `SameSite=Lax/Strict`; verify Origin/Referer; re-auth on sensitive flows.
- **Validation Checklist:** Is a CSRF token required and validated on all state-changing POSTs? Is `SameSite` set? Are tokens compared in constant time?
- **Evidence Required:** Token generation/validation code; hidden token field in forms; `SameSite` config.
- **Severity:** High
- **References:** PRINCIPLES-REF, THREAT-MODEL-COFFEE (CWE-352), REF-IMPL (`generate_csrf_token`, `validate_csrf_token` with `hash_equals`, `csrf_field`)

---

## V-7. File Upload Security

- **Principle:** Uploads are untrusted executables until proven otherwise.
- **Requirement:** Validate **extension**, enforce **max size**, verify the **actual content type**
  (magic-number / server-side MIME detection — never trust the client-supplied MIME or extension), assign
  a **new server-generated filename** (never user-controlled), store **outside the web root**, serve via
  a controlled handler, and **scan for malware**.
- **Risk:** Webshell/RCE, disk-fill DoS, stored XSS, path traversal via filename.
- **> Bypass to defend against (Poison Null Byte):** Extension-only checks were bypassed in Juice Shop by
  appending `%00.md` (null byte) — the filter saw an allowed extension while the real file was something
  else. Reject null bytes and validate real content type.
- **Common Vulnerabilities:** Unrestricted upload of dangerous file type (CWE-434), path traversal (CWE-22), null-byte injection.
- **Detection Methods:** Upload a script renamed to an allowed extension; try null-byte/double-extension tricks; check storage location.
- **Mitigations:** Server-side MIME/magic-number allow-list; size cap; random filename; store outside web root; reject null bytes; AV scan.
- **Validation Checklist:**
  - Is the **real** content type verified server-side (not the client header)?
  - Is the filename server-generated and random?
  - Are size and total-quota limits enforced?
  - Are uploads stored outside the web root and served via a handler?
  - Are null bytes / double extensions rejected?
- **Evidence Required:** Upload handler showing MIME detection, size check, random naming, storage path.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, JUICE-SHOP (Poison Null Byte), REF-IMPL (`handle_profile_upload`: `finfo` MIME check, `MAX_UPLOAD_BYTES`, `random_bytes` filename, MIME allow-list)

---

## V-8. Email Validation

- **Principle:** Identifiers and contact fields are inputs and attack surfaces.
- **Requirement:** At minimum check for `@`, **local part ≤ 64 chars**, **domain ≤ 255 chars**, and verify deliverability.
- **Risk:** Malformed/oversized values; XSS payloads delivered via the email field if later displayed unencoded.
- **Mitigations:** Format validation (`FILTER_VALIDATE_EMAIL` or robust regex), length bounds, output encoding on display.
- **Validation Checklist:** Are format and length limits enforced server-side? Is the value encoded wherever displayed?
- **Evidence Required:** Email-validation function; encoded display.
- **Severity:** Medium
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, REF-IMPL (`is_valid_email`)

---

## V-9. Command / OS / Code / LDAP Injection & SSRF

- **Principle:** Never build interpreter inputs by concatenating untrusted data; never let untrusted data
  drive outbound requests unchecked.
- **Requirement:**
  - **OS/command:** Prefer library/syscall APIs over `system()`/shelling out; if unavoidable, use exec
    APIs that **bypass the shell** and pass arguments as **arrays**, not concatenated strings.
  - **Code injection / deserialization:** Avoid `eval`/dynamic code on untrusted input; do not deserialize untrusted data.
  - **LDAP:** Sanitize/validate all LDAP input; use parameterized LDAP APIs; enforce strict access control on directory queries.
  - **SSRF:** Validate and allow-list outbound request targets; block internal metadata/loopback ranges.
- **Risk:** Remote code execution, data exfiltration, internal-network pivoting.
- **Common Vulnerabilities:** Command injection (CWE-77), OS command injection (CWE-78), code injection
  (CWE-94), deserialization of untrusted data (CWE-502), LDAP injection, SSRF (CWE-918).
- **Detection Methods:** SAST for `system/exec/eval/unserialize`; inject metacharacters; test SSRF with internal URLs.
- **Mitigations:** Parameterized/array-arg execution; no dynamic eval on user input; safe deserialization; outbound allow-list; centralize dangerous operations behind small audited modules with narrow interfaces.
- **Validation Checklist:**
  - Are external commands invoked without a shell, with array args?
  - Is `eval`/dynamic-code/untrusted-deserialization avoided?
  - Are LDAP queries parameterized and access-controlled?
  - Are outbound request targets allow-listed (anti-SSRF)?
- **Evidence Required:** Safe-exec call sites; deserialization policy; LDAP query handling; SSRF allow-list.
- **Severity:** Critical
- **References:** PRINCIPLES-REF, THREAT-MODEL-COFFEE (CWE-77/78/94/502/918), THREAT-DRAGON-ACT2/3 (LDAP injection)

---

## V-10. Path Traversal & Filesystem-Level Input

- **Principle:** User input must never directly form a filesystem path.
- **Requirement:** Join user input against a known base directory, then **canonicalize and verify** the
  resolved path stays within that base; reject relative segments (`..`) unless a controlled
  canonicalization check is in place; treat env vars and config values as untrusted.
- **Risk:** Reading/writing files outside the intended directory (e.g., access logs, backups).
- **> Worked exploits (Juice Shop):** Browsing exposed `/ftp` and `/support/logs` directories to grab
  `access.log`, `package.json.bak`, `coupons_2013.md.bak`, and a hidden easter-egg file — all enabled by
  exposed directories + weak path/extension checks (combined with the null-byte bypass in V-7).
- **Common Vulnerabilities:** Path traversal (CWE-22), sensitive file exposure (CWE-200).
- **Detection Methods:** Request `../` sequences and encoded variants; browse for exposed directories/backups.
- **Mitigations:** Canonicalize + base-directory containment check; deny directory listing; remove backups/`.bak` from web-served paths; restrict directory access.
- **Validation Checklist:** Is user input ever concatenated into a path? Is the resolved path confined to a base dir? Are listings/backups exposed?
- **Evidence Required:** Path-handling code with containment check; web-server directory-listing config.
- **Severity:** High
- **References:** PRINCIPLES-REF, JUICE-SHOP (Access Log, Forgotten Developer/Sales Backup), THREAT-MODEL-COFFEE (CWE-22)

---

## V-11. Web Application Spoofing / Phishing Resistance

- **Principle:** Users must be able to trust they're interacting with the real application.
- **Requirement:** Enforce HTTPS with valid certificates and **HSTS**; implement strong origin checks; educate users to verify URLs.
- **Risk:** An attacker hosts a fake clone to harvest credentials/data (covered also under A-4 login-page-HTTPS).
- **Common Vulnerabilities:** Spoofing (STRIDE-S), phishing, missing HSTS.
- **Mitigations:** HTTPS everywhere + HSTS; valid certs; origin/Referer checks; clear domain.
- **Validation Checklist:** Is HSTS set? Are certificates valid? Are origin checks present on sensitive flows?
- **Evidence Required:** HSTS header; cert config; origin-check code.
- **Severity:** Medium
- **References:** THREAT-DRAGON-ACT2/3 (Web Application Spoofing), LEC-FINAL-REVIEW


---

# 02.06 — Data Protection & Privacy

Goal: **reduce blast radius** if data is stolen or systems are compromised. Protect data through its
whole lifecycle (collect → store → transmit → use → delete).

---

## D-1. Data Classification

- **Principle:** Controls should be proportional to data sensitivity.
- **Requirement:** Classify data into tiers (e.g., **public / internal / confidential / highly sensitive**)
  and apply controls accordingly. Identify and label sensitive information (PII, payment data, credentials).
- **Risk:** Without classification, sensitive data gets the same weak handling as public data.
- **Mitigations:** Classification scheme + labels; map controls (encryption, access, retention) to each tier.
- **Validation Checklist:** Is data classified and labeled? Are controls mapped to each tier? Is the most sensitive data identified?
- **Evidence Required:** Classification policy + data inventory with tiers.
- **Severity:** Medium
- **References:** PRINCIPLES-REF, SEC-POLICY (data classification + encryption)

---

## D-2. Data Minimization & Retention

- **Principle:** The safest data is the data you never store.
- **Requirement:** Collect only what is needed; delete or anonymize data when no longer necessary; define retention periods.
- **Risk:** Excess data and indefinite retention enlarge breach impact and compliance exposure.
- **Mitigations:** Minimization at collection; anonymization/pseudonymization; scheduled deletion; documented retention.
- **Validation Checklist:** Is only necessary data collected? Are deletion/anonymization and retention enforced?
- **Evidence Required:** Retention schedule; deletion jobs; minimization rationale.
- **Severity:** Medium
- **References:** PRINCIPLES-REF

---

## D-3. Encryption in Transit

- **Principle:** Data on the wire must be unreadable to eavesdroppers.
- **Requirement:** **TLS 1.2+** with strong ciphers **everywhere** — including internal/service-to-service
  traffic (avoid passive snooping). Disable legacy protocols/ciphers.
- **Risk:** Sniffing of credentials, session material, and sensitive data; MitM.
- **Common Vulnerabilities:** Cleartext transmission (CWE-319), weak/downgraded TLS.
- **Mitigations:** TLS everywhere + HSTS; modern cipher suites; mTLS for service-to-service where appropriate.
- **Validation Checklist:** Is TLS 1.2+ enforced on all links (including internal)? Are legacy protocols disabled?
- **Evidence Required:** TLS configuration for external and internal endpoints.
- **Severity:** High
- **References:** PRINCIPLES-REF, SEC-POLICY (TLS in transit), LEC-FINAL-REVIEW (HTTPS)

---

## D-4. Encryption at Rest

- **Principle:** Stolen storage/backups must not yield plaintext.
- **Requirement:** Encrypt databases, object storage, and **backups** at rest using vetted algorithms
  (**AES-GCM**, ChaCha20-Poly1305; AES is the standard symmetric choice). Avoid home-grown crypto.
- **Risk:** Theft of disks/backups/storage exposes all data.
- **Common Vulnerabilities:** Missing encryption of sensitive data (CWE-311), broken algorithm (CWE-327).
- **Mitigations:** Transparent/field-level encryption with AEAD; encrypted backups; managed keys (KMS/HSM).
- **Validation Checklist:** Are databases, object storage, and backups encrypted at rest with vetted algorithms? Are keys managed externally?
- **Evidence Required:** At-rest encryption config; backup encryption; key-management reference.
- **Severity:** High
- **References:** PRINCIPLES-REF, SEC-POLICY (AES at rest), LEC-FINAL-REVIEW (cryptography)

---

## D-5. Secrets & Key Management

- **Principle:** Secrets are the keys to everything else — protect them most.
- **Requirement:** Store secrets in dedicated secret managers/HSMs, **not in code or configs**; rotate
  keys/credentials regularly and on incident; strong access control + auditing around key usage.
  *(Full detail in `#0204-cryptography` C-9.)*
- **Risk:** Hard-coded credentials (CWE-798); a breach that yields both data and keys.
- **Mitigations:** KMS/Vault/HSM; rotation; least-privilege key access; secret scanning in CI; never log secrets.
- **Validation Checklist:** Are secrets out of code/DB? Rotated? Access-controlled and audited?
- **Evidence Required:** Secret-manager usage; rotation policy; secret-scan results.
- **Severity:** Critical
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW (KMS), REF-IMPL (note: demo config has empty DB password — flag as not-for-production)

---

## D-6. Integrity Protection

- **Principle:** Critical data and high-value events must be tamper-evident.
- **Requirement:** Use **HMACs or signatures** for critical data and tokens; consider **immutable /
  append-only logs** (WORM storage, append-only/blockchain-like logs) for high-value events.
- **Risk:** Silent tampering of records, reports, or tokens; repudiation.
- **Common Vulnerabilities:** Missing integrity check (CWE-353), insufficient verification of data authenticity.
- **Mitigations:** Sign/HMAC critical payloads; verify on read; append-only audit storage; checksums.
- **Validation Checklist:** Are critical data/tokens integrity-protected (HMAC/signature)? Are high-value events stored append-only?
- **Evidence Required:** Signing/verification code; WORM/append-only log config.
- **Severity:** High
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW (integrity), THREAT-MODEL-COFFEE (tampering threats)

---

## D-7. PII & Privacy / Regulatory

- **Principle:** Personal data carries legal and ethical obligations.
- **Requirement:** Protect PII (names, contact details, addresses, order history) and payment data from
  unauthorized access/disclosure; support data-subject rights (e.g., **GDPR** erasure); meet applicable
  regimes (GDPR, HIPAA, PCI DSS, OWASP ASVS).
- **Risk:** Privacy violations, regulatory penalties, breach-notification obligations.
- **> Worked caution (Juice Shop GDPR Data Erasure):** A "deleted" account was still loginable via SQLi
  (`' OR deletedAt IS NOT NULL--`). Erasure/soft-delete must be enforced in queries and access checks,
  not assumed.
- **Common Vulnerabilities:** PII disclosure (CWE-200), improper erasure, insecure transmission of credentials.
- **Mitigations:** Encrypt PII in transit/at rest; least-privilege access; tokenize payment data; enforce
  deletion in all access paths; data-subject request handling.
- **Validation Checklist:**
  - Is PII encrypted in transit and at rest, with least-privilege access?
  - Is payment data tokenized (not stored raw)?
  - Are deletion/erasure requests enforced across all queries and access paths?
  - Are applicable regulations identified and addressed?
- **Evidence Required:** PII handling map; tokenization; erasure enforcement; compliance mapping.
- **Severity:** High
- **References:** PRINCIPLES-REF, THREAT-MODEL-COFFEE (PII, tokenized payment data), JUICE-SHOP (GDPR Data Erasure), SEC-POLICY, LEC-SECURE-CODING (GDPR/HIPAA/PCI DSS)


---

# 02.07 — API Security

APIs are the most directly exposed control surface. Stop attackers at the boundary of the app, and
never trust the client for price, identity, quantity, or permissions.

---

## P-1. Authenticate & Authorize Every Endpoint

- **Principle:** No endpoint is implicitly safe; "internal-only" is not a control.
- **Requirement:** **Authn + Authz on every API**; there are no "internal-only" endpoints without
  network or identity controls. Enforce object-level authorization (see Authorization Z-3 / BOLA).
- **Risk:** Unauthenticated/unauthorized endpoints expose data and actions; BOLA/IDOR via predictable IDs.
- **Common Vulnerabilities:** Missing authentication for critical function (CWE-306), missing/incorrect
  authorization (CWE-862/863), BOLA (CWE-639).
- **Detection Methods:** Hit each endpoint unauthenticated and as a low-priv user; enumerate object IDs.
- **Mitigations:** Centralized auth middleware on all routes; per-object ownership checks; deny by default.
- **Validation Checklist:**
  - Does every endpoint enforce authentication and authorization?
  - Are object-level ownership checks applied (no BOLA)?
  - Are there any endpoints relying solely on being "hidden"/internal?
- **Evidence Required:** Route→auth map; ownership-check code; tests for unauth/low-priv access.
- **Severity:** Critical
- **References:** PRINCIPLES-REF, THREAT-MODEL-COFFEE, JUICE-SHOP (BOLA, Admin Registration), THREAT-DRAGON-ACT2/3

---

## P-2. TLS Everywhere (including internal)

- **Principle:** Internal traffic is not trusted traffic.
- **Requirement:** Use TLS for all API traffic, even internal service-to-service, to prevent passive snooping.
- **Risk:** Eavesdropping on internal calls; lateral data capture after a foothold.
- **Mitigations:** TLS 1.2+; mTLS for service-to-service; no plaintext internal hops.
- **Validation Checklist:** Is TLS enforced on internal as well as external API calls?
- **Evidence Required:** Service mesh / endpoint TLS config.
- **Severity:** High
- **References:** PRINCIPLES-REF

---

## P-3. API Versioning & Deprecation

- **Principle:** Old, insecure API versions are a standing liability.
- **Requirement:** Version APIs and **deprecate insecure versions on a schedule**.
- **Risk:** Attackers target unmaintained legacy versions.
- **Mitigations:** Explicit versioning; deprecation timeline; sunset insecure versions.
- **Validation Checklist:** Are APIs versioned? Is there a deprecation/sunset schedule for old versions?
- **Evidence Required:** Versioning scheme; deprecation policy.
- **Severity:** Medium
- **References:** PRINCIPLES-REF

---

## P-4. Business-Logic Protection (server-side invariants)

- **Principle:** The backend must enforce all invariants; the client is never authoritative.
- **Requirement:** Enforce invariants server-side — **never trust the client for price, identity,
  quantity, or permissions.** Protect abuse flows (coupon reuse, replay of signed requests, onboarding
  bypass) with **idempotency** and server-side checks.
- **Risk:** Tampered requests yield fraud and integrity loss.
- **> Worked exploits (Juice Shop):**
  - **Deluxe Fraud** — changed `paymentMode` to `wallet` in the request → purchase without real payment.
  - **Payback Time** — set order quantity to a **negative** value (e.g., -5000) → negative total. (Missing range/business-rule validation.)
  - **Forged Feedback / Forged Review** — changed `UserId`/author in the JSON payload → posted as another user (server trusted client-supplied identity).
- **Common Vulnerabilities:** Business-logic flaws, improper input validation (CWE-20), insufficient
  server-side enforcement, mass assignment.
- **Detection Methods:** Intercept and tamper with payloads (IDs, price, quantity, role, payment mode); replay signed requests; reuse coupons.
- **Mitigations:** Recompute price/totals server-side; range/business-rule checks (e.g., quantity > 0);
  bind identity from the session, not the payload; idempotency keys; allow-list bindable fields.
- **Validation Checklist:**
  - Are price, totals, identity, and permissions derived server-side (never from the client)?
  - Are quantities/amounts range-validated (no negatives)?
  - Are replay and coupon/onboarding abuse handled (idempotency, server checks)?
  - Are privileged/identity fields excluded from client-bindable input?
- **Evidence Required:** Server-side computation of sensitive values; range checks; identity-from-session code.
- **Severity:** Critical
- **References:** PRINCIPLES-REF, JUICE-SHOP (Deluxe Fraud, Payback Time, Forged Feedback/Review, CAPTCHA Bypass), LEC-FINAL-REVIEW (integrity checks/business rules)

---

## P-5. Rate Limiting & Abuse Prevention

- **Principle:** Cap request volume per client/time window to blunt brute force, credential stuffing,
  scraping, and many DoS variants.
- **Requirement:**
  - **Dimensions to limit:** per IP/subnet; per user ID / API key / device fingerprint; per endpoint or
    endpoint category (login vs search vs file upload).
  - **Algorithms:** fixed window, sliding window, token bucket, or leaky bucket (choose per burstiness vs strictness).
  - **Stricter limits on sensitive endpoints** (login, password reset, payment) than on read-only public ones.
  - Combine server-side limits with **client backoff/retry**.
  - Implement as **close to the entry point as possible** (API gateway/reverse proxy) to avoid work on excess requests; use fast stores (e.g., Redis) to avoid lock contention.
- **Integration:** tie limits to identity (per user/API key) for granularity; feed metrics into anomaly
  detection (spikes in 429s by region may signal an attack); apply CAPTCHA or **step-up auth** after
  thresholds; allow-list trusted infrastructure.
- **Resource protection:** reject overly large payloads early (Content-Length/streaming parsers); limit
  concurrency per client (max connections, HTTP/2 streams, WebSocket sessions); exponential backoff /
  temporary lockouts after failed logins.
- **Risk:** Unthrottled endpoints enable brute force, scraping, and resource-exhaustion DoS.
- **Common Vulnerabilities:** Uncontrolled resource consumption (CWE-400), improper restriction of excessive auth attempts (CWE-307).
- **Detection Methods:** Flood endpoints; observe throttling/429s and lockouts; test payload-size limits.
- **Mitigations:** Multi-dimensional rate limits; bucket algorithms; sensitive-endpoint hardening; payload/concurrency caps; anomaly feeds.
- **Validation Checklist:**
  - Are sensitive endpoints (login, reset, payment) rate-limited more strictly?
  - Are limits tied to identity, not just IP?
  - Are large payloads and excessive concurrency rejected early?
  - Do thresholds trigger CAPTCHA/step-up and feed monitoring?
- **Evidence Required:** Rate-limit config per endpoint/identity; payload/concurrency caps; gateway placement.
- **Severity:** High
- **References:** PRINCIPLES-REF, JUICE-SHOP (CAPTCHA Bypass), LEC-FINAL-REVIEW (brute-force)

---

## P-6. Input Validation & Output Encoding at the API Boundary

- **Principle:** Validate inbound and encode/shape outbound at every service boundary.
- **Requirement:** Allow-list validation (types/ranges/formats) at each service boundary; normalize
  before validating; parameterized DB access; context-appropriate output encoding/serialization.
  *(Full detail in `#0205-data-validation-web-security`.)*
- **Risk:** Injection, XSS in API-rendered content, mass assignment.
- **Mitigations:** Schema validation; parameterized queries; safe serialization; explicit field allow-lists.
- **Validation Checklist:** Is every API input schema-validated and normalized? Are DB calls parameterized? Are outputs safely serialized?
- **Evidence Required:** Request schema/validation; parameterized queries; serialization config.
- **Severity:** High
- **References:** PRINCIPLES-REF

---

## P-7. CSRF & Cross-Origin Controls for Browser-Facing APIs

- **Principle:** Browser-invoked state-changing APIs need request-origin assurance.
- **Requirement:** CSRF tokens and/or `SameSite` cookies for cookie-authenticated APIs; strict CORS
  (no wildcard with credentials); validate Origin/Referer on sensitive operations.
- **Risk:** CSRF (CWE-352); overly permissive CORS leaking data.
- **Mitigations:** CSRF tokens (constant-time compare); `SameSite`; least-privilege CORS allow-list.
- **Validation Checklist:** Are cookie-auth state-changing endpoints CSRF-protected? Is CORS restrictive (no `*` with credentials)?
- **Evidence Required:** CSRF and CORS configuration.
- **Severity:** High
- **References:** PRINCIPLES-REF, THREAT-MODEL-COFFEE (CWE-352), REF-IMPL (CSRF token functions)

---

## P-8. API Logging & Non-Repudiation

- **Principle:** API actions must be attributable and traceable.
- **Requirement:** Log request source/client ID, timestamp, request type, and outcome for security-relevant
  API calls; protect logs from tampering. *(Full detail in Logging domain.)*
- **Risk:** Repudiation; undetected abuse.
- **Mitigations:** Structured request logging; tamper-resistant storage; correlation IDs.
- **Validation Checklist:** Are security-relevant API calls logged with source/timestamp/outcome? Are logs tamper-protected?
- **Evidence Required:** API log samples; log-protection config.
- **Severity:** Medium
- **References:** THREAT-DRAGON-ACT2/3 (missing web-app/SQL/LDAP logging), PRINCIPLES-REF


---

# 02.08 — Network, Infrastructure & Cloud Security

Secure the platform the application runs on. Many app-layer controls are undone by a weak host,
network, or cloud configuration.

---

## N-1. Network Security & Segmentation

- **Principle:** Limit reachability so a foothold can't reach everything.
- **Requirement:**
  - Firewalls / security groups with **default-deny ingress** and **strict egress** rules.
  - **Network segmentation:** separate public, app, and data tiers; isolate admin interfaces in management
    networks or behind **VPN**. Use **VLANs** to route traffic through specific zones only.
  - Deploy a **WAF** for HTTP apps to filter common attack patterns (SQLi, XSS, RCE signatures).
- **Risk:** Flat networks allow lateral movement; exposed admin interfaces; broad egress enables C2/beaconing.
- **Common Vulnerabilities:** Over-broad network exposure, unsegmented admin access, missing egress controls.
- **Detection Methods:** Port/exposure scan; review firewall/security-group rules and segmentation map.
- **Mitigations:** Default-deny in/out; tiered segmentation (VLAN/subnet); VPN-gated admin; WAF in front of web apps.
- **Validation Checklist:**
  - Is ingress default-deny and egress restricted to required destinations?
  - Are public/app/data tiers segmented and admin interfaces isolated (VPN/management net)?
  - Is a WAF deployed for web traffic?
- **Evidence Required:** Firewall/security-group rules; segmentation/VLAN diagram; WAF config.
- **Severity:** High
- **References:** PRINCIPLES-REF, SEC-POLICY (segmentation via VLAN), LEC-FINAL-REVIEW-V2 (VPN as access control)

---

## N-2. OS & Host Hardening

- **Principle:** Minimize the host's attack surface and keep it patched.
- **Requirement:**
  - Remove unnecessary services/packages; disable unused daemons (printing, legacy remote shells, SMB if unneeded).
  - **Regular patching** with automated patch management; enable automatic security updates; apply kernel/OS patches.
  - Enforce **least privilege on OS accounts**; separate service accounts per app; run services as
    dedicated **unprivileged** users (avoid root unless strictly required, then isolate).
  - Baseline and audit configuration against benchmarks (**CIS benchmarks**).
  - Enforce secure boot, BIOS/firmware passwords, and disable unused physical ports where the risk profile requires.
- **Risk:** Unpatched/over-exposed hosts are easy targets; over-privileged processes widen blast radius.
- **Common Vulnerabilities:** Missing patches, unnecessary services, excessive process privileges, weak config.
- **Detection Methods:** CIS-benchmark scan; package/service inventory; patch-level audit; account-privilege review.
- **Mitigations:** Service minimization; automated patching; per-app unprivileged service accounts; benchmark baselines.
- **Validation Checklist:**
  - Are unnecessary services/packages removed?
  - Is automated patching in place and current?
  - Do services run as dedicated unprivileged accounts (not root)?
  - Is config baselined against CIS or equivalent?
- **Evidence Required:** Hardening baseline; patch reports; service-account config; benchmark results.
- **Severity:** High
- **References:** PRINCIPLES-REF

---

## N-3. Endpoint Security

- **Principle:** Servers and high-value endpoints need behavioral detection.
- **Requirement:** Maintain anti-virus/anti-malware on supported platforms; use **EDR** for servers and high-value endpoints to detect suspicious behavior.
- **Risk:** Undetected malware/intrusion on hosts.
- **Mitigations:** AV/anti-malware; EDR with alerting; baseline of normal behavior.
- **Validation Checklist:** Is AV/EDR deployed on servers and high-value endpoints with alerting?
- **Evidence Required:** EDR/AV deployment + alert configuration.
- **Severity:** Medium
- **References:** PRINCIPLES-REF

---

## N-4. Cloud Security

- **Principle:** Cloud control planes and IAM are prime targets; misconfiguration is the top cloud risk.
- **Requirement:**
  - Harden **IAM**: no root for daily ops, scoped roles, **no long-lived plaintext keys**.
  - Use **security groups, NACLs**, and **managed secrets stores** (KMS / Secrets Manager) for secrets.
  - Evaluate third-party/cloud providers with security assessments and contractual requirements.
- **Risk:** Over-privileged IAM, leaked static keys, public storage buckets, weak provider posture.
- **Common Vulnerabilities:** Hard-coded/long-lived credentials (CWE-798), public exposure, excessive IAM scope.
- **Detection Methods:** IAM policy review; key-age audit; storage-exposure scan; provider assessment.
- **Mitigations:** Least-privilege scoped roles; short-lived/rotated credentials; managed secrets; CSPM scanning; vendor due diligence.
- **Validation Checklist:**
  - Is IAM least-privilege with no root for daily ops and no long-lived plaintext keys?
  - Are secrets in a managed store (KMS/Secrets Manager)?
  - Are network ACLs/security groups restrictive?
  - Are cloud providers/vendors security-assessed?
- **Evidence Required:** IAM policies; secrets-store config; security-group/NACL rules; vendor assessment.
- **Severity:** High
- **References:** PRINCIPLES-REF

---

## N-5. Process / Container / Kernel-Level Isolation

- **Principle:** Confine each process so a compromise can't escalate or roam.
- **Requirement:**
  - Run services under dedicated **unprivileged** users; avoid root.
  - Use OS permissions to restrict each process's reads/writes (POSIX perms, ACLs, **SELinux/AppArmor**, Windows ACLs).
  - **Drop capabilities** (Linux `capsh`, Docker `--cap-drop`, seccomp filters) so processes can't call dangerous syscalls (raw sockets, module loading).
  - Run services in **chroot/jails/containers** with minimal filesystem views; mount filesystems **noexec, nodev, nosuid** where possible.
- **Risk:** Over-privileged processes enable container escape, privilege escalation, lateral movement.
- **Mitigations:** Mandatory access control profiles; capability dropping; seccomp; minimal container images; restrictive mounts.
- **Validation Checklist:**
  - Do services run unprivileged with MAC profiles (SELinux/AppArmor)?
  - Are unnecessary Linux capabilities dropped and seccomp applied?
  - Are containers/jails minimal with noexec/nodev/nosuid mounts where feasible?
- **Evidence Required:** Container/run config; MAC profiles; capability/seccomp settings; mount options.
- **Severity:** High
- **References:** PRINCIPLES-REF

---

## N-6. Memory Safety & Resource Limits (low-level / native code)

- **Principle:** Native/unsafe code introduces memory-corruption classes; bound all resources.
- **Requirement (if C/C++ or unsafe FFI is in scope):**
  - Use safe abstractions (`std::string`, `std::vector`, smart pointers) over raw pointers/manual `malloc`/`free`.
  - Enforce bounds checking on all array/buffer access; avoid unchecked pointer arithmetic.
  - **Avoid banned functions** (`gets`, `strcpy`, `strcat`, `sprintf`, unbounded `scanf` on untrusted data); use length-aware/safer APIs.
  - Compiler/runtime hardening: stack protectors, `FORTIFY_SOURCE`, warnings-as-errors
    (`-Wall -Wextra -Werror -D_FORTIFY_SOURCE=2 -fstack-protector-strong`); enable ASLR, DEP/NX, RELRO.
  - Resource management: OS limits (`ulimit`, cgroups) for max open files, CPU time, memory, max processes (prevent fork bombs / DoS).
  - **Zero out sensitive buffers** (passwords, keys) after use.
  - Treat native addons / system libraries in Node/Go/Rust as risk hotspots.
- **Risk:** Buffer overflows, use-after-free, RCE, resource-exhaustion DoS.
- **Common Vulnerabilities:** Buffer overflow (CWE-120/787), use-after-free (CWE-416), integer issues (CWE-190).
- **Mitigations:** Memory-safe constructs; hardening flags; resource limits; secure buffer wiping.
- **Validation Checklist:** Are banned functions avoided and bounds checked? Are hardening flags + ASLR/DEP/RELRO on? Are resource limits set? Are secret buffers zeroed?
- **Evidence Required:** Build flags; absence of banned functions; ulimit/cgroup config.
- **Severity:** High (when native/unsafe code present; otherwise N/A)
- **References:** PRINCIPLES-REF

---

## N-7. Filesystem & Path-Level Security (host)

- **Principle:** Filesystem permissions and path handling are a primary leakage/traversal vector.
- **Requirement:**
  - Never concatenate user input into filesystem paths; join against a known base directory, then **canonicalize and verify** containment (see V-10).
  - OS permissions: config files with secrets = **owner-read only** (`chmod 600`, no world/group read);
    log directories writable only by the owning service account; restrict executable bits / use `noexec` mounts where appropriate.
  - Temp files: use secure temp APIs (e.g., `mkstemp`) with unpredictable names; never put secrets/long-lived files in `/tmp` (treat `/tmp` as attacker-controllable).
- **Risk:** Path traversal, secret leakage via world-readable files, predictable-temp-file attacks.
- **Common Vulnerabilities:** Path traversal (CWE-22), incorrect permission assignment (CWE-732), insecure temp file (CWE-377).
- **Mitigations:** Base-dir containment; least-privilege file perms; secure temp APIs.
- **Validation Checklist:** Are secret/config files owner-read-only? Are log dirs restricted to the service account? Are temp files created securely?
- **Evidence Required:** File permission settings; temp-file API usage; path-containment code.
- **Severity:** High
- **References:** PRINCIPLES-REF, JUICE-SHOP (exposed `/ftp`, logs, backups)

---

## N-8. Low-Level Network & Protocol Controls

- **Principle:** Bind, expose, and negotiate only what's needed.
- **Requirement:**
  - Bind services only to required interfaces/ports (e.g., `127.0.0.1` for internal admin endpoints, not `0.0.0.0`).
  - Disable legacy/insecure protocols (TLS 1.0/1.1, SSLv3, weak ciphers); enforce modern TLS.
  - Firewall: default-deny inbound (open specific ports from specific source ranges); default-deny egress where possible.
  - TCP/IP hardening: SYN-flood protection, limit half-open connections, tune backlog; disable IP forwarding and unneeded ICMP.
  - At the app level, validate protocol state (expected message order/handshakes) and disconnect on anomalies.
- **Risk:** Exposed admin ports, downgrade attacks, SYN floods, protocol-confusion.
- **Mitigations:** Interface binding; modern-TLS enforcement; strict firewall in/out; TCP/IP tuning; protocol-state checks.
- **Validation Checklist:** Are admin endpoints bound to loopback/management only? Legacy TLS disabled? In/out firewall default-deny? SYN-flood protection on?
- **Evidence Required:** Listener bindings; TLS/cipher config; firewall rules; TCP tuning.
- **Severity:** High
- **References:** PRINCIPLES-REF


---

# 02.09 — Error Handling, Logging, Monitoring & Incident Response

What to do when things break — safely. Errors and logs are both a defense and, if mishandled, a
goldmine for attackers.

---

## E-1. Fail Open vs Fail Closed

- **Principle:** On error, default to the safe outcome.
- **Requirement:** **Fail Closed** (block access on error) is the **secure default**. **Fail Open**
  (allow access on error) requires explicit **business justification**.
- **Decision rule:** If the action is **irreversible → Fail Closed**. If there's a **retry window →
  Fail Open may be justified**.
  - *Example A:* digital album download + card-verification error → Fail Closed (you can't un-deliver a download).
  - *Example B:* vinyl record that ships in 3–5 days + same error → Fail Open may be OK (time to retry the card before shipping).
- **Risk:** Failing open grants access during faults; failing closed on irreversible actions prevents fraud/leakage.
- **Common Vulnerabilities:** Insecure default behavior on error, fail-open authorization (CWE-636 not failing securely).
- **Detection Methods:** Force errors in auth/authz/payment paths; observe whether access is granted or denied.
- **Mitigations:** Default-deny on exceptions; document any justified fail-open with the retry-window rationale; fail closed on crypto/auth errors.
- **Validation Checklist:**
  - Do auth/authz/crypto/payment paths fail closed on error?
  - Is any fail-open behavior explicitly justified by a retry window?
- **Evidence Required:** Error-path handling in security-critical flows.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF

---

## E-2. Error-Handling Patterns

- **Principle:** Structured handling beats scattered return-value checks.
- **Requirement:** Prefer **Structured Exception Handling** (`try–catch–finally`) — clean separation of
  happy path and error path, with a generic catch as a safety net. **Functional error checking**
  (checking each return value) is the fallback and is fragile: missing one check lets code continue with
  invalid data → vulnerability.
- **Low-level rule:** On every system call (file open, read/write, network send/recv, fork/exec, crypto
  op), **check the return value** and handle errors robustly; fail closed on anything unexpected.
- **Risk:** Unchecked errors propagate invalid state; missed checks cause silent failures.
- **Mitigations:** Exception handling with generic catch; return-value checks where exceptions aren't available; fail-closed defaults.
- **Validation Checklist:** Is structured exception handling used with a safety-net catch? Are all return values from sensitive syscalls checked?
- **Evidence Required:** Exception-handling structure; syscall return-value checks.
- **Severity:** Medium
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF

---

## E-3. Safe Error Messages

- **Principle:** Error output must help users, not attackers.
- **Requirement:** **Generic messages only** to users; **no debug info in production** (no stack traces,
  DB structure, SQL, file paths, secret values); debug mode toggled via **server-side config only**
  (NEVER client-triggered); provide **custom error pages for HTTP 404/500**.
- **Risk:** Detailed errors are a goldmine — they reveal stack, DB schema, framework, and file layout.
  *(Juice Shop leaked full Node/Express stack traces and absolute file paths on errors.)*
- **Common Vulnerabilities:** Information exposure through error messages (CWE-209, CWE-211, CWE-200).
- **Detection Methods:** Trigger errors and inspect responses for stack traces/paths/SQL; attempt to enable debug from the client.
- **Mitigations:** Centralized error handler that logs full detail server-side and returns a generic page; environment-gated debug; custom 404/500.
- **Validation Checklist:**
  - Are user-facing errors generic (no stack/SQL/paths)?
  - Is debug disabled in production and only server-config-toggleable?
  - Are custom 404/500 pages configured?
- **Evidence Required:** Error-handler code; environment flag (e.g., `DEBUG` off in prod); custom error pages.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, JUICE-SHOP (stack traces), REF-IMPL (`register_error_handlers`, `404.php`/`500.php`, `DEBUG` flag, `.htaccess` ErrorDocument)

---

## E-4. What to Log (audit logging)

- **Principle:** Log enough to reconstruct security-relevant events — never the secrets themselves.
- **Requirement:** Log **authentication events (with timestamps)**, **all authorization attempts/decisions**,
  **data reads/writes/modifications/deletions**, **admin/config changes**, **network communications**, and
  **security-relevant errors** (not just 500s). Include context (IDs, source IP, timestamp, request type,
  outcome). **Do NOT log** secrets, passwords, session tokens, or full PII — mask or hash if needed.
- **Risk:** Without logs, attacks and repudiation go undetected/unprovable; logging secrets creates a new leak.
- **Common Vulnerabilities:** Insufficient logging (CWE-778), sensitive data in logs (CWE-532).
- **Detection Methods:** Review log coverage against the event list; grep logs for secrets/PII.
- **Mitigations:** Structured logging with channels (auth/transaction/admin); context fields; secret masking; centralization.
- **Validation Checklist:**
  - Are auth, authz, data CRUD, admin/config, and network events logged with timestamp + source?
  - Are secrets/passwords/tokens/PII kept out of logs (or masked/hashed)?
  - Are logs centralized?
- **Evidence Required:** Logging module + sample entries; secret-masking; channel structure.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF, THREAT-DRAGON-ACT2/3 (missing logging threats), SEC-POLICY (audit logging), REF-IMPL (`logger.php` auth/transaction/admin channels)

---

## E-5. The Five Threats to Logs (mnemonic: N-C-F-D-D)

- **Principle:** Logs are evidence and are themselves attacked.
- **The five threats and defenses:**
  | Threat | What it is | Defense |
  |---|---|---|
  | **Noise** | Flood logs with junk to hide a real attack | Intelligent rejection after repeated attempts; filtering |
  | **Cover Tracks** | Delete/edit specific log entries | Restrictive access, read-only / WORM media, hashing, IDS |
  | **False Alarms** | Train admins to ignore alerts | Always investigate — never dismiss errors |
  | **Denial of Service** | Fill logs until logging stops | Max size, separate partition, monitoring/alerts |
  | **Destruction** | Overwrite or purge all logs | Train admins, benchmark normal volume, proper backups |
- **Log-as-evidence rules:** Write-once/read-many (WORM) storage; regular backups; consistent naming;
  sync clocks with a **hardened time server that provides no other services**; never manipulate logs
  while analyzing them.
- **Risk:** Tampered/destroyed/ignored logs defeat detection and forensics.
- **Common Vulnerabilities:** Log tampering, insufficient log protection (CWE-117 improper output neutralization for logs, CWE-778).
- **Mitigations:** Append-only/WORM storage, restrictive ACLs, hashing/signing, separate partition, monitored capacity, backups, time sync.
- **Validation Checklist:**
  - Are logs append-only/WORM with restrictive access and integrity hashing?
  - Is log storage capacity-monitored on a separate partition?
  - Are clocks synced to a hardened time source?
  - Are logs backed up and never edited during analysis?
- **Evidence Required:** Log-storage ACLs/WORM config; integrity mechanism; time-sync config; backup policy.
- **Severity:** High
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2

---

## E-6. Monitoring & Detection

- **Principle:** Assume breach — detect quickly.
- **Requirement:** Continuous monitoring for anomalies, failed logins, strange IP ranges, and unusual
  data-access patterns; use **IDS/IPS** for network/host traffic where appropriate; centralize logs in a
  secure platform; retain logs for a defined period (e.g., 30+ days or per compliance) with backups.
- **Risk:** Slow detection extends dwell time and impact.
- **Common Vulnerabilities:** Lack of monitoring/alerting; insufficient retention.
- **Detection Methods:** Review monitoring coverage, alert rules, retention settings; test anomaly alerting.
- **Mitigations:** SIEM/log platform; anomaly + threshold alerts; IDS/IPS; defined retention + backups.
- **Validation Checklist:** Is there continuous monitoring with anomaly/failed-login alerts? IDS/IPS where appropriate? Defined retention with backups?
- **Evidence Required:** Monitoring/alert config; IDS/IPS deployment; retention policy.
- **Severity:** High
- **References:** PRINCIPLES-REF, SEC-POLICY (monitoring & logging, compliance measurement)

---

## E-7. Incident Response

- **Principle:** Plan and rehearse the response before you need it.
- **Requirement:** Maintain and **rehearse** an incident-response plan with roles, communication channels,
  and decision trees; define **runbooks** for common incidents (credential theft, ransomware, data leak,
  insider misuse).
- **Risk:** Ad-hoc response increases damage and recovery time.
- **Mitigations:** IR plan + named roles; runbooks; tabletop exercises; post-incident review.
- **Validation Checklist:** Is there a rehearsed IR plan with roles and runbooks for common incidents?
- **Evidence Required:** IR plan; runbooks; exercise records.
- **Severity:** High
- **References:** PRINCIPLES-REF

---

## E-8. Business Continuity & Backups

- **Principle:** Be able to recover.
- **Requirement:** Automated, regular backups of critical systems/data, stored offline or in segregated
  accounts; **test restore procedures and RPO/RTO regularly**.
- **Risk:** Unrecoverable data after ransomware/destruction; untested backups that don't restore.
- **Common Vulnerabilities:** Missing/untested/unencrypted backups.
- **Mitigations:** Encrypted, segregated, automated backups; periodic restore tests; documented RPO/RTO.
- **Validation Checklist:** Are backups automated, encrypted, and segregated? Are restores and RPO/RTO tested?
- **Evidence Required:** Backup config; restore-test records; RPO/RTO targets.
- **Severity:** High
- **References:** PRINCIPLES-REF, SEC-POLICY (backups against log destruction)


---

# 02.10 — Secure SDLC, DevSecOps & Supply Chain

Security must be built into how code is written and shipped — not bolted on at the end. The recurring
practical lesson: *"good enough" security usually isn't*, and security cannot be an afterthought.

---

## L-1. Threat Modeling in Design

- **Principle:** Find design flaws before code exists.
- **Requirement:** Integrate **threat modeling** into early design for new features — define objectives
  and assets, model with **DFDs**, identify threats via **STRIDE**, and prioritize via **DREAD/PASTA**.
  *(Full method in `Reference.md#04-threat-modeling-reference`.)*
- **Risk:** Design-level flaws are expensive and dangerous if discovered only in production.
- **Mitigations:** Per-feature threat models; trust-boundary analysis; documented mitigations per threat.
- **Validation Checklist:** Is a threat model produced for each significant feature/design change with mitigations tracked?
- **Evidence Required:** Threat-model documents (e.g., Threat Dragon models, STRIDE tables).
- **Severity:** High
- **References:** PRINCIPLES-REF, THREAT-MODEL-COFFEE, THREAT-DRAGON-ACT2/3, LEC-THREAT-MODELING

---

## L-2. Security Gates in CI/CD (DevSecOps)

- **Principle:** Automate security checks so every change is screened.
- **Requirement:** Add to CI/CD: **SAST** (static analysis), **DAST** (dynamic), **dependency scanning
  (SCA)**, and **container scanning**. Integrate static-analysis checks that detect buffer issues, null
  derefs, and injection patterns into CI. Combine **SAST + DAST + pen testing + fuzz testing** for
  comprehensive coverage. Validate authentication, access control, and secure configurations; test
  regulatory compliance (GDPR, OWASP ASVS, PCI DSS).
- **Risk:** Vulnerabilities ship without automated screening; regressions reappear.
- **Common Vulnerabilities:** Any class missed by manual-only review; known-vulnerable dependencies.
- **Detection Methods:** Confirm CI pipeline stages and gating; review scan results and thresholds.
- **Mitigations:** Pipeline gates that fail builds on findings above a threshold; periodic DAST/pentest/fuzz.
- **Validation Checklist:**
  - Does CI run SAST, DAST, SCA, and container scanning?
  - Are builds gated on findings above an agreed severity?
  - Are pen testing and fuzzing performed periodically?
  - Are auth, access control, and secure configs explicitly tested?
- **Evidence Required:** CI pipeline config; scan reports; gate thresholds; pentest/fuzz reports.
- **Severity:** High
- **References:** PRINCIPLES-REF, LEC-SECURE-CODING (testing requirements: SAST/DAST/pen/fuzz, ASVS/PCI DSS)

---

## L-3. Secure Code Review

- **Principle:** Human review catches logic/context issues tools miss.
- **Requirement:** Peer review with **security checklists** (auth, input validation, logging, error
  handling) for each PR. Use this KB's `03-review-checklists/` as the review basis.
- **Risk:** Subtle authorization/business-logic flaws slip through.
- **Mitigations:** Mandatory security-checklist review; pair high-risk changes with a security-aware reviewer.
- **Validation Checklist:** Does every PR undergo a security-checklist review covering auth, validation, logging, and error handling?
- **Evidence Required:** PR review records referencing the checklist.
- **Severity:** Medium
- **References:** PRINCIPLES-REF, this KB `Review-Checklists.md#0303-source-code-security-review-checklist`

---

## L-4. Secure Coding Discipline (language-agnostic habits)

- **Principle:** Coding discipline prevents whole classes of bugs.
- **Requirement:**
  - Prefer **immutability** / `const` for data that shouldn't change (shrinks state-corruption surface).
  - **Encapsulate validation** — constructors/setters enforce invariants so objects can never exist in invalid states.
  - **Centralize dangerous operations** (file IO, subprocess execution, reflection, `eval`) behind small, audited modules with narrow interfaces.
  - **Avoid shell injection** — prefer direct syscalls/library APIs over `system()`; if shelling out, use exec APIs that bypass the shell and pass args as arrays.
  - Run **static analysis** and **secure code review**; integrate into CI.
- **Risk:** Ad-hoc dangerous operations and mutable shared state breed injection and corruption bugs.
- **Mitigations:** Invariant-enforcing types; audited choke-point modules; no shell concatenation; CI static analysis.
- **Validation Checklist:** Are dangerous operations centralized and audited? Is shell concatenation avoided? Are invariants enforced in types/constructors?
- **Evidence Required:** Audited utility modules; absence of shell-concatenation; static-analysis integration.
- **Severity:** Medium
- **References:** PRINCIPLES-REF

---

## L-5. Patch & Vulnerability Management

- **Principle:** Know what you run and fix known issues promptly.
- **Requirement:** Maintain an **asset inventory** and track software versions; run **regular vulnerability
  scans** with **timely remediation** of findings.
- **Risk:** Unknown/unpatched assets are persistent entry points.
- **Common Vulnerabilities:** Use of components with known vulnerabilities.
- **Mitigations:** Inventory + SBOM; scheduled scans; remediation SLAs by severity; patch automation.
- **Validation Checklist:** Is there an asset inventory with versions? Regular scans? Remediation within defined SLAs?
- **Evidence Required:** Asset inventory/SBOM; scan reports; remediation tracking.
- **Severity:** High
- **References:** PRINCIPLES-REF

---

## L-6. Supply Chain Security

- **Principle:** Your dependencies and vendors are part of your attack surface.
- **Requirement:** Assess vendors for security posture and include **security clauses in contracts**;
  **monitor and respond to advisories** for libraries, frameworks, and container images you depend on.
- **Risk:** Compromised/typosquatted/abandoned dependencies introduce backdoors.
- **> Worked example (Juice Shop "Legacy Typosquatting"):** A forgotten `package.json.bak` revealed a
  suspicious dependency (`epilogue-js`) — illustrating how exposed build artifacts and unvetted deps
  create supply-chain risk.
- **Common Vulnerabilities:** Typosquatting, dependency confusion, malicious/abandoned packages, hard-coded creds in artifacts (CWE-798).
- **Detection Methods:** Dependency scanning/SCA; review of `package.json`/lockfiles; advisory monitoring; scan for exposed build artifacts/backups.
- **Mitigations:** Pin/lock dependencies; verify integrity (lockfile hashes); SCA in CI; remove build artifacts/backups from deployables; vendor due diligence; advisory subscriptions.
- **Validation Checklist:**
  - Are dependencies pinned, integrity-verified, and SCA-scanned?
  - Are build artifacts/backups (`*.bak`, source maps) excluded from deployables?
  - Are vendors assessed and advisories monitored?
- **Evidence Required:** Lockfiles + SCA reports; build/deploy excludes; vendor assessments; advisory process.
- **Severity:** High
- **References:** PRINCIPLES-REF, JUICE-SHOP (Legacy Typosquatting, Forgotten Developer Backup)

---

## L-7. Security Training & Culture

- **Principle:** People are part of the control set.
- **Requirement:** Security-awareness training for developers and operators (phishing, secure coding,
  secrets handling); clear roles and responsibilities for information security; increase user training
  and awareness to reduce risk from known weaknesses.
- **Risk:** Human error (phishing, mishandled secrets, ignored alerts) undermines technical controls.
- **Mitigations:** Recurring training; defined security roles; phishing simulations; secure-coding guidelines.
- **Validation Checklist:** Is there recurring security training? Are infosec roles/responsibilities defined?
- **Evidence Required:** Training records; RACI / role definitions.
- **Severity:** Medium
- **References:** PRINCIPLES-REF, SEC-POLICY (user training & awareness)

---

## L-8. Compliance & Governance

- **Principle:** Meet applicable obligations and prove it.
- **Requirement:** Identify and meet applicable standards/regulations (GDPR, HIPAA, PCI DSS, OWASP ASVS);
  measure compliance via **regular log/audit reviews**, periodic checks of access-control schematics and
  policies, user feedback, and security-strength testing; manage **exceptions** through a documented,
  risk-assessed approval process; enforce **non-compliance** consequences.
- **Risk:** Legal/financial penalties; undetected policy drift.
- **Mitigations:** Compliance mapping; scheduled audits; exception register with risk assessment; enforcement policy; revision history.
- **Validation Checklist:**
  - Are applicable standards identified and mapped to controls?
  - Are compliance measured via regular audits/reviews and testing?
  - Is there a risk-assessed exception process and a non-compliance policy?
- **Evidence Required:** Compliance mapping; audit/review records; exception register; policy documents with revision history.
- **Severity:** Medium
- **References:** PRINCIPLES-REF, SEC-POLICY (policy compliance, exceptions, non-compliance, related standards), LEC-SECURE-CODING (GDPR/OWASP ASVS/PCI DSS)
