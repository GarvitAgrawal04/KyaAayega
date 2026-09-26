# Changelog
Format: Keep a Changelog. Versioning: SemVer for code; `PROTOCOL.md` is versioned separately.

## [0.3.0] - 2026-09-21
### Added
- `kya new-subject <univ/subject> "Title"` scaffolds a subject (syllabus skeleton + CSV template) so adding a university is one command.
- `kya doctor` reports environment and corpus health (synthetic flags, papers without a real source, live runs missing a timestamp proof, README markers).
- Base files for easy future work: `.editorconfig`, `.nvmrc`, `.prettierrc.json` + ignore, `Makefile`, `.github/dependabot.yml`, `.devcontainer/`, `local/README.md`, `docs/AGENT-GUIDE.md`.
- `format` / `format:check` scripts (Prettier); `engines: node >= 20`.

## [0.2.0] - 2026-09-20
### Added
- CSV import/export for spreadsheet data entry, with a lossless round-trip test.
- The one-page Sheet generator; every freeze now writes and hashes `sheet.html`.
- Challenger entrants C1 (recency-weighted) and C2 (gap-aware), constants declared in code.
- README scoreboard generated between markers, with a CI staleness check.
- JSON Schemas exported to `schema/`; optional question metadata (type, Bloom level, page).
- History map and never-asked topics on the demo page; docs set, decision records, templates.

## [0.1.0] - 2026-09-20
### Added
- Schemas with structural validation, entrants B0-B3, look-ahead guard, choice-aware scorer, walk-forward verdict, freeze + manifest, score-run, offline Time Machine, synthetic corpus, 17 tests, CI.
