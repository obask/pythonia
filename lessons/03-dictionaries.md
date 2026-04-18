---
slug: dictionaries-and-counts
title: Словари и подсчет
description: Используй ключи и значения, чтобы считать повторяющиеся слова.
moduleId: collections
moduleTitle: Коллекции данных
moduleDescription: Списки, индексы, циклы и словари
moduleOrder: 2
level: Начальный+
duration: 22 мин
order: 7
xp: 150
tags:
  - словари
  - строки
objectives:
  - Читать и записывать значения словаря
  - Нормализовать текст перед подсчетом
  - Возвращать структурированные данные
quiz:
  - id: q1
    type: multiple-choice
    prompt: Что делает строка counts["python"] = 3?
    options:
      - Сохраняет значение 3 по ключу "python"
      - Создает список из трех строк "python"
      - Удаляет ключ "python"
      - Печатает слово python три раза
    answer: Сохраняет значение 3 по ключу "python"
    explanation: Словарь связывает ключ со значением. Потом по ключу можно быстро найти сохраненное значение.
  - id: q2
    type: short-answer
    prompt: Какой метод строки превращает "Python" в "python"?
    answer:
      - lower
      - lower()
    explanation: lower() возвращает копию строки в нижнем регистре.
challenge:
  prompt: Реализуй word_count(words). Верни словарь, где слова в нижнем регистре связаны с количеством повторов.
  starterCode: |
    def word_count(words):
        counts = {}
        # Считай каждое слово в нижнем регистре.
        return counts
  tests:
    - name: считает повторяющиеся слова
      code: |
        expect_equal(word_count(["Python", "python", "Code"]), {"python": 2, "code": 1})
    - name: работает с пустым списком
      code: |
        expect_equal(word_count([]), {})
    - name: считает несколько повторов
      code: |
        expect_equal(word_count(["A", "b", "a", "B", "a"]), {"a": 3, "b": 2})
---

## Словарь хранит связи

Словарь связывает ключ со значением.

```python
profile = {
    "name": "Ada",
    "language": "Python",
}
```

Квадратные скобки позволяют читать и записывать значение:

```python
profile["language"] = "Python"
```

## Подсчет через словарь

Подсчет - классическая задача для словаря. Слово будет ключом, а количество повторов - значением.

```python
counts = {}
for word in words:
    key = word.lower()
    counts[key] = counts.get(key, 0) + 1
```

`get(key, 0)` значит: "дай текущее значение по ключу, а если такого ключа еще нет, верни 0".

## Сначала нормализуй данные

Для человека `Python`, `python` и `PYTHON` - это одно и то же слово. Для компьютера это разные строки, пока ты не скажешь иначе. Поэтому перед подсчетом удобно вызывать `lower()`.
