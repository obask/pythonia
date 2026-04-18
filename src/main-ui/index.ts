import { marked } from "marked";
import { Electroview } from "electrobun/view";
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

type State = {
  modules: LessonModule[];
  progress: ProgressState;
  currentLesson?: LessonDetail;
};

const state: State = {
  modules: [],
  progress: { completedSlugs: [], xp: 0 },
};

const els = {
  nav: byId("lesson-nav"),
  xp: byId("xp-count"),
  progressFill: byId("progress-fill"),
  progressLabel: byId("progress-label"),
  module: byId("lesson-module"),
  title: byId("lesson-title"),
  description: byId("lesson-description"),
  level: byId("lesson-level"),
  duration: byId("lesson-duration"),
  lessonXp: byId("lesson-xp"),
  objectives: byId("objectives"),
  content: byId("lesson-content"),
  challengeTitle: byId("challenge-title"),
  challengePrompt: byId("challenge-prompt"),
  editor: byId("code-editor") as HTMLTextAreaElement,
  runCode: byId("run-code") as HTMLButtonElement,
  resetCode: byId("reset-code") as HTMLButtonElement,
  output: byId("test-output"),
  quizList: byId("quiz-list"),
  codePanel: byId("code-panel"),
  quizPanel: byId("quiz-panel"),
  tabCode: byId("tab-code") as HTMLButtonElement,
  tabQuiz: byId("tab-quiz") as HTMLButtonElement,
};

function byId(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function allLessons() {
  return state.modules.flatMap((module) => module.lessons);
}

function renderNav() {
  els.nav.innerHTML = state.modules
    .map(
      (module) => `
        <div class="module-group">
          <p class="module-title">${escapeHtml(module.title)}</p>
          ${module.lessons
            .map((lesson) => {
              const active = state.currentLesson?.slug === lesson.slug;
              const done = state.progress.completedSlugs.includes(lesson.slug);
              return `
                <button class="lesson-button ${active ? "active" : ""} ${done ? "done" : ""}" data-slug="${escapeHtml(
                  lesson.slug,
                )}" type="button">
                  <strong>${escapeHtml(lesson.title)}</strong>
                  <small>${escapeHtml(lesson.duration)} · ${escapeHtml(lesson.level)} · ${lesson.xp} XP</small>
                </button>
              `;
            })
            .join("")}
        </div>
      `,
    )
    .join("");

  els.nav.querySelectorAll<HTMLButtonElement>(".lesson-button").forEach((button) => {
    button.addEventListener("click", () => loadLesson(button.dataset.slug ?? ""));
  });
}

function renderProgress() {
  const total = allLessons().length;
  const completed = state.progress.completedSlugs.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  els.xp.textContent = String(state.progress.xp);
  els.progressFill.style.width = `${percent}%`;
  els.progressLabel.textContent = `${completed} из ${total} уроков`;
}

function renderLesson(lesson: LessonDetail) {
  els.module.textContent = lesson.moduleTitle;
  els.title.textContent = lesson.title;
  els.description.textContent = lesson.description;
  els.level.textContent = lesson.level;
  els.duration.textContent = lesson.duration;
  els.lessonXp.textContent = `${lesson.xp} XP`;
  els.objectives.innerHTML = lesson.objectives
    .map((objective) => `<span>${escapeHtml(objective)}</span>`)
    .join("");
  els.content.innerHTML = marked.parse(lesson.content) as string;
  els.challengeTitle.textContent = lesson.title;
  els.challengePrompt.textContent = lesson.challenge.prompt;
  els.editor.value = lesson.challenge.starterCode;
  els.output.innerHTML = `<div class="test-row"><strong>Ready</strong><span>Run tests when code is ready.</span></div>`;
  renderQuiz(lesson.quiz);
  renderNav();
  renderProgress();
}

function renderQuiz(quiz: QuizQuestion[]) {
  els.quizList.innerHTML = quiz.map(renderQuizQuestion).join("");
  els.quizList.querySelectorAll<HTMLButtonElement>("[data-check-quiz]").forEach((button) => {
    button.addEventListener("click", () => checkQuiz(button.dataset.checkQuiz ?? ""));
  });
}

function renderQuizQuestion(question: QuizQuestion) {
  const body =
    question.type === "multiple-choice"
      ? `<div class="option-list">
          ${(question.options ?? [])
            .map(
              (option) => `
                <label>
                  <input type="radio" name="${escapeHtml(question.id)}" value="${escapeHtml(option)}" />
                  <span>${escapeHtml(option)}</span>
                </label>
              `,
            )
            .join("")}
        </div>`
      : `<input class="short-answer" data-answer-for="${escapeHtml(question.id)}" type="text" />`;

  return `
    <section class="quiz-item" data-quiz-id="${escapeHtml(question.id)}">
      <h3>${escapeHtml(question.prompt)}</h3>
      ${body}
      <button class="secondary" data-check-quiz="${escapeHtml(question.id)}" type="button">Check</button>
      <div class="quiz-feedback" id="feedback-${escapeHtml(question.id)}"></div>
    </section>
  `;
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

function checkQuiz(id: string) {
  const lesson = state.currentLesson;
  if (!lesson) return;

  const question = lesson.quiz.find((item) => item.id === id);
  const container = els.quizList.querySelector<HTMLElement>(`[data-quiz-id="${CSS.escape(id)}"]`);
  const feedback = document.getElementById(`feedback-${id}`);
  if (!question || !container || !feedback) return;

  const expected = Array.isArray(question.answer) ? question.answer : [question.answer];
  const selected =
    question.type === "multiple-choice"
      ? container.querySelector<HTMLInputElement>("input:checked")?.value ?? ""
      : container.querySelector<HTMLInputElement>("[data-answer-for]")?.value ?? "";

  const ok = expected.some((answer) => normalizeAnswer(answer) === normalizeAnswer(selected));
  feedback.className = `quiz-feedback ${ok ? "ok" : "no"}`;
  feedback.textContent = `${ok ? "Верно." : "Проверь ответ."} ${question.explanation}`;
}

function renderRunResult(result: RunResult) {
  const rows = result.results
    .map(
      (test) => `
        <div class="test-row ${test.passed ? "pass" : "fail"}">
          <strong>${test.passed ? "PASS" : "FAIL"} · ${escapeHtml(test.name)}</strong>
          <span>${escapeHtml(test.message)}</span>
        </div>
      `,
    )
    .join("");

  const stdout = result.stdout
    ? `<div class="test-row"><strong>stdout</strong><span>${escapeHtml(result.stdout)}</span></div>`
    : "";
  const stderr = result.stderr
    ? `<div class="test-row fail"><strong>stderr</strong><span>${escapeHtml(result.stderr)}</span></div>`
    : "";
  const summary = `<div class="test-row ${result.passed ? "pass" : "fail"}"><strong>${result.passed ? "All tests passed" : "Some tests failed"}</strong><span>${result.durationMs} ms</span></div>`;
  els.output.innerHTML = summary + rows + stdout + stderr;
}

async function loadLesson(slug: string) {
  if (!slug) return;
  const lesson = await appRpc.request.getLesson({ slug });
  state.currentLesson = lesson;
  state.progress.activeSlug = slug;
  renderLesson(lesson);
}

async function runCode() {
  const lesson = state.currentLesson;
  if (!lesson) return;

  els.runCode.disabled = true;
  els.runCode.textContent = "Running...";
  els.output.innerHTML = `<div class="test-row"><strong>Running</strong><span>Python tests in local runtime.</span></div>`;
  try {
    const result = await appRpc.request.runChallenge({
      slug: lesson.slug,
      code: els.editor.value,
    });
    renderRunResult(result);
    if (result.passed) {
      state.progress = await appRpc.request.markComplete({ slug: lesson.slug });
      renderNav();
      renderProgress();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    els.output.innerHTML = `<div class="test-row fail"><strong>Runner error</strong><span>${escapeHtml(
      message,
    )}</span></div>`;
  } finally {
    els.runCode.disabled = false;
    els.runCode.textContent = "Run tests";
  }
}

function switchTab(target: "code" | "quiz") {
  els.tabCode.classList.toggle("active", target === "code");
  els.tabQuiz.classList.toggle("active", target === "quiz");
  els.codePanel.classList.toggle("active", target === "code");
  els.quizPanel.classList.toggle("active", target === "quiz");
}

async function init() {
  const { modules, progress } = await appRpc.request.getCatalog(null);
  state.modules = modules;
  state.progress = progress;
  renderNav();
  renderProgress();

  const firstSlug = progress.activeSlug ?? allLessons()[0]?.slug;
  if (firstSlug) {
    await loadLesson(firstSlug);
  }

  els.runCode.addEventListener("click", runCode);
  els.resetCode.addEventListener("click", () => {
    if (state.currentLesson) {
      els.editor.value = state.currentLesson.challenge.starterCode;
    }
  });
  els.tabCode.addEventListener("click", () => switchTab("code"));
  els.tabQuiz.addEventListener("click", () => switchTab("quiz"));
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    els.content.innerHTML = `<pre>${escapeHtml(message)}</pre>`;
  });
});
