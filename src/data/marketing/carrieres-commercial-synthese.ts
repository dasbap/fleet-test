export interface CommercialSynthesisRow {
  criterion: string;
  posteA: string;
  posteB: string;
}

export const CARRIERES_COMMERCIAL_SYNTHESIS_ROWS: readonly CommercialSynthesisRow[] = [
  { criterion: "Nb postes", posteA: "2", posteB: "1" },
  {
    criterion: "Cible",
    posteA: "Propriétaires 1–10 taxis",
    posteB: "PME 5–50 véhicules, ONG, ministères",
  },
  { criterion: "Cycle de vente", posteA: "1 à 7 jours", posteB: "1 à 3 mois" },
  {
    criterion: "Canal",
    posteA: "Terrain, WhatsApp",
    posteB: "RDV formels, email, LinkedIn",
  },
  {
    criterion: "Profil",
    posteA: "Terrain pur, réseau taxis local",
    posteB: "Bac+3/5, expérience B2B institutionnelle",
  },
  { criterion: "Urgence", posteA: "Immédiat", posteB: "Immédiat ou M+1" },
];

export const CARRIERES_COMMERCIAL_POSTE_A = {
  id: "commercial-taxis-yaounde",
  label: "Poste A — Taxis/VTC",
  tagline: "Volume & terrain",
} as const;

export const CARRIERES_COMMERCIAL_POSTE_B = {
  id: "commercial-pme-yaounde",
  label: "Poste B — PME/Institutions",
  tagline: "Contrats à forte valeur",
} as const;

export const CARRIERES_COMMERCIAL_RECOMMENDATION_HIGHLIGHT =
  "Recruter 1 Poste A + 1 Poste B en parallèle pour combiner volume terrain et contrats institutionnels.";
