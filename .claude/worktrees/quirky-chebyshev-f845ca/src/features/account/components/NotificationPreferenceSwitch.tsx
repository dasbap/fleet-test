import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";

interface NotificationPreferenceSwitchProps {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * Interrupteur notifications (état piloté par le store / futur API).
 */
export function NotificationPreferenceSwitch({
  checked,
  onCheckedChange,
  disabled,
}: NotificationPreferenceSwitchProps) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <Bell
          className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div>
          <Label
            htmlFor="account-notifications"
            className="text-base font-medium leading-none"
          >
            Notifications push
          </Label>
          <p className="text-muted-foreground mt-1 text-xs">
            Alertes missions, entretien et sécurité (simulation locale)
          </p>
        </div>
      </div>
      <Switch
        id="account-notifications"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label="Activer les notifications"
      />
    </div>
  );
}
