# The method under test has no tunable parameters

- Status: accepted
- Date: 2026-09-20

## Context
With 5-10 sittings per subject any tuned parameter is fitted to the test data.

## Options considered
Tuned recency / shrinkage, ML models.

## Decision and consequences
Total past marks per topic is primary. Anything cleverer is a challenger with constants declared in code and must beat it on real data before it ships.
