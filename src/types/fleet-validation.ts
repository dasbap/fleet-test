export type StatutValidation = "complet" | "en_attente" | "incomplet" | "alerte";

export type ModeRenduPreuve = "base64" | "storage" | "reference" | "inconnu";

/** Ligne brute issue de la vue v_creneaux_actifs_validations. */
export interface CreneauValidationRow {
  creneau_id: string;
  fleet_id: string;
  registration: string;
  brand: string | null;
  model: string | null;
  statut_creneau: string;
  started_at: string;
  km_start: number;
  current_km: number;
  dvir_pre_count: number;
  dvir_pre_statut: string | null;
  dvir_post_count: number;
  dvir_post_statut: string | null;
  carburant_saisies: number;
  carburant_litres_total: number;
  carburant_xof_total: number;
  cloture_id: string | null;
  cloture_statut: string | null;
  cloture_revenue_declared: number | null;
  cloture_expected_revenue: number | null;
  cloture_revenue_gap: number | null;
  cloture_collection_mode: string | null;
  preuve_type: string | null;
  preuve_valeur: string | null;
  preuve_mode_rendu: ModeRenduPreuve;
}

export interface CreneauValidationLigne extends CreneauValidationRow {
  statut_global: StatutValidation;
}

export interface KpisFlotteData {
  fleet_id: string;
  creneaux_ouverts: number;
  creneaux_fermes: number;
  revenus_valides_xaf: number;
  revenus_en_attente_xaf: number;
  revenus_rejetes_xaf: number;
  ecart_total_xaf: number;
  clotures_pending: number;
  clotures_rejetees: number;
  clotures_sans_preuve: number;
  vehicules_actifs: number;
}
