#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  scoreRun,
  buildPrediction,
  computeScoreboard,
  freezeRun,
  listSubjects,
  loadSubject,
  readManifest,
  scoreboardPath,
  verifyManifest,
  verifyNoLookAhead,
  verifyScoreboard,
} from "./ledger";
import { HEADLINE_CUT } from "./backtest";
import { answerable, studiedSet } from "./score";
import { rankTotalMarks, topicStats, ENTRANTS } from "./rank";
import { csvToPapers, papersToCsv } from "./csv";
import { renderSheet } from "./sheet";
import { injectScoreboard } from "./readme";
import { topicIds } from "./schemas";

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name: string) => args.includes(`--${name}`);
const ROOT = path.resolve(flag("ledger") ?? "ledger");
const pct = (x: number) => (x * 100).toFixed(1).padStart(5) + "%";

function usage(): never {
  console.log(`kya - open scoreboard for exam priority lists

  kya validate <univ/subject>                     schema + structural checks on the corpus
  kya rank <univ/subject> --as-of YYYY-MM         the priority list using only papers before that date
  kya backtest <univ/subject> [--write]           walk-forward scoreboard for every entrant
  kya freeze <univ/subject> --as-of YYYY-MM --status live|rehearsal
  kya score-run <univ/subject> <run-name>         score a frozen list against its now-published paper (uses the frozen file only)
  kya sheet <univ/subject> --as-of YYYY-MM [--out f]  the one-page Sheet as self-contained HTML (screenshot or print it)
  kya import-csv <file.csv> <univ/subject> [--synthetic]   spreadsheet rows -> validated paper JSON files
  kya export-csv <univ/subject> [--out f]         the corpus as one CSV (template for data entry and mapping review)
  kya readme [--check]                            regenerate the scoreboard table inside README.md
  kya verify                                      hashes + look-ahead test + scoreboard reproduction (exit 1 on any problem)
  kya new-subject <univ/subject> "Title"            scaffold a new subject: folder, syllabus skeleton, CSV template
  kya doctor                                      check environment + corpus health (synthetic flags, live runs missing proofs)
  kya build-web                                   writes web/data.js for the offline Time Machine
  options: --ledger <dir> (default ./ledger)`);
  process.exit(1);
}

try {
  switch (cmd) {
    case "validate": {
      const s = loadSubject(ROOT, args[1] ?? usage());
      console.log(
        `OK ${args[1]}: ${s.papers.length} papers, ${s.papers.reduce((a, p) => a + p.questions.length, 0)} questions, topic list fixed on ${s.syllabus.fixed_on}`,
      );
      break;
    }
    case "rank": {
      const s = loadSubject(ROOT, args[1] ?? usage());
      const asOf = flag("as-of") ?? usage();
      const p = buildPrediction(s, asOf, "rehearsal");
      console.log(`${s.syllabus.title} as of ${asOf} - ${p.depth_label}\n${p.priority_line}\n`);
      for (const t of p.topics.slice(0, 12))
        console.log(
          `${String(t.rank).padStart(2)}  ${t.name.padEnd(34)} ${t.history.map((h) => (h ? "●" : "○")).join("")}  ${t.times_asked}/${t.of_sittings}  usually ${t.typical_marks ?? "-"}  last ${t.last_asked ?? "-"}`,
        );
      break;
    }
    case "backtest": {
      const s = loadSubject(ROOT, args[1] ?? usage());
      const sb = computeScoreboard(s);
      if (sb.synthetic) console.log("!! SYNTHETIC CORPUS - these numbers prove the pipeline runs and nothing else.\n");
      console.log(`Coverage at the top ${HEADLINE_CUT * 100}% of ranked topics (choice-aware), ${sb.n_test} test sittings:\n`);
      const ids = Object.keys(sb.summary);
      const h = String(HEADLINE_CUT);
      console.log("sitting  train  " + ids.map((id) => id.padStart(6)).join("  "));
      for (const r of sb.sittings) console.log(`${r.sitting}  ${String(r.n_train).padStart(5)}  ` + ids.map((id) => pct(r.coverage[id][h])).join("  "));
      if (sb.n_test) console.log("mean            " + ids.map((id) => pct(sb.summary[id].mean[h])).join("  "));
      console.log("\nB0 random · B1 syllabus order · B2 last paper first · B3 OURS (total past marks) · C1 recency challenger · C2 gap-aware challenger");
      console.log(
        `\nOurs vs ${sb.headline.adversary}: won ${Math.round(sb.headline.share_positive * sb.n_test)}/${sb.n_test} sittings, median diff ${(sb.headline.median_diff * 100).toFixed(1)} pp, mean without best sitting ${(sb.headline.mean_diff_without_best * 100).toFixed(1)} pp`,
      );
      console.log(`Verdict: ${sb.headline.verdict}`);
      if (has("write")) {
        fs.writeFileSync(scoreboardPath(s), JSON.stringify(sb, null, 2) + "\n");
        console.log(`\nwrote ${path.relative(process.cwd(), scoreboardPath(s))}`);
      }
      break;
    }
    case "freeze": {
      const status = flag("status");
      if (status !== "live" && status !== "rehearsal") usage();
      const run = freezeRun(ROOT, args[1] ?? usage(), flag("as-of") ?? usage(), status);
      console.log(
        `Frozen ${run.run_id}\n  ${run.files[0].path}\n  sha256 ${run.files[0].sha256}\n\nNext, make it undeniable:\n  git add -A && git commit -m "freeze ${run.run_id}" && git tag "freeze/${run.run_id}"\n  ots stamp ${path.join(path.basename(ROOT), run.files[0].path)}     # OpenTimestamps: commit the .ots proof\n  save the public file URL at web.archive.org/save and record the snapshot URL in manifest.json`,
      );
      break;
    }
    case "score-run": {
      const card = scoreRun(ROOT, args[1] ?? usage(), args[2] ?? usage());
      console.log(`Scored ${card.run_id} against ${card.paper_id}`);
      for (const [id, c] of Object.entries(card.coverage))
        console.log(
          `  ${id}  ` +
            Object.entries(c)
              .map(([k, v]) => `top ${Number(k) * 100}%: ${pct(v)}`)
              .join("   "),
        );
      break;
    }
    case "sheet": {
      const s = loadSubject(ROOT, args[1] ?? usage());
      const asOf = flag("as-of") ?? usage();
      const out = path.resolve(flag("out") ?? `web/sheets/${args[1].replace("/", "-")}-${asOf}.html`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, renderSheet(buildPrediction(s, asOf, "rehearsal"), s.syllabus.title, flag("repo") ?? "[REPO LINK]"));
      console.log(`wrote ${path.relative(process.cwd(), out)} - open it, then screenshot at 1080 px wide or print to PDF`);
      break;
    }
    case "import-csv": {
      const file = args[1] ?? usage();
      const rel = args[2] ?? usage();
      const [u, sub] = rel.split("/");
      const papers = csvToPapers(fs.readFileSync(file, "utf8"), u, sub, has("synthetic"));
      const dir = path.join(ROOT, rel, "papers");
      fs.mkdirSync(dir, { recursive: true });
      for (const p of papers) fs.writeFileSync(path.join(dir, `${p.sitting}.json`), JSON.stringify(p, null, 2) + "\n");
      console.log(`wrote ${papers.length} paper(s) to ${path.relative(process.cwd(), dir)} - now run: kya validate ${rel}`);
      break;
    }
    case "export-csv": {
      const s = loadSubject(ROOT, args[1] ?? usage());
      const out = path.resolve(flag("out") ?? `${args[1].replace("/", "-")}.csv`);
      fs.writeFileSync(out, papersToCsv(s.papers));
      console.log(`wrote ${path.relative(process.cwd(), out)}`);
      break;
    }
    case "readme": {
      const boards = listSubjects(ROOT).map((rel) => computeScoreboard(loadSubject(ROOT, rel)));
      if (has("check")) {
        if (!injectScoreboard(path.resolve("README.md"), boards, true)) {
          console.error("kya: README scoreboard is stale - run: npm run kya -- readme");
          process.exit(1);
        }
        console.log("README scoreboard is up to date");
      } else {
        injectScoreboard(path.resolve("README.md"), boards);
        console.log("README scoreboard regenerated");
      }
      break;
    }
    case "verify": {
      let problems = verifyManifest(ROOT);
      for (const rel of listSubjects(ROOT)) {
        const s = loadSubject(ROOT, rel);
        problems = problems.concat(verifyNoLookAhead(s), verifyScoreboard(s));
      }
      if (problems.length) {
        console.error("VERIFY FAILED\n  " + problems.join("\n  "));
        process.exit(1);
      }
      console.log(`verify OK - ${readManifest(ROOT).runs.length} frozen run(s) match their hashes, no look-ahead, scoreboards reproduce`);
      break;
    }
    case "build-web": {
      const subjects = listSubjects(ROOT).map((rel) => {
        const s = loadSubject(ROOT, rel);
        const sb = computeScoreboard(s);
        const names = new Map(s.syllabus.units.flatMap((u) => u.topics.map((t) => [t.id, t.name] as const)));
        const sittings = sb.sittings.map((r) => {
          const paper = s.papers.find((p) => p.id === r.paper_id)!;
          const pred = buildPrediction(s, r.sitting, "rehearsal");
          const studied = studiedSet(rankTotalMarks(s.papers, s.syllabus, r.sitting), HEADLINE_CUT);
          return {
            sitting: r.sitting,
            n_train: r.n_train,
            depth_label: pred.depth_label,
            past_sittings: pred.corpus.sittings,
            sheet: pred.topics.slice(0, 12),
            n_topics: pred.n_topics,
            paper: {
              max_marks: paper.max_marks,
              sections: paper.sections,
              questions: paper.questions.map((q) => ({
                number: q.number,
                section: q.section,
                marks: q.marks,
                or_group: q.or_group,
                descriptor: q.descriptor,
                topics: q.topic_ids.map((t) => names.get(t) ?? t),
                hit: answerable(q, studied),
              })),
            },
            coverage: r.coverage,
          };
        });
        const all = topicStats(s.papers, s.syllabus);
        const unitOf = new Map(s.syllabus.units.flatMap((u) => u.topics.map((t) => [t.id, u.name] as const)));
        const history_map = {
          sittings: s.papers.map((p) => p.sitting),
          rows: topicIds(s.syllabus).map((id) => ({
            name: names.get(id),
            unit: unitOf.get(id),
            history: all.get(id)!.history,
            times_asked: all.get(id)!.times_asked,
            total_marks: Math.round(all.get(id)!.total_marks),
          })),
        };
        const labels = Object.fromEntries([["B0", "Random half"], ...Object.entries(ENTRANTS).map(([id, e]) => [id, e.label])]);
        const nSittings = s.papers.length;
        const topic_stats = topicIds(s.syllabus).map((id) => {
          const st = all.get(id)!;
          const freq = nSittings > 0 ? st.times_asked / nSittings : 0;
          let tier = "unasked";
          if (freq >= 0.6) tier = "core";
          else if (freq >= 0.3) tier = "high_yield";
          else if (st.times_asked > 0) tier = "recommended";
          return {
            id,
            name: names.get(id) ?? id,
            unit: unitOf.get(id) ?? "General",
            total_marks: Math.round(st.total_marks),
            times_asked: st.times_asked,
            of_sittings: nSittings,
            frequency_pct: Math.round(freq * 100),
            typical_marks: st.typical_marks,
            last_asked: st.last_asked,
            tier,
          };
        });
        const all_questions = s.papers.flatMap((p) =>
          p.questions.map((q) => ({
            id: q.id,
            sitting: p.sitting,
            course_code: p.course_code,
            set: p.set ?? "SET-01",
            section: q.section,
            number: q.number,
            marks: q.marks,
            or_group: q.or_group ?? null,
            descriptor: q.descriptor,
            topic_ids: q.topic_ids,
            topic_names: q.topic_ids.map((tid) => names.get(tid) ?? tid),
            question_type: q.question_type ?? "theoretical",
            bloom: q.bloom ?? "understand",
            page: q.page ?? 1,
          })),
        );
        return {
          rel,
          labels,
          history_map,
          title: s.syllabus.title,
          university: s.syllabus.university,
          synthetic: sb.synthetic,
          sittings,
          summary: sb.summary,
          headline: sb.headline,
          runs: readManifest(ROOT).runs.filter((x) => x.run_id.startsWith(rel + "/")),
          syllabus: s.syllabus,
          topic_stats,
          all_questions,
        };
      });
      fs.writeFileSync(
        path.resolve("web/data.js"),
        "window.KYA_DATA = " + JSON.stringify({ built_at: new Date().toISOString(), headline_cut: HEADLINE_CUT, subjects }) + ";\n",
      );
      console.log(`wrote web/data.js (${subjects.length} subject(s)) - open web/index.html, no server needed`);
      break;
    }
    case "new-subject": {
      const rel = args[1] ?? usage();
      const title = args[2] ?? usage();
      const [u, sub] = rel.split("/");
      if (!u || !sub) usage();
      const dir = path.join(ROOT, rel);
      const pdir = path.join(dir, "papers");
      if (fs.existsSync(path.join(dir, "syllabus.json"))) throw new Error(`${rel} already exists`);
      fs.mkdirSync(pdir, { recursive: true });
      const skeleton = {
        university: u,
        subject: sub,
        title,
        fixed_on: new Date().toISOString().slice(0, 10),
        units: [{ id: "u1", name: "REPLACE with the first unit name", topics: [{ id: "t-topic-1", name: "REPLACE with a real topic", aliases: [] }] }],
      };
      fs.writeFileSync(path.join(dir, "syllabus.json"), JSON.stringify(skeleton, null, 2) + "\n");
      const header = "sitting,course_code,set,section,attempt,of,number,marks,or_group,descriptor,topic_ids,question_type,page,source_url\n";
      fs.writeFileSync(path.join(dir, "papers.template.csv"), header);
      console.log(`Scaffolded ${rel}:
  ${path.relative(process.cwd(), path.join(dir, "syllabus.json"))}   <- fill from the OFFICIAL syllabus, set fixed_on BEFORE parsing test papers
  ${path.relative(process.cwd(), path.join(dir, "papers.template.csv"))}   <- one row per question; descriptor <= 8 words; NEVER the question text
Next:
  1) add a line per paper to PROVENANCE.md (official URL, class Official/Candidate-retained)
  2) fill the CSV, then: npm run kya -- import-csv ${path.relative(process.cwd(), path.join(dir, "papers.template.csv"))} ${rel}
  3) npm run kya -- validate ${rel} && npm run kya -- backtest ${rel} --write && npm run kya -- readme`);
      break;
    }
    case "doctor": {
      const problems: string[] = [];
      const notes: string[] = [];
      const major = Number(process.versions.node.split(".")[0]);
      notes.push(`node ${process.versions.node}` + (major < 20 ? "  !! this repo targets Node 20+" : ""));
      const subs = listSubjects(ROOT);
      notes.push(`${subs.length} subject(s): ${subs.join(", ") || "none"}`);
      for (const rel of subs) {
        const s = loadSubject(ROOT, rel);
        if (s.papers.some((p) => p.synthetic)) notes.push(`  ${rel}: SYNTHETIC - replace with real papers before publishing numbers`);
        const missing = s.papers.filter((p) => !p.source_url || /^SYNTHETIC|^MISSING/.test(p.source_url));
        if (missing.length) problems.push(`${rel}: ${missing.length} paper(s) without a real source_url`);
      }
      for (const r of readManifest(ROOT).runs)
        if (r.status === "live" && r.ots.length === 0) problems.push(`live run ${r.run_id} has no OpenTimestamps proof recorded`);
      problems.push(...verifyManifest(ROOT));
      const readme = path.resolve("README.md");
      if (fs.existsSync(readme) && !fs.readFileSync(readme, "utf8").includes("<!-- SCOREBOARD:START -->"))
        problems.push("README.md is missing the scoreboard markers");
      console.log("kya doctor\n  " + notes.join("\n  "));
      if (problems.length) {
        console.log("\nAttention:\n  " + problems.join("\n  "));
      } else console.log("\nAll checks passed.");
      break;
    }
    default:
      usage();
  }
} catch (e) {
  console.error("kya: " + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
