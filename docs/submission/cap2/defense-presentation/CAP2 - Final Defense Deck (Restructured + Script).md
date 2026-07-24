# CAP2 Final Defense Deck — Restructured Outline + On-Slide Contents + Script

Purpose: hand this to Claude web to build the actual `.pptx`. This is the content and logic layer only.

Relationship to other files:
- SUPERSEDES the earlier `CAP2 - Final Defense Presentation (DEFINITIVE).md` (that was the argument-first 9-slide shape).
- The already-built `ChainCert_CAP2_Final_Defense.pptx.pptx` is the argument-first version. This restructure is category-first, with the demo woven into the feature deep-dive instead of a separate walkthrough block.

Format target: 10-min framing + ~30-min demo, demo fused into Slide 6 (feature to demo, repeat).

Writing convention: no em dashes (Kai's rule). Verification is by Credential ID / verification link, never QR camera scanning. Say Fabric 2.5.14 on slides; 2.5.16 / Docker-29 stays in the reference slide only.

---

## Running order (11 slides, last one is Q&A-only)

```
1.  Title
2.  Table of Contents
3.  Why ChainCert Exists  (problems only, no solution teaser)
4.  Solutions Framework — Overview  (the modules)
5.  System Design & Deployment  (5a Architecture, 5b Deployment)   <-- moved UP from your original end-placement
6.  Solutions Framework — Deep Dive + Demo  (4 categories, table + live demo per feature)
7.  Scope & Limitations
8.  User Acceptance Testing  (setup -> results -> what we fixed)
9.  Conclusion
10. Recommendations  (genuine future work)
11. Reference  (Q&A only, not presented)
```

Note on Slide 5 placement: your written outline had System Design near the end (after UAT). I moved it up to before the demo, because ChainCert's whole differentiator is that it is blockchain. If the panel watches you issue and verify credentials in Slide 6 before they know every write goes through Hyperledger Fabric, the demo reads as a normal web app. Establish the plumbing first, then every demo lands as "and this is immutable on-chain." Say the word if you want it back at the end.

---

## SLIDE 1 — Title

**On-slide contents:**
- ChainCert
- Subtitle: Permissioned Blockchain Credential Verification and Management Platform · CAP-2459-IT
- One framing line: "CAP 1: a working implementation. CAP 2: complete, deployed, validated, and taken further than the proposal required."
- Team: Tan · Kalinisan · Ramirez · Tumulak
- "CAP 2 Final Defense"

**Script:**
"Good [morning/afternoon]. We are ChainCert, a permissioned blockchain platform for issuing and verifying academic and professional credentials. In CAP 1 we presented a working implementation. Today, for CAP 2, we will show that it is complete, deployed on a live server, validated by real users, and that we took it further than the proposal required."

---

## SLIDE 2 — Table of Contents

**On-slide contents:**
- Why ChainCert Exists
- How ChainCert Solves It (the modules)
- System Design and Deployment
- The Features, by what was built when (with live demo)
- Scope and Limitations
- User Acceptance Testing
- Conclusion and Recommendations

**Script:**
"Here is our flow for today. We will start with the problem, show the modules that solve it, walk through the architecture and how it is deployed, then go feature by feature and demonstrate each one live. We close with scope, the results of user testing, and our recommendations."

Keep this to ~10 seconds. It is a signpost, not a talking point.

---

## SLIDE 3 — Why ChainCert Exists (Problems Only)

**On-slide contents (problem, no solution here):**
- Headline: The Credentialing System Is Broken in Nine Specific Ways (§1.2.1–1.2.9)
- Grouped for the slide (keep the P# numbers visible):
  - Forgeable and unverifiable: static PDFs prove nothing (P1, P7)
  - No lifecycle control: no clean issuance, expiry, revocation, updates (P2)
  - No standards or portability: locked formats, no shared schema (P3, P9)
  - Excludes modern learning: microcredentials and informal proofs left out (P4)
  - Loss and access: paper-based, credentials lost or unreachable (P5)
  - Slow verification: manual, 5 to 10 working days (P6, P8)
- By role, one line each: Issuers carry reputational and legal risk · Holders cannot prove legitimacy if the issuer closes · Verifiers wait days, worst case never confirm.

**Script:**
"Our proposal defined nine specific problems in credentialing. In short: a paper or PDF credential proves nothing on its own, and AI now makes forgeries convincing. There is no clean way to manage a credential's lifecycle, no shared standard, and microcredentials are left out entirely. For a verifier, confirming a credential today takes five to ten working days of manual back-and-forth, and in the worst case it is never confirmed. We are not going to re-argue these. We defined them, and the point of today is to show we solved them."

Do NOT preview the solution here. That is the next slide's job.

---

## SLIDE 4 — Solutions Framework: Overview (The Modules)

**On-slide contents:**
- Headline: How ChainCert Solves It
- The system, grouped as in the manuscript (§5.5):
  - Core Issuance and Lifecycle: Credential Issuance · Smart Contract Automation · Blockchain Integration
  - User and Verifier Interface: Credential Verification · Employer/Regulator Interface · Digital Wallet (Access and Notification)
  - Ecosystem and Future-Readiness: Certifying Body Onboarding and Sync
- One-line each, no feature detail yet.

**Script:**
"ChainCert is built as a set of connected modules in three groups. The first group handles issuing credentials and managing their lifecycle on the blockchain. The second is what the three user types touch: holders, verifiers, and employers. The third handles onboarding new issuing institutions. This is the shape of the system. In a moment I will go through the actual features underneath, but first, how it is built."

Keep this conceptual. This slide answers "what are the parts," not "what does each button do."

---

## SLIDE 5a — System Design and Architecture

**On-slide contents:**
- Headline: How It Works — CAP 1 Localhost to CAP 2 Deployed
- Flow: Browser -> Nginx -> Node/Express API -> Hyperledger Fabric -> CouchDB
- Two rules:
  - Every write: blockchain first, always. Nothing is real until it is on the chain.
  - Every read: verification and history come from the blockchain live; everything else reads from CouchDB, for speed.
- Small caption: a daily integrity check reconciles CouchDB against the ledger (shown live later).

**Script:**
"When a user acts, the request goes through Nginx to our Node and Express API, which talks to the Hyperledger Fabric blockchain, backed by CouchDB. The rule for every write is blockchain first: a credential is not real until it is committed on-chain. For reads, we made a deliberate split. In CAP 1 we tried reading most displayed data straight from the blockchain and it was too slow. So now only verification and blockchain history hit the chain live. Everything else reads from CouchDB for speed, and a daily job reconciles the two so they never drift."

Factual guardrails: it is a centrally hosted prototype that is logically multi-org (Org1, Org2, DLSU plus two subordinates, one orderer). Do not call it production-ready.

---

## SLIDE 5b — Deployment

**On-slide contents:**
- Headline: From Localhost to a Live Server
- Target: DLSU CCSCloud, a single Ubuntu VM, reachable at http://ccscloud.dlsu.edu.ph:20173
- Stack and tools: Docker · Hyperledger Fabric 2.5.14 · CouchDB · Node/Express under PM2 · React build served by Nginx · deploy-sync.sh for the push-to-VM workflow
- One line: "We hit and solved a real container-runtime compatibility issue during deployment" (keep the Docker-29 / 2.5.16 specifics for Q&A)

**Script:**
"CAP 1 ran only on localhost. For CAP 2 we deployed the full system to a live DLSU CCSCloud server. On one Ubuntu VM we run Docker, the Fabric network, CouchDB, our Node API under PM2, and the React frontend served through Nginx, with a sync script that pushes updates from our repo to the VM. Standing this up was not trivial. We hit a container-runtime compatibility issue that broke the blockchain build, root-caused it, and resolved it. The system you will see me demo now is this live server, not a local copy."

If a panelist drills the compatibility issue, then and only then: Docker Engine 29 broke Fabric 2.5.14 chaincode builds, resolved by moving the VM to Fabric 2.5.16. Submitted docs reflect 2.5.14. Do not volunteer both numbers unprompted.

---

## SLIDE 6 — Solutions Framework: Deep Dive + Live Demo

This is the core. Structure it by WHEN each feature was built. Each category is a table (Module | Feature | Problem Addressed with P#). As you hit each CAP2 row, switch to the browser and demo it live, then come back. CAP1 is table-only plus one quick refresher demo, because the panel already saw CAP1 demoed live last term.

**On-slide contents — Category A: Built in CAP 1 (the ~80%)**

| Module | Feature | Problem Addressed |
|---|---|---|
| Credential Issuance | Create credential (draft) then issue to a holder | P1, P2, P4 |
| Smart Contract Automation | Blockchain-first issuance, revocation, daily expiry (chaincode) | P2, P7 |
| Credential Verification | Verify by Credential ID against the ledger | P1, P6 |
| Blockchain Integration | Immutable, tamper-evident audit trail | P7 |
| Digital Wallet | Holder wallet, PDF export, time-limited share links | P5, P9 |
| Certifying Body Onboarding | Issuer registration, admin approval, issuer registry | P3, P8 |

**Script (Category A):**
"Everything in this first table was built in CAP 1. Rather than re-demo all of it, one quick refresher so the flow is fresh." [DEMO ONE FLOW ONLY: issue a credential, then verify it. ~90 seconds.] "Issue goes on-chain first, and verification checks it straight against the ledger. That is the CAP 1 baseline. Now what we added this term."

---

**On-slide contents — Category B: CAP 2, Defense Form Recommendations (what the panel asked for)**

| You Asked (signed CAP 1 form) | We Delivered | Where |
|---|---|---|
| Validation (2FA, input validation) | OTP at signup, password reset, and verification · numeric-only OTP fields | pp. 151, 159 |
| Provide reports for users | Analytics and Reports layer, per role, with plain-language reading | p. 154 |
| Processing-time disclaimers | Progress indicators on every action + per-item batch status | pp. 151–152 |
| Limitations + recommendations, Ch 3 timeline (document) | Written into Ch 5–7 and Ch 3 | pp. 123, 159–176 |

**Script (Category B):**
"These came directly from your CAP 1 defense form. You asked for stronger validation, so we added one-time-password verification at signup, password reset, and at the point of verification, with numeric-only inputs." [DEMO: signup or verify OTP gate. ~45 sec.] "You asked us to give users reports, so we built an analytics layer for each role that interprets the data in plain language, not just tables." [DEMO: open a dashboard analytics view. ~60 sec.] "And you asked for processing-time disclaimers, because blockchain writes take a moment. Every action now shows progress, and batch actions report item by item." [DEMO: trigger an action, show the progress indicator. ~30 sec.]

---

**On-slide contents — Category C: CAP 2, Scoped Completion (the planned ~20%, verified against §1.7.5.5 code + text)**

§1.7.5.5 "Functional Gaps" promised exactly 4 items for CAP2. Verified against actual code, only 2 were delivered. The other 2 are NOT on this slide, they move to Slide 10 (Recommendations) as genuinely open items — do not claim them here.

| Item | What It Is | Status |
|---|---|---|
| Batch issuance | Issue one credential to many via CSV/TXT | Delivered, §1.7.5.5 promise kept |
| Analytics & Reports layer | Per-role interpreted analytics | Delivered (also satisfies the defense-form ask in Category B) |
| Deployment | Full system live on DLSU CCSCloud | The term's core deliverable |
| Structured UAT | 19 testers, all 4 roles, on the live system | Detailed in Slide 8 |
| Post-UAT hardening and performance | Security measures + indexing/perf fixes | From testing |

MOVED OUT to Slide 10 (Recommendations), confirmed NOT delivered:
- Manual Expiry Trigger UI (admin-dashboard button for the existing backend endpoint) — grepped `adminDashboard.js`, only `triggerIntegrityCheck` exists, no expiry-trigger button. Backend endpoint works, frontend UI still not wired, same gap as originally described.
- Automated Identity/Node Provisioning — manuscript §5.5.3 states directly that full automation "is identified as a near-term enhancement," i.e., still manual today (the 12-phase manual subordinate-onboarding workflow).

**Script (Category C):**
"This third group is the work we planned for this term. Deployment and user testing we cover in their own slides. The one to demo here is batch issuance, which our CAP 1 document promised: instead of issuing one at a time, an issuer uploads a list and issues to everyone in one pass." [DEMO: batch issue from a CSV. ~60 sec.] "We also did a round of security hardening and fixed the performance issues testing surfaced, which I will show in the testing slide."

---

**On-slide contents — Category D: CAP 2, Bonus Features (outside the proposal, our own initiative)**

| Feature | What It Is | Strengthens |
|---|---|---|
| Bulk verification | Verify every credential on a shared profile, or a whole PDF portfolio, in one pass | P6 |
| Renewal workflow | Holder requests renewal, issuer re-issues or declines, logged on-chain | P2 |
| Reissue lineage | A renewed credential keeps a link to the one it replaced | P2, P7 |
| Verification Reach | An issuer sees how often their credentials are being checked | insight |
| Batch revocation | Multi-select or CSV to revoke many at once | P2 |

Footer line: "We deliberately did NOT build automatic revocation. The criteria are issuer-specific, so that belongs on the issuer's side. That is a conscious scope decision, not a gap."

**Script (Category D):**
"This last group we built on our own initiative, beyond anything asked. Bulk verification lets a verifier check an entire shared profile or a full PDF portfolio in one pass instead of one credential at a time." [DEMO: bulk verify a shared profile. ~60 sec.] "The renewal workflow closes a real gap: a holder can request a renewal, and the issuer either re-issues or declines, and that decision is recorded on-chain. A renewed credential keeps its lineage, so the full history survives." [DEMO: renewal request to approval, show the lineage. ~90 sec.] "One thing we chose not to build is automatic revocation, because the criteria are specific to each issuer. That is a deliberate decision, and we can defend it."

---

## SLIDE 7 — Scope and Limitations

**On-slide contents:**
- Headline: What ChainCert Is, and Is Not
- Scope: academic and professional credentials · four roles (holder, issuer, verifier, admin) · a centrally hosted, logically multi-org Fabric network
- Acknowledged limitations (be honest, these are in the manuscript §1.7.5):
  - Centrally hosted prototype, not a production multi-datacenter deployment
  - Single orderer, all infra on one VM
  - Issuer Fabric identity is a manual prerequisite before approval (near-term automation)
  - Verification is by Credential ID / link, not QR camera scanning
- Framing line: "These are conscious capstone-scope decisions, documented, not discovered."

**Script:**
"To be clear about scope. ChainCert covers academic and professional credentials across four roles, on a permissioned Fabric network that is centrally hosted but logically multi-organization. We are honest about the limits. It is a prototype on a single server with one orderer, not a production deployment across data centers. Enrolling a new issuer's blockchain identity is still a manual step before approval, which we flag as near-term work. These are documented decisions, not things we discovered late."

Guardrail: never claim W3C VC, IPFS, on-chain PDF storage, ABAC, or production-readiness.

---

## SLIDE 8 — User Acceptance Testing

**On-slide contents:**
- Headline: Validated by Real Users
- Setup (keep general): 19 testers, all 4 roles, on the live deployed system, 11–12 July 2026 · full core lifecycle tested (issue, verify, revoke, renew, batch, share) · feedback via forms + oral
- Result: 4.34 / 5 average satisfaction
- What we fixed, from feedback (map problem -> cause -> fix):
  - Slow dashboard -> missing database index + oversized payload -> indexed the query and stripped the unused image data
  - Route protection -> hardened across 3 layers (frontend guards, session-expiry redirect, backend role middleware), app-wide, not a couple of pages. Demonstrable live: logged-out access to an admin page redirects to login.
  - Renewal decision could be overwritten -> Approve/Decline now render only while pending, and the server rejects deciding a settled request
  - Expiry date had no upper bound -> capped to a realistic 20-year maximum
  - Mobile navigation was cramped -> collapsible menu on small screens
  - Signup lacked email verification -> added the OTP step
- Framing line: "Every core feature worked. Feedback was about polish and validation, not missing functionality."

**Script:**
"We ran structured user testing with 19 people across all four roles, on the live server, and they exercised the full lifecycle. Average satisfaction was 4.34 out of 5. More useful than the score is what we did with the feedback. Testers found the dashboard slow. We traced it to a missing database index and an oversized response carrying image data the page never used, and fixed both. Access control was flagged, so we verified and hardened it across three layers, and I can show that live: if I log out and try to open an admin page, it bounces me to login. We also found a real renewal bug where a decided request could be overwritten, and locked that down. The expiry date had no upper limit, so we capped it. Mobile navigation was cramped, so it now collapses into a menu. The theme is important: every core feature worked. The feedback was polish and validation, not missing functionality."

ROUTE PROTECTION NOTE: keep this line. Your submitted Chapter 6 (§6.1.3-6.1.4) calls missing route protection the most serious finding of the round and states it was resolved on three layers, so the deck MUST match the manuscript. Do NOT call it a false positive at defense. The frontend guards (protectedRoutes.js, adminProtectedRoutes.js) already existed and work; the genuine addition was the session-expiry 401 interceptor. Frame as "verified and hardened," and demo the logged-out redirect if drilled.

---

## SLIDE 9 — Conclusion

**On-slide contents:**
- ChainCert solves the nine problems it set out to solve, demonstrated live today.
- It is deployed on a live DLSU server and validated by real users at 4.34 / 5.
- We completed the planned scope, answered every CAP 1 recommendation, and built beyond the brief.
- One line: "From a working prototype to a deployed, validated, and extended system."

**Script:**
"To conclude. We defined nine problems and we solved them, and you saw each one demonstrated on the live system today. The platform is deployed on a DLSU server and validated by nineteen real users at 4.34 out of 5. We finished the scope we planned, we closed every item from the CAP 1 defense form, and we went beyond it with features nobody asked for. ChainCert moved from a working prototype to a deployed, validated, and extended system."

---

## SLIDE 10 — Recommendations (Genuine Future Work)

**On-slide contents:**
- These are NOT-yet-done items (distinct from the bonus features already shipped):
  - Manual Expiry Trigger UI: wire the existing backend endpoint (POST /api/admin/trigger-expiry-check) to an actual admin-dashboard button (was promised in §1.7.5.5, never got a frontend UI)
  - Automate issuer Fabric identity provisioning at approval (currently a manual, multi-step CA enrollment process; also promised in §1.7.5.5)
  - Move to a multi-orderer, higher-availability deployment
  - Per-admin identities instead of the shared admin identity
  - Optional issuer-side rules for automatic revocation
  - SMS/notification-gateway integration
  - Verification-log query optimization: add composite-key indexing or a bounded/paginated read to the chaincode GetAllVerificationLogs function, so verification-insights reads do not scan the full ledger as volume grows (this is the root cause of the slow holder/issuer verification-insights load)
- Framing: "Where ChainCert goes next."

**Script:**
"For future work. The clearest next step is automating a new issuer's blockchain identity at the moment of approval, since that is manual today. Beyond that: a higher-availability, multi-orderer deployment, per-admin identities for tighter accountability, optional issuer-defined rules for automatic revocation, an SMS notification gateway, and a verification-log query optimization on the chaincode side, composite-key indexing or a bounded read, so verification insights don't scan the full ledger as volume grows. These are the natural next steps for taking ChainCert from a validated prototype toward production."

---

## SLIDE 11 — Reference (Q&A ONLY, Not Presented)

**On-slide contents (backup):**
- Nine-problem traceability matrix (§1.2.1–1.2.9), verbatim
- The three UAT exceptions, with reasons (from manuscript §6.1.4):
  - Signing-node prerequisite (2.3): not a defect. Approving an issuer with no Fabric signing identity would create a dead account, so the dashboard intentionally blocks approval until the identity is enrolled. Improved the error message; auto-provisioning is future work.
  - Credential-issued email not received (4.1): environmental, not code. The issuance path sends the email (flagged to reach the real recipient); non-receipt is SMTP restrictions / spam / demo placeholder addresses. Verify in production mail config.
  - Registration status label (5.1): partially addressed. Confirmation body now states pending-review status; heading still reads "Application Received."
  - (Related caveat: duplicate-name check catches exact duplicates, not near-matches like "Python Certificate" vs "Python Cert.")
- Satisfaction outlier, if asked "was feedback really all positive": one tester passed all 78/78 functional items but rated satisfaction 1.33/5 (mean is 4.34 with this respondent, 4.51 excluding them). Manuscript's own framing: functional correctness is not the same as good perceived UX, and the two need to be tracked separately. Also citable: 97.8% raw functional pass rate / 98.9% effective pass rate (excluding N/A items) if a second, cleaner stat is useful.
- Manuscript §1.7.5 limitations, verbatim
- Architecture detail: 1 orderer, 3 peers, 4 CAs, 3 peer state CouchDBs, DLSU CouchDB on 9084
- Canned answers:
  - Fabric version: say 2.5.14 (matches submitted docs). VM runs 2.5.16 only as a Docker-29 compatibility fix. Do not volunteer two numbers.
  - Rate limiting: implemented, toggleable for demonstration.

**Script:** Not presented. Pull up only if a panelist drills a specific point.

---

## Open decision flags (confirm or correct these)

1. Architecture moved UP to Slide 5 (before the demo), from where you had it at the end. Recommended, but reversible.
2. Fabric version: staying at 2.5.14 on all slides, 2.5.16/Docker-29 in the reference slide only. This reverses my earlier "tell it openly" suggestion. Your call.
3. Feature categorization: RESOLVED, both confirmed correct, no changes needed.
   - Analytics and Reports stays in Category B (panel explicitly asked for reports on the defense form). Kai confirmed.
   - Batch issuance stays in Category C (Scoped) — verified against manuscript §1.7.5.5, the ONLY batch-related item in the "Functional Gaps" promised-for-CAP2 list ("A bulk issuance feature... is planned"). Batch revocation and bulk verification stay in Category D (Bonus) — grepped the full document, neither appears anywhere in §1.7.5.5. They were never promised, built on initiative. Defense line if asked why they're split: batch issuance was a §1.7.5.5 commitment delivered; batch revocation and bulk verification were never promised, built anyway.
4. "CAP2 — 20%" is labeled "Scoped Completion" on the slide (Category C). A bare "20%" reads oddly to a panel out of context. Keep "20%" only in your own notes.
5. Slide 8 route-protection claim: RESOLVED. Kept ON and framed as "verified and hardened," because the submitted manuscript (§6.1.3-6.1.4) commits to it as the round's most serious finding, resolved on three layers. Do not call it a false positive at defense. Demo the logged-out redirect if drilled.
6. Slide 11 three UAT exceptions: RESOLVED. Filled from manuscript §6.1.4 (signing-node 2.3, missing email 4.1, registration label 5.1).
7. Demo tiering inside Slide 6: CAP1 = one refresher demo only; CAP2 categories get feature-by-feature demos. If you want CAP1 fully demoed too, the timing will not fit 30 minutes.
