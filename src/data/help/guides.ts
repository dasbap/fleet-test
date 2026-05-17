/**
 * Contenu — Guides par rôle + Tutoriels rapides + Onboarding.
 * Optimisé 2G/3G : pas d'images, texte concis, accordéons.
 */

export type GuideRole = 'chauffeur' | 'gestionnaire' | 'mécanicien' | 'general';
export type GuideCategory = 'démarrage' | 'quotidien' | 'urgence' | 'avancé';

export interface GuideStep {
  title: string;
  body:  string;
}

export interface Guide {
  id:         string;
  role:       GuideRole;
  category:   GuideCategory;
  title:      string;
  summary:    string;
  steps:      GuideStep[];
  tags:       string[];
  duration:   string; // ex: "2 min"
}

export interface QuickTutorial {
  id:       string;
  title:    string;
  summary:  string;
  role:     GuideRole[];
  steps:    string[];   // étapes courtes (1 phrase chacune)
  icon:     string;     // emoji
  duration: string;
}

export interface OnboardingStep {
  id:     string;
  title:  string;
  body:   string;
  action: string; // texte du bouton CTA
  route:  string; // lien relatif
}

// ── Tutoriels rapides ─────────────────────────────────────────────────────────

export const QUICK_TUTORIALS: QuickTutorial[] = [
  {
    id:       'scan-qr',
    title:    'Scanner un QR de véhicule',
    summary:  'Identifiez n\'importe quel véhicule de la flotte en 10 secondes.',
    role:     ['chauffeur', 'gestionnaire', 'mécanicien'],
    icon:     '📱',
    duration: '1 min',
    steps: [
      'Ouvrez l\'application E-Samba.',
      'Appuyez sur l\'icône QR en bas de l\'écran.',
      'Pointez la caméra vers le code QR collé sur le véhicule.',
      'La fiche du véhicule s\'ouvre automatiquement.',
    ],
  },
  {
    id:       'dvir-pre-trip',
    title:    'Contrôle pré-départ (DVIR)',
    summary:  'Remplissez le contrôle journalier avant de prendre la route.',
    role:     ['chauffeur'],
    icon:     '✅',
    duration: '3 min',
    steps: [
      'Accédez à votre véhicule via QR ou la liste.',
      'Appuyez sur « Contrôle pré-départ ».',
      'Vérifiez chaque point de la liste (freins, pneus, niveaux…).',
      'Signalez tout défaut avec une photo si nécessaire.',
      'Validez pour enregistrer et débloquer la sortie.',
    ],
  },
  {
    id:       'report-breakdown',
    title:    'Signaler une panne',
    summary:  'Alertez immédiatement le gestionnaire en cas de problème.',
    role:     ['chauffeur'],
    icon:     '🚨',
    duration: '1 min',
    steps: [
      'Appuyez sur le bouton rouge « Signaler une panne » sur la fiche véhicule.',
      'Décrivez le problème en quelques mots.',
      'Prenez une photo si possible.',
      'Validez — le gestionnaire reçoit l\'alerte immédiatement.',
    ],
  },
  {
    id:       'add-vehicle',
    title:    'Ajouter un véhicule',
    summary:  'Enregistrez un nouveau véhicule dans votre flotte.',
    role:     ['gestionnaire'],
    icon:     '🚛',
    duration: '3 min',
    steps: [
      'Menu → Flotte → « Nouveau véhicule ».',
      'Saisissez l\'immatriculation et les infos du véhicule.',
      'Ajoutez les documents (assurance, carte grise).',
      'Imprimez ou téléchargez le QR code généré.',
      'Collez le QR sur le pare-brise du véhicule.',
    ],
  },
  {
    id:       'maintenance-job',
    title:    'Créer un ordre de maintenance',
    summary:  'Planifiez une intervention technique sur un véhicule.',
    role:     ['gestionnaire', 'mécanicien'],
    icon:     '🔧',
    duration: '2 min',
    steps: [
      'Ouvrez la fiche du véhicule concerné.',
      'Onglet « Maintenance » → « Nouvel ordre ».',
      'Sélectionnez le type d\'intervention et affectez un mécanicien.',
      'Fixez la date prévue et sauvegardez.',
      'Le mécanicien reçoit une notification automatiquement.',
    ],
  },
  {
    id:       'fuel-entry',
    title:    'Saisir un plein de carburant',
    summary:  'Enregistrez chaque ravitaillement pour le suivi des coûts.',
    role:     ['chauffeur', 'gestionnaire'],
    icon:     '⛽',
    duration: '1 min',
    steps: [
      'Fiche véhicule → onglet « Carburant ».',
      'Appuyez sur « Nouveau plein ».',
      'Entrez les litres, le coût et le kilométrage actuel.',
      'Prenez en photo le ticket de caisse (optionnel).',
      'Sauvegardez.',
    ],
  },
  {
    id:       'border-transit',
    title:    'Déclarer un passage frontière',
    summary:  'Enregistrez un transit CEMAC pour le suivi documentaire.',
    role:     ['chauffeur', 'gestionnaire'],
    icon:     '🛃',
    duration: '3 min',
    steps: [
      'Menu → Transit → « Nouveau passage ».',
      'Sélectionnez le couloir (ex : Douala → N\'Djaména).',
      'Saisissez les références des documents douaniers.',
      'Ajoutez les photos des laissez-passer.',
      'Validez — le suivi de convoi démarre.',
    ],
  },
  {
    id:       'check-alerts',
    title:    'Gérer les alertes',
    summary:  'Consultez et traitez les alertes prioritaires de votre flotte.',
    role:     ['gestionnaire'],
    icon:     '🔔',
    duration: '2 min',
    steps: [
      'La cloche en haut indique le nombre d\'alertes actives.',
      'Appuyez pour ouvrir le centre d\'alertes.',
      'Les alertes rouges sont critiques — traitez-les en premier.',
      'Appuyez sur une alerte pour voir les détails et l\'action recommandée.',
      'Fermez l\'alerte une fois résolue.',
    ],
  },
];

// ── Guides détaillés par rôle ─────────────────────────────────────────────────

export const GUIDES: Guide[] = [
  // ── Chauffeur ──
  {
    id:       'chauffeur-premier-jour',
    role:     'chauffeur',
    category: 'démarrage',
    title:    'Mon premier jour avec E-Samba',
    summary:  'Comment prendre en main l\'application en 5 minutes.',
    duration: '5 min',
    tags:     ['démarrage', 'connexion', 'profil'],
    steps: [
      { title: 'Connexion', body: 'Votre gestionnaire vous a envoyé un SMS avec votre code. Ouvrez l\'app et saisissez votre numéro de téléphone pour recevoir le code OTP.' },
      { title: 'Compléter votre profil', body: 'Ajoutez une photo et vérifiez vos informations (permis, contact d\'urgence). Ça prend moins de 2 minutes.' },
      { title: 'Trouver votre véhicule', body: 'Scannez le QR code sur le pare-brise ou cherchez votre véhicule dans la liste « Mes véhicules ».' },
      { title: 'Premier DVIR', body: 'Avant chaque départ, remplissez le contrôle pré-départ. Si tout va bien, validez. Sinon, signalez le problème.' },
      { title: 'Signalement d\'urgence', body: 'En cas de panne ou d\'accident, appuyez sur le bouton rouge. Votre gestionnaire est alerté immédiatement.' },
    ],
  },
  {
    id:       'chauffeur-transit-cemac',
    role:     'chauffeur',
    category: 'quotidien',
    title:    'Traverser une frontière CEMAC',
    summary:  'Documents nécessaires et procédure de transit.',
    duration: '4 min',
    tags:     ['transit', 'frontière', 'douane', 'CEMAC'],
    steps: [
      { title: 'Avant le départ', body: 'Vérifiez dans l\'app que tous les documents du véhicule sont valides (assurance, visite technique, titre de transport). Un badge rouge = document expiré ou manquant.' },
      { title: 'Au poste frontière', body: 'Ouvrez votre fiche véhicule et montrez le QR code à l\'agent des douanes si demandé. Le QR contient les infos essentielles.' },
      { title: 'Déclarer le passage', body: 'Menu → Transit → « Nouveau passage » → sélectionnez votre couloir et saisissez le numéro du laissez-passer.' },
      { title: 'Problème douanier', body: 'Utilisez le bouton « Contacter gestionnaire » pour joindre votre responsable immédiatement. Ne signez aucun document sans accord.' },
    ],
  },
  {
    id:       'chauffeur-urgence',
    role:     'chauffeur',
    category: 'urgence',
    title:    'Que faire en cas d\'accident ?',
    summary:  'Procédure d\'urgence étape par étape.',
    duration: '2 min',
    tags:     ['accident', 'urgence', 'panne'],
    steps: [
      { title: '1. Sécurité d\'abord', body: 'Mettez le triangle de signalisation, activez les feux de détresse, éloignez-vous du véhicule si nécessaire.' },
      { title: '2. Appel d\'urgence', body: 'Composez le 117 (police) ou 119 (secours médicaux) si nécessaire.' },
      { title: '3. Alerter via l\'app', body: 'Appuyez sur le bouton rouge « Signaler incident » dans votre fiche véhicule. Décrivez la situation en quelques mots.' },
      { title: '4. Photos du sinistre', body: 'Prenez des photos depuis l\'app — elles sont automatiquement horodatées et géolocalisées pour l\'assurance.' },
      { title: '5. Constater amiablement', body: 'Ne bougez pas les véhicules avant l\'arrivée de la police ou de l\'assureur. Votre gestionnaire peut vous guider.' },
    ],
  },

  // ── Gestionnaire ──
  {
    id:       'gestionnaire-tableau-de-bord',
    role:     'gestionnaire',
    category: 'démarrage',
    title:    'Comprendre le tableau de bord',
    summary:  'Les 5 métriques clés à surveiller chaque matin.',
    duration: '3 min',
    tags:     ['dashboard', 'kpi', 'alertes'],
    steps: [
      { title: 'Véhicules actifs', body: 'Le compteur vert indique les véhicules en route. Orange = en attente de DVIR. Rouge = panne ou alerte critique.' },
      { title: 'Alertes prioritaires', body: 'Traitez d\'abord les alertes rouges (critiques) avant de commencer votre journée.' },
      { title: 'Coût carburant', body: 'Le graphique journalier détecte les consommations anormales. Un pic = vérification à faire.' },
      { title: 'Documents expirés', body: 'Le widget « Documents » alerte 30 jours avant expiration. Renouvelez à l\'avance pour éviter l\'immobilisation.' },
      { title: 'Performances chauffeurs', body: 'Score de conformité DVIR par chauffeur — contactez ceux sous 80%.' },
    ],
  },
  {
    id:       'gestionnaire-equipe',
    role:     'gestionnaire',
    category: 'quotidien',
    title:    'Gérer son équipe de chauffeurs',
    summary:  'Invitations, rôles et suivi de conformité.',
    duration: '4 min',
    tags:     ['équipe', 'chauffeurs', 'invitation', 'rôles'],
    steps: [
      { title: 'Inviter un chauffeur', body: 'Menu → Équipe → « Inviter ». Entrez le numéro de téléphone du chauffeur. Il recevra un SMS avec le lien d\'accès.' },
      { title: 'Assigner un véhicule', body: 'Fiche chauffeur → « Assigner un véhicule » → sélectionnez dans la liste. L\'assignation peut être temporaire ou permanente.' },
      { title: 'Suivre les DVIR', body: 'Menu → Rapports → « Conformité DVIR ». Filtrez par chauffeur ou période pour identifier les manquements.' },
      { title: 'Gérer les absences', body: 'Désactivez temporairement un chauffeur sans supprimer son profil. Ses données et historiques sont conservés.' },
    ],
  },
  {
    id:       'gestionnaire-maintenance',
    role:     'gestionnaire',
    category: 'avancé',
    title:    'Plan de maintenance préventive',
    summary:  'Planifiez les révisions à l\'avance pour éviter les pannes.',
    duration: '5 min',
    tags:     ['maintenance', 'préventif', 'calendrier'],
    steps: [
      { title: 'Activer les rappels', body: 'Fiche véhicule → Maintenance → « Activer rappels ». Définissez les intervalles (km ou jours) pour chaque type d\'entretien.' },
      { title: 'Calendrier flotte', body: 'Menu → Maintenance → « Planning » pour voir toutes les interventions prévues sur une vue calendrier.' },
      { title: 'Affecter un mécanicien', body: 'Créez un ordre de travail et assignez-le directement au mécanicien disponible. Il reçoit la notification sur son téléphone.' },
      { title: 'Suivi des coûts', body: 'Chaque intervention est coûtée. Menu → Rapports → « Coûts maintenance » pour le bilan par véhicule ou période.' },
    ],
  },

  // ── Mécanicien ──
  {
    id:       'mecanicien-ordre-travail',
    role:     'mécanicien',
    category: 'quotidien',
    title:    'Traiter un ordre de travail',
    summary:  'De la réception à la clôture d\'une intervention.',
    duration: '3 min',
    tags:     ['ordre de travail', 'intervention', 'clôture'],
    steps: [
      { title: 'Recevoir l\'ordre', body: 'Vous recevez une notification push avec le détail de l\'intervention. Appuyez pour ouvrir la fiche.' },
      { title: 'Consulter l\'historique', body: 'Fiche véhicule → onglet « Historique » pour voir toutes les interventions précédentes sur ce véhicule.' },
      { title: 'Démarrer l\'intervention', body: 'Appuyez sur « Démarrer » — l\'heure de début est enregistrée automatiquement.' },
      { title: 'Documenter les travaux', body: 'Saisissez les pièces remplacées, les quantités et les références. Prenez des photos des pièces défectueuses.' },
      { title: 'Clôturer', body: 'Appuyez sur « Clôturer l\'ordre ». Le gestionnaire reçoit le rapport de clôture avec le temps passé et les pièces utilisées.' },
    ],
  },
  {
    id:       'mecanicien-diagnostic',
    role:     'mécanicien',
    category: 'avancé',
    title:    'Utiliser le diagnostic IA',
    summary:  'L\'IA E-Samba prédit les pannes avant qu\'elles surviennent.',
    duration: '3 min',
    tags:     ['IA', 'diagnostic', 'prédictif'],
    steps: [
      { title: 'Accéder au diagnostic', body: 'Fiche véhicule → onglet « Diagnostic IA ». Les prédictions sont calculées d\'après l\'historique de maintenance et les données de conduite.' },
      { title: 'Lire le score de risque', body: 'Score 0-100 : vert (< 30) = OK, orange (30-70) = surveillance, rouge (> 70) = intervention recommandée.' },
      { title: 'Composants surveillés', body: 'Freins, courroie de distribution, huile moteur, batterie, pneus. Chaque composant a son propre score et sa date de risque estimée.' },
      { title: 'Planifier en avance', body: 'Utilisez les prédictions pour commander les pièces à l\'avance et grouper les interventions afin de minimiser l\'immobilisation.' },
    ],
  },
];

// ── Onboarding par rôle ───────────────────────────────────────────────────────

export const ONBOARDING_STEPS: Record<GuideRole, OnboardingStep[]> = {
  chauffeur: [
    { id: 'o1', title: 'Bienvenue !',       body: 'E-Samba vous accompagne chaque jour sur la route. Voici les 3 actions essentielles.',                          action: 'Commencer',             route: '/profile' },
    { id: 'o2', title: 'Votre profil',      body: 'Ajoutez votre photo et vos informations de permis. C\'est obligatoire pour valider vos DVIR.',                action: 'Compléter mon profil',  route: '/profile' },
    { id: 'o3', title: 'Scanner votre véhicule', body: 'Scannez le QR code de votre véhicule principal pour l\'associer à votre compte.',                       action: 'Scanner le QR',         route: '/scan' },
    { id: 'o4', title: 'Premier contrôle', body: 'Effectuez votre premier contrôle pré-départ (DVIR). Ça prend 3 minutes et protège votre responsabilité.',     action: 'Faire le contrôle',     route: '/dvir/new' },
  ],
  gestionnaire: [
    { id: 'o1', title: 'Bienvenue !',         body: 'Configurez votre flotte E-Samba en quelques étapes.',                                                       action: 'Commencer',             route: '/dashboard' },
    { id: 'o2', title: 'Ajoutez vos véhicules', body: 'Commencez par enregistrer au moins un véhicule avec son immatriculation et ses documents.',                action: 'Ajouter un véhicule',  route: '/vehicles/new' },
    { id: 'o3', title: 'Invitez votre équipe', body: 'Envoyez les invitations à vos chauffeurs par SMS. Ils peuvent s\'inscrire en 2 minutes.',                   action: 'Inviter des chauffeurs', route: '/team/invite' },
    { id: 'o4', title: 'Activez les alertes', body: 'Configurez vos préférences d\'alerte pour rester informé des événements critiques de votre flotte.',         action: 'Configurer les alertes', route: '/settings/alerts' },
  ],
  mécanicien: [
    { id: 'o1', title: 'Bienvenue !',       body: 'E-Samba vous permet de gérer vos ordres de travail depuis votre téléphone.',                                  action: 'Commencer',             route: '/maintenance' },
    { id: 'o2', title: 'Vos outils',       body: 'Familiarisez-vous avec la liste des ordres de travail. En rouge = urgent, en orange = planifié, en vert = terminé.', action: 'Voir les ordres',  route: '/maintenance' },
    { id: 'o3', title: 'Diagnostic IA',    body: 'Consultez le module de diagnostic prédictif pour anticiper les pannes sur votre parc.',                        action: 'Voir le diagnostic',    route: '/maintenance/diagnostic' },
  ],
  general: [],
};
