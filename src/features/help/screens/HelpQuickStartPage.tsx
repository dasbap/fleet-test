/**
 * Parcours démarrage rapide — 6 étapes, objectif &lt; 8 minutes.
 */
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTE_PATHS } from '@/navigation/routePaths';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { SupportPanel } from '@/components/help/SupportPanel';

const STEPS = [
  {
    id: 1,
    title: 'Créer une organisation',
    body: 'Assistant onboarding après inscription.',
    route: ROUTE_PATHS.onboarding,
    duration: '2 min',
  },
  {
    id: 2,
    title: 'Créer une flotte',
    body: 'Nommez votre première flotte opérationnelle.',
    route: ROUTE_PATHS.dashboardCreateFleet,
    duration: '1 min',
  },
  {
    id: 3,
    title: 'Ajouter un véhicule',
    body: 'Immatriculation, marque, modèle, kilométrage.',
    route: ROUTE_PATHS.dashboardVehicles,
    duration: '2 min',
  },
  {
    id: 4,
    title: 'Ajouter un chauffeur',
    body: 'Invitation par SMS depuis le dashboard.',
    route: ROUTE_PATHS.dashboardInvitations,
    duration: '1 min',
  },
  {
    id: 5,
    title: 'Première affectation',
    body: 'Assignez le chauffeur au véhicule.',
    route: ROUTE_PATHS.dashboardVehicles,
    duration: '1 min',
  },
  {
    id: 6,
    title: 'Première clôture',
    body: 'KM fin, recettes et validation.',
    route: ROUTE_PATHS.dashboardShiftClosure,
    duration: '1 min',
  },
];

export default function HelpQuickStartPage() {
  useSeoMeta({
    title: 'Démarrage rapide — Centre d\'aide E-Samba',
    canonical: 'https://www.e-samba.com/help/quickstart',
    metas: [{ name: 'description', content: 'Configurez E-Samba en moins de 8 minutes.' }],
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
      <header>
        <Link to={ROUTE_PATHS.help} className="text-xs text-primary hover:underline">
          ← Centre d&apos;aide
        </Link>
        <h1 className="font-heading text-xl font-semibold mt-2">Démarrage rapide</h1>
        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
          <Clock className="h-4 w-4" aria-hidden />
          Environ 8 minutes · 6 étapes
        </p>
      </header>

      <ol className="space-y-4">
        {STEPS.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              {index === 0 ? (
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0" aria-hidden />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground shrink-0" aria-hidden />
              )}
              {index < STEPS.length - 1 && (
                <div className="w-px flex-1 bg-border min-h-[2rem] mt-1" aria-hidden />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{step.title}</h2>
                <span className="text-[10px] text-muted-foreground">{step.duration}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.body}</p>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link to={step.route}>Commencer</Link>
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <SupportPanel compact />
    </div>
  );
}
