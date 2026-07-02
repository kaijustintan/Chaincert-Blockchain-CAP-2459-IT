# CAP2 — Deployment Manual Addendum

> **What this is.** A **companion** to the formal CAP1 `CAP-2459-IT-INSTALLATION-MANUAL.md`. The CAP1
> manual is a *submitted artifact* and stays **unchanged** — it documents what was installed during
> CAP1 (Fabric 2.5.0). This addendum captures (A) the groupmates' actual CCSCloud deployment journey,
> (B) every step in the CAP1 manual that **changed for CAP2**, and (C) the corrected from-scratch
> runbook we deploy with now.
>
> **Read order for a fresh deploy:** this file's *Part C*, with the CAP1 manual open beside it for the
> unchanged detail. Where the two disagree, **this file wins for CAP2.**
>
> Captured 2026-06-30 (AFTER-Defense). Sources: groupmates' `CCSCloud_VM_Deployment_Session_Log.md`
> + `..._Resume_Context.md` (throwaway, not in repo), `CAP2 - Deployment Status & Pending.md`,
> the CAP1 Installation Manual, and Hyperledger Fabric release docs.

---

## TL;DR — the CAP1 → CAP2 deltas at a glance

| # | Topic | CAP1 manual says | CAP2 reality (use this) |
|---|---|---|---|
| 1 | **Fabric version** | `bash -s -- 2.5.0 1.5.5` (Fabric **2.5.0**, CA 1.5.5) | **Fabric 2.5.16 + CA 1.5.17** (only version that builds chaincode on Docker 29) |
| 2 | **Install command** | old `bootstrap.sh` via `bit.ly/2ysbOFE` | `install-fabric.sh --fabric-version 2.5.16 --ca-version 1.5.17` |
| 3 | **Docker** | Docker 29.1.3 (as-installed) | **Keep Docker 29** — do NOT downgrade to 28 (that was the abandoned fallback) |
| 4 | **Host Docker hacks** | n/a | **Remove** `daemon.json {"features":{"buildkit":false}}` + `DOCKER_API_VERSION` export — unneeded with 2.5.16 |
| 5 | **Repo** | private `kaijustintan/CAP-2459-IT` | clone **canonical `kaijustintan` `AFTER-Defense`** (NOT the `Xeidonn/ChainCert-Deploy` throwaway fork) |
| 6 | **Folder reorg** | manual `cp` dance | **`deploy-sync.sh`** (Plan 2 clean split: `~/chaincert-src` → `~/chaincert-api` + `~/chaincert-chaincode`) |
| 7 | **localhost URLs / CORS** | hardcoded `localhost` | **env-driven** (`REACT_APP_API_URL`, `REACT_APP_FRONTEND_URL`, `CORS_ORIGIN`, `FRONTEND_URL`) |
| 8 | **VM Linux user** | `/home/kaitanz_/…` | **`/home/chaincert/…`** (VM user is `chaincert`); connection-profile paths sed-patched by `deploy-sync.sh` |
| 9 | **Secrets** | n/a | **`JWT_SECRET` required** (fail-closed); security toggles OFF before demo |
| 10 | **Clean start** | install onto fresh box | **wipe everything incl. `~/fabric-samples`** (Kai's CAP2 decision — max-certainty rebuild) |

> **Defense note (unchanged):** in formal defense materials, state the Fabric version as **2.5.14**.
> The VM runs **2.5.16** purely as a Docker-29 compatibility patch. See *Part D — Version
> reconciliation*.

---

## Part A — The groupmates' deployment journey (what actually happened)

> **Technical:** Myles Ramirez (`Xeidonn`) deployed the CAP1 fork to the CCSCloud VM over June 26–27,
> following a 12-phase guide. Carl Kalinisan did the base VM provisioning. They reached a working
> 2-org Fabric network but hit a hard wall at chaincode deployment under Docker 29; the wall was later
> cleared by moving to Fabric 2.5.16.
>
> **Tropang Ex:** Ito yung kwento kung paano na-deploy ng grupo yung *lumang* version. Importante itong
> alam natin kasi dito nila na-discover yung Docker 29 problem — at para hindi natin ulitin yung mga
> maling fix na sinubukan nila (7 attempts, walang gumana) bago nila nahanap yung tamang sagot.

### What worked (the proven path, Phases 1–7)
- **Base box (Carl):** Ubuntu 22.04.5 LTS, SSH on external port `20172`, Docker **29.1.3** (`docker.io`),
  Node 18.x, npm 10.8.2, Nginx 1.18.0, PM2 7.0.1.
- **Code on VM:** cloned the throwaway `Xeidonn/ChainCert-Deploy` fork (private-repo auth workaround),
  then manually `cp`-reorganized into `chaincert-api/` + `chaincert-chaincode/`.
  - ⚠️ **Hit missing-file errors:** `mailerService.js` and `issuerRequirements.js` weren't in the first
    push → fixed by force-pushing the full branch. **This is the exact fragility `deploy-sync.sh` now
    eliminates** (it copies from a complete canonical clone).
- **Fabric:** bootstrapped **2.5.0 / CA 1.5.5** → `peer version` = `v2.5.0`. Nested layout
  `~/fabric-samples/fabric-samples/`.
- **CouchDB:** `couchdb-admin` container on `:5985` with `--restart=always`, 7 DBs PUT via curl
  (`users`, `issuers`, `user_notifications`, `couchdb_connections`, `profile_share_links`,
  `admin_notifications`, `wallet_user_credentials`).
- **Network:** `./network.sh up createChannel -ca -s couchdb -c chaincert-channel` → channel created,
  both peers joined. (Org2 once crashed with a CouchDB 401 timing race — fixed by restarting the peer.)

### Where it broke (Phase 8 — chaincode deploy)
`./network.sh deployCC …` failed with:
```
could not build chaincode: docker build failed:
write unix @->/run/docker.sock: write: broken pipe
```
They burned the rest of the session on **7 failed fixes**, all of which left artifacts on the host:
1. `chmod 666 /var/run/docker.sock`
2. Add `CORE_VM_ENDPOINT` + docker.sock mount to the base compose file
3. Symlink `/host/var/run/docker.sock` → `/run/docker.sock` inside the peer
4. Re-mount socket to `/run/docker.sock` (this **broke peer0.org2** with a CouchDB 401 timing crash)
5. `docker-buildx` install + `DOCKER_BUILDKIT=0`
6. `DOCKER_API_VERSION=1.41` in the peer env
7. `/etc/docker/daemon.json` = `{"features":{"buildkit":false}}` (a Docker restart here killed every
   Fabric container)

**None worked.** Their session-end diagnosis was *"Docker 29 removed the legacy builder."* Their
Resume Context recommended **downgrading Docker to 28**.

### The real resolution (what we adopt)
- **Refined root cause** (per `CAP2 - Deployment Status & Pending.md`): NOT a removed builder — the
  classic builder still exists in Docker 28/29. The Fabric peer used the abandoned
  **`fsouza/go-dockerclient`** library, incompatible with Docker Engine **v29**'s API. Refs:
  hyperledger/fabric **#5350 / #5441**, fix in **PR #5353 / #5355**.
- **Fix adopted:** **upgrade Fabric 2.5.0 → 2.5.16, KEEP Docker 29.** The 2.5.16 changelog: *"Fixed
  working with Docker Engine v29+."* The groupmates ultimately re-deployed the CAP1 fork successfully
  on 2.5.16 — so this path is **proven on this exact VM**.
- **Downgrade-to-28 is the fallback only**, not the plan (more host-level fuss, less future-proof).

### Artifacts the failed fixes left behind (must be cleared)
These survive a repo re-clone and a reboot; clear them on the fresh start:
- `/etc/docker/daemon.json` containing `{"features":{"buildkit":false}}`
- `DOCKER_API_VERSION=1.41` exported in `~/.bashrc`
- Modified `compose/*.yaml` files under `fabric-samples` (mooted once we delete `~/fabric-samples`)

### CCSCloud port map (confirmed from their docs)
| External (CCSCloud) | → VM port | Purpose |
|---|---|---|
| `20170` | 3000 | React dev server (testing only) |
| `20171` | 4000 | Backend API (testing only) |
| `20172` | 22 | **SSH — connect here** |
| `20173` | 80 | **Nginx — the public website** |

---

## Part B — Step-by-step deltas vs the CAP1 Installation Manual

> Each row points at the exact CAP1-manual step and states the CAP2 change. The CAP1 manual stays the
> reference for everything **not** listed here.

### B1. Fabric install (CAP1 manual §2.1, line ~200)
- **CAP1:** `curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5`
- **CAP2:**
  ```bash
  curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh \
    | bash -s -- --fabric-version 2.5.16 --ca-version 1.5.17 docker samples binary
  ```
  - **Why:** 2.5.0 cannot build chaincode under Docker 29 (Part A). 2.5.16 + CA **1.5.17** is the
    matched pair per Hyperledger release docs. We pin both explicitly so a default change can't surprise us.
  - Verify after: `peer version` must report **2.5.16**.

### B2. Node Creation for DLSU (`Node Creation for DLSU.md` §, line ~74)
- **CAP1:** `curl -sSL https://bit.ly/2ysbOFE | bash -s` (no version pinned → pulls latest, unpredictable)
- **CAP2:** pin to `--fabric-version 2.5.16 --ca-version 1.5.17` (same as B1). *(This non-submission doc
  can be edited directly — pending Kai's OK.)*

### B3. Docker (CAP1 manual Phase 1 prerequisites)
- **CAP2:** **Keep Docker 29.** Do not downgrade to 28. After teardown, **remove** the host hacks
  (`daemon.json` buildkit flag, `DOCKER_API_VERSION` in `~/.bashrc`) — they are unnecessary and can
  interfere once 2.5.16 is in place.

### B4. Repo + folder layout (CAP1 manual Phases 4–4.5)
- **CAP1:** clone, then a long manual `cp` dance (which produced the missing-file errors in Part A).
- **CAP2:** clone the **canonical** repo and run **`deploy-sync.sh`** — Plan 2 clean split:
  - `git clone -b AFTER-Defense …/kaijustintan/CAP-2459-IT.git ~/chaincert-src`
  - `bash ~/chaincert-src/deploy-sync.sh` → builds `~/chaincert-api` + `~/chaincert-chaincode`, applies
    the renames, patches the connection-profile `/home/` paths, and never touches `wallet/` or `.env`.

### B5. Paths / VM user (CAP1 manual — `/home/kaitanz_/…`)
- **CAP2:** VM user is **`chaincert`**, so the home is `/home/chaincert/…`. The only frozen
  `/home/kaitanz_/` paths live in `connection-delasalleuniversity.json`; `deploy-sync.sh` sed-patches
  them to `$HOME` automatically (after the DLSU org exists).

### B6. localhost URLs + CORS (CAP1 manual frontend/back-end config)
- **CAP2:** env-driven now (June 2026 refactor). On the VM:
  - frontend `.env.production`: `REACT_APP_API_URL=/api` (Nginx same-origin proxy),
    `REACT_APP_FRONTEND_URL=http://ccscloud.dlsu.edu.ph:20173`
  - backend `~/chaincert-api/.env`: `CORS_ORIGIN` + `FRONTEND_URL` = `http://ccscloud.dlsu.edu.ph:20173`

### B7. Secrets + security toggles (new in CAP2)
- `JWT_SECRET` is **required** (app refuses to boot without it): `openssl rand -hex 48`.
- `DISABLE_RATE_LIMIT` and `DISABLE_PASSWORD_POLICY` must be **unset** before demo (they print loud
  startup warnings while on). `SMTP_OVERRIDE_TO` only for a fake-email demo.

### B8. Subordinate identity rename — INNOCENCIO → ARCHERSNETWORK (CAP2, 2026-07-02)
The demo subordinate issuer was renamed `delasalleuniversity-subordinate-innocencio` →
**`delasalleuniversity-subordinate-archersnetwork`**. Done at rename-time (pre-fresh-deploy) so the
identity is *born* with the new name — no live migration needed.

- **Canonical convention (chosen):** `delasalleuniversity-subordinate-archersnetwork` everywhere —
  the CA `--id.name`/enroll username, the enroll `-M` MSP folder
  (`.../users/delasalleuniversity-subordinate-archersnetwork@dlsu.example.com/msp`), the wallet label,
  the `couchdb_connections` orgName (`archersnetwork`, lowercase), and the CouchDB container
  (`couchdb_archersnetwork`, port **9085** unchanged).
- **Reconciled a pre-existing wart:** the repo previously had **three** conventions for this one
  identity — Final Design/Design Details used `dlsusubordinateinnocencio` + an MSP folder
  `SubordinateINNOCENCIO@…`, while the Installation Manual used `delasalleuniversity-subordinate-innocencio@…`,
  and the old wallet script read the `Subordinate…` folder. All now unified to the single canonical
  folder above (so enroll-writes == script-reads).
- **Changed:** 2 code/config files (`setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js`,
  `compose-couch-archersnetwork.yaml`) + working docs (CLAUDE.md, Copy Commands, both directory files,
  Final Design, Design Details #2, README, WINDOWS_FINDINGS, SESSION-HANDOFF, this addendum, the
  doc-format skill). `deploy-sync.sh` needed no change (wildcard copies).
- **⚠️ Deliberately NOT changed — the 4 CAP1 submission manuals** (Installation, Technical, Walkthrough,
  Defense Knowledge) still say `innocencio`, preserved as submitted artifacts. **When following the
  Installation Manual's Phase 11 for the fresh deploy, substitute `archersnetwork` for `innocencio`**
  (id.name, secret `archersnetworkpw`, MSP folder, wallet script name, compose file, `couchdb_connections`
  orgName). This addendum is the override of record. **When the submission manuals are eventually
  updated for CAP2, produce a NEW versioned document — do NOT edit the CAP1 manuals in place** (same
  preserve-history principle applied to the Fabric 2.5.16 version delta).

---

## Part C — Corrected from-scratch runbook (CAP2)

> **Technical:** the deployment order, pinned to 2.5.16, starting from a full wipe (including
> `~/fabric-samples`). Detailed sub-commands for the unchanged phases live in the CAP1 manual; this is
> the spine + the corrected/new steps. Run **one phase at a time**, verify, then continue.
>
> **Tropang Ex:** ito yung malinis na sunod-sunod. Gagawin natin isa-isa, may verify check bawat phase
> bago lumipat — para nakikita mo mismo na tama bago tumuloy.

**Phase 0 — Off-VM:** push `AFTER-Defense` (done); have a GitHub PAT for the private repo ready.

**Phase 1 — Full teardown (⚠️ wipes the CAP1 demo entirely):**

> **🔐 First action on the box — rotate the VM SSH password.** As `chaincert`, run `passwd` and set a
> fresh strong password. The old value (`Chaincert2026!`) was committed in a handoff doc — since
> scrubbed to a placeholder, but it **lingers in git history** until rotated, so rotation is the real
> fix. Share the new password out-of-band (chat/DM, a password manager — **never in git or a committed
> doc**) and update the team's store. This is independent of the deploy flow; do it once, first.

```bash
pm2 delete all 2>/dev/null
docker stop $(docker ps -aq) 2>/dev/null; docker rm -f $(docker ps -aq) 2>/dev/null
docker volume rm $(docker volume ls -q) 2>/dev/null      # REQUIRED — reboot does NOT clear volumes
docker network prune -f
rm -rf ~/fabric-samples ~/chaincert-deploy ~/chaincert-src ~/chaincert-api ~/chaincert-chaincode
```
Then **clear the host hacks** (Part A): remove `/etc/docker/daemon.json` (or empty it to `{}`), delete
the `DOCKER_API_VERSION` line from `~/.bashrc`, then `sudo systemctl restart docker`.
- **Verify:** `docker ps -aq` empty · `docker volume ls -q` empty · `docker --version` still 29.x.

**Phase 2 — Fabric 2.5.16 bootstrap** (B1). **Verify:** `peer version` → 2.5.16; PATH includes
`~/fabric-samples/fabric-samples/bin`.

**Phase 3 — Clone canonical + sync** (B4): `git clone -b AFTER-Defense …` then `deploy-sync.sh`
(it will print "skip connection profile" — correct, DLSU org not created yet). **Verify:**
`ls ~/chaincert-api` + `ls ~/chaincert-chaincode` populated.
- **Then trim the VM footprint:** `rm -rf ~/chaincert-src/docs` — the `docs/` tree (manuals, defense
  material, ops notes) has **zero runtime need** on the VM and keeps internal reference off a shared
  box. Nginx only serves `build/`, so docs were never web-exposed, but there's no reason to keep them
  on the deployment host. (Do NOT gitignore/untrack them — they belong in the repo; just don't ship
  them here.)

**Phase 4 — Admin CouchDB `:5985` + databases** (CAP1 manual). **Verify:** the 7 DBs return on
`_all_dbs`.

**Phase 5 — Start network + deploy chaincode:** copy in `configtx-DEFAULT.yaml`, then
`network.sh up createChannel -ca -s couchdb -c chaincert-channel`, then
`deployCC … -ccn chaincert -ccl javascript -ccp ~/chaincert-chaincode -ccv 1.0`. **This is the step
that failed under 2.5.0 — it must now succeed on 2.5.16.** **Verify:** committed chaincode + health.

**Phase 6 — Enroll base identities:** `enrollChaincertAdmin.js`, `enrollAdmin.js`, `enrollOrg2Admin.js`.

**Phase 7 — Add DLSU org** (configtx-WITHDLSU swap dance — CAP1 manual / `Node Creation for DLSU.md`):
channel config update → start DLSU peer → join → install/approve as DLSU.

**Phase 8 — Re-run `deploy-sync.sh`** (now drops + path-patches the connection profile) + run the DLSU
wallet scripts (`setup_Wallet_DLSU*.js`, subordinate ARCHERSNETWORK + LASALLECOMPUTERSOCIETY).

**Phase 9 — Issuer CouchDBs** `:9084` (DLSU) / `:9085` (ARCHERSNETWORK) / `:9086` (LASALLECOMPUTERSOCIETY)
+ each one's `wallet_issuer_credentials` + `issued_credentials` + the `couchdb_connections` rows.

**Phase 10 — Backend `.env`** (B6/B7): `JWT_SECRET`, `CORS_ORIGIN` + `FRONTEND_URL` =
`http://ccscloud.dlsu.edu.ph:20173`, toggles OFF.

**Phase 11 — Start API:** `pm2 start ~/chaincert-api/sdk-server-fixed.js` + `curl :4000/api/health`.

**Phase 12 — Build frontend:** `.env.production` (B6) → `npm install` → `npm run build` in
`~/chaincert-src`.

**Phase 13 — Nginx:** root = `~/chaincert-src/build`, proxy `/api` → `:4000`,
`client_max_body_size 25M`.

**Phase 14 — Demo accounts + seed verifications + UAT** at `http://ccscloud.dlsu.edu.ph:20173`.

---

## Part D — Version reconciliation (the three Fabric numbers)

> **Technical:** three Fabric versions appear across the project. They are not interchangeable.
>
> | Number | Where it appears | Use it for |
> |---|---|---|
> | **2.5.14** | Defense materials, `CLAUDE.md`, doc-format skill | **State this at defense / in formal docs** |
> | **2.5.0** | CAP1 Installation Manual + groupmates' session log (`peer version` proof) | Historical — what CAP1/the first VM attempt actually ran |
> | **2.5.16** | This addendum + `CAP2 - Deployment Status & Pending.md` | **Install this on the VM** (Docker-29 fix) |
>
> **Tropang Ex:** sa defense, **2.5.14** pa rin ang sabihin — yun yung naka-document. Pero sa VM,
> **2.5.16** ang i-install kasi yun lang ang tatakbo sa Docker 29. Yung 2.5.0, yun yung luma — wag na.
>
> **Note:** the deploy-status doc's phrasing "*2.5.14 → 2.5.16 upgrade*" is slightly loose — the VM
> actually ran **2.5.0** before the upgrade (the session log's `peer version` proves it). Immaterial to
> the fix; flagged for accuracy.

---

## Cross-references
- `CAP2 - Deployment Status & Pending.md` — current state + pending list (canonical status tracker).
- `SESSION-HANDOFF - CAP2 Deployment (2026-06-30).md` — the 14-phase runbook this Part C expands.
- `CAP-2459-IT-INSTALLATION-MANUAL.md` (CAP1, unchanged) — detailed sub-commands for unchanged phases.
- `deploy-sync.sh` (repo root) — the source→runtime sync this addendum relies on.
