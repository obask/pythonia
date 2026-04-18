export type QuizQuestion =
  | {
      id: string
      type: 'multiple-choice'
      prompt: string
      options: string[]
      answer: string
      explanation: string
    }
  | {
      id: string
      type: 'short-answer'
      prompt: string
      answer: string | string[]
      explanation: string
    }

export interface ChallengeTest {
  name: string
  code: string
}

export interface LessonChallenge {
  prompt: string
  starterCode: string
  tests: ChallengeTest[]
}

export interface LessonSummary {
  slug: string
  title: string
  description: string
  moduleId: string
  moduleTitle: string
  moduleDescription: string
  moduleOrder: number
  level: string
  duration: string
  order: number
  xp: number
  tags: string[]
  objectives: string[]
}

export interface Lesson extends LessonSummary {
  content: string
  quiz: QuizQuestion[]
  challenge?: LessonChallenge
}

export interface RunResult {
  name: string
  passed: boolean
  message: string
  expected?: string
  actual?: string
}

export interface RunResponse {
  passed: boolean
  results: RunResult[]
  stdout: string
  stderr: string
  error?: string
  timedOut?: boolean
}
