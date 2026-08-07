import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(process.cwd(), "src");
const SOURCE_EXTENSIONS = [".ts", ".tsx"];
const TEST_FILE_PATTERN = /(?:^|[\\/])[^\\/]+\.(?:test|spec)\.tsx?$/;
const INTERNAL_WINDOW_NAVIGATION_PATTERN =
  /window\.location\.(?:href|assign|replace)\s*(?:=\s*(?:["'`]\/|ROUTE_PATHS\.|`\$\{ROUTE_PATHS\.)|\(\s*(?:["'`]\/|ROUTE_PATHS\.|`\$\{ROUTE_PATHS\.))/;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return listSourceFiles(fullPath);
    if (!SOURCE_EXTENSIONS.some((extension) => fullPath.endsWith(extension))) return [];
    if (TEST_FILE_PATTERN.test(fullPath)) return [];
    return [fullPath];
  });
}

describe("navigation SPA", () => {
  it("n'utilise pas window.location pour les routes internes", () => {
    const offenders = listSourceFiles(SRC_ROOT).flatMap((file) => {
      const content = readFileSync(file, "utf8");
      return content
        .split(/\r?\n/)
        .map((line, index) => ({ line, index: index + 1 }))
        .filter(({ line }) => INTERNAL_WINDOW_NAVIGATION_PATTERN.test(line))
        .map(({ line, index }) => `${relative(process.cwd(), file)}:${index} ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });
});
