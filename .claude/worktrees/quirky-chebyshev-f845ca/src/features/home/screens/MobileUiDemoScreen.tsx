import * as React from "react";
import {
  MobileBadge,
  MobileButton,
  MobileCard,
  MobileHeader,
  MobileListItem,
  MobileSectionTitle,
} from "@/components/mobile/ui";

export const MobileUiDemoScreen: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MobileHeader
        title="UI mobile"
        subtitle="Kit de base démonstration"
      />

      <main className="flex-1 space-y-4 pb-6 pt-2">
        <MobileSectionTitle
          inset="padded"
          title="Actions principales"
          description="Boutons adaptés au mobile avec différentes variantes."
        />

        <div className="space-y-3 px-4">
          <MobileButton fullWidth>Action principale</MobileButton>
          <MobileButton variant="secondary" fullWidth>
            Action secondaire
          </MobileButton>
          <MobileButton variant="ghost" fullWidth>
            Action discrète
          </MobileButton>
        </div>

        <MobileSectionTitle inset="padded" title="Cartes" />

        <div className="space-y-3 px-4">
          <MobileCard elevated>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Flotte principale</p>
                <p className="text-xs text-muted-foreground">
                  24 véhicules actifs
                </p>
              </div>
              <MobileBadge variant="success">Opérationnel</MobileBadge>
            </div>
          </MobileCard>
        </div>

        <MobileSectionTitle inset="padded" title="Liste" />

        <div className="mt-1 divide-y divide-border bg-card">
          <MobileListItem
            title="INC-2026-001"
            subtitle="Panne moteur – Dakar"
            meta={<MobileBadge variant="warning">En cours</MobileBadge>}
          />
          <MobileListItem
            title="INC-2026-002"
            subtitle="Pneumatique – Abidjan"
            meta={<MobileBadge variant="success">Résolu</MobileBadge>}
          />
        </div>
      </main>
    </div>
  );
};

