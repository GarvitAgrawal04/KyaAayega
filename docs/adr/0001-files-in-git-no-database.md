# Plain JSON files in Git instead of a database

- Status: accepted
- Date: 2026-09-20

## Context
One writer, public read-only outputs, and a need for diffs, history and reproducibility.

## Options considered
Postgres or SQLite.

## Decision and consequences
Files: Git history is the audit log and the backup; CI can re-derive every number. Cost: no ad-hoc SQL. Revisit when there is more than one writer.
