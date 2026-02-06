# 👀 EXAMEN - Vérification : Création de Flotte & Membres

## 📋 Préambule

Avant de démarrer l’examen, vérifiez :

- ✅ L’application tourne (`npm run dev`)
- ✅ Connexion avec un compte utilisateur valide
- ✅ Les fonctions RPC Supabase suivantes sont présentes :
  - `create_esamba_fleet`
  - `upsert_fleet_membership`
  - `add_member_by_email`

---

## 1️⃣ Examen : Création d’une flotte

### Procédure

1. **Lancer la console développeur**
   - `F12` ou `Ctrl+Shift+I`
   - Onglet "Console"

2. **Accéder à la page de création**
   - `http://localhost:8080/dashboard/create-fleet`
   - Ou bouton « Créer une flotte » via la page Équipes

3. **Renseigner le formulaire**
   - Organisation : `Test Organisation`
   - Code pays : `CM`
   - Nom flotte : `Flotte Test`
   - Politique collecte : `Mixte`

4. **Soumettre la création**
   - Cliquer sur "Créer la flotte"
   - Vérifier l’affichage de logs dans la console

### Attendus

**Dans la console :**
```
Memberships rafraîchis avec succès
```

**Dans l’interface :**
- ✅ Notification : « Flotte créée avec succès »
- ✅ Redirection vers `/dashboard`
- ✅ La flotte « Flotte Test » apparaît immédiatement
- ✅ Vous êtes automatiquement « Organisateur »

**Contrôles complémentaires :**
- Visitez `/dashboard/teams`, votre nom et rôle doivent être visibles

### Problèmes fréquents

- **Pas de nouvelle flotte** : consulter la console pour erreurs, vérifier les RPC Supabase, valider la connexion utilisateur
- **Erreur dans la console** : copier le message ; inspecter la RLS sur Supabase

---

## 2️⃣ Examen : Ajout d’un membre

### Prérequis

- ✅ Avoir créé une flotte (cf. examen 1)
- ✅ Créer un second utilisateur dans Supabase Auth
- ✅ Connaître l’email de cet utilisateur

### Procédure

1. **Console développeur**
   - `F12`, onglet "Console"

2. **Page Équipes**
   - Aller sur : `http://localhost:8080/dashboard/teams`
   - Ou menu « Équipes »

3. **Ajout**
   - Bouton "Ajouter un membre"
   - Email : un email existant (`test@example.com`)
   - Rôle : par exemple « Chauffeur »
   - Soumettre

4. **Vérification logs**
   - Les logs suivants doivent apparaître :
     ```
     Tentative d'ajout de membre: { fleetId: "...", email: "test@example.com", role: "driver" }
     Résultat de add_member_by_email: { membershipId: "...", error: null }
     Membre ajouté avec succès, membershipId: "..."
     ```

### Attendus

- ✅ Logs complets visibles
- ✅ UUID de membership retourné, aucune erreur
- ✅ Toast : « Membre ajouté »
- ✅ Nouveau membre dans la liste, rôle visible, date affichée

### Problèmes classiques & solutions

- **Aucun utilisateur trouvé** :
  - Créez l’utilisateur dans Auth (inscription normale)
- **Pas les droits nécessaires** :
  - Vérifiez votre rôle. Si vous venez de créer la flotte, vous êtes bien organizer.
- **Flotte introuvable** :
  - Rafraîchissez, vérifiez la validité de `fleetId` et la présence de la flotte
- **Membre non visible** :
  - Rafraîchissement manuel (F5) ; sinon vérification directe dans Supabase :

```sql
SELECT * FROM fleet_memberships WHERE fleet_id = 'VOTRE_FLEET_ID' ORDER BY created_at DESC;
```

---

## 🔎 Examens complémentaires via Supabase (SQL)

- **Lister les flottes :**
```sql
SELECT id, name, org_id, collection_policy, created_at FROM fleets ORDER BY created_at DESC;
```

- **Lister les membres d’une flotte :**
```sql
SELECT fm.id, fm.role, fm.is_active, f.name as fleet_name, u.email, p.full_name
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
LEFT JOIN auth.users u ON u.id = fm.user_id
LEFT JOIN profiles p ON p.user_id = fm.user_id
WHERE f.name = 'Flotte Test'
ORDER BY fm.created_at DESC;
```

- **Présence des fonctions RPC :**
```sql
SELECT proname as function_name, proargnames as parameters
FROM pg_proc
WHERE proname IN ('create_esamba_fleet','upsert_fleet_membership','add_member_by_email')
ORDER BY proname;
```

---

## ☑️ Checklist d’examen

### Création de flotte

- [ ] Formulaire visible
- [ ] Validation OK
- [ ] Pas d’erreur à la soumission
- [ ] Notification succès visible
- [ ] Redirection effective
- [ ] Nouvelle flotte listée
- [ ] Vous = organizer
- [ ] Pas d’erreur console

### Ajout membre

- [ ] Bouton visible
- [ ] Dialogue ouverture OK
- [ ] Validation email/role OK
- [ ] Ajout fonctionne avec email valide
- [ ] Notification succès affichée
- [ ] Membre listé, bon rôle, date OK
- [ ] Pas d’erreur console
- [ ] Erreur affichée si email inconnu
- [ ] Erreur affichée si droit manquant

### Gestion des rôles

- [ ] Menu « ⋯ » visible
- [ ] Changement de rôle effectif
- [ ] Toast confirmation
- [ ] Rôle mis à jour à l’écran
- [ ] Retrait de membre fonctionne
- [ ] Confirmation affichée avant suppression

---

## 🪛 Outils pour traces & débogage

- Utiliser la console navigateur (logs, warnings, errors)
- Consulter les logs Postgres/Supabase

### Scripts utiles (console navigateur) :

```javascript
// Vérifier l’état d’authentification (console navigateur)
const { data } = await supabase.auth.getUser();
console.log("User:", data.user);

// Voir vos memberships
const { data: memberships } = await supabase
  .from('fleet_memberships')
  .select('*')
  .eq('user_id', data.user.id);
console.log("Memberships:", memberships);

// Voir une flotte précise
const { data: fleet } = await supabase
  .from('fleets')
  .select('*')
  .eq('id', 'VOTRE_FLEET_ID');
console.log("Fleet:", fleet);
```

---

## 🎯 Résultat attendu après examen

1. ✅ Flotte créée
2. ✅ Vous = organizer sur la flotte testée
3. ✅ Un membre ajouté avec succès
4. ✅ Le membre s’affiche instantanément
5. ✅ Modification du rôle possible
6. ✅ Suppression de membre réalisable et confirmée

---

## ℹ️ Remarques

- Tous les messages d’erreur doivent être en français
- Les notifications et toasts utilisent le système shadcn/ui
- Logs de debug actifs en dev, à désactiver pour la prod

---

**Dernière révision : 2024** 
