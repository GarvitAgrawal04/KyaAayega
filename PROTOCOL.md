# Scoring protocol v1

Fixed before any list is frozen; changes create v2 and never touch frozen runs.

- **Cuts:** the top 30%, 50% and 70% of a ranked list, by topic count (ceiling). Headline cut: 50%.
- **Answerable:** a question counts only if every topic it is mapped to is inside the cut. Questions mapped to no syllabus topic never count, and stay in the maximum.
- **Coverage (primary):** per section, take the best answerable questions up to the section's attempt limit, one per OR-group; sum over sections; divide by the paper maximum computed the same way over all questions.
- **Coverage (fallback):** marks of answerable questions divided by all printed marks.
- **Marks split:** a question mapped to k topics gives each topic marks/k when building history.
- **Entrants:** B0 random (mean of 200 seeded permutations), B1 syllabus order, B2 last-paper-first, B3 total past marks (ties: times asked, then syllabus order).
- **Challengers:** C1 recency-weighted marks (0.85 per sitting of age) and C2 gap-aware marks (x1.25 when a topic is due by its own average gap, x0.8 when just asked and it normally skips sittings). Constants are declared in code and never tuned on scored sittings. A challenger replaces B3 as the shipped method only if, on real data, it beats B3 on the mean and in at least half the test sittings; the switch is recorded in a decision record and applies to future freezes only.
- **Adversary:** whichever of B1/B2 has the higher mean on the same sittings - chosen after the fact, in the baselines' favour. Random is context, never the headline.
- **Walk-forward:** minimum three past sittings before the first scored sitting.
- **Verdict:** fewer than 4 test sittings - insufficient. Ours ahead in under half the sittings and median difference <= 0 - obviously nothing. Ahead in at least two-thirds, median > 0 and mean still > 0 without the best sitting - clearly something. Anything else - unclear; say so.
- **Freeze:** one list per subject per exam slot; canonical JSON; SHA-256 in the manifest; Git tag; OpenTimestamps proof; Wayback snapshot; at least 7 days before the paper. Superseding is allowed only before that deadline and the superseded run stays visible.
- **Scoring a frozen run:** uses the rankings stored in the frozen file. Published within 72 hours of the paper becoming legitimately available. Both the machine-only and the reviewed topic mapping are scored once both exist.
