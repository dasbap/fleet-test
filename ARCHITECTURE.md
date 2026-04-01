# Architecture du projet - Smart Fleet Africa / Flotte E-Samba

## Vue d'ensemble

Le projet utilise une architecture en couches basée sur le pattern **Repository** et **Services**, combinée avec **React Query** pour la gestion des données côté client. Le produit **Flotte E-Samba** (web + shell mobile Capacitor) partage ce dépôt ; la cartographie des dossiers `src/` (app, pages, features, mobile-first) est décrite dans [docs/structure-flotte-e-samba.md](docs/structure-flotte-e-samba.md).

## Décisions d'architecture

Les décisions importantes (produit, UX, technique) sont documentées sous forme d’ADR : [docs/adr/README.md](docs/adr/README.md).

Pour les flux de navigation et de données entre les pages (auth, invitations, équipes, création de flotte), voir [docs/flux-navigation.md](docs/flux-navigation.md).

## Structure des couches

```
┌─────────────────────────────────────────┐
│         Composants React                │
│      (Pages, UI Components)            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Hooks React Query               │
│    (useVehicles, useFleetMembers, etc.) │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│            Services                     │
│   (Logique métier, validation)          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Repositories                    │
│    (Accès aux données Supabase)         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│            Supabase                     │
│      (Base de données PostgreSQL)       │
└─────────────────────────────────────────┘
```

## Détails des couches

### 1. Repositories (`src/repositories/`)

**Responsabilité** : Encapsuler tous les appels à Supabase pour une entité donnée.

**Infrastructure** : `base.repository.ts` définit l’interface générique `IRepository<T, TInsert, TUpdate>` et la classe abstraite `BaseRepository` pour les opérations CRUD standard.

**Caractéristiques** :
- Accès aux données uniquement (pas de logique métier)
- Méthodes CRUD standard (findAll, findById, create, update, delete)
- Gestion cohérente des erreurs
- Support des requêtes complexes (jointures, filtres)
- Retourne des types TypeScript bien définis

**Exemple** :
```typescript
export class VehicleRepository {
  async findAll(fleetId?: string): Promise<Vehicle[]> {
    let query = supabase.from('vehicules').select('*');
    if (fleetId) {
      query = query.eq('fleet_id', fleetId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }
}
```

**Conventions** :
- Nommage : `[Entity]Repository` (ex: `VehicleRepository`)
- Un repository par entité principale
- Implémente l'interface `IRepository<T>` si applicable

### 2. Services (`src/services/`)

**Responsabilité** : Contenir la logique métier et orchestrer les opérations.

**Caractéristiques** :
- Validation métier des données
- Transformation et normalisation des données
- Peut utiliser plusieurs repositories pour des opérations complexes
- Gestion des règles métier (ex: validation de kilométrage, vérification de permissions)
- Ne contient pas d'appels directs à Supabase

**Exemple** :
```typescript
export class VehicleService {
  constructor(private repository: VehicleRepository) {}

  async createVehicle(data: VehicleInsert): Promise<Vehicle> {
    // Validation métier
    if (!data.registration) {
      throw new Error('Le numéro d\'immatriculation est requis');
    }
    
    // Normalisation
    const normalizedData = {
      ...data,
      registration: data.registration.trim().toUpperCase(),
      current_km: data.current_km || 0,
      status: 'ok',
    };
    
    return this.repository.create(normalizedData);
  }
}
```

**Conventions** :
- Nommage : `[Entity]Service` (ex: `VehicleService`)
- Un service par entité principale
- Injection de dépendances via le constructeur
- Validation systématique des entrées

### 3. Hooks React Query (`src/hooks/`)

**Responsabilité** : Intégration avec React Query pour la gestion du cache et des requêtes.

**Caractéristiques** :
- Appelle les services, jamais directement les repositories ou Supabase
- Gère le cache React Query (invalidation, refetch)
- Gère les toasts utilisateur (succès, erreur)
- Simplifié au maximum (logique métier dans les services)

**Exemple** :
```typescript
const vehicleService = new VehicleService(new VehicleRepository());

export function useVehicles(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles', fleetId],
    queryFn: () => vehicleService.getVehicles(fleetId),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VehicleInsert) => vehicleService.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({ title: 'Véhicule ajouté' });
    },
  });
}
```

**Conventions** :
- Nommage : `use[Entity]` (ex: `useVehicles`)
- Instances singleton des services/repositories en haut du fichier
- Réexport des types pour compatibilité

### 4. Composants React (`src/components/`, `src/pages/`)

**Responsabilité** : Affichage et interaction utilisateur.

**Caractéristiques** :
- Utilise les hooks React Query
- Pas d'appels directs aux services ou repositories
- Composants fonctionnels uniquement
- Gestion de l'état UI local uniquement

**Interface et thème** : L’UI est pilotée par le **ThemeProvider** (next-themes) pour le mode dark/light et par les **variables CSS** dans `src/index.css` pour les tokens (couleurs, radius). Cette centralisation évite la duplication et le drift visuel ; les composants utilisent uniquement les tokens du design system (primary, accent, success, etc.), pas de couleurs en dur. Les changements liés au thème ou au design system restent strictement en présentation et ne concernent pas les autres couches.

## Entités principales

Les entités suivantes ont des repositories et services implémentés :

1. **Vehicles** (`VehicleRepository`, `VehicleService`)
2. **Fleet Members** (`FleetMemberRepository`, `FleetMemberService`)
3. **Driver Shifts** (`DriverShiftRepository`, `DriverShiftService`)
4. **Incidents** (`IncidentRepository`, `IncidentService`)
5. **Maintenance** (`MaintenanceRepository`, `MaintenanceService`) — inclut preuves et checklist
6. **Invitations** (`InvitationRepository`, `InvitationService`)
7. **Dashboard** (`DashboardRepository`, `DashboardService`) — stats, activité récente, aperçu véhicules
8. **Fleet Report** (`FleetReportRepository`, `FleetReportService`) — rapport de flotte sur une période

## Flux de données

### Lecture de données

```
Composant → Hook (useQuery) → Service → Repository → Supabase
                ↓
         Cache React Query
```

### Écriture de données

```
Composant → Hook (useMutation) → Service → Repository → Supabase
                ↓                                    ↓
         Invalidation cache                    Toast utilisateur
```

## Avantages de cette architecture

1. **Séparation des responsabilités** : Chaque couche a un rôle clair
2. **Testabilité** : Les services peuvent être testés indépendamment
3. **Maintenabilité** : Modifications isolées par couche
4. **Réutilisabilité** : Services utilisables dans différents contextes
5. **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités

## Conventions de nommage

### Repositories
- Fichier : `[entity].repository.ts` (snake_case)
- Classe : `[Entity]Repository` (PascalCase)
- Méthodes : `findAll`, `findById`, `create`, `update`, `delete`

### Services
- Fichier : `[entity].service.ts` (snake_case)
- Classe : `[Entity]Service` (PascalCase)
- Méthodes : `get[Entity]s`, `get[Entity]ById`, `create[Entity]`, `update[Entity]`, `delete[Entity]`

### Hooks
- Fichier : `use[Entity].ts` (camelCase)
- Fonction : `use[Entity]`, `useCreate[Entity]`, `useUpdate[Entity]`, etc.

## Migration progressive

L'architecture a été implémentée progressivement :
1. ✅ Vehicles
2. ✅ Fleet Members
3. ✅ Driver Shifts
4. ✅ Incidents
5. ✅ Maintenance (dont preuves et checklist)
6. ✅ Invitations
7. ✅ Dashboard (useDashboardStats, useRecentActivity, useFleetVehicles)
8. ✅ Fleet Report (useFleetReport)

Les hooks listés ci-dessus appellent uniquement les services. Les hooks d’auth (`useAuth`), storage ou RPC métier peuvent continuer à utiliser le client Supabase lorsque cela est pertinent.

## Bonnes pratiques

1. **Toujours passer par les services** : Les hooks ne doivent jamais appeler directement les repositories
2. **Validation dans les services** : Toute validation métier doit être dans les services
3. **Gestion d'erreurs cohérente** : Les repositories lancent des erreurs, les services les transforment si nécessaire
4. **Types TypeScript** : Utiliser des interfaces/types bien définis pour chaque entité
5. **Documentation** : Commenter les méthodes complexes dans les services

## Tests

- Les repositories peuvent être testés en mockant le client Supabase (`@/integrations/supabase/client`).
- Les services peuvent être testés en injectant des repositories mockés (logique métier isolée).
- Les hooks peuvent être testés en mockant les services ou en tests d’intégration avec React Query (voir `useFleetMembers.test.tsx`, `useInvitations.test.tsx`).
- Placer les tests dans `src/test/` ou à côté des hooks (`.test.ts`, `.test.tsx`).

## Performance et thème (présentation)

- **Premier paint** : Thème sombre dès le premier rendu (script inline + `class="dark"` sur `html` dans `index.html`, ADR 0001) pour éviter FOUC.
- **Switch thème** : Aucune transition sur `html`/`body` pour les couleurs ; si un toggle est réintroduit, utiliser un garde-fou temporaire (voir `src/index.css` et ADR 0001).
- **Layout** : La classe `.dark` ne modifie que des variables CSS de couleurs, pas de dimensions (évite le CLS).
- **Métriques** : Web Vitals (LCP, CLS, INP, FCP) sont reportées via `src/reportWebVitals.ts` (log en dev ; en prod, brancher un endpoint ou GA). TTI se mesure via Lighthouse si besoin.

## Références

- [React Query Documentation](https://tanstack.com/query/latest)
- [Supabase Documentation](https://supabase.com/docs)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
