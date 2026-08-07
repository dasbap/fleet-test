import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("dashcam runtime migration", () => {
  it("restores dashcam tables with the columns and RLS policies used by the app", () => {
    const sql = readFileSync(
      "supabase/migrations/20260804113000_restore_dashcam_runtime.sql",
      "utf8",
    ).toLowerCase();

    expect(sql).toContain("create table if not exists public.dashcams");
    expect(sql).toContain("create table if not exists public.dashcam_alerts");
    expect(sql).toContain("add column if not exists channel");
    expect(sql).toContain("add column if not exists firmware_ver");
    expect(sql).toContain("add column if not exists video_clip_url");
    expect(sql).toContain("add column if not exists acknowledged");
    expect(sql).toContain("add column if not exists ack_at");
    expect(sql).toContain("alter table public.dashcams enable row level security");
    expect(sql).toContain("alter table public.dashcam_alerts enable row level security");
    expect(sql).toContain("public.has_role(fleet_id, 'organizer'::public.role_type)");
    expect(sql).toContain("public.has_role(fleet_id, 'manager'::public.role_type)");
    expect(sql).toContain("public.has_role(fleet_id, 'mechanic'::public.role_type)");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("grant select, insert, update on public.dashcams to authenticated");
    expect(sql).toContain("grant select, update on public.dashcam_alerts to authenticated");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
