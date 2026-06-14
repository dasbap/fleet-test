import { useTranslation as useT2 } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { buildWhatsAppUrl, SOCIAL } from "@/config/navigation";
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};

export default function AidePage() {
  const { t } = useT2("help");
  const { featuredVideos } = useH2();

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      {/* En-tête */}
      <motion.div
        className="text-center"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-heading font-semibold text-slate-800 dark:text-slate-100 mb-2">
          {t("title")}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Trouvez rapidement des réponses ou contactez notre équipe
        </p>
        <div className="max-w-lg mx-auto">
          <HelpSearch autoFocus />
        </div>
      </motion.div>

      {/* Parcourir par thème */}
      <section>
        <motion.h2
          className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          Parcourir par thème
        </motion.h2>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {CATEGORIES_ALL.map((cat) => (
            <motion.div key={cat.id} variants={fadeUp} transition={{ duration: 0.35 }}>
              <Link
                to={`/aide/${cat.id}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-surface hover:border-brand/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
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
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Tutoriels vidéo */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <motion.h2
            className="text-sm font-semibold text-slate-500 uppercase tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            Tutoriels vidéo
          </motion.h2>
          <Link
            to="/aide/videos"
            className="text-xs text-brand dark:text-brand-light hover:underline"
          >
            {t("view_all")} →
          </Link>
        </div>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.35 } } }}
        >
          {featuredVideos.map((video) => (
            <motion.div
              key={video.id}
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
            >
              <Link
                to={video.href}
                className="group block rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-brand/40 hover:shadow-lg transition-all duration-200"
              >
                <div className="relative bg-slate-900" style={{ aspectRatio: "16/9" }}>
                  <img
                    src={video.thumbnailUrl}
                    alt={video.titleKey}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Overlay play */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 group-hover:bg-white transition-all duration-200 shadow-lg">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-slate-800 ml-0.5">
                        <path d="M5 3.5l8 4.5-8 4.5V3.5z" />
                      </svg>
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                    {Math.ceil(video.duration / 60)} min
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-surface">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-brand transition-colors">
                    {video.titleKey}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <HelpFAQ maxItems={5} />

      {/* Contact */}
      <motion.section
        className="text-center py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <p className="text-sm text-slate-500 mb-3">Vous n&apos;avez pas trouvé la réponse ?</p>
        <div className="flex justify-center gap-3 flex-wrap">
          <a
            href={buildWhatsAppUrl(SOCIAL.whatsappSupportMessage)}
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
      </motion.section>
    </main>
  );
}
