# Desktop Distribution

Pythonia packages a Vite renderer and an Electron shell. The production build
also bundles lesson markdown into the app resources so users do not need the
lesson vault on their machines.

## Build Commands

Preview the packaged-style desktop app locally:

```bash
pnpm desktop:preview
```

Create an unpacked app directory:

```bash
pnpm desktop:pack
```

Create distributables:

```bash
pnpm desktop:dist
```

All desktop packaging scripts run these checks first:

```bash
pnpm check:lessons
pnpm build
```

## Lesson Resources

`electron-builder.config.cjs` includes the configured lesson directory as an
extra resource:

```text
resources/lessons
```

By default, packaging reads:

```text
../pythonia--lessons/lessons
```

Override it with:

```bash
PYTHONIA_LESSONS_DIR=/absolute/path/to/lessons pnpm desktop:dist
```

At runtime, a packaged app reads lessons from:

```text
process.resourcesPath/lessons
```

## Runtime Requirements

Users need Python available on `PATH` as either:

```text
python3
```

or:

```text
python
```

The app first tries `python3`, then falls back to `python`.

## Electron Build Targets

Configured targets:

| Platform | Target |
| --- | --- |
| macOS | `dmg`, `zip` |
| Windows | `nsis` |
| Linux | `AppImage` |

The app id is `app.pythonia.desktop` and the product name is `Pythonia`.

## Release Checklist

Before sharing a build:

1. Confirm the intended lessons vault is selected:

   ```bash
   pnpm check:lessons
   ```

2. Run TypeScript checks:

   ```bash
   pnpm typecheck
   ```

3. Build the renderer:

   ```bash
   pnpm build
   ```

4. Smoke-test desktop execution:

   ```bash
   pnpm desktop:preview
   ```

5. Build distributables:

   ```bash
   pnpm desktop:dist
   ```

6. On a clean machine or user-like account, verify:

   - lessons open from the packaged app;
   - challenge tests run;
   - missing Python produces a clear runner error;
   - progress persists after restarting the app.
