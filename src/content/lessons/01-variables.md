---
title: Переменные и результат функции
difficulty: beginner
order: 1
function_name: greet
---

# Theory

## Зачем нужны переменные

Программа на Python работает со значениями: числами, строками, списками и другими объектами. Переменная - это имя, которое ты даешь значению, чтобы потом удобно к нему обращаться.

```python
language = "Python"
year = 1991
```

Имя пишется слева, значение справа, а `=` связывает их. Это можно читать так: переменная `language` теперь указывает на строку `Python`.

## return и print - не одно и то же

Если функция должна отдать значение обратно программе, используй `return`.

```python
def double(number):
    return number * 2
```

Если ты просто хочешь показать что-то в терминале, используй `print`. В задачах тесты проверяют именно возвращаемые значения. Если функция только печатает результат, тест увидит `None`.

## F-строки

F-строка позволяет вставлять значение внутрь текста:

```python
name = "Ada"
message = f"Hello, {name}!"
```

Такое выражение создает строку `"Hello, Ada!"`.

# Exercise

Реализуй `greet(name)`. Функция должна вернуть приветствие ровно в виде `Hello, Ada!`.

```python
def greet(name):
    return ___
```

# Tests

```yaml
- input: ["Ada"]
  expected: "Hello, Ada!"
  visible: true
- input: ["Ada Lovelace"]
  expected: "Hello, Ada Lovelace!"
  visible: true
- input: ["Linus"]
  expected: "Hello, Linus!"
  visible: false
```

# Hint

Используй f-строку: `f"Hello, {name}!"`.

# Solution

```python
def greet(name):
    return f"Hello, {name}!"
```
