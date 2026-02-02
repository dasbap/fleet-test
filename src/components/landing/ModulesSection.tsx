import { Car, Wrench, BadgeDollarSign, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  {
    icon: Car,
    name: "Organisateur",
    subtitle: "Vue d'ensemble multi-flottes",
    description:
      "Supervisez plusieurs flottes depuis un tableau de bord unique. Rapports consolidés, seuils d'alerte personnalisables, arbitrage des décisions critiques.",
    features: [
      "Supervision multi-flottes",
      "Rapports & analytics",
      "Configuration des seuils",
      "Gestion des gestionnaires",
    ],
    gradient: "from-primary to-primary/60",
  },
  {
    icon: ShieldCheck,
    name: "Gestionnaire",
    subtitle: "Pilotage d'une flotte",
    description:
      "Gérez votre flotte de 2 à 50 véhicules. Affectations, validations, encaissements quotidiens et suivi des chauffeurs.",
    features: [
      "Affectation véhicules/chauffeurs",
      "Validation des clôtures",
      "Suivi des encaissements",
      "Sanctions & récompenses",
    ],
    gradient: "from-accent to-accent/60",
  },
  {
    icon: BadgeDollarSign,
    name: "Chauffeur",
    subtitle: "Gestion quotidienne simplifiée",
    description:
      "Interface mobile-first pour les chauffeurs. Déclaration kilométrique, clôture journalière obligatoire, score visible en temps réel.",
    features: [
      "KM début/fin de journée",
      "Déclaration des incidents",
      "Clôture obligatoire",
      "Score discipline visible",
    ],
    gradient: "from-info to-info/60",
  },
  {
    icon: Wrench,
    name: "Mécanicien",
    subtitle: "Gestion atelier professionnelle",
    description:
      "Suivi des interventions multi-flottes avec photos obligatoires, rapports techniques et scoring qualité.",
    features: [
      "Interventions multi-flottes",
      "Photos obligatoires",
      "Checklists techniques",
      "Score qualité & récurrence",
    ],
    gradient: "from-destructive to-destructive/60",
  },
];

const ModulesSection = () => {
  return (
    <section id="modules" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Rôles & Modules
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mt-4 mb-6">
            Un accès <span className="text-gradient">adapté</span> à chaque
            métier
          </h2>
          <p className="text-muted-foreground text-lg">
            Chaque utilisateur dispose d'une interface optimisée pour ses
            besoins. Sécurité et simplicité garanties.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modules.map((module, index) => (
            <div
              key={module.name}
              className={cn(
                "relative group rounded-2xl p-8 bg-card border border-border overflow-hidden",
                "hover:border-primary/30 transition-all duration-500"
              )}
            >
              {/* Gradient accent */}
              <div
                className={cn(
                  "absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl transition-opacity duration-500",
                  "group-hover:opacity-20",
                  `bg-gradient-to-br ${module.gradient}`
                )}
              />

              <div className="relative z-10">
                {/* Icon & Title */}
                <div className="flex items-start gap-4 mb-6">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center",
                      `bg-gradient-to-br ${module.gradient}`
                    )}
                  >
                    <module.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-bold">
                      {module.name}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {module.subtitle}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {module.description}
                </p>

                {/* Features List */}
                <ul className="grid grid-cols-2 gap-3">
                  {module.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModulesSection;
