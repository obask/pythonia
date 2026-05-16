import { contextBridge, ipcRenderer } from 'electron';
import type {
  Lesson,
  ModuleGroup,
  Progress,
  PythoniaApi,
  RunResult,
  ThemeState
} from '../shared/types';

const api: PythoniaApi = {
  listLessons: (): Promise<ModuleGroup[]> => ipcRenderer.invoke('lessons:list'),
  getLesson: (slug: string): Promise<Lesson | null> => ipcRenderer.invoke('lessons:get', slug),
  runChallenge: (slug: string, userCode: string): Promise<RunResult> =>
    ipcRenderer.invoke('challenge:run', slug, userCode),
  getProgress: (): Promise<Progress> => ipcRenderer.invoke('progress:get'),
  saveProgress: (progress: Progress): Promise<void> =>
    ipcRenderer.invoke('progress:save', progress),
  getVaultPath: (): Promise<string> => ipcRenderer.invoke('vault:path'),
  getTheme: (): Promise<ThemeState> => ipcRenderer.invoke('theme:get'),
  onThemeChange: (listener: (state: ThemeState) => void): (() => void) => {
    const handler = (_e: unknown, state: ThemeState): void => listener(state);
    ipcRenderer.on('theme:changed', handler);
    return () => {
      ipcRenderer.off('theme:changed', handler);
    };
  }
};

contextBridge.exposeInMainWorld('pythonia', api);
