# Foundations

> Foundational security goals and design principles every other control maps back to. When reviewing any system, confirm the design respects these first — most specific vulnerabilities are downstream violations of one of them.

## Contents

1. [01 — Security Foundations](#01-security-foundations)


---

# 01 — Security Foundations

Foundational goals and design principles that every other control in this KB maps back to.
When reviewing any system, an AI should first confirm the design respects these, because most
specific vulnerabilities are downstream violations of one of them.

---

## 1.1 Core Security Goals — CIA + AAA + Non-Repudiation

Every security decision should map back to these pillars. For every feature, ask:
**"How does this affect CIA + AAA + NR?"**

### Confidentiality
- **Principle:** Only authorized parties can see data.
- **Requirement:** Enforce encryption, access control, and data minimization so unauthorized actors cannot read data.
- **Risk:** Data leakage / disclosure of secrets and PII.
- **Mitigations:** Encryption in transit and at rest, access control, least-privilege reads, data minimization.
- **Example failure:** Data leakage.
- **Severity:** Critical
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW

### Integrity
- **Principle:** Data and system state cannot be altered undetected.
- **Requirement:** Use hashing, signatures, checksums, transactional integrity, and audit trails to detect/prevent tampering.
- **Risk:** Silent data tampering (e.g., price/quantity manipulation, record forgery).
- **Mitigations:** HMAC/signatures on critical data & tokens, append-only/WORM logs, server-side integrity checks across trust boundaries.
- **Example failure:** Data tampering.
- **Severity:** Critical
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW, THREAT-MODEL-COFFEE

### Availability
- **Principle:** Systems remain usable and performant when needed.
- **Requirement:** Provide redundancy, rate limiting, DDoS protection, backups, and capacity planning. (Worked example target: 99.99% availability.)
- **Risk:** Downtime / denial of service.
- **Mitigations:** Redundancy & fault tolerance, rate limiting, resource limits, backups + tested restore, autoscaling.
- **Example failure:** System downtime.
- **Severity:** High
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW, THREAT-MODEL-COFFEE

### Authentication (AAA)
- **Principle:** Strongly identify *who/what* is calling the system.
- **Requirement:** MFA for sensitive actions, standards-based auth (OAuth2/OIDC for web/mobile, mTLS/service accounts for services), hardware keys where warranted.
- **Risk:** Impersonation / spoofing.
- **Severity:** Critical
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW

### Authorization (AAA)
- **Principle:** Enforce fine-grained "who can do what."
- **Requirement:** RBAC/ABAC, least privilege, attribute/context-based checks; separate identity from permissions.
- **Risk:** Privilege escalation, unauthorized access to resources.
- **Severity:** Critical
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW

### Non-Repudiation
- **Principle:** Prove that an action happened and who did it.
- **Requirement:** Digital signatures, immutable/append-only logs, secure timestamps.
- **Risk:** Users/staff deny actions; no forensic trail; fraud is unprovable.
- **Severity:** High
- **References:** PRINCIPLES-REF, LEC-FINAL-REVIEW, THREAT-MODEL-COFFEE

---

## 1.2 The Risk Model

- **Core equation:** `Risk = Likelihood × Impact`.
- **The chain:** An **Asset** (data) has a **Vulnerability** (weakness). A **Threat** exploits it.
  A **Threat Agent** carries it out as an **Attack**. Damage = **Impact**; probability = **Likelihood**.
  A **Control** is what you put in place to reduce risk.
- **Risk management first:** Identify assets, threats, and attacker capabilities, then prioritize
  controls with the highest risk reduction per unit effort.
- **DREAD scoring:** `Risk = (Reproducibility + Exploitability + Discoverability) × (Damage + Affected Users)`.
- See `Reference.md#04-severity-risk-scoring` and `Reference.md#04-threat-modeling-reference` for detail.
- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2

---

## 1.3 The 10 Security Principles (course canon)

These ten are the canonical secure-design checklist. An architecture review should explicitly
confirm each is satisfied.

1. **Minimize Attack Surface** — Remove unnecessary features, endpoints, services, files, and directories. (Exposed `/ftp` directories and forgotten backups are classic violations.)
2. **Secure Defaults** — Ship hardened out-of-the-box; do not rely on optional "turn on security" flags.
3. **Least Privilege** — Users and code get only the minimum access needed; spans web-server config to business logic.
4. **Defense in Depth** — Layer controls so failure of one does not collapse security (e.g., WAF + auth + input validation + DB permission isolation).
5. **Fail Securely (Fail Closed)** — On error, deny access by default; only fail open with explicit business justification.
6. **External Systems Are Insecure** — Treat all external/third-party systems and the client as untrusted; validate everything that crosses a trust boundary.
7. **Separation of Duties** — Split powers so no single actor can complete a sensitive action alone; separate signing/encryption keys, separate roles.
8. **Security Through Obscurity ≠ Security** — Assume the attacker knows your design; never rely on hidden URLs/paths. (Juice Shop's admin page hidden only in client-side JS is a violation.)
9. **Simplicity (Economy of Mechanism)** — Keep security mechanisms simple enough that developers can reason about them; complex/fragile policies break.
10. **Fix Issues Correctly** — Find and fix root causes, validate the fix, and check for the same class of bug elsewhere.

- **References:** LEC-FINAL-REVIEW, LEC-FINAL-REVIEW-V2

---

## 1.4 Extended Secure-by-Design Heuristics

Applied *before touching code* (superset/expansion of the 10 principles above):

- **Fail-safe defaults (default deny):** Deny by default; only explicitly allowed operations permitted (firewall rules, authorization checks).
- **Complete mediation:** Every access is checked **every time** — never trust cached permissions across security boundaries.
- **Open design:** Don't rely on obscurity; secrets should be only *keys*, not the design.
- **Work factor:** Make attacks cost more than the value to the attacker (strong KDFs, high-entropy tokens, rate limiting, anomaly detection).
- **Assume breach:** Design as if an attacker will eventually get in — segmentation, zero trust, strong logging and detection.
- **Economy of mechanism:** Minimal, auditable security-critical code paths.
- **Risk management first:** Prioritize by risk reduction per unit effort.
- **Defense in depth:** Independent, layered controls.
- **Least privilege everywhere:** Every process, user, microservice, and API token.

- **References:** PRINCIPLES-REF

---

## 1.5 Architectural Requirements (non-functional security context)

A secure architecture balances:
- **Security** — enforce authentication, encryption, secure communication.
- **Scalability** — support more users/data without degradation.
- **Modularity** — loosely coupled components for safer maintenance (enables centralized security routines).
- **Reliability** — prevent single points of failure via redundancy and fault tolerance.
- **Compliance** — follow applicable industry standards (e.g., GDPR, HIPAA, PCI DSS, OWASP ASVS).

- **References:** LEC-SECURE-CODING (Lec 1.3), PRINCIPLES-REF

---

## 1.6 Trust Boundaries (foundational concept for all reviews)

- **Principle:** A trust boundary is any point where data or control crosses between zones of
  differing trust. All input crossing *into* a higher-trust zone must be validated/authorized there.
- **Canonical boundaries (from worked model):**
  - The **client side is untrusted** — all input originating there must be validated on the server.
  - The server **trusts the client for basic UI interactions but NOT for data integrity or authorization decisions.**
  - The database trusts calls from the application server's identity (so app-server compromise = data compromise).
  - **Third-party services are external and only partially trusted** — channels are secured, but data *received* from them is still validated.
- **Review action:** For each trust boundary, confirm validation, authentication, authorization, and encryption are enforced on the trusted side.
- **References:** THREAT-MODEL-COFFEE, PRINCIPLES-REF

---

## 1.7 Secure SDLC (foundational lifecycle)

Security must be built into how code is written and shipped (detail in `02-domains/10-...`):
- Integrate **threat modeling** into early design for new features.
- Add security gates to **CI/CD**: SAST, DAST, dependency scanning, container scanning.
- **Peer review with security checklists** (auth, input validation, logging, error handling) on each PR.
- Maintain an **asset inventory** and track software versions; run regular vuln scans with timely remediation.
- **Security must not be an afterthought** — design it in from the start (key lesson from practical exploitation).
- **References:** PRINCIPLES-REF, JUICE-SHOP, LEC-SECURE-CODING
