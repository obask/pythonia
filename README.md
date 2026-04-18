# Pythonia Lessons Vault

Независимый vault с русскоязычными уроками Python. Эта ветка хранит только учебный контент и не зависит от того, на каком фреймворке или в каком приложении он будет использован.

## Структура

```text
lessons/
  01-variables.md
  02-arithmetic.md
  ...
```

Каждый урок - обычный Markdown-файл с YAML frontmatter. Markdown после frontmatter содержит объяснение темы, примеры кода и подсказки.

## Frontmatter

Минимальный набор полей:

```yaml
---
slug: variables-and-output
title: Переменные и результат функции
description: Короткое описание урока.
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
  - Отличать return от print
quiz:
  - id: q1
    type: multiple-choice
    prompt: Вопрос
    options:
      - Ответ 1
      - Ответ 2
    answer: Ответ 1
    explanation: Почему это верно.
challenge:
  prompt: Формулировка задания.
  starterCode: |
    def solve():
        pass
  tests:
    - name: базовый случай
      code: |
        expect_equal(solve(), "answer")
---
```

## Тесты

Тесты в `challenge.tests[].code` описываются как небольшие Python-фрагменты. Для сравнения ожидаемого и фактического значения используется helper:

```python
expect_equal(actual, expected)
```

Исполняющая среда должна предоставить этот helper. Vault намеренно не диктует, как именно запускать тесты: через браузерное приложение, CLI, desktop-приложение или другую систему.

## Модули и прогресс

Уроки группируются по `moduleId`. Поля `moduleTitle`, `moduleDescription` и `moduleOrder` позволяют любому клиенту построить список модулей и прогресс по ним.

`xp` - условная награда за завершение урока. Клиент может использовать ее для gamification: уровней, прогресс-баров, достижений или рейтинга.
