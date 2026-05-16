import { For, Show, createMemo, createSignal, createEffect } from 'solid-js';
import type { ModuleGroup, Progress } from '../../../shared/types';

interface Props {
  modules: ModuleGroup[];
  activeSlug: string | null;
  progress: Progress;
  onSelect: (slug: string) => void;
}

export default function Sidebar(props: Props) {
  const [openId, setOpenId] = createSignal<string | null>(null);

  const activeModuleId = createMemo(() => {
    const slug = props.activeSlug;
    if (!slug) return null;
    return props.modules.find((m) => m.lessons.some((l) => l.slug === slug))?.id ?? null;
  });

  // Ensure one section is always expanded: the active one by default, or the first module.
  createEffect(() => {
    const active = activeModuleId();
    if (active) {
      if (openId() !== active) setOpenId(active);
      return;
    }
    if (openId() === null) {
      const first = props.modules[0]?.id ?? null;
      if (first) setOpenId(first);
    }
  });

  function selectModule(id: string): void {
    // Accordion: clicking a header opens it; clicking the open one keeps it open.
    if (openId() !== id) setOpenId(id);
  }

  function moduleStats(mod: ModuleGroup): { done: number; total: number } {
    let done = 0;
    for (const l of mod.lessons) {
      if (props.progress.completedLessons.includes(l.slug)) done += 1;
    }
    return { done, total: mod.lessons.length };
  }

  return (
    <aside id="sidebar" class="sidebar">
      <header class="sidebar-header">
        <h1>Pythonia</h1>
        <div class="vault-xp">XP: {props.progress.xp}</div>
      </header>
      <nav id="lesson-list">
        <For each={props.modules}>
          {(mod) => {
            const isOpen = () => openId() === mod.id;
            const stats = () => moduleStats(mod);
            const isActive = () => activeModuleId() === mod.id;
            return (
              <section class="module" classList={{ active: isActive(), open: isOpen() }}>
                <button
                  class="module-group"
                  onClick={() => selectModule(mod.id)}
                  aria-expanded={isOpen()}
                >
                  <span class="module-title">{mod.title}</span>
                  <span class="module-count">
                    {stats().done}/{stats().total}
                  </span>
                </button>
                <Show when={isOpen()}>
                  <div class="module-lessons">
                    <For each={mod.lessons}>
                      {(lesson) => {
                        const done = () => props.progress.completedLessons.includes(lesson.slug);
                        const active = () => props.activeSlug === lesson.slug;
                        return (
                          <button
                            classList={{
                              'lesson-item': true,
                              active: active(),
                              done: done()
                            }}
                            onClick={() => props.onSelect(lesson.slug)}
                          >
                            <div class="t">
                              <span class="t-text">{lesson.title}</span>
                              <Show when={done()}>
                                <span class="done-mark" aria-label="Пройдено">✓</span>
                              </Show>
                            </div>
                            <Show when={lesson.description}>
                              <div class="d">{lesson.description}</div>
                            </Show>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </section>
            );
          }}
        </For>
      </nav>
    </aside>
  );
}
