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
  // Gate PR rapide : uniquement des unités critiques avec couverture mutation effective.
  // Les gros flux partiellement couverts restent dans `critical` afin que NoCoverage
  // ne rende pas le check PR inutilisable.
  pr: [
    "src/server/domain/billing/billingAuthorization.ts",
    "src/server/domain/billing/paymentIntent.ts",
    "src/server/domain/billingCheckout.ts",
    "src/server/domain/mobileMoneyInitiate.ts",
    "src/server/domain/notchPayInitiate.ts",
    "src/server/http/routes/gpsIngest.ts",
    "src/server/http/routes/webhooksPayment.ts",
    "src/services/access-code.service.ts",
    "src/services/admin-subscription.service.ts",
    "src/services/billing.service.ts",
    "src/services/payment-history.service.ts",
    "src/services/subscription-management.service.ts",
    "src/services/vehicle-search.service.ts",
    "src/services/vehicle.service.ts",
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
