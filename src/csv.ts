import { Paper, TPaper } from "./schemas";

// Spreadsheet-friendly data entry: one row per question. This is how most people will actually contribute papers.
export const CSV_COLUMNS = [
  "sitting",
  "course_code",
  "set",
  "section",
  "attempt",
  "of",
  "number",
  "marks",
  "or_group",
  "descriptor",
  "topic_ids",
  "question_type",
  "page",
  "source_url",
] as const;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}
const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function papersToCsv(papers: TPaper[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const p of papers)
    for (const q of p.questions) {
      const s = p.sections.find((x) => x.id === q.section)!;
      lines.push(
        [
          p.sitting,
          p.course_code,
          p.set ?? "",
          q.section,
          s.attempt,
          s.of,
          q.number,
          q.marks,
          q.or_group ?? "",
          q.descriptor,
          q.topic_ids.join(";"),
          q.question_type ?? "",
          q.page ?? "",
          p.source_url,
        ]
          .map(esc)
          .join(","),
      );
    }
  return lines.join("\n") + "\n";
}

/** Build validated paper objects from CSV rows. Section rules are repeated on every row and must agree within a section. */
export function csvToPapers(text: string, university: string, subject: string, synthetic = false): TPaper[] {
  const [header, ...rows] = parseCsv(text);
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`CSV is missing the "${name}" column`);
    return i;
  };
  const ix = Object.fromEntries(CSV_COLUMNS.map((c) => [c, col(c)])) as Record<(typeof CSV_COLUMNS)[number], number>;
  const bySitting = new Map<string, string[][]>();
  for (const r of rows) bySitting.set(r[ix.sitting], [...(bySitting.get(r[ix.sitting]) ?? []), r]);
  const papers: TPaper[] = [];
  for (const [sitting, rs] of [...bySitting.entries()].sort()) {
    const sections = new Map<string, { id: string; attempt: number; of: number }>();
    const seen = new Set<string>();
    const questions = rs.map((r) => {
      const sec = r[ix.section],
        rule = { id: sec, attempt: Number(r[ix.attempt]), of: Number(r[ix.of]) };
      const prev = sections.get(sec);
      if (prev && (prev.attempt !== rule.attempt || prev.of !== rule.of)) throw new Error(`${sitting}: section ${sec} has conflicting attempt/of values`);
      sections.set(sec, rule);
      const id = `${sec}-${r[ix.number]}`;
      if (seen.has(id)) throw new Error(`${sitting}: duplicate question ${id}`);
      seen.add(id);
      return {
        id,
        section: sec,
        number: r[ix.number],
        marks: Number(r[ix.marks]),
        or_group: r[ix.or_group] || null,
        descriptor: r[ix.descriptor],
        topic_ids: r[ix.topic_ids]
          ? r[ix.topic_ids]
              .split(/[;|]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        ...(r[ix.question_type] ? { question_type: r[ix.question_type] } : {}),
        ...(r[ix.page] ? { page: Number(r[ix.page]) } : {}),
      };
    });
    let max = 0;
    for (const s of sections.values()) {
      const groups = new Map<string, number>();
      for (const q of questions.filter((x) => x.section === s.id)) {
        const g = q.or_group ?? q.id;
        groups.set(g, Math.max(groups.get(g) ?? 0, q.marks));
      }
      max += [...groups.values()]
        .sort((a, b) => b - a)
        .slice(0, s.attempt)
        .reduce((a, b) => a + b, 0);
    }
    const first = rs[0];
    papers.push(
      Paper.parse({
        id: `${university}/${subject}/${sitting}`,
        university,
        subject,
        sitting,
        course_code: first[ix.course_code],
        ...(first[ix.set] ? { set: first[ix.set] } : {}),
        max_marks: max,
        source_url: first[ix.source_url] || "MISSING - add the official URL",
        synthetic,
        sections: [...sections.values()],
        questions,
      }),
    );
  }
  return papers;
}
