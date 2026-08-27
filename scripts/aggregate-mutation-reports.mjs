import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "reports/mutation-shards");
const threshold = Number(process.argv[3] ?? 60);
const expectedReports = Number(process.env.EXPECTED_MUTATION_SHARDS ?? 4);
const scoreMode = process.env.MUTATION_SCORE_MODE ?? "total";
const maxNoCoverageRaw = process.env.MAX_NO_COVERAGE;
const maxNoCoverage =
  maxNoCoverageRaw === undefined ? null : Number(maxNoCoverageRaw);

if (!new Set(["total", "covered"]).has(scoreMode)) {
  throw new Error(`MUTATION_SCORE_MODE invalide: ${scoreMode}`);
}

if (maxNoCoverage !== null && !Number.isFinite(maxNoCoverage)) {
  throw new Error(`MAX_NO_COVERAGE invalide: ${maxNoCoverageRaw}`);
}

function findReports(dir) {
  const reports = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      reports.push(...findReports(path));
    } else if (entry === "mutation.json") {
      reports.push(path);
    }
  }
  return reports;
}

const reportPaths = findReports(root);
if (reportPaths.length !== expectedReports) {
  throw new Error(
    `Rapports mutation incomplets: ${reportPaths.length}/${expectedReports} trouves dans ${root}`,
  );
}

const counts = {
  Killed: 0,
  Timeout: 0,
  Survived: 0,
  NoCoverage: 0,
  CompileError: 0,
  RuntimeError: 0,
  Ignored: 0,
  Pending: 0,
};
const seen = new Set();

for (const reportPath of reportPaths) {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  for (const [fileName, file] of Object.entries(report.files ?? {})) {
    for (const mutant of file.mutants ?? []) {
      const key = `${fileName}:${mutant.id}`;
      if (seen.has(key)) {
        throw new Error(`Mutant duplique entre shards: ${key}`);
      }
      seen.add(key);
      counts[mutant.status] = (counts[mutant.status] ?? 0) + 1;
    }
  }
}

const detected = counts.Killed + counts.Timeout;
const valid = detected + counts.Survived + counts.NoCoverage;
const covered = detected + counts.Survived;
const score = valid === 0 ? 100 : (detected / valid) * 100;
const coveredScore = covered === 0 ? 100 : (detected / covered) * 100;
const selectedScore = scoreMode === "covered" ? coveredScore : score;
const errors = counts.CompileError + counts.RuntimeError;

console.log("Mutation aggregate");
console.log(`reports=${reportPaths.length}`);
console.log(`mutants=${valid}`);
console.log(`coveredMutants=${covered}`);
console.log(`killed=${counts.Killed}`);
console.log(`timeout=${counts.Timeout}`);
console.log(`survived=${counts.Survived}`);
console.log(`noCoverage=${counts.NoCoverage}`);
console.log(`errors=${errors}`);
console.log(`mutationScore=${score.toFixed(2)}%`);
console.log(`coveredMutationScore=${coveredScore.toFixed(2)}%`);
console.log(`scoreMode=${scoreMode}`);
console.log(`breakThreshold=${threshold.toFixed(2)}%`);
if (maxNoCoverage !== null) {
  console.log(`maxNoCoverage=${maxNoCoverage}`);
}

if (errors > 0) {
  throw new Error(`Mutation reports contain ${errors} execution errors.`);
}

if (maxNoCoverage !== null && counts.NoCoverage > maxNoCoverage) {
  throw new Error(
    `NoCoverage ${counts.NoCoverage} exceeds allowed maximum ${maxNoCoverage}.`,
  );
}

if (selectedScore < threshold) {
  throw new Error(
    `${scoreMode === "covered" ? "Covered mutation" : "Mutation"} score ${selectedScore.toFixed(2)}% is below break threshold ${threshold.toFixed(2)}%.`,
  );
}

console.log(
  `${scoreMode === "covered" ? "Covered mutation" : "Mutation"} score ${selectedScore.toFixed(2)}% passes threshold ${threshold.toFixed(2)}%.`,
);
