/**
 * FAQ E-Samba — Lingala (ln)
 *
 * ⚠️  Traductions de base — à réviser par un traducteur natif Lingala.
 *
 * Lingala est parlé principalement en RDC, Congo-Brazzaville et Centrafrique.
 * Les questions sans traduction Lingala retombent automatiquement sur le FR.
 *
 * Pour compléter : ajouter les items manquants avec la même structure FaqItem.
 */

import type { FaqRegistry } from '@/types/faq';
import { SUPPORT } from '@/config/navigation';

export const faqLn: FaqRegistry = {
  dashboard: {
    ln: [
      {
        id: 'dash-overview',
        question: 'Nakoki komona nini na tableau de bord ?',
        answer:
          'Tableau de bord emonisaka résumé ya bozwi ya ndenge oyo mobembo ezali : biloko oyo ezali kosala, biloko ya likambu, kilomètres, taux ya disponibilité mpe biloko oyo bato ya biro basalaki.',
        tags: ['tableau de bord', 'résumé', 'bozwi', 'mbeto'],
      },
      {
        id: 'dash-refresh',
        question: 'Na mingi te data ezongisami ?',
        answer:
          'Biloko ya ntina ezongisami na minute 5. Biloko ya likambu ya ntina eutami na temps réel na notifications push.',
        tags: ['mise à jour', 'temps réel', 'minuti'],
      },
    ],
  },

  billing: {
    ln: [
      {
        id: 'bill-plans',
        question: 'Abonnements nini ezali ?',
        answer:
          'E-Samba ezali na formules minei : Gratuit (tii na biloko 3), Starter (tii na biloko 25), Pro (tii na biloko 100) mpe Enterprise (biloko oyo ezali koleka). Plan ya koboya ezali na essai ya mikolo 7 ofele.',
        tags: ['abonnement', 'tarif', 'plan'],
      },
      {
        id: 'bill-payment',
        question: 'Nzela nini ya kobiya ezali ?',
        answer:
          'Toyambi Orange Money, MTN Mobile Money, Wave, carte Visa/Mastercard mpe virement bancaire.',
        tags: ['paiement', 'Orange Money', 'MTN', 'Wave'],
      },
    ],
  },

  drivers: {
    ln: [
      {
        id: 'drv-add',
        question: 'Nakoki kosimba moteur ya ndele ndenge nini ?',
        answer:
          'Na Bato ya biro → Kobakisa, tiya nkombo, numéro ya permis mpe contact. Moto ya biro akakata invitation na SMS to email mpo na kozindisa compte na ye ya mobile E-Samba.',
        tags: ['kobakisa', 'chauffeur', 'invitation'],
      },
      {
        id: 'drv-dvir',
        question: 'DVIR ezali nini ?',
        answer:
          'DVIR (Driver Vehicle Inspection Report) ezali contrôle ya mokolo ya liboso/nsima ya mobembo oyo moto ya biro asalaka na application mobile. Ekomaka état ya mbeto mpe ezali kopesa biloko ya likambu soki anomalie euti.',
        tags: ['DVIR', 'contrôle', 'inspection'],
      },
    ],
  },

  generic: {
    ln: [
      {
        id: 'gen-esamba',
        question: 'E-Samba ezali nini ?',
        answer:
          'E-Samba ezali SaaS ya gestion ya bozwi ya biloko (flotte) oyo esalama mpo na Afrique ya Ntei (zone CEMAC). Esangisaka gestion ya biloko, bato ya biro, mafuta, maintenance mpe transit ya douane.',
        tags: ['E-Samba', 'présentation', 'SaaS'],
      },
      {
        id: 'gen-start',
        question: 'Nakoki kobanda ndenge nini na E-Samba ?',
        answer:
          'Saka compte, bakisa biloko na yo ya liboso mpe bato ya biro, sima benga équipe na yo. Guide ya kobanda akosalisa yo étape na étape.',
        tags: ['kobanda', 'guide', 'compte'],
      },
      {
        id: 'gen-support',
        question: 'Nakoki kosangana na support E-Samba ndenge nini ?',
        answer:
          `Support ezali na chat en ligne (lundi–vendredi, 8h–18h WAT), na email ${SUPPORT.email}, to na WhatsApp.`,
        tags: ['support', 'contact', 'mabe', 'chat'],
      },
    ],
  },
};
