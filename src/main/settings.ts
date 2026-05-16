import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePref;
}

const DEFAULTS: Settings = { theme: 'system' };

export function settingsPath(userDataDir: string): string {
  return join(userDataDir, 'settings.json');
}

export async function loadSettings(userDataDir: string): Promise<Settings> {
  try {
    const raw = await readFile(settingsPath(userDataDir), 'utf8');
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(userDataDir: string, settings: Settings): Promise<void> {
  const path = settingsPath(userDataDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(settings, null, 2), 'utf8');
}
