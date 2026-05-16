import { createSignal, createEffect, For, Show, onCleanup } from 'solid-js';
import type { Challenge as ChallengeT, RunResult } from '../../../shared/types';

interface Props {
  slug: string;
  challenge: ChallengeT;
  alreadySolved: boolean;
  onSolved: () => void;
}

export default function Challenge(props: Props) {
  const [code, setCode] = createSignal(props.challenge.starterCode);
  const [result, setResult] = createSignal<RunResult | null>(null);
  const [running, setRunning] = createSignal(false);
  let debounceTimer: number | undefined;

  createEffect(() => {
    // Reset code when lesson (slug) changes
    props.slug;
    setCode(props.challenge.starterCode);
    setResult(null);
  });

  async function run() {
    setRunning(true);
    try {
      const r = await window.pythonia.runChallenge(props.slug, code());
      setResult(r);
      if (r.ok) props.onSolved();
    } finally {
      setRunning(false);
    }
  }

  function scheduleRun() {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(run, 900);
  }

  onCleanup(() => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
  });

  return (
    <section class="challenge">
      <h2>Задача</h2>
      <p class="prompt">{props.challenge.prompt}</p>
      <textarea
        class="code-editor"
        spellcheck={false}
        value={code()}
        onInput={(e) => {
          setCode(e.currentTarget.value);
          scheduleRun();
        }}
      />
      <div class="challenge-actions">
        <button class="primary" onClick={run} disabled={running()}>
          {running() ? 'Запуск…' : 'Запустить тесты'}
        </button>
        <button
          class="ghost"
          onClick={() => {
            setCode(props.challenge.starterCode);
            setResult(null);
          }}
        >
          Сбросить код
        </button>
        <Show when={props.alreadySolved}>
          <span class="ok">✓ Решено ранее</span>
        </Show>
      </div>
      <Show when={result()}>
        {(r) => (
          <div class="test-results" classList={{ ok: r().ok }}>
            <Show when={r().stderr}>
              <pre class="stderr">{r().stderr}</pre>
            </Show>
            <ul>
              <For each={r().results}>
                {(t) => (
                  <li classList={{ passed: t.passed, failed: !t.passed }}>
                    <span class="marker">{t.passed ? '✓' : '✗'}</span>
                    <span class="test-name">{t.name}</span>
                    <Show when={t.error}>
                      <pre class="test-error">{t.error}</pre>
                    </Show>
                    <Show when={t.stdout}>
                      <pre class="test-stdout">{t.stdout}</pre>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </div>
        )}
      </Show>
    </section>
  );
}
