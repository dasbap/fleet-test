import type { Tutorial } from './types';

const storageBase = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tutorials`;

function makeChapters(total: number) {
  return [
    { id: 'c1', title: 'Contexte', startSec: 0 },
    { id: 'c2', title: 'Démonstration', startSec: Math.max(10, Math.floor(total * 0.25)) },
    { id: 'c3', title: 'Récapitulatif', startSec: Math.max(20, Math.floor(total * 0.8)) },
  ];
}

export const tutorials: Tutorial[] = [
  { id: 'tuto-01', title: 'Ouvrir un créneau', description: 'Démarrer une mission en 4 étapes terrain.', duration: 62, category: 'creneau', thumbnailUrl: `${storageBase}/thumbs/tuto-01.jpg`, videoUrl: `${storageBase}/videos/tuto-01.mp4`, filename: 'tuto-01.mp4', tags: ['créneau', 'départ'], chapters: makeChapters(62) },
  { id: 'tuto-02', title: 'Clôturer une mission', description: 'Fermer correctement un créneau en fin de mission.', duration: 47, category: 'creneau', thumbnailUrl: `${storageBase}/thumbs/tuto-02.jpg`, videoUrl: `${storageBase}/videos/tuto-02.mp4`, filename: 'tuto-02.mp4', tags: ['retour', 'clôture'], chapters: makeChapters(47) },
  { id: 'tuto-03', title: 'Scanner un QR véhicule', description: 'Accéder à la fiche véhicule via scan QR.', duration: 31, category: 'creneau', thumbnailUrl: `${storageBase}/thumbs/tuto-03.jpg`, videoUrl: `${storageBase}/videos/tuto-03.mp4`, filename: 'tuto-03.mp4', tags: ['QR', 'scan'], chapters: makeChapters(31) },
  { id: 'tuto-04', title: 'Signaler un incident', description: 'Déclarer un incident avec photo et géolocalisation.', duration: 53, category: 'incident', thumbnailUrl: `${storageBase}/thumbs/tuto-04.jpg`, videoUrl: `${storageBase}/videos/tuto-04.mp4`, filename: 'tuto-04.mp4', tags: ['incident', 'panne'], chapters: makeChapters(53) },
  { id: 'tuto-05', title: 'Saisir un plein carburant', description: 'Enregistrer volume, montant et justificatif.', duration: 41, category: 'creneau', thumbnailUrl: `${storageBase}/thumbs/tuto-05.jpg`, videoUrl: `${storageBase}/videos/tuto-05.mp4`, filename: 'tuto-05.mp4', tags: ['carburant'], chapters: makeChapters(41) },
  { id: 'tuto-06', title: 'Consulter les alertes', description: 'Lire et prioriser les alertes maintenance.', duration: 37, category: 'maintenance', thumbnailUrl: `${storageBase}/thumbs/tuto-06.jpg`, videoUrl: `${storageBase}/videos/tuto-06.mp4`, filename: 'tuto-06.mp4', tags: ['alertes'], chapters: makeChapters(37) },
  { id: 'tuto-07', title: 'Planifier un entretien', description: 'Programmer une intervention avec budget.', duration: 58, category: 'maintenance', thumbnailUrl: `${storageBase}/thumbs/tuto-07.jpg`, videoUrl: `${storageBase}/videos/tuto-07.mp4`, filename: 'tuto-07.mp4', tags: ['entretien'], chapters: makeChapters(58) },
  { id: 'tuto-08', title: 'Lire un rapport', description: 'Analyser les rapports de flotte et exporter.', duration: 46, category: 'rapports', thumbnailUrl: `${storageBase}/thumbs/tuto-08.jpg`, videoUrl: `${storageBase}/videos/tuto-08.mp4`, filename: 'tuto-08.mp4', tags: ['rapport'], chapters: makeChapters(46) },
  { id: 'tuto-09', title: "Inviter un collègue", description: "Ajouter un membre dans l'organisation.", duration: 33, category: 'parametres', thumbnailUrl: `${storageBase}/thumbs/tuto-09.jpg`, videoUrl: `${storageBase}/videos/tuto-09.mp4`, filename: 'tuto-09.mp4', tags: ['invitation'], chapters: makeChapters(33) },
  { id: 'tuto-10', title: 'Utiliser le mode offline', description: 'Travailler hors réseau puis synchroniser.', duration: 64, category: 'parametres', thumbnailUrl: `${storageBase}/thumbs/tuto-10.jpg`, videoUrl: `${storageBase}/videos/tuto-10.mp4`, filename: 'tuto-10.mp4', tags: ['offline', 'sync'], chapters: makeChapters(64) },
];

export function getTutorialById(id: string) {
  return tutorials.find((tutorial) => tutorial.id === id) ?? null;
}
