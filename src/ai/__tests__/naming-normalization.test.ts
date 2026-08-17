/**
 * Naming normalization guard. Asserts that no component/file/export in the
 * codebase carries an unnecessary "RT" prefix, while product-facing "RT AI"
 * text and the "RT Development" model labels are preserved.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(__dirname, "..", "..");

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

describe("naming normalization", () => {
  const files = walk(SRC).filter((f) => !f.includes("__tests__"));

  it("no RT-prefixed component files remain", () => {
    const offenders = files
      .map((f) => relative(SRC, f))
      .filter((f) => /\/RT[A-Z]\w+\.(ts|tsx)$/.test(f));
    expect(offenders).toEqual([]);
  });

  it("no internal RT-prefixed component exports/identifiers remain", () => {
    const identifierRe = /\bRT[A-Z][A-Za-z]+\b/g;
    const offenders: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(identifierRe)) {
        offenders.push(`${relative(SRC, f)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("preserves product-facing 'RT AI' references", () => {
    const brand = readFileSync(join(SRC, "components", "shell", "Brand.tsx"), "utf8");
    expect(brand).toContain("RT AI");
    const ctx = readFileSync(join(SRC, "ai", "context.ts"), "utf8");
    expect(ctx).toContain("You are RT AI");
  });
});
