import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

describe("repository secret hygiene", () => {
  it("does not track local agent worktrees or settings", () => {
    const offenders = trackedFiles.filter(
      (path) =>
        path.startsWith(".claude/worktrees/") ||
        /^\.claude\/(?:.*\/)?settings\.local\.json$/.test(path)
    );

    expect(offenders).toEqual([]);
  });

  it("does not track local environment files", () => {
    const offenders = trackedFiles.filter((path) => {
      const name = path.split("/").at(-1) ?? "";
      return /^\.env(?:\..+)?$/.test(name) && name !== ".env.example";
    });

    expect(offenders).toEqual([]);
  });

  it("does not track private Android signing material", () => {
    const offenders = trackedFiles.filter(
      (path) =>
        /(?:^|\/)keystore\.properties$/.test(path) ||
        /\.(?:jks|keystore)$/.test(path) ||
        /(?:^|\/)google-services(?:\.[^/]+)?\.json$/.test(path)
    );

    expect(offenders).toEqual([]);
  });
});
