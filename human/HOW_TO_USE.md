# HOW_TO_USE.md — the human's short manual

> Kendama is an autonomous software product factory. Most of the
> time it runs without you. This file is the manual for the few
> things you do.

---

## The whole interface, in one paragraph

Once a week — typically Sunday or Monday — you open a Claude
Code session for this repository and send a short message like
**"hey it's Sunday"** or **"Monday check-in"** or **"what's the
rundown?"**. Kendama replies with a structured rundown:
**what got done**, **what needs you** (the unmissable part),
**portfolio status**, and **what's next**. You clear the
`NEED_FROM_HUMAN.md` items and approve / reject / redirect any
proposals in `APPROVALS.md`. That is the entire interface. The
realistic load averages around an hour per week.

---

## Section 7.6 — The Sunday check-in protocol (verbatim)

The protocol below is the same one written into `CLAUDE.md`. The
Claude Code session that receives your message reads it.

**Recognizing the trigger.** Any message that references it being
Sunday or Monday, or that asks for a rundown / recap / status /
"what do you need from me" / "what did you get done", triggers
the check-in. When in doubt, an ambiguous status-like question is
treated as a check-in request.

**Important context for the responding session.** The Saturday
build runs as a separate Routine session on Anthropic's cloud and
is not in the responding session's memory. The responding session
produces the check-in by *reading the files the Saturday session
committed to the repository* — not from memory. Before responding,
it reads, in order: `human/WEEKLY_DIGEST.md`,
`human/NEED_FROM_HUMAN.md`, `human/APPROVALS.md`,
`brain/STATE.md`, `brain/PORTFOLIO.md`. If newer commits exist
than the last digest, recent history is also skimmed.

**The response structure, in this order:**

1. **What got done.** A short summary of the most recent Saturday
   session's accomplishments from `WEEKLY_DIGEST.md`.
2. **What needs the human — the most important part.** Every
   open item in `NEED_FROM_HUMAN.md` and every pending proposal
   in `APPROVALS.md`. For each: what it is, why it's needed,
   the exact steps, and how long it will take. If nothing,
   say so plainly.
3. **Portfolio status.** One line per product from
   `PORTFOLIO.md`.
4. **What's next.** What Kendama plans to work on in the next
   Saturday session, and any blocker the human can clear to
   unlock significant work.

**Tone and length.** Brief and scannable — two or three minutes
to read. Lead with the rundown; make "what needs you"
unmissable; do not bury action items in prose. If the week's
human load is near zero, say that plainly.

**This is a read-and-report action, not a build action.** The
check-in session reports and actions whatever the human approves
in that conversation. The Saturday Routine does the building.

---

## The weekly rhythm

- **Saturday:** Kendama builds all day on Anthropic's cloud via
  the Routine. Anything that needs you is logged in
  `NEED_FROM_HUMAN.md` or `APPROVALS.md` and the factory keeps
  building everything else.
- **Sunday or Monday:** You send a check-in message; you get the
  rundown; you clear or approve the queued items in a few
  minutes.
- **The next Saturday:** the next Routine run reads the brain
  (now including your approvals and cleared blockers) and
  proceeds with the newly unblocked work.

You are never a bottleneck mid-build; you are a fast weekly
reviewer.

---

## How to adjust the factory

Each of these is a one-edit action. The factory picks up the
change on its next session.

### Set or change the monthly spend cap

Edit `governance/SPEND_CAP.md`, change the "Monthly cap (USD)"
cell, commit, push. The factory respects the new cap on the next
expensive operation.

### Prioritize or kill a product

Edit `brain/PORTFOLIO.md`, change a row's status to `retired`
(with a reason) or change a row's priority indicator. The factory
re-reads the brain on the next session and acts accordingly.

### Prioritize an idea

Edit `brain/IDEA_BACKLOG.md` to move a row to the top, or set a
row's status to skip. The factory re-ranks on the next session
and posts a fresh proposal to `APPROVALS.md` if appropriate.

### Approve, reject, or redirect a proposal

Edit `human/APPROVALS.md`, change the proposal's "Status:" line
per the format in that file.

### Tighten or loosen a guardrail

`governance/GUARDRAILS.md`. **Loosening (removing) a guardrail
requires you, the human.** The factory may add guardrails on its
own; it may not remove them. See PART 11.3 / GUARDRAILS.md #12.

---

## What to do if Kendama is doing something wrong

1. Open a Claude Code session for this repo.
2. Tell Kendama what is wrong.
3. The session updates the relevant brain or governance file and
   commits.

The brain is the source of truth; corrections land there.

---

## The realistic weekly load

- **Most weeks:** ~30 minutes (Sunday check-in + clearing a
  small queue).
- **Weeks a new product is ready to launch:** ~1–2 hours
  (account setup, store submission).
- **Setup week (week 1):** ~5–10 minutes to set the spend cap and
  create the Routine.

Averaged, about an hour per week.
