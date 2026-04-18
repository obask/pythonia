import { parse as parseYaml } from 'yaml'
import type { Lesson, LessonSummary } from '@/types/lesson'

export function normalizeLesson(
  raw: unknown,
  content: string,
  fallbackSlug: string,
): Lesson {
  const data = raw as Partial<Lesson>
  const title = String(data.title ?? fallbackSlug)
  const description = String(data.description ?? '')
  const moduleId = String(data.moduleId ?? 'python-basics')
  const moduleTitle = String(data.moduleTitle ?? 'Основы Python')
  const moduleDescription = String(
    data.moduleDescription ?? 'Первые шаги в Python',
  )
  const moduleOrder = Number(data.moduleOrder ?? 1)
  const level = String(data.level ?? 'Начальный')
  const duration = String(data.duration ?? readingTime(content))
  const order = Number(data.order ?? 999)
  const xp = Number(data.xp ?? 100)
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : []
  const objectives = Array.isArray(data.objectives)
    ? data.objectives.map(String)
    : []
  const quiz = Array.isArray(data.quiz) ? data.quiz : []

  return {
    slug: String(data.slug ?? fallbackSlug),
    title,
    description,
    moduleId,
    moduleTitle,
    moduleDescription,
    moduleOrder,
    level,
    duration,
    order,
    xp,
    tags,
    objectives,
    content,
    quiz,
    challenge: data.challenge,
  }
}

export function summaryFromLesson(lesson: Lesson): LessonSummary {
  return {
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    moduleId: lesson.moduleId,
    moduleTitle: lesson.moduleTitle,
    moduleDescription: lesson.moduleDescription,
    moduleOrder: lesson.moduleOrder,
    level: lesson.level,
    duration: lesson.duration,
    order: lesson.order,
    xp: lesson.xp,
    tags: lesson.tags,
    objectives: lesson.objectives,
  }
}

export function parseLessonSource(fileName: string, source: string): Lesson {
  const parsed = parseFrontmatter(source)
  const fallbackSlug = fileName.replace(/\.md$/i, '').replace(/^\d+-/, '')
  return normalizeLesson(parsed.data, parsed.content.trim(), fallbackSlug)
}

export function sortLessons<T extends LessonSummary>(lessons: T[]): T[] {
  return [...lessons].sort(
    (a, b) =>
      a.moduleOrder - b.moduleOrder ||
      a.order - b.order ||
      a.title.localeCompare(b.title),
  )
}

function readingTime(markdown: string) {
  const words = markdown.split(/\s+/).filter(Boolean).length
  return `${Math.max(4, Math.ceil(words / 160))} мин`
}

function parseFrontmatter(source: string) {
  if (!source.startsWith('---')) {
    return { data: {}, content: source }
  }

  const closingFenceIndex = source.indexOf('\n---', 3)
  if (closingFenceIndex === -1) {
    return { data: {}, content: source }
  }

  const yamlSource = source.slice(3, closingFenceIndex).trim()
  const content = source.slice(closingFenceIndex + 4)

  return {
    data: parseYaml(yamlSource) ?? {},
    content,
  }
}
