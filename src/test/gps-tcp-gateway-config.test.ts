import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("GPS TCP gateway configuration", () => {
  it("utilise le port E-Samba 5027 par defaut", () => {
    const source = readFileSync("scripts/gps-tcp-gateway.mjs", "utf8");

    expect(source).toContain("GPS_TCP_PORT ?? 5027");
    expect(source).not.toContain("GPS_TCP_PORT ?? 5023");
  });

  it("expose un script npm explicite pour demarrer le serveur TCP E-Samba", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["gps:tcp-server"]).toBe("node scripts/gps-tcp-gateway.mjs");
    expect(pkg.scripts["gps:tcp-gateway"]).toBe("node scripts/gps-tcp-gateway.mjs");
  });
});
