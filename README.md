# Pythia

Pythia is a local-first Python learning app. Lessons are plain markdown files, the Astro app owns content and progress, and a small FastAPI executor grades submitted Python against lesson test cases.

## Project Structure

```text
pythia/
  src/content.config.ts
  src/content/lessons/
  src/pages/
  src/components/
  src/lib/
  public/
  executor/
    pythia_executor/
    tests/
  package.json
  start.sh
```

The executor is intentionally lesson-agnostic. It exposes only `POST /execute`; Astro parses lessons, renders pages, sends code to the executor, and stores completion state in SQLite.

## Run Locally

Requirements:

- Python 3.11+
- Node.js 22.12+
- `pnpm` or Corepack

Start both services:

```sh
./start.sh
```

The script installs missing dependencies when possible, starts the executor on `127.0.0.1:8765`, starts Astro on `127.0.0.1:4321`, and opens the lesson list in your browser.

Useful manual commands:

```sh
cd executor
./.venv/bin/python -m pytest -q

cd ..
pnpm dev
pnpm build
pnpm rebuild better-sqlite3  # use after changing Node versions
```

## Lesson Authoring

Add a markdown file to `src/content/lessons/`. Frontmatter is validated by Astro content collections:

```yaml
---
title: Functions and Return Values
difficulty: beginner
order: 3
function_name: square
---
```

Required sections:

````markdown
# Theory

Short explanation in normal markdown.

# Exercise

Prompt text.

```python
def square(x):
    return ___
```

# Tests

```yaml
- input: [2]
  expected: 4
  visible: true
- input: [-3]
  expected: 9
  visible: true
- input: [0]
  expected: 0
  visible: false
```

# Hint

Optional hint text.

# Solution

```python
def square(x):
    return x * x
```
````

Use `___` for each editable blank. The CodeMirror editor keeps all other code read-only and sends the blank values through HTMX.

## Executor Contract

`POST /execute`

```json
{
  "code": "def square(x):\n    return x * x",
  "function_name": "square",
  "tests": [
    { "input": [2], "expected": 4, "visible": true }
  ],
  "timeout_ms": 2000,
  "memory_mb": 128
}
```

Verdicts are `Accepted`, `Wrong Answer`, `Runtime Error`, `Time Limit Exceeded`, `Memory Limit Exceeded`, and `Syntax Error`.

## Progress

Submitting a lesson records an attempt in `data/progress.db`. Accepted submissions mark the lesson complete. Running visible tests does not record progress.
