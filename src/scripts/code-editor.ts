import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';

type Span =
  | { kind: 'fixed'; text: string }
  | { kind: 'blank'; index: number; placeholder: string };

type Region = { from: number; to: number; kind: 'fixed' | 'blank'; index?: number };

function tokenize(template: string): Span[] {
  const spans: Span[] = [];
  let cursor = 0;
  let idx = 0;
  const re = /___/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    if (m.index > cursor) spans.push({ kind: 'fixed', text: template.slice(cursor, m.index) });
    spans.push({ kind: 'blank', index: idx++, placeholder: '' });
    cursor = m.index + 3;
  }
  if (cursor < template.length) spans.push({ kind: 'fixed', text: template.slice(cursor) });
  return spans;
}

function buildDoc(spans: Span[], blanks: string[]): { doc: string; regions: Region[] } {
  let doc = '';
  const regions: Region[] = [];
  for (const span of spans) {
    if (span.kind === 'fixed') {
      const from = doc.length;
      doc += span.text;
      regions.push({ from, to: doc.length, kind: 'fixed' });
    } else {
      const value = blanks[span.index] ?? '';
      const from = doc.length;
      doc += value.length === 0 ? ' ' : value;
      regions.push({ from, to: doc.length, kind: 'blank', index: span.index });
    }
  }
  return { doc, regions };
}

function makeReadOnlyFilter(getRegions: () => Region[]) {
  return EditorState.changeFilter.of((tr) => {
    if (tr.docChanged === false) return true;
    const regions = getRegions();
    let ok = true;
    tr.changes.iterChanges((fromA, toA) => {
      const touchesEditableBlank = regions.some((r) => {
        if (r.kind !== 'blank') return false;
        if (fromA === toA) return fromA >= r.from && fromA <= r.to;
        return fromA >= r.from && toA <= r.to;
      });
      if (!touchesEditableBlank) ok = false;
    });
    return ok;
  });
}

function decorationsFor(regions: Region[]): DecorationSet {
  const marks = regions
    .filter((r) => r.to > r.from)
    .map((r) =>
      Decoration.mark({
        class: r.kind === 'fixed' ? 'cm-locked' : 'cm-blank',
        inclusive: false,
      }).range(r.from, r.to),
    );
  return Decoration.set(marks, true);
}

function recomputeRegions(doc: string, spans: Span[]): Region[] {
  const regions: Region[] = [];
  let cursor = 0;
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    if (span.kind === 'fixed') {
      const from = cursor;
      const end = from + span.text.length;
      regions.push({ from, to: end, kind: 'fixed' });
      cursor = end;
    } else {
      let nextFixed: string | null = null;
      for (let j = i + 1; j < spans.length; j++) {
        if (spans[j].kind === 'fixed') {
          nextFixed = (spans[j] as { kind: 'fixed'; text: string }).text;
          break;
        }
      }
      const blankStart = cursor;
      let blankEnd: number;
      if (nextFixed === null) {
        blankEnd = doc.length;
      } else {
        const found = doc.indexOf(nextFixed, blankStart);
        blankEnd = found === -1 ? doc.length : found;
      }
      regions.push({ from: blankStart, to: blankEnd, kind: 'blank', index: span.index });
      cursor = blankEnd;
    }
  }
  return regions;
}

function extractBlanks(doc: string, spans: Span[]): string[] {
  const regions = recomputeRegions(doc, spans);
  const blanks: string[] = [];
  for (const r of regions) {
    if (r.kind !== 'blank') continue;
    let text = doc.slice(r.from, r.to);
    if (text === ' ') text = '';
    blanks[r.index!] = text;
  }
  return blanks;
}

function initCodeEditor(shell: HTMLElement): void {
  if (shell.dataset.editorReady === 'true') return;
  shell.dataset.editorReady = 'true';

  const init = JSON.parse(shell.dataset.initial!) as { template: string; blanks: string[] };
  const formId = shell.dataset.form!;
  const form = document.getElementById(formId) as HTMLFormElement | null;
  const hidden = form?.querySelector<HTMLInputElement>('input[name="blanks"]');
  const mount = shell.querySelector<HTMLElement>('.editor-mount');
  if (!form || !hidden || !mount) return;

  const spans = tokenize(init.template);
  const { doc } = buildDoc(spans, init.blanks);
  let currentRegions = recomputeRegions(doc, spans);

  const decoCompartment = new Compartment();

  const updateListener = EditorView.updateListener.of((u) => {
    if (u.docChanged) {
      const newDoc = u.state.doc.toString();
      currentRegions = recomputeRegions(newDoc, spans);
      view.dispatch({
        effects: decoCompartment.reconfigure(
          EditorView.decorations.of(decorationsFor(currentRegions)),
        ),
      });
      hidden.value = JSON.stringify(extractBlanks(newDoc, spans));
    }
  });

  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        python(),
        oneDark,
        highlightActiveLine(),
        makeReadOnlyFilter(() => currentRegions),
        decoCompartment.of(EditorView.decorations.of(decorationsFor(currentRegions))),
        updateListener,
        EditorView.theme({
          '&': { height: 'auto' },
          '.cm-content': { padding: '1rem 0' },
          '.cm-gutters': {
            backgroundColor: '#0c1018',
            borderRight: '1px solid #293241',
            color: '#667085',
          },
          '.cm-line': { padding: '0 1rem' },
          '.cm-scroller': { minHeight: '220px' },
        }),
      ],
    }),
    parent: mount,
  });

  hidden.value = JSON.stringify(extractBlanks(doc, spans));

  const firstBlank = currentRegions.find((r) => r.kind === 'blank');
  if (firstBlank) {
    view.dispatch({ selection: EditorSelection.single(firstBlank.from) });
    view.focus();
  }
}

function initCodeEditors(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-code-editor]').forEach(initCodeEditor);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initCodeEditors());
} else {
  initCodeEditors();
}

document.body.addEventListener('htmx:load', (event) => {
  initCodeEditors(event.target as ParentNode);
});
