import { For, Show, createSignal, createMemo } from 'solid-js';
import type { QuizItem } from '../../../shared/types';

interface Props {
  items: QuizItem[];
  savedAnswers: Record<string, boolean>;
  onAnswered: (questionId: string, correct: boolean) => void;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[().]/g, '');
}

function checkAnswer(item: QuizItem, user: string): boolean {
  if (item.type === 'multiple-choice') {
    return user === item.answer;
  }
  const target = Array.isArray(item.answer) ? item.answer : [item.answer];
  const u = normalize(user);
  return target.some((t) => normalize(t) === u);
}

export default function Quiz(props: Props) {
  return (
    <section class="quiz">
      <h2>Квиз</h2>
      <For each={props.items}>
        {(item) => (
          <QuizQuestion
            item={item}
            previouslyCorrect={!!props.savedAnswers[item.id]}
            onAnswered={(correct) => props.onAnswered(item.id, correct)}
          />
        )}
      </For>
    </section>
  );
}

interface QProps {
  item: QuizItem;
  previouslyCorrect: boolean;
  onAnswered: (correct: boolean) => void;
}

function QuizQuestion(props: QProps) {
  const [selected, setSelected] = createSignal<string>('');
  const [attempted, setAttempted] = createSignal(false);
  const [solved, setSolved] = createSignal(props.previouslyCorrect);

  const correct = createMemo(() => checkAnswer(props.item, selected()));

  function submit() {
    setAttempted(true);
    if (correct()) {
      setSolved(true);
      props.onAnswered(true);
    }
  }

  function reset() {
    setAttempted(false);
    setSelected('');
  }

  return (
    <div class="quiz-item" classList={{ solved: solved() }}>
      <p class="prompt">{props.item.prompt}</p>
      <Show
        when={props.item.type === 'multiple-choice'}
        fallback={
          <input
            type="text"
            class="short-answer"
            value={selected()}
            disabled={solved()}
            onInput={(e) => setSelected(e.currentTarget.value)}
            placeholder="Твой ответ…"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        }
      >
        <div class="options">
          <For each={(props.item as Extract<QuizItem, { type: 'multiple-choice' }>).options}>
            {(opt) => (
              <label classList={{ option: true, picked: selected() === opt }}>
                <input
                  type="radio"
                  name={props.item.id}
                  value={opt}
                  checked={selected() === opt}
                  disabled={solved()}
                  onChange={() => setSelected(opt)}
                />
                <code>{opt}</code>
              </label>
            )}
          </For>
        </div>
      </Show>
      <div class="quiz-actions">
        <Show
          when={!solved()}
          fallback={<span class="ok">✓ Верно{props.item.explanation ? `. ${props.item.explanation}` : ''}</span>}
        >
          <button class="primary" onClick={submit} disabled={!selected()}>
            Проверить
          </button>
          <Show when={attempted() && !correct()}>
            <span class="err">
              Пока не то. {props.item.explanation ?? 'Попробуй еще раз.'}
            </span>
            <button class="ghost" onClick={reset}>
              Сбросить
            </button>
          </Show>
        </Show>
      </div>
    </div>
  );
}
