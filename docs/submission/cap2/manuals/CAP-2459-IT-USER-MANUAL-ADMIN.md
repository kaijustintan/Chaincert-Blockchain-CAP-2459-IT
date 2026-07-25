# ChainCert User Manual: Administrator

**ChainCert** — Blockchain-Based Credential Issuance and Verification Platform
CAP-2459-IT

---

## About this manual

This manual is for **platform administrators**: the people who approve issuing organisations,
manage user accounts, review the audit trail, and check that the system's records match the
blockchain.

For other roles, see:

| Your role | Manual |
|---|---|
| Someone holding credentials | `CAP-2459-IT-USER-MANUAL-HOLDER.md` |
| Institution issuing credentials | `CAP-2459-IT-USER-MANUAL-ISSUER.md` |
| Employer or verifier checking a credential | `CAP-2459-IT-USER-MANUAL-VERIFIER.md` |

---

## Contents

1. Before you begin
2. Signing in and the dashboard layout
3. Approving issuer applications
4. The root authority gate
5. Disabling and re-enabling an issuer
6. Reviewing issuer documents and history
7. Managing user accounts
8. Reviewing credentials across the platform
9. The credential dossier
10. Audit logs
11. Analytics and reports
12. Running an integrity check
13. Notifications
14. Account settings
15. Reference: statuses and terms
16. Troubleshooting

---

## 1. Before you begin

**What an administrator does.** You are the final gate on who can issue credentials on
ChainCert. You also hold the tools for investigating problems: the full audit trail, the
per-credential dossier, and the integrity check that compares the platform's records against the
blockchain.

**What you cannot do, by design:**

- You cannot create, issue, or revoke credentials. Only issuers can, within their own
  organisation.
- You cannot edit or delete anything already written to the blockchain. Every governance action
  you take is itself recorded permanently.
- You cannot provision an issuer's blockchain identity from this interface. Approving an issuer
  grants them access to the platform; the network identity that lets them actually sign
  transactions is a separate, server-side administrative task. See section 16.

**One thing to understand before approving anyone.** Approval and provisioning are two different
things. A newly approved issuer can sign in immediately, but cannot issue until their blockchain
identity exists on the network. If an issuer reports an "Identity not found" error, that is what
is missing. It is not a fault in their account or a bug.

---

## 2. Signing in and the dashboard layout

Sign in at **Login** with your administrator account. You land on **Manage Issuers**, filtered
to **Pending Issuers**, because reviewing waiting applications is usually the most
time-sensitive task.

The sidebar has five tabs:

| Tab | What it is for |
|---|---|
| **Credentials** | Every credential across all issuers, and the dossier tool |
| **Manage Issuers** | Approve, reject, disable, and re-enable issuing organisations |
| **Manage Users** | View and disable holder and administrator accounts |
| **Logs** | The blockchain audit trail: verifications, status changes, and root decisions |
| **Analytics and Reports** | Processed insights and the integrity check |

Each tab has clickable summary cards at the top. Selecting one applies the matching filter to
the table below, which is usually faster than setting the filters by hand.

---

## 3. Approving issuer applications

**Prerequisite:** the application is pending, and for subordinates, its root authority has
already approved it (see section 4).

1. Select **Manage Issuers**. The view opens on **Pending Issuers**.
2. Use **Pending Type** to narrow the list:

   | Option | Shows |
   |---|---|
   | All Pending | Every waiting application |
   | Ready for Review | Only those you can act on now |
   | Awaiting Root Approval | Only those still waiting on a root authority |

3. Before deciding, select **See Documents** to review the organisation's supporting files. Use
   **View** to open one in a new tab, or **Download** to save it.
4. Select **Approve** or **Reject** on the application row.
   - **Approve** opens a confirmation naming the organisation. Select **Confirm Approve**.
   - **Reject** requires a reason. It is recorded on the issuer's record and shown to them.
     Select **Confirm Reject**.

Both decisions are written to the blockchain.

### The approval queue panel

Above the pending table, a panel shows how many applications are waiting, how long the oldest
has waited, and your average time to decide.

Sort the table by **Oldest First** and work from the top. The oldest-waiting figure is
highlighted once it passes 14 days. That threshold is a prompt to look, not a deadline: review
cycles differ between institutions.

### What to check before approving

The platform cannot judge whether an organisation is legitimate. That is your judgement. Useful
checks:

- Do the submitted documents match the organisation name on the application?
- Is the category right? A training provider registering as a university would submit the wrong
  documents.
- For subordinates, does the root authority actually recognise them? The root has already
  approved, but you are the second check.
- Is the contact email on the organisation's real domain, rather than a personal address?

---

## 4. The root authority gate

Subordinate issuers require **two approvals in sequence**: their root authority first, then you.

This matters because the Approve and Reject buttons will not appear for a subordinate until its
root authority has acted. Instead, the row shows **Awaiting Root Approval**.

| Application type | Root Approval column | Your options |
|---|---|---|
| Root Authority | Not Required | Approve or Reject immediately |
| Subordinate, root has not decided | pending | None yet. Wait, or contact the root authority |
| Subordinate, root approved | approved | Approve or Reject |
| Subordinate, root rejected | rejected | None. The application is already closed |

> **A quirk worth knowing.** A subordinate rejected by its root authority is displayed as
> **rejected**, with **Rejected By** showing **Root Authority** rather than an administrator's
> email. This is correct: the rejection was theirs, not yours.

If a subordinate has been waiting a long time on root approval, the delay is with that root
authority. Contact them rather than the applicant.

---

## 5. Disabling and re-enabling an issuer

Disabling suspends an issuer's access without deleting anything. Credentials they already issued
remain valid and verifiable.

1. Select **Manage Issuers**, then set **View** to **Approved Issuers**.
2. Find the organisation and select **Disable**.
3. Enter a reason. This is required and is recorded for audit.
4. Select **Confirm Disable**.

To restore access, set **View** to **Disabled Issuers**, select **Enable**, give a reason, and
confirm.

> The Approved view also lists issuers who were approved and later disabled, so you may see an
> **Enable** button there too.

**When to disable rather than reject.** Rejection is for applications. Disabling is for an
organisation already operating that must stop, for example a suspected compromise, a dispute, or
a request from the organisation itself.

---

## 6. Reviewing issuer documents and history

**See Documents** opens the files submitted with an application: type, filename, format, and
size, each with **View** and **Download**.

**See History** opens a complete record of every status change for that issuer: the previous
status, the new status, the reason given, who performed it, the blockchain transaction ID, and
the timestamp.

Use the history when an issuer disputes a decision, or when you need to establish who approved
an organisation and when.

---

## 7. Managing user accounts

Select **Manage Users**. This lists credential holders and administrators. Issuers are managed
separately, on the Manage Issuers tab.

Filter with **View** (Active Users, Disabled Users, All Users), sort, or search by email,
username, or user ID.

**To disable an account:**

1. Find the user and select **Disable**.
2. Enter a reason. This is required.
3. Select **Confirm Disable**.

Re-enable the same way from the Disabled Users view.

> **What disabling does.** The user can no longer sign in. Credentials issued to them remain on
> the blockchain and remain verifiable. Disabling does not and cannot erase a credential.

**See History** shows every status change on the account, with reasons and transaction IDs.

---

## 8. Reviewing credentials across the platform

Select **Credentials** for a unified view across every approved issuer.

The summary cards (Total Records, Issued, Revoked, Expired, Drafts) double as filters.

**Filters available:**

| Filter | Options |
|---|---|
| Issuer | All, or one specific organisation |
| Type | All, Issued, or Credentials (definitions) |
| Status | All, Issued, Revoked, Draft, Expired |
| Search by | Holder Name, Holder ID, Credential ID, or Credential Name |
| Sort by | Most Recent, Oldest First, name or status ordering |

> The columns change with the Status filter. Selecting **Revoked** adds the holder, the
> revocation date, and the revocation reason, which is the fastest way to review revocation
> activity across the platform.

Two charts sit above the table: credentials by issuer, and a status breakdown.

---

## 9. The credential dossier

**When to use this.** A holder disputes a revocation; a verifier reports an unexpected result;
you need to establish exactly what happened to one credential and when.

1. Select **Credentials**.
2. Find the credential. Searching by Credential ID is fastest if you have it.
3. Select **View BC History** on its row.

The dossier shows:

- **Header:** blockchain ID, credential name, issuer, and holder.
- **Provenance timeline:** every action taken, newest first, each with its blockchain
  transaction ID and any reason given.
- **Verification proof trail:** every verification performed on this credential, with the
  verifier's confirmed email address and the result.

Together these answer both "what did the issuer do" and "who has checked this credential".

---

## 10. Audit logs

Select **Logs**. Choose a category from the **Category** dropdown.

### Verification Logs

Every verification attempt on the platform.

Filter by **Result** (Valid, Revoked, Expired, Not Found, Invalid) and search by verifier,
holder, or credential ID.

> **Not Found results are recorded too.** These are attempts to verify a credential that does
> not exist. A cluster of them, particularly from the same verifier, is worth investigating: it
> may indicate someone testing fabricated credentials.

### Audit Logs

Governance actions: status changes and issuer decisions. Filter by **Type** to separate the two,
and search by email, reason, or who performed the action.

Each entry shows the target, the action, the reason, who did it, and the blockchain transaction
ID.

### Root Subordinate Decision Logs

Every decision a root authority made about a subordinate: which root, which subordinate, the
decision, the reason, and the transaction ID.

Use this when a subordinate disputes a root authority's rejection.

> **Two current limitations of this particular table:** it is not paginated, so a long list
> renders in full; and while a search term is active, the sort control does not apply. Both are
> known and recorded as future work.

---

## 11. Analytics and reports

Select **Analytics and Reports**. These are processed insights rather than raw logs, and each
carries a plain-language summary.

Four figures head the tab: total verifications, issuers with credentials, credentials issued,
and revocations.

### 1. Verification Result Summary

The outcome breakdown of every verification attempt: valid, revoked, expired, or not found.

This is an awareness view. It tells you how the platform is being used and whether verification
is producing sensible results. No specific action follows from it.

### 2. Revocation Rate by Issuer

Every active issuer ranked by their recent revocation rate, with a band marking those at or
above 25 percent over the last 30 days. Issuers with fewer than four credentials are not banded,
because a single revocation out of two credentials is not a meaningful rate.

Select **View this issuer** on any banded row to jump to their record.

> **Read this carefully rather than acting on it directly.** A high revocation rate is not
> evidence of wrongdoing. Some organisations revoke routinely as part of normal practice, for
> example replacing credentials with corrected versions, or ending access when staff leave. The
> band is a team-chosen marker for surfacing unusual activity, not an external standard and not
> a verdict. If a rate looks unusual, look at *why* the credentials were revoked using the
> Credentials tab's Revoked filter, which shows each reason, before drawing any conclusion.

### 3. Integrity-Check Insight

The result of the most recent comparison between the platform's fast-read database and the
blockchain. See section 12.

> **About the thresholds in these reports.** The boundaries used (the 25 percent band, the
> 30-day window, the four-credential minimum) are design choices made by the ChainCert team,
> applied uniformly because the platform does not model each organisation's operating norms.
> Making them configurable per organisation is documented as future work.

---

## 12. Running an integrity check

**What this does.** ChainCert keeps a fast-read copy of credential data so dashboards load
quickly. The blockchain remains the authoritative record. An integrity check compares the two,
field by field, and reports any disagreement.

**Why it matters.** A mismatch means the fast-read copy no longer reflects the blockchain. That
could be a failed write, or it could indicate the database was modified outside the application.

1. Select **Analytics and Reports**.
2. On the **Integrity-Check Insight** card, select **Run integrity check**.
3. Confirm. Large datasets take a moment.
4. Review the results.

**Reading the results:**

| Figure | Meaning |
|---|---|
| **Total** | Records checked |
| **Matched** | Agree with the blockchain |
| **Mismatched** | A field differs. The report shows the database value and the blockchain value side by side |
| **Missing** | Present in the database, absent from the blockchain |
| **Errors** | Could not be checked |

**If everything matches**, the report says so explicitly.

**If there are mismatches**, note the credential IDs and the differing fields, and report them
to the technical team. The blockchain value is authoritative: the database copy is what needs
correcting, never the other way around.

> **Two things to know.** The check also runs automatically once a day on the server, emailing
> administrators when it finds problems. And the on-screen result is per-session: after a page
> reload the card reads "No integrity check run yet this session" even though earlier checks did
> happen. Selecting an integrity notification (section 13) restores the previous results without
> re-running.

---

## 13. Notifications

The bell icon shows platform events: new issuer applications, integrity check results, and other
system notices. A badge shows the unread count.

Select **Mark All as Read** to clear them.

Selecting an integrity-check notification reopens the full results from that run, without
running a new check.

---

## 14. Account settings

Open the avatar menu, then **Settings**.

**Account.** Your email, name, user ID, and account type.

**Security.** To change your password, select **Change Password**, enter your current password
and your new one twice, then select **Change Password**. Administrator password changes are
recorded on the blockchain.

---

## 15. Reference: statuses and terms

### Issuer application states

| State | Meaning |
|---|---|
| **Pending** | Submitted, awaiting a decision |
| **Awaiting Root Approval** | A subordinate whose root authority has not yet decided. You cannot act yet |
| **Root Approved** | The root authority approved. Now waiting on you |
| **Approved / Active** | Fully approved and operating |
| **Rejected** | Denied, by you or by a root authority. The reason is recorded |
| **Disabled** | Previously approved, access suspended. Reversible |

### Credential states

| State | Meaning |
|---|---|
| **Draft** | Created by an issuer but never awarded to anyone |
| **Issued / Active** | Awarded and currently valid |
| **Expired** | Past its expiry date |
| **Revoked** | Ended early by the issuer, with a recorded reason |

### Verification results

| Result | Meaning |
|---|---|
| **Valid** | Genuine and current |
| **Revoked** | Genuine, ended early by the issuer |
| **Expired** | Genuine, past its expiry date |
| **Not Found** | No such credential exists on the blockchain |

### Key terms

| Term | Meaning |
|---|---|
| **Root Authority** | A sovereign institution that can approve subordinates beneath it |
| **Subordinate Issuer** | An issuer operating under a root authority's approval |
| **Blockchain identity** | The network credential that lets an issuer sign transactions. Provisioned separately from account approval |
| **Transaction ID** | Identifies one specific action in the blockchain record |
| **Integrity check** | Comparison of the fast-read database against the blockchain |

---

## 16. Troubleshooting

Each entry follows the same shape: what you see, why it happens, what to do, and how you know
it worked.

### An approved issuer reports "Identity not found" and cannot issue

**Why.** **This is expected, and it is not a bug.** Approving an application grants platform
access. It does not create the blockchain identity the issuer needs to sign transactions. That
identity is provisioned by a separate server-side procedure.

**What to do.** Pass the exact identity name from the error message to whoever administers the
server. They run the provisioning workflow documented in the project's technical reference.

**Expected result.** Once the identity exists in the server's wallet, the issuer can issue with
no change on their side.

---

### I cannot approve a subordinate: the buttons are missing

**Why.** Its root authority has not approved it yet. The gate is deliberate: you are the second
approval, not the first.

**What to do.**
1. Check the **Root Approval** column on that row.
2. If it reads pending, contact the root authority to review the application.
3. If **Pending Type** is set to **Awaiting Root Approval**, switch it to **Ready for Review**,
   which shows only applications you can act on.

**Expected result.** Once the root approves, the Approve and Reject buttons appear.

---

### An issuer appears in the Approved list with an Enable button

**Why.** The Approved view intentionally includes issuers who were approved and later disabled,
so you can see the full picture rather than losing them from view.

**What to do.** Nothing, unless you intend to restore access. Select **Enable** and give a
reason to do so.

**Expected result.** The issuer returns to active status.

---

### The integrity check reports mismatches

**Why.** The fast-read database no longer agrees with the blockchain for those records. Possible
causes: a database write failed after the blockchain write succeeded, or the database was
modified outside the application.

**What to do.**
1. Note the credential IDs and which fields differ.
2. Report them to the technical team. The blockchain value is authoritative.
3. Do not attempt to reconcile by editing the blockchain. It cannot be edited, and that is the
   point.

**Expected result.** The technical team corrects the database copies, and a re-run reports all
matched.

---

### Analytics says no integrity check has been run, but I ran one earlier

**Why.** The on-screen result is held for the current session only. Reloading clears it. The
check itself still happened and its result was still recorded.

**What to do.** Select the corresponding integrity notification from the bell to restore the
previous results, or run a fresh check.

**Expected result.** The results reappear without needing to re-run.

---

### An issuer is flagged in Revocation Rate by Issuer. What now?

**Why.** Their recent revocation rate is at or above the band boundary. This is a prompt to
look, not a finding.

**What to do.**
1. Select **View this issuer** to see their record.
2. Go to **Credentials**, filter Issuer to that organisation and Status to **Revoked**, and read
   the revocation reasons.
3. Judge from the reasons. Corrections, reissues, and role changes are normal. A pattern of
   vague or missing reasons is worth raising with the organisation.

**Expected result.** You have the context to decide whether any action is warranted. In most
cases none is.

---

### Many Not Found results from the same verifier

**Why.** Someone is repeatedly checking credentials that do not exist. This may be innocent (a
mistyped ID retried several times) or it may be someone testing fabricated credentials.

**What to do.**
1. Go to **Logs**, choose **Verification Logs**, and set **Result** to **Not Found**.
2. Look at whether the attempts come from one confirmed email address and whether the IDs vary
   or repeat.
3. Repeated attempts with different IDs from one address is the pattern worth escalating.

**Expected result.** You can distinguish a typo from a deliberate pattern.

---

### The Root Subordinate Decision Logs table is very long

**Why.** This table is not paginated in the current build, unlike the others.

**What to do.** Use the **Decision** filter and the search box to narrow it. Note that while a
search term is active, the sort control does not apply to the results.

**Expected result.** A manageable list. Both limitations are recorded as future work.

---

### Still stuck

Note the tab you were on, the exact message, and any transaction ID or credential ID shown, then
contact the technical team. Anything with a transaction ID can be traced precisely in the
blockchain record.
