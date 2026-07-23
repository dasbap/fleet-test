import { Link } from "react-router-dom";
import {
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTE_PATHS } from "@/navigation/routePaths";
// todo

const roleGuides = [
  {
    title: "Comptes flotte",
    icon: UserPlus,
    points: [
      "Depuis ce panel, tu peux inviter les profils utiles a une flotte: organisateur, gestionnaire, chauffeur ou mecanicien.",
      "La creation d'admins plateforme reste reservee aux operations internes, pas a ce formulaire.",
      "Pour un nouveau client, cree seulement l'organisateur: il creera sa flotte a sa premiere connexion.",
    ],
  },
  {
    title: "Forfait et acces",
    icon: ShieldCheck,
    points: [
      "Chaque membre suit le forfait de la flotte a laquelle il est rattache.",
      "Les fonctionnalites disponibles viennent du forfait porte par l'organisateur ou le proprietaire de la flotte.",
      "Le forfait ouvre les modules, mais le role garde les limites metier: un chauffeur reste chauffeur.",
    ],
  },
  {
    title: "Comptes demo",
    icon: KeyRound,
    points: [
      "Une demo peut venir d'une demande utilisateur ou etre ouverte par un admin pour laisser un client essayer E-Samba.",
      "Quand elle expire, elle doit partir proprement avec les comptes crees depuis cette demo.",
      "Elle ne se transforme pas en compte client: l'admin peut seulement ajuster l'expiration, au maximum jusqu'a un mois apres la creation.",
    ],
  },
];

export default function HelpAdminPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit">
            Admin plateforme
          </Badge>
          <h1 className="font-heading text-2xl font-semibold">
            Comprendre le role admin
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Cette page sert de repere rapide pour administrer les comptes sans
            melanger les responsabilites plateforme, organisateur et flotte.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={ROUTE_PATHS.dashboardAdminUsers}>Creer un compte</Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {roleGuides.map((guide) => (
          <Card key={guide.title}>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <guide.icon className="h-5 w-5" aria-hidden />
              </div>
              <CardTitle className="text-base">{guide.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {guide.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

    </div>
  );
}
