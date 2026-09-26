import { TPaper, TSyllabus } from "./schemas";
import { ENTRANTS, Ranking, rankRandom } from "./rank";
import { coverageChoiceAware, coveragePrinted, studiedSet } from "./score";
import { round4 } from "./canonical";

export const CUTS = [0.3, 0.5, 0.7] as const;
export const HEADLINE_CUT = 0.5;
export interface Options {
  minTrain: number;
  nPerm: number;
  seed: string;
}
export const DEFAULTS: Options = { minTrain: 3, nPerm: 200, seed: "kyaaayega-v1" };

type ByCut = Record<string, number>;
export interface SittingResult {
  sitting: string;
  paper_id: string;
  n_train: number;
  coverage: Record<string, ByCut>; // entrant -> cut -> choice-aware coverage
  coverage_printed: Record<string, ByCut>; // same, ignoring choice (pre-registered fallback metric)
}

function scoreRanking(paper: TPaper, ranking: Ranking, fn: typeof coverageChoiceAware): ByCut {
  const out: ByCut = {};
  for (const c of CUTS) out[String(c)] = round4(fn(paper, studiedSet(ranking, c)));
  return out;
}
function scoreRandom(paper: TPaper, syl: TSyllabus, opts: Options, fn: typeof coverageChoiceAware): ByCut {
  const sums: Record<string, number> = {};
  for (let i = 0; i < opts.nPerm; i++) {
    const r = rankRandom(syl, `${opts.seed}|${paper.id}|${i}`);
    for (const c of CUTS) sums[String(c)] = (sums[String(c)] ?? 0) + fn(paper, studiedSet(r, c));
  }
  const out: ByCut = {};
  for (const c of CUTS) out[String(c)] = round4(sums[String(c)] / opts.nPerm);
  return out;
}

/** Score every entrant on one paper using ONLY earlier papers. */
export function scoreSitting(papers: TPaper[], syl: TSyllabus, target: TPaper, opts: Options = DEFAULTS): SittingResult {
  const nTrain = papers.filter((p) => p.sitting < target.sitting).length;
  const coverage: Record<string, ByCut> = { B0: scoreRandom(target, syl, opts, coverageChoiceAware) };
  const printed: Record<string, ByCut> = { B0: scoreRandom(target, syl, opts, coveragePrinted) };
  for (const [id, e] of Object.entries(ENTRANTS)) {
    const ranking = e.rank(papers, syl, target.sitting); // the entrant itself applies the as-of filter
    coverage[id] = scoreRanking(target, ranking, coverageChoiceAware);
    printed[id] = scoreRanking(target, ranking, coveragePrinted);
  }
  return { sitting: target.sitting, paper_id: target.id, n_train: nTrain, coverage, coverage_printed: printed };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface Scoreboard {
  subject: string;
  synthetic: boolean;
  options: Options;
  n_sittings: number;
  n_test: number;
  sittings: SittingResult[];
  summary: Record<string, { mean: ByCut; median: ByCut; worst: ByCut }>;
  headline: {
    cut: number;
    adversary: string;
    per_sitting_diff: number[];
    share_positive: number;
    median_diff: number;
    mean_diff: number;
    mean_diff_without_best: number;
    verdict: string;
  };
}

/** Walk-forward: every sitting from the (minTrain+1)-th onward is scored by lists built only from the sittings before it. */
export function walkForward(papersIn: TPaper[], syl: TSyllabus, opts: Options = DEFAULTS): Scoreboard {
  const papers = [...papersIn].sort((a, b) => a.sitting.localeCompare(b.sitting));
  const sittings = papers.slice(opts.minTrain).map((t) => scoreSitting(papers, syl, t, opts));
  const summary: Scoreboard["summary"] = {};
  for (const id of ["B0", ...Object.keys(ENTRANTS)]) {
    const m: ByCut = {},
      md: ByCut = {},
      w: ByCut = {};
    for (const c of CUTS) {
      const xs = sittings.map((s) => s.coverage[id][String(c)]);
      if (xs.length === 0) continue;
      m[String(c)] = round4(mean(xs));
      md[String(c)] = round4(median(xs));
      w[String(c)] = round4(Math.min(...xs));
    }
    summary[id] = { mean: m, median: md, worst: w };
  }
  // Headline: ours (B3) against the stronger of the two simple heuristics, picked after the fact in the heuristics' favour.
  const h = String(HEADLINE_CUT);
  const adversary = sittings.length && (summary.B2.mean[h] ?? 0) >= (summary.B1.mean[h] ?? 0) ? "B2" : "B1";
  const diffs = sittings.map((s) => round4(s.coverage.B3[h] - s.coverage[adversary][h]));
  const share = diffs.length ? diffs.filter((d) => d > 0).length / diffs.length : 0;
  const med = diffs.length ? median(diffs) : 0;
  const withoutBest = diffs.length > 1 ? mean([...diffs].sort((a, b) => b - a).slice(1)) : 0;
  let verdict = "unclear - proceed, say so publicly, let the live cycle speak";
  if (diffs.length < 4) verdict = "insufficient - fewer than 4 test sittings";
  else if (share < 0.5 && med <= 0) verdict = "obviously nothing - drop any predictive claim";
  else if (share >= 2 / 3 && med > 0 && withoutBest > 0) verdict = "clearly something - on this corpus";
  return {
    subject: `${syl.university}/${syl.subject}`,
    synthetic: papers.some((p) => p.synthetic),
    options: opts,
    n_sittings: papers.length,
    n_test: sittings.length,
    sittings,
    summary,
    headline: {
      cut: HEADLINE_CUT,
      adversary,
      per_sitting_diff: diffs,
      share_positive: round4(share),
      median_diff: round4(med),
      mean_diff: round4(diffs.length ? mean(diffs) : 0),
      mean_diff_without_best: round4(withoutBest),
      verdict,
    },
  };
}
