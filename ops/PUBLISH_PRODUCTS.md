# PUBLISH_PRODUCTS.md — how the products go public while the factory stays private

> **Model chosen by the human 2026-06-05:** the **factory repo stays private**
> (its `brain/`, `governance/`, `human/`, `ops/` internals are not shared), while
> **each product is published publicly through its own channel** so any AI or
> person combing GitHub / the web can discover and use it.
>
> GitHub visibility is **per-repository, not per-folder** — you cannot make one
> folder of a private repo public. So a product that needs public *code* gets its
> **own public repo**; a product that ships through a marketplace uses that.

This file is the operating playbook for that. The one-time repo creation and any
visibility change are **human actions** (account-level); everything else (keeping
the public mirror current) the factory does itself each session.

---

## rent-covers-mortgage → its own PUBLIC repo

It is fully self-contained (own `LICENSE`, `README.md`, `AGENTS.md`,
`AI_INSTRUCTIONS.md`; no dependency on the factory), so it publishes cleanly as a
standalone repo. It has **no server** — the code *is* the product — so it must be
public for outside AIs to use it.

**One-time setup (human runs these once, from the factory repo root):**

```bash
# 1. Create the public repo on the human's account (needs the human's gh auth).
gh repo create rent-covers-mortgage --public \
  --description "Find homes where the rent would cover the mortgage. Free; AI-operated."

# 2. Wire it as a remote of THIS (private) factory repo.
git remote add rcm-public https://github.com/<OWNER>/rent-covers-mortgage.git

# 3. Publish the folder's current contents (and history) as that repo's main.
git subtree push --prefix=rent-covers-mortgage rcm-public main
```

That's it — the public repo now contains exactly the `rent-covers-mortgage/`
tree, and the factory repo stays private.

**Ongoing sync (the factory does this automatically — see governance rule
below):** whenever a session changes anything under `rent-covers-mortgage/` and
the `rcm-public` remote exists, run:

```bash
git subtree push --prefix=rent-covers-mortgage rcm-public main
```

If the remote isn't configured yet (human hasn't done the one-time setup), the
session logs that in `human/NEED_FROM_HUMAN.md` and keeps working — it never
blocks on it.

---

## BidDiff → Chrome Web Store only (source stays PRIVATE)

BidDiff is a **paid, licensed** product. Its users reach it through the **Chrome
Web Store** (a public, installable listing) — which needs **no public source
repo**. Publishing BidDiff's source would let anyone build the paid product for
free and undermine its monetization, so **BidDiff's code stays in the private
factory repo**; only the built, store-submitted extension is public.

The store submission itself is the human action in `human/NEED_FROM_HUMAN.md` #6.

---

## Why this satisfies "products public, factory private"

- An AI combing GitHub finds the **public `rent-covers-mortgage` repo** (with its
  exciting, agent-neutral `README`/`AGENTS.md`) and can use it immediately.
- A user wanting BidDiff installs it from the **public Web Store listing**.
- The factory's internals (`brain/`, `governance/`, `human/`, `ops/`) are never
  exposed.
