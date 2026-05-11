import { LegalLayout, LegalSection } from "@/components/landing/LegalLayout";

const MAJ = "11 mai 2026";

/**
 * Conditions Générales d'Utilisation et de Vente — E-Samba
 * Conformes à :
 * - l'Acte Uniforme OHADA relatif au Droit Commercial Général (AUDCG)
 * - la Loi n° 2010/021 du 21 décembre 2010 sur le commerce électronique (Cameroun)
 * - le Règlement CEMAC sur les systèmes de paiement
 */
export default function ConditionsPage() {
  return (
    <LegalLayout
      titre="Conditions Générales d'Utilisation"
      sousTitre="Conditions d'accès et d'utilisation de la plateforme E-Samba"
      miseAJour={MAJ}
    >
      <LegalSection titre="1. Éditeur du service">
        <p>
          La plateforme E-Samba est éditée par la société{" "}
          <strong className="text-foreground">E-Samba</strong>, société à
          responsabilité limitée (SARL) de droit camerounais au capital de
          1 000 000 FCFA, enregistrée au RCCM de Douala sous le
          numéro <strong className="text-foreground">RC/Y/2024/P/107816791685</strong>,
          Numéro Contribuable : <strong className="text-foreground">P000000000000X</strong>,
          dont le siège social est situé à Douala, Cameroun.
        </p>
        <p>
          E-mail : <a href="mailto:contact@e-samba.com" className="text-primary hover:underline">contact@e-samba.com</a>
          {" — "}
          Tél. : <a href="tel:+237641461148" className="text-primary hover:underline">+237 6 41 46 11 48</a>
        </p>
      </LegalSection>

      <LegalSection titre="2. Acceptation des conditions">
        <p>
          L'accès et l'utilisation de la plateforme E-Samba impliquent
          l'acceptation pleine et entière des présentes Conditions Générales
          d'Utilisation (CGU). Ces conditions constituent un contrat
          électronique valide entre la Société et le Client conformément à la
          Loi n° 2010/021 sur le commerce électronique au Cameroun.
        </p>
        <p>
          En créant un compte ou en accédant à la plateforme, l'utilisateur
          reconnaît avoir lu, compris et accepté les présentes CGU. Si
          l'utilisateur agit pour le compte d'une entreprise, il garantit
          disposer des pouvoirs nécessaires à cet engagement.
        </p>
      </LegalSection>

      <LegalSection titre="3. Description du service">
        <p>
          E-Samba est une plateforme SaaS (Software as a Service) de gestion
          de flotte de véhicules destinée aux entreprises de la zone CEMAC
          (Cameroun, Gabon, Tchad, République Centrafricaine, Congo, Guinée
          Équatoriale). Elle propose notamment :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Gestion et suivi du parc de véhicules</li>
          <li>Planification et suivi de la maintenance</li>
          <li>Contrôles journaliers DVIR (Driver Vehicle Inspection Report)</li>
          <li>Suivi GPS et géofencing</li>
          <li>Gestion des conducteurs et affectations</li>
          <li>Gestion des transits CEMAC (documents douaniers, corridors)</li>
          <li>Rapports financiers et analytiques</li>
          <li>Alertes et coaching vocal conducteur</li>
        </ul>
        <p>
          E-Samba se réserve le droit de modifier, d'améliorer ou d'interrompre
          toute fonctionnalité avec un préavis de 30 jours pour les
          modifications substantielles.
        </p>
      </LegalSection>

      <LegalSection titre="4. Souscription et plans d'abonnement">
        <p>
          L'accès à E-Samba est conditionné à la souscription d'un abonnement
          parmi les offres disponibles (Starter, Pro, Entreprise). Les tarifs
          en vigueur sont consultables sur{" "}
          <a href="/#pricing" className="text-primary hover:underline">
            e-samba.com/#pricing
          </a>
          .
        </p>
        <p>
          Les abonnements sont facturés mensuellement ou annuellement selon
          l'option choisie, en Francs CFA (XAF) via Mobile Money (Orange Money,
          MTN MoMo) ou virement bancaire. Conformément au Règlement CEMAC
          n° 01/03/CEMAC/UMAC/CM, toutes les transactions sont effectuées en
          monnaie locale FCFA.
        </p>
        <p>
          <strong className="text-foreground">Période d'essai :</strong> Une
          période d'essai gratuite de 14 jours peut être accordée sans engagement
          ni carte bancaire. À l'issue de l'essai, l'accès est suspendu sauf
          souscription à un plan payant.
        </p>
      </LegalSection>

      <LegalSection titre="5. Obligations du Client">
        <p>Le Client s'engage à :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Fournir des informations exactes et à jour lors de l'inscription.</li>
          <li>Maintenir la confidentialité de ses identifiants de connexion.</li>
          <li>Utiliser la plateforme conformément à la législation en vigueur dans son pays d'exploitation.</li>
          <li>Ne pas tenter de contourner les mécanismes de sécurité.</li>
          <li>Ne pas utiliser E-Samba pour stocker, traiter ou transmettre des contenus illicites.</li>
          <li>Régler les sommes dues aux échéances convenues.</li>
        </ul>
        <p>
          Tout manquement grave à ces obligations peut entraîner la suspension
          ou la résiliation du compte, conformément à l'AUDCG (Article 234
          et suivants sur la résolution des contrats commerciaux).
        </p>
      </LegalSection>

      <LegalSection titre="6. Propriété intellectuelle">
        <p>
          Conformément aux dispositions de l'Accord de Bangui (1999) relatif
          à la propriété intellectuelle en Afrique (OAPI), et de la Convention
          de Berne, l'ensemble des éléments de la plateforme E-Samba (code
          source, interfaces, logos, marques, bases de données, algorithmes)
          sont la propriété exclusive d'E-Samba ou de ses partenaires licenseurs.
        </p>
        <p>
          Toute reproduction, représentation, modification ou exploitation non
          autorisée constitue une contrefaçon susceptible de poursuites civiles
          et pénales. Le Client reçoit une licence d'utilisation personnelle,
          non exclusive, non transférable et révocable, limitée à ses besoins
          professionnels.
        </p>
      </LegalSection>

      <LegalSection titre="7. Données du Client">
        <p>
          Les données opérationnelles saisies par le Client dans E-Samba
          (véhicules, conducteurs, opérations) lui appartiennent. E-Samba
          agit en qualité de sous-traitant au sens de la Loi n° 2010/012.
        </p>
        <p>
          En cas de résiliation, le Client peut exporter ses données en format
          CSV/Excel pendant 90 jours. Passé ce délai, les données sont
          définitivement supprimées.
        </p>
      </LegalSection>

      <LegalSection titre="8. Disponibilité et niveaux de service (SLA)">
        <p>
          E-Samba s'engage à maintenir une disponibilité mensuelle de la
          plateforme d'au moins <strong className="text-foreground">99,5 %</strong>,
          hors fenêtres de maintenance planifiée (notifiées 48h à l'avance) et
          cas de force majeure.
        </p>
        <p>
          En cas de dépassement des plages d'indisponibilité garanties, le
          Client peut bénéficier d'un avoir proratisé sur sa prochaine
          facturation, dans la limite d'un mois d'abonnement.
        </p>
      </LegalSection>

      <LegalSection titre="9. Responsabilité et limitation">
        <p>
          Dans les limites permises par l'AUDCG et la législation camerounaise,
          la responsabilité d'E-Samba ne pourra pas excéder le montant des
          abonnements effectivement payés par le Client au cours des 12 derniers
          mois précédant le fait générateur.
        </p>
        <p>
          E-Samba ne saurait être tenue responsable des dommages indirects,
          pertes d'exploitation, pertes de données ou manques à gagner résultant
          de l'utilisation ou de l'impossibilité d'utiliser le service, sauf
          faute intentionnelle ou faute lourde prouvée.
        </p>
      </LegalSection>

      <LegalSection titre="10. Force majeure">
        <p>
          Au sens de l'Article 1148 du Code Civil applicable au Cameroun et
          des principes OHADA, constituent des cas de force majeure :
          catastrophes naturelles, pandémies, coupures de réseau d'opérateurs
          télécoms, cyberattaques étatiques, décisions gouvernementales
          imprévisibles. En cas de force majeure, les obligations des parties
          sont suspendues de plein droit.
        </p>
      </LegalSection>

      <LegalSection titre="11. Résiliation">
        <p>
          Le Client peut résilier son abonnement à tout moment depuis son
          espace «&nbsp;Abonnement&nbsp;» dans le dashboard, avec effet à la
          fin de la période facturée en cours. Aucun remboursement proratisé
          n'est dû pour la période restante sauf disposition légale contraire.
        </p>
        <p>
          E-Samba peut résilier le contrat avec un préavis de 30 jours sans
          motif, ou immédiatement en cas de manquement grave du Client à ses
          obligations.
        </p>
      </LegalSection>

      <LegalSection titre="12. Règlement des litiges">
        <p>
          En cas de litige, les parties s'engagent à rechercher une solution
          amiable dans un délai de 30 jours. À défaut d'accord :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-foreground">Médiation CCJA :</strong> Les
            parties peuvent soumettre le différend à la médiation de la Cour
            Commune de Justice et d'Arbitrage (CCJA) de l'OHADA, conformément
            au Règlement de Médiation OHADA.
          </li>
          <li>
            <strong className="text-foreground">Arbitrage :</strong> À défaut,
            tout litige sera soumis à l'arbitrage du Centre d'Arbitrage du
            Groupement Interpatronal du Cameroun (GICAM), selon son règlement
            d'arbitrage.
          </li>
          <li>
            <strong className="text-foreground">Juridiction :</strong> En
            l'absence d'accord d'arbitrage, les Tribunaux de Douala
            (Cameroun) sont seuls compétents.
          </li>
        </ul>
      </LegalSection>

      <LegalSection titre="13. Droit applicable">
        <p>
          Les présentes CGU sont régies par le droit camerounais et les Actes
          Uniformes OHADA applicables. En cas de conflit entre une disposition
          des présentes CGU et une règle impérative d'un Acte Uniforme OHADA,
          ce dernier prévaut.
        </p>
      </LegalSection>

      <LegalSection titre="14. Modifications des CGU">
        <p>
          E-Samba se réserve le droit de modifier les présentes CGU. Les
          modifications sont notifiées par e-mail 30 jours avant leur entrée
          en vigueur. La poursuite de l'utilisation du service après ce délai
          vaut acceptation des nouvelles conditions.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
