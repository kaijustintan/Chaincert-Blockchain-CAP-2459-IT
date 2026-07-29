# CAP-2459-IT-PRESENT — 10-Minute Presentation (Contents + Script)

**ChainCert** — A Permissioned Blockchain-Enabled Credential Verification and Management Platform
CAP-2459-IT · Kalinisan · Ramirez · Tan · Tumulak

> **Purpose:** content and script for the DLSU final-submission deliverable `CAP-2459-IT-PRESENT.pptx`,
> a 10-minute presentation slide deck with audio recording.
>
> **Relationship to the defense deck.** This is NOT the CAP2 defense presentation. That deck
> (`CAP2 - Final Defense Deck (Restructured + Script).md`) covered CAP2 scope with roughly 30 minutes of
> live demo woven in. This one summarizes the WHOLE capstone, has no demo, and fits 10 minutes. The
> CAP1-versus-CAP2 categorization was dropped entirely: it exists only to show a panel what was new that
> term, which a summary presentation has no obligation to do.
>
> **Writing convention:** no em dashes. Verification is by Credential ID or verification link, never QR
> camera scanning. Do not claim W3C Verifiable Credentials compliance, IPFS, or production readiness.

---

## Running order and time budget

| # | Slide | Time |
|---|---|---|
| 1 | Title | 0:20 |
| 2 | What We'll Cover | 0:10 |
| 3 | Why ChainCert Exists | 1:39 |
| 4 | How ChainCert Works | 1:25 |
| 5 | What ChainCert Does | 1:57 |
| 6 | Scope and Limitations | 0:55 |
| 7 | Validated by Real Users | 0:43 |
| 8 | Conclusion | 0:40 |
| 9 | Recommendations | 1:59 |
| | **Total** | **9:48** |

Budgeted at 140 words per minute. Nine slides, no demo, no Q&A slide, roughly 12 seconds of headroom.

---

## Slide 1 — Title

**On-slide contents**

- ChainCert
- Subtitle: A Permissioned Blockchain-Enabled Credential Verification and Management Platform
- CAP-2459-IT
- Team: Kalinisan · Ramirez · Tan · Tumulak
- Capstone Adviser: Dr. Danny Cheng
- De La Salle University Manila

**SCRIPT**

"Good day. We are ChainCert, a permissioned blockchain-enabled platform for issuing, holding, and verifying academic and professional credentials."

---

## Slide 2 — What We'll Cover

**On-slide contents**

- The problem: credential fraud and slow verification
- How ChainCert works: architecture and deployment
- What ChainCert does: core capabilities
- Scope and limitations
- Validation: user acceptance testing
- Conclusion and recommendations

**SCRIPT**

"This presentation summarizes the problem we set out to solve, how the system works, what it does, its scope, how we validated it, and our recommendations."

---

## Slide 3 — Why ChainCert Exists

**Headline:** *One Credential, From Issuance to the Moment It's Needed*

**On-slide contents**

| Problem | What Goes Wrong |
|---|---|
| No proof of authenticity | A printed or PDF credential carries no embedded proof; trust rests on appearance alone |
| No lifecycle management | Once issued, nothing tracks expiry, revocation, or updates |
| Not portable or inclusive | Locked formats block reuse elsewhere; newer credentials like microcredentials have no home; a closed issuer can erase a holder's proof entirely |
| Slow, manual verification | Confirming authenticity takes 5 to 10 working days of manual outreach |

*Evidence callout:* Interviews with HR practitioners at Avesco Marketing Corporation and Sunlife Philippines established this 5-to-10-working-day turnaround directly.

**SCRIPT**

"Picture one credential, from the moment it's earned to the moment someone needs to trust it.

A graduate receives a certificate, either printed or as a PDF. It carries no embedded proof of its own authenticity; trust rests entirely on how it looks, and a convincing forgery defeats that.

Now say the issuing institution needs to withdraw it later. There's no clean way to. Nothing tracks a credential's life after issuance, so the institution can't reach the copies already circulating to mark them revoked.

Even a fully legitimate credential struggles to travel. Every issuer designs their own layout, so there's no shared format, and anyone trying to feed it into another system ends up retyping it by hand. That same rigidity shuts out newer forms of learning too: a short course or digital badge often has no official format to be recorded in at all. And if the issuing school closes, the holder's proof can disappear with it.

So when someone finally needs to confirm this credential is real, there's no fast way left. The only option is manual outreach, and we didn't estimate that from a textbook. We interviewed HR practitioners at Avesco Marketing Corporation and Sunlife Philippines. Their answer: five to ten working days, every time. Qualified candidates walk away in that window, and time-sensitive roles stay unfilled."

*Traceability: the four themes above consolidate the manuscript's nine problems. Theme 1 = P1 + P7, theme 2 = P2, theme 3 = P3 + P4 + P5 + P9, theme 4 = P6 + P8. All nine are represented.*

---

## Slide 4 — How ChainCert Works

**Headline:** *Architecture and Deployment*

**On-slide contents**

**Flow:** Browser → Nginx → Node/Express API → Hyperledger Fabric → CouchDB

**Two rules:**

- **Every write:** blockchain first, always. Nothing exists in the database unless it was committed on-chain first.
- **Every read:** verification and blockchain history read live from the ledger. Everything else reads CouchDB, for speed.

**Deployed:** DLSU CCSCloud, single Ubuntu VM · Docker · Hyperledger Fabric · CouchDB · Node/Express under PM2 · React served by Nginx

*Caption:* A daily integrity check reconciles CouchDB against the ledger, field by field.

**SCRIPT**

"ChainCert runs as a permissioned Hyperledger Fabric network with three peer organizations on a single channel, with one deployed chaincode contract. All issuers transact through that one contract, distinguished by their Fabric identity rather than by separate contracts.

When a user acts, the request goes through Nginx to our Node and Express API, which talks to the Fabric network backed by CouchDB. The rule for every write is blockchain first, then CouchDB. No record exists in the database unless it was committed on-chain first. The ledger is the source of truth; the database is a fast-read mirror.

That raises a fair question: if dashboards read from the mirror, could a value drift out of sync? Two safeguards. Verification and blockchain history always read the ledger directly, never the mirror, so a verifier always gets current on-chain status. And a daily integrity check compares every credential in the database against its ledger record field by field, notifying administrators of any mismatch.

The system is deployed on a live DLSU CCSCloud server, not a local copy."

*Verified in code: blockchain-first verification at `verifierController.js` Step 1 ("Try BLOCKCHAIN FIRST (trust anchor)"); daily integrity cron at `sdk-server-fixed.js:503` (Phase 5 M13, 8 AM Asia/Manila).*

---

## Slide 5 — What ChainCert Does

**Headline:** *Seven Modules, Four Roles*

**On-slide contents**

| Role | What They Can Do |
|---|---|
| **Issuer** | Create and issue credentials, single or in batch · revoke with a recorded reason, single or in batch · decide renewal requests |
| **Holder** | Digital wallet with full blockchain history per credential · per-credential public or private visibility · PDF export, single or full portfolio · shareable profile links · request renewals |
| **Verifier** | Verify by credential ID, PDF, or link, no account required · verify a whole portfolio or shared profile in one pass |
| **Administrator** | Approve or reject issuers, root and subordinate · manage users · review on-chain audit logs · run integrity checks |

*Footer:* Every governance action, not just every credential, is recorded immutably on-chain. Every role also has its own reports and analytics dashboard.

**SCRIPT**

"The system is built as seven modules surfacing through four role-specific interfaces.

An issuer creates a credential and issues it to a holder, one at a time or to a whole list in a single pass. Every credential, from a diploma to a badge, follows the same structured record regardless of issuer, and that's what closes the portability gap. They can revoke, individually or in batch, with a reason recorded on-chain. They decide renewal requests.

The holder gets a wallet showing every credential and its full blockchain history. Each credential is private by default, and the holder chooses what appears on a shared profile. They can export a single credential or their whole portfolio as PDF, share a profile link, and request renewal on anything nearing expiry. Whatever they choose to share, whether a credential ID, a PDF export, or a profile link, is exactly what a verifier uses next.

A verifier needs no account. They open that credential ID, PDF, or link and get the result straight from the ledger. That single query is what replaces the five-to-ten-day manual outreach from earlier. Verification becomes instant instead of a waiting game. The result includes issuer identity, current status, and where applicable the recorded revocation reason, and a whole shared portfolio verifies in one pass.

The administrator approves issuing institutions under a two-tier model, root authorities and subordinates under them, manages users, reviews the on-chain audit trail, and runs the integrity check. Every one of those governance decisions is itself written to the blockchain. Every role also gets its own reports and analytics dashboard, turning that activity into plain-language insight."

*Verified in code: `"Badge / Micro-credential"` is a first-class credential type option (`issuerDashboardPage.js:74`); the shared schema is enforced by `CreateCredentialTemplate` (`chaincode/index.js:96`).*

---

## Slide 6 — Scope and Limitations

**Headline:** *What ChainCert Is, and Is Not*

**On-slide contents**

**Scope:** academic and professional credentials · four roles · a permissioned Fabric network, centrally hosted by design, logically multi-organization

**Acknowledged limitations:**

- Single orderer node, a single point of failure. Production needs a Raft cluster
- Central hosting is a design decision, not a constraint
- Ledger query latency is inherent; CouchDB mitigates but cannot remove it
- Issuer Fabric identity provisioning is a manual prerequisite before approval
- Verification is by credential ID or link, not QR camera scanning
- Prototype security posture: HTTP rather than HTTPS, no encryption at rest, no automated backups

*Framing line:* "The blockchain guarantees the immutability of recorded data, not the legitimacy of the data itself."

**SCRIPT**

"To be clear about scope. ChainCert covers academic and professional credentials across four roles, on a permissioned network that's centrally hosted and logically multi-organization.

Central hosting is a design decision, not a shortcoming. It means institutions don't need blockchain engineers to participate. The real limitation is the single ordering node: if it fails, the network halts, and production needs a cluster.

We're equally explicit about security. The deployment runs over plain HTTP, with no encryption at rest and no automated backup. These are standard production gaps, documented by us rather than discovered late. And to be clear about the technology itself: the blockchain guarantees recorded data can't be quietly altered. It doesn't guarantee that data was true to begin with. That responsibility stays with the issuer."

*Sourcing: every claim on this slide traces to the manuscript. Single orderer and Raft cluster, line 1686. Latency "cannot be fully abstracted away," line 1644. Central hosting as "an intentional Design 1 decision," line 1694. Immutability-versus-legitimacy, line 1658 (note: in the manuscript this appears in the narrower context of admin-approval risk).*

---

## Slide 7 — Validated by Real Users

**Headline:** *User Acceptance Testing*

**On-slide contents**

**Setup:** 19 testers · all 4 roles · on the live deployed system

**Results:** 98.9% effective pass rate · 4.34 / 5 mean satisfaction

**Two critical findings, both fixed:**

| Finding | Status |
|---|---|
| Pages reachable without authentication | Hardened |
| Slow dashboard and record loading | Three separate causes, all corrected |

*Remaining feedback:* mostly UI and UX polish, addressed.

**SCRIPT**

"We tested with nineteen people across all four roles on the live deployed system. The effective pass rate was 98.9 percent, with mean satisfaction of 4.34 out of five.

More useful than the score is what testing found, and what we did about it. Two findings were critical. First, pages including dashboards could be reached without proper authentication checks. That's now hardened. Second, dashboards and records were slow to load, from three separate causes, all of them fixed.

Most of the rest of what testers flagged was UI and UX polish: button design, page content, navigation, and readability. Those were addressed as well."

---

## Slide 8 — Conclusion

**On-slide contents**

- Nine problems defined, all addressed by the delivered system
- Deployed on a live DLSU CCSCloud server, not a local prototype
- Validated by 19 users: 98.9% effective pass rate
- Two critical findings surfaced, remediated, and re-verified
- Remaining barriers to production are infrastructural, not functional

*Framing line:* "From a working prototype to a deployed, validated, and post-UAT-hardened system."

**SCRIPT**

"To conclude. We defined nine problems in the existing credentialing ecosystem, and the delivered system addresses all nine.

The platform is deployed on a live DLSU server and validated by nineteen real users, with a 98.9 percent effective pass rate. Two critical findings surfaced during that testing, and both were remediated and re-verified on the deployed build.

With those resolved, what stands between ChainCert and a production rollout is infrastructure hardening, not core functionality. We describe it as what it is: a functionally validated, post-UAT-hardened prototype."

---

## Slide 9 — Recommendations

**Headline:** *Where ChainCert Goes Next*

**On-slide contents**

**Functional**

- Automate issuer Fabric identity provisioning at approval (currently a manual pre-step)
- Per-administrator Fabric identities (currently one shared identity, distinguished only by an email metadata field)
- Faster blockchain data retrieval
- Optional issuer-defined automatic revocation rules
- Wallet image payload trimming

**Production readiness**

- TLS termination and encryption at rest
- Automated backup and disaster recovery
- Multi-orderer, load-balanced deployment
- Full W3C Verifiable Credentials Data Model alignment

**SCRIPT**

"Our recommendations fall into two groups: changes to how the system works, and what's needed for production.

First, automating issuer identity provisioning. Today, approving a new issuer isn't just clicking a button. Before the admin can even approve, someone has to manually run a multi-step script to register that issuer's Fabric identity, create its certificate, and set up its database, all outside the dashboard. Only after that manual setup is done does clicking Approve actually work. Automating that means clicking Approve triggers the identity creation itself, instead of requiring someone to script it beforehand.

Second, per-administrator identities. Right now every administrator action on the blockchain is submitted under one shared system identity. So if two different admins approve two different issuers, the blockchain record looks identical for both. The only thing distinguishing them is a metadata field, the admin's email, attached after the fact. It isn't a real difference at the blockchain level. Per-administrator identities would make that attribution genuine rather than just a label.

Beyond those two, we want to get better at how quickly the platform fetches blockchain data, since some pages are still slow to load. We'd also add optional issuer-defined rules for automatic revocation, and trim the wallet's image payload to speed up load times.

For production readiness: transport-layer security, encryption at rest, automated backup and disaster recovery, a redundant multi-orderer deployment, and full alignment with the W3C Verifiable Credentials standard for cross-platform portability. None of these were exercised by functional testing, and all remain open before a public rollout. That's the path from a validated prototype to production. Thank you."

---

## Recording notes

- Budgeted at 140 words per minute. If you speak faster, you gain buffer; if slower, trim the third paragraph of Slide 3 first, since Slide 5 already covers portability.
- Record slide by slide rather than in one take, so a single stumble does not cost the whole run.
- Undecided: one voice throughout, or split across the four members by slide. A split reads better for a group submission but needs consistent audio levels between takes. Does not change the script either way.

---

## Q&A backup, not presented

**Endorsement policy and "do the nodes vote?"**
Fabric endorsement is not a vote on merit. Endorsing peers independently execute the same chaincode and return signed read-write sets; if the results match and the policy is satisfied, the transaction commits. Nothing is hardcoded to say yes, because there is no yes/no judgment to hardcode. ChainCert deploys chaincode without an explicit `-ccep` flag, so it inherits the channel's default application endorsement policy, and the gateway runs with service discovery enabled so the SDK selects endorsers to satisfy it.

**Are admin approvals a multi-org decision?**
No, and this is worth stating plainly if asked. Business approvals (issuer approval, root-authority approval of a subordinate) are single-admin decisions recorded immutably on-chain, not multi-organization consensus. The chaincode contains no voting, quorum, or multi-signature logic, and `LogIssuerApproval` takes a single `adminEmail`. The manuscript acknowledges the related risk at line 1658: a compromised administrator could register a fictitious institution and issue fabricated credentials the system would treat as valid, with automated institutional identity verification identified as future work. This is not otherwise documented in the paper.

**Does a QR code solve the authenticity problem?**
No. A QR code on a printed credential encodes a link or a static image, and can be copied onto a forged document or point to a page never checked against anything live. ChainCert's verification always queries the ledger directly, so the result reflects the credential's actual current status rather than merely the presence of a code.

**Why is the item count not stated on the UAT slide?**
Deliberate. The manuscript's narrative and its own appendices currently disagree on whether the instrument had 78 or 84 items, and that discrepancy is unresolved pending the Google Form response spreadsheet. The percentages quoted here hold under the manuscript's published figures. Do not volunteer an item count until the source is settled.

---

## Open flags

1. **78-versus-84 UAT item count** remains unresolved in the manuscript. This deck deliberately quotes no item count and no raw response total, so it is insulated from the outcome. The 6-page Congress paper is not; keep them in sync once resolved.
2. **Fabric version** is deliberately absent from Slide 4, so this deck cannot contradict the paper's "v2.5.14 during Capstone 1, upgraded to v2.5.16 for the Capstone 2 deployment" phrasing. Add it there if wanted, using that exact framing.
3. **No tester names anywhere.** The UAT feedback files under `docs/submission/cap2/uat/` carry real respondent names and are gitignored for that reason. Slide 7 reports themes only.
