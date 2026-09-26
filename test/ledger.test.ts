import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scoreRun, computeScoreboard, freezeRun, loadSubject, verifyManifest, verifyNoLookAhead, verifyScoreboard } from "../src/ledger";
import { canonicalize, sha256 } from "../src/canonical";

const REL = "demo-univ/demo-os";
function tempLedger(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kya-"));
  fs.cpSync(path.resolve("ledger"), dir, { recursive: true });
  fs.rmSync(path.join(dir, "manifest.json"), { force: true });
  fs.rmSync(path.join(dir, REL, "runs"), { recursive: true, force: true });
  return dir;
}

describe("ledger", () => {
  it("canonical JSON ignores key order", () => {
    expect(sha256(canonicalize({ b: 1, a: [2, { d: 1, c: 2 }] }))).toBe(sha256(canonicalize({ a: [2, { c: 2, d: 1 }], b: 1 })));
  });
  it("the demo corpus passes the look-ahead test for every sitting", () => {
    expect(verifyNoLookAhead(loadSubject(path.resolve("ledger"), REL))).toEqual([]);
  });
  it("the committed scoreboard reproduces exactly", () => {
    expect(verifyScoreboard(loadSubject(path.resolve("ledger"), REL))).toEqual([]);
  });
  it("walk-forward scores every sitting after the first three, all within [0,1]", () => {
    const sb = computeScoreboard(loadSubject(path.resolve("ledger"), REL));
    expect(sb.n_test).toBe(sb.n_sittings - 3);
    for (const s of sb.sittings)
      for (const e of Object.values(s.coverage))
        for (const v of Object.values(e)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
  });
  it("a frozen list is scored from the frozen file, matches the walk-forward number, and cannot be scored before its paper exists", () => {
    const root = tempLedger();
    // freeze for 2024-12 while that paper is hidden, then "publish" it and score
    const hidden = path.join(root, REL, "papers", "2024-12.json");
    const stash = fs.readFileSync(hidden);
    fs.rmSync(hidden);
    freezeRun(root, REL, "2024-12", "rehearsal", "2026-09-20T00:00:00.000Z");
    expect(() => scoreRun(root, REL, "2024-12-rehearsal")).toThrow(/not been published/);
    fs.writeFileSync(hidden, stash);
    const card = scoreRun(root, REL, "2024-12-rehearsal");
    const wf = computeScoreboard(loadSubject(root, REL)).sittings.find((x) => x.sitting === "2024-12")!;
    expect(card.coverage.B3).toEqual(wf.coverage.B3);
    expect(card.coverage.B2).toEqual(wf.coverage.B2);
  });
  it("TAMPER TEST: a frozen list verifies, one changed byte is caught, a second freeze of the same slot is refused", () => {
    const root = tempLedger();
    const run = freezeRun(root, REL, "2026-12", "live", "2026-09-20T00:00:00.000Z");
    expect(verifyManifest(root)).toEqual([]);
    expect(() => freezeRun(root, REL, "2026-12", "live")).toThrow(/already frozen/);
    const file = path.join(root, run.files[0].path);
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("Priority order", "Guaranteed order"));
    expect(verifyManifest(root)).toHaveLength(1);
  });
});
