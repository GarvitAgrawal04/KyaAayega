# Agent guide — rules for any AI coding agent working in this repo

Paste the block below at the top of every task prompt. These invariants are non-negotiable; a change that breaks one is wrong even if it "works".

## Invariants
1. **Never invent evidence.** Do not generate, guess, or fabricate exam questions, marks, papers, reviews, users, or result numbers. You build tools and code; real papers are supplied and verified by a human. Fabricating a corpus destroys the entire point of this project.
2. **No verbatim question text or PDFs in the repo.** Public data holds descriptors of 8 words or fewer. The schema enforces this; do not weaken it.
3. **Frozen runs are immutable.** Never edit anything under a `runs/<...>/` folder or change a hash in `manifest.json`. Correct data by adding a new, visible commit; supersede a list only with a new run.
4. **Keep `npm run verify` green.** It runs: types, hash checks, the look-ahead test, scoreboard reproduction, the README-staleness check, and all tests. Run it before you finish. If it is red, you are not done.
5. **The primary ranking method has no tunable parameters.** A cleverer method is added as a *challenger* with constants declared in code, never tuned on the sittings it is scored on.
6. **No network or live API on the demo path.** `web/index.html` must work from `file://`.
7. **Small, conventional commits** (`feat:`, `fix:`, `data:`, `docs:`, `test:`), a `CHANGELOG.md` line, and regenerate the README scoreboard if any number changed (`npm run kya -- readme`).

## Definition of done for any task
- `npm run verify` passes from a clean state.
- New behaviour has a test.
- `CHANGELOG.md` updated; docs touched if the public interface changed.
- No secrets, PDFs, or question text added; `local/` and `.env` remain ignored.
