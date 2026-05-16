# Pythonia Documentation

Pythonia is a desktop-first Python learning app for Russian-language lessons.
The renderer is a Vite + React app, while Electron handles lesson file access and
Python challenge execution.

## Start Here

- [Architecture](./architecture.md) explains the renderer, Electron shell,
  lesson loading paths, IPC API, progress storage, and Python runner.
- [Lesson authoring](./lesson-authoring.md) describes markdown lesson files,
  frontmatter fields, quizzes, challenges, tests, and completion rules.
- [Desktop distribution](./desktop-distribution.md) covers packaging, bundled
  lesson resources, runtime Python requirements, and release checks.

## Common Commands

Install dependencies:

```bash
pnpm install
```

Run the web preview:

```bash
pnpm dev
```

Run the Electron desktop shell:

```bash
pnpm desktop:dev
```

Build the renderer:

```bash
pnpm build
```

Build a desktop distributable:

```bash
pnpm desktop:dist
```

Type-check the project:

```bash
pnpm typecheck
```

Check the configured lessons vault:

```bash
pnpm check:lessons
```

## Runtime Modes

| Mode | Command | Lesson source | Python execution |
| --- | --- | --- | --- |
| Web preview | `pnpm dev` | Markdown bundled by Vite from `lessons/*.md` | Not available |
| Electron dev | `pnpm desktop:dev` | `PYTHONIA_LESSONS_DIR` or sibling vault | Available |
| Electron preview | `pnpm desktop:preview` | `PYTHONIA_LESSONS_DIR` or sibling vault | Available |
| Packaged app | `pnpm desktop:dist` | `resources/lessons` inside the app bundle | Available |

In browser preview, users can read lessons and edit code. Running tests requires
the Electron shell because the browser renderer does not get filesystem or
process access.

## Repository Map

```text
electron/main.cjs              Electron window, lesson IO, Python runner, IPC
electron/preload.cjs           Safe window.pythonia bridge for the renderer
src/App.tsx                    Main learning UI, editor, quiz, progress state
src/lib/lesson-content.ts      Markdown frontmatter parsing and lesson sorting
src/lib/platform-api.ts        Desktop API wrapper and browser fallback
src/types/lesson.ts            Shared lesson and runner response types
lessons/*.md                   Bundled fallback lessons for web preview
scripts/check-lessons-vault.cjs Lesson vault validation used by desktop scripts
electron-builder.config.cjs    Desktop packaging and extra resources
```

## Environment

`PYTHONIA_LESSONS_DIR` can point Electron and packaging checks at a custom
lesson directory:

```bash
PYTHONIA_LESSONS_DIR=/absolute/path/to/lessons pnpm desktop:dev
```

If the variable is not set, development mode looks for the sibling lesson vault
at `../pythonia--lessons/lessons`, then falls back to this repository's
`lessons/` directory.
