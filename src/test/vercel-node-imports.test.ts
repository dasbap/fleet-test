import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { describe, expect, it } from "vitest";
import { globSync } from "glob";

const SERVER_ENTRY_GLOBS = ["api/**/*.ts", "src/server/**/*.ts"];

function readServerFiles() {
  return SERVER_ENTRY_GLOBS.flatMap((pattern) => globSync(pattern, { nodir: true }))
    .sort()
    .map((file) => ({
      file,
      source: readFileSync(file, "utf8"),
    }));
}

describe("Vercel Node function imports", () => {
  it("n'utilise pas les alias Vite dans les fichiers compiles par Vercel", () => {
    const offenders = readServerFiles()
      .filter(({ source }) => /from\s+["']@\//.test(source))
      .map(({ file }) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("declare les extensions .js sur les imports relatifs ESM", () => {
    const importPattern = /from\s+["'](\.{1,2}\/[^"']+)["']/g;
    const offenders = readServerFiles().flatMap(({ file, source }) =>
      Array.from(source.matchAll(importPattern))
        .map((match) => match[1])
        .filter((specifier) => !/\.(?:js|json|css)$/.test(specifier))
        .map((specifier) => `${relative(process.cwd(), file)} -> ${specifier}`),
    );

    expect(offenders).toEqual([]);
  });
});
