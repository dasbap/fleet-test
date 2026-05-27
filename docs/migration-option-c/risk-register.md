# Registre des risques - Migration Option C

## Auth

- **Risque**: divergence Clerk/Supabase claims.
- **Impact**: blocage login ou permissions incohérentes.
- **Mitigation**: tests de cohérence des claims JWT, jeu de tests par rôle.
- **Owner**: Lead backend auth.
- **Statut**: ouvert.

## Data / RLS

- **Risque**: régression policy RLS lors d'une reprise de migration.
- **Impact**: fuite inter-tenant.
- **Mitigation**: exécution systématique des tests SQL (`01`, `02`, `06`) en CI.
- **Owner**: DBA / backend.
- **Statut**: ouvert.

## OTP / QR

- **Risque**: abuse OTP via CORS/rate-limit mal configuré.
- **Impact**: coût SMS, fraude, indisponibilité.
- **Mitigation**: allow-list stricte, cooldown, alerting sur pics.
- **Owner**: backend edge functions.
- **Statut**: ouvert.

## Billing

- **Risque**: gate plan appliqué uniquement côté client.
- **Impact**: contournement des limites de plan.
- **Mitigation**: enforcement serveur + tests d'intégration.
- **Owner**: backend billing.
- **Statut**: ouvert.

## Mobile

- **Risque**: dégradation réseau terrain non gérée.
- **Impact**: abandon utilisateur, erreurs critiques terrain.
- **Mitigation**: tests 2G/3G, retries/backoff, UX fallback.
- **Owner**: lead mobile.
- **Statut**: ouvert.

## Delivery

- **Risque**: scope trop large pour la fenêtre cible.
- **Impact**: glissement de planning.
- **Mitigation**: gel strict P0/P1, backlog P2 explicite, revue Go/No-Go hebdo.
- **Owner**: PM/Tech lead.
- **Statut**: ouvert.
