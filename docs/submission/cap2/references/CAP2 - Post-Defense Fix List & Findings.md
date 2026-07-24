# CAP2 — Post-Defense Fix List & Findings

Purpose: a finalized, plain-language list of every issue found in the diagnosis session, with root cause, fix, and a concrete scenario for each. For fixing AFTER defense, and for handing to Claude web to check whether the defense deck script/content needs any change. Ends with a "Deck impact" assessment.

Legend for priority:
- **DEMO HYGIENE** = do before defense day (mostly data cleanup, no code risk).
- **POST-DEFENSE** = real code fix, not urgent, don't touch before defense.
- **DISCLOSE** = say it honestly to the panel, no fix needed.
- **NOT A BUG** = verified false alarm, no action.

---

## TLDR — the issues at a glance

1. **Holder dashboard / "Verification Insights" slow load (the 5-10 min hang).** Root cause is NOT indexing. It's a heavy image payload: the wallet fetch downloads all badge images (~8.4 MB for 7 credentials). POST-DEFENSE fix = slim/lazy-load the badges. [Corrects the "fix indexing" note.]
2. **25-credential display cap on DLSU.** CouchDB returns only 25 rows by default; the 26th+ credential exists but never shows or becomes selectable. DEMO HYGIENE / POST-DEFENSE.
3. **Two "De La Salle University" root authorities in the dropdown.** Data duplicate; one is a real provisioned DLSU, one is an empty shell. DEMO HYGIENE (delete the shell).
4. **Orphan "BSIT" credential.** A junk credential whose on-chain history is empty. Feature works fine on real credentials. DEMO HYGIENE (delete it, don't demo it).
5. **Junk test credentials ("dd", ~15 "Test Badge" spam) + "Revocations by Credential" chart.** The chart is NOT a bug; it just looks odd because of junk names. DEMO HYGIENE (clean the junk).
6. **Dossier "Verification Proof Trail" briefly shows "not verified yet."** A timing/stale-load quirk, not a data error. POST-DEFENSE (add a loading state).
7. **Verification Reach per-credential count doesn't go up (stuck at 21x).** Same credential counted under two buckets because IDs aren't normalized. POST-DEFENSE (normalize the ID).
8. **Revoked "BSIT" doesn't appear in issuer's "revoked still being checked" card.** Symptom of #3 + #4 (junk/duplicate data), not a code bug. DEMO HYGIENE.
9. **Doc gap: "Credentials in Circulation" report is missing from Chapter 5.** The one clean omission. DISCLOSE.
10. **Scaling limitation: verification-log full scan + new gateway per request.** Real but separate from #1; matters only under heavy concurrent load. DISCLOSE (recommendation).

---

## 1. Holder dashboard "Verification Insights" slow load  — POST-DEFENSE

**This corrects the note "FIX INDEXING." It is not an indexing problem.** Proven with the browser Network tab and the peer logs, not guessed.

**Issue:** Loading a holder's dashboard takes very long (17 s on a good network, minutes on a slow/busy one). The "Loading your verification activity…" spinner sits there, which makes it *look* like the verification feature is slow.

**Scenario:** You open Kyle's holder dashboard. He has 7 credentials. The page tries to download all 7, but each credential secretly carries its full badge image baked in as text (~1.2 MB each). That's an 8.4 MB download for one dashboard. On DLSU's network to the VM it takes 17 seconds; while your groupmates are also hammering the VM, that same 8.4 MB stretches into minutes. The "Verification Insights" panel is stuck waiting only because the whole page is blocked behind that image download, the verification data itself came back in under a second.

**Root cause (evidence):**
- Network tab: the credential fetch `GET /wallet/credentials/:holderID` (`apiService.js` `Get_UserCredentials`) returned **8,418 kB in 17.04 s**. Every other request, including `my-verifications` (30 kB, 798 ms), was fast.
- Peer/chaincode logs: Fabric answered in **milliseconds** (discovery 2.7 ms, chaincode 29-36 ms). The blockchain is not involved in the delay.
- The credential documents in CouchDB store the badge as a large base64 image, and the wallet list ships them all inline. The wallet card renders `cred.badgeImage` directly (`studentDashboard.js:767`), so the images are pulled up front.
- Size is the constant cause; slow network / concurrent testers are a multiplier.

**Fix (frontend/backend only, no chaincode redeploy):** stop shipping full-size images in the list.
- Best: resize/compress badges to a small thumbnail at issuance (store ~128-256 px instead of full res).
- Or lazy-load each card's badge on render/click instead of embedding all of them in the list response.
- This is the same fix family as the earlier `/issued` badge-strip.

**Demo workaround:** demo on a fast, uncontended network, keep testers off the VM, use a holder account with few/small badges, and warm the page once beforehand.

---

## 2. 25-credential display cap on DLSU  — DEMO HYGIENE / POST-DEFENSE

**Issue:** On the DLSU account, creating a 26th credential seems to "not work", the list stays at 25 and the new one isn't selectable when issuing.

**Scenario:** You create a new credential on DLSU. The server log even says "Credential created successfully in both systems", it really was created and saved on-chain. But the dashboard re-loads the list, gets only 25 back, and your new one is invisible. Worse, when you go to Issue, the template dropdown is fed by the same capped list, so you can't pick anything past those 25 (and which 25 you see is arbitrary, not the newest). LSCS with only 3 credentials works perfectly, which is the tell.

**Root cause:** `getIssuerTemplatesByIssuerId` (`backend/couchDB_service.js:2823`) runs `db.find({ selector: { isTemplate: true } })` with no limit, and CouchDB's Mango query returns **25 documents by default**. The repo file is still unbounded. This same function feeds both the Credentials tab and the Issue dropdown (`issuerCredentialController.js:1609`).

**Fix:** add an explicit high `limit` (e.g. `limit: 100000`) to the list-query functions in `couchDB_service.js`. Nothing is lost, the existing 26th+ credentials appear immediately after the fix. Must be deployed to the VM (`~/chaincert-api/couchDB_service.js`) and PM2-restarted, not just committed to the repo.

**Demo workaround if unfixed:** issue on the LSCS account (3 credentials, no cap), or issue using one of the 25 visible DLSU templates.

---

## 3. Duplicate "De La Salle University" root authority  — DEMO HYGIENE

**Issue:** When registering a subordinate issuer, the "root authority" dropdown shows **two** identical "De La Salle University" entries.

**Scenario:** A new subordinate (say a department) signs up and must pick its parent university. It sees "De La Salle University" twice and has no way to tell them apart. If it picks the wrong one, the real Fabric provisioning later fails, because only one of the two is the genuine DLSU.

**Root cause:** two approved issuer documents both named "De La Salle University" exist in the `issuers` database (registered under different emails). The duplicate-registration guard (`checkDuplicateIssuerRegistration`, `couchDB_service.js:840`) checks email first, so two DLSU registrations under different emails were never flagged. The dropdown (`getPublicRootAuthorities`, `issuerOnboardingController.js:603`) lists every approved root by id and doesn't dedupe by name. Only `issuer_dlsu_email_com_1783177371155` is the real one (it has `couchDBUrl` :9084 and a Fabric identity); the other is an empty shell.

**Fix (data cleanup, no code change):** in Fauxton (`issuers` DB), find the two docs with `orgName: "De La Salle University"`. Keep the one with `couchDBUrl` + `fabricIdentity` populated. Delete or set the shell one's status to `rejected`/`disabled` so it drops out of the dropdown.

**Optional post-defense hardening (leave for later):** dedupe the dropdown by org name; make the duplicate check org-based.

---

## 4. Orphan "BSIT" credential (empty on-chain history)  — DEMO HYGIENE

**Issue:** Opening "See History" on one Bachelor of Science in IT credential shows no Issued/Active event, just a derived "Expired" note and "No on-chain history found."

**Scenario:** You open a UAT throwaway credential (1-day validity, revocation reason literally "invalid na") and its history looks blank. It looks like the history feature is broken, but it isn't. A clean credential (`test2`) shows the full Issued → Expired timeline with real transaction hashes. So the feature works; this one credential is bad data.

**Root cause:** for this credential, the per-key history lookup (`Get_CredentialHistory` → `GetHistoryForKey`) returns empty, its stored `blockchainId` has no retrievable on-chain history (an orphan/half-created test record). The provenance timeline itself is fine, proven by other credentials.

**Fix:** delete the orphan credential. Confirm first via the browser Network tab (open See History, check `GET /api/credentials/.../history`): a 200 with `{history: []}` = orphan, safe to delete.

---

## 5. Junk test credentials + "Revocations by Credential" chart  — NOT A BUG + DEMO HYGIENE

**Issue:** The "Revocations by Credential" chart looks strange (many same-height bars, sparse labels), and the credential list is full of junk like "dd" and ~15 "Test Badge" copies.

**Scenario:** During a demo, a panelist sees a chart full of bars and a credential literally named "dd." That invites a distracting "why is 'dd' a credential?" tangent that pulls focus off your point.

**Root cause:** the chart is **correct**, `computeRevocationAudit` groups by credential name (a Map, so duplicates can't happen); the bars are just different credentials sorted tallest-first, and the chart library skips most labels. The ugliness is the junk data, not the code.

**Fix (data cleanup only):** delete the junk credentials ("dd", the duplicate "Test Badge" spam, near-duplicate names) on the DLSU account so charts and lists show realistic names on demo day. No code change.

---

## 6. Dossier "Verification Proof Trail" briefly shows "not verified yet"  — POST-DEFENSE

**Issue:** In the admin Credential Dossier, a credential you know was verified shows "This credential has not been independently verified yet."

**Scenario:** You open a dossier expecting to see the verification trail. For the first several seconds it says "not verified yet", then (if you wait) it fills in. If you close the modal early, you never see the trail, and it looks like a false negative.

**Root cause:** the dossier fires the verification-logs fetch without waiting for it (`adminDashboard.js:660`). The proof trail renders immediately against an empty list (shows "not verified yet"), then updates once the slow full-ledger `GetAllVerificationLogs` scan returns. It's a race, not missing data.

**Fix (frontend only):** show a "Loading verification trail…" state while the fetch is in flight, instead of the empty "not verified yet" message. (Durable cure is the same as #10, a faster/bounded verification-log read.)

**Demo tip:** open the Analytics/Logs tab first so the logs are already loaded, then open dossiers, the trail appears instantly.

---

## 7. Verification Reach per-credential count stuck (e.g. 21x, not 22x)  — POST-DEFENSE

**Issue:** After verifying a credential, the issuer's total checks go up, but that specific credential's own count doesn't (stays at 21 when it should be 22).

**Scenario:** You verify a credential that's been checked 21 times. The overall "total checks" ticks up, but the credential's row still says 21. A phantom "1x" row for the same credential appears elsewhere. It looks like the count is broken.

**Root cause:** `computeHolderVerificationInsights` (`analytics.js:729`) groups per-credential using the **raw** credential ID with no normalization, while the rest of the app strips ID prefixes. If a verification logs the ID in a slightly different form (e.g. with vs without a prefix, or via a different verify entry point), the same credential splits into two buckets, counted in the total, but not merged with the existing 21.

**Fix (frontend only):** normalize the credential ID (same prefix-stripping the wallet endpoints use) before grouping in `computeHolderVerificationInsights`. Then every form of the same ID collapses into one bucket.

---

## 8. Revoked "BSIT" missing from issuer's "revoked still being checked" card  — DEMO HYGIENE (symptom of #3/#4)

**Issue:** You verify a revoked credential (verification correctly says REVOKED), but it never appears in the issuer's "Revoked / expired credentials still being checked" card.

**Scenario:** You expect the revoked credential you just checked to show up in that red list. It doesn't, even though the verify result clearly said "revoked." The card only shows "Test Badge" rows.

**Root cause:** the card only shows verifications whose `issuerID` matches the logged-in issuer (`getIssuerVerifications` filters by `issuerID === your id`). This credential's `issuerID` points to the **duplicate/shell DLSU account** (#3), not the DLSU account you're logged in as, so it's filtered out before the card sees it. The card is behaving correctly; the data is split across two DLSU identities. (The orphan-ness in #4 is the same junk-data theme.)

**Fix:** delete the duplicate DLSU root (#3) and the orphan credential (#4) so every DLSU credential resolves to one issuer identity. Don't rely on this card showing BSIT during the demo, and don't demo BSIT.

---

## 9. Doc gap — "Credentials in Circulation" missing from Chapter 5  — DISCLOSE

**Issue:** The issuer "Credentials in Circulation" analytics report is live in the app but absent from the entire manuscript (not just §5.5.2). Verified: zero "circulation health" references anywhere.

**Scenario:** A panelist reads Chapter 5, then sees a report on screen that the paper never mentions. Unaddressed, that reads as a mismatch.

**Root cause:** the report was built after Chapter 5 was finalized.

**Fix (disclosure, not code):** own it in one sentence to the panel, e.g. "One transparency note: Credentials in Circulation, an issuer analytics report, was built after Chapter 5 was finalized, so it isn't documented. That's on us, it's live and I'll show it now."

**Related soft spots (mention only if pressed, they ARE in the paper):**
- **Batch revocation** is tested in Chapter 6 (I-19, I-20) and implied in §5.5.1, but never gets its own feature write-up like batch issuance does.
- **Credential Dossier / proof trail** appears in Chapter 6 (A-16) and the provenance timeline is in Chapter 5, but the dossier isn't fleshed out as a Chapter 5 feature.

---

## 10. Scaling limitation — verification-log full scan + gateway per request  — DISCLOSE

**Issue:** The verification-log read (`GetAllVerificationLogs`) scans the whole ledger every call, and the API opens a brand-new Fabric connection per request (no pooling). Fine at low load, degrades under many concurrent users.

**Scenario:** During heavy concurrent testing (all groupmates at once), verification-dependent views crawl. With one operator (a defense), it's fast.

**Root cause:** `GetAllVerificationLogs` does a full state-range scan (grows with total verifications), and `getContractAndGateway` (`sdk-server-fixed.js:402-408`) creates and tears down a discovery-enabled gateway on every request instead of reusing one.

**Fix (recommendation, post-defense, may need chaincode redeploy):**
- Reuse/pool a long-lived Fabric gateway per identity instead of one-per-request (biggest lever under load).
- Index or bound `GetAllVerificationLogs` (composite-key/paginated read) so it doesn't scan the full ledger.

**Note:** this is SEPARATE from #1. #1 (badge payload) is what makes a single holder dashboard slow; #10 is what makes things slow under many simultaneous users. Don't conflate them.

---

## Deck impact — assessment for Claude web

What in the defense deck may need to change based on these findings:

1. **Slide 10 (limitations/recommendations) needs a correction.** If it currently frames the holder-dashboard slowness as "verification-log query optimization / indexing," that is the wrong root cause. Split it into two honest, distinct items:
   - **Holder dashboard load time** → oversized badge-image payload in the wallet fetch; fix = thumbnail/lazy-load badges (finding #1).
   - **Verification-log scaling** → full-ledger scan + gateway-per-request under concurrency; fix = gateway pooling + bounded/indexed read (finding #10).
   Presenting these as one "indexing" item would be inaccurate and a panelist could catch it.

2. **Keep the "Credentials in Circulation" disclosure** (finding #9) exactly as a one-line owned admission. No other doc gap needs a slide.

3. **No slide needs the data-cleanup items (#2-#5, #8).** Those are demo-hygiene, not content. But add these to the operator's demo run-sheet (NOT the script):
   - Issue on **LSCS**, or apply the 25-cap fix first, so the Issue/Create demo isn't blocked on DLSU (#2).
   - **Don't** demo subordinate registration against the DLSU dropdown until the duplicate root is deleted (#3).
   - **Don't** open See History or verification cards on the orphan BSIT / junk credentials; use a clean credential like `test2` (#4, #5, #8).
   - **Warm** the holder dashboard and Analytics tab once before defense, and keep testers off the VM (#1, #6, #10).

4. **Analytics quirks (#6, #7) are not slide content.** Only relevant if a panelist opens those exact views live; the operator should just favor clean data and pre-warmed tabs.

Bottom line: the only substantive deck change is fixing the Slide 10 root-cause wording (indexing → badge payload + a separate scaling item). Everything else is demo hygiene or an already-planned disclosure.
