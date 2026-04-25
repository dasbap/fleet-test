import { useTranslation as useT2 } from "react-i18next";
import { Link } from "react-router-dom";
import { HelpSearch, HelpFAQ } from "@/components/shared/HelpCenter";
import { useHelpContext as useH2 } from "@/context/useHelpContext";

const CATEGORIES_ALL = [
  { id: "fleet", labelKey: "category_fleet", emoji: "🚗", count: 4 },
  { id: "creneau", labelKey: "category_creneau", emoji: "🟢", count: 3 },
  { id: "maintenance", labelKey: "category_maintenance", emoji: "🔧", count: 3 },
  { id: "alerts", labelKey: "category_alerts", emoji: "🔔", count: 2 },
  { id: "reports", labelKey: "category_reports", emoji: "📄", count: 2 },
  { id: "offline", labelKey: "category_offline", emoji: "📡", count: 2 },
] as const;

export default function AidePage() {
  const { t } = useT2("help");
  const { featuredVideos } = useH2();

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      <div className="text-center">
        <h1 className="text-2xl font-heading font-semibold text-slate-800 dark:text-slate-100 mb-2">
          {t("title")}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Trouvez rapidement des réponses ou contactez notre équipe
        </p>
        <div className="max-w-lg mx-auto">
          <HelpSearch autoFocus />
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Parcourir par thème
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES_ALL.map((cat) => (
            <Link
              key={cat.id}
              to={`/aide/${cat.id}`}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-surface hover:border-brand/40 hover:shadow-sm transition-all duration-150"
            >
              <span className="text-2xl" aria-hidden="true">
                {cat.emoji}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t(cat.labelKey)}
                </p>
                <p className="text-xs text-slate-400">{cat.count} articles</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Tutoriels vidéo
          </h2>
          <Link
            to="/aide/videos"
            className="text-xs text-brand dark:text-brand-light hover:underline"
          >
            {t("view_all")} →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {featuredVideos.map((video) => (
            <Link
              key={video.id}
              to={video.href}
              className="group rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-brand/40 transition-colors"
            >
              <div className="relative bg-surface-raised" style={{ aspectRatio: "16/9" }}>
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-slate-800 ml-0.5">
                      <path d="M5 3.5l8 4.5-8 4.5V3.5z" />
                    </svg>
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                  {Math.ceil(video.duration / 60)} min
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-brand transition-colors">
                  {video.titleKey}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <HelpFAQ maxItems={5} />

      <section className="text-center py-4">
        <p className="text-sm text-slate-500 mb-3">Vous n&apos;avez pas trouvé la réponse ?</p>
        <div className="flex justify-center gap-3">
          <a
            href="https://wa.me/237XXXXXXXXX?text=Bonjour E-Samba, j'ai besoin d'aide"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            💬 {t("contact_whatsapp")}
          </a>
          <a
            href="mailto:support@e-samba.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:border-slate-300 transition-colors"
          >
            ✉️ {t("contact_support")}
          </a>
        </div>
      </section>
    </main>
  );
}
