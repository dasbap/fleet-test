import { LegalLayout, LegalSection } from "@/components/landing/LegalLayout";

const MAJ = "29 mai 2026";

/**
 * Politique de confidentialité E-Samba — version complète
 *
 * Cadre légal :
 *   - Loi camerounaise n° 2010/012 du 21 décembre 2010 (cybersécurité / données)
 *   - Loi n° 2010/021 du 21 décembre 2010 (commerce électronique)
 *   - Règlement CEMAC n° 01/03/CEMAC/UMAC/CM (systèmes de paiement)
 *   - RGPD – UE 2016/679 (données traitées via sous-traitants européens)
 */
export default function ConfidentialitePage() {
  return (
    <LegalLayout
      titre="Politique de confidentialité"
      sousTitre="Comment E-Samba collecte, utilise et protège vos données personnelles"
      miseAJour={MAJ}
    >
      {/* ── Sommaire ───────────────────────────────────────────────────────── */}
      <nav
        aria-label="Sommaire"
        className="rounded-xl border border-border bg-muted/30 p-5 text-sm"
      >
        <p className="font-semibold text-foreground mb-3">Sommaire</p>
        <ol className="space-y-1 list-decimal list-inside text-muted-foreground">
          {[
            "Identité du responsable de traitement",
            "Données collectées",
            "Finalités des traitements",
            "Bases légales",
            "Géolocalisation GPS",
            "Paiements — NotchPay, Orange Money, MTN MoMo",
            "Infrastructure et hébergement",
            "Sous-traitants",
            "Durées de conservation",
            "Sécurité des données",
            "Vos droits",
            "Procédure d'exercice des droits",
            "Cookies et technologies similaires",
            "Transferts internationaux",
            "Protection des mineurs",
            "Modifications de la politique",
            "Contact",
            "FAQ juridique",
          ].map((item, i) => (
            <li key={item}>
              <span className="hover:text-primary cursor-pointer">{item}</span>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── 1. Responsable de traitement ───────────────────────────────────── */}
      <LegalSection titre="1. Identité du responsable de traitement">
        <p>
          <strong className="text-foreground">E-Samba</strong> (ci-après
          «&nbsp;E-Samba&nbsp;», «&nbsp;la Société&nbsp;» ou «&nbsp;nous&nbsp;»),
          société de droit camerounais enregistrée au Registre du Commerce et du
          Crédit Mobilier (RCCM) de Douala sous le numéro{" "}
          <strong className="text-foreground">RC/Y/2024/P/107816791685</strong>,
          dont le siège social est situé à{" "}
          <strong className="text-foreground">Douala, Cameroun</strong>, est le
          responsable du traitement de vos données à caractère personnel
          collectées via la plateforme E-Samba (
          <a href="https://www.e-samba.com" className="text-primary hover:underline">
            www.e-samba.com
          </a>
          ) et ses applications mobiles associées.
        </p>
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1">
          <p>
            <strong className="text-foreground">Délégué à la protection des données (DPO) :</strong>
          </p>
          <p>
            E-Samba — Protection des données personnelles
            <br />
            Douala, Cameroun
            <br />
            Email :{" "}
            <a href="mailto:privacy@e-samba.com" className="text-primary hover:underline">
              privacy@e-samba.com
            </a>
            <br />
            Réponse garantie sous <strong className="text-foreground">30 jours ouvrables</strong>.
          </p>
        </div>
      </LegalSection>

      {/* ── 2. Données collectées ──────────────────────────────────────────── */}
      <LegalSection titre="2. Données collectées">
        <p>
          E-Samba collecte uniquement les données strictement nécessaires à la
          fourniture du service de gestion de flotte. Voici un recensement
          exhaustif par catégorie.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.1 Données d'identification et de compte</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nom et prénom</li>
          <li>Adresse e-mail professionnelle</li>
          <li>Numéro de téléphone (utilisé pour l'OTP et WhatsApp Business)</li>
          <li>Rôle au sein de la flotte (organisateur, gestionnaire, chauffeur, mécanicien)</li>
          <li>Photo de profil (optionnelle, stockée Supabase Storage)</li>
          <li>Préférences de langue et de notification</li>
          <li>Date et heure de création du compte</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.2 Données d'organisation et de flotte</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nom de la société / organisation</li>
          <li>Pays et ville de domiciliation</li>
          <li>Nom(s) de flotte(s)</li>
          <li>Plan d'abonnement souscrit</li>
          <li>Structure des rôles et permissions RBAC (contrôle d'accès par rôle)</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.3 Données véhicules</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Numéro d'immatriculation</li>
          <li>Marque, modèle, année, couleur</li>
          <li>Kilométrage courant et historique</li>
          <li>Statut opérationnel (actif, en maintenance, suspendu)</li>
          <li>Documents administratifs : assurance, visite technique, carte grise (dates d'expiration)</li>
          <li>Code QR unique lié au véhicule (identifiant interne, non nominatif)</li>
          <li>Historique complet des interventions de maintenance (DVIR, ordres de travail)</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.4 Données conducteurs</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Identité (nom, prénom, téléphone)</li>
          <li>Affectations véhicule (historique des créneaux d'exploitation)</li>
          <li>Kilométrages déclarés (début et fin de créneau)</li>
          <li>Recettes déclarées et preuves de reversement (captures Mobile Money)</li>
          <li>Contrôles DVIR (Daily Vehicle Inspection Reports) pré et post-trajet</li>
          <li>Incidents déclarés (description, géolocalisation si disponible, photos)</li>
          <li>Score de performance conducteur (calculé automatiquement sur critères DVIR, ponctualité, incidents)</li>
          <li>Observations et notes du gestionnaire</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.5 Données de géolocalisation</h3>
        <p>
          Voir la{" "}
          <strong className="text-foreground">Section 5</strong> dédiée pour le
          détail complet de ces traitements.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Coordonnées GPS des véhicules (latitude / longitude)</li>
          <li>Historique de trajets (si module GPS activé)</li>
          <li>Événements géographiques (entrée / sortie de zone — géofencing)</li>
          <li>Horodatages des positions</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.6 Données financières et de facturation</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Historique des transactions d'abonnement (montant, date, référence NotchPay)</li>
          <li>Statut de l'abonnement (actif, en période de grâce, suspendu)</li>
          <li>Numéro de téléphone Mobile Money associé à la transaction (transmis par NotchPay)</li>
          <li>
            <strong className="text-foreground">Nous ne stockons pas</strong> les
            numéros complets de carte bancaire, les codes PIN, ni les mots de passe
            de services financiers.
          </li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.7 Données techniques et de navigation</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Adresse IP (anonymisée après 30 jours)</li>
          <li>Type de navigateur et version</li>
          <li>Système d'exploitation et type de terminal (mobile / desktop)</li>
          <li>Pages visitées et durée de session</li>
          <li>Logs d'erreurs applicatifs (Sentry — anonymisés)</li>
          <li>Journaux d'audit des actions sensibles (accès, modifications, suppressions)</li>
          <li>Tokens de session et identifiants de connexion (non permanents)</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.8 Données de support</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tickets de support soumis via la plateforme</li>
          <li>Échanges via WhatsApp Business (+237 641 341 857)</li>
          <li>Demandes de rappel téléphonique</li>
          <li>Captures d'écran ou fichiers transmis lors d'un incident</li>
        </ul>
      </LegalSection>

      {/* ── 3. Finalités ──────────────────────────────────────────────────── */}
      <LegalSection titre="3. Finalités des traitements">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Finalité</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Description</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Base légale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Fourniture du service", "Création de compte, gestion de flotte, suivi véhicules, conducteurs, maintenance", "Contrat"],
                ["Authentification", "Connexion par e-mail, OTP SMS, lien magique, biométrie (mobile)", "Contrat"],
                ["Géolocalisation", "Suivi GPS des véhicules pour l'optimisation opérationnelle", "Contrat / Consentement"],
                ["Facturation", "Traitement des paiements d'abonnement via NotchPay", "Contrat / Obligation légale"],
                ["Sécurité et fraude", "Détection d'anomalies, journaux d'audit, protection des accès", "Intérêt légitime"],
                ["Maintenance & performance", "Monitoring technique, débogage, optimisation des temps de réponse", "Intérêt légitime"],
                ["Notifications", "Alertes opérationnelles SMS, WhatsApp, push — événements flotte", "Contrat / Consentement"],
                ["Support client", "Traitement des tickets, assistance, rappels téléphoniques", "Contrat"],
                ["Statistiques internes", "Analyse agrégée et anonymisée des usages produit (PostHog)", "Intérêt légitime"],
                ["Conformité légale", "Conservation des données comptables, réponse aux autorités", "Obligation légale"],
              ].map(([f, d, b]) => (
                <tr key={f} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{f}</td>
                  <td className="px-3 py-2">{d}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      {/* ── 4. Bases légales ──────────────────────────────────────────────── */}
      <LegalSection titre="4. Bases légales">
        <p>Chaque traitement repose sur l'une des bases légales suivantes :</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-foreground">Exécution du contrat</strong> : les
            traitements nécessaires à la fourniture du service E-Samba (gestion de
            flotte, authentification, facturation). Sans ces données, le service ne
            peut être rendu.
          </li>
          <li>
            <strong className="text-foreground">Consentement explicite</strong> : la
            géolocalisation en temps réel, les notifications marketing. Le
            consentement peut être retiré à tout moment depuis vos paramètres.
          </li>
          <li>
            <strong className="text-foreground">Obligation légale</strong> : conservation
            des données comptables (10 ans — OHADA), réponse aux réquisitions
            judiciaires ou réglementaires (ANTIC, autorités CEMAC).
          </li>
          <li>
            <strong className="text-foreground">Intérêt légitime</strong> : sécurité
            informatique, prévention de la fraude, amélioration du service, analytics
            anonymisés. Cet intérêt ne prime jamais sur vos droits fondamentaux.
          </li>
        </ul>
        <p>
          Le cadre légal applicable est la{" "}
          <strong className="text-foreground">Loi n° 2010/012</strong> du 21
          décembre 2010 relative à la cybersécurité et à la cybercriminalité
          (Articles 74–91 sur la protection des données), complétée par le{" "}
          <strong className="text-foreground">RGPD UE 2016/679</strong> pour les
          données transitant par nos sous-traitants européens.
        </p>
      </LegalSection>

      {/* ── 5. Géolocalisation ────────────────────────────────────────────── */}
      <LegalSection titre="5. Géolocalisation GPS">
        <p>
          E-Samba propose un module optionnel de géolocalisation des véhicules.
          Cette section explique précisément les conditions de ce traitement.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">5.1 Pourquoi la position est-elle collectée ?</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Suivi en temps réel de la position des véhicules de la flotte</li>
          <li>Détection d'entrée / sortie de zones géographiques (géofencing)</li>
          <li>Calcul automatique des kilométrages parcourus</li>
          <li>Génération d'alertes opérationnelles (sortie de corridor, arrêt prolongé)</li>
          <li>Reconstitution d'itinéraires en cas d'incident</li>
          <li>Optimisation des tournées et affectations</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">5.2 Qui collecte les données de position ?</h3>
        <p>
          La position est collectée par le boîtier GPS installé dans le véhicule
          (matériel tiers non fourni par E-Samba) ou, si autorisée, par
          l'application mobile du chauffeur. E-Samba reçoit et stocke les
          coordonnées transmises.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">5.3 Fréquence de collecte</h3>
        <p>
          La fréquence dépend de la configuration choisie par l'organisateur de la
          flotte : de 30 secondes à 5 minutes en mode actif, aucune collecte
          lorsque le module est désactivé.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">5.4 Durée de conservation des données GPS</h3>
        <p>
          Les données GPS brutes sont conservées{" "}
          <strong className="text-foreground">12 mois glissants</strong>. Les
          données agrégées (kilométrage total, rapports de tournées) peuvent être
          conservées pendant toute la durée de l'abonnement.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">5.5 Qui a accès aux données GPS ?</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-foreground">Organisateurs</strong> : accès
            complet à toutes les positions de la flotte
          </li>
          <li>
            <strong className="text-foreground">Gestionnaires</strong> : accès aux
            véhicules de leur périmètre
          </li>
          <li>
            <strong className="text-foreground">Chauffeurs</strong> : accès à leur
            propre historique uniquement
          </li>
          <li>
            <strong className="text-foreground">Mécaniciens</strong> : aucun accès
            aux données GPS
          </li>
          <li>
            <strong className="text-foreground">E-Samba</strong> : accès technique
            limité à des fins de support et de sécurité, soumis à journalisation
            d'audit
          </li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">5.6 Droits des conducteurs</h3>
        <p>
          Un conducteur peut, depuis ses paramètres de compte, consulter
          l'historique de ses propres positions. Il peut demander la suppression
          de ses données GPS personnelles (positions hors créneaux actifs) via{" "}
          <a href="mailto:privacy@e-samba.com" className="text-primary hover:underline">
            privacy@e-samba.com
          </a>
          . La collecte GPS pendant un créneau d'exploitation actif est nécessaire
          à l'exécution du contrat de service.
        </p>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-4 mt-3">
          <p className="text-amber-800 dark:text-amber-300 text-xs font-medium">
            ⚠️ Information importante pour les employeurs
          </p>
          <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
            La géolocalisation permanente d'un salarié en dehors des heures de
            travail est interdite. E-Samba recommande de configurer le module GPS
            pour qu'il soit actif uniquement pendant les créneaux d'exploitation
            déclarés. L'employeur est responsable du respect de cette obligation.
          </p>
        </div>
      </LegalSection>

      {/* ── 6. Paiements ──────────────────────────────────────────────────── */}
      <LegalSection titre="6. Paiements — NotchPay, Orange Money, MTN MoMo">
        <p>
          E-Samba confie l'intégralité du traitement des paiements à des
          prestataires certifiés. E-Samba n'est pas un établissement de paiement
          et ne traite pas directement les données bancaires ou Mobile Money
          sensibles.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">6.1 NotchPay</h3>
        <p>
          <strong className="text-foreground">NotchPay</strong> (prestataire de
          paiement panafricain, certifié PCI-DSS) est notre partenaire de
          collecte. Les paiements Orange Money et MTN Mobile Money sont traités
          via l'API NotchPay. La politique de confidentialité de NotchPay est
          consultable sur{" "}
          <a
            href="https://notchpay.co"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            notchpay.co
          </a>
          .
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">6.2 Ce qu'E-Samba stocke</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Référence unique de transaction (ID NotchPay)</li>
          <li>Montant et devise (XAF)</li>
          <li>Date et heure de la transaction</li>
          <li>Statut du paiement (succès, échec, remboursé)</li>
          <li>Les 4 derniers chiffres du numéro Mobile Money (fournis par NotchPay, à des fins de justificatif)</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">6.3 Ce qu'E-Samba ne stocke jamais</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Numéro complet de téléphone Mobile Money</li>
          <li>Codes PIN de validation</li>
          <li>Numéros complets de carte bancaire (PAN)</li>
          <li>Mots de passe de services financiers</li>
          <li>Données biométriques liées aux paiements</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">6.4 Remboursements</h3>
        <p>
          Les demandes de remboursement sont traitées via NotchPay. E-Samba
          dispose d'un délai de traitement de 5 jours ouvrables. Les données du
          remboursement sont conservées 10 ans conformément à l'OHADA.
        </p>
      </LegalSection>

      {/* ── 7. Infrastructure ─────────────────────────────────────────────── */}
      <LegalSection titre="7. Infrastructure et hébergement">
        <h3 className="font-semibold text-foreground mt-2 mb-2">7.1 Supabase</h3>
        <p>
          La base de données PostgreSQL, l'authentification, le stockage des
          fichiers (photos, documents) et les fonctions edge sont hébergés sur{" "}
          <strong className="text-foreground">Supabase Inc.</strong> Les données
          sont stockées dans la région{" "}
          <strong className="text-foreground">Europe Ouest (Francfort, Allemagne)</strong>,
          soumises au RGPD. Supabase est signataire des Clauses Contractuelles
          Types (CCT) de la Commission européenne.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">7.2 Vercel</h3>
        <p>
          L'application web E-Samba est déployée sur{" "}
          <strong className="text-foreground">Vercel Inc.</strong> Le réseau Edge
          de Vercel distribue l'application mondialement pour des performances
          optimales sur les connexions 2G/3G africaines. Les données en transit
          sont chiffrées TLS 1.3. Vercel est certifié SOC 2 Type II.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">7.3 Stockage cloud</h3>
        <p>
          Les fichiers utilisateurs (photos de profil, preuves de reversement,
          photos d'incidents, tutoriels) sont stockés dans{" "}
          <strong className="text-foreground">Supabase Storage</strong> (Object
          Storage compatible S3, région Francfort). L'accès est contrôlé par des
          politiques RLS (Row Level Security) et des URLs signées à durée limitée.
        </p>
      </LegalSection>

      {/* ── 8. Sous-traitants ─────────────────────────────────────────────── */}
      <LegalSection titre="8. Sous-traitants">
        <p>
          E-Samba fait appel aux sous-traitants ci-dessous. Aucune donnée n'est
          vendue à des tiers. Aucune utilisation à des fins publicitaires.
        </p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Service</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Finalité</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Pays</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Garanties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Supabase Inc.", "Base de données, authentification, stockage fichiers, edge functions", "États-Unis / UE (Francfort)", "CCT — RGPD compliant"],
                ["Vercel Inc.", "Hébergement application web, réseau Edge", "États-Unis / Monde", "SOC 2 Type II — CCT"],
                ["NotchPay", "Traitement paiements Mobile Money (Orange, MTN)", "Cameroun / Afrique", "PCI-DSS, réglementation BEAC"],
                ["WhatsApp Business (Meta)", "Notifications opérationnelles, support client", "États-Unis", "CCT — DPA signé"],
                ["Mapbox / Google Maps", "Cartographie, affichage des trajets GPS", "États-Unis", "CCT — Données anonymisées"],
                ["PostHog Inc.", "Analytics produit anonymisé (pas de données personnelles)", "UE (Amsterdam)", "RGPD — Serveur EU"],
                ["Sentry Inc.", "Journalisation erreurs applicatifs (anonymisé)", "UE", "RGPD — Données anonymisées"],
              ].map(([s, f, p, g]) => (
                <tr key={s} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">{s}</td>
                  <td className="px-3 py-2">{f}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{g}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      {/* ── 9. Durées de conservation ─────────────────────────────────────── */}
      <LegalSection titre="9. Durées de conservation">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Catégorie de données</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Durée</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Compte utilisateur actif", "Durée de l'abonnement", "Nécessaire à l'exécution du contrat"],
                ["Compte résilié", "3 ans après résiliation", "Prescription commerciale OHADA"],
                ["Données GPS brutes", "12 mois glissants", "Proportionnalité — usage opérationnel"],
                ["Trajets agrégés (rapports)", "Durée abonnement + 3 ans", "Obligations de compte rendu employeur"],
                ["Données DVIR / maintenance", "5 ans", "Prescription responsabilité civile"],
                ["Transactions de paiement", "10 ans", "OHADA — Acte Uniforme Droit Comptable"],
                ["Logs d'audit sécurité", "12 mois", "Détection incidents, obligations ANTIC"],
                ["Logs techniques (erreurs)", "90 jours", "Débogage opérationnel"],
                ["Adresses IP", "30 jours (puis anonymisées)", "Sécurité réseau"],
                ["Tickets de support", "3 ans après clôture", "Preuve contractuelle"],
                ["Échanges WhatsApp Business", "12 mois", "Historique support"],
                ["Cookies analytiques", "13 mois", "Recommandation CNIL"],
                ["Tokens de session", "Durée de session active", "Sécurité authentification"],
              ].map(([c, d, j]) => (
                <tr key={c} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">{c}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{d}</td>
                  <td className="px-3 py-2">{j}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      {/* ── 10. Sécurité ──────────────────────────────────────────────────── */}
      <LegalSection titre="10. Sécurité des données">
        <p>
          E-Samba met en œuvre les mesures techniques et organisationnelles
          suivantes, conformément à l'état de l'art et aux exigences de l'Article
          32 du RGPD.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.1 Chiffrement</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-foreground">En transit</strong> : protocole TLS 1.3
            obligatoire sur toutes les connexions (HTTPS strict, HSTS activé)
          </li>
          <li>
            <strong className="text-foreground">Au repos</strong> : chiffrement AES-256
            de la base de données PostgreSQL (Supabase, disques chiffrés AWS)
          </li>
          <li>
            <strong className="text-foreground">Fichiers</strong> : Supabase Storage avec
            chiffrement côté serveur, URLs signées à durée limitée
          </li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.2 Authentification</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>E-mail + mot de passe (haché bcrypt côté Supabase)</li>
          <li>OTP SMS à usage unique, validité 60 secondes</li>
          <li>Lien magique (magic link) à usage unique, validité 15 minutes</li>
          <li>Authentification biométrique Face ID / empreinte (application mobile)</li>
          <li>Authentification à deux facteurs (2FA) disponible pour tous les comptes</li>
          <li>Détection des connexions inhabituelles avec alerte automatique</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.3 Contrôle d'accès (RBAC)</h3>
        <p>
          E-Samba applique un modèle de contrôle d'accès basé sur les rôles
          (RBAC — Role-Based Access Control). Chaque rôle (organisateur,
          gestionnaire, chauffeur, mécanicien) dispose d'un périmètre de
          permissions strictement défini. L'isolation multi-tenant est assurée
          par des politiques{" "}
          <strong className="text-foreground">Row Level Security (RLS)</strong>{" "}
          au niveau de la base de données PostgreSQL : aucun utilisateur ne peut
          accéder aux données d'une autre organisation.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.4 Journaux d'audit</h3>
        <p>
          Toutes les actions sensibles (modification de rôle, suppression de
          données, accès aux données d'un autre utilisateur par un administrateur,
          modification de paramètres de sécurité) sont enregistrées dans un
          journal d'audit horodaté et immuable. Ces logs sont conservés 12 mois
          et accessibles aux organisateurs de flotte.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.5 Sauvegardes</h3>
        <p>
          Supabase effectue des sauvegardes automatiques quotidiennes de la base
          de données avec rétention sur 7 jours (plan standard) ou 30 jours (plan
          Enterprise). Les sauvegardes sont chiffrées et stockées dans une région
          géographiquement distincte.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.6 Réponse aux incidents</h3>
        <p>
          En cas de violation de données à caractère personnel susceptible
          d'engendrer un risque pour vos droits et libertés, E-Samba s'engage à
          vous notifier dans un délai de{" "}
          <strong className="text-foreground">72 heures</strong> après avoir eu
          connaissance de l'incident, conformément à l'Article 33 du RGPD.
        </p>

        <p>
          Consultez notre{" "}
          <a href="/securite" className="text-primary hover:underline">
            page Sécurité
          </a>{" "}
          pour le détail de notre politique de divulgation responsable.
        </p>
      </LegalSection>

      {/* ── 11. Droits ────────────────────────────────────────────────────── */}
      <LegalSection titre="11. Vos droits">
        <p>
          Conformément à la Loi n° 2010/012 (Articles 79–85) et au RGPD
          (Articles 15–22), vous disposez des droits suivants :
        </p>
        <div className="space-y-3 mt-2">
          {[
            ["📋 Droit d'accès", "Obtenir une copie de toutes les données personnelles que nous détenons sur vous, dans un format lisible, dans un délai de 30 jours."],
            ["✏️ Droit de rectification", "Corriger des données inexactes ou incomplètes vous concernant. Vous pouvez mettre à jour directement vos informations depuis vos paramètres de compte."],
            ["🗑️ Droit à l'effacement (« droit à l'oubli »)", "Demander la suppression de vos données, sauf si leur conservation est requise par une obligation légale (ex. : données comptables 10 ans OHADA)."],
            ["🚫 Droit d'opposition", "Vous opposer à un traitement reposant sur notre intérêt légitime (ex. : analytics produit). Ce droit ne s'applique pas aux traitements nécessaires à l'exécution du contrat."],
            ["📦 Droit à la portabilité", "Recevoir vos données dans un format structuré, courant et lisible par machine (JSON ou CSV). Applicable aux données que vous avez fournies activement."],
            ["⏸️ Droit à la limitation", "Restreindre temporairement un traitement pendant l'examen d'une contestation ou d'une opposition."],
            ["🔔 Droit de retirer votre consentement", "Retirer à tout moment votre consentement à la géolocalisation ou aux notifications marketing, sans que cela remette en cause la licéité des traitements antérieurs."],
          ].map(([right, desc]) => (
            <div key={right} className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="font-medium text-foreground text-xs">{right}</p>
              <p className="text-xs mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </LegalSection>

      {/* ── 12. Procédure ─────────────────────────────────────────────────── */}
      <LegalSection titre="12. Procédure d'exercice des droits">
        <h3 className="font-semibold text-foreground mt-2 mb-2">12.1 Voie rapide (depuis l'application)</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Connectez-vous à votre compte E-Samba</li>
          <li>Accédez à <strong className="text-foreground">Paramètres → Mon compte</strong></li>
          <li>Utilisez les options de modification ou de suppression disponibles</li>
        </ol>
        <p className="mt-2">Pour la suppression complète du compte : <strong className="text-foreground">Paramètres → Sécurité → Supprimer mon compte</strong>. La suppression est effective sous 30 jours (certaines données comptables peuvent être conservées conformément à l'OHADA).</p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">12.2 Voie formelle (par e-mail)</h3>
        <p>Envoyez votre demande à{" "}
          <a href="mailto:privacy@e-samba.com" className="text-primary hover:underline">
            privacy@e-samba.com
          </a>{" "}
          en indiquant :
        </p>
        <ol className="list-decimal pl-5 space-y-1 mt-2">
          <li>L'objet de votre demande (accès / rectification / suppression / opposition / portabilité)</li>
          <li>Votre adresse e-mail E-Samba</li>
          <li>Une copie d'un document d'identité valide (CNI, passeport)</li>
        </ol>
        <p className="mt-2">
          <strong className="text-foreground">Délai de réponse :</strong> 30 jours
          calendaires à compter de la réception. En cas de demande complexe, ce
          délai peut être prolongé de 60 jours supplémentaires avec notification.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">12.3 Réclamation auprès des autorités</h3>
        <p>
          Si vous estimez que vos droits n'ont pas été respectés, vous pouvez
          saisir :
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong className="text-foreground">Au Cameroun :</strong> l'Agence
            Nationale des Technologies de l'Information et de la Communication
            (ANTIC) — Avenue Rosa Parks, Yaoundé — Tél. +237 222 200 700 —{" "}
            <a href="https://www.antic.cm" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              antic.cm
            </a>
          </li>
          <li>
            <strong className="text-foreground">En Europe (si concerné) :</strong> l'autorité
            de contrôle compétente de votre pays de résidence (ex. : CNIL en
            France — cnil.fr).
          </li>
        </ul>
      </LegalSection>

      {/* ── 13. Cookies ───────────────────────────────────────────────────── */}
      <LegalSection titre="13. Cookies et technologies similaires">
        <p>
          E-Samba utilise des cookies et technologies similaires sur son site et
          dans son application.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">13.1 Cookies strictement nécessaires</h3>
        <p>
          Ces cookies sont indispensables au fonctionnement du service. Ils ne
          peuvent pas être désactivés sans empêcher l'accès à E-Samba.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Token de session d'authentification Supabase (durée : session)</li>
          <li>Token de rafraîchissement sécurisé (durée : 7 jours)</li>
          <li>Préférence de langue et thème (durée : 1 an)</li>
          <li>Protection CSRF (durée : session)</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">13.2 Cookies analytiques (opt-in)</h3>
        <p>
          Avec votre consentement, nous utilisons{" "}
          <strong className="text-foreground">PostHog</strong> (serveur UE) pour
          mesurer l'usage du produit de façon agrégée et anonymisée. Aucune donnée
          personnelle identifiante n'est transmise à PostHog.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">13.3 Ce que nous n'utilisons pas</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cookies publicitaires (aucune régie publicitaire)</li>
          <li>Pixels de tracking tiers (Meta Pixel, Google Ads, etc.)</li>
          <li>Cookies de profilage comportemental à des fins commerciales</li>
        </ul>

        <p className="mt-3">
          Consultez notre{" "}
          <a href="/cookies" className="text-primary hover:underline">
            Politique de cookies complète
          </a>{" "}
          pour gérer vos préférences.
        </p>
      </LegalSection>

      {/* ── 14. Transferts internationaux ─────────────────────────────────── */}
      <LegalSection titre="14. Transferts internationaux de données">
        <p>
          Certains de nos sous-traitants sont établis en dehors du Cameroun et de
          l'espace CEMAC. Ces transferts sont encadrés par les garanties suivantes :
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            <strong className="text-foreground">Vers l'Union européenne</strong> :
            les données hébergées sur Supabase (Francfort) bénéficient du niveau
            de protection le plus élevé au monde (RGPD).
          </li>
          <li>
            <strong className="text-foreground">Vers les États-Unis</strong> :
            Vercel et Supabase sont soumis aux Clauses Contractuelles Types (CCT)
            adoptées par la Commission européenne, garantissant un niveau de
            protection équivalent au RGPD.
          </li>
          <li>
            <strong className="text-foreground">Via WhatsApp Business (Meta)</strong> :
            les messages de notification transitent par les serveurs Meta (USA),
            couverts par un Data Processing Agreement (DPA) conforme au RGPD.
          </li>
        </ul>
        <p className="mt-3">
          E-Samba ne transfère aucune donnée vers des pays sans garanties
          adéquates de protection des données, sauf obligation légale expresse
          d'une autorité compétente.
        </p>
      </LegalSection>

      {/* ── 15. Mineurs ───────────────────────────────────────────────────── */}
      <LegalSection titre="15. Protection des mineurs">
        <p>
          E-Samba est un service professionnel B2B destiné exclusivement aux
          entreprises et aux personnes majeures. Nous ne collectons pas
          sciemment de données concernant des personnes de moins de{" "}
          <strong className="text-foreground">18 ans</strong>.
        </p>
        <p>
          Si vous estimez qu'un mineur a créé un compte sur E-Samba, contactez-nous
          immédiatement à{" "}
          <a href="mailto:privacy@e-samba.com" className="text-primary hover:underline">
            privacy@e-samba.com
          </a>
          . Les données seront supprimées dans un délai de 72 heures.
        </p>
      </LegalSection>

      {/* ── 16. Modifications ─────────────────────────────────────────────── */}
      <LegalSection titre="16. Modifications de la politique">
        <p>
          E-Samba se réserve le droit de modifier la présente politique de
          confidentialité pour refléter l'évolution du service, des obligations
          légales ou des bonnes pratiques sectorielles.
        </p>
        <p>
          En cas de modification{" "}
          <strong className="text-foreground">substantielle</strong> (nouvelle
          finalité de traitement, nouveau sous-traitant, extension de la durée de
          conservation), les utilisateurs actifs seront notifiés par e-mail{" "}
          <strong className="text-foreground">30 jours avant</strong> l'entrée en
          vigueur de la nouvelle version. La poursuite de l'utilisation du service
          après ce délai vaut acceptation.
        </p>
        <p>
          L'historique des versions est disponible sur demande à{" "}
          <a href="mailto:privacy@e-samba.com" className="text-primary hover:underline">
            privacy@e-samba.com
          </a>
          .
        </p>
        <p>
          La version en vigueur est toujours consultable à l'adresse{" "}
          <a href="/confidentialite" className="text-primary hover:underline">
            e-samba.com/confidentialite
          </a>
          .
        </p>
      </LegalSection>

      {/* ── 17. Contact ───────────────────────────────────────────────────── */}
      <LegalSection titre="17. Contact">
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-2">
          <p className="font-semibold text-foreground">E-Samba — Délégué à la protection des données</p>
          <p>📍 Douala, Cameroun</p>
          <p>
            📧{" "}
            <a href="mailto:privacy@e-samba.com" className="text-primary hover:underline">
              privacy@e-samba.com
            </a>
          </p>
          <p>
            🌐{" "}
            <a href="https://www.e-samba.com" className="text-primary hover:underline">
              www.e-samba.com
            </a>
          </p>
          <p className="text-xs text-muted-foreground/70 pt-2">
            Délai de réponse garanti : 30 jours ouvrables
          </p>
        </div>
      </LegalSection>

      {/* ── 18. FAQ juridique ─────────────────────────────────────────────── */}
      <LegalSection titre="18. FAQ juridique">
        <div className="space-y-4">
          {[
            {
              q: "Pourquoi E-Samba collecte ma position GPS ?",
              a: "La géolocalisation est utilisée exclusivement pour des finalités opérationnelles : suivi de la flotte, calcul des kilométrages, génération d'alertes et optimisation des tournées. Elle n'est active que si votre organisation a activé le module GPS et pendant les créneaux d'exploitation. E-Samba n'utilise jamais vos données GPS à des fins publicitaires ou de profilage commercial.",
            },
            {
              q: "Qui peut voir mes trajets ?",
              a: "Seuls l'organisateur de votre flotte, les gestionnaires de votre périmètre et vous-même avez accès à vos données de trajet. Les mécaniciens n'ont aucun accès aux données GPS. E-Samba n'accède à vos trajets qu'en cas de nécessité technique avérée, dans le cadre d'une assistance, et cet accès est tracé dans le journal d'audit.",
            },
            {
              q: "Combien de temps mes données sont-elles conservées ?",
              a: "La durée varie selon le type de données : 12 mois pour les données GPS brutes, 3 ans pour votre compte après résiliation, 10 ans pour les données comptables liées aux paiements (obligation OHADA). Consultez le tableau de la Section 9 pour le détail complet.",
            },
            {
              q: "Comment supprimer mon compte ?",
              a: "Vous pouvez supprimer votre compte depuis Paramètres → Sécurité → Supprimer mon compte. La suppression est effective sous 30 jours. Certaines données (comptables, audit) sont conservées pour des obligations légales. Vous pouvez aussi envoyer une demande à privacy@e-samba.com avec une copie de votre pièce d'identité.",
            },
            {
              q: "Les paiements Mobile Money sont-ils sécurisés ?",
              a: "Oui. Les paiements sont traités exclusivement par NotchPay, prestataire certifié PCI-DSS. E-Samba ne reçoit jamais votre numéro complet de téléphone Mobile Money, ni votre code PIN, ni aucune donnée bancaire sensible. Seule la référence de transaction et son statut nous sont transmis.",
            },
            {
              q: "Mon employeur peut-il voir ma position en permanence ?",
              a: "Non. La géolocalisation via E-Samba est configurée par l'organisateur de flotte et est active uniquement pendant les créneaux d'exploitation déclarés. En dehors de ces périodes, aucune position n'est transmise à E-Samba. La surveillance GPS d'un salarié en dehors des heures de travail est illégale, et E-Samba ne peut pas être utilisé à cette fin.",
            },
            {
              q: "Mes données sont-elles vendues à des tiers ?",
              a: "Non, jamais. E-Samba ne vend, ne loue et ne cède aucune donnée personnelle à des tiers à des fins commerciales. Nos sous-traitants n'ont accès aux données que dans la limite strictement nécessaire à la fourniture du service pour lequel ils ont été mandatés.",
            },
            {
              q: "E-Samba utilise-t-il mes données pour de la publicité ?",
              a: "Non. E-Samba est un logiciel B2B professionnel. Nous n'affichons aucune publicité et n'utilisons aucune donnée à des fins de ciblage publicitaire, ni pour notre propre compte, ni pour le compte de tiers.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="group rounded-lg border border-border overflow-hidden">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-medium text-foreground text-sm hover:bg-muted/30 transition-colors list-none">
                <span>{q}</span>
                <span className="ml-2 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border bg-muted/10">
                {a}
              </div>
            </details>
          ))}
        </div>
      </LegalSection>

      {/* ── Pied de page légal ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground text-center">
        <p>
          Politique de confidentialité E-Samba — Version du {MAJ}
        </p>
        <p className="mt-1">
          Applicable à partir du {MAJ} • Remplace toutes les versions antérieures
        </p>
        <p className="mt-1">
          Cadre légal :{" "}
          <strong>Loi cm n° 2010/012</strong> •{" "}
          <strong>RGPD UE 2016/679</strong> •{" "}
          <strong>OHADA</strong> •{" "}
          <strong>Règlement CEMAC n° 01/03</strong>
        </p>
      </div>
    </LegalLayout>
  );
}
