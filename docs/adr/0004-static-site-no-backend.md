# The demo is static HTML reading a generated data file

- Status: accepted
- Date: 2026-09-20

## Context
A portfolio demo must never be down, and there is no user data to store.

## Options considered
Next.js server, Streamlit, Supabase.

## Decision and consequences
Zero runtime dependencies; works from file://; deployable to any static host.
