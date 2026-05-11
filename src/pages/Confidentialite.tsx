import { LegalLayout, LegalSection } from "@/components/landing/LegalLayout";

const MAJ = "11 mai 2026";

/**
 * Politique de confidentialité E-Samba
 * Conforme à la Loi camerounaise n° 2010/012 du 21 décembre 2010
 * relative à la cybersécurité et à la cybercriminalité,
 * et au Règlement Général sur la Protection des Données (RGPD – UE 2016/679)
 * pour les données hébergées en Europe.
 */
export default function ConfidentialitePage() {
  return (
    <LegalLayout
      titre="Politique de confidentialité"
      sousTitre="Protection de vos données personnelles"
      miseAJour={MAJ}
    >
      <LegalSection titre="1. Identité du responsable de traitement">
        <p>
          <strong className="text-foreground">E-Samba</strong> (ci-après «&nbsp;la Société&nbsp;»),
          société de droit camerounais enregistrée au Registre du Commerce et du
          Crédit Mobilier (RCCM) de Douala sous le numéro <strong className="text-foreground">RC/DLA/2024/B/XXXX</strong>,
          dont le siège social est situé à Douala, Cameroun, est responsable du
          traitement de vos données à caractère personnel collectées via la
          plateforme E-Samba (e-samba.com).
        </p>
        <p>
          Contact délégué à la protection des données :{" "}
          <a href="mailto:privacy@e-samba.com" className="text-primary hover:underline">
            privacy@e-samba.com
          </a>
        </p>
      </LegalSection>

      <LegalSection titre="2. Bases légales applicables">
        <p>
          Le traitement de vos données est régi par :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            La <strong className="text-foreground">Loi n° 2010/012</strong> du 21 décembre 2010
            relative à la cybersécurité et à la cybercriminalité au Cameroun,
            notamment ses dispositions sur la protection des données personnelles
            (Articles 74 à 91).
          </li>
          <li>
            La <strong className="text-foreground">Loi n° 2010/021</strong> du 21 décembre 2010
            régissant le commerce électronique au Cameroun.
          </li>
          <li>
            Le <strong className="text-foreground">Règlement CEMAC n° 01/03/CEMAC/UMAC/CM</strong>{" "}
            relatif aux systèmes, moyens et incidents de paiement.
          </li>
          <li>
            Le <strong className="text-foreground">Règlement UE 2016/679 (RGPD)</strong> pour
            les données traitées par nos sous-traitants hébergés en Union
            européenne (Supabase, Vercel).
          </li>
        </ul>
      </LegalSection>

      <LegalSection titre="3. Données collectées">
        <p>Dans le cadre de l'utilisation d'E-Samba, nous collectons :</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-border rounded-lg overflow-hidden mt-2">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Catégorie</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Données</th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">Finalité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Identification", "Nom, prénom, adresse e-mail, numéro de téléphone", "Création de compte, authentification"],
                ["Flotte", "Immatriculations, marques, modèles des véhicules", "Gestion opérationnelle de votre flotte"],
                ["Conducteurs", "Nom, numéro de permis, affectations véhicules", "Suivi des affectations et inspections"],
                ["Localisation", "Coordonnées GPS des véhicules (si module GPS activé)", "Suivi temps réel, géofencing"],
                ["Paiement", "Référence de transaction Mobile Money (aucune donnée bancaire stockée)", "Facturation abonnement"],
                ["Technique", "Adresse IP, navigateur, logs d'erreurs", "Sécurité, débogage, performance"],
              ].map(([cat, data, fin]) => (
                <tr key={cat} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">{cat}</td>
                  <td className="px-3 py-2">{data}</td>
                  <td className="px-3 py-2">{fin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection titre="4. Durées de conservation">
        <ul className="list-disc pl-5 space-y-1">
          <li>Données de compte actif : pendant toute la durée de l'abonnement.</li>
          <li>Données de compte résilié : 3 ans après résiliation (délai de prescription OHADA).</li>
          <li>Données de localisation GPS : 12 mois glissants.</li>
          <li>Logs techniques : 90 jours.</li>
          <li>Documents comptables liés aux paiements : 10 ans (OHADA – Acte Uniforme relatif au Droit Comptable).</li>
        </ul>
      </LegalSection>

      <LegalSection titre="5. Sous-traitants et transferts internationaux">
        <p>
          E-Samba fait appel aux sous-traitants suivants, tous signataires de
          clauses contractuelles types conformes au RGPD :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Supabase Inc.</strong> (États-Unis / UE) — hébergement de la base de données, authentification. Données stockées dans la région Europe (Francfort).</li>
          <li><strong className="text-foreground">Vercel Inc.</strong> (États-Unis / UE) — hébergement de l'application web. Edge Network GDPR-compliant.</li>
          <li><strong className="text-foreground">PostHog Inc.</strong> (UE) — analytics produit anonymisé, serveur EU.</li>
          <li><strong className="text-foreground">Sentry Inc.</strong> (UE) — journalisation des erreurs JS, données anonymisées.</li>
        </ul>
        <p>
          Aucune donnée n'est vendue à des tiers. Aucune utilisation à des fins
          publicitaires.
        </p>
      </LegalSection>

      <LegalSection titre="6. Vos droits">
        <p>
          Conformément à la Loi n° 2010/012 et au RGPD, vous disposez des
          droits suivants sur vos données :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Accès</strong> : obtenir une copie de vos données.</li>
          <li><strong className="text-foreground">Rectification</strong> : corriger des données inexactes.</li>
          <li><strong className="text-foreground">Effacement</strong> : demander la suppression de vos données (sous réserve des obligations légales de conservation).</li>
          <li><strong className="text-foreground">Opposition</strong> : vous opposer à certains traitements.</li>
          <li><strong className="text-foreground">Portabilité</strong> : recevoir vos données dans un format structuré.</li>
          <li><strong className="text-foreground">Limitation</strong> : restreindre temporairement un traitement.</li>
        </ul>
        <p>
          Pour exercer ces droits, écrivez à{" "}
          <a href="mailto:privacy@e-samba.com" className="text-primary hover:underline">
            privacy@e-samba.com
          </a>{" "}
          avec une copie de votre pièce d'identité. Réponse sous 30 jours.
        </p>
      </LegalSection>

      <LegalSection titre="7. Sécurité des données">
        <p>
          E-Samba applique des mesures techniques et organisationnelles
          adaptées : chiffrement TLS 1.3 en transit, AES-256 au repos, isolation
          multi-tenant par Row Level Security PostgreSQL, authentification à
          deux facteurs disponible, journalisation des accès. Consultez notre{" "}
          <a href="/securite" className="text-primary hover:underline">
            page Sécurité
          </a>{" "}
          pour le détail.
        </p>
      </LegalSection>

      <LegalSection titre="8. Cookies">
        <p>
          E-Samba utilise des cookies techniques nécessaires au fonctionnement
          du service et des cookies d'analyse anonymisés. Consultez notre{" "}
          <a href="/cookies" className="text-primary hover:underline">
            Politique de cookies
          </a>{" "}
          pour en savoir plus.
        </p>
      </LegalSection>

      <LegalSection titre="9. Réclamations">
        <p>
          En cas de désaccord sur le traitement de vos données, vous pouvez
          saisir l'autorité compétente. Au Cameroun, contactez l'{" "}
          <strong className="text-foreground">Agence Nationale des Technologies de l'Information et de la Communication (ANTIC)</strong>{" "}
          — autorité de régulation numérique compétente en matière de protection
          des données.
        </p>
        <p>
          Adresse ANTIC : Avenue Rosa Parks, Yaoundé — Tél. : +237 222 200 700
        </p>
      </LegalSection>

      <LegalSection titre="10. Modifications">
        <p>
          La présente politique peut être mise à jour. La version en vigueur est
          toujours accessible à l'adresse{" "}
          <a href="/confidentialite" className="text-primary hover:underline">
            e-samba.com/confidentialite
          </a>
          . En cas de modification substantielle, les utilisateurs seront
          notifiés par e-mail 30 jours avant l'entrée en vigueur.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
