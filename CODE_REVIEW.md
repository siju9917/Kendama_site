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
