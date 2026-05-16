import { marked } from "marked";
import { Electroview } from "electrobun/view";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { render } from "solid-js/web";
import "./styles.css";
import type {
  LessonDetail,
  LessonModule,
  ProgressState,
  PythoniaRPC,
  QuizQuestion,
  RunResult,
} from "../shared/types";

const rpc = Electroview.defineRPC<PythoniaRPC>({
  handlers: {
    requests: {},
    messages: {},
  },
});
const electrobun = new Electroview({ rpc });
const appRpc = electrobun.rpc as NonNullable<typeof electrobun.rpc>;
if (!appRpc) {
  throw new Error("Electrobun RPC failed to initialize.");
}

type Tab = "code" | "quiz";

type OutputState =
  | { kind: "ready" }
  | { kind: "running" }
  | { kind: "error"; message: string }
  | { kind: "result"; result: RunResult };

type OutputRow = {
  tone?: "pass" | "fail";
  title: string;
  detail: string;
};

type QuizFeedback = Record<string, { ok: boolean; text: string }>;
type QuizAnswers = Record<string, string>;

const emptyProgress: ProgressState = { completedSlugs: [], xp: 0 };

function markdownHtml(value: string) {
  return marked.parse(value, { async: false }) as string;
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

function outputRows(output: OutputState): OutputRow[] {
  if (output.kind === "ready") {
    return [{ title: "Ready", detail: "Run tests when code is ready." }];
  }

  if (output.kind === "running") {
    return [{ title: "Running", detail: "Python tests in local runtime." }];
  }

  if (output.kind === "error") {
    return [{ tone: "fail", title: "Runner error", detail: output.message }];
  }

  const { result } = output;
  const rows: OutputRow[] = [
    {
      tone: result.passed ? "pass" : "fail",
      title: result.passed ? "All tests passed" : "Some tests failed",
      detail: `${result.durationMs} ms`,
    },
    ...result.results.map((test) => ({
      tone: test.passed ? ("pass" as const) : ("fail" as const),
      title: `${test.passed ? "PASS" : "FAIL"} · ${test.name}`,
      detail: test.message,
    })),
  ];

  if (result.stdout) {
    rows.push({ title: "stdout", detail: result.stdout });
  }

  if (result.stderr) {
    rows.push({ tone: "fail", title: "stderr", detail: result.stderr });
  }

  return rows;
}

function App() {
  const [modules, setModules] = createSignal<LessonModule[]>([]);
  const [progress, setProgress] = createSignal<ProgressState>(emptyProgress);
  const [currentLesson, setCurrentLesson] = createSignal<LessonDetail>();
  const [activeTab, setActiveTab] = createSignal<Tab>("code");
  const [code, setCode] = createSignal("");
  const [output, setOutput] = createSignal<OutputState>({ kind: "ready" });
  const [quizAnswers, setQuizAnswers] = createSignal<QuizAnswers>({});
  const [quizFeedback, setQuizFeedback] = createSignal<QuizFeedback>({});
  const [isRunning, setIsRunning] = createSignal(false);
  const [isLoadingLesson, setIsLoadingLesson] = createSignal(false);
  const [loadError, setLoadError] = createSignal<string>();

  const allLessons = createMemo(() => modules().flatMap((module) => module.lessons));
  const completedCount = createMemo(() => progress().completedSlugs.length);
  const progressPercent = createMemo(() => {
    const total = allLessons().length;
    return total ? Math.round((completedCount() / total) * 100) : 0;
  });

  async function loadLesson(slug: string) {
    if (!slug) return;

    setIsLoadingLesson(true);
    setLoadError(undefined);
    try {
      const lesson = await appRpc.request.getLesson({ slug });
      setCurrentLesson(lesson);
      setProgress((previous) => ({ ...previous, activeSlug: slug }));
      setCode(lesson.challenge.starterCode);
      setOutput({ kind: "ready" });
      setQuizAnswers({});
      setQuizFeedback({});
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingLesson(false);
    }
  }

  async function runCode() {
    const lesson = currentLesson();
    if (!lesson) return;

    setIsRunning(true);
    setOutput({ kind: "running" });
    try {
      const result = await appRpc.request.runChallenge({
        slug: lesson.slug,
        code: code(),
      });
      setOutput({ kind: "result", result });
      if (result.passed) {
        setProgress(await appRpc.request.markComplete({ slug: lesson.slug }));
      }
    } catch (error) {
      setOutput({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsRunning(false);
    }
  }

  function resetCode() {
    const lesson = currentLesson();
    if (lesson) {
      setCode(lesson.challenge.starterCode);
    }
  }

  function setQuizAnswer(id: string, value: string) {
    setQuizAnswers((answers) => ({ ...answers, [id]: value }));
  }

  function checkQuiz(question: QuizQuestion) {
    const expected = Array.isArray(question.answer) ? question.answer : [question.answer];
    const selected = quizAnswers()[question.id] ?? "";
    const ok = expected.some((answer) => normalizeAnswer(answer) === normalizeAnswer(selected));

    setQuizFeedback((feedback) => ({
      ...feedback,
      [question.id]: {
        ok,
        text: `${ok ? "Верно." : "Проверь ответ."} ${question.explanation}`,
      },
    }));
  }

  onMount(async () => {
    try {
      const { modules: catalogModules, progress: catalogProgress } =
        await appRpc.request.getCatalog(null);
      setModules(catalogModules);
      setProgress(catalogProgress);

      const firstSlug =
        catalogProgress.activeSlug ?? catalogModules.flatMap((module) => module.lessons)[0]?.slug;
      if (firstSlug) {
        await loadLesson(firstSlug);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  });

  return (
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">Py</div>
          <div>
            <h1>Pythonia</h1>
            <p>Python lessons</p>
          </div>
        </div>

        <div class="progress-box">
          <div>
            <span class="muted">XP</span>
            <strong id="xp-count">{progress().xp}</strong>
          </div>
          <div class="progress-track">
            <div id="progress-fill" style={{ width: `${progressPercent()}%` }} />
          </div>
          <span id="progress-label">
            {completedCount()} из {allLessons().length} уроков
          </span>
        </div>

        <nav class="lesson-nav" aria-label="Lessons">
          <For each={modules()}>
            {(module) => (
              <div class="module-group">
                <p class="module-title">{module.title}</p>
                <For each={module.lessons}>
                  {(lesson) => {
                    const isActive = () => currentLesson()?.slug === lesson.slug;
                    const isDone = () => progress().completedSlugs.includes(lesson.slug);
                    return (
                      <button
                        class={`lesson-button ${isActive() ? "active" : ""} ${
                          isDone() ? "done" : ""
                        }`}
                        disabled={isLoadingLesson() && isActive()}
                        type="button"
                        onClick={() => void loadLesson(lesson.slug)}
                      >
                        <strong>{lesson.title}</strong>
                        <small>
                          {lesson.duration} · {lesson.level} · {lesson.xp} XP
                        </small>
                      </button>
                    );
                  }}
                </For>
              </div>
            )}
          </For>
        </nav>
      </aside>

      <main class="workspace">
        <section class="lesson-pane">
          <Show when={loadError()}>{(message) => <pre class="load-error">{message()}</pre>}</Show>

          <div class="lesson-head">
            <div>
              <p class="eyebrow">{currentLesson()?.moduleTitle ?? "Module"}</p>
              <h2>{currentLesson()?.title ?? "Loading lessons..."}</h2>
              <p>{currentLesson()?.description ?? ""}</p>
            </div>
            <div class="lesson-meta">
              <span>{currentLesson()?.level ?? ""}</span>
              <span>{currentLesson()?.duration ?? ""}</span>
              <span>{currentLesson() ? `${currentLesson()?.xp} XP` : ""}</span>
            </div>
          </div>

          <div class="objective-row">
            <For each={currentLesson()?.objectives ?? []}>
              {(objective) => <span>{objective}</span>}
            </For>
          </div>

          <article
            class="markdown"
            innerHTML={currentLesson() ? markdownHtml(currentLesson()!.content) : ""}
          />
        </section>

        <section class="practice-pane">
          <div class="tabs" role="tablist">
            <button
              class={`tab ${activeTab() === "code" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("code")}
            >
              Code
            </button>
            <button
              class={`tab ${activeTab() === "quiz" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("quiz")}
            >
              Quiz
            </button>
          </div>

          <div class={`panel ${activeTab() === "code" ? "active" : ""}`}>
            <div class="challenge">
              <p class="eyebrow">Challenge</p>
              <h3>{currentLesson()?.title ?? "Write code"}</h3>
              <p>{currentLesson()?.challenge.prompt ?? ""}</p>
            </div>
            <textarea
              id="code-editor"
              spellcheck={false}
              value={code()}
              onInput={(event) => setCode(event.currentTarget.value)}
            />
            <div class="actions">
              <button type="button" class="secondary" onClick={resetCode}>
                Reset
              </button>
              <button
                type="button"
                class="primary"
                disabled={isRunning() || !currentLesson()}
                onClick={() => void runCode()}
              >
                {isRunning() ? "Running..." : "Run tests"}
              </button>
            </div>
            <TestOutput output={output()} />
          </div>

          <div class={`panel ${activeTab() === "quiz" ? "active" : ""}`}>
            <div class="quiz-list">
              <For each={currentLesson()?.quiz ?? []}>
                {(question) => (
                  <QuizQuestionView
                    question={question}
                    selected={quizAnswers()[question.id] ?? ""}
                    feedback={quizFeedback()[question.id]}
                    onAnswer={(value) => setQuizAnswer(question.id, value)}
                    onCheck={() => checkQuiz(question)}
                  />
                )}
              </For>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function TestOutput(props: { output: OutputState }) {
  return (
    <div class="test-output">
      <For each={outputRows(props.output)}>
        {(row) => (
          <div class={`test-row ${row.tone ?? ""}`}>
            <strong>{row.title}</strong>
            <span>{row.detail}</span>
          </div>
        )}
      </For>
    </div>
  );
}

function QuizQuestionView(props: {
  question: QuizQuestion;
  selected: string;
  feedback?: { ok: boolean; text: string };
  onAnswer: (value: string) => void;
  onCheck: () => void;
}) {
  return (
    <section class="quiz-item">
      <h3>{props.question.prompt}</h3>
      <Show
        when={props.question.type === "multiple-choice"}
        fallback={
          <input
            class="short-answer"
            type="text"
            value={props.selected}
            onInput={(event) => props.onAnswer(event.currentTarget.value)}
          />
        }
      >
        <div class="option-list">
          <For each={props.question.options ?? []}>
            {(option) => (
              <label>
                <input
                  type="radio"
                  name={props.question.id}
                  value={option}
                  checked={props.selected === option}
                  onChange={(event) => props.onAnswer(event.currentTarget.value)}
                />
                <span>{option}</span>
              </label>
            )}
          </For>
        </div>
      </Show>
      <button class="secondary" type="button" onClick={props.onCheck}>
        Check
      </button>
      <div class={`quiz-feedback ${props.feedback ? (props.feedback.ok ? "ok" : "no") : ""}`}>
        {props.feedback?.text ?? ""}
      </div>
    </section>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing element #root");
}

render(() => <App />, root);
