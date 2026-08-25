import { describe, expect, it } from "vitest";
import { PUBLIC_FAQ_ENTRIES, toPublicFaqItems } from "@/data/marketing/faq-public";

describe("PUBLIC_FAQ_ENTRIES", () => {
  it("presente une FAQ commerciale a jour et sans details internes", () => {
    expect(PUBLIC_FAQ_ENTRIES).toHaveLength(8);
    expect(PUBLIC_FAQ_ENTRIES.map((entry) => entry.q)).toEqual([
      "À qui s'adresse E-Samba ?",
      "Qu'est-ce que je peux suivre avec E-Samba ?",
      "Est-ce adapté aux flottes en Afrique centrale ?",
      "Combien de temps faut-il pour démarrer ?",
      "Puis-je commencer avec une petite flotte ?",
      "Comment se déroule la mise en place ?",
      "Mes données restent-elles protégées ?",
      "Comment demander une démo ?",
    ]);

    const faqCopy = PUBLIC_FAQ_ENTRIES
      .flatMap((entry) => [entry.q, entry.a])
      .join(" ");

    expect(faqCopy).not.toMatch(/plan gratuit/i);
    expect(faqCopy).not.toMatch(/Supabase|RLS|Row Level Security|PostgreSQL/i);
    expect(faqCopy).not.toMatch(/\/statut|\/incident|\/km/i);
    expect(faqCopy).not.toMatch(/votre pays/i);
    expect(faqCopy).not.toMatch(/presentation adaptee/i);
    expect(faqCopy).toMatch(/votre zone d'activité/i);
    expect(faqCopy).toMatch(/compte sous 48h/i);
  });

  it("convertit la FAQ publique au format schema", () => {
    expect(toPublicFaqItems()[0]).toEqual({
      id: "public-faq-1",
      question: "À qui s'adresse E-Samba ?",
      answer: PUBLIC_FAQ_ENTRIES[0].a,
    });
  });
});
