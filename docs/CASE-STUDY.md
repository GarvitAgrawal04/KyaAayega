# Case study: UPES Operating Systems

**Problem.** The night before an exam, students often find several competing "important questions" lists with no objective way to evaluate them, because nobody has scored them against real exams.

**Approach.** We treat every method of picking what to study as an entrant that ranks syllabus topics. We replay historical sittings walk-forward with a strict look-ahead guard, score marks that a student could actually attempt under real section choice rules, freeze our ranking before the exam, and score the frozen file once the paper appears.

**Data.** UPES officially published past papers for B.Tech CSE Operating Systems (course codes CSEG2007 and CSEG2060). The dataset spans 7 sittings (2018-12 to 2024-12) and 98 questions, transcribed in 4 hours. The topic list was fixed on 2026-09-20 before test papers were examined.

**Result.** At the top 50% of topics by count, plain counting of past marks (B3) covered 80.0% of available marks on average. Last-paper-first (B2) covered 74.5%, syllabus order (B1) covered 57.0%, and a random half of topics (B0) covered 60.1% across 4 test sittings (2021-12 through 2024-12). Plain counting finished ahead of the best simple heuristic in 2 of the 4 test sittings, with a median difference of +3.0 percentage points. Verdict: unclear (proceed, say so publicly, let the live cycle speak). The recency challenger C1 (77.5%) did not beat plain counting, while the gap-aware challenger C2 (80.0%) tied it.

**Live commitment.** The list for the December 2025 examination was frozen on 2026-09-27 with SHA-256 hash `154939e821125330a1c010a2f8261009431e9d44824353fcf5611d4ba5f72a2c`. Scorecard: pending publication of the official paper.

**What surprised me.** Past-paper questions cluster around core syllabus modules much more tightly than syllabus order suggests. However, last year's paper remains an aggressive baseline, matching or exceeding multi-year counts in half the test sittings.

**What I would do differently.** I would record section choices and OR-group boundaries during the first reading rather than retrofitting them, which saves transcription time.

**Engineering notes.** Pure functions with plain JSON and CSV files. The test suite includes hand-calculated scoring fixtures, property-based tests, an automated look-ahead mutation test, and Playwright end-to-end browser tests. Continuous integration reproduces every published number with zero server or database dependencies.
