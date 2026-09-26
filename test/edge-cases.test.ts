/**
 * Edge-case scoring fixtures (U8 from PLAYBOOK).
 * Tests corner cases not covered by the original 5 hand-computed fixtures:
 * - Mixed-mark sections with attempt 2 of 3
 * - Three-alternative OR groups
 * - Multi-topic question where only one topic is studied
 * - Zero-question edge cases
 * - All topics studied (full coverage)
 * - Section with all OR-group alternatives on same topic
 */
import { describe, expect, it } from "vitest";
import { Paper, TPaper } from "../src/schemas";
import { coverageChoiceAware, coveragePrinted, studiedSet, answerable } from "../src/score";

const base = { id: "e/e/2020-12", university: "e", subject: "e", sitting: "2020-12", course_code: "E", source_url: "edge-fixture", synthetic: true };
const q = (id: string, section: string, marks: number, topics: string[], or_group: string | null = null) => ({
  id,
  section,
  number: id,
  marks,
  or_group,
  descriptor: "edge",
  topic_ids: topics,
});
const mk = (p: Partial<TPaper>) => Paper.parse({ ...base, ...p });

describe("edge-case scoring fixtures", () => {
  it("E1 mixed-mark attempt 2 of 3: picks the two highest-mark answerable questions", () => {
    // Section with 3 questions of different marks, student can attempt 2
    // Questions: 15 marks (a), 10 marks (b), 5 marks (c) — attempt 2 of 3
    // Max = 15 + 10 = 25 (top 2)
    const p = mk({
      max_marks: 25,
      sections: [{ id: "A", attempt: 2, of: 3 }],
      questions: [q("1", "A", 15, ["a"]), q("2", "A", 10, ["b"]), q("3", "A", 5, ["c"])],
    });
    // Studied {a, c}: can answer q1(15) and q3(5), but max is still 25. Coverage = (15+5)/25 = 0.8
    expect(coverageChoiceAware(p, new Set(["a", "c"]))).toBeCloseTo(0.8);
    // Studied {a, b}: can answer q1(15) and q2(10) = 25/25 = 1.0
    expect(coverageChoiceAware(p, new Set(["a", "b"]))).toBeCloseTo(1.0);
    // Studied {c} only: can answer q3(5) = 5/25 = 0.2
    expect(coverageChoiceAware(p, new Set(["c"]))).toBeCloseTo(0.2);
  });

  it("E2 three-alternative OR group: only one from the group can be chosen", () => {
    // 3 questions in same OR group, attempt 1 of 1 (effectively 1 group with 3 alternatives)
    // a(10), b(15), c(5) — all in or-group "or1"
    // Max attainable = max(10, 15, 5) = 15 (pick the best one)
    const p = mk({
      max_marks: 15,
      sections: [{ id: "A", attempt: 1, of: 1 }],
      questions: [q("1a", "A", 10, ["a"], "or1"), q("1b", "A", 15, ["b"], "or1"), q("1c", "A", 5, ["c"], "or1")],
    });
    // Studied {a, b, c}: can answer all 3, but picks the best = 15. Coverage = 15/15 = 1.0
    expect(coverageChoiceAware(p, new Set(["a", "b", "c"]))).toBeCloseTo(1.0);
    // Studied {a, c}: best answerable = 10. Coverage = 10/15 ≈ 0.667
    expect(coverageChoiceAware(p, new Set(["a", "c"]))).toBeCloseTo(10 / 15);
    // Studied {c}: only q1c(5) answerable. Coverage = 5/15 ≈ 0.333
    expect(coverageChoiceAware(p, new Set(["c"]))).toBeCloseTo(5 / 15);
    // Studied {}: nothing answerable = 0
    expect(coverageChoiceAware(p, new Set())).toBe(0);
  });

  it("E3 multi-topic question: partial topic coverage yields zero (strict rule)", () => {
    // Question mapped to 3 topics — need ALL to answer it
    const p = mk({
      max_marks: 10,
      sections: [{ id: "A", attempt: 1, of: 1 }],
      questions: [q("1", "A", 10, ["a", "b", "c"])],
    });
    expect(coverageChoiceAware(p, new Set(["a"]))).toBe(0);
    expect(coverageChoiceAware(p, new Set(["a", "b"]))).toBe(0);
    expect(coverageChoiceAware(p, new Set(["a", "b", "c"]))).toBe(1);
  });

  it("E4 full coverage: studying all topics always yields 1.0", () => {
    // Section A: attempt 2 of 3 → max = 10+5 = 15
    // Section B: attempt 1 of 2 → max = 10
    // Total max = 25
    const p = mk({
      max_marks: 25,
      sections: [
        { id: "A", attempt: 2, of: 3 },
        { id: "B", attempt: 1, of: 2 },
      ],
      questions: [q("1", "A", 5, ["a"]), q("2", "A", 5, ["b"]), q("3", "A", 10, ["c"]), q("4", "B", 10, ["d"]), q("5", "B", 10, ["e"])],
    });
    expect(coverageChoiceAware(p, new Set(["a", "b", "c", "d", "e"]))).toBeCloseTo(1.0);
  });

  it("E5 multiple sections: coverage computed across all sections independently", () => {
    // Section A: attempt 2 of 2 → max = 10+10 = 20
    // Section B: attempt 1 of 2 → max = 10
    // Total max = 30
    const p = mk({
      max_marks: 30,
      sections: [
        { id: "A", attempt: 2, of: 2 },
        { id: "B", attempt: 1, of: 2 },
      ],
      questions: [q("1", "A", 10, ["a"]), q("2", "A", 10, ["b"]), q("3", "B", 10, ["c"]), q("4", "B", 10, ["d"])],
    });
    // Studied {a, c}: A gets q1(10), B gets q3(10). Got=20, Max=30. Coverage = 20/30 ≈ 0.667
    expect(coverageChoiceAware(p, new Set(["a", "c"]))).toBeCloseTo(20 / 30);
    // Studied {a, b, c}: A = 20, B = 10. Coverage = 30/30 = 1.0
    expect(coverageChoiceAware(p, new Set(["a", "b", "c"]))).toBeCloseTo(1.0);
  });

  it("E6 printed coverage vs choice-aware diverge with heavy choice", () => {
    // 4 questions, attempt 1 of 4. Student can only pick 1.
    const p = mk({
      max_marks: 10,
      sections: [{ id: "A", attempt: 1, of: 4 }],
      questions: [q("1", "A", 10, ["a"]), q("2", "A", 10, ["b"]), q("3", "A", 10, ["c"]), q("4", "A", 10, ["d"])],
    });
    // All studied: choice-aware = 10/10 = 1.0 (pick best answerable)
    expect(coverageChoiceAware(p, new Set(["a", "b", "c", "d"]))).toBeCloseTo(1.0);
    // Printed (ignores choice): 40/40 = 1.0
    expect(coveragePrinted(p, new Set(["a", "b", "c", "d"]))).toBeCloseTo(1.0);
    // Two studied: choice-aware = 10/10 = 1.0 (still picks 1 from 2 answerable)
    expect(coverageChoiceAware(p, new Set(["a", "b"]))).toBeCloseTo(1.0);
    // Printed with two: 20/40 = 0.5 (naive sum)
    expect(coveragePrinted(p, new Set(["a", "b"]))).toBeCloseTo(0.5);
    // This demonstrates the difference: choice-aware correctly models exam strategy
  });

  it("E7 answerable() edge cases", () => {
    const qObj = { id: "q1", section: "A", number: "1", marks: 10, or_group: null, descriptor: "test", topic_ids: ["a", "b"] };
    // Partial topics
    expect(answerable(qObj, new Set(["a"]))).toBe(false);
    // All topics
    expect(answerable(qObj, new Set(["a", "b"]))).toBe(true);
    // Superset of topics
    expect(answerable(qObj, new Set(["a", "b", "c", "d"]))).toBe(true);
    // Empty studied set
    expect(answerable(qObj, new Set())).toBe(false);
    // Out-of-syllabus question
    expect(answerable({ ...qObj, topic_ids: [] }, new Set(["a", "b"]))).toBe(false);
  });

  it("E8 studiedSet with cut=1.0 includes all topics", () => {
    const ranking = ["x", "y", "z"];
    const studied = studiedSet(ranking, 1.0);
    expect(studied.size).toBe(3);
    expect(studied.has("x")).toBe(true);
    expect(studied.has("y")).toBe(true);
    expect(studied.has("z")).toBe(true);
  });

  it("E9 studiedSet with cut near zero still includes at least 1 topic", () => {
    const ranking = ["x", "y", "z", "w"];
    // ceil(0.01 * 4) = ceil(0.04) = 1
    const studied = studiedSet(ranking, 0.01);
    expect(studied.size).toBe(1);
    expect(studied.has("x")).toBe(true);
  });
});
