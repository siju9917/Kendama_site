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

