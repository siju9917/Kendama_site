# NEED_FROM_HUMAN.md — the action queue

> The entire list of concrete actions only the human can take.
> Each item is self-contained: the human can do it without
> thinking, just following the steps.
>
> The factory **does not block on these items.** It logs the
> blocker here, stubs around it, and continues with all other
> work.

Order: highest priority first. The Sunday/Monday check-in
(`human/HOW_TO_USE.md` Section 7.6) walks the human through this
list.

---

## 1. **[DONE on 2026-06-01 — resolved by policy, no action needed]** Spend cap

**Resolved by the human's spend policy (2026-06-01):** "$5 to sign up here or
there is ok, but I don't want operating expenses." This is now encoded in
`governance/SPEND_CAP.md` as **$0 committed external spend + one-time signups
≤ $5 pre-approved**, and in `governance/PRODUCT_CONSTRAINTS.md` as the
zero-marginal-cost product filter. The factory is no longer blocked on a cap —
it operates within the existing Claude Code plan and only ever asks before
incurring a recurring or >$5 external cost. **No human action required.**

---

## 2. **[OPEN]** Create the weekly Claude Code Routine (the Saturday trigger)

**Why:** Without the Routine, the factory only runs when the
human manually opens a Claude Code session. The Routine is what
makes Kendama wake every Saturday on Anthropic's cloud, with no
machine left on, with no human action.

**Time needed:** ~5 minutes, one-time.

**Steps:**

See `ops/SCHEDULE_SETUP.md` in this repository — it is the
self-contained walkthrough. The summary:

1. Confirm the account has a plan that includes Claude Code
   Routines (verify at `claude.ai/code/routines`).
2. Go to `claude.ai/code/routines`, click **New Routine**.
3. Select this repository (`Kendama_site`) as the routine's
   repository.
4. Set the trigger to **Scheduled**, cadence **weekly**, on
   **Saturday** at the chosen hour. **Do NOT select the
   GitHub-event trigger type — that one is prohibited by
   `governance/GUARDRAILS.md` #1.**
5. Paste the prompt body from `ops/SCHEDULE_SETUP.md` (it is
   a single self-contained instruction that says "Read
   `CLAUDE.md` and run the operating loop until the spend cap
   or the session limit is reached").
6. Click **Create**, then **Run now** once to verify the
   factory wakes and reads its brain correctly.

**Effect once done:** Kendama runs every Saturday on Anthropic's
cloud without further action.

**Fallback (only if Routines is not on your plan):** a local OS
scheduled job. `ops/SCHEDULE_SETUP.md` documents both paths and
`ops/run-kendama.sh` is the launch script for the cron path. The
cron path requires the human's machine to be powered on at the
scheduled time, which is the weakness Routines exists to
eliminate; prefer Routines.

---

## 3. **[OPEN]** Review the BidDiff positioning proposal in `APPROVALS.md`

**Why:** The first formal Kendama critique panel pass on BidDiff
surfaced an Ambition Critic finding: the product's positioning
("capture teams") doesn't match its individual-tool feature set.
The factory has posted a proposal to `human/APPROVALS.md`
asking you to choose between **reposition / extend scope /
ship-as-is with documented intent**. Without your call, BidDiff
cannot reach the ship gate.

**Time needed:** ~5-10 minutes.

**Steps:**

1. Open `human/APPROVALS.md`.
2. Read the BidDiff positioning proposal at the top.
3. Edit the proposal's `Status:` line per the format in that
   file — `APPROVED` / `REJECTED` / `REDIRECT` with a reason.

Auto-proceed window: 7 days. Without a response, the factory
defaults to the *reposition* option (the safest of the three —
no multi-week scope commitment based on an agent's self-grade)
and continues toward ship.

---

## 4. **[WITHDRAWN on 2026-06-01 — human declined outreach; reframed for the factory]** Domain validation

**Withdrawn per the human's zero-touch mandate (2026-06-01):** "they should be
designed to ... require me to spend no time talking or selling to anyone." The
human will NOT source domain experts or do outreach. This is now a hard product
constraint (`governance/PRODUCT_CONSTRAINTS.md` Filter 3: validation must come
from sources the FACTORY can reach, not human outreach).

**Reframed factory task (no human action):** the Domain-Expert P1 on BidDiff's
critical-changes ruleset must be validated from **public** sources the factory
can read directly — FAR/DFARS itself, published GovCon/proposal guidance, real
SAM.gov solicitation+amendment samples, agency source-selection guides — not
practitioner interviews. The next build session does this within the spend
policy (free/plan-included web research). If a category genuinely cannot be
validated from public material, it is documented as a known limitation rather
than gating the ship. **No human action required.**

---

## 5. **[DONE on 2026-06-01 — main brought current; standing rule added]** Keep `main` up to date

**Resolved 2026-06-01 on the human's instruction** ("make sure main is up to
date and make a rule to always keep main up to date"). `main` was
fast-forwarded to the full session's work (271 commits, 0 divergence — clean
FF; `main` now == `claude/saturday-task-kickoff-AfDAa` == HEAD at `a7c8ffe`).
A **standing rule** was added (CLAUDE.md "Every session" #6): `main` is the
canonical, always-current branch; completed green work must reach `main` (the
Routine clones `main`); never leave it stranded on a long-lived branch. **No
recurring human action required** — the factory keeps `main` current itself.
The original text of this item is preserved below for the audit trail.

<details><summary>Original item #5 (merge the task branch)</summary>

### (historical) Merge `claude/saturday-task-kickoff-AfDAa` into `main`

**Why:** The 2026-05-30 Saturday session was constrained by its task
instructions to develop on the branch
`claude/saturday-task-kickoff-AfDAa` and is not permitted to merge to
`main` or open a PR without your say-so. The Routine reads `main`
(`ops/SCHEDULE_SETUP.md`), so until this branch is merged, the next
Routine session will start from a clone that does NOT include this
session's work (the `ops/checks/` infrastructure, two diff-engine bug
fixes, a closed K1 P2, and the money-magnitude extraction fix).

**Time needed:** ~2 minutes.

**Steps:**

1. Review the branch `claude/saturday-task-kickoff-AfDAa` (now 12 commits,
   all with green tests/lint/typecheck — incl. the Saturday stop-hook
   interlock, the `ops/checks/` infrastructure + `governance-integrity`
   check, and BidDiff bug-hunt passes through 9; see `brain/STATE.md` and
   `human/WEEKLY_DIGEST.md` for the summary).
2. Merge it into `main` (fast-forward or PR-merge, your preference),
   or tell the factory in a future session that it may do so.

**Effect once done:** the Saturday Routine picks up this work.

</details>

---

## 6. **[OPEN]** (When BidDiff is ship-gate ready) Chrome Web Store submission

**Why:** Per PART 7.1 and `governance/GUARDRAILS.md` #5 and #11,
the human is the one who submits to live marketplaces. BidDiff
is not yet at the ship gate. When it is, the factory updates
this row with the exact submission steps and the artifact path.

**Effect once done:** BidDiff goes from `STATUS: shipped` (the
factory's internal gate) to actually live in the store.

---

## 7. **[OPEN]** Make the privacy disclosure match what v1 actually does (pre-submission)

**Why:** A K1 Compliance finding (2026-05-30, `products/biddiff/
CRITIQUE_LOG.md` bug-hunt pass 7), **broader than first logged**: the
privacy policy's entire "What BidDiff sends to its servers" section
describes **three** server data flows, and the v1 shipped extension
performs **none** of them:
- **License validation** — only the local-only `LocalLicenseClient`
  is used; it never calls the licensing endpoint.
- **Anonymous telemetry** — `TelemetryClient` (which holds the fetch)
  is never instantiated or called; telemetry is not wired.
- **Opt-in server OCR** — `handleOcr` is a stub and the client never
  calls it.
The **only** network call v1 makes is downloading a SAM.gov attachment
you click (fetched from sam.gov directly, https-only). So v1 is
effectively **fully on-device**, yet the privacy policy describes
license/telemetry/OCR uploads that never happen. A privacy policy that
materially overstates server interactions is a real Chrome-Web-Store-
review + misrepresentation risk. Resolve **before** the store
submission (item 6).

**The decision (one of two):**

- **A (recommended for now):** Scope the docs to v1 reality —
  "**BidDiff runs entirely on your device. The only network activity
  is downloading a SAM.gov attachment you click, fetched directly from
  sam.gov.**" No license/telemetry/OCR uploads (none happen in v1).
  This is far more accurate AND a *much stronger* privacy claim. The
  factory can make these copy edits on your say-so across all the copy
  locations; it did not rewrite legal copy unilaterally. *(Note:
  `SPEC.md` already states the accurate framing — "operates entirely
  on-device" / "the v1 default is on-device only" — so option A just
  makes the user-facing docs match the SPEC they currently
  contradict.)*
- **B:** Implement + wire whichever server features actually ship at
  launch (license validation, telemetry, and/or OCR). These depend on
  the cloud deploy + provider accounts (the human-action items in
  `legacy-notes/BLOCKERS.md`); then the docs become accurate as-is for
  the features that ship. (Unshipped ones still get scoped out.)

**Steps:** Reply A or B (here or in `human/APPROVALS.md`). On **A**, the
next session scopes the copy to on-device-only across all the copy
locations: `docs/privacy-policy.md`, `docs/store-listing.md`,
`src/options/index.tsx`, `docs/help/getting-started.md`,
`docs/help/privacy-and-security.md`, `docs/help/faq.md`,
`docs/support-macros.md`, and `docs/security-audit.md` (its OCR/server
boundary sections). (The marketing site and terms-of-service have no
such claim.) On **B**, it's sequenced with the cloud-deploy human
actions per feature.

**Related minor item (verify at launch):** `docs/help/faq.md` describes
Solo/Team/Enterprise tiers with seat counts (1 / 5 / 25+). The licensing
client currently implements trial → solo only; seat-managed Team/
Enterprise tiers are not wired. This ties into the positioning decision
(`APPROVALS.md` #1) and pricing — confirm the tier copy matches what
actually ships.

**Related minor item #2 (verify at launch — found 2026-05-30, pass 53):**
`docs/support-macros.md` describes a **server license-activation flow** that
v1 does not have. The `#activation` macro tells users they must "be online
for the first activation," then BidDiff "operates offline for up to 7 days; a
periodic check happens when you're back online," and the `#billing` macro
points to a "Billing portal" + merchant-of-record subscription. v1 ships the
local-only `LocalLicenseClient` (a 14-day local trial; no key activation, no
server check, no billing portal). Same class as the privacy/OCR copy above:
support copy describing an **unshipped server flow**. On **A** (on-device v1),
scope these macros to the actual v1 behavior (trial-only; no online
activation/billing portal) OR mark them clearly as "applies once paid
licensing ships." On **B**, they become accurate when the server license +
billing actually ship. Either way, support must not hand users instructions
for a flow that doesn't exist at launch.

**Effect once done:** the privacy disclosure AND the support/licensing copy
match reality; unblocks a clean store submission (item 6).

---

## 8. **[OPEN — RECOMMENDED, do it during Routine setup]** Approve the `Stop`-hook interlock in `.claude/settings.json`

**Why:** The repo ships a Claude Code `Stop` hook
(`.claude/settings.json` → `ops/checks/stop-guard.mjs --hook`) that
*automatically* blocks the agent from ending a turn while it is still
Saturday in Mountain Time. **Enabling a hook requires your approval**, so it
does nothing until you approve it (do this when the Routine / first `Run now`
prompts you to trust the project hook settings).

**Status upgraded 2026-06-01 (your "never stop on Saturday, no matter what"
directive):** for the **autonomous Saturday Routine this hook is now the
REQUIRED technical backstop**, not just optional polish. In an autonomous run,
nothing physically stops the model from wrapping up except this hook —
prior Saturday runs ended early precisely because it wasn't active. The
hardened Routine **prompt** (`ops/SCHEDULE_SETUP.md`) + the written rule
(CLAUDE.md 5z/5x/5x.2) are the primary no-approval drivers; the hook is the
backstop that catches the model if it tries to stop anyway. **Please approve it
when you set up the Routine.**

**Still consistent with CLAUDE.md 5x.1:** the *running* agent never pauses
mid-session to ask you for this — you enable it out-of-band during setup, and
the factory never blocks waiting on it.

**Steps (under 1 minute):**

1. Review `.claude/settings.json` (a single `Stop` hook running the
   stop-guard red team).
2. If you want the automated interlock on, approve/allow the hook when
   prompted (or via your Claude Code settings); add a line to
   `human/APPROVALS.md`. If you'd rather not, leave it — the written rule +
   manual red team still enforce.

**Effect once done:** the stop-guard fires automatically on every turn-end,
not only when the operator remembers to run it.

**Note on timezone:** the work window is your **local Saturday (Mountain
Time, America/Denver)**, not UTC. The guard was initially written to check
UTC, which on a Saturday *evening* MT (already Sunday UTC) wrongly reported
"Sunday" and authorized a stop. Fixed this session to evaluate the weekday in
`America/Denver`. If you are ever in a different timezone, set `KENDAMA_TZ`
accordingly (documented in `ops/checks/stop-guard.mjs`).

---

## 9. **[OPEN]** (Optional, ~3 min) Visually verify the redline Word export before it ships

**Why:** The redline DOCX generator (`products/biddiff/src/core/export/redlineDocx.ts`)
is built + structurally tested (valid OOXML, round-trips through the DOCX
reader, critical-first, disclaimer, XML-injection-safe), but a Word document
must render *professionally* in actual Word — which can't be verified in a
headless test. So it is built BEHIND a gate and NOT yet wired to a UI button.

**Steps:** Next session, ask the factory to emit a sample `redline.docx` (from
the bundled sample diff); open it in Word / Google Docs / LibreOffice; confirm
the struck-red deletions, underlined-green insertions, headings, and disclaimer
render cleanly. If yes, reply "redline looks good" and the factory wires the
"Export redline (.docx)" button. If something renders wrong, say what and the
factory fixes the OOXML first.

**Effect once done:** capture teams get a Word redline to attach to reviews — a
high buyer-value export — with no new dependency.

**The exact wiring once you approve** (so it's a ~5-min deterministic change,
not a design task): in `src/sidepanel/Summary.tsx`, add an `onExportRedline`
handler that mirrors the existing `onExportPdf` exactly — import
`exportRedlineDocx` from `../core/export/redlineDocx.js`, call it instead of
`exportPdfReport`, and set the download name to
`${safeFilename(sol)}-redline.docx`. Add a button next to "Export PDF" labeled
"Export redline (.docx)" wired to it. The generator, its tests, and a strict
XML-validity gate already exist; wiring the button is the only remaining step,
and it's bundle-positive only by the small redline module (still within the
budget).

---

## How items move out of this list

The factory **never deletes** entries here. When an item is done,
its status changes from `**[OPEN]**` to `**[DONE on YYYY-MM-DD]**`
and a brief note is appended. This preserves the audit trail of
what the human has done.

## How items are added

The factory adds an entry whenever a guardrail-protected action
is encountered (account, payment, legal, submission) or whenever
the spec calls for a human-only step. The Sunday/Monday check-in
walks the human through new entries.
