import yaml from 'js-yaml';
import { marked } from 'marked';

export type TestCase = {
  input: unknown[];
  expected: unknown;
  visible: boolean;
};

export type Lesson = {
  theoryHtml: string;
  exerciseDescriptionHtml: string;
  codeTemplate: string;
  tests: TestCase[];
  hintHtml: string | null;
  solution: string | null;
};

const SECTION_HEADERS = ['Theory', 'Exercise', 'Tests', 'Hint', 'Solution'] as const;
type Section = (typeof SECTION_HEADERS)[number];

function splitSections(body: string): Record<Section, string> {
  const sections: Partial<Record<Section, string[]>> = {};
  let current: Section | null = null;
  for (const line of body.split('\n')) {
    const match = /^#\s+(.+)\s*$/.exec(line);
    if (match && (SECTION_HEADERS as readonly string[]).includes(match[1].trim())) {
      current = match[1].trim() as Section;
      sections[current] = [];
      continue;
    }
    if (current) sections[current]!.push(line);
  }
  const out = {} as Record<Section, string>;
  for (const key of SECTION_HEADERS) {
    out[key] = (sections[key] ?? []).join('\n').trim();
  }
  return out;
}

function extractFence(md: string, lang: string): { before: string; code: string } | null {
  const re = new RegExp('```' + lang + '\\s*\\n([\\s\\S]*?)```', 'm');
  const m = re.exec(md);
  if (!m) return null;
  return { before: md.slice(0, m.index).trim(), code: m[1].replace(/\n$/, '') };
}

function stripLeadingPythonFence(md: string): string {
  return md.replace(/```python[\s\S]*?```/g, '').trim();
}

export function parseLesson(body: string): Lesson {
  const sections = splitSections(body);

  const exerciseFence = extractFence(sections.Exercise, 'python');
  if (!exerciseFence) {
    throw new Error('Lesson is missing a ```python code block in the # Exercise section');
  }

  const testsFence = extractFence(sections.Tests, 'yaml');
  if (!testsFence) {
    throw new Error('Lesson is missing a ```yaml block in the # Tests section');
  }
  const testsRaw = yaml.load(testsFence.code);
  if (!Array.isArray(testsRaw)) {
    throw new Error('Tests block must be a YAML list');
  }
  const tests: TestCase[] = testsRaw.map((t: any) => ({
    input: t.input,
    expected: t.expected,
    visible: t.visible ?? true,
  }));

  const solutionFence = sections.Solution ? extractFence(sections.Solution, 'python') : null;

  return {
    theoryHtml: marked.parse(sections.Theory, { async: false }) as string,
    exerciseDescriptionHtml: marked.parse(exerciseFence.before, { async: false }) as string,
    codeTemplate: exerciseFence.code,
    tests,
    hintHtml: sections.Hint
      ? (marked.parse(stripLeadingPythonFence(sections.Hint), { async: false }) as string)
      : null,
    solution: solutionFence?.code ?? null,
  };
}

export type BlankSpan = { kind: 'fixed'; text: string } | { kind: 'blank'; index: number };

export function tokenizeTemplate(template: string): BlankSpan[] {
  const spans: BlankSpan[] = [];
  let cursor = 0;
  let idx = 0;
  const re = /___/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    if (m.index > cursor) {
      spans.push({ kind: 'fixed', text: template.slice(cursor, m.index) });
    }
    spans.push({ kind: 'blank', index: idx++ });
    cursor = m.index + 3;
  }
  if (cursor < template.length) {
    spans.push({ kind: 'fixed', text: template.slice(cursor) });
  }
  return spans;
}

export function reconstructCode(template: string, blanks: string[]): string {
  let i = 0;
  return template.replace(/___/g, () => blanks[i++] ?? '');
}
