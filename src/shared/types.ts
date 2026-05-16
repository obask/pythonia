export interface QuizMultipleChoice {
  id: string;
  type: 'multiple-choice';
  prompt: string;
  options: string[];
  answer: string;
  explanation?: string;
}

export interface QuizShortAnswer {
  id: string;
  type: 'short-answer';
  prompt: string;
  answer: string | string[];
  explanation?: string;
}

export type QuizItem = QuizMultipleChoice | QuizShortAnswer;

export interface ChallengeTest {
  name: string;
  code: string;
}

export interface Challenge {
  prompt: string;
  starterCode: string;
  tests: ChallengeTest[];
}

export interface LessonMeta {
  slug: string;
  title: string;
  description?: string;
  moduleId?: string;
  moduleTitle?: string;
  moduleOrder?: number;
  level?: string;
  duration?: string;
  order?: number;
  xp?: number;
  tags?: string[];
  objectives?: string[];
}

export interface LessonSummary extends LessonMeta {
  file: string;
}

export interface Lesson extends LessonSummary {
  content: string;
  quiz?: QuizItem[];
  challenge?: Challenge;
}

export interface ModuleGroup {
  id: string;
  title: string;
  order: number;
  lessons: LessonSummary[];
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  stdout?: string;
}

export interface RunResult {
  ok: boolean;
  results: TestResult[];
  stderr?: string;
}

export interface Progress {
  completedLessons: string[];
  xp: number;
  quizAnswers: Record<string, Record<string, boolean>>;
  challengesSolved: string[];
  lastLessonSlug?: string | null;
}

export type ThemePref = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

export interface ThemeState {
  pref: ThemePref;
  effective: EffectiveTheme;
}

export interface PythoniaApi {
  listLessons(): Promise<ModuleGroup[]>;
  getLesson(slug: string): Promise<Lesson | null>;
  runChallenge(slug: string, userCode: string): Promise<RunResult>;
  getProgress(): Promise<Progress>;
  saveProgress(progress: Progress): Promise<void>;
  getVaultPath(): Promise<string>;
  getTheme(): Promise<ThemeState>;
  onThemeChange(listener: (state: ThemeState) => void): () => void;
}

declare global {
  interface Window {
    pythonia: PythoniaApi;
  }
}
