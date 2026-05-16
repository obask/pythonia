import { createResource, createSignal, Show, For, createMemo, onMount, onCleanup } from 'solid-js';
import type { Lesson, ModuleGroup, Progress, ThemeState } from '../../shared/types';
import Sidebar from './components/Sidebar';
import LessonView from './components/LessonView';

const EMPTY_PROGRESS: Progress = {
  completedLessons: [],
  xp: 0,
  quizAnswers: {},
  challengesSolved: [],
  lastLessonSlug: null
};

function applyTheme(state: ThemeState): void {
  document.documentElement.dataset.theme = state.effective;
}

export default function App() {
  const [modules] = createResource<ModuleGroup[]>(() => window.pythonia.listLessons());
  const [progress, { mutate: setProgress }] = createResource<Progress>(
    async () => (await window.pythonia.getProgress()) ?? EMPTY_PROGRESS
  );
  const [activeSlug, setActiveSlugRaw] = createSignal<string | null>(null);
  const [restoredFromProgress, setRestoredFromProgress] = createSignal(false);

  function setActiveSlug(slug: string | null) {
    setActiveSlugRaw(slug);
    const cur = progress();
    if (cur && cur.lastLessonSlug !== slug) {
      void persist({ ...cur, lastLessonSlug: slug });
    }
  }

  onMount(async () => {
    const initial = await window.pythonia.getTheme();
    applyTheme(initial);
    const off = window.pythonia.onThemeChange(applyTheme);
    onCleanup(off);
  });

  // Once progress + modules are loaded, restore the last-viewed lesson if it still exists.
  createMemo(() => {
    if (restoredFromProgress()) return;
    const p = progress();
    const mods = modules();
    if (!p || !mods) return;
    const last = p.lastLessonSlug;
    if (last && mods.some((m) => m.lessons.some((l) => l.slug === last))) {
      setActiveSlugRaw(last);
    }
    setRestoredFromProgress(true);
  });

  const flatLessons = createMemo(() => {
    const list = modules();
    if (!list) return [];
    return list.flatMap((m) => m.lessons);
  });

  const nextSlug = createMemo(() => {
    const slug = activeSlug();
    const lessons = flatLessons();
    if (!slug) return lessons[0]?.slug ?? null;
    const idx = lessons.findIndex((l) => l.slug === slug);
    if (idx === -1) return null;
    return lessons[idx + 1]?.slug ?? null;
  });

  const [activeLesson] = createResource(activeSlug, async (slug) => {
    if (!slug) return null;
    return window.pythonia.getLesson(slug);
  });

  async function persist(next: Progress) {
    setProgress(next);
    await window.pythonia.saveProgress(next);
  }

  async function markLessonComplete(lesson: Lesson) {
    const cur = progress() ?? EMPTY_PROGRESS;
    if (cur.completedLessons.includes(lesson.slug)) return;
    await persist({
      ...cur,
      completedLessons: [...cur.completedLessons, lesson.slug],
      xp: cur.xp + (lesson.xp ?? 0)
    });
  }

  async function markChallengeSolved(slug: string) {
    const cur = progress() ?? EMPTY_PROGRESS;
    if (cur.challengesSolved.includes(slug)) return;
    await persist({ ...cur, challengesSolved: [...cur.challengesSolved, slug] });
  }

  async function recordQuizAnswer(slug: string, questionId: string, correct: boolean) {
    const cur = progress() ?? EMPTY_PROGRESS;
    const lessonAnswers = { ...(cur.quizAnswers[slug] ?? {}), [questionId]: correct };
    await persist({ ...cur, quizAnswers: { ...cur.quizAnswers, [slug]: lessonAnswers } });
  }

  return (
    <div class="app">
      <Sidebar
        modules={modules() ?? []}
        activeSlug={activeSlug()}
        progress={progress() ?? EMPTY_PROGRESS}
        onSelect={setActiveSlug}
      />
      <main class="main">
        <Show
          when={activeLesson()}
          fallback={
            <div class="empty">
              <h1>Pythonia</h1>
              <p>Выбери урок слева, чтобы начать.</p>
              <Show when={modules.loading}>
                <p class="muted">Загружаю уроки…</p>
              </Show>
              <Show when={modules.error}>
                <pre class="error">{String(modules.error)}</pre>
              </Show>
            </div>
          }
        >
          {(lesson) => (
            <LessonView
              lesson={lesson()!}
              progress={progress() ?? EMPTY_PROGRESS}
              nextSlug={nextSlug()}
              onNext={() => {
                const n = nextSlug();
                if (n) setActiveSlug(n);
              }}
              onLessonComplete={() => markLessonComplete(lesson()!)}
              onChallengeSolved={() => markChallengeSolved(lesson()!.slug)}
              onQuizAnswer={(qid, correct) =>
                recordQuizAnswer(lesson()!.slug, qid, correct)
              }
            />
          )}
        </Show>
      </main>
    </div>
  );
}
