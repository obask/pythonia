import { homedir } from "node:os";
import { basename, join } from "node:path";
import { mkdir, readdir } from "node:fs/promises";
import YAML from "yaml";
import type {
  Challenge,
  LessonDetail,
  LessonMeta,
  LessonModule,
  ProgressState,
  QuizQuestion,
} from "../shared/types";

const DEFAULT_VAULT = "~/ClaudeProjects/pythonia--lessons";
const VAULT_PATH = expandHome(process.env.PYTHONIA_LESSONS_DIR ?? DEFAULT_VAULT);
const LESSONS_DIR = join(VAULT_PATH, "lessons");
const PROGRESS_DIR = join(homedir(), ".pythonia");
const PROGRESS_FILE = join(PROGRESS_DIR, "progress.json");

type LessonFile = {
  meta: LessonMeta;
  quiz: QuizQuestion[];
  challenge: Challenge;
  content: string;
  filename: string;
};

function expandHome(path: string) {
  return path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

function splitFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Lesson missing YAML frontmatter");
  }
  return { frontmatter: match[1], content: match[2].trim() };
}

function toLessonFile(filename: string, raw: string): LessonFile {
  const { frontmatter, content } = splitFrontmatter(raw);
  const data = YAML.parse(frontmatter) as LessonDetail;
  const meta: LessonMeta = {
    slug: data.slug,
    title: data.title,
    description: data.description,
    moduleId: data.moduleId,
    moduleTitle: data.moduleTitle,
    moduleDescription: data.moduleDescription,
    moduleOrder: Number(data.moduleOrder),
    level: data.level,
    duration: data.duration,
    order: Number(data.order),
    xp: Number(data.xp),
    tags: data.tags ?? [],
    objectives: data.objectives ?? [],
  };
  return {
    meta,
    quiz: data.quiz ?? [],
    challenge: data.challenge,
    content,
    filename,
  };
}

async function readLessonFiles() {
  const files = (await readdir(LESSONS_DIR))
    .filter((file) => file.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(
    files.map(async (filename) => {
      const raw = await Bun.file(join(LESSONS_DIR, filename)).text();
      try {
        return toLessonFile(filename, raw);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${basename(filename)}: ${message}`);
      }
    }),
  );
}

export async function getCatalog(): Promise<LessonModule[]> {
  const lessons = await readLessonFiles();
  const modules = new Map<string, LessonModule>();

  for (const lesson of lessons) {
    const current = modules.get(lesson.meta.moduleId);
    if (!current) {
      modules.set(lesson.meta.moduleId, {
        id: lesson.meta.moduleId,
        title: lesson.meta.moduleTitle,
        description: lesson.meta.moduleDescription,
        order: lesson.meta.moduleOrder,
        lessons: [lesson.meta],
      });
    } else {
      current.lessons.push(lesson.meta);
    }
  }

  return [...modules.values()]
    .map((module) => ({
      ...module,
      lessons: module.lessons.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order);
}

export async function getLesson(slug: string): Promise<LessonDetail> {
  const lessons = await readLessonFiles();
  const lesson = lessons.find((item) => item.meta.slug === slug);
  if (!lesson) {
    throw new Error(`Lesson not found: ${slug}`);
  }
  return {
    ...lesson.meta,
    quiz: lesson.quiz,
    challenge: lesson.challenge,
    content: lesson.content,
  };
}

export async function getProgress(): Promise<ProgressState> {
  try {
    const raw = await Bun.file(PROGRESS_FILE).text();
    const parsed = JSON.parse(raw) as ProgressState;
    return {
      completedSlugs: parsed.completedSlugs ?? [],
      activeSlug: parsed.activeSlug,
      xp: Number(parsed.xp ?? 0),
    };
  } catch {
    return { completedSlugs: [], xp: 0 };
  }
}

export async function saveProgress(progress: ProgressState) {
  await mkdir(PROGRESS_DIR, { recursive: true });
  await Bun.write(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  return progress;
}

export async function markComplete(slug: string) {
  const [progress, lesson] = await Promise.all([getProgress(), getLesson(slug)]);
  if (!progress.completedSlugs.includes(slug)) {
    progress.completedSlugs.push(slug);
    progress.xp += lesson.xp;
  }
  progress.activeSlug = slug;
  return saveProgress(progress);
}

export async function setActiveLesson(slug: string) {
  const progress = await getProgress();
  progress.activeSlug = slug;
  return saveProgress(progress);
}
