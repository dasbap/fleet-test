import { defineCollection, z } from "astro:content";

const guides = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
    kind: z.enum(["hub", "article"]).default("article"),
    pillar: z.enum(["ia", "operations", "performance"]).optional(),
    relatedSolution: z.string().optional(),
    relatedFeature: z.string().optional(),
  }),
});

const solutions = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
    audience: z.string().optional(),
  }),
});

const features = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
    module: z.string().optional(),
  }),
});

export const collections = { guides, solutions, features };
