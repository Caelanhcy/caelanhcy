// Astro Content Collections — long-form field essays.
// The /field/[slug].astro route pulls metadata + artifacts from capabilities.ts
// and the long body from the matching markdown entry in this collection.

import { defineCollection, z } from 'astro:content';

const essaySchema = z.object({
  title: z.string(),
  number: z.string(),
  thesis: z.string(),
  lastUpdated: z.string().optional(),
  draft: z.boolean().optional().default(false),
});

const field = defineCollection({
  type: 'content',
  schema: essaySchema,
});

// Chinese-language parallel collection. Same schema, same slugs, CN content.
const fieldZh = defineCollection({
  type: 'content',
  schema: essaySchema,
});

export const collections = { field, 'field-zh': fieldZh };
