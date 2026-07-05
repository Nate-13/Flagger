// Build the Markdown brief handed to the agent, from any list of flags.
import { STATE } from "./state.js";

export function buildMarkdownFrom(flags) {
  if (!flags || !flags.length) return "";
  return flags
    .map(function (c, i) {
      var lines = [
        "## Flag " + (i + 1),
        "- URL: " + c.url,
        "- Selector: `" + c.selector + "`",
        "- Element: `" + c.summary + "`" + (c.size ? " · " + c.size : ""),
      ];
      // Optional signal — only added when the element actually carries it, so a
      // plain flag stays short.
      if (c.component) lines.push("- Component: " + c.component);
      if (c.source) lines.push("- Source: " + c.source);
      if (c.attrs) lines.push("- Attributes: " + c.attrs);
      if (c.styles) lines.push("- Styles: " + c.styles);
      lines.push("");
      lines.push(
        c.text
          .split("\n")
          .map(function (l) {
            return "> " + l;
          })
          .join("\n"),
      );
      return lines.join("\n");
    })
    .join("\n\n");
}

export function buildMarkdown() {
  return buildMarkdownFrom(STATE.flags);
}
