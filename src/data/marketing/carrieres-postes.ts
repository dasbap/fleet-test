import type { JobPosting } from "@/types/carrieres";

const REMUNERATION_GENERIC =
  "Rémunération attractive selon profil et expérience (CDI ou forfait freelance négociable).";

const REMUNERATION_COMMERCIAL_TERRAIN = [
  "Fixe mensuel selon profil et expérience",
  "Primes à l'activation pilote et à la conversion client payant",
  "Bonus récurrent lié au MRR du portefeuille",
  "Frais de représentation remboursés sur justificatifs",
];

const REMUNERATION_COMMERCIAL_PME = [
  "Fixe mensuel selon profil et expérience",
  "Commission à la signature (PME et contrats Entreprise)",
  "Bonus récurrent lié au MRR du portefeuille",
  "Frais de représentation remboursés sur justificatifs",
];

export const CARRIERES_POSTES: readonly JobPosting[] = [
  {
    id: "dev-mobile-senior",
    title: "Développeur Mobile Senior (Android / React Native)",
    contract: "CDI ou Freelance longue durée",
    location: "Télétravail / Douala",
    availability: "immediate",
    availabilityLabel: "Immédiate",
    priority: "immediate",
    mission:
      "Finaliser, stabiliser et déployer l'application mobile E-Samba sur Android (Google Play), en prenant en charge le shell Capacitor existant et l'évolution vers React Native Expo, dans un contexte réseau contraint (2G/3G CEMAC).",
    context:
      "L'application web est live et stable. L'application Android est en phase de finalisation — c'est le principal bloquant commercial : les conducteurs et mécaniciens terrain ont besoin d'un accès mobile hors ligne capable pour les contrôles DVIR, la saisie de maintenance et les preuves photo. Sans app store disponible, la cible « conducteurs » est inaccessible.",
    responsibilities: [
      {
        domain: "Créer une version Android",
        detail:
          "Finaliser le build Capacitor, générer l'AAB release, gérer la signature et soumettre sur Google Play.",
      },
      {
        domain: "Hors ligne et cache",
        detail:
          "Implémenter le cache MMKV pour les formulaires DVIR/maintenance en zone sans réseau.",
      },
      {
        domain: "Photos et preuves",
        detail:
          "Intégrer la capture photo (avant/après intervention) avec téléchargement différé sur maintenance-evidence.",
      },
      {
        domain: "Notifications push",
        detail: "Configurer FCM Android pour les alertes flotte en temps réel.",
      },
      {
        domain: "Réseau et performance",
        detail:
          "Optimiser les requêtes Supabase pour 2G (pagination agressive, compression, lazyload).",
      },
      {
        domain: "Code QR",
        detail: "Intégrer le scanner QR natif pour l'identification véhicule terrain.",
      },
      {
        domain: "Expo (vision)",
        detail: "Faire évoluer progressivement vers React Native Expo (apps/mobile).",
      },
    ],
    skills: [
      "React Native / Expo : 3 ans et plus",
      "Capacitor (Ionic) : expérience souhaitée",
      "TypeScript strict — pas de `any`",
      "Client Supabase JS — connaissance des modèles RLS/auth",
      "Android Studio, ADB, signature APK/AAB",
      "Gestion hors ligne : MMKV, AsyncStorage, sync différée",
    ],
    generalSkills: [
      "Autonomie totale (startup de 2 personnes)",
      "Sensibilité aux contraintes terrain africain (réseau, appareils low-cost)",
      "Tests de rigueur sur appareils réels (Xiaomi, Tecno, Samsung A-series)",
    ],
    education: [
      "Bac+3 minimum en informatique ou autodidacte confirmé",
      "4+ ans de développement mobile dont au moins 2 applications en production sur Google Play",
      "Expérience CEMAC/Afrique francophone appréciée",
    ],
    conditions: [
      "Type : CDI ou contrat freelance 12 mois renouvelable",
      "Lieu : Télétravail complet, avec déplacements possibles Douala/Yaoundé",
      REMUNERATION_GENERIC,
      "Outils : MacBook ou PC fourni, accès Supabase et Vercel",
    ],
    kpis: [
      "Application publiée sur Google Play : J+45",
      "Score Lighthouse Mobile > 80 sur 3G émulée",
      "Taux de crash < 0,5 % (Firebase Crashlytics)",
      "Couverture tests modules Vitest mobiles > 60 %",
    ],
    evolution: "Responsable Mobile → Directeur Technique Mobile (Phase 3)",
  },
  {
    id: "commercial-taxis-yaounde",
    title: "Agent Commercial Terrain — Segment Taxis & VTC, Yaoundé",
    contract: "CDI",
    location: "Yaoundé — terrain quotidien (Biyem-Assi, Mvan, Essos, Mvog-Ada, Nkol-Eton)",
    availability: "immediate",
    availabilityLabel: "Immédiate",
    priority: "immediate",
    segment: "taxis",
    headcountLabel: "2 postes",
    mission:
      "Conquérir le marché des propriétaires de taxis, VTC et petites flottes (1 à 10 véhicules) à Yaoundé en signant des pilotes gratuits convertis en abonnements payants Starter (voir tarifs publics).",
    context:
      "E-Samba cible le segment volume : propriétaires de taxis et petites flottes avec un cycle de vente court (1 à 7 jours). La présence physique matinale dans les parkings et gares routières est le levier principal de conversion.",
    targetTables: [
      {
        title: "Zones terrain prioritaires",
        headers: ["Zone", "Raison", "Cibles"],
        rows: [
          [
            "Mvan / Nkol-Eton",
            "Gares routières, parkings taxis",
            "Propriétaires de taxis au stationnement",
          ],
          [
            "Biyem-Assi",
            "Zone résidentielle dense, fort taux de taxis",
            "Propriétaires 2 à 5 taxis",
          ],
          [
            "Mvog-Ada",
            "Marché, commerce, mobilité intense",
            "Coopératives de transport urbain",
          ],
          [
            "Nlongkak / Bastos",
            "VTC premium, ambassades, institutions",
            "VTC haut de gamme, Uber-like",
          ],
          [
            "Essos / Mendong",
            "Quartiers populaires, croissance",
            "Taxis collectifs",
          ],
        ],
      },
    ],
    responsibilities: [
      {
        domain: "Prospection quotidienne du terrain",
        detail:
          "Se rendre physiquement dans les parkings, gares routières et garages entre 6h30 et 9h. Identifier les propriétaires présents sur site (pas les chauffeurs salariés). Engager la conversation sur le contrôle des recettes journalières.",
      },
      {
        domain: "Démonstration sur smartphone",
        detail:
          "Montrer E-Samba en direct sur le téléphone du prospect en moins de 10 minutes. Axes : recettes encaissées la veille et alertes avant expiration des documents. Laisser le prospect tester l'interface.",
      },
      {
        domain: "Enrôlement des pilotes",
        detail:
          "Inscrire le prospect sur e-samba.com depuis son téléphone, créer la flotte et ajouter le premier véhicule. Inviter le chauffeur. Fixer un point de suivi WhatsApp J+3 et J+7.",
      },
      {
        domain: "Suivi des pilotes actifs",
        detail:
          "Appeler chaque pilote à J+3, suivre l'usage via le tableau de bord E-Samba, intervenir en cas d'inactivité > 48h sur pilote.",
      },
      {
        domain: "Conversion et encaissement",
        detail:
          "À J+28 : présenter le bilan du pilote, proposer l'abonnement Starter (Mobile Money MTN MoMo ou Orange Money sur site).",
      },
      {
        domain: "Réseau d'apport",
        detail:
          "Collecter 2 contacts de référence à chaque client signé. Animer les groupes WhatsApp de propriétaires de taxis.",
      },
      {
        domain: "Reporting hebdomadaire",
        detail:
          "Remplir le tracker CRM (prospects, statuts, pilotes, clients). Compte-rendu WhatsApp chaque vendredi avant 18h.",
      },
    ],
    schedule: [
      { time: "6h30 – 8h30", activity: "Terrain matinal : parkings taxis, gares routières" },
      { time: "8h30 – 10h", activity: "Démos sur smartphone (2 à 3 démos en direct au parking)" },
      { time: "10h – 12h", activity: "Suivi des pilotes actifs par WhatsApp + appels J+3 / J+7" },
      {
        time: "12h – 14h",
        activity: "Pause + identification de nouveaux prospects (réseaux sociaux, groupes WhatsApp)",
      },
      { time: "14h – 17h", activity: "Visites terrain quartiers résidentiels (Biyem-Assi, Mendong)" },
      { time: "17h – 18h", activity: "Mise à jour CRM + préparation arguments du lendemain" },
      { time: "18h – 19h", activity: "Appels de conversion (pilotes J+25 à J+28)" },
    ],
    skills: [
      "Accroche rapide en milieu informel (< 30 secondes pour capter l'attention)",
      "Démonstration produit sur smartphone (E-Samba en 10 minutes)",
      "Clôture directe : proposer le pilote dès le premier contact",
      "Gestion des objections terrain camerounaises",
      "Utilisation fluide d'un smartphone Android",
      "WhatsApp Business, partage de liens, appels vidéo",
    ],
    generalSkills: [
      "Persévérance et résistance au refus (ratio typique : 1 vente pour 10 contacts)",
      "Apparence soignée et professionnelle (image de la marque)",
      "Honnêteté et fiabilité (gestion des paiements Mobile Money)",
      "Motivation financière (le variable peut tripler le fixe)",
    ],
    education: [
      "Bac minimum (toute filière) — Bac+2 Commerce/Marketing apprécié mais non obligatoire",
      "1 à 3 ans de vente terrain au Cameroun (assurance, télécoms, FMCG, banque mobile)",
      "Connaissance personnelle du milieu des taxis yaoundéens : atout majeur",
      "Habitué à travailler en dehors d'un bureau — autonomie totale",
    ],
    languages: [
      "Français courant (obligatoire)",
      "Ewondo, Beti, Bamiléké ou autre langue locale yaoundéenne : fort avantage terrain",
    ],
    conditions: [
      "Type : CDI avec période d'essai 3 mois",
      "Lieu : Yaoundé — terrain quotidien",
      ...REMUNERATION_COMMERCIAL_TERRAIN,
      "Outils : Smartphone fourni, accès CRM, démo live",
      "Abonnement Starter — voir la page Tarifs",
    ],
    kpis: [
      "Contacts terrain/semaine : 20 (M+1) → 25 (M+3) → 30 (M+6)",
      "Démos réalisées/mois : 8 (M+1) → 12 (M+3) → 15 (M+6)",
      "Pilotes activés/mois : 4 (M+1) → 6 (M+3) → 8 (M+6)",
      "Clients payants cumulés : 1 (M+1) → 5 (M+3) → 15 (M+6)",
      "MRR généré : objectif croissant",
      "Objectif M+3 : 10 clients payants actifs sur le segment taxis/VTC",
    ],
    evolution:
      "Commercial Junior → Commercial Senior (segment PME/Institutions) → Chef d'Équipe Commerciale Yaoundé (Phase 3)",
  },
  {
    id: "commercial-pme-yaounde",
    title: "Chargé de Développement Commercial — Segment PME & Institutions, Yaoundé",
    contract: "CDI + commissions",
    location: "Yaoundé — terrain + rendez-vous formels",
    availability: "immediate",
    availabilityLabel: "Immédiate ou M+1",
    priority: "immediate",
    segment: "pme",
    headcountLabel: "1 poste",
    mission:
      "Signer des contrats avec des PME de transport (5 à 50 véhicules), des institutions, administrations et ONG à Yaoundé — billets moyens plus élevés, cycle de vente plus long, impact MRR majeur.",
    context:
      "Le segment PME et institutions exige des rendez-vous formels, des propositions commerciales structurées et une navigation des processus d'approbation internes. Objectif M+6 : 5 contrats PME/Institutions signés avec un MRR cumulé significatif.",
    targetTables: [
      {
        title: "Segment PME Transport Interurbain",
        headers: ["Type d'entreprise", "Lignes", "Nb véhicules", "Valeur"],
        rows: [
          [
            "Compagnies de voitures (Yaoundé–Douala, Yaoundé–Bafoussam)",
            "Ex. : Général Express, Vatican Express, Buca Voyages",
            "10 à 40 voitures",
            "Contrat à forte valeur",
          ],
          [
            "Transporteurs scolaires (lycées privés)",
            "Yaoundé Bastos, Nkol-Eton, Omnisports",
            "5 à 15 minibus",
            "Contrat moyen",
          ],
          [
            "Entreprises de livraison",
            "E-commerce, pharmacies, FMCG",
            "5 à 20 utilitaires",
            "Contrat moyen à forte valeur",
          ],
        ],
      },
      {
        title: "Segment Institutions et Organisations",
        headers: ["Cible", "Localisation", "Flotte estimée", "Approche"],
        rows: [
          [
            "ONG internationales (HCR, FAO, UNICEF, MSF, Oxfam)",
            "Centre de Bastos / Yaoundé",
            "5 à 30 véhicules",
            "Responsable Logistique",
          ],
          [
            "Ambassades et représentations diplomatiques",
            "Bastos",
            "3 à 15 véhicules",
            "Chef Administration",
          ],
          [
            "Ministères (Santé, Travaux Publics, Éducation)",
            "Centre administratif",
            "10 à 100+ véhicules",
            "DAF / Responsable Flotte",
          ],
          [
            "CAMPOST, CAMTEL, CDE",
            "Para-étatiques",
            "20 à 100 véhicules",
            "Direction technique",
          ],
          [
            "Universités (UYI, ENSP, ENAM)",
            "Ngoa-Ekellé, Obili",
            "5 à 20 véhicules",
            "Direction des services",
          ],
          [
            "Cliniques & hôpitaux privés",
            "Yaoundé",
            "3 à 10 ambulances/véhicules",
            "Directeur médical",
          ],
        ],
      },
    ],
    responsibilities: [
      {
        domain: "Identification & qualification des prospects",
        detail:
          "Constituer une liste de 50 organisations cibles dans les 3 premiers mois. Identifier le bon interlocuteur (DG, DAF, Responsable Flotte, Responsable Logistique). Sources : annuaires institutionnels, LinkedIn, recommandations, chambre de commerce.",
      },
      {
        domain: "Prise de contact & premier rendez-vous",
        detail:
          "WhatsApp pour les PME locales ; email professionnel + appel pour les institutions et ONG. Objectif : décrocher un rendez-vous de 30 minutes pour présenter E-Samba.",
      },
      {
        domain: "Présentation formelle",
        detail:
          "Présentation adaptée au secteur, démonstration sur ordinateur ou tablette (gestionnaire + organisateur), brochure commerciale PDF, pilote gratuit 30 jours avec accompagnement dédié.",
      },
      {
        domain: "Gestion du cycle de vente institutionnelle",
        detail:
          "Proposition commerciale personnalisée, navigation des processus d'approbation (DAF, DG, comité), formation sur site (1/2 journée), négociation contrat Entreprise (plan sur devis).",
      },
      {
        domain: "Suivi et fidélisation",
        detail:
          "Point mensuel avec chaque client actif, remontée des besoins produit, proposition d'extension (plus de véhicules, passage Enterprise).",
      },
      {
        domain: "Partenariats prescripteurs",
        detail:
          "Identifier des prescripteurs clés à Yaoundé (cabinets de conseil, experts-comptables, assureurs auto) et structurer des accords de recommandation avec commissions.",
      },
    ],
    skills: [
      "Cycle de vente long (1 à 3 mois) : patience et relances structurées",
      "Rédaction de propositions commerciales professionnelles",
      "Négociation avec les directions administratives et financières",
      "Présentation en salle de réunion formelle",
      "Maîtrise des outils bureautiques (Google Slides, Word, Excel)",
      "Démonstration produit SaaS sur ordinateur/tablette",
      "Courriel professionnel, LinkedIn",
    ],
    generalSkills: [
      "3 à 5 ans de développement commercial B2B au Cameroun",
      "Expérience vente SaaS ou solutions techniques : très fortement appréciée",
      "Expérience avec interlocuteurs institutionnels (ONG, administrations) : atout décisif",
      "Réseau établi à Yaoundé dans le milieu des affaires ou du transport",
    ],
    education: [
      "Bac+3 minimum : Commerce, Gestion, Relations Internationales, Marketing",
      "Bac+5 apprécié pour l'approche institutionnelle (ONG, ambassades)",
    ],
    languages: [
      "Français courant (obligatoire)",
      "Anglais professionnel (ONG et ambassades anglophones à Yaoundé — obligatoire)",
      "Langue locale en plus : atout",
    ],
    conditions: [
      "Type : CDI",
      "Lieu : Yaoundé — terrain + rendez-vous formels",
      ...REMUNERATION_COMMERCIAL_PME,
      "Outils : Smartphone/PC fourni, accès CRM, pitch deck, démo live",
    ],
    kpis: [
      "50 organisations cibles qualifiées à M+3",
      "5 contrats PME/Institutions signés à M+6",
      "MRR cumulé : objectif significatif à M+6",
    ],
    evolution: "Chargé Développement Commercial → Responsable Commercial PME/Institutions (Phase 3)",
  },
  {
    id: "customer-success-onboarding",
    title: "Customer Success Manager / Chargé(e) d'Onboarding",
    contract: "CDI",
    location: "Douala / Télétravail",
    availability: "m3",
    availabilityLabel: "M+3",
    priority: "upcoming",
    mission:
      "Garantir que chaque client qui s'inscrit crée sa flotte, ajoute son premier véhicule et utilise activement la plateforme dans les 7 premiers jours — notamment l'abonnement et la rétention à long terme.",
    context:
      "Le taux d'achèvement de l'étape 1 est de 0,4 %. L'objectif est de le porter à 50 % via un accompagnement humain et proactif. En zone CEMAC, les utilisateurs ont besoin d'un contact humain disponible — pas seulement d'une FAQ.",
    responsibilities: [
      {
        domain: "Onboarding actif",
        detail:
          "Contacter chaque nouveau client J+1 par WhatsApp pour l'accompagner dans la prise en main.",
      },
      {
        domain: "Support multicanal",
        detail:
          "Répondre aux tickets, messages WhatsApp et emails dans un délai < 4h (heures ouvrées).",
      },
      {
        domain: "Formation",
        detail: "Animer des séances de formation en ligne (30 min) pour les équipes clientes.",
      },
      {
        domain: "Tutoriels",
        detail:
          "Rédiger et tenir à jour les articles FAQ et tutoriels dans la plateforme (10 catégories FR/EN).",
      },
      {
        domain: "Rétention",
        detail:
          "Identifier les clients à risque de churn (faible usage à J+7), relancer proactivement.",
      },
      {
        domain: "Feedback",
        detail:
          "Collecter les retours utilisateurs, les structurer et les transmettre à l'équipe produit.",
      },
      {
        domain: "Reporting",
        detail:
          "Suivre les KPIs d'activation (taux Step 1, DAU J+7, NPS) et les reporter hebdomadairement.",
      },
    ],
    skills: [
      "Excellente communication écrite et orale (français impératif, anglais apprécié)",
      "Aisance avec les outils SaaS (démontrer une interface web en direct)",
      "Empathie et patience avec des utilisateurs peu technophiles",
      "Organisation et rigueur dans le suivi (chaque client = une fiche)",
      "Connaissance de base du secteur transport/logistique appréciée",
      "WhatsApp Business, Loom ou équivalent, Google Workspace",
    ],
    generalSkills: [],
    education: [
      "Bac+2 minimum (tertiaire, communication, gestion)",
      "2+ ans en support client, customer success ou formation utilisateurs",
      "Expérience SaaS ou tech : un atout majeur",
    ],
    conditions: [
      "Type : CDI",
      "Lieu : Douala (présentiel) ou télétravail selon profil",
      REMUNERATION_GENERIC,
      "Bonus : Primes trimestrielles liées au NPS et taux d'activation",
    ],
    kpis: [
      "Taux d'achèvement Étape 1 : > 40 % à M+2 (vs 0,4 % actuel)",
      "Délai réponse support : < 4h",
      "Clients NPS actifs : > 40",
      "Taux de rétention M+3 : > 70 %",
    ],
    evolution: "Responsable Customer Success → VP Opérations (Phase 4)",
  },
  {
    id: "deploiement-partenariats-cemac",
    title: "Chargé(e) de Déploiement & Partenariats Terrain CEMAC",
    contract: "CDI",
    location: "Itinérant (Cameroun, Gabon, Congo)",
    availability: "m5",
    availabilityLabel: "M+5",
    priority: "upcoming",
    mission:
      "Structurer et développer le réseau de partenaires revendeurs et intégrateurs dans les 6 pays CEMAC, et coordonner les déploiements terrain pour les clients entreprise (20+ véhicules).",
    context:
      "La croissance d'E-Samba ne peut pas reposer uniquement sur des ventes directes. Il faut des relais locaux dans chaque pays (Phase B : Gabon / Phase C : Congo). Ce poste est le pivot de l'expansion régionale.",
    responsibilities: [
      {
        domain: "Réseau de partenaires",
        detail:
          "Identifier, qualifier et contractualiser avec des revendeurs locaux (garages, sociétés informatiques, cabinets de conseil transport).",
      },
      {
        domain: "Déploiements Entreprise",
        detail:
          "Prendre en charge les projets sur les flottes 20+ véhicules : paramétrage, formation équipes, suivi J+30.",
      },
      {
        domain: "Négociations institutionnelles",
        detail:
          "Approcher les collectivités, ports, sociétés minières et pétrolières avec une offre Enterprise.",
      },
      {
        domain: "Veille concurrence",
        detail:
          "Monitorer les mouvements des concurrents (Ctrack, Fleeti, Wialon) dans la zone.",
      },
      {
        domain: "Événements",
        detail: "Représenter E-Samba dans les salons transport et logistique CEMAC.",
      },
      {
        domain: "Intégrations paiement",
        detail:
          "Coordonner les discussions avec Orange Money, MTN MoMo, Wave pour les pilotes de paiement (Phase 3).",
      },
    ],
    skills: [
      "Réseau établi dans le secteur transport/logistique en Afrique Centrale",
      "5+ ans en développement partenariats ou distribution B2B",
      "Mobilité géographique totale (passeport CEMAC, visas)",
      "Bilinguisme français/anglais (marché gabonais et équato-guinéen)",
      "Leadership et autonomie complète sur le terrain",
    ],
    generalSkills: [],
    education: [],
    conditions: [
      "Type : CDI",
      "Lieu : Douala (base), déplacements 60 % du temps",
      REMUNERATION_GENERIC,
      "Commission partenariats selon profil",
      "Frais : Budget déplacement dédié (avion, hôtel)",
    ],
    kpis: [
      "3 partenaires revendeurs signés à M+6",
      "1 déploiement Entreprise (20+ véhicules) à M+4",
      "Présence dans 2 pays CEMAC à M+9",
    ],
    evolution: "Directeur Expansion CEMAC (Phase 4)",
  },
  {
    id: "data-engineer-ia",
    title: "Data Engineer / Développeur IA",
    contract: "CDI ou Freelance",
    location: "Télétravail",
    availability: "t4_2026",
    availabilityLabel: "T4 2026",
    priority: "upcoming",
    mission:
      "Construire la couche données et intelligence artificielle d'E-Samba : scoring maintenance prédictive, détection de fraude carburant, scoring comportemental des conducteurs.",
    context:
      "E-Samba dispose d'une base de données riche (véhicules, maintenance, carburant, incidents) prête à être exploitée pour la prédiction et l'optimisation opérationnelle.",
    responsibilities: [
      {
        domain: "Datawarehouse",
        detail: "Modéliser et mettre en place le datawarehouse (Supabase → BigQuery ou équivalent).",
      },
      {
        domain: "Prédiction de panne",
        detail: "Développer les algorithmes de prédiction de panne (régression, séries temporelles).",
      },
      {
        domain: "Intégration API",
        detail: "Intégrer les modèles dans l'API via Supabase Edge Functions.",
      },
      {
        domain: "Tableaux de bord",
        detail:
          "Construire les tableaux de bord analytiques (scoring chauffeur, coût par km, prédiction entretien).",
      },
      {
        domain: "Alertes intelligentes",
        detail: "Créer les alertes intelligentes basées sur les anomalies détectées.",
      },
    ],
    skills: [
      "Python (Pandas, scikit-learn, Prophet) : 3+ ans",
      "SQL avancé (PostgreSQL)",
      "Expérience MLOps (déploiement modèles en production)",
      "Compréhension des données parcellaires et comportements atypiques (contexte africain)",
    ],
    generalSkills: [],
    education: [],
    conditions: [
      "Type : CDI ou Freelance mission longue",
      REMUNERATION_GENERIC,
    ],
    kpis: [],
    evolution: "Responsable Data & IA (Phase 4)",
  },
];

export const CARRIERES_POSTES_PRIORITAIRES = CARRIERES_POSTES.filter(
  (p) => p.priority === "immediate",
);

export const CARRIERES_POSTES_COMMERCIAUX_YAOUNDE = CARRIERES_POSTES.filter(
  (p) => p.segment === "taxis" || p.segment === "pme",
);

export const CARRIERES_POSTES_PRIORITAIRES_AUTRES = CARRIERES_POSTES_PRIORITAIRES.filter(
  (p) => !p.segment,
);

export const CARRIERES_POSTES_A_VENIR = CARRIERES_POSTES.filter(
  (p) => p.priority === "upcoming",
);
