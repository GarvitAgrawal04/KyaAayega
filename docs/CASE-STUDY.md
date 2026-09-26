# Case study - fill in with real numbers only

> Template. Every [BRACKET] is replaced by a value copied from a committed `scoreboard.json` / `scorecard.json`, or the sentence is deleted.

**Problem.** The night before an exam a student has many "important questions" lists and no way to know which deserves trust, because none has ever been scored.

**Approach.** Treat every way of choosing what to revise first as an *entrant* that ranks the syllabus; replay history walk-forward with a hard look-ahead guard; score marks a student could actually attempt, respecting the paper's choice rules; freeze a list before a real exam and score the frozen file afterwards.

**Data.** [UNIVERSITY]'s officially published papers for [SUBJECTS]: [N] sittings, [Q] questions, transcribed in [H] hours. Topic list fixed on [DATE].

**Result.** At the top 50% of topics, plain counting of past marks covered [X]% on average, last-paper-first [Y]%, syllabus order [Z]%, random [R]% over [T] test sittings. It was ahead of the best simple heuristic in [K] of [T]. Verdict: [VERDICT]. The recency and gap-aware challengers [DID / DID NOT] beat plain counting.

**Live commitment.** List for [EXAM] frozen on [DATE] (hash [HASH], tag, OpenTimestamps proof, Wayback snapshot). Scorecard: [RESULT or "pending publication of the paper"].

**What surprised me.** [ONE OR TWO HONEST SENTENCES.]

**What I would do differently.** [ONE OR TWO.]

**Engineering notes.** Pure functions + plain files; 25+ tests including hand-computed scorer fixtures, a look-ahead test and a tamper test; CI reproduces every published number; no server, database or personal data.
