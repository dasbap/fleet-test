import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackWidget } from "@/components/shared/FeedbackWidget";

/**
 * Tests du widget : le payload attendu par `useSubmitFeedback` reflète le schéma
 * `public.feedback` (voir migrations `20260410091000_feedback.sql`,
 * `20260412120000_feedback_nps_context.sql`) et ce que `FeedbackRepository.create`
 * envoie à PostgREST.
 *
 * La couche RLS n’est pas rejouée dans ces tests (pas de session Supabase réelle) ;
 * le test d’échec simule une erreur typique côté client pour vérifier l’absence de
 * faux positif « Merci ».
 */

const { mutateAsync } = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks/useFeedback", () => ({
  useSubmitFeedback: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

async function goToCommentStep(rating: number) {
  fireEvent.click(
    screen.getByRole("button", {
      name: new RegExp(`^${rating} étoile`, "i"),
    }),
  );
  await waitFor(() => {
    expect(screen.getByPlaceholderText(/Commentaire libre/i)).toBeInTheDocument();
  });
}

describe("FeedbackWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue(undefined);
  });

  it("soumet rating, npsTrigger et message (colonnes message / rating / nps_trigger)", async () => {
    render(
      <FeedbackWidget trigger="manual" onDismiss={vi.fn()} position="inline" />,
    );

    await goToCommentStep(4);

    fireEvent.change(screen.getByPlaceholderText(/Commentaire libre/i), {
      target: { value: "Très bien" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Envoyer$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 4,
          npsTrigger: "manual",
          message: "Très bien",
          entityId: null,
          entityType: null,
        }),
      );
    });
  });

  it("transmet entityId et entityType pour un déclencheur contextualisé", async () => {
    render(
      <FeedbackWidget
        trigger="alert_resolved"
        entityId="550e8400-e29b-41d4-a716-446655440000"
        entityType="alert"
        onDismiss={vi.fn()}
        position="inline"
      />,
    );

    await goToCommentStep(5);

    fireEvent.change(screen.getByPlaceholderText(/Commentaire libre/i), {
      target: { value: "OK" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Envoyer$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          npsTrigger: "alert_resolved",
          entityId: "550e8400-e29b-41d4-a716-446655440000",
          entityType: "alert",
          rating: 5,
          message: "OK",
        }),
      );
    });
  });

  it("concatène tags et texte libre dans message (séparateur ·)", async () => {
    render(
      <FeedbackWidget trigger="manual" onDismiss={vi.fn()} position="inline" />,
    );

    await goToCommentStep(2);

    fireEvent.click(screen.getByRole("button", { name: /^Manque de fonctionnalités$/ }));
    fireEvent.change(screen.getByPlaceholderText(/Commentaire libre/i), {
      target: { value: "Détail" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Envoyer$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Manque de fonctionnalités · Détail",
          rating: 2,
        }),
      );
    });
  });

  it("appelle onSubmitted après persistance réussie", async () => {
    const onSubmitted = vi.fn();
    render(
      <FeedbackWidget
        trigger="maintenance_closed"
        entityId="a"
        entityType="maintenance"
        onDismiss={vi.fn()}
        onSubmitted={onSubmitted}
        position="inline"
      />,
    );

    await goToCommentStep(3);
    fireEvent.click(screen.getByRole("button", { name: /^Envoyer$/i }));

    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: "maintenance_closed",
          entityId: "a",
          entityType: "maintenance",
          score: 3,
          message: "",
        }),
      );
    });
  });

  it("n’affiche pas l’étape de remerciement si l’envoi échoue (ex. RLS / réseau)", async () => {
    mutateAsync.mockRejectedValueOnce(new Error("new row violates row-level security policy"));

    render(
      <FeedbackWidget trigger="manual" onDismiss={vi.fn()} position="inline" />,
    );

    await goToCommentStep(4);
    fireEvent.click(screen.getByRole("button", { name: /^Envoyer$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });

    expect(screen.queryByText(/Merci pour votre retour/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Commentaire libre/i)).toBeInTheDocument();
  });

  it("appelle onDismiss après « Passer » (fermeture sans envoi)", async () => {
    const onDismiss = vi.fn();

    render(
      <FeedbackWidget trigger="manual" onDismiss={onDismiss} position="inline" />,
    );

    await goToCommentStep(4);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /^Passer$/i }));

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
