# Rollout : test interne, Sentry, bugs P0, test fermé

Guide opérationnel pour les phases **test interne (5–10)** puis **test fermé (30–100)**, aligné sur le dépôt Smart Fleet / Flotte E-Samba.

**Prérequis techniques** : voir aussi [`publication-stores.md`](publication-stores.md) (AAB, keystore, secrets GitHub `VITE_*`).

---

## 1. Test interne (5–10 personnes)

### Google Play — piste test interne

- [ ] Keystore de release configuré (`android/keystore.properties`, jamais commité).
- [ ] Incrémenter le build : `npm run mobile:sync-version` (ou `npm run mobile:sync-version -- --build N`).
- [ ] Build avec **variables `VITE_*` de production** : CI [`release-android.yml`](../.github/workflows/release-android.yml) ou build local avec `.env.local` (voir [`publication-stores.md`](publication-stores.md) § secrets release).
- [ ] `npm run mobile:prepare` puis `cd android && ./gradlew bundleRelease` (ou récupérer l’artefact AAB depuis Actions).
- [ ] Play Console → **Test interne** → nouvelle version → importer l’AAB.
- [ ] Ajouter les comptes testeurs (e-mails autorisés).
- [ ] Vérifier les éléments obligatoires Play (fiche, confidentialité, cible API) au minimum pour la piste de test.

### Apple — TestFlight (équipe interne)

- [ ] Même bundle web que pour Android : `npm run mobile:prepare` avec les mêmes `VITE_*` (fichier `.env.local` à la racine du projet).
- [ ] Ouvrir le projet iOS : `npm run cap:open:ios`, schéma **Release**, signature et équipe correctes.
- [ ] **Product → Archive** → upload vers App Store Connect → groupe **Test interne**.

### Vérification post-déploiement

- [ ] Connexion Supabase réelle (pas de placeholder).
- [ ] Au moins un événement de test visible dans Sentry (si `VITE_SENTRY_DSN` est défini) ou confirmation que le DSN est absent volontairement.

---

## 2. Sentry — exploitation pendant la bêta

### Configuration côté application

- Le DSN est injecté au **build** via `VITE_SENTRY_DSN` (voir `.env.example` et workflow release).
- Les versions sont regroupées dans Sentry grâce au champ `release` (dérivé de `VITE_APP_VERSION` dans [`src/instrument.ts`](../src/instrument.ts)).

### À configurer dans l’interface Sentry (projet)

- **Environnements** : filtrer par `capacitor` / `production` selon `import.meta.env.MODE`.
- **Alertes** (recommandé) :
  - Pic du taux d’erreur ou nouvelle issue avec forte régression.
  - Seuil de sessions affectées (selon le forfait Sentry).
- **Revue** : au moins une passe quotidienne pendant la phase test interne.

### Limites (Capacitor)

- `@sentry/react` capture les erreurs **JavaScript dans le WebView**. Les crashs **natifs** Android/iOS ne sont pas couverts sans SDK natif dédié.
- **Complément obligatoire** : **Play Console** (Android vitals, ANR, crashs natifs) et **App Store Connect** / Xcode Organizer pour iOS.

---

## 3. Bugs P0 — définition et boucle

### Critères P0 (bloquant)

- Authentification ou session impossible pour une partie des utilisateurs.
- Crash au démarrage ou écran blanc récurrent sur un parc d’appareils cible.
- Perte ou corruption de données métier.
- Faille de sécurité évidente (exposition de secrets, contournement d’accès).
- Régression bloquant un flux critique validé en prod (ex. création de flotte, mission jour J).

### Processus

1. Une **liste unique** (issues GitHub ou outil équivalent) avec étiquette `P0`.
2. Chaque P0 : reproduit ou tracé (Sentry / logs), correctif, **nouveau build** avec `versionCode` / numéro de build incrémenté.
3. **Critères pour passer au test fermé** (section 4) : aucun P0 ouvert ; taux d’erreurs Sentry et retours internes sous seuil défini par l’équipe ; pas d’ANR/crash natif majeur non expliqué sur la période de observation.

---

## 4. Test fermé (30–100 utilisateurs)

### Google Play — test fermé

- [ ] Nouvelle release (AAB) après stabilisation ; incrémenter version / build.
- [ ] Play Console → **Test fermé** → liste de testeurs ou groupe Google (respecter la limite du type de liste).
- [ ] Communiquer le lien d’adhésion / instructions d’installation et un **canal de feedback** (formulaire, canal chat, e-mail).

### Apple — TestFlight externe

- [ ] Groupe **externe** dans TestFlight, même build ou build ultérieur après revue Apple si nécessaire.

### Critères de montée en charge

- Erreurs JS sous contrôle dans Sentry (pas de régression forte vs. test interne).
- Stabilité backend Supabase observée (latences, quotas).
- Décision produit documentée (date / version).

---

## Références

- [`publication-stores.md`](publication-stores.md) — AAB, keystore, secrets `VITE_*` pour GitHub Actions.
- [`.github/workflows/release-android.yml`](../.github/workflows/release-android.yml) — build AAB signé avec injection des `VITE_*`.
