import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildSeoIaCtaUrl } from "@/lib/seo-utm";

interface ProductBridgeCardProps {
  contentSlug: string;
}

/** Encart unique vers le produit flotte (pas de claim outil SEO). */
export function ProductBridgeCard({ contentSlug }: ProductBridgeCardProps) {
  const demoHref = buildSeoIaCtaUrl("/#contact", contentSlug);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg font-heading">Opérations B2B à l&apos;échelle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          E-Samba est une plateforme de gestion de flotte pour l&apos;Afrique centrale — pas un outil SEO.
          La gouvernance et la traçabilité de vos opérations suivent les mêmes principes qu&apos;un pipeline
          éditorial structuré.
        </p>
        <Button asChild variant="default" size="sm">
          <Link to={demoHref}>
            Demander une démo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
