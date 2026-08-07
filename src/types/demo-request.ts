export type DemoRequestStatus =
  | "pending"
  | "accepted"
  | "refused"
  | "auto_accepted"
  | "auto_refused";

export type DemoRequestAutoDecision = "accept" | "refuse";

export interface AdminDemoRequest {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
  phone: string | null;
  company_identifier: string | null;
  country_code: string | null;
  source: string | null;
  message: string | null;
  status: DemoRequestStatus;
  decision_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  provisioned_user_id: string | null;
  invitation_url: string | null;
  created_at: string;
  auto_decision_enabled: boolean;
  auto_decision: DemoRequestAutoDecision;
}
