import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    order: z.number().int().nonnegative(),
    function_name: z.string().min(1),
  }),
});

export const collections = { lessons };
