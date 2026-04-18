---
slug: conditionals
title: Условия if
description: Научись выбирать разные ответы в зависимости от значения.
moduleId: syntax-basics
moduleTitle: База синтаксиса
moduleDescription: Переменные, числа, условия и строки
moduleOrder: 1
level: Начальный
duration: 17 мин
order: 3
xp: 110
tags:
  - условия
  - логика
objectives:
  - Писать if и else
  - Сравнивать значения
  - Возвращать разные строки
quiz:
  - id: q1
    type: multiple-choice
    prompt: Какой оператор проверяет равенство двух значений?
    options:
      - ==
      - =
      - ===
      - is equal
    answer: ==
    explanation: Один знак = присваивает значение, а два знака == сравнивают значения.
  - id: q2
    type: short-answer
    prompt: Какое ключевое слово используется для ветки "иначе"?
    answer:
      - else
    explanation: else выполняется, когда условие в if оказалось ложным.
challenge:
  prompt: Реализуй age_group(age). Верни "child", если age меньше 18, иначе верни "adult".
  starterCode: |
    def age_group(age):
        # Если возраст меньше 18, верни "child".
        # Иначе верни "adult".
        pass
  tests:
    - name: ребенок
      code: |
        expect_equal(age_group(12), "child")
    - name: ровно 18 уже взрослый
      code: |
        expect_equal(age_group(18), "adult")
    - name: взрослый
      code: |
        expect_equal(age_group(31), "adult")
---

## Зачем нужны условия

Иногда программа должна выбрать один из нескольких вариантов. Для этого используется `if`.

```python
if temperature > 25:
    print("warm")
```

Код внутри `if` выполняется только тогда, когда условие истинно.

## if и else

`else` описывает вариант "иначе".

```python
if score >= 60:
    result = "passed"
else:
    result = "try again"
```

Python обращает внимание на отступы. Строки внутри `if` и `else` должны быть сдвинуты вправо.

## Сравнения

Частые операторы сравнения:

```python
age < 18
score >= 60
name == "Ada"
```

В упражнении нужно проверить возраст и вернуть одну из двух строк.
