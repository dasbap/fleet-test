/**
 * FAQ E-Samba — Contenu Français
 * Source de vérité pour la locale 'fr'.
 */

import type { FaqRegistry } from '@/types/faq';

export const faqFr: FaqRegistry = {
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
  },

  billing: {
    fr: [
      {
        id: 'bill-plans',
        question: 'Quels sont les différents abonnements disponibles ?',
        answer:
          'E-Samba propose quatre formules : Gratuit (jusqu\'à 3 véhicules), Starter (jusqu\'à 25 véhicules), Pro (jusqu\'à 75 véhicules) et Enterprise (flotte illimitée). Chaque plan payant inclut un essai gratuit de 7 jours.',
        tags: ['abonnement', 'tarif', 'plan', 'formule'],
      },
      {
        id: 'bill-payment',
        question: 'Quels modes de paiement sont acceptés ?',
        answer:
          'Nous acceptons Orange Money, MTN Mobile Money, Wave, les cartes Visa/Mastercard et les virements bancaires pour les flottes Pro.',
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
  },

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
  },

  fuel: {
    fr: [
      {
        id: 'fuel-log',
        question: 'Comment enregistrer un plein de carburant ?',
        answer:
          'Dans Carburant → Nouveau plein, sélectionnez le véhicule, saisissez le volume (litres), le coût total et la station. Le chauffeur peut aussi l\'enregistrer depuis l\'app mobile avec une photo du ticket.',
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
          'Oui, dans Carburant → Rapports, choisissez la période et le périmètre. Le rapport est exportable en PDF ou Excel.',
        tags: ['rapport', 'mensuel', 'consommation', 'export'],
      },
    ],
  },

  vehicles: {
    fr: [
      {
        id: 'veh-add',
        question: 'Comment ajouter un véhicule à ma flotte ?',
        answer:
          'Dans Véhicules → Ajouter, renseignez l\'immatriculation, le modèle, l\'année et le kilométrage actuel. Vous pouvez scanner le QR code de la carte grise pour pré-remplir les informations.',
        tags: ['ajouter', 'véhicule', 'immatriculation', 'QR'],
      },
      {
        id: 'veh-qr',
        question: 'À quoi sert le QR code d\'un véhicule ?',
        answer:
          'Le QR code E-Samba est apposé sur le pare-brise. En le scannant, le chauffeur accède directement à la fiche du véhicule, lance le DVIR et consulte l\'historique de maintenance.',
        tags: ['QR code', 'scan', 'pare-brise', 'fiche'],
      },
    ],
  },

  maintenance: {
    fr: [
      {
        id: 'maint-create',
        question: 'Comment créer un ordre de travail ?',
        answer:
          'Dans Maintenance → Nouvel ordre, sélectionnez le véhicule, le type de travaux et le prestataire. L\'ordre est transmis automatiquement au responsable de flotte.',
        tags: ['ordre de travail', 'réparation', 'révision', 'prestataire'],
      },
      {
        id: 'maint-predict',
        question: 'Comment fonctionne la maintenance prédictive ?',
        answer:
          'E-Samba analyse le kilométrage, l\'âge du véhicule et l\'historique des interventions pour anticiper les prochaines révisions. Des alertes sont envoyées 500 km avant les échéances.',
        tags: ['prédictive', 'IA', 'anticipation', 'révision'],
      },
    ],
  },

  transit: {
    fr: [
      {
        id: 'trn-corridor',
        question: 'Quels corridors CEMAC sont couverts ?',
        answer:
          'E-Samba couvre les principaux corridors de transit de la zone CEMAC : Douala–N\'Djamena, Douala–Bangui, Libreville–Brazzaville et les liaisons inter-pays CM/TD/CF/CG/GA/GQ.',
        tags: ['corridor', 'CEMAC', 'transit', 'douane'],
      },
    ],
  },

  alerts: {
    fr: [
      {
        id: 'alrt-types',
        question: 'Quels types d\'alertes E-Samba génère-t-il ?',
        answer:
          'E-Samba gère quatre niveaux d\'alerte : Critique (panne, accident), Haute (document expiré), Moyenne (maintenance proche) et Faible (rappel planifié).',
        tags: ['alerte', 'type', 'critique', 'panne'],
      },
    ],
  },

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
          'Le support est disponible via le chat en ligne (lundi–vendredi, 8h–18h WAT), par email à support@e-samba.com, ou par WhatsApp.',
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
  },
};
