<!-- Maintained user manual — UAT edition (phase-based test script). Refreshed 2026-07-05 to match the deployed CCSCloud VM build.
     Screenshot placeholders are marked inline as *[Screenshot: ...]* — replace each with a real screen capture. -->

# ChainCert — User Manual (UAT Edition)

**ChainCert** — Blockchain-Based Credential Issuance and Verification Platform
Updated: July 5, 2026 — CAP-2459-IT

## Introduction

ChainCert issues, manages, and verifies digital credentials on a blockchain, so credentials can be checked instantly and cannot be silently tampered with. This guide walks you through testing the platform in **8 phases**, following the natural flow of a credential: an issuer creates it, a holder receives it, and a verifier checks it. Complete the phases in order — each one produces what the next one needs.

## Contents

- How to Use This Manual
- Before You Start
- Phase 1 — Register & Log In (Holder)
- Phase 2 — Create Template & Issue Credential (Issuer)
- Phase 3 — Receive & View Credential (Holder)
- Phase 4 — Verify the Credential (Verifier)
- Phase 5 — Revoke, Expire, Not-Found (Issuer + Verifier)
- Phase 6 — Issuer Onboarding: Register → Root → Admin (Governance)
- Phase 7 — Admin Oversight (Admin)
- Phase 8 — Other Features
- Troubleshooting

---

## How to Use This Manual

This manual is your **step-by-step reference** for testing ChainCert. Your role's UAT Google Form records whether each test passed or failed, but it does not repeat the steps — the steps live here.

Please follow this approach:

1. **Work through the 8 phases in order.** Each phase produces something the next one needs (for example, Phase 2 issues the credential that Phase 4 verifies).
2. **After finishing each phase, answer the matching form questions.** At the end of every phase you will find a **"Forms to answer now"** box listing the exact question IDs for each role. Open your role's UAT form, answer those questions, then continue to the next phase.
3. **Answer only the questions for your assigned role.** The boxes list every role's questions per phase; a Holder tester answers the **H-** items, an Issuer tester the **I-** items, and so on.
4. **Verifier-only testers:** complete Phases 1–3 first (acting as Holder and Issuer with the shared accounts) so that you have a real credential to verify, then focus on Phases 4–5.
5. **Questions marked [internal]** (for example, A-06) require developer database access and are performed by the project team — external testers may skip them.

---

## Before You Start

**Open:** http://ccscloud.dlsu.edu.ph:20173

Everyone tests against the same shared environment, so you may see data created by other testers. Use a modern browser and a **real email you can check** (needed for the verifier code). If your browser shows "Not secure," that is expected for this demo — the site runs over plain HTTP.

**Accounts** — register your own Holder account; use the shared accounts for the other roles:

| Role | Login | Password |
|---|---|---|
| Credential Holder | *register your own* | *you choose* |
| Issuer — De La Salle University (root) | dlsu@email.com | Dlsu12345! |
| Issuer — La Salle Computer Society (subordinate) | lasallecomputersociety@email.com | pw123 |
| Administrator | admin@email.com *(also admin2@email.com)* | pw123 |
| Verifier | *no login — enter your name + real email* | — |

**Please note (demo limits):**

1. A newly registered and approved issuer **cannot actually issue credentials** — that requires a one-time blockchain setup performed behind the scenes. Only the demo issuers above can issue for real. (Test the onboarding screens in Phase 6, but do real issuing with the shared issuer accounts.)
2. The Issuer, Root, and Admin accounts are **shared** — do not change their passwords or disable them.
3. Emails to the demo **issuer/admin** addresses go to a central inbox, so you will not receive them. Emails to your own holder account, the verifier code, and share codes arrive normally.

**At a glance** — complete the phases in order and tick each one off:

| ✔ | Phase | Role | You will… |
|---|---|---|---|
| ☐ | 1 | Holder | Register your own account and log in |
| ☐ | 2 | Issuer | Create a template and issue a credential to your holder |
| ☐ | 3 | Holder | Open the credential and copy its Credential ID |
| ☐ | 4 | Verifier | Verify the credential → **VALID** |
| ☐ | 5 | Issuer + Verifier | Revoke / expire / fake it → **REVOKED / EXPIRED / NOT FOUND** |
| ☐ | 6 | Issuer → Root → Admin | Register a new issuer and approve it (screens only) |
| ☐ | 7 | Admin | Review the logs, integrity check, and analytics |
| ☐ | 8 | Holder + Issuer + Admin | Other features: profile sharing, PDF export, insights, account settings |

---

## Phase 1 — Register & Log In (Holder)

**Goal:** create your own credential-holder account. This is the account that will receive and hold credentials throughout the test.

1. Go to http://ccscloud.dlsu.edu.ph:20173 and click **Create Account**.
   *[Screenshot: Landing page — Create Account]*
2. Choose **User** (credential holder).
   *[Screenshot: Role selection — User or Issuer]*
3. Fill in your details and click **Register**.
   *Example:* First Name `Juan`, Last Name `Dela Cruz`, Email `your.real@email.com`, Username `juandc`, Password `Chaincert2026!` (minimum 10 characters).
   > **Use a real email you can open.** The system sends credential notifications (and password resets) to this address, so you will want to receive them during testing.
   *[Screenshot: User registration form]*
4. Log in with your new email and password.
   *[Screenshot: Login page]*
5. *(Optional)* Try **Forgot Password** (log out first). Its purpose is to let a holder regain access without help. Click **Forgot Password** on the login page, enter your email, check your inbox for the OTP, then set a new password.
   → **What to expect:** you are returned to the **login page**, and you receive an **email confirming your password was changed**. Log in again with your **new** password to confirm it works.
   *[Screenshot: Forgot Password — OTP flow]*

→ **What to expect:** you land on your wallet dashboard. It is **empty** — no credentials yet.
*[Screenshot: Empty wallet]*

> **✅ Forms to answer now:** Credential Holder form — **H-01, H-02, H-03, H-04, H-22**.

---

## Phase 2 — Create Template & Issue Credential (Issuer)

**Goal:** issue a credential to the holder account you just made. This is the core issuer task — turning a reusable template into a credential owned by a specific person and recorded on the blockchain.

1. Log out, then log in as the shared issuer **dlsu@email.com / Dlsu12345!**.
   *[Screenshot: Issuer dashboard — home]*
2. Open **Create Template**. Fill in the fields and click **Create Template**.
   *(A template is a reusable blueprint — you fill in the details once, then issue many credentials from it without re-typing everything.)*
   > **Note:** give the template a **unique name** that you are not already using for another active template of yours. Duplicate active names are rejected with an error; either choose a different name or archive the existing template.
   *Example values:*
   - **Credential Name:** `Bachelor of Science in Information Technology`
   - **Credential Type:** `Academic` *(or `Professional` / `Training`)*
   - **Description:** `Awarded upon completion of the BSIT program at De La Salle University.`
   - **Skills:** `Programming`, `Database Management`, `Web Development` *(type each and press Enter)*
   - **Badge Image:** any image file, e.g. a program or school logo (PNG/JPG)
   - **Allow holders to request renewal:** on by default — check for credentials holders should be able to ask to renew (an ID or membership); uncheck for one-time credentials like a diploma. Only renewable credentials show holders a **Request renewal** button (see Phase 8).

   *[Screenshot: Create Template — form filled]*
   *[Screenshot: Create Template — success message]*
3. Open **Issue Credential** and select the template you just created.
   *[Screenshot: Issue Credential — template dropdown]*
4. Select the **recipient** — your holder account from Phase 1.
   *(The dropdown lists only holders who can still receive this credential. Anyone who already holds a valid copy is hidden — you cannot issue the same template to the same person twice. If a holder's copy was later revoked or expired, they become selectable again.)*
   *[Screenshot: Issue Credential — recipient dropdown]*
5. *(Optional)* set an expiry date — e.g. one year from today — then click **Issue Credential**.
   *[Screenshot: Issue Credential — success]*

→ **What to expect:** a success confirmation, and the credential is recorded on the blockchain. The holder is notified **two ways at once**: an in-app notification (bell icon) **and** an email to their registered address. *(You will see both in Phase 3.)*

### Also on the Issuer Dashboard

These tools let you find, audit, and analyze everything you have issued — without leaving the dashboard.

- **View All Credentials** — *Purpose:* a single place to find any template or issued credential you have created, so you do not have to remember IDs.
  1. Open the **View All Credentials** tab.
  2. Use the **search** box to find a credential by name or ID, and the **status/type filters** to narrow the list (for example, only issued, or only a given credential type).
  *[Screenshot: Issuer — View All Credentials]*
- **Credential History** *(navigation bar)* — *Purpose:* shows the credential's immutable, on-chain trail, which is your proof that nothing was changed after the fact.
  1. Open **Credential History** from the navigation bar.
  2. Read the timeline for each credential: **creation → issuance → revocation / expiration**, each entry stamped with a timestamp.
  *[Screenshot: Issuer — Credential History]*
- **Analytics** — *Purpose:* turns your issuing activity into plain-language insights, so you can see your output and spot problems.
  1. Open the **Analytics** view.
  2. Read **Issuance Performance** — how many credentials you have issued and the trend over time.
  3. Read **Revocation Self-Audit** — revocations broken down **by template** and by **how quickly after issuance** they were revoked, which helps you catch a template or process that keeps producing mistakes.
  *[Screenshot: Issuer — Analytics (Issuance Performance + Revocation Self-Audit)]*

> **✅ Forms to answer now:** Issuer form — **I-01, I-02, I-03, I-04, I-05, I-06, I-07, I-08, I-10, I-11, I-12, I-17**.

---

## Phase 3 — Receive & View Credential (Holder)

**Goal:** see the credential and copy its ID for verification. This confirms the holder actually receives, can read, and can prove ownership of what was issued.

1. Log out, then log back in as your **holder** account.
   *[Screenshot: Wallet — with the new credential]*
2. Open the **notification bell** — you will see "you received a new credential."
   *[Screenshot: Holder notification]*
3. Check your **email inbox** — you should also have received an email about the new credential.
   *[Screenshot: Email — new credential notification]*
4. Click the credential to open its **details**.
   *[Screenshot: Credential detail view]*
5. **Copy the Credential ID** — you will paste it in Phase 4.
   *[Screenshot: Credential detail — Credential ID highlighted]*
6. Click **View Blockchain History** to see the on-chain timeline of this credential (creation, issuance, and any later events, with timestamps).
   *Purpose:* lets the holder independently confirm the credential's history on the ledger, not just trust the app's display.
   *[Screenshot: Credential detail — Blockchain History]*

→ **What to expect:** the credential appears in the wallet with status **Issued** (issuer, dates, skills, Credential ID), **plus** an in-app notification **and** an email — confirming the holder is alerted both ways.

> **✅ Forms to answer now:** Credential Holder form — **H-05, H-06, H-07, H-10, H-11, H-12**.

---

## Phase 4 — Verify the Credential (Verifier)

**Goal:** confirm the credential is authentic. No login is required, but you must confirm your email first. This is the feature a real employer or registrar would use to check a credential.

1. Go to the **Verify** page.
   *[Screenshot: Verifier — landing]*
2. Enter your **name** and a **real email**, then click **Send verification code**. A 6-digit code is emailed to that address.
   *Example:* Name `Maria Santos` (HR, Acme Corp), Email `your.real@email.com` (use one you can check for the code).
   *[Screenshot: Verifier — email confirmation]*
3. Open your email, then enter the **6-digit code** and click **Verify & continue**.
   *(Why this step: it proves you own the email, so each verification is recorded under a real identity and cannot be faked. You only do this once per browser session.)*
   *[Screenshot: Verifier — enter code]*
4. Paste the **Credential ID** from Phase 3 and click **Verify**.
   *[Screenshot: Verifier — credential ID entered]*

→ **What to expect: VALID** — authentic and active, showing who it was issued to, the issuer, the status, and the Credential ID. The check itself is also recorded on the blockchain (visible later to the admin in Phase 7).
*[Screenshot: Verification result — VALID]*

> **✅ Forms to answer now:** Verifier form — **V-01, V-02, V-03, V-04, V-05, V-09**.

---

## Phase 5 — Revoke, Expire, Not-Found (Issuer + Verifier)

**Goal:** see the other three verdicts. This proves the system does not just say "valid" for everything — it correctly reports credentials that were cancelled, that lapsed, or that never existed.

**Revoked** — *why revoke:* an issuer sometimes needs to cancel a credential it already issued (wrong recipient, misconduct, an error in the record). Revocation records that cancellation on the blockchain so verifiers see it immediately.
1. As the issuer (**dlsu@email.com**), open **Revoke Credential**, select the credential and holder, enter a reason (e.g. `Issued to the wrong recipient`), then click **Revoke Credential**.
   *[Screenshot: Revoke Credential — form]*
   *[Screenshot: Revoke Credential — success]*
2. As the verifier, re-verify the **same Credential ID**.
   → **REVOKED**, with the reason shown.
   *[Screenshot: Verification result — REVOKED]*
   → **What to expect:** the holder is also alerted about the revocation — in-app notification **and** email. When they open the credential in their wallet, it now shows **Revoked**.

**Expired** — *why:* credentials such as certifications lapse on a date, and a verifier must see that immediately.
3. As the issuer **dlsu@email.com**, create and issue a credential whose **expiry date is in the past**, then verify it:
   1. Open **Create Template** and create a template (or reuse an existing one).
   2. Open **Issue Credential**, select the template and your holder account.
   3. Set the **expiry date to yesterday's date**, then click **Issue Credential**.
   4. Open the credential (or its confirmation) and **copy the Credential ID**.
   5. As the verifier, verify that ID.
   → **EXPIRED**. *(The system checks the date at verification time, so a past-dated credential reads as expired immediately — you do not have to wait. A daily background job also flips expired credentials automatically.)*
   > **Note (UAT only):** issuing a credential with a past expiry date is enabled for this testing round. In the production build this is blocked, so this exact step is a UAT convenience for demonstrating the **EXPIRED** verdict.
   *[Screenshot: Verification result — EXPIRED]*
   > **Boundary case:** a credential does not expire the instant its date starts — it stays valid through the **end of that day**. If you issue a credential with **today's date** as the expiry, verifying it the same day should still return **VALID**, not EXPIRED.

**Not Found** — *why:* a made-up or mistyped ID must not resolve to a real credential.
4. As the verifier, type any **made-up ID** and verify.
   → **NOT FOUND** (likely a fake or mistyped ID).
   *[Screenshot: Verification result — NOT FOUND]*

**Verdict quick reference:**

| Result | Meaning |
|---|---|
| VALID | Exists on-chain, not revoked, not expired. |
| REVOKED | Cancelled by the issuer (reason shown). |
| EXPIRED | Past its expiry date. |
| NOT FOUND | No such credential — likely fake or mistyped. |

> **✅ Forms to answer now:** Credential Holder form — **H-21** · Issuer form — **I-09** · Verifier form — **V-06, V-07, V-08, V-11**.

---

## Phase 6 — Issuer Onboarding: Register → Root → Admin (Governance)

**Goal:** test the issuer sign-up and two-tier approval screens. This is how a new organization would apply to become an issuer.

*Why two tiers: a subordinate issuer is first vouched for by its root authority (e.g. its parent university), then cleared by the platform admin — so no organization can issue credentials without being checked. Every approval/rejection is recorded on the blockchain.*

> **Reminder (demo limit 1):** this tests the onboarding **screens**. The resulting issuer will show as *Approved* but **cannot actually issue** — use the shared demo issuers for real issuing.

**Register a new issuer**
1. **Create Account → Issuer.** Fill in Part 1 (organization details).
   *Example:* Organization Name `Sample Training Institute`, Organization Email `sampletraining@email.com`, Password `Chaincert2026!`.
   *[Screenshot: Issuer registration — Part 1]*
2. Part 2 — pick a **category** (e.g. `Training Provider`); the required-documents list appears.
   *[Screenshot: Issuer registration — Part 2]*
3. Part 3 — pick a **type**. If **Subordinate**, choose *De La Salle University* as the root authority.
   *[Screenshot: Issuer registration — Part 3]*
4. Part 4 — upload the required documents (any sample **PDF** works for testing), review, and **Submit**. Status becomes **Pending**.
   *[Screenshot: Issuer registration — Part 4]*

**Root authority approves** *(subordinate applications only)*
5. Log in as **dlsu@email.com** → **Subordinate Management** → Pending.
   *[Screenshot: Subordinate Management — pending list]*
6. Open the application, review it, and click **Approve**. Status becomes **Root Approved**.
   → **What to expect:** the applicant is **emailed** that its root authority approved it and that the application now moves to the platform admin. *(For the test issuer account this email goes to the central demo inbox — see demo limit 3.)*
   *[Screenshot: Subordinate application — review + approve]*

**Admin approves**
7. Log in as **admin@email.com** → **Issuers** → Pending.
   *[Screenshot: Admin — pending issuers]*
8. Open the application, review the documents, and click **Approve**. Status becomes **Approved**.
   *[Screenshot: Admin — issuer review + approve]*

→ **What to expect:** the status flows **Pending → Root Approved → Approved**. (For root-issuer applications there is no root step — the admin approves directly.) Each submission and root decision also raises an **in-app notification** for the admin. *(The matching email goes to the central demo inbox, not to you — see demo limit 3.)* A new application produces **exactly one** admin-notification email, regardless of how many admin accounts exist.

> **✅ Forms to answer now:** Issuer form — **I-13, I-14, I-15** · Admin form — **A-07, A-08, A-09, A-10, A-22**.

---

## Phase 7 — Admin Oversight (Admin)

**Goal:** review the records your earlier phases created. This is the platform administrator's control room for oversight and auditing. Log in as **admin@email.com** — you land directly on **Manage Issuers → Pending**, since clearing the pending-issuer queue is the admin's most time-sensitive task, not browsing records.

1. **Issuers tab (default landing) — Pending queue** — *Purpose:* work the longest-waiting applications first instead of guessing at the backlog.
   The **Pending** view opens with an **Approval Queue & Turnaround** summary (how many applications are waiting, the oldest wait in days, and your average approval time) and a **Days Waiting** column on every row — sort **Oldest First** to see who has waited longest. Approve/reject from here exactly as in Phase 6.
   *[Screenshot: Admin — Issuers, Pending queue with Approval Queue & Turnaround + Days Waiting]*
2. **Credentials tab** — *Purpose:* one master view of everything issued across all issuers, for spot-checks and support.
   Browse every template and issued credential across all issuers; filter by issuer/type/status and search by name or ID.
   *[Screenshot: Admin — Credentials tab]*
3. **Integrity Check** — Analytics & Reports tab → **Run Integrity Check**.
   *What it's for: lets the admin catch tampering — it checks each record in the fast-read database against the blockchain, so if any record was altered outside the app, the mismatch is flagged. (The blockchain is the source of truth.)*
   You can **run it manually** at any time from this tab. It **also runs automatically every day at 8:00 AM (Manila time)**, and emails the admins only when it finds a mismatch.
   *[Screenshot: Admin — Integrity Check results]*
4. **Logs** — Logs tab → verification, status, issuer-decision, and root-subordinate logs. *(If you switch between `admin@email.com` and `admin2@email.com`, notice each logged action shows which admin performed it.)*
   *What it's for: a tamper-evident audit trail — every verification and governance decision is recorded on the blockchain and cannot be edited or deleted after the fact.*
   *[Screenshot: Admin — Logs tab]*
5. **Analytics & Reports** — verification result summary, **Issuers to Review** (issuers with an unusually high revocation rate — a prompt to take a closer look, not an automatic verdict), and integrity insight; open a credential's **Dossier** for its full trail.
   *What it's for: turns the raw logs into plain-language insights — e.g. how many checks came back valid vs. fake, and which issuers' revocation patterns are worth a second look. Each chart has a "Summary:" note, and any longer explanation is tucked behind a small **?** you hover or tap to read.*
   *[Screenshot: Admin — Analytics & Reports]*
6. **Users** — *What it's for:* lets the admin restrict a holder's access; a disabled user cannot log in, and every change is logged on the blockchain.
   1. Open the **Users** tab.
   2. Find the holder account you want to manage.
   3. Click **Disable** and confirm — that user can no longer log in.
   4. Click **Enable** to restore access.
   *(Do not disable the shared accounts.)*
   *[Screenshot: Admin — Users tab, enable/disable]*
7. **Issuers tab — Approved view** — *Purpose:* the same access control, but for issuers.
   Switch the Issuers tab's view to **Approved**, then **enable or disable** an approved issuer's access. *(Do not disable the shared demo issuers.)*
   *[Screenshot: Admin — Issuers tab, Approved view, enable/disable]*

→ **What to expect:** the credential you issued, verified, and revoked in earlier phases appears across these logs and reports.

> **✅ Forms to answer now:** Admin form — **A-01, A-02, A-03, A-04, A-05, A-11, A-12, A-13, A-14, A-15, A-16, A-17, A-18, A-19, A-21**. *(A-06 is marked [internal] — performed by the project team with database access.)*

---

## Phase 8 — Other Features

**Goal:** exercise the remaining, everyday features. Some are self-explanatory — for those we simply tell you where to find them so you can try them. Others benefit from a short walkthrough, which we provide. Every feature includes a one-line note on what it is for.

### Holder features

- **Wallet views & search** *(as a Holder)* — *Purpose:* find a credential quickly in a large wallet. On your wallet dashboard, switch between **Cards** and **List** view, and use the search box, status filter, and sort options.
  *[Screenshot: Wallet — Cards/List toggle and filters]*
- **Holder Insights** — *Purpose:* a plain-language read on how your credentials are doing, so you know what needs attention.
  1. On your wallet dashboard, find the **insights** panels.
  2. Review **Credential Health** (an overall status summary), **Renewal Alerts** (credentials nearing expiry, with a View button), and **Verification Insights** (how often and with what result your credentials have been checked).
  3. Each panel includes a "Summary:" note; longer explanations are hidden behind a small **?** you hover or tap.
  *[Screenshot: Wallet — Holder Insights]*
- **Request a renewal** — *Purpose:* ask the issuer to re-issue an expiring credential, without leaving your wallet.
  1. On a **Renewal Alert** (see Holder Insights above), click **Request renewal**. *(Only shown when the issuer marked that credential renewable — a one-time credential like a diploma won't offer this; see Phase 2.)*
  2. The button changes to **Renewal requested ✓**. The issuer reviews it against their own records, then either issues you a fresh credential with a new expiry, or declines with a reason you can read.
  3. If approved, your wallet shows one credential card with a **"↻ Renewed N×"** badge — open **See History** for the full Issued → Expired → Reissued timeline.
  *[Screenshot: Wallet — Request renewal, and a Renewed badge]*
- **Edit Profile** — *Purpose:* control the bio and picture shown on your shared public profile. **Locate it:** Profile page → update your bio and profile picture → **Save**.
- **Preview Public Profile** — *Purpose:* see exactly what a viewer sees before you share, so nothing private is exposed by accident. **Locate it:** Profile page → **Preview Public Profile**.
- **Reorder credentials** — *Purpose:* choose the order your credentials appear on your shared profile. **Locate it:** Profile page → drag-and-drop your credentials.
- **Visibility (Public/Private)** — *Purpose:* keep selected credentials off your shared profile while keeping them in your wallet. **Locate it:** on a credential, toggle **Public/Private** — private credentials are hidden from your shared profile but stay in your own wallet.
- **Profile Sharing** — *Purpose:* let someone view your credentials without them logging in — either openly or restricted to one person.
  1. Go to **Profile → Share Profile**.
  2. **Anyone with Link** — your permanent public link is shown automatically; click **Copy**. Anyone with the link can view your public credentials.
  3. **Specific Recipient** — enter the recipient's email and click **Generate & Send Link**. The link is emailed to them, and when they open it they must enter a **6-digit code emailed to them** before your profile shows. *(Same idea as the verifier code — it confirms the viewer is who you meant to share with. The recipient needs a real, checkable email.)*
  *[Screenshot: Profile — Share Profile]*
- **Revoke a share link** — *Purpose:* immediately cut off access to a link you shared earlier. **Steps:** from the **Share Links** list, click **Revoke** next to the link — it stops working right away.
- **PDF export** — *Purpose:* produce a portable, re-verifiable copy of a credential to attach to an application or email.
  1. From a credential, click **Export PDF** (single credential or full portfolio).
  2. The file includes the **Credential ID** and a **verification link (with QR code)**, so anyone can re-verify it later. If the export includes a **revoked** credential, a styled in-app confirmation names it before the download proceeds.
  > **Note:** on this HTTP demo site, your browser may warn that the download is "not secure" or ask you to **Keep** it. This is expected because the site runs over plain HTTP (no TLS yet) — click **Keep**. The PDF is generated **in your browser**, so it is safe.
  *[Screenshot: Credential — Export PDF]*
- **Notifications** — *Purpose:* keep the holder informed of issue/revoke events. **Locate it:** the bell icon shows issue/revoke alerts (also sent by email).

### Issuer features

- **Decide renewal requests** — *Purpose:* review a holder's renewal request against your own records — ChainCert routes the request, it doesn't verify requalification for you.
  1. Go to the **Issue** view → **Renewal Requests** card (click to expand — it's collapsed by default to keep the Issue view uncluttered).
  2. **Approve** to issue a fresh credential with a new expiry on the spot, or **Decline** with a reason the holder will see.
  3. Both decisions are recorded immutably on the blockchain, whether approved or declined.
  *[Screenshot: Issuer — Renewal Requests queue]*
- **Batch issuance** — *Purpose:* issue one credential to many holders in a single pass instead of one at a time.
  1. Go to the **Issue** view → **Batch issue from list**.
  2. Pick the credential, then import a **.csv or .txt** file of recipient **emails or holder IDs** (one per line, or comma-separated).
  3. Confirm — each recipient is issued individually on the blockchain, with a live progress bar and a per-recipient success/failure result.
  *[Screenshot: Issuer — Batch issue from list]*
- **Batch revocation** — *Purpose:* revoke many credentials at once with one shared reason (e.g. a membership year lapsing for hundreds of holders).
  1. Go to the **Revoke** view.
  2. Select credentials via the checkboxes, or click **Import .csv / .txt of IDs** to select by a file of credential IDs (one per line, or comma-separated).
  3. Enter one reason, confirm, and watch the progress bar — each credential is revoked individually on the blockchain, with a per-credential result at the end.
  *[Screenshot: Issuer — Batch revoke]*

### Verifier features

- **Bulk verify from a PDF** — *Purpose:* check every credential in someone's portfolio in one pass instead of one ID at a time.
  1. On the **Verification Dashboard**, confirm your email first (see Phase 5).
  2. Under **Bulk verify from a ChainCert PDF**, choose the holder's **exported ChainCert PDF** — the original digital file. *(A scanned or printed copy won't work — the verification links only exist in the digital export.)*
  3. Verification **starts automatically** the moment the PDF is processed — no extra button to click. Every credential inside is checked live against the blockchain in one pass, each shown as a full result card, and every check is logged under your verified email, exactly like a single verification.
  *[Screenshot: Verification Dashboard — Bulk verify from PDF]*
- **Verify all on a shared profile** — *Purpose:* live-check every credential on someone's shared profile in one click, without leaving that page.
  1. Open a holder's shared profile link (see the holder's **Profile Sharing** feature above).
  2. Confirm your email if asked — a public link needs a quick one-time code; a link sent to you specifically may already know it's you.
  3. Click **Verify all on the blockchain** — results load and display in a **popup window** (not inline over the credential list), and every check is logged under your verified email.
  *[Screenshot: Shared profile — Verify all]*

### Account security *(do this last, after finishing your role's main demo)*

- **Issuer — change your password** — *Purpose:* let an issuer rotate its own password. **Locate it:** log in as an issuer → account/settings → **Change Password** (minimum 10 characters).
- **Admin — change your password** — *Purpose:* let an admin rotate its own password; the change is logged on the blockchain. **Locate it:** log in as **admin@email.com** → account/settings → **Change Password** (minimum 10 characters).

> **✅ Forms to answer now:** Credential Holder form — **H-08, H-09, H-13, H-14, H-15, H-16, H-17, H-18, H-19, H-20, H-23, H-24** · Issuer form — **I-16, I-18, I-19, I-20** · Verifier form — **V-10** · Admin form — **A-20**.

---

## Troubleshooting

| Issue | What to do |
|---|---|
| Can't open the site | Check the URL: **http://ccscloud.dlsu.edu.ph:20173**. A "Not secure" label is expected. |
| Can't log in | Recheck email/password. For your own account, use **Forgot Password**. |
| New issuer can't issue | Expected (demo limit 1). Use the shared demo issuers for real issuing. |
| Wallet is empty | Nothing has been issued to you yet, or the status filter isn't set to **All**. |
| Verifier won't let me verify | Confirm your email first with the 6-digit code. Use a real email. |
| Real credential shows NOT FOUND | Make sure the Credential ID is exact (copy-paste it) and was actually issued. |
| "Duplicate name" when creating a template | You already have an active template with that name. Use a different name or archive the old one. |
| PDF download shows "not secure" / asks to Keep | Expected on the HTTP demo. Click **Keep** — the file is generated in your browser. |
| No email received | Demo issuer/admin emails route to a central inbox (demo limit 3). Your own account, verifier, and share-code emails arrive normally. |

For anything not covered here, contact your UAT facilitator or the ChainCert project team.
