import { indentWithTab } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { indentUnit } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { platformApi } from '@/lib/platform-api'
import type { Components } from 'react-markdown'
import type {
  Lesson,
  LessonSummary,
  QuizQuestion,
  RunResponse,
} from '@/types/lesson'

const pythoniaEditorTheme = EditorView.theme(
  {
    '&': {
      minHeight: '320px',
      backgroundColor: '#111820',
      color: '#e9f0ee',
      fontSize: '0.95rem',
    },
    '.cm-scroller': {
      minHeight: '320px',
      fontFamily:
        '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
      lineHeight: '1.55',
    },
    '.cm-content': {
      padding: '18px 0',
      caretColor: '#f7c65c',
    },
    '.cm-line': {
      padding: '0 16px',
    },
    '.cm-gutters': {
      backgroundColor: '#0c1218',
      color: '#74818c',
      borderRight: '1px solid #24313b',
      paddingRight: '4px',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(247, 198, 92, 0.08)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(247, 198, 92, 0.10)',
      color: '#f7c65c',
    },
    '.cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(95, 143, 131, 0.45) !important',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(113, 223, 156, 0.18)',
      outline: '1px solid rgba(113, 223, 156, 0.46)',
    },
    '.cm-placeholder': {
      color: '#74818c',
    },
    '&.cm-focused': {
      outline: 'none',
    },
  },
  { dark: true },
)

const pythonEditorExtensions = [
  python(),
  indentUnit.of('    '),
  EditorState.tabSize.of(4),
  keymap.of([indentWithTab]),
  pythoniaEditorTheme,
]

const pythonSnippetExtensions = [
  python(),
  indentUnit.of('    '),
  EditorState.tabSize.of(4),
  EditorState.readOnly.of(true),
  EditorView.editable.of(false),
]

const markdownComponents: Components = {
  pre({ children }) {
    return <>{children}</>
  },
  code({ children, className, node: _node, ...props }) {
    const language = /language-(\w+)/.exec(className ?? '')?.[1]

    if (language) {
      return (
        <LessonCodeBlock
          code={String(children).replace(/\n$/, '')}
          language={language}
        />
      )
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}

const PROGRESS_STORAGE_KEY = 'pythonia.progress.v1'

interface StoredProgress {
  codeBySlug: Record<string, string>
  quizAnswersBySlug: Record<string, Record<string, string>>
  completedSlugs: string[]
  lastActiveSlug?: string
}

interface ModuleGroup {
  id: string
  title: string
  description: string
  order: number
  lessons: LessonSummary[]
  completedCount: number
  totalXp: number
  completedXp: number
}

function createEmptyProgress(): StoredProgress {
  return {
    codeBySlug: {},
    quizAnswersBySlug: {},
    completedSlugs: [],
  }
}

function readStoredProgress(): StoredProgress {
  if (typeof window === 'undefined') return createEmptyProgress()

  try {
    const rawValue = window.localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (!rawValue) return createEmptyProgress()

    const parsed = JSON.parse(rawValue) as Partial<StoredProgress>
    return {
      codeBySlug: parsed.codeBySlug ?? {},
      quizAnswersBySlug: parsed.quizAnswersBySlug ?? {},
      completedSlugs: parsed.completedSlugs ?? [],
      lastActiveSlug: parsed.lastActiveSlug,
    }
  } catch {
    return createEmptyProgress()
  }
}

function writeStoredProgress(nextProgress: StoredProgress) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    PROGRESS_STORAGE_KEY,
    JSON.stringify(nextProgress),
  )
}

function groupLessonsByModule(
  lessons: LessonSummary[],
  completedSlugs: Set<string>,
): ModuleGroup[] {
  const groups = new Map<string, ModuleGroup>()

  for (const lesson of lessons) {
    const existing = groups.get(lesson.moduleId)
    const group =
      existing ??
      {
        id: lesson.moduleId,
        title: lesson.moduleTitle,
        description: lesson.moduleDescription,
        order: lesson.moduleOrder,
        lessons: [],
        completedCount: 0,
        totalXp: 0,
        completedXp: 0,
      }

    group.lessons.push(lesson)
    group.totalXp += lesson.xp

    if (completedSlugs.has(lesson.slug)) {
      group.completedCount += 1
      group.completedXp += lesson.xp
    }

    groups.set(lesson.moduleId, group)
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      lessons: [...group.lessons].sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

export default function PythoniaApp() {
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [activeSlug, setActiveSlug] = useState('')
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [lessonError, setLessonError] = useState('')
  const [code, setCode] = useState('')
  const [runResponse, setRunResponse] = useState<RunResponse | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizChecked, setQuizChecked] = useState(false)
  const [storedProgress, setStoredProgress] = useState(readStoredProgress)

  useEffect(() => {
    async function loadLessons() {
      const data = await platformApi.listLessons()
      setLessons(data)
      setActiveSlug((current) => {
        if (current) return current

        const savedSlug = readStoredProgress().lastActiveSlug
        const savedLesson = data.find((item) => item.slug === savedSlug)
        return savedLesson?.slug ?? data[0]?.slug ?? ''
      })
    }

    loadLessons().catch(() => {
      setLessonError('Не удалось загрузить хранилище уроков.')
    })
  }, [])

  useEffect(() => {
    if (!activeSlug) return

    async function loadLesson() {
      setLessonError('')
      setRunResponse(null)
      setQuizAnswers({})
      setQuizChecked(false)
      const data = await platformApi.getLesson(activeSlug)
      if (!data) throw new Error('Урок не найден')

      const savedProgress = readStoredProgress()
      setLesson(data)
      setStoredProgress(savedProgress)
      setCode(
        savedProgress.codeBySlug[data.slug] ?? data.challenge?.starterCode ?? '',
      )
      setQuizAnswers(savedProgress.quizAnswersBySlug[data.slug] ?? {})
    }

    loadLesson().catch(() => {
      setLesson(null)
      setLessonError('Не удалось открыть этот урок.')
    })
  }, [activeSlug])

  const progress = useMemo(() => {
    if (!lesson) return { total: 0, passed: 0, quiz: 0 }

    const total = lesson.challenge?.tests.length ?? 0
    const passed =
      runResponse?.results.filter((result) => result.passed).length ?? 0
    const quiz = scoreQuiz(lesson.quiz, quizAnswers)

    return { total, passed, quiz }
  }, [lesson, quizAnswers, runResponse])

  const completedSlugs = useMemo(
    () => new Set(storedProgress.completedSlugs),
    [storedProgress.completedSlugs],
  )
  const completedCount = lessons.filter((item) =>
    completedSlugs.has(item.slug),
  ).length
  const completedXp = lessons.reduce(
    (total, item) => total + (completedSlugs.has(item.slug) ? item.xp : 0),
    0,
  )
  const totalXp = lessons.reduce((total, item) => total + item.xp, 0)
  const moduleGroups = useMemo(
    () => groupLessonsByModule(lessons, completedSlugs),
    [completedSlugs, lessons],
  )
  const activeLessonSummary = lessons.find((item) => item.slug === activeSlug)
  const activeModuleId =
    lesson?.moduleId ?? activeLessonSummary?.moduleId ?? moduleGroups[0]?.id
  const rank = Math.floor(completedXp / 250) + 1

  useEffect(() => {
    if (!activeSlug) return

    updateStoredProgress((current) => ({
      ...current,
      lastActiveSlug: activeSlug,
    }))
  }, [activeSlug])

  useEffect(() => {
    function handleRunShortcut(event: KeyboardEvent) {
      const requestedRun = event.key === 'Enter' && (event.metaKey || event.ctrlKey)
      if (!requestedRun || isRunning || !lesson?.challenge) return

      event.preventDefault()
      void runCode()
    }

    window.addEventListener('keydown', handleRunShortcut)
    return () => window.removeEventListener('keydown', handleRunShortcut)
  }, [code, isRunning, lesson])

  useEffect(() => {
    if (!lesson || completedSlugs.has(lesson.slug)) return
    if (!isLessonReadyToComplete(lesson, runResponse, quizAnswers)) return

    updateStoredProgress((current) => ({
      ...current,
      completedSlugs: Array.from(
        new Set([...current.completedSlugs, lesson.slug]),
      ),
    }))
  }, [completedSlugs, lesson, quizAnswers, runResponse])

  function updateStoredProgress(
    updater: (current: StoredProgress) => StoredProgress,
  ) {
    setStoredProgress((current) => {
      const nextProgress = updater(current)
      writeStoredProgress(nextProgress)
      return nextProgress
    })
  }

  function handleCodeChange(nextCode: string) {
    setCode(nextCode)

    if (!lesson) return

    updateStoredProgress((current) => ({
      ...current,
      codeBySlug: {
        ...current.codeBySlug,
        [lesson.slug]: nextCode,
      },
    }))
  }

  function handleQuizAnswer(id: string, value: string) {
    const nextAnswers = { ...quizAnswers, [id]: value }
    setQuizAnswers(nextAnswers)

    if (!lesson) return

    updateStoredProgress((currentProgress) => ({
      ...currentProgress,
      quizAnswersBySlug: {
        ...currentProgress.quizAnswersBySlug,
        [lesson.slug]: nextAnswers,
      },
    }))
    setQuizChecked(false)
  }

  async function runCode() {
    if (!lesson || !lesson.challenge) return

    setIsRunning(true)
    setRunResponse(null)

    try {
      const data = await platformApi.runCode({ slug: lesson.slug, code })
      setRunResponse(data)
    } catch {
      setRunResponse({
        passed: false,
        results: [],
        stdout: '',
        stderr: '',
        error: 'Локальный Python runner не ответил.',
      })
    } finally {
      setIsRunning(false)
    }
  }

  function resetCode() {
    const starterCode = lesson?.challenge?.starterCode ?? ''
    setCode(starterCode)
    setRunResponse(null)

    if (!lesson) return

    updateStoredProgress((current) => ({
      ...current,
      codeBySlug: {
        ...current.codeBySlug,
        [lesson.slug]: starterCode,
      },
    }))
  }

  return (
    <main className="app-shell">
      <aside className="lesson-rail" aria-label="Уроки">
        <div className="brand-lockup">
          <span className="brand-mark-frame" aria-hidden="true">
            <img src="/pythonia-mark.svg" alt="" className="brand-mark" />
          </span>
          <div>
            <p className="eyebrow">Pythonia</p>
            <h1>Практика Python</h1>
          </div>
        </div>

        <div className="vault-progress" aria-label="Общий прогресс">
          <div>
            <span>Уровень {rank}</span>
            {completedXp}/{totalXp || 0} XP
          </div>
          <div className="progress-track">
            <div
              style={{
                width: totalXp
                  ? `${Math.round((completedXp / totalXp) * 100)}%`
                  : '0%',
              }}
            />
          </div>
          <small>{completedCount}/{lessons.length || 0} уроков завершено</small>
        </div>

        <div className="rail-section-title">Модули</div>
        <nav className="module-list" aria-label="Модули и уроки">
          {moduleGroups.map((module) => {
            const modulePercent = module.lessons.length
              ? Math.round((module.completedCount / module.lessons.length) * 100)
              : 0
            const moduleDone = module.completedCount === module.lessons.length

            return (
              <section
                className={
                  [
                    'module-card',
                    moduleDone ? 'completed' : '',
                    module.id !== activeModuleId ? 'collapsed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
                key={module.id}
              >
                <button
                  type="button"
                  className="module-header"
                  aria-expanded={module.id === activeModuleId}
                  onClick={() => {
                    const firstIncompleteLesson =
                      module.lessons.find((item) => !completedSlugs.has(item.slug)) ??
                      module.lessons[0]

                    if (firstIncompleteLesson) {
                      setActiveSlug(firstIncompleteLesson.slug)
                    }
                  }}
                >
                  <span className="module-title-row">
                    <span className="module-badge">Модуль {module.order}</span>
                    <span className="module-chevron" aria-hidden="true">
                      {module.id === activeModuleId ? '−' : '+'}
                    </span>
                  </span>
                  <strong>{module.title}</strong>
                  <small>{module.description}</small>
                </button>

                <div className="module-progress">
                  <span>
                    {module.completedCount}/{module.lessons.length} миссий
                  </span>
                  <span>{module.completedXp}/{module.totalXp} XP</span>
                </div>
                <div className="progress-track">
                  <div style={{ width: `${modulePercent}%` }} />
                </div>

                <div className="lesson-list">
                  {module.lessons.map((item) => (
                    <button
                      type="button"
                      className={
                        [
                          'lesson-card',
                          item.slug === activeSlug ? 'active' : '',
                          completedSlugs.has(item.slug) ? 'completed' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }
                      key={item.slug}
                      onClick={() => setActiveSlug(item.slug)}
                    >
                      <span className="lesson-order">
                        {completedSlugs.has(item.slug)
                          ? '✓'
                          : String(item.order).padStart(2, '0')}
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.level} · {item.xp} XP
                          {completedSlugs.has(item.slug) ? ' · пройдено' : ''}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </nav>
      </aside>

      <section className="lesson-pane">
        {lessonError ? (
          <div className="empty-state">{lessonError}</div>
        ) : lesson ? (
          <>
            <header className="lesson-header">
              <div>
                <p className="eyebrow">
                  {lesson.moduleTitle} · {lesson.level} · {lesson.duration} · {lesson.xp} XP
                </p>
                <h2>{lesson.title}</h2>
                <p>{lesson.description}</p>
              </div>
              <div className="stat-strip" aria-label="Прогресс">
                <span>
                  <strong>{progress.passed}/{progress.total}</strong>
                  тесты
                </span>
                <span>
                  <strong>{progress.quiz}/{lesson.quiz.length}</strong>
                  квиз
                </span>
                <span className={completedSlugs.has(lesson.slug) ? 'done' : ''}>
                  <strong>{completedSlugs.has(lesson.slug) ? 'Готово' : 'Открыт'}</strong>
                  статус
                </span>
              </div>
            </header>

            <div className="objective-row">
              {lesson.objectives.map((objective) => (
                <span key={objective}>{objective}</span>
              ))}
            </div>

            <article className="lesson-body">
              <ReactMarkdown
                components={markdownComponents}
                remarkPlugins={[remarkGfm]}
              >
                {lesson.content}
              </ReactMarkdown>
            </article>
          </>
        ) : (
          <div className="empty-state">Загружаю уроки...</div>
        )}
      </section>

      <section className="lab-pane" aria-label="Практическая лаборатория">
        {lesson ? (
          <>
            <div className="lab-header">
              <div>
                <p className="eyebrow">Лаборатория кода</p>
                <h2>Реши и проверь</h2>
              </div>
              <div className="run-actions">
                <button type="button" className="ghost-button" onClick={resetCode}>
                  Сбросить
                </button>
                <button
                  type="button"
                  className="run-button"
                  onClick={runCode}
                  disabled={isRunning || !lesson.challenge}
                >
                  {isRunning ? 'Проверяю...' : 'Запустить тесты'}
                </button>
              </div>
            </div>

            {lesson.challenge ? (
              <>
                <p className="challenge-prompt">{lesson.challenge.prompt}</p>
                <PythonEditor value={code} onChange={handleCodeChange} />

                <ResultConsole response={runResponse} isRunning={isRunning} />
              </>
            ) : (
              <div className="empty-state">В этом уроке только квиз.</div>
            )}

            <QuizPanel
              questions={lesson.quiz}
              answers={quizAnswers}
              checked={quizChecked}
              onAnswer={handleQuizAnswer}
              onCheck={() => setQuizChecked(true)}
            />
          </>
        ) : (
          <div className="empty-state">Выбери урок, чтобы начать.</div>
        )}
      </section>
    </main>
  )
}

function LessonCodeBlock({
  code,
  language,
}: {
  code: string
  language: string
}) {
  const extensions =
    language === 'python' || language === 'py' ? pythonSnippetExtensions : []

  return (
    <div className="lesson-code-block">
      <CodeMirror
        value={code}
        theme="dark"
        extensions={extensions}
        basicSetup={{
          bracketMatching: true,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          lineNumbers: false,
        }}
        readOnly
        editable={false}
      />
    </div>
  )
}

function PythonEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="editor-frame">
      <CodeMirror
        value={value}
        minHeight="320px"
        theme="dark"
        extensions={pythonEditorExtensions}
        basicSetup={{
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          lineNumbers: true,
        }}
        placeholder="Напиши решение на Python здесь"
        onChange={onChange}
      />
    </div>
  )
}

function ResultConsole({
  response,
  isRunning,
}: {
  response: RunResponse | null
  isRunning: boolean
}) {
  if (isRunning) {
    return <div className="console pending">Запускаю Python-тесты...</div>
  }

  if (!response) {
    return (
      <div className="console">
        <p>Результаты тестов появятся здесь после запуска решения.</p>
      </div>
    )
  }

  return (
    <div className={response.passed ? 'console passed' : 'console failed'}>
      <header>
        <strong>{response.passed ? 'Принято' : 'Пока не принято'}</strong>
        {response.timedOut ? <span>Тайм-аут</span> : null}
      </header>

      {response.error ? <p className="console-error">{response.error}</p> : null}

      <div className="test-list">
        {response.results.map((result) => (
          <div
            className={result.passed ? 'test-row passed' : 'test-row failed'}
            key={result.name}
          >
            <span>{result.passed ? 'ОК' : 'ОШИБКА'}</span>
            <strong>{result.name}</strong>
            <small>{result.passed ? 'Тест пройден' : result.message}</small>
            {!result.passed && (result.expected || result.actual) ? (
              <dl className="expectation-grid">
                <div>
                  <dt>Ожидалось</dt>
                  <dd>{result.expected ?? 'Ожидаемое значение не указано'}</dd>
                </div>
                <div>
                  <dt>Получено</dt>
                  <dd>{result.actual ?? 'Полученное значение не указано'}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        ))}
      </div>

      {response.stdout ? (
        <pre className="raw-output">{response.stdout}</pre>
      ) : null}
      {response.stderr ? (
        <pre className="raw-output error-output">{response.stderr}</pre>
      ) : null}
    </div>
  )
}

function QuizPanel({
  questions,
  answers,
  checked,
  onAnswer,
  onCheck,
}: {
  questions: QuizQuestion[]
  answers: Record<string, string>
  checked: boolean
  onAnswer: (id: string, value: string) => void
  onCheck: () => void
}) {
  return (
    <section className="quiz-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Квиз</p>
          <h2>Проверь понимание</h2>
        </div>
        <button type="button" className="ghost-button" onClick={onCheck}>
          Проверить
        </button>
      </div>

      {questions.map((question) => (
        <QuizQuestionView
          key={question.id}
          question={question}
          value={answers[question.id] ?? ''}
          checked={checked}
          onAnswer={(value) => onAnswer(question.id, value)}
        />
      ))}
    </section>
  )
}

function QuizQuestionView({
  question,
  value,
  checked,
  onAnswer,
}: {
  question: QuizQuestion
  value: string
  checked: boolean
  onAnswer: (value: string) => void
}) {
  const correct = isQuizCorrect(question, value)

  return (
    <div className={checked && correct ? 'quiz-item correct' : 'quiz-item'}>
      <p>{question.prompt}</p>
      {question.type === 'multiple-choice' ? (
        <div className="option-grid">
          {question.options.map((option) => (
            <button
              type="button"
              className={value === option ? 'option selected' : 'option'}
              key={option}
              onClick={() => onAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input
          value={value}
          onChange={(event) => onAnswer(event.target.value)}
          placeholder="Введи ответ"
        />
      )}

      {checked ? (
        <small className={correct ? 'feedback good' : 'feedback bad'}>
          {correct ? 'Верно. ' : 'Проверь еще раз. '}
          {question.explanation}
        </small>
      ) : null}
    </div>
  )
}

function scoreQuiz(questions: QuizQuestion[], answers: Record<string, string>) {
  return questions.filter((question) =>
    isQuizCorrect(question, answers[question.id] ?? ''),
  ).length
}

function isLessonReadyToComplete(
  lesson: Lesson,
  response: RunResponse | null,
  answers: Record<string, string>,
) {
  const challengeComplete = lesson.challenge ? response?.passed === true : true
  const quizComplete =
    lesson.quiz.length === 0 || scoreQuiz(lesson.quiz, answers) === lesson.quiz.length

  return challengeComplete && quizComplete
}

function isQuizCorrect(question: QuizQuestion, answer: string) {
  const normalize = (value: string) => value.trim().toLowerCase()
  const expected = question.answer

  if (Array.isArray(expected)) {
    return expected.map(normalize).includes(normalize(answer))
  }

  return normalize(expected) === normalize(answer)
}
