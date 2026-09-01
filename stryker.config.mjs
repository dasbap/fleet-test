const profile = process.env.MUTATION_PROFILE ?? "critical";
const mutationShard = process.env.MUTATION_SHARD?.trim() || null;
const criticalShard = process.env.MUTATION_CRITICAL_SHARD?.trim() || null;

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

const prFiles = [
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
];

const prShards = {
  "1": [
    "src/server/http/routes/gpsIngest.ts",
    "src/server/http/routes/webhooksPayment.ts",
  ],
  "2": [
    "src/services/subscription-management.service.ts",
    "src/services/billing.service.ts",
    "src/services/vehicle-search.service.ts",
  ],
  "3": [
    "src/server/domain/notchPayInitiate.ts",
    "src/services/admin-subscription.service.ts",
    "src/services/access-code.service.ts",
  ],
  "4": [
    "src/services/vehicle.service.ts",
    "src/server/domain/mobileMoneyInitiate.ts",
    "src/server/domain/billingCheckout.ts",
    "src/server/domain/billing/billingAuthorization.ts",
    "src/server/domain/billing/paymentIntent.ts",
    "src/services/payment-history.service.ts",
  ],
};

const criticalShards = {
  "1": ["src/server/domain/**/*.{ts,tsx}"],
  "2": ["src/server/http/**/*.{ts,tsx}"],
  "3": [
    "src/server/*.{ts,tsx}",
    "src/server/infra/**/*.{ts,tsx}",
    "src/server/payments/**/*.{ts,tsx}",
    "api/**/*.{ts,tsx}",
  ],
  "4": [
    "src/services/[A-Fa-f]*.{ts,tsx}",
    "src/services/[A-Fa-f]*/**/*.{ts,tsx}",
  ],
  "5": [
    "src/services/[G-Mg-m]*.{ts,tsx}",
    "src/services/[G-Mg-m]*/**/*.{ts,tsx}",
  ],
  "6": [
    "src/services/[N-Sn-s]*.{ts,tsx}",
    "src/services/[N-Sn-s]*/**/*.{ts,tsx}",
  ],
  "7": [
    "src/services/[T-Zt-z]*.{ts,tsx}",
    "src/services/[T-Zt-z]*/**/*.{ts,tsx}",
  ],
  "8": [
    "src/lib/**/*{billing,payment,subscription,vehicle,fleet,auth,security,gps,entitlement}*.{ts,tsx}",
    "packages/**/*{billing,payment,subscription,vehicle,auth,security,gps}*.{ts,tsx}",
  ],
};

const profiles = {
  pr: [...prFiles, ...exclusions],
  critical: [
    "src/server/**/*.{ts,tsx}",
    "src/services/**/*.{ts,tsx}",
    "src/lib/**/*{billing,payment,subscription,vehicle,fleet,auth,security,gps,entitlement}*.{ts,tsx}",
    "api/**/*.{ts,tsx}",
    "packages/**/*{billing,payment,subscription,vehicle,auth,security,gps}*.{ts,tsx}",
    ...exclusions,
  ],
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

if (mutationShard && profile !== "pr") {
  throw new Error("MUTATION_SHARD est reserve au profil pr.");
}

if (criticalShard && profile !== "critical") {
  throw new Error("MUTATION_CRITICAL_SHARD est reserve au profil critical.");
}

if (mutationShard && criticalShard) {
  throw new Error("Un seul type de shard mutation peut etre actif a la fois.");
}

if (mutationShard && !(mutationShard in prShards)) {
  throw new Error(`MUTATION_SHARD inconnu: ${mutationShard}. Valeurs: ${Object.keys(prShards).join(", ")}`);
}

if (criticalShard && !(criticalShard in criticalShards)) {
  throw new Error(
    `MUTATION_CRITICAL_SHARD inconnu: ${criticalShard}. Valeurs: ${Object.keys(criticalShards).join(", ")}`,
  );
}

const shardFiles = mutationShard
  ? prShards[mutationShard]
  : criticalShard
    ? criticalShards[criticalShard]
    : null;
const mutate = shardFiles ? [...shardFiles, ...exclusions] : profiles[profile];
const reportProfile = mutationShard
  ? `${profile}-shard-${mutationShard}`
  : criticalShard
    ? `${profile}-shard-${criticalShard}`
    : profile;
const reportDir = `reports/mutation/${reportProfile}`;
const shardLabel = mutationShard
  ? ` shard=${mutationShard}/4`
  : criticalShard
    ? ` shard=${criticalShard}/8`
    : "";

console.log(`[mutation] profile=${profile}${shardLabel}`);

export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  mutate,
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
    break: shardFiles ? 0 : 60,
  },
  timeoutMS: 15000,
  timeoutFactor: 1.5,
  concurrency: 2,
  incremental: true,
  incrementalFile: `${reportDir}/stryker-incremental.json`,
  tempDirName: `.stryker-tmp-${reportProfile}`,
  cleanTempDir: true,
  allowConsoleColors: true,
};
