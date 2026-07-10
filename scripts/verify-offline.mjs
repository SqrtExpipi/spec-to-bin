import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(resolve(projectRoot, "dist-offline", "index.html"), "utf8");
const document = new JSDOM(html).window.document;
const externalAssets = document.querySelectorAll(
  'script[src], link[rel="stylesheet"], link[rel="modulepreload"], link[rel="manifest"]'
);
const moduleScripts = document.querySelectorAll('script[type="module"]');

if (externalAssets.length > 0) {
  throw new Error(`Offline HTML still references ${externalAssets.length} external assets.`);
}

if (moduleScripts.length !== 1 || !moduleScripts[0].textContent?.trim()) {
  throw new Error("Offline HTML does not contain one embedded application script.");
}

if (!document.querySelector("style")?.textContent?.trim()) {
  throw new Error("Offline HTML does not contain embedded styles.");
}

console.log("Verified self-contained offline HTML.");
