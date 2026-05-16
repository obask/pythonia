import { Show, For, createMemo } from 'solid-js';
import type { Lesson, Progress } from '../../../shared/types';
import { renderMarkdown } from '../markdown';
import Quiz from './Quiz';
import Challenge from './Challenge';

interface Props {
  lesson: Lesson;
  progress: Progress;
  nextSlug: string | null;
  onNext: () => void;
  onLessonComplete: () => void;
  onChallengeSolved: () => void;
  onQuizAnswer: (questionId: string, correct: boolean) => void;
}

export default function LessonView(props: Props) {
  const html = createMemo(() => renderMarkdown(props.lesson.content));
  const allQuizCorrect = createMemo(() => {
    const quiz = props.lesson.quiz ?? [];
    if (quiz.length === 0) return true;
    const answers = props.progress.quizAnswers[props.lesson.slug] ?? {};
    return quiz.every((q) => answers[q.id]);
  });
  const challengeSolved = () =>
    !props.lesson.challenge || props.progress.challengesSolved.includes(props.lesson.slug);

  const canContinue = createMemo(() => allQuizCorrect() && challengeSolved());
  const hasPractice = () => !!(props.lesson.quiz?.length || props.lesson.challenge);

  return (
    <div class="lesson" classList={{ 'no-practice': !hasPractice() }}>
      <article class="lesson-content">
        <header class="lesson-header">
          <h1>{props.lesson.title}</h1>
          <Show when={props.lesson.description}>
            <p class="lead">{props.lesson.description}</p>
          </Show>
          <div class="meta">
            <Show when={props.lesson.moduleTitle}>
              <span class="chip accent">{props.lesson.moduleTitle}</span>
            </Show>
            <Show when={props.lesson.level}>
              <span class="chip">{props.lesson.level}</span>
            </Show>
            <Show when={props.lesson.duration}>
              <span class="chip">⏱ {props.lesson.duration}</span>
            </Show>
            <Show when={props.lesson.xp != null}>
              <span class="chip">✦ {props.lesson.xp} XP</span>
            </Show>
            <For each={props.lesson.tags ?? []}>
              {(tag) => <span class="chip">#{tag}</span>}
            </For>
          </div>
          <Show when={props.lesson.objectives?.length}>
            <div class="objectives">
              <h3>Цели урока</h3>
              <ul>
                <For each={props.lesson.objectives}>{(o) => <li>{o}</li>}</For>
              </ul>
            </div>
          </Show>
        </header>

        <section class="md" innerHTML={html()} />
      </article>

      <Show when={hasPractice()}>
        <aside class="practice-rail">
          <Show when={props.lesson.quiz?.length}>
            <Quiz
              items={props.lesson.quiz!}
              onAnswered={props.onQuizAnswer}
              savedAnswers={props.progress.quizAnswers[props.lesson.slug] ?? {}}
            />
          </Show>

          <Show when={props.lesson.challenge}>
            <Challenge
              slug={props.lesson.slug}
              challenge={props.lesson.challenge!}
              alreadySolved={props.progress.challengesSolved.includes(props.lesson.slug)}
              onSolved={props.onChallengeSolved}
            />
          </Show>

          <footer class="lesson-footer">
            <Show
              when={canContinue()}
              fallback={
                <p class="muted">
                  Заверши квиз{props.lesson.challenge ? ' и задачу' : ''}, чтобы перейти дальше.
                </p>
              }
            >
              <button
                class="primary"
                disabled={!props.nextSlug}
                onClick={() => {
                  props.onLessonComplete();
                  props.onNext();
                }}
              >
                {props.nextSlug ? 'Следующий урок →' : 'Это последний урок'}
              </button>
            </Show>
          </footer>
        </aside>
      </Show>

      <Show when={!hasPractice()}>
        <footer class="lesson-footer inline">
          <button
            class="primary"
            disabled={!props.nextSlug}
            onClick={() => {
              props.onLessonComplete();
              props.onNext();
            }}
          >
            {props.nextSlug ? 'Следующий урок →' : 'Это последний урок'}
          </button>
        </footer>
      </Show>
    </div>
  );
}
