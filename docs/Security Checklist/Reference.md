# Reference

> Reference material: threat-modeling methodology, the attack→CWE catalog, severity/risk scoring, a complete worked threat model usable as a template, the Juice Shop attack→principle map, concrete secure-coding patterns, and a glossary/cheat-sheet.

## Contents

1. [04 — Threat Modeling Reference](#04-threat-modeling-reference)
2. [04 — Attack Vectors & CWE Catalog](#04-attack-vectors-cwe-catalog)
3. [04 — Severity & Risk Scoring](#04-severity-risk-scoring)
4. [04 — Worked Threat Model: Coffee Ordering Web App](#04-worked-threat-model-coffee-ordering-web-app)
5. [04 — Juice Shop: Attack → Preventing Principle Map](#04-juice-shop-attack-preventing-principle-map)
6. [04 — Secure Coding Patterns (Reference Implementation)](#04-secure-coding-patterns-reference-implementation)
7. [04 — Glossary, Misconceptions & Cheat Sheet](#04-glossary-misconceptions-cheat-sheet)


---

# 04 — Threat Modeling Reference

Threat modeling is the structured process of figuring out what can go wrong **before** it happens.
This file is the methodology reference; for a complete filled-in example see
`#04-worked-threat-model-coffee-ordering-web-app`.

---

## The 3-Step Process

1. **Define objectives & assets** — What are you protecting (data, funds, reputation, availability)?
   State the security objectives in CIA terms (e.g., "Confidentiality of payment data," "99.99% availability").
2. **Model the application & identify threats** — Decompose the system with **Data Flow Diagrams
   (DFDs)**, mark **trust boundaries**, and enumerate threats against each element using **STRIDE**.
3. **Measure & prioritize** — Score and rank threats using **DREAD** (or **PASTA** for a risk-centric
   process), then choose mitigations by highest risk reduction per unit effort.

---

## STRIDE — threat categories → violated property

STRIDE is a checklist applied per element (external entity, process, data store, data flow). Each
letter corresponds to the security property it violates, which points directly at the class of mitigation.

| STRIDE | Threat | Violated property | Primary mitigation class |
|---|---|---|---|
| **S** | Spoofing — pretending to be someone/something else | **Authentication** | Strong authn (MFA, mTLS), verify identity at each boundary |
| **T** | Tampering — modifying data/code without permission | **Integrity** | Hashing/signatures, TLS, DB constraints, input validation |
| **R** | Repudiation — denying an action was performed | **Non-repudiation** | Immutable/append-only audit logs, secure timestamps, signatures |
| **I** | Information Disclosure — exposing secrets | **Confidentiality** | Encryption in transit/at rest, access control, safe errors |
| **D** | Denial of Service — making the system unavailable | **Availability** | Rate limiting, quotas, timeouts, redundancy, autoscaling |
| **E** | Elevation of Privilege — gaining unauthorized rights | **Authorization** | Least privilege, server-side authz, no client-set roles |

**STRIDE-per-element tip (from the Threat Dragon models):** apply STRIDE to each component. A SQL
data store mainly attracts Tampering/Information-Disclosure/DoS (e.g., SQL injection); an LDAP store
attracts injection and spoofing; a web process attracts all six; an external entity attracts Spoofing
and Repudiation.

---

## DREAD — scoring & prioritization

`Risk = (Reproducibility + Exploitability + Discoverability) × (Damage + Affected Users)`

Score each factor (typically 1–10 or Low/Med/High), compute the product form above, and rank. The
multiplicative grouping deliberately amplifies threats that are both easy to pull off **and** high-impact.

| Factor | Question |
|---|---|
| **D**amage | How bad if exploited? |
| **R**eproducibility | How reliably can it be repeated? |
| **E**xploitability | How much effort/skill is needed? |
| **A**ffected users | How many users are impacted? |
| **D**iscoverability | How easily can attackers find it? |

(See also the base equation `Risk = Likelihood × Impact` in `#04-severity-risk-scoring`.)

---

## PASTA (alternative, risk-centric)

**P**rocess for **A**ttack **S**imulation and **T**hreat **A**nalysis — a 7-stage, business-risk-driven
methodology (define objectives, define technical scope, decompose the app, analyze threats, analyze
vulnerabilities, model attacks, analyze risk & impact). Use it when threat modeling must tie directly
to business impact and attacker simulation rather than a per-element checklist.

---

## Data Flow Diagrams (DFDs) & Trust Boundaries

- **Elements:** external entities (users, third parties), processes (services), data stores (DB, files),
  and data flows (the arrows between them).
- **Trust boundary:** any point where data/control crosses between zones of differing trust. **Every
  flow that crosses a boundary is a prime threat target** and must be authenticated, authorized,
  validated, and encrypted on the trusted side.
- **Canonical boundaries (worked model):** client is **untrusted** (validate all input server-side);
  the server trusts the client for UI but **not** for data integrity or authorization; the database
  trusts the app server's identity (so app compromise = data compromise); third parties are **partially
  trusted** (secure the channel, still validate returned data).

---

## How an AI should run a threat-modeling pass

1. List assets + security objectives (CIA).
2. Build/ingest the DFD; mark trust boundaries and data classifications.
3. For each element, walk all six STRIDE letters; record concrete threats (give each a `T-###` ID).
4. Map each threat to likely **CWE(s)** (see `#04-attack-vectors-cwe-catalog`).
5. Score with DREAD; assign severity (`#04-severity-risk-scoring`).
6. Propose at least one mitigation per threat; cite the relevant domain control (e.g., `Z-3` for BOLA).
7. Output a threat table mirroring `#04-worked-threat-model-coffee-ordering-web-app`.

**References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, THREAT-MODEL-COFFEE, THREAT-DRAGON-ACT2/3, PRINCIPLES-REF


---

# 04 — Attack Vectors & CWE Catalog

A lookup catalog mapping each attack vector to its CWE ID(s), how to detect it, and the fix. This is
the cross-reference target for findings produced by any checklist in `03-review-checklists/`. The CWE
set is the one used in the worked threat model (`THREAT-MODEL-COFFEE`) plus the vectors demonstrated
in `JUICE-SHOP` and the lecture material.

> Format per row: **Attack → CWE → Detection → Fix → Domain control.**

---

## Injection

| Attack | CWE | Detection | Fix | Control |
|---|---|---|---|---|
| **SQL Injection** | CWE-89 | Inject `'`, `' OR '1'='1`, `'--`; observe auth bypass / errors / extra rows. JUICE-SHOP login `jim@juice-sh.op'--`. | Parameterized queries / prepared statements; least-priv DB account. | V-4, 06-DB |
| **Improper Input Validation** | CWE-20 | Send malformed/over-length/out-of-range input; observe acceptance. | Server-side allow-list validation (type, length, range, format); normalize then validate. | V-1, V-2 |
| **Command Injection** | CWE-77 | Inject `; id`, `| whoami`, `$(...)` into params reaching a shell. | Avoid shells; use exec APIs with arg arrays; no string concatenation. | V-9 |
| **OS Command Injection** | CWE-78 | As above for OS commands. | Same as CWE-77; least-privilege process. | V-9 |
| **Code Injection** | CWE-94 | Inject code into `eval`/template/deserialize paths. | Remove dynamic eval; sandbox; validate. | V-9 |
| **LDAP Injection** | (under CWE-77 family) | Inject `*)(uid=*` style filters. | Escape/parameterize LDAP filters. | V-9 (THREAT-DRAGON LDAP) |
| **Deserialization of Untrusted Data** | CWE-502 | Feed crafted serialized objects; observe gadget execution. | Avoid native deser of untrusted input; use safe formats + schema validation. | V-9 |

## Cross-Site Scripting (XSS)

| Attack | CWE | Detection | Fix | Control |
|---|---|---|---|---|
| **Reflected XSS** | CWE-79 | Payload echoed once in response (e.g., tracking ID reflected). | Context-aware output encoding; CSP. | V-5 |
| **Persistent/Stored XSS** | CWE-79 | Payload stored (e.g., via header/feedback) and fires for other users. | Encode on output; sanitize stored rich content; CSP. | V-5 |
| **DOM XSS** | CWE-79 | Payload injected into DOM client-side (e.g., search field) without sanitization. | Safe DOM APIs (`textContent`); avoid `innerHTML`; CSP. | V-5 |

## Authentication / Session

| Attack | CWE | Detection | Fix | Control |
|---|---|---|---|---|
| **Improper Authentication** | CWE-287 | Bypass/weak login; test auth on protected actions. | Strong authn, verify on each request, MFA. | A-* |
| **Missing Authentication for Critical Function** | CWE-306 | Call sensitive endpoint with no credentials. | Require authn on every non-public endpoint. | P-1 |
| **Weak Password Recovery** | CWE-640 | OSINT-answerable security questions (Bjoern's pet, Jim's sibling). | Token-based single-use, time-limited resets; no static questions. | A-9 |
| **User Enumeration / Observable Discrepancy** | CWE-203 | Different message/status/timing for valid vs invalid user. | Generic identical failure (message + status + timing). | A-6 |
| **Excessive Auth Attempts (no throttle)** | CWE-307 | Script repeated logins; no lockout. | Lockout/throttle + MFA; log attempts. | A-7 |
| **Cleartext Transmission** | CWE-319 | Login/page over HTTP; sniff session cookie. | Force HTTPS site-wide + HSTS; `Secure` cookies. | A-4, S-2 |
| **Session Fixation** | (session mgmt) | Session ID unchanged across login. | Regenerate session ID on login/privilege change. | S-3 |

## Authorization

| Attack | CWE | Detection | Fix | Control |
|---|---|---|---|---|
| **BOLA / IDOR** | CWE-639 (also CWE-862/863) | As user A, request user B's object ID (basket/order/profile). | Server-side ownership check on every object; scoped queries. | Z-3 |
| **Missing Authorization** | CWE-862 | Reach a protected action with no authz check. | Centralized authz on every protected route. | Z-2 |
| **Incorrect Authorization** | CWE-863 | Authz present but wrong (e.g., role check only). | Correct + complete mediation; check resource, not just action. | Z-2, Z-3 |
| **Improper Privilege Management** | CWE-269 | Set `role=admin` via request; reach higher-role functions. | Never trust client role; allow-list bindable fields; server-side role check. | Z-6 |

## Disclosure / Cryptography / Secrets

| Attack | CWE | Detection | Fix | Control |
|---|---|---|---|---|
| **Sensitive Information Exposure** | CWE-200 | Verbose errors, stack traces, exposed `/ftp` backups, over-fetching APIs. | Safe generic errors; minimize attack surface; least-data responses; encryption. | E-3, D-2 |
| **Use of Hard-coded Credentials** | CWE-798 | Grep source for keys/passwords; empty/default DB password. | Secret manager/vault/env; no secrets in repo; rotate. | C-9, D-3 |

## File / Path / Upload

| Attack | CWE | Detection | Fix | Control |
|---|---|---|---|---|
| **Path Traversal** | CWE-22 | `../`, encoded variants, Poison Null Byte `%00.md` to escape filter. | Canonicalize + confine to base dir; reject `..`/null bytes; validate. | V-10 |
| **Unrestricted Dangerous File Upload** | CWE-434 | Upload a script disguised as an image (client MIME spoof). | Validate real content (magic bytes), size limit, random name, store outside web root. | V-7 |

## Network / SSRF / DoS / CSRF

| Attack | CWE | Detection | Fix | Control |
|---|---|---|---|---|
| **CSRF** | CWE-352 | State-changing request succeeds without a token / cross-site. | Anti-CSRF token (constant-time compare) + `SameSite`; re-auth on sensitive actions. | V-6 |
| **SSRF** | CWE-918 | URL param fetches internal targets (`169.254.169.254`, `localhost`). | Allow-list outbound destinations; block internal ranges; validate URLs. | V-9, P-6 |
| **Uncontrolled Resource Consumption (DoS)** | CWE-400 | Flood requests / huge payloads / unbounded queries. | Rate limiting, payload/size limits, pagination, quotas, timeouts. | P-5, N-* |

---

## Supply-chain / misc (from JUICE-SHOP)

- **Typosquatting / malicious dependency** (e.g., suspicious `epilogue-js` found in `package.json.bak`)
  → fix via SCA, pinned & verified dependencies, no forgotten backups in web root. Control: L-6, 03.04.
- **Exposed backups / access logs** (`/ftp`, `.bak`, access.log) → minimize attack surface, restrict
  directories, keep backups off the web root. Control: foundations principle 1, 03.04, 03.06.
- **Open redirect / allowlist bypass** (editing a redirect param to an external URL) → validate
  redirect targets against an allow-list. Control: A-10 (redirect_uri), V-1.

**References:** THREAT-MODEL-COFFEE (CWE map), JUICE-SHOP (practical vectors), LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2, PRINCIPLES-REF


---

# 04 — Severity & Risk Scoring

How to assign the `Severity` field used throughout this KB and how to score risk consistently. An AI
reviewer should use this file to turn a raw finding into a ranked, actionable item.

---

## Core Risk Equation

`Risk = Likelihood × Impact`

- **Likelihood** — probability the weakness is exploited (consider exposure, ease, attacker motivation,
  discoverability).
- **Impact** — damage if exploited (data loss, financial loss, downtime, safety, reputation, compliance).
- A **Control** reduces risk by lowering likelihood and/or impact. Prioritize controls with the highest
  **risk reduction per unit effort**.

The chain to keep in mind: an **Asset** has a **Vulnerability**; a **Threat** (carried out by a
**Threat Agent** as an **Attack**) exploits it; the result is **Impact** with some **Likelihood**.

---

## DREAD (detailed scoring)

`Risk = (Reproducibility + Exploitability + Discoverability) × (Damage + Affected Users)`

Score each factor Low (1) / Medium (2) / High (3) — or 1–10 — then compute. Useful for ranking a
backlog of threats against each other rather than for an absolute number.

| Factor | Raises score when… |
|---|---|
| **Damage** | Exploitation causes severe loss (full account/data/financial compromise). |
| **Reproducibility** | The attack works reliably every time. |
| **Exploitability** | Little skill, tooling, or access is required. |
| **Affected Users** | Many users / all users are impacted. |
| **Discoverability** | The flaw is easy to find (public endpoint, obvious parameter). |

---

## Severity Rubric (the KB's Critical / High / Medium / Low)

Assign the **highest** band that applies. Severity should reflect realistic worst-case impact × ease.

### Critical
- Remote unauthenticated compromise, authentication bypass, or full account takeover.
- SQL/command/code injection reaching data or execution.
- Plaintext or fast-hashed (MD5/SHA-1/SHA-256) password storage.
- BOLA/IDOR or privilege escalation exposing sensitive data or admin functions.
- Hard-coded/exposed production secrets; missing encryption of regulated data.
- *Action:* **block release**; fix immediately.

### High
- Exploitable but needs some condition (authenticated context, specific config).
- Reflected/stored XSS, CSRF on sensitive state change, missing MFA on privileged accounts.
- Weak password recovery, missing brute-force protection, cleartext credential transmission.
- Sensitive information disclosure (verbose errors, exposed backups).
- *Action:* fix before release or obtain written, time-bound risk acceptance.

### Medium
- Limited impact or harder to exploit; defense-in-depth gaps.
- User enumeration via error/status differences, missing security headers, weak input validation
  without a proven sink, missing/insufficient logging.
- *Action:* schedule remediation with an owner and date.

### Low
- Minor hardening, best-practice deviations with minimal real-world impact.
- Informational findings, cosmetic config issues.
- *Action:* backlog.

---

## Mapping STRIDE/CWE findings to severity (quick guide)

| Finding type | Typical band |
|---|---|
| Auth bypass, SQLi, RCE, plaintext passwords, secret leak | Critical |
| BOLA/IDOR or privilege escalation on sensitive data | Critical/High |
| Stored XSS / CSRF on money or account changes | High |
| Reflected XSS, missing MFA, no rate limiting | High/Medium |
| User enumeration, missing headers, weak logging | Medium/Low |

---

## Adjusters

- **Data classification** (`02-domains/06`): regulated/PII/payment data raises impact → bump up a band.
- **Exposure:** internet-facing & unauthenticated raises likelihood → bump up.
- **Compensating controls:** strong segmentation, WAF, monitoring may lower *effective* risk (note them,
  don't silently downgrade a real flaw).
- **Aggregation:** several Mediums on one trust boundary can combine into a High attack chain — score the chain.

**References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2 (Risk = L×I, DREAD), THREAT-MODEL-COFFEE, PRINCIPLES-REF


---

# 04 — Worked Threat Model: Coffee Ordering Web App

A complete, filled-in threat model (from `THREAT-MODEL-COFFEE`) that doubles as a **reusable template**.
To threat-model a new system, copy this structure and substitute your own assets, roles, boundaries,
flows, and threats. Methodology lives in `#04-threat-modeling-reference`.

System: **Brew & Bloom Coffee Co.** online ordering web application.

---

## 1. Security Objectives (CIA)

- **Confidentiality:** Safeguard customer account details, personal information, and payment data from unauthorized access/disclosure.
- **Integrity:** Prevent unauthorized modification of critical data — product catalog (especially prices), customer orders, and user accounts.
- **Availability:** Maintain **99.99%** availability for customers ordering and staff managing operations.

## 2. Assets

1. **Customer PII** — names; contact details (email, phone, delivery address); order history.
2. **Payment Information** — tokenized payment data; transaction records; other financial details.
3. **Order Data** — items, quantities, customizations, prices, status, fulfillment info.
4. **Menu Data** — items, descriptions, prices, availability.
5. **Staff Credentials** — usernames, passwords, session tokens for Baristas, Managers, Administrators.
6. **Application Code & Configuration** — source code, server configs, environment variables, third-party API keys.
7. **Database Integrity & Availability** — accuracy, consistency, continuous access of the data store.
8. **Company Revenue** — protection from fraudulent orders, unauthorized refunds, downtime losses.
9. **System Uptime & Performance** — continuous, responsive operation.

## 3. Application Profile (Architecture)

Four components:
- **Client Side (Frontend)** — HTML5/CSS3/JS (React/Vue/Angular). Customer features (register/login, browse, customize, place orders, history/tracking) and staff features (secure staff login, live order visibility, menu CRUD, basic reporting).
- **Backend Web Application Server** — Node.js RESTful APIs; core logic: authentication, order processing, business logic, real-time updates.
- **Database Server** — MongoDB; stores user profiles, menu items, order records, staff roles/permissions.
- **Third-Party Payment Service** — external gateway (cards, e-wallets, bank transfers); backend communicates securely and verifies payments.

## 4. Roles & Permissions Matrix

Legend: **C**reate · **R**ead · **U**pdate · **D**elete · **X** execute (e.g., log in) · **-** no access. Blank/`-` = deny by default.

| Functionality / Role | Customer | Barista | Manager | Administrator |
|---|---|---|---|---|
| Register Own Account | C | - | - | - |
| Manage Own Profile | U | - | - | - |
| Login to Interface | X | X | X | X |
| Create Staff Account | - | - | - | C |
| Modify Staff Account | - | - | - | U |
| Delete Staff Account | - | - | - | D |
| Browse Menu | R | R | R | R |
| View Item Details | R | R | R | R |
| Add/Remove Cart Items | U | - | - | - |
| Customize Order | U | - | - | - |
| Place New Order | C | - | - | - |
| View Own Order History | R | - | - | - |
| View Own Order Status | R | - | - | - |
| View All Incoming Orders | - | R | R | R |
| Update Order Status | - | U | U | U |
| Cancel/Refund Order | - | - | U | U |
| Add New Menu Item | - | - | - | C |
| Modify Existing Menu Item | - | - | U | U |
| Delete Menu Item | - | - | - | D |
| Access Basic Sales Reports | - | - | R | R |
| Access System Reports | - | - | - | R |
| Monitor System Status | - | - | - | R |
| Manage App Settings | - | - | - | U |
| Manage Third-Party Integrations | - | - | - | U |

## 5. Decomposition

### 5.1 Trust Boundaries
- **Client side is untrusted** — all input originating there must be validated on the server.
- The web app server **trusts the client for basic UI interactions but NOT for data integrity or authorization decisions.**
- The MongoDB server **trusts calls from the web application server's identity** (app compromise → data compromise).
- **Third-party services are external and partially trusted** — channels are secured, but data received from them is validated.

### 5.2 Data Flows
1. **Customer Places an Order** — customer submits order → server validates input + business logic (availability, valid customizations) → server sends tokenized payment to gateway → gateway returns success/failure → on success, server records order + payment status in DB → DB stores record → server returns confirmation/status → client displays it.
2. **Barista Updates Order Status** — barista logs in, requests incoming orders → server authenticates + authorizes Barista, queries DB → DB returns pending orders → server sends list → barista updates a status (e.g., Received → Preparing) → server validates and updates the DB record.
3. **Manager Accesses Basic Sales Reports** — manager logs in, requests reports → server authenticates + authorizes Manager, queries aggregated sales → DB returns data → server formats/totals → manager's browser displays the report.
4. **Administrator Adds New Menu Item** — admin logs in, opens menu management, submits new item (name, description, price, …) → server validates input + authorizes Admin → server writes new item to DB → DB creates record → server confirms → admin sees confirmation.

## 6. Threats (STRIDE) — T-001 … T-018

| ID | STRIDE | Title | Description | Affected components |
|---|---|---|---|---|
| T-001 | Spoofing | Customer Account Spoofing | Impersonate a customer to place fraudulent orders or read order history. | Frontend, Web backend, DB |
| T-002 | Spoofing | Staff Account Spoofing | Impersonate staff to manipulate order status, read reports, or modify menu/config. | Frontend, Web backend, DB |
| T-003 | Spoofing | Web Application Server Spoofing | Fraudulent server set up to phish credentials or intercept data. | Frontend, Web backend |
| T-004 | Tampering | Order Data Tampering | Modify order details (items, quantities, **prices**, status) in transit or at rest. | Web backend, DB |
| T-005 | Tampering | Menu Data Tampering | Alter menu data (prices/descriptions) before storage. | Web backend, DB |
| T-006 | Tampering | Sales Report Tampering | Alter sales data in the DB → falsified reports. | Web backend, DB |
| T-007 | Tampering | App Code/Config Tampering | Malicious changes to code/config/env vars introduce backdoors or disable security. | Web backend |
| T-008 | Repudiation | Fraudulent Order Repudiation | Customer denies placing an order when logging/non-repudiation is insufficient. | Web backend, DB |
| T-009 | Repudiation | Staff Action Repudiation | Staff deny actions when audit logs are insufficient/mutable. | Web backend, DB |
| T-010 | Info Disclosure | Customer PII Disclosure | Unauthorized access to names, contacts, addresses, order history. | Web backend, DB |
| T-011 | Info Disclosure | Staff Credential Disclosure | Exposure of usernames/passwords/session tokens via insecure storage or transmission. | Web backend, DB |
| T-012 | Info Disclosure | App Code/Config Disclosure | Exposure of source, configs, env vars, or API keys. | Web backend |
| T-013 | Info Disclosure | Sales Data Disclosure | Unauthorized access to sales reports / aggregated sales data. | Web backend, DB |
| T-014 | DoS | Web Application Server DoS | Flood the server with requests → unavailable. | Web backend |
| T-015 | DoS | MongoDB Database DoS | Malicious/poorly optimized queries overload the DB → unresponsive. | DB, Web backend |
| T-016 | Elevation of Privilege | Customer → Staff Escalation | Customer exploits a flaw to reach Barista/Manager/Admin functions. | Web backend |
| T-017 | Elevation of Privilege | Barista/Manager → Admin Escalation | Lower staff role gains Administrator privileges. | Web backend |
| T-018 | Elevation of Privilege | Horizontal Escalation | Access another user's account at the same privilege level. | Web backend |

## 7. Vulnerabilities — Threat → CWE map

CWE legend: CWE-20 Improper Input Validation · CWE-22 Path Traversal · CWE-77 Command Injection ·
CWE-78 OS Command Injection · CWE-79 XSS · CWE-89 SQL Injection · CWE-94 Code Injection ·
CWE-200 Sensitive Info Exposure · CWE-269 Improper Privilege Management · CWE-287 Improper Authentication ·
CWE-306 Missing Authentication for Critical Function · CWE-352 CSRF · CWE-400 Uncontrolled Resource
Consumption · CWE-434 Unrestricted Dangerous File Upload · CWE-502 Deserialization of Untrusted Data ·
CWE-798 Hard-coded Credentials · CWE-862 Missing Authorization · CWE-863 Incorrect Authorization ·
CWE-918 SSRF.

| Threat | Mapped CWEs (✓ in source matrix) |
|---|---|
| T-001 | CWE-20, 79, 287, 306, 862 |
| T-002 | CWE-287, 306, 798, 862, 863 |
| T-003 | CWE-79, 200, 287, 319-class, 918 |
| T-004 | CWE-20, 79, 89, 352, 400, 862, 863 |
| T-005 | CWE-20, 89, 862, 863, 94 |
| T-006 | CWE-89, 269, 862, 863, 200 |
| T-007 | CWE-77, 78, 94, 502, 798 |
| T-008 | CWE-20, 287, 306, 862, 400 |
| T-009 | CWE-269, 287, 862, 863, 200 |
| T-010 | CWE-20, 79, 89, 200, 287, 306, 434, 502, 862, 863 |
| T-011 | CWE-200, 287, 306, 319-class, 798, 862, 863, 89, 79, 22 |
| T-012 | CWE-200, 22, 502, 798, 94, 78 |
| T-013 | CWE-200, 269, 287, 862, 863, 89, 400 |
| T-014 | CWE-400, 20, 89, 502, 918, 78, 77 |
| T-015 | CWE-400, 89 |
| T-016 | CWE-269, 287, 306, 862, 863, 20, 79, 89, 94, 502 |
| T-017 | CWE-269, 287, 862, 863, 798, 20, 89, 94, 502, 400 |
| T-018 | CWE-269, 287, 862, 863, 639-class, 200 |

> The exact ✓ positions per row come from the source matrix; where the original cells were ambiguous in
> extraction, the dominant CWEs for that threat class are listed. Treat this as the prioritized mapping,
> not an exhaustive enumeration.

## 8. Recommended mitigations (by STRIDE class)

- **Spoofing (T-001..003):** strong authn + MFA; TLS everywhere; verify server identity (HSTS, cert pinning where apt); validate IdP tokens. → A-*, N-2.
- **Tampering (T-004..007):** server-side validation & business-logic invariants (never trust client price/qty); parameterized queries; integrity checks; protect code/config; secrets in a vault. → V-4, C-9, P-4.
- **Repudiation (T-008..009):** immutable/append-only audit logs with attribution + secure timestamps. → E-4, foundations NR.
- **Information Disclosure (T-010..013):** encryption in transit/at rest; least-privilege reads; safe generic errors; no exposed backups/configs. → D-2, E-3.
- **DoS (T-014..015):** rate limiting, payload/size limits, query optimization/pagination, resource limits, autoscaling. → P-5, N-*.
- **Elevation of Privilege (T-016..018):** least privilege; server-side role + ownership checks; no client-set roles; centralized authz. → Z-3, Z-6.

**References:** THREAT-MODEL-COFFEE (verbatim assets/roles/flows/threats/CWE map), cross-mapped to `#04-attack-vectors-cwe-catalog` and domain controls.


---

# 04 — Juice Shop: Attack → Preventing Principle Map

Each practical exploit performed against OWASP Juice Shop (`JUICE-SHOP`), mapped to the root cause,
the secure-coding principle/control that prevents it, and the relevant lesson. This turns hands-on
exploitation into reusable review heuristics: when reviewing a new system, look for the same root causes.

> Columns: **Challenge → How it was done → Root cause → Preventing control → Lesson/CWE.**

---

## Authentication / SQL Injection

| Challenge | How it was done | Root cause | Preventing control | Lesson / CWE |
|---|---|---|---|---|
| **Login Jim** | Email `jim@juice-sh.op'--` + any password | User input concatenated into the SQL auth query | Parameterized queries; never build SQL from input | V-4 / CWE-89 |
| **Login Bender** | Email `bender@juice-sh.op'--` + any password | Same as above | Same; treat input as data, not code | V-4 / CWE-89 |
| **GDPR Data Erasure (Ghost Login)** | Login field `' OR deletedAt IS NOT NULL--` to log into a *deleted* account | SQLi + soft-delete not enforced in auth logic | Parameterized queries; enforce soft-delete/status server-side; test "impossible" states | V-4, Z-7 / CWE-89 |
| **Login Amy** | Recovered credentials from exposed hints | Credentials/hints discoverable | Don't expose credential hints; strong secrets | A-1 / CWE-200 |

## Authorization / Business Logic

| Challenge | How it was done | Root cause | Preventing control | Lesson / CWE |
|---|---|---|---|---|
| **View Another's Basket (BOLA)** | Change basket ID in the API request | No object-ownership check (Broken Object-Level Authorization) | Server-side ownership check on every object; scoped queries | Z-3 / CWE-639, 862 |
| **Forged Feedback** | Intercept feedback request, change `UserId` | Server trusts client-supplied identity field | Derive identity from session, never from request body; block mass assignment | Z-3, Z-6 / CWE-862 |
| **Forged Review** | Intercept review request, change `author` | Same — client-controlled author | Bind author to authenticated user server-side | Z-6 / CWE-862 |
| **Admin Registration** | Intercept registration, set `role: "admin"` | Privilege field accepted from client (mass assignment) | Never accept role from client; allow-list bindable fields; server-side role assignment | Z-6 / CWE-269 |
| **Deluxe Fraud** | Modify checkout to `"paymentMode": "wallet"` | Payment mode trusted from client | Authorize/compute payment server-side; enforce business invariants | P-4 / business logic |
| **Payback Time** | Set order quantity to negative (e.g., -5000) → negative total | No server-side range validation on quantity | Validate numeric ranges server-side (no negatives); enforce invariants | V-1, P-4 / CWE-20 |
| **CAPTCHA Bypass** | Intercept feedback request, edit CAPTCHA values | CAPTCHA validated weakly / client-side trust | Validate CAPTCHA server-side; bind to request; rate-limit | P-5 / business logic |

## Account Recovery / OSINT

| Challenge | How it was done | Root cause | Preventing control | Lesson / CWE |
|---|---|---|---|---|
| **Bjoern's Favorite Pet** | Reset via security question; pet name (Zaya) found on Twitter/photo wall | Recovery relies on OSINT-able secret | Token-based single-use time-limited resets; no static security questions | A-9 / CWE-640 |

## Attack Surface / File Access (all violate "Minimize Attack Surface")

| Challenge | How it was done | Root cause | Preventing control | Lesson / CWE |
|---|---|---|---|---|
| **Access Log** | Browse to exposed `/ftp`, `/support/logs`; download `access.log` | Sensitive directories publicly served | Restrict directory access; keep logs off web root | Principle 1 / CWE-200 |
| **Forgotten Developer Backup** | Found `package.json.bak` in `/ftp` | Backup left in web-accessible dir | No backups in web root; minimize attack surface | Principle 1 / CWE-200 |
| **Forgotten Sales Backup** | Found `coupons_2013.md.bak` in `/ftp` | Same | Same | Principle 1 / CWE-200 |
| **Poison Null Byte** | Append `%00.md` to bypass an extension-only filter | File filter checks extension at face value | Validate real content (magic bytes); reject null bytes; canonicalize | V-7, V-10 / CWE-22, 434 |
| **Easter Egg** | `eastere.gg` + `%00.md` bypass | Same null-byte/filter weakness | Same as Poison Null Byte | V-10 / CWE-22 |
| **Allowlist Bypass (Open Redirect)** | Edit redirect param to an external URL | Redirect target not validated against allow-list | Allow-list redirect targets; reject external URLs | A-10, V-1 / open redirect |

## Supply Chain

| Challenge | How it was done | Root cause | Preventing control | Lesson / CWE |
|---|---|---|---|---|
| **Legacy Typosquatting** | From `package.json.bak`, identify suspicious dep `epilogue-js` | Malicious/typosquat dependency + exposed backup | SCA; pin & verify dependencies; no forgotten backups | L-6, 03.04 / supply chain |

---

## Cross-cutting lessons (the recurring root causes)

1. **Never trust the client.** IDs, roles, prices, payment modes, authors, quantities — all must be
   validated/derived server-side. (Most challenges above reduce to this.)
2. **Parameterize queries.** "Sanitizing" input is not a real defense against SQLi.
3. **Check the resource, not just the action** (BOLA/IDOR is the most common authorization bug).
4. **Validate files by content, not extension**; reject null bytes; confine paths.
5. **Minimize attack surface** — no exposed `/ftp`, backups, logs, or hidden-only admin pages
   (obscurity ≠ security).
6. **Recovery flows are attack surface** — no OSINT-able security questions.
7. **Dependencies are attack surface** — scan and verify them.

**References:** JUICE-SHOP (challenge walkthroughs + reflections), cross-mapped to domain controls and `#04-attack-vectors-cwe-catalog`.


---

# 04 — Secure Coding Patterns (Reference Implementation)

Concrete, copyable secure-coding patterns extracted from the PHP reference implementation (`REF-IMPL`).
Each pattern shows the **correct** shape of a control, the **principle** it implements, and the **anti-pattern**
to flag in review. The language is PHP, but the patterns are language-agnostic.

> Use this alongside `Review-Checklists.md#0303-source-code-security-review-checklist`.

---

## 1. CSRF token with constant-time comparison

```php
function generate_csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); // CSPRNG, 256-bit
    }
    return $_SESSION['csrf_token'];
}

function validate_csrf_token(): bool {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') return true;
    $submitted = $_POST['csrf_token'] ?? '';
    $session   = $_SESSION['csrf_token'] ?? '';
    if ($submitted === '' || $session === '') return false;
    return hash_equals($session, $submitted); // constant-time compare
}
```
- **Implements:** CSRF defense (V-6). Token from a **CSPRNG** (`random_bytes`), compared with
  `hash_equals` to avoid timing leaks. Emit via a hidden field (`htmlspecialchars`-encoded) in every form.
- **Anti-pattern to flag:** `==`/`===` on tokens (timing), `rand()`/`mt_rand()`/`uniqid()` for tokens,
  no token on state-changing POSTs. Pair with `SameSite` cookies.

## 2. Parameterized queries (PDO) — no string-built SQL

```php
function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

// Usage — bound parameters, never concatenation:
$stmt = db()->prepare("INSERT INTO login_attempts (email, ip_address, success) VALUES (?, ?, ?)");
$stmt->execute([$email, client_ip(), $success ? 1 : 0]);
```
- **Implements:** SQLi defense (V-4, CWE-89). Input is bound as **data**, never interpolated into SQL.
- **Anti-pattern to flag:** `"... WHERE email = '" . $email . "'"`, f-string/`${}` queries.
- **Note:** the demo connects as `root` with an **empty password** — flagged as *not for production*;
  production must use a least-privilege DB account with a strong password (Z-1, 03.06).

## 3. Password hashing & verification (Argon2id)

```php
// Storage (registration):
$hash = password_hash($password, PASSWORD_ARGON2ID);

// Verification (login):
if (password_verify($input, $user['password_hash'])) { /* ok */ }
```
- **Implements:** A-3 (password storage). Slow, salted, memory-hard KDF; salt is automatic.
- **Anti-pattern to flag:** `md5()`, `sha1()`, `hash('sha256', $pw)` on passwords (too fast / obsolete),
  storing plaintext, or comparing hashes with `==`. Use the verify API.

## 4. Password-strength + common-password rejection (server-side)

```php
function validate_password_strength(string $password): array {
    $errors = [];
    if (strlen($password) < 8)   $errors[] = "Length too short";
    if (strlen($password) > 128) $errors[] = "Length too long";
    if (!preg_match('/[A-Z]/', $password))        $errors[] = "Missing uppercase";
    if (!preg_match('/[a-z]/', $password))        $errors[] = "Missing lowercase";
    if (!preg_match('/[0-9]/', $password))        $errors[] = "Missing number";
    if (!preg_match('/[!@#$%^&*]/', $password))   $errors[] = "Missing special character";
    if (empty($errors) && is_common_password($password)) $errors[] = "Common password";
    return $errors;
}
```
- **Implements:** A-2. Enforced **server-side**; allows long passphrases (max 128); rejects a
  common-password blocklist. **Length is the dominant factor** (see A-2 reasoning).
- **Anti-pattern to flag:** strength checks only in client JS; no upper bound; complexity-only rules.

## 5. Session timeout + centralized access guards

```php
function check_session_timeout(): void {
    if (empty($_SESSION['user'])) return;
    $last = $_SESSION['last_activity'] ?? null;
    if ($last !== null && (time() - $last) > SESSION_TIMEOUT) { // 1800s = 30 min
        log_auth('INFO', 'Session timed out due to inactivity', [...]);
        unset($_SESSION['user'], $_SESSION['last_activity']);
        header('Location: ' . BASE_URL . '/login.php'); exit;
    }
    $_SESSION['last_activity'] = time();
}

function require_login(): void {
    check_session_timeout();
    if (empty($_SESSION['user'])) { header('Location: '.BASE_URL.'/login.php'); exit; }
}

function require_admin(): void {
    require_login();
    if (($_SESSION['user']['role'] ?? '') !== 'admin') { header('Location: '.BASE_URL.'/dashboard.php'); exit; }
}
```
- **Implements:** S-5 (idle timeout) and Z-2 (centralized authorization). Every protected page calls
  `require_login()` / `require_admin()` — a single decision point (fix once, applied everywhere).
- **Anti-pattern to flag:** per-page copied role checks; UI-only hiding of admin features; role read
  from request instead of the server session.
- **Login must also** call `session_regenerate_id(true)` on success (S-3, anti-fixation) and use a
  generic error (A-6).

## 6. Safe file upload (content-type by magic bytes, not extension)

```php
function handle_profile_upload(array $file): ?string {
    global $ALLOWED_IMAGE_MIMES; // ['image/jpeg','image/png']
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    if ($file['error'] !== UPLOAD_ERR_OK)      throw new RuntimeException("Upload failed.");
    if ($file['size'] > MAX_UPLOAD_BYTES)      throw new RuntimeException("Image too large (max 2MB).");

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);            // detect REAL type, not client-supplied
    if (!in_array($mime, $ALLOWED_IMAGE_MIMES, true))    throw new RuntimeException("Invalid image type.");

    $ext  = match ($mime) { 'image/jpeg' => 'jpg', 'image/png' => 'png', default => 'bin' };
    $name = bin2hex(random_bytes(16)) . "." . $ext;      // random name, no overwrite/guessing
    $dest = __DIR__ . '/../uploads/profiles/' . $name;   // outside web root in real deploys
    if (!move_uploaded_file($file['tmp_name'], $dest))   throw new RuntimeException("Failed to save image.");
    return 'uploads/profiles/' . $name;
}
```
- **Implements:** V-7 (file upload, CWE-434) + null-byte defense (don't trust extension). Validates
  **real MIME**, enforces size, randomizes filename.
- **Anti-pattern to flag:** trusting `$_FILES['...']['type']` (client MIME), extension-only checks
  (defeated by `%00.md` — see JUICE-SHOP Poison Null Byte), predictable names, storing in web root.

## 7. Brute-force throttling

```php
function record_login_attempt(string $email, bool $success): void { /* INSERT prepared */ }

function is_locked_out(string $email): bool {
    // COUNT failed attempts within LOCKOUT_MINUTES; lock if >= MAX_FAILED_ATTEMPTS
    return $failed >= MAX_FAILED_ATTEMPTS; // 5 attempts / 10-minute window
}
```
- **Implements:** A-7. Per-account/IP counting within a time window; config `MAX_FAILED_ATTEMPTS=5`,
  `LOCKOUT_MINUTES=10`. Consider MFA to avoid lockout-as-DoS.
- **Anti-pattern to flag:** no attempt tracking, unlimited tries, counters stored client-side.

## 8. Fail-closed error handling (no leakage in production)

```php
function register_error_handlers(): void {
    if (DEBUG) {                       // local only
        ini_set('display_errors', '1'); error_reporting(E_ALL);
    } else {                           // production: hide details, log fully, show generic 500
        ini_set('display_errors', '0'); error_reporting(0);
        set_exception_handler(function (Throwable $e): void {
            file_put_contents($logFile, /* full message + trace */, FILE_APPEND | LOCK_EX);
            require __DIR__ . '/../errors/500.php'; exit;     // generic page to user
        });
        set_error_handler(function ($sev,$msg,$file,$line): bool {
            file_put_contents($logFile, /* details */, FILE_APPEND | LOCK_EX); return true;
        });
    }
}
```
- **Implements:** E-1/E-3. **Fail closed**; full detail to server logs, generic page to the user.
  `DEBUG` is config-driven (`APP_ENV`) and **off in production**.
- **Anti-pattern to flag:** `display_errors=1` in prod, stack traces/SQL in responses, swallowing
  errors silently (fail-open).

## 9. Structured logging channels

```php
function write_log(string $channel, string $level, string $message, array $context = []): void {
    // [timestamp] [level] [IP] [User:id(email)] message | k=v, ...   → logs/{channel}_{date}.log
}
function log_auth($l,$m,$c=[])        { write_log('auth', $l,$m,$c); }
function log_transaction($l,$m,$c=[]) { write_log('transaction',$l,$m,$c); }
function log_admin($l,$m,$c=[])       { write_log('admin', $l,$m,$c); }
```
- **Implements:** E-4 + A-13. Three channels (auth / transaction / admin); each entry carries
  timestamp, IP, and user attribution (non-repudiation).
- **Anti-pattern to flag:** logging passwords/tokens/full PII; unattributed entries; world-writable
  log dirs; logs inside the web root.

## 10. Transport & error-page hardening (`.htaccess`)

```apache
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://localhost%{REQUEST_URI} [L,R=302]   # force HTTPS

ErrorDocument 404 /secwb/Milestone1/errors/404.php        # custom error pages
ErrorDocument 500 /secwb/Milestone1/errors/500.php
ErrorDocument 403 /secwb/Milestone1/errors/404.php        # 403 → 404 (no existence leak)
```
- **Implements:** A-4 (force HTTPS) and E-3 (no banner/version/existence leakage via custom pages).
  Returning 404 for 403 avoids confirming protected resources exist.
- **Anti-pattern to flag:** mixed HTTP/HTTPS, default server error pages, distinct 403/404 enabling enumeration.

---

**References:** REF-IMPL (`security.php`, `db.php`, `auth.php`, `logger.php`, `config.php`, `login.php`,
`registration.php`, `_htaccess`), cross-mapped to domain controls A-2/A-3/A-7, S-3/S-5, Z-2, V-4/V-6/V-7,
E-1/E-3/E-4.


---

# 04 — Glossary, Misconceptions & Cheat Sheet

Fast-lookup definitions, the common misconceptions ("exam traps") that are *probably wrong*, and a
minimum-value cheat sheet of memorizable thresholds. Useful for an AI reviewer to resolve terminology
quickly and to sanity-check claims in a system under review.

---

## A. Glossary (core terms)

- **CIA Triad** — Confidentiality (who can see data), Integrity (accuracy/no undetected change),
  Availability (usable when needed).
- **AAA** — Authentication (prove identity), Authorization (what you may do), Accounting/Auditing.
- **Non-repudiation** — proof an action happened and who did it (signatures, immutable logs).
- **Asset / Vulnerability / Threat / Threat Agent / Attack / Impact / Likelihood / Control** — the risk chain
  (see `01-foundations`). `Risk = Likelihood × Impact`.
- **Authentication vs Authorization** — *who you are* vs *what you can do*; passing one never implies the other.
- **STRIDE** — Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.
- **DREAD** — Damage, Reproducibility, Exploitability, Affected users, Discoverability (scoring model).
- **PASTA** — Process for Attack Simulation and Threat Analysis (risk-centric 7-stage method).
- **DFD** — Data Flow Diagram (entities, processes, data stores, data flows).
- **Trust boundary** — point where data/control crosses between zones of differing trust.
- **DAC / MAC / RBAC / ABAC** — owner decides / system decides (labels) / role decides / context decides.
- **BOLA / IDOR** — Broken Object-Level Authorization: accessing another user's object by changing an ID.
- **CSRF** — Cross-Site Request Forgery: forcing a logged-in user's browser to make an unwanted state change.
- **XSS** — Cross-Site Scripting: injecting script that runs in another user's browser.
  - **DOM XSS** — client-only (input → DOM, never leaves browser).
  - **Reflected XSS** — server bounces input back once in the response.
  - **Persistent/Stored XSS** — stored on the server, fires repeatedly for every viewer.
- **SQL Injection** — input interpreted as SQL code; fixed by parameterized queries.
- **Session hijacking** — stealing a session ID (≈ stealing the identity it represents).
- **Session fixation** — attacker fixes a known session ID before login; fixed by regenerating on login.
- **CSPRNG** — Cryptographically Secure Pseudo-Random Number Generator (for tokens/keys/IDs).
- **KDF** — Key Derivation Function; for passwords use slow ones (Argon2id, bcrypt, scrypt, PBKDF2).
- **AEAD** — Authenticated Encryption with Associated Data (AES-GCM, ChaCha20-Poly1305).
- **IdP / SSO** — Identity Provider / Single Sign-On (authenticate once, signed token grants access).
- **Claims** — assertions in a security token (subject, issued-at, expiration, audience).
- **OAuth 2.0 / OIDC** — delegated authorization / identity layer on top of OAuth.
- **mTLS** — mutual TLS (both client and server present certificates).
- **Salt / Work factor** — per-user random added before hashing / tunable cost making hashing slow.
- **Fail closed / Fail open** — deny on error (secure) / allow on error (insecure).
- **Least privilege / Defense in depth / Complete mediation** — minimum access / layered controls / check every access every time.

---

## B. Misconceptions — statements that are *probably WRONG*

| ❌ Claim | ✅ Reality |
|---|---|
| "HTTPS alone is enough." | You also need the `Secure` cookie attribute (and `HttpOnly`, `SameSite`). |
| "Client-side validation ensures security." | Server-side is the real gate; client validation is UX only. |
| "Blacklist is the best validation." | **Whitelist** (allow-list) is best. |
| "Hidden URL = secure." | Obscurity ≠ security; enforce server-side access control. |
| "Specific error messages help users." | They help attackers more (enumeration); use generic messages. |
| "Fail Open is the safe default." | **Fail Closed** is. |
| "Session ID can contain user data." | It must be meaningless/opaque. |
| "Input validation prevents SQLi." | **Parameterized queries** prevent SQLi (validation is defense-in-depth). |
| "MD5 and SHA-1 are fine." | Both are obsolete/insecure. |
| "Store keys in source code." | Never — use a KMS / secret manager. |
| "The `Secure` attribute encrypts the cookie." | It only restricts the cookie to HTTPS transport; it is not encryption. |
| "SHA-256 is fine for passwords." | SHA-256 isn't *broken*, but it's **too fast** for passwords — use Argon2id/bcrypt. |
| "Token sent via POST is encrypted." | HTTPS encrypts GET and POST equally; POST is used to avoid logs/history/referrer exposure, not for encryption. |
| "The session cookie is signed by the IdP's key." | The cookie is signed by the **relying website's own key (K2)**; the IdP's key (K1) signs the **token**. |
| "Avalanche effect = one-way." | They're different properties: avalanche = small input change flips ~half the output bits; one-way = infeasible to reverse. |

---

## C. Minimum-Value Cheat Sheet (memorize these)

### Formulas
- **Risk** = Likelihood × Impact
- **DREAD** = (Reproducibility + Exploitability + Discoverability) × (Damage + Affected Users)

### Session ID minimums
- **Length ≥ 128 bits** · **Entropy ≥ 64 bits** · Name = generic · Content = meaningless/opaque
- **Regenerate on login** (anti-fixation); invalidate on logout; idle timeout (ref impl: 30 min / 1800s).

### Cookie attributes
- **Secure** = sent only over HTTPS (≠ encryption) · **HttpOnly** = no JS access (`document.cookie`)
- **SameSite** = cross-site send policy (Lax/Strict) · **Domain/Path** = scope · **Max-Age** = lifetime
  (no Max-Age ⇒ session cookie that dies when the browser closes).

### Crypto quick reference
- **Symmetric** = 1 key, fast (**AES** ✅) · **Asymmetric** = 2 keys, slow (**RSA** ✅) ·
  **Hybrid** = both (TLS/SSL) · **Hashing** = one-way (**SHA-256** ✅ for integrity, **not** passwords).
- **Passwords:** Argon2id / bcrypt (slow, salted). **AVOID:** DES, 3DES, MD5, SHA-1; never raw AES-ECB
  (use AEAD: AES-GCM / ChaCha20-Poly1305); unique CSPRNG nonces/IVs, never reused.
- **TLS handshake:** browser encrypts the symmetric session key with the **server's public key**; only
  the server's **private key** can decrypt it → then fast symmetric encryption for the session.

### Validation ranking
- **Whitelist ✅ > Blacklist ⚠ > Sanitize ⚠ > None ❌**. Normalize **then** validate. Validate server-side.

### XSS types
- **DOM** = client-only · **Reflected** = server bounces once · **Persistent** = stored, fires repeatedly.
  Fix all with context-aware **output encoding** + **CSP**.

### Auth error message
- One generic message **and** identical HTTP status for all failures: *"Login failed; invalid user ID or password."*

### Modern auth (IdP/SSO) keys
- **K1 = IdP key** signs the **token**; **K2 = website's own key** signs the **session cookie**. Validate
  token **signature + issuer + audience + expiration**; reject `alg=none`.

### Access-control models
- **DAC** owner decides · **MAC** system decides (labels; e.g., Secret/Top-Secret) · **RBAC** role decides ·
  **ABAC** context decides (time/location/device).

### Fail-safe
- **Fail Closed** = deny on error = secure default.

### Top recurring root cause
- **Never trust the client.** Validate/derive identity, role, price, quantity, and payment server-side.

**References:** LEC-FINAL-REVIEW (cheat sheet, MCQs, exam traps), LEC-FINAL-REVIEW-V2 (IdP keys, SHA-256
nuance, avalanche≠one-way, POST≠encryption), PRINCIPLES-REF.
