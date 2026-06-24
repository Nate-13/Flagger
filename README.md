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

| File             | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `manifest.json`  | Extension manifest (currently Manifest V2).                             |
| `background.js`  | Background script; injects `bookmarklet.js` when the toolbar icon is clicked. |
| `bookmarklet.js` | The full overlay UI and flagging logic (injected into the active tab).  |
| `icon-*.png`     | Toolbar / store icons (16, 48, 128 px).                                 |

## Installing locally (unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select this project folder.
4. Pin the **Flagger** icon to your toolbar.

## Using it

1. Navigate to the page you want to annotate.
2. Click the **Flagger** toolbar icon to activate the overlay.
3. Hover to highlight elements; click one to flag it and add a note.
4. Open the **Flags** panel to review, edit, or delete flags.
5. Click **Copy** — the Markdown brief is copied to your clipboard and the
   overlay closes.

> Run it again on the same page after closing; Flagger guards against being
> activated twice at once.

## Development

There is no build step — the extension runs the source files directly. To work
on it:

1. Edit `bookmarklet.js` (UI/logic), `background.js` (injection), or
   `manifest.json` (metadata/permissions).
2. Go to `chrome://extensions` and click the **reload** icon on the Flagger card.
3. Reload the target page and re-test.

### Known limitation: Manifest V2

This extension currently uses **Manifest V2**, which Chrome is phasing out in
favor of Manifest V3 (`service_worker` background, `action` instead of
`browser_action`, etc.). A migration to MV3 is the most likely first piece of
future work if you want it to keep running in current Chrome.

## Roadmap ideas

- Migrate to Manifest V3.
- Configurable output format / templates.
- Persist flags across reloads.
- Export to file (not just clipboard).
