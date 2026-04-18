---
title: Списки и циклы
difficulty: beginner
order: 5
function_name: sum_even
---

# Theory

## Списки хранят несколько значений

Список - это упорядоченная коллекция. В нем можно хранить числа, строки, логические значения и даже другие списки.

```python
numbers = [4, 8, 15, 16, 23, 42]
```

Когда ты работаешь со списком, чаще всего первый вопрос такой: что нужно сделать с каждым элементом?

## Цикл for

Цикл `for` нужен, когда ты хочешь пройти по всем элементам.

```python
total = 0
for number in numbers:
    total = total + number
```

Переменная `number` меняется на каждом шаге: сначала это `4`, потом `8`, потом `15` и так далее.

## Фильтрация через if

Не всегда нужны все значения. Условие помогает выбрать только подходящие.

```python
if number % 2 == 0:
    total = total + number
```

`number % 2` возвращает остаток от деления на 2. Если остаток равен 0, число четное.

# Exercise

Реализуй `sum_even(numbers)`. Верни сумму только четных чисел из списка.

```python
def sum_even(numbers):
    total = 0
    for number in numbers:
        if ___:
            total = total + ___
    return total
```

# Tests

```yaml
- input: [[1, 2, 3, 4, 5, 6]]
  expected: 12
  visible: true
- input: [[1, 3, 5, 7]]
  expected: 0
  visible: true
- input: [[-4, -3, 2, 9]]
  expected: -2
  visible: false
```

# Hint

Четное число дает остаток `0` при делении на `2`. Добавлять нужно текущий `number`.

# Solution

```python
def sum_even(numbers):
    total = 0
    for number in numbers:
        if number % 2 == 0:
            total = total + number
    return total
```
