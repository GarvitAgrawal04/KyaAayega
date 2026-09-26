#!/usr/bin/env tsx
/**
 * parse-pdf.ts — Extracts question structure from a university exam paper PDF.
 *
 * IMPORTANT CONSTRAINTS (from AGENT-GUIDE.md):
 * - NO verbatim question text in the output (descriptors ≤ 8 words)
 * - NO PDFs committed to the repo (output goes to local/ which is git-ignored)
 * - This script is a TOOL, not part of npm run verify
 *
 * Usage:
 *   tsx scripts/parse-pdf.ts <path-to-pdf> <univ/subject> <sitting> [--course-code CODE] [--source-url URL]
 *
 * Example:
 *   tsx scripts/parse-pdf.ts local/os-2020-12.pdf upes/os 2020-12 --course-code CSPC301 --source-url "https://library.ddn.upes.ac.in/..."
 *
 * Output:
 *   local/<univ>-<subject>-<sitting>.csv  (draft CSV ready for human review + import)
 *
 * Strategy:
 *   1. Extract raw text from PDF using Node.js (no external deps)
 *   2. Detect section headers (Section A/B/C, attempt-n-of-m patterns)
 *   3. Detect question numbers and marks
 *   4. Generate ≤8-word descriptors by truncating and neutralizing
 *   5. Leave topic_ids empty — human must fill these from the syllabus
 *   6. Write draft CSV to local/
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";

// ── CLI Argument Parsing ─────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Usage: tsx scripts/parse-pdf.ts <pdf-path> <univ/subject> <sitting> [--course-code CODE] [--source-url URL]");
  console.error("Example: tsx scripts/parse-pdf.ts local/os-2020-12.pdf upes/os 2020-12 --course-code CSPC301");
  process.exit(1);
}

const pdfPath = resolve(args[0]!);
const [univ, subject] = args[1]!.split("/");
const sitting = args[2]!;

let courseCode = "UNKNOWN";
let sourceUrl = "";

for (let i = 3; i < args.length; i++) {
  if (args[i] === "--course-code" && args[i + 1]) {
    courseCode = args[++i]!;
  } else if (args[i] === "--source-url" && args[i + 1]) {
    sourceUrl = args[++i]!;
  }
}

if (!existsSync(pdfPath)) {
  console.error(`File not found: ${pdfPath}`);
  process.exit(1);
}

if (!sitting.match(/^\d{4}-\d{2}$/)) {
  console.error(`Invalid sitting format: ${sitting}. Expected YYYY-MM.`);
  process.exit(1);
}

// ── PDF Text Extraction (basic binary parse) ─────────────────────────────────

/**
 * Minimal PDF text extractor — handles simple text-only PDFs.
 * For complex PDFs with images/scanned content, use external tools
 * (pdftotext, pdf.js, etc.) and pipe the output through this script.
 *
 * Falls back to providing a scaffold if extraction fails.
 */
function extractTextFromPdf(path: string): string {
  const buf = readFileSync(path);
  const content = buf.toString("latin1");

  // Try to extract text from PDF stream objects
  const texts: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match;

  while ((match = streamRegex.exec(content)) !== null) {
    const stream = match[1]!;
    // Extract text between BT...ET (Begin Text / End Text) blocks
    const textBlocks = stream.match(/BT[\s\S]*?ET/g) || [];
    for (const block of textBlocks) {
      // Extract text from Tj and TJ operators
      const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
      for (const tj of tjMatches) {
        const text = tj.replace(/\(([^)]*)\)\s*Tj/, "$1");
        if (text.trim()) texts.push(text.trim());
      }
      // Also try TJ arrays
      const tjArrays = block.match(/\[([^\]]*)\]\s*TJ/g) || [];
      for (const tja of tjArrays) {
        const parts = tja.match(/\(([^)]*)\)/g) || [];
        const combined = parts.map((p) => p.replace(/[()]/g, "")).join("");
        if (combined.trim()) texts.push(combined.trim());
      }
    }
  }

  return texts.join("\n");
}

// ── Question Structure Detection ─────────────────────────────────────────────

interface RawQuestion {
  section: string;
  number: string;
  marks: number;
  orGroup: string | null;
  rawText: string;
}

interface DetectedSection {
  id: string;
  attempt: number;
  of: number;
}

function detectSections(text: string): DetectedSection[] {
  const sections: DetectedSection[] = [];
  // Common patterns: "Section A", "SECTION-A", "Part A", etc.
  const sectionPattern = /(?:section|part)\s*[-–]?\s*([A-E])/gi;
  // Common patterns: "Attempt any 5 out of 10", "Answer any 2 of 4", "Attempt all"
  const attemptPattern = /(?:attempt|answer)\s+(?:any\s+)?(\d+)\s+(?:out\s+)?(?:of|from)\s+(\d+)/gi;
  const attemptAllPattern = /(?:attempt|answer)\s+all/gi;

  let match;
  const sectionIds = new Set<string>();

  while ((match = sectionPattern.exec(text)) !== null) {
    const id = match[1]!.toUpperCase();
    if (!sectionIds.has(id)) {
      sectionIds.add(id);
      // Look for attempt pattern near this section header
      const nearby = text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 200));
      let attempt = 0;
      let of = 0;

      const attemptMatch = attemptPattern.exec(nearby);
      if (attemptMatch) {
        attempt = parseInt(attemptMatch[1]!);
        of = parseInt(attemptMatch[2]!);
      } else if (attemptAllPattern.test(nearby)) {
        // Will be filled later based on question count
        attempt = -1; // placeholder
        of = -1;
      }

      sections.push({ id, attempt, of });
    }
  }

  // Default: if no sections detected, assume single section A
  if (sections.length === 0) {
    sections.push({ id: "A", attempt: 0, of: 0 });
  }

  return sections;
}

function detectQuestions(text: string, sections: DetectedSection[]): RawQuestion[] {
  const questions: RawQuestion[] = [];
  // Common patterns: "Q.1", "Q1.", "1.", "1)", "Q. 1", "(a)", "1a)", etc.
  const qPattern = /(?:Q\.?\s*)?(\d+)\s*[.)]\s*(.*?)(?=(?:Q\.?\s*)?\d+\s*[.)]|$)/gs;
  // Marks patterns: "(5 marks)", "[5]", "(5)", "5 marks", "5M"
  const marksPattern = /(?:\((\d+)\s*(?:marks?|M)?\)|\[(\d+)\]|(\d+)\s*marks?)/i;
  // OR pattern: "OR", "Or"
  const orPattern = /\bOR\b/i;

  let currentSection = sections[0]?.id || "A";

  // Try to detect questions from text
  let qMatch;
  while ((qMatch = qPattern.exec(text)) !== null) {
    const number = qMatch[1]!;
    const remainder = qMatch[2] || "";

    // Check for section change
    for (const s of sections) {
      if (new RegExp(`section\\s*[-–]?\\s*${s.id}`, "i").test(remainder)) {
        currentSection = s.id;
      }
    }

    // Detect marks
    const marksMatch = marksPattern.exec(remainder);
    const marks = marksMatch ? parseInt(marksMatch[1] || marksMatch[2] || marksMatch[3] || "0") : 0;

    // Check for OR relationship
    const hasOr = orPattern.test(remainder);

    questions.push({
      section: currentSection,
      number,
      marks: marks || 5, // default 5 if not detected
      orGroup: hasOr ? `or-${number}` : null,
      rawText: remainder.substring(0, 100),
    });
  }

  return questions;
}

/**
 * Create a ≤8 word neutral descriptor.
 * This deliberately strips content to avoid storing verbatim question text.
 */
function createDescriptor(text: string): string {
  // Remove marks indicators
  const cleaned = text
    .replace(/\(\d+\s*marks?\)/gi, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\d+\s*marks?/gi, "")
    .replace(/[()[\]]/g, "")
    .trim();

  // Take first 8 words
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const descriptor = words.slice(0, 8).join(" ");

  // If too short or empty, return a placeholder
  return descriptor.length > 2 ? descriptor : "TODO describe question";
}

// ── CSV Generation ───────────────────────────────────────────────────────────

function generateCsv(questions: RawQuestion[], sections: DetectedSection[]): string {
  const header = "sitting,course_code,set,section,attempt,of,number,marks,or_group,descriptor,topic_ids,question_type,page,source_url";

  const rows = questions.map((q) => {
    const section = sections.find((s) => s.id === q.section);
    const attempt = section?.attempt && section.attempt > 0 ? section.attempt : questions.filter((x) => x.section === q.section).length;
    const of = section?.of && section.of > 0 ? section.of : questions.filter((x) => x.section === q.section).length;

    const descriptor = createDescriptor(q.rawText);
    const fields = [
      sitting,
      courseCode,
      "", // set
      q.section,
      attempt,
      of,
      q.number,
      q.marks,
      q.orGroup || "",
      `"${descriptor.replace(/"/g, '""')}"`, // CSV-escape
      "", // topic_ids — HUMAN MUST FILL
      "", // question_type
      "", // page
      sourceUrl ? `"${sourceUrl}"` : "",
    ];
    return fields.join(",");
  });

  return [header, ...rows].join("\n") + "\n";
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n📄 Parsing: ${basename(pdfPath)}`);
console.log(`   Subject: ${univ}/${subject}`);
console.log(`   Sitting: ${sitting}`);
console.log(`   Course:  ${courseCode}\n`);

const text = extractTextFromPdf(pdfPath);

if (text.length < 50) {
  console.log("⚠️  Could not extract meaningful text from PDF (might be scanned/image-based).");
  console.log("   Generating scaffold CSV with placeholders — you'll need to fill it manually.\n");

  // Generate a scaffold with common exam structure
  const scaffoldCsv = generateScaffoldCsv();
  const outPath = resolve("local", `${univ}-${subject}-${sitting}.csv`);
  mkdirSync(resolve("local"), { recursive: true });
  writeFileSync(outPath, scaffoldCsv);
  console.log(`✅ Scaffold written to: ${outPath}`);
  console.log("   Fill in the descriptor and topic_ids columns, then import with:");
  console.log(`   npm run kya -- import-csv ${outPath} ${univ}/${subject}\n`);
} else {
  console.log(`   Extracted ${text.length} characters of text.`);

  const sections = detectSections(text);
  console.log(`   Detected ${sections.length} section(s): ${sections.map((s) => `${s.id}(${s.attempt}/${s.of})`).join(", ")}`);

  const questions = detectQuestions(text, sections);
  console.log(`   Detected ${questions.length} question(s).\n`);

  if (questions.length === 0) {
    console.log("⚠️  No questions detected. Generating scaffold instead.\n");
    const scaffoldCsv = generateScaffoldCsv();
    const outPath = resolve("local", `${univ}-${subject}-${sitting}.csv`);
    mkdirSync(resolve("local"), { recursive: true });
    writeFileSync(outPath, scaffoldCsv);
    console.log(`✅ Scaffold written to: ${outPath}`);
  } else {
    const csv = generateCsv(questions, sections);
    const outPath = resolve("local", `${univ}-${subject}-${sitting}.csv`);
    mkdirSync(resolve("local"), { recursive: true });
    writeFileSync(outPath, csv);
    console.log(`✅ Draft CSV written to: ${outPath}`);
    console.log("\n⚠️  IMPORTANT: This is a DRAFT. You MUST:");
    console.log("   1. Verify all marks values against the original PDF");
    console.log("   2. Fix section attempt/of counts");
    console.log("   3. Write proper ≤8-word descriptors (no verbatim questions)");
    console.log("   4. Fill in topic_ids from the syllabus");
    console.log("   5. Set or_group for OR-choice questions");
    console.log(`\n   Then import: npm run kya -- import-csv ${outPath} ${univ}/${subject}`);
  }
}

function generateScaffoldCsv(): string {
  const header = "sitting,course_code,set,section,attempt,of,number,marks,or_group,descriptor,topic_ids,question_type,page,source_url";
  const rows: string[] = [];

  // Common exam structure: Section A (short, 5q × 2m), Section B (theory, attempt 3/5 × 10m), Section C (long, attempt 2/3 × 15m)
  const scaffoldSections = [
    { id: "A", attempt: 5, of: 5, count: 5, marks: 2, type: "short" },
    { id: "B", attempt: 3, of: 5, count: 5, marks: 10, type: "theory" },
    { id: "C", attempt: 2, of: 3, count: 3, marks: 15, type: "theory" },
  ];

  for (const s of scaffoldSections) {
    for (let i = 1; i <= s.count; i++) {
      rows.push(
        [
          sitting,
          courseCode,
          "", // set
          s.id,
          s.attempt,
          s.of,
          `${s.id.toLowerCase()}${i}`,
          s.marks,
          "", // or_group
          "TODO describe question", // descriptor placeholder
          "", // topic_ids — HUMAN MUST FILL
          s.type,
          "", // page
          sourceUrl ? `"${sourceUrl}"` : "",
        ].join(","),
      );
    }
  }

  return [header, ...rows].join("\n") + "\n";
}
