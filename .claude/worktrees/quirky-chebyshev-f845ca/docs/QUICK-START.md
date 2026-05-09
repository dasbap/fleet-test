# Guide de démarrage rapide - Smart Fleet Africa

## 🚀 Démarrage en 5 minutes

### 1. Démarrer le serveur

```bash
npm run dev
```

Ouvrez http://localhost:8080 dans votre navigateur.

### 2. Exécuter les fonctions RPC dans Supabase

**⚠️ IMPORTANT : Cette étape est obligatoire !**

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. **SQL Editor** → Créez une nouvelle requête
4. Copiez-collez le contenu de `supabase/rpc-missing-functions.sql`
5. Cliquez sur **Run**

### 3. Créer les buckets Storage

1. Dans Supabase Dashboard → **Storage**
2. Créez le bucket `maintenance-evidence` (privé, 10MB)
3. (Optionnel) Créez le bucket `avatars` (public, 5MB)

### 4. Tester l'application

1. Créez un compte
2. Créez une organisation et une flotte
3. Créez un véhicule
4. Testez l'affectation à un chauffeur

---

## ✅ Vérifications rapides

```bash
# Vérifier Supabase
npm run check:supabase

# Vérifier le backend
npm run check:backend
```

Les deux commandes doivent retourner "OK" partout.

---

## 📖 Documentation complète

Consultez `NEXT-STEPS.md` pour un guide détaillé.
