import type { ChallengeTest, RunResult, TestResult } from "../shared/types";

const TIMEOUT_MS = 4000;

type PythonPayload = {
  tests: Array<{ name: string; passed: boolean; message: string }>;
};

function buildHarness(code: string, tests: ChallengeTest[]) {
  return `
import json
import traceback

results = []

def expect_equal(actual, expected):
    if actual != expected:
        raise AssertionError(f"expected {expected!r}, got {actual!r}")

${code}

for test in ${JSON.stringify(tests)}:
    try:
        exec(test["code"], globals())
        results.append({"name": test["name"], "passed": True, "message": "passed"})
    except Exception as exc:
        results.append({
            "name": test["name"],
            "passed": False,
            "message": "".join(traceback.format_exception_only(type(exc), exc)).strip(),
        })

print("__PYTHONIA_JSON__" + json.dumps({"tests": results}, ensure_ascii=False))
`;
}

function parseResults(stdout: string): TestResult[] {
  const marker = "__PYTHONIA_JSON__";
  const line = stdout
    .split(/\r?\n/)
    .find((item) => item.startsWith(marker));

  if (!line) {
    return [
      {
        name: "Python runtime",
        passed: false,
        message: "No test result payload returned.",
      },
    ];
  }

  const parsed = JSON.parse(line.slice(marker.length)) as PythonPayload;
  return parsed.tests;
}

export async function runPythonChallenge(code: string, tests: ChallengeTest[]): Promise<RunResult> {
  const startedAt = performance.now();
  const proc = Bun.spawn(["python3", "-I", "-"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  proc.stdin.write(buildHarness(code, tests));
  proc.stdin.end();

  const timeout = setTimeout(() => proc.kill(), TIMEOUT_MS);
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  clearTimeout(timeout);

  const durationMs = Math.round(performance.now() - startedAt);
  const cleanStdout = stdout
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("__PYTHONIA_JSON__"))
    .join("\n")
    .trim();

  if (exitCode !== 0) {
    return {
      passed: false,
      results: [
        {
          name: "Python runtime",
          passed: false,
          message: stderr.trim() || `Process exited with code ${exitCode}.`,
        },
      ],
      stdout: cleanStdout,
      stderr: stderr.trim(),
      durationMs,
    };
  }

  const results = parseResults(stdout);
  return {
    passed: results.every((result) => result.passed),
    results,
    stdout: cleanStdout,
    stderr: stderr.trim(),
    durationMs,
  };
}
