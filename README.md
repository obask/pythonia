# Pythonia

Pythonia is a desktop-first Python learning app for Russian-language lessons stored in a markdown vault.

The app is intentionally simple:

- Vite + React render the UI.
- TanStack Router handles client-side navigation.
- Electron main reads lesson files and runs Python tests.
- Electron preload exposes a small safe API to the renderer.
- There is no TanStack Start, Nitro, or internal HTTP server in the packaged desktop app.

## Development

Run the simple web preview:

```bash
pnpm install
pnpm dev
```

The web preview can load bundled lesson markdown and edit code, but Python execution is only available in Electron because the browser renderer does not get filesystem or process access.

Run the desktop shell:

```bash
pnpm desktop:dev
```

Build a distributable desktop app:

```bash
pnpm desktop:dist
```

The production build copies the independent lesson vault into the Electron app bundle. Friends do not need the lesson repository/worktree on their machines.

Friends need Python available as `python3` or `python` for coding challenge execution.

## Architecture

```text
electron/main.cjs
  reads markdown lessons
  runs Python test files
  registers IPC handlers

electron/preload.cjs
  exposes window.pythonia.lessons.*
  exposes window.pythonia.runner.*

src/
  Vite React renderer
  TanStack Router
  CodeMirror editor
  localStorage progress tracking
```

The renderer calls `platformApi`. In Electron it uses `window.pythonia`; in web preview it falls back to lessons bundled by Vite and returns a friendly message instead of running Python.

## Lesson Vault

Lessons are authored in the independent content-only branch/worktree `lessons-vault`, located locally at:

```text
/Users/oleg/ClaudeProjects/pythonia--lessons
```

The desktop production build packages files from:

```text
../pythonia--lessons/lessons
```

into the app at:

```text
resources/lessons
```

Electron reads packaged lessons from `process.resourcesPath/lessons`, so the distributed app is self-contained.

Each lesson uses YAML frontmatter for metadata, modules, quizzes, starter code, XP, and tests, followed by normal markdown content.

Use `expect_equal(actual, expected)` inside challenge tests when you want the runner to show both expected and received values on failure.

Set `PYTHONIA_LESSONS_DIR=/path/to/lessons` when you want Electron or the packaging check to use a different vault directory.
