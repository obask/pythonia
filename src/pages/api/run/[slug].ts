import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { executeCode } from '../../../lib/executor-client.ts';
import { parseLesson, reconstructCode } from '../../../lib/lesson.ts';
import { renderResult } from '../../../lib/render-result.ts';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const slug = params.slug;
  if (!slug) return new Response('Missing slug', { status: 400 });

  const entry = await getEntry('lessons', slug);
  if (!entry) return new Response('Lesson not found', { status: 404 });

  const form = await request.formData();
  const blanksRaw = form.get('blanks');
  if (typeof blanksRaw !== 'string') return new Response('Missing blanks', { status: 400 });

  let blanks: string[];
  try {
    blanks = JSON.parse(blanksRaw);
  } catch {
    return new Response('Invalid blanks', { status: 400 });
  }

  const lesson = parseLesson(entry.body ?? '');
  const code = reconstructCode(lesson.codeTemplate, blanks);
  const visibleTests = lesson.tests.filter((t) => t.visible);

  const response = await executeCode({
    code,
    function_name: entry.data.function_name,
    tests: visibleTests,
  });

  return new Response(renderResult(response, 'run'), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
