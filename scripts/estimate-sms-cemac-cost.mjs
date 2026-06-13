#!/usr/bin/env node
/**
 * Estimation coût SMS CEMAC — Twilio vs Orange vs Brevo.
 *
 * Usage :
 *   node scripts/estimate-sms-cemac-cost.mjs
 *   node scripts/estimate-sms-cemac-cost.mjs --scenario s1 --json
 *   node scripts/estimate-sms-cemac-cost.mjs --drivers 50 --cm-share 0.8
 *
 * Variables d'environnement (optionnelles, tarifs Brevo à valider via calculateur compte) :
 *   BREVO_FCFA_PER_SEGMENT_CM   (défaut 80)
 *   BREVO_FCFA_PER_SEGMENT_OTHER (défaut 90)
 *   USD_TO_FCFA                  (défaut 600)
 *   ORANGE_FCFA_PER_SEGMENT      (défaut 22 — bundle 1000 SMS)
 */

const USD_TO_FCFA = Number(process.env.USD_TO_FCFA ?? 600);
const BREVO_FCFA_CM = Number(process.env.BREVO_FCFA_PER_SEGMENT_CM ?? 80);
const BREVO_FCFA_OTHER = Number(process.env.BREVO_FCFA_PER_SEGMENT_OTHER ?? 90);
const ORANGE_FCFA_PER_SEG = Number(process.env.ORANGE_FCFA_PER_SEGMENT ?? 22);

/** Tarifs Twilio outbound / segment (USD) — juin 2026, pages twilio.com/sms/pricing/{iso} */
const TWILIO_USD_PER_SEGMENT = {
  CM: 0.317,
  GA: 0.3146,
  CG: 0.3371,
  CF: 0.4518,
  TD: 0.3458,
  GQ: 0.2705,
  CD: 0.2584,
};

const CEMAC_COUNTRIES = ["CM", "GA", "CG", "CF", "TD", "GQ", "CD"];

/** Bundles Orange SMS Cameroun — developer.orange.com/apis/sms-cm/pricing */
const ORANGE_BUNDLES = [
  { name: "Bundle 1", sms: 100, fcfa: 2200 },
  { name: "Bundle 3", sms: 1000, fcfa: 22000 },
  { name: "Bundle 5", sms: 10000, fcfa: 170000 },
  { name: "Bundle 6", sms: 50000, fcfa: 800000 },
];

const SCENARIOS = {
  s0: {
    label: "S0 — Aujourd'hui",
    drivers: 50,
    fleets: 5,
    cmShare: 0.8,
    newDriversPerMonth: 8,
  },
  s1: {
    label: "S1 — 6 mois",
    drivers: 400,
    fleets: 30,
    cmShare: 0.6,
    newDriversPerMonth: 40,
  },
  s2: {
    label: "S2 — 12 mois",
    drivers: 2000,
    fleets: 100,
    cmShare: 0.5,
    newDriversPerMonth: 120,
  },
};

const DEFAULTS = {
  phoneAuthShare: 0.6,
  otpPerUserPerMonth: 3,
  segmentsPerOtp: 1,
  inactivityOnboardingRate: 0.3,
  onboardingSmsPerDriver: 2,
  segmentsPerOnboardingSms: 2,
  /** Alertes SMS plan Pro (futur) — hypothèse par conducteur actif / mois */
  proAlertSmsPerDriver: 0,
};

function parseArgs(argv) {
  const out = { scenario: "s0", json: false, drivers: null, cmShare: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--scenario" && argv[i + 1]) out.scenario = argv[++i];
    else if (a === "--drivers" && argv[i + 1]) out.drivers = Number(argv[++i]);
    else if (a === "--cm-share" && argv[i + 1]) out.cmShare = Number(argv[++i]);
  }
  return out;
}

function distributeOtpByCountry(otpSegments, cmShare) {
  const cmSeg = Math.round(otpSegments * cmShare);
  const otherSeg = otpSegments - cmSeg;
  const otherCountries = CEMAC_COUNTRIES.filter((c) => c !== "CM");
  const perCountry = Math.floor(otherSeg / otherCountries.length);
  let remainder = otherSeg - perCountry * otherCountries.length;
  const dist = { CM: cmSeg };
  for (const code of otherCountries) {
    dist[code] = perCountry + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return dist;
}

function twilioCostUsd(otpByCountry) {
  let total = 0;
  const byCountry = {};
  for (const [code, seg] of Object.entries(otpByCountry)) {
    const usd = seg * (TWILIO_USD_PER_SEGMENT[code] ?? 0.32);
    byCountry[code] = { segments: seg, usd: round2(usd) };
    total += usd;
  }
  return { totalUsd: round2(total), byCountry };
}

function brevoCostFcfa(otpByCountry) {
  let total = 0;
  for (const [code, seg] of Object.entries(otpByCountry)) {
    const rate = code === "CM" ? BREVO_FCFA_CM : BREVO_FCFA_OTHER;
    total += seg * rate;
  }
  return total;
}

function estimateVolumes(input) {
  const phoneAuthUsers = Math.round(input.drivers * input.phoneAuthShare);
  const otpSegments = phoneAuthUsers * input.otpPerUserPerMonth * input.segmentsPerOtp;

  const inactiveNew = input.newDriversPerMonth * input.inactivityOnboardingRate;
  const onboardingMessages = Math.round(inactiveNew * input.onboardingSmsPerDriver);
  const onboardingSegments = onboardingMessages * input.segmentsPerOnboardingSms;
  const onboardingSegmentsCm = Math.round(onboardingSegments * input.cmShare);

  const proAlertSegments = Math.round(
    input.drivers * input.proAlertSmsPerDriver * input.segmentsPerOtp,
  );

  const otpByCountry = distributeOtpByCountry(otpSegments, input.cmShare);

  return {
    phoneAuthUsers,
    otpSegments,
    otpByCountry,
    onboardingMessages,
    onboardingSegments,
    onboardingSegmentsCm,
    proAlertSegments,
    totalSegments: otpSegments + onboardingSegments + proAlertSegments,
  };
}

function estimateCosts(volumes) {
  const twilioOtp = twilioCostUsd(volumes.otpByCountry);
  const twilioOnboardingUsd = round2(
    volumes.onboardingSegments * TWILIO_USD_PER_SEGMENT.CM,
  );
  const orangeOnboardingFcfa = volumes.onboardingSegmentsCm * ORANGE_FCFA_PER_SEG;
  const brevoOtpFcfa = brevoCostFcfa(volumes.otpByCountry);
  const brevoAllFcfa =
    brevoOtpFcfa +
    volumes.onboardingSegments * BREVO_FCFA_CM +
    volumes.proAlertSegments * BREVO_FCFA_CM;

  return {
    twilio: {
      otpUsd: twilioOtp.totalUsd,
      otpFcfa: Math.round(twilioOtp.totalUsd * USD_TO_FCFA),
      onboardingUsd: twilioOnboardingUsd,
      onboardingFcfa: Math.round(twilioOnboardingUsd * USD_TO_FCFA),
      totalUsd: round2(twilioOtp.totalUsd + twilioOnboardingUsd),
      totalFcfa: Math.round((twilioOtp.totalUsd + twilioOnboardingUsd) * USD_TO_FCFA),
      otpByCountry: twilioOtp.byCountry,
    },
    orange: {
      onboardingFcfa: orangeOnboardingFcfa,
      note: "CM uniquement — auth OTP non supporté par Supabase",
    },
    brevo: {
      otpFcfa: brevoOtpFcfa,
      allSmsFcfa: brevoAllFcfa,
      note: "Tarifs hypothétiques — valider via calculateur Brevo",
    },
    hybridRecommended: {
      twilioOtpUsd: twilioOtp.totalUsd,
      twilioOtpFcfa: Math.round(twilioOtp.totalUsd * USD_TO_FCFA),
      orangeOnboardingFcfa: orangeOnboardingFcfa,
      totalFcfa: Math.round(twilioOtp.totalUsd * USD_TO_FCFA) + orangeOnboardingFcfa,
    },
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatFcfa(n) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}

function runScenario(key, overrides = {}) {
  const base = SCENARIOS[key] ?? SCENARIOS.s0;
  const input = { ...DEFAULTS, ...base, ...overrides };
  const volumes = estimateVolumes(input);
  const costs = estimateCosts(volumes);
  return {
    scenario: key,
    label: base.label,
    input: {
      drivers: input.drivers,
      fleets: input.fleets,
      cmShare: input.cmShare,
      newDriversPerMonth: input.newDriversPerMonth,
      phoneAuthShare: input.phoneAuthShare,
      otpPerUserPerMonth: input.otpPerUserPerMonth,
    },
    volumes,
    costs,
  };
}

function markdownReport(results) {
  const lines = [
    "# Estimation SMS CEMAC (généré)",
    "",
    `Taux : 1 USD = ${USD_TO_FCFA} FCFA | Brevo CM = ${BREVO_FCFA_CM} FCFA/seg | Orange = ${ORANGE_FCFA_PER_SEG} FCFA/seg`,
    "",
  ];

  for (const r of results) {
    const v = r.volumes;
    const c = r.costs;
    lines.push(`## ${r.label}`);
    lines.push("");
    lines.push(`- Conducteurs : ${r.input.drivers} | Flottes : ${r.input.fleets} | Part CM : ${(r.input.cmShare * 100).toFixed(0)} %`);
    lines.push(`- OTP : ${v.otpSegments} segments | Onboarding : ${v.onboardingSegments} segments (${v.onboardingSegmentsCm} CM)`);
    lines.push("");
    lines.push("| Provider | Périmètre | Coût mensuel |");
    lines.push("|----------|-----------|--------------|");
    lines.push(`| Twilio | OTP + onboarding (si tout Twilio) | ${c.twilio.totalUsd} USD (${formatFcfa(c.twilio.totalFcfa)}) |`);
    lines.push(`| Twilio | OTP seul | ${c.twilio.otpUsd} USD (${formatFcfa(c.twilio.otpFcfa)}) |`);
    lines.push(`| Orange | Onboarding CM | ${formatFcfa(c.orange.onboardingFcfa)} |`);
    lines.push(`| Brevo | OTP (hyp.) | ${formatFcfa(c.brevo.otpFcfa)} |`);
    lines.push(`| Brevo | Tout SMS (hyp.) | ${formatFcfa(c.brevo.allSmsFcfa)} |`);
    lines.push(`| **Hybride recommandé** | Twilio OTP + Orange CM | **${formatFcfa(c.hybridRecommended.totalFcfa)}** |`);
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const overrides = {};
  if (args.drivers != null) overrides.drivers = args.drivers;
  if (args.cmShare != null) overrides.cmShare = args.cmShare;

  const keys = args.scenario === "all" ? ["s0", "s1", "s2"] : [args.scenario];
  const results = keys.map((k) => runScenario(k, overrides));

  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(markdownReport(results));
}

main();
