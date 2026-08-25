import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src", "apps", "api", "scripts", "supabase/functions"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const READ_API_PATTERN = /\b(?:XLSX|xlsx)\s*\.\s*(?:read|readFile)\s*\(/;

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (SOURCE_EXTENSIONS.has(extname(path))) {
      files.push(path);
    }
  }
  return files;
}

describe("xlsx security boundary", () => {
  it("does not parse arbitrary spreadsheet files with the legacy xlsx dependency", () => {
    const violations = ROOTS.flatMap(sourceFiles).filter((path) =>
      READ_API_PATTERN.test(readFileSync(path, "utf8")),
    );
    expect(violations).toEqual([]);
  });
});
