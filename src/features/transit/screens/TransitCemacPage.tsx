import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe,
  MapPin,
  PackageSearch,
  Plus,
  Truck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveTransits, useCreateTransit, useTransitCemac, useUpdateTransitStatus } from "@/hooks/useTransitCemac";
import type { TransitCemac, TransitCemacInsert } from "@/repositories/transit-cemac.repository";
import { useFleetVehicles } from "@/hooks/useDashboardStats";
import { useAuth } from "@/hooks/useAuth";

// ── CEMAC country list ────────────────────────────────────────────────────────
const CEMAC_COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "TD", name: "Tchad", flag: "🇹🇩" },
  { code: "CF", name: "Centrafrique", flag: "🇨🇫" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GQ", name: "Guinée Équatoriale", flag: "🇬🇶" },
];

const CEMAC_CORRIDORS = [
  "Douala–N'Djamena",
  "Douala–Bangui",
  "Douala–Libreville",
  "Brazzaville–Pointe-Noire",
  "Libreville–Port-Gentil",
  "Malabo–Bata",
];

const DOCUMENT_TYPE_LABELS: Record<TransitCemac["document_type"], string> = {
  trie: "TRIE",
  carnet_passage: "Carnet de passage",
  manifeste: "Manifeste",
  autre: "Autre",
};

const STATUS_CONFIG: Record<
  TransitCemac["status"],
  { label: string; color: string; bg: string; border: string }
> = {
  en_route: {
    label: "En route",
    color: "text-blue-300",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  arrive: {
    label: "Arrivé",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  retour: {
    label: "Retour",
    color: "text-slate-300",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
  },
  incident: {
    label: "Incident",
    color: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  annule: {
    label: "Annulé",
    color: "text-slate-500",
    bg: "bg-slate-500/5",
    border: "border-slate-700/30",
  },
};

function countryLabel(code: string) {
  const c = CEMAC_COUNTRIES.find((c) => c.code === code);
  return c ? `${c.flag} ${c.name}` : code;
}

// ── Create dialog ─────────────────────────────────────────────────────────────

interface CreateDialogProps {
  onClose: () => void;
}

function CreateTransitDialog({ onClose }: CreateDialogProps) {
  const { userFleetId } = useAuth();
  const { data: vehicles = [] } = useFleetVehicles(userFleetId ?? undefined);
  const { mutate: create, isPending } = useCreateTransit();

  const [form, setForm] = useState<{
    vehicle_id: string;
    driver_id: string;
    departure_country: string;
    arrival_country: string;
    border_post: string;
    corridor: string;
    permit_ref: string;
    document_type: TransitCemac["document_type"];
    departure_date: string;
    cargo_description: string;
    cargo_weight_kg: string;
    notes: string;
  }>({
    vehicle_id: "",
    driver_id: "",
    departure_country: "",
    arrival_country: "",
    border_post: "",
    corridor: "",
    permit_ref: "",
    document_type: "trie",
    departure_date: new Date().toISOString().slice(0, 10),
    cargo_description: "",
    cargo_weight_kg: "",
    notes: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicle_id || !form.departure_country || !form.arrival_country || !form.departure_date) {
      return;
    }

    const payload: Omit<TransitCemacInsert, "fleet_id" | "created_by"> = {
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id || null,
      departure_country: form.departure_country,
      arrival_country: form.arrival_country,
      border_post: form.border_post || null,
      corridor: form.corridor || null,
      permit_ref: form.permit_ref || null,
      document_type: form.document_type,
      departure_date: form.departure_date,
      arrival_date: null,
      status: "en_route",
      cargo_description: form.cargo_description || null,
      cargo_weight_kg: form.cargo_weight_kg ? Number(form.cargo_weight_kg) : null,
      notes: form.notes || null,
    };

    create(payload, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl border border-surface-raised max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-surface-raised px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Nouveau transit CEMAC</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Vehicle */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Véhicule *</label>
            <select
              required
              value={form.vehicle_id}
              onChange={(e) => set("vehicle_id", e.target.value)}
              className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-light"
            >
              <option value="">Choisir un véhicule</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.immatriculation ?? v.id.slice(0, 8)}
                  {v.modele ? ` — ${v.modele}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Countries */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Départ *</label>
              <select
                required
                value={form.departure_country}
                onChange={(e) => set("departure_country", e.target.value)}
                className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-light"
              >
                <option value="">Pays</option>
                {CEMAC_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Destination *</label>
              <select
                required
                value={form.arrival_country}
                onChange={(e) => set("arrival_country", e.target.value)}
                className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-light"
              >
                <option value="">Pays</option>
                {CEMAC_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Corridor */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Corridor</label>
            <select
              value={form.corridor}
              onChange={(e) => set("corridor", e.target.value)}
              className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-light"
            >
              <option value="">Sélectionner un corridor</option>
              {CEMAC_CORRIDORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Border post */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Poste frontière</label>
            <input
              type="text"
              value={form.border_post}
              onChange={(e) => set("border_post", e.target.value)}
              placeholder="Ex: Kousséri / N'Djamena"
              className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-light"
            />
          </div>

          {/* Document */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Type document</label>
              <select
                value={form.document_type}
                onChange={(e) => set("document_type", e.target.value as TransitCemac["document_type"])}
                className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-light"
              >
                {(Object.entries(DOCUMENT_TYPE_LABELS) as [TransitCemac["document_type"], string][]).map(
                  ([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ),
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">N° permis/carnet</label>
              <input
                type="text"
                value={form.permit_ref}
                onChange={(e) => set("permit_ref", e.target.value)}
                placeholder="TRIE-2026-XXXX"
                className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-light"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Date de départ *</label>
            <input
              required
              type="date"
              value={form.departure_date}
              onChange={(e) => set("departure_date", e.target.value)}
              className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-light"
            />
          </div>

          {/* Cargo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Marchandise</label>
              <input
                type="text"
                value={form.cargo_description}
                onChange={(e) => set("cargo_description", e.target.value)}
                placeholder="Description du chargement"
                className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-light"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Poids (kg)</label>
              <input
                type="number"
                min="0"
                value={form.cargo_weight_kg}
                onChange={(e) => set("cargo_weight_kg", e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-light"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Observations supplémentaires..."
              className="w-full rounded-lg border border-surface-raised bg-surface-raised/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-light resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 text-xs bg-brand-light text-black hover:bg-brand-light/90"
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Transit card ──────────────────────────────────────────────────────────────

function TransitCard({ transit }: { transit: TransitCemac }) {
  const { mutate: updateStatus, isPending } = useUpdateTransitStatus();
  const cfg = STATUS_CONFIG[transit.status];

  return (
    <article className={`rounded-card border ${cfg.border} ${cfg.bg} p-4 space-y-3`}>
      {/* Route header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <span>{countryLabel(transit.departure_country)}</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
          <span>{countryLabel(transit.arrival_country)}</span>
        </div>
        <span className={`text-[10px] font-medium uppercase tracking-wide rounded-full border px-2 py-0.5 ${cfg.color} ${cfg.border}`}>
          {cfg.label}
        </span>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Véhicule {transit.vehicle_id.slice(0, 8).toUpperCase()}</span>
        </div>
        {transit.corridor && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{transit.corridor}</span>
          </div>
        )}
        {transit.permit_ref && (
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{transit.permit_ref}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <span>{DOCUMENT_TYPE_LABELS[transit.document_type]}</span>
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>
          Départ:{" "}
          <span className="text-slate-300">
            {new Date(transit.departure_date).toLocaleDateString("fr-FR")}
          </span>
        </span>
        {transit.arrival_date && (
          <span>
            Arrivée:{" "}
            <span className="text-slate-300">
              {new Date(transit.arrival_date).toLocaleDateString("fr-FR")}
            </span>
          </span>
        )}
      </div>

      {/* Cargo */}
      {(transit.cargo_description || transit.cargo_weight_kg) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <PackageSearch className="h-3.5 w-3.5 shrink-0" />
          <span>
            {transit.cargo_description}
            {transit.cargo_weight_kg ? ` — ${transit.cargo_weight_kg.toLocaleString()} kg` : ""}
          </span>
        </div>
      )}

      {/* Actions for en_route transits */}
      {transit.status === "en_route" && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              updateStatus({
                id: transit.id,
                status: "arrive",
                arrivalDate: new Date().toISOString().slice(0, 10),
              })
            }
            className="flex-1 h-7 text-xs text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Arrivé
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => updateStatus({ id: transit.id, status: "incident" })}
            className="flex-1 h-7 text-xs text-red-300 border-red-500/40 hover:bg-red-500/10"
          >
            Incident
          </Button>
        </div>
      )}
    </article>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TransitCemacPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"active" | "all">("active");

  const { data: activeTransits = [], isLoading: activeLoading } = useActiveTransits();
  const { data: allTransits = [], isLoading: allLoading } = useTransitCemac({ limit: 50 });

  const isLoading = tab === "active" ? activeLoading : allLoading;
  const transits = tab === "active" ? activeTransits : allTransits;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-surface-raised px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-brand-light" />
          <h1 className="text-sm font-semibold text-slate-100">Transits CEMAC</h1>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="h-8 px-3 text-xs bg-brand-light text-black hover:bg-brand-light/90"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nouveau
        </Button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Active transit counter */}
        {activeTransits.length > 0 && (
          <div className="rounded-card border border-blue-500/30 bg-blue-500/10 px-4 py-3 flex items-center gap-3">
            <Truck className="h-5 w-5 text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-200">
                {activeTransits.length} transit{activeTransits.length > 1 ? "s" : ""} en cours
              </p>
              <p className="text-xs text-blue-400">Suivi en temps réel activé</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-lg border border-surface-raised overflow-hidden">
          {(["active", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-brand-light text-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t === "active" ? `En cours (${activeTransits.length})` : "Historique"}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-card border border-surface-raised bg-surface-raised/20 p-4 animate-pulse h-28"
              />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && transits.length === 0 && (
          <div className="rounded-card border border-surface-raised bg-surface p-8 text-center space-y-3">
            <Globe className="h-10 w-10 text-slate-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-slate-400">
                {tab === "active" ? "Aucun transit en cours" : "Aucun transit enregistré"}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Enregistrez les passages frontières Zone CEMAC pour votre flotte.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="bg-brand-light text-black hover:bg-brand-light/90 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Premier transit
            </Button>
          </div>
        )}

        {/* Transit list */}
        {!isLoading && transits.length > 0 && (
          <div className="space-y-3">
            {transits.map((t) => (
              <TransitCard key={t.id} transit={t} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateTransitDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
