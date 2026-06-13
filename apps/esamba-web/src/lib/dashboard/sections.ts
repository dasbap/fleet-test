export const DASHBOARD_SECTIONS: Record<
  string,
  { title: string; description: string }
> = {
  alertes: {
    title: "Alertes",
    description:
      "Liste des alertes opérationnelles et notifications à traiter.",
  },
  flottes: {
    title: "Flottes",
    description: "Gestion des flottes et paramètres multi-sites.",
  },
  entretien: {
    title: "Entretien",
    description: "Travaux de maintenance et planning d'interventions.",
  },
  depenses: {
    title: "Dépenses",
    description: "Carburant, entretien et coûts d'exploitation.",
  },
  rapports: {
    title: "Rapports",
    description: "Analyses et exports pour la direction.",
  },
  parametres: {
    title: "Paramètres",
    description: "Profil, organisation et préférences du compte.",
  },
};
