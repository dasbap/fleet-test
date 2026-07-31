import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;
const SEARCH_ROOTS = ["src", "tests"];
const ASSERTION_NAMES = "(?:expect|assert)";
const TRUE_FALLBACK = "(?:\\|\\|\\s*true|\\?\\?\\s*true)";

const TRIVIAL_ASSERTION_PATTERNS = [
  new RegExp(`${ASSERTION_NAMES}\\s*\\([^\\n)]*${TRUE_FALLBACK}`),
  new RegExp(`\\.to(?:Be|Equal|StrictEqual)\\s*\\([^\\n)]*${TRUE_FALLBACK}`),
];

function listTestFiles(root: string): string[] {
  const entries = readdirSync(root);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...listTestFiles(fullPath));
      continue;
    }

    if (TEST_FILE_PATTERN.test(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("test suite assertion policy", () => {
  it("does not allow assertions with a true fallback", () => {
    const offenders = SEARCH_ROOTS.flatMap(listTestFiles).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return TRIVIAL_ASSERTION_PATTERNS.flatMap((pattern) =>
        pattern.test(source) ? [relative(process.cwd(), file)] : [],
      );
    });

    expect(offenders).toEqual([]);
  });
});
