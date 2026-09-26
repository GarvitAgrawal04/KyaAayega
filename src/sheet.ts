import { sha256, canonicalize } from "./canonical";

type Pred = {
  run_id: string;
  status: string;
  as_of: string;
  depth_label: string;
  priority_line: string;
  method: string;
  n_topics: number;
  corpus: { sittings: string[]; synthetic: boolean };
  topics: {
    rank: number;
    name: string;
    unit: string;
    times_asked: number;
    of_sittings: number;
    typical_marks: number | null;
    last_asked: string | null;
    history: boolean[];
  }[];
};
const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The student-facing artifact: one self-contained page (1080 px wide - screenshot it for WhatsApp, or print to PDF). History, never prophecy. */
export function renderSheet(pred: Pred, title: string, repoUrl = "[REPO LINK]", rows = 12): string {
  const code = sha256(canonicalize(pred)).slice(0, 8).toUpperCase();
  const marks: string[] = [];
  if (pred.corpus.synthetic) marks.push("SAMPLE - NUMBERS ARE MADE UP");
  if (pred.status === "rehearsal") marks.push("REHEARSAL");
  const body = pred.topics
    .slice(0, rows)
    .map(
      (t) =>
        `<tr><td class="n">${t.rank}<div class="u">${esc(t.unit)}</div></td><td class="t">${esc(t.name)}</td><td><span class="d" aria-hidden="true">${t.history.map((h) => (h ? "●" : "○")).join("")}</span> <span class="m">${t.times_asked}/${t.of_sittings}</span></td><td>${t.typical_marks == null ? "-" : t.typical_marks + " marks"}</td><td class="m">${t.last_asked ?? "-"}</td></tr>`,
    )
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} - KyaAayega Sheet</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f5f1e8;color:#1a1a17;font:26px/1.35 system-ui,"Segoe UI",Helvetica,sans-serif}
.sheet{width:1080px;margin:0 auto;padding:56px 60px;display:flex;flex-direction:column;gap:20px}.top{display:flex;justify-content:space-between;align-items:center;gap:16px}
.brand{font:700 40px Georgia,serif;color:#1f4e8c}.wm{border:2px solid #8f3710;color:#8f3710;border-radius:8px;padding:6px 14px;font-size:21px;font-weight:700;letter-spacing:.04em}
h1{font:600 68px/1.1 Georgia,serif;margin:0}.sub{color:#4a4a44}.line{background:#1a1a17;color:#f5f1e8;border-radius:10px;padding:16px 22px;font-size:30px;font-weight:600}
table{border-collapse:collapse;width:100%}th{font-size:20px;letter-spacing:.06em;color:#4a4a44;text-align:left;border-bottom:2px solid #1a1a17;padding:8px}td{padding:14px 8px;border-bottom:1px solid #cfc8b8;vertical-align:middle}
.n{font:500 32px ui-monospace,monospace;color:#1f4e8c;width:70px}.u{font:22px system-ui;color:#4a4a44}.t{font-weight:600;font-size:30px}.d{font-family:ui-monospace,monospace;letter-spacing:3px;white-space:nowrap}.m{font-family:ui-monospace,monospace;white-space:nowrap}
.foot{font-size:23px}.code{font:500 21px ui-monospace,monospace;color:#4a4a44}@media print{body{background:#fff}}</style></head><body><div class="sheet">
<div class="top"><div class="brand">KyaAayega</div>${marks.map((m) => `<div class="wm">${m}</div>`).join("")}</div>
<div><h1>${esc(title)}</h1><div class="sub">For the exam of ${esc(pred.as_of)} · built only from earlier papers: ${esc(pred.corpus.sittings.join(", ") || "none")}</div></div>
<div class="line">${esc(pred.priority_line)}</div>
<div>Each dot is one past paper, oldest on the left; a filled dot means the topic was asked.</div>
<table><thead><tr><th>#</th><th>TOPIC</th><th>PAST PAPERS</th><th>USUALLY</th><th>LATEST</th></tr></thead><tbody>
${body}
</tbody></table>
<div class="foot">Ranked by total marks asked in past papers - nothing else. Showing the first ${Math.min(rows, pred.topics.length)} of ${pred.n_topics} syllabus topics. Data depth: ${esc(pred.depth_label)}.</div>
<div class="code">Verify code ${code} · run ${esc(pred.run_id)} · full history, frozen files and scorecards: ${esc(repoUrl)}</div>
</div></body></html>
`;
}
