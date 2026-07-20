/**
 * Formulaire de saisie et validation de code d'accès E-Samba.
 *
 * Utilisation :
 *   <AccessCodeInput onSuccess={(result) => naviguer(result)} />
 *
 * Le composant gère lui-même la validation de format (locale)
 * et la validation/consommation serveur via useAccessCode.
 */

import { useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Loader2, KeyRound, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccessCode } from "@/hooks/useAccessCode";
import { getUniverseLabel, getUniverseColorClass } from "@/lib/access/universeGuard";
import { TEMPORARY_ROLE_LABELS, INTERNAL_ROLE_LABELS } from "@/types/access";
import type { AccessCodeConsumeResult } from "@/types/access";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AccessCodeInputProps {
  /** Appelé après consommation réussie du code. */
  onSuccess?: (result: AccessCodeConsumeResult) => void;
  /** Mode aperçu : affiche les infos sans consommer le code. */
  previewOnly?: boolean;
  /** Classe CSS additionnelle pour le conteneur. */
  className?: string;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AccessCodeInput({
  onSuccess,
  previewOnly = false,
  className = "",
}: AccessCodeInputProps) {
  const [inputValue, setInputValue] = useState("");
  const {
    status,
    errorMessage,
    formatError,
    validation,
    consumeResult,
    validate,
    consume,
    reset,
    guessedRole,
    guessedUniverse,
  } = useAccessCode();

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Forcer majuscules + tirets uniquement
      const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
      setInputValue(raw);

      // Réinitialiser si le champ est effacé
      if (!raw) reset();
    },
    [reset],
  );

  const handleValidate = useCallback(async () => {
    if (!inputValue.trim()) return;
    await validate(inputValue);
  }, [inputValue, validate]);

  const handleConsume = useCallback(async () => {
    if (!inputValue.trim()) return;
    const result = await consume(inputValue);
    if (result?.valid && onSuccess) {
      onSuccess(result);
    }
  }, [inputValue, consume, onSuccess]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (status === "validated" && !previewOnly) {
          void handleConsume();
        } else if (status === "idle" || status === "error") {
          void handleValidate();
        }
      }
    },
    [status, previewOnly, handleConsume, handleValidate],
  );

  // ── État du bouton principal ─────────────────────────────────────────────────

  const isLoading = status === "validating" || status === "consuming";
  const showValidation = status === "validated" && validation;
  const showSuccess = status === "success" && consumeResult?.valid;

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Champ de saisie */}
      <div className="space-y-2">
        <Label htmlFor="access-code" className="text-sm font-medium text-gray-700">
          Code d'accès
        </Label>
        <div className="relative">
          <KeyRound
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            aria-hidden
          />
          <Input
            id="access-code"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="SAMBA-INV-ABC-0042"
            className="pl-10 uppercase tracking-widest font-mono"
            maxLength={32}
            disabled={isLoading || showSuccess}
            autoComplete="off"
            spellCheck={false}
            aria-label="Entrez votre code d'accès E-Samba"
            aria-describedby={
              errorMessage || formatError ? "access-code-error" : undefined
            }
          />
        </div>

        {/* Indicateur de rôle déduit (avant validation serveur) */}
        {guessedUniverse && !showValidation && !showSuccess && (
          <p className="text-xs text-gray-500">
            Type détecté :{" "}
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getUniverseColorClass(guessedUniverse)}`}>
              {getUniverseLabel(guessedUniverse)}
            </span>
            {guessedRole && (
              <>
                {" — "}
                {guessedRole === "investor"   ? TEMPORARY_ROLE_LABELS.investor   :
                 guessedRole === "prospect"   ? TEMPORARY_ROLE_LABELS.prospect   :
                 guessedRole === "commercial" ? INTERNAL_ROLE_LABELS.commercial  :
                 guessedRole === "dev"        ? INTERNAL_ROLE_LABELS.dev         : guessedRole}
              </>
            )}
          </p>
        )}
      </div>

      {/* Erreur de format */}
      {formatError && (
        <div
          id="access-code-error"
          role="alert"
          className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{formatError}</span>
        </div>
      )}

      {/* Erreur serveur */}
      {errorMessage && !formatError && (
        <div
          id="access-code-error"
          role="alert"
          className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Aperçu de la validation */}
      {showValidation && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Code valide
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-500">Type d'accès</dt>
            <dd>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getUniverseColorClass(validation.universe)}`}>
                {getUniverseLabel(validation.universe)}
              </span>
            </dd>
            <dt className="text-gray-500">Rôle</dt>
            <dd className="text-gray-800 capitalize">{validation.role_target}</dd>
            <dt className="text-gray-500">Durée d'accès</dt>
            <dd className="text-gray-800">{validation.access_days} jours</dd>
            <dt className="text-gray-500">Utilisations restantes</dt>
            <dd className="text-gray-800">{validation.uses_left}</dd>
            {validation.label && (
              <>
                <dt className="text-gray-500">Référence</dt>
                <dd className="text-gray-800">{validation.label}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      {/* Succès */}
      {showSuccess && consumeResult?.valid && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            Accès activé — bienvenue sur E-Samba !
          </div>
          <p className="mt-1 text-sm text-emerald-600">
            Votre accès expire dans {consumeResult.access_days} jours.
          </p>
        </div>
      )}

      {/* Boutons d'action */}
      {!showSuccess && (
        <div className="flex gap-3">
          {/* Bouton Vérifier */}
          {status !== "validated" && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleValidate}
              disabled={isLoading || !inputValue.trim()}
              aria-label="Vérifier le code sans l'activer"
            >
              {status === "validating" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Vérification…</>
              ) : (
                <><Eye className="h-4 w-4 mr-2" />Vérifier</>
              )}
            </Button>
          )}

          {/* Bouton Activer (après validation ou en mode direct) */}
          {!previewOnly && (
            <Button
              type="button"
              className="flex-1"
              onClick={handleConsume}
              disabled={isLoading || !inputValue.trim()}
              aria-label="Activer le code d'accès"
            >
              {status === "consuming" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Activation…</>
              ) : (
                "Activer mon accès"
              )}
            </Button>
          )}

          {/* Bouton Réinitialiser (si validation ok) */}
          {showValidation && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => { reset(); setInputValue(""); }}
              aria-label="Saisir un autre code"
            >
              Changer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
