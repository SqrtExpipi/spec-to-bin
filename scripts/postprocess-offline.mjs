import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(projectRoot, "dist-offline");
const indexPath = resolve(outputDir, "index.html");
const offlineHtmlPath = resolve(outputDir, "Spec-to-BIN-Offline.html");
const readmePath = resolve(outputDir, "README.txt");
const licensePath = resolve(outputDir, "LICENSE.txt");
let html = await readFile(indexPath, "utf8");

const scriptMatch = html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
const styleMatch = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);

if (!scriptMatch || !styleMatch) {
  throw new Error("Offline build assets were not found in index.html.");
}

const assetPath = (url) => resolve(outputDir, url.replace(/^\.\//, ""));
const [script, style] = await Promise.all([
  readFile(assetPath(scriptMatch[1]), "utf8"),
  readFile(assetPath(styleMatch[1]), "utf8")
]);

html = html
  .replace(
    scriptMatch[0],
    () => `<script type="module">${script.replaceAll("</script", "<\\/script")}</script>`
  )
  .replace(styleMatch[0], () => `<style>${style}</style>`)
  .replace(/\s*<link rel="modulepreload"[^>]*>/g, "")
  .replace(/\s*<link rel="manifest"[^>]*>/g, "")
  .replace(/\s*<link rel="icon"[^>]*>/g, "");

await writeFile(offlineHtmlPath, html, "utf8");
await writeFile(
  readmePath,
  [
    "Spec to BIN Offline",
    "",
    "Open Spec-to-BIN-Offline.html directly in a modern browser. No server or network connection is required.",
    "Spec-to-BIN-Offline.html をモダンブラウザで直接開いてください。サーバーやネットワーク接続は不要です。",
    ""
  ].join("\n"),
  "utf8"
);
await writeFile(licensePath, await readFile(resolve(projectRoot, "LICENSE"), "utf8"), "utf8");
await rm(indexPath, { force: true });
await rm(resolve(outputDir, "assets"), { recursive: true, force: true });
