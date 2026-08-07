import { supabase } from "@/integrations/supabase/client";
import type {
  AdminDemoRequest,
  DemoRequestAutoDecision,
  DemoRequestStatus,
} from "@/types/demo-request";

export class DemoRequestSchemaMissingError extends Error {
  code = "DEMO_REQUEST_SCHEMA_MISSING" as const;

  constructor(message = "La migration des demandes demo n'est pas encore appliquee.") {
    super(message);
    this.name = "DemoRequestSchemaMissingError";
  }
}

export function isDemoRequestSchemaMissingError(error: unknown): error is DemoRequestSchemaMissingError {
  return error instanceof DemoRequestSchemaMissingError
    || (typeof error === "object"
      && error !== null
      && "code" in error
      && error.code === "DEMO_REQUEST_SCHEMA_MISSING");
}

function throwDemoRequestError(error: { code?: string; message?: string } | null): never {
  const message = error?.message ?? "Action impossible.";
  if (
    error?.code === "PGRST202"
    || message.includes("admin_list_demo_requests")
    || message.includes("demo_requests")
  ) {
    throw new DemoRequestSchemaMissingError(message);
  }
  throw new Error(message);
}

export class AdminDemoRequestRepository {
  async list(includeProcessed = false): Promise<AdminDemoRequest[]> {
    const { data, error } = await supabase.rpc("admin_list_demo_requests", {
      p_include_processed: includeProcessed,
    });
    if (error) throwDemoRequestError(error);
    return (data ?? []) as AdminDemoRequest[];
  }

  async finalize(input: {
    requestId: string;
    status: DemoRequestStatus;
    reason?: string | null;
    provisionedUserId?: string | null;
    invitationUrl?: string | null;
  }): Promise<void> {
    const { error } = await supabase.rpc("admin_finalize_demo_request", {
      p_request_id: input.requestId,
      p_status: input.status,
      p_reason: input.reason ?? null,
      p_provisioned_user_id: input.provisionedUserId ?? null,
      p_invitation_url: input.invitationUrl ?? null,
    });
    if (error) throwDemoRequestError(error);
  }

  async updateAutoMode(enabled: boolean, decision: DemoRequestAutoDecision): Promise<void> {
    const { error } = await supabase.rpc("admin_update_demo_request_auto_mode", {
      p_enabled: enabled,
      p_decision: decision,
    });
    if (error) throwDemoRequestError(error);
  }
}
