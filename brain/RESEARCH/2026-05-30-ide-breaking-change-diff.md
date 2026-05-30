# Deep evaluation (scaffold) — IDE-native breaking-change diff (D3 protobuf, D5 OpenAPI)

**Status:** **scaffold.** First-principles; cited sections
`[CITED — cap-gated]`. Covers **D3** (protobuf/gRPC breaking-change
diffing, JetBrains Marketplace) and **D5** (OpenAPI/Swagger
breaking-change diffing, VS Code Marketplace) together — they are the
*same pattern* and ranked **#4** in the recommended deep-eval order
(`brain/RANKING.md`). Not decision-ready.

**The shared idea:** an **IDE-native** tool that diffs two versions of
a machine-readable contract (`.proto` schema / `openapi.yaml`) and
**classifies breaking vs. safe changes** inline as you edit — the same
align→diff→classify engine (validated horizontal), with a
schema-breaking-change rule-pack instead of a federal one.

## The decisive shared dynamic: a Proven incumbent + an IDE wedge
- **D3 incumbent:** `buf` (buf.build) — a CLI/SaaS that does protobuf
  breaking-change detection. Its existence **proves the pain + the
  willingness to pay** (Proven-leaning evidence) but also means the
  product competes head-on.
- **D5 incumbent:** `oasdiff` / `openapi-diff` — CLIs that do OpenAPI
  breaking-change detection. Same story.
- **The wedge (both):** the incumbents are **CLI/CI tools**; the bet is
  **IDE-native immediacy** — see the breaking change *as you type*, in
  the marketplace where the developer already lives, with classified +
  explained results. The deep-eval must judge whether "IDE-native" is a
  strong enough wedge or merely a feature the incumbent ships next.

## 1. Competitor teardown — `[CITED — cap-gated]`
D3: buf (pricing, BSR adoption), `protolock`, IntelliJ protobuf plugins
(do they do breaking-change detection or just syntax?). D5: oasdiff,
openapi-diff, Optic, Stoplight, Spectral (linting ≠ breaking-change
classification). The teardown must confirm the IDE-native niche is
unowned in each marketplace.

## 2. Revenue model — `[CITED — cap-gated]`
D3: JetBrains Marketplace billing (self-serve). D5: VS Code has **no
native billing** → an external license server (more build; the
BidDiff licensing pattern transfers). Comparable: paid JetBrains/VS
Code plugin revenue benchmarks (cite).

## 3. Distribution — first principles
Both = top-tier dev marketplaces with real intent traffic. D3
(JetBrains) has native billing → cleaner self-serve. D5 (VS Code) has
the larger audience but DIY billing. Strong distribution either way.

## 4. Build-effort — first principles
- **Parser is the new work** — protobuf (well-specified, FileDescriptor)
  or OpenAPI (JSON/YAML schema). Both are public, well-documented specs
  → good agent build-feasibility.
- **Breaking-change rule-pack:** the engine's classify/critical layer
  encodes the (well-known, public) breaking-change rules (removed field,
  changed type, removed endpoint, narrowed enum, etc.).
- **Shell:** JetBrains plugin (D3) or VS Code extension (D5) — both
  well-documented SDKs.
- **Maintenance fit:** good — IDE plugins update on the IDE's cadence;
  no always-on service (D3) / a light license server (D5).

## 5. Risk register — first principles
- **Incumbent response** — buf/oasdiff could ship an IDE plugin.
- **"CLI is good enough"** — teams may prefer the CI gate over an IDE
  hint; the wedge must be genuinely valued.
- **AI commoditization** — an LLM can explain a breaking change ad hoc;
  the product must be faster/more reliable than asking the model.
- **D5 billing** — VS Code's no-native-billing adds build + churn risk.

## 6. Why this might fail (mandatory) — first principles
- **The wedge may be too thin** — if "IDE-native" doesn't beat the
  established CLI/CI workflow, the incumbent wins on trust + coverage.
- **Head-to-head with a funded incumbent** (buf) is a hard place for a
  solo autonomous factory to compete on breadth; must win on a sharp,
  specific UX the incumbent neglects.
- **Lower strategic fit** than the regulatory family (engine + pattern
  reuse only; no dataset transfer) — like D4, justified on standalone
  merits, not portfolio compounding.

## 7. Evidence tier — provisional **Proven-leaning** (incumbents prove demand)
Demand + willingness-to-pay are proven by buf/oasdiff; the *IDE-native
niche's* viability is the open question (cited).

## Provisional scoring (first principles; D3 ≈ D5)
| Factor | Wt | D3 | D5 | Note |
|---|--:|--:|--:|---|
| Revenue ceiling | 18 | 6 | 6 | dev-tool plugin; incumbents monetize |
| Prob. of ceiling | 14 | tbd | tbd | wedge strength (§6) |
| Distribution quality | 14 | 8 | 8 | top dev marketplaces |
| Maintenance fit | 10 | 8 | 7 | IDE cadence; D5 + license server |
| Build feasibility | 10 | 8 | 8 | public specs; engine reuse |
| Self-serve monetization | 8 | 8 | 5 | D3 native billing; D5 DIY |
| Defensibility | 8 | 4 | 4 | incumbent could copy the IDE wedge |
| Evidence quality | 10 | tbd | tbd | Proven-leaning pending §1 |
| Strategic fit | 8 | 6 | 6 | engine/pattern reuse only |

**Read:** Proven-leaning demand, strong distribution, good build/
maintenance fit — but **competing with funded incumbents on a wedge
(IDE-native) that may be thin or copyable**. D3 > D5 on monetization
(native billing). Deep-eval fourth; pick the one whose cited teardown
shows the clearest unowned IDE niche. Lower strategic fit than the
regulatory family.
