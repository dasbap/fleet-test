/**
 * Génère des vignettes SVG pour les tutoriels E-Samba
 * et les upload dans le bucket Supabase Storage "tutorials/thumbs/".
 *
 * Usage : npm run upload:tutorial-thumbs
 * Requiert : VITE_SUPABASE_URL (ou SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY dans .env.local
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const p of [".env.local", ".env"]) {
    const full = resolve(process.cwd(), p);
    if (!existsSync(full)) continue;
    const raw = readFileSync(full, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].replace(/^["']|["']$/g, "").trim();
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

loadEnv();

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Variables manquantes : VITE_SUPABASE_URL (ou SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY dans .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const C = {
  bg: "#0f172a",
  surface: "#1e293b",
  card: "#1a2844",
  green: "#1D9E75",
  greenLight: "#34d399",
  text: "#e2e8f0",
  muted: "#94a3b8",
  border: "#2d3f5e",
};
const FONT = `font-family="system-ui,sans-serif"`;

function pill(x, y, w, h, fill, label, labelColor) {
  const lc = labelColor || C.text;
  const cx = x + Math.round(w / 2);
  const cy = y + Math.round(h / 2) + 4;
  const rx = Math.round(h / 2);
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" opacity="0.9"/>` +
    `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="10" fill="${lc}" ${FONT}>${label}</text>`
  );
}

function card(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${C.card}" stroke="${C.border}" stroke-width="1"/>`;
}

function kpi(x, y, label, value, color) {
  const col = color || C.green;
  return (
    card(x, y, 110, 55) +
    `<text x="${x + 10}" y="${y + 18}" font-size="9" fill="${C.muted}" ${FONT}>${label}</text>` +
    `<text x="${x + 10}" y="${y + 40}" font-size="20" font-weight="bold" fill="${col}" ${FONT}>${value}</text>`
  );
}

function badge(durationLabel) {
  const label = durationLabel ?? "Tutoriel";
  return (
    `<rect x="0" y="0" width="640" height="360" fill="none" stroke="${C.green}" stroke-width="3" rx="4" opacity="0.3"/>` +
    `<rect x="468" y="8" width="160" height="24" rx="12" fill="${C.green}22" stroke="${C.green}" stroke-width="1"/>` +
    `<text x="548" y="24" text-anchor="middle" font-size="9" fill="${C.greenLight}" ${FONT}>${label}</text>`
  );
}

function topbar(pageLabel) {
  return (
    `<rect width="640" height="40" fill="${C.surface}"/>` +
    `<circle cx="20" cy="20" r="7" fill="${C.green}"/>` +
    `<text x="34" y="24" font-size="11" font-weight="bold" fill="${C.text}" ${FONT}>E-Samba</text>` +
    `<text x="${560 - pageLabel.length * 4}" y="24" font-size="9" fill="${C.green}" ${FONT}>${pageLabel}</text>`
  );
}

/** Vignette générique pour tutoriels sans maquette dédiée */
function buildGenericThumb({ pageLabel, title, subtitle, kpis, accent }) {
  const col = accent ?? C.green;
  const kpiBlocks = (kpis ?? ["—", "—", "—"])
    .slice(0, 3)
    .map((k, i) => kpi(16 + i * 122, 55, k.label ?? "Indicateur", k.value ?? "—", k.color))
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="${C.bg}"/>
  ${topbar(pageLabel)}
  ${kpiBlocks}
  ${card(16, 125, 608, 200)}
  <text x="32" y="165" font-size="14" font-weight="bold" fill="${C.text}" ${FONT}>${title}</text>
  <text x="32" y="188" font-size="10" fill="${C.muted}" ${FONT}>${subtitle}</text>
  <rect x="32" y="210" width="200" height="8" rx="4" fill="${col}" opacity="0.35"/>
  <rect x="32" y="230" width="560" height="72" rx="8" fill="${C.surface}" stroke="${C.border}" stroke-width="1"/>
  <text x="48" y="258" font-size="10" fill="${C.muted}" ${FONT}>Guide vidéo E-Samba · Afrique</text>
  <text x="48" y="278" font-size="9" fill="${C.muted}" ${FONT}>Optimisé terrain · faible connexion</text>
  ${pill(480, 268, 100, 22, col + "44", "Guide", col)}
  ${badge("Tutoriel vidéo")}
</svg>`;
}

function buildTuto01() {
  const days = ["Lun 12", "Mar 13", "Mer 14", "Jeu 15", "Ven 16"];
  let dayRects = "";
  for (let d = 0; d < 5; d++) {
    const dx = 26 + d * 68;
    const isActive = d === 2;
    dayRects +=
      `<rect x="${dx}" y="158" width="60" height="24" rx="4" fill="${isActive ? C.green : C.surface}" stroke="${C.border}" stroke-width="1"/>` +
      `<text x="${dx + 30}" y="174" text-anchor="middle" font-size="9" fill="${isActive ? "#fff" : C.muted}" ${FONT}>${days[d]}</text>`;
  }
  const missions = [
    { label: "Douala → Yaoundé", sub: "08h00 – 14h30 · BH-234-CM", status: "Actif", col: C.green },
    { label: "Port → Entrepôt Nord", sub: "10h00 – 12h00 · KD-891-CM", status: "Attente", col: "#f59e0b" },
    { label: "Inspection flotte", sub: "14h00 – 16h00 · 3 véhicules", status: "Planif", col: "#3b82f6" },
  ];
  let missionRows = "";
  for (let i = 0; i < missions.length; i++) {
    const m = missions[i];
    const ry = 188 + i * 44;
    missionRows +=
      `<rect x="26" y="${ry}" width="330" height="36" rx="6" fill="${C.surface}" stroke="${C.border}" stroke-width="1"/>` +
      `<rect x="26" y="${ry}" width="4" height="36" rx="2" fill="${m.col}"/>` +
      `<text x="40" y="${ry + 17}" font-size="9" font-weight="bold" fill="${C.text}" ${FONT}>${m.label}</text>` +
      `<text x="40" y="${ry + 30}" font-size="8" fill="${C.muted}" ${FONT}>${m.sub}</text>` +
      pill(308, ry + 10, 44, 16, m.col + "33", m.status, m.col);
  }
  const fields = ["Conducteur", "Véhicule", "Départ", "Destination"];
  let formFields = "";
  for (let i = 0; i < fields.length; i++) {
    const fy = 160 + i * 42;
    formFields +=
      `<rect x="392" y="${fy}" width="222" height="28" rx="5" fill="${C.surface}" stroke="${C.border}" stroke-width="1"/>` +
      `<text x="402" y="${fy + 19}" font-size="9" fill="${C.muted}" ${FONT}>${fields[i]}…</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="${C.bg}"/>
  ${topbar("Créneaux")}
  ${kpi(16, 55, "Missions actives", "12")}
  ${kpi(138, 55, "En attente", "4", "#f59e0b")}
  ${kpi(260, 55, "Clôturées auj.", "8")}
  ${card(16, 125, 350, 220)}
  <text x="26" y="148" font-size="10" font-weight="bold" fill="${C.text}" ${FONT}>Planning — Mai 2026</text>
  ${dayRects}
  ${missionRows}
  ${card(382, 125, 242, 220)}
  <text x="392" y="148" font-size="10" font-weight="bold" fill="${C.text}" ${FONT}>Nouveau créneau</text>
  ${formFields}
  <rect x="392" y="330" width="222" height="10" rx="5" fill="${C.green}" opacity="0.9"/>
  ${badge("Tutoriel · 1 min")}
</svg>`;
}

function qrBlock(x, y, size) {
  const cell = Math.round(size / 7);
  const pattern = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];
  let out = "";
  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < pattern[r].length; c++) {
      if (pattern[r][c]) {
        out += `<rect x="${x + c * cell}" y="${y + r * cell}" width="${cell - 1}" height="${cell - 1}" fill="${C.green}"/>`;
      }
    }
  }
  return out;
}

function buildTuto03() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="${C.bg}"/>
  ${topbar("Scanner véhicule")}
  <rect x="200" y="55" width="240" height="300" rx="18" fill="${C.surface}" stroke="${C.border}" stroke-width="2"/>
  <rect x="210" y="65" width="220" height="280" rx="12" fill="${C.bg}"/>
  <rect x="255" y="100" width="130" height="130" rx="8" fill="none" stroke="${C.green}" stroke-width="3" stroke-dasharray="18,8"/>
  ${qrBlock(270, 115, 100)}
  <rect x="215" y="245" width="210" height="70" rx="8" fill="${C.card}" stroke="${C.green}" stroke-width="1"/>
  <text x="225" y="280" font-size="11" font-weight="bold" fill="${C.text}" ${FONT}>BH-234-CM · Toyota Hilux</text>
  ${kpi(16, 80, "Véhicules", "24")}
  ${kpi(462, 80, "Scans auj.", "7")}
  ${badge("Tutoriel · 31 s")}
</svg>`;
}

function buildTuto07() {
  const travaux = [
    { label: "Vidange moteur · BH-234-CM", date: "14 mai 2026", status: "Urgent", col: "#ef4444" },
    { label: "Révision freins · KD-891-CM", date: "20 mai 2026", status: "Planifié", col: "#3b82f6" },
  ];
  let rows = "";
  for (let i = 0; i < travaux.length; i++) {
    const t = travaux[i];
    const ry = 158 + i * 44;
    rows +=
      `<rect x="26" y="${ry}" width="330" height="36" rx="6" fill="${C.surface}" stroke="${C.border}" stroke-width="1"/>` +
      `<text x="40" y="${ry + 17}" font-size="9" font-weight="bold" fill="${C.text}" ${FONT}>${t.label}</text>` +
      pill(304, ry + 10, 48, 16, t.col + "33", t.status, t.col);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="${C.bg}"/>
  ${topbar("Maintenance")}
  ${kpi(16, 55, "À planifier", "5", "#f59e0b")}
  ${kpi(138, 55, "En cours", "2", "#3b82f6")}
  ${kpi(260, 55, "Complétés", "31")}
  ${card(16, 125, 350, 225)}
  <text x="26" y="148" font-size="10" font-weight="bold" fill="${C.text}" ${FONT}>Travaux planifiés</text>
  ${rows}
  ${card(382, 125, 242, 225)}
  <text x="392" y="148" font-size="10" font-weight="bold" fill="${C.text}" ${FONT}>Planifier un entretien</text>
  ${badge("Tutoriel · 58 s")}
</svg>`;
}

const THUMBS = [
  { id: "tuto-01", svg: buildTuto01() },
  {
    id: "tuto-02",
    svg: buildGenericThumb({
      pageLabel: "Clôture mission",
      title: "Clôturer une mission",
      subtitle: "Fermer correctement un créneau en fin de mission.",
      kpis: [
        { label: "Actives", value: "3" },
        { label: "À clôturer", value: "1", color: "#f59e0b" },
        { label: "Terminées", value: "12" },
      ],
    }),
  },
  { id: "tuto-03", svg: buildTuto03() },
  {
    id: "tuto-04",
    svg: buildGenericThumb({
      pageLabel: "Incidents",
      title: "Signaler un incident",
      subtitle: "Déclarer un incident avec photo et géolocalisation.",
      kpis: [
        { label: "Ouverts", value: "2", color: "#ef4444" },
        { label: "En cours", value: "1", color: "#f59e0b" },
        { label: "Résolus", value: "18" },
      ],
      accent: "#ef4444",
    }),
  },
  {
    id: "tuto-05",
    svg: buildGenericThumb({
      pageLabel: "Carburant",
      title: "Saisir un plein carburant",
      subtitle: "Enregistrer volume, montant et justificatif.",
      kpis: [
        { label: "Pleins mois", value: "24" },
        { label: "Litres", value: "1.2k" },
        { label: "Anomalies", value: "0" },
      ],
    }),
  },
  {
    id: "tuto-06",
    svg: buildGenericThumb({
      pageLabel: "Alertes",
      title: "Consulter les alertes",
      subtitle: "Lire et prioriser les alertes maintenance.",
      kpis: [
        { label: "Critiques", value: "1", color: "#ef4444" },
        { label: "Hautes", value: "4", color: "#f59e0b" },
        { label: "Total", value: "11" },
      ],
    }),
  },
  { id: "tuto-07", svg: buildTuto07() },
  {
    id: "tuto-08",
    svg: buildGenericThumb({
      pageLabel: "Rapports",
      title: "Lire un rapport",
      subtitle: "Analyser les rapports de flotte et exporter.",
      kpis: [
        { label: "PDF", value: "12" },
        { label: "Exports", value: "5" },
        { label: "Période", value: "Mai" },
      ],
    }),
  },
  {
    id: "tuto-09",
    svg: buildGenericThumb({
      pageLabel: "Équipe",
      title: "Inviter un collègue",
      subtitle: "Ajouter un membre dans l'organisation.",
      kpis: [
        { label: "Membres", value: "8" },
        { label: "Invitations", value: "2" },
        { label: "Rôles", value: "4" },
      ],
    }),
  },
  {
    id: "tuto-10",
    svg: buildGenericThumb({
      pageLabel: "Hors ligne",
      title: "Utiliser le mode offline",
      subtitle: "Travailler hors réseau puis synchroniser.",
      kpis: [
        { label: "En attente", value: "3", color: "#f59e0b" },
        { label: "Sync OK", value: "47" },
        { label: "Cache", value: "12 Mo" },
      ],
      accent: "#3b82f6",
    }),
  },
];

async function uploadThumb({ id, svg }) {
  const path = `thumbs/${id}.svg`;
  const buf = Buffer.from(svg, "utf-8");
  const { error } = await supabase.storage
    .from("tutorials")
    .upload(path, buf, { contentType: "image/svg+xml", upsert: true });
  if (error) {
    console.error(`ERREUR ${id} :`, error.message);
    return false;
  }
  const { data } = supabase.storage.from("tutorials").getPublicUrl(path);
  console.log(`OK ${id} → ${data.publicUrl}`);
  return true;
}

console.log("Upload vignettes SVG → bucket tutorials…\n");
let ok = 0;
for (const thumb of THUMBS) {
  if (await uploadThumb(thumb)) ok += 1;
}
console.log(`\nTerminé : ${ok}/${THUMBS.length} vignettes.`);
process.exit(ok === THUMBS.length ? 0 : 1);
