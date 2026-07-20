# Migration Option C - Exécution opérationnelle

Ce dossier transforme la checklist Go/No-Go en artefacts actionnables pour une exécution hebdomadaire.

## Périmètre

- Cible produit : convergence vers une stack unique pilotée côté front par `e-samba-web`.
- Socle sécurité/data : migrations et politiques RLS issues de `smart-fleet-africa`.
- Priorités : auth unifiée, OTP, QR, billing guards, mobile Expo.
- Choix Capacitor vs Expo : [mobile-capacitor-vs-react-native.md](../mobile-capacitor-vs-react-native.md).

## Utilisation

1. Ouvrir la semaine en cours (`week-0` à `week-6`).
2. Compléter les rubriques :
   - Livrables produits
   - Vérifications
   - Critères Go
   - Conditions No-Go
3. Mettre à jour le scoreboard KPI à chaque fin de semaine.

## Structure

- `week-0-contracts.md` : cadrage, contrats, scope figé
- `week-1-rls-foundation.md` : fondation data/RLS
- `week-2-auth-bridge.md` : auth Clerk ↔ Supabase
- `week-3-otp-qr.md` : OTP + QR end-to-end
- `week-4-billing-gates.md` : paiement + guard `maxVehicles`
- `week-5-mobile-readiness.md` : robustesse mobile terrain
- `week-6-cutover.md` : rollout progressif + rollback
- `kpi-scoreboard.md` : suivi hebdomadaire consolidé
- `risk-register.md` : registre des risques et mitigations

## Sources de vérité

- [docs/architecture/CURRENT_ARCHITECTURE.md](../architecture/CURRENT_ARCHITECTURE.md)
- [docs/auth-flow.md](../auth-flow.md)
- [docs/SUPABASE-SETUP.md](../SUPABASE-SETUP.md)
- [docs/architecture/PAYMENTS.md](../architecture/PAYMENTS.md)
- [supabase/tests/01_security_invariants.sql](../../supabase/tests/01_security_invariants.sql)
- [supabase/tests/02_policy_coverage.sql](../../supabase/tests/02_policy_coverage.sql)
