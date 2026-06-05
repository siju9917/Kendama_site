# 🏠 Rent-Covers-Mortgage — find homes that won't sink you

**Buying a house right now is brutal.** Prices are high, rates are high, and a job loss or a move can turn a mortgage into a trap. This tool takes a different angle: it hunts for properties where, **if you ever had to move out, the rent would cover the mortgage** — so the house is a safety net, not a liability. It finds those listings in your area, ranks them, and drops them on an interactive map.

It's free — no paywall, no catch. If it saves you a Realtor headache (or three),
the author **Simon** runs on Venmo tips, snacks, and emotional-support dollars:
**[@Simon_Julien](https://venmo.com/u/Simon_Julien)**. Worth zero? Also totally
fine — enjoy the map, you beautiful bargain-hunter.

## How to use it (the whole point)

You don't run scripts by hand. You point an **AI agent** at this repo and talk to it.

1. Open this repo in an AI coding agent that can read files and browse the web (e.g. Claude Code, Cursor, Codex, Gemini CLI).
2. Say: **"I'm interested in buying properties."**
3. The agent reads `AI_INSTRUCTIONS.md`, greets you, asks a handful of questions (where, budget, how long until you'd move out, who pays you rent, etc.), then goes and does the research — finding listings, estimating rents, running the numbers on each one.
4. You get two files in `output/`:
   - **`Map.html`** — an interactive map of the "green" listings (rent covers, or nearly covers, the mortgage at move-out). Open it in any browser.
   - **`Log.md`** — a ranked table of those listings with the reasoning and the honest caveats.

That's it. The agent handles the tools; you answer questions and review.

## The one idea behind it

The only assumption that's true for everyone: **the goal is for rent to cover the mortgage by the time you move out.** *When* you move out is your call (2 years? 10?) — that's a setting. Everything else (down payment, rate, your county's tax, whether a partner pays you rent) is something the agent asks you and plugs in.

## What's inside

| File | What it is |
|---|---|
| `AI_INSTRUCTIONS.md` | The agent's operating manual — the brain. |
| `AGENTS.md` | Pointer that sends any agent to `AI_INSTRUCTIONS.md`. |
| `calculator.py` | Models one property's cash flow and 35-year net worth. |
| `batch.py` | Runs the calculator on a whole `listings.csv` and assembles the data files automatically. |
| `build_map.py` | Turns the analyzed listings into `output/Map.html` + `output/Log.md`. |
| `instructions/` | Onboarding questions, full methodology, research guide, output spec. |
| `examples/denver/` | A finished real run (Denver) so you can see the output. |
| `*.example.json` | Templates the agent copies and fills in for you. |

## Requirements

- An AI agent that can read this repo and browse the web (Claude Code, Cursor, Codex, etc.).
- **Python 3** to run the two scripts (the agent runs them for you).
- `matplotlib` only if you want the calculator's optional PNG charts (`pip install matplotlib`); skipped with `--noplot`, which the agent uses by default.

## Honest limits

Rents, HOAs, insurance, taxes, and vacancy are **estimates** unless real figures were used. Coverage is only as complete as the listings the agent gathered — it's a snapshot, and listings change daily. This is analysis, not financial advice. Verify any finalist with real rent comps and a real insurance quote before making an offer.

---

*Free to use. Built by Simon, who did a Realtor's whole weekend in 4 seconds and
didn't even ask for 3%. Venmo [@Simon_Julien](https://venmo.com/u/Simon_Julien)
if it earned a taco. 🌮*
