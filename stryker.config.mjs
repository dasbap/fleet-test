const profile = process.env.MUTATION_PROFILE ?? "critical";

const exclusions = [
  "!src/test/**",
  "!src/**/__tests__/**",
  "!src/**/*.test.{ts,tsx}",
  "!src/**/*.spec.{ts,tsx}",
  "!api/**/*.test.{ts,tsx}",
  "!api/**/*.spec.{ts,tsx}",
  "!packages/**/__tests__/**",
  "!packages/**/*.test.{ts,tsx}",
  "!packages/**/*.spec.{ts,tsx}",
  "!**/*.d.ts",
  "!**/generated/**",
  "!**/*.generated.{ts,tsx}",
  "!src/integrations/supabase/types.ts",
  "!src/main.tsx",
  "!src/vite-env.d.ts",
];

const profiles = {
  // Gate rapide pour PR : uniquement les invariants les plus sensibles.
  pr: [
    "src/server/domain/billing/**/*.{ts,tsx}",
    "src/server/domain/*{Billing,billing,Payment,payment,Money,money,Notch,notch}*.{ts,tsx}",
    "src/server/payments/**/*.{ts,tsx}",
    "src/server/http/**/*{auth,Auth,password,Password,security,Security,webhook,Webhook,gps,Gps,billing,Billing,payment,Payment,subscription,Subscription}*.{ts,tsx}",
    "src/services/*{billing,payment,subscription,vehicle,assignment,access-code,auth,security,gps}*.{ts,tsx}",
    ...exclusions,
  ],

  // Validation pre-prod : toutes les couches serveur et services métier critiques.
  critical: [
    "src/server/**/*.{ts,tsx}",
    "src/services/**/*.{ts,tsx}",
    "src/lib/**/*{billing,payment,subscription,vehicle,fleet,auth,security,gps,entitlement}*.{ts,tsx}",
    "api/**/*.{ts,tsx}",
    "packages/**/*{billing,payment,subscription,vehicle,auth,security,gps}*.{ts,tsx}",
    ...exclusions,
  ],

  // Audit manuel large. Jamais lancé automatiquement dans les PR.
  full: [
    "src/**/*.{ts,tsx}",
    "api/**/*.{ts,tsx}",
    "packages/**/*.{ts,tsx}",
    ...exclusions,
  ],
};

if (!(profile in profiles)) {
  throw new Error(
    `MUTATION_PROFILE inconnu: ${profile}. Valeurs: ${Object.keys(profiles).join(", ")}`,
  );
}

const reportDir = `reports/mutation/${profile}`;

console.log(`[mutation] profile=${profile}`);

export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  mutate: profiles[profile],
  vitest: {
    related: true,
  },
  ignoreStatic: true,
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: {
    fileName: `${reportDir}/mutation.html`,
  },
  jsonReporter: {
    fileName: `${reportDir}/mutation.json`,
  },
  thresholds: {
    high: 80,
    low: 60,
    break: profile === "pr" ? 40 : 50,
  },
  timeoutMS: 15000,
  timeoutFactor: 1.5,
  concurrency: 2,
  incremental: true,
  incrementalFile: `${reportDir}/stryker-incremental.json`,
  tempDirName: `.stryker-tmp-${profile}`,
  cleanTempDir: true,
  allowConsoleColors: true,
};
