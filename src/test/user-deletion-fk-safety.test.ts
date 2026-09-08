import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const directUserRefs = readFileSync(
  "supabase/migrations/20260908110329_make_auth_user_references_deletion_safe.sql",
  "utf8",
);
const cascadeRefs = readFileSync(
  "supabase/migrations/20260908110420_fix_cascade_user_deletion_dependencies.sql",
  "utf8",
);
const assignmentRef = readFileSync(
  "supabase/migrations/20260908110449_fix_assignment_user_deletion_dependency.sql",
  "utf8",
);
const demoAuditUserRef = readFileSync(
  "supabase/migrations/20260908125000_allow_user_delete_preserve_demo_audit_logs.sql",
  "utf8",
);

describe("suppression super-admin des utilisateurs", () => {
  it("rend les références directes auth.users compatibles avec la suppression", () => {
    for (const constraint of [
      "admin_profiles_created_by_fkey",
      "affectations_vehicules_created_by_fkey",
      "clotures_creneaux_validated_by_fkey",
      "controles_journaliers_inspected_by_fkey",
      "demo_profiles_created_by_fkey",
      "demo_sessions_revoked_by_fkey",
      "flotte_invitations_created_by_fkey",
      "incidents_driver_user_id_fkey",
      "jetons_qr_created_by_fkey",
      "listes_verification_maintenance_signed_by_fkey",
      "preuves_maintenance_created_by_fkey",
    ]) {
      expect(directUserRefs).toContain(constraint);
    }
    expect(directUserRefs.match(/ON DELETE SET NULL/g)?.length).toBe(11);
  });

  it("préserve les historiques demo et carburant quand leurs parents sont supprimés", () => {
    expect(demoAuditUserRef).toContain("demo_audit_logs_user_id_fkey");
    expect(demoAuditUserRef).toContain("ON DELETE SET NULL");
    expect(cascadeRefs).toContain("demo_audit_logs_session_id_fkey");
    expect(cascadeRefs).toContain("journal_carburant_driver_user_id_fkey");
    expect(cascadeRefs.match(/ON DELETE SET NULL/g)?.length).toBe(2);
  });

  it("ne bloque plus la suppression d'une affectation référencée par un créneau", () => {
    expect(assignmentRef).toContain("creneaux_conducteurs_assignment_id_fkey");
    expect(assignmentRef).toContain("ALTER COLUMN assignment_id DROP NOT NULL");
    expect(assignmentRef).toContain("ON DELETE SET NULL");
  });
});
