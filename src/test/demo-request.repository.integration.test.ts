import { beforeEach, describe, expect, it, vi } from "vitest";

import { DemoRequestRepository } from "@/repositories/demo-request.repository";

const input = {
  full_name: "Jean Dupont",
  email: "contact@transcam.cm",
  company: "TransCam",
  phone: "+237600000000",
  company_identifier: "RCCM-123",
  country_code: "CM",
};

const fetchMock = vi.fn();

function response(status: number, body: object) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe("DemoRequestRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(response(201, { ok: true }));
  });

  it("uses the verified token for the BFF request", async () => {
    const repository = new DemoRequestRepository();
    await repository.create(input, "verified-jwt");

    expect(fetchMock).toHaveBeenCalledWith("/api/demo/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer verified-jwt",
      },
      body: JSON.stringify(input),
    });
  });

  it("turns a deployment failure into a user-facing configuration error", async () => {
    fetchMock.mockResolvedValue(response(503, { ok: false, error: "server_configuration_error" }));

    const repository = new DemoRequestRepository();
    await expect(repository.create(input, "verified-jwt")).rejects.toThrow(
      "Le service de demande de démo n'est pas encore configuré sur cet environnement. Réessayez plus tard.",
    );
  });

  it("rejects duplicate demo emails with a clear message", async () => {
    fetchMock.mockResolvedValue(response(409, { ok: false, error: "demo_email_already_used" }));
    const repository = new DemoRequestRepository();

    await expect(repository.create(input, "verified-jwt")).rejects.toThrow(
      "Cette adresse e-mail a déjà été utilisée pour une demande E-Samba.",
    );
  });
});
