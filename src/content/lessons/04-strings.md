---
title: Строки
difficulty: beginner
order: 4
function_name: format_name
---

# Theory

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

# Exercise

Реализуй `format_name(first, last)`. Убери лишние пробелы и верни имя в формате `"Ada Lovelace"`.

```python
def format_name(first, last):
    clean_first = ___.strip().title()
    clean_last = ___.strip().title()
    return clean_first + " " + clean_last
```

# Tests

```yaml
- input: ["ada", "lovelace"]
  expected: "Ada Lovelace"
  visible: true
- input: ["  grace", "hopper  "]
  expected: "Grace Hopper"
  visible: true
- input: ["Alan", "Turing"]
  expected: "Alan Turing"
  visible: false
```

# Hint

Первый пропуск - `first`, второй - `last`.

# Solution

```python
def format_name(first, last):
    clean_first = first.strip().title()
    clean_last = last.strip().title()
    return clean_first + " " + clean_last
```
