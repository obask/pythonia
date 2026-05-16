# Pythonia

Electron app for studying Python and CS from a markdown lesson vault.
Loads lessons from `~/ClaudeProjects/pythonia--lessons/lessons` by default.

## Requirements

- **Node.js** 20+
- **pnpm** 10+
- **Python 3** on `PATH` (used to execute coding challenges)
- The lesson vault at `~/ClaudeProjects/pythonia--lessons` (or point `PYTHONIA_VAULT` to a custom path)

## Setup

```sh
pnpm install
```

If Electron's binary did not download automatically (pnpm's build-script sandboxing), run once:

```sh
node node_modules/electron/install.js
```

## Run in dev

```sh
pnpm dev
```

Starts `electron-vite` in dev mode: main + preload are rebuilt on save, the renderer runs through Vite's HMR dev server, and the Electron window launches automatically.

Point at a different vault:

```sh
PYTHONIA_VAULT=/path/to/some/lessons pnpm dev
```

## Typecheck

```sh
pnpm typecheck
```

Runs `tsc --noEmit` for both the Node-side (main + preload) and web-side (renderer) tsconfigs.

## Build for production

```sh
pnpm build
```

Emits bundles into `out/`:

- `out/main/index.js` — Electron main process
- `out/preload/index.js` — context-isolated preload
- `out/renderer/` — static renderer assets (HTML + JS + CSS)

Preview the built app:

```sh
pnpm start
```

## Project layout

```
src/
  main/       Electron main process (window, IPC, lessons, python runner, progress)
  preload/    contextBridge exposing the pythonia API to the renderer
  renderer/   Solid + Vite app (sidebar, lesson view, quiz, challenge)
  shared/     Types shared between main and renderer
```

Progress (completed lessons, XP, quiz answers, solved challenges) is persisted as
`progress.json` inside Electron's `userData` directory.
