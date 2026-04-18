import type { TestCase } from './lesson.ts';

export type Verdict =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Runtime Error'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Syntax Error';

export type CaseResult = {
  passed: boolean;
  input: unknown[];
  expected: unknown;
  actual: unknown;
  visible: boolean;
  error: string | null;
};

export type ExecuteResponse = {
  verdict: Verdict;
  results: CaseResult[];
  runtime_ms: number;
};

function executorUrl(): string {
  const host = process.env.PYTHIA_EXECUTOR_HOST ?? '127.0.0.1';
  const port = process.env.PYTHIA_EXECUTOR_PORT ?? '8765';
  return `http://${host}:${port}`;
}

export async function executeCode(args: {
  code: string;
  function_name: string;
  tests: TestCase[];
  timeout_ms?: number;
  memory_mb?: number;
}): Promise<ExecuteResponse> {
  const res = await fetch(`${executorUrl()}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: args.code,
      function_name: args.function_name,
      tests: args.tests,
      timeout_ms: args.timeout_ms ?? 2000,
      memory_mb: args.memory_mb ?? 128,
    }),
  });
  if (!res.ok) {
    throw new Error(`Executor returned ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as ExecuteResponse;
}
