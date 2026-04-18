import type { ExecuteResponse } from './executor-client.ts';

const ICONS: Record<string, string> = {
  Accepted: '✓',
  'Wrong Answer': '✗',
  'Runtime Error': '!',
  'Time Limit Exceeded': '⧗',
  'Memory Limit Exceeded': '⛁',
  'Syntax Error': '⚠',
};

const CLASSES: Record<string, string> = {
  Accepted: 'accepted',
  'Wrong Answer': 'wrong',
  'Runtime Error': 'runtime',
  'Time Limit Exceeded': 'tle',
  'Memory Limit Exceeded': 'mle',
  'Syntax Error': 'syntax',
};

const MESSAGES: Record<string, string> = {
  Accepted: 'The oracle accepts your answer.',
  'Wrong Answer': 'The output does not match.',
  'Runtime Error': 'Your code raised an exception.',
  'Time Limit Exceeded': 'Your code took too long to respond.',
  'Memory Limit Exceeded': 'Your code used too much memory.',
  'Syntax Error': 'Your code could not be parsed.',
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmt(v: unknown): string {
  try {
    return esc(JSON.stringify(v));
  } catch {
    return esc(String(v));
  }
}

export function renderEmptyResult(): string {
  return '<p class="result-empty">Fill in the blanks and press Run or Submit.</p>';
}

export function renderResult(
  response: ExecuteResponse,
  mode: 'run' | 'submit',
  opts: { completed?: boolean } = {},
): string {
  const verdictClass = CLASSES[response.verdict] ?? 'runtime';
  const icon = ICONS[response.verdict] ?? '!';
  const message = MESSAGES[response.verdict] ?? '';
  const runtimeNote = mode === 'run' ? ' · visible tests only' : '';

  const cases = response.results
    .map((r, i) => {
      const label = r.visible ? `case ${i + 1}` : 'hidden';
      const mainLine = r.error
        ? `<div><span>error</span><code>${esc(r.error.split('\n')[0])}</code></div>`
        : `<div><span>got</span><code>${fmt(r.actual)}</code></div>`;
      const tb =
        r.error && r.error.includes('\n')
          ? `<details><summary>Show full traceback</summary><pre>${esc(r.error)}</pre></details>`
          : '';
      return `
        <div class="case ${r.passed ? 'passed' : 'failed'}">
          <span class="status">${r.passed ? '✓' : '✗'}</span>
          <div class="io">
            <div><span>input</span><code>${fmt(r.input)}</code></div>
            <div><span>expected</span><code>${fmt(r.expected)}</code></div>
            ${mainLine}
          </div>
          <span class="visibility">${esc(label)}</span>
          ${tb}
        </div>`;
    })
    .join('');

  const casesBlock = response.results.length > 0 ? `<div class="cases">${cases}</div>` : '';
  const completedNote =
    opts.completed && response.verdict === 'Accepted'
      ? '<p style="color: var(--accept); margin-top: 0.75rem;">Lesson marked complete.</p>'
      : '';

  return `
    <div class="verdict ${verdictClass}">
      <span class="icon">${esc(icon)}</span>
      <span class="label">${esc(response.verdict)}</span>
      <span class="msg">— ${esc(message)}</span>
      <span class="runtime">${response.runtime_ms} ms${esc(runtimeNote)}</span>
    </div>
    ${casesBlock}
    ${completedNote}
  `;
}
