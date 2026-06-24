// Build the Markdown brief handed to the agent, from any list of flags.
import { STATE } from "./state.js";

export function buildMarkdownFrom(flags) {
  if (!flags || !flags.length) return "";
  return flags
    .map(function (c, i) {
      return [
        "## Flag " + (i + 1),
        "- URL: " + c.url,
        "- Selector: `" + c.selector + "`",
        "- Element: `" + c.summary + "`",
        "- Position: " + c.x + ", " + c.y,
        "",
        c.text
          .split("\n")
          .map(function (l) {
            return "> " + l;
          })
          .join("\n"),
      ].join("\n");
    })
    .join("\n\n");
}

export function buildMarkdown() {
  return buildMarkdownFrom(STATE.flags);
}
