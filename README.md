# Pythonia

Pythonia is a TanStack Start learning app for Russian-language Python lessons stored in a local markdown vault.

## Run

```bash
pnpm install
pnpm dev
```

Open the dev server and choose a lesson from the vault. Each lesson can include markdown content, quiz questions, and a Python coding challenge with tests.

Editor drafts, quiz answers, the last open lesson, and completed lesson status are saved in browser localStorage.

## Desktop App

The regular development loop stays web-only:

```bash
pnpm dev
```

Run the Electron shell separately when you want to test the desktop wrapper:

```bash
pnpm desktop:dev
```

Build a distributable desktop app with:

```bash
pnpm desktop:dist
```

The desktop app starts the built local server internally and loads the same Pythonia UI. Friends still need Python available on their machine for coding challenge execution.

## Lesson Vault

Lessons live in `lessons/*.md`. Each file uses YAML frontmatter for metadata, quizzes, starter code, and tests, followed by normal markdown lesson content.

Use `expect_equal(actual, expected)` inside challenge tests when you want the runner to show both the expected value and the received value on failure.

The local test runner executes submitted Python code with `python3` when available, falling back to `python`.
