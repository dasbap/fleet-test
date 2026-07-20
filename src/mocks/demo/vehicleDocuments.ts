import { demoIsoFuture, demoIsoPast } from "@/mocks/demo/constants";

/**
 * Documents réglementaires et techniques par véhicule (échéances cohérentes avec les alertes).
 */
export type DemoDocumentCategory =
  | "insurance"
  | "technical"
  | "registration"
  | "transport"
  | "other";

export interface DemoVehicleDocument {
  id: string;
  vehicleId: string;
  label: string;
  category: DemoDocumentCategory;
  /** null = sans échéance (carnet papier archivé). */
  expiryDate: string | null;
  reference?: string;
}

export const MOCK_VEHICLE_DOCUMENTS: DemoVehicleDocument[] = [
  // veh-01 Sprinter
  { id: "doc-001", vehicleId: "veh-01", label: "Assurance tous risques", category: "insurance", expiryDate: demoIsoFuture(18), reference: "POL-2025-8841" },
  { id: "doc-002", vehicleId: "veh-01", label: "Visite technique poids lourds", category: "technical", expiryDate: demoIsoFuture(42), reference: "VT-2024-SN" },
  { id: "doc-003", vehicleId: "veh-01", label: "Carte grise", category: "registration", expiryDate: demoIsoFuture(400), reference: "CG-SN-01" },
  // veh-02 Corolla
  { id: "doc-004", vehicleId: "veh-02", label: "Assurance tiers+", category: "insurance", expiryDate: demoIsoFuture(210), reference: "POL-2025-2210" },
  { id: "doc-005", vehicleId: "veh-02", label: "Contrôle technique", category: "technical", expiryDate: demoIsoFuture(95), reference: "CT-2025" },
  // veh-03 Volvo
  { id: "doc-006", vehicleId: "veh-03", label: "Assurance marchandises", category: "insurance", expiryDate: demoIsoFuture(5), reference: "POL-CRIT-03" },
  { id: "doc-007", vehicleId: "veh-03", label: "Licence transport", category: "transport", expiryDate: demoIsoFuture(120), reference: "LT-2023-SN" },
  // veh-04 Iveco frigo
  { id: "doc-008", vehicleId: "veh-04", label: "Contrôle frigorifique ATP", category: "technical", expiryDate: demoIsoFuture(30), reference: "ATP-2025" },
  { id: "doc-009", vehicleId: "veh-04", label: "Assurance spécifique produits frais", category: "insurance", expiryDate: demoIsoFuture(60), reference: "POL-FR-04" },
  // veh-05 Ranger
  { id: "doc-010", vehicleId: "veh-05", label: "Assurance", category: "insurance", expiryDate: demoIsoFuture(33), reference: "POL-RG-05" },
  { id: "doc-011", vehicleId: "veh-05", label: "Carnet de bord numérique", category: "other", expiryDate: null, reference: "CN-APP" },
  // veh-06 Boxer
  { id: "doc-012", vehicleId: "veh-06", label: "Visite technique", category: "technical", expiryDate: demoIsoFuture(7), reference: "VT-URG-06" },
  { id: "doc-013", vehicleId: "veh-06", label: "Assurance passagers", category: "insurance", expiryDate: demoIsoFuture(45), reference: "POL-PAX-06" },
  // veh-07 Master
  { id: "doc-014", vehicleId: "veh-07", label: "Assurance", category: "insurance", expiryDate: demoIsoFuture(150), reference: "POL-07" },
  { id: "doc-015", vehicleId: "veh-07", label: "Carte grise", category: "registration", expiryDate: demoIsoFuture(300), reference: "CG-07" },
  // veh-08 Isuzu
  { id: "doc-016", vehicleId: "veh-08", label: "Assurance flotte nationale", category: "insurance", expiryDate: demoIsoFuture(90), reference: "POL-FLT-08" },
  { id: "doc-017", vehicleId: "veh-08", label: "Contrôle technique", category: "technical", expiryDate: demoIsoPast(5), reference: "CT-EXP" },
  // veh-09 Hilux
  { id: "doc-018", vehicleId: "veh-09", label: "Assurance tout terrain", category: "insurance", expiryDate: demoIsoFuture(200), reference: "POL-4x4-09" },
  // veh-10 Atego
  { id: "doc-019", vehicleId: "veh-10", label: "Licence transport LTI", category: "transport", expiryDate: demoIsoFuture(14), reference: "LTI-10" },
  { id: "doc-020", vehicleId: "veh-10", label: "Assurance", category: "insurance", expiryDate: demoIsoFuture(88), reference: "POL-10" },
  // veh-11 Ducato
  { id: "doc-021", vehicleId: "veh-11", label: "Assurance", category: "insurance", expiryDate: demoIsoFuture(175), reference: "POL-11" },
  { id: "doc-022", vehicleId: "veh-11", label: "Visite technique", category: "technical", expiryDate: demoIsoFuture(365), reference: "VT-11" },
  // veh-12 H350
  { id: "doc-023", vehicleId: "veh-12", label: "Assurance", category: "insurance", expiryDate: demoIsoFuture(22), reference: "POL-12" },
  { id: "doc-024", vehicleId: "veh-12", label: "Autorisation stationnement Dakar", category: "other", expiryDate: demoIsoFuture(180), reference: "AD-2025" },
];

export function getDocumentsForVehicle(vehicleId: string): DemoVehicleDocument[] {
  return MOCK_VEHICLE_DOCUMENTS.filter((d) => d.vehicleId === vehicleId);
}
