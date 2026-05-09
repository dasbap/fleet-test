/**
 * Widget NPS (note + tags + commentaire) — persistance via FeedbackService / Supabase.
 *
 * Alignement `public.feedback` + RLS : l’insertion réelle passe par `useSubmitFeedback`
 * (`fleet_id`, `user_id` depuis la session), colonnes `message`, `rating`, `nps_trigger`,
 * `entity_id`, `entity_type`. Les politiques `feedback_insert_own` exigent
 * `auth.uid() = user_id` et une adhésion active à `fleet_id`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { FeedbackNpsTrigger } from "@/repositories/feedback.repository";
import { useSubmitFeedback } from "@/hooks/useFeedback";

const TRIGGER_COPY: Record<
  FeedbackNpsTrigger,
  { question: string; context: string }
> = {
  alert_resolved: {
    question: "Comment s'est passée la résolution de cette alerte ?",
    context: "Alerte résolue",
  },
  maintenance_closed: {
    question: "Êtes-vous satisfait de cet entretien ?",
    context: "Entretien clôturé",
  },
  first_month: {
    question: "Comment évaluez-vous E-Samba après un mois d'utilisation ?",
    context: "30 jours avec E-Samba",
  },
  manual: {
    question: "Comment évaluez-vous E-Samba ?",
    context: "Votre avis",
  },
};

const SCORE_LABELS = [
  "",
  "Très insatisfait",
  "Insatisfait",
  "Neutre",
  "Satisfait",
  "Très satisfait",
];
const SCORE_COLORS = [
  "",
  "text-red-400",
  "text-orange-400",
  "text-amber-400",
  "text-lime-400",
  "text-brand-light",
];

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={cn(
              "transition-all duration-100 disabled:cursor-default",
              disabled ? "scale-100" : "hover:scale-110 active:scale-95",
            )}
            aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
          >
            <svg
              viewBox="0 0 20 20"
              className={cn(
                "h-7 w-7 transition-colors",
                active ? "text-amber-400" : "text-slate-700",
              )}
              fill={active ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={active ? 0 : 1.5}
            >
              <path
                d="M10 1.5l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.77l-4.77 2.44.91-5.32L2.27 7.12l5.34-.78L10 1.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
      {(hover || value) > 0 && (
        <span
          className={cn(
            "ml-1 text-xs font-medium transition-colors",
            SCORE_COLORS[hover || value],
          )}
        >
          {SCORE_LABELS[hover || value]}
        </span>
      )}
    </div>
  );
}

const TAGS_BY_SCORE: Record<number, string[]> = {
  1: ["Trop lent", "Interface confuse", "Données incorrectes", "Bug bloquant"],
  2: [
    "Manque de fonctionnalités",
    "Navigation difficile",
    "Alertes en retard",
    "Données manquantes",
  ],
  3: ["Correct", "Quelques améliorations possibles", "Manque de personnalisation"],
  4: ["Rapide", "Alertes utiles", "Interface claire", "Bon suivi"],
  5: ["Excellent outil", "Gain de temps", "Très intuitif", "Alertes précises"],
};

type WidgetStep = "rating" | "comment" | "thanks";

export interface FeedbackWidgetProps {
  trigger: FeedbackNpsTrigger;
  entityId?: string;
  entityType?: "vehicle" | "maintenance" | "alert";
  onDismiss?: () => void;
  /** Après envoi réussi (données déjà persistées). */
  onSubmitted?: (payload: {
    trigger: FeedbackNpsTrigger;
    entityId?: string;
    entityType?: "vehicle" | "maintenance" | "alert";
    score: number;
    message: string;
  }) => void;
  position?: "bottom-right" | "bottom-left" | "inline";
}

export function FeedbackWidget({
  trigger,
  entityId,
  entityType,
  onDismiss,
  onSubmitted,
  position = "bottom-right",
}: FeedbackWidgetProps) {
  const submitFeedback = useSubmitFeedback({ suppressSuccessToast: true });
  const [step, setStep] = useState<WidgetStep>("rating");
  const [score, setScore] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [visible, setVisible] = useState(false);
  const stepTimerRef = useRef<number | undefined>(undefined);
  const dismissTimerRef = useRef<number | undefined>(undefined);
  const dismissCallbackTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), 300);
    return () => {
      window.clearTimeout(showTimer);
      if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
      if (dismissCallbackTimerRef.current) window.clearTimeout(dismissCallbackTimerRef.current);
    };
  }, []);

  const copy = TRIGGER_COPY[trigger];

  const handleScoreChange = (v: number) => {
    setScore(v);
    if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);
    stepTimerRef.current = window.setTimeout(() => setStep("comment"), 600);
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = useCallback(async () => {
    if (!score) return;

    const fullComment = [...tags, comment.trim()].filter(Boolean).join(" · ");

    try {
      await submitFeedback.mutateAsync({
        message: fullComment,
        rating: score as 1 | 2 | 3 | 4 | 5,
        npsTrigger: trigger,
        entityId: entityId ?? null,
        entityType: entityType ?? null,
      });
      onSubmitted?.({
        trigger,
        entityId,
        entityType,
        score,
        message: fullComment,
      });
      setStep("thanks");
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
      if (dismissCallbackTimerRef.current) window.clearTimeout(dismissCallbackTimerRef.current);
      dismissTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        dismissCallbackTimerRef.current = window.setTimeout(() => onDismiss?.(), 400);
      }, 2400);
    } catch {
      /* toast géré par useSubmitFeedback */
    }
  }, [
    score,
    tags,
    comment,
    trigger,
    entityId,
    entityType,
    submitFeedback,
    onDismiss,
    onSubmitted,
  ]);

  const handleDismiss = () => {
    setVisible(false);
    if (dismissCallbackTimerRef.current) window.clearTimeout(dismissCallbackTimerRef.current);
    dismissCallbackTimerRef.current = window.setTimeout(() => onDismiss?.(), 300);
  };

  const positionClass = {
    "bottom-right": "fixed bottom-6 right-6 z-50",
    "bottom-left": "fixed bottom-6 left-6 z-50",
    inline: "relative",
  }[position];

  const loading = submitFeedback.isPending;

  return (
    <div
      className={cn(
        positionClass,
        "w-80 transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      )}
    >
      <div className="rounded-card border border-surface-raised bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-raised bg-surface-raised/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {trigger === "alert_resolved"
                ? "✅"
                : trigger === "maintenance_closed"
                  ? "🔧"
                  : trigger === "first_month"
                    ? "🎉"
                    : "💬"}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {copy.context}
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded p-1 text-slate-600 hover:text-slate-300 transition-colors"
            aria-label="Fermer"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {step === "rating" && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-200 leading-relaxed">
                {copy.question}
              </p>
              <StarRating value={score} onChange={handleScoreChange} />
              <p className="text-xs text-slate-600">
                Votre avis aide à améliorer E-Samba pour toute la flotte.
              </p>
            </div>
          )}

          {step === "comment" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StarRating value={score} onChange={setScore} disabled />
              </div>

              {TAGS_BY_SCORE[score] && (
                <div className="flex flex-wrap gap-1.5">
                  {TAGS_BY_SCORE[score].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-all",
                        tags.includes(tag)
                          ? "border-brand/50 bg-brand/15 text-brand-light"
                          : "border-surface-raised text-slate-400 hover:border-slate-500",
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Commentaire libre (optionnel)…"
                rows={2}
                className="w-full resize-none rounded-card border border-surface-raised bg-surface-raised px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-brand focus:outline-none transition"
              />

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Passer
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-1.5 rounded-card bg-brand px-4 py-1.5 text-xs font-medium text-white",
                    "hover:bg-brand-dark disabled:opacity-50 transition",
                  )}
                >
                  {loading ? "Envoi…" : "Envoyer"}
                  {!loading && (
                    <svg
                      viewBox="0 0 12 12"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        d="M2 6h8M6 2l4 4-4 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === "thanks" && (
            <div className="py-2 text-center space-y-2">
              <div className="text-2xl">🙏</div>
              <p className="text-sm font-medium text-slate-200">
                Merci pour votre retour !
              </p>
              <p className="text-xs text-slate-500">
                Votre avis est pris en compte pour améliorer E-Samba.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
