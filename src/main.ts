import { invoke } from "@tauri-apps/api/core";
import { marked } from "marked";
import hljs from "highlight.js";

type QuizItem = {
  id?: string;
  type: string;
  prompt: string;
  options?: string[];
  answer: unknown;
  explanation?: string;
};

type Challenge = {
  prompt: string;
  starterCode?: string;
  tests?: { name: string; code: string }[];
};

type Lesson = {
  path: string;
  file_name: string;
  title: string;
  slug?: string;
  description?: string;
  module_id?: string;
  module_title?: string;
  module_order?: number | null;
  order?: number | null;
  level?: string;
  duration?: string;
  xp?: number | null;
  tags: string[];
  objectives: string[];
  quiz: QuizItem[];
  challenge?: Challenge | null;
  body: string;
};

// Marked renderer that runs syntax highlighting inline.
marked.use({
  renderer: {
    code(token) {
      const raw = (token as { text: string }).text;
      const lang = ((token as { lang?: string }).lang || "").trim();
      const picked =
        lang && hljs.getLanguage(lang) ? lang : lang ? "plaintext" : "";
      const html = picked
        ? hljs.highlight(raw, { language: picked, ignoreIllegals: true }).value
        : hljs.highlightAuto(raw).value;
      return `<pre><code class="hljs language-${picked || "plaintext"}">${html}</code></pre>`;
    },
  },
});

const state: {
  lessons: Lesson[];
  active: Lesson | null;
  tab: "read" | "quiz" | "run";
} = {
  lessons: [],
  active: null,
  tab: "read",
};

let pyodideReady: Promise<any> | null = null;

function el<T extends HTMLElement>(sel: string): T {
  const n = document.querySelector(sel);
  if (!n) throw new Error(`Missing element: ${sel}`);
  return n as T;
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!),
  );
}

function firstCodeBlock(body: string, lang = "python"): string | null {
  const rx = new RegExp("```" + lang + "\\s*([\\s\\S]*?)```", "m");
  const m = body.match(rx);
  return m ? m[1].trim() : null;
}

async function loadLessons() {
  try {
    const vault = await invoke<string>("default_vault");
    el<HTMLDivElement>("#vault-path").textContent = vault;
    el<HTMLDivElement>("#vault-path").title = vault;
    const lessons = await invoke<Lesson[]>("load_lessons", { vault: null });
    state.lessons = lessons;
    renderSidebar();
  } catch (err) {
    el<HTMLDivElement>("#lesson-list").innerHTML =
      `<div class="error" style="margin:12px">${escapeHtml(String(err))}</div>`;
  }
}

function renderSidebar() {
  const list = el<HTMLDivElement>("#lesson-list");
  list.innerHTML = "";
  if (state.lessons.length === 0) {
    list.innerHTML =
      `<div style="padding:16px;color:var(--muted)">No lessons found.</div>`;
    return;
  }
  const groups = new Map<string, Lesson[]>();
  for (const l of state.lessons) {
    const k = l.module_title || "Lessons";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(l);
  }
  for (const [group, ls] of groups) {
    const h = document.createElement("div");
    h.className = "module-group";
    h.textContent = group;
    list.appendChild(h);
    for (const l of ls) {
      const b = document.createElement("button");
      b.className = "lesson-item";
      b.dataset.path = l.path;
      b.innerHTML =
        `<div class="t">${escapeHtml(l.title)}</div>` +
        (l.description
          ? `<div class="d">${escapeHtml(l.description)}</div>`
          : "");
      b.addEventListener("click", () => selectLesson(l));
      list.appendChild(b);
    }
  }
}

function selectLesson(lesson: Lesson) {
  state.active = lesson;
  document.querySelectorAll<HTMLButtonElement>(".lesson-item").forEach((n) => {
    n.classList.toggle("active", n.dataset.path === lesson.path);
  });
  el<HTMLDivElement>("#empty").style.display = "none";
  el<HTMLDivElement>("#tabs").hidden = false;
  setTab(state.tab);
}

function setTab(tab: "read" | "quiz" | "run") {
  state.tab = tab;
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((n) => {
    n.classList.toggle("active", n.dataset.tab === tab);
  });
  el<HTMLElement>("#panel-read").hidden = tab !== "read";
  el<HTMLElement>("#panel-quiz").hidden = tab !== "quiz";
  el<HTMLElement>("#panel-run").hidden = tab !== "run";
  if (tab === "read") renderRead();
  else if (tab === "quiz") renderQuiz();
  else if (tab === "run") renderRun();
}

function renderRead() {
  if (!state.active) return;
  const l = state.active;
  const panel = el<HTMLElement>("#panel-read");

  const chips: string[] = [];
  if (l.module_title)
    chips.push(`<span class="chip accent">${escapeHtml(l.module_title)}</span>`);
  if (l.level) chips.push(`<span class="chip">${escapeHtml(l.level)}</span>`);
  if (l.duration)
    chips.push(`<span class="chip">⏱ ${escapeHtml(l.duration)}</span>`);
  if (l.xp != null) chips.push(`<span class="chip">✦ ${l.xp} XP</span>`);
  for (const t of l.tags)
    chips.push(`<span class="chip">#${escapeHtml(t)}</span>`);

  const objectives = l.objectives.length
    ? `<div class="objectives"><h3>Цели урока</h3><ul>${l.objectives
        .map((o) => `<li>${escapeHtml(o)}</li>`)
        .join("")}</ul></div>`
    : "";

  const bodyHtml = marked.parse(l.body) as string;

  panel.innerHTML =
    `<h1 style="margin-top:0">${escapeHtml(l.title)}</h1>` +
    (l.description
      ? `<p style="color:var(--muted);margin-top:-6px">${escapeHtml(l.description)}</p>`
      : "") +
    `<div class="meta">${chips.join("")}</div>` +
    objectives +
    `<div class="md">${bodyHtml}</div>`;

  // Attach "try in runner" buttons above python code blocks.
  panel.querySelectorAll<HTMLPreElement>("pre").forEach((pre) => {
    const code = pre.querySelector("code");
    if (!code) return;
    const isPython =
      code.classList.contains("language-python") ||
      code.classList.contains("language-py");
    if (!isPython) return;
    const wrap = document.createElement("div");
    wrap.className = "copy-btn-wrap";
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "▶ Run in sandbox";
    btn.addEventListener("click", () => {
      const text = code.textContent || "";
      setTab("run");
      el<HTMLTextAreaElement>("#code-editor").value = text;
    });
    wrap.appendChild(btn);
    pre.parentElement?.insertBefore(wrap, pre);
  });
}

/* ---------------- Quiz ---------------- */

type QuizSession = {
  items: QuizItem[];
  idx: number;
  correct: number;
  locked: boolean;
};

let quizSession: QuizSession | null = null;

function startQuiz(lesson: Lesson) {
  quizSession = {
    items: shuffle(lesson.quiz.slice()),
    idx: 0,
    correct: 0,
    locked: false,
  };
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderQuiz() {
  if (!state.active) return;
  const panel = el<HTMLElement>("#panel-quiz");
  const lesson = state.active;

  if (!lesson.quiz.length) {
    panel.innerHTML = `<div class="quiz-empty">No quiz questions in this lesson's frontmatter.</div>`;
    return;
  }
  if (!quizSession || quizSession.items[0]?.prompt !== lesson.quiz[0]?.prompt) {
    startQuiz(lesson);
  }
  const s = quizSession!;

  if (s.idx >= s.items.length) {
    panel.innerHTML = `
      <div class="card">
        <h2 style="margin-top:0">Готово</h2>
        <p>Правильных ответов: <strong>${s.correct}</strong> из <strong>${s.items.length}</strong>.</p>
        <div class="quiz-footer">
          <span class="progress">${lesson.title}</span>
          <button class="btn" id="restart-quiz">Пройти заново</button>
        </div>
      </div>`;
    el<HTMLButtonElement>("#restart-quiz").addEventListener("click", () => {
      startQuiz(lesson);
      renderQuiz();
    });
    return;
  }

  const q = s.items[s.idx];
  const answers = normalizeAnswers(q.answer);
  const isMc = q.type === "multiple-choice" && q.options?.length;

  panel.innerHTML = `
    <div class="card">
      <div class="progress">Вопрос ${s.idx + 1} / ${s.items.length}</div>
      <h2 class="prompt">${escapeHtml(q.prompt)}</h2>
      <div id="answer-area"></div>
      <div id="explain-area"></div>
      <div class="quiz-footer">
        <span class="progress">Правильных: ${s.correct}</span>
        <button class="btn" id="next-q" disabled>Далее →</button>
      </div>
    </div>`;

  const area = el<HTMLDivElement>("#answer-area");
  const explainArea = el<HTMLDivElement>("#explain-area");
  const nextBtn = el<HTMLButtonElement>("#next-q");

  const finalize = (ok: boolean) => {
    s.locked = true;
    if (ok) s.correct += 1;
    explainArea.innerHTML =
      `<div class="explain ${ok ? "ok" : "no"}">` +
      `<strong>${ok ? "Верно." : "Не совсем."}</strong>` +
      (answers.length
        ? ` Ответ: <code>${escapeHtml(answers[0])}</code>. `
        : " ") +
      (q.explanation ? escapeHtml(q.explanation) : "") +
      `</div>`;
    nextBtn.disabled = false;
  };

  if (isMc) {
    area.innerHTML =
      `<div class="options">` +
      q
        .options!.map(
          (o, i) =>
            `<button class="option" data-i="${i}">${escapeHtml(o)}</button>`,
        )
        .join("") +
      `</div>`;
    area.querySelectorAll<HTMLButtonElement>(".option").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (s.locked) return;
        const chosen = btn.textContent || "";
        const ok = answers.some(
          (a) => a.trim().toLowerCase() === chosen.trim().toLowerCase(),
        );
        area.querySelectorAll<HTMLButtonElement>(".option").forEach((b) => {
          b.classList.add("disabled");
          const t = b.textContent || "";
          const isAnswer = answers.some(
            (a) => a.trim().toLowerCase() === t.trim().toLowerCase(),
          );
          if (isAnswer) b.classList.add("correct");
          else if (b === btn && !ok) b.classList.add("wrong");
        });
        finalize(ok);
      });
    });
  } else {
    area.innerHTML = `
      <input class="short-input" id="short-answer" placeholder="Твой ответ..." />
      <div style="margin-top:10px"><button class="btn" id="check-answer">Проверить</button></div>`;
    const input = el<HTMLInputElement>("#short-answer");
    input.focus();
    const check = () => {
      if (s.locked) return;
      const val = input.value.trim().toLowerCase();
      const ok = answers.some((a) => a.trim().toLowerCase() === val);
      finalize(ok);
      input.disabled = true;
    };
    el<HTMLButtonElement>("#check-answer").addEventListener("click", check);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });
  }

  nextBtn.addEventListener("click", () => {
    s.idx += 1;
    s.locked = false;
    renderQuiz();
  });
}

function normalizeAnswers(a: unknown): string[] {
  if (Array.isArray(a)) return a.map((x) => String(x));
  if (a == null) return [];
  return [String(a)];
}

/* ---------------- Python runner ---------------- */

function renderRun() {
  if (!state.active) return;
  const editor = el<HTMLTextAreaElement>("#code-editor");
  if (!editor.value.trim()) {
    const starter =
      state.active.challenge?.starterCode ||
      firstCodeBlock(state.active.body, "python") ||
      "# Write some Python here\nprint('hello')\n";
    editor.value = starter;
  }
  ensurePyodide();
}

function setPyStatus(text: string, ready = false) {
  const n = el<HTMLDivElement>("#py-status");
  n.textContent = text;
  n.classList.toggle("ready", ready);
}

async function ensurePyodide(): Promise<any> {
  if (pyodideReady) return pyodideReady;
  setPyStatus("Python: loading runtime (~7 MB)…");
  pyodideReady = (async () => {
    await loadScript(
      "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js",
    );
    // @ts-expect-error pyodide attaches to window
    const py = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    });
    setPyStatus("Python: ready (Pyodide 0.26)", true);
    el<HTMLButtonElement>("#run-btn").disabled = false;
    return py;
  })().catch((err) => {
    setPyStatus("Python: failed to load — " + err);
    throw err;
  });
  return pyodideReady;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

async function runCode() {
  const out = el<HTMLPreElement>("#code-output");
  const code = el<HTMLTextAreaElement>("#code-editor").value;
  out.textContent = "";
  let py: any;
  try {
    py = await ensurePyodide();
  } catch {
    return;
  }

  const buf: string[] = [];
  py.setStdout({
    batched: (s: string) => {
      buf.push(s);
    },
  });
  py.setStderr({
    batched: (s: string) => {
      buf.push(s);
    },
  });

  try {
    const result = await py.runPythonAsync(code);
    out.textContent = buf.join("\n");
    if (result !== undefined && result !== null) {
      const shown = typeof result === "object" ? JSON.stringify(result) : result;
      out.textContent +=
        (out.textContent ? "\n" : "") + "→ " + String(shown);
    }
    if (!out.textContent) out.textContent = "(no output)";
  } catch (err) {
    out.innerHTML =
      (buf.length ? escapeHtml(buf.join("\n")) + "\n" : "") +
      `<span class="err">${escapeHtml(String(err))}</span>`;
  }
}

/* ---------------- Boot ---------------- */

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => {
    b.addEventListener("click", () => {
      if (!state.active) return;
      setTab(b.dataset.tab as "read" | "quiz" | "run");
    });
  });
  el<HTMLButtonElement>("#run-btn").addEventListener("click", runCode);
  el<HTMLButtonElement>("#reset-btn").addEventListener("click", () => {
    if (!state.active) return;
    el<HTMLTextAreaElement>("#code-editor").value = "";
    el<HTMLPreElement>("#code-output").textContent = "";
    renderRun();
  });
  el<HTMLButtonElement>("#reload-btn").addEventListener("click", loadLessons);
  loadLessons();
});
