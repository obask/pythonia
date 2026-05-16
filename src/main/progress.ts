import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Progress } from '../shared/types';

const EMPTY: Progress = {
  completedLessons: [],
  xp: 0,
  quizAnswers: {},
  challengesSolved: [],
  lastLessonSlug: null
};

export function progressPath(userDataDir: string): string {
  return join(userDataDir, 'progress.json');
}

export async function loadProgress(userDataDir: string): Promise<Progress> {
  try {
    const raw = await readFile(progressPath(userDataDir), 'utf8');
    return { ...EMPTY, ...(JSON.parse(raw) as Progress) };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveProgress(userDataDir: string, progress: Progress): Promise<void> {
  const path = progressPath(userDataDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(progress, null, 2), 'utf8');
}
