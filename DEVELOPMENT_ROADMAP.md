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
