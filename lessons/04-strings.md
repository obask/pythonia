---
slug: strings-basics
title: Строки
description: Склеивай текст, меняй регистр и возвращай аккуратно подготовленные строки.
moduleId: syntax-basics
moduleTitle: База синтаксиса
moduleDescription: Переменные, числа, условия и строки
moduleOrder: 1
level: Начальный
duration: 18 мин
order: 4
xp: 120
tags:
  - строки
  - методы
objectives:
  - Склеивать строки
  - Использовать методы strip и title
  - Возвращать подготовленный текст
quiz:
  - id: q1
    type: multiple-choice
    prompt: Что делает метод strip()?
    options:
      - Убирает пробелы по краям строки
      - Делит строку на числа
      - Переводит строку в верхний регистр
      - Удаляет все буквы s
    answer: Убирает пробелы по краям строки
    explanation: strip() удаляет пробелы и переносы строк в начале и в конце строки.
  - id: q2
    type: short-answer
    prompt: Какой метод превращает "ada lovelace" в "Ada Lovelace"?
    answer:
      - title
      - title()
    explanation: title() делает первую букву каждого слова заглавной.
challenge:
  prompt: Реализуй format_name(first, last). Убери лишние пробелы и верни имя в формате "Ada Lovelace".
  starterCode: |
    def format_name(first, last):
        # Убери пробелы по краям и сделай каждую часть красивой.
        pass
  tests:
    - name: форматирует обычное имя
      code: |
        expect_equal(format_name("ada", "lovelace"), "Ada Lovelace")
    - name: убирает лишние пробелы
      code: |
        expect_equal(format_name("  grace", "hopper  "), "Grace Hopper")
    - name: работает с уже красивым именем
      code: |
        expect_equal(format_name("Alan", "Turing"), "Alan Turing")
---

## Строка - это текст

Строки записываются в кавычках.

```python
first_name = "ada"
last_name = "lovelace"
```

Строки можно склеивать с помощью `+`.

```python
full_name = first_name + " " + last_name
```

## Методы строк

У строк есть полезные методы. Метод вызывается через точку.

```python
text = "  hello  "
clean = text.strip()
```

`strip()` убирает пробелы по краям. `title()` делает первые буквы слов заглавными.

```python
name = "ada lovelace"
pretty = name.title()
```

## Цепочки вызовов

Методы можно вызывать подряд:

```python
pretty = "  ada  ".strip().title()
```

В упражнении нужно подготовить имя и фамилию, а затем соединить их пробелом.
