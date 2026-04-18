import { useCallback, useState } from "react";
import type { FeedbackNpsTrigger } from "@/repositories/feedback.repository";

export interface FeedbackPromptState {
  show: boolean;
  trigger: FeedbackNpsTrigger;
  entityId?: string;
  entityType?: "vehicle" | "maintenance" | "alert";
  dismiss: () => void;
  fire: (
    t: FeedbackNpsTrigger,
    id?: string,
    type?: "vehicle" | "maintenance" | "alert",
  ) => void;
}

const COOLDOWN_KEY = "esamba_feedback_last";
const DEFAULT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface UseFeedbackPromptOptions {
  userId: string;
  /** Inclure la flotte pour éviter un cooldown global entre flottes. */
  fleetId: string | null;
  cooldownMs?: number;
}

/**
 * Affiche le widget NPS au bon moment, avec délai minimal entre deux sondages (localStorage).
 */
export function useFeedbackPrompt({
  userId,
  fleetId,
  cooldownMs = DEFAULT_COOLDOWN_MS,
}: UseFeedbackPromptOptions): FeedbackPromptState {
  const [show, setShow] = useState(false);
  const [trigger, setTrigger] = useState<FeedbackNpsTrigger>("manual");
  const [entityId, setEntityId] = useState<string | undefined>();
  const [entityType, setEntityType] = useState<
    "vehicle" | "maintenance" | "alert" | undefined
  >();

  const storageKey = fleetId
    ? `${COOLDOWN_KEY}_${userId}_${fleetId}`
    : `${COOLDOWN_KEY}_${userId}`;

  const isInCooldown = useCallback(() => {
    const last = localStorage.getItem(storageKey);
    if (!last) return false;
    return Date.now() - Number(last) < cooldownMs;
  }, [storageKey, cooldownMs]);

  const fire = useCallback(
    (
      t: FeedbackNpsTrigger,
      id?: string,
      type?: "vehicle" | "maintenance" | "alert",
    ) => {
      if (isInCooldown()) return;
      setTrigger(t);
      setEntityId(id);
      setEntityType(type);
      setShow(true);
    },
    [isInCooldown],
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(storageKey, String(Date.now()));
    setShow(false);
  }, [storageKey]);

  return { show, trigger, entityId, entityType, dismiss, fire };
}
