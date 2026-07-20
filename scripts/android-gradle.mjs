#!/usr/bin/env node
/**
 * Exécute une tâche Gradle Android (ex. clean, assembleDebug).
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ensureAndroidLocalProperties } from "./ensure-android-sdk-dir.mjs";

const task = process.argv[2] ?? "clean";
const androidDir = ensureAndroidLocalProperties();
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const gradlePath = join(androidDir, gradle);

const result = spawnSync(gradlePath, [task], {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
