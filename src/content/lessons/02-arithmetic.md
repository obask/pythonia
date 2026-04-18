---
title: Числа и арифметика
difficulty: beginner
order: 2
function_name: rectangle_area
---

# Theory

## Числа в Python

Python умеет работать с целыми и дробными числами.

```python
age = 36
temperature = 21.5
```

С ними можно выполнять обычные арифметические операции.

## Основные операторы

```python
total = 2 + 3
difference = 10 - 4
area = 5 * 6
half = 8 / 2
```

Оператор `/` возвращает результат деления. Оператор `//` возвращает только целую часть.

```python
print(7 / 2)   # 3.5
print(7 // 2)  # 3
```

## Функция должна возвращать число

В упражнении нужно посчитать площадь прямоугольника. Это обычное умножение.

# Exercise

Реализуй `rectangle_area(width, height)`. Функция должна вернуть площадь прямоугольника.

```python
def rectangle_area(width, height):
    return ___
```

# Tests

```yaml
- input: [3, 4]
  expected: 12
  visible: true
- input: [1, 9]
  expected: 9
  visible: true
- input: [0, 5]
  expected: 0
  visible: false
```

# Hint

Площадь прямоугольника равна ширина умножить на высоту.

# Solution

```python
def rectangle_area(width, height):
    return width * height
```
