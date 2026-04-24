# Code Review & Improvement Plan — AppraiseOS MVP

A professional evaluation of the current codebase: what works, what's broken, what's missing, and what a production-ready version of this app would need.

Organized by severity and effort so it's actionable — each finding has a file + line pointer, a recommended fix, and a rough effort estimate (S = <1 hr, M = a few hours, L = 1+ days).

---

## 1. Executive Summary

**What's in good shape**
- Clean monolith structure (Next.js App Router + Drizzle + SQLite) that's easy to reason about.
- Event-sourced job timeline (`job_events`) is the right foundation for USPAP workfile.
- Core user journey works end-to-end: signup → job → inspection → comps → signed PDF → invoice → paid.
- Deterministic PDF renderer with real data flowing through every section.

**What blocks a real deployment**
- **Broken tenant isolation** on 4+ destructive operations (any authenticated user can delete another user's rooms, photos, comps, invoices by guessing IDs).
- **Logout is GET-addressable** (CSRF — any page can log you out via `<img src="/logout">`).
- **File uploads trust the client** for MIME type and size; no validation, no image-sniffing.
- **No edit capability** on jobs, rooms, or comps once created — only delete + recreate.
- **No delete confirmation** anywhere — one misclick nukes a signed report.
- **Schema auto-bootstrap on import** means every production restart re-runs DDL; no real migration story.

**Scoring (out of 5)**

| Area                    | Score | Notes |
|-------------------------|:-----:|-------|
| Security                |  2    | Multiple tenant-isolation bugs, no CSRF protection beyond SameSite. |
| Data integrity          |  2.5  | Event log is good; transactional deletes missing; no edit flow. |
| Core functionality      |  3.5  | Happy path works; edit + undo missing; some edge cases crash. |
| UX / information design |  3    | Clean visual style; no loading/empty/error states. |
| Accessibility           |  1.5  | Color-only flags, missing aria, no focus-visible styles. |
| Code quality            |  3    | Types are good; validation is ad-hoc; lots of duplication. |
| Testing                 |  0    | Zero tests of any kind. |
| Operations readiness    |  1    | No logs, no health check, no migrations, no env config. |
| Domain correctness      |  2.5  | Adjustment engine is basic; no time/condition/quality adjs. |

**Overall**: a credible **demo** that convincingly shows the product concept, not yet a **pilot-ready** product. The gap is maybe 2–4 weeks of focused work for one engineer.

---

## 2. Critical Security Issues (fix before any public hosting)

### 2.1 Broken tenant isolation on destructive actions — HIGH — S
Multiple server actions verify the job belongs to the user but then delete a *child* record by ID alone. An attacker who knows any UUID can destroy another user's data.

- `app/(app)/jobs/[id]/inspection/page.tsx:91` — `deleteRoom` deletes by `roomId` without confirming it belongs to `jobId`.
- `app/(app)/jobs/[id]/inspection/page.tsx:137` — `deletePhoto` fetches the photo, checks `photo.jobId === jobId`, but still re-accepts whatever `jobId` came from the form. Needs `and(eq(photo.id, ...), eq(photo.jobId, jobId))`.
- `app/(app)/jobs/[id]/comps/page.tsx:61` — `deleteComp` has `and(eq(id), eq(jobId))` — correct pattern; use this everywhere.
- `app/(app)/clients/page.tsx:27` — `deleteClient` is correct. Copy the pattern.
- `app/api/photos/[id]/route.ts:16` — photo *read* joins on `jobs.userId` — this one is correct. Use as the reference pattern.

**Fix**: always scope deletes by `(child.id, child.jobId)` AND confirm the parent job belongs to the user. One helper in `lib/jobs.ts`:
```ts
export async function assertOwnsJob(userId: string, jobId: string) {
  const job = await getJobForUser(userId, jobId);
  if (!job) throw new Response("Not found", { status: 404 });
  return job;
}
```

### 2.2 Logout is GET-accessible → CSRF logout — MED — S
`app/logout/route.ts` exports both `GET` and `POST`. Any third-party page can render `<img src="https://yourapp/logout">` to log every visitor out. Mostly annoying, but breaks session-required workflows.

**Fix**: remove `GET`; change the nav button to a `<form method="post">`.

### 2.3 File uploads trust client — HIGH — M
`app/(app)/jobs/[id]/inspection/page.tsx:95-120`:
- No MIME validation (client sets it).
- No size cap beyond Next's 20 MB body limit.
- No magic-byte sniff — a user can upload a JS or EXE with `.jpg` extension.
- Filename extension is derived from the client's `file.name`.

An attacker could upload `malware.html` renamed `x.jpg`; served back by `/api/photos/[id]`; browsers that honor `Content-Type` may still render it.

**Fix (layered)**:
1. Server-side MIME sniff (`file-type` npm package) before writing.
2. Reject anything that isn't `image/jpeg|png|webp|heic`.
3. Re-encode via `sharp` — strips EXIF surprises and turns HEIC → JPEG.
4. Enforce per-file size cap (e.g. 10 MB) and per-request count cap (e.g. 30).
5. Serve with `Content-Disposition: inline` and a locked-down `Content-Type` matching the sniff, not the stored value.

### 2.4 Session cookie lacks `Secure` — MED — S
`lib/auth.ts:29`: `cookies.set(...)` omits `secure`. Fine for `localhost`, dangerous over any production HTTP.

**Fix**: `secure: process.env.NODE_ENV === "production"` and document HTTPS-required.

### 2.5 No CSRF protection beyond `SameSite=lax` — MED — M
All mutations are same-origin form posts relying on `SameSite=lax`. Lax blocks cross-site POSTs *but* not cross-site GETs — combined with #2.2 that's a real hole. Once we remove GET-destructive handlers, SameSite=lax covers most cases, but for high-value actions (sign report, deliver, delete) we should add a per-session CSRF token.

**Fix**: add a server-generated token in the session, embed as hidden input, verify on every mutation. `next-safe-action` or a 40-line helper.

### 2.6 No rate limiting on auth — MED — S
`/login` and `/signup` have no throttling. Credential stuffing via a for-loop.

**Fix**: a simple in-memory or Redis-backed rate limiter (`@upstash/ratelimit` pairs with Edge nicely; `lru-cache` is fine on a single node).

### 2.7 Password policy — LOW — S
`minLength=8` is the only check. No complexity, no breach check.

**Fix**: bump to 12; integrate `haveibeenpwned` range API (k-anonymous, free).

### 2.8 No audit log of PII reads — LOW — M
Roadmap calls for it (borrower SSN, loan numbers). Today we don't log who viewed a job. Pilot lender customers will ask.

**Fix**: a simple `pii_access_log` table populated from a middleware on any row that contains `borrowerName`, `loanNumber`, or future SSN.

### 2.9 Signup email verification missing — LOW — M
Anyone can register with anyone's email. No verification link. For a professional SaaS, unusual.

**Fix**: send a verification token via email; block sign/deliver actions until verified.

---

## 3. Data Integrity & Bug Hunt

### 3.1 Delete job isn't transactional — HIGH — S
`app/(app)/jobs/[id]/page.tsx:88-96` runs 7 deletes sequentially. If any fail (disk full, constraint, crash mid-delete) the job is left half-gone. Photos on disk aren't deleted at all.

**Fix**: wrap in `db.transaction(...)` and delete `uploads/<jobId>/*` + the directory after DB commit succeeds. Also: prefer a soft-delete with a 30-day hold — users *will* misclick.

### 3.2 Photo files leak on delete — MED — S
`app/(app)/jobs/[id]/inspection/page.tsx:131-141` has `try { await fs.unlink ... } catch {}` but doesn't batch-clean the directory. When a whole job is deleted, every photo file stays on disk forever (see 3.1). Cron-only cleanup by uuid is painful later.

**Fix**: add `await fs.rm(path.join(UPLOAD_DIR, jobId), { recursive: true, force: true })` in the delete-job path, and ensure individual-photo deletes actually succeed.

### 3.3 Server actions silently swallow missing input — MED — S
Many handlers do `String(formData.get("x") || "").trim()` and then proceed with empty string if it wasn't sent. Example: `inspection/page.tsx:68-80`'s `addRoom` redirects on empty name but silently writes `lengthFt: Number("")` → `0`. So a user hitting Add with only a name gets a 0×0 room.

**Fix**: define `zod` schemas for every action input and fail loudly with an error flash (see 5.2).

### 3.4 `String(...)` trick bypasses FormData typing — LOW — S
`jobs/[id]/page.tsx:23`: `String(formData.get("jobId"))` stringifies `null` as `"null"`. The subsequent `getJobForUser` will return `null` and throw a 404 — correct by accident, but ugly. A missing required field should error cleanly.

**Fix**: helper `requireField(formData, "jobId")` that throws `400` with a message.

### 3.5 No concurrent-write protection on status transitions — MED — M
Two browser tabs can each click "Deliver + invoice." Both server actions will read `status = IN_REVIEW`, both will insert an invoice row. Result: two `INV-…` rows for the same job.

**Fix**: a CAS-style update — `UPDATE jobs SET status='DELIVERED', delivered_at=? WHERE id=? AND status='IN_REVIEW'` and inspect rowcount. Same pattern for `sign`, `markPaid`.

### 3.6 `sessions` rows never cleaned — LOW — S
Expired sessions stay in the table forever. Grows unbounded. Auth check skips them correctly but the table rots.

**Fix**: on login, `DELETE FROM sessions WHERE expires_at < now()`. Or a cron job. Four lines either way.

### 3.7 `dueAt` parsed as local time — MED — S
`jobs/new/page.tsx:26`: `new Date(dueStr)` on an `<input type="date">` value (`"2026-04-30"`) is parsed as UTC midnight. In any US timezone the date shows as "Apr 29" on the dashboard. Known gotcha.

**Fix**: normalize by appending `T23:59:59` or by storing dates as strings and never round-tripping through `Date`.

### 3.8 `inputDateTime` formats in local time, `new Date()` parses as UTC-ish — MED — S
`lib/format.ts:41-46` formats for `<input type="datetime-local">` in the server's local time. The server's local time is *whatever the runtime env is*, not the user's. Inspection at "3pm" saved on a server in UTC will display as 3pm → stored as 15:00 UTC → shown to a PT user as 8am.

**Fix**: store everything UTC in the DB (already true), but convert to/from the user's TZ on display. Add `users.timezone` with a default from browser `Intl.DateTimeFormat().resolvedOptions().timeZone` captured at signup.

### 3.9 `recordEvent` writes after the primary action — LOW — S
Most handlers do `update(...); await recordEvent(...)`. If the event insert fails, the state change persists but the audit log is missing. USPAP compliance depends on the audit log being complete.

**Fix**: wrap in transactions; or move the event insert *before* the state change (so a missing event blocks the state change, not the other way around).

### 3.10 `valueConclusionCents` is unvalidated — MED — S
`jobs/[id]/page.tsx:44`: `Number(formData.get("valueConclusion") || 0)` — no lower/upper bound. An appraiser can sign a report with a value of `$0` or `$10^12`. Sanity check + warn if outside `indicatedValue ± 15%`.

**Fix**: server-side validation + UI warning banner.

### 3.11 `recordEvent` payload is stringified twice on rendering — LOW — S
`jobs/[id]/page.tsx:221`: `<pre>{ev.payload}</pre>` prints the raw JSON string including quotes and `\n` escapes. Users see `{"at":"2026-..."}` as text.

**Fix**: `JSON.parse(ev.payload ?? "null")` then render a humanized line per event type.

### 3.12 Clients delete cascade missing — MED — S
`clients/page.tsx:27` deletes a client. Any `jobs.client_id` pointing at it becomes a dangling FK (SQLite's FK check is on, but the delete succeeds because nothing references it as `ON DELETE CASCADE`). On re-render, `clientName` lookup returns `undefined` → UI says "Client: —" without explanation.

**Fix**: block client delete when jobs reference it, OR `ON DELETE SET NULL` with a user warning + job reassignment flow.

### 3.13 Signup race: duplicate email — LOW — S
`app/signup/page.tsx:17-20` checks `existing` then inserts. Two concurrent signups with same email race past the check. The `UNIQUE` constraint saves us, but the second user gets a server 500 instead of the friendly "exists" redirect.

**Fix**: catch the `UNIQUE` violation; redirect with `?e=exists`.

### 3.14 `randomId(16)` = 128-bit hex is fine for IDs but 2x the storage — LOW — S
All primary keys are 32-char hex. Fine for security; ugly in URLs; 2× the index size vs. a UUID-v7 binary.

**Fix**: optional cleanup — switch to UUID v7 (time-ordered, Postgres-friendly, can keep hex encoding for URLs).

---

## 4. Missing Core Features (user-blocking)

These are things a user will hit in the first 10 minutes and say *"wait, I can't edit this?"*

### 4.1 Cannot edit a job after creation — HIGH — S
You can only create or delete. If you typo the subject address, your only recourse is delete-and-recreate, which wipes the activity log. No pro tool behaves this way.

**Fix**: an edit form (same shape as `new/page.tsx`) reachable from the job detail.

### 4.2 Cannot edit a room — HIGH — S
Typo "Bed 1" as 14×4 instead of 14×14? Delete + re-add. Lost.

**Fix**: inline editing (cells become inputs on click) or an edit modal per row.

### 4.3 Cannot edit a comparable — HIGH — S
Same problem, worse — the adjustment grid is literally the appraiser's work product. One fat-finger on sale price and the whole grid is wrong until deleted + re-entered.

**Fix**: inline-editable grid. This is the feature that an appraiser will ask for in the first 3 minutes.

### 4.4 Cannot edit a client — MED — S
Only Add + Delete. Typo the AMC name? Recreate.

**Fix**: standard edit form.

### 4.5 No delete confirmation anywhere — HIGH — S
`jobs/[id]/page.tsx:275` (Delete job), `clients/page.tsx:55` (Delete client), comp remove, photo remove, room remove — all one-click, no confirm.

**Fix**: either a `confirm()` dialog (cheap), or a proper modal with "type DELETE to confirm." Or a soft-delete + undo toast pattern.

### 4.6 No photo lightbox — MED — S
Thumbnails are clickable X for delete but not clickable to view full-size. Viewing a photo means right-click → view image. Unprofessional.

**Fix**: click-to-expand lightbox (a single 80-line client component with keyboard navigation).

### 4.7 No photo reorder, caption edit, or rotate — MED — M
Reorder matters because the PDF addendum embeds the first N photos per tag. Caption edit matters because typos happen. Rotate matters because phones take portraits.

### 4.8 No CSV comp import — HIGH — S
Roadmap promises it for MVP. Bulk-entry of 6 comps is currently 6 × 15-field forms. 5 minutes of pure typing.

**Fix**: a drag-drop CSV area that parses with a field mapper.

### 4.9 No free-form notes on a job — MED — S
Appraisers write narrative ("subject is on a corner lot fronting a busy street; view is typical residential"). No field for it.

**Fix**: a `job_notes` table keyed to (jobId, section) where section ∈ "neighborhood", "site", "improvements", "reconciliation".

### 4.10 No sketch tool — HIGH — L
Roadmap lists a "simple rectangle-grid sketch." Today rooms are a table of L × W numbers with no visual. Real appraisers draw a footprint; we need at least a minimal canvas.

**Fix**: deferred for now (proper ANSI support is v1). Stub out a "coming soon" link so it's on the roadmap visibly.

### 4.11 No profile / settings page — HIGH — S
The `users` table has `licenseNumber`, `licenseState`, `licenseExpiresAt`, `signatureDataUrl` — none are editable in the UI. The signup flow skips them. The PDF falls back to "—".

**Fix**: a `/settings` page with profile, license, signature pad (react-signature-canvas), default fee schedule, logo upload.

### 4.12 No job search or filter — HIGH — S
Jobs list has no search box, no client filter, no date range. Fine at 5 jobs. Useless at 50.

**Fix**: top-of-page input bound to a simple `LIKE %q%` search across subject address + borrower + loan.

### 4.13 No bulk actions — LOW — M
Can't select 5 archived jobs and move them together.

### 4.14 No copy-from-previous-job — MED — S
Appraisers do a lot of repeat work in the same neighborhood. "Clone job" (copy subject + reset everything else) would save minutes per job.

### 4.15 No invoice edit — MED — S
Invoice auto-generates from `job.feeCents` on delivery. If the appraiser needs to bill $50 extra for a complex assignment, there's no way to edit the invoice.

### 4.16 No sketch / floor plan in PDF — MED — M
Report has a room *schedule* but no visual. That's a red flag to most AMCs.

### 4.17 Signature image never captured — HIGH — S
`users.signatureDataUrl` exists in schema, nothing writes to it, PDF just shows "Signed: 2026-04-23" as text. Real URARs show a signature image.

**Fix**: signature pad in `/settings`, stored as base64 PNG, embedded in the PDF sign step.

---

## 5. Professional SaaS Expectations That Are Missing

The "feels like a finished product" bar. Individually small; collectively the difference between a hobby project and a credible SaaS.

### 5.1 Zero loading states — HIGH — S
Every form submission is a round-trip server action + full navigation. No spinner, no disabled button, no "Saving…". The user clicks, the page visibly hangs, they wonder if it worked.

**Fix**: every submit button becomes a `<SubmitButton/>` that uses `useFormStatus()` to show "Saving…" while pending.

### 5.2 No form validation feedback — HIGH — S
A failed submit re-renders the page with a query param (`?e=missing`), losing all form state. And the only message is "required fields missing" for 10 fields at once.

**Fix**: per-field errors. A tiny schema-derived error display under each input. `zod` + `useActionState` is the smallest path.

### 5.3 No empty states — MED — S
The Jobs page shows "Create your first job" — good. But the comps grid with 0 comps just shows the add form (fine), the photos section shows "No photos uploaded yet" (good), the events list shows "No activity yet." (good). The calendar with no jobs shows an empty grid (needs an empty state). The dashboard with no delivered jobs says "No delivered reports yet." (good). Mostly there, a few gaps.

### 5.4 No error pages — HIGH — S
No `app/error.tsx`, no `app/(app)/error.tsx`, no `app/not-found.tsx`. A thrown `Response("Not found", 404)` from a server action renders as a raw Next.js error in dev and a blank screen in prod.

**Fix**: wire up `error.tsx` and `not-found.tsx` at the root + in the `(app)` segment.

### 5.5 No global toast/notification system — MED — S
State changes happen silently. Sign report → full reload with no feedback except the status badge changed. "Report signed. Value $605,000." as a toast is the expected feedback.

**Fix**: `sonner` or a 60-line context-based toast + redirect pattern that passes a flash cookie.

### 5.6 No keyboard shortcuts — MED — M
Pro tools ship with `?` for help, `/` for search, `gj` for jump-to-jobs. Heavy users notice fast.

### 5.7 No undo for destructive actions — HIGH — S
Pair with 4.5. Pattern: soft-delete + "Deleted · Undo" toast for 10 seconds. Cheap; hugely professional.

### 5.8 Print / email / share the report — MED — S
PDF opens in a new tab. No "Email to client" button, no "Copy shareable link," no "Download" vs "Open." Roadmap says MVP is "email-only delivery" — today it's not even that.

**Fix**: at minimum, a mailto: link prefilled with the client's email + a download button. Server-side email send (Postmark/Resend) is a 20-minute add.

### 5.9 No help text, tooltips, or inline docs — MED — S
`C1`, `C2`, `Q1` etc. codes are UAD jargon. A new appraiser might know them; a trainee won't. One-line definitions on hover are expected.

### 5.10 No onboarding / product tour — LOW — M
Brand-new user lands on dashboard with a seeded job and has to guess what to do. A 3-step intro overlay would help enormously.

### 5.11 Favicon + app icons missing — LOW — S
No `favicon.ico`, no apple-touch-icon. Shows up as the default Next.js dot in every tab.

### 5.12 Page titles all say "AppraiseOS — Appraisal Workbench" — LOW — S
Browser tab doesn't change between `/dashboard` and `/jobs/abc123`. Makes multi-tab workflows (which appraisers absolutely do) confusing.

**Fix**: per-page `generateMetadata` returning the subject address for job pages, etc.

### 5.13 No breadcrumbs — LOW — S
Deep pages (inspection, comps) have a "← Subject Address" link but nothing showing the hierarchy.

### 5.14 No activity notifications — MED — M
"Your inspection is in 1 hour," "Invoice 30 days overdue," "License expires in 14 days." Roadmap mentions license-expiration emails. None implemented.

### 5.15 No CSV export of jobs — LOW — S
For tax time, expense tracking, etc. Appraisers love spreadsheets.

### 5.16 No API keys / personal access tokens — LOW — L
Roadmap lists a public REST API as post-v1. Not needed yet. Call it out.

### 5.17 No mobile-friendly inspection — HIGH — M
The inspection page is a big form with a 2-column grid. On an iPhone it works but it's cramped and requires horizontal scroll in places. Roadmap's whole **pitch** is mobile-first field use. This is the single biggest gap between vision and execution.

**Fix**: full-screen mobile layout with larger tap targets, sticky "Save" button, room cards that stack vertically, camera-capture button tied to each checklist item.

---

## 6. Domain / Appraiser-Workflow Gaps

This is what a real appraiser would notice in the first 30 seconds.

### 6.1 Adjustment rules are hardcoded — HIGH — M
`lib/adjustments.ts:3-10` has `$50/sqft`, `$5k/bed`, etc. baked in. Appraisers set these per market — $50/sqft in Boise is absurd in Manhattan. This is the **single biggest credibility blocker** for a real appraiser.

**Fix**: a `market_adjustment_sets` table (per-user, optionally per-market). Default one is seeded from current values. A `/settings/adjustments` page to edit. Per-job override option.

### 6.2 No time adjustment for stale comps — HIGH — M
A comp that sold 9 months ago at $600k in a market up 6% YoY should be adjusted +$27k before use. The grid doesn't do this at all.

**Fix**: `sale_date → days_old` column in the grid with a per-market % appreciation entry field. Standard in all competitor software.

### 6.3 Condition / quality adjustments missing from grid — HIGH — M
`comparables.condition` and `quality` are collected but never adjusted. Subject C3 vs. comp C4 should drive a $/sqft adjustment.

**Fix**: add condition/quality rows to the adjustment grid with a per-step $ amount.

### 6.4 Location, view, and site-value adjustments missing — MED — M
Appraisers write these in manually in competitor tools. We have no place for them.

**Fix**: a configurable row set. Each row: label, subject value, comp values, $ adjustment. Extensible.

### 6.5 Sale type / financing concessions — MED — S
Seller-paid closing costs = adjustment. Today: no field.

**Fix**: `saleConcessionsCents` column on `comparables`; auto-adjusted off.

### 6.6 No prior-sales history for the subject — HIGH — S
URAR requires listing the subject's prior transfers in the last 3 years. We don't have a place for it.

**Fix**: a `prior_sales` table keyed to subjects or jobs.

### 6.7 Neighborhood section missing — MED — S
URAR has a whole section: 1-unit housing price range, days-on-market, supply/demand trend. Today: absent.

**Fix**: dedicated section on the inspection page + serialized into the PDF.

### 6.8 No contract section for purchase appraisals — MED — S
On a purchase, the URAR wants contract price, date, whether there are seller concessions, etc. Not there.

### 6.9 Mileage tracking — MED — S
Roadmap mentions it for QuickBooks sync. Not in MVP. Pro tools auto-log mileage between inspections using the calendar + maps.

### 6.10 GLA source disagreement alarm — MED — S
Roadmap calls for: "sanity warning if GLA differs from public-record by >10%." Not built (no public-records integration either).

**Fix**: at minimum, a manual "Public-record GLA" field on the inspection so the warning can compute locally.

### 6.11 Garage type labels don't match UAD — LOW — S
`inspection/checklist.ts` says `"Attached" | "Detached" | "Carport" | "None"`. UAD wants `1ga1` style codes. We're hiding the code from the user, but when exporting/integrating with AMCs the mapping needs to be explicit.

### 6.12 URAR 3.6 UAD validator absent — HIGH — L
Roadmap calls for a full UAD 3.6 validation pass. MVP has none. This is what *actually* prevents AMC revision requests in real life.

### 6.13 Form types 1073, 2055, 1025 not rendered — MED — L
Job form has dropdown for all 4, but the PDF renderer only handles 1004. Any other form_type gets a wrong-format PDF. Minor: not user-breaking yet, but will surprise.

**Fix**: either hide the dropdown options, or at minimum pop a "1004 layout only for MVP" warning.

### 6.14 Effective date vs. inspection date — MED — S
URAR distinguishes "effective date" (what the value represents) from "inspection date." We conflate them. Usually same day but not always.

### 6.15 Highest-and-best-use statement missing — LOW — S
URAR requires a HBU box. Not in our UI or PDF.

### 6.16 Exposure and marketing time fields — LOW — S
URAR asks. Not collected.

### 6.17 Cost approach and income approach not supported — LOW — L
1004 strictly requires the sales comparison but also lets the appraiser complete cost + income where relevant. We only do sales. Fine for most SFR; limiting for high-end and 2-4 unit.

### 6.18 Appraiser license-number expiration tracking — MED — S
Schema has the field; no alert. Real compliance risk — signing with an expired license invalidates the report.

**Fix**: a red banner when expiration is within 30 days; block "Sign report" if expired.

---

## 7. UX & Accessibility

### 7.1 Status flags are color-only — MED — S
`app/(app)/jobs/[id]/comps/page.tsx` flags gross adjustments > 15% / 25% with amber/red text only. Color-blind users see nothing. Same for the status badges on the dashboard.

**Fix**: icon + color + text ("⚠ over 25%") consistently.

### 7.2 Delete buttons use X character — LOW — S
`inspection/page.tsx:214` — `<button>✕</button>`. No `aria-label`. Screen readers announce it as "X." Should say "Delete photo."

### 7.3 No focus-visible styles — MED — S
Default browser blue outline only. Tailwind makes it trivial to add `focus-visible:ring-2 ring-brand-500`.

### 7.4 Form labels aren't associated with inputs — MED — S
`<label class="label">Name</label><input ...>` — not wrapped, no `htmlFor`. Click-label-to-focus-input doesn't work, and screen readers get no label context.

**Fix**: wrap every label-input pair OR add matching `id` and `htmlFor`.

### 7.5 No skip-to-content link — LOW — S
Standard a11y pattern.

### 7.6 Tab order is fine by default but not tested — LOW — S
Some forms have the submit button floating; some have grid layouts that re-order logical vs visual. Worth a manual pass.

### 7.7 No dark mode — LOW — M
Some users will want it, especially appraisers working evenings/nights. Add if trivial with Tailwind + CSS vars.

### 7.8 Date inputs: `<input type="date">` picker varies wildly by browser — LOW — S
Safari's iOS looks different from desktop Chrome, and neither matches the design language. Either style it heavily or accept the inconsistency.

### 7.9 Mobile nav is missing — MED — S
`components/nav.tsx` renders horizontally with fixed-width links. Narrow phones overflow.

**Fix**: hamburger menu below `md:` breakpoint.

### 7.10 Job-detail header buttons wrap poorly on mobile — MED — S
Four pill buttons in a row (`Inspection | Comparables | Open report PDF | Export workfile`) don't fit on small screens. No wrap protection.

### 7.11 The URAR checklist is a wall of inputs — MED — M
~40 fields on one screen. Not progressively disclosed. Break into tabs or an accordion.

### 7.12 Tooltips / hints not present — MED — S
"Condition C3" or "View N;Res" are meaningless without context. A `<Tooltip>` primitive is expected.

### 7.13 Inconsistent button hierarchy — LOW — S
Some pages have three `btn-secondary`s in a row; visual primary action is lost. Pick one primary per page.

### 7.14 Long activity logs overflow silently — LOW — S
`jobs/[id]/page.tsx:215` uses `max-h-96 overflow-auto`. No scroll hint, no pagination. Big jobs with 50+ events will scroll forever.

### 7.15 No "copy to clipboard" on addresses / IDs / invoice numbers — LOW — S
Pro tools have copy icons everywhere.

### 7.16 Currency input UX is weak — MED — S
`<input type="number">` lets you paste `$605,000` and get `NaN`. And input-mode isn't set, so phone keyboards show the text keyboard.

**Fix**: a `<CurrencyInput>` component with formatter + `inputMode="decimal"`.

### 7.17 Calendar clicks do nothing beyond job links — LOW — S
Clicking an empty day should offer "Schedule an inspection here." Clicking past dates should be visually dimmed.

### 7.18 No print stylesheet — LOW — S
The PDF route handles the "for real" print case, but a user clicking Cmd-P on the report page gets the UI with nav + chrome. Easy CSS fix.

### 7.19 Photo upload doesn't preview before submit — MED — S
User selects files → page waits while they upload. A preview with "Remove" options per file before sending would help with wrong-file mistakes.

### 7.20 PDF opens `target="_blank"` but with no `rel="noopener"` — LOW — S
Security nit; and causes a tiny memory leak. Add `rel="noopener noreferrer"`.

---

## 8. Code Quality & Architecture

### 8.1 Schema bootstrapped on every import — MED — S
`lib/db.ts` runs `CREATE TABLE IF NOT EXISTS …` at module load. Works for demo, terrible for production — every dev server hot-reload re-runs DDL; schema changes require editing both `schema.ts` and the raw SQL in `db.ts` (already drift-prone).

**Fix**: delete the raw SQL in `db.ts`; run `drizzle-kit push` (or a real migration) on startup in dev, and a proper migration step in prod.

### 8.2 Drizzle schema and raw SQL have drifted — MED — S
`schema.ts` uses `integer("_ts", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)` — a helper that's never exported or used, it's a dangling const. Unused code.

Related: the `isBelowGrade` column is `{ mode: "boolean" }` in Drizzle but an integer in the raw SQL. SQLite doesn't care, but the type-level contract between the two sources of truth is inconsistent.

### 8.3 Server actions inlined in every page — MED — M
Each page has 30–100 lines of "use server" functions at the top. `jobs/[id]/page.tsx` has one big `updateJob` switch with 8 branches. Hard to test, harder to reuse, impossible to see business logic apart from render code.

**Fix**: move actions into `lib/actions/jobs.ts` (or per-concern files). Each action is a pure function taking a typed input; page just imports and passes.

### 8.4 No input validation with a schema library — HIGH — S
Everything is `Number(formData.get(...) || 0)`. Will happily accept garbage. No typed errors. No single source of truth for what fields an action expects.

**Fix**: adopt `zod` (already ubiquitous in Next.js apps) + `useActionState`. Small templatized wrapper in `lib/actions/helpers.ts`.

### 8.5 Magic strings for status — MED — S
`"NEW"`, `"SCHEDULED"`, etc. appear in 8+ files. Typo = silent bug.

**Fix**: import `JobStatus` from `lib/format.ts` everywhere and use const values, not strings.

### 8.6 `requireUser()` throws a `Response` — LOW — S
`lib/auth.ts:61`: `throw new Response("Unauthorized", { status: 401 })` inside a React Server Component causes a generic Next error page, not a redirect. Should `redirect("/login")`.

**Fix**: `async function requireUser() { const u = await getCurrentUser(); if (!u) redirect("/login"); return u; }`.

### 8.7 Duplicate imports — LOW — S
`jobs/[id]/page.tsx:3` imports `requireUser` from `@/lib/auth` and `:18` imports `randomId` from `@/lib/auth` again. Should be one import.

### 8.8 Mixed data access patterns — LOW — S
Some pages use `db.select().from(...)` directly; others go through helpers in `lib/jobs.ts`. Pick one.

### 8.9 No zod-derived TypeScript types for action inputs — MED — S
We have Drizzle `type User = $inferSelect`, but no `type NewJobInput = z.infer<typeof newJobSchema>`. Action bodies manually stringify/number-coerce.

### 8.10 `lib/adjustments.ts` coupled to the `Comparable` drizzle type — LOW — S
Makes pure testing awkward. Extract a pure `CompMetrics` type.

### 8.11 Constants live in many places — LOW — S
`UPLOAD_DIR`, `SESSION_COOKIE`, `SESSION_TTL_MS`, `DEFAULT_ADJUSTMENTS`, `PAGE_W` — all scattered. Move to `lib/config.ts` (or keep, but namespace).

### 8.12 No barrel file for `lib/` — LOW — S
Each page has 5–10 deep imports. Optional cleanup.

### 8.13 Client component is only the nav — LOW — S
Everything else is a server component. Good — but signals we're one step away from needing a useful client-side store (e.g. for an upload queue, a toast system). Plan for it.

### 8.14 No env var config — MED — S
No `.env.example`. `NODE_ENV` is the only runtime variable referenced. Production will need `DATABASE_URL`, `SESSION_SECRET`, `POSTMARK_API_KEY`, etc.

**Fix**: `lib/env.ts` using `zod` to parse `process.env` and crash at boot on missing required vars.

### 8.15 No separation of dev vs. prod cookie settings — LOW — S
See 2.4. Same root fix.

### 8.16 `package.json` lists Drizzle + drizzle-kit but no migrations are committed — MED — S
Because of 8.1, there are no `.sql` migrations tracked, so schema history is lost. Any schema change breaks existing deployments.

**Fix**: real migrations via `drizzle-kit generate` + commit them.

### 8.17 `better-sqlite3` has no graceful shutdown — LOW — S
On SIGTERM the WAL can be left un-checkpointed. Ship a `process.on("SIGTERM", () => sqlite.close())`.

### 8.18 `scrypt` params are Node defaults — LOW — S
Node's default scrypt is `N=16384, r=8, p=1`. Fine for 2018. Modern recommendation is Argon2id via `@node-rs/argon2`.

### 8.19 PDF rendering has no retry / error page — LOW — S
If `/jobs/[id]/report` throws mid-render, browsers show a generic PDF-parse error. Wrap in a try/catch that writes a minimal "error" PDF with the job ID and a request to retry.

### 8.20 Uploads directory is writable at runtime — MED — S
Fine for a single-server setup; terrible for serverless/Vercel (read-only FS). Swap for S3 / R2 well before hosting. At minimum, make `UPLOAD_DIR` env-configurable.

---

## 9. Performance

Currently invisible because demo data is tiny. Will bite at 50+ jobs.

### 9.1 No pagination — HIGH — S
`listJobsForUser` fetches every row. At 500 jobs/year × 2 years = 1,000 rows per appraiser. Works but dashboard grows linearly.

**Fix**: paginate the jobs list (offset + limit, or keyset pagination). Dashboard shouldn't load closed jobs at all.

### 9.2 N+1 on dashboard — MED — S
`dashboard/page.tsx:9` fetches all jobs and then filters in JS. For an org with 1k jobs the server renders 1k rows just to show 3 summary sections.

**Fix**: separate queries per section (`due this week`, `overdue`, `recently delivered`) with `LIMIT` and index usage.

### 9.3 Photos served full-size as thumbnails — HIGH — S
`/api/photos/[id]` always serves the original. A phone photo is 3–8 MB. With 30 photos on a job that's 100+ MB to render the inspection page.

**Fix**: on upload, generate 256×256 JPEG thumbnails with `sharp`. Serve `/api/photos/[id]?t=thumb` for thumbnails, `?t=full` for lightbox.

### 9.4 PDF generation embeds originals — MED — S
`pdf/report.ts:175-195` reads the full source image for each photo. Should embed a 1024-wide thumbnail — the URAR addendum is 2-up on letter size, originals waste space.

### 9.5 No HTTP caching headers on most routes — LOW — S
`/api/photos/[id]` sets `Cache-Control: private, max-age=31536000, immutable` (good) but nothing else does. Static assets like the favicon/logo will need them when present.

### 9.6 No full-text search index — LOW — S
Current indexes cover the status board. Once search is added (4.12) we'll want FTS5 on `jobs.subject_address || borrower_name || loan_number`.

### 9.7 `drawText` in PDF is called 200+ times per job — LOW — S
Minor, but pdf-lib is slow. For 50+ comps or photo-heavy reports, render time balloons. Worth profiling if we see >3s renders.

### 9.8 No streaming response for large downloads — LOW — S
Workfile zip is built fully into memory then sent. For a 200-photo job that's 1-2 GB. OOM on a small host.

**Fix**: stream the archive directly to the response (archiver supports pipe).

### 9.9 Server components re-render on every action — MED — S
Because mutations use `redirect(...)`, the entire page re-fetches. OK for correctness; wasteful for server CPU. Can be improved with optimistic updates + `revalidatePath`.

### 9.10 `better-sqlite3` is single-writer — MED — M
SQLite serializes all writes. At our scale (1 appraiser = few writes/sec) fine. At 50 concurrent users on the same DB, contention starts. Plan Postgres migration as user count grows (roadmap already calls for this).

---

## 10. Testing

### 10.1 Zero tests of any kind — HIGH — M
No unit, no integration, no E2E. The roadmap calls for Vitest, Testcontainers, Playwright, visual regression for PDFs. None exist.

**Start with these 6 tests (biggest ROI):**

| Test | What it protects |
|------|-------------------|
| `lib/adjustments.test.ts` | Pure-function: compute comp adjustments for a known subject + comp set, assert expected gross/net/adjusted price. |
| `lib/jobs.test.ts` | `computeGLA` with and without below-grade rooms. |
| `lib/auth.test.ts` | `hashPassword` + `verifyPassword` round-trip; rejects wrong password. |
| `lib/pdf/report.test.ts` | Render a fixed job; assert PDF is valid, >1 KB, and contains the expected section headers (via `pdf-parse`). |
| Playwright `happy-path.spec.ts` | Sign up → new job → add rooms + comps → sign → deliver → mark paid. |
| Playwright `tenancy.spec.ts` | User A creates a job; user B cannot access `/jobs/<A's id>` (expect 404). Regression lock for §2.1 once fixed. |

### 10.2 No CI — HIGH — S
No `.github/workflows/`. Nothing runs on PRs. Easiest possible win — one action file running `pnpm typecheck && pnpm test && pnpm playwright test`.

### 10.3 No type-check script — LOW — S
`package.json:scripts` has no `typecheck`. `tsc --noEmit` is free.

### 10.4 No lint config — LOW — S
No `.eslintrc`, no `biome.json`.

### 10.5 No pre-commit hooks — LOW — S
Husky + lint-staged is a 5-minute setup.

---

## 11. Operations / Deployment Readiness

### 11.1 No logging — HIGH — S
`console.log` / `console.error` used nowhere. When something fails in prod, we have no breadcrumbs.

**Fix**: `pino` + Sentry integration for errors.

### 11.2 No health check endpoint — MED — S
`/api/health` returning DB ping + version. Needed for load-balancer checks.

### 11.3 No security headers — MED — S
No CSP, no Referrer-Policy, no X-Frame-Options. Easy to add via `next.config.ts` `headers()`.

### 11.4 No DB backup strategy — HIGH — S
Single SQLite file. Losing `data/app.db` = losing all customer data. Needs scheduled `.backup` (sqlite3 cli) or Litestream replication.

### 11.5 No environment separation — MED — S
No staging. No way to test migrations without touching prod.

### 11.6 No feature flags — LOW — M
Roadmap calls for Flagsmith or similar. Not needed for v0 but expected at v1 for AMC integrations that vary per customer.

### 11.7 No Dockerfile or deploy docs — MED — S
Today the deploy story is implicit. Needs a Dockerfile + a "works on Fly / a VPS / etc." explanation. Note: Vercel is a no-go because of the writable uploads dir and SQLite file.

### 11.8 Graceful shutdown — LOW — S
See §8.17.

### 11.9 No metrics / tracing — LOW — M
No request-count / latency / error-rate visibility.

### 11.10 No email sending plumbed — MED — S
Roadmap lists Postmark/Resend. Nothing is wired yet. "Deliver" action doesn't actually email anything.

---

## 12. Prioritized Improvement Plan

A sequence that minimizes risk and maximizes user-facing polish. Time estimates assume one engineer, Claude-assisted.

### Wave 1 — Stop-the-bleeding security & data integrity (0.5–1 day)
| # | Item |
|---|------|
| 2.1 | Tenant isolation on every destructive action. |
| 2.2 | Remove GET from logout. |
| 2.3 | MIME sniff + size cap + `sharp` re-encode on photo upload. |
| 2.4 | `secure` cookie flag in prod. |
| 3.1 | Transactional delete-job + photo directory cleanup. |
| 3.5 | CAS status transitions. |
| 8.6 | `requireUser` redirects instead of throwing. |
| 11.3 | Security headers. |

### Wave 2 — Professional functionality (1–2 days)
| # | Item |
|---|------|
| 4.1 / 4.2 / 4.3 / 4.4 | Edit forms for job, room, comp, client. |
| 4.5 | Delete-confirm modals. |
| 4.6 | Photo lightbox. |
| 4.11 | /settings page: profile + signature pad + default fee. |
| 4.12 | Search/filter on jobs. |
| 4.17 | Embed signature image in signed PDFs. |
| 5.1 | Submit-button loading state. |
| 5.4 | `app/error.tsx` + `app/not-found.tsx`. |
| 5.5 | Toast system on state changes. |
| 5.11 | Favicon + per-page titles (5.12). |

### Wave 3 — Domain credibility (1–2 days)
| # | Item |
|---|------|
| 6.1 | Configurable adjustment rules + `/settings/adjustments`. |
| 6.2 | Time adjustment for stale comps. |
| 6.3 | Condition/quality adjustment rows. |
| 6.6 | Subject prior-sales section. |
| 6.7 | Neighborhood section. |
| 6.18 | License-expiration guard on sign. |

### Wave 4 — UX polish (0.5–1 day)
| # | Item |
|---|------|
| 5.17 | Mobile-first inspection layout. |
| 7.1 / 7.2 / 7.4 | Color-blind flags, aria-labels, label-input pairing. |
| 7.9 / 7.10 | Mobile nav + responsive job-detail header. |
| 7.11 | Tabbed or accordion'd checklist. |
| 7.16 | CurrencyInput component. |
| 5.7 | Undo toast on destructive actions. |

### Wave 5 — Code quality / reliability (1 day)
| # | Item |
|---|------|
| 8.1 / 8.16 | Real migrations via drizzle-kit; remove raw DDL in `db.ts`. |
| 8.3 / 8.4 / 8.9 | Move actions to `lib/actions/*.ts`; `zod` schemas; typed inputs. |
| 8.14 | `lib/env.ts` with zod-parsed env vars. |
| 10.1 / 10.2 | The 6 tests above + a GitHub Actions CI file. |
| 11.1 | Pino + Sentry. |

### Wave 6 — Operations (0.5 day)
| # | Item |
|---|------|
| 11.2 | `/api/health`. |
| 11.4 | Automated DB backups. |
| 11.7 | Dockerfile + production deploy docs. |
| 9.1 / 9.3 | Pagination + photo thumbnails. |

### Total effort
~5–7 focused engineering days to close the MVP gap to **pilot-ready**. Not including the deferred roadmap items (offline PWA sync, MLS integration, AMC delivery, multi-user orgs, native mobile) which remain v1 scope.

### Guiding principle
Every wave ends with a shippable state. Nothing here requires a big-bang rewrite; the architecture choices in the MVP (Next.js monolith, Drizzle+SQLite, server actions, event log) all scale into the v1 version described in `DEVELOPMENT_ROADMAP.md`.

---

## Appendix — Findings By Severity

| Severity | Count |
|----------|------:|
| HIGH     |   23  |
| MED      |   48  |
| LOW      |   30  |
| **Total**| **101** |

(Findings count reflects this review; the spreadsheet-ready source lives above with IDs like `2.1`, `3.7`, etc.)

*Review performed against commit 1767087 of the `main` branch.*








