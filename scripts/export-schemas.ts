// Language-agnostic JSON Schemas generated from the zod definitions, so contributors can validate data without TypeScript.
import fs from "node:fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Paper, Syllabus } from "../src/schemas";
fs.mkdirSync("schema", { recursive: true });
for (const [name, s] of Object.entries({ paper: Paper, syllabus: Syllabus })) {
  fs.writeFileSync(`schema/${name}.schema.json`, JSON.stringify(zodToJsonSchema(s, { name, $refStrategy: "none" }), null, 2) + "\n");
  console.log(`wrote schema/${name}.schema.json`);
}
