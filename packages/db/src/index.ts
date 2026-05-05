// Point d'entrée public du package @smart-fleet/db
// Importer depuis ce package dans les scripts serveur / API routes uniquement.
// Prisma Client ne peut PAS être bundlé dans le navigateur (Vite SPA).

export { prisma } from './client'
export { Prisma } from '@prisma/client'
export type {
  Organisation,
  Flotte,
  Profil,
  FlotteAdhesion,
  FlotteInvitation,
  Vehicule,
  AffectationVehicule,
  CreneauConducteur,
  ClotureCreneau,
  Incident,
  TravauxMaintenance,
  PreuveMaintenance,
  ListeVerificationMaintenance,
  Plan,
  Paiement,
  Abonnement,
  DroitVehicule,
  JetonQr,
  RoleType,
  VehicleStatus,
  ClosureStatus,
} from '@prisma/client'
