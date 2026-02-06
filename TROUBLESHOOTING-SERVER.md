# Dépannage du serveur de développement

## Problème : Le serveur n'est pas accessible sur http://localhost:8080

### Solutions

#### 1. Vérifier que le serveur tourne

```bash
# Vérifier le port 8080
netstat -ano | findstr :8080

# Vérifier les processus Node
Get-Process -Name node
```

#### 2. Arrêter et redémarrer le serveur

```bash
# Arrêter tous les processus Node (attention : arrête tous les processus Node)
Get-Process -Name node | Stop-Process -Force

# Redémarrer le serveur
npm run dev
```

#### 3. Vérifier la configuration

Le fichier `vite.config.ts` doit avoir :
```typescript
server: {
  host: "localhost",
  port: 8080,
  strictPort: false,
}
```

#### 4. Vérifier qu'aucun autre service n'utilise le port 8080

```bash
# Voir ce qui utilise le port 8080
netstat -ano | findstr :8080
```

Si un autre processus utilise le port, vous pouvez :
- Arrêter ce processus
- Ou changer le port dans `vite.config.ts`

#### 5. Changer le port si nécessaire

Si le port 8080 est occupé, modifiez `vite.config.ts` :

```typescript
server: {
  host: "localhost",
  port: 3000,  // Changez le port ici
  strictPort: false,
}
```

Puis redémarrez le serveur.

#### 6. Vérifier les erreurs dans la console

Lancez le serveur en mode non-background pour voir les erreurs :

```bash
npm run dev
```

Recherchez les erreurs comme :
- Port déjà utilisé
- Erreurs de compilation
- Problèmes de dépendances

#### 7. Vérifier les variables d'environnement

Assurez-vous que `.env.local` existe et contient :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

#### 8. Nettoyer et réinstaller

Si rien ne fonctionne :

```bash
# Nettoyer
rm -rf node_modules
rm package-lock.json

# Réinstaller
npm install

# Redémarrer
npm run dev
```

---

## URLs alternatives à essayer

Si `http://localhost:8080` ne fonctionne pas, essayez :

- `http://127.0.0.1:8080`
- `http://[::1]:8080` (IPv6)

---

## Vérification finale

Une fois le serveur démarré, vous devriez voir dans la console :

```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

Si vous voyez ce message, le serveur fonctionne correctement.
