import {
  Car,
  Fuel,
  Wrench,
  DollarSign,
  ShieldCheck,
  Bell,
  Users,
  BarChart3,
} from "lucide-react";
import { getMarketingUrl } from "@/lib/marketing-url";

const features = [
  {
    icon: Car,
    title: "Samba-Fleet",
    description:
      "Gestion complète de vos véhicules : immatriculation, affectations, historique et statuts en temps réel.",
    color: "primary",
    guidePath: "/guides/gestion-flotte-pme-cemac",
  },
  {
    icon: Fuel,
    title: "Samba-Fuel",
    description:
      "Planification et suivi des entretiens. Alertes automatiques pour ne jamais manquer une maintenance.",
    color: "accent",
    guidePath: "/fonctionnalites/carburant",
  },
  {
    icon: Wrench,
    title: "Samba-Care",
    description:
      "Gestion atelier avec photos obligatoires, checklists et suivi qualité des interventions.",
    color: "primary",
    guidePath: "/fonctionnalites/maintenance",
  },
  {
    icon: DollarSign,
    title: "Samba-Cash",
    description:
      "Encaissements journaliers, Mobile Money intégré, clôture obligatoire et écarts visibles.",
    color: "accent",
    guidePath: "/guides/reduire-ecarts-encaissements",
  },
  {
    icon: ShieldCheck,
    title: "Samba-Check",
    description:
      "Gestion des rôles et permissions. Chaque utilisateur voit uniquement ce qui le concerne.",
    color: "primary",
    guidePath: "/solutions/gestionnaires-flotte",
  },
  {
    icon: Bell,
    title: "Alertes intelligentes",
    description:
      "Notifications push, email et SMS pour les seuils critiques et rappels importants.",
    color: "accent",
    guidePath: "/fonctionnalites/alertes",
  },
  {
    icon: Users,
    title: "Multi-tenant",
    description:
      "Architecture multi-organisations avec flottes isolées et données sécurisées.",
    color: "primary",
    guidePath: "/guides/kpi-gestionnaire-multi-flottes",
  },
  {
    icon: BarChart3,
    title: "Scoring & KPIs",
    description:
      "Système de scoring chauffeurs et mécaniciens avec incitations et sanctions automatiques.",
    color: "accent",
    guidePath: "/fonctionnalites/score-conducteur",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Fonctionnalités
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mt-4 mb-6">
            Tout ce qu'il faut pour{" "}
            <span className="text-gradient">optimiser</span> votre flotte
          </h2>
          <p className="text-muted-foreground text-lg">
            Une suite complète d'outils conçus pour les réalités du transport en
            Afrique. Simple, puissant, accessible.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <a
              key={feature.title}
              href={getMarketingUrl(feature.guidePath)}
              className="group block p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  feature.color === "primary"
                    ? "bg-primary/10 text-primary"
                    : "bg-accent/10 text-accent-foreground"
                }`}
              >
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
