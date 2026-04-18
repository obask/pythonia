import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import type { Lesson, LessonSummary } from '@/types/lesson'

const LESSONS_DIR = process.env.PYTHONIA_LESSONS_DIR
  ? path.resolve(process.env.PYTHONIA_LESSONS_DIR)
  : path.resolve(process.cwd(), 'lessons')

function normalizeLesson(raw: unknown, content: string, fallbackSlug: string): Lesson {
  const data = raw as Partial<Lesson>
  const title = String(data.title ?? fallbackSlug)
  const description = String(data.description ?? '')
  const moduleId = String(data.moduleId ?? 'python-basics')
  const moduleTitle = String(data.moduleTitle ?? 'Основы Python')
  const moduleDescription = String(
    data.moduleDescription ?? 'Первые шаги в Python',
  )
  const moduleOrder = Number(data.moduleOrder ?? 1)
  const level = String(data.level ?? 'Beginner')
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

function readingTime(markdown: string) {
  const words = markdown.split(/\s+/).filter(Boolean).length
  return `${Math.max(4, Math.ceil(words / 160))} min`
}

function summaryFromLesson(lesson: Lesson): LessonSummary {
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

async function readLessonFile(fileName: string) {
  const absolutePath = path.join(LESSONS_DIR, fileName)
  const source = await readFile(absolutePath, 'utf8')
  const parsed = matter(source)
  const fallbackSlug = fileName.replace(/\.md$/i, '').replace(/^\d+-/, '')

  return normalizeLesson(parsed.data, parsed.content.trim(), fallbackSlug)
}

export async function getLessons(): Promise<LessonSummary[]> {
  const files = await readdir(LESSONS_DIR)
  const lessons = await Promise.all(
    files.filter((file) => file.endsWith('.md')).map(readLessonFile),
  )

  return lessons
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map(summaryFromLesson)
}

export async function getLesson(slug: string): Promise<Lesson | null> {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-]/g, '')
  const files = await readdir(LESSONS_DIR)
  const lessonFiles = files.filter((file) => file.endsWith('.md'))

  for (const file of lessonFiles) {
    const lesson = await readLessonFile(file)
    if (lesson.slug === safeSlug) {
      return lesson
    }
  }

  return null
}
