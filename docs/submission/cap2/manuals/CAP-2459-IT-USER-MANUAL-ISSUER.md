# ChainCert User Manual: Issuer

**ChainCert** — Blockchain-Based Credential Issuance and Verification Platform
CAP-2459-IT

---

## About this manual

This manual is for **issuing organisations**: universities, government bodies, training
providers, and professional certifiers who create and award credentials on ChainCert.

*Screenshots are noted inline as* `[Screenshot: ...]`.

For other roles, see:

| Your role | Manual |
|---|---|
| Someone holding credentials | `CAP-2459-IT-USER-MANUAL-HOLDER.md` |
| Platform administrator | `CAP-2459-IT-USER-MANUAL-ADMIN.md` |
| Employer or verifier checking a credential | `CAP-2459-IT-USER-MANUAL-VERIFIER.md` |

---

## Contents

1. Before you begin
2. Registering as an issuer
3. Signing in and finding your way around
4. Creating a credential
5. Issuing a credential to one recipient
6. Issuing to many recipients at once
7. Revoking a credential
8. Revoking many credentials at once
9. Handling renewal requests
10. Viewing your credentials
11. Credential history and the blockchain audit trail
12. Reports and performance
13. Managing subordinate issuers
14. Your public issuer profile
15. Account settings
16. Reference: statuses and terms
17. Troubleshooting

---

## 1. Before you begin

**How issuing works.** You create a **credential** once, describing what it is (its name, type,
description, skills, and badge). You then **issue** that credential to individual recipients.
One credential can be issued to any number of people.

Everything you do is written to a blockchain, so it can be independently verified and cannot be
altered afterwards. This also means issuing and revoking are permanent actions.

**Two kinds of issuer:**

| Type | What it means |
|---|---|
| **Root Authority** | A sovereign institution, for example a university. Can approve subordinate issuers beneath it |
| **Subordinate Issuer** | Operates under a root authority, for example a department or a student organisation. Needs that root authority's approval before the platform administrator can act |

**What you need:**

- An organisation email address
- Documents proving your organisation's standing (these vary by category, see section 2)
- For subordinates, the name of the root authority you operate under

---

## 2. Registering as an issuer

**Prerequisite:** your supporting documents ready as PDF or image files.

1. Select **Create Account**, then **Register as Issuer**. [Screenshot: Create Account, Register as Issuer option]
2. **Part 1, Basic Details.** Organisation name, contact person, email, and password (twice).
   Select **Next**. [Screenshot: Issuer registration Part 1, Basic Details]
3. **Part 2, Governance Details.**
   - Choose your **Issuer Type**: Root Authority or Subordinate Issuer.
   - Choose your **Category**: University, Government, Training Provider, Industry Certifier,
     or Others.
   - If you chose Subordinate, search for and select your **Root Authority**. [Screenshot: Issuer registration Part 2, Governance Details]
4. **Part 3, Required Documents.** The list shown depends on the category you chose. Attach
   every document listed. Subordinates also attach an authorisation letter from their root
   authority. [Screenshot: Issuer registration Part 3, Required Documents]
5. Select **Submit Issuer Registration**.

You will see a confirmation headed **Application Pending Review**, explaining what happens next. [Screenshot: Application Pending Review confirmation]

> **Important.** Changing your Category or Issuer Type after attaching files clears the
> attachments, because a different category requires a different set of documents. Attach your
> files last, after those two choices are settled.

**What happens next:**

- **Root authorities** wait for the platform administrator to review the application.
- **Subordinates** wait for their root authority first, then for the platform administrator.

You will be notified by email once a decision is made.

---

## 3. Signing in and finding your way around

Sign in at **Login**. [Screenshot: Issuer login] You land on your issuer dashboard. [Screenshot: Issuer dashboard]

The sidebar is your main navigation:

| Item | What it is for |
|---|---|
| **Dashboard** | Overview, key numbers, and quick actions |
| **Credentials** | Create and manage your credential definitions |
| **Issue** | Award credentials to recipients, and handle renewal requests |
| **Revoke** | End credentials early |
| **All Credentials** | Every record, both unissued definitions and issued copies |
| **Performance** | Reports on issuance, verification, and revocation |
| **History** | The full blockchain audit trail, searchable |
| **Subordinates** | Approve and manage subordinate issuers (root authorities only) |

The bell icon shows notifications. Select **Mark all as read** to clear them. [Screenshot: Notifications panel]

---

## 4. Creating a credential

**What this does.** Creates the definition of a credential. Nothing is awarded to anyone yet.
Until you issue it, it appears with the status **Draft**.

1. Select **Credentials** in the sidebar, then **Create New Credential**. [Screenshot: Credentials view, Create New Credential button]
2. Fill in the form: [Screenshot: Create Credential form fields]

   | Field | Required | Notes |
   |---|---|---|
   | Credential Type | Yes | Pick from the list, or choose "Other" to type your own |
   | Credential Name | Yes | Watch for the duplicate and similarity warnings below the field |
   | Description | No | What the credential represents |
   | Metadata | No | Any extra detail, for example a level or grade band |
   | Allow holders to request renewal | No | On by default. Turn off for one-time awards such as a diploma |
   | Skills | No | See below |
   | Badge Image | No | PNG, JPEG, or GIF. Appears on the credential and its PDF |

3. **Adding skills.** Type a skill and select **Add Skill**, or press Enter. Skills appear as
   removable tags. [Screenshot: Skills input with removable tags]

   If you have issued credentials before, a row of suggestions appears under the input, headed
   **From your past credentials**. These are drawn from your own previous credentials, narrowed
   to the credential type you selected. Select any suggestion to add it. You can still type
   anything you want; the suggestions are a shortcut, not a restriction. [Screenshot: Skill suggestions from past credentials]

4. Select **Create Credential**, review the confirmation, then select **Confirm Create**. [Screenshot: Create Credential confirmation dialog]

### Name warnings

ChainCert checks the name you type against your existing active credentials as you type.

| Warning | Behaviour |
|---|---|
| **You already have an active credential with this name** | **Blocks creation.** Punctuation and spacing are ignored, so "Python-Certificate" counts as the same name as "Python Certificate" |
| **Similar to your existing "..."** | **Warns only.** Shown when the name looks like a shortened or abbreviated form of one you already have, for example "Python Cert" against "Python Certificate". The warning repeats in the confirmation step, and you can proceed if the two are genuinely different |

---

## 5. Issuing a credential to one recipient

**Prerequisite:** at least one credential created (section 4), and the recipient has a ChainCert
holder account.

1. Select **Issue** in the sidebar, then **Issue Credential**. [Screenshot: Issue view, Issue Credential option]
2. Optionally narrow the list using the **Credential Type** dropdown.
3. Select the **Credential** field, type to search, and choose one.
4. Select the **Recipient** field, type to search, and choose the holder. This field only
   unlocks after a credential is chosen. [Screenshot: Issue Credential form, recipient selected]
5. Optionally set an **Expiry Date**. Leaving it blank means the credential never expires.
6. Select **Issue Credential**, then **Confirm Issue**. [Screenshot: Confirm Issue dialog]

> **Only eligible recipients are listed.** Someone who already holds an active copy of this
> credential is filtered out, which prevents accidental duplicates. If your intended recipient
> is missing, check whether they already hold it.

> **Issuing is permanent.** It is written to the blockchain and cannot be undone. If you make a
> mistake, revoke the credential (section 7) and issue a corrected one.

---

## 6. Issuing to many recipients at once

**Prerequisite:** a list of recipient emails or holder IDs in a `.csv` or `.txt` file, one per
line or separated by commas.

1. Select **Issue**, then **Batch issue from list**. [Screenshot: Batch issue from list option]
2. Choose the **Credential** to award.
3. Optionally set an **Expiry date** for all of them.
4. Select **Import recipients** and choose your file. [Screenshot: Batch issue, Import recipients file picker]
5. Review the list. Each row is marked **Eligible** or **Not eligible**, with a summary count. [Screenshot: Batch issue recipient list with eligibility status]
6. Select **Continue**, then **Confirm**. [Screenshot: Batch issue confirmation]

Progress runs one recipient at a time and cannot be cancelled once started. A results summary
appears at the end.

> Recipients marked "Not eligible" are skipped. This usually means they already hold the
> credential, or no account matches that email or ID.

---

## 7. Revoking a credential

**What revocation means.** Ending a credential's validity **early**, before its expiry date.
It does not delete anything: the credential stays on the blockchain permanently with its status
changed to revoked, and the reason you give is recorded with it.

Revocation is not always a mark against the holder. Common legitimate reasons include correcting
an error and reissuing, replacing a credential with an updated version, or an affiliation
ending. Because the reason you type is shown to anyone who verifies the credential, and on the
holder's exported PDF, a clear reason protects both the holder and your institution.

**To revoke one credential:**

1. Select **Revoke** in the sidebar. [Screenshot: Revoke view]
2. Find the credential in the table and select **Revoke** on its row. (Alternatively select
   **Revoke a credential** and pick the holder and credential from dropdowns.) [Screenshot: Revoke table, Revoke button on row]
3. Enter a **Revocation Reason**. This is required. [Screenshot: Revocation Reason field]
4. Select **Revoke**, then **Confirm Revoke**. [Screenshot: Confirm Revoke dialog]

> **Only active credentials can be revoked.** A credential that has already expired shows a dash
> instead of a Revoke button, because expiry has already ended its validity.

---

## 8. Revoking many credentials at once

1. Select **Revoke** in the sidebar.
2. Select the credentials, either by ticking their checkboxes, or by selecting **Import IDs**
   and choosing a `.csv` or `.txt` file of credential IDs. [Screenshot: Revoke view checkboxes and Import IDs option]
3. Select **Revoke selected**.
4. Enter one **Revocation reason**. It applies to every credential in the batch. [Screenshot: Batch revoke reason field]
5. Select **Continue**, then **Confirm**. [Screenshot: Batch revoke confirmation]

After an import, a message reports how many were selected, how many were skipped because they
were already revoked or expired, and how many were not found among your issued credentials.

> Because one reason covers the whole batch, group your revocations by reason. Revoking a
> mixed set with a vague catch-all reason is unhelpful to the holders who receive it.

---

## 9. Handling renewal requests

When a holder's credential is expiring, they can ask you to renew it, provided you left
**Allow holders to request renewal** switched on.

1. Select **Issue** in the sidebar.
2. Select the **Renewal Requests** card header to expand it. A count shows how many are pending. [Screenshot: Renewal Requests card expanded]
3. Filter by status or search if the list is long.

**To approve:**

1. Select **Approve** on the row. [Screenshot: Renewal request row, Approve action]
2. Optionally set a **New expiry date**. Blank means no expiry.
3. Select **Approve and issue**. [Screenshot: Approve and issue confirmation]

A renewed credential is issued to the holder, linked to the original so the history shows the
full chain.

**To decline:**

1. Select **Decline** on the row. [Screenshot: Renewal request row, Decline action]
2. Enter a **Reason**. This is required, and the holder will see it.
3. Select **Decline**. [Screenshot: Decline confirmation]

Both decisions are recorded on the blockchain.

---

## 10. Viewing your credentials

**Credentials** shows your credential definitions: name, type, ID, description, skills,
visibility, and creation date. Each row has a visibility toggle controlling whether the
credential appears on your public issuer profile. [Screenshot: Credentials view with definitions list]

**Issue** shows everything you have issued: recipient, status, dates, and actions. [Screenshot: Issue view, issued credentials list]

**All Credentials** shows both together. Use the **Record Kind** filter to switch between
definitions and issued copies. Definitions that have never been issued show as **Draft**. [Screenshot: All Credentials view with Record Kind filter]

All three views support searching, filtering by type and status, and sorting. Lists are
paginated at 10 rows per page.

---

## 11. Credential history and the blockchain audit trail

### One credential's history

In the Issue, Revoke, or All Credentials views, select **View BC History** on any issued row. [Screenshot: View BC History option on issued row]
This shows the full timeline: created, issued, renewed, expired, or revoked, each with its
blockchain transaction ID and any reason given. [Screenshot: Credential history timeline]

If a credential was issued to the same person more than once, a **Credential Lineage** section
lists every issuance. It is collapsed by default; select **Show** to expand it, and **View** on
any row to switch the timeline to that copy. [Screenshot: Credential Lineage section expanded]

### The full audit trail

Select **History** in the sidebar for every transaction your organisation has made.

1. Choose what to search by: Credential ID, Holder ID, Holder Name, or Credential Name. [Screenshot: History view, search-by field]
2. Type your search term and select **Search**, or select **Show All**.
3. Narrow further with the status, type, and sort controls. [Screenshot: History view filtered results table]

Columns include the timestamp, credential details, holder details, and the blockchain
transaction ID for each action.

---

## 12. Reports and performance

Select **Performance** in the sidebar. Reports load when you first open this view, so allow a
moment. [Screenshot: Performance view]

Every report includes a plain-language summary explaining what the numbers mean.

### Verification Reach

How your credentials are being used by others: how many distinct verifiers have checked them,
how many checks returned valid, and which credentials are checked most.

It also highlights **revoked or expired credentials still being checked**, showing who holds
each one. This tells you an out-of-date copy is still circulating, so you can contact the holder
if it matters. [Screenshot: Verification Reach report]

### Issuance Performance

Total issued, how many credential types you use, this month's activity, a breakdown by type,
and a six-month trend. [Screenshot: Issuance Performance report]

### Credentials in Circulation

The mix of active, expiring, expired, and revoked credentials among everything you have issued. [Screenshot: Credentials in Circulation report]

A high inactive share is not automatically a problem. For short-duration credentials it is
normal turnover; for long-lived qualifications it may be worth reviewing whether your validity
periods fit their real-world usefulness. The summary says so rather than assuming.

### Revocation Self-Audit

How many credentials you have revoked, which credential accounts for the most, and how quickly
revocations follow issuance.

Revocations are grouped into bands of 14 days or fewer, 15 to 30 days, and more than 30 days.
Where a large share falls into the first band, the summary flags it as unusual and worth
reviewing. It does not conclude that anything is wrong: what counts as normal depends on your
organisation's own process. [Screenshot: Revocation Self-Audit report]

> **About the thresholds.** The boundaries used in these reports (for example the 14-day band,
> and the 60-day "expiring soon" window) are design choices made by the ChainCert team. They
> are applied uniformly because the platform does not model each organisation's operating
> norms. Treat them as prompts to look, not as standards.

---

## 13. Managing subordinate issuers

**This section applies to root authorities only.** If you are a subordinate issuer, you will not
see this in your sidebar.

When an organisation applies as a subordinate under you, you decide first. Only after you
approve does the platform administrator review the application.

1. Select **Subordinates** in the sidebar. [Screenshot: Subordinates view]
2. Set the **View** filter to **Pending Root Approval**. [Screenshot: Subordinates view filtered to Pending Root Approval]
3. Select **Documents** on the application to review the supporting files. Use **View** to open
   one, or **Download** to save it. [Screenshot: Subordinate application documents review]
4. Select **Approve**, or **Reject** and give a reason (required). [Screenshot: Approve or Reject subordinate dialog]

The application then moves to the platform administrator for final approval.

The same view lets you monitor all your subordinates, filtered by approval state, with both the
root approval and admin approval status shown side by side, plus a blockchain history for each.

---

## 14. Your public issuer profile

Your public profile lets people confirm your organisation is a recognised issuer, and see which
credentials you offer.

**To control what appears:** each credential has a visibility toggle in the Credentials view and
on your Profile page. Public credentials appear on your profile; private ones do not. [Screenshot: Credential visibility toggle]

**To share your profile:** open the avatar menu, select **Profile**, then **Share Profile**. Your
permanent public link is prepared automatically. Select **Copy Link**. [Screenshot: Share Profile, Copy Link]

Your organisation also appears in the public **Issuer Directory**, which anyone can browse and
search. [Screenshot: Public Issuer Directory]

---

## 15. Account settings

Open the avatar menu, then **Settings**. [Screenshot: Settings menu]

**Account.** Your email, organisation, contact name, issuer ID, and account type. [Screenshot: Account settings tab]

**Security.** To change your password, select **Change Password**, enter your current password
and your new one twice, then select **Change Password**. [Screenshot: Change Password dialog]

To change your organisation's display name or profile picture, go to **Profile**, select **Edit
Profile**, make your changes, and select **Save Changes**. [Screenshot: Edit Profile form]

---

## 16. Reference: statuses and terms

| Status | Meaning |
|---|---|
| **Draft** | A credential you created but have not issued to anyone yet |
| **Issued / Active** | Awarded and currently valid |
| **Expired** | Past its expiry date |
| **Revoked** | You ended it early. The reason you gave is recorded permanently |

| Term | Meaning |
|---|---|
| **Credential** | The definition: name, type, description, skills, badge |
| **Issued credential** | One copy of that credential, awarded to one person |
| **Root Authority** | An institution that can approve subordinate issuers |
| **Subordinate Issuer** | An issuer operating under a root authority's approval |
| **Blockchain ID** | The permanent identifier a verifier uses |
| **Renewal request** | A holder asking for a fresh copy of an expiring credential |
| **Lineage** | The chain linking a renewed credential back to the original |

---

## 17. Troubleshooting

Each entry follows the same shape: what you see, why it happens, what to do, and how you know
it worked.

### "Identity not found" when I try to issue

**Why.** Your account has been approved, but the blockchain identity that signs your
transactions has not been provisioned yet. **This is not a fault in your account.** Approval and
network provisioning are separate steps, and the second is performed manually by the platform
team.

**What to do.** Contact the ChainCert administrator and quote the exact message. Provisioning is
an administrative task on the server.

**Expected result.** Once provisioned, issuing works normally with no change on your side.

---

### The Issue button says I have no credentials yet

**Why.** You cannot issue before you have created a credential to issue.

**What to do.** Go to **Credentials**, select **Create New Credential**, and complete section 4.

**Expected result.** The Issue view opens with your credential available in the dropdown.

---

### My intended recipient is not in the recipient list

**Why.** Three common causes: they already hold an active copy of this credential, they have no
ChainCert account, or their account uses a different email address.

**What to do.**
1. Search the Issue view for their name to see whether they already hold it.
2. Ask them to confirm the email address on their ChainCert account.
3. If they have no account, ask them to register as a user first.

**Expected result.** The recipient appears in the search results and can be selected.

---

### I cannot revoke a credential: the button shows a dash

**Why.** The credential has already expired, so its validity has already ended. Revocation only
applies to credentials that are still active.

**What to do.** Nothing is needed. If the holder needs a valid credential, issue a new one or
approve a renewal request.

**Expected result.** Not applicable. This is intended behaviour.

---

### A credential name is rejected as a duplicate

**Why.** You already have an active credential with the same name. Spacing and punctuation are
ignored in the comparison, so "Python-Certificate" and "Python Certificate" count as the same.

**What to do.** Either choose a different name, or revoke the old credential if it is genuinely
being replaced. Revoked and archived names become available again.

**Expected result.** The warning clears and the credential can be created.

---

### I get a "similar name" warning but the credentials really are different

**Why.** The name looks like a shortened form of one you already have. The warning exists
because holders and verifiers can easily confuse near-identical names.

**What to do.** If the two are genuinely distinct, continue: the warning does not block you.
Select **Create Credential** and then **Confirm Create**. Consider making the names more
distinct anyway, since the people receiving them will not have your context.

**Expected result.** The credential is created.

---

### A batch run seems stuck

**Why.** Batches process one recipient at a time so each is properly recorded on the blockchain.
Large batches genuinely take time, and the window cannot be closed mid-run to prevent partial
states.

**What to do.** Wait for the progress indicator to complete. Do not reload the page.

**Expected result.** A results summary lists each recipient and whether they succeeded.

---

### Reports show no data

**Why.** Most reports need activity to describe. Verification reports in particular stay empty
until someone actually verifies one of your credentials.

**What to do.**
1. Confirm you have issued credentials, not only created them.
2. Allow a moment on first opening the Performance view, since verification data loads on
   demand.

**Expected result.** Reports populate, or show an explicit empty-state message.

---

### A holder says they cannot request a renewal

**Why.** The credential was created with **Allow holders to request renewal** switched off,
which hides the button on their side.

**What to do.** You cannot change this for an already-issued credential. Issue them a fresh
credential directly (section 5). For future credentials of this kind, leave the renewal option
switched on.

**Expected result.** The holder receives a new credential in their wallet.

---

### My subordinate's application is stuck

**Why.** A subordinate application needs two approvals in order: yours, then the platform
administrator's.

**What to do.**
1. Go to **Subordinates** and check the **Root Approval** column. If it is pending, the
   application is waiting on you: approve or reject it.
2. If root approval is granted and the **Admin Approval** column is still awaiting, the
   application is with the platform administrator. Contact them if it has been some time.

**Expected result.** Both columns show approved, and the subordinate can sign in and issue.

---

### Notification emails are not arriving

**Why.** Usually environmental rather than a fault: the network may block outgoing mail, the
recipient address may be a placeholder, or the message may be in a spam folder.

**What to do.**
1. Confirm the recipient's address is real and correct.
2. Ask them to check their spam folder.
3. Report it to the ChainCert administrator, who can check the mail configuration on the server.

**Expected result.** The recipient confirms the message arrived.

---

### Still stuck

Note what you were doing, the exact message, and the credential ID involved, then contact the
ChainCert administrator. For anything showing a blockchain transaction ID, include that too, as
it identifies the exact transaction in the audit trail.
