import { useMemo, useState } from 'react';
import type { OnboardingData } from '@/types/onboarding';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from '@/hooks/use-toast';
import { formatPostgrestError, mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';
import { OnboardingStepFooter } from '@/components/onboarding/OnboardingStepFooter';

type Data = NonNullable<OnboardingData['step1']>;

interface Props {
  orgId: string;
  initial?: Data;
  onNext: (d: Data) => void;
  onSkip: () => void;
}

const BRANDS = [
  'Toyota',
  'Isuzu',
  'Mitsubishi',
  'Mercedes',
  'Ford',
  'Renault',
  'Peugeot',
  'Hyundai',
] as const;

function normalizePlate(value: string): string {
  return value.toUpperCase().trim().replace(/\s+/g, ' ');
}

function OptionalHint() {
  return <span className="font-normal normal-case text-slate-400">(optionnel)</span>;
}

export function StepFlotte({ orgId, initial, onNext, onSkip }: Props) {
  const [form, setForm] = useState<Partial<Data>>(initial ?? {});
  const { saveStep1, isSaving } = useOnboarding(orgId);

  const isValid = useMemo(() => Boolean(form.plate?.trim()), [form.plate]);

  async function handleSubmit() {
    if (!isValid || isSaving) return;
    try {
      const payload: Data = {
        plate: normalizePlate(form.plate ?? ''),
        km: form.km ?? 0,
        ...(form.brand?.trim() ? { brand: form.brand.trim() } : {}),
        ...(form.model?.trim() ? { model: form.model.trim() } : {}),
      };
      await saveStep1(payload);
      onNext(payload);
    } catch (error) {
      const detail = mapSupabaseErrorToFrench(formatPostgrestError(error));
      toast({
        title: 'Erreur',
        description: detail || "Impossible de sauvegarder l'étape flotte pour le moment.",
        variant: 'destructive',
      });
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-medium text-slate-900 dark:text-slate-100">
        Ajoutez votre premier véhicule
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        Commencez par enregistrer un véhicule. Vous pourrez en ajouter d'autres ensuite.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Plaque d'immatriculation <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="ex: LT 456 A CM"
            maxLength={15}
            value={form.plate ?? ''}
            onChange={e => setForm(prev => ({ ...prev, plate: e.target.value }))}
            className="h-9 w-full rounded-md border border-surface-raised bg-surface px-3 text-sm font-mono tracking-widest uppercase focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Marque <OptionalHint />
            </label>
            <select
              value={form.brand ?? ''}
              onChange={e => setForm(prev => ({ ...prev, brand: e.target.value }))}
              className="h-9 w-full rounded-md border border-surface-raised bg-surface px-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">Sélectionner</option>
              {BRANDS.map(brand => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Modèle <OptionalHint />
            </label>
            <input
              type="text"
              placeholder="Hilux"
              value={form.model ?? ''}
              onChange={e => setForm(prev => ({ ...prev, model: e.target.value }))}
              className="h-9 w-full rounded-md border border-surface-raised bg-surface px-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Kilométrage <OptionalHint />
          </label>
          <input
            type="number"
            min={0}
            placeholder="45 000"
            value={form.km ?? ''}
            onChange={e => setForm(prev => ({ ...prev, km: Math.max(0, Number(e.target.value) || 0) }))}
            className="h-9 w-full rounded-md border border-surface-raised bg-surface px-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <OnboardingStepFooter
        onSkip={onSkip}
        onSubmit={handleSubmit}
        submitLabel="Continuer"
        isSubmitting={isSaving}
        isSubmitDisabled={!isValid}
        className="justify-end"
      />

      <p className="mt-3 text-center text-xs text-slate-500">Vous pourrez compléter les détails plus tard.</p>
    </div>
  );
}
