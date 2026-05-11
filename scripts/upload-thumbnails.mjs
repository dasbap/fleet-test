/**
 * Génère des thumbnails SVG stylisés pour les tutoriels E-Samba
 * et les upload dans le bucket Supabase Storage "tutorials/thumbs/".
 *
 * Usage : node scripts/upload-thumbnails.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zqxjvmejoktwlcqshnwi.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeGp2bWVqb2t0d2xjcXNobndpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk0NjA5NywiZXhwIjoyMDg1NTIyMDk3fQ.Cd_wbkxN3YuCg7QUin3k4AN6EIe5rfhPExGMc1xz2Sk";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const C = {
  bg: "#0f172a", surface: "#1e293b", card: "#1a2844",
  green: "#1D9E75", greenLight: "#34d399",
  text: "#e2e8f0", muted: "#94a3b8", border: "#2d3f5e",
};
const FONT = `font-family="system-ui,sans-serif"`;

function pill(x, y, w, h, fill, label, labelColor) {
  const lc = labelColor || C.text;
  const cx = x + Math.round(w / 2);
  const cy = y + Math.round(h / 2) + 4;
  const rx = Math.round(h / 2);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" opacity="0.9"/>` +
    `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="10" fill="${lc}" ${FONT}>${label}</text>`;
}

function card(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${C.card}" stroke="${C.border}" stroke-width="1"/>`;
}

function kpi(x, y, label, value, color) {
  const col = color || C.green;
  return card(x, y, 110, 55) +
    `<text x="${x + 10}" y="${y + 18}" font-size="9" fill="${C.muted}" ${FONT}>${label}</text>` +
    `<text x="${x + 10}" y="${y + 40}" font-size="20" font-weight="bold" fill="${col}" ${FONT}>${value}</text>`;
}

function badge() {
  return `<rect x="0" y="0" width="640" height="360" fill="none" stroke="${C.green}" stroke-width="3" rx="4" opacity="0.3"/>` +
    `<rect x="488" y="8" width="140" height="24" rx="12" fill="${C.green}22" stroke="${C.green}" stroke-width="1"/>` +
    `<text x="558" y="24" text-anchor="middle" font-size="9" fill="${C.greenLight}" ${FONT}>Tutoriel · 1 min</text>`;
}

function topbar(pageLabel) {
  return `<rect width="640" height="40" fill="${C.surface}"/>` +
    `<circle cx="20" cy="20" r="7" fill="${C.green}"/>` +
    `<text x="34" y="24" font-size="11" font-weight="bold" fill="${C.text}" ${FONT}>E-Samba</text>` +
    `<text x="${560 - pageLabel.length * 4}" y="24" font-size="9" fill="${C.green}" ${FONT}>${pageLabel}</text>`;
}

// ──────────────────────────────────────────────
// TUTO-01 : Ouvrir un créneau
// ──────────────────────────────────────────────
function buildTuto01() {
  const days = ["Lun 12","Mar 13","Mer 14","Jeu 15","Ven 16"];
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

  const fields = ["Conducteur","Véhicule","Départ","Destination"];
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
  ${badge()}
</svg>`;
}

// ──────────────────────────────────────────────
// TUTO-03 : Scanner un QR code véhicule
// ──────────────────────────────────────────────
function qrBlock(x, y, size) {
  const cell = Math.round(size / 7);
  const pattern = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,0,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
  ];
  let out = "";
  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < pattern[r].length; c++) {
      if (pattern[r][c]) {
        out += `<rect x="${x + c*cell}" y="${y + r*cell}" width="${cell-1}" height="${cell-1}" fill="${C.green}"/>`;
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
  <path d="M255 120 L255 100 L275 100" stroke="${C.greenLight}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M365 100 L385 100 L385 120" stroke="${C.greenLight}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M255 210 L255 230 L275 230" stroke="${C.greenLight}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M365 230 L385 230 L385 210" stroke="${C.greenLight}" stroke-width="4" fill="none" stroke-linecap="round"/>
  ${qrBlock(270, 115, 100)}
  <rect x="258" y="162" width="124" height="2" fill="${C.green}" opacity="0.7"/>
  <rect x="215" y="245" width="210" height="70" rx="8" fill="${C.card}" stroke="${C.green}" stroke-width="1"/>
  <text x="225" y="263" font-size="9" fill="${C.muted}" ${FONT}>Véhicule identifié</text>
  <text x="225" y="280" font-size="11" font-weight="bold" fill="${C.text}" ${FONT}>BH-234-CM · Toyota Hilux</text>
  <text x="225" y="296" font-size="9" fill="${C.muted}" ${FONT}>Conducteur : M. Kengne</text>
  ${pill(320, 301, 60, 16, C.green + "44", "Actif", C.greenLight)}
  ${kpi(16, 80, "Véhicules", "24")}
  ${kpi(16, 148, "Actifs", "18")}
  ${kpi(462, 80, "Scans auj.", "7")}
  ${kpi(462, 148, "Alertes", "2", "#f59e0b")}
  ${badge()}
</svg>`;
}

// ──────────────────────────────────────────────
// TUTO-07 : Planifier un entretien
// ──────────────────────────────────────────────
function buildTuto07() {
  const travaux = [
    { label: "Vidange moteur · BH-234-CM", date: "14 mai 2026", status: "Urgent", col: "#ef4444" },
    { label: "Révision freins · KD-891-CM", date: "20 mai 2026", status: "Planifié", col: "#3b82f6" },
    { label: "Contrôle pneus · YD-102-CM", date: "28 mai 2026", status: "Normal", col: C.green },
    { label: "Filtre air · LD-445-CM", date: "03 jun 2026", status: "Normal", col: C.green },
  ];
  let rows = "";
  for (let i = 0; i < travaux.length; i++) {
    const t = travaux[i];
    const ry = 158 + i * 44;
    rows +=
      `<rect x="26" y="${ry}" width="330" height="36" rx="6" fill="${C.surface}" stroke="${C.border}" stroke-width="1"/>` +
      `<rect x="26" y="${ry}" width="4" height="36" rx="2" fill="${t.col}"/>` +
      `<text x="40" y="${ry + 17}" font-size="9" font-weight="bold" fill="${C.text}" ${FONT}>${t.label}</text>` +
      `<text x="40" y="${ry + 30}" font-size="8" fill="${C.muted}" ${FONT}>Prévu : ${t.date}</text>` +
      pill(304, ry + 10, 48, 16, t.col + "33", t.status, t.col);
  }

  const champs = ["Véhicule","Type de travail","Prestataire","Date prévue","Coût (FCFA)"];
  let form = "";
  for (let i = 0; i < champs.length; i++) {
    const fy = 158 + i * 38;
    form +=
      `<rect x="392" y="${fy}" width="222" height="26" rx="5" fill="${C.surface}" stroke="${C.border}" stroke-width="1"/>` +
      `<text x="402" y="${fy + 17}" font-size="9" fill="${C.muted}" ${FONT}>${champs[i]}…</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="${C.bg}"/>
  ${topbar("Maintenance prédictive")}
  ${kpi(16, 55, "À planifier", "5", "#f59e0b")}
  ${kpi(138, 55, "En cours", "2", "#3b82f6")}
  ${kpi(260, 55, "Complétés", "31")}
  ${card(16, 125, 350, 225)}
  <text x="26" y="148" font-size="10" font-weight="bold" fill="${C.text}" ${FONT}>Travaux planifiés</text>
  ${rows}
  ${card(382, 125, 242, 225)}
  <text x="392" y="148" font-size="10" font-weight="bold" fill="${C.text}" ${FONT}>Planifier un entretien</text>
  ${form}
  <rect x="392" y="350" width="222" height="6" rx="3" fill="${C.green}" opacity="0.9"/>
  ${badge()}
</svg>`;
}

const THUMBS = [
  { id: "tuto-01", svg: buildTuto01() },
  { id: "tuto-03", svg: buildTuto03() },
  { id: "tuto-07", svg: buildTuto07() },
];

async function uploadThumb({ id, svg }) {
  const path = `thumbs/${id}.svg`;
  const buf = Buffer.from(svg, "utf-8");
  const { error } = await supabase.storage
    .from("tutorials")
    .upload(path, buf, { contentType: "image/svg+xml", upsert: true });
  if (error) {
    console.error(`❌ ${id} :`, error.message);
  } else {
    const { data } = supabase.storage.from("tutorials").getPublicUrl(path);
    console.log(`✅ ${id} → ${data.publicUrl}`);
  }
}

console.log("📤 Upload thumbnails SVG → Supabase Storage…\n");
for (const thumb of THUMBS) {
  await uploadThumb(thumb);
}
console.log("\n✅ Terminé.");
