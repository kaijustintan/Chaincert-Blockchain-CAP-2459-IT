# CAP2 — Paper Edit Checklist (Manual Application)

> **What this is:** every edit required in the Google Docs manuscript to satisfy the defense form's document items, written so it can be applied by hand — no AI tool required or expected.
> **Structure:** Tier 1 = master tracking table (tick as you go). Tier 2 = full verbatim detail per edit (LOCATE / BEFORE / AFTER / WHY / VERIFY).
> **Order is not optional.** D-2 renumbers sections that D-3 and D-4 then reference. D-5's TOC refresh is the last action performed on the document.

---

## 🔴 BLOCKER — resolve before applying D-5

**The manuscript contradicts itself on the number of UAT test items, and the evidence favours 84, not 78.**

| Source | Says |
|---|---|
| Abstract, Ch6 (×6 places), Ch7, Table 6.1 (all 19 rows) | **78** |
| Appendix H — the UAT instrument printed in the paper | **84** IDs (Holder 26, Issuer 24, Verifier 13, Admin 21) |
| Appendix I, Table I.2 — the per-item results table | **84** rows, each summing to exactly 19 respondents |
| Appendix I introductory sentence | **84** |
| Our own transcription of the live form (`UAT - Forms Contents.md`) | **84** |

Summing Table I.2 directly gives: **1,596** responses · **1,558** pass · 19 fail · 19 N/A · **97.6%** raw · **98.8%** effective.
The narrative says: 1,482 responses · 1,449 pass · 97.8% raw · 98.9% effective.

The narrative is internally consistent (1,449 / 1,482 = 97.8% ✓), which is why this was never caught — it was computed correctly on the wrong item count.

**The complication:** Table 6.1's nineteen per-respondent pass counts sum to **1,449**, while Table I.2's per-item passes sum to **1,558**. The gap of 109 passes / 114 responses is exactly 6 items × 19 respondents. So Table 6.1 was scored on a 78-item basis and its numerators are understated. **This cannot be recomputed from the repository** — `UAT - Raw Results.md` is a summary only. The Google Form **response spreadsheet** is required.

**Required before D-5:**
1. Open the live UAT Google Form and count the pass/fail items. 78 or 84?
2. If **84**: recompute each respondent's pass count from the response spreadsheet, then update Table 6.1 (all 19 rows, denominator `/84`), Table 6.7, the Abstract, §6.1.1, §6.1.2, §6.1.3, and Ch7.
3. If **78**: the single "84" in Appendix I's intro is the typo — but then Appendix H's 84 printed test IDs and Table I.2's 84 rows also need explaining.

Do not apply **D5-04** until this is settled.

---

# TIER 1 — MASTER TRACKING TABLE

**Legend — Action:** INSERT (new text) · REPLACE (swap text) · DELETE (remove) · RESTYLE (style only, no text change) · RENUMBER (numbering with knock-on effects) · BULK (a rule applied across many spots)
**Risk:** 🟢 mechanical · 🟡 check something first · 🔴 can damage the document if done wrong

| ID | Ord | Where | Action | Summary | Risk | ☐ |
|---|---|---|---|---|---|---|
| **D1-01** | 1 | Ch5 §5.5.1 | INSERT | "Retention of Revoked Credentials" — heading + 4 paragraphs | 🟢 | ☐ |
| **D2-01** | 2 | Ch7 | RESTYLE | Number the two headings 7.1 Conclusion / 7.2 Recommendations | 🟢 | ☐ |
| **D2-02** | 3 | Ch7 §7.2 | REPLACE | Rewrite the "priority roadmap" opening paragraph | 🟢 | ☐ |
| **D2-03** | 4 | Ch7 §7.2 | DELETE | Remove the 9-bullet "Actions Taken Following UAT" block | 🔴 | ☐ |
| **D2-04** | 5 | Ch7 §7.2 | RESTYLE | 3 bold labels → numbered headings 7.2.1 / 7.2.2 / 7.2.3 | 🟢 | ☐ |
| **D2-05** | 6 | Ch7 §7.2.1 | DELETE | Remove the 4 short-term bullets (all now implemented) | 🟡 | ☐ |
| **D2-06** | 7 | Ch6 §6.1.4 | INSERT | Add the paragraph recording those 4 as completed | 🟢 | ☐ |
| **D2-07** | 8 | Ch7 §7.2.1 | INSERT | Add the 7 genuine future-work bullets | 🟡 | ☐ |
| **D3-01** | 9 | Ch5 §5.5.2 | REPLACE | Replace the analytics paragraph with a one-line pointer | 🟢 | ☐ |
| **D3-02** | 10 | Ch5 after §5.5.3 | INSERT | New section 5.5.4 "Analytics and Reports" (5 paragraphs) | 🟡 | ☐ |
| **D4-01** | 11 | Ch3 §3.2.2 | REPLACE | "document encryption" → what actually exists | 🔴 | ☐ |
| **D4-02** | 12 | Ch3 §3.2.3 | REPLACE | "encrypted document storage in CouchDB" → accurate + deferral | 🔴 | ☐ |
| **D4-03** | 13 | Ch3 §3.3.1.3 | REPLACE | "Encrypted digital wallets" bullet → accurate | 🔴 | ☐ |
| **D4-04** | 14 | Ch3 §3.3.3 | REPLACE | "encryption checks" as a performed test → real tests | 🔴 | ☐ |
| **D4-05** | 15 | Ch3 §3.5.2.1 | REPLACE | TLS termination → evaluated-but-deferred | 🔴 | ☐ |
| **D4-06** | 16 | Ch3 §3.5.2.2 | REPLACE | Backup protocols → evaluated-but-deferred | 🔴 | ☐ |
| **D4-07** | 17 | Ch5 §5.6.9 | REPLACE | Heading "(Planned for Capstone 2)" → "(Carried Forward…)" | 🟢 | ☐ |
| **D4-08** | 18 | Ch3 §§3.1, 3.3, 3.4, 3.5.2 | BULK | Convert 88 future-tense markers to past (with leave-alone list) | 🟡 | ☐ |
| **D4-09** | 19 | Ch3 (7 sections) | INSERT | Add cross-references to outputs — chapter currently has zero | 🟡 | ☐ |
| **D4-10** | 20 | Ch3 §3.3.4 | REPLACE | Rename "Unit Testing" heading — section describes UAT | 🟢 | ☐ |
| **D4-11** | 21 | Ch3 §3.3.4 | REPLACE | Reconcile planned "5 to 8 participants" with actual n=19 | 🟢 | ☐ |
| **D4-12** | 22 | Ch3 | DELETE | Remove 2 empty headings | 🟢 | ☐ |
| **D4-13** | 23 | Ch3 §§3.3.1.3–3.3.3.1 | RESTYLE | Un-indent 7 headings trapped in a list block | 🟡 | ☐ |
| **D4-14** | 24 | Ch3 §3.4 | RESTYLE | Move the Gantt image out of the heading line | 🟢 | ☐ |
| **D4-15** | 25 | Ch3 §3.2.3 | REPLACE | Fix opening sentence — describes the initiation phase | 🟢 | ☐ |
| **D5-01** | 26 | References / Appendices | RESTYLE | Un-nest 9 appendices from under References | 🔴 | ☐ |
| **D5-02** | 27 | After Appendix I | RESTYLE | Give the 4 CVs and Resource Persons real headings | 🟡 | ☐ |
| **D5-03** | 28 | Ch1, Ch2 | DELETE | Remove the 3 remaining empty headings | 🟢 | ☐ |
| **D5-04** | 29 | Appendix I intro | REPLACE | Fix the dangling "Appendix J" + ⚠️ the item count | 🔴 | ☐ |
| **D5-05** | 30 | Ch4, Ch5 | RENUMBER | 3 tables mislabeled "Figure" + knock-on renumbering | 🟡 | ☐ |
| **D5-06** | 31 | Ch1, Ch2 | INSERT | Caption (or delete) 9 uncaptioned images | 🟡 | ☐ |
| **D5-07** | 32 | Front matter | INSERT | Add List of Figures and List of Tables | 🟢 | ☐ |
| **D5-08** | 33 | Front matter | RESTYLE | Style "Abstract" and "Table of Contents" as headings | 🟢 | ☐ |
| **D5-09** | 34 | Front matter | RESTYLE | Roman front matter / arabic restart at Ch1 (check requirement) | 🟡 | ☐ |
| **D5-10** | 35 | Whole document | FINAL | Refresh the Table of Contents — **last action, nothing after** | 🔴 | ☐ |

---

# HOW TO APPLY THESE EDITS

Every edit in Tier 2 follows the same shape: **LOCATE** (the exact phrase to search for) → **BEFORE** (what's there now, where relevant) → **AFTER**/**INSERT** (the exact replacement) → **WHY** (so you understand the change, not just execute it) → **VERIFY** (how to confirm it landed).

**Rules for whoever is editing:**

1. **Use Ctrl+F (or Cmd+F) to find the LOCATE phrase.** If it is not found exactly — not "close enough" — stop and flag it in the group chat rather than guessing at a similar-looking spot. A near-miss location is worse than no edit at all.
2. **Copy the AFTER/INSERT text directly from this document and paste it.** Do not retype it — retyping risks small wording drifts, dropped punctuation, or an accidental paraphrase, all of which defeat the point of having the exact wording pre-written and pre-justified.
3. **Take a named version-history snapshot before starting each pack** (File → Version history → Name current version — e.g. "before D-2"). If a pack goes wrong partway through, you can roll back to exactly that point instead of hand-fixing a half-broken document.
4. **Apply packs in the printed order.** D-2 renumbers sections that D-3 and D-4 reference by their new numbers — doing D-3 before D-2 means its cross-references point at the wrong thing. D-5 is always last; its final step (D5-10) refreshes the Table of Contents, and nothing may be edited after that except the compliance column.
5. **Run the VERIFY line for a pack before moving to the next one.** It is a quick search, not busywork — it is what catches a skipped or half-applied edit before it compounds into the next pack.
6. **One editor per pack, in sequence — not in parallel.** If splitting the work across groupmates, assign whole packs to individuals (e.g. "Ana does D-1, Jay does D-2"), not partial edits within a single pack, so the VERIFY checkpoints stay meaningful and nobody edits the same section at the same time as someone else. Coordinate handoffs in the group chat ("D-2 applied and verified, D-3 is open now").
7. **The six edits inside D-4 marked 🔴 (D4-01 … D4-06) are rewrites, not tense conversions.** Read the note above them before touching any of the six — the system has no encryption of any kind, so naively converting those sentences to past tense creates a false claim that Chapter 7 contradicts two chapters later.
8. **Do not touch the appendices** (Appendix H, Appendix I) except for the one edit that explicitly targets them (D5-04). They are the frozen record of the UAT instrument exactly as administered.

---

# TIER 2 — EDIT DETAIL

---

## PACK D-1 — Revoked-credential rationale

### D1-01 · INSERT · 🟢 · Ch5 §5.5.1

**LOCATE** (place cursor at the end of the paragraph ending with this text):
`permanent and tamper-evident history of the credential's lifecycle`

**ACTION:** Insert one Heading-3 and four paragraphs immediately after that paragraph.

**INSERT VERBATIM:**

> **Retention of Revoked Credentials**
>
> ChainCert deliberately retains revoked credentials on the blockchain rather than deleting them. Revocation is implemented as a status change, not a removal: the RevokeCredential chaincode function updates the credential's status to revoked and records the reason and timestamp, while the original issuance record and the revocation event both remain permanently on the ledger. Deleting the record would allow an institution to quietly erase evidence that it ever issued a credential, which would destroy the audit trail that makes third-party verification trustworthy in the first place. Retention also protects holders: a verifier who encounters a copy of a revoked credential can always retrieve its true current status, whereas a deleted record would return "not found" — indistinguishable from a forgery — and would erase the holder's legitimate history with the issuer.
>
> The same reasoning extends to revocation being distinct from expiration. An expired credential lapsed with the passage of time and may be renewed through the platform's renewal workflow; a revoked credential was actively withdrawn by its issuer for a stated reason. The two states are displayed distinctly throughout the system, and the revocation reason is recorded on-chain at the moment of revocation. Revocation reasons are not always adverse: a credential may be revoked because it was superseded by a corrected reissue, because a membership or accreditation lapsed, or because the issuing arrangement ended — cases in which the holder genuinely earned the credential and may legitimately want to continue showing it alongside its recorded status and reason.
>
> Consequently, revoked credentials also remain visible and exportable to their holders rather than being hidden. The holder controls exposure — profile visibility defaults to private per credential — but where a holder chooses to show or export a revoked credential, the system never misrepresents it: the wallet, the shared-profile view, and the exported PDF all stamp the revoked status, the PDF export additionally carries the recorded revocation reason and revocation date, and the holder is shown an explicit warning before exporting a revoked credential. Because every exported document embeds a verification link that resolves against the ledger, a verifier always receives the credential's true current status regardless of what the exported artifact claims.
>
> This design treats transparency, rather than concealment, as the mechanism of trust: the record of what was issued, when it was revoked, by whom, and why, is permanently available to any party with a legitimate need to check it.

**WHY:** The panel said the rationale was good but "not documented correctly" — it existed only verbally. No rationale text exists anywhere in Chapter 5; the only hint that a revoked credential is even exportable is the scoping phrase "any credential." Paragraph 1 answers the form's literal wording (why it stays on the ledger). Paragraph 2 adds the revoked-versus-expired distinction and the non-punitive revocation cases. Paragraphs 3–4 answer the shareability reading and name the safeguards — all of which are now real on the shipped build.

**VERIFY:** Search "Retention of Revoked Credentials" — one hit, inside §5.5.1, before §5.5.2 begins.

---

## PACK D-2 — Chapter 7 restructure

> Apply this pack **before** D-3 and D-4 — it renumbers sections those packs cross-reference.

### D2-01 · RESTYLE · 🟢 · Ch7

**LOCATE:** the heading `Conclusion` directly beneath the Chapter 7 title.

**ACTION:** Rename to `7.1 Conclusion`. Then locate the heading `Recommendations` and rename to `7.2 Recommendations`. Keep both at their existing heading level; change only the text.

**WHY:** Chapter 7 is the only chapter in the manuscript with no numbered sections — confirmed against both the body and the Table of Contents. This is a direct hit on the form's outline-format item, and the compliance column needs a page reference per item, which requires real numbered headings.

**VERIFY:** Both headings show numbers. After the final TOC refresh they must appear as 7.1 and 7.2.

---

### D2-02 · REPLACE · 🟢 · Ch7 §7.2

**LOCATE:** `organized using the same priority roadmap developed during analysis`

**BEFORE:**
> The following recommendations are organized using the same priority roadmap developed during analysis of the consolidated UAT findings. Because the post-UAT revision pass (Section 6.1.4) has since resolved most of the immediate and short-term functional items, this section first records the actions taken so that the recommendations distinguish completed work from work that genuinely remains — neither overstating what was fixed nor hiding what is still open.

**AFTER:**
> The recommendations below are ordered by urgency: near-term refinements first, then medium-term process improvements, then the infrastructure and standards work required for production deployment. Work already completed — both the post-UAT remediation and the post-defense revision pass — is recorded in Section 6.1.4 rather than restated here, so that this section contains only work that genuinely remains.

**WHY:** "Priority roadmap" appears exactly once in the entire manuscript, and no chapter defines such an artifact — "the same priority roadmap" points at nothing. The replacement also removes the sentence promising the "Actions Taken" list that D2-03 deletes.

**VERIFY:** Search "priority roadmap" — zero hits document-wide.

---

### D2-03 · DELETE · 🔴 · Ch7 §7.2

**LOCATE:** `were resolved in the post-UAT revision pass and re-verified`

**ACTION:** Delete all of the following:
- the bold label **"Actions Taken Following UAT (Immediate and Short-Term Functional Items)"**
- the sentence containing the LOCATE phrase
- all **nine** bullets that follow it, beginning "Route protection and authentication…" and ending "…mobile navigation, password-field feedback, iconography, font sizing, landing-page separation, and role-based entry cues…"

Replace with nothing — D2-02's new opening already points readers to §6.1.4.

**🔴 BEFORE DELETING:** open §6.1.4 and confirm all nine items are genuinely covered there. Verification found all nine map one-to-one onto §6.1.4 paragraphs which carry more detail, but confirm this yourself before removing content.

**WHY:** This is the literal thing the panel objected to — the Recommendations section opens with nine bullets of already-completed work. Exactly half the section was backward-looking.

**VERIFY:** §7.2 now begins directly with the short-term subsection. Search "Route protection" — exactly one hit, in Chapter 6.

**DEPENDS ON:** D2-02.

---

### D2-04 · RESTYLE · 🟢 · Ch7 §7.2

**LOCATE** each in turn: `Remaining Recommendations (Short-Term` · `Medium-Term (Polish and Process)` · `Infrastructure and Compliance (Carried Forward`

**ACTION:** Convert each from a bold paragraph to a real numbered Heading-3:
- → **7.2.1 Short-Term Refinements**
- → **7.2.2 Medium-Term (Polish and Process)**
- → **7.2.3 Infrastructure and Compliance (Carried Forward from Chapter 5)**

**WHY:** These are bold paragraphs, not headings, so they generate no Table of Contents entry and no page anchor. The compliance column requires a page reference per item.

**VERIFY:** All three appear in the document outline. After the TOC refresh they must appear as numbered sub-entries under 7.2.

**DEPENDS ON:** D2-03.

---

### D2-05 · DELETE · 🟡 · Ch7 §7.2.1

**LOCATE:** `Extend the duplicate-name check to near-matches`

**ACTION:** Delete all four bullets in this subsection:
1. "Extend the duplicate-name check to near-matches."
2. "Re-test the skills field on the deployed build and add type-based filtering."
3. "Align the registration confirmation heading with the 'Pending' terminology."
4. "Confirm notification email delivery in the production mail configuration."

**WHY:** All four were implemented in the post-defense revision pass and are verifiable on the deployed build — near-match warning with issuer confirmation, type-filtered skill suggestions, the "Application Pending Review" heading, and documented mail configuration with in-app email-sent confirmations. Leaving them as open recommendations would understate the work; their completion is recorded by D2-06 in Chapter 6, which is where the form says completed work belongs.

**VERIFY:** §7.2.1 is temporarily empty. D2-07 fills it.

**DEPENDS ON:** D2-04. **Must be followed by** D2-06 and D2-07.

---

### D2-06 · INSERT · 🟢 · Ch6 §6.1.4

**LOCATE:** `These distinctions are carried forward into the recommendations in Chapter 7`

**ACTION:** Insert the following paragraph **immediately before** the sentence containing the LOCATE phrase.

**INSERT VERBATIM:**
> A subsequent post-defense revision pass closed the four short-term items that remained open at the end of the UAT round: the duplicate-name check now also warns on near-matches (for example, "Python Cert" against an existing "Python Certificate"), naming the existing credential while allowing the issuer to confirm a genuinely distinct one; the skills field now offers one-click suggestions drawn from the issuer's own previously used skills, filtered to the selected credential type; the registration confirmation heading was aligned to "Application Pending Review"; and notification-email delivery was documented in the deployment manuals, with the interface now confirming when a notification email has been sent.

**WHY:** The form's document item says completed work belongs in §6.1.4, not in Recommendations. This is where the four deleted bullets go.

**VERIFY:** §6.1.4 ends with this new paragraph followed by the original closing sentence.

---

### D2-07 · INSERT · 🟡 · Ch7 §7.2.1

**ACTION:** Add the following bullets to §7.2.1 (the first five are genuine future work absent from the chapter; the last two are team-identified findings).

**INSERT VERBATIM:**
> • **Provide a manual expiry trigger in the administrator interface.** Credential expiration is currently enforced at read time and flipped in storage by a daily scheduled job; an on-demand trigger would let an administrator force the status sweep immediately when needed.
>
> • **Issue per-administrator Fabric identities.** Administrative chaincode invocations currently share a single system identity; per-admin identities would make the on-chain audit trail attribute each governance action to an individual administrator.
>
> • **Support issuer-defined automatic revocation rules.** Issuers with policy-driven revocation needs (for example, lapsed membership) currently revoke manually or in batches; rule-based automation was deliberately deferred because such rules belong issuer-side, driven through the platform's API.
>
> • **Add an SMS or alternative notification gateway.** All notifications are currently delivered by email; a second channel would improve reach where email is unreliable.
>
> • **Optimize verification-log queries.** The global verification-log read performs a full ledger range scan whose cost grows with total log volume; composite-key indexing or bounded pagination on the chaincode read would make it scale. An interim mitigation deferring these fetches until the relevant view is opened is already in place, but the underlying scan remains.
>
> • **Trim the holder-wallet credential payload.** The wallet endpoint returns each credential's embedded badge image with the list response, inflating transfer size for large wallets; serving badge images on demand would reduce load times. The equivalent optimisation has already been applied to the issuer's issued-credentials endpoint.
>
> • **Extend the duplicate-name check with issuer-configurable rules,** building on the shipped near-match detection — for example, per-issuer allowlists for intentional name families.

**WHY:** Of the seven future-work items on the defense presentation's future-work slide, only one appeared in Chapter 7 — five were entirely absent and one only partial. The panel asked specifically for significant future work; these are specific, diagnosed, and evidenced.

**⚠️ VERIFY AGAINST THE DECK:** open the defense presentation's future-work slide and tick off each of its seven items against §7.2. Anything still missing must be added.

**DEPENDS ON:** D2-05.

---

## PACK D-3 — Chapter 5 reports section

> Apply **after** D-2.

### D3-01 · REPLACE · 🟢 · Ch5 §5.5.2

**LOCATE:** `each role-specific interface surfaces interpreted analytics and reports`

**ACTION:** Delete the entire paragraph containing that phrase (it runs from "Beyond raw record display…" to "…rather than unprocessed data.") and replace it with a single sentence.

**AFTER:**
> The analytics and reporting layer shared by all role dashboards is described in Section 5.5.4.

**WHY:** All of Chapter 5's analytics coverage is this one unheaded paragraph, filed under the Digital Wallet module even though two-thirds of it describes the Issuer and Administrator dashboards. D3-02 replaces it with a properly located section.

**VERIFY:** §5.5.2 now ends with the pointer sentence.

---

### D3-02 · INSERT · 🟡 · Ch5, after §5.5.3

**ACTION:** Insert a new numbered section after the end of §5.5.3. If D-2's renumbering has changed surrounding numbers, use the next free number in sequence.

**INSERT VERBATIM:**

> **5.5.4 Analytics and Reports**
>
> Each role dashboard surfaces interpreted reports derived from credential and verification data the platform already holds, so users receive actionable insight rather than raw tables. Every report is paired with a plain-language interpretation of what the figures mean. All thresholds used by these reports are deliberate team design choices, applied uniformly across issuers, and are held as named constants in a single module so they are transparent and adjustable; they are not derived from an external standard, and per-organization configurable thresholds are documented as future work.
>
> **Holder reports (Digital Wallet).** *Credential Health* classifies the holder's credentials into mutually exclusive buckets — healthy, expiring soon, expired, revoked — where "expiring soon" means an active credential lapsing within 60 days. *Renewal Alerts* lists those expiring credentials soonest-first with a direct renewal action, suppressed for credentials the issuer marked non-renewable. *Verification Insights* summarizes checks performed on the holder's own credentials — drawn from a holder-scoped, server-filtered endpoint so no other user's verification history is exposed — showing outcome mix and most-checked credentials.
>
> **Issuer reports (Performance view).** *Issuance Performance* reports issued totals, distribution by credential type, and a monthly issuance trend, bucketed by actual issuance date. *Revocation Self-Audit* breaks revocations down by credential and by time-to-revoke buckets (within 14 days, 15–30 days, beyond 30 days, of issuance); the 14-day boundary approximates a typical administrative-correction window and is a design choice, not an industry standard. *Credentials in Circulation* shows the live status mix of everything the issuer has issued — the share still active, expiring within 60 days, expired, and revoked — so an issuer can see at a glance how much of its issued volume remains current; its summary deliberately reads descriptively in both directions, since a high expired share is normal turnover for short-validity credentials and only worth review for long-lived qualifications. *Verification Reach* shows how often the issuer's credentials are being verified, from an issuer-scoped filter of the on-chain verification log, and highlights revoked or expired credentials that are still being checked by verifiers.
>
> **Administrator reports (Analytics & Reports tab).** *Verification Result Summary* aggregates all verification outcomes (valid, revoked, expired, not found) platform-wide. *Revocation Rate by Issuer* ranks issuers by their revocation rate over the trailing 30 days; a rate at or above 25% within that window is visually banded for attention. The band is an attention marker, not a verdict — a high rate can equally reflect legitimate short-cycle credentialing — and issuers with fewer than four credentials in the window are labeled as small samples rather than ranked, since one revocation out of two credentials would otherwise read as an alarming 50%. Administrators are expected to read the recorded revocation reasons before acting on this report. *Integrity Check* reports the most recent ledger-to-database reconciliation (Section 5.6.8), which runs both on demand and on a daily schedule. The *Credential Dossier*, opened from any credential row, presents that credential's full on-chain provenance timeline and its verification proof trail in one view, backed by the immutable ledger history.
>
> The thresholds referenced above — 60 days for "expiring soon," 14 and 30 days for the time-to-revoke buckets, 25% over 30 days with a minimum sample of four for the revocation-rate band — are stated here as the platform's documented criteria for its report summaries.

**WHY:** This closes two form items at once. "Credentials in Circulation" appears **zero times** in the entire 4,014-line manuscript. The word "criteria" appears **zero times** in Chapter 5. And the only quantified analytics rule in the whole document — "revocation rate exceeds 25% in the last 30 days" — currently exists **only inside two UAT test-case table rows**, asserted in a test but never defined as a rule anywhere.

**⚠️ DO NOT EDIT THE APPENDICES:** Appendix H and I test rows still say "'Issuers to Review' card". Those tables are the frozen record of the instrument as it was administered and must not be retro-edited. The card was renamed to "Revocation Rate by Issuer" in the post-defense pass; this new section documents the current name. If a reconciliation note is wanted, add one sentence to §6.1.4 — never to the appendix.

**VERIFY:** Search "Credentials in Circulation" — it now appears in Chapter 5. Search "criteria" within Chapter 5 — at least one hit.

---

## PACK D-4 — Chapter 3 accuracy

> Apply **after** D-2. Edits D4-01 through D4-06 are the highest-risk in the entire set — read them carefully and do not rush them.

### 🔴 Why D4-01 … D4-06 are rewrites, not tense conversions

An exhaustive code audit found **no encryption of any kind** in the system. What exists is bcrypt password *hashing* (one-way, one field), cryptographically secure random tokens for share links, TLS *in transit* between blockchain components, and access control enforced at the application layer. Credential documents are stored as plaintext. Encryption at rest is correctly listed as an open item in Chapter 7.

If these six sentences are simply flipped to past tense, the manuscript claims security controls it does not have, and Chapter 7 contradicts it two chapters later. Chapter 3 is the inaccurate half; Chapter 7 is already correct.

---

### D4-01 · REPLACE · 🔴 · Ch3 §3.2.2

**LOCATE:** `document encryption, and user access management`
**BEFORE:** "Prioritized features included credential issuance via smart contracts, document encryption, and user access management."
**AFTER:** "Prioritized features included credential issuance via smart contracts, secure credential storage with password hashing and application-layer access control, and user access management."

---

### D4-02 · REPLACE · 🔴 · Ch3 §3.2.3

**LOCATE:** `encrypted document storage in CouchDB, were identified as development priorities`
**BEFORE:** "…tamper-proof credential issuance, blockchain-based validation, and encrypted document storage in CouchDB, were identified as development priorities."
**AFTER:** "…tamper-proof credential issuance, blockchain-based validation, and access-controlled document storage in CouchDB, were identified as development priorities. Encryption of stored documents was evaluated and deferred; it is carried as an open item in Sections 5.6.9 and 7.2.3."

---

### D4-03 · REPLACE · 🔴 · Ch3 §3.3.1.3

**LOCATE:** `Encrypted digital wallets for secure credential storage`
**BEFORE:** "Encrypted digital wallets for secure credential storage access"
**AFTER:** "Digital wallets with authenticated, role-restricted access to stored credentials"

---

### D4-04 · REPLACE · 🔴 · Ch3 §3.3.3

**LOCATE:** `role-based access simulation, encryption checks, and real-time document retrieval`
**BEFORE:** "…which includes chaincode execution, API testing, role-based access simulation, encryption checks, and real-time document retrieval via CouchDB."
**AFTER:** "…which included chaincode execution, API testing, role-based access simulation, security-control checks (password-policy enforcement, rate limiting, upload validation, and access-control guards), and real-time document retrieval via CouchDB."

**WHY (this one specifically):** It claims "encryption checks" as a *performed test*. If a panelist asks to see that test, nothing exists. The replacement names the security tests that genuinely ran.

---

### D4-05 · REPLACE · 🔴 · Ch3 §3.5.2.1

**LOCATE:** `reverse proxy configuration for HTTPS/TLS termination`
**ACTION:** Rewrite the sentence so the TLS work reads as researched and deferred, not implemented. Suggested: "…evaluated reverse proxy configuration for HTTPS/TLS termination; the resulting infrastructure decisions are documented in Sections 5.6.2, 5.6.4, and 5.6.7, and TLS termination itself is carried forward as an open item in Section 7.2.3."
**Do NOT write** "TLS was configured."

---

### D4-06 · REPLACE · 🔴 · Ch3 §3.5.2.2

**LOCATE:** `Monitoring and backup protocols will also be configured`
**BEFORE:** "Monitoring and backup protocols will also be configured to support system stability and availability."
**AFTER:** "Monitoring and backup protocols were evaluated and are carried forward as infrastructure work in Sections 5.6.9 and 7.2.3."
**Do NOT write** "were configured" — Chapter 7 explicitly states there are no automated backups.

---

### D4-07 · REPLACE · 🟢 · Ch5 §5.6.9

**LOCATE:** `High Availability and Backup Strategy (Planned for Capstone 2)`
**ACTION:** Change the parenthetical to `(Carried Forward as Future Work)`.
**WHY:** Capstone 2 is complete and the item is still open, so "Planned for Capstone 2" now reads as a missed commitment.

---

### D4-08 · BULK · 🟡 · Ch3 §§3.1, 3.3, 3.4, 3.5.2

**RULE:** Past tense for development activities and tests conducted ("The team used…", "UAT was conducted…"). **Present** tense for current system behaviour ("The system generates a credential PDF…"). Use §§3.5.1.1–3.5.1.5 as the style template — they are already correctly past.

**CONVERT (88 markers total):**
- §3.1 — 1 marker ("will utilize" → "utilized")
- §3.3 — 54 markers. Densest is §3.3.3.3, which has seven "will" in a single paragraph describing outputs Chapter 6 already documents as achieved.
- §3.5.2 — 28 markers. This is the panel's named target.
- §3.4 — the two forward-looking sentences: "Capstone 2 … will focus" → "focused"; "to be finalized in Capstone 2" → "were finalized in Capstone 2".

**LEAVE ALONE:**
- §§3.2.1–3.2.5 body text — already past.
- §§3.5.1.1–3.5.1.5 — already past.
- §3.5.2.8 (Final Defense Preparation) and §3.5.2.9 (Final Submission) — legitimately future.
- The submission clause of §3.5.2.6.
- **Anything covered by D4-01 … D4-06** — those are rewrites, already handled.

**VERIFY:** Search "will" within Chapter 3. Remaining hits should only be in the leave-alone sections.

**⚠️ SLOW DOWN ON THIS ONE:** 88 markers across many small sentences is easy to do sloppily by rushing. If two groupmates are splitting the workload, consider having one person do §3.3, another §3.5.2 — but not both touching the document at the same time (see rule 6 above).

---

### D4-09 · INSERT · 🟡 · Ch3, seven locations

**Chapter 3 currently contains zero cross-references** — no Chapter, Section, Table, Figure, or Appendix pointer anywhere in its 242 lines. The "refer to outputs" half of the form item is entirely unaddressed. Add at minimum:

| Section | Append |
|---|---|
| §3.5.2.1 | "…the resulting infrastructure decisions are documented in Sections 5.6.2, 5.6.4, and 5.6.7." |
| §3.5.2.2 | "…as detailed in Section 5.7; the backup and availability items that remained open are recorded in Sections 5.6.9 and 7.2.3." |
| **§3.5.2.3 (UAT — the panel's named example)** | "The UAT was conducted on 11–12 July 2026 with 19 respondents completing a ⚠️ **[78 or 84 — see blocker]**-item test form, yielding ⚠️ **[1,482 or 1,596]** individual responses with a ⚠️ **[97.8% or 97.6%]** raw and ⚠️ **[98.9% or 98.8%]** effective pass rate (mean satisfaction 4.34/5); full results are presented in Sections 6.1.1–6.1.3, Tables 6.1 and 6.7, and Appendix I." |
| §3.5.2.4 | "…itemized in Section 6.1.4 and the Post-UAT Status columns of Tables 6.2–6.6." |
| §3.5.2.5 | "…re-verified on the deployed build (Section 6.1.4); unresolved infrastructure items are listed in Section 7.2.3." |
| §3.5.2.7 | "…the resulting role-specific user manuals and installation manuals accompany this document as deliverables." |
| §3.3.4 | End the section with: "The executed UAT and its results are reported in Chapter 6." |

**⚠️** The §3.5.2.3 figures depend on the blocker at the top of this document.

---

### D4-10 · REPLACE · 🟢 · Ch3 §3.3.4

**LOCATE:** `3.3.4 Unit Testing`
**ACTION:** Rename the heading to **"3.3.4 User Acceptance Testing (UAT) Planning"**.
**WHY:** The section body describes UAT exclusively — the phrase "unit testing" never appears in it. The only two occurrences of "unit test" in the entire manuscript are this heading and its TOC entry.
**VERIFY:** Its TOC entry updates at D5-10.

---

### D4-11 · REPLACE · 🟢 · Ch3 §3.3.4

**LOCATE:** `a group of 5 to 8 participants will be recruited to observe user interactions`
**ACTION:** Convert the sentence to past tense **and** append a reconciliation:
> "In execution, the team exceeded the qualitative-testing baseline: the consolidated UAT round was completed by 19 respondents (Section 6.1.1), within the 15-participant band cited for approximately 90% issue detection."
**WHY:** The chapter plans for 5–8 participants while Chapter 6 reports 19. Left unreconciled it reads as a planning document that was never updated.

---

### D4-12 · DELETE · 🟢 · Ch3

**ACTION:** Delete the two empty headings in Chapter 3 — one immediately beneath the "Chapter 3" title, and one sitting between §3.5.2.6 and §3.5.2.7. Both are heading-styled lines with no text.
**HOW TO FIND:** In Google Docs, open the document outline (View → Show outline). Blank entries are the empty headings.
**WHY:** They render as blank outline and TOC entries.

---

### D4-13 · RESTYLE · 🟡 · Ch3 §§3.3.1.3 – 3.3.3.1

**ACTION:** Seven headings are indented inside a list block (a Docs export artifact): §3.3.1.3 Output, §3.3.2 Sprint Planning, §3.3.2.1 Tools, §3.3.2.2 Input, §3.3.2.3 Output, §3.3.3 System Deployment, §3.3.3.1 Tools. Remove the indentation and re-apply the correct Heading style so they sit at the left margin like every other heading. Their body text is also indented and should be normalised.
**WHY:** Indented headings nest under the list item, breaking outline structure and TOC anchor extraction.
**VERIFY:** All seven appear at the correct level in the document outline.

---

### D4-14 · RESTYLE · 🟢 · Ch3 §3.4

**LOCATE:** `3.4 Work Plan/Gantt Chart`
**ACTION:** The Gantt image is embedded inside the heading line itself. Move it to its own paragraph beneath the heading, above the "Figure 3.1" caption.
**WHY:** An image inside a heading corrupts the outline entry and the TOC.

---

### D4-15 · REPLACE · 🟢 · Ch3 §3.2.3

**LOCATE:** `The initiation phase laid the foundation`
**ACTION:** The heading reads "3.2.3 Implementation Phase" but the paragraph opens by describing the initiation phase and largely restates §3.2.1. Rewrite the opening so it describes the implementation phase — the development-priorities sentence (as amended by D4-02) is the true topic sentence and should lead.
**WHY:** Heading and body describe different phases.

---

## PACK D-5 — Structural, captions, pagination

> **Apply last.** D5-10 is the final action performed on the document.

### D5-01 · RESTYLE · 🔴 · References / Appendices

**ACTION:** Three changes:
1. **LOCATE** the heading `References:` → remove the trailing colon so it reads `References`.
2. Find the bold paragraph `Appendix` sitting after the reference list. It is **not** a heading. Replace it with a real **Heading-1** titled **"Appendices"**.
3. Leave Appendices A–I at their existing Heading-2 level — they will now nest under the new Appendices parent instead of under References.

**WHY:** References is Heading-1 and every appendix is Heading-2, so the outline and TOC currently render **all nine appendices as children of the References section**. This is the single most visible structural defect in the document.

**VERIFY:** In the document outline, Appendices A–I sit under "Appendices", not under "References".

---

### D5-02 · RESTYLE · 🟡 · After Appendix I

**ACTION:**
1. Insert a **Heading-2** titled **"Curricula Vitae"** before the first CV.
2. Make each of the four names a **Heading-3**, with consistent styling — three are currently ALL-CAPS and one is Title Case. Pick one convention; Title Case is recommended.
3. Insert a **Heading-2** titled **"Resource Persons"** before that list.

**WHY:** Roughly 250 lines — about 6% of the document — currently carry no headings at all and are swallowed under Appendix I's last sub-sub-heading in the outline.

**VERIFY:** Curricula Vitae and Resource Persons appear as top-level entries after the TOC refresh.

---

### D5-03 · DELETE · 🟢 · Ch1, Ch2

**ACTION:** Delete the three remaining empty headings — one directly beneath the Chapter 1 title, one within Chapter 1, one within Chapter 2. (Chapter 3's two were removed by D4-12.)
**HOW TO FIND:** View → Show outline; blank entries are the empty headings.

---

### D5-04 · REPLACE · 🔴 · Appendix I introduction

> **⚠️ DO NOT APPLY until the blocker at the top of this document is resolved.**

**LOCATE:** `verbatim tester comments, are provided in Appendix J`

**BEFORE:**
> Table I.2 summarizes the Pass/Fail/N/A tally for each of the 84 test cases across all 19 respondents, grouped by module. Full per-respondent raw responses, including verbatim tester comments, are provided in Appendix J.

**AFTER (if the count resolves to 84 — the evidence favours this):**
> Table I.2 summarizes the Pass/Fail/N/A tally for each of the 84 test cases across all 19 respondents, grouped by module. Full per-respondent raw responses, including verbatim tester comments, are retained in the team's UAT records and are available upon request.

**AFTER (if the count resolves to 78):**
> …for each of the 78 test items… *(same closing sentence)*
> — but note that Appendix H prints 84 test IDs and Table I.2 has 84 rows, so both would then also require correction.

**WHY:** Two defects in one sentence. **Appendix J does not exist** — the document ends at Appendix I in both the body and the TOC, and this is the manuscript's only dangling appendix reference. And this sentence contains the manuscript's only "84" against "78" everywhere else.

**Alternative to consider:** actually create an Appendix J with the raw per-respondent table. If you do, **check tester PII first** — "available upon request" is the safer option and is consistent with keeping tester names out of the published document.

---

### D5-05 · RENUMBER · 🟡 · Ch4, Ch5

**ACTION:** Three markdown **tables** are captioned as "Figure". Relabel and renumber, including knock-on effects:

| Current caption | Becomes |
|---|---|
| Figure 4.1: Existing Credential Verification Process Flow | **Table 4.1** |
| Figure 4.2: Gap Analysis | **Table 4.2** |
| Figure 5.1: ChainCert Port Mapping and Network Architecture | **Table 5.1** |
| Table 4.1: Problem-to-Opportunity Traceability Matrix *(existing)* | **Table 4.3** — it follows both new ones |
| Figure 5.2: ChainCert System Infrastructure Overview | **Figure 5.1** — now Chapter 5's only figure |

**ALSO:** update the in-text mentions of "Figure 4.1" and "Figure 5.1" near those tables to match their new labels.

**WHY:** Three of the six items in the "Figure" series are not figures at all, so the series has almost no actual figures behind it.

**VERIFY:** No caption reading "Figure" sits above a table. No two captions share a number.

---

### D5-06 · INSERT · 🟡 · Ch1, Ch2

**ACTION:** Nine images are uncaptioned, unnumbered, and never referenced in the text — one in Chapter 1 before §1.3, two in §§1.4.2.x, and five across §§2.3.x. For each, either:
- **(a)** add a caption "Figure N.N: <description>" numbering into the now-clean series (Figure 1.1, 1.2, 1.3, then 2.1–2.5) **and** add one in-text sentence referring to it; or
- **(b)** delete the image if it adds nothing.

Caption-or-delete — do not leave orphans. *(The title-page logo needs no caption.)*

**DEPENDS ON:** D5-05, which establishes the corrected numbering.

---

### D5-07 · INSERT · 🟢 · Front matter

**ACTION:** After the Table of Contents, insert a **List of Figures** and a **List of Tables** (Insert → Table of contents, one per label type, or build manually from the captions).
**WHY:** Neither exists. Both are normally required alongside a TOC.
**DEPENDS ON:** D5-05 and D5-06 — captions must be final first.

---

### D5-08 · RESTYLE · 🟢 · Front matter

**ACTION:** "Abstract" and "Table of Contents" are currently bold paragraphs, not headings. Style them as (unnumbered) headings so they appear in the document outline.

---

### D5-09 · RESTYLE · 🟡 · Front matter

**ACTION:** Check the program's format requirement for front-matter pagination. The document appears to run one continuous arabic sequence from the title page (Chapter 1 begins at page 10). Most thesis formats require **roman numerals for front matter, restarting at arabic 1 at Chapter 1**. If required: insert a section break before Chapter 1, format front-matter page numbers as i, ii, iii…, and restart arabic numbering at 1.
**WHY:** This is very likely what the panel actually meant by "include pagination" — the document already has page numbers, so the objection was probably about their format.

---

### D5-10 · FINAL · 🔴 · Whole document

**ACTION, in this exact order:**
1. Right-click the Table of Contents → **Update**.
2. Update the List of Figures and List of Tables.
3. Fill the compliance column's page numbers from the refreshed TOC.

**Nothing may be edited after this except the compliance column itself.** Any further content edit invalidates every page number.

---

# Completion tracker

| Pack | Edits | Version-history snapshot taken | All applied | Verified |
|---|---|---|---|---|
| D-1 | 1 | ☐ | ☐ | ☐ |
| D-2 | 7 | ☐ | ☐ | ☐ |
| D-3 | 2 | ☐ | ☐ | ☐ |
| D-4 | 15 | ☐ | ☐ | ☐ |
| D-5 | 10 | ☐ | ☐ | ☐ |
| **Blocker** | 78-vs-84 resolved from the response spreadsheet | — | ☐ | ☐ |
| **Final** | TOC + Lists refreshed, compliance column filled | — | ☐ | ☐ |
