# KyaAayega — Build Playbook (day by day, for Antigravity)

*The execution layer for blueprint v7. The engine is already built and tested (repo **v0.3.0**, 26 tests, `npm run verify` green). This file turns "the plan" into **prompts you can paste into Antigravity** and **steps you do by hand**, sized to however many hours you have on a given day. It is not another PRD; when the plan and this file disagree, the plan (`KyaAayega_Portfolio_Blueprint_v7.md`) wins.*

---

## The one rule that makes or breaks this project

> **Antigravity may build tools. It may never invent the data.**
> No prompt below asks the agent to generate, guess, or "fill in" exam questions, marks, papers, reviews, users, or result numbers. You download real papers from the university's own page and type/verify them yourself; the agent can build a helper that drafts CSV from a PDF *you* provide, which *you* then check against the original. A corpus the agent made up would look identical and be worthless — and if anyone in an interview discovers a fabricated number or a planted review, the one thing this repo is for (checkable honesty) is gone. This rule is also written into `docs/AGENT-GUIDE.md` in the repo.

The repo already enforces the rest mechanically: descriptors over 8 words are rejected (no question text can leak), `local/` and `*.pdf` are git-ignored (no PDFs can be committed), frozen files are hash-checked, and `npm run verify` fails on look-ahead leaks or unreproducible numbers.

---

## 0. How to work

**The loop, every session:**
1. Pick your units for today from the schedule in §2 (based on hours available).
2. For an **[Agent]** unit: paste the **Preamble** (§1) + the unit's **Prompt** into Antigravity. Let it work. Read its diff.
3. For a **[You]** unit: follow the checklist yourself.
4. **Gate:** run `npm run verify`. If it is red, you are not done — paste the error back to Antigravity (for agent units) or fix it (for yours). Never commit red.
5. Commit with a Conventional Commit message (`feat:`, `fix:`, `data:`, `docs:`, `test:`) and tick the unit off.

**First-time setup (do once, ~10 min, before Unit 1):** unzip the repo, then in its folder run `npm ci && npm run verify && npm run demo`, and open `web/index.html` in a real browser to confirm it renders. If all green, you are ready.

---

## 1. The Preamble — paste this before EVERY agent prompt

```
You are working in the KyaAayega repository (TypeScript, Node 20+, zero runtime deps in the demo).
Obey these invariants; a change that breaks one is wrong even if it runs:
1. NEVER invent data: no fabricated exam questions, marks, papers, reviews, users, or result numbers. Build tools only; real papers are supplied and verified by me.
2. No verbatim question text or PDFs in the repo. Public descriptors are 8 words or fewer (the schema enforces this — do not weaken it).
3. Frozen runs are immutable: never edit anything under runs/<...>/ or change a hash in manifest.json. Fix data with a new commit; supersede a list only with a new run.
4. Keep `npm run verify` green (types + hash checks + look-ahead test + scoreboard reproduction + README staleness + all tests). Run it before finishing. Red = not done.
5. The primary ranking method has NO tunable parameters. A cleverer method is a "challenger" with constants declared in code, never tuned on the sittings it is scored on.
6. No network or live API on the demo path; web/index.html must work from file://.
7. Small conventional commits; add a CHANGELOG.md line; run `npm run kya -- readme` if any number changed; add a test for new behaviour.
Read docs/AGENT-GUIDE.md and docs/ARCHITECTURE.md before large changes. When done, show me: the diff summary, the `npm run verify` output, and the CHANGELOG line.

TASK:
<paste one unit's Prompt here>
```

---

## 2. Hours → units (pick your row for the day)

Units are ~1 hour each and mostly independent within a phase. Do them **in order**; a longer day just means more units. Human units (marked **[You]**) can't be rushed by the agent, so on heavy days pair a **[You]** data unit with an **[Agent]** feature unit running in parallel.

| Hours today | Do these units |
|---|---|
| 1 | the next single unit in the backlog |
| 2 | next 2 units |
| 3 | next 3 (if one is a **[You]** data unit, run an **[Agent]** unit alongside it) |
| 4 | next 4 |
| 5 | next 5 |
| 6 | next 6 |
| 7 | next 7 |
| 8 | next 8 |
| 9 | next 9 |
| 10 | next 10 |

**Realistic pace:** most days will be 1–3 units. The whole backlog is ~35 units ≈ the ~27 hours the plan budgets (some units are half-hours; data entry is the bulk). A 10-hour day exists in this table because you asked for it, but entering real papers for ten hours straight is how mistakes get in — cap data entry at ~3 hours per session and let the validator and a second pass catch errors.

**Phase order (details in §3):** P0 go-live → P1 hardening → **P2 real subject #1 (the gate)** → P3 public link → P4 real subject #2 → P5 the live freeze → P6 evidence + case study → P7 optional features. Do **not** start P7 until P2 is done; features on synthetic data are decoration.

---

## 3. The backlog

Each unit: **who · ~time · goal · Prompt/Checklist · done-when.**

### Phase 0 — Get it live

**U1 · [You] · 0.5 h · Repo on GitHub, CI on.**
Checklist: create a new public repo `kyaaayega`; `git init && git add -A && git commit -m "chore: import v0.3.0" && git branch -M main && git remote add origin <url> && git push -u origin main`; on GitHub, Settings → Actions → allow. *Done-when:* the `verify` workflow runs and passes on GitHub.

**U2 · [Agent] · 0.5 h · Replace placeholders.**
Prompt:
```
Replace every "YOUR-USERNAME" and "YOUR NAME" placeholder across the repo (README badges and links, CITATION.cff, docs) with GitHub username "<your-username>" and author name "<your name>". Do not change any other text. Run `npm run verify` and show the diff.
```
*Done-when:* no `YOUR-USERNAME`/`YOUR NAME` remain (`grep -r`), verify green.

**U3 · [You] · 0.5 h · Turn on Pages.** Settings → Pages → Source "GitHub Actions". Push once. *Done-when:* `https://<username>.github.io/kyaaayega/` loads the Time Machine (still synthetic — that's expected now).

**U4 · [Agent] · 1 h · Real-browser smoke test for the page.**
Prompt:
```
Add a headless-browser smoke test for web/index.html using Playwright (add @playwright/test as a dev dependency; install only the Chromium browser in the test setup or document the one-time `npx playwright install chromium`). The test must: build the site (`npm run demo`), open web/index.html from the file system, assert the sheet table has 12 rows, click "Reveal", and assert the questions table and the entrant bars appear with no console errors. Add an npm script `test:e2e` and a separate CI job for it (do not gate the main `verify` on browser install). Keep the existing `npm run verify` unchanged and green.
```
*Done-when:* `npm run test:e2e` passes locally; `verify` still green.

### Phase 1 — Repo hardening (all [Agent])

**U5 · 1 h · Lint.**
Prompt:
```
Add ESLint (flat config, typescript-eslint recommended, not type-checked-strict to keep it fast) with a `lint` script and a `lint` CI job (separate from verify). Fix only the errors the linter raises; do not restructure logic. Ensure `npm run verify` stays green and `npm run lint` is clean.
```
*Done-when:* `npm run lint` clean, verify green.

**U6 · 1 h · Coverage + badge.**
Prompt:
```
Enable vitest coverage (v8 provider). Add a `test:coverage` script, print a text summary, and set a coverage threshold in config at the CURRENT measured line/branch numbers minus 2 points (so it can only go up). Add the coverage step to the test CI job and a Codecov-free static coverage badge to the README that reads the summary, or a shields.io endpoint badge — whichever needs no external account. Do not lower any existing behaviour. verify green.
```
*Done-when:* `npm run test:coverage` passes the threshold; badge renders.

**U7 · 1 h · Property tests for the invariants.**
Prompt:
```
Add fast-check property tests that assert, over randomly generated small corpora (2–8 sittings, 1–5 units): (a) for every entrant, the ranking as of any date is unchanged when all papers on/after that date are removed (look-ahead); (b) choice-aware coverage is monotonic non-decreasing as the cut grows from 0.3 to 0.5 to 0.7; (c) every ranking is a permutation of the syllabus topics. Keep them fast (<2s). verify green.
```
*Done-when:* new property tests pass; total test count rises.

**U8 · 1 h · Scorer edge fixtures + docs sync.**
Prompt:
```
Add three more hand-computed scorer fixtures: a section that is "attempt 2 of 3" mixing a 10-mark and two 5-mark questions; an OR-group of three alternatives; a question mapped to two topics where only one is studied. Compute the expected values yourself and assert them. Update PROTOCOL.md only if a rule needed clarifying. verify green.
```
*Done-when:* fixtures pass; PROTOCOL still accurate.

### Phase 2 — Real subject #1 (THE GATE — Operating Systems)

> Read §4 before U10. This is the phase that turns the repo from a demo into a portfolio piece. **No agent prompt in this phase may produce paper data.**

**U9 · [Agent] · 1–2 h · Build the parsing helper (a tool, not data).**
Prompt:
```
Create an OPTIONAL helper `scripts/parse-pdf.ts` (run: `npm run kya:parse -- <path-to-local-pdf> <univ/subject>`), used only by me, that reads a PDF I have placed under local/ and writes a DRAFT CSV to local/ in the exact format of docs/templates/paper-template.csv. Rules:
- Rules first: detect question numbers, sections and marks with regex/layout heuristics; only call an LLM as a fallback for a line it cannot parse. Put any LLM call behind a single file src/llm.ts, read the key from .env, temperature 0, one paper per call, and cache responses by content hash under local/.
- Output goes to local/ ONLY (never to ledger/, never committed). Fill descriptor with a neutral placeholder plus the detected topic guess; DO NOT copy full question text into descriptor (keep it <= 8 words). Leave topic_ids blank for me to fill.
- If the PDF is scanned/unparseable, exit with a clear message telling me to enter it by hand — never guess marks or invent questions.
- Add .env to .gitignore if not already; document usage in docs/ADD-A-UNIVERSITY.md under an "optional helper" heading. Do NOT add this to `npm run verify` (it needs a key and a local file). verify green without it.
```
*Done-when:* the script exists and is documented; `verify` green; nothing it writes is tracked by git (`git status` clean after a dry run).

**U10 · [You] · 1 h · Source the papers + fix the syllabus.** See §4 steps 1–3. Scaffold with `npm run kya -- new-subject upes/os "Operating Systems"`, put the real PDFs in `local/`, write the real syllabus into `ledger/upes/os/syllabus.json`, set `fixed_on` to today, add provenance lines. *Done-when:* `syllabus.json` reflects the official syllabus; `PROVENANCE.md` has one line per paper with its official URL.

**U11 · [You] (+U9 helper) · 2 h · Enter and validate 4 sittings.** See §4 steps 4–5. For each of 4 papers: optionally run the helper on the local PDF to get a draft, then **check every row against the PDF**, fill `topic_ids` from your fixed syllabus, keep descriptors ≤ 8 words. `npm run kya -- import-csv <csv> upes/os` then `npm run kya -- validate upes/os` (fix the sheet until it passes — the validator catches marks that don't add up). *Done-when:* `validate upes/os` is green for 4 real sittings.

**U12 · [You] · 0.5 h · First real Reveal.** `npm run kya -- backtest upes/os --write`, `npm run kya -- readme`, `npm run demo`, open the page, select `upes/os`, press Reveal on the latest sitting. `npm run kya -- doctor` should now show `upes/os` with no "synthetic" flag. Commit (`data: add UPES Operating Systems, 4 sittings`). *Done-when:* the README scoreboard shows a real `upes/os` row; verify green.

**U13 · [You] · 1 h · Complete the subject.** Enter the remaining OS sittings (all 7), same procedure. *Done-when:* all sittings in; `backtest --write`; verify green.

**U14 · [You] · 0.5 h · Blind re-entry error check.** Re-enter ONE paper from scratch without looking at your first version; diff the two CSVs. If more than ~2% of rows differ, re-check every paper. Record the error rate in `docs/CASE-STUDY.md`. *Done-when:* error rate known and acceptable.

**U15 · [Agent] · 0.5 h · Retire the synthetic subject.**
Prompt:
```
Delete the synthetic subject ledger/demo-univ/ and scripts/make-synthetic.mjs and their references (README "What is real" table, the `synthetic` npm script, any doc mention), now that a real subject exists. Keep the `synthetic` FLAG in the schema and the SAMPLE watermark logic (still used to label any future synthetic data). Regenerate the README scoreboard and run `npm run verify`.
```
*Done-when:* no synthetic corpus remains; verify green; README shows only real data.

### Phase 3 — Public artifacts

**U16 · [You] · 0.5 h · Deploy real data + screenshot.** Push; confirm Pages shows the real Time Machine. Open the generated Sheet (`web/sheets/…` or `npm run kya -- sheet upes/os --as-of <next>`), screenshot at 1080 px, and add the image to the README (commit the PNG under `docs/img/`). *Done-when:* live URL shows real data; README has a real Sheet image.

**U17 · [You] · 1 h · Two-minute recording.** Record the §3-U16 page following the script in the blueprint's Demo section; upload (Loom/YouTube-unlisted) and link it at the top of the README. *Done-when:* the link plays and shows a real Reveal.

### Phase 4 — Real subject #2 (Design and Analysis of Algorithms)

**U18–U21 · [You] · ~4 h · Repeat U10–U14 for `upes/daa`.** Same procedure, second subject. Split across sessions. *Done-when:* `daa` scoreboard is real; verify green.

### Phase 5 — The live freeze (do this ≥ 7 days before a real OS/DAA exam)

**U22 · [Agent] · 0.5 h · Freeze-proof helper.**
Prompt:
```
Add a script `scripts/freeze-proof.sh` that, given a run-id, prints the exact commands to (1) git add/commit/tag the frozen files, (2) `ots stamp` the prediction.json, and (3) save the file's public GitHub URL at web.archive.org, then reminds me to paste the tag name, the .ots path, and the Wayback URL into manifest.json for that run. It should not perform network actions itself. Add a `verify-ots` note to SECURITY.md. verify green.
```
*Done-when:* the script prints correct, copy-pasteable commands.

**U23 · [You] · 1 h · Freeze for real.** See §5. *Done-when:* the manifest shows a `live` run with a git tag, an `.ots` proof committed, and a Wayback URL; `npm run kya -- doctor` reports no live-run problems; README ledger shows LIVE.

### Phase 6 — Evidence + the case study

**U24 · [You] · 1 h · Student comprehension test.** Show 5 real classmates the sample Sheet (canvas link in the blueprint) then a real one; ask what they'd revise first, what "7/8" and the dots mean, what "thin" means; tally misreadings. *Done-when:* 5 tallies + verbatim quotes recorded (anonymously).

**U25 · [You] · 0.5 h · Reader test.** 3 engineer friends get only the repo URL and 60 seconds; note whether they call it "an exam predictor" (bad) or "a scoreboard that checks itself" (good). One stranger clones and runs `npm ci && npm run verify`; time it. *Done-when:* results noted; if ≥2 misread the README, do U26 first.

**U26 · [Agent] · 0.5 h · README top polish (only if the reader test failed).**
Prompt:
```
Readers are misreading the project as "an app that predicts exam questions". Rewrite ONLY the first screen of README.md (the one-liner and the sentence under it) to make unmistakable, in plain words, that this is an open scoreboard that FREEZES a priority list before an exam and SCORES it afterwards against simple baselines — it does not predict the paper. Do not touch the numbers, the tables, or anything below the fold. verify green.
```
*Done-when:* a fresh reader describes it correctly.

**U27 · [You] · 2 h · Write the case study.** Fill every `[BRACKET]` in `docs/CASE-STUDY.md` from committed `scoreboard.json`/`scorecard.json` only; delete any line whose number doesn't exist yet. Keep it ≤ 600 words. Add the résumé bullets from the blueprint, filling brackets the same way. *Done-when:* no unsourced claim remains; a friend can trace every number to a file.

### Phase 7 — Optional features (only after P2; all [Agent], pick what helps)

Each is one self-contained prompt. Do them for depth once the real thing exists.

**U28 · Faculty repetition report.**
```
Add `kya report <univ/subject>` that prints and writes a small "repetition report": for each past sitting, the share of marks coming from the 5 most-asked topics to date, and the share of the paper that was out-of-syllabus. Add it to the demo page as a second tab. Add a test on the demo... on a small fixture. verify green.
```

**U29 · Search & filter on the page.**
```
Add a keyword filter and a unit filter to the history map and the sheet on web/index.html (client-side only, no libraries). Keep it working from file://. Add/extend the DOM smoke test. verify green.
```

**U30 · An external entrant from a committed list.**
```
Add support for an "external" entrant read from a committed JSON file at ledger/<univ>/<subject>/external/<name>.json (a plain ranked list of topic ids with a source note), so a dated real "important-questions" list or a cached model guess can be scored on the same board at equal topic count. It must obey the look-ahead rule (the list's source date is recorded and it may only be scored on later sittings). Add a fixture and a test. Never fetch anything at runtime. verify green.
```

**U31 · Bloom / question-type tags surfaced.**
```
Where questions carry the optional question_type/bloom fields, show a small distribution (counts per type) on the demo page and in `kya report`. Do not require the fields. verify green.
```

**U32 · Hindi Sheet.**
```
Add an optional `--lang hi` flag to `kya sheet` that renders the fixed strings ("Priority order, not guaranteed questions", column headers, the depth label) in Hindi; keep topic names as entered. Add a snapshot test of the rendered strings. verify green.
```

**U33 · Sheet PNG renderer.**
```
Add `kya sheet --png` that renders the Sheet HTML to a 1080px-wide PNG with Playwright (reuse the browser from the e2e setup; document the one-time install). Do not add it to `npm run verify`. verify green without it.
```

**U34 · Release workflow + tag.**
```
Add a GitHub Actions release workflow that, on a version tag, runs verify and attaches the built web/ as a zip to a GitHub Release, with notes pulled from CHANGELOG.md. Tag v1.0.0 once two real subjects and one live scorecard exist.
```

**U35 · all-contributors + polish.**
```
Add an all-contributors table to the README and a CONTRIBUTORS section; add "good first issue" labels documentation to CONTRIBUTING.md. verify green.
```

---

## 4. The data-entry procedure (the human core of Phase 2/4)

This is the work no agent can do for you, and the reason the repo is worth anything.

1. **Confirm the source is legitimate.** Use only papers the institution publishes itself, or that candidates are allowed to keep. For UPES, the library question bank page lists them with direct links (verify its terms of use once). Download each PDF **into `local/`**. Nothing from a university that collects its papers (e.g. Chandigarh University); those circulating scans are off-limits.
2. **One provenance line per paper** in `PROVENANCE.md`: the official URL, the sitting (`YYYY-MM`), the course code, the set, the date you fetched it, and the class (Official / Candidate-retained).
3. **Fix the topic list first.** Write `ledger/upes/os/syllabus.json` from the **official syllabus** (units → topics, stable ids like `t-page-replacement`). Set `fixed_on` to today — before you open the papers you'll test on. This ordering is what the look-ahead test protects.
4. **Enter each paper as CSV rows** (start from `docs/templates/paper-template.csv`, or the draft from the U9 helper). One row per question: `sitting, course_code, set, section, attempt, of, number, marks, or_group, descriptor, topic_ids, question_type, page, source_url`.
   - `descriptor`: a neutral label of **8 words or fewer** — "page replacement numerical", never the question's wording.
   - `topic_ids`: one or more ids from your fixed syllabus, separated by `;`. Leave blank if genuinely out of syllabus.
   - `or_group`: give the same label to alternatives a student chooses between.
   - `attempt`/`of`: repeat the section's rule on every row of that section (e.g. a "answer any 4 of 6" section is `attempt 4, of 6`).
5. **Import and validate.** `npm run kya -- import-csv <csv> upes/os` then `npm run kya -- validate upes/os`. The validator rejects sections whose choices don't match `of`, and sittings whose sections don't add up to the paper's maximum — fix the sheet and re-import until green. Then `backtest --write`, `readme`, commit.

**Guardrails while doing this:** keep sessions under ~3 hours (fatigue = errors); do the blind re-entry check (U14); if the helper's draft and the PDF ever disagree, the **PDF wins** and you fix the row by hand.

---

## 5. The live-freeze procedure (Phase 5)

Do this at least 7 days before a real exam for a subject you've entered.

1. Make sure the corpus is committed and `verify` is green.
2. Freeze: `npm run kya -- freeze upes/os --as-of <YYYY-MM of the upcoming exam> --status live`. This writes `prediction.json` + `sheet.html`, records both hashes in `manifest.json`, and refuses a second list for the same slot.
3. Make it undeniable (the U22 helper prints these):
   - `git add -A && git commit -m "freeze: upes/os live <YYYY-MM>" && git tag freeze/upes-os-<YYYY-MM> && git push --tags`
   - `ots stamp ledger/upes/os/runs/<YYYY-MM>-live/prediction.json` (install the OpenTimestamps client once), then commit the resulting `.ots` file.
   - Save the file's public GitHub URL at `web.archive.org/save`, and record the tag, the `.ots` path, and the Wayback URL in that run's entry in `manifest.json`.
4. `npm run kya -- doctor` — it should report no problems for the live run. `npm run kya -- readme`, commit.
5. **After the exam, once the university publishes that paper:** enter it as a new sitting, then `npm run kya -- score-run upes/os <YYYY-MM>-live`. This scores the **frozen file** (not a recomputed list) and writes `scorecard.json`. Update the README and the case study with the real result — win or lose.

---

## 6. When the agent gets it wrong

- **`verify` went red.** Paste the full error back with: "verify is failing after your change; fix it without weakening any check or editing frozen runs." Don't accept a change that comments out or relaxes a test.
- **It edited a frozen run or a hash.** Reject the diff: "You changed a file under runs/ or a hash in manifest.json — revert that; frozen runs are immutable." 
- **It invented data.** Reject immediately: "You generated paper/question/number data — remove it; only I supply real papers." This is the one unrecoverable mistake; catch it in the diff.
- **It added a runtime dependency to the demo.** "web/index.html must work from file:// with no network; remove the dependency."
- **It made a huge unrelated refactor.** "Scope to the task; revert unrelated changes and re-do just <the unit>."
- **Scope creep from features.** If you catch yourself doing Phase 7 before Phase 2 is done, stop — a beautiful feature on synthetic data adds nothing a reader trusts.

---

*Ledger of truth: the repo is done as an engine; this playbook exists so the remaining work is real papers, one public commitment, and an honest write-up — not another document. When P2 is green on GitHub, you have a portfolio piece; everything after that is depth.*
