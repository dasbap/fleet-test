# Semaine 5 - Mobile Expo et résilience terrain

## Objectif

Valider les parcours critiques mobile en conditions réseau dégradées.

## Livrables attendus

- [ ] Parcours auth, OTP, QR et sync minimale validés sur builds mobile.
- [ ] Scénarios réseau faible testés (2G/3G simulé).
- [ ] Tableau de stabilité mobile (crash, latence, retries).

## Vérifications

- [ ] Auth mobile stable après reprise d'app.
- [ ] Scan QR fiable sous réseau instable.
- [ ] Synchronisation des actions différées non bloquante.

## Critères de test terrain

- [ ] Temps de login acceptable sur réseau dégradé.
- [ ] Pas d'écran bloquant sans option de reprise.
- [ ] Messages d'erreur compréhensibles pour conducteur.

## Go

- [ ] Les parcours terrain critiques sont validés sans blocage.
- [ ] Le taux crash mobile reste sous le seuil défini par l'équipe.

## No-Go (bloquant)

- [ ] Régression sur parcours quotidien conducteur (shift/inspection/scan).
