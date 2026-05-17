/**
 * Labels UI pour chaque route FAQ — affichés dans le panneau et le drawer.
 * Toujours en français dans l'UI (la FAQ elle-même est multilingue).
 */

import type { FaqRoute } from '@/types/faq';

export const FAQ_ROUTE_LABELS: Record<FaqRoute, string> = {
  dashboard:   'Tableau de bord',
  billing:     'Facturation',
  drivers:     'Chauffeurs',
  fuel:        'Carburant',
  vehicles:    'Véhicules',
  maintenance: 'Maintenance',
  transit:     'Transit CEMAC',
  alerts:      'Alertes',
  generic:     'Questions fréquentes',
};
