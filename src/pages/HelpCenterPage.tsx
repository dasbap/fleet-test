/**
 * Centre d'aide E-Samba — Page complète.
 *
 * Architecture :
 *   - Barre de recherche locale (bag-of-words, 2G-friendly)
 *   - Tutoriels rapides (accordéons, top 6)
 *   - Guides par rôle (chauffeur / gestionnaire / mécanicien)
 *   - FAQ contextuelle (composants existants)
 *   - Contact WhatsApp support
 *
 * UX : mobile-first, chargement immédiat (tout statique), accessible hors ligne.
 */

import { useState } from 'react';
import { Truck, Wrench, Users, BookOpen, Search, Zap } from 'lucide-react';
import { HelpSearchBar }       from '@/components/help/HelpSearchBar';
import { QuickTutorialCard }   from '@/components/help/QuickTutorialCard';
import { RoleGuideSection }    from '@/components/help/RoleGuideSection';
import { WhatsAppSupportButton } from '@/components/help/WhatsAppSupportButton';
import { HelpFAQ }             from '@/components/shared/HelpCenter';
import { useHelpSearch }       from '@/hooks/useHelpSearch';
import { QUICK_TUTORIALS, type GuideRole } from '@/data/help/guides';

// ── Onglets rôles ─────────────────────────────────────────────────────────────

type ActiveTab = 'tutoriels' | GuideRole;

const ROLE_TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: 'tutoriels',    label: 'Tutoriels',    icon: <Zap     className="h-4 w-4" /> },
  { id: 'chauffeur',   label: 'Chauffeur',    icon: <Truck   className="h-4 w-4" /> },
  { id: 'gestionnaire', label: 'Gestionnaire', icon: <Users   className="h-4 w-4" /> },
  { id: 'mécanicien',  label: 'Mécanicien',   icon: <Wrench  className="h-4 w-4" /> },
];

// ── Résultats de recherche ────────────────────────────────────────────────────

function SearchResultItem({
  title, summary, icon, duration, type,
}: {
  title: string; summary: string; icon?: string; duration?: string; type: string;
}) {
  const typeLabel: Record<string, string> = {
    guide:    'Guide',
    tutorial: 'Tutoriel',
    faq:      'FAQ',
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
      {icon ? (
        <span className="text-xl shrink-0 mt-0.5" aria-hidden>{icon}</span>
      ) : (
        <BookOpen className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {typeLabel[type] ?? type}
          </span>
          {duration && <span className="text-[10px] text-muted-foreground">{duration}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{summary}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HelpCenterPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tutoriels');
  const { query, setQuery, results, isSearching } = useHelpSearch();

  // Top 6 tutoriels affichés par défaut
  const topTutorials = QUICK_TUTORIALS.slice(0, 6);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">

      {/* En-tête */}
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          Centre d'aide E-Samba
        </h1>
        <p className="text-sm text-muted-foreground">
          Guides, tutoriels et réponses à vos questions — disponibles hors ligne.
        </p>
      </header>

      {/* Recherche */}
      <HelpSearchBar
        query={query}
        onChange={setQuery}
        autoFocus={false}
      />

      {/* Résultats recherche */}
      {isSearching && (
        <section aria-label="Résultats de recherche">
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucun résultat pour « {query} »</p>
              <p className="text-xs text-muted-foreground">
                Essayez « panne », « DVIR », « frontière », « carburant »…
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{results.length} résultat{results.length > 1 ? 's' : ''}</p>
              {results.map((r) => (
                <SearchResultItem
                  key={`${r.type}-${r.id}`}
                  title={r.title}
                  summary={r.summary}
                  icon={r.icon}
                  duration={r.duration}
                  type={r.type}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Contenu principal (masqué pendant la recherche) */}
      {!isSearching && (
        <>
          {/* Onglets */}
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none" role="tablist">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'}
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Onglet Tutoriels ── */}
          {activeTab === 'tutoriels' && (
            <section aria-label="Tutoriels rapides">
              <div className="space-y-2">
                {topTutorials.map((t) => (
                  <QuickTutorialCard key={t.id} tutorial={t} />
                ))}
              </div>
            </section>
          )}

          {/* ── Guides Chauffeur ── */}
          {activeTab === 'chauffeur' && (
            <section aria-label="Guides chauffeur">
              <RoleGuideSection role="chauffeur" />
            </section>
          )}

          {/* ── Guides Gestionnaire ── */}
          {activeTab === 'gestionnaire' && (
            <section aria-label="Guides gestionnaire">
              <RoleGuideSection role="gestionnaire" />
            </section>
          )}

          {/* ── Guides Mécanicien ── */}
          {activeTab === 'mécanicien' && (
            <section aria-label="Guides mécanicien">
              <RoleGuideSection role="mécanicien" />
            </section>
          )}

          {/* FAQ contextuelle (commune à tous) */}
          <section aria-label="Questions fréquentes">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
              Questions fréquentes
            </h2>
            <HelpFAQ />
          </section>

          {/* Contact WhatsApp */}
          <WhatsAppSupportButton />

          {/* Footer */}
          <p className="text-center text-[11px] text-muted-foreground pb-2">
            E-Samba v2 · Douala, Cameroun · Support disponible en français et en anglais
          </p>
        </>
      )}
    </div>
  );
}
