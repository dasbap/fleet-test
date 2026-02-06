import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    description: "Pour les petites flottes qui démarrent",
    price: "25 000",
    currency: "FCFA",
    period: "/ véhicule / mois",
    features: [
      "Jusqu'à 5 véhicules",
      "1 gestionnaire",
      "Samba-Fleet",
      "Samba-Cash basique",
      "Support email",
    ],
    cta: "Commencer",
    popular: false,
  },
  {
    name: "Pro",
    description: "Pour les flottes en croissance",
    price: "21 000",
    currency: "FCFA",
    period: "/ véhicule / mois",
    features: [
      "Jusqu'à 25 véhicules",
      "3 gestionnaires",
      "Tous les modules Samba",
      "Scoring chauffeurs",
      "Alertes push & SMS",
      "Support prioritaire",
    ],
    cta: "Démarrer l'essai",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "Pour les grandes organisations",
    price: "Sur devis",
    currency: "",
    period: "",
    features: [
      "Véhicules illimités",
      "Multi-organisations",
      "API & intégrations",
      "SLA personnalisé",
      "Formation sur site",
      "Account manager dédié",
    ],
    cta: "Nous contacter",
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Tarification
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mt-4 mb-6">
            Des prix <span className="text-gradient">adaptés</span> à votre
            activité
          </h2>
          <p className="text-muted-foreground text-lg">
            Payez uniquement pour ce que vous utilisez. Mobile Money accepté.
            Aucun engagement.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-2xl p-8 bg-card border transition-all duration-300",
                plan.popular
                  ? "border-primary shadow-glow scale-105"
                  : "border-border hover:border-primary/30"
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    <Zap className="w-4 h-4" />
                    <span>Populaire</span>
                  </div>
                </div>
              )}

              {/* Plan Info */}
              <div className="text-center mb-8">
                <h3 className="text-xl font-heading font-bold mb-2">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-heading font-bold">
                    {plan.price}
                  </span>
                  {plan.currency && (
                    <span className="text-lg text-muted-foreground">
                      {plan.currency}
                    </span>
                  )}
                </div>
                {plan.period && (
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <Link to="/auth?mode=signup">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Paiements sécurisés via
          </p>
          <div className="flex items-center justify-center gap-6 opacity-60">
            <span className="font-medium">MTN MoMo</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-medium">Orange Money</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-medium">Visa / Mastercard</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
