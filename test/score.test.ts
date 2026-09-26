import { describe, expect, it } from "vitest";
import { Paper, TPaper } from "../src/schemas";
import { coverageChoiceAware, coveragePrinted, studiedSet } from "../src/score";

// Every expected value below was computed by hand. If one of these fails, every published score is wrong.
const base = { id: "x/y/2020-12", university: "x", subject: "y", sitting: "2020-12", course_code: "C", source_url: "fixture", synthetic: true };
const q = (id: string, section: string, marks: number, topics: string[], or_group: string | null = null) => ({
  id,
  section,
  number: id,
  marks,
  or_group,
  descriptor: "fixture",
  topic_ids: topics,
});
const mk = (p: Partial<TPaper>) => Paper.parse({ ...base, ...p });

describe("choice-aware coverage", () => {
  it("F1 all compulsory: 5+5 of 20 attemptable = 0.5", () => {
    const p = mk({
      max_marks: 20,
      sections: [{ id: "A", attempt: 3, of: 3 }],
      questions: [q("1", "A", 5, ["a"]), q("2", "A", 5, ["b"]), q("3", "A", 10, ["c"])],
    });
    expect(coverageChoiceAware(p, new Set(["a", "b"]))).toBeCloseTo(0.5);
  });
  it("F2 attempt 2 of 4: one answerable = 0.5, three answerable = 1.0 (choice caps the need)", () => {
    const p = mk({
      max_marks: 20,
      sections: [{ id: "B", attempt: 2, of: 4 }],
      questions: [q("1", "B", 10, ["a"]), q("2", "B", 10, ["b"]), q("3", "B", 10, ["c"]), q("4", "B", 10, ["d"])],
    });
    expect(coverageChoiceAware(p, new Set(["a"]))).toBeCloseTo(0.5);
    expect(coverageChoiceAware(p, new Set(["a", "b", "c"]))).toBeCloseTo(1);
    expect(coveragePrinted(p, new Set(["a", "b", "c"]))).toBeCloseTo(0.75); // the simpler metric ignores choice
  });
  it("F3 OR-pair counts once: both alternatives studied still gives 10 of 20", () => {
    const p = mk({
      max_marks: 20,
      sections: [{ id: "C", attempt: 2, of: 2 }],
      questions: [q("1a", "C", 10, ["a"], "or1"), q("1b", "C", 10, ["b"], "or1"), q("2", "C", 10, ["c"])],
    });
    expect(coverageChoiceAware(p, new Set(["a", "b"]))).toBeCloseTo(0.5);
    expect(coverageChoiceAware(p, new Set(["b", "c"]))).toBeCloseTo(1);
  });
  it("F4 a two-topic question needs both topics", () => {
    const p = mk({ max_marks: 10, sections: [{ id: "A", attempt: 1, of: 1 }], questions: [q("1", "A", 10, ["a", "b"])] });
    expect(coverageChoiceAware(p, new Set(["a"]))).toBe(0);
    expect(coverageChoiceAware(p, new Set(["a", "b"]))).toBe(1);
  });
  it("F5 out-of-syllabus questions are never answerable but stay in the maximum", () => {
    const p = mk({ max_marks: 20, sections: [{ id: "A", attempt: 2, of: 2 }], questions: [q("1", "A", 10, []), q("2", "A", 10, ["a"])] });
    expect(coverageChoiceAware(p, new Set(["a"]))).toBeCloseTo(0.5);
  });
  it("studiedSet takes the ceiling of the cut", () => {
    expect([...studiedSet(["a", "b", "c", "d", "e"], 0.5)]).toEqual(["a", "b", "c"]);
  });
  it("refuses descriptors longer than 8 words (verbatim-text guard)", () => {
    expect(() =>
      mk({
        max_marks: 10,
        sections: [{ id: "A", attempt: 1, of: 1 }],
        questions: [{ ...q("1", "A", 10, ["a"]), descriptor: "Explain in detail the working of the bankers algorithm with example" }],
      }),
    ).toThrow();
  });
});
