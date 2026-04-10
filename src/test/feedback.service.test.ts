import { describe, expect, it, vi } from "vitest";
import { FeedbackService } from "@/services/feedback.service";
import type { FeedbackRepository } from "@/repositories/feedback.repository";

function createRepositoryMock() {
  return {
    create: vi.fn(),
  };
}

describe("FeedbackService", () => {
  it("refuse un feedback sans flotte active", async () => {
    const repo = createRepositoryMock();
    const service = new FeedbackService(repo as unknown as FeedbackRepository);

    await expect(
      service.submitFeedback({
        fleetId: "",
        userId: "user-1",
        message: "Très bien",
        rating: 5,
      })
    ).rejects.toThrow("La flotte active est requise pour envoyer un feedback.");
  });

  it("normalise et délègue la création au repository", async () => {
    const repo = createRepositoryMock();
    const service = new FeedbackService(repo as unknown as FeedbackRepository);

    await service.submitFeedback({
      fleetId: "fleet-1",
      userId: "user-1",
      message: "  Service top  ",
      rating: 4,
    });

    expect(repo.create).toHaveBeenCalledWith({
      fleet_id: "fleet-1",
      user_id: "user-1",
      message: "Service top",
      rating: 4,
    });
  });
});
