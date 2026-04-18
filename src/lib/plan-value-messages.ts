/**
 * Libellés « valeur » pour les verrous de plan (éviter une simple liste de fonctionnalités).
 */
export const planValueMessages = {
  vehicleLimit: {
    /** Toast / erreur service */
    short:
      "Votre flotte a atteint la taille incluse dans l’offre gratuite. Passez à une offre payante pour suivre davantage de véhicules sans limite bloquante.",
    title: "Élargissez votre pilotage",
    description:
      "L’offre gratuite couvre une petite flotte pour démarrer. Au-delà, une offre payante vous permet d’industrialiser le suivi et d’éviter les angles morts opérationnels.",
  },
  reports: {
    title: "Anticipez les écarts avant qu’ils coûtent cher",
    description:
      "Les vues consolidées et exports vous donnent une lecture claire de l’activité sur une période — pour arbitrer vite et sécuriser la marge.",
  },
  driverScoring: {
    title: "Priorisez la sécurité et la régularité",
    description:
      "Le pilotage par niveau de risque aide à concentrer votre attention sur les situations sensibles, sans micro-gérer chaque course.",
  },
  anomalyInsights: {
    title: "Soyez prévenu avant l’incident",
    description:
      "L’analyse automatique relie les signaux (écarts, retards, incohérences) pour vous signaler ce qui mérite un regard — sans noyer l’équipe sous des faux positifs.",
  },
  upgradeCta: "Découvrir les offres",
} as const;
