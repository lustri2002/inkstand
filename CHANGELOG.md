# Changelog

All notable changes to Inkstand are listed here.

## Unreleased

- **Scroll sync:** the rendered view and the text editor beside it stay scrolled to the same place (`inkstand.scrollSync`). The pencil opens the text editor at the line you are reading.
- **Double-click to edit:** double-click a paragraph to open the text editor at its source line (`inkstand.doubleClickToEdit`).
- **Clickable task lists:** ticking a box in the rendered view writes `[x]` / `[ ]` into the file.
- **GitHub alerts** (`> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`), **footnotes** and **emoji shortcodes** (`:tada:`).
- **Mermaid diagrams** (` ```mermaid `), loaded only for pages that have one and following the light or dark theme.
- **Math** with KaTeX: `$inline$`, `$$display$$` and ` ```math ` blocks.
- **Copy button** and language label on code blocks.
- **Reading time** in the toolbar (`6 min read`), with the word count on hover. Code, diagrams and formulas are not counted.
- **Find in the rendered view:** `Cmd+F` / `Ctrl+F` opens VS Code's find widget.
- Links such as `other.md#section` open the file scrolled to that section, including links to a section of the same file.
- Links to other Markdown files open in the rendered view even when `inkstand.enabled` is `false`.
- Heading anchors follow GitHub's rules: underscores are kept (`#my_function`), so links written for GitHub work.
- Anchor links can no longer jump to toolbar elements when a heading is named like one (e.g. "Edit").

## 0.6.0 — First public release

- Opens `.md` and `.markdown` files directly in a rendered view.
- **Rendered / Source** switch in the toolbar, with a separate scroll position for each mode (`Cmd+Alt+M` / `Ctrl+Alt+M`).
- **Contents** side panel with the H1–H3 headings, highlighting the current section.
- Toolbar indicator with the current section path and the reading position.
- **Side-by-side editing:** the pencil opens the text editor next to the rendered view, which updates as you type. **Back to Rendered View** returns from the text editor.
- YAML front matter shown as a key/value table.
- Syntax-highlighted code blocks, task lists, tables and heading anchors (including accented and duplicate headings).
- Theme-aware styling for light, dark and high-contrast themes.
- Safe rendering: raw HTML is escaped, scripts never run, only HTTPS remote images are loaded.
- `inkstand.enabled` setting to open Markdown files as text by default.
- Hides VS Code's editor-type dropdown in the breadcrumbs by default (`breadcrumbs.showEditorType`).
