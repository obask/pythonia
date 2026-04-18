---
title: Условия if
difficulty: beginner
order: 3
function_name: age_group
---

# Theory

## Зачем нужны условия

Иногда программа должна выбрать один из нескольких вариантов. Для этого используется `if`.

```python
if temperature > 25:
    print("warm")
```

Код внутри `if` выполняется только тогда, когда условие истинно.

## if и else

`else` описывает вариант "иначе".

```python
if score >= 60:
    result = "passed"
else:
    result = "try again"
```

Python обращает внимание на отступы. Строки внутри `if` и `else` должны быть сдвинуты вправо.

## Сравнения

Частые операторы сравнения:

```python
age < 18
score >= 60
name == "Ada"
```

# Exercise

Реализуй `age_group(age)`. Верни `"child"`, если `age` меньше 18, иначе верни `"adult"`.

```python
def age_group(age):
    if ___:
        return "child"
    return ___
```

# Tests

```yaml
- input: [12]
  expected: "child"
  visible: true
- input: [18]
  expected: "adult"
  visible: true
- input: [31]
  expected: "adult"
  visible: false
```

# Hint

Проверь `age < 18`. Во втором пропуске нужна строка `"adult"`.

# Solution

```python
def age_group(age):
    if age < 18:
        return "child"
    return "adult"
```
