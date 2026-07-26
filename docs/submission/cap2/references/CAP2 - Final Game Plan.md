# CAP2 Post-Defense — Final Game Plan (Sanitized Execution Record)

> **Status:** All system and UI batches EXECUTED (July 2026). This is the sanitized, committed record of the locked plan plus what actually shipped. The unsanitized working notes (form transcription, transcript, per-panelist attribution) live in the gitignored `defense-revisions/` folder and are deliberately absent here.

## Context

ChainCert's CAP2 defense resulted in a conditional pass with minor revisions, checked by the adviser. The revision inputs were: the official defense form (3 SYSTEM + 7 DOCUMENT items), the session transcript, and an independent full-manuscript audit (4,014 lines, four verification agents). Every claim — from the panel, from groupmate summaries, and from our own audit — was verified against the actual repo before any fix was planned. Several reported items turned out to be false positives or already-implemented; those are recorded below as verified no-ops rather than silently dropped.

**Governing rule: FIX BY CLASS, NOT BY INSTANCE.** Every finding was treated as a class: complete occurrence enumeration first, then one rule/token/component/util that resolves all occurrences. Where a class turned out to have only one real member, that is stated.

**Layer impact (verified item-by-item): NO chaincode redeploy, NO channel config update, NO new CouchDB fields, NO schema change, NO backfill.** Backend-touching items are `cp` + PM2 restart only.

---

## PART A — SYSTEM ITEMS (S-1 … S-8) — all shipped

### S-1 — Correctness bugs gating the documentation ✅
1. **Self-cancelling fetch (class, 2 occurrences):** a `useState` once-guard listed in its own `useEffect` dependency array made the effect's cleanup cancel the in-flight fetch (spinner hangs). Fixed by converting the guards to `useRef` on both the holder dashboard (`viFetched`) and the issuer dashboard (`reachFetched`). Class sweep confirmed no third occurrence.
2. **Un-normalized grouping keys (class, 3 compute functions):** `analytics.js` grouped chart buckets on raw strings, splitting "Academic" vs "academic " into two bars and prefix-variant credential IDs into two rows. Added `normTypeKey`/`normCredIdKey` helpers; grouping is normalized, display keeps first-seen casing.
3. Verified acceptance: spinners complete on both dashboards; duplicate type bars merge; per-credential verification counts group correctly.

### S-2 — Smallest panel wins ✅
1. **Revocation reason on PDF exports** (`pdfExportService.js`): guarded rows on both the single-credential export and the portfolio row (absent reason on legacy revocations renders nothing, never "undefined"). While in there, fixed two pre-existing portfolio bugs: long values now wrap via `splitTextToSize` (previously ran under the QR), and `estimateRowHeight` now accounts for the dynamic Renewed/Reason rows (previously a page-break overflow risk).
2. Registration confirmation heading "Application Received" → **"Application Pending Review"** (aligns with the admin queue's status language).
3. Skills input type-filtering: verified the reported gap, then built **self-scoped skill suggestions** — one-click ghost chips computed from the issuer's OWN past credentials, filtered to the selected credential type, top 8 by frequency, deduplicated against already-added tags. Free typing unchanged. (A cross-issuer shared/growing vocabulary was assessed and rejected: typo pollution without moderation, new backend surface, scope creep.)

### S-3 / S-4 — Report-wording neutralization ✅
- Issuer self-audit and circulation summaries rewritten to descriptive, dual-reading language (a high expired share is *normal* for short-validity issuers; the text no longer implies fault).
- The invisible "critical ≤14 days" urgency tier was deleted (it only flipped a pill color; the word never rendered and the threshold was undocumentable).
- Admin "Issuers to Review" card → **"Revocation Rate by Issuer"**: descriptive ranking, band marker instead of verdict, flag icon and red row styling removed, link text neutralized.
- Approval-queue aging tile: red danger threshold → neutral accent, driven by a named constant.
- `>` vs `≥` display/code mismatch fixed; the previously silent `SUSPICIOUS_MIN_SAMPLE` rule is now surfaced in the rule pill, and small-sample rows are labeled.

### S-5 — Thresholds visible + dead code ✅
- Every inline threshold promoted to a named, exported, commented constant in `analytics.js`: `FAST_REVOKE_DAYS`, `REVOKE_BUCKET_MID_DAYS`, `FAST_SHARE_NOTE_PCT`, `INACTIVE_SHARE_NOTE_PCT`, `QUEUE_AGING_NOTE_DAYS` (joining the existing `EXPIRING_SOON_DAYS`, `SUSPICIOUS_*` block). All framed explicitly as team design choices, not external standards.
- Dead `computeVerificationVolume` deleted (zero importers); stale outline comments fixed.

### S-6 — Near-match credential names ✅ (the one real build)
Design: **pattern rules, not a similarity score** (Dice-coefficient cutoffs proven non-separating on real examples). New shared util `src/utils/nameSimilarity.js` (CommonJS, zero deps, deploys to `~/chaincert-api/utils/`):
- `normName()` strips non-alphanumerics → exact-match blocking now catches punctuation variants the old check missed.
- Near-match = containment-at-start OR ordered word-prefix match → **warns with the existing name listed, but lets the issuer confirm and create** (`confirmSimilar`). Exact duplicates stay blocked (409).
- Wired at BOTH layers: frontend `nameClash` memo + confirm step, and backend Step 2.5 (`SIMILAR_NAME` 409). `apiService` forwards the confirmation flag (its POST body is an explicit field list that would otherwise drop it).
- Renewal re-issue verified NOT to trip the check (issuance path never creates names).

### S-7 — Query limits + env-driven CouchDB URL ✅
- **Mango 25-row default cap (class, 46 + 5 occurrences):** every `.find()` in `couchDB_service.js` (46) and the controllers (5) now carries an explicit `limit` — `1` for unique-key lookups, high for list queries. This was the root cause of "the 26th credential saves but never lists."
- `COUCHDB_URL` is now `process.env.COUCHDB_URL || <historical default>`; a second hardcoded `nano()` instance routes through the same constant. `.env.example` documented. Retires part of accepted-limitation M11.
- Proof-trail loading state: `CredentialHistory` gained a `proofTrailLoading` prop (wired from admin and holder) so it shows a spinner instead of falsely claiming "Not independently verified yet" while logs are in flight.

### S-8 — VM data cleanup (manual, Fauxton)
Owner-run task, not code: remove the duplicate root-authority shell doc (keep the one carrying `couchDBUrl` + `fabricIdentity` — verify BEFORE deleting), the orphan credential, and junk test credentials. **Acceptance guard: confirm the surviving root-authority doc has the `:9084` CouchDB URL and a fabricIdentity before deleting anything.**

### SMTP — documentation-only (config retained by decision)
No code change. The central notification-sender setup and its migration path are documented in: the VM manual's pre-demo checklist (`SMTP_OVERRIDE_TO` set-vs-unset table), the installation-manual troubleshooting appendix ("emails not arriving" entry), `.env.example`, and the paper's infrastructure section (platform-sender design is deliberate: sending as issuer domains without DKIM/SPF invites spam flagging; per-issuer sending is documented future work).

---

## DOCUMENT WORKSTREAM

### Repo `.md` — implemented directly ✅
- **D6 — troubleshooting:** the local installation manual (1,233 lines, previously ZERO troubleshooting) gained a full appendix (17 entries, 6 groups, symptom→cause→fix→expected-result format); the VM manual gained the email-delivery gotcha + SMTP checklist entry.
- **D7 — four per-role user manuals:** `CAP-2459-IT-USER-MANUAL-{HOLDER,ISSUER,ADMIN,VERIFIER}.md` (~1,990 lines total), feature-grouped, task-titled sections, numbered steps, per-section prerequisites, per-role troubleshooting. Content verified against the shipped build INCLUDING the post-defense changes above. The two pre-existing manuals are frozen as historical records (banner only) — the UAT edition is preserved unchanged because Chapter 6 reports results gathered with it as the test script.

### Google Docs — before/after instruction packs (chat-delivered, not in this file)
Packs D-1 … D-5 cover: revoked-credential retention rationale; the recommendations-chapter restructure; the reports section (all reports as proper nouns, criteria text matching the shipped neutral wording); the methodology-chapter tense/accuracy pass (including replacing unsupported encryption claims with what actually exists: bcrypt hashing, secure random tokens, TLS-in-transit, application-layer access control); and structural/caption/TOC fixes. Rules: paper text assumes all system items above are implemented (they now are); a claims-dependency list maps each paper claim to the code batch it depends on; the unresolved test-item-count discrepancy is flagged `⚠️ VERIFY` wherever those figures appear rather than silently picked.

---

## PART B — UI/UX CONSISTENCY PROGRAM (U-1 … U-9) — all shipped

Scope guard held throughout: **consistency + discoverability, NOT a redesign.**

| Batch | Content | Status / notable findings |
|---|---|---|
| U-1 [P0] | Keyboard-focus restoration on the account-menu button (the only unscoped focus-suppressor in the app); `aria-label="Close"` on 14 icon-only close buttons; keyboard access (role/tabIndex/Enter+Space) on the 2 unreachable click targets | ✅ |
| U-2 [P0/P1] | **Sticky-right action column** via ONE shared `.has-sticky-actions` rule (7 wide tables) — chosen over kebab menus (hide actions) and leading columns (read as selection). Blocker found and fixed: `overflow:hidden` on two table families silently disables `position:sticky`. Also: the one unpaginated admin log table paginated, and its search-overrides-sort bug fixed | ✅ |
| U-3 [P1] | 8 stale select-arrow SVGs off the banned purple; 8 wrong-purple literals → accent tokens; 26 hand-rolled focus rings → `var(--focus-ring)`; **32 dead token fallbacks stripped** (20 disagreed with their token; one component referenced a token that never existed). **Deliberately NOT done:** the ~90 dark-navy rgba panel backgrounds — they are a *different hue* than the surface tokens and ~12 are alpha-bearing scrims over hero photos; swapping = a visual re-skin, not a refactor. Parked as future work | ✅ (scope adjusted, documented) |
| U-4 [P1] | Shared `useEscapeClose` hook (topmost-first, reuses each modal's own Cancel handler so in-flight guards hold) on **30 hand-rolled modals across 5 pages**; overlay z-indexes consolidated onto `var(--z-modal)` (fixes toasts hiding behind admin modals and the un-dimmed issuer sidebar). The 3 "promote scoped CSS fixes" items verified as no-ops (no other consumers exist) | ✅ |
| U-5 [P1] | 17 ad-hoc empty states → shared `EmptyState` (full-pane only; micro-empties in panels/dropdowns stay text); history-page bare-text loading → `SpinnerBlock`. The "3 competing loading-button patterns" premise dissolved on verification — one pattern already dominates | ✅ |
| U-6 [P1] | "created template" → "created credential" (4 sites) + remaining profile-page "template" copy; verifier page heading aligned to "Verification Dashboard" (route untouched — PDF QR compatibility); **Export PDF added to the profile credential modal** at parity with the wallet, sharing the SAME renewal-count/date helpers (hoisted to `utils/credentialLineage.js`) and the same revoked-export warning | ✅ |
| U-7 [P1] | forgot-password off raw `fetch()` onto `apiService` (4xx message semantics preserved; JWT middleware verified to null invalid tokens); global `button:disabled` baseline (real gap: verifier/preview buttons had NO disabled feedback); dead code deleted: `DataTable`, `CardHeader`, Field's `Select`/`Textarea`, raw `Badge` barrel export, empty `credentialCard.css`, CRA boilerplate in `App.css` | ✅ |
| U-8 [P2] | 186 `font-weight` literals → `--fw-*` (zero visual change); last un-tokenized metric size fixed; 2 off-grid icon sizes snapped. **Deliberately skipped with reasons:** bulk radius tokenization (blind value-matching stamps wrong semantic tokens; semantic re-mapping changes visuals) and a `--shadow-glow` token (only 3 glow sites, all different effects — nothing to unify) | ✅ (right-sized) |
| U-9 [P2] | ~45 `...` → `…`; text-glyph icons (`⠿`, `▾`) → lucide; dead emoji `icon` fields stripped from analytics timeline META; emoji dropped from history filter options/status chips; "Create Credentials" → "Create Credential"; S3-d email-confirmation notices added to the issuance/renewal toasts and the registration confirmation screen. The `verticalAlign` hack audit item was confirmed nonexistent (stale) | ✅ |

### Parked (explicit, future work — would balloon into redesign)
- cc-btn migration (~206 raw buttons), full Modal-component migration, SearchFilterBar unification, tab-nav unification, per-declaration spacing normalization (~828 literals — counts documented), the ~90 dark-navy surface literals (see U-3), duplicate late-cascade CSS override blocks (cascade-order-sensitive).

---

## DO-NOT-TOUCH LIST (held throughout; still binding)
- `chaincode/index.js` — nothing in this cycle needed it; any edit = full redeploy dance.
- `/verifier/dashboard` ROUTE — baked into every exported PDF QR.
- F01 issuance guard — stays commented for UAT; RESTORE before demo (predeploy checklist).
- `src/controllers/` + `src/routes/` locations (deploy-path coupling).
- Ubuntu-layout paths in backend files.
- End-of-day-Manila expiry logic; dual-write order (ledger→CouchDB, no rollback).
- Frozen manuals (banner only); superseded `CHAPTER 5/6/7.md` (read-only history).
- Working perf mitigations (badgeImage strip, deferred verification-log fetches).
- `SMTP_OVERRIDE_TO` and mail-routing code — documented, not changed.

## VERIFICATION DISCIPLINE (as executed)
- `CI=false npm run build` after every batch, plus a lint-warning diff against baseline (lesson on record: a green build is NOT runtime-safe for hook/declaration-order changes — one TDZ crash was caught by `no-use-before-define` during the UI pass and fixed pre-ship).
- Reported bugs verified against code BEFORE fixing; several audit items closed as false positives/no-ops and recorded as such above.
- Backend batches end with a printed `cp` list (owner runs them), PM2 restart, and a health-endpoint check on the VM.
