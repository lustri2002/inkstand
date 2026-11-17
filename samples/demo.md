---
title: Demo
tags: [sample, markdown]
---

# Markdown demo

Text with **bold**, *italic*, ~~strikethrough~~ and `inline code`.

## Why it matters

A quote:

> Rendered Markdown is nicer to read.

## Why it matters

Duplicate heading: its anchor becomes `why-it-matters-1`. [Back to the top](#markdown-demo)

### Lists

- item one
  - nested
- item two

1. first
2. second

- [x] done task
- [ ] open task

### Table

| Column A | Column B |
|----------|----------|
| one      | two      |
| three    | four     |

### Code

```ts
const greet = (name: string): string => `Hello ${name}`;
console.log(greet('world'));
```

```unknown
<text> in an unknown language
```

### Images and links

Relative image (missing on purpose, only the alt text should show):

![Missing image](img/does-not-exist.png)

HTTPS image:

![Logo](https://upload.wikimedia.org/wikipedia/commons/4/48/Markdown-mark.svg)

External link: [Anthropic](https://www.anthropic.com). Link to this same file: [demo.md](demo.md).

Raw HTML, must stay as text: <script>alert(1)</script>

---

The end.
