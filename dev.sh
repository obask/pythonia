#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required. Install it with: corepack enable"
  exit 1
fi

if [ ! -d node_modules ]; then
  pnpm install
fi

port="${PYTHONIA_DEV_PORT:-3000}"
while lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
  port=$((port + 1))
done

url="http://127.0.0.1:$port"
lessons_dir="${PYTHONIA_LESSONS_DIR:-../pythonia--lessons/lessons}"

pnpm check:lessons

pnpm dev -- --host 127.0.0.1 --port "$port" --strictPort &
web_pid=$!

cleanup() {
  kill "$web_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

pnpm exec wait-on "http-get://$url"

ELECTRON_START_URL="$url" \
PYTHONIA_LESSONS_DIR="$lessons_dir" \
pnpm exec electron electron/main.cjs
