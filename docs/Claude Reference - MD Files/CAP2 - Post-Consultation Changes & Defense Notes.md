# CAP2 — Post-Consultation Changes & Defense Notes
/*
  FILE: CAP2 - Post-Consultation Changes & Defense Notes.md
  LAYMAN (Tropang Ex): Ito yung "isang lugar" para sa lahat ng ginawa namin matapos ang July 7
  consultation ni Sir Danny — ano ang binago sa code, anong ilalagay sa capstone paper (ready
  nang i-paste), at paano sasagutin sa panel (30-sec defense answers). Kung may itatanong sa
  analytics, revoked credentials, o bakit ganito ang design — nandito ang sagot.
  TECHNICAL: Consolidated record of the CAP2 post-consultation work (code buckets C1–C17), the
  documentation deltas (D1–D8) with paste-ready capstone-paper prose + target sections, and the
  defense-framing points (P1–P9). Source of truth for the paper edits + the defense script. No
  chaincode/CouchDB schema changes were made in this whole batch (renewal rides user_notifications;
  bulk verify + Verification Reach are read-only over existing ledger data).
  DATE: 2026-07-10 (consultation 2026-07-07, adviser: Sir Danny)
*/

---

## PART A — What shipped (code), one-liners

Frontend + a few read-only/off-chain backend endpoints. **No chaincode redeploy** anywhere in this batch.

- **C1** Fixed a stale comment that wrongly claimed revoked credentials are hidden on shared profiles.
- **C2** Reworded "Not Found" tooltips (dropped "fake/forged" → "does not exist on the ledger").
- **C3** Renamed user-facing **"template" → "Credential" / "Issued credential"** (status badge shows "Draft"); internal state/values untouched.
- **C4** Donut charts print their per-slice counts as static text (no more hover-only numbers).
- **C5** Issuer **Verification Reach** report + new read-only endpoint `GET /api/issuer/my-verifications`; **removed the admin Demand Index**.
- **C6** Admin **Approval Queue & Turnaround** card (pending aging + avg approval days).
- **C7** Suspicious-Activity rows link straight to the flagged issuer in the Issuers tab.
- **C8** Removed the holder's vanity 6-month verification-trend chart.
- **C9** Removed the noisy issuer "+X% vs last month" issuance delta.
- **C10** **Bulk verification** — "Verify all" on a shared profile + PDF-portfolio upload on the verifier page; both log under an OTP-proven email.
- **C11** **Renewal requests** — holder asks → issuer approves (re-issues) / declines (reason).
- **C12** Admin **Verification Volume** (per-month usage/load signal).
- **C13** Issuer **Credentials in Circulation** health (active/expiring/expired/revoked share).
- **C14** Issuer **"revoked/expired credentials still being checked"** card (fraud/old-copy signal).
- **C15/C16** Holder Verification Insights de-duplicated (merged outcomes into the trust row; one home for per-credential check history).
- **C17** **Batch revocation** — multi-select + CSV import → loops the existing single-revoke path.

---

## PART B — Documentation updates (D1–D8)

Each item: **the fact**, **where it goes**, and a **paste-ready block** for the capstone paper. Prose is written to drop straight into the Final Document.

### D1 — Revoked credentials in exports/shared profiles: RETAIN + explain
**Where:** Defense KB (Accepted Design Decisions) + paper *Design Decisions / Data Privacy*.
**Fact:** Credentials default to `visibility: private`; a revoked one only appears in an export/shared profile if the holder deliberately made it public. Status is always clearly stamped (red "REVOKED" banner in the PDF, status pill on the profile). We keep them visible on purpose.

> **[PASTE — Design Decisions]** ChainCert intentionally keeps revoked and expired credentials visible in PDF exports and shared public profiles, always accompanied by an explicit status banner or pill. This is a deliberate design decision rather than an oversight. Three factors justify it: (1) every credential defaults to private, so a revoked credential is only exposed if the holder explicitly chose to make it public; (2) the value proposition of an immutable ledger is transparency, not concealment; and (3) there is a legitimate need — a verifier holding an older copy of a holder's CV can click through and confirm that a credential is no longer valid (for example a lapsed PRC license or an expired professional membership). The holder retains full control through the per-credential visibility toggle. As a courtesy, the "Request renewal" flow (D-none/C11) gives holders a constructive action when a credential lapses instead of leaving the revoked/expired entry as a dead end.

### D2 — "Reports" vs "Analytics" classification
**Where:** Technical Manual (new subsection) + paper *Analytics & Reports Module*.
**Fact:** Sir Danny: true analytics needs computation (rates/averages), otherwise it's a report. Our screens are already labeled honestly ("Insights", "Performance", "Analytics & Reports") and most compute rates/ratios/trends.

> **[PASTE — Analytics Module]** We distinguish reports (screens that display or count status/history with no derived computation) from analytics (screens that compute rates, ratios, or trends). Reports: the holder's at-a-glance credential status, the blockchain history / provenance timeline, and the verification proof trail. Analytics: holder Verification Insights (trust rate + 6-month context), Credential Health, issuer Issuance Performance, Revocation Self-Audit (time-to-revoke buckets and percentage revoked within 14 days), Credentials in Circulation, Verification Reach, admin Verification Result Summary, Suspicious Activity (revocation rate against a transparent threshold), Approval Queue & Turnaround (average days-to-decision), Verification Volume, and the Integrity-Check summary. Screens labelled "analytics" therefore genuinely compute; purely descriptive status/history screens are framed as reports.

### D3 — Automation reasoning (CORRECTION) + spec reconciliation
**Where:** Defense KB (Accepted Limitations — CORRECT an existing claim) + paper *Future Work*.
**Fact:** There is **one** smart contract (`chaincert`) for all issuers — issuers differ by Fabric identity/MSP, **not** by contract. The CAP1 spec's Smart Contract Automation Module promised automated expiration + revocation + renewal; we shipped **automated expiration** (`initExpiryCron`) and now **batch revocation** (C17, issuer-driven) and a human-in-the-loop **renewal request** (C11). Hardcoded rule-based auto-revocation stays out — on purpose.

> **[PASTE — Future Work / Automation]** All issuers invoke the same smart contract (`chaincert`); they are distinguished by their Fabric identity and MSP (subordinate issuers operate under a root authority's certificate authority; root authorities run their own MSP and peer), not by a separate contract. We implemented the one universal lifecycle rule — scheduled expiration — and added issuer-driven batch revocation and a human-in-the-loop renewal-request workflow. We deliberately did not hardcode rule-based automatic revocation: revocation criteria are issuer-specific (unpaid dues, unmet CPD hours, lapsed membership), so embedding one institution's policy into a shared ledger would be an anti-pattern. The correct design keeps each issuer's business rules in the issuer's own system, driving lifecycle actions through an API — which we scope as future work.

### D4 — Scope of applicability ("how low can we go")
**Where:** Paper *Scope & Limitations* / Significance.
**Fact:** The subordinate-issuer tier needs no blockchain infrastructure of its own, so the smallest viable issuer is anyone sponsored under an existing root authority.

> **[PASTE — Scope]** ChainCert supports two issuer tiers. A root authority operates its own node and MSP, which is feasible for large institutions. A subordinate issuer receives an identity under an existing root authority's certificate authority and requires no blockchain infrastructure of its own. This lowers the barrier substantially: the smallest organisation that can participate is any small issuer — a department, a training provider, even a barangay issuing IDs — that can be onboarded as a subordinate under an existing root authority. The remaining cost and governance limitation is that some entity must still operate and fund the root authority and the underlying network.

### D5 — Sustainability / handover after graduation
**Where:** Paper *Limitations / Future Work*; reference the VM Installation Manual.
**Fact:** Sir Danny's perennial concern: student-built systems lose support once authors graduate. Mitigation: env-driven config + a complete from-scratch + day-2 VM install/handover manual.

> **[PASTE — Limitations]** As a capstone prototype, long-term operation after the authors graduate is an acknowledged risk that the adviser raised explicitly. We mitigate it with an environment-driven configuration and a complete from-scratch and day-two installation and handover manual (CAP-2459-IT-VM-INSTALLATION-MANUAL), so that a successor maintainer can redeploy and operate the system without the original authors. We frame real-world deployment as future work contingent on an owning institution and a support plan, rather than as a completed production rollout.

### D6 — Integrity-checker trade-off (performance vs. consistency)
**Where:** Defense KB (Contribution) + paper *Discussion*.
**Fact:** Verification always reads the ledger live (`VerifyCredential` → `getState`), **never** the CouchDB cache. The daily integrity check protects the dashboard *display* surface, not verification. This is a deliberate performance-vs-integrity trade-off.

> **[PASTE — Discussion / Contribution]** Verification in ChainCert always reads live from the blockchain (`VerifyCredential` calls `getState` on every check); the CouchDB layer exists only to make dashboards fast. The scheduled daily integrity check reconciles the cache against the ledger to detect tampering of the *display* surface — it cannot affect a verification result, because a verifier never reads the cache. This is a conscious performance-versus-integrity trade-off: we accept slower on-demand verification in exchange for authoritative results, and we protect the cache with a periodic reconciliation rather than a per-request check that would penalise every user. We position this reconciliation design as a candidate contribution, pending a literature check confirming that comparable systems do not already do it.

### D7 — Verifier identity: email proven, name self-reported
**Where:** Technical Manual + User Manual (verification flow).
**Fact:** Before a verification is logged, the verifier proves email ownership via a 6-digit OTP; the logged email comes from the resulting `verifier_email_proof` token (2h), not the request body — so it cannot be spoofed. The verifier's *name* is self-reported and display-only.

> **[PASTE — Verification / Security]** Before a verification event is logged, the verifier confirms ownership of their email address through a one-time six-digit code. The logged email is taken from the resulting proof token, not from the request body, so it cannot be spoofed. The verifier's name is self-reported and treated as display-only. Reports therefore attribute a verification to a cryptographically proven email address plus an unverified display name. The same proof mechanism now backs bulk verification (C10): a recipient of a private profile link has already proven their email through the link's own one-time code, so bulk checks are logged under that proven email without a second prompt; public-link visitors prove an email once before the first bulk check.

### D8 — Demand Index → issuer "Verification Reach" (reframe)
**Where:** Technical Manual (analytics section).
**Fact:** The admin Demand Index (verify-to-issue ratio by type) was removed — popularity is not something an admin can act on, and it does not indicate credential quality. The same underlying data now powers an issuer-facing **Verification Reach** report.

> **[PASTE — Analytics Module]** The admin "Demand Index" (verification-to-issuance ratio per credential type) was removed. Popularity of a credential type is not an actionable signal for a chain administrator and does not indicate a credential's quality — only its issuer can judge that. The same underlying verification data now powers an issuer-facing "Verification Reach" report, which shows an issuer how often the credentials they have issued are actually verified by third parties, how many distinct verifiers checked them, and how many returned valid — a usage-and-trust signal that is genuinely actionable for the party who owns it.

### D-drift note (own it in the paper)
The CAP1 spec described **document-centric** storage (store the actual PDF file in CouchDB). The build is **data-centric** — structured credential fields with a PDF generated on export. ChainCert does **not** store base64 PDF documents on-chain or in world state. Frame this as an improvement (structured data is more verifiable and queryable than an opaque document blob).

---

## PART C — Defense pitch points (P1–P9)

Rehearse these. Each is a ~30-second panel answer. No overclaiming.

**P1 — "Reports vs analytics."**
*Defense Answer:* "We label descriptive status and history screens as reports, and reserve 'analytics' for screens that compute — rates, ratios, time-to-revoke buckets, month-over-month volume. The admin 'Analytics & Reports' tab is named that deliberately: each of its cards computes a derived figure, not a raw count."

**P2 — "Verification Reach is a usage signal, not an approval driver."**
*Defense Answer:* "Verification Reach tells an issuer how much the outside world actually checks and trusts what they issue. We deliberately do not use it — or any popularity metric — to decide which issuers to approve, because popularity does not indicate quality."

**P3 — "The integrity check protects the cache, not verification."**
*Defense Answer:* "Verification always reads the blockchain directly. The daily integrity check reconciles the fast CouchDB cache against the ledger — it protects what the dashboards display, not the verification result, which is always authoritative from the chain."

**P4 — "Verification cannot be fooled by cache tampering." (lead with this)**
*Defense Answer:* "Because verification reads the ledger directly on every check and never the cache, tampering with the cache can never change a verification outcome. That is a strength of the design: the authoritative answer always comes from the blockchain."

**P5 — "Suspicious Activity is a governance tool."**
*Defense Answer:* "A single issuer misbehaving damages that issuer's reputation, not the whole chain. The admin is the governor who can remove a bad-faith issuer to protect network trust — so the Suspicious Activity report now links directly to that issuer's record where the admin can act."

**P6 — "Verifier identity: email proven, name self-reported."**
*Defense Answer:* "The verifier's email is cryptographically proven through a one-time code before any verification is logged; the name is self-reported and display-only. We record a proven email plus an unverified label — we do not claim to fully know who the person is."

**P7 — "Never say 'template.'"** In the demo, say **credential** / **issued credential**; unissued ones are **drafts**.

**P8 — Demo-only metrics are capability showcases, not decision tools.**
*Defense Answer (for the Not-Found slice / Integrity card / Provenance timeline):* "This demonstrates that the system catches forged or non-existent credentials / detects tampering / proves an immutable history — it is a capability showcase. We would not claim an admin takes a specific operational action from the raw count."

**P9 — Automation: a design decision, not a gap.**
*Defense Answer:* "We shipped automated expiration and issuer-driven batch revocation. We deliberately did not hardcode rule-based auto-revocation, because revocation criteria are issuer-specific; embedding one institution's policy into a shared ledger is an anti-pattern. The correct design keeps those rules in each issuer's own system via an API, which we scope as future work."

---

## PART D — Spec reconciliation (implemented vs. pending)

**Now implemented (this batch or earlier):** issuance + issuer onboarding/approval · single verification (credential-ID / link, not QR camera scanning) · wallet + renewal alerts · automated expiration · audit/verification logs · PDF export (incl. renewal count on reissued credentials) · OTP-proven verifier identity · **bulk verification of one holder's portfolio PDF (C10)** · **batch issuance (D4)** · **batch revocation (C17)** · **renewal request workflow + on-chain decision log (C11)** · issuer Verification Reach.

**Documented as future work (not built — say so honestly):** hardcoded rule-based auto-revocation · API-driven credential sync · W3C Verifiable Credentials format · JSON export · holder self-upload of "Unverified" credentials · trust scoring · system-performance load testing (a paper experiment, not a live chart) · **multi-holder / multiple-PDF bulk verification in one pass** (current bulk-verify handles one holder's portfolio PDF per upload; cheap to extend since the verify pipeline is already list-shaped, but no requirement calls for it). NOTE: the issuer still hand-builds the batch-issue / batch-revoke CSV/TXT of recipients — accepted as-is (importing an external list is the point; auto-generating it would defeat the feature).

**Corrected misconceptions:** it is one smart contract for all issuers (not one per issuer); ChainCert does not store base64 PDFs on-chain (data-centric, not document-centric); verification is credential-ID/link based (not QR camera scanning).
