import { z } from "zod";

// Public data only. Verbatim question text never enters these schemas:
// a question carries a short neutral descriptor (max 8 words), nothing more.
export const Topic = z.object({ id: z.string().min(1), name: z.string().min(1), aliases: z.array(z.string()).default([]) });
export const Unit = z.object({ id: z.string().min(1), name: z.string().min(1), topics: z.array(Topic).min(1) });
export const Syllabus = z.object({
  university: z.string(),
  subject: z.string(),
  title: z.string(),
  fixed_on: z.string(), // date the topic list was frozen - must precede parsing of held-out papers
  units: z.array(Unit).min(1),
});

export const Section = z.object({ id: z.string(), attempt: z.number().int().positive(), of: z.number().int().positive() });
export const Question = z.object({
  id: z.string(),
  section: z.string(),
  number: z.string(),
  marks: z.number().positive(),
  or_group: z.string().nullable().default(null),
  descriptor: z.string().refine((s) => s.trim().split(/\s+/).length <= 8, "descriptor must be 8 words or fewer (no verbatim question text)"),
  topic_ids: z.array(z.string()), // reviewed labels; empty = out of syllabus
  topic_ids_machine: z.array(z.string()).optional(), // first-pass labels, kept for comparison
  question_type: z.enum(["short", "theory", "numerical", "derivation", "diagram", "programming", "mcq", "case"]).optional(),
  bloom: z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"]).optional(),
  page: z.number().int().positive().optional(), // page in the source PDF - traceability back to the official paper
});
export const Paper = z.object({
  id: z.string(),
  university: z.string(),
  subject: z.string(),
  sitting: z.string().regex(/^\d{4}-\d{2}$/),
  course_code: z.string(),
  set: z.string().optional(),
  max_marks: z.number().positive(),
  source_url: z.string(),
  synthetic: z.boolean().default(false),
  sections: z.array(Section).min(1),
  questions: z.array(Question).min(1),
});

export type TSyllabus = z.infer<typeof Syllabus>;
export type TPaper = z.infer<typeof Paper>;
export type TQuestion = z.infer<typeof Question>;
export type TSection = z.infer<typeof Section>;

export function topicIds(syl: TSyllabus): string[] {
  return syl.units.flatMap((u) => u.topics.map((t) => t.id));
}

/** Structural checks that silently corrupt every score if wrong. Returns a list of problems. */
export function validatePaper(p: TPaper, syl: TSyllabus): string[] {
  const problems: string[] = [];
  const known = new Set(topicIds(syl));
  const sectionIds = new Set(p.sections.map((s) => s.id));
  for (const q of p.questions) {
    if (!sectionIds.has(q.section)) problems.push(`${p.id}: question ${q.id} refers to unknown section ${q.section}`);
    for (const t of q.topic_ids) if (!known.has(t)) problems.push(`${p.id}: question ${q.id} uses unknown topic ${t}`);
  }
  let max = 0;
  for (const s of p.sections) {
    const groups = new Map<string, number>();
    for (const q of p.questions.filter((x) => x.section === s.id)) {
      const g = q.or_group ?? q.id;
      groups.set(g, Math.max(groups.get(g) ?? 0, q.marks));
    }
    if (groups.size !== s.of) problems.push(`${p.id}: section ${s.id} declares ${s.of} choices but has ${groups.size}`);
    if (s.attempt > s.of) problems.push(`${p.id}: section ${s.id} attempt ${s.attempt} exceeds of ${s.of}`);
    max += [...groups.values()]
      .sort((a, b) => b - a)
      .slice(0, s.attempt)
      .reduce((a, b) => a + b, 0);
  }
  if (Math.abs(max - p.max_marks) > 1e-9) problems.push(`${p.id}: sections add up to ${max} marks but max_marks says ${p.max_marks}`);
  return problems;
}
