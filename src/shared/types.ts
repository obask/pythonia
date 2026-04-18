import type { RPCSchema } from "electrobun";

export type QuizQuestion = {
  id: string;
  type: "multiple-choice" | "short-answer";
  prompt: string;
  options?: string[];
  answer: string | string[];
  explanation: string;
};

export type ChallengeTest = {
  name: string;
  code: string;
};

export type Challenge = {
  prompt: string;
  starterCode: string;
  tests: ChallengeTest[];
};

export type LessonMeta = {
  slug: string;
  title: string;
  description: string;
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string;
  moduleOrder: number;
  level: string;
  duration: string;
  order: number;
  xp: number;
  tags: string[];
  objectives: string[];
};

export type LessonDetail = LessonMeta & {
  content: string;
  quiz: QuizQuestion[];
  challenge: Challenge;
};

export type LessonModule = {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: LessonMeta[];
};

export type ProgressState = {
  completedSlugs: string[];
  activeSlug?: string;
  xp: number;
};

export type TestResult = {
  name: string;
  passed: boolean;
  message: string;
};

export type RunResult = {
  passed: boolean;
  results: TestResult[];
  stdout: string;
  stderr: string;
  durationMs: number;
};

export type PythoniaRPC = {
  bun: RPCSchema<{
    requests: {
      getCatalog: {
        params: null;
        response: { modules: LessonModule[]; progress: ProgressState };
      };
      getLesson: {
        params: { slug: string };
        response: LessonDetail;
      };
      runChallenge: {
        params: { slug: string; code: string };
        response: RunResult;
      };
      markComplete: {
        params: { slug: string };
        response: ProgressState;
      };
      setActiveLesson: {
        params: { slug: string };
        response: ProgressState;
      };
    };
    messages: {
      log: { message: string };
    };
  }>;
  webview: RPCSchema<{
    requests: Record<string, never>;
    messages: Record<string, never>;
  }>;
};
