import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { createFileRoute } from '@tanstack/react-router'
import { getLesson } from '@/lib/lesson-vault'
import type { ChallengeTest, RunResponse, RunResult } from '@/types/lesson'

const execFileAsync = promisify(execFile)
const RESULT_MARKER = '__PYTHONIA_RESULTS__'

function indentPython(source: string) {
  const trimmed = source.trimEnd()
  if (!trimmed) return '    pass'
  return trimmed
    .split('\n')
    .map((line) => (line.trim() ? `    ${line}` : line))
    .join('\n')
}

function buildRunner(userCode: string, tests: ChallengeTest[]) {
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

function parseResults(stdout: string): RunResult[] | null {
  const markerLine = stdout
    .split(/\r?\n/)
    .reverse()
    .find((line) => line.startsWith(RESULT_MARKER))

  if (!markerLine) return null

  try {
    return JSON.parse(markerLine.slice(RESULT_MARKER.length)) as RunResult[]
  } catch {
    return null
  }
}

async function runPython(filePath: string) {
  try {
    return await execFileAsync('python3', [filePath], {
      timeout: 4000,
      maxBuffer: 1024 * 1024,
    })
  } catch (firstError) {
    const error = firstError as NodeJS.ErrnoException & {
      stdout?: string
      stderr?: string
      killed?: boolean
      signal?: string
    }

    if (error.code === 'ENOENT') {
      return execFileAsync('python', [filePath], {
        timeout: 4000,
        maxBuffer: 1024 * 1024,
      })
    }

    throw firstError
  }
}

export const Route = createFileRoute('/api/run')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          slug?: string
          code?: string
        }
        const slug = String(body.slug ?? '')
        const code = String(body.code ?? '')

        if (!slug || !code.trim()) {
          return Response.json(
            { error: 'Нужны slug урока и код решения.' },
            { status: 400 },
          )
        }

        if (code.length > 15000) {
          return Response.json(
            { error: 'Решение слишком большое для локального runner.' },
            { status: 413 },
          )
        }

        const lesson = await getLesson(slug)
        const tests = lesson?.challenge?.tests

        if (!lesson || !tests?.length) {
          return Response.json(
            { error: 'В этом уроке нет запускаемых тестов.' },
            { status: 404 },
          )
        }

        const tempDir = await mkdtemp(path.join(tmpdir(), 'pythonia-'))
        const filePath = path.join(tempDir, 'submission.py')
        const runner = buildRunner(code, tests)

        try {
          await writeFile(filePath, runner, 'utf8')
          const { stdout, stderr } = await runPython(filePath)
          const results = parseResults(stdout)

          if (!results) {
            const response: RunResponse = {
              passed: false,
              results: [],
              stdout,
              stderr,
              error: 'Python завершился до того, как runner успел собрать результаты.',
            }
            return Response.json(response)
          }

          const response: RunResponse = {
            passed: results.every((result) => result.passed),
            results,
            stdout: stdout
              .split(/\r?\n/)
              .filter((line) => !line.startsWith(RESULT_MARKER))
              .join('\n')
              .trim(),
            stderr,
          }

          return Response.json(response)
        } catch (rawError) {
          const error = rawError as Error & {
            stdout?: string
            stderr?: string
            killed?: boolean
            signal?: string
          }
          const stdout = error.stdout ?? ''
          const stderr = error.stderr ?? ''
          const results = parseResults(stdout)

          if (results) {
            const response: RunResponse = {
              passed: results.every((result) => result.passed),
              results,
              stdout: stdout
                .split(/\r?\n/)
                .filter((line) => !line.startsWith(RESULT_MARKER))
                .join('\n')
                .trim(),
              stderr,
            }
            return Response.json(response)
          }

          const response: RunResponse = {
            passed: false,
            results: [],
            stdout,
            stderr,
            error: error.message,
            timedOut: error.killed || error.signal === 'SIGTERM',
          }

          return Response.json(response)
        } finally {
          await rm(tempDir, { recursive: true, force: true })
        }
      },
    },
  },
})
