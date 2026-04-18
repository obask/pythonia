---
slug: arithmetic-and-operators
title: Числа и арифметика
description: Освой сложение, умножение и порядок вычислений в маленьких функциях.
moduleId: syntax-basics
moduleTitle: База синтаксиса
moduleDescription: Переменные, числа, условия и строки
moduleOrder: 1
level: Начальный
duration: 14 мин
order: 2
xp: 100
tags:
  - числа
  - операторы
objectives:
  - Использовать арифметические операторы
  - Возвращать числовой результат
  - Понимать разницу между / и //
quiz:
  - id: q1
    type: multiple-choice
    prompt: Какой оператор умножает числа в Python?
    options:
      - "*"
      - x
      - multiply
      - "**"
    answer: "*"
    explanation: Для умножения используется звездочка *. Оператор ** нужен для степени.
  - id: q2
    type: short-answer
    prompt: Что вернет выражение 7 // 2?
    answer:
      - "3"
    explanation: // выполняет целочисленное деление и отбрасывает дробную часть.
challenge:
  prompt: Реализуй rectangle_area(width, height). Функция должна вернуть площадь прямоугольника.
  starterCode: |
    def rectangle_area(width, height):
        # Площадь = ширина * высота
        pass
  tests:
    - name: считает площадь 3 на 4
      code: |
        expect_equal(rectangle_area(3, 4), 12)
    - name: работает с единицей
      code: |
        expect_equal(rectangle_area(1, 9), 9)
    - name: работает с нулевой шириной
      code: |
        expect_equal(rectangle_area(0, 5), 0)
---

## Числа в Python

Python умеет работать с целыми числами и дробными числами.

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

В упражнении нужно посчитать площадь прямоугольника. Это обычное умножение:

```python
width * height
```

Верни результат через `return`, чтобы тесты могли его сравнить.
