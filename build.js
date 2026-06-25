// Bundles src/ into a single classic script (dist/content.js) that Chrome
// injects via chrome.scripting.executeScript, and copies the static extension
// files alongside it so dist/ is a complete, loadable unpacked extension.
import * as esbuild from "esbuild";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const watch = process.argv.includes("--watch");
const OUT = "dist";
const STATICS = [
  "manifest.json",
  "background.js",
  "enable-follow.html",
  "enable-follow.js",
  "icon-16.png",
  "icon-48.png",
  "icon-128.png",
];

function copyStatics() {
  mkdirSync(OUT, { recursive: true });
  for (const f of STATICS) copyFileSync(f, join(OUT, f));
}

const options = {
  entryPoints: ["src/index.js"],
  bundle: true,
  outfile: join(OUT, "content.js"),
  // The overlay is injected as a classic content script (not an ES module),
  // so emit a self-contained IIFE.
  format: "iife",
  target: ["chrome110"],
  legalComments: "none",
};

copyStatics();
if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("flagger: watching src/ … (Ctrl+C to stop)");
} else {
  await esbuild.build(options);
  console.log("flagger: built " + join(OUT, "content.js"));
}
