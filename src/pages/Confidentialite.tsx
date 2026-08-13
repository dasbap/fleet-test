import { LegalLayout, LegalSection } from "@/components/landing/LegalLayout";
import { PRIVACY } from "@/config/navigation";

const MAJ = "13 août 2026";

/**
 * Politique de confidentialité E-Samba — version publique
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
            "Paiements",
            "Hébergement et sécurité opérationnelle",
            "Intervenants autorisés",
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
            <a href={PRIVACY.mailtoHref} className="text-primary hover:underline">
              {PRIVACY.email}
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
          <li>Numéro de téléphone (utilisé pour l'authentification et les notifications autorisées)</li>
          <li>Rôle au sein de la flotte (organisateur, gestionnaire, chauffeur, mécanicien)</li>
          <li>Photo de profil (optionnelle)</li>
          <li>Préférences de langue et de notification</li>
          <li>Date et heure de création du compte</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.2 Données d'organisation et de flotte</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nom de la société / organisation</li>
          <li>Pays et ville de domiciliation</li>
          <li>Nom(s) de flotte(s)</li>
          <li>Plan d'abonnement souscrit</li>
          <li>Structure des rôles et permissions d'accès</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.3 Données véhicules</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Numéro d'immatriculation</li>
          <li>Marque, modèle, année, couleur</li>
          <li>Kilométrage courant et historique</li>
          <li>Statut opérationnel (actif, en maintenance, suspendu)</li>
          <li>Documents administratifs : assurance, visite technique, carte grise (dates d'expiration)</li>
          <li>Code QR unique lié au véhicule (identifiant interne, non nominatif)</li>
          <li>Historique des interventions de maintenance et contrôles associés</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.4 Données conducteurs</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Identité (nom, prénom, téléphone)</li>
          <li>Affectations véhicule (historique des créneaux d'exploitation)</li>
          <li>Kilométrages déclarés (début et fin de créneau)</li>
          <li>Recettes déclarées et preuves de reversement (captures Mobile Money)</li>
          <li>Contrôles d'état du véhicule avant et après exploitation</li>
          <li>Incidents déclarés (description, géolocalisation si disponible, photos)</li>
          <li>Indicateurs de performance conducteur liés à l'activité de flotte</li>
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
          <li>Historique des transactions d'abonnement (montant, date, référence transactionnelle)</li>
          <li>Statut de l'abonnement (actif, en période de grâce, suspendu)</li>
          <li>Numéro de téléphone Mobile Money associé à la transaction lorsque nécessaire</li>
          <li>
            <strong className="text-foreground">Nous ne stockons pas</strong> les
            numéros complets de carte bancaire, les codes PIN, ni les mots de passe
            de services financiers.
          </li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.7 Données techniques et de navigation</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Adresse IP, limitée aux besoins de sécurité et de diagnostic</li>
          <li>Type de navigateur et version</li>
          <li>Système d'exploitation et type de terminal (mobile / desktop)</li>
          <li>Pages visitées et durée de session</li>
          <li>Journaux techniques d'erreur limités et minimisés</li>
          <li>Journaux d'audit des actions sensibles (accès, modifications, suppressions)</li>
          <li>Données nécessaires au maintien sécurisé de la session</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">2.8 Données de support</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tickets de support soumis via la plateforme</li>
          <li>Échanges via les canaux de support mis à disposition par E-Samba</li>
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
                ["Authentification", "Connexion sécurisée et vérification de l'identité de l'utilisateur", "Contrat"],
                ["Géolocalisation", "Suivi GPS des véhicules pour l'optimisation opérationnelle", "Contrat / Consentement"],
                ["Facturation", "Traitement des paiements d'abonnement via des prestataires autorisés", "Contrat / Obligation légale"],
                ["Sécurité et fraude", "Détection d'anomalies, traçabilité et protection des accès", "Intérêt légitime"],
                ["Maintenance & performance", "Monitoring technique, débogage, optimisation des temps de réponse", "Intérêt légitime"],
                ["Notifications", "Alertes opérationnelles par les canaux activés par l'organisation", "Contrat / Consentement"],
                ["Support client", "Traitement des tickets, assistance, rappels téléphoniques", "Contrat"],
                ["Statistiques internes", "Analyse agrégée et minimisée des usages produit", "Intérêt légitime"],
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
          La fréquence dépend de la configuration choisie par l'organisation et
          du besoin opérationnel. Elle est limitée à ce qui est nécessaire au
          service activé, et aucune collecte n'a lieu lorsque le module est
          désactivé.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">5.4 Durée de conservation des données GPS</h3>
        <p>
          Les données GPS sont conservées pendant une durée proportionnée au
          besoin opérationnel et aux obligations contractuelles applicables. Les
          rapports agrégés nécessaires au suivi de la flotte peuvent être
          conservés pendant la durée de l'abonnement.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">5.5 Qui a accès aux données GPS ?</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-foreground">Utilisateurs habilités</strong> :
            accès limité à leur périmètre opérationnel
          </li>
          <li>
            <strong className="text-foreground">Conducteurs</strong> : accès aux
            informations les concernant lorsque l'application le permet
          </li>
          <li>
            <strong className="text-foreground">Personnel technique ou support</strong> :
            accès ponctuel, justifié, limité et tracé
          </li>
          <li>
            <strong className="text-foreground">Tiers non autorisés</strong> :
            aucun accès aux données de trajet
          </li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">5.6 Droits des conducteurs</h3>
        <p>
          Un conducteur peut, depuis ses paramètres de compte, consulter
          l'historique de ses propres positions. Il peut demander la suppression
          de ses données GPS personnelles (positions hors créneaux actifs) via{" "}
          <a href={PRIVACY.mailtoHref} className="text-primary hover:underline">
            {PRIVACY.email}
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
      <LegalSection titre="6. Paiements">
        <p>
          E-Samba confie l'intégralité du traitement des paiements à des
          prestataires de paiement autorisés. E-Samba n'est pas un établissement
          de paiement et ne traite pas directement les données bancaires ou Mobile
          Money sensibles.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">6.1 Ce qu'E-Samba conserve</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Référence transactionnelle nécessaire au suivi du paiement</li>
          <li>Montant et devise (XAF)</li>
          <li>Date et heure de la transaction</li>
          <li>Statut du paiement ou du remboursement</li>
          <li>Justificatifs limités nécessaires à la facturation et au support</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">6.2 Ce qu'E-Samba ne stocke jamais</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Codes PIN de validation</li>
          <li>Numéros complets de carte bancaire (PAN)</li>
          <li>Mots de passe de services financiers</li>
          <li>Données biométriques liées aux paiements</li>
          <li>Identifiants complets permettant d'autoriser un paiement</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">6.3 Remboursements et litiges</h3>
        <p>
          Les demandes de remboursement et les contestations sont traitées via un
          processus sécurisé, avec le prestataire concerné lorsque cela est
          nécessaire. Les données comptables liées aux paiements sont conservées
          pendant la durée imposée par la réglementation applicable.
        </p>
      </LegalSection>

      {/* ── 7. Infrastructure ─────────────────────────────────────────────── */}
      <LegalSection titre="7. Hébergement et sécurité opérationnelle">
        <h3 className="font-semibold text-foreground mt-2 mb-2">7.1 Hébergement professionnel</h3>
        <p>
          Les données nécessaires au service sont hébergées auprès de prestataires
          professionnels sélectionnés pour leurs garanties de sécurité, de
          disponibilité et de conformité. E-Samba ne publie pas le détail de son
          architecture technique afin de préserver la sécurité du service.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">7.2 Données applicatives</h3>
        <p>
          Les comptes, paramètres de flotte, documents et informations
          opérationnelles sont séparés par organisation et soumis à des contrôles
          d'accès stricts. Les accès internes sont limités aux personnes
          habilitées et aux besoins de support, de sécurité ou de conformité.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">7.3 Disponibilité et continuité</h3>
        <p>
          E-Samba met en place des procédures de supervision, de sauvegarde et de
          reprise adaptées à la criticité du service. Les modalités opérationnelles
          détaillées sont réservées aux échanges contractuels ou aux audits
          autorisés.
        </p>
      </LegalSection>

      {/* ── 8. Sous-traitants ─────────────────────────────────────────────── */}
      <LegalSection titre="8. Intervenants autorisés">
        <p>
          E-Samba peut faire appel à des intervenants autorisés pour fournir le
          service. Aucune donnée n'est vendue à des tiers et aucune utilisation à
          des fins publicitaires n'est réalisée.
        </p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Catégorie</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Finalité</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Garanties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Hébergement applicatif", "Mise à disposition du service et disponibilité", "Contrats de sous-traitance, sécurité et confidentialité"],
                ["Stockage et base de données", "Conservation des données nécessaires au service", "Contrôles d'accès, chiffrement et engagements de conformité"],
                ["Paiement", "Encaissement, remboursement et preuve de transaction", "Encadrement contractuel et obligations financières applicables"],
                ["Communication client", "Notifications opérationnelles et support", "Utilisation limitée aux messages nécessaires au service"],
                ["Cartographie", "Affichage de positions, zones et trajets lorsque le module est activé", "Minimisation et limitation des données transmises"],
                ["Mesure d'usage et diagnostic", "Amélioration du produit et résolution d'incidents", "Agrégation, anonymisation ou minimisation selon le cas"],
              ].map(([s, f, g]) => (
                <tr key={s} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">{s}</td>
                  <td className="px-3 py-2">{f}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{g}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          La liste détaillée des prestataires peut être communiquée aux clients,
          utilisateurs concernés ou autorités compétentes sur demande légitime,
          dans un cadre adapté de confidentialité.
        </p>
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
                ["Compte résilié", "Durée nécessaire aux obligations légales ou contractuelles", "Prescription et défense des droits"],
                ["Données de géolocalisation", "Durée proportionnée au module activé et au besoin opérationnel", "Gestion de flotte et sécurité des opérations"],
                ["Rapports agrégés", "Durée utile au suivi contractuel", "Compte rendu et pilotage de la flotte"],
                ["Données de maintenance", "Durée nécessaire au suivi de maintenance et aux obligations applicables", "Sécurité, maintenance et responsabilité"],
                ["Transactions de paiement", "Durée légale comptable applicable", "Obligations comptables et fiscales"],
                ["Journaux de sécurité et de support", "Durée limitée au besoin de sécurité, d'assistance ou de preuve", "Détection d'incidents et support"],
                ["Cookies et préférences", "Selon leur finalité et vos choix", "Fonctionnement du service et consentement"],
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
          E-Samba met en œuvre des mesures techniques et organisationnelles
          adaptées à la nature des données traitées, conformément à l'état de
          l'art et aux exigences de l'Article 32 du RGPD.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.1 Mesures techniques</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Chiffrement des échanges et protection des données stockées</li>
          <li>Segmentation des accès par organisation et par périmètre autorisé</li>
          <li>Supervision des événements techniques et de sécurité</li>
          <li>Contrôles destinés à limiter les accès non autorisés</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.2 Authentification et accès</h3>
        <p>
          L'accès au service repose sur des mécanismes d'authentification sécurisés
          et sur des permissions adaptées au rôle de chaque utilisateur. Les
          fonctionnalités sensibles sont réservées aux comptes habilités par
          l'organisation.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.3 Traçabilité</h3>
        <p>
          Les opérations sensibles peuvent être enregistrées dans des journaux de
          sécurité afin de détecter les incidents, d'assister les utilisateurs et
          de répondre aux obligations légales ou contractuelles.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.4 Sauvegardes et reprise</h3>
        <p>
          E-Samba maintient des procédures de sauvegarde et de reprise adaptées à
          la continuité du service. Les détails opérationnels de ces procédures ne
          sont pas publiés pour des raisons de sécurité.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">10.5 Réponse aux incidents</h3>
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
          <a href={PRIVACY.mailtoHref} className="text-primary hover:underline">
            {PRIVACY.email}
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
          <li>Cookies de session nécessaires à l'authentification</li>
          <li>Cookies de sécurité nécessaires au maintien de la connexion</li>
          <li>Préférence de langue et thème (durée : 1 an)</li>
          <li>Protection contre les actions non autorisées</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-4 mb-2">13.2 Cookies analytiques (opt-in)</h3>
        <p>
          Avec votre consentement, nous utilisons des outils de mesure d'audience
          produit pour comprendre l'usage du service de façon agrégée et minimisée.
          Ces données ne sont pas utilisées à des fins publicitaires.
        </p>

        <h3 className="font-semibold text-foreground mt-4 mb-2">13.3 Ce que nous n'utilisons pas</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cookies publicitaires (aucune régie publicitaire)</li>
          <li>Pixels de tracking publicitaire tiers</li>
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
          Certains intervenants autorisés peuvent traiter des données en dehors du
          Cameroun ou de l'espace CEMAC lorsque cela est nécessaire au service.
          Ces transferts sont encadrés par les garanties suivantes :
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            Clauses contractuelles, accords de traitement de données ou garanties
            équivalentes lorsque le prestataire est situé hors de la zone locale.
          </li>
          <li>
            Limitation des données transmises à ce qui est strictement nécessaire
            à la finalité du service.
          </li>
          <li>
            Évaluation régulière des garanties de sécurité, de confidentialité et
            de conformité des intervenants concernés.
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
          <a href={PRIVACY.mailtoHref} className="text-primary hover:underline">
            {PRIVACY.email}
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
          <a href={PRIVACY.mailtoHref} className="text-primary hover:underline">
            {PRIVACY.email}
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
            <a href={PRIVACY.mailtoHref} className="text-primary hover:underline">
              {PRIVACY.email}
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
              a: "Seuls les utilisateurs habilités par votre organisation peuvent accéder aux données de trajet dans la limite de leur périmètre. E-Samba n'y accède qu'en cas de nécessité de support, de sécurité ou de conformité, avec des contrôles internes adaptés.",
            },
            {
              q: "Combien de temps mes données sont-elles conservées ?",
              a: "La durée varie selon le type de données, la configuration de votre organisation et les obligations légales applicables. E-Samba applique une durée proportionnée au besoin du service, puis supprime, anonymise ou archive les données lorsque leur conservation n'est plus nécessaire.",
            },
            {
              q: "Comment supprimer mon compte ?",
              a: `Vous pouvez supprimer votre compte depuis Paramètres → Sécurité → Supprimer mon compte. La suppression est effective sous 30 jours. Certaines données (comptables, audit) sont conservées pour des obligations légales. Vous pouvez aussi envoyer une demande à ${PRIVACY.email} avec une copie de votre pièce d'identité.`,
            },
            {
              q: "Les paiements Mobile Money sont-ils sécurisés ?",
              a: "Oui. Les paiements sont traités par des prestataires autorisés. E-Samba ne reçoit jamais votre code PIN, vos mots de passe financiers ni les informations sensibles permettant d'autoriser un paiement. Seules les informations nécessaires au suivi de la transaction sont conservées.",
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
