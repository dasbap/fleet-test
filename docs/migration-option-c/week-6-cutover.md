# Semaine 6 - Cutover progressif et rollback

## Objectif

Bascule contrôlée par paliers avec rollback prêt à l'emploi.

## Livrables attendus

- [ ] Feature flags de bascule par module (auth, OTP, QR, billing, mobile).
- [ ] Plan de rollback documenté et testé.
- [ ] Procédure de communication incident (tech + support + produit).

## Plan de rollout recommandé

1. Pilot fleet interne
2. 10% population cible
3. 50%
4. 100%

## Vérifications à chaque palier

- [ ] KPI auth stables.
- [ ] KPI OTP/QR stables.
- [ ] Taux erreur API stable.
- [ ] Aucun incident P1/P2 ouvert non maîtrisé.

## Go

- [ ] 72h de stabilité post-bascule sans incident critique.

## No-Go (bloquant)

- [ ] Incident auth ou fuite multi-tenant non résolu.
