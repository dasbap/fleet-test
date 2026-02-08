# ADR 0001 — Thème sombre forcé (forcedTheme)

## Statut

Accepté.

## Contexte

- **Exigence produit** : l’interface doit être en mode sombre uniquement (cohérence visuelle, usage terrain / faible luminosité, identité produit).
- Le projet utilise **next-themes** via un `ThemeProvider` ; next-themes permet d’imposer un thème via `forcedTheme`, sans laisser le choix à l’utilisateur.

## Décision

- Forcer le thème global avec **`forcedTheme="dark"`** et **`enableSystem={false}`** dans `src/components/ThemeProvider.tsx`.
- Aucun sélecteur light / dark / système n’est proposé à l’utilisateur.

## Conséquences

- **UX irréversible** : l’utilisateur ne peut pas choisir le mode clair ni suivre la préférence système. Tout changement futur (ex. ajout d’un switch thème) doit être traité comme une nouvelle décision produit et peut faire l’objet d’une ADR de révision.
- Cohérence visuelle et maintenance simplifiée : un seul mode à valider.
- Les composants (ex. Sonner) sont alignés sur `theme="dark"` ; cette cohérence doit être maintenue si la décision évolue.

## Référence

- Implémentation : `src/components/ThemeProvider.tsx`.
