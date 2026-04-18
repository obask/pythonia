#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXECUTOR_PORT="${PYTHIA_EXECUTOR_PORT:-8765}"
ASTRO_PORT="${PYTHIA_ASTRO_PORT:-4321}"
PYTHIA_EXECUTOR_HOST="${PYTHIA_EXECUTOR_HOST:-127.0.0.1}"
PNPM_BIN="${PNPM_BIN:-pnpm}"

cleanup() {
  if [[ -n "${EXECUTOR_PID:-}" ]]; then
    kill "$EXECUTOR_PID" 2>/dev/null || true
  fi
  if [[ -n "${ASTRO_PID:-}" ]]; then
    kill "$ASTRO_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

ensure_executor_env() {
  cd "$ROOT/executor"
  if [[ -x ".venv/bin/python" ]]; then
    return
  fi
  if command -v uv >/dev/null 2>&1; then
    uv sync
  else
    python3 -m venv .venv
    .venv/bin/python -m pip install --upgrade pip
    .venv/bin/python -m pip install -e .
  fi
}

ensure_astro_env() {
  cd "$ROOT"
  if [[ -d "node_modules" ]]; then
    return
  fi
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install
  else
    corepack enable
    corepack pnpm install
    PNPM_BIN="corepack pnpm"
  fi
  $PNPM_BIN rebuild better-sqlite3 >/dev/null 2>&1 || true
}

wait_for_astro() {
  local url="http://127.0.0.1:${ASTRO_PORT}/"
  for _ in {1..80}; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return
    fi
    sleep 0.25
  done
  echo "Astro did not become ready at $url" >&2
  exit 1
}

wait_for_executor() {
  local url="http://${PYTHIA_EXECUTOR_HOST}:${EXECUTOR_PORT}/execute"
  local payload='{"code":"def f():\n    return 1","function_name":"f","tests":[{"input":[],"expected":1,"visible":true}],"timeout_ms":500,"memory_mb":64}'
  for _ in {1..40}; do
    if curl -fsS -X POST "$url" -H 'Content-Type: application/json' -d "$payload" >/dev/null 2>&1; then
      return
    fi
    sleep 0.25
  done
  echo "Executor did not become ready at $url" >&2
  exit 1
}

ensure_executor_env
ensure_astro_env

cd "$ROOT/executor"
PYTHIA_EXECUTOR_HOST="$PYTHIA_EXECUTOR_HOST" \
PYTHIA_EXECUTOR_PORT="$EXECUTOR_PORT" \
PYTHONPATH="$ROOT/executor" \
  .venv/bin/python -m pythia_executor.main &
EXECUTOR_PID=$!

wait_for_executor

cd "$ROOT"
PYTHIA_EXECUTOR_HOST="$PYTHIA_EXECUTOR_HOST" \
PYTHIA_EXECUTOR_PORT="$EXECUTOR_PORT" \
PYTHIA_DB_PATH="$ROOT/data/progress.db" \
  $PNPM_BIN dev --host 127.0.0.1 --port "$ASTRO_PORT" &
ASTRO_PID=$!

wait_for_astro

URL="http://127.0.0.1:${ASTRO_PORT}/"
echo "Pythia is running at $URL"
if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
fi

wait
