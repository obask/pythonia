import {
  parseLessonSource,
  sortLessons,
  summaryFromLesson,
} from '@/lib/lesson-content'
import type { Lesson, LessonSummary, RunResponse } from '@/types/lesson'

const bundledLessonSources = import.meta.glob('/lessons/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

let browserLessonCache: Lesson[] | null = null

function getBrowserLessons() {
  if (!browserLessonCache) {
    browserLessonCache = sortLessons(
      Object.entries(bundledLessonSources).map(([filePath, source]) =>
        parseLessonSource(filePath.split('/').at(-1) ?? filePath, source),
      ),
    )
  }

  return browserLessonCache
}

function getDesktopApi() {
  return typeof window !== 'undefined' ? window.pythonia : undefined
}

export const platformApi = {
  async listLessons(): Promise<LessonSummary[]> {
    const desktopApi = getDesktopApi()
    if (desktopApi) return desktopApi.lessons.list()

    return getBrowserLessons().map(summaryFromLesson)
  },

  async getLesson(slug: string): Promise<Lesson | null> {
    const desktopApi = getDesktopApi()
    if (desktopApi) return desktopApi.lessons.get(slug)

    return getBrowserLessons().find((lesson) => lesson.slug === slug) ?? null
  },

  async runCode(payload: {
    slug: string
    code: string
  }): Promise<RunResponse> {
    const desktopApi = getDesktopApi()
    if (desktopApi) return desktopApi.runner.run(payload)

    return {
      passed: false,
      results: [],
      stdout: '',
      stderr: '',
      error:
        'Запуск Python доступен в desktop-версии. В web-preview можно читать уроки и редактировать код.',
    }
  },
}
