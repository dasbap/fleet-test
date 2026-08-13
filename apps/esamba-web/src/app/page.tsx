import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle,
  FileText,
  Globe,
  Shield,
  Smartphone,
  Star,
  Truck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveFleetContext } from "@/lib/dashboard/session";
import {
  buildLandingJsonLd,
  buildLandingMetadata,
} from "@/lib/seo/landing";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = buildLandingMetadata();

const FEATURES = [
  {
    icon: Bell,
    title: "Alertes automatiques",
    description:
      "Soyez notifié avant l'expiration de chaque assurance, contrôle technique ou vignette. Fini les mauvaises surprises.",
    color: "bg-red-50 text-red-600",
  },
  {
    icon: FileText,
    title: "Gestion des documents",
    description:
      "Centralisez tous les documents de vos véhicules et conducteurs. Accédez-y depuis n'importe où.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: BarChart3,
    title: "Rapports détaillés",
    description:
      "Analysez vos dépenses, kilométrage et performance de flotte. Exportez en Excel ou PDF.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Smartphone,
    title: "Paiement Mobile Money",
    description:
      "Abonnez-vous avec MTN MoMo ou Orange Money. Pas de carte bancaire requise.",
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    icon: Users,
    title: "Gestion des conducteurs",
    description:
      "Suivez permis, scores de sécurité, affectations et historique de chaque conducteur.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: Shield,
    title: "Données sécurisées",
    description:
      "Hébergement sécurisé, chiffrement des données, accès contrôlé par rôle.",
    color: "bg-green-50 text-green-600",
  },
] as const;

const PLANS = [
  {
    name: "Starter",
    price: "15 000",
    interval: "mois",
    max_vehicles: 5,
    max_drivers: 10,
    highlight: false,
    features: [
      "5 véhicules",
      "10 conducteurs",
      "1 flotte",
      "Alertes documents",
      "Rapports mensuels",
      "Support email",
    ],
  },
  {
    name: "Pro",
    price: "35 000",
    interval: "mois",
    max_vehicles: 25,
    max_drivers: 50,
    highlight: true,
    features: [
      "25 véhicules",
      "50 conducteurs",
      "5 flottes",
      "Alertes avancées",
      "Export Excel & PDF",
      "Support prioritaire",
      "Tableau de bord multi-flotte",
    ],
  },
  {
    name: "Entreprise",
    price: "75 000",
    interval: "mois",
    max_vehicles: 100,
    max_drivers: 200,
    highlight: false,
    features: [
      "100 véhicules",
      "200 conducteurs",
      "20 flottes",
      "API dédiée",
      "Formations incluses",
      "SLA 99.9% garanti",
      "Manager de compte dédié",
    ],
  },
] as const;

const TESTIMONIALS = [
  {
    name: "Alioune Diop",
    role: "Directeur logistique, Dakar",
    company: "TransSen Express",
    content:
      "Depuis E-Samba, plus aucun véhicule ne roule avec une assurance expirée. Les alertes automatiques ont tout changé.",
    rating: 5,
    flag: "🇸🇳",
  },
  {
    name: "Marie-Claire Mvondo",
    role: "Gérante, Douala",
    company: "MC Transport & BTP",
    content:
      "Les rapports de dépenses nous ont permis d'identifier 2 véhicules non rentables. On a économisé 4 millions XAF en 3 mois.",
    rating: 5,
    flag: "🇨🇲",
  },
  {
    name: "Kofi Asante",
    role: "Responsable flotte, Abidjan",
    company: "CIV Delivery Co.",
    content:
      "Payer avec Orange Money directement dans l'app, c'est parfait pour nous. Aucun besoin de carte bancaire.",
    rating: 5,
    flag: "🇨🇮",
  },
] as const;

const COUNTRIES = [
  { name: "Cameroun", cities: "Douala · Yaoundé · Bafoussam", flag: "🇨🇲" },
  { name: "Sénégal", cities: "Dakar · Thiès · Saint-Louis", flag: "🇸🇳" },
  {
    name: "Côte d'Ivoire",
    cities: "Abidjan · Bouaké · Yamoussoukro",
    flag: "🇨🇮",
  },
  { name: "Gabon", cities: "Libreville · Port-Gentil", flag: "🇬🇦" },
  { name: "Congo RDC", cities: "Kinshasa · Lubumbashi", flag: "🇨🇩" },
  {
    name: "Burkina Faso",
    cities: "Ouagadougou · Bobo-Dioulasso",
    flag: "🇧🇫",
  },
] as const;

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4 fill-yellow-400 text-yellow-400"
          aria-hidden
        />
      ))}
    </div>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const context = await resolveFleetContext(supabase);

  if (context) {
    redirect("/dashboard");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/onboarding");
  }

  const jsonLd = buildLandingJsonLd();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              E-Samba<span className="text-blue-600">.com</span>
            </span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
            <Link
              href="#fonctionnalites"
              className="transition-colors hover:text-blue-600"
            >
              Fonctionnalités
            </Link>
            <Link href="#tarifs" className="transition-colors hover:text-blue-600">
              Tarifs
            </Link>
            <Link
              href="#temoignages"
              className="transition-colors hover:text-blue-600"
            >
              Témoignages
            </Link>
            <Link href="#pays" className="transition-colors hover:text-blue-600">
              Pays couverts
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/connexion">
              <Button variant="ghost" size="sm">
                Connexion
              </Button>
            </Link>
            <Link href="/inscription">
              <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700">
                Choisir une offre <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-b from-blue-50/60 to-white px-4 pb-20 pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700">
            🌍 Disponible au Cameroun, Sénégal, Côte d&apos;Ivoire et plus
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl">
            Gérez votre flotte de véhicules
            <br />
            <span className="text-blue-600">en Afrique</span>, simplement
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-gray-600">
            E-Samba.com centralise la gestion de votre parc automobile :
            documents, alertes d&apos;expiration, rapports de dépenses et
            paiements Mobile Money. Conçu pour les entreprises africaines.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/inscription">
              <Button
                size="lg"
                className="h-12 gap-2 bg-blue-600 px-8 text-base hover:bg-blue-700"
              >
                Choisir une offre
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="#fonctionnalites">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Voir les fonctionnalités
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-sm text-gray-400">
            Paiement MTN MoMo & Orange Money · Activation après validation
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
            {[
              { value: "200+", label: "Flottes actives" },
              { value: "3 200+", label: "Véhicules suivis" },
              { value: "6", label: "Pays couverts" },
              { value: "99.9%", label: "Disponibilité" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-extrabold text-blue-600">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="bg-white px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Tout ce dont vous avez besoin pour gérer votre flotte
            </h2>
            <p className="mx-auto max-w-xl text-gray-500">
              Une plateforme complète pensée pour les réalités africaines :
              Mobile Money, connectivité variable, documents physiques.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl bg-gray-50 p-6 transition-shadow hover:shadow-md"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              🟡
            </span>
            <span className="text-2xl" aria-hidden>
              🟠
            </span>
            <h2 className="text-2xl font-bold text-gray-900">
              Paiement 100% Mobile Money
            </h2>
          </div>
          <p className="mx-auto mb-6 max-w-xl text-gray-600">
            Abonnez-vous directement depuis votre téléphone avec MTN Mobile Money
            ou Orange Money. Aucune carte bancaire requise.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-white px-6 py-4 shadow-sm">
              <span className="text-3xl" aria-hidden>
                🟡
              </span>
              <div className="text-left">
                <p className="font-bold text-gray-900">MTN MoMo</p>
                <p className="text-xs text-gray-500">Cameroun · Ghana · Rwanda</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-white px-6 py-4 shadow-sm">
              <span className="text-3xl" aria-hidden>
                🟠
              </span>
              <div className="text-left">
                <p className="font-bold text-gray-900">Orange Money</p>
                <p className="text-xs text-gray-500">
                  Cameroun · Sénégal · Mali
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tarifs" className="bg-white px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Tarifs transparents en XAF
            </h2>
            <p className="text-gray-500">
              Choisissez Starter, Pro ou Entreprise selon la taille de votre flotte.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border-2 p-6 ${
                  plan.highlight
                    ? "border-blue-500 shadow-xl shadow-blue-100"
                    : "border-gray-200"
                }`}
              >
                {plan.highlight ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                    ✨ Le plus populaire
                  </div>
                ) : null}
                <h3 className="mb-1 text-xl font-bold text-gray-900">
                  {plan.name}
                </h3>
                <div className="mb-5">
                  <span className="text-3xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-sm text-gray-500">
                    {" "}
                    XAF / {plan.interval}
                  </span>
                </div>

                <ul className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/inscription">
                  <Button
                    className={`w-full ${plan.highlight ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    Choisir cette offre
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-gray-400">
            Activation après validation du paiement Mobile Money ou échange commercial.
          </p>
        </div>
      </section>

      <section id="temoignages" className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Ce que disent nos clients
            </h2>
            <p className="text-gray-500">
              Des entreprises de transport à travers l&apos;Afrique francophone
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6"
              >
                <StarRating count={t.rating} />
                <p className="text-sm italic leading-relaxed text-gray-700">
                  &ldquo;{t.content}&rdquo;
                </p>
                <div className="mt-auto flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg">
                    {t.flag}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.role} · {t.company}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pays" className="bg-white px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <Globe className="mx-auto mb-4 h-10 w-10 text-blue-600" />
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Disponible dans toute l&apos;Afrique francophone
          </h2>
          <p className="mb-10 text-gray-500">
            Interface en français, paiements locaux, support adapté à vos fuseaux
            horaires
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {COUNTRIES.map((country) => (
              <div
                key={country.name}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center transition-colors hover:border-blue-200"
              >
                <p className="mb-2 text-3xl">{country.flag}</p>
                <p className="font-semibold text-gray-900">{country.name}</p>
                <p className="mt-1 text-xs text-gray-400">{country.cities}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-600 px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Prêt à professionnaliser votre flotte ?
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            Activation rapide · Paiement Mobile Money · Accompagnement au démarrage
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/inscription">
              <Button
                size="lg"
                className="h-12 gap-2 bg-white px-8 text-base font-bold text-blue-600 hover:bg-blue-50"
              >
                Créer mon compte
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/connexion">
              <Button
                variant="outline"
                size="lg"
                className="h-12 border-blue-300 px-8 text-white hover:bg-blue-700"
              >
                Me connecter
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 px-4 py-12 text-gray-400">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white">E-Samba.com</span>
              </div>
              <p className="text-sm leading-relaxed">
                Logiciel de gestion de flotte pensé pour l&apos;Afrique
                francophone.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#fonctionnalites"
                    className="transition-colors hover:text-white"
                  >
                    Fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link
                    href="#tarifs"
                    className="transition-colors hover:text-white"
                  >
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link
                    href="/inscription"
                    className="transition-colors hover:text-white"
                  >
                    Tarifs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">
                Entreprise
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="transition-colors hover:text-white">
                    À propos
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="transition-colors hover:text-white">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="transition-colors hover:text-white"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/privacy"
                    className="transition-colors hover:text-white"
                  >
                    Confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition-colors hover:text-white">
                    CGU
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-800 pt-6 text-sm sm:flex-row">
            <p>© {new Date().getFullYear()} E-Samba.com — Tous droits réservés</p>
            <p>🇨🇲 Fait pour l&apos;Afrique · Paiements MTN MoMo & Orange Money</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
