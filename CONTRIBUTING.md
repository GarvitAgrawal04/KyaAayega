# Contributing

The most valuable contribution is **real data from a legitimate source** - see [docs/ADD-A-UNIVERSITY.md](docs/ADD-A-UNIVERSITY.md).

## Ground rules
- Sources: papers an institution publishes itself, or lets candidates keep. One line per paper in `PROVENANCE.md`. No PDFs, no question text, nothing of unknown origin.
- No invented evidence of any kind: numbers come from committed scoreboards and scorecards only.
- A new entrant declares its constants in code, obeys the look-ahead guard (add the test), and gets no special treatment on the scoreboard.
- Frozen runs are never edited. Mistakes are corrected by a visible superseding run before the deadline, or lived with.

## Workflow
```bash
npm ci
npm run verify          # must be green before and after your change
npm run kya -- readme   # if scoreboards changed
```
Commits follow Conventional Commits (`feat:`, `fix:`, `data:`, `docs:`, `test:`). Add a line to `CHANGELOG.md`. Disputing a topic mapping? Open a "Challenge a mapping" issue - the outcome is recorded either way.
