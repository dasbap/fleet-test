# Baseline Supabase (référence)

Ce dossier définit la chaîne **scalable** de migration :
- une baseline de référence pour les nouveaux environnements
- un lot réduit de deltas sécurité pour tous les environnements

## Fichiers

- `00000000000000_baseline_schema.sql` : baseline SQL de référence
- `delta-migrations.txt` : ordre officiel des deltas à rejouer

## Règle d'utilisation

- **Nouvel environnement** : appliquer baseline puis deltas.
- **Environnement existant** : appliquer deltas uniquement.
- Ne pas rejouer les migrations legacy historiques dans ce flux.
