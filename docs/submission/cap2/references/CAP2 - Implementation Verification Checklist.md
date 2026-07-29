# CAP2 Post-Defense — Implementation Verification Checklist

> **Purpose:** every change shipped in the post-defense revision cycle, with what was wrong before, what was changed, why, and exactly how to confirm it on the running system.
> **Test target:** the deployed build (CCSCloud VM). Log in with the provisioned demo accounts — holder, issuer (`dlsu@email.com`), subordinate issuer (`lasallecomputersociety@email.com`), and admin (`admin1@email.com`). Credentials are in the walkthrough manual.
> **Scope note:** NO chaincode redeploy, channel config change, schema change, or data migration was required by anything in this document.
> **Categories:** **A** = raised on the defense form · **B** = found by the team (system) · **C** = found by the team (UI/UX).

---

# PRE-FLIGHT — do this before testing anything

**Purpose:** distinguish a genuinely broken feature from a deployment that did not land. Skipping this
turns a five-minute deploy problem into an hour of chasing a feature that is actually fine.

### P-1. The API is running, not crash-looping

```bash
pm2 status
```

Expect `chaincert-api` at **`online`**, with `uptime` counting up and the restart counter `↺` **static**.
A climbing `↺` with `uptime` stuck near `0s` means the process dies on boot and is being restarted
forever — stop and fix that first.

```bash
pm2 logs chaincert-api --lines 20 --nostream
```

The startup must end with **`✅ API running on :4000`**.

> **Do not read old errors as current ones.** `pm2 logs` replays whatever is already in the log file, so
> a fault fixed an hour ago still appears. Run `pm2 flush chaincert-api` before testing so anything you
> see afterwards is genuinely new.

```bash
curl http://localhost:4000/api/health
```

### P-2. The backend files this cycle added are actually present

```bash
ls ~/chaincert-api/utils/nameSimilarity.js
```

If this is missing, the API cannot boot at all — and section **A-5** (near-match names) will appear
broken when the real cause is the deployment. Fix with:

```bash
mkdir -p ~/chaincert-api/utils
cp ~/chaincert-src/src/utils/nameSimilarity.js ~/chaincert-api/utils/
pm2 restart chaincert-api
```

### P-3. Know which testing switches are on

```bash
pm2 logs chaincert-api --lines 20 --nostream | grep "⚠️"
```

Loud banners appear for each active testing bypass. They change what some tests can prove:

| Switch | Effect on testing |
|---|---|
| `DISABLE_RATE_LIMIT` | Repeated failed logins will **not** lock out. Rate limiting cannot be verified while this is on. |
| `DISABLE_PASSWORD_POLICY` | Weak passwords are accepted. The strength rules cannot be verified while this is on. |
| `DISABLE_SIGNUP_OTP` | Registration skips email confirmation, which affects the **A-8** email-notice test. |
| F01 issuance guard (commented out in code) | Past-dated credentials **can** be issued — intentional for testing expiry behaviour. |

Leave them as-is for the functional pass, but **every one of them must be reverted before any
demonstration**, and the banners must be gone from the log afterwards.

---

# CATEGORY A — DEFENSE FORM RECOMMENDATIONS

## A-1. Issuer report wording neutralized

**Description**
*What was wrong:* the issuer's Issuance Performance and Credentials in Circulation summaries read as diagnoses. The issuance report announced a "problem," and the circulation report treated a high expired/revoked share as a fault. For an issuer of short-validity credentials (a 6-month safety certification, say), a high expired share is completely normal turnover, so the system was effectively accusing correct behaviour of being wrong.
*What we did:* rewrote both summaries as descriptive, dual-reading statements that present the number and both plausible interpretations, then let the issuer judge their own context. No wording anywhere now implies fault.

**Rationale**
Defense item S1: the dashboard summaries drew conclusions the data cannot support. A report that asserts a verdict from a single number is indefensible when the same number is normal in one domain and abnormal in another. Describing rather than diagnosing keeps the report useful across every issuer type.

**Steps to Test/Verify**
1. Log in as issuer → **Performance** tab.
2. Read the Issuance Performance summary. It should state counts and distribution only — no "problem", "issue", "concern", or similar.
3. Read the Credentials in Circulation summary on an issuer with expired/revoked credentials. When the inactive share is high it must offer **both** readings (normal for short-duration credentials / worth reviewing for long-lived qualifications).
4. Confirm no sentence tells the issuer they did something wrong.

---

## A-2. Admin card renamed and de-escalated

**Description**
*What was wrong:* the admin analytics tab had a card titled **"Issuers to Review"** which flagged issuers with a red warning icon and red row styling whenever their revocation rate crossed a threshold. The title and styling read as an accusation of misconduct, but a high revocation rate can equally mean an issuer is diligently correcting records. The card also showed only the flagged issuers, hiding the comparison that would give the number meaning.
*What we did:* renamed it **"Revocation Rate by Issuer"**, removed the flag icon and red row styling, switched to a ranked list of all issuers with the threshold shown as a neutral attention band rather than a verdict, and labelled small-sample rows explicitly (an issuer with 1 revocation out of 2 credentials was previously displayed as an alarming 50%).

**Rationale**
Defense item S1: the report implied wrongdoing from a statistic that does not establish it. A ranking with a marked band is honest — it says "these are highest, look here first" — where a flag says "these issuers are suspect." The admin still gets the same prioritisation signal without the platform making an accusation it cannot support.

**Steps to Test/Verify**
1. Log in as admin → **Analytics & Reports** tab.
2. Confirm the card is titled **"Revocation Rate by Issuer"**. The old title must not appear anywhere.
3. Confirm there is no red flag icon and no red-highlighted rows.
4. Confirm all issuers are listed and ranked, not only the flagged ones.
5. Find an issuer with fewer than 4 credentials in the window — it must be labelled as a small sample rather than ranked alongside the others.
6. Read the rule pill. The comparison symbol shown must match the wording in the summary text (both should read "at or above", not one "above" and one "at or above").

---

## A-3. Report thresholds made visible and named

**Description**
*What was wrong:* every number the reports keyed off was a bare literal buried in the middle of a calculation — 60 for "expiring soon", 14 and 30 for the revocation buckets, 25% for the revocation band, and so on. Nothing named them, nothing explained them, and the paper documented none of them. If a panelist asked "why 14 days?", there was no answer in the code or the document.
*What we did:* promoted all of them to named, exported constants collected in one block with comments stating plainly that they are team design choices applied uniformly, not values derived from an external standard. Per-organisation configurable thresholds are documented as future work.

**Rationale**
Defense item S1 asked for the criteria behind the report summaries. The honest answer is that we chose these values; the indefensible position would be implying they came from a standard. Naming them in one place makes the reports auditable and makes the paper's new criteria section describe something real.

**Steps to Test/Verify**
1. This is primarily a code-level change; verify in `src/components/analytics/analytics.js`.
2. Confirm the constants block near the top exports `EXPIRING_SOON_DAYS`, `SUSPICIOUS_WINDOW_DAYS`, `SUSPICIOUS_THRESHOLD`, `SUSPICIOUS_MIN_SAMPLE`, `FAST_REVOKE_DAYS`, `REVOKE_BUCKET_MID_DAYS`, `FAST_SHARE_NOTE_PCT`, `INACTIVE_SHARE_NOTE_PCT`, `QUEUE_AGING_NOTE_DAYS`.
3. Confirm the comment states these are team design choices, not external standards.
4. On screen: the "expiring soon" window quoted in the holder's Credential Health summary must match `EXPIRING_SOON_DAYS`, and the revoke-bucket labels on the issuer's Revocation Self-Audit must match the two bucket constants.

---

## A-4. Revocation reason and date on exported PDFs

**Description**
*What was wrong:* revoking a credential recorded a reason on the blockchain and displayed it in the app, but the exported PDF showed only the status "REVOKED" with no reason and no date. Anyone holding the PDF had to assume the worst, since nothing distinguished a fraud revocation from an ordinary administrative one such as a superseding reissue.
*What we did:* added guarded Revocation Reason and Revoked On rows to both the single-credential export and the multi-credential portfolio export. They render only when the data exists, so credentials revoked before this feature show nothing rather than the word "undefined".

**Rationale**
Defense item D2 asked us to document why revoked credentials remain retained and shareable. That argument only holds if the exported artifact carries the *reason*, because retention without context is what makes revocation look punitive. This change is what makes the paper's new rationale section truthful.

**Steps to Test/Verify**
1. As issuer, revoke an active credential with a clear reason, e.g. `Superseded by corrected reissue`.
2. Log in as that credential's holder, open it, and click **Export PDF**.
3. A styled warning modal must appear first because the credential is revoked. Click **Export anyway**.
4. Open the PDF. Expect a **Revocation Reason** row containing your text and a **Revoked On** date.
5. In the wallet, use **Export All** and confirm the same reason appears in that credential's row in the portfolio PDF.
6. **Long-text check:** revoke another credential with a 300+ character reason and export the portfolio. The text must wrap onto multiple lines and must not run underneath the QR code or overflow the page break.
7. **Legacy check:** export a credential that was revoked before this change and has no stored reason. Both rows must be absent — never "undefined".

---

## A-5. Near-match credential name warning

**Description**
*What was wrong:* the system blocked exact duplicate credential names but nothing else. An issuer could create "Python Certificate" and later create "Python Cert", and both would exist with no indication they were related. Holders and verifiers had no way to tell whether they were the same qualification. The exact-match check was also weak: it compared trimmed lowercase text, so "Python Certificate" and "python  certificate!" were treated as different names.
*What we did:* added a shared rule module used by both the browser and the server. Names are normalised (lowercase, punctuation and spacing stripped) so punctuation variants are now correctly caught as exact duplicates and blocked. Near-matches — where one name is a truncation of the other at the start, or the words are ordered prefixes of each other — produce a warning naming the existing credential, with the option to proceed if the issuer confirms it is genuinely different.

**Rationale**
Defense item S3-a, raised with the exact "Python Certificate / Python Cert" scenario. Deliberately built as **pattern rules rather than a similarity score**: we tested scoring and found no cutoff that separates a true near-match from a false one — "Python Cert" scores 0.72 against "Python Certificate" while "Java Certificate" scores 0.67 against it, so any threshold between them is arbitrary and would be indefensible if a panelist asked how it was chosen. Explicit patterns can be stated in one sentence and justified. Warning rather than blocking preserves the issuer's authority over their own catalogue.

**Steps to Test/Verify**
1. As issuer, create a credential named `Python Certificate`. It should succeed.
2. Create another named `Python Cert`. Expect an amber warning naming "Python Certificate", with a way to continue.
3. Confirm and create it. It should succeed.
4. **Must NOT warn:** create `Java Certificate`. No warning — the leading word differs.
5. **Must still block:** attempt `python  certificate!` (extra space, trailing punctuation). It must be rejected as an exact duplicate, proving normalisation works.
6. **Must not interfere with renewals:** approve a pending renewal request. It reissues under the existing name and must produce no warning, because the check runs only when creating.
7. **Server-side check:** the rule must hold even if the browser is bypassed — the API returns a conflict for both the exact and the near-match case unless confirmation is supplied.

---

## A-6. Registration confirmation heading aligned

**Description**
*What was wrong:* after an issuer submitted a registration, the confirmation screen said **"Application Received"**, while the admin queue that the application landed in called that same state **"Pending"**. Applicants read "Received" as the end of the process and had no cue that a review step followed.
*What we did:* changed the heading to **"Application Pending Review"**, matching the terminology used everywhere else in the workflow.

**Rationale**
Defense item S3-b. A single word, but terminology that diverges between the applicant's view and the reviewer's view is exactly the kind of inconsistency the panel flagged elsewhere in the system.

**Steps to Test/Verify**
1. Go to Create Account → register as an **issuer** (either a root authority or a subordinate).
2. Complete all four registration steps and submit.
3. The confirmation screen heading must read **"Application Pending Review"**.
4. Confirm it reads the same for both the root-authority and subordinate paths.

---

## A-7. Skill suggestions filtered by credential type

**Description**
*What was wrong:* the skills field on the create-credential form was free-text only. Every issuer retyped the same skills for every credential, producing inconsistent spellings and casing across their own catalogue, which in turn fragmented the analytics that group by skill.
*What we did:* added one-click suggestion chips under the skills input, drawn from the issuer's **own** previously used skills, filtered to the credential type currently selected, ranked by how often they have used each one, and hidden once already added. Free typing is unchanged.

**Rationale**
Defense item S3-c asked specifically for type-based filtering. Deliberately scoped to the issuer's own history rather than a shared cross-issuer vocabulary: a shared list has no moderation path, so one typo from one issuer would propagate to everyone, and it would require new backend storage — well beyond a minor revision. Self-scoped delivers the consistency benefit with no new data and no shared-quality risk.

**Steps to Test/Verify**
1. As issuer, create a credential with type `Academic` and skills `Python`, `Data Analysis`. Save it.
2. Start creating another credential and select type `Academic`.
3. Suggestion chips must appear under the skills input offering `Python` and `Data Analysis`.
4. Click one — it should be added as a tag and disappear from the suggestions.
5. Switch the type to something else, e.g. `Training`. The Academic-only suggestions must no longer appear.
6. Confirm you can still type any skill freely; suggestions are additive, not a restriction.

---

## A-8. Email-sent confirmations in the interface

**Description**
*What was wrong:* the system sent notification emails on issuance, renewal approval, and issuer registration, but no screen ever said so. Users had no way to know an email had been dispatched, so they did not know to check their inbox, and issuers could not tell recipients to expect one.
*What we did:* the issuance and renewal-approval success messages now state that a notification email was sent to the holder, and the registration confirmation screen tells the applicant a confirmation email has been sent to their registered address. Each claim was checked against the code that actually sends the mail before being written.

**Rationale**
Defense item S3-d. The behaviour already existed and was simply invisible. Stating it costs nothing and removes the "did anything happen?" uncertainty.

**Steps to Test/Verify**
1. As issuer, issue a credential to a holder. The success toast must mention that a notification email was sent to the holder.
2. Approve a pending renewal request. The success toast must mention the holder was emailed.
3. Register a new issuer account. The confirmation screen must state a confirmation email was sent to the registered address.
4. **Truthfulness check:** confirm the emails genuinely arrive (subject to the mail configuration in use — if the demo catch-all address is set, issuer and admin mail is redirected there while holder mail goes to the real address).

---

# CATEGORY B — OWN FINDINGS (SYSTEM)

## B-1. Verification panels that never finished loading

**Description**
*What was wrong:* the holder's Verification Insights panel and the issuer's Verification Reach panel could spin forever and never show data. The cause was subtle: each used a flag to make sure the fetch ran only once, but that flag was declared in a way that made React re-run the effect the moment it was set. The re-run's cleanup then cancelled the very fetch that had just been started, so the result was discarded and the spinner never resolved. It happened on both dashboards for the same reason.
*What we did:* changed both once-guards to a form that does not retrigger the effect, and removed them from the effect's dependency list. We then swept the codebase for a third occurrence of the same pattern and confirmed there is none.

**Rationale**
This is the kind of bug that looks like a slow server and gets misdiagnosed for weeks. It also gated the documentation work: the adviser was going to open a holder dashboard to check the revised reports, and would have found a permanently spinning panel.

**Steps to Test/Verify**
1. Log in as a holder who has at least one verified credential.
2. On the wallet dashboard, wait for the **Verification Insights** panel. It must finish loading and show data (or a proper empty state) — never spin indefinitely.
3. Log in as issuer → open the **Performance** tab. The **Verification Reach** panel must finish loading the same way.
4. Reload each page twice more to confirm it is consistent, not a one-off.
5. Navigate away mid-load and back — the panel must still resolve.

---

## B-2. Lists silently capped at 25 records

**Description**
*What was wrong:* database list queries did not specify how many rows they were allowed to return, and the database's silent default is 25. So a 26th credential would save successfully, report success, and then simply never appear in any list — no error, no warning, nothing in the logs. The flaw affected 51 queries across the service layer and controllers, including the admin pending-issuer queue, subordinate issuer lists, and notification queries.
*What we did:* audited every query and gave each an explicit limit — 1 for single-record lookups by unique key, a high ceiling for list queries.

**Rationale**
Silent truncation is the worst class of data bug because everything reports success. On governance data — pending issuer applications, subordinate lists — it would have meant an admin simply never seeing an application past the 25th, with no indication anything was hidden.

**Steps to Test/Verify**
1. As one issuer, create or issue **more than 26** credentials (batch issuance makes this quick).
2. Open the issuer's credential list. The total count must reflect all of them, not stop at 25.
3. Page to the last page and confirm the 26th and beyond are actually reachable.
4. Repeat on the admin **Credentials** and **Users** tabs with more than 26 records.
5. **Regression guard:** confirm the admin **Pending** issuer queue still lists every pending application, and that a root authority still sees all of its subordinates. These queries were in the affected set.

---

## B-3. Chart categories splitting into duplicates

**Description**
*What was wrong:* charts that grouped data used the raw text as the grouping key. "Academic", "academic", and "Academic " (with a trailing space) each became a separate bar, so one category showed up two or three times and every count was understated. The same flaw hit per-credential verification grouping, where the same credential logged under two different identifier formats was counted as two separate credentials.
*What we did:* normalised the grouping keys — trimmed and lowercased for categories, prefix-stripped for credential identifiers — while still displaying the original spelling the user first entered.

**Rationale**
These are the exact reports the defense asked us to document. Writing a criteria section for a chart that double-counts would have meant documenting broken output, with the adviser checking it against the live system.

**Steps to Test/Verify**
1. As issuer, create credentials with types typed inconsistently: `Academic`, `academic`, and `Academic ` (trailing space).
2. Issue at least one of each.
3. Open **Performance** → Issuance Performance. There must be **one** Academic bar, not two or three, and its count must be the sum.
4. Confirm the label displays in the original casing, not forced lowercase.
5. On the holder dashboard, confirm a credential verified multiple times appears once in the most-checked list with the full count, not split across two rows.

---

## B-4. Database connection string moved to configuration

**Description**
*What was wrong:* the database URL, including its credentials, was hardcoded in two separate places in the service layer. Changing environments meant editing source code, and the two copies could drift apart.
*What we did:* both now read from an environment variable with the historical value as the fallback, so behaviour is unchanged where the variable is unset. Documented in the environment template.

**Rationale**
Retires part of a documented accepted limitation (hardcoded database credentials) at effectively zero risk. Also removes a real deployment hazard: two hardcoded copies is one copy waiting to be missed.

**Steps to Test/Verify**
1. With the environment variable unset, restart the API and confirm everything still works — this proves the fallback is intact.
2. Check `/api/health` responds.
3. Load the admin dashboard and confirm credentials, users, and issuers all list correctly (this exercises both former hardcoded copies).
4. Optionally set the variable explicitly to the same value, restart, and confirm identical behaviour.

---

## B-5. "Not verified yet" shown while still loading

**Description**
*What was wrong:* the verification proof trail displayed "Not independently verified yet" whenever it had no data — including while it was still fetching. Users saw a definitive negative statement about a credential that may well have been verified many times, purely because the request had not returned.
*What we did:* the component now distinguishes loading from empty, showing a spinner while the fetch is in flight and the empty message only once the fetch confirms there is genuinely nothing.

**Rationale**
Stating a false fact during loading is worse than showing nothing. On a credential-verification platform, "not verified" is a meaningful claim, so it must never be displayed speculatively.

**Steps to Test/Verify**
1. As a holder, open a credential that **has** been verified, then click **See History**.
2. Watch the proof trail area as it loads. It must show a spinner, never "Not independently verified yet".
3. Once loaded, the verification entries must appear.
4. Now open a credential that has genuinely never been verified. After loading completes, the "not verified yet" message is correct and should appear.
5. Repeat on the admin credential dossier view.

---

## B-6. Portfolio PDF text overflow and page-break miscalculation

**Description**
*What was wrong:* two pre-existing bugs found while adding the revocation reason. First, long values in the multi-credential portfolio export were not wrapped, so they ran off the edge and underneath the QR code. Second, the routine that estimates how tall each credential's block will be — used to decide when to start a new page — did not count the optional rows it could itself render (the renewal line, and now the revocation reason), so a credential with those rows could overflow the bottom of the page.
*What we did:* long values now wrap properly, and the height estimate accounts for every optional row it may emit.

**Rationale**
Found while implementing A-4 rather than reported. Both would have surfaced as visibly broken PDFs — the exact artifact holders share with employers.

**Steps to Test/Verify**
1. As a holder with several credentials, revoke one with a very long reason (300+ characters) and ensure another has been renewed at least once.
2. Use **Export All** to produce the portfolio PDF.
3. Confirm the long reason wraps across lines and never overlaps the QR code.
4. Scroll the whole PDF and confirm no credential block is cut off at a page boundary.
5. Confirm the renewed credential's renewal line appears and is fully inside its block.

---

## B-7. Silent field-drop in the credential-creation request

**Description**
*What was wrong:* the function that sends a new credential to the server builds its request body by listing each field explicitly rather than forwarding the whole object. Any field not on that list is silently dropped. This was discovered while wiring the near-match confirmation flag (A-5): the browser was sending the confirmation, the server was never receiving it, and nothing errored — the create simply kept failing as a duplicate.
*What we did:* added the field to the list, and recorded the trap in the project's working notes so future fields are not lost the same way.

**Rationale**
Found during our own verification of A-5, not reported by anyone. Worth recording because the failure mode is invisible: no error, no warning, the field just does not arrive.

**Steps to Test/Verify**
1. Perform the A-5 near-match test: create `Python Certificate`, then `Python Cert`.
2. When the warning appears, confirm and proceed.
3. The credential **must** be created. If it is rejected again with a duplicate error, the confirmation flag is not reaching the server.
4. Confirm the new credential appears in the issuer's list.

---

## B-8. Urgency tier that never rendered

**Description**
*What was wrong:* the renewal-alert logic carried a hidden "critical" tier for credentials expiring within 14 days. The word "critical" never appeared anywhere in the interface — the tier only changed a badge colour. It was an undocumentable threshold: a number affecting the display that no user could see and no document could justify.
*What we did:* removed the tier and kept a single 60-day expiring-soon band, updating the consumer that read it. Also aligned the expiry-alert clock with the one used by the health donut, which previously disagreed near the boundary — the donut could say "Expired" while the alert list said "0 days left" for the same credential on the same day.

**Rationale**
Defense item S1 asked for documentable criteria. A threshold that alters output but is invisible to users and absent from the documentation is the opposite of that. Removing it was cheaper and more honest than inventing a justification.

**Steps to Test/Verify**
1. As a holder, view the wallet dashboard with a credential expiring within 14 days.
2. Confirm the renewal alert shows the days remaining with no "critical" label or distinct alarm styling.
3. **Boundary check:** find or create a credential expiring **today**. The Credential Health donut and the renewal alert list must agree on its state — one must not call it expired while the other shows days remaining.

---

## B-9. Demo data cleanup on the deployment

**Description**
*What was wrong:* the deployed database carried leftovers from earlier testing: a duplicate root-authority record (one properly provisioned, one an empty shell), an orphaned credential with no history, and roughly fifteen junk test credentials. These polluted the admin lists and the analytics the adviser would be checking.
*What we did:* removed them directly through the database console, verifying first that the surviving root-authority record was the one carrying the working connection details and blockchain identity.

**Rationale**
Cosmetic for the platform but material for review: the reports we were asked to document are computed from this data, so junk records would have distorted exactly what the adviser inspects.

**Steps to Test/Verify**
1. As admin, open the **Issuers** tab and confirm the root authority appears **once**, not twice.
2. Confirm the surviving record still functions: it can be opened, and its subordinates list correctly.
3. Open the **Credentials** tab and confirm the junk test entries are gone.
4. Confirm issuance still works end to end for that root authority — this proves the correct record was kept.

---

## B-10. Deployment sync omitted a required backend file

**Description**
*What was wrong:* the script that reshapes the source checkout into the server's runtime layout copied
the backend controllers and routes, but had no instruction for `src/utils/`. That was correct until this
cycle, when the near-match name rules (A-5) introduced the first shared module living there. After the
sync, the server received the controller that requires that module but not the module itself, so it
threw a missing-module error the instant it started, the process manager restarted it, and it failed
again — indefinitely. The symptom was deceptive: because the log viewer shows the tail of the log file,
the screen appeared to be stuck repeating one error rather than reporting a crash. The same omission
existed in two other places — the manual copy-command list and the local installation manual — so a
from-scratch install would have hit it too.
*What we did:* the sync script now creates the `utils` directory and copies the file **by name**, with a
comment recording why it must not be turned into a wildcard copy: everything else in that directory is
browser-only code that will not load on the server. The other two copy lists gained the same step, and
both manuals gained a troubleshooting entry describing the crash-loop symptom, how to distinguish it
from a display problem, and the fact that old errors persist in the log after a fix.

**Rationale**
Found during the deployment of this cycle's own work. Worth recording because the failure is silent at
the source — the sync reports success, and only the server knows it is incomplete — and because the
presentation actively misleads. It also establishes a rule the project did not previously need: shared
modules that cross the frontend/backend boundary must be copied explicitly, never by wildcard.

**Steps to Test/Verify**
1. On the server, run the sync script the same way a normal update would: `bash ~/chaincert-src/deploy-sync.sh`.
2. Confirm it completes with `== done ==` and the "left untouched" notice about the wallet and settings file.
3. Confirm the file landed: `ls ~/chaincert-api/utils/nameSimilarity.js`.
4. Restart the API and confirm a clean boot ending in `✅ API running on :4000`, with the restart counter no longer climbing.
5. **Prove the fix end to end** by running the A-5 test — creating a near-match credential name must produce the warning, not a server error.
6. **Regression guard:** confirm the sync did not disturb the two protected items — the wallet folder still holds its identities, and the settings file still has its values.

---

# CATEGORY C — OWN FINDINGS (UI / UX)

## C-1. Keyboard and screen-reader accessibility

**Description**
*What was wrong:* three genuine barriers. The account menu button in the top bar explicitly suppressed its own focus outline, so a keyboard user tabbing through the page could not see when it was selected — it was the only place in the app that overrode the global focus ring. Fourteen icon-only close buttons across the popups had no accessible label, so a screen reader announced each one as just "button" with no indication of what it did. And two clickable elements — a credential row in the wallet and a credential card on a shared profile — were built as non-interactive elements with click handlers, making them completely unreachable by keyboard.
*What we did:* restored the focus ring (suppressing it only on mouse hover, where it is noise), labelled all fourteen close buttons, and made both click targets properly focusable and operable with Enter and Space, copying the correct pattern already used elsewhere in the app.

**Rationale**
These are functional exclusions, not polish — a keyboard-only user genuinely could not open a credential from the wallet. Cheap to fix and independently verifiable.

**Steps to Test/Verify**
1. **Focus ring:** from the page top, press Tab repeatedly to reach the account avatar in the top bar. A visible focus ring must appear. Then click it with the mouse — no ring should show on hover.
2. **Keyboard reachability:** on the holder wallet, Tab to a credential row. It must show focus. Press **Enter** — the detail popup must open. Press Escape, Tab back, press **Space** — it must also open.
3. Repeat on a shared profile link's credential card.
4. **Labels:** with a screen reader (or the browser's accessibility inspector), open any popup and inspect its ✕ button. It must be announced as "Close", not "button".
5. Check across issuer, admin, profile, preview, and settings popups.

---

## C-2. Row actions no longer scroll off wide tables

**Description**
*What was wrong:* every wide table put its action buttons in the final column, inside a horizontally scrolling container whose columns kept their natural width. On a laptop or a narrower window the action column simply slid off the right edge, so users could not see that actions existed at all without scrolling sideways — the worst case being a ten-column table. Separately, one admin log table had no page controls at all and rendered every record at once, and its search box was filtering the unsorted data, so searching silently ignored whatever sort the user had chosen.
*What we did:* one shared rule pins the trailing action column to the right edge with an opaque background and a seam shadow, so it stays visible while the rest of the table scrolls underneath. Applied to seven tables. Fixing this first required removing a style that was silently defeating it — the tables were clipping their own content, which disables pinned positioning entirely. The unpaginated log table now paginates like every other, and its search now filters the sorted data.

**Rationale**
Discoverability, not aesthetics: an action a user cannot see is an action that does not exist. Chosen over the alternatives — a menu hides actions behind an extra click, and a leading action column reads as row selection and pushes the actual data rightwards.

**Steps to Test/Verify**
1. As issuer, open the **Issue** view (widest table, ten columns).
2. Narrow the browser window until a horizontal scrollbar appears.
3. Scroll the table sideways. The **Actions** column must stay pinned to the right edge and remain fully readable, with a visible seam separating it.
4. Confirm the pinned cells have a solid background — content must not show through them.
5. Repeat on the admin **Users** and **Credentials** tabs and the issuer **Revoke** and **Subordinates** tables.
6. **Conditional case:** on the admin **Issuers** tab, switch to the **Rejected** view. That view has no actions column, so nothing should be pinned and the layout must look normal.
7. **Phone check:** narrow to a phone width. Pinning switches off by design; confirm the table simply scrolls normally.
8. **Log table:** open the admin root-subordinate decision logs. Confirm page controls exist, then set a sort order and type a search term — results must respect **both**.

---

## C-3. Escape closes popups, and layering fixed

**Description**
*What was wrong:* only one popup in the entire app closed with the Escape key — the shared component, used on a single page. The other thirty were hand-built and could only be dismissed by clicking the ✕ or the backdrop. Separately, the layering was wrong in two visible ways: popups built with inline styling used a stacking value **higher than the notification toasts**, so a toast triggered from inside a popup was hidden behind it; and the issuer's popups used a value **lower than the sidebar**, so the sidebar stayed bright and undimmed while everything else darkened.
*What we did:* added a shared Escape handler applied to all thirty popups. When popups are stacked — a confirmation on top of a form — Escape closes only the topmost one. Each close reuses that popup's own Cancel logic, so protections still apply: Escape cannot close a batch operation that is mid-run. All popup layers now use one shared value, placing them correctly below toasts and above the sidebar.

**Rationale**
Escape-to-dismiss is a universal expectation; thirty popups ignoring it is a consistency failure users feel immediately. The layering bugs were genuine defects — a notification you cannot see is a notification that failed.

**Steps to Test/Verify**
1. As issuer, open **Create Credential** and press **Escape**. It must close.
2. Reopen it, fill it in, and advance to the confirmation step. Press **Escape** — only the confirmation should close, leaving the form open. Press **Escape** again — the form closes.
3. **Guard check:** start a batch revocation and, while it is running, press **Escape**. It must **not** close.
4. **Toast layering:** as admin, approve an issuer from its popup. The success toast must be visible **above** the popup, not hidden behind it.
5. **Sidebar dimming:** as issuer, open any popup. The left sidebar must dim along with the rest of the page.
6. Spot-check Escape on the admin, profile, shared-profile, and settings popups.
7. **Deliberate exception:** on a shared profile link, the email-verification gate must **not** close on Escape — it is a required step, not a dismissible popup.

---

## C-4. Design-token integrity

**Description**
*What was wrong:* three related problems. Eight dropdown arrows were drawn using a purple the design system explicitly bans by name, while the correct version already existed elsewhere in the codebase. Eight more places used a completely different purple borrowed from another toolkit. Most significantly, thirty-two places wrote a design token with a hardcoded "backup" colour beside it — and twenty of those backups **disagreed** with the real token, so they were both dead code and a silent drift hazard. One component referenced a token name that **has never existed**, meaning its tooltips had been running on their hardcoded backup the entire time, permanently disconnected from the design system. Twenty-six places also hand-wrote the keyboard focus ring instead of using the token that existed for exactly that purpose and had zero users.
*What we did:* corrected all the arrows and purples, stripped every backup value (the design tokens load first, so the backups could never fire), pointed the broken reference at a real token, and moved all focus rings onto the shared token.

**Rationale**
None of this changes what a user sees today; all of it changes what happens the next time someone edits a colour. A token with a stale backup beside it means the "single source of truth" quietly is not one.

**Steps to Test/Verify**
1. Open any page with a dropdown — issuer filters, admin filters, registration. The dropdown arrows must be the muted grey used across the app, not purple.
2. Open the profile page and a shared profile. The accent purple on drag handles, the "see all" button, and issuer labels must match the purple used elsewhere in the app.
3. Hover any **?** help icon. The tooltip must appear with the standard panel background.
4. Tab through form inputs across several pages. Every focus ring must look identical.
5. **Regression sweep:** load the login, registration, landing, and about pages and confirm the background photos still show through their panels — this is the area a token change could have flattened.

---

## C-5. Shared empty and loading states

**Description**
*What was wrong:* seventeen places wrote their own "nothing here" message by hand, producing seventeen slightly different looks and phrasings for the same situation. One page showed a bare text heading as its loading state while every other page in the app used a proper spinner.
*What we did:* moved the full-page empty states onto the shared component so they all present identically, and switched the odd page to the standard spinner. Small inline empties inside dropdowns and narrow panels deliberately stay as plain text, since a large centred icon block would be wrong at that size.

**Rationale**
Empty states are what a user sees most often when exploring an unfamiliar system. Seventeen variants of the same message is exactly the "assembled from parts" impression that undermines a polished product.

**Steps to Test/Verify**
1. As admin, filter the **Credentials**, **Users**, and **Issuers** tabs to produce no results. Each must show the same styled empty block with an icon.
2. Do the same on the issuer's credential list, renewal queue, and subordinates list.
3. Open the blockchain history page and watch it load — it must show a spinner, not a bare heading.
4. Filter its results to nothing and confirm the shared empty state appears.
5. Confirm small dropdown empties (for example, a recipient search with no matches) still show simple text, not an oversized icon block.

---

## C-6. Copy consistency and export parity

**Description**
*What was wrong:* leftovers from the earlier rename of "template" to "credential" survived in five user-facing places — the blockchain history timeline in four different screens still said "created template", and the profile page's visibility popup and its toasts still said "template". The verification page was titled "Verify a Credential" while the navigation link and both help pages called it the "Verification Dashboard", so users clicked one name and landed on another. And the credential popup on the profile page had no Export PDF button even though the identical popup in the wallet did — its own code comment claimed the two were the same.
*What we did:* completed the rename, retitled the verification page to match the link that leads to it (the underlying address is unchanged, because it is embedded in every previously exported PDF's QR code), and added Export PDF to the profile popup.

**Rationale**
The export gap had a trap worth noting: the wallet's export stamps renewal information using two helper functions defined locally on that page. Copying the button alone would have meant the **same credential** exporting differently depending on which screen you started from. Both paths now share one implementation, so they cannot diverge.

**Steps to Test/Verify**
1. As holder, open a credential → **See History**. The timeline must say "created credential", never "created template".
2. Check the same on the issuer history view, the admin credential dossier, and the blockchain history page.
3. As issuer, open your profile and toggle a credential's visibility. The confirmation popup and the resulting toast must say "credential".
4. Click **Verification Dashboard** in the navigation. The page you land on must carry that same title.
5. **Parity test:** as holder, open a credential from the **profile page** and click **Export PDF**. It must work and must show the revoked warning if applicable.
6. **Divergence test:** take a credential that has been renewed at least once. Export it from the wallet, then export the same credential from the profile page. The two PDFs must show **identical** renewal information.

---

## C-7. Dead code removed and network calls unified

**Description**
*What was wrong:* the forgot-password page was the only screen in the app making raw network calls directly instead of going through the shared client, so it did not benefit from the shared configuration and had its own duplicated fallback address. Several buttons gave no visual feedback at all when disabled, leaving users clicking a dead control with no explanation. And a set of components and styles had zero users anywhere: a table component, a card header, two form controls, an empty stylesheet, and leftover styling from the original project scaffold.
*What we did:* moved the forgot-password calls onto the shared client while preserving the exact error-message behaviour, added a baseline disabled appearance that applies to every button in the app, and deleted the unused code.

**Rationale**
The network change removes the last inconsistency in how the app talks to the server. The disabled-state gap was a real usability problem on the verification and shared-profile screens. Deleting unused code prevents someone maintaining or extending something no page renders.

**Steps to Test/Verify**
1. Go to **Forgot Password** and submit a registered email. The code-entry step must appear.
2. Enter a **wrong** code. The specific server message must be shown — not a generic error. This confirms the error handling survived the change.
3. Complete a real reset with a correct code and confirm you can log in with the new password.
4. **Disabled feedback:** on the verification page, before entering an email, confirm the disabled button is visibly dimmed and shows a "not-allowed" cursor.
5. Check the same on the shared-profile verification gate.
6. **Build check:** the application must compile with no new warnings, confirming nothing still referenced the deleted code.

---

## C-8. Typography, icons, and final polish

**Description**
*What was wrong:* 186 places specified font weight as a raw number instead of the design system's named weight, so changing the app's typographic scale would have required editing all of them individually. Two icons sat off the size grid used everywhere else. Roughly forty-five pieces of text used three full stops instead of a proper ellipsis character, which renders with different spacing. Two interface controls were still drawn with text characters rather than real icons — a drag handle and a dropdown arrow — and one dropdown's options carried coloured circle emoji even though the same information was already conveyed by styling. The timeline data also still carried emoji icon fields that nothing had rendered since the earlier icon migration.
*What we did:* moved all font weights onto named tokens, snapped the stray icons to the grid, standardised the ellipsis, replaced the text-character controls with proper icons, removed the emoji from the dropdown, and deleted the dead emoji data.

**Rationale**
Individually trivial, collectively the difference between a product that looks deliberate and one that looks assembled. Two sweeps were deliberately **not** done and are recorded as future work: bulk corner-radius tokenisation, because matching by value would attach the wrong semantic name to elements that merely share a number; and a shared "glow" style, because the three places that glow are three genuinely different effects with nothing to unify.

**Steps to Test/Verify**
1. Scan several pages for visual regressions in text weight — headings, labels, and buttons should look exactly as before. This change should be invisible.
2. Open the issuer profile page and confirm the drag handle on credential cards is a proper icon, not a pattern of dots.
3. Open the issuer **Issue** view and confirm the renewal-requests card's expand arrow is a proper chevron that rotates when opened.
4. Open the blockchain history page's status filter. The options must be plain text with no coloured circle emoji.
5. Watch any loading button — the text must use a single ellipsis character, not three periods.
6. Open a credential's history timeline and confirm the events show proper icons.

---

# Sign-off summary

| Category | Items | All verified |
|---|---|---|
| Pre-flight (P-1 … P-3) | 3 | ☐ |
| A — Defense form recommendations | 8 | ☐ |
| B — Own findings (system) | 10 | ☐ |
| C — Own findings (UI/UX) | 8 | ☐ |

**Cross-cutting checks after all of the above:**
- ☐ Application builds with no new warnings.
- ☐ `/api/health` responds on the deployed API.
- ☐ `pm2 status` shows the API `online` with a static restart counter (re-check at the end — a fault can appear mid-session).
- ☐ A full credential lifecycle works end to end: create → issue → verify → renew → revoke → export.
- ☐ All four roles can log in and reach their dashboards.

**Before any live demonstration (separate pass — do NOT do these during functional testing):**
- ☐ Remove `DISABLE_RATE_LIMIT`, `DISABLE_PASSWORD_POLICY`, and `DISABLE_SIGNUP_OTP` from the server settings file.
- ☐ Re-enable the issuance date guard in the issuer credential controller (currently commented out for testing).
- ☐ Decide whether the demo mail catch-all address stays set or is removed.
- ☐ Restart the API and confirm **no ⚠️ banners** remain in the startup log.
