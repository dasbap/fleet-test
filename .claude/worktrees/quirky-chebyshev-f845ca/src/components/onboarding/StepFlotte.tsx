import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { OnboardingData } from '@/types/onboarding';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from '@/hooks/use-toast';
import { formatPostgrestError, mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';

type Data = NonNullable<OnboardingData['step1']>;

interface Props {
  orgId: string;
  initial?: Data;
  onNext: (d: Data) => void;
  onSkip: () => void;
}

const VEHICLE_TYPES: Array<{ label: string; value: Data['type'] }> = [
  { label: 'Berline', value: 'berline' },
  { label: 'Pick-up', value: 'pickup' },
  { label: '4x4', value: '4x4' },
  { label: 'Camionnette', value: 'camionnette' },
  { label: 'Bus', value: 'bus' },
  { label: 'Camion', value: 'camion' },
];

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

export function StepFlotte({ orgId, initial, onNext, onSkip }: Props) {
  const [form, setForm] = useState<Partial<Data>>(initial ?? {});
  const { saveStep1, isSaving } = useOnboarding(orgId);

  const isValid = useMemo(() => {
    return Boolean(form.plate?.trim() && form.brand && form.type);
  }, [form.brand, form.plate, form.type]);

  async function handleSubmit() {
    if (!isValid || isSaving) return;
    try {
      const payload: Data = {
        plate: normalizePlate(form.plate ?? ''),
        brand: form.brand ?? '',
        model: (form.model ?? '').trim(),
        km: form.km ?? 0,
        type: form.type as Data['type'],
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
            Plaque d'immatriculation
          </label>
          <input
            type="text"
            placeholder="AB 123 CD"
            maxLength={10}
            value={form.plate ?? ''}
            onChange={e => setForm(prev => ({ ...prev, plate: e.target.value }))}
            className="h-9 w-full rounded-md border border-surface-raised bg-surface px-3 text-sm font-mono tracking-widest uppercase focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Marque
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
              Kilométrage
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

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Type de véhicule
          </label>
          <div className="grid grid-cols-3 gap-2">
            {VEHICLE_TYPES.map(vehicleType => (
              <button
                key={vehicleType.value}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, type: vehicleType.value }))}
                className={cn(
                  'h-9 rounded-md border text-xs font-medium transition-colors',
                  form.type === vehicleType.value
                    ? 'border-brand bg-brand-light/20 text-brand-dark'
                    : 'border-surface-raised bg-surface text-slate-600 hover:bg-surface-raised',
                )}
              >
                {vehicleType.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button onClick={onSkip} className="text-xs text-slate-400 underline hover:text-slate-500">
          Passer cette étape
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSaving}
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? 'Enregistrement...' : 'Continuer ->'}
        </button>
      </div>
    </div>
  );
}
