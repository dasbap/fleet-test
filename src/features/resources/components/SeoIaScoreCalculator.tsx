import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const CRITERIA = [
  { id: "semantic", label: "Couverture sémantique", max: 25 },
  { id: "structure", label: "Structure Hn", max: 15 },
  { id: "readability", label: "Lisibilité", max: 15 },
  { id: "links", label: "Maillage interne", max: 15 },
  { id: "originality", label: "Originalité", max: 15 },
  { id: "eeat", label: "E-E-A-T", max: 15 },
] as const;

/** Calculateur statique — aide à la décision, sans API. */
export function SeoIaScoreCalculator() {
  const [scores, setScores] = useState<Record<string, number>>({
    semantic: 18,
    structure: 12,
    readability: 11,
    links: 10,
    originality: 12,
    eeat: 10,
  });

  const total = useMemo(
    () => Object.values(scores).reduce((a, b) => a + b, 0),
    [scores]
  );

  const recommendation =
    total >= 70 ? "Publication possible après relecture ciblée." : "Révision recommandée avant publication.";

  return (
    <Card className="my-10">
      <CardHeader>
        <CardTitle className="text-lg">Calculateur de score contenu IA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {CRITERIA.map((c) => (
          <div key={c.id} className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>{c.label}</Label>
              <span className="text-muted-foreground">
                {scores[c.id]}/{c.max}
              </span>
            </div>
            <Slider
              value={[scores[c.id] ?? 0]}
              max={c.max}
              step={1}
              onValueChange={([v]) => setScores((prev) => ({ ...prev, [c.id]: v }))}
            />
          </div>
        ))}
        <p className="text-lg font-semibold">
          Score total : {total}/100
        </p>
        <p className="text-sm text-muted-foreground">{recommendation}</p>
      </CardContent>
    </Card>
  );
}
