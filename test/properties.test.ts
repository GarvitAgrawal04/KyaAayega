/**
 * Property-based tests using fast-check.
 * These verify structural invariants that must hold for ALL possible inputs,
 * not just hand-crafted fixtures.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Paper, Syllabus, TPaper, TSyllabus, topicIds } from "../src/schemas";
import { rankTotalMarks, rankRandom, before, ENTRANTS } from "../src/rank";
import { coverageChoiceAware, coveragePrinted, studiedSet } from "../src/score";

// ── Arbitrary Generators ────────────────────────────────────────────────────

/** Generate a syllabus with N topics across M units */
function arbSyllabus(minTopics = 3, maxTopics = 12): fc.Arbitrary<TSyllabus> {
  return fc.integer({ min: minTopics, max: maxTopics }).chain((n) => {
    const topics = Array.from({ length: n }, (_, i) => ({
      id: `t-${i}`,
      name: `Topic ${i}`,
      aliases: [],
    }));
    // split into 1–3 units
    const nUnits = Math.min(3, n);
    const units = Array.from({ length: nUnits }, (_, u) => ({
      id: `u${u}`,
      name: `Unit ${u}`,
      topics: topics.slice(Math.floor((u * n) / nUnits), Math.floor(((u + 1) * n) / nUnits)),
    })).filter((u) => u.topics.length > 0);
    return fc.constant(
      Syllabus.parse({
        university: "prop",
        subject: "test",
        title: "Property Test",
        fixed_on: "2020-01-01",
        units,
      }),
    );
  });
}

// ── Property Tests ──────────────────────────────────────────────────────────

describe("property: every entrant is a permutation of the syllabus", () => {
  it("B3 (total marks) always returns every topic exactly once", () => {
    fc.assert(
      fc.property(arbSyllabus(), (syl) => {
        const corpus = [arbPaperSync(syl, "2020-12"), arbPaperSync(syl, "2021-12"), arbPaperSync(syl, "2022-12")];
        const ranking = rankTotalMarks(corpus, syl, "2023-12");
        const sorted = [...ranking].sort();
        const expected = [...topicIds(syl)].sort();
        expect(sorted).toEqual(expected);
        expect(ranking.length).toBe(topicIds(syl).length);
      }),
      { numRuns: 50 },
    );
  });

  it("all entrants return permutations of the syllabus", () => {
    fc.assert(
      fc.property(arbSyllabus(), (syl) => {
        const corpus = [arbPaperSync(syl, "2020-12"), arbPaperSync(syl, "2021-12"), arbPaperSync(syl, "2022-12")];
        const allIds = [...topicIds(syl)].sort();
        for (const [key, entrant] of Object.entries(ENTRANTS)) {
          const ranking = entrant.rank(corpus, syl, "2023-12");
          expect([...ranking].sort(), `entrant ${key} is not a permutation`).toEqual(allIds);
        }
        // B0 too
        const b0 = rankRandom(syl, "prop-seed");
        expect([...b0].sort()).toEqual(allIds);
      }),
      { numRuns: 30 },
    );
  });
});

describe("property: look-ahead invariance", () => {
  it("adding future papers never changes the ranking for any entrant", () => {
    fc.assert(
      fc.property(arbSyllabus(4, 8), (syl) => {
        const past = [arbPaperSync(syl, "2019-12"), arbPaperSync(syl, "2020-12"), arbPaperSync(syl, "2021-12")];
        const future = arbPaperSync(syl, "2023-12");
        const all = [...past, future];
        const asOf = "2022-12";

        for (const [, entrant] of Object.entries(ENTRANTS)) {
          const withoutFuture = entrant.rank(past, syl, asOf);
          const withFuture = entrant.rank(all, syl, asOf);
          expect(withFuture).toEqual(withoutFuture);
        }
      }),
      { numRuns: 30 },
    );
  });
});

describe("property: coverage is monotonic with study effort", () => {
  it("studying more topics never decreases coverage", () => {
    fc.assert(
      fc.property(arbSyllabus(5, 10), (syl) => {
        const paper = arbPaperSync(syl, "2022-12");
        const ranking = rankTotalMarks([arbPaperSync(syl, "2020-12"), arbPaperSync(syl, "2021-12")], syl, "2022-12");

        const cov30 = coverageChoiceAware(paper, studiedSet(ranking, 0.3));
        const cov50 = coverageChoiceAware(paper, studiedSet(ranking, 0.5));
        const cov70 = coverageChoiceAware(paper, studiedSet(ranking, 0.7));
        const cov100 = coverageChoiceAware(paper, studiedSet(ranking, 1.0));

        expect(cov50).toBeGreaterThanOrEqual(cov30 - 1e-9);
        expect(cov70).toBeGreaterThanOrEqual(cov50 - 1e-9);
        expect(cov100).toBeGreaterThanOrEqual(cov70 - 1e-9);
      }),
      { numRuns: 50 },
    );
  });

  it("coverage is always between 0 and 1 inclusive", () => {
    fc.assert(
      fc.property(arbSyllabus(4, 8), fc.double({ min: 0.1, max: 1, noNaN: true }), (syl, cut) => {
        const paper = arbPaperSync(syl, "2022-12");
        const ranking = rankTotalMarks([arbPaperSync(syl, "2020-12")], syl, "2022-12");
        const cov = coverageChoiceAware(paper, studiedSet(ranking, cut));
        expect(cov).toBeGreaterThanOrEqual(0);
        expect(cov).toBeLessThanOrEqual(1);

        const covP = coveragePrinted(paper, studiedSet(ranking, cut));
        expect(covP).toBeGreaterThanOrEqual(0);
        expect(covP).toBeLessThanOrEqual(1);
      }),
      { numRuns: 50 },
    );
  });
});

describe("property: before() is a correct temporal filter", () => {
  it("before() always returns papers strictly before the cutoff, sorted chronologically", () => {
    fc.assert(
      fc.property(arbSyllabus(3, 5), (syl) => {
        const papers = [
          arbPaperSync(syl, "2018-12"),
          arbPaperSync(syl, "2019-12"),
          arbPaperSync(syl, "2020-12"),
          arbPaperSync(syl, "2021-12"),
          arbPaperSync(syl, "2022-12"),
        ];
        const cutoff = "2021-12";
        const filtered = before(papers, cutoff);

        // All filtered papers are strictly before cutoff
        for (const p of filtered) {
          expect(p.sitting < cutoff).toBe(true);
        }
        // Sorted chronologically
        for (let i = 1; i < filtered.length; i++) {
          expect(filtered[i]!.sitting >= filtered[i - 1]!.sitting).toBe(true);
        }
        // Count check: 2018, 2019, 2020 = 3
        expect(filtered.length).toBe(3);
      }),
      { numRuns: 10 },
    );
  });
});

describe("property: studiedSet respects ceiling", () => {
  it("studiedSet size = ceil(cut * N) for any ranking and valid cut", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.string({ minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 20 })
          .map((arr) => [...new Set(arr)])
          .filter((arr) => arr.length >= 1),
        fc.double({ min: 0.01, max: 1.0, noNaN: true }),
        (ranking, cut) => {
          const studied = studiedSet(ranking, cut);
          expect(studied.size).toBe(Math.ceil(cut * ranking.length));
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Sync Paper Generator (deterministic, for use inside fc.property) ────────

function arbPaperSync(syl: TSyllabus, sitting: string): TPaper {
  const ids = topicIds(syl);
  const nQuestions = Math.max(3, Math.min(6, ids.length));
  const questions = Array.from({ length: nQuestions }, (_, i) => ({
    id: `q${i}`,
    section: "A",
    number: `${i + 1}`,
    marks: (i % 3 === 0 ? 10 : i % 3 === 1 ? 5 : 2) as number,
    or_group: null,
    descriptor: "prop gen",
    topic_ids: [ids[i % ids.length]!],
  }));
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  return Paper.parse({
    id: `prop/test/${sitting}`,
    university: "prop",
    subject: "test",
    sitting,
    course_code: "PROP",
    source_url: "property-test",
    synthetic: true,
    max_marks: totalMarks,
    sections: [{ id: "A", attempt: nQuestions, of: nQuestions }],
    questions,
  });
}
