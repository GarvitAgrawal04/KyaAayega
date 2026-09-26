import fs from "node:fs";
import path from "node:path";
import { Paper, Syllabus, TPaper, TSyllabus, validatePaper, topicIds } from "./schemas";
import { canonicalize, sha256 } from "./canonical";
import { before, rankLastPaper, rankSyllabus, rankTotalMarks, topicStats } from "./rank";
import { walkForward, Scoreboard, CUTS, DEFAULTS } from "./backtest";
import { coverageChoiceAware, studiedSet } from "./score";
import { rankRandom } from "./rank";
import { renderSheet } from "./sheet";
import { round4 } from "./canonical";

export interface Subject {
  dir: string;
  syllabus: TSyllabus;
  papers: TPaper[];
}

export function loadSubject(ledgerRoot: string, rel: string): Subject {
  const dir = path.join(ledgerRoot, rel);
  const syllabus = Syllabus.parse(JSON.parse(fs.readFileSync(path.join(dir, "syllabus.json"), "utf8")));
  const pdir = path.join(dir, "papers");
  const papers = fs
    .readdirSync(pdir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => Paper.parse(JSON.parse(fs.readFileSync(path.join(pdir, f), "utf8"))));
  const problems = papers.flatMap((p) => validatePaper(p, syllabus));
  if (problems.length) throw new Error("Corpus problems:\n  " + problems.join("\n  "));
  return { dir, syllabus, papers: papers.sort((a, b) => a.sitting.localeCompare(b.sitting)) };
}

export function depthLabel(n: number): string {
  if (n < 5) return `THIN - only ${n} past papers: treat as a rough guide`;
  if (n < 8) return `OK - ${n} past papers`;
  return `GOOD - ${n} past papers`;
}

/** The frozen artifact: our list as of a date, the history behind every row, and the baselines it will be judged against. */
export function buildPrediction(s: Subject, asOf: string, status: "rehearsal" | "live") {
  const past = before(s.papers, asOf);
  const stats = topicStats(past, s.syllabus);
  const names = new Map(s.syllabus.units.flatMap((u) => u.topics.map((t) => [t.id, { name: t.name, unit: u.id }] as const)));
  const ranking = rankTotalMarks(s.papers, s.syllabus, asOf);
  return {
    schema_version: 1,
    run_id: `${s.syllabus.university}/${s.syllabus.subject}/${asOf}-${status}`,
    status,
    as_of: asOf,
    method: "B3 total past marks per topic (no parameters); ties: times asked, then syllabus order",
    priority_line: "Priority order, not guaranteed questions.",
    corpus: { paper_ids: past.map((p) => p.id), n_sittings: past.length, sittings: past.map((p) => p.sitting), synthetic: past.some((p) => p.synthetic) },
    depth_label: depthLabel(past.length),
    topics: ranking.map((id, i) => {
      const st = stats.get(id)!;
      return {
        rank: i + 1,
        topic_id: id,
        name: names.get(id)!.name,
        unit: names.get(id)!.unit,
        times_asked: st.times_asked,
        of_sittings: st.of_sittings,
        typical_marks: st.typical_marks,
        last_asked: st.last_asked,
        total_marks: Math.round(st.total_marks * 100) / 100,
        history: st.history,
      };
    }),
    baselines: { B1: rankSyllabus(s.papers, s.syllabus, asOf), B2: rankLastPaper(s.papers, s.syllabus, asOf) },
    n_topics: topicIds(s.syllabus).length,
  };
}

interface ManifestRun {
  run_id: string;
  status: string;
  as_of: string;
  frozen_at: string;
  files: { path: string; sha256: string }[];
  git_tag: string | null;
  ots: string[];
  wayback: string[];
}
interface Manifest {
  v: number;
  runs: ManifestRun[];
}
const manifestPath = (root: string) => path.join(root, "manifest.json");
export function readManifest(root: string): Manifest {
  return fs.existsSync(manifestPath(root)) ? JSON.parse(fs.readFileSync(manifestPath(root), "utf8")) : { v: 1, runs: [] };
}

/** One list per subject per date. A second freeze for the same slot is refused - supersede in the open, never silently. */
export function freezeRun(root: string, rel: string, asOf: string, status: "rehearsal" | "live", now = new Date().toISOString()): ManifestRun {
  const s = loadSubject(root, rel);
  const pred = buildPrediction(s, asOf, status);
  const manifest = readManifest(root);
  if (manifest.runs.some((r) => r.run_id === pred.run_id)) throw new Error(`Run ${pred.run_id} is already frozen. One list per slot.`);
  const runDir = path.join(s.dir, "runs", `${asOf}-${status}`);
  fs.mkdirSync(runDir, { recursive: true });
  const body = canonicalize(pred);
  const file = path.join(runDir, "prediction.json");
  fs.writeFileSync(file, body);
  const sheetFile = path.join(runDir, "sheet.html");
  const sheet = renderSheet(pred, s.syllabus.title);
  fs.writeFileSync(sheetFile, sheet);
  const relp = (f: string) => path.relative(root, f).split(path.sep).join("/");
  const run: ManifestRun = {
    run_id: pred.run_id,
    status,
    as_of: asOf,
    frozen_at: now,
    files: [
      { path: relp(file), sha256: sha256(body) },
      { path: relp(sheetFile), sha256: sha256(sheet) },
    ],
    git_tag: null,
    ots: [],
    wayback: [],
  };
  manifest.runs.push(run);
  fs.writeFileSync(manifestPath(root), JSON.stringify(manifest, null, 2) + "\n");
  return run;
}

/** Recompute every hash in the manifest. Any edit to a frozen file shows up here. */
export function verifyManifest(root: string): string[] {
  const problems: string[] = [];
  for (const r of readManifest(root).runs)
    for (const f of r.files) {
      const p = path.join(root, f.path);
      if (!fs.existsSync(p)) {
        problems.push(`${r.run_id}: missing ${f.path}`);
        continue;
      }
      if (sha256(fs.readFileSync(p)) !== f.sha256) problems.push(`${r.run_id}: ${f.path} does not match its frozen hash`);
    }
  return problems;
}

/** Look-ahead test: a list for sitting k must be byte-identical when every later paper is deleted from the corpus. */
export function verifyNoLookAhead(s: Subject): string[] {
  const problems: string[] = [];
  for (const target of s.papers.slice(1)) {
    const full = canonicalize(buildPrediction(s, target.sitting, "rehearsal"));
    const truncated = canonicalize(buildPrediction({ ...s, papers: s.papers.filter((p) => p.sitting < target.sitting) }, target.sitting, "rehearsal"));
    if (full !== truncated) problems.push(`${target.id}: list as of ${target.sitting} changes when later papers are removed (look-ahead leak)`);
  }
  return problems;
}

export const scoreboardPath = (s: Subject) => path.join(s.dir, "scoreboard.json");
export function computeScoreboard(s: Subject): Scoreboard {
  return walkForward(s.papers, s.syllabus);
}
export function verifyScoreboard(s: Subject): string[] {
  if (!fs.existsSync(scoreboardPath(s))) return [`${s.dir}: no scoreboard.json committed yet (run: npm run backtest)`];
  const committed = canonicalize(JSON.parse(fs.readFileSync(scoreboardPath(s), "utf8")));
  return committed === canonicalize(computeScoreboard(s)) ? [] : [`${s.dir}: committed scoreboard.json does not match a fresh re-score`];
}

export function listSubjects(root: string): string[] {
  const out: string[] = [];
  for (const u of fs.readdirSync(root, { withFileTypes: true }))
    if (u.isDirectory())
      for (const sub of fs.readdirSync(path.join(root, u.name), { withFileTypes: true }))
        if (sub.isDirectory() && fs.existsSync(path.join(root, u.name, sub.name, "syllabus.json"))) out.push(`${u.name}/${sub.name}`);
  return out.sort();
}

/** Score a FROZEN list against the paper it was frozen for. Uses the rankings stored in the frozen file - nothing is recomputed. */
export function scoreRun(root: string, rel: string, runName: string) {
  const s = loadSubject(root, rel);
  const runDir = path.join(s.dir, "runs", runName);
  const pred = JSON.parse(fs.readFileSync(path.join(runDir, "prediction.json"), "utf8"));
  const paper = s.papers.find((p) => p.sitting >= pred.as_of);
  if (!paper) throw new Error(`No paper on or after ${pred.as_of} is in the corpus yet - the exam has not been published. Nothing to score.`);
  const lists: Record<string, string[]> = { B3: pred.topics.map((t: { topic_id: string }) => t.topic_id), B1: pred.baselines.B1, B2: pred.baselines.B2 };
  const coverage: Record<string, Record<string, number>> = {};
  for (const [id, ranking] of Object.entries(lists)) {
    coverage[id] = {};
    for (const c of CUTS) coverage[id][String(c)] = round4(coverageChoiceAware(paper, studiedSet(ranking, c)));
  }
  coverage.B0 = {};
  for (const c of CUTS) {
    let sum = 0;
    for (let i = 0; i < DEFAULTS.nPerm; i++) sum += coverageChoiceAware(paper, studiedSet(rankRandom(s.syllabus, `${DEFAULTS.seed}|${paper.id}|${i}`), c));
    coverage.B0[String(c)] = round4(sum / DEFAULTS.nPerm);
  }
  const card = {
    run_id: pred.run_id,
    status: pred.status,
    frozen_as_of: pred.as_of,
    paper_id: paper.id,
    paper_sitting: paper.sitting,
    coverage,
    note: "choice-aware coverage at the top 30/50/70% of each frozen list, by topic count",
  };
  fs.writeFileSync(path.join(runDir, "scorecard.json"), JSON.stringify(card, null, 2) + "\n");
  return card;
}
