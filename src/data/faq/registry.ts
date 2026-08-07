/**
 * Registry FAQ E-Samba — source de vérité unique.
 *
 * Structure :  faqRegistry[route][locale] = FaqItem[]
 *
 * Pour ajouter une langue :
 *   1. Ajouter la locale dans FaqLocale (types/faq.ts)
 *   2. Ajouter les clés [locale] ici
 *
 * Pour ajouter une route :
 *   1. Ajouter la valeur dans FaqRoute (types/faq.ts)
 *   2. Ajouter l'entrée dans ROUTE_PATTERN_MAP ci-dessous
 *   3. Ajouter le contenu ici
 */

import type { FaqRegistry } from '@/types/faq';
import { SUPPORT } from '@/config/navigation';

// ─── Mapping URL → clé FAQ ────────────────────────────────────────────────────
// Ordre important : les patterns les plus spécifiques en premier.

export const ROUTE_PATTERN_MAP: Array<{ pattern: RegExp; route: string }> = [
  { pattern: /\/dashboard\/billing/,     route: 'billing'     },
  { pattern: /\/dashboard\/drivers/,     route: 'drivers'     },
  { pattern: /\/dashboard\/fuel/,        route: 'fuel'        },
  { pattern: /\/dashboard\/vehicles/,    route: 'vehicles'    },
  { pattern: /\/dashboard\/maintenance/, route: 'maintenance' },
  { pattern: /\/dashboard\/transit/,     route: 'transit'     },
  { pattern: /\/dashboard\/alerts/,      route: 'alerts'      },
  { pattern: /\/dashboard/,              route: 'dashboard'   },
];

// ─── Contenu ──────────────────────────────────────────────────────────────────

export const faqRegistry: FaqRegistry = {

  // ── Dashboard ──────────────────────────────────────────────────────────────

  dashboard: {
    fr: [
      {
        id: 'dash-overview',
        question: 'Que puis-je voir sur le tableau de bord ?',
        answer:
          'Le tableau de bord affiche une synthèse en temps réel de votre flotte : nombre de véhicules actifs, alertes en cours, kilométrage moyen, taux de disponibilité et les dernières activités de vos chauffeurs.',
        tags: ['tableau de bord', 'synthèse', 'aperçu', 'flotte'],
      },
      {
        id: 'dash-refresh',
        question: 'À quelle fréquence les données se mettent-elles à jour ?',
        answer:
          'Les indicateurs clés sont rafraîchis toutes les 5 minutes. Les alertes critiques sont transmises en temps réel via notifications push.',
        tags: ['mise à jour', 'temps réel', 'fréquence'],
      },
      {
        id: 'dash-kpi',
        question: 'Comment personnaliser les KPIs affichés ?',
        answer:
          'Cliquez sur l\'icône "Configurer" en haut à droite du tableau de bord. Vous pouvez choisir jusqu\'à 8 indicateurs parmi les métriques disponibles et réorganiser les blocs par glisser-déposer.',
        tags: ['KPI', 'personnalisation', 'indicateurs'],
      },
      {
        id: 'dash-export',
        question: 'Puis-je exporter les données du tableau de bord ?',
        answer:
          'Oui, le bouton "Exporter" génère un rapport PDF ou CSV de la période sélectionnée. Les exports sont disponibles pour les abonnements Standard et Pro.',
        tags: ['export', 'PDF', 'CSV', 'rapport'],
      },
      {
        id: 'dash-mobile',
        question: 'Le tableau de bord est-il accessible sur mobile ?',
        answer:
          'Oui, E-Samba est optimisé mobile-first. L\'application web s\'adapte à tous les écrans. Une app native iOS/Android est également disponible.',
        tags: ['mobile', 'application', 'responsive'],
      },
    ],
    en: [
      {
        id: 'dash-overview',
        question: 'What can I see on the dashboard?',
        answer:
          'The dashboard shows a real-time summary of your fleet: active vehicles, ongoing alerts, average mileage, availability rate, and your drivers\' latest activity.',
        tags: ['dashboard', 'overview', 'fleet', 'summary'],
      },
      {
        id: 'dash-refresh',
        question: 'How often is the data updated?',
        answer:
          'Key indicators are refreshed every 5 minutes. Critical alerts are delivered in real time via push notifications.',
        tags: ['update', 'real-time', 'frequency'],
      },
      {
        id: 'dash-kpi',
        question: 'How do I customize the displayed KPIs?',
        answer:
          'Click the "Configure" icon in the top right of the dashboard. You can choose up to 8 indicators from available metrics and reorder blocks by drag and drop.',
        tags: ['KPI', 'customize', 'metrics'],
      },
      {
        id: 'dash-export',
        question: 'Can I export dashboard data?',
        answer:
          'Yes, the "Export" button generates a PDF or CSV report for the selected period. Exports are available on Standard and Pro plans.',
        tags: ['export', 'PDF', 'CSV', 'report'],
      },
      {
        id: 'dash-mobile',
        question: 'Is the dashboard accessible on mobile?',
        answer:
          'Yes, E-Samba is mobile-first. The web app adapts to all screen sizes. A native iOS/Android app is also available.',
        tags: ['mobile', 'app', 'responsive'],
      },
    ],
  },

  // ── Facturation ────────────────────────────────────────────────────────────

  billing: {
    fr: [
      {
        id: 'bill-plans',
        question: 'Quels sont les différents abonnements disponibles ?',
        answer:
          'E-Samba propose quatre formules : Gratuit (jusqu\'à 3 véhicules), Starter (jusqu\'à 25 véhicules), Pro (jusqu\'à 100 véhicules) et Enterprise (flotte illimitée). Chaque plan payant inclut un essai gratuit de 7 jours.',
        tags: ['abonnement', 'tarif', 'plan', 'formule'],
      },
      {
        id: 'bill-payment',
        question: 'Quels modes de paiement sont acceptés ?',
        answer:
          'Nous acceptons Orange Money, MTN Mobile Money, Wave, les cartes Visa/Mastercard et les virements bancaires pour les flottes Pro. Le paiement est sécurisé et crypté.',
        tags: ['paiement', 'Orange Money', 'MTN', 'Wave', 'carte'],
      },
      {
        id: 'bill-invoice',
        question: 'Comment accéder à mes factures ?',
        answer:
          'Vos factures sont disponibles dans Paramètres → Facturation → Historique. Elles peuvent être téléchargées en PDF et sont envoyées automatiquement par email chaque mois.',
        tags: ['facture', 'historique', 'email', 'télécharger'],
      },
      {
        id: 'bill-cancel',
        question: 'Comment résilier mon abonnement ?',
        answer:
          'Vous pouvez résilier à tout moment depuis Paramètres → Facturation → Gérer l\'abonnement. Vous gardez l\'accès jusqu\'à la fin de la période en cours, sans frais de résiliation.',
        tags: ['résiliation', 'annulation', 'abonnement'],
      },
      {
        id: 'bill-upgrade',
        question: 'Comment passer à un plan supérieur ?',
        answer:
          'Cliquez sur "Mettre à niveau" dans le tableau de bord ou dans Paramètres → Facturation. Le changement est immédiat et vous ne payez que le prorata du mois en cours.',
        tags: ['mise à niveau', 'upgrade', 'plan'],
      },
    ],
    en: [
      {
        id: 'bill-plans',
        question: 'What subscription plans are available?',
        answer:
          'E-Samba offers four plans: Free (up to 3 vehicles), Starter (up to 25 vehicles), Pro (up to 100 vehicles), and Enterprise (unlimited fleet). Each paid plan includes a 7-day free trial.',
        tags: ['subscription', 'pricing', 'plan'],
      },
      {
        id: 'bill-payment',
        question: 'What payment methods are accepted?',
        answer:
          'We accept Orange Money, MTN Mobile Money, Wave, Visa/Mastercard cards, and bank transfers for Pro fleets. All payments are secure and encrypted.',
        tags: ['payment', 'Orange Money', 'MTN', 'Wave', 'card'],
      },
      {
        id: 'bill-invoice',
        question: 'How do I access my invoices?',
        answer:
          'Your invoices are available in Settings → Billing → History. They can be downloaded as PDF and are automatically emailed to you each month.',
        tags: ['invoice', 'history', 'email', 'download'],
      },
      {
        id: 'bill-cancel',
        question: 'How do I cancel my subscription?',
        answer:
          'You can cancel at any time from Settings → Billing → Manage Subscription. You retain access until the end of the current period with no cancellation fees.',
        tags: ['cancel', 'subscription', 'termination'],
      },
      {
        id: 'bill-upgrade',
        question: 'How do I upgrade to a higher plan?',
        answer:
          'Click "Upgrade" on the dashboard or in Settings → Billing. The change takes effect immediately and you only pay the prorated amount for the current month.',
        tags: ['upgrade', 'plan', 'billing'],
      },
    ],
  },

  // ── Chauffeurs ─────────────────────────────────────────────────────────────

  drivers: {
    fr: [
      {
        id: 'drv-add',
        question: 'Comment ajouter un chauffeur à ma flotte ?',
        answer:
          'Dans Chauffeurs → Ajouter, renseignez le nom, le numéro de permis et le contact. Le chauffeur reçoit une invitation par SMS ou email pour activer son compte mobile E-Samba.',
        tags: ['ajouter', 'chauffeur', 'invitation', 'compte'],
      },
      {
        id: 'drv-assign',
        question: 'Comment affecter un véhicule à un chauffeur ?',
        answer:
          'Ouvrez la fiche chauffeur → Affecter un véhicule → sélectionnez le véhicule disponible. L\'affectation est horodatée et tracée dans l\'historique.',
        tags: ['affectation', 'véhicule', 'assignation'],
      },
      {
        id: 'drv-perf',
        question: 'Comment suivre la performance d\'un chauffeur ?',
        answer:
          'La fiche chauffeur affiche le score de conduite (basé sur les DVIR, les consommations et les incidents signalés), le kilométrage cumulé et le taux de présence.',
        tags: ['performance', 'score', 'suivi', 'DVIR'],
      },
      {
        id: 'drv-dvir',
        question: 'Qu\'est-ce que le DVIR ?',
        answer:
          'Le DVIR (Driver Vehicle Inspection Report) est un contrôle journalier pre/post-trajet que le chauffeur effectue sur l\'application mobile. Il documente l\'état du véhicule et génère des alertes si des anomalies sont détectées.',
        tags: ['DVIR', 'contrôle', 'inspection', 'pre-trajet'],
      },
      {
        id: 'drv-license',
        question: 'Que se passe-t-il si le permis d\'un chauffeur expire ?',
        answer:
          'E-Samba envoie des alertes 30, 14 et 7 jours avant l\'expiration. À l\'expiration, le chauffeur est automatiquement signalé comme "non conforme" et ne peut plus être affecté à un trajet.',
        tags: ['permis', 'expiration', 'alerte', 'conformité'],
      },
    ],
    en: [
      {
        id: 'drv-add',
        question: 'How do I add a driver to my fleet?',
        answer:
          'Go to Drivers → Add, enter the name, license number, and contact. The driver receives an SMS or email invitation to activate their E-Samba mobile account.',
        tags: ['add', 'driver', 'invite', 'account'],
      },
      {
        id: 'drv-assign',
        question: 'How do I assign a vehicle to a driver?',
        answer:
          'Open the driver profile → Assign Vehicle → select an available vehicle. The assignment is timestamped and recorded in the history log.',
        tags: ['assign', 'vehicle', 'assignment'],
      },
      {
        id: 'drv-perf',
        question: 'How do I track a driver\'s performance?',
        answer:
          'The driver profile shows the driving score (based on DVIRs, fuel consumption, and reported incidents), cumulative mileage, and attendance rate.',
        tags: ['performance', 'score', 'track', 'DVIR'],
      },
      {
        id: 'drv-dvir',
        question: 'What is a DVIR?',
        answer:
          'A DVIR (Driver Vehicle Inspection Report) is a daily pre/post-trip check the driver performs on the mobile app. It documents the vehicle\'s condition and triggers alerts if defects are found.',
        tags: ['DVIR', 'inspection', 'pre-trip'],
      },
      {
        id: 'drv-license',
        question: 'What happens when a driver\'s license expires?',
        answer:
          'E-Samba sends alerts 30, 14, and 7 days before expiration. At expiration, the driver is automatically flagged as "non-compliant" and can no longer be assigned to a trip.',
        tags: ['license', 'expiry', 'alert', 'compliance'],
      },
    ],
  },

  // ── Carburant ──────────────────────────────────────────────────────────────

  fuel: {
    fr: [
      {
        id: 'fuel-log',
        question: 'Comment enregistrer un plein de carburant ?',
        answer:
          'Dans Carburant → Nouveau plein, sélectionnez le véhicule, saisissez le volume (litres), le coût total et la station. Le chauffeur peut aussi l\'enregistrer directement depuis l\'app mobile avec une photo du ticket.',
        tags: ['plein', 'enregistrer', 'carburant', 'ticket'],
      },
      {
        id: 'fuel-fraud',
        question: 'Comment E-Samba détecte-t-il les fraudes carburant ?',
        answer:
          'E-Samba compare la consommation déclarée avec la consommation théorique calculée selon le kilométrage parcouru et le modèle du véhicule. Les écarts supérieurs à 15% génèrent une alerte "fraude suspectée".',
        tags: ['fraude', 'détection', 'anomalie', 'alerte'],
      },
      {
        id: 'fuel-report',
        question: 'Puis-je générer un rapport de consommation mensuel ?',
        answer:
          'Oui, dans Carburant → Rapports, choisissez la période et le périmètre (toute la flotte ou un véhicule spécifique). Le rapport est exportable en PDF ou Excel.',
        tags: ['rapport', 'mensuel', 'consommation', 'export'],
      },
      {
        id: 'fuel-cost',
        question: 'Comment suivre le coût carburant par véhicule ?',
        answer:
          'Le tableau de bord Carburant affiche le coût au 100 km pour chaque véhicule, avec la tendance sur 30/90 jours. Un code couleur signale les véhicules hors norme.',
        tags: ['coût', 'prix', 'km', 'véhicule'],
      },
      {
        id: 'fuel-budget',
        question: 'Comment définir un budget carburant ?',
        answer:
          'Dans Carburant → Budget, définissez un budget mensuel par véhicule ou par flotte. E-Samba envoie une alerte quand vous atteignez 80% du budget.',
        tags: ['budget', 'limite', 'seuil', 'alerte'],
      },
    ],
    en: [
      {
        id: 'fuel-log',
        question: 'How do I log a fuel fill-up?',
        answer:
          'Go to Fuel → New Fill-up, select the vehicle, enter the volume (litres), total cost, and station. Drivers can also log it directly from the mobile app with a photo of the receipt.',
        tags: ['fill-up', 'log', 'fuel', 'receipt'],
      },
      {
        id: 'fuel-fraud',
        question: 'How does E-Samba detect fuel fraud?',
        answer:
          'E-Samba compares declared consumption with theoretical consumption based on mileage driven and the vehicle model. Discrepancies over 15% generate a "suspected fraud" alert.',
        tags: ['fraud', 'detection', 'anomaly', 'alert'],
      },
      {
        id: 'fuel-report',
        question: 'Can I generate a monthly fuel consumption report?',
        answer:
          'Yes, in Fuel → Reports, choose the period and scope (entire fleet or a specific vehicle). The report can be exported as PDF or Excel.',
        tags: ['report', 'monthly', 'consumption', 'export'],
      },
      {
        id: 'fuel-cost',
        question: 'How do I track fuel cost per vehicle?',
        answer:
          'The Fuel dashboard shows the cost per 100 km for each vehicle, with 30/90-day trends. Color coding highlights out-of-norm vehicles.',
        tags: ['cost', 'price', 'km', 'vehicle'],
      },
      {
        id: 'fuel-budget',
        question: 'How do I set a fuel budget?',
        answer:
          'In Fuel → Budget, set a monthly budget per vehicle or fleet-wide. E-Samba sends an alert when you reach 80% of the budget.',
        tags: ['budget', 'limit', 'threshold', 'alert'],
      },
    ],
  },

  // ── Véhicules ──────────────────────────────────────────────────────────────

  vehicles: {
    fr: [
      {
        id: 'veh-add',
        question: 'Comment ajouter un véhicule à ma flotte ?',
        answer:
          'Dans Véhicules → Ajouter, renseignez l\'immatriculation, le modèle, l\'année et le kilométrage actuel. Vous pouvez scanner directement le QR code de la carte grise pour pré-remplir les informations.',
        tags: ['ajouter', 'véhicule', 'immatriculation', 'QR'],
      },
      {
        id: 'veh-qr',
        question: 'À quoi sert le QR code d\'un véhicule ?',
        answer:
          'Le QR code E-Samba est apposé sur le pare-brise. En le scannant, le chauffeur accède directement à la fiche du véhicule, lance le DVIR et consulte l\'historique de maintenance.',
        tags: ['QR code', 'scan', 'pare-brise', 'fiche'],
      },
      {
        id: 'veh-status',
        question: 'Quels sont les statuts possibles d\'un véhicule ?',
        answer:
          'Un véhicule peut être : Disponible, En mission, En maintenance, Hors service ou Archivé. Le statut se met à jour automatiquement selon les affectations et les ordres de travail.',
        tags: ['statut', 'disponible', 'mission', 'maintenance'],
      },
      {
        id: 'veh-docs',
        question: 'Où stocker les documents d\'un véhicule ?',
        answer:
          'Dans la fiche véhicule → Documents, téléversez la carte grise, l\'assurance, le contrôle technique et les autres documents. E-Samba envoie des rappels avant les expirations.',
        tags: ['documents', 'carte grise', 'assurance', 'contrôle technique'],
      },
    ],
    en: [
      {
        id: 'veh-add',
        question: 'How do I add a vehicle to my fleet?',
        answer:
          'In Vehicles → Add, enter the registration plate, model, year, and current mileage. You can scan the registration card\'s QR code to pre-fill the information.',
        tags: ['add', 'vehicle', 'registration', 'QR'],
      },
      {
        id: 'veh-qr',
        question: 'What is the vehicle QR code used for?',
        answer:
          'The E-Samba QR code is placed on the windshield. By scanning it, the driver directly accesses the vehicle profile, starts the DVIR, and views the maintenance history.',
        tags: ['QR code', 'scan', 'windshield', 'profile'],
      },
      {
        id: 'veh-status',
        question: 'What are the possible vehicle statuses?',
        answer:
          'A vehicle can be: Available, On Trip, Under Maintenance, Out of Service, or Archived. Status updates automatically based on assignments and work orders.',
        tags: ['status', 'available', 'trip', 'maintenance'],
      },
      {
        id: 'veh-docs',
        question: 'Where do I store vehicle documents?',
        answer:
          'In the vehicle profile → Documents, upload the registration, insurance, technical inspection and other documents. E-Samba sends reminders before expirations.',
        tags: ['documents', 'registration', 'insurance', 'inspection'],
      },
    ],
  },

  // ── Maintenance ────────────────────────────────────────────────────────────

  maintenance: {
    fr: [
      {
        id: 'maint-create',
        question: 'Comment créer un ordre de travail ?',
        answer:
          'Dans Maintenance → Nouvel ordre, sélectionnez le véhicule, le type de travaux (révision, réparation, pneus…) et le prestataire. L\'ordre est transmis automatiquement au responsable de flotte.',
        tags: ['ordre de travail', 'réparation', 'révision', 'prestataire'],
      },
      {
        id: 'maint-predict',
        question: 'Comment fonctionne la maintenance prédictive ?',
        answer:
          'E-Samba analyse le kilométrage, l\'âge du véhicule et l\'historique des interventions pour anticiper les prochaines révisions. Des alertes sont envoyées 500 km avant les échéances.',
        tags: ['prédictive', 'IA', 'anticipation', 'révision'],
      },
      {
        id: 'maint-cost',
        question: 'Puis-je suivre les coûts de maintenance par véhicule ?',
        answer:
          'Oui, le module Maintenance affiche le coût total de maintenance par véhicule sur la période sélectionnée, avec une comparaison au coût moyen de votre flotte.',
        tags: ['coût', 'suivi', 'budget', 'maintenance'],
      },
    ],
    en: [
      {
        id: 'maint-create',
        question: 'How do I create a work order?',
        answer:
          'In Maintenance → New Order, select the vehicle, work type (service, repair, tyres…) and the provider. The order is automatically sent to the fleet manager.',
        tags: ['work order', 'repair', 'service', 'provider'],
      },
      {
        id: 'maint-predict',
        question: 'How does predictive maintenance work?',
        answer:
          'E-Samba analyses mileage, vehicle age, and intervention history to anticipate upcoming services. Alerts are sent 500 km before scheduled milestones.',
        tags: ['predictive', 'AI', 'anticipation', 'service'],
      },
      {
        id: 'maint-cost',
        question: 'Can I track maintenance costs per vehicle?',
        answer:
          'Yes, the Maintenance module shows total maintenance cost per vehicle for the selected period, with a comparison to your fleet average.',
        tags: ['cost', 'track', 'budget', 'maintenance'],
      },
    ],
  },

  // ── Transit CEMAC ──────────────────────────────────────────────────────────

  transit: {
    fr: [
      {
        id: 'trn-corridor',
        question: 'Quels corridors CEMAC sont couverts ?',
        answer:
          'E-Samba couvre les principaux corridors de transit de la zone CEMAC : Douala–N\'Djamena, Douala–Bangui, Libreville–Brazzaville et les liaisons inter-pays CM/TD/CF/CG/GA/GQ.',
        tags: ['corridor', 'CEMAC', 'transit', 'douane'],
      },
      {
        id: 'trn-docs',
        question: 'Comment gérer les documents douaniers dans E-Samba ?',
        answer:
          'Dans Transit → Documents, téléversez le manifeste de chargement, la déclaration douanière et le carnet ATA. E-Samba suit le statut de chaque document et alerte en cas d\'anomalie.',
        tags: ['douane', 'documents', 'manifeste', 'déclaration'],
      },
    ],
    en: [
      {
        id: 'trn-corridor',
        question: 'Which CEMAC corridors are covered?',
        answer:
          'E-Samba covers the main transit corridors in the CEMAC zone: Douala–N\'Djamena, Douala–Bangui, Libreville–Brazzaville, and cross-border links between CM/TD/CF/CG/GA/GQ.',
        tags: ['corridor', 'CEMAC', 'transit', 'customs'],
      },
      {
        id: 'trn-docs',
        question: 'How do I manage customs documents in E-Samba?',
        answer:
          'In Transit → Documents, upload the cargo manifest, customs declaration, and ATA carnet. E-Samba tracks the status of each document and alerts on anomalies.',
        tags: ['customs', 'documents', 'manifest', 'declaration'],
      },
    ],
  },

  // ── Alertes ────────────────────────────────────────────────────────────────

  alerts: {
    fr: [
      {
        id: 'alrt-types',
        question: 'Quels types d\'alertes E-Samba génère-t-il ?',
        answer:
          'E-Samba gère quatre niveaux d\'alerte : Critique (panne, accident), Haute (document expiré, surconsommation), Moyenne (maintenance proche, permis à renouveler) et Faible (rappel planifié).',
        tags: ['alerte', 'type', 'critique', 'panne'],
      },
      {
        id: 'alrt-notif',
        question: 'Comment configurer les notifications ?',
        answer:
          'Dans Paramètres → Notifications, choisissez les canaux (push mobile, email, SMS) et les seuils d\'alerte par catégorie. Chaque membre de l\'équipe peut personnaliser ses préférences.',
        tags: ['notification', 'SMS', 'email', 'push', 'configuration'],
      },
    ],
    en: [
      {
        id: 'alrt-types',
        question: 'What types of alerts does E-Samba generate?',
        answer:
          'E-Samba manages four alert levels: Critical (breakdown, accident), High (expired document, overconsumption), Medium (maintenance due, license renewal), and Low (scheduled reminder).',
        tags: ['alert', 'type', 'critical', 'breakdown'],
      },
      {
        id: 'alrt-notif',
        question: 'How do I configure notifications?',
        answer:
          'In Settings → Notifications, choose channels (mobile push, email, SMS) and alert thresholds per category. Each team member can customize their preferences.',
        tags: ['notification', 'SMS', 'email', 'push', 'configure'],
      },
    ],
  },

  // ── FAQ générique (fallback) ───────────────────────────────────────────────

  generic: {
    fr: [
      {
        id: 'gen-esamba',
        question: 'Qu\'est-ce qu\'E-Samba ?',
        answer:
          'E-Samba est un SaaS de gestion de flotte intelligente conçu pour l\'Afrique Centrale (zone CEMAC). Il centralise la gestion des véhicules, chauffeurs, carburant, maintenance et transit douanier.',
        tags: ['E-Samba', 'présentation', 'SaaS', 'flotte'],
      },
      {
        id: 'gen-start',
        question: 'Comment démarrer avec E-Samba ?',
        answer:
          'Créez votre compte, ajoutez vos premiers véhicules et chauffeurs, puis invitez votre équipe. Le guide de démarrage interactif vous accompagne étape par étape.',
        tags: ['démarrer', 'guide', 'compte', 'onboarding'],
      },
      {
        id: 'gen-support',
        question: 'Comment contacter le support E-Samba ?',
        answer:
          `Le support est disponible via le chat en ligne (lundi–vendredi, 8h–18h WAT), par email à ${SUPPORT.email}, ou par WhatsApp au +237 6XX XXX XXX.`,
        tags: ['support', 'contact', 'aide', 'chat', 'email'],
      },
      {
        id: 'gen-security',
        question: 'Mes données sont-elles sécurisées ?',
        answer:
          'Oui, E-Samba héberge vos données sur des serveurs certifiés ISO 27001 avec chiffrement AES-256. L\'accès est protégé par authentification multi-facteurs et contrôle de rôles (RBAC).',
        tags: ['sécurité', 'données', 'RGPD', 'chiffrement'],
      },
    ],
    en: [
      {
        id: 'gen-esamba',
        question: 'What is E-Samba?',
        answer:
          'E-Samba is a smart fleet management SaaS designed for Central Africa (CEMAC zone). It centralises vehicle, driver, fuel, maintenance, and customs transit management.',
        tags: ['E-Samba', 'overview', 'SaaS', 'fleet'],
      },
      {
        id: 'gen-start',
        question: 'How do I get started with E-Samba?',
        answer:
          'Create your account, add your first vehicles and drivers, then invite your team. The interactive onboarding guide walks you through every step.',
        tags: ['start', 'guide', 'account', 'onboarding'],
      },
      {
        id: 'gen-support',
        question: 'How do I contact E-Samba support?',
        answer:
          `Support is available via live chat (Mon–Fri, 8am–6pm WAT), email at ${SUPPORT.email}, or WhatsApp at +237 6XX XXX XXX.`,
        tags: ['support', 'contact', 'help', 'chat', 'email'],
      },
      {
        id: 'gen-security',
        question: 'Is my data secure?',
        answer:
          'Yes, E-Samba hosts your data on ISO 27001-certified servers with AES-256 encryption. Access is protected by multi-factor authentication and role-based access control (RBAC).',
        tags: ['security', 'data', 'encryption', 'RBAC'],
      },
    ],
  },
};
