# ChainCert User Manual: Credential Holder

**ChainCert** — Blockchain-Based Credential Issuance and Verification Platform
CAP-2459-IT

---

## About this manual

This manual covers everything a **credential holder** can do in ChainCert. It is organised by
task: find the thing you want to do in the Contents, then follow the numbered steps.

If you are an issuing institution, a platform administrator, or someone checking a credential
that was shown to you, use the manual for your role instead:

| Your role | Manual |
|---|---|
| Institution issuing credentials | `CAP-2459-IT-USER-MANUAL-ISSUER.md` |
| Platform administrator | `CAP-2459-IT-USER-MANUAL-ADMIN.md` |
| Employer or verifier checking a credential | `CAP-2459-IT-USER-MANUAL-VERIFIER.md` |

*Screenshots are noted inline as* `[Screenshot: ...]`.

---

## Contents

1. Before you begin
2. Creating your account
3. Signing in
4. Your wallet
5. Viewing a credential in detail
6. Credential history and proof of verification
7. Controlling who can see a credential
8. Sharing your profile
9. Exporting to PDF
10. Insights and renewal alerts
11. Requesting a renewal
12. Your public profile
13. Account settings
14. Reference: statuses and terms
15. Troubleshooting

---

## 1. Before you begin

**What ChainCert does for you.** ChainCert is a digital wallet for credentials issued to you by
schools, employers, and professional bodies. Each credential is recorded on a blockchain, which
means anyone you share it with can confirm it is genuine and current without contacting the
issuer.

**What you need:**

- A web browser
- An email address you can access (you will be emailed a confirmation code during sign-up)

**What you cannot do.** You cannot create credentials for yourself. Credentials are issued to
you by an approved institution. Your wallet stays empty until an issuer sends you one.

---

## 2. Creating your account

**Prerequisite:** an email address you can open right now.

1. Go to the ChainCert site and select **Create Account**. `[Screenshot: Landing page, Create Account button]`
2. On the role screen, choose **Register as User**. `[Screenshot: Role selection screen]`
3. Fill in the form. All four fields are required. `[Screenshot: Create Account form]`

   | Field | Notes |
   |---|---|
   | Full Name | Your name as it should appear on credentials |
   | Email | You will need to open this inbox in a moment |
   | Password | At least 10 characters. The checklist below the field updates as you type |
   | Confirm Password | Must match |

4. Select **Create User Account**. A message confirms a code was sent to your email. `[Screenshot: Confirmation code sent message]`
5. Open your email and find the 6-digit code. `[Screenshot: ChainCert confirmation email]`
6. Enter the code in the field labelled **Enter the 6-digit code we emailed to your address**,
   then select **Verify and Create Account**. `[Screenshot: Enter confirmation code screen]`
7. You are redirected to the login page with a confirmation banner. `[Screenshot: Login page with confirmation banner]`

**If the code does not arrive**, select **Resend code**. If the address was wrong, select
**Use a different email** to start again.

> **Important:** your account is not created until you enter the code. Closing the page at
> step 5 means no account was made, and you will need to start over.

---

## 3. Signing in

1. Select **Login**. `[Screenshot: Login page]`
2. Enter your email and password. Use the eye icon to check what you typed. `[Screenshot: Login form, password eye icon]`
3. Select **Login**. You land on your wallet. `[Screenshot: Wallet after login]`

**Forgot your password?**

1. On the login page, select **Forgot Password?** `[Screenshot: Forgot Password link on login page]`
2. Enter your email, then select **Send Verification Code**. `[Screenshot: Forgot Password, email entry]`
3. Enter the 6-digit code from your email, then your new password twice. `[Screenshot: Forgot Password, code and new password entry]`
4. Select **Reset Password**, then **Return to Login**. `[Screenshot: Password reset confirmation]`

---

## 4. Your wallet

Your wallet is the default view at **My Dashboard**. It lists every credential issued to you.
`[Screenshot: Wallet view (My Dashboard)]`

### Finding a credential

| Control | What it does |
|---|---|
| Status chips (Total, Active, Revoked, Expired) | Select one to filter by that status |
| Search box | Searches credential name, type, and issuer |
| Status dropdown | All statuses, Active, Expired, Revoked |
| Sort dropdown | Most recent, Oldest first, Name A to Z, Name Z to A |
| Cards / List toggle | Switch between the card grid and a compact table |

The **Revoked** and **Expired** chips only appear when you actually have credentials in that
state. If you have none, you will not see those chips.

### Reading a wallet card

Each card shows the credential name, the issuing organisation, the date it was issued, and a
status pill. A card may also show:

- **Renewed N times** if this credential has been reissued to you before. Only the newest copy
  is shown, so your wallet does not fill up with superseded versions. The full history is still
  available (see section 6).
- A globe icon if the credential is currently visible on your public profile.

`[Screenshot: Wallet card showing Renewed badge and visibility icon]`

Long lists are paginated at 10 per page.

---

## 5. Viewing a credential in detail

Select any card or row to open the detail view. It shows:

- **Type**, **Issuer**, **Status**
- **Visibility**, shown as a button you can select to change (see section 7)
- **Revocation reason**, only if the credential was revoked and the issuer gave a reason
- **Issued on** and **Expiry date** (or "No Expiry")
- **Blockchain ID**, with a copy button beside it
- **Skills** attached to the credential

Two buttons at the bottom: **See history** and **Export PDF**. `[Screenshot: Credential details view]`

---

## 6. Credential history and proof of verification

**What this is for.** Every action taken on your credential is permanently recorded. This
section lets you see that record, and see who has checked your credential.

1. Open the credential (section 5).
2. Select **See history**.

You will see two things:

**Blockchain History.** A timeline, newest first, of everything that has happened to this
credential: when it was created, issued, renewed, expired, or revoked. Each entry carries a
transaction ID from the blockchain, and a reason where one applies.

If your credential was renewed, the timeline merges the full chain, so you see the original
issue, its expiry, and the reissue in one place, rather than a partial history.
`[Screenshot: Blockchain History timeline]`

**Verification Proof Trail.** A list of every time someone verified this credential: when, and
which verified email address checked it. This is your evidence that a credential was actually
used and accepted.
`[Screenshot: Verification Proof Trail list]`

If the trail is still loading, you will see a loading indicator rather than an empty message.

---

## 7. Controlling who can see a credential

Every credential is **Private** by default. Private credentials are visible only to you.
Public credentials appear on your shared profile and can be included in a portfolio export.

**To change visibility:**

1. Open the credential (section 5).
2. Select the **Visibility** button. It switches between **Public** and **Private** and saves
   immediately. `[Screenshot: Visibility toggle in credential details]`

You can also do this from your Profile page, on any credential card.

> Making a credential public does not make it valid or invalid. Verifiers always see its true,
> current status when they check it.

---

## 8. Sharing your profile

There are two ways to share, and they suit different situations.

| Method | Who can open it | Expires | Best for |
|---|---|---|---|
| Anyone with Link | Anyone holding the link | Never | A CV, a portfolio site, a public profile |
| Specific Recipient | Only the email you name, after they confirm it | Your choice | A job application, a named employer |

### 8.1 Share with anyone

1. Open the avatar menu, then select **Profile**. `[Screenshot: Avatar menu, Profile option]`
2. Select **Share Profile**. `[Screenshot: Share Profile option]`
3. Select the **Anyone with Link** tab. The link is prepared automatically. `[Screenshot: Anyone with Link tab]`
4. Select **Copy Link**. `[Screenshot: Copy Link button]`

### 8.2 Share with one named person

**Prerequisite:** the recipient's email address.

1. Open the avatar menu, then **Profile**, then **Share Profile**.
2. Select the **Specific Recipient** tab. `[Screenshot: Specific Recipient tab]`
3. Fill in the form: `[Screenshot: Specific Recipient form]`

   | Field | Required | Notes |
   |---|---|---|
   | Recipient Email | Yes | Only this address can open the link |
   | Link Duration | No | Defaults to 7 days. Options run from 1 day to No Expiry |
   | Description | No | A note to yourself, up to 200 characters |

4. Select **Generate and Send Link**. ChainCert emails the link to the recipient, and shows it
   so you can copy it too. `[Screenshot: Generate and Send Link confirmation]`

When the recipient opens the link, they are asked to confirm their email with a code before the
profile loads.

### 8.3 Managing and revoking links

Your Profile page has a **My Share Links** section listing every link you have created, with
its recipient, source, creation date, expiry, view count, and status.
`[Screenshot: My Share Links list]`

To cancel a link, select **Revoke** on its row. The link stops working immediately.

You can filter this list by status and source, sort it, and search it.

---

## 9. Exporting to PDF

### 9.1 A single credential

1. Open the credential (section 5).
2. Select **Export PDF**. `[Screenshot: Export PDF button]`

The PDF contains the credential details, the badge image, the skills, and a QR code that links
to live verification. Anyone scanning it sees the credential's current status, not a snapshot.
`[Screenshot: Exported credential PDF]`

### 9.2 Your whole portfolio

**Prerequisite:** at least one credential set to Public. The **Export all** button is disabled
otherwise, and explains why when you hover over it.

1. On your wallet, select **Export all**. `[Screenshot: Export all button]`

The portfolio PDF includes **only your public credentials**, each with its own QR code, and a
cover page with a link to your public profile.
`[Screenshot: Portfolio PDF export]`

> Exporting a portfolio creates a public share link automatically so the cover page link works.
> It will appear in **My Share Links** as "Portfolio Export". You can revoke it like any other
> link.

### 9.3 Exporting a revoked credential

If your export includes a revoked credential, a confirmation appears first, listing which ones
and warning that anyone verifying will see the revoked status.
`[Screenshot: Revoked credential export confirmation]`

You can still proceed. Select **Export anyway**, or **Cancel** to go back.

A revoked credential's PDF shows a clear **REVOKED** banner, the revocation date, and the reason
the issuer gave. This is deliberate: revocation is not always a mark against you (a credential
may be revoked because it was reissued with a correction, or because a membership ended), and
showing the reason lets the reader tell the difference.
`[Screenshot: Exported PDF with REVOKED banner]`

---

## 10. Insights and renewal alerts

Select the **Insights** tab on your dashboard. `[Screenshot: Insights tab]`

**Credential Health.** A breakdown of your credentials by state, with a plain-language summary.
It includes a "Before you share" note pointing out anything revoked or expiring soon.
`[Screenshot: Credential Health breakdown]`

**Renewal alerts.** Appears only when you have a credential expiring within 60 days, or already
expired. Each row shows how long is left (or how long ago it expired), with a **View** button
and a **Request renewal** button.
`[Screenshot: Renewal alerts list]`

**Verification Insights.** How many times your credentials have been checked, by how many
distinct verifiers, and how many checks returned valid. It also lists your most-checked
credentials.
`[Screenshot: Verification Insights panel]`

---

## 11. Requesting a renewal

**Prerequisite:** the credential is expiring or expired, and the issuer allowed renewal
requests when they created it.

1. Go to the **Insights** tab.
2. Find the credential under **Renewal alerts**.
3. Select **Request renewal**. `[Screenshot: Request renewal button]`

The button changes to **Renewal requested** and stays that way, including after you reload.
`[Screenshot: Renewal requested state]`

The issuer sees your request in their queue. If they approve it, a renewed credential appears
in your wallet, and your wallet card shows a "Renewed" badge.

> If a credential shows no **Request renewal** button, the issuer marked it as non-renewable.
> This is normal for one-time credentials such as a diploma. Contact the issuer directly if you
> believe you need a new copy.

---

## 12. Your public profile

Your public profile is what someone sees when they open a share link.

To see it as others will, go to **Profile**, then select **Preview Public Profile**.
`[Screenshot: Preview Public Profile]`

### Editing your profile

1. Go to **Profile**, then select **Edit Profile**. `[Screenshot: Edit Profile]`
2. You can change your Full Name, your Personal Summary (up to 600 characters), and whether
   your profile is public. `[Screenshot: Edit Profile form]`
3. To change your picture, select the pencil button on your avatar and choose an image. `[Screenshot: Avatar picture upload]`
4. Select **Save Changes**, or **Cancel** to discard. `[Screenshot: Profile changes saved confirmation]`

Your picture is only uploaded when you select Save Changes.

### Ordering your credentials

By default your profile lists credentials most-recent-first. To arrange them yourself:

1. Go to **Profile**, then the **Credential Wallet** section. `[Screenshot: Credential Wallet section on profile]`
2. Set the sort dropdown to **Custom order**. `[Screenshot: Custom order sort dropdown]`
3. Clear the search box and both filters.
4. Drag credentials by the handle on each card. `[Screenshot: Dragging credential by handle]`

The order saves automatically. Dragging is only available when sorting is set to Custom order
and no filters are active, because a filtered list cannot define a full order.

### Skills Wallet

Below your credentials, ChainCert collects the skills from all of them into one list. Select any
skill to see which credentials it came from.
`[Screenshot: Skills Wallet list]`

---

## 13. Account settings

Open the avatar menu, then **Settings**. `[Screenshot: Settings page, Account tab]`

**Account.** Your email, name, user ID, and account type. These are read-only here; change your
name from the Profile page.

**Notifications.** Preference toggles are visible but not yet active. This is noted on the page.
`[Screenshot: Settings, Notifications tab]`

**Security.** To change your password:

1. Select **Change Password**. `[Screenshot: Settings, Security tab]`
2. Enter your current password, then your new password twice. `[Screenshot: Change Password form]`
3. Select **Change Password**. `[Screenshot: Password changed confirmation]`

Your new password must be different from your current one.

---

## 14. Reference: statuses and terms

| Status | Meaning |
|---|---|
| **Active** | Valid and within its validity period |
| **Expired** | Passed its expiry date. Not a judgement on you, simply out of date |
| **Revoked** | The issuer deliberately ended it early. A reason is usually given |

| Term | Meaning |
|---|---|
| **Blockchain ID** | The credential's permanent identifier. This is what a verifier enters |
| **Issuer** | The organisation that created and issued the credential |
| **Public / Private** | Whether a credential appears on your shared profile |
| **Share link** | A URL that shows your public credentials to whoever opens it |
| **Renewed N times** | This credential has been reissued to you N times |
| **Verification** | Someone checking your credential against the blockchain |

### Why a badge can say Expired before the history does

Your credential's status is calculated the moment its expiry date passes. The permanent
"Expired" record on the blockchain is written by a maintenance job that runs daily. In between,
the badge correctly reads Expired while the timeline has not yet recorded the event. The
timeline marks this clearly. Nothing is wrong, and verification already reports it as expired.

---

## 15. Troubleshooting

Each entry follows the same shape: what you see, why it happens, what to do, and how you know
it worked.

### A credential I was told about is not in my wallet

**Why.** Either it has not been issued yet, or it was issued to a different email address.

**What to do.**
1. Refresh the page, then sign out and back in.
2. Check with the issuer which email address they used.
3. If it was a different address, ask them to reissue to the correct one.

**Expected result.** The credential appears in your wallet with an "Issued" notification.

---

### My credential says Expired but the history only shows "Issued"

**Why.** This is expected, not an error. See section 14.

**What to do.** Nothing. If you need it valid again, request a renewal (section 11).

**Expected result.** The timeline shows a marked entry explaining the expiry is not yet
finalised on the blockchain.

---

### The "Export all" button is greyed out

**Why.** A portfolio export only includes public credentials, and you have none set to public.

**What to do.**
1. Open a credential you want to include.
2. Select the **Visibility** button so it reads **Public**.
3. Return to the wallet. **Export all** is now available.

**Expected result.** The button is enabled and the export includes that credential.

---

### There is no "Request renewal" button on an expiring credential

**Why.** The issuer marked this credential as non-renewable, which is normal for one-time
awards such as a diploma.

**What to do.** Contact the issuing organisation directly.

**Expected result.** Not applicable. This is intended behaviour.

---

### The person I shared with cannot open my link

**Why.** Three common causes: the link was recipient-specific and they are using a different
email address, the link expired, or you revoked it.

**What to do.**
1. Go to **Profile**, then **My Share Links**, and find the link.
2. Check its **Status** and **Expires** columns.
3. If it expired or was revoked, generate a new one (section 8).
4. If the recipient's email differs from the one on the link, generate a new link for their
   actual address.

**Expected result.** The recipient confirms their email with a code and your profile loads.

---

### My profile shows a revoked credential and I would rather it did not

**Why.** Public credentials are shown with their real status, including revoked ones. ChainCert
does not hide them, because a verifier would see the true status anyway when they check.

**What to do.** Open the credential and set its **Visibility** to **Private**. It disappears
from your public profile immediately.

**Expected result.** The credential no longer appears on your shared profile or in portfolio
exports.

---

### I cannot drag my credentials into a custom order

**Why.** Dragging requires a complete, unfiltered list.

**What to do.**
1. Set the sort dropdown to **Custom order**.
2. Clear the search box.
3. Set both filter dropdowns back to their "All" options.

**Expected result.** The drag handle becomes usable and a "Saving order" message confirms each
move.

---

### Login says "Too many attempts"

**Why.** ChainCert limits repeated login attempts from one network as a security measure.

**What to do.** Wait about 15 minutes and try again. If you have forgotten your password, use
**Forgot Password?** rather than guessing.

**Expected result.** Login works normally again.

---

### I did not receive a code or notification email

**Why.** Most often the network you are on blocks outgoing mail, the address has a typo, or the
message went to spam.

**What to do.**
1. Check your spam or junk folder.
2. Select **Resend code** if you are on a code screen.
3. Confirm the address is correct. On the sign-up screen, use **Use a different email**.
4. Try a different network connection if you can.

**Expected result.** The code arrives and you can continue.

---

### Still stuck

Note what you were doing, the exact message shown, and the credential ID if one is involved,
then contact the organisation that issued the credential. For account or platform problems,
contact the ChainCert administrator.
