# Headline metric is attemptable marks at a share of ranked topics, against the best simple heuristic

- Status: accepted
- Date: 2026-09-20

## Context
Hit-rate is inflated by papers that must cover every unit and ignores internal choice.

## Options considered
Hit-rate at k, Brier only, a bare accuracy percentage.

## Decision and consequences
Coverage respects attempt-n-of-m and OR-pairs; random is context, last-paper-first or syllabus order is the adversary; the cut is by topic count and says so.
