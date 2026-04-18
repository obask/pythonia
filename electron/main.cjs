const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { execFile } = require('node:child_process')
const { existsSync } = require('node:fs')
const { mkdtemp, readdir, readFile, rm, writeFile } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { promisify } = require('node:util')
const { parse: parseYaml } = require('yaml')

const execFileAsync = promisify(execFile)
const RESULT_MARKER = '__PYTHONIA_RESULTS__'

let mainWindow = null

const isDev = Boolean(process.env.ELECTRON_START_URL)

function getProjectRoot() {
  return path.resolve(__dirname, '..')
}

function resolveLessonsDir() {
  const configuredDir = process.env.PYTHONIA_LESSONS_DIR
  if (configuredDir) return path.resolve(configuredDir)

  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'lessons')
  }

  const siblingVault = path.resolve(getProjectRoot(), '..', 'pythonia--lessons', 'lessons')
  if (existsSync(siblingVault)) return siblingVault

  return path.join(getProjectRoot(), 'lessons')
}

function getRendererUrlOrFile() {
  if (process.env.ELECTRON_START_URL) {
    return { url: process.env.ELECTRON_START_URL }
  }

  return { file: path.join(getProjectRoot(), 'dist', 'index.html') }
}

function resolveAppIconPath() {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'pythonia-icon.png'),
        path.join(getProjectRoot(), 'dist', 'pythonia-icon.png'),
      ]
    : [path.join(getProjectRoot(), 'public', 'pythonia-icon.png')]

  return candidates.find((candidate) => existsSync(candidate))
}

function readingTime(markdown) {
  const words = markdown.split(/\s+/).filter(Boolean).length
  return `${Math.max(4, Math.ceil(words / 160))} мин`
}

function normalizeLesson(raw, content, fallbackSlug) {
  const data = raw ?? {}

  return {
    slug: String(data.slug ?? fallbackSlug),
    title: String(data.title ?? fallbackSlug),
    description: String(data.description ?? ''),
    moduleId: String(data.moduleId ?? 'python-basics'),
    moduleTitle: String(data.moduleTitle ?? 'Основы Python'),
    moduleDescription: String(data.moduleDescription ?? 'Первые шаги в Python'),
    moduleOrder: Number(data.moduleOrder ?? 1),
    level: String(data.level ?? 'Начальный'),
    duration: String(data.duration ?? readingTime(content)),
    order: Number(data.order ?? 999),
    xp: Number(data.xp ?? 100),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    objectives: Array.isArray(data.objectives) ? data.objectives.map(String) : [],
    content,
    quiz: Array.isArray(data.quiz) ? data.quiz : [],
    challenge: data.challenge,
  }
}

function summaryFromLesson(lesson) {
  return {
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    moduleId: lesson.moduleId,
    moduleTitle: lesson.moduleTitle,
    moduleDescription: lesson.moduleDescription,
    moduleOrder: lesson.moduleOrder,
    level: lesson.level,
    duration: lesson.duration,
    order: lesson.order,
    xp: lesson.xp,
    tags: lesson.tags,
    objectives: lesson.objectives,
  }
}

function sortLessons(lessons) {
  return [...lessons].sort(
    (a, b) =>
      a.moduleOrder - b.moduleOrder ||
      a.order - b.order ||
      a.title.localeCompare(b.title),
  )
}

async function readLessonFile(fileName) {
  const source = await readFile(path.join(resolveLessonsDir(), fileName), 'utf8')
  const parsed = parseFrontmatter(source)
  const fallbackSlug = fileName.replace(/\.md$/i, '').replace(/^\d+-/, '')

  return normalizeLesson(parsed.data, parsed.content.trim(), fallbackSlug)
}

function parseFrontmatter(source) {
  if (!source.startsWith('---')) {
    return { data: {}, content: source }
  }

  const closingFenceIndex = source.indexOf('\n---', 3)
  if (closingFenceIndex === -1) {
    return { data: {}, content: source }
  }

  const yamlSource = source.slice(3, closingFenceIndex).trim()
  const content = source.slice(closingFenceIndex + 4)

  return {
    data: parseYaml(yamlSource) ?? {},
    content,
  }
}

async function readLessons() {
  const files = await readdir(resolveLessonsDir())
  const lessons = await Promise.all(
    files.filter((file) => file.endsWith('.md')).map(readLessonFile),
  )

  return sortLessons(lessons)
}

function indentPython(source) {
  const trimmed = source.trimEnd()
  if (!trimmed) return '    pass'

  return trimmed
    .split('\n')
    .map((line) => (line.trim() ? `    ${line}` : line))
    .join('\n')
}

function buildRunner(userCode, tests) {
  const testBlocks = tests
    .map((test, index) => {
      const functionName = `__pythonia_test_${index}`
      return [
        `def ${functionName}():`,
        indentPython(test.code),
        `__pythonia_run(${JSON.stringify(test.name)}, ${functionName})`,
      ].join('\n')
    })
    .join('\n\n')

  return `
import json
import traceback

__pythonia_results = []

class __PythoniaExpectationError(AssertionError):
    def __init__(self, actual, expected):
        self.actual = repr(actual)
        self.expected = repr(expected)
        super().__init__(f"Ожидалось {self.expected}, получено {self.actual}")

def expect_equal(actual, expected):
    if actual != expected:
        raise __PythoniaExpectationError(actual, expected)

assert_equal = expect_equal

def __pythonia_run(name, test_fn):
    try:
        test_fn()
        __pythonia_results.append({"name": name, "passed": True, "message": "Тест пройден"})
    except AssertionError as exc:
        result = {"name": name, "passed": False, "message": str(exc) or "Проверка не прошла"}
        if hasattr(exc, "expected"):
            result["expected"] = exc.expected
        if hasattr(exc, "actual"):
            result["actual"] = exc.actual
        __pythonia_results.append(result)
    except Exception:
        __pythonia_results.append({"name": name, "passed": False, "message": traceback.format_exc(limit=1).strip()})

${userCode}

${testBlocks}

print("${RESULT_MARKER}" + json.dumps(__pythonia_results))
`.trimStart()
}

function parseResults(stdout) {
  const markerLine = stdout
    .split(/\r?\n/)
    .reverse()
    .find((line) => line.startsWith(RESULT_MARKER))

  if (!markerLine) return null

  try {
    return JSON.parse(markerLine.slice(RESULT_MARKER.length))
  } catch {
    return null
  }
}

async function runPython(filePath) {
  try {
    return await execFileAsync('python3', [filePath], {
      timeout: 4000,
      maxBuffer: 1024 * 1024,
    })
  } catch (firstError) {
    if (firstError && firstError.code === 'ENOENT') {
      return execFileAsync('python', [filePath], {
        timeout: 4000,
        maxBuffer: 1024 * 1024,
      })
    }

    throw firstError
  }
}

function stripResultMarker(stdout) {
  return stdout
    .split(/\r?\n/)
    .filter((line) => !line.startsWith(RESULT_MARKER))
    .join('\n')
    .trim()
}

async function runChallenge({ slug, code }) {
  if (!slug || !String(code ?? '').trim()) {
    return {
      passed: false,
      results: [],
      stdout: '',
      stderr: '',
      error: 'Нужны slug урока и код решения.',
    }
  }

  const lessons = await readLessons()
  const lesson = lessons.find((item) => item.slug === slug)
  const tests = lesson?.challenge?.tests

  if (!lesson || !tests?.length) {
    return {
      passed: false,
      results: [],
      stdout: '',
      stderr: '',
      error: 'В этом уроке нет запускаемых тестов.',
    }
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), 'pythonia-'))
  const filePath = path.join(tempDir, 'submission.py')

  try {
    await writeFile(filePath, buildRunner(String(code), tests), 'utf8')
    const { stdout, stderr } = await runPython(filePath)
    const results = parseResults(stdout)

    if (!results) {
      return {
        passed: false,
        results: [],
        stdout,
        stderr,
        error: 'Python завершился до того, как runner успел собрать результаты.',
      }
    }

    return {
      passed: results.every((result) => result.passed),
      results,
      stdout: stripResultMarker(stdout),
      stderr,
    }
  } catch (rawError) {
    const stdout = rawError?.stdout ?? ''
    const stderr = rawError?.stderr ?? ''
    const results = parseResults(stdout)

    if (results) {
      return {
        passed: results.every((result) => result.passed),
        results,
        stdout: stripResultMarker(stdout),
        stderr,
      }
    }

    return {
      passed: false,
      results: [],
      stdout,
      stderr,
      error: rawError?.message ?? 'Не удалось запустить Python.',
      timedOut: rawError?.killed || rawError?.signal === 'SIGTERM',
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function registerIpcHandlers() {
  ipcMain.handle('lessons:list', async () => {
    const lessons = await readLessons()
    return lessons.map(summaryFromLesson)
  })

  ipcMain.handle('lessons:get', async (_event, slug) => {
    const safeSlug = String(slug ?? '').replace(/[^a-zA-Z0-9-]/g, '')
    const lessons = await readLessons()
    return lessons.find((lesson) => lesson.slug === safeSlug) ?? null
  })

  ipcMain.handle('runner:run', async (_event, payload) => runChallenge(payload))
}

function createWindow() {
  const preload = path.join(__dirname, 'preload.cjs')
  const icon = resolveAppIconPath()

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'Pythonia',
    backgroundColor: '#eef2f3',
    show: false,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const target = getRendererUrlOrFile()
  if (target.url) {
    mainWindow.loadURL(target.url)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(target.file)
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
