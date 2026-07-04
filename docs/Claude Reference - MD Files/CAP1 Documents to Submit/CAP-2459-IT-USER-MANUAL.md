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
   *Example:* First Name `Juan`, Last Name `Dela Cruz`, Email `your.real@email.com` (use one you can check), Username `juandc`, Password `Chaincert2026!` (min. 10 characters).
   *[Screenshot: User registration form]*
4. Log in with your new email and password.
   *[Screenshot: Login page]*

→ **What to expect:** You land on your wallet dashboard. It is **empty** — no credentials yet.
*[Screenshot: Empty wallet]*

---

## Phase 2 — Create Template & Issue Credential (Issuer)

**Goal:** issue a credential to the holder account you just made.

1. Log out, then log in as **dlsu@email.com / pw123**.
   *[Screenshot: Issuer dashboard — home]*
2. Open **Create Template**. Fill in the fields and click **Create Template**.
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
4. Select the **recipient** — your holder account from Phase 1.
   *[Screenshot: Issue Credential — recipient dropdown]*
5. *(Optional)* set an expiry date — e.g. one year from today — then click **Issue Credential**.
   *[Screenshot: Issue Credential — success]*

→ **What to expect:** a success confirmation. The credential is now recorded on the blockchain and sent to the holder.

---

## Phase 3 — Receive & View Credential (Holder)

**Goal:** see the credential and copy its ID for verification.

1. Log out, then log back in as your **holder** account.
   *[Screenshot: Wallet — with the new credential]*
2. Open the **notification bell** — you'll see "you received a new credential."
   *[Screenshot: Holder notification]*
3. Click the credential to open its **details**.
   *[Screenshot: Credential detail view]*
4. **Copy the Credential ID** — you'll paste it in Phase 4.
   *[Screenshot: Credential detail — Credential ID highlighted]*

→ **What to expect:** the credential shows status **Issued**, with the issuer, dates, skills, and its Credential ID.

---

## Phase 4 — Verify the Credential (Verifier)

**Goal:** confirm the credential is authentic. No login required.

1. Go to the **Verify** page.
   *[Screenshot: Verifier — landing]*
2. Enter your **name** and a **real email**, then click **Send verification code**.
   *Example:* Name `Maria Santos` (HR, Acme Corp), Email `your.real@email.com` (use one you can check for the code).
   *[Screenshot: Verifier — email confirmation]*
3. Enter the **6-digit code** from your email, then click **Verify & continue**.
   *[Screenshot: Verifier — enter code]*
4. Paste the **Credential ID** from Phase 3 and click **Verify**.
   *[Screenshot: Verifier — credential ID entered]*

→ **What to expect: VALID** — authentic and active, showing who it was issued to, the issuer, the status, and the Credential ID.
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

**Expired**
3. As the issuer, issue a new credential with an **expiry date in the past** (e.g. yesterday's date), copy its ID, then verify it.
   → **EXPIRED**.
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

→ **What to expect:** the status flows **Pending → Root Approved → Approved**. (For root-issuer applications there is no root step — the admin approves directly.)

---

## Phase 7 — Admin Oversight (Admin)

**Goal:** review the records your earlier phases created. Log in as **admin1@email.com**.

1. **Integrity Check** — Credentials tab → **Run Integrity Check**. Compares each record against the blockchain and flags any mismatch.
   *[Screenshot: Admin — Integrity Check results]*
2. **Logs** — Logs tab → verification, status, issuer-decision, and root-subordinate logs.
   *[Screenshot: Admin — Logs tab]*
3. **Analytics & Reports** — verification summary, suspicious activity, demand index, and integrity insight; open a credential's **Dossier** for its full trail.
   *[Screenshot: Admin — Analytics & Reports]*
4. **Users** — enable or disable a holder account. *(Don't disable the shared accounts.)*
   *[Screenshot: Admin — Users tab]*

→ **What to expect:** the credential you issued, verified, and revoked in earlier phases appears across these logs and reports.

---

## Phase 8 — Extra Features (Optional)

- **Profile sharing** — Profile → **Share Profile** → choose a **public link** or a **specific-recipient link** (viewer enters an emailed code) → copy the link.
  *[Screenshot: Profile — Share Profile]*
- **PDF export** — from a credential, **Export PDF** (single or full portfolio). Includes the Credential ID and a verification link.
  *[Screenshot: Credential — Export PDF]*
- **Visibility** — toggle a credential **Public/Private**. Private credentials are hidden from your shared profile.
- **Settings** — change your password (min. 10 characters) and notification preferences.
- **Notifications** — the bell icon shows issue/revoke alerts for holders.

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
