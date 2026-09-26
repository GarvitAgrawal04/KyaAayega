# Add a university or subject

You need: an **official or candidate-retained** source of past papers, the official syllabus, and about 20-30 minutes per paper.

1. **Check the source.** The institution publishes the papers itself, or candidates are allowed to keep them. Anything else is not accepted. Add one line per paper to `PROVENANCE.md` with the official URL.
2. **Fix the topic list first.** Create `ledger/<univ>/<subject>/syllabus.json` from the official syllabus (units -> topics, stable ids like `t-page-replacement`) and set `fixed_on` to today - *before* opening the papers you will test on.
3. **Enter the papers in a spreadsheet.** Start from `docs/templates/paper-template.csv`. One row per question: sitting (`YYYY-MM`), course code, set, section, the section's `attempt` and `of`, question number, marks, OR-group (same label for alternatives), a neutral descriptor of **8 words or fewer** (never the question text), topic ids separated by `;` (empty if out of syllabus), optional question type and page.
4. `npm run kya -- import-csv my-papers.csv <univ>/<subject>` then `npm run kya -- validate <univ>/<subject>`. Validation fails if a section's choices do not match `of`, or if sections do not add up to the paper's maximum - fix the sheet, re-import.
5. `npm run kya -- backtest <univ>/<subject> --write`, `npm run kya -- readme`, `npm run verify`, open a pull request. Report what the scoreboard says even when last-paper-first wins.
6. Keep PDFs and any transcription in `local/` (git-ignored). Never commit them.

Course codes change over the years for the same subject: map by subject, record each code in the row. If a sitting had several sets, enter one and name it in `set`.
