<p align="center"><img src="icon.png" width="112" alt="Inkstand icon"></p>

# Inkstand

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/lustri2002.inkstand?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=lustri2002.inkstand)

**A beautiful rendered view for Markdown in VS Code.** Inkstand opens `.md` files already rendered — headings, tables, task lists, highlighted code — with a source view, a table of contents and side-by-side editing, in light and dark themes.

![Inkstand in a dark theme, with the table of contents open](docs/images/dark-contents.png)

| Light theme | Source view |
|---|---|
| ![Rendered view in a light theme](docs/images/light-rendered.png) | ![Highlighted Markdown source view](docs/images/dark-source.png) |

## Features

- **Opens rendered by default.** `.md` and `.markdown` files open straight into the rendered view — no raw `#` and `**` first.
- **Rendered / Source switch.** Flip between the rendered page and the highlighted Markdown source in the same panel. Each mode remembers its scroll position.
- **Table of contents.** The **Contents** button opens a side panel with the H1–H3 headings. The current section is highlighted and clicking a heading jumps to it.
- **Reading position.** The toolbar shows the section you are in (e.g. `Release checklist › Before the freeze`) and how far you have read (`Position 46%`).
- **Side-by-side editing.** The pencil opens VS Code's text editor next to the rendered view, at the line you are reading. The rendered view updates live as you type, and the two stay scrolled to the same place. Double-click a paragraph to jump to its source. Close the text tab when you are done.
- **Follows your theme.** Colors and fonts come from your VS Code theme, including high-contrast themes.
- **Clickable task lists.** Ticking a `- [ ]` box writes `[x]` into the file (undo with `Cmd+Z` / `Ctrl+Z`, save as usual).
- **YAML front matter** is shown as a tidy key/value table.
- **Safe by default.** Raw HTML inside Markdown is shown as text, scripts never run, and only HTTPS remote images are loaded.

## Usage

| Action | How |
|---|---|
| Switch Rendered / Source | Click the switch in the toolbar, or `Cmd+Alt+M` (`Ctrl+Alt+M` on Windows/Linux) |
| Show or hide the table of contents | Click **Contents** |
| Edit the file | Click the pencil: the text editor opens beside the rendered view |
| Jump to the source of a paragraph | Double-click it |
| Go back from the text editor | Close the text tab, click the eye icon (**Back to Rendered View**) or press `Cmd+Alt+M` |

### Commands

- `Markdown: Toggle Rendered / Source`
- `Markdown: Edit Side by Side`
- `Markdown: Back to Rendered View`

### Settings

| Setting | Default | Description |
|---|---|---|
| `inkstand.enabled` | `true` | Open Markdown files directly in the rendered view. When `false`, they open as text and Inkstand is used only when you ask for it. |
| `inkstand.scrollSync` | `true` | Keep the rendered view and the text editor scrolled to the same place. |
| `inkstand.doubleClickToEdit` | `true` | Double-click in the rendered view to open the text editor at that line. |

Inkstand also hides VS Code's editor-type dropdown in the breadcrumbs (`breadcrumbs.showEditorType`) by default. Set it back to `true` in your settings if you want it.

## Install

Install Inkstand from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=lustri2002.inkstand): open the Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`), search for **Inkstand** and click **Install**. Or from a terminal:

```bash
code --install-extension lustri2002.inkstand
```

Each version is also attached as a `.vsix` file to the [GitHub Releases](https://github.com/lustri2002/inkstand/releases).

### From source

You need Node.js 18 or newer:

```bash
git clone https://github.com/lustri2002/inkstand.git
cd inkstand
npm install
npm run package
code --install-extension inkstand-*.vsix
```

Then reload the VS Code window.

## Development

```bash
npm install
npm run compile     # bundle the extension and the webview script into dist/
npm run typecheck   # TypeScript checks
npm test            # unit tests (vitest)
```

Press `F5` in VS Code to launch an Extension Development Host. `samples/` contains Markdown files to try it with.

## Credits

The look of the toolbar, the source view and the table of contents is inspired by [FluxMarkdown](https://github.com/xykong/flux-markdown), a Markdown viewer for macOS. Inkstand is an independent implementation and contains no FluxMarkdown code.

## License

[MIT](LICENSE)
