# CAP2 - System Demo Video (15 Minutes)

**Deliverable:** `CAP-2459-IT-DEMOVIDEO.mp4`
**Requirement:** A 15-minute HD video demo of the capstone highlighting its best feature solving the problem.
**Group:** CAP-2459-IT (ChainCert)

## Purpose of this document

This is the clip-by-clip recording plan and narration script for the DLSU final-submission demo video. It is a different deliverable from the two presentation decks:

| Deliverable | Length | What it does |
| :--- | :--- | :--- |
| Final Defense Deck | ~30 min | Defense-day presentation with live demo, already delivered |
| 10-Minute Presentation | ~10 min | Narrated whole-capstone summary, no demo |
| **This demo video** | **15 min** | **Screen recording of the working system, feature by feature** |

Because the 10-minute presentation already states the problem set in full, this video does **not** open with a problem statement. Instead, every feature clip names the specific problem it solves as it is being shown. The `PROBLEM` field on each clip refers to the numbered problems in the CAP-2459-IT proposal, Section 1.2.

**Total runtime: 15:10.**

## How to read each clip

Each clip is broken into numbered beats. Every beat pairs an **ACTION** (what to click or show on screen, in Taglish since these are your own recording notes) with the exact **SCRIPT** line spoken while that action happens. Speak naturally and ad-lib around the wording, but keep the underlined factual claims intact, each one was verified against the codebase.

---

# CLIP 1

**TIME:** 0:30
**SCENE:** Quick system tour
**PROBLEM:** None (orientation only)

1. **ACTION:** Landing page lang, walang login. Pakita yung page.
**SCRIPT:** "This is ChainCert, a blockchain-backed platform for issuing, holding, and verifying academic and professional credentials. It serves four roles: holders, who own credentials; issuers, such as universities and training providers; verifiers, typically employers checking whether a credential is real; and platform administrators."

2. **ACTION:** Manatili sa landing page, wag mag-scroll ng matagal.
**SCRIPT:** "Everything you are about to see is backed by a real permissioned Hyperledger Fabric blockchain network working alongside our database, not a database alone dressed up with a blockchain label."

3. **ACTION:** Transition, cut sa registration.
**SCRIPT:** "Let's start where every issuer starts, with registration."

---

# CLIP 2

**TIME:** 1:00
**SCENE:** Governance glimpse, user and issuer registration
**PROBLEM:** 9 (credentials not interoperable across systems)

1. **ACTION:** Pakita lang yung holder account form, mabilis lang, wag mag-fill out live.
**SCRIPT:** "Accounts here come in two kinds. A holder signs up through a straightforward account form, which also requires confirming a one-time code sent to their email before the account is created, a security check against fake or mistyped addresses."

2. **ACTION:** Lumipat sa issuer registration form.
**SCRIPT:** "An issuer goes through a much heavier process, and deliberately so."

3. **ACTION:** I-scroll hanggang sa document upload section, i-change ang category dropdown para makita nilang nagbabago ang required documents. Ito yung pinaka-importanteng visual sa clip na ito.
**SCRIPT:** "An issuer is asking for the authority to write credentials onto a shared ledger, so we require documentary proof of who they are. The required documents are driven by the issuer's category. A university uploads its CHED recognition and charter. A training provider uploads a different set entirely."

4. **ACTION:** Ituro ang issuer-type field (root authority vs subordinate selector).
**SCRIPT:** "Issuers also declare a tier. A root authority is a sovereign institution, such as De La Salle University. A subordinate operates under one, like a college department or a student organization. That single choice determines who reviews the application, which is what we will look at next."

---

# CLIP 3

**TIME:** 0:50
**SCENE:** Governance glimpse, root authority approval
**PROBLEM:** 9

1. **ACTION:** Naka-login as `dlsu@email.com`, buksan ang Root Authority Governance section, pakita ang pending list. Dapat may preseeded subordinate application na (La Salle Computer Society) bago mag-record.
**SCRIPT:** "We already have a subordinate application waiting. La Salle Computer Society applied under De La Salle University. Because they registered as a subordinate, this does not go to the platform administrator first. It goes to DLSU, their root authority."

2. **ACTION:** I-open ang submitted documents ng application.
**SCRIPT:** "DLSU can open the submitted documents and decide on that basis, then approve or reject."

3. **ACTION:** I-click ang Approve. Wag hintayin ang buong load kung mabagal, cut.
**SCRIPT:** "I'll approve. That decision is written to the blockchain immediately, so the record of who approved which subordinate, and when, is permanent and cannot be quietly edited later. But La Salle Computer Society still cannot log in yet, root approval is only the first gate."

---

# CLIP 4

**TIME:** 1:10
**SCENE:** Governance glimpse, administrator approval
**PROBLEM:** 9

1. **ACTION:** Naka-login as `admin1@email.com`, buksan ang pending issuer applications, pakita ang application na may "Root Approved" badge. **Kailangan ng ibang application dito, hindi si La Salle Computer Society** — kailangan ng subordinate na naka-root-approve na pero wala pang enrolled Fabric identity, para lumabas ang guard message sa susunod na beat.
**SCRIPT:** "Here is a subordinate application on the administrator's side, already carrying a Root Approved badge. The administrator could not have acted on this before the root authority signed off, and the system enforces that ordering rather than trusting people to follow it."

2. **ACTION:** I-click ang Approve on camera.
**SCRIPT:** "The administrator has the final say. Watch what happens when I approve."

3. **ACTION:** Hintayin lumabas ang guard message, i-hold sa screen para mabasa: *"This issuer doesn't have a configured signing node yet, so it can't be approved. Please set up (enroll) their node first, then approve."* Ito yung punto ng buong clip, wag mo i-skip.
**SCRIPT:** "The system refuses, and it tells us exactly why: this issuer has no configured signing node yet. That is a deliberate guard, not a bug. Approving an issuer with no blockchain identity would create an account that looks approved but cannot actually issue anything, so we block the approval instead of producing a broken issuer. Enrolling that node is currently a manual step, and automating it is one of our formal recommendations."

4. **ACTION:** Wala nang bagong screen, patuloy lang ang narration bago mag-cut sa Clip 5.
**SCRIPT:** "Two things worth noting. The applicant is emailed at every decision point, approval, rejection with the reason, and suspension, so an issuer is never left guessing. And a root authority skips this two-tier flow entirely, going straight to administrator review, because there is no parent institution above it."

---

# CLIP 5

**TIME:** 1:00
**SCENE:** Template creation
**PROBLEM:** 3 (no standardized credential metadata or format structure)

1. **ACTION:** Naka-login as `dlsu@email.com`. Click Create Credential Template.
**SCRIPT:** "Now logged in as De La Salle University. Before any issuer can hand out a credential, they define it once as a template."

2. **ACTION:** I-fill out ang form fields habang nagta-type — name, type, description, skills.
**SCRIPT:** "Name, type, description, the skills it represents, and a badge image. This is the direct answer to a real problem: today, a certificate from one institution and a certificate from another share no common structure, so nothing can process them consistently. Here, every credential issued from this template inherits the same fields, no matter which issuer created it."

3. **ACTION:** I-save ang template, pakita sa credentials list na nandiyan na.
**SCRIPT:** "When I save, this is written to the blockchain first, and only then mirrored into our database for fast dashboard reads. The ledger is the source of truth, the database is a cache. With the template defined, DLSU can now issue it to an actual person."

---

# CLIP 6

**TIME:** 0:55
**SCENE:** Issue credential to holder
**PROBLEM:** 1, 3 (static formats with no embedded verifiability)

1. **ACTION:** Piliin ang template na ginawa sa Clip 5, buksan ang recipient list.
**SCRIPT:** "Issuing is a matter of picking the template and picking the recipient. Notice that the recipient list is filtered."

2. **ACTION:** Ituro ang eligible-users filtering.
**SCRIPT:** "The system will not let an issuer hand the same person a second active copy of a credential they already hold, which prevents accidental duplicate issuance. If that person's copy was revoked or has expired, they become eligible again, because reissuing in that situation is legitimate."

3. **ACTION:** Piliin si Kyle, i-confirm ang issuance. Wag mag-set ng expiry na malayo kung ito na yung credential na gagamitin sa renewal clip mamaya (pero mas maganda kung ibang credential yun, preseeded).
**SCRIPT:** "I'll issue this one. That transaction goes to the blockchain, then to the issuer's database and the holder's wallet, and the holder is notified. The credential now exists as a ledger record with its own identifier, not as a PDF sitting in someone's inbox that has to be taken at face value."

---

# CLIP 7

**TIME:** 0:55
**SCENE:** Holder receives the credential
**PROBLEM:** 1, 5 (paper-based storage causes loss and inaccessibility)

1. **ACTION:** Naka-login as holder (Kyle), pakita ang bagong credential sa wallet at ang notification bell.
**SCRIPT:** "On the holder's side, the credential is already there, along with a notification."

2. **ACTION:** Buksan ang credential details.
**SCRIPT:** "Opening it shows the issuer, the status, the dates, the skills, and the credential's blockchain identifier."

3. **ACTION:** Ituro ang See History button, wag pa i-click, may dedicated clip pa yun.
**SCRIPT:** "There is also a See History option, which pulls that credential's full lifecycle directly from the ledger. We will come back to that later."

4. **ACTION:** Wala nang bagong screen, disclaimer bago mag-transition sa sharing clips. Kailangan ito bago yung Clips 9-10 kung hindi magmumukhang sira ang app.
**SCRIPT:** "One important detail before we look at sharing. Every credential arrives set to private by default. Nothing is exposed publicly unless the holder deliberately makes it public. A credential is the holder's to disclose, not the platform's to broadcast. So in the next few clips, anything you see being shared is something the holder chose to share."

---

# CLIP 8

**TIME:** 0:20
**SCENE:** Holder receives the email notification
**PROBLEM:** 5

1. **ACTION:** Pakita ang inbox tas buksan ang email. Maikli lang, wag pahabain.
**SCRIPT:** "Notifications are not confined to the platform. The holder is also emailed on issuance, and again on revocation, so they are informed even when they are not logged in."

---

# CLIP 9

**TIME:** 0:55
**SCENE:** Holder exports, single credential PDF and portfolio PDF
**PROBLEM:** 1, 5

1. **ACTION:** I-export ang single credential bilang PDF, buksan ito, ituro ang verification link.
**SCRIPT:** "A holder can export a single credential as a PDF. The document carries a verification link, so whoever receives it can check it against the blockchain rather than trusting the file itself."

2. **ACTION:** I-export ang buong portfolio, buksan, pakita ang lahat ng public credentials na nandoon.
**SCRIPT:** "They can also export a full portfolio, every public credential in one document. This is the version that is actually useful when applying for a job, because it gives an employer a single file covering the applicant's entire verified record."

3. **ACTION:** I-save ang portfolio PDF file, gagamitin ito sa Clip 11.
**SCRIPT:** "Keep this file in mind, we will use it in a moment."

---

# CLIP 10

**TIME:** 0:50
**SCENE:** Holder shares a profile link, general and specific-recipient
**PROBLEM:** 5, 6

1. **ACTION:** I-generate ang general profile share link.
**SCRIPT:** "Instead of sending files, a holder can share a link, something you would put on a resume or in an email signature."

2. **ACTION:** Buksan ang link sa ibang tab para makita na gumagana.
**SCRIPT:** "Opening it shows only the credentials the holder marked public, which is why that default matters."

3. **ACTION:** Balik sa share settings, ituro lang ang specific-recipient option. Wag na i-configure or i-access, sayang oras.
**SCRIPT:** "There is also a restricted version of this link, meant for one specific recipient. When someone opens that one, they are asked for their email and a one-time code before anything is shown, so a forwarded link does not become an open door. It confirms the person reading it is the person it was meant for."

---

# CLIP 11

**TIME:** 1:20
**SCENE:** Verification
**PROBLEM:** 1, 6 (manual verification delays)

**Ito yung centerpiece, bigyan mo ng oras.**

1. **ACTION:** Buksan ang Verification page, walang login kailangan.
**SCRIPT:** "This is the part the whole system exists for. An employer verifying a credential today calls the school, sends a formal request, and waits. In our interviews with HR at Avesco Marketing Corporation and Sunlife Philippines, that process took five to ten working days. Here, the verifier needs no account at all."

2. **ACTION:** I-type ang verifier's email at name, i-request ang OTP. I-record real-time, i-fast-forward o hard-cut ang wait sa editing.
**SCRIPT:** "They identify themselves and confirm that email with a one-time code, which is what makes the record of who checked what trustworthy rather than something anyone could fake."

3. **ACTION:** I-upload ang portfolio PDF galing Clip 9.
**SCRIPT:** "Then they upload the portfolio PDF the holder gave them, and every credential in it is checked against the blockchain in one pass."

4. **ACTION:** Pakita ang results, lahat valid.
**SCRIPT:** "These results are not read from our application database. They are read from the ledger. And each check is itself written back to the ledger, so there is a permanent record of who verified this credential and when. Five to ten days, reduced to this."

---

# CLIP 12

**TIME:** 0:50
**SCENE:** Revocation
**PROBLEM:** 2, 7 (no lifecycle management; no tamper-evident logs)

1. **ACTION:** Naka-login as `dlsu@email.com`, buksan ang issued credentials list, piliin ang credential na kaka-verify lang sa Clip 11.
**SCRIPT:** "Credentials are not permanent facts. They get issued in error, they get withdrawn for misconduct, they lapse. A paper certificate has no answer for this. Once printed, it says what it says forever."

2. **ACTION:** I-click ang Revoke, i-type ang reason (required field).
**SCRIPT:** "Here, the issuer revokes it, and a reason is mandatory, not optional, because a revocation with no stated basis is not auditable."

3. **ACTION:** I-submit, pakita ang confirmation.
**SCRIPT:** "This is submitted to the blockchain, the status updates everywhere it appears, and the holder is notified. The original issuance is not deleted, it is still on the ledger. What we have added is the next chapter of that credential's history."

---

# CLIP 13

**TIME:** 0:35
**SCENE:** Verification of the revoked credential
**PROBLEM:** 2, 6

1. **ACTION:** Diretso sa pag-upload ng parehong portfolio PDF, skip na ang OTP part (naipakita na sa Clip 11).
**SCRIPT:** "Same verifier, same portfolio file, same credential identifier. Nothing about the document the holder handed over has changed."

2. **ACTION:** Pakita ang results, revoked na ngayon ang isang credential. Kung kaya, side-by-side sa naunang valid result para malinaw ang contrast.
**SCRIPT:** "But the answer has. The system now reports it as revoked. Verification reads the current state of the ledger every single time, so an outdated document in circulation cannot be used to claim something that is no longer true."

---

# CLIP 14

**TIME:** 0:35
**SCENE:** Renewal, holder requests
**PROBLEM:** 2

1. **ACTION:** Pakita ang preseeded credential na expiring within 60 days (verified sa code, 60 nga ang threshold), ang Renewal Alert.
**SCRIPT:** "Some credentials are supposed to expire, a professional license, a safety certification, a driver's license. The system flags them for the holder when they fall within sixty days of lapsing, so the deadline is not something they have to remember on their own."

2. **ACTION:** I-click ang Request Renewal.
**SCRIPT:** "From that alert, the holder requests a renewal directly from the issuer who granted it."

---

# CLIP 15

**TIME:** 0:35
**SCENE:** Renewal, issuer decides
**PROBLEM:** 2

1. **ACTION:** Naka-login as issuer, buksan ang renewal requests queue, pakita ang request galing kay Kyle.
**SCRIPT:** "The request lands in the issuer's queue. Renewal is a decision, not an entitlement, so the issuer can approve or decline, and either way that decision is logged on the blockchain."

2. **ACTION:** I-click ang Decline, para maipakita ang negative path, hindi lang ang happy path.
**SCRIPT:** "I'll decline this one, because it is worth seeing that the system handles a refusal as cleanly as it handles an approval."

---

# CLIP 16

**TIME:** 0:50
**SCENE:** Holder sees the decision, then credential history
**PROBLEM:** 2, 7

1. **ACTION:** Naka-login pa rin as holder (iisang login sa buong clip na ito), pakita ang rejection notice.
**SCRIPT:** "The holder sees the outcome without having to follow up."

2. **ACTION:** Buksan ang See History nung credential na dumaan sa issued at revoked (yung sa Clip 12).
**SCRIPT:** "Now let's open that history view on the credential we issued and later revoked. Every event in its life is here in order, pulled from the blockchain rather than assembled from our own records."

3. **ACTION:** Wala nang bagong screen. Banggitin lang na meron din ito sa issuer at admin, pero wag mo na ipakita, sayang oras.
**SCRIPT:** "This is the answer to a problem that sounds small but is not: with paper credentials, there is no version history at all. Nobody can tell whether a certificate was reissued, amended, or quietly replaced. The same timeline is available to the issuer and to the administrator, from their own dashboards, reading the same ledger data."

---

# CLIP 17

**TIME:** 0:45
**SCENE:** Reports and analytics
**PROBLEM:** 7, 8 (no tamper-evident logs; no unified registry or index)

1. **ACTION:** Naka-login as issuer, buksan ang Performance tab, mag-scroll lang para makita na may laman. Glance lang, wag mag-expound kung ano laman ng bawat card.
**SCRIPT:** "One thing the panel asked for after our first defense was reporting, so here is the issuer's view. Issuance activity over time, a self-audit of what they have revoked, how often their credentials are actually being checked by outsiders, and how many are still in circulation."

2. **ACTION:** Ituro ang plain-language summary box sa isang card lang.
**SCRIPT:** "The important design choice is the summary attached to each one. Every report states in plain language what the numbers mean, rather than leaving an administrator to interpret a raw table."

3. **ACTION:** Wala nang bagong screen. Banggitin lang na meron din ang holder at admin, wag mo na ipakita.
**SCRIPT:** "Holders and administrators each have their own equivalent views, built the same way. All of it is computed from records already on the ledger. There is no separate analytics database."

---

# CLIP 18

**TIME:** 0:55
**SCENE:** Administrator integrity check
**PROBLEM:** 7, 8

1. **ACTION:** Naka-login as `admin2@email.com` (ibang admin, para makita nila na naka-log kung sino ang kumilos), buksan ang integrity check section.
**SCRIPT:** "Most of what you have seen loads from our database rather than from the ledger directly, because reading a blockchain for every screen would be slow. That trade-off raises an obvious question: how do we know the fast copy still matches the real record? This is how."

2. **ACTION:** I-trigger ang integrity check.
**SCRIPT:** "The integrity check compares every credential in our database against its blockchain record, field by field, and flags anything that disagrees. An administrator can run it on demand, as I am doing here, but it also runs on its own every morning at eight."

3. **ACTION:** Pakita ang clean result.
**SCRIPT:** "The results are always recorded for the administrators, and they are emailed only when something is actually wrong, so the alert means something when it arrives. A clean result means the database has not drifted from the ledger."

---

# CLIP 19

**TIME:** 0:20
**SCENE:** Close
**PROBLEM:** All

1. **ACTION:** Simple recap card. Wag nang mag-narrate ng bagong content dito.
**SCRIPT:** "Static credentials with no way to check them, no lifecycle after issuance, no shared structure, no audit trail, and verification measured in days. That is the problem set we started with, and what you have just seen is our answer to it. Thank you."

---

# Production plan

## Recording approach

Bawat clip ay hiwalay na recording, tas i-compile sa editing. Ginagawa nito na hindi mo kailangan mag-log in on camera at hindi ka mahihirapan sa dead air. Pero may data dependencies na hindi pwedeng lagpasan: kailangang aktibo pa yung credential ni Kyle bago mo siya i-revoke, at kailangang ma-verify siya bilang valid bago yung revocation, kung hindi wala kang maipapakitang valid result.

## Recording order (hindi ito yung final na order ng video)

| Session | Account | Clips produced | Must record after |
| :--- | :--- | :--- | :--- |
| 1 | No login | 1, 2 (forms), 19 | Anytime |
| 2 | `dlsu@email.com` | 3, 5, 6 | Preseed the subordinate application first |
| 3 | `admin1@email.com` | 4 | Session 2, plus a second unprovisioned subordinate application |
| 4 | Holder | 7, 8, 9 | Session 2 |
| 5 | No login (verifier) | 11 | Session 4 (needs the portfolio PDF) |
| 6 | Holder | 10 | Session 4 |
| 7 | `dlsu@email.com` | 12, 17 | Session 5 |
| 8 | No login (verifier) | 13 | Session 7 |
| 9 | Holder | 14 | Preseed an expiring credential |
| 10 | Issuer | 15 | Session 9 |
| 11 | Holder | 16 | Sessions 10 and 7 |
| 12 | `admin2@email.com` | 18 | Anytime |

## Pre-seed checklist (bago mag-record)

- [ ] Subordinate issuer application from La Salle Computer Society, pending under DLSU, documents attached (for Clip 3)
- [ ] A second subordinate application that has already passed root approval but has no enrolled Fabric identity (for Clip 4's guard message)
- [ ] A holder credential expiring within 60 days, separate from the one being revoked (for Clip 14)
- [ ] Enough issuance and verification history for the issuer reports to render with actual data (for Clip 17)
- [ ] Holder credentials set to public where sharing will be demonstrated (Clips 9, 10)
- [ ] Confirm `SMTP_OVERRIDE_TO` routing so the holder email in Clip 8 lands in an inbox you can show on camera

## OBS settings

- Same resolution, frame rate, and audio gain across every session. Mismatched clips are the most common reason compiled demo videos look amateur.
- HD minimum per the submission requirement.
- Leave a second or two of silence at the start and end of each clip for editing headroom.

## Editing notes

- Clip 11's one-time code wait should be sped up or hard-cut. Narrate through it so the cut does not look like something is being hidden.
- Clip 13 is strongest if the valid and revoked results are shown close together, whether side by side or as a quick cutback.
- Clip 4's guard message needs to stay on screen long enough to be readable. Hold it.

## Runtime

**15:10 total.** Clips 2 and 4 carry the most explanatory content, so they are the first place to trim if the edit runs long.
