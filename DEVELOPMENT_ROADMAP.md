# House Appraisal Helper — Product & Development Roadmap

> A SaaS platform for residential real-estate appraisers to manage orders, inspections, comparables, reports, billing, and compliance in one workflow.

---

## 1. Executive Summary

**Product name (working):** AppraiseOS

**One-liner:** "From order intake to signed URAR in half the time — a modern workbench for independent appraisers and small appraisal shops."

**Problem.** Independent residential appraisers juggle 6–10 disconnected tools: an AMC portal for orders, Excel for scheduling, a phone camera + notes app on-site, a desktop form-filler (ACI / TOTAL / Bradford) for the URAR, MLS for comps, QuickBooks for invoicing, and email for everything in between. This costs 2–4 hours of admin per appraisal and is a common source of USPAP/UAD compliance defects.

**Solution.** A single web + mobile platform that ingests orders, schedules inspections, captures field data (photos, sketch, notes) on a phone, pulls MLS/public-records comps, drafts the URAR form, manages e-signature delivery, and handles invoicing — with a compliance layer that validates UAD codes and workfile retention automatically.

**Primary outcome metric.** Reduce per-appraisal non-billable admin time from ~3 hours to <1 hour (measured by time-in-app per completed report).

**Business model.** Per-seat SaaS ($79–$149/appraiser/month) with a higher tier for shops needing multi-user review workflows and AMC integrations.

**Scope of this document.** End-to-end product spec, feature list, technical architecture, phased delivery plan, and a concrete 6-month engineering roadmap for a solo/small engineering team to ship an MVP and iterate to a commercial v1.

---

## 2. Target Users & Pain Points

### 2.1 Primary persona — "Dana, the Independent Appraiser"
- State-certified residential appraiser, 5–20 years experience.
- Completes 6–15 appraisals per week, mostly URAR 1004 (SFR), plus 1073 (condo) and 2055 (drive-by).
- Earns $400–$700 per report; every unbillable hour is real revenue loss.
- Tooling today: ACI / TOTAL / Bradford ClickFORMS on a Windows laptop, phone camera, a clipboard, MLS access, PDF e-signature, QuickBooks Self-Employed.

**Top pains (ranked from appraiser interviews / forum research):**
1. Re-typing order details from AMC emails/portals into the form software.
2. Matching photos to the right subject/comparable after inspection (photos arrive in one dump from the phone).
3. Drawing the floor plan / sketch — current tools (Apex, RapidSketch) are expensive and Windows-only.
4. Finding defensible comps in limited-data neighborhoods; documenting why each was chosen.
5. UAD/USPAP compliance checks are manual; a single bad code triggers a revision request that can delay payment by a week.
6. Keeping a compliant 5-year workfile organized by job.
7. Invoicing + chasing AMC payments (net 30–60).

### 2.2 Secondary persona — "Marcus, Shop Owner / Chief Appraiser"
- Owns a 3–8 person appraisal firm.
- Needs: order distribution to staff, review/signoff workflow (trainee → certified appraiser), team calendar, company-wide turnaround metrics, payroll splits.

### 2.3 Tertiary persona — "Priya, Trainee Appraiser"
- Works under a supervisor for 1,000–1,500 field hours.
- Needs: experience log (date, address, role, hours), supervisor sign-off on every report, guided checklists so she doesn't miss UAD fields.

### 2.4 Non-users (explicitly out of scope for MVP)
- AMCs themselves (they already have Mercury, AppraisalPort, etc. — we integrate, not replace).
- Commercial appraisers (different forms, different data — a post-v2 expansion).
- Lenders / underwriters (they consume the finished report; no workflow need).

### 2.5 Jobs-to-be-done
When I get a new appraisal order, I want the subject address, borrower, and due date auto-populated into a job so I can skip data entry. When I'm on-site, I want to capture every required UAD field on my phone so I don't drive back for a missed measurement. When I'm writing the report, I want the system to flag missing UAD codes and suggest comps so I can defend my value conclusion. When I'm done, I want to e-deliver to the AMC and invoice in one click so I get paid faster.

---

## 3. MVP Feature Set (what's required to be useful enough to deploy)

The MVP is the smallest surface that an independent appraiser can adopt for a real job end-to-end. Anything below the line is deferred.

### 3.1 Authentication & tenancy
- Email + password auth; 2FA via TOTP.
- Single-tenant-per-account model on day 1 (Dana persona). Multi-user orgs added in v1.
- Password reset, session management, audit log of logins.

### 3.2 Job / order management ("Jobs" is the core entity)
- Create a job manually (subject address, client, fee, due date, form type).
- Import a job from a pasted AMC email or uploaded AMC PDF order (server-side parse — regex + templated extractors for Mercury, AppraisalPort, Valuepad; LLM fallback for anything else).
- Job states: `NEW` → `SCHEDULED` → `INSPECTED` → `DRAFTING` → `IN_REVIEW` → `DELIVERED` → `PAID` → `ARCHIVED`.
- Dashboard with "what's due this week" and "what's past due."
- Per-job SLA timer visible at all times.

### 3.3 Scheduling & calendar
- Built-in calendar view (week/month).
- Book an inspection slot on a job; auto-compute drive time from previous appointment using the maps provider.
- Public booking link the homeowner can use to pick a window (like a Calendly, but scoped to the job).
- ICS export + two-way sync with Google Calendar.
- SMS + email reminders to the homeowner 24 h and 1 h before.

### 3.4 Field inspection — mobile (PWA on day 1, native later)
- Offline-first: everything works with no signal, syncs when back online.
- Guided checklist per form type (UAD-aware): exterior walkaround, each room, baths, kitchens, basement, mechanicals, site, view, condition (C1–C6), quality (Q1–Q6).
- Photo capture tagged to the checklist item (e.g., "front elevation," "kitchen," "water heater"). EXIF geotag preserved.
- Voice notes per item, auto-transcribed.
- Measurement entry: room dimensions + GLA rollup; sanity warning if GLA differs from public-record by >10%.
- Sketch tool: drag-to-draw rectangles on a grid, auto-calculate area, label rooms. No ANSI Z765.0 certification on MVP — a simple, defensible sketch.

### 3.5 Comparables
- Manual comp entry (address, GLA, bed/bath, sale date/price, adjustments).
- CSV/Excel import of comps (from MLS export).
- Side-by-side grid (subject + up to 6 comps) with a live adjusted-value calculation.
- Map view with subject + comps pinned + distance display.
- **MLS live integration is v1, not MVP.** MVP ships with manual / CSV only.

### 3.6 Report generation
- URAR 1004 only on MVP. (1073, 2055, 1025 added in v1.)
- Pull every known field from the job + inspection + comps into the form draft.
- Render to a pixel-accurate PDF matching the Fannie Mae 1004 form.
- "Missing fields" panel listing every required UAD field still blank.
- Review-before-sign step: appraiser types value conclusion, signs via stored signature image, PDF is sealed (hash stored for workfile integrity).

### 3.7 Delivery
- Download signed PDF.
- Email the PDF to the client with a tracked link.
- AMC-portal delivery (Mercury, AppraisalPort) is v1 — MVP is email-only.

### 3.8 Workfile
- Every photo, note, voice recording, comp source document, and form revision is retained per job.
- 5-year retention default, USPAP-compliant audit trail (who did what, when).
- Zip-export of the full workfile per job.

### 3.9 Invoicing (lightweight)
- Generate a PDF invoice from the job fee field.
- Mark paid / unpaid; A/R dashboard showing total outstanding and aging buckets (0–30, 31–60, 60+).
- Stripe payment link on the invoice (optional).
- **Full accounting / QuickBooks sync is v1.**

### 3.10 Settings
- Profile (license number, state, expiration; warn 60/30/7 days before expiration).
- Company info, logo, signature image.
- Fee schedule defaults by form type + distance.

### 3.11 MVP out-of-scope (explicitly deferred)
- Multi-user orgs / trainee workflows.
- MLS live integration.
- AMC portal delivery.
- ANSI-compliant sketching.
- Mobile native apps (PWA only for MVP).
- AI comp suggestion.
- Commercial forms.

---

## 4. v1 Feature Set (what's required to be commercially competitive)

v1 is the release we market, price, and onboard paying customers onto. It adds the integrations and workflows that stop being "nice to have" once an appraiser tries to run their whole business on the tool.

### 4.1 Multi-user organizations
- Orgs, roles (`owner`, `admin`, `appraiser`, `trainee`, `office_staff`).
- Row-level permissions on jobs; a trainee can only see jobs they're assigned to; an office_staff can schedule but not draft.
- Review workflow: trainee submits draft → supervisor reviews inline → supervisor signs → delivered.
- Trainee experience log auto-generated from job involvement (address, hours on-site, role), exportable as a PDF for the state board.

### 4.2 Additional form types
- URAR 1073 (condo).
- URAR 2055 (exterior-only / drive-by).
- URAR 1025 (small residential income 2–4 unit).
- URAR 1004D / 442 (appraisal update & completion report).
- Fannie Mae 1004MC (market conditions addendum).

### 4.3 MLS integration
- RETS / RESO Web API connector, per-MLS.
- Search comps by radius, sale date window, GLA range, style; pull full listing detail and photos.
- "Suggest comps" feature — ranks listings by similarity to the subject (bed/bath/GLA/distance/recency), no ML yet, deterministic scoring.
- Auto-populate comp grid fields from MLS.

### 4.4 AMC / client delivery integrations
- Mercury Network XSite direct submit.
- AppraisalPort direct submit.
- ValuPad / other mid-tier AMCs via their webhook/API.
- Delivery status tracked back into the job (received, under review, revision requested, accepted, paid).
- **Stretch:** ingest revision requests as actionable line items in the job.

### 4.5 Public records / AVM data
- Partnership or paid API (CoreLogic, ATTOM, DataTree, or a reseller like Estated) to auto-fill:
  - Subject legal description, APN, lot size, year built, assessor GLA.
  - Prior sales history (3-year).
  - Zoning and flood zone (FEMA API is free).

### 4.6 ANSI-compliant sketching
- Upgrade sketch tool to measure per ANSI Z765.0 (ceiling height rules, below-grade exclusion, GLA vs. GBA).
- Floor-by-floor layer support.
- Import from laser distance meter (Bluetooth Leica Disto, Bosch GLM).
- Export to Apex / iGuide format for back-compat.

### 4.7 QuickBooks / accounting sync
- Two-way sync of invoices and payments with QuickBooks Online and Xero.
- 1099 summary export.
- Mileage tracking per inspection (auto from calendar + maps).

### 4.8 Client CRM
- Client records (AMC or direct lender) with contact, fee schedule, billing terms, average turn time.
- Per-client history: volume, revenue, revision rate, avg days-to-pay.
- Client-specific delivery preferences (portal vs. email, extra appendices).

### 4.9 E-signature & supervisor sign
- Signature pad (drawn) + stored signature image, hashed with report PDF for tamper evidence.
- Two-appraiser co-sign flow for trainees.

### 4.10 Native mobile apps
- iOS + Android via React Native.
- Background photo upload, offline sketch, bluetooth laser pairing, better camera control (burst, HDR for exterior).
- Push notifications for new orders and homeowner replies.

### 4.11 Reporting & analytics (appraiser-facing)
- Per-form turnaround time, per-client turnaround.
- Revenue by client, by form type, by month.
- Revision rate and most common revision reasons.
- Expiring license / E&O insurance / state CE reminders.

### 4.12 Compliance layer
- UAD validator: every field checked against Fannie Mae UAD 3.6 spec before allowing sign.
- USPAP workfile check: ensures every required workfile element is present (comp source documents, inspection photos, contract if purchase, prior sale explanation).
- Record-of-assignment log immutable & exportable.

---

## 5. Post-v1 / Differentiators (the reasons an appraiser switches from TOTAL)

These are the features we keep in the backlog and ship once v1 has paying customers.

### 5.1 AI assist
- **Comp recommendation model.** Given a subject, rank MLS listings by appraiser-defensible similarity, not just distance. Training signal: comps that past appraisers actually used in similar subjects.
- **UAD auto-code.** Given a room's photos + notes, suggest the correct Q-rating / C-rating with a rationale string the appraiser can edit. Never auto-submit.
- **Narrative drafter.** Pre-writes the "neighborhood," "site," "improvements," and "reconciliation" narratives based on the structured data. Appraiser reviews and edits. Must be clearly labeled as draft text.
- **Photo auto-tagging.** Classify each field photo (front elevation, kitchen, bath, mechanical) so the appraiser doesn't tag them by hand.

### 5.2 LiDAR / iPhone Pro scanning for sketches
- One-walk scan produces a measured floor plan with ANSI-compliant GLA. Major adoption driver for iPhone-Pro-equipped appraisers.

### 5.3 Homeowner-facing portal
- Homeowner gets a link, confirms appointment, uploads a list of recent improvements with receipts/photos pre-inspection, selects alarm codes / dog warnings.

### 5.4 Team marketplace / overflow network
- Opt-in marketplace where appraisers can post overflow orders to other certified users in their coverage area with a revenue split.

### 5.5 Commercial appraisal module
- Form 71A/71B, capitalization-rate workflow, income approach calculator, rent comparable grid. Separate SKU.

### 5.6 API & Zapier/Make integrations
- Public REST API for orders, jobs, and deliveries so large clients can integrate directly.

### 5.7 White-label for national AMCs
- Multi-tenant white-label deployment for AMCs that want to offer our tool to their panel appraisers as a competitive advantage.

---

## 6. Technical Architecture

### 6.1 High-level topology

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                │
│  ┌────────────┐   ┌────────────┐   ┌────────────────────────┐  │
│  │ Web (SPA)  │   │ PWA (field)│   │ Native mobile (v1+)    │  │
│  │ Next.js    │   │ Next.js +  │   │ React Native           │  │
│  │            │   │ Service Wk │   │                        │  │
│  └─────┬──────┘   └─────┬──────┘   └──────────┬─────────────┘  │
└────────┼────────────────┼─────────────────────┼────────────────┘
         │                │                     │
         └────────────┬───┴─────────────────────┘
                     │  HTTPS / tRPC or REST + JWT
                     ▼
┌────────────────────────────────────────────────────────────────┐
│                       API GATEWAY / BFF                        │
│             Next.js route handlers  +  tRPC server             │
└────────┬───────────────────────────────────────────────────────┘
         │
   ┌─────┼───────────────────────────────────────────────────────┐
   │     │                                                       │
   ▼     ▼                                                       ▼
┌──────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐
│ Auth │ │  Core API    │ │  Background  │ │   File /     │ │  External  │
│      │ │  (domain     │ │   workers    │ │   Image svc  │ │  adapters  │
│Clerk │ │   services)  │ │  (queues)    │ │              │ │  (MLS,AMC, │
│ /    │ │              │ │              │ │  S3 + image  │ │  maps,     │
│Auth0 │ │  TypeScript  │ │  BullMQ /    │ │  pipeline    │ │  FEMA,     │
│      │ │  Nest or     │ │  SQS         │ │              │ │  QBO,      │
│      │ │  Hono        │ │              │ │              │ │  Stripe)   │
└──────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘
                │                │                │               │
                ▼                ▼                ▼               ▼
         ┌──────────────────────────────────────────────────────────┐
         │                     DATA LAYER                           │
         │  PostgreSQL (primary) + PostGIS  |  Redis  |  S3         │
         │  ClickHouse (analytics, v1+)                             │
         └──────────────────────────────────────────────────────────┘
```

### 6.2 Key architectural decisions

- **Monolith-first, modular.** One deployable Next.js + API app at MVP. Split out the form-renderer and the MLS ingester into services only when load or deploy cadence justifies it.
- **Offline-first field client.** The inspection UI is a PWA with IndexedDB as the source of truth on-device, syncing via a command log to the server. Every field write is an idempotent event.
- **Event log per job.** Every mutation to a job emits an immutable event (create, assign, reschedule, photo_added, field_updated, signed). Events build the UI state; they also become the USPAP workfile audit trail for free.
- **File pipeline.** Images go to S3 via a signed-upload URL; a worker runs EXIF extraction, HEIC→JPEG, perceptual-hash dedup, and thumbnail generation.
- **Form rendering is declarative.** Each form (1004, 1073, etc.) is a JSON schema mapping UAD field IDs to coordinates on a template PDF. Rendering is a pure function (form + job data → PDF). Makes adding new forms a data task, not a code task.
- **Background jobs via Redis + BullMQ on MVP; migrate to SQS + Lambda workers if we outgrow a single Redis.**
- **Multi-tenant from day 1.** Every table has `org_id`; Postgres row-level security enforces tenancy; application code never trusts the client for tenant scope.

### 6.3 Critical subsystems

#### 6.3.1 Inspection sync engine
- Client writes commands to a local queue (IndexedDB).
- Background syncer POSTs batches of commands with a per-device sequence number.
- Server validates, persists, replies with server sequence IDs.
- Conflict resolution: last-writer-wins per field, but photos/files are additive (never conflict).
- Works on flaky LTE, in basements, at rural properties with no signal.

#### 6.3.2 Form rendering engine
- Input: `{ formType, jobId, revision }`
- Steps: (1) load form schema, (2) resolve every field binding against the job's structured data, (3) run UAD validators, (4) render each page by overlaying text on a pre-embedded PDF template using `pdf-lib`, (5) embed signature + hash, (6) return PDF stream.
- Fully deterministic: same inputs produce byte-identical output. This matters for workfile integrity.

#### 6.3.3 Comp grid engine
- Calculates adjustments using a configurable adjustment rule set (e.g., $50/sqft GLA, $5k/bed, $10k/full bath — configurable per user and per market).
- Displays gross and net adjustment %, flags Fannie's 15%/25% guideline breaches.
- Stores a snapshot of each adjustment at sign time for defensibility.

#### 6.3.4 Photo / sketch storage
- S3 bucket per environment; objects keyed by `org/{org_id}/job/{job_id}/...`.
- Server returns short-lived signed URLs; clients never see bucket credentials.
- Sketches stored as JSON geometry + a PNG render; the JSON is the source of truth.

### 6.4 Non-functional requirements

- **Availability target:** 99.5% MVP, 99.9% v1. Appraisers work weekends and evenings.
- **RPO / RTO:** RPO ≤ 5 min (Postgres WAL shipping to S3), RTO ≤ 1 hour.
- **Performance:** P95 job-dashboard load < 500 ms; PDF render of a typical 1004 < 5 s.
- **Scale target (year 1):** 1,000 appraisers × 40 jobs/mo = 40k jobs/mo; ~1 M photos/mo; ~50 GB/mo image storage. Comfortably single-region single-db.

---
