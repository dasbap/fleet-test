import type {
  DvirChecklistConfigItem,
  DvirInspectionType,
  DvirItemStatus,
} from "@/repositories/dvir.repository";
import { computeOverallDvirStatus } from "@/lib/dvir-status";

export const INSPECTION_TYPE_OPTIONS: { value: DvirInspectionType; label: string }[] = [
  { value: "pre_trip", label: "Avant départ" },
  { value: "post_trip", label: "Après arrivée" },
  { value: "interim", label: "En cours de trajet" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "periodic", label: "Périodique" },
];

export const ITEM_STATUS_LABELS: Record<DvirItemStatus, { label: string; short: string }> = {
  ok: { label: "Conforme", short: "OK" },
  defaut: { label: "Défaut", short: "Déf." },
  defect: { label: "Défaut", short: "Déf." },
  na: { label: "N/A", short: "N/A" },
};

export const DVIR_ITEM_ICONS: Record<string, string> = {
  freins_service: "⏹",
  frein_main: "⛓",
  direction: "◎",
  pneus: "◎",
  eclairage_avant: "◉",
  eclairage_arriere: "◉",
  essuie_glaces: "〰",
  klaxon: "📢",
  niveaux: "💧",
  carrosserie: "⬚",
  ceintures: "⛓",
  extincteur: "🔥",
  triangles: "▲",
  documents: "📄",
  proprete: "✨",
};

export const STATUS_BANNER: Record<
  ReturnType<typeof computeOverallDvirStatus>,
  { label: string; message: string; pulse: boolean; tone: "success" | "warning" | "destructive" }
> = {
  ok: {
    label: "Véhicule opérationnel",
    message: "Aucun défaut signalé sur la checklist actuelle.",
    pulse: false,
    tone: "success",
  },
  minor_issues: {
    label: "Défauts mineurs",
    message: "Le véhicule peut circuler ; des corrections sont recommandées.",
    pulse: false,
    tone: "warning",
  },
  unsafe: {
    label: "Immobilisation recommandée",
    message: "Un élément critique signale un défaut : ne pas mettre le véhicule sur la route.",
    pulse: true,
    tone: "destructive",
  },
  defects_noted: {
    label: "Défauts notés",
    message: "Vérifiez les items avant départ.",
    pulse: false,
    tone: "warning",
  },
};

export function defaultItemsState(config: DvirChecklistConfigItem[]): Record<string, { status: DvirItemStatus; note: string }> {
  const state: Record<string, { status: DvirItemStatus; note: string }> = {};
  for (const c of config) {
    state[c.slug] = { status: "ok", note: "" };
  }
  return state;
}
