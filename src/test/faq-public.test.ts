import { describe, expect, it } from "vitest";
import { PUBLIC_FAQ_ENTRIES, toPublicFaqItems } from "@/data/marketing/faq-public";

describe("PUBLIC_FAQ_ENTRIES", () => {
  it("presente une FAQ commerciale a jour et sans details internes", () => {
    expect(PUBLIC_FAQ_ENTRIES).toHaveLength(8);
    expect(PUBLIC_FAQ_ENTRIES.map((entry) => entry.q)).toEqual([
      "A qui s'adresse E-Samba ?",
      "Qu'est-ce que je peux suivre avec E-Samba ?",
      "Est-ce adapte aux flottes en Afrique centrale ?",
      "Combien de temps faut-il pour demarrer ?",
      "Puis-je commencer avec une petite flotte ?",
      "Comment se deroule la mise en place ?",
      "Mes donnees restent-elles protegees ?",
      "Comment demander une demo ?",
    ]);

    const faqCopy = PUBLIC_FAQ_ENTRIES
      .flatMap((entry) => [entry.q, entry.a])
      .join(" ");

    expect(faqCopy).not.toMatch(/plan gratuit/i);
    expect(faqCopy).not.toMatch(/Supabase|RLS|Row Level Security|PostgreSQL/i);
    expect(faqCopy).not.toMatch(/\/statut|\/incident|\/km/i);
    expect(faqCopy).not.toMatch(/votre pays/i);
    expect(faqCopy).not.toMatch(/presentation adaptee/i);
    expect(faqCopy).toMatch(/votre zone d'activite/i);
    expect(faqCopy).toMatch(/compte sous 48h/i);
  });

  it("convertit la FAQ publique au format schema", () => {
    expect(toPublicFaqItems()[0]).toEqual({
      id: "public-faq-1",
      question: "A qui s'adresse E-Samba ?",
      answer: PUBLIC_FAQ_ENTRIES[0].a,
    });
  });
});
