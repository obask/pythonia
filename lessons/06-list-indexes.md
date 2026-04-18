---
slug: list-indexes
title: Индексы списков
description: Доставай первый, последний и нужный элемент из списка.
moduleId: collections
moduleTitle: Коллекции данных
moduleDescription: Списки, индексы, циклы и словари
moduleOrder: 2
level: Начальный
duration: 15 мин
order: 6
xp: 100
tags:
  - списки
  - индексы
objectives:
  - Понимать индексацию с нуля
  - Получать первый элемент списка
  - Получать последний элемент через -1
quiz:
  - id: q1
    type: multiple-choice
    prompt: Как получить первый элемент списка items?
    options:
      - items[0]
      - items[1]
      - first(items)
      - items.first
    answer: items[0]
    explanation: В Python индексы начинаются с 0, поэтому первый элемент имеет индекс 0.
  - id: q2
    type: short-answer
    prompt: Какой индекс обычно используют для последнего элемента списка?
    answer:
      - "-1"
    explanation: Индекс -1 означает последний элемент списка.
challenge:
  prompt: Реализуй first_and_last(items). Верни список из первого и последнего элемента.
  starterCode: |
    def first_and_last(items):
        # Верни [первый_элемент, последний_элемент]
        pass
  tests:
    - name: работает со строками
      code: |
        expect_equal(first_and_last(["red", "green", "blue"]), ["red", "blue"])
    - name: работает с числами
      code: |
        expect_equal(first_and_last([10, 20, 30, 40]), [10, 40])
    - name: работает со списком из одного элемента
      code: |
        expect_equal(first_and_last(["only"]), ["only", "only"])
---

## Индексы начинаются с нуля

В Python первый элемент списка имеет индекс `0`.

```python
colors = ["red", "green", "blue"]
first = colors[0]
```

`colors[0]` вернет `"red"`, а `colors[1]` вернет `"green"`.

## Последний элемент

Для последнего элемента удобно использовать индекс `-1`.

```python
last = colors[-1]
```

Это работает даже если список стал длиннее или короче.

## Новый список из двух элементов

Список можно создать из уже найденных значений:

```python
result = [colors[0], colors[-1]]
```

В упражнении нужно вернуть такой список для любых входных данных.
