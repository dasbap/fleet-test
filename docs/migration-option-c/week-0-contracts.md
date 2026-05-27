# Semaine 0 - Cadrage et contrats

## Objectif

Valider le contrat auth/data cible et figer le scope P0/P1 avant toute migration technique.

## Livrables attendus

- [ ] Matrice de mapping fonctionnalités entre les deux produits (auth, OTP, QR, billing, mobile, analytics).
- [ ] Contrat d'identité unifié (Clerk user, claims JWT, mapping membership Supabase).
- [ ] Contrat de données canonique (tables, colonnes, ownership, policies critiques).
- [ ] Scope P0/P1 signé (hors scope explicitement listé).

## Décisions obligatoires

- [ ] Source de vérité des rôles/permissions.
- [ ] Convention d'identifiant utilisateur unique entre Clerk et Supabase.
- [ ] Stratégie de compatibilité mobile (Expo d'abord, Capacitor en maintenance minimale).

## Vérifications

- [ ] Revue croisée backend + frontend + mobile effectuée.
- [ ] Aucun chemin auth parallèle non documenté.
- [ ] Liste des dépendances critiques validée (Clerk, Supabase, provider paiement).

## Go

- [ ] Le contrat auth est approuvé par les trois pôles (backend/frontend/mobile).
- [ ] Le scope P0/P1 est figé, avec critères de sortie mesurables.

## No-Go (bloquant)

- [ ] Ambiguïté sur les rôles ou les claims JWT.
- [ ] Décision d'architecture auth non tranchée.
