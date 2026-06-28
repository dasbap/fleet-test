# Roadmap Mobile Scalable e-samba

> Stratégie globale Capacitor vs Expo : [`mobile-capacitor-vs-react-native.md`](mobile-capacitor-vs-react-native.md).

## Portée
Ce document prépare la phase post-MVP (`Mon véhicule + historique` et `scan`) sur l’app mobile Capacitor.

## Option simple (reste minimal)
- Étendre progressivement le cache offline des écrans les plus utilisés.
- Ajouter des métriques métier (latence ouverture fiche, taux succès sync).
- Stabiliser les parcours role `driver` avant d’élargir aux autres rôles.

## Option scalable (montée en charge)
- Catalogue pièces volumineux en index local segmenté (lots versionnés).
- Internationalisation industrialisée (namespaces + extraction centralisée des chaînes).
- Temps réel orienté événements avec déduplication et reprise sur reconnexion.
- Paiements via abstraction provider unique avant tout connecteur spécifique.

## Dépendances critiques
- Capacitor camera/push déjà intégré.
- Schémas Supabase alignés avec les nouveaux flux scan/historique.
- Stratégie de stockage local à faire évoluer (quota, purge, versioning des payloads).

## Métriques de monitoring recommandées
- `scan_to_vehicle_open_ms`
- `vehicle_history_load_ms`
- `offline_sync_success_rate`
- `offline_cache_hit_rate`

