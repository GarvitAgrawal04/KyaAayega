import { TPaper, TQuestion } from "./schemas";
import { Ranking } from "./rank";

/** The topics a student "studied": the top share of a ranked list, by topic count (a proxy for effort, not a measure of it). */
export function studiedSet(ranking: Ranking, cut: number): Set<string> {
  return new Set(ranking.slice(0, Math.ceil(cut * ranking.length)));
}

/** Strict rule: a question counts only if every topic it needs was studied. Out-of-syllabus questions never count. */
export function answerable(q: TQuestion, studied: Set<string>): boolean {
  return q.topic_ids.length > 0 && q.topic_ids.every((t) => studied.has(t));
}

function sectionAttainable(paper: TPaper, sectionId: string, attempt: number, ok: (q: TQuestion) => boolean): number {
  const groups = new Map<string, number>(); // OR-alternatives share a group: only one of them can be attempted
  for (const q of paper.questions) {
    if (q.section !== sectionId || !ok(q)) continue;
    const g = q.or_group ?? q.id;
    groups.set(g, Math.max(groups.get(g) ?? 0, q.marks));
  }
  return [...groups.values()]
    .sort((a, b) => b - a)
    .slice(0, attempt)
    .reduce((a, b) => a + b, 0);
}

/** Choice-aware coverage: marks a student could actually attempt, respecting "attempt n of m" and OR-pairs, over the paper maximum. */
export function coverageChoiceAware(paper: TPaper, studied: Set<string>): number {
  let got = 0,
    max = 0;
  for (const s of paper.sections) {
    got += sectionAttainable(paper, s.id, s.attempt, (q) => answerable(q, studied));
    max += sectionAttainable(paper, s.id, s.attempt, () => true);
  }
  return max === 0 ? 0 : got / max;
}

/** Simpler fallback metric: share of all printed marks whose topics were studied (ignores choice). */
export function coveragePrinted(paper: TPaper, studied: Set<string>): number {
  const all = paper.questions.reduce((a, q) => a + q.marks, 0);
  const got = paper.questions.filter((q) => answerable(q, studied)).reduce((a, q) => a + q.marks, 0);
  return all === 0 ? 0 : got / all;
}
