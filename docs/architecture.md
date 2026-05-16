# Architecture

Pythonia has two runtime halves:

- The renderer is a Vite + React application mounted from `src/client.tsx`.
- Electron owns native access: reading lesson files, executing Python, and
  exposing a narrow IPC bridge.

The packaged desktop app does not use TanStack Start, Nitro, or an internal HTTP
server. It loads the built renderer from `dist/index.html`.

## Renderer

`src/App.tsx` contains the main learning experience:

- left rail with modules, lessons, XP, and completion state;
- lesson article rendered through `react-markdown` and `remark-gfm`;
- CodeMirror Python editor for challenges;
- test result console;
- quiz panel with multiple-choice and short-answer questions.

Routing is intentionally small. `src/router.tsx` creates one hash route for `/`
with TanStack Router and `createHashHistory()`. Hash routing keeps the packaged
desktop build simple because Electron loads a local file.

## Platform API

The renderer only talks to `src/lib/platform-api.ts`.

In Electron, `platformApi` delegates to `window.pythonia`, which is exposed by
`electron/preload.cjs`.

In browser preview, it falls back to lessons imported by Vite with:

```ts
import.meta.glob('/lessons/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
})
```

The browser fallback returns lessons and lesson details, but `runCode()` returns
a friendly message explaining that Python execution is desktop-only.

## Electron Bridge

`electron/preload.cjs` exposes a small API:

```text
window.pythonia.lessons.list()
window.pythonia.lessons.get(slug)
window.pythonia.runner.run({ slug, code })
```

`electron/main.cjs` registers matching IPC handlers:

```text
lessons:list
lessons:get
runner:run
```

The renderer does not get direct Node.js access. The Electron window uses
`contextIsolation: true` and `nodeIntegration: false`.

## Lesson Loading

Lesson markdown is parsed in both environments:

- `src/lib/lesson-content.ts` handles browser preview parsing.
- `electron/main.cjs` has equivalent parsing for desktop lesson files.

Both paths:

- parse YAML frontmatter when a file starts with `---`;
- derive a fallback slug from the filename by removing `.md` and a numeric
  prefix such as `01-`;
- normalize missing fields to sensible defaults;
- sort by `moduleOrder`, then lesson `order`, then title.

Electron resolves the lessons directory in this order:

1. `PYTHONIA_LESSONS_DIR`, when set.
2. `process.resourcesPath/lessons`, when the app is packaged.
3. `../pythonia--lessons/lessons`, when that sibling vault exists.
4. this repository's `lessons/` directory.

## Progress Storage

Progress is local to the renderer and stored in `localStorage` under:

```text
pythonia.progress.v1
```

Stored data includes:

- code by lesson slug;
- quiz answers by lesson slug;
- completed lesson slugs;
- last active lesson slug.

A lesson becomes complete when all challenge tests pass and all quiz questions
are answered correctly. Lessons without a challenge only require the quiz.
Lessons without a quiz only require passing the challenge.

## Python Runner

Challenge execution is implemented in `electron/main.cjs`.

For each run, Electron:

1. loads the selected lesson by slug;
2. reads the lesson's `challenge.tests`;
3. creates a temporary directory;
4. writes a generated `submission.py`;
5. runs `python3 submission.py`, falling back to `python` if `python3` is not
   available;
6. parses a JSON result marker from stdout;
7. deletes the temporary directory.

The runner injects user code before the generated test functions. Tests can use:

```python
expect_equal(actual, expected)
assert_equal(actual, expected)
```

Both helpers report expected and actual values in the UI when a comparison
fails.

Execution has a 4 second timeout and a 1 MiB output buffer. If Python exits
before the result marker is printed, the UI receives stdout, stderr, and an
error explaining that results could not be collected.
