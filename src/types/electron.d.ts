import type { Lesson, LessonSummary, RunResponse } from './lesson'

export interface PythoniaDesktopApi {
  lessons: {
    list: () => Promise<LessonSummary[]>
    get: (slug: string) => Promise<Lesson | null>
  }
  runner: {
    run: (payload: { slug: string; code: string }) => Promise<RunResponse>
  }
}

declare global {
  interface Window {
    pythonia?: PythoniaDesktopApi
  }
}

export {}
