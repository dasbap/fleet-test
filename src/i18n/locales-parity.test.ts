import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SUPPORTED_LANGS } from "@/i18n";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = Record<string, JsonValue>;

const namespaces = ["common", "fleet", "maintenance", "alerts"] as const;
const baselineLanguage = "fr";

function readLocale(language: string, namespace: (typeof namespaces)[number]): JsonObject {
  const localePath = join(
    process.cwd(),
    "public",
    "locales",
    language,
    `${namespace}.json`
  );
  return JSON.parse(readFileSync(localePath, "utf-8")) as JsonObject;
}

function flattenKeys(value: JsonValue, parent = ""): string[] {
  if (Array.isArray(value) || value == null || typeof value !== "object") {
    return parent ? [parent] : [];
  }

  return Object.entries(value).flatMap(([key, nested]) => {
    const nextKey = parent ? `${parent}.${key}` : key;
    return flattenKeys(nested, nextKey);
  });
}

describe("SUPPORTED_LANGS", () => {
  it("contient toutes les langues attendues", () => {
    expect([...SUPPORTED_LANGS]).toEqual(["fr", "en", "ln", "ar", "wo", "sw", "es", "pt"]);
  });
});

describe("parité des locales i18n", () => {
  it.each(namespaces)("aligne les clés du namespace %s", (namespace) => {
    const baselineKeys = flattenKeys(readLocale(baselineLanguage, namespace)).sort();

    for (const language of SUPPORTED_LANGS) {
      const languageKeys = flattenKeys(readLocale(language, namespace)).sort();
      expect(languageKeys).toEqual(baselineKeys);
    }
  });
});
