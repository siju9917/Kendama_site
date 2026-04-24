# AppraiseOS

A working MVP of the AppraiseOS product described in `DEVELOPMENT_ROADMAP.md`.
It covers the end-to-end workflow an independent residential appraiser runs for a single job:
order-style job intake → schedule inspection → URAR checklist + rooms/GLA + photos →
comparables with live adjustment math → signed URAR-style PDF → invoice → mark paid →
USPAP workfile zip export.

**See `CODE_REVIEW.md`** for the full professional evaluation of the codebase (~100 findings
across security, data integrity, UX, code quality, domain correctness, testing, and ops) and
the prioritized improvement plan that drove the recent wave of fixes.

## What improved since the initial MVP

| Wave | Theme | Highlights |
|------|-------|------------|
| 1 | Critical security | Tenant isolation on child-record deletes, POST-only logout, magic-byte image sniffing (12 MB cap), secure cookies, security headers, expired-session cleanup |
| 2 | Data integrity | Transactional delete-job with photo-directory cleanup, CAS status transitions (no duplicate invoices on concurrent deliver), value-conclusion validation, delete-confirm component |
| 3 | Edit flows | Edit forms for job, comparable, client; `/settings` with profile, license tracking, signature pad; signature image embedded in signed PDFs; license-expiration guard blocks Sign |
| 4 | UX polish | Job search + status/client filters; keyboard-navigable photo lightbox; `app/error.tsx` + `app/not-found.tsx`; SVG favicon; per-page titles; focus-visible rings |
| 5 | Domain credibility | Per-user configurable adjustment rules (`/settings/adjustments`); condition and quality adjustment rows; time adjustment from sale date with compounded monthly appreciation |
| 6 | Polish | `SubmitButton` with `useFormStatus` pending states; responsive mobile nav with hamburger; persistent license-expiring banner in the app shell; accessible focus styles throughout |

---

## What's in this slice (roadmap mapping)

Implemented from the roadmap's Phase 0–3:

- **Phase 0:** Next.js 15 scaffold, auth, DB, Tailwind UI system.
- **Phase 1:** Jobs CRUD, kanban board, clients, calendar, dashboard.
- **Phase 2 (partial):** Checklist UI, rooms with GLA rollup, photo upload with tagging.
  *(Offline-first IndexedDB sync is **not** in this slice — it was out of scope for a one-session build. Uploads are direct to the server.)*
- **Phase 3:** Manual comparables, adjustment grid, Fannie 15%/25% guideline flags,
  URAR-style PDF render, email-free "deliver" action, invoice PDF, workfile zip.

Intentionally deferred (per the roadmap's v1+ scope): MLS integration, AMC portal delivery,
multi-user orgs, native mobile, QuickBooks sync, MLS-backed comp suggestion, ANSI sketch.

---

## Tech stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS
- SQLite via `better-sqlite3` + Drizzle ORM (schema bootstraps on first boot)
- Cookie-session auth with `scrypt` password hashing
- `pdf-lib` for PDF generation
- `archiver` for the workfile zip

---

## How to run it locally

```bash
# Node 20+ and pnpm required
pnpm install

# Start dev server on http://localhost:3000
pnpm dev
```

First boot creates `./data/app.db` (SQLite) and will create `./uploads/<jobId>/` as you
upload photos. Both directories are in `.gitignore`.

If `better-sqlite3` fails with "Could not locate the bindings file," its native binding
didn't build during install. Fix it with:

```bash
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npx prebuild-install
```

---

## How to demo it (walkthrough)

The app is deliberately single-tenant per user; sign up seeds a demo client
(Pacific Northwest AMC) and a demo job at 1428 Maple Street, Portland OR.

### 1. Sign up
1. Open http://localhost:3000
2. Click **Start free**, create an account with any email + 8-char password.
3. You land on the dashboard with one seeded open job due in 7 days.

### 2. Create a second job (optional)
1. Click **New job** → fill in a fake subject address.
2. Pick form type, fee, and a due date a few days out.
3. Submit — you'll be taken to the job detail page with status `NEW`.

### 3. Walk a job through the full workflow
Open the seeded demo job or the one you just created, then from the detail page:

1. **Schedule inspection** — pick a date/time, click *Schedule inspection*. Status flips to `SCHEDULED`.
2. **Inspection** — click the **Inspection** button in the header. You'll see:
   - **Rooms & GLA** — add 4–8 rooms (name, level, L × W). GLA auto-sums; toggle *below grade* to exclude.
   - **URAR checklist** — 8 sections (site, exterior, interior, kitchen, bath, basement, mechanical, garage). Fill in a handful of fields (year built, C/Q codes, lot size). Click *Save checklist*.
   - **Photos** — upload a few images (drag any JPG/PNG). Pick a tag (front, kitchen, etc.). They'll group by tag.
3. Back on job detail, click **Mark inspected** → status goes to `INSPECTED`.
4. Click **Start draft** → status goes to `DRAFTING`.
5. **Comparables** — click the Comparables button. Add 3 comps with address, sale price, GLA, beds/baths, distance. Watch:
   - Live **adjustment grid** with net/gross totals.
   - **Guideline flags** — gross >15% shows amber, >25% red.
   - **Indicated value** box (average of adjusted prices, rounded to $1k).
6. Back on job detail: enter a **Value $** (suggested by the comp grid) and click *Sign report*. Status → `IN_REVIEW`, `signedAt` stamped.
7. Click **Deliver + invoice** → status → `DELIVERED`, an invoice is auto-created and listed in the right rail.
8. Click **Open report PDF** (top right) — opens the signed URAR-style PDF in a new tab.
9. Click the **Invoice PDF** link in the right rail — opens the invoice.
10. Click **Mark paid** → status → `PAID`; invoice stamped PAID.
11. Click **Export workfile** → downloads a zip containing the PDF, a workfile JSON summary, and all photos grouped by tag.

### 4. Check the other views
- **Dashboard** — stat cards, due-this-week, recently delivered.
- **Jobs** — kanban board by status.
- **Clients** — add/remove clients.
- **Calendar** — monthly grid with inspection and due-date pins.
- Activity log on each job detail page — every state change is recorded as an immutable `job_event`, which is the USPAP workfile audit trail.

---

## What I want you to test, and what to give me feedback on

Please test these **golden paths** and note anything that breaks or feels wrong:

### Golden path 1 — New-user onboarding
- Sign up fresh; does the seeded job feel like a useful starting point?
- Does the landing-page → signup → dashboard flow feel clean?

### Golden path 2 — Inspection flow
- On the Inspection page, does entering rooms / L / W produce the right GLA total?
- Does marking a room "below grade" correctly exclude it from GLA?
- Does the checklist *Save* roundtrip the values? (Reload the page — values should persist.)
- Does multi-file photo upload work in one go? Do photos group by tag?

### Golden path 3 — Comparables + report
- Add 3 comparables. Does the adjustment grid produce numbers you'd expect?
  (Default rules: $50/sqft GLA, $5k/bed, $7.5k/full bath, $3k/half, $4k/garage, $1/sqft lot.)
- Do the 15% / 25% flags fire at the right thresholds?
- Is the indicated-value box a reasonable number?
- Does the report PDF include the subject, room schedule, comps with adjustments,
  reconciliation, and a photo addendum?

### Golden path 4 — Workflow + workfile
- Can you walk a job NEW → SCHEDULED → INSPECTED → DRAFTING → signed → DELIVERED → PAID?
- Does the activity log on the job-detail page correctly show each step?
- Does the workfile zip contain the report, JSON summary, and photos?
- If you delete the job via the danger-zone button, does it fully clean up?

### Feedback I specifically want
1. **Scope.** Anything missing you'd consider mandatory for a usable MVP? Anything in here that's noise?
2. **Information density.** The job-detail and comps pages are dense. Too dense, or about right for a pro tool?
3. **Friction points.** Where did you have to click more than you expected, or guess at what a button would do?
4. **PDF fidelity.** The URAR PDF is *representative*, not pixel-perfect Fannie Mae form. Would that block real pilots, or is "defensible draft" enough?
5. **Multi-tenancy / collaboration.** The roadmap defers multi-user orgs to v1. Does that feel right given your customer target?
6. **Data entry speed.** The inspection checklist is ~30 fields. Would appraisers really fill this on a phone in a basement? If not, what would we cut?

---

## Known limitations in this slice (call-outs)

- **No offline / PWA sync.** Uploads go straight to the server. The roadmap calls
  for an IndexedDB + command-queue sync engine; not built yet.
- **Single-user per account.** No org/roles/trainee review yet.
- **No MLS / AMC integrations.** Comps and orders are manual.
- **PDF is not Fannie-pixel-accurate.** It contains all the right data in a clean,
  readable layout, but isn't the actual stamped Fannie Mae Form 1004.
- **No SMS / email delivery.** "Deliver" flips status and creates an invoice, no
  external send happens.
- **No image processing.** EXIF extraction, thumbnails, HEIC→JPEG conversion all
  deferred.
- **No 2FA** — the auth code has scrypt hashing + session cookies but no TOTP yet.
- **Auth uses cookies with the `Secure` flag unset** so local HTTP works; tighten
  before any remote deployment.

---

## Repository layout

```
app/                       Next.js App Router
  (app)/                   Authenticated shell (dashboard, jobs, clients, calendar)
    jobs/[id]/             Job detail, inspection, comps, report, invoice, workfile routes
  api/photos/[id]/         Tenant-scoped photo serving
  login, signup, logout    Auth pages/routes
components/                Nav (more to come)
lib/
  db.ts, schema.ts         Drizzle + SQLite
  auth.ts                  scrypt + session cookies
  jobs.ts                  Data-access helpers
  format.ts                Money/date formatters, status constants
  checklist.ts             URAR 1004 checklist schema
  adjustments.ts           Comp adjustment rules + reconciliation
  pdf/                     pdf-lib report + invoice renderers
data/                      SQLite DB (gitignored)
uploads/                   Photo storage (gitignored)
DEVELOPMENT_ROADMAP.md     The full product+engineering plan this MVP follows
```

---

## Next milestones (from the roadmap)

If you're happy with the direction, the next slice would add:
- Phase 2 completion: offline PWA with IndexedDB + command-queue sync (this unblocks real field use).
- Phase 4: import-order-from-email (regex parsers + LLM fallback), onboarding checklist, E2E Playwright suite.
- Phase 5: form types 1073 / 2055, full UAD validator, homeowner booking link with SMS reminders.
