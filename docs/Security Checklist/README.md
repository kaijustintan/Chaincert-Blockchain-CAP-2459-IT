# Security Knowledge Base (AI-Readable Security Review Framework)

> **Purpose.** A consolidated, normalized security reference extracted from a set of source documents
> (secure-development lecture material, a security-principles reference, a worked threat model, a
> security policy, OWASP Threat Dragon STRIDE models, an OWASP Juice Shop attack catalog, and a real
> PHP reference implementation). It is **optimized for consumption by another AI system** to perform
> security reviews, threat assessments, vulnerability analysis, secure-architecture validation,
> secure-coding reviews, and compliance checks.
>
> **It is not a summary.** Every meaningful, actionable security requirement from the sources is
> preserved; overlapping concepts are merged and only true duplicates removed.

---

## Structure (4 category files + this index)

The KB is organized as **one Markdown file per category** for fast navigation. Each file opens with a
clickable Contents list that jumps to every section inside it.

| File | What it contains | Use it to… |
|---|---|---|
| **`Foundations.md`** | CIA + AAA + non-repudiation, the risk model, the 10 security principles + extended secure-by-design heuristics, architectural requirements, trust boundaries, secure-SDLC overview. | Establish the baseline; sanity-check a design against first principles. |
| **`Domains.md`** | All domain controls in the fixed schema, across 10 domains: authentication/identity, authorization, sessions, cryptography, data validation & web security, data protection/privacy, API security, network/infra/cloud, error handling/logging/monitoring, secure SDLC/DevSecOps/supply chain. | Look up requirements, risks, detection methods, and mitigations for a specific area. |
| **`Review-Checklists.md`** | 7 operational checklists (system, architecture, source code, infrastructure, API, database, authn/authz), each item answerable PASS / FAIL / N/A / NEEDS-EVIDENCE. | Run an actual review of an artifact and produce ranked findings. |
| **`Reference.md`** | Threat-modeling methodology (STRIDE/DREAD/PASTA), attack→CWE catalog, severity/risk scoring, the full worked coffee-app threat model (template), Juice Shop attack→principle map, secure-coding patterns, glossary & cheat-sheet. | Score severity, classify attacks by CWE, copy a threat-model template, and resolve terminology. |

---

## How an AI should use this KB

1. **Identify the artifact under review** — system description, architecture diagram, source code, API spec, database schema, infrastructure/deployment config, or a feature/PR.
2. **Open `Domains.md`** and jump (via its Contents list) to the matching domain(s) for requirements, risks, and mitigations.
3. **Run the matching checklist in `Review-Checklists.md`.** Each question is concrete and answerable as PASS / FAIL / N/A / NEEDS-EVIDENCE.
4. **Map findings to severity** using the `Severity` field on each control and the rubric in `Reference.md` (Severity & Risk Scoring).
5. **Demand evidence** listed under each control's `Evidence Required` before marking it PASS.
6. **Cross-reference attacks** against the attack→CWE catalog and the worked example in `Reference.md`.

Every control in `Domains.md` follows a fixed schema so it can be parsed deterministically:

```
### <Control name>
- Principle:        why the control exists
- Requirement:      what must be implemented
- Risk:             what happens if omitted
- Common Vulnerabilities: associated weaknesses / attack vectors (with CWE where known)
- Detection Methods: how to identify the issue
- Mitigations:      recommended controls
- Validation Checklist: concrete review questions
- Evidence Required: what proof should exist
- Severity:         Critical | High | Medium | Low
- References:       source documents the requirement came from
```

---

## Source documents (provenance)

| Short ref | Source |
|---|---|
| `LEC-FINAL-REVIEW` | ITSECWB Long Exam — Final Review (narrative guide, Lessons 1–8). |
| `LEC-FINAL-REVIEW-V2` | ITSECWB Final Review — Updated Edition (adds IdP/OAuth, XSS deep dive, password-hashing nuance, ABAC/MAC distinctions). |
| `PRINCIPLES-REF` | Comprehensive security-principles reference (CIA/AAA/NR, design principles, identity, validation, rate limiting, network/infra/cloud, data security, logging/IR, secure SDLC, low-level controls). |
| `THREAT-MODEL-COFFEE` | Threat Model Document — Coffee Ordering Web App (worked STRIDE model + CWE map). |
| `THREAT-DRAGON-ACT2/3` | OWASP Threat Dragon STRIDE models (feedback/web-app/SQL/LDAP components). |
| `SEC-POLICY` | Annotated information-security policy (access control, monitoring/logging, segmentation, encryption, compliance). |
| `JUICE-SHOP` | OWASP Juice Shop attack catalog + reflections (practical exploitation). |
| `REF-IMPL` | PHP reference implementation (`security.php`, `auth.php`, `db.php`, `logger.php`, `config.php`, `login.php`, `registration.php`, `_htaccess`). |

> **Conflict policy.** Where sources disagree, both positions are documented and the conflict is flagged inline with `> CONFLICT:`.
>
> **Control prefixes** (used as anchors throughout): `A-` authentication, `Z-` authorization, `S-` session, `C-` cryptography, `V-` validation/web, `D-` data protection, `P-` API, `N-` network/infra, `E-` error/logging, `L-` SDLC.
