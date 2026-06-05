# ONBOARDING — the questions to ask the user

Ask conversationally, a few at a time, with defaults offered. Write answers into `config.json` (copy `config.example.json`) and confirm before researching.

| # | Ask | Goes to | Default | Why it matters |
|---|---|---|---|---|
| 1 | Which city/metro? Any specific neighborhoods or ZIPs? | `region_name` (+ your search scope) | — | Defines where to find listings. |
| 2 | Most you'll put down (cash)? Max purchase price? | `down_payment`, `price_cap` | $225,000 / none | Down payment drives the loan and the invest-instead baseline. |
| 3 | Mortgage rate you expect? | `rate` | 6.25% | Look up today's typical 30-yr fixed if unsure. |
| 4 | How many years until you'd move out and rent it fully? | `moveout_years` | 2 | **The core thesis knob.** |
| 5 | Will a spouse/partner/roommate pay you rent while you live there? How much/mo? | (calculator `--cooccupant`) | none | Offsets the live-in phase. |
| 6 | Which property types? (SFH / condo / townhome / small multifamily) | (search filter) | all | Small multifamily usually cash-flows best — mention it. |
| 7 | How negative is too negative at move-out? | `green_cutoff_per_month` | −$1,000/mo | Some want strictly positive ($0). |
| 8 | County property-tax rate? | `taxrate` (calculator) | 0.42% | Varies hugely by state — look it up. |

Then summarize their profile back to them in one short paragraph and start the research.
