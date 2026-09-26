import { TPaper, TSyllabus, topicIds } from "./schemas";

export type Ranking = string[]; // every syllabus topic id exactly once, best first

/** THE look-ahead guard: only papers strictly before `asOf` ("YYYY-MM") may influence anything. */
export function before(papers: TPaper[], asOf: string): TPaper[] {
  return papers.filter((p) => p.sitting < asOf).sort((a, b) => a.sitting.localeCompare(b.sitting));
}

export interface TopicStat {
  topic_id: string;
  total_marks: number;
  times_asked: number;
  of_sittings: number;
  typical_marks: number | null;
  last_asked: string | null;
  history: boolean[]; // one flag per past sitting, oldest first
}

/** Per-topic history. A question's marks are split equally across the topics it is mapped to. */
export function topicStats(past: TPaper[], syl: TSyllabus): Map<string, TopicStat> {
  const stats = new Map<string, TopicStat>();
  for (const id of topicIds(syl))
    stats.set(id, { topic_id: id, total_marks: 0, times_asked: 0, of_sittings: past.length, typical_marks: null, last_asked: null, history: [] });
  const marksSeen = new Map<string, number[]>();
  for (const p of past) {
    const asked = new Set<string>();
    for (const q of p.questions) {
      for (const t of q.topic_ids) {
        const s = stats.get(t);
        if (!s) continue;
        s.total_marks += q.marks / q.topic_ids.length;
        asked.add(t);
        marksSeen.set(t, [...(marksSeen.get(t) ?? []), q.marks]);
      }
    }
    for (const s of stats.values()) {
      const hit = asked.has(s.topic_id);
      s.history.push(hit);
      if (hit) {
        s.times_asked += 1;
        s.last_asked = p.sitting;
      }
    }
  }
  for (const [t, ms] of marksSeen) {
    const counts = new Map<number, number>();
    for (const m of ms) counts.set(m, (counts.get(m) ?? 0) + 1);
    // "usually N marks" = most common question size; ties go to the larger
    const typical = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
    stats.get(t)!.typical_marks = typical;
  }
  return stats;
}

const orderIndex = (syl: TSyllabus) => new Map(topicIds(syl).map((id, i) => [id, i] as const));

/** B1 - syllabus order. */
export function rankSyllabus(_papers: TPaper[], syl: TSyllabus, _asOf: string): Ranking {
  return topicIds(syl);
}

/** B2 - "start from last year's paper": topics of the latest past paper by marks, then the rest in syllabus order. */
export function rankLastPaper(papers: TPaper[], syl: TSyllabus, asOf: string): Ranking {
  const past = before(papers, asOf);
  const idx = orderIndex(syl);
  const last = past[past.length - 1];
  if (!last) return topicIds(syl);
  const s = topicStats([last], syl);
  const inLast = [...s.values()]
    .filter((x) => x.times_asked > 0)
    .sort((a, b) => b.total_marks - a.total_marks || idx.get(a.topic_id)! - idx.get(b.topic_id)!)
    .map((x) => x.topic_id);
  return [...inLast, ...topicIds(syl).filter((t) => !inLast.includes(t))];
}

/** B3 - pure multi-year frequency: total past marks per topic. No parameters. This is the method under test. */
export function rankTotalMarks(papers: TPaper[], syl: TSyllabus, asOf: string): Ranking {
  const idx = orderIndex(syl);
  const s = topicStats(before(papers, asOf), syl);
  return [...s.values()]
    .sort((a, b) => b.total_marks - a.total_marks || b.times_asked - a.times_asked || idx.get(a.topic_id)! - idx.get(b.topic_id)!)
    .map((x) => x.topic_id);
}

/** C1 - recency-weighted marks. lambda is DECLARED here (0.85 per sitting of age) and never tuned on scored sittings. */
export const C1_LAMBDA = 0.85;
export function rankRecency(papers: TPaper[], syl: TSyllabus, asOf: string): Ranking {
  const idx = orderIndex(syl);
  const past = before(papers, asOf);
  const score = new Map<string, number>(topicIds(syl).map((t) => [t, 0]));
  past.forEach((p, i) => {
    const w = Math.pow(C1_LAMBDA, past.length - 1 - i);
    for (const q of p.questions) for (const t of q.topic_ids) if (score.has(t)) score.set(t, score.get(t)! + (w * q.marks) / q.topic_ids.length);
  });
  return [...score.entries()].sort((a, b) => b[1] - a[1] || idx.get(a[0])! - idx.get(b[0])!).map((x) => x[0]);
}

/** C2 - gap-aware: total past marks, boosted when a topic is "due" by its own average recurrence gap, damped when it has just been asked
 *  and normally skips sittings. Constants are DECLARED here (1.25 / 0.8). Idea seen in other PYQ analysers; here it has to earn its place on the scoreboard. */
export const C2_DUE_BOOST = 1.25,
  C2_JUST_ASKED_DAMP = 0.8;
export function rankGapAware(papers: TPaper[], syl: TSyllabus, asOf: string): Ranking {
  const idx = orderIndex(syl);
  const s = topicStats(before(papers, asOf), syl);
  const scored = [...s.values()].map((st) => {
    const at = st.history.flatMap((h, i) => (h ? [i] : []));
    let f = 1;
    if (at.length >= 2) {
      const meanGap = (at[at.length - 1] - at[0]) / (at.length - 1);
      const since = st.history.length - 1 - at[at.length - 1];
      if (since + 1 >= Math.round(meanGap) && since >= 1) f = C2_DUE_BOOST;
      else if (since === 0 && meanGap >= 2) f = C2_JUST_ASKED_DAMP;
    }
    return { id: st.topic_id, v: st.total_marks * f, n: st.times_asked };
  });
  return scored.sort((a, b) => b.v - a.v || b.n - a.n || idx.get(a.id)! - idx.get(b.id)!).map((x) => x.id);
}

// Seeded randomness for B0 so results are reproducible byte for byte.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** B0 - one seeded random permutation of the syllabus. */
export function rankRandom(syl: TSyllabus, seed: string): Ranking {
  const ids = topicIds(syl);
  const rnd = mulberry32(fnv1a(seed));
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export const ENTRANTS = {
  B1: { label: "Syllabus order", rank: rankSyllabus },
  B2: { label: "Last paper first", rank: rankLastPaper },
  B3: { label: "KyaAayega - total past marks", rank: rankTotalMarks },
  C1: { label: "Challenger - recency-weighted marks", rank: rankRecency },
  C2: { label: "Challenger - gap-aware marks", rank: rankGapAware },
} as const;
export type EntrantId = keyof typeof ENTRANTS | "B0";
