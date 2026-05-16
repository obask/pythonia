import { spawn } from 'node:child_process';
import type { Challenge, RunResult, TestResult } from '../shared/types';

const HARNESS = `
import sys, json, traceback
from io import StringIO

payload = json.loads(sys.stdin.read())
user_code = payload["userCode"]
tests = payload["tests"]

def make_expect_equal(collector):
    def expect_equal(actual, expected):
        if actual != expected:
            raise AssertionError(f"expected {expected!r}, got {actual!r}")
        collector.append(True)
    return expect_equal

results = []
for tc in tests:
    buf_out = StringIO()
    old_stdout = sys.stdout
    sys.stdout = buf_out
    entry = {"name": tc["name"], "passed": False}
    try:
        g = {"__name__": "__user__"}
        exec(user_code, g)
        g["expect_equal"] = make_expect_equal([])
        exec(tc["code"], g)
        entry["passed"] = True
    except AssertionError as e:
        entry["error"] = str(e)
    except SyntaxError as e:
        entry["error"] = f"SyntaxError: {e.msg} (line {e.lineno})"
    except Exception as e:
        entry["error"] = f"{type(e).__name__}: {e}"
    finally:
        sys.stdout = old_stdout
        captured = buf_out.getvalue()
        if captured:
            entry["stdout"] = captured
    results.append(entry)

sys.stdout.write(json.dumps(results))
`;

export async function runChallenge(
  challenge: Challenge,
  userCode: string,
  pythonBin = 'python3'
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(pythonBin, ['-c', HARNESS], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
    }, 10_000);

    child.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()));

    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        ok: false,
        results: [],
        stderr: `Could not start python3: ${err.message}`
      });
    });

    child.on('close', () => {
      clearTimeout(timeout);
      try {
        const results = JSON.parse(stdout) as TestResult[];
        const ok = results.every((r) => r.passed);
        resolve({ ok, results, stderr: stderr || undefined });
      } catch {
        resolve({
          ok: false,
          results: [],
          stderr: stderr || `Could not parse harness output: ${stdout}`
        });
      }
    });

    const payload = JSON.stringify({ userCode, tests: challenge.tests });
    child.stdin.write(payload);
    child.stdin.end();
  });
}
