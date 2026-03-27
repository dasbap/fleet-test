# E-Samba — Démo client 30 minutes (une page)

**Mot de passe démo (tous comptes)** : `Demo2025!` — voir [DEMO-CREDENTIALS.md](../DEMO-CREDENTIALS.md).

**Avant** : URL app ouverte · `http://localhost:8080` · Supabase : **Authentication → Redirect URLs** inclut cette URL · données démo chargées (`create-demo-organization-complete.sql`).

---

## Timing (30 min)

| Min | Segment | Compte | À montrer (ordre des clics) |
|-----|---------|--------|-----------------------------|
| 0–2 | Accueil & login | — | Landing → **Connexion** · message : droits = **adhésions flotte + RLS** (pas le seul menu) |
| 2–12 | Vision organisateur | `demo.organizer@esamba.test` | **Tableau de bord** → **Véhicules** → **Incidents** → **Maintenance** → **Équipes** → **Invitations** → **Rapports** → **Finances** → **Alertes** → **Rôles** · **Paramètres** (aperçu) |
| 12–18 | Opérationnel terrain | `demo.manager1@esamba.test` | Déconnexion → login · **Chauffeurs** · **Encaissements** · comparer avec vue org (pas Finances/Rôles dans le menu) |
| 18–24 | Chauffeur | `demo.driver1@esamba.test` | Déconnexion → **Mon véhicule** · **Clôture** · **Signaler** (incidents) |
| 24–28 | Mécanicien | `demo.mechanic1@esamba.test` | Déconnexion · entrée **Interventions** (maintenance) · **Historique** |
| 28–30 | Clôture | — | Q/R · prochaines étapes · rappel sécurité : comptes `@esamba.test` **uniquement** démo |

---

## Checklist express (cocher)

- [ ] Login OK · pas d’erreur Auth / redirect  
- [ ] Organisateur : au moins 8 écrans du menu parcourus  
- [ ] Gestionnaire : **Chauffeurs** + **Encaissements** vus  
- [ ] Chauffeur : **Mon véhicule** + **Clôture**  
- [ ] Mécanicien : **Maintenance** + **Historique**  
- [ ] Phrase clé dite : **RLS + `flotte_adhesions`** = source de vérité des droits  

---

## Export PDF (une page)

1. Ouvrir ce fichier dans Cursor / VS Code **aperçu Markdown** ou navigateur.  
2. **Imprimer** (Ctrl+P) → **Enregistrer au format PDF** · marge minimale · échelle ~90–100 % pour tenir sur **une page**.  

*Alternative :* `npx md-to-pdf docs/checklist-demo-client-30min.md` (si l’outil est installé dans le projet).
