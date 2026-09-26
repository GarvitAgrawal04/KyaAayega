import { createHash } from "node:crypto";

/** Canonical JSON: keys sorted, no whitespace. Same object -> same bytes -> same hash, on any machine. */
export function canonicalize(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
  const o = v as Record<string, unknown>;
  return (
    "{" +
    Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonicalize(o[k]))
      .join(",") +
    "}"
  );
}
export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
export const round4 = (x: number) => Math.round(x * 1e4) / 1e4;
