# Flagger

A Chrome extension for flagging elements on any webpage and copying structured
instructions to hand off to an AI coding agent.

Click the toolbar icon, hover and click the elements you want to change, jot a
note on each one, and Flagger copies a clean Markdown brief to your clipboard —
ready to paste into your agent of choice.

## What it captures

For each flag, Flagger records:

- **URL** of the page
- **CSS selector** for the element (auto-generated, ID-aware)
- **Element summary** (tag + a short description)
- **Position** on the page
- **Your note** ("Why flag this?")

These are assembled into a Markdown document like:

```markdown
## Flag 1

- URL: https://example.com
- Selector: `header > nav > a.cta`
- Element: `<a class="cta">Sign up</a>`
- Position: 1240, 32

> Make this button bigger and move it left of the logo.
```

## Project structure

The overlay is written as small ES modules in `src/` and bundled by
[esbuild](https://esbuild.github.io/) into a single classic script that Chrome
injects. The build also copies the static files so `dist/` is a complete,
loadable unpacked extension.

| Path            | Purpose                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| `manifest.json` | Extension manifest (Manifest V3).                                           |
| `background.js` | Service worker; injects `content.js` into the active tab on toolbar click.  |
| `src/`          | Overlay source modules (see below); `src/index.js` is the entry point.      |
| `build.js`      | esbuild bundler — `src/index.js` → `dist/content.js` + copies static files. |
| `dist/`         | Build output and the folder you load into Chrome (generated; git-ignored).  |
| `test/`         | jsdom integration test for the session/history state machine.               |
| `icon-*.png`    | Toolbar / store icons (16, 48, 128 px).                                     |

The `src/` modules: `index` (entry/guard) → `overlay` (toolbar, page events,
copy/exit, teardown) which pulls in `flags` (selection + popup), `panel` (flags
list), `history` (saved sessions), `sessions` (persistence), `badges`,
`markdown`, `clipboard`, `styles`, `icons`, `theme`, `utils`, and the shared
`state` object.

## Installing locally (unpacked)

```bash
npm install     # one-time: install esbuild + jsdom
npm run build   # produces dist/
```

Then:

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select the **`dist/`** folder.
4. Pin the **Flagger** icon to your toolbar.

## Using it

1. Navigate to the page you want to annotate.
2. Click the **Flagger** toolbar icon to activate the overlay.
3. Hover to highlight elements; click one to flag it and add a note.
4. Open the **Flags** panel to review, edit, or delete flags.
5. Click **Copy & Exit** — the Markdown brief is copied to your clipboard, the
   overlay closes, and the session is filed away in History.

> Run it again on the same page after closing; Flagger guards against being
> activated twice at once.

## Sessions & history

Flags are no longer lost when you close the overlay. Everything is saved to a
**session** as you work (via `chrome.storage.local`), so you can leave and come
back.

- **Auto-save** — every flag you add, edit, or delete is persisted immediately.
- **One open session at a time** — clicking the icon resumes the session you
  were building and re-pins this page's flags. A session can span multiple pages
  and sites; flags from other pages stay in the set (shown with a `↗ host` hint)
  but are only re-pinned on the page they belong to.
- **Copy ends a session** — **Copy & Exit** marks the session done and files it
  in History. The next time you open Flagger you start fresh.
- **Closing keeps it open** — closing the overlay (the ✕) or navigating away
  leaves the session open so you can keep going later. Nothing is discarded.
- **History menu** — the **History** button lists every saved session. Each row
  has a quick **Copy** (re-copy the brief without opening it) and clicking the
  row **reopens** the session and re-applies its flags to the current page.
- **New session** — start a clean slate without copying; the previous open
  session is kept in History as a draft.

## Development

```bash
npm run dev    # esbuild watch — rebuilds dist/ on every save
npm run build  # one-off production build
npm test       # builds, then runs the jsdom integration test
npm run format # Prettier
```

Typical loop:

1. Run `npm run dev` and leave it watching.
2. Edit modules in `src/` (UI/logic), or `background.js` / `manifest.json`.
   Changes to `manifest.json`, `background.js`, or the icons need a re-run of
   `npm run build` (the watcher only rebundles JS).
3. Go to `chrome://extensions` and click the **reload** icon on the Flagger card.
4. Reload the target page and re-test.

> Editing `content.js` directly does nothing — it's generated. Edit `src/`.

### Manifest V3

This extension uses **Manifest V3**. The background runs as a `service_worker`,
the toolbar entry point is `action`, and the overlay is injected with
`chrome.scripting.executeScript`. It requests `activeTab` + `scripting` (host
access is granted to the current tab at the moment you click the icon, so there
are no broad "read all your data on all websites" warnings) plus `storage` for
saving sessions locally.

## Roadmap ideas

- Configurable output format / templates.
- Rename sessions; group sessions into named cross-page "projects".
- A full-page history dashboard.
- Export to file (not just clipboard).
