import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_CATEGORY_VALUES,
  type IncidentCategory,
} from "@/types/incident-declaration";
import type { Control } from "react-hook-form";
import type { IncidentDeclarationFormValues } from "@/features/incidents/declare/incidentDeclarationSchema";

interface IncidentCategorySelectProps {
  control: Control<IncidentDeclarationFormValues>;
  disabled?: boolean;
}

/**
 * Liste déroulante des types d’incident (catégories métier).
 */
export function IncidentCategorySelect({ control, disabled }: IncidentCategorySelectProps) {
  return (
    <FormField
      control={control}
      name="incident_category"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>Type d’incident</FormLabel>
          <Select
            disabled={disabled}
            value={field.value}
            onValueChange={(v) => field.onChange(v as IncidentCategory)}
          >
            <FormControl>
              <SelectTrigger id="incident-category" aria-invalid={!!fieldState.error}>
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {INCIDENT_CATEGORY_VALUES.map((key) => (
                <SelectItem key={key} value={key}>
                  {INCIDENT_CATEGORY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
