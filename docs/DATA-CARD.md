# Data card

**What the public data is:** per question - number, section, marks, OR-group, a neutral descriptor (<= 8 words), topic ids, optional type / Bloom level / page; per paper - sitting, course code, set, section rules, maximum marks, official source URL. **What it is not:** question text, answers, scans, or anything about any person.

| Field | Note |
|---|---|
| Motivation | Let anyone check whether a revision-priority method beats simple heuristics on real past papers |
| Sources | Only papers an institution publishes itself or lets candidates keep; one provenance line each |
| Collection | Transcribed by a person (or a helper, then hand-checked). Section rules and marks are validated mechanically |
| Labels | Topic ids come from a syllabus fixed *before* test papers are opened. Reviewed labels in `topic_ids`; first-pass machine labels, when used, kept in `topic_ids_machine` |
| Known weaknesses | Topic mapping is a judgment call; course codes and syllabi drift; several sets may exist per sitting; small number of sittings per subject |
| Synthetic data | `ledger/demo-univ/` is generated and flagged `synthetic: true`; every output that includes it says so |
| Licence | Derived statistics CC BY 4.0. Papers remain their universities' property and are not redistributed |
| Takedown | Open an issue or email the maintainer; derived files are removed within 72 hours and the removal is logged |
