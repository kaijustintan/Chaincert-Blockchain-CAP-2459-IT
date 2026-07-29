# ChainCert User Manual: Verifier

**ChainCert** — Blockchain-Based Credential Issuance and Verification Platform
CAP-2459-IT

---

## About this manual

This manual is for anyone who needs to **check whether a credential is genuine**: employers,
recruiters, registrars, licensing bodies, or anyone handed a certificate they want to confirm.

**You do not need a ChainCert account.** Verification is open to the public. You confirm your
email address once per session so that the check can be recorded, and that is all.

*Screenshots are noted inline as* `[Screenshot: ...]`.

For other roles, see:

| Your role | Manual |
|---|---|
| Someone holding credentials | `CAP-2459-IT-USER-MANUAL-HOLDER.md` |
| Institution issuing credentials | `CAP-2459-IT-USER-MANUAL-ISSUER.md` |
| Platform administrator | `CAP-2459-IT-USER-MANUAL-ADMIN.md` |

---

## Contents

1. Before you begin
2. Confirming your email
3. Verifying one credential
4. Reading the result
5. Verifying a whole portfolio PDF
6. Verifying from a shared profile link
7. Verifying from a QR code or link
8. Reference: what each result means
9. Troubleshooting

---

## 1. Before you begin

**What ChainCert verification tells you.** ChainCert checks the credential against a blockchain
record written by the issuing organisation. That record cannot be edited or deleted after the
fact, so a verification result reflects the credential's true, current state rather than
whatever a document happens to say.

**What you need:**

- A web browser
- An email address you can access, for a one-time confirmation code
- One of the following from the credential holder:
  - A credential ID
  - A ChainCert PDF export
  - A share link to their profile
  - A QR code from a ChainCert PDF

**What verification does not tell you.** It confirms the credential is genuine, who issued it,
who holds it, and its current status. It does not vouch for the quality or accreditation of the
issuing organisation itself.

---

## 2. Confirming your email

**Why this is required.** Verifications are permanently recorded so that credential holders and
issuers can see their credential was checked. Confirming your email keeps that record
meaningful, and stops anyone recording checks under someone else's name.

1. From the top menu, select **Verification Dashboard**.
2. Enter **Your Name** and **Your Email**. [Screenshot: Email confirmation form with name and email fields]
3. Select **Send verification code**.
4. Open your email and find the 6-digit code. [Screenshot: Email inbox showing 6-digit verification code]
5. Enter it and select **Verify and continue**. [Screenshot: OTP code entry field before continuing]

You now see a line confirming who you are verifying as. It notes that your email is verified and
your name is self-reported. [Screenshot: Confirmed verifier name and email banner]

**This lasts about two hours** and survives a page reload. Closing the browser window ends it.
To verify as someone else, select **Change** beside your name.

> **Note on names.** Your email address is confirmed by the code. Your name is not checked, and
> the system says so openly wherever the name is displayed.

---

## 3. Verifying one credential

**Prerequisite:** you have confirmed your email (section 2).

1. Ask the credential holder for the **Credential ID**. They can copy it from their wallet.
2. Paste it into the search bar reading **Enter credential ID or code**. [Screenshot: Credential ID search bar on Verification Dashboard]
3. Select **Verify**, or press Enter.

The result appears immediately below.

---

## 4. Reading the result

Every result opens with a clear verdict banner, followed by a one-line explanation and the
credential's details. [Screenshot: Verification result verdict banner with credential details]

| Verdict | What it means | What to do |
|---|---|---|
| **VALID** | Genuine and currently valid | Accept it |
| **REVOKED** | Genuine, but the issuer ended it early. The reason is shown when one was given | Read the reason before deciding. Revocation is not always a problem: a credential may have been reissued with a correction, or a membership may have lapsed |
| **EXPIRED** | Genuine, but past its expiry date | Decide whether currency matters for your purpose. Ask the holder to request a renewal if it does |
| **NOT FOUND** | No such credential exists on the blockchain | Treat the document as unverified. Ask the holder to confirm the ID |
| **INVALID** | The credential could not be verified | Re-check the ID for typos, then contact the issuer |

Alongside the verdict you see: who it was issued to, who issued it, the credential type, its
status, its expiry date, the description, the skills it covers, the credential ID, and when the
check was performed.

> A REVOKED or EXPIRED result still confirms the credential is **real**. Only NOT FOUND
> indicates the credential does not exist.

---

## 5. Verifying a whole portfolio PDF

If the holder sent you a ChainCert portfolio export, you can check every credential in it at
once instead of one at a time.

**Prerequisites:**

- You have confirmed your email (section 2)
- You have the **original digital PDF**, as exported from ChainCert

1. On the Verification Dashboard, find the card **Bulk verify from a ChainCert PDF**. [Screenshot: Bulk verify from a ChainCert PDF card]
2. Select **Choose PDF** and pick the file. [Screenshot: PDF file picker for bulk verification]
3. Verification starts automatically. A progress line shows how many are done. [Screenshot: Bulk verification progress indicator]

Each credential appears as its own full result card, and the batch is headed with a summary such
as "5 checked: 4 valid, 1 revoked". [Screenshot: Bulk verification batch results with summary]

**Uploading a second PDF adds a new batch** above the first, so you can work through several
candidates without losing earlier results. Select **Clear results** to reset.

> **This needs the original file.** A scan, a photograph, or a printed-then-rescanned copy loses
> the embedded links ChainCert reads. If that happens, verify the credentials individually using
> their IDs (section 3).

---

## 6. Verifying from a shared profile link

If the holder sent you a link to their profile rather than a file:

1. Open the link.
   - If it was sent to you specifically, you are asked to confirm your email with a code first.
   - If it is a public link, the profile opens straight away. [Screenshot: Shared profile page after opening link]
2. The profile lists the holder's public credentials, each with its status. [Screenshot: Shared profile credential list with status labels]
3. To check them all against the blockchain, select **Verify all on the blockchain** in the
   Credentials and Badges header. [Screenshot: Verify all on the blockchain button on shared profile]
   - On a public link you confirm your email first, if you have not already.
   - On a link sent to you specifically, your earlier email confirmation is reused.
4. Results appear in a popup with a summary line. [Screenshot: Verify all results popup with summary]

> A shared profile deliberately shows revoked and expired credentials too, each clearly labelled.
> This is intentional transparency rather than an oversight.

---

## 7. Verifying from a QR code or link

Every credential PDF carries a QR code and a verification link.

1. Select the link in the PDF, or open the QR code with any standard phone camera app, which recognizes the code and offers to open its encoded link. [Screenshot: QR code and verification link in credential PDF]
2. The Verification Dashboard opens with the credential ID already filled in. [Screenshot: Verification Dashboard with credential ID pre-filled]
3. Confirm your email if you have not already this session. The check then runs automatically.

---

## 8. Reference: what each result means

### Result colours

| Colour | Verdict |
|---|---|
| Green | Valid |
| Red | Revoked |
| Amber | Expired |
| Purple | Not found |

### Terms you will see

| Term | Meaning |
|---|---|
| **Credential ID** | The credential's permanent identifier on the blockchain |
| **Issued to** | The person who holds the credential |
| **Issued by** | The organisation that created and issued it |
| **Verified via** | Whether the result came from the blockchain directly or a mirrored record |
| **email verified, name self-reported** | Your email was confirmed by code. Your typed name was not checked |

### What gets recorded

Each verification records the credential checked, the result, your confirmed email, the name you
gave, and the time. The credential holder can see this in their history, and the issuer can see
that their credentials are being checked.

Checks on credentials that do not exist are recorded too, so that repeated attempts to verify
fabricated credentials are visible to administrators.

---

## 9. Troubleshooting

Each entry follows the same shape: what you see, why it happens, what to do, and how you know
it worked.

### The verification code never arrived

**Why.** The message went to spam, the address has a typo, or the network you are on blocks
incoming mail.

**What to do.**
1. Check your spam or junk folder.
2. Select **Use a different email** and re-enter the address carefully.
3. Try a different email address if you have one.

**Expected result.** The code arrives and you can continue to the search bar.

---

### "Your email session expired"

**Why.** Email confirmation lasts about two hours. Yours ran out mid-session.

**What to do.** Confirm your email again using the same steps as section 2.

**Expected result.** The line under the page header shows your name and email again, and
verification works.

---

### The result says NOT FOUND but the holder insists the credential is real

**Why.** Usually a mistyped or incomplete ID. Occasionally the document is not genuine.

**What to do.**
1. Ask the holder to copy the credential ID directly from their wallet rather than typing it.
2. Check for missing characters, or spaces at either end.
3. If the ID is confirmed correct and the result is still NOT FOUND, the credential does not
   exist on the blockchain. Treat the document as unverified and contact the issuing
   organisation.

**Expected result.** With the correct ID, the credential resolves to one of the other verdicts.

---

### Bulk verify says no verification links were found

**Why.** The PDF is not an original ChainCert export. Scanning, printing, or re-saving through
some tools strips the embedded links.

**What to do.**
1. Ask the holder to send the original PDF exactly as ChainCert exported it, without printing
   or scanning it.
2. If that is not possible, verify each credential individually by ID (section 3).

**Expected result.** The upload lists the credentials found and begins verifying automatically.

---

### Bulk verify says the PDF could not be read

**Why.** The file is damaged, is not a PDF, or is not a ChainCert export.

**What to do.** Confirm the file opens normally in a PDF reader, and that it came from
ChainCert. Ask the holder to re-export it.

**Expected result.** The file is read and verification begins.

---

### There is no "Verify all on the blockchain" button on the profile

**Why.** The button only appears on a credential holder's shared profile. It is not shown on an
issuing organisation's public profile, or when a holder is previewing their own page.

**What to do.** Verify the credentials individually by ID (section 3), or ask the holder for the
correct share link.

**Expected result.** The button appears in the Credentials and Badges header.

---

### The link says "Link Unavailable"

**Why.** The holder revoked the link, it reached its expiry date, or the address is wrong.

**What to do.** Ask the holder to send a new share link.

**Expected result.** The profile loads, after an email confirmation if the link is
recipient-specific.

---

### A revoked credential: should I accept it?

**Why this happens.** Revocation means the issuer ended the credential early. It does not always
imply wrongdoing.

**What to do.** Read the reason shown with the result. Common legitimate reasons include a
correction and reissue, a superseded version, or an affiliation ending. If no reason is shown,
or the reason is unclear, contact the issuing organisation.

**Expected result.** You have enough context to make an informed decision.

---

### Still stuck

Note the credential ID, the exact verdict, and the time of your check, then contact the
organisation named as the issuer. For problems with the verification page itself, contact the
ChainCert administrator.
