# Changelog

All notable changes to Inkstand are listed here.

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
