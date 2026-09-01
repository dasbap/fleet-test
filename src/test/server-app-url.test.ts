/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import { getAppUrl } from "@/server/env";

const original = {
  APP_URL: process.env.APP_URL,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
};

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("getAppUrl", () => {
  it("refuse localhost comme callback en production Vercel", () => {
    process.env.APP_URL = "http://localhost:5173";
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";

    expect(getAppUrl()).toBe("https://www.e-samba.com");
  });

  it("utilise le domaine du preview Vercel si APP_URL est local", () => {
    process.env.APP_URL = "http://localhost:5173";
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "fleet-test-git-security-check.vercel.app";

    expect(getAppUrl()).toBe("https://fleet-test-git-security-check.vercel.app");
  });

  it("conserve une APP_URL publique explicitement configuree", () => {
    process.env.APP_URL = "https://app.e-samba.com/";
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";

    expect(getAppUrl()).toBe("https://app.e-samba.com");
  });
});
