import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Supabase auth email template config", () => {
  it("pointe le template magic link vers le fichier versionne sous supabase/templates", () => {
    const config = fs.readFileSync(path.join(root, "supabase", "config.toml"), "utf8");
    const script = fs.readFileSync(path.join(root, "scripts", "apply-mobile-store-setup.mjs"), "utf8");
    const expectedPath = 'content_path = "./supabase/templates/magic_link.html"';

    expect(config).toContain(expectedPath);
    expect(script).toContain(expectedPath);
    expect(fs.existsSync(path.join(root, "supabase", "templates", "magic_link.html"))).toBe(true);
  });
  it("prevoit un fallback sans template pour les projets Supabase free avec email provider par defaut", () => {
    const script = fs.readFileSync(path.join(root, "scripts", "apply-mobile-store-setup.mjs"), "utf8");

    expect(script).toContain("Email template modification is not available");
    expect(script).toContain("pushSupabaseConfigWithoutEmailTemplate");
    expect(script).toContain("[auth.email.template.magic_link]");
  });
});
