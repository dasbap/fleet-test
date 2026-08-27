import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));

import { SendWhatsappEdgeService } from "@/services/send-whatsapp-edge.service";
import { INTERACTIVE_TEMPLATE_BUTTONS } from "@/constants/whatsapp-templates";

describe("send whatsapp edge mutation coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates required fields", async () => {
    const service = new SendWhatsappEdgeService();
    await expect(service.send({ fleetId: "", templateName: "maintenance_alert_assigned_fr", recipientUserId: "u" })).rejects.toThrow("fleetId requis");
    await expect(service.send({ fleetId: "f", templateName: "" as any, recipientUserId: "u" })).rejects.toThrow("templateName requis");
    await expect(service.send({ fleetId: "f", templateName: "maintenance_alert_assigned_fr" })).rejects.toThrow("recipientUserId ou recipientPhone requis");
  });

  it("sends notification templates with default language and empty variables", async () => {
    invoke.mockResolvedValue({ data: { success: true, providerMessageId: "m1" }, error: null });
    const service = new SendWhatsappEdgeService();
    await expect(service.send({ fleetId: "f1", alertId: "a1", recipientUserId: "u1", templateName: "maintenance_alert_assigned_fr" })).resolves.toEqual({ success: true, providerMessageId: "m1" });
    expect(invoke).toHaveBeenCalledWith("send-whatsapp", { body: { fleetId: "f1", alertId: "a1", recipientUserId: "u1", recipientPhone: undefined, templateName: "maintenance_alert_assigned_fr", languageCode: "fr", variables: [], buttonComponents: undefined } });
  });

  it("auto injects interactive buttons", async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    const service = new SendWhatsappEdgeService();
    await service.send({ fleetId: "f", recipientPhone: "+237600", templateName: "shift_close_reminder_qr_fr", languageCode: "en", variables: ["x"] });
    expect(invoke).toHaveBeenCalledWith("send-whatsapp", { body: expect.objectContaining({ recipientPhone: "+237600", recipientUserId: undefined, languageCode: "en", variables: ["x"], buttonComponents: INTERACTIVE_TEMPLATE_BUTTONS.shift_close_reminder_qr_fr }) });
  });

  it("prefers explicit button components even for interactive templates", async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    const custom = [{ type: "QUICK_REPLY", text: "Custom" }];
    await new SendWhatsappEdgeService().send({ fleetId: "f", recipientUserId: "u", templateName: "shift_open_reminder_cta_fr", buttonComponents: custom });
    expect(invoke).toHaveBeenCalledWith("send-whatsapp", { body: expect.objectContaining({ buttonComponents: custom }) });
  });

  it("omits empty explicit buttons", async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    await new SendWhatsappEdgeService().send({ fleetId: "f", recipientUserId: "u", templateName: "maintenance_alert_resolved_fr", buttonComponents: [] });
    expect(invoke).toHaveBeenCalledWith("send-whatsapp", { body: expect.objectContaining({ buttonComponents: undefined }) });
  });

  it("propagates function invocation errors with and without messages", async () => {
    const service = new SendWhatsappEdgeService();
    invoke.mockResolvedValueOnce({ data: null, error: { message: "edge down" } });
    await expect(service.send({ fleetId: "f", recipientUserId: "u", templateName: "maintenance_alert_assigned_fr" })).rejects.toThrow("edge down");
    invoke.mockResolvedValueOnce({ data: null, error: { message: "" } });
    await expect(service.send({ fleetId: "f", recipientUserId: "u", templateName: "maintenance_alert_assigned_fr" })).rejects.toThrow("Échec de l'envoi WhatsApp.");
  });

  it("rejects null failed and error responses", async () => {
    const service = new SendWhatsappEdgeService();
    invoke.mockResolvedValueOnce({ data: null, error: null });
    await expect(service.send({ fleetId: "f", recipientUserId: "u", templateName: "maintenance_alert_assigned_fr" })).rejects.toThrow("Échec de l'envoi WhatsApp.");
    invoke.mockResolvedValueOnce({ data: { success: false, error: "provider rejected" }, error: null });
    await expect(service.send({ fleetId: "f", recipientUserId: "u", templateName: "maintenance_alert_assigned_fr" })).rejects.toThrow("provider rejected");
    invoke.mockResolvedValueOnce({ data: { success: false }, error: null });
    await expect(service.send({ fleetId: "f", recipientUserId: "u", templateName: "maintenance_alert_assigned_fr" })).rejects.toThrow("Échec de l'envoi WhatsApp.");
  });
});
