import { app, BrowserWindow, ipcMain, Menu, nativeTheme, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defaultVaultPath, getLessonBySlug, listModules } from './lessons';
import { runChallenge } from './python';
import { loadProgress, saveProgress } from './progress';
import { loadSettings, saveSettings } from './settings';
import type { Progress, ThemePref, ThemeState } from '../shared/types';

const VAULT = process.env.PYTHONIA_VAULT ?? defaultVaultPath(homedir());

let currentPref: ThemePref = 'system';

function effectiveTheme(): 'light' | 'dark' {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function currentThemeState(): ThemeState {
  return { pref: currentPref, effective: effectiveTheme() };
}

function broadcastTheme(): void {
  const state = currentThemeState();
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('theme:changed', state);
  }
}

function applyThemePref(pref: ThemePref): void {
  currentPref = pref;
  nativeTheme.themeSource = pref;
}

function buildMenu(): void {
  const isMac = process.platform === 'darwin';

  const themeSubmenu: MenuItemConstructorOptions[] = (['system', 'light', 'dark'] as const).map(
    (pref) => ({
      label: pref === 'system' ? 'System' : pref === 'light' ? 'Light' : 'Dark',
      type: 'radio',
      checked: currentPref === pref,
      click: async () => {
        applyThemePref(pref);
        await saveSettings(app.getPath('userData'), { theme: pref });
        broadcastTheme();
      }
    })
  );

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([{ role: 'appMenu' }] satisfies MenuItemConstructorOptions[])
      : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Theme', submenu: themeSubmenu },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    { role: 'windowMenu' }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: 'Pythonia',
    backgroundColor: effectiveTheme() === 'dark' ? '#0b1020' : '#f7f8fc',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.on('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  const settings = await loadSettings(app.getPath('userData'));
  applyThemePref(settings.theme);

  nativeTheme.on('updated', () => {
    // Rebuild menu so radio state stays fresh and OS-triggered changes propagate.
    buildMenu();
    broadcastTheme();
  });

  buildMenu();

  ipcMain.handle('lessons:list', () => listModules(VAULT));
  ipcMain.handle('lessons:get', (_e, slug: string) => getLessonBySlug(VAULT, slug));
  ipcMain.handle('vault:path', () => VAULT);

  ipcMain.handle('challenge:run', async (_e, slug: string, userCode: string) => {
    const lesson = await getLessonBySlug(VAULT, slug);
    if (!lesson?.challenge) {
      return { ok: false, results: [], stderr: 'No challenge for this lesson' };
    }
    return runChallenge(lesson.challenge, userCode);
  });

  ipcMain.handle('progress:get', () => loadProgress(app.getPath('userData')));
  ipcMain.handle('progress:save', (_e, progress: Progress) =>
    saveProgress(app.getPath('userData'), progress)
  );

  ipcMain.handle('theme:get', () => currentThemeState());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
