# Related repositories - what exists, what was borrowed

Surveyed on **20 Sep 2026** with the GitHub search API and each project's README. Star counts are as seen that day. "Not found" means not found in this survey, not that it does not exist.

## Exam-paper analysis and prediction

| Repository | Stars | What it does | Borrowed / not |
|---|---|---|---|
| Anand-1812/pyq-analyzer | 1 | Syllabus PDF + papers -> topic mapping by sentence-embedding similarity; forecast from frequency, year coverage and recency; boosts topics that recur every 2-3 years; clusters similar questions; CLI + Streamlit | **Borrowed:** recency and gap-aware ideas, as *challenger entrants* that must beat plain counting on the scoreboard. Later: embedding-assisted mapping suggestions |
| AdwaithSaiju/mimir (KTU) | 2 | Drop-in CSV per subject (`year, module, topic, marks, question_type...`); scores by frequency, appearance gaps, marks | **Borrowed:** CSV as the contributor-friendly entry format; `question_type` field |
| M0ON-W/exam-paper-analyzer | 2 | Analyses already-digitised question banks; per-question marks/knowledge point/difficulty; multi-year importance with source location (paper, question, page); states it uses no hidden formula and does not predict what will surely be tested | **Borrowed:** traceability fields (`number`, `page`); the no-hidden-formula, no-guarantee stance |
| bhagyashreebhamagod/examgenie-smart-analyzer | 0 | FastAPI + Next.js; OCR fallback with page numbers; syllabus hierarchy; AI classification with confidence; repeated / frequent / never-asked / new topics; heatmaps; search; PDF/Excel/CSV/JSON export | **Borrowed:** topic x sitting history map; never-asked list. Later: search/filter, exports, OCR helper |
| Ayushhgit/ExamRAG | 3 | Extraction; question-type rules with LLM fallback; Bloom levels; DBSCAN repeat detection; predictor; mock exams; answer keys; planner; concept graph; RAG practice | **Borrowed:** rules-first-then-LLM pattern; optional type and Bloom tags. **Rejected:** mock exams, answer keys, tutor chat, planner - unverifiable and off-thesis |
| krish902/question-paper-difficulty-analyzer | 3 | BERT classifier for Bloom levels on a 3,510-question set; reports 98.52% validation accuracy (its own claim); two conference papers | Later: Bloom tags feed a repetition/quality report for faculty |
| asimpathan1509-cmyk/ai-exam-gap-analyzer | 2 | Syllabus + PYQ trends + student performance -> high-weightage, low-prepared topics | Later: a local-only "I have revised this" checklist (no accounts) |
| mahivram/Paper_Analyzer · naakaarafr/Previous-Year-Question-Paper-Analyzer · hitesh111630/Paper_Analysis_AI · sujaldwivedi601-ctrl/analytic_app | 0-3 | Upload papers -> LLM extracts common topics / chat / answers | Confirms the calculation is a commodity |
| shuangzhebai/gaokao-analyzer | 2 | IRT psychometrics + paper generation | Rejected: needs student response data |
| Karthikg1908/Vtu-Question-Papers-Hub (11) · VAIBHAVBABELE/vaibhavbabele.github.io (47) | | Paper archives / student resource hubs on GitHub Pages | Contribution-friendly structure; Pages hosting |

**What none of them does (not found):** freeze a list before an exam, compare itself with the shortcuts students already use, or publish a reproducible score. That gap - evaluation, not analysis - is this project's reason to exist.

## Frozen predictions, proofs, evaluation discipline

| Repository | Stars | Idea | Used here as |
|---|---|---|---|
| mverab/WorldCupBench | 14 | LLM predictions frozen before kick-off, scored live; leaderboard injected into the README between markers; JSON-Schema-validated predictions; freeze provenance fields; `--dry-run` | README scoreboard markers + `kya readme --check`; `schema/*.schema.json`; provenance in every frozen run. Later: Brier score once lists carry probabilities |
| opentimestamps/opentimestamps-client | 418 | Free, Bitcoin-anchored timestamp proofs | The third-party witness for every live freeze |
| opentimestamps/javascript-opentimestamps | 150 | JS library (last push Mar 2023) | Not embedded - stale; the Python client is documented instead |
| letsseal/letsseal | 371 | An open standard for sealing files (unaltered, by a known certificate, by a date) | Candidate second witness `[VERIFY]` |
| sauravsingla/Time_Series | 7 | Leakage-safe walk-forward benchmark; "start with strong baselines... adopt complexity only when evidence supports it"; a find-the-right-doc table | The principle, and the README's document index |
| zachisit/july-backtester | 10 | Point-in-time universes, walk-forward, Monte Carlo / block bootstrap | The point-in-time idea = our `before()` guard |

## Repository craft

matiassingers/awesome-readme (21.5k) · othneildrew/Best-README-Template (16.4k) · race2infinity/The-Documentation-Compendium (6.0k) -> README structure. architecture-decision-record (17.0k) · adr/madr (2.5k) · npryce/adr-tools (5.7k) -> `docs/adr/`. Keep a Changelog, Contributor Covenant, CITATION.cff, all-contributors -> well-known conventions, not re-verified in this survey.
