# ChainCert — User Manual

**ChainCert** — Blockchain-Based Credential Issuance and Verification Platform
Post-UAT Edition · CAP-2459-IT · July 23, 2026

Kyle Justin Tan · Carl Kalinisan · Myles Ramirez · Ralph Lauren Tumulak

> **About this manual.** This guide teaches you how to *use* ChainCert by following one continuous story from start to finish. **Part 1 (The Core Journey)** covers the essential path every user needs: creating an account, receiving a credential, sharing it, verifying it, and revoking it. **Part 2 (Beyond the Basics)** continues the same story into the optional and advanced features, split into **Primary features** and **Secondary and account features**. You do not need Part 2 to use the system; Part 1 alone is complete.
>
> For the defense demonstration script, including the blockchain command-line proofs, the tamper-detection demo, and the proposal-problem mapping, see the **System Walkthrough (CAP-2459-IT)**. A longer, feature-by-feature reference version of this manual is preserved as **CAP-2459-IT-USER-MANUAL-FULL**.
>
> *Screenshots are noted inline as* `[Screenshot: ...]`.

---

## Table of Contents

1. Introduction — The Platform and the Cast
2. Getting Started — Creating an Account and Signing In

**Part 1 — The Core Journey**
- Scene 1: Kyle creates a holder account
- Scene 2: De La Salle University issues Kyle a credential
- Scene 3: Kyle checks his wallet
- Scene 4: Kyle shares his credential
- Scene 5: An employer verifies the credential
- Scene 6: De La Salle University revokes the credential
- Scene 7: The employer checks again

**Part 2 — Beyond the Basics (Optional / Advanced)**

*Primary features*
- Renewing an expiring credential
- Issuing or revoking in bulk
- Becoming an issuer (registration and approval)
- Administering the platform
- Reading your reports (Analytics)
- Verifying many credentials at once
- Sharing a profile and controlling visibility
- Exporting to PDF

*Secondary and account features*
- Changing your password
- Resetting a forgotten password

3. Troubleshooting

---

## 1. Introduction — The Platform and the Cast

ChainCert is a platform for issuing, holding, and verifying digital credentials that are backed by a blockchain, so a credential can be trusted instantly and cannot be quietly altered or forged. Four kinds of people use it:

- **Issuers** create and issue credentials (for example, a university or a training provider).
- **Holders** receive credentials and keep them in a personal digital wallet (for example, a student or a professional).
- **Verifiers** check whether a credential is genuine (for example, an employer or an HR officer). Verifiers do not need an account.
- **Administrators** approve issuers and oversee the platform.

### Before you start

Open the following:

- The application: `http://ccscloud.dlsu.edu.ph:20173`
- This user manual, beside you
- If you are running UAT, the ChainCert UAT form in a separate tab

### How to proceed

This guide follows one continuous story from start to finish.

- **Part 1 (The Core Journey)** covers the essential path: creating an account, receiving a credential, sharing it, verifying it, and revoking it.
- **Part 2 (Beyond the Basics)** continues the same story into the optional and advanced features. You do not need Part 2 to use the system; Part 1 alone is complete.

Do the steps in order. Each one builds on the last and creates the data the next step needs.

### Accounts

To make this manual concrete, it follows a small cast. Register your own **Holder** account with a real email (instructions below), and use the shared accounts for the other roles.

| Role | Login | Password |
|---|---|---|
| Credential Holder | Register your own real email | you choose |
| Issuer, De La Salle University (root authority) | `dlsu@email.com` | *(provided separately)* |
| Issuer, La Salle Computer Society (subordinate) | `lasallecomputersociety@email.com` | *(provided separately)* |
| Administrator | `admin@email.com` or `admin2@email.com` | *(provided separately)* |
| Verifier | no login (enter your name and a real email) | not applicable |

> Passwords for the shared demo accounts are provided separately (out-of-band) and are not committed to the repository. Rotate them before any production deployment.
>
> You sign in with your **email address and password**. There is no separate username.

---

## 2. Getting Started — Creating an Account and Signing In

### Creating an account

From the landing page, choose **Create Account** to register as a Holder. (Becoming an *issuer* is a separate, reviewed process; see Part 2.)

1. Select **Create Account**. `[Screenshot: Landing page, Create Account button]`
2. Enter your full name, a real email, and a password. `[Screenshot: Create Account form]`
3. Submit. ChainCert emails you a **6-digit confirmation code**. `[Screenshot: ChainCert confirmation email]`
4. Enter the code to activate your account. `[Screenshot: Email confirmation code entry]`

> ℹ️ **INFO:** The password field has a show/hide eye icon and a live strength checklist. Very common passwords are rejected.

### Signing in

1. Select **Login**.
2. Enter your registered email and password. `[Screenshot: Login page]`

> ℹ️ **INFO:** Forgot your password? Use **Forgot Password** (see Part 2: Resetting a forgotten password).

> **Finding your way around long lists.** Anywhere ChainCert shows a long list or table (your wallet, an issuer's credentials, the admin tables, the logs) it displays **10 rows per page** with a centered **Prev / Page X of Y / Next** control and a "Showing X to Y of N" caption beneath it. Any search, filter, or sort you apply works across the **entire** list first, then the results are paged, so you never miss a match just because it is on another page.

---

# Part 1 — The Core Journey

This is the essential path through ChainCert: a holder gets an account, an issuer gives them a credential, an employer verifies it, the issuer later revokes it, and the employer sees the change. Everything here is what a first-time user needs.

## Scene 1: Kyle creates a holder account

**Scenario.** Kyle is about to graduate. His school, De La Salle University, issues diplomas through ChainCert, so before Kyle can receive his diploma he needs a wallet to hold it in.

> ℹ️ **INFO:** If you already registered your Holder account in "Getting Started," you are done with this scene. It is repeated here so the story reads in order; skip ahead to Scene 2.

1. Open ChainCert and select **Create Account**. `[Screenshot: Create Account button on landing page]`
2. Enter your full name, email, and a password. `[Screenshot: Create Account form]`
3. Submit the form. `[Screenshot: Create Account form submitted]`
4. Check your email for the 6-digit confirmation code and enter it to activate your account. `[Screenshot: Email confirmation code entry]`

Kyle now has an empty wallet, waiting for his first credential. That credential comes from his university next.

## Scene 2: De La Salle University issues Kyle a credential

**Scenario.** Kyle is confirmed as a valid graduate, so De La Salle University issues him his diploma. DLSU is already an approved issuer, so it can issue right away. Issuing happens in two steps: the issuer first **creates** the credential (a reusable definition), then **issues** it to a specific person.

### Create the credential

1. Sign in as the issuer (`dlsu@email.com`). `[Screenshot: Issuer login]`
2. Open **Create Credential**. `[Screenshot: Create Credential section]`
3. Fill in the credential name, type, description, skills, and a badge image. `[Screenshot: Create Credential form filled in]`
4. Save it. Until it is issued to anyone, it is shown as a **Draft**. `[Screenshot: Credential saved as Draft]`

> ℹ️ **INFO:** As the name is typed, ChainCert warns live if an active credential with the same name already exists.

### Issue it to Kyle (your holder account)

1. Choose **Issue** and select the credential. `[Screenshot: Issue Credential, select credential]`
2. Pick your holder account as the recipient. `[Screenshot: Issue Credential, recipient selection]`
3. Set an expiry date, then **Confirm**. `[Screenshot: Issue Credential, expiry date]`

> ℹ️ **INFO:** Holders who already hold an active copy of this credential are filtered out of the recipient list, so the same credential cannot be issued to the same person twice.

> ℹ️ **INFO: About the expiry date.** A diploma would not normally expire, but ChainCert requires an expiry date on every credential. For this walkthrough, set it **within about 60 days from today** so the same credential can later demonstrate the **Renewal Alert** feature in Part 2. In real use, expiry fits credentials that must be renewed periodically, like a **driver's license** or a professional certification. The furthest you can set an expiry is **about 20 years out** (for example, in 2026 you can set it as far as 2046).

The moment DLSU confirms, the credential is recorded on the blockchain and Kyle is notified. `[Screenshot: Credential issued confirmation]`

> ℹ️ **INFO:** Issuing to many at once is also possible. Instead of one recipient, an issuer can import a `.csv` or `.txt` file of recipient emails or holder IDs (one per line, or comma-separated) and issue to a whole group in one pass. See Part 2: Issuing or revoking in bulk.

## Scene 3: Kyle checks his wallet

**Scenario.** Kyle signs back in and finds his new diploma waiting in his wallet, with the notification bell showing he received it.

> ℹ️ **INFO:** Kyle is also notified by email of this credential.

`[Screenshot: Holder wallet]`

**To view the credential details:**

1. Click the credential in your wallet.
2. Review its details: the issuer, its status (**Active**), the issue and expiry dates, the skills, and its unique **credential ID**.
3. Use the copy button next to the ID to copy it for sharing. `[Screenshot: Credential details]`

**To view its history:**

1. Select **See History**.
2. Review the blockchain timeline, every recorded event, newest at the top. Right now that is simply "Issued to holder." `[Screenshot: Blockchain history timeline]`

> ℹ️ **INFO:** The holder, issuer, and administrator all see this same timeline for a given credential.

Kyle has his diploma. Soon he starts job hunting, and employers want proof it is real.

## Scene 4: Kyle shares his credential

**Scenario.** Kyle is applying to jobs. Employers ask for a way to check his diploma, so he shares his credentials through a link he can put on his resume. The main way to share is a **public share link**.

1. Open the credential from your wallet and toggle its visibility from **Private** to **Public**. `[Screenshot: Visibility toggle inside credential details]`

> ℹ️ **INFO:** A credential is **Private** by default when you receive it. It will not appear on your shared profile until you switch it to **Public**.

2. Go to your **Profile** and open **Share**.
3. Choose the **Public link** type.
4. Generate the link and copy it. `[Screenshot: Generate public share link]`
5. Put the link on your resume, or send it to anyone who needs to check your credentials.

> ℹ️ **INFO: Two kinds of share link.**
> - **Public link:** anyone with the link can view your public credentials. Best when you are sharing with many people at once, like on a resume.
> - **Recipient-specific link:** tied to one person's email. They must enter a short code sent to that email before they can view. Best for a single, private handoff.

> ℹ️ **INFO: Other ways to hand off a credential.** Kyle can instead **export** the credential, or his whole portfolio, as a **PDF**, which carries a verification link inside it (see Part 2: Exporting to PDF). He can also **copy a single credential's ID** from its details page and send that directly. All of these give a verifier what they need.

Kyle adds the link to his resume. Any employer who opens it can check his credentials in seconds. Next, one of them does exactly that.

## Scene 5: An employer verifies the credential

**Scenario.** An HR recruiter reviewing Kyle's resume opens his ChainCert link to confirm the diploma is genuine. Verification needs **no account**.

1. Open the public profile link Kyle shared. His visible credentials load right away, with no login. `[Screenshot: Shared profile view]`
2. Click **Verify all on the blockchain**.
3. Provide your name and a real email. ChainCert emails you a **6-digit code**. `[Screenshot: Verifier email and code prompt]`
4. Enter the code, then the check runs.
5. Review the results. ChainCert checks each credential against the blockchain and returns **Valid**, along with each credential's details, issuer, and status. `[Screenshot: Verification result, Valid]`

> ℹ️ **INFO:** The code is only required before a check is **logged**, not to view the profile. This is what makes the record of *who* verified the credential trustworthy. Viewing a public link stays open to anyone who has it.

> ℹ️ **INFO: Other ways to verify, all against the same blockchain record.**
> (1) Go to the **Verification Dashboard** and enter a single credential **ID** directly.
> (2) Open the **verification link inside an exported PDF**.
> (3) Upload a holder's whole **portfolio PDF** to bulk-verify every credential in it at once (see Part 2: Verifying many credentials at once).

Every check itself is recorded on the blockchain, creating a permanent trail of who verified what and when. For now, every result comes back Valid. But a credential's status can change, and when it does, every future check reflects it. That is what happens next.

## Scene 6: De La Salle University revokes the credential

**Scenario.** Some time later, DLSU discovers that Kyle was not in fact a valid graduate (or the credential was issued in error). It revokes the diploma.

1. Sign back in as the issuer. `[Screenshot: Issuer login]`
2. Open **issued credentials** and select Kyle's credential. `[Screenshot: Issued credentials, select credential]`
3. Choose **Revoke**. `[Screenshot: Revoke credential dialog]`
4. Provide a reason. `[Screenshot: Revoke with reason]`

ChainCert records the revocation on the blockchain, updates the status everywhere, and notifies Kyle. The next time Kyle opens his wallet, the credential is clearly marked **Revoked**.

## Scene 7: The employer checks again

**Scenario.** On a random later day, an employer opens Kyle's shared link again and runs the check.

This time the result is **Revoked**, shown together with the reason DLSU gave. `[Screenshot: Verification result, Revoked]`

Nothing about the earlier record was erased. The blockchain simply shows the credential's current, permanent status, and anyone who checks from now on sees the same thing.

**That is the complete core loop:** a credential was created, issued, held, shared, verified, revoked, and re-verified, and every step is permanently recorded on the blockchain and cannot be altered. Everything in Part 2 builds on top of this.

---

# Part 2 — Beyond the Basics (Optional / Advanced)

These features extend the story above. You can use ChainCert fully without them; they are here for completeness and for power users. They are grouped into **Primary features** (the main optional capabilities) and **Secondary and account features** (account housekeeping).

## Primary features

### Renewing an expiring credential

**Scenario.** Some credentials expire and must be renewed, like a **driver's license**. Later, Kyle's credential is approaching its expiry date. If the issuer allowed renewals for that credential, he can request one directly from his wallet.

> ℹ️ **INFO:** Renewal applies to an **active** credential that is nearing its expiry (within 60 days). If you already revoked the credential in Scene 6, issue a fresh one with a near expiry to try this, since a revoked or expired credential is no longer active to renew.

**Steps (Holder):**

1. Look for the **Renewal Alert** in your wallet.
2. Tap **Request renewal**. `[Screenshot: Renewal Alert in wallet]`

**Steps (Issuer):**

1. Open the **Renewal Requests** queue (filterable by status, searchable).
2. **Approve** or **decline** the request. `[Screenshot: Renewal Requests queue]`

**What happens next:**

- ChainCert re-issues the credential with a new expiry date and links it to the original.
- Kyle's wallet card shows a **"Renewed N×"** badge.
- The blockchain history reads Issued, then Expired, then Reissued.
- Every renewal decision (approve or decline) is itself recorded on the blockchain.

### Issuing or revoking in bulk

When an issuer needs to act on many people at once.

**Batch issue.**

**Scenario.** It is graduation season, and DLSU needs to issue the same diploma to a whole batch of graduates at once instead of one by one.

1. In the Issue view, choose **Batch issue from list**. `[Screenshot: Issue view, Batch issue option]`
2. Pick one credential (the diploma). `[Screenshot: Batch issue, credential selection]`
3. Prepare a `.csv` or `.txt` file listing the recipients, one email or holder ID per line, or comma-separated. `[Screenshot: recipient emails inside a .txt file]`
4. Import the file. `[Screenshot: Batch issue, file import]`
5. ChainCert marks each imported recipient as **✓ Eligible** or **✗ Not eligible**, then issues to all eligible recipients one by one. `[Screenshot: Batch issuance results]`

> ℹ️ **INFO: What "eligible" means.** A recipient is **Eligible** when they (1) have a registered ChainCert holder account, and (2) do not already hold an **active** copy of this credential. A recipient is **Not eligible** if no account matches the email or ID, or if they already hold an active copy. Someone whose only copy is expired or revoked becomes eligible again.

**Batch revoke.**

**Scenario.** DLSU later needs to revoke the same credential from several holders at once (for example, a batch that was issued in error).

1. In the Revoke view, select multiple issued credentials with the checkboxes, or import a `.csv` or `.txt` list of credential IDs (one per line, or comma-separated).
2. Revoke them together. `[Screenshot: Batch revocation]`

### Becoming an issuer (registration and approval)

An organization that wants to issue credentials registers through **Create Account → Issuer Registration**.

> ℹ️ **INFO: Root Authority vs Subordinate.**
> - A **Root Authority** is a top-level, sovereign issuer (for example, De La Salle University). It has its own presence on the blockchain network and can approve its own subordinate issuers.
> - A **Subordinate** issuer operates under an existing root authority (for example, La Salle Computer Society under DLSU). It does not run its own blockchain node; it issues credentials using an identity granted by its root authority.
> Because of this, a subordinate's application is reviewed in two stages: first its chosen **root authority** approves it, then a **platform administrator** gives final approval. A root authority only needs the administrator's approval.

**Steps to register:**

1. Go to **Create Account → Issuer Registration**. `[Screenshot: Issuer Registration, entry point]`
2. Provide your organization details. `[Screenshot: Issuer Registration, organization details]`
3. Choose a **category** (this determines the required documents to upload). `[Screenshot: Issuer Registration, category selection]`
4. Indicate whether you are a **Root Authority** or a **Subordinate** under an existing root authority. `[Screenshot: Issuer Registration, Root/Subordinate selection]`
5. Submit the application. `[Screenshot: Issuer Registration submitted]`

**Review process:**

1. If you are a subordinate, your chosen root authority approves it first.
2. A platform administrator then gives final approval.

Only after the required approvals can the issuer sign in and begin issuing. Every decision along the way is recorded on the blockchain.

### Administering the platform

Signed in as an administrator (`admin@email.com`), the Admin Dashboard opens on the **Issuers → Pending** queue, the most time-sensitive task, which also shows an **Approval Queue & Turnaround** summary and how many days the oldest application has been waiting. From here an administrator can:

- Review a pending issuer's documents and **approve** or **reject** the application.
- **Enable or disable** an existing issuer or user account.
- Browse the system-wide **Credentials**, **Users**, and **Logs** views (audit logs, verification logs, and root-authority decision logs), each searchable and filterable. `[Screenshot: Admin Dashboard, Pending queue]`

### Reading your reports (Analytics)

Each role has a reports view that turns the platform's own data into plain-language insight. Every report is paired with a **Summary** box explaining what the numbers mean.

- **Holder (in the wallet's Insights view):**
  - **Credential Health:** how many of your credentials are active, expired, or revoked.
  - **Renewal Alerts:** which credentials are nearing or past their expiry date.
  - **Verification Insights:** how often your credentials have been verified, and the outcomes.
- **Issuer (in the Performance tab):**
  - **Issuance Performance:** issuance activity over time.
  - **Revocation Self-Audit:** what you have revoked, by credential and by how long after issuance.
  - **Verification Reach:** how often your issued credentials are being verified, including revoked or expired credentials that are still being checked (with the affected holder shown).
  - **Credentials in Circulation:** how many of your issued credentials are currently active versus expired or revoked.
- **Administrator (in the Analytics & Reports tab):**
  - **Verification Result Summary:** the mix of verification outcomes across the platform (valid, revoked, expired, not-found).
  - **Issuers to Review:** issuers whose revocation patterns are worth a closer look (a prompt to review, not an accusation).
  - **Integrity-Check Insight:** the result of the latest database-versus-blockchain integrity check.
  - The administrator can also open a per-credential **Credential Dossier**, which shows that credential's full blockchain timeline and every verification recorded against it.

### Verifying many credentials at once

A verifier with several credentials to check has two shortcuts on the Verification Dashboard beyond entering one ID at a time.

**Bulk verify by PDF.**

1. Upload a holder's exported credential-portfolio PDF.
2. ChainCert reads the credential IDs embedded in it and verifies every one against the blockchain in a single pass.
3. Results are kept as a running list; a second upload adds to the results rather than replacing them. `[Screenshot: Bulk PDF verification]`

> ℹ️ **INFO:** Bulk verify by PDF checks **one holder's own portfolio PDF** in a single pass. It reads the credential IDs embedded in that one person's exported portfolio. It is **not** a way to verify a mix of credentials from different people in one upload.

**Verify all on a shared profile.**

1. Open a holder's shared profile link.
2. Choose **Verify all on the blockchain**.
3. ChainCert validates every credential listed on that profile in one action. `[Screenshot: Verify all on a shared profile]`

### Sharing a profile and controlling visibility

A holder can share credentials without exporting files.

1. In your profile, generate a **share link**.
2. Choose either a **public link** (anyone with the link can view) or a **recipient-specific link** (the recipient must confirm a code sent to their email before viewing).

**Good to know:**

- Active links can be searched and revoked at any time.
- A holder controls which credentials appear on a shared profile using the **Public / Private** visibility toggle on each credential. `[Screenshot: Share links and visibility toggle]`

### Exporting to PDF

1. From a credential's details, choose **Export PDF**. To export everything at once, use the whole **portfolio** export instead.
2. Download the file. Exporting a revoked credential prompts a confirmation first. `[Screenshot: PDF export]`

**What is included in the PDF:**

- Credential details and issuer
- The blockchain credential ID
- A verification link a recipient can use
- A renewal note if applicable (for example, "Renewed: 2× — first issued <date>")
- A clear **Revoked** stamp if the credential has been revoked

## Secondary and account features

### Changing your password

While signed in, open your **Profile** or account settings and choose **Change Password**. Enter your current password, then your new one. The new password must meet the strength policy (a minimum length, and it cannot be a very common or guessable password) and cannot be the same as your current one.

### Resetting a forgotten password

1. On the login page, choose **Forgot Password**. `[Screenshot: Login page, Forgot Password link]`
2. Enter your registered email. `[Screenshot: Forgot Password, email entry]`
3. Check your email for the time-limited 6-digit code and enter it. `[Screenshot: Forgot Password, code entry]`
4. Set a new password. It cannot be the same as your current one. `[Screenshot: Forgot Password, new password]`

---

## 3. Troubleshooting

| Problem | What to do |
|---|---|
| The email confirmation code (signup, password reset, or verification) did not arrive | Wait a moment and check your spam folder. Codes are time-limited, so if one expires, request a new one. |
| "Too many attempts from this IP" on login | For security, ChainCert limits repeated login attempts from the same network within a short window. Wait a few minutes and try again. |
| You were signed in earlier but a page now shows an authorization error | Your session expired. ChainCert returns you to the login screen; simply sign in again. |
| A credential's badge reads **Expired** but its history shows only "Issued" | This is expected, not an error. The badge is computed from the expiry date the moment it passes, while the permanent on-chain "Expired" record is written by a daily maintenance job. The history marks this clearly with a dashed "Expired (reached expiry date)" note until the job records it. |
| A newly issued credential is not in the wallet yet | Refresh, or sign out and back in. The credential appears once the wallet reloads. |
| A password is rejected at signup or reset | Passwords must meet a minimum length and cannot be a very common or guessable password. Choose a stronger one. |
