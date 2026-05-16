# Lesson Authoring

Lessons are markdown files with YAML frontmatter followed by normal markdown
content. The app is designed for Russian-language lesson text, quiz prompts, and
challenge labels.

## Lesson Location

The independent authoring vault is expected at:

```text
../pythonia--lessons/lessons
```

Set `PYTHONIA_LESSONS_DIR` to use another directory:

```bash
PYTHONIA_LESSONS_DIR=/absolute/path/to/lessons pnpm desktop:dev
```

The repository's `lessons/` directory is also used by the web preview as bundled
fallback content.

## File Shape

````markdown
---
slug: variables-and-output
title: Переменные и результат функции
description: Научись хранить значения в переменных.
moduleId: syntax-basics
moduleTitle: База синтаксиса
moduleDescription: Переменные, числа, условия и строки
moduleOrder: 1
level: Начальный
duration: 16 мин
order: 1
xp: 100
tags:
  - основы
objectives:
  - Давать значениям понятные имена
quiz:
  - id: q1
    type: multiple-choice
    prompt: Какая строка создает переменную score со значением 10?
    options:
      - score = 10
      - int score = 10
    answer: score = 10
    explanation: В Python имя связывается со значением через один знак равенства.
challenge:
  prompt: Реализуй greet(name).
  starterCode: |
    def greet(name):
        pass
  tests:
    - name: приветствует Ada
      code: |
        expect_equal(greet("Ada"), "Hello, Ada!")
---

## Текст урока

Обычный markdown с блоками кода:

```python
name = "Ada"
```
````

## Frontmatter Fields

| Field | Required | Notes |
| --- | --- | --- |
| `slug` | Recommended | Used to load lessons and store progress. Defaults to filename without numeric prefix. |
| `title` | Recommended | Falls back to slug. |
| `description` | Recommended | Displayed in the lesson header and lesson cards. |
| `moduleId` | Recommended | Groups lessons in the sidebar. |
| `moduleTitle` | Recommended | Displayed as the module heading. |
| `moduleDescription` | Recommended | Displayed under the module title. |
| `moduleOrder` | Recommended | Sorts modules. Defaults to `1`. |
| `level` | Optional | Defaults to `Начальный`. |
| `duration` | Optional | Defaults to estimated reading time. |
| `order` | Recommended | Sorts lessons within a module. Defaults to `999`. |
| `xp` | Optional | Defaults to `100`. |
| `tags` | Optional | Array of strings. |
| `objectives` | Optional | Displayed as chips above lesson content. |
| `quiz` | Optional | Array of quiz questions. Defaults to empty. |
| `challenge` | Optional | Adds starter code and executable tests. |

## Quiz Questions

Multiple-choice questions use exact option text as the answer:

```yaml
- id: q1
  type: multiple-choice
  prompt: Какой оператор умножает числа в Python?
  options:
    - "*"
    - "+"
  answer: "*"
  explanation: Для умножения используется звездочка.
```

Short-answer questions can use one accepted answer or a list of accepted
answers:

```yaml
- id: q2
  type: short-answer
  prompt: Какая функция выводит текст в терминал?
  answer:
    - print
    - print()
  explanation: print() показывает значение человеку.
```

Answer matching trims whitespace and ignores case.

## Challenges

A challenge contains a prompt, starter code, and test list:

```yaml
challenge:
  prompt: Реализуй rectangle_area(width, height).
  starterCode: |
    def rectangle_area(width, height):
        pass
  tests:
    - name: считает площадь 3 на 4
      code: |
        expect_equal(rectangle_area(3, 4), 12)
```

Tests run after the student's code. Keep tests deterministic, short, and free
of filesystem or network requirements.

Use `expect_equal(actual, expected)` when possible. It gives the UI structured
expected and received values. `assert_equal(actual, expected)` is an alias.

Regular Python assertions also work, but the UI can only show the assertion
message:

```python
assert rectangle_area(3, 4) == 12, "Площадь должна быть 12"
```

## Completion Rules

A lesson is marked complete when:

- every challenge test passes, when the lesson has a challenge;
- every quiz question is correct, when the lesson has a quiz.

This means:

- challenge-only lessons complete after passing tests;
- quiz-only lessons complete after all quiz answers are correct;
- lessons with both require both.

## Authoring Checklist

- Use stable slugs. Changing a slug loses local progress for that lesson.
- Keep `moduleId`, `moduleTitle`, and `moduleOrder` consistent across a module.
- Make `order` unique within a module.
- Keep starter code valid Python.
- Prefer `return`-based functions for beginner challenges.
- Use `expect_equal` for comparison tests.
- Check the vault before desktop runs:

```bash
pnpm check:lessons
```
