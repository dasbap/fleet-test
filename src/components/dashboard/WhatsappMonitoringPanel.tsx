import { MessageSquareWarning } from "lucide-react";
import { useWhatsappMonitoring } from "@/hooks/useWhatsappMonitoring";

function formatDateTime(value: string | null): string {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "n/a";
  return date.toLocaleString("fr-FR");
}

export function WhatsappMonitoringPanel() {
  const { data, isLoading, isError } = useWhatsappMonitoring();

  if (isLoading) {
    return (
      <section className="rounded-card border border-surface-raised bg-surface p-4 min-h-[14rem]">
        <p className="text-sm text-slate-400">Chargement monitoring WhatsApp...</p>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="rounded-card border border-red-500/30 bg-red-500/5 p-4 min-h-[14rem]">
        <p className="text-sm text-red-300">Impossible de charger le monitoring WhatsApp.</p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-surface-raised bg-surface p-4 space-y-3 min-h-[14rem]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <MessageSquareWarning className="h-4 w-4 text-brand-light" />
          Monitoring WhatsApp
        </h2>
        <span className="text-xs text-slate-500">Fenêtre 24h</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-card border border-surface-raised/80 bg-surface-raised/20 p-2">
          <p className="text-[10px] text-slate-400">Envois</p>
          <p className="text-sm font-semibold text-slate-100">{data.stats.total24h}</p>
        </div>
        <div className="rounded-card border border-surface-raised/80 bg-surface-raised/20 p-2">
          <p className="text-[10px] text-slate-400">Échecs</p>
          <p className="text-sm font-semibold text-red-300">{data.stats.failed24h}</p>
        </div>
        <div className="rounded-card border border-surface-raised/80 bg-surface-raised/20 p-2">
          <p className="text-[10px] text-slate-400">Retries planifiés</p>
          <p className="text-sm font-semibold text-amber-300">{data.stats.retryScheduled}</p>
        </div>
        <div className="rounded-card border border-surface-raised/80 bg-surface-raised/20 p-2">
          <p className="text-[10px] text-slate-400">Taux succès</p>
          <p className="text-sm font-semibold text-emerald-300">{data.stats.successRate24h}%</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-300">Derniers incidents WhatsApp</p>
        {data.recentFailures.length === 0 ? (
          <p className="text-xs text-slate-400">Aucun échec récent.</p>
        ) : (
          data.recentFailures.map((item) => (
            <article
              key={item.id}
              className="rounded-card border border-surface-raised/80 bg-surface-raised/20 p-3 space-y-1"
            >
              <p className="text-xs text-slate-200">
                {item.templateName} - {item.phoneE164}
              </p>
              <p className="text-[11px] text-slate-400">
                Retry {item.retryCount}/{item.maxRetries} - Prochain: {formatDateTime(item.nextRetryAt)}
              </p>
              <p className="text-[11px] text-red-300">{item.errorMessage ?? "Erreur provider"}</p>
              <p className="text-[11px] text-slate-500">Créé: {formatDateTime(item.createdAt)}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
