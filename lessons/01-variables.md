---
slug: variables-and-output
title: Переменные и результат функции
description: Научись хранить значения в переменных и возвращать строки из маленьких функций.
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
  - функции
objectives:
  - Давать значениям понятные имена
  - Отличать return от print
  - Собирать строки с помощью f-строк
quiz:
  - id: q1
    type: multiple-choice
    prompt: Какая строка создает переменную score со значением 10?
    options:
      - score = 10
      - int score = 10
      - score := 10;
      - let score = 10
    answer: score = 10
    explanation: В Python имя связывается со значением через один знак равенства.
  - id: q2
    type: short-answer
    prompt: Какая встроенная функция выводит текст в терминал?
    answer:
      - print
      - print()
    explanation: print() показывает значение человеку, а return возвращает значение тому коду, который вызвал функцию.
challenge:
  prompt: Реализуй greet(name). Функция должна вернуть приветствие ровно в том виде, который ожидают тесты.
  starterCode: |
    def greet(name):
        # Верни приветствие вида: Hello, Ada!
        pass
  tests:
    - name: приветствует Ada
      code: |
        expect_equal(greet("Ada"), "Hello, Ada!")
    - name: сохраняет пробелы в имени
      code: |
        expect_equal(greet("Ada Lovelace"), "Hello, Ada Lovelace!")
    - name: работает с другим именем
      code: |
        expect_equal(greet("Linus"), "Hello, Linus!")
---

## Зачем нужны переменные

Программа на Python работает со значениями: числами, строками, списками и другими объектами. Переменная - это имя, которое ты даешь значению, чтобы потом удобно к нему обращаться.

```python
language = "Python"
year = 1991
```

Имя пишется слева, значение справа, а `=` связывает их. Это можно читать так: "переменная `language` теперь указывает на строку `Python`".

## return и print - не одно и то же

Если функция должна отдать значение обратно программе, используй `return`.

```python
def double(number):
    return number * 2
```

Если ты просто хочешь показать что-то в терминале, используй `print`.

```python
print(double(5))
```

В задачах тесты проверяют именно возвращаемые значения. Если функция только печатает результат, тест не сможет использовать этот результат и увидит `None`.

## F-строки

F-строка позволяет вставлять значение внутрь текста:

```python
name = "Ada"
message = f"Hello, {name}!"
```

Такое выражение создает строку `"Hello, Ada!"`. В упражнении нужно сделать именно это: собрать строку и вернуть ее через `return`.
