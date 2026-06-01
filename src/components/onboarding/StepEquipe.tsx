import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from '@/hooks/use-toast';
import type { OnboardingStep3Data } from '@/types/onboarding';
import { z } from 'zod';
import { OnboardingStepFooter } from '@/components/onboarding/OnboardingStepFooter';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/navigation/routePaths';

interface StepEquipeProps {
  orgId: string;
  initial?: OnboardingStep3Data;
  onNext: (data: OnboardingStep3Data) => void | Promise<void>;
  onBack?: () => void;
  onSkip?: () => void | Promise<void>;
}

export function StepEquipe({ orgId, initial, onNext, onBack, onSkip }: StepEquipeProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState<string[]>(initial?.invites ?? []);
  const { saveStep, isSaving } = useOnboarding(orgId);
  const emailSchema = z.string().email('Adresse e-mail invalide.');

  const addInvite = () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    if (!emailSchema.safeParse(normalized).success) {
      toast({
        title: 'E-mail invalide',
        description: 'Saisissez une adresse e-mail valide.',
        variant: 'destructive',
      });
      return;
    }
    if (invites.includes(normalized)) {
      setEmail('');
      toast({
        title: 'Deja ajoute',
        description: 'Cette adresse est deja dans la liste.',
      });
      return;
    }
    setInvites(prev => [...prev, normalized]);
    setEmail('');
  };

  const removeInvite = (target: string) => {
    setInvites(prev => prev.filter(item => item !== target));
  };

  const handleSubmit = async () => {
    try {
      const payload: OnboardingStep3Data = { invites };
      await saveStep(3, { step3: payload });
      await onNext(payload);
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible de sauvegarder l'étape équipe pour le moment.",
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-lg font-medium text-slate-900 dark:text-slate-100">Invitez votre équipe</h2>
        <p className="text-sm text-slate-500">
          Ajoutez des e-mails maintenant. Les invitations sont enregistrees ici, puis envoyees depuis l&apos;espace Equipe.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addInvite();
            }
          }}
          placeholder="membre@exemple.com"
          className="h-9 w-full rounded-md border border-surface-raised bg-surface px-3 text-sm focus:border-brand focus:outline-none"
        />
        <button type="button" onClick={addInvite} className="rounded-md border px-3 py-2 text-sm">
          Ajouter
        </button>
      </div>

      <div className="space-y-2">
        {invites.length === 0 ? (
          <p className="text-xs text-slate-500">Aucune invitation ajoutée.</p>
        ) : (
          invites.map(item => (
            <div key={item} className="flex items-center justify-between rounded-md border border-surface-raised px-3 py-2">
              <span className="text-sm">{item}</span>
              <button type="button" onClick={() => removeInvite(item)} className="text-xs text-slate-500 underline">
                Retirer
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(ROUTE_PATHS.dashboardTeams)}
          className="text-xs text-slate-400 underline hover:text-slate-300"
        >
          Gerer les invitations dans Equipe
        </button>

        <OnboardingStepFooter
          onBack={onBack}
          onSkip={onSkip}
          onSubmit={handleSubmit}
          submitLabel="Continuer"
          isSubmitting={isSaving}
        />
      </div>
    </div>
  );
}
