import fs from "node:fs";
import path from "node:path";

const migrationsDirectory = path.resolve("supabase/migrations");

if (!fs.existsSync(migrationsDirectory)) {
  console.error(`Dossier absent : ${migrationsDirectory}`);
  process.exit(1);
}

const migrationFiles = fs
  .readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const storagePatterns = [
  /\bstorage\.buckets\b/i,
  /\bstorage\.objects\b/i,
  /\bstorage\.foldername\s*\(/i,
];

const guardPatterns = [
  /to_regclass\s*\(\s*['"]storage\.buckets['"]\s*\)/i,
  /to_regclass\s*\(\s*['"]storage\.objects['"]\s*\)/i,
];

const problems = [];

for (const file of migrationFiles) {
  const filePath = path.join(migrationsDirectory, file);
  const content = fs.readFileSync(filePath, "utf8");

  const referencesStorage = storagePatterns.some((pattern) =>
    pattern.test(content)
  );

  if (!referencesStorage) {
    continue;
  }

  const referencesBuckets = /\bstorage\.buckets\b/i.test(content);
  const referencesObjects = /\bstorage\.objects\b/i.test(content);

  const guardsBuckets = guardPatterns[0].test(content);
  const guardsObjects = guardPatterns[1].test(content);

  if (referencesBuckets && !guardsBuckets) {
    problems.push({
      file,
      issue: "storage.buckets référencé sans garde to_regclass",
    });
  }

  if (referencesObjects && !guardsObjects) {
    problems.push({
      file,
      issue: "storage.objects référencé sans garde to_regclass",
    });
  }

  const createPolicies = [
    ...content.matchAll(
      /CREATE\s+POLICY\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))\s+ON\s+(?:public\.)?storage\.objects/gi
    ),
  ];

  for (const match of createPolicies) {
    const policyName = match[1] ?? match[2];
    const escapedPolicy = policyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const hasDrop = new RegExp(
      `DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+(?:"${escapedPolicy}"|${escapedPolicy})\\s+ON\\s+(?:public\\.)?storage\\.objects`,
      "i"
    ).test(content);

    if (!hasDrop) {
      problems.push({
        file,
        issue: `politique ${policyName} créée sans DROP POLICY IF EXISTS`,
      });
    }
  }
}

if (problems.length === 0) {
  console.log("Toutes les migrations Storage sont protégées.");
  process.exit(0);
}

console.error("Migrations Storage potentiellement non idempotentes :");

for (const problem of problems) {
  console.error(`- ${problem.file}: ${problem.issue}`);
}

process.exit(1);
