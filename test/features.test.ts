import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadSubject, buildPrediction, computeScoreboard } from "../src/ledger";
import { csvToPapers, papersToCsv, parseCsv } from "../src/csv";
import { canonicalize } from "../src/canonical";
import { renderSheet } from "../src/sheet";
import { injectScoreboard, scoreboardMarkdown } from "../src/readme";
import { rankGapAware, rankRecency, rankTotalMarks } from "../src/rank";
import { topicIds, Syllabus } from "../src/schemas";

const s = loadSubject(path.resolve("ledger"), "demo-univ/demo-os");

describe("CSV data entry", () => {
  it("handles quotes, commas and blank lines", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
  });
  it("ROUND TRIP: corpus -> CSV -> corpus is byte-identical", () => {
    const back = csvToPapers(papersToCsv(s.papers), "demo-univ", "demo-os", true);
    expect(canonicalize(back)).toBe(canonicalize(s.papers));
  });
  it("rejects a section whose rows disagree about attempt/of", () => {
    const csv = papersToCsv([s.papers[0]]).replace(",A,5,5,", ",A,4,5,");
    expect(() => csvToPapers(csv, "demo-univ", "demo-os")).toThrow(/conflicting/);
  });
});

describe("challenger entrants", () => {
  it("are deterministic permutations of the syllabus and obey the look-ahead guard", () => {
    for (const rank of [rankRecency, rankGapAware]) {
      const full = rank(s.papers, s.syllabus, "2022-12");
      expect([...full].sort()).toEqual([...topicIds(s.syllabus)].sort());
      expect(full).toEqual(
        rank(
          s.papers.filter((p) => p.sitting < "2022-12"),
          s.syllabus,
          "2022-12",
        ),
      );
    }
  });
  it("recency with no history falls back to syllabus order, like ours", () => {
    expect(rankRecency(s.papers, s.syllabus, "2000-01")).toEqual(rankTotalMarks(s.papers, s.syllabus, "2000-01"));
  });
});

describe("the Sheet", () => {
  const html = renderSheet(buildPrediction(s, "2024-12", "rehearsal"), s.syllabus.title);
  it("carries the priority line, the watermarks, a verify code, and at most 12 rows", () => {
    expect(html).toContain("Priority order, not guaranteed questions.");
    expect(html).toContain("SAMPLE - NUMBERS ARE MADE UP");
    expect(html).toContain("REHEARSAL");
    expect(html).toMatch(/Verify code [0-9A-F]{8}/);
    expect((html.match(/<tr><td class="n">/g) ?? []).length).toBe(12);
  });
  it("never uses the words 'will come' or 'guaranteed to'", () => {
    expect(html.toLowerCase()).not.toMatch(/will come|guaranteed to/);
  });
});

describe("README scoreboard", () => {
  it("injects between the markers and detects staleness", () => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kya-")), "README.md");
    fs.writeFileSync(f, "# x\n<!-- SCOREBOARD:START -->\nold\n<!-- SCOREBOARD:END -->\nend\n");
    const boards = [computeScoreboard(s)];
    expect(injectScoreboard(f, boards, true)).toBe(false);
    injectScoreboard(f, boards);
    expect(injectScoreboard(f, boards, true)).toBe(true);
    expect(fs.readFileSync(f, "utf8")).toContain("(SYNTHETIC)");
    expect(scoreboardMarkdown(boards)).toContain("B3");
  });
});

describe("new-subject scaffolder", () => {
  it("writes a syllabus that parses and a CSV template with the right header", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kya-"));
    const rel = "u/sub"; const target = path.join(dir, rel);
    fs.mkdirSync(path.join(target, "papers"), { recursive: true });
    const skeleton = { university: "u", subject: "sub", title: "T", fixed_on: "2026-09-21", units: [{ id: "u1", name: "N", topics: [{ id: "t-1", name: "X", aliases: [] }] }] };
    fs.writeFileSync(path.join(target, "syllabus.json"), JSON.stringify(skeleton));
    expect(() => Syllabus.parse(JSON.parse(fs.readFileSync(path.join(target, "syllabus.json"), "utf8")))).not.toThrow();
  });
});
