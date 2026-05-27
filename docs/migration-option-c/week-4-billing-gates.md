# Semaine 4 - Billing et guards métier

## Objectif

Activer un provider paiement MVP et garantir l'enforcement serveur des limites de plan.

## Livrables attendus

- [ ] Provider paiement MVP activé (`notch` ou `cinetpay`).
- [ ] Webhook signé vérifié (authentification + normalisation statuts).
- [ ] Guard serveur `maxVehicles` actif.
- [ ] Feedback UI cohérent en cas de dépassement limite.

## Vérifications

- [ ] `checkout` crée un paiement pending avec idempotency key.
- [ ] Webhook `succeeded` active ou prolonge correctement l'abonnement.
- [ ] Création véhicule refusée côté serveur si limite atteinte.

## Tests requis

- [ ] Succès paiement.
- [ ] Échec paiement.
- [ ] Annulation paiement.
- [ ] Rejeu webhook idempotent.

## Go

- [ ] Les statuts paiement sont cohérents de bout en bout.
- [ ] Le guard est appliqué côté serveur (pas uniquement côté client).

## No-Go (bloquant)

- [ ] Dépassement de limite possible via appel direct API.
