import { describe, expect, it } from "vitest";
import { Paper, Syllabus } from "../src/schemas";
import { rankLastPaper, rankRandom, rankTotalMarks, topicStats, before } from "../src/rank";

const syl = Syllabus.parse({
  university: "x",
  subject: "y",
  title: "T",
  fixed_on: "2020-01-01",
  units: [
    {
      id: "u1",
      name: "U1",
      topics: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
        { id: "d", name: "D" },
      ],
    },
  ],
});
const paper = (sitting: string, qs: [number, string[]][]) =>
  Paper.parse({
    id: `x/y/${sitting}`,
    university: "x",
    subject: "y",
    sitting,
    course_code: "C",
    source_url: "fixture",
    synthetic: true,
    max_marks: qs.reduce((s, [m]) => s + m, 0),
    sections: [{ id: "A", attempt: qs.length, of: qs.length }],
    questions: qs.map(([marks, topics], i) => ({ id: `q${i}`, section: "A", number: `${i}`, marks, or_group: null, descriptor: "fixture", topic_ids: topics })),
  });
const corpus = [
  paper("2019-12", [
    [10, ["a"]],
    [10, ["b"]],
    [2, ["c"]],
  ]),
  paper("2020-12", [
    [10, ["a"]],
    [10, ["a", "b"]],
    [2, ["c"]],
  ]), // the 10 is split 5/5
  paper("2021-12", [
    [10, ["d"]],
    [10, ["d"]],
    [10, ["c"]],
  ]),
];

describe("entrants", () => {
  it("B3 orders by total past marks: a=25, b=15, c=4 as of 2021-12; d has none", () => {
    expect(rankTotalMarks(corpus, syl, "2021-12")).toEqual(["a", "b", "c", "d"]);
    const s = topicStats(before(corpus, "2021-12"), syl);
    expect(s.get("a")!.total_marks).toBe(25);
    expect(s.get("b")!.total_marks).toBe(15);
    expect(s.get("c")!.total_marks).toBe(4);
    expect(s.get("a")!.history).toEqual([true, true]);
    expect(s.get("c")!.typical_marks).toBe(2);
  });
  it("B2 puts the latest past paper's topics first", () => {
    expect(rankLastPaper(corpus, syl, "2022-12").slice(0, 2)).toEqual(["d", "c"]);
  });
  it("NO LOOK-AHEAD: the 2021-12 list ignores the 2021-12 paper and anything later", () => {
    expect(rankTotalMarks(corpus, syl, "2021-12")).toEqual(rankTotalMarks(corpus.slice(0, 2), syl, "2021-12"));
    expect(rankTotalMarks(corpus, syl, "2021-12")[0]).not.toBe("d");
  });
  it("B0 is reproducible for a seed and is a permutation", () => {
    expect(rankRandom(syl, "s1")).toEqual(rankRandom(syl, "s1"));
    expect([...rankRandom(syl, "s2")].sort()).toEqual(["a", "b", "c", "d"]);
  });
});
