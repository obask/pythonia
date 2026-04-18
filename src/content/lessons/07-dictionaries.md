---
title: Словари и подсчет
difficulty: intermediate
order: 7
function_name: word_count
---

# Theory

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

`get(key, 0)` значит: дай текущее значение по ключу, а если такого ключа еще нет, верни `0`.

## Сначала нормализуй данные

Для человека `Python`, `python` и `PYTHON` - это одно и то же слово. Для компьютера это разные строки, пока ты не скажешь иначе. Поэтому перед подсчетом удобно вызывать `lower()`.

# Exercise

Реализуй `word_count(words)`. Верни словарь, где слова в нижнем регистре связаны с количеством повторов.

```python
def word_count(words):
    counts = {}
    for word in words:
        key = ___.lower()
        counts[key] = counts.get(key, 0) + ___
    return counts
```

# Tests

```yaml
- input: [["Python", "python", "Code"]]
  expected:
    python: 2
    code: 1
  visible: true
- input: [[]]
  expected: {}
  visible: true
- input: [["A", "b", "a", "B", "a"]]
  expected:
    a: 3
    b: 2
  visible: false
```

# Hint

Первый пропуск - текущее слово `word`. Второй пропуск - число, на которое увеличивается счетчик.

# Solution

```python
def word_count(words):
    counts = {}
    for word in words:
        key = word.lower()
        counts[key] = counts.get(key, 0) + 1
    return counts
```
