import { readLocalSetting, writeLocalSetting } from "./storage";

export type ThemeMode = "system" | "light" | "dark";

const themeStorageKey = "spec-to-bin.theme";

export function detectInitialTheme(): ThemeMode {
  const stored = readLocalSetting(themeStorageKey);
  if (stored === "system" || stored === "light" || stored === "dark") {
    return stored;
  }

  return "system";
}

export function saveTheme(theme: ThemeMode): void {
  writeLocalSetting(themeStorageKey, theme);
}

export function applyTheme(theme: ThemeMode): void {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = theme;
}
