<!-- Maintained user manual — UAT edition (phase-based test script). Refreshed 2026-07-04 to match the deployed CCSCloud VM build.
     Screenshot placeholders are marked inline as *[Screenshot: ...]* — replace each with a real screen capture. -->

# ChainCert — User Manual (UAT Edition)

**ChainCert** — Blockchain-Based Credential Issuance and Verification Platform
Updated: July 4, 2026 — CAP-2459-IT

## Introduction

ChainCert issues, manages, and verifies digital credentials on a blockchain, so credentials can be checked instantly and cannot be silently tampered with. This guide walks you through testing the platform in **8 phases**, following the natural flow of a credential: an issuer creates it, a holder receives it, and a verifier checks it. Do the phases in order — each one produces what the next one needs.

## Contents

- Before You Start
- Phase 1 — Register & Log In (Holder)
- Phase 2 — Create Template & Issue Credential (Issuer)
- Phase 3 — Receive & View Credential (Holder)
- Phase 4 — Verify the Credential (Verifier)
- Phase 5 — Revoke, Expire, Not-Found (Issuer + Verifier)
- Phase 6 — Issuer Onboarding: Register → Root → Admin (Governance)
- Phase 7 — Admin Oversight (Admin)
- Phase 8 — Extra Features (Optional)
- Troubleshooting

---

## Before You Start

**Open:** http://ccscloud.dlsu.edu.ph:20173

Everyone tests against the same shared environment, so you may see data created by other testers. Use a modern browser and a **real email you can check** (needed for the verifier code). If your browser shows "Not secure," that is expected for the demo.

**Accounts** — register your own Holder account; use the shared accounts for the other roles:

| Role | Login | Password |
|---|---|---|
| Credential Holder | *register your own* | *you choose* |
| Issuer — De La Salle University (root) | dlsu@email.com | pw123 |
| Issuer — La Salle Computer Society (subordinate) | lasallecomputersociety@email.com | pw123 |
| Administrator | admin1@email.com *(also admin2@email.com)* | pw123 |
| Verifier | *no login — enter your name + real email* | — |

**Please note (demo limits):**

1. A newly registered + approved issuer **cannot actually issue credentials** — that needs a one-time blockchain setup we do behind the scenes. Only the demo issuers above can truly issue. (Test the onboarding screens in Phase 6, but do real issuing with the shared issuer accounts.)
2. The Issuer, Root, and Admin accounts are **shared** — do not change their passwords or disable them / each other.
3. There are **no ready-made credential IDs** — you create one by issuing (Phase 2), then verify it (Phase 4).
4. Emails to the demo **issuer/admin** addresses go to a central inbox, so you won't receive them. Emails to your own holder account, the verifier code, and share codes arrive normally.

**At a glance** — do the phases in order and tick each one off:

| ✔ | Phase | Role | You will… |
|---|---|---|---|
| ☐ | 1 | Holder | Register your own account and log in |
| ☐ | 2 | Issuer | Create a template and issue a credential to your holder |
| ☐ | 3 | Holder | Open the credential and copy its Credential ID |
| ☐ | 4 | Verifier | Verify the credential → **VALID** |
| ☐ | 5 | Issuer + Verifier | Revoke / expire / fake it → **REVOKED / EXPIRED / NOT FOUND** |
| ☐ | 6 | Issuer → Root → Admin | Register a new issuer and approve it (screens only) |
| ☐ | 7 | Admin | Review the logs, integrity check, and analytics |
| ☐ | 8 | Holder | *(Optional)* Profile sharing, PDF export, settings |

---

## Phase 1 — Register & Log In (Holder)

**Goal:** create your own credential-holder account.

1. Go to http://ccscloud.dlsu.edu.ph:20173 and click **Create Account**.
   *[Screenshot: Landing page — Create Account]*
2. Choose **User** (credential holder).
   *[Screenshot: Role selection — User or Issuer]*
3. Fill in your details and click **Register**.
   *Example:* First Name `Juan`, Last Name `Dela Cruz`, Email `your.real@email.com`, Username `juandc`, Password `Chaincert2026!` (min. 10 characters).
   > **Use a real email you can open.** The system sends credential notifications (and password resets) to this address, so you'll want to receive them during testing.
   *[Screenshot: User registration form]*
4. Log in with your new email and password.
   *[Screenshot: Login page]*
5. *(Optional)* Try **Forgot Password**: click it on the login page, enter your email, check your inbox for the OTP, then set a new password.
   *[Screenshot: Forgot Password — OTP flow]*

→ **What to expect:** You land on your wallet dashboard. It is **empty** — no credentials yet.
*[Screenshot: Empty wallet]*

---

## Phase 2 — Create Template & Issue Credential (Issuer)

**Goal:** issue a credential to the holder account you just made.

1. Log out, then log in as **dlsu@email.com / pw123**.
   *[Screenshot: Issuer dashboard — home]*
2. Open **Create Template**. Fill in the fields and click **Create Template**.
   *(A template is a reusable blueprint — you fill in the details once, then issue many credentials from it without re-typing everything.)*
   *Example values:*
   - **Credential Name:** `Bachelor of Science in Information Technology`
   - **Credential Type:** `Academic` *(or `Professional` / `Training`)*
   - **Description:** `Awarded upon completion of the BSIT program at De La Salle University.`
   - **Skills:** `Programming`, `Database Management`, `Web Development` *(type each and press Enter)*
   - **Badge Image:** any image file, e.g. a program or school logo (PNG/JPG)

   *[Screenshot: Create Template — form filled]*
   *[Screenshot: Create Template — success message]*
3. Open **Issue Credential** and select the template you just created.
   *[Screenshot: Issue Credential — template dropdown]*
4. Select the **recipient** — your holder account from Phase 1. *(The dropdown only lists holders who don't already hold this credential — you can't issue the same template to the same person twice.)*
   *[Screenshot: Issue Credential — recipient dropdown]*
5. *(Optional)* set an expiry date — e.g. one year from today — then click **Issue Credential**.
   *[Screenshot: Issue Credential — success]*

→ **What to expect:** a success confirmation, and the credential is recorded on the blockchain. The holder is notified **two ways at once**: an in-app notification (bell icon) **and** an email to their registered address. *(You'll see both in Phase 3.)*

**Also on the Issuer Dashboard:**
- **View All Credentials** — every template and issued credential you've created, with search and filters.
- **Credential History** (navigation bar) — the full blockchain trail of your credentials: creation, issuance, revocation, expiration.
- **Analytics** — **Issuance Performance** (how much you've issued over time) and **Revocation Self-Audit** (revocations by template and how quickly after issuance).

---

## Phase 3 — Receive & View Credential (Holder)

**Goal:** see the credential and copy its ID for verification.

1. Log out, then log back in as your **holder** account.
   *[Screenshot: Wallet — with the new credential]*
2. Open the **notification bell** — you'll see "you received a new credential."
   *[Screenshot: Holder notification]*
3. Check your **email inbox** — you should also have received an email about the new credential.
   *[Screenshot: Email — new credential notification]*
4. Click the credential to open its **details**.
   *[Screenshot: Credential detail view]*
5. **Copy the Credential ID** — you'll paste it in Phase 4.
   *[Screenshot: Credential detail — Credential ID highlighted]*
6. Click **View Blockchain History** to see the on-chain timeline of this credential (creation, issuance, and any later events, with timestamps).
   *[Screenshot: Credential detail — Blockchain History]*

→ **What to expect:** the credential appears in the wallet with status **Issued** (issuer, dates, skills, Credential ID), **plus** an in-app notification **and** an email — confirming the holder is alerted both ways.

---

## Phase 4 — Verify the Credential (Verifier)

**Goal:** confirm the credential is authentic. No login required, but you must confirm your email first.

1. Go to the **Verify** page.
   *[Screenshot: Verifier — landing]*
2. Enter your **name** and a **real email**, then click **Send verification code**. A 6-digit code is emailed to that address.
   *Example:* Name `Maria Santos` (HR, Acme Corp), Email `your.real@email.com` (use one you can check for the code).
   *[Screenshot: Verifier — email confirmation]*
3. Open your email, then enter the **6-digit code** and click **Verify & continue**.
   *(Why this step: it proves you own the email, so each verification is recorded under a real identity and can't be faked. You only do this once per browser session.)*
   *[Screenshot: Verifier — enter code]*
4. Paste the **Credential ID** from Phase 3 and click **Verify**.
   *[Screenshot: Verifier — credential ID entered]*

→ **What to expect: VALID** — authentic and active, showing who it was issued to, the issuer, the status, and the Credential ID. The check itself is also recorded on the blockchain (visible later to the admin in Phase 7).
*[Screenshot: Verification result — VALID]*

---

## Phase 5 — Revoke, Expire, Not-Found (Issuer + Verifier)

**Goal:** see the other three verdicts.

**Revoked**
1. As the issuer (**dlsu@email.com**), open **Revoke Credential**, select the credential and holder, enter a reason (e.g. `Issued to the wrong recipient`), then click **Revoke Credential**.
   *[Screenshot: Revoke Credential — form]*
   *[Screenshot: Revoke Credential — success]*
2. As the verifier, re-verify the **same Credential ID**.
   → **REVOKED**, with the reason shown.
   *[Screenshot: Verification result — REVOKED]*
   → **What to expect:** the holder is also alerted about the revocation — in-app notification **and** email. When they open the credential in their wallet, it now shows **Revoked**.

**Expired**
3. As the issuer, issue a new credential with an **expiry date in the past** (e.g. yesterday's date), copy its ID, then verify it.
   → **EXPIRED**. *(The system checks the date at verification time, so a past-dated credential reads as expired immediately — you don't have to wait. A daily background job also flips expired credentials automatically.)*
   *[Screenshot: Verification result — EXPIRED]*

**Not Found**
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

---

## Phase 6 — Issuer Onboarding: Register → Root → Admin (Governance)

**Goal:** test the issuer sign-up and two-tier approval screens.

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
   *[Screenshot: Subordinate application — review + approve]*

**Admin approves**
7. Log in as **admin1@email.com** → **Issuers** → Pending.
   *[Screenshot: Admin — pending issuers]*
8. Open the application, review the documents, and click **Approve**. Status becomes **Approved**.
   *[Screenshot: Admin — issuer review + approve]*

→ **What to expect:** the status flows **Pending → Root Approved → Approved**. (For root-issuer applications there is no root step — the admin approves directly.) Each submission and root decision also raises an **in-app notification** for the admin. *(The matching email goes to the central demo inbox, not to you — see demo limit 4.)*

---

## Phase 7 — Admin Oversight (Admin)

**Goal:** review the records your earlier phases created. Log in as **admin1@email.com**.

1. **Credentials tab** — browse every template and issued credential across all issuers; filter by issuer/type/status and search by name or ID.
   *[Screenshot: Admin — Credentials tab]*
2. **Integrity Check** — Credentials tab → **Run Integrity Check**.
   *What it's for: lets the admin catch tampering — it checks each record in the fast-read database against the blockchain, so if any record was altered outside the app, the mismatch is flagged. (The blockchain is the source of truth.)*
   *[Screenshot: Admin — Integrity Check results]*
3. **Logs** — Logs tab → verification, status, issuer-decision, and root-subordinate logs. *(If you switch between `admin1@email.com` and `admin2@email.com`, notice each logged action shows which admin performed it.)*
   *What it's for: a tamper-evident audit trail — every verification and governance decision is recorded on the blockchain and can't be edited or deleted after the fact.*
   *[Screenshot: Admin — Logs tab]*
4. **Analytics & Reports** — verification summary, suspicious activity, demand index, and integrity insight; open a credential's **Dossier** for its full trail.
   *What it's for: turns the raw logs into plain-language insights — e.g. how many checks came back valid vs. fake, and which credentials are most in demand. Each chart has a "what this means" note.*
   *[Screenshot: Admin — Analytics & Reports]*
5. **Users** — enable or disable a holder account.
   *What it's for: lets the admin restrict an account; a disabled user can't log in. Every change is logged on the blockchain. (Don't disable the shared accounts.)*
   *[Screenshot: Admin — Users tab]*
6. **Issuers** — from the Issuers tab, enable or disable an approved issuer's access. *(Don't disable the shared demo issuers.)*
   *[Screenshot: Admin — Issuers tab, enable/disable]*

→ **What to expect:** the credential you issued, verified, and revoked in earlier phases appears across these logs and reports.

---

## Phase 8 — Extra Features (Optional)

- **Wallet views & search** — on your wallet dashboard, switch between **Cards** and **List** view, and use the search box, status filter, and sort options to find a credential.
  *[Screenshot: Wallet — Cards/List toggle and filters]*
- **Holder insights** — your wallet also shows **Credential Health**, **Renewal Alerts**, and **Verification Insights** — a plain-language read on how your credentials are doing.
  *[Screenshot: Wallet — Holder insights]*
- **Edit your profile** — Profile page → update your bio and profile picture → **Save**.
  *[Screenshot: Profile — edit bio and picture]*
- **Reorder credentials** — on the Profile page, drag-and-drop your credentials to change the order they appear on your shared profile.
  *[Screenshot: Profile — drag-and-drop reorder]*
- **Profile sharing** — Profile → **Share Profile**, then choose a mode and copy the link:
  - **Public link** — anyone with the link can view your public credentials.
  - **Specific-recipient link** — you enter the recipient's email; when they open the link, they must enter a **6-digit code emailed to them** before your profile shows. *(Same idea as the verifier code — it confirms the viewer is who you meant to share with. The recipient needs a real, checkable email.)*
  *[Screenshot: Profile — Share Profile]*
- **Revoke a share link** — from the Share Links list, click **Revoke** to immediately invalidate a link you created.
- **PDF export** — from a credential, **Export PDF** (single or full portfolio). Includes the Credential ID and a verification link, so anyone can re-verify it later.
  *[Screenshot: Credential — Export PDF]*
- **Visibility** — toggle a credential **Public/Private**. Private credentials are hidden from your shared profile but stay in your own wallet.
- **Settings** — change your password (min. 10 characters) and notification preferences.
- **Notifications** — the bell icon shows issue/revoke alerts for holders (also sent by email).

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
| No email received | Demo issuer/admin emails route to a central inbox (demo limit 4). Your own account, verifier, and share-code emails arrive normally. |

For anything not covered here, contact your UAT facilitator or the ChainCert project team.
