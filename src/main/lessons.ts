import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { Lesson, LessonSummary, ModuleGroup } from '../shared/types';

export function defaultVaultPath(home: string): string {
  return join(home, 'ClaudeProjects', 'pythonia--lessons', 'lessons');
}

async function readLessonFile(dir: string, file: string): Promise<Lesson | null> {
  if (!file.endsWith('.md')) return null;
  const full = join(dir, file);
  const raw = await readFile(full, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const slug = (data.slug as string) ?? file.replace(/\.md$/, '');
  return {
    file: full,
    slug,
    title: (data.title as string) ?? slug,
    description: data.description as string | undefined,
    moduleId: data.moduleId as string | undefined,
    moduleTitle: data.moduleTitle as string | undefined,
    moduleOrder: data.moduleOrder as number | undefined,
    level: data.level as string | undefined,
    duration: data.duration as string | undefined,
    order: data.order as number | undefined,
    xp: data.xp as number | undefined,
    tags: data.tags as string[] | undefined,
    objectives: data.objectives as string[] | undefined,
    quiz: data.quiz as Lesson['quiz'],
    challenge: data.challenge as Lesson['challenge'],
    content: parsed.content
  };
}

export async function loadAllLessons(vaultDir: string): Promise<Lesson[]> {
  const entries = await readdir(vaultDir, { withFileTypes: true });
  const lessons: Lesson[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const lesson = await readLessonFile(vaultDir, entry.name);
    if (lesson) lessons.push(lesson);
  }
  lessons.sort((a, b) => {
    const modA = a.moduleOrder ?? 999;
    const modB = b.moduleOrder ?? 999;
    if (modA !== modB) return modA - modB;
    return (a.order ?? 999) - (b.order ?? 999);
  });
  return lessons;
}

export async function listModules(vaultDir: string): Promise<ModuleGroup[]> {
  const lessons = await loadAllLessons(vaultDir);
  const groups = new Map<string, ModuleGroup>();
  for (const lesson of lessons) {
    const id = lesson.moduleId ?? 'general';
    const title = lesson.moduleTitle ?? 'Lessons';
    const order = lesson.moduleOrder ?? 999;
    let group = groups.get(id);
    if (!group) {
      group = { id, title, order, lessons: [] };
      groups.set(id, group);
    }
    const summary: LessonSummary = {
      file: lesson.file,
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description,
      moduleId: lesson.moduleId,
      moduleTitle: lesson.moduleTitle,
      moduleOrder: lesson.moduleOrder,
      level: lesson.level,
      duration: lesson.duration,
      order: lesson.order,
      xp: lesson.xp,
      tags: lesson.tags,
      objectives: lesson.objectives
    };
    group.lessons.push(summary);
  }
  return Array.from(groups.values()).sort((a, b) => a.order - b.order);
}

export async function getLessonBySlug(vaultDir: string, slug: string): Promise<Lesson | null> {
  const lessons = await loadAllLessons(vaultDir);
  return lessons.find((l) => l.slug === slug) ?? null;
}
