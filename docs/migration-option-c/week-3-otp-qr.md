# Semaine 3 - OTP et QR end-to-end

## Objectif

Valider les parcours OTP SMS et QR (génération, scan, journalisation) avec protections réseau.

## Livrables attendus

- [ ] OTP branché côté UI cible avec messages d'erreur robustes.
- [ ] Flux QR complet connecté aux tables/tokens/logs.
- [ ] CORS en allow-list (pas de wildcard).
- [ ] Rate limiting OTP/QR actif et monitoré.

## Vérifications

- [ ] OTP: envoi, validation, cooldown, erreurs.
- [ ] QR: génération token, scan, écriture journal.
- [ ] Test sur trois rôles minimum (`organizer`, `manager`, `driver`).

## Tests manuels minimaux

- [ ] Tentative OTP depuis origine non autorisée -> refus.
- [ ] Plusieurs envois OTP en rafale -> rate limit.
- [ ] Scan QR invalide -> erreur utilisateur propre.

## Go

- [ ] OTP et QR passent tous les scénarios nominaux et erreurs.
- [ ] Aucune fonction critique avec `Access-Control-Allow-Origin: *`.

## No-Go (bloquant)

- [ ] OTP accessible depuis des origines non autorisées.
