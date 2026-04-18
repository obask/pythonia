---
title: Индексы списков
difficulty: beginner
order: 6
function_name: first_and_last
---

# Theory

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

# Exercise

Реализуй `first_and_last(items)`. Верни список из первого и последнего элемента.

```python
def first_and_last(items):
    return [___, ___]
```

# Tests

```yaml
- input: [["red", "green", "blue"]]
  expected: ["red", "blue"]
  visible: true
- input: [[10, 20, 30, 40]]
  expected: [10, 40]
  visible: true
- input: [["only"]]
  expected: ["only", "only"]
  visible: false
```

# Hint

Первый элемент: `items[0]`. Последний элемент: `items[-1]`.

# Solution

```python
def first_and_last(items):
    return [items[0], items[-1]]
```
