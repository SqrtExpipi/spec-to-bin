import { formatMessage, type Locale, type MessageKey, type MessageParams } from "./messages";

const localeStorageKey = "spec-to-bin.locale";

export function detectInitialLocale(): Locale {
  const stored = localStorage.getItem(localeStorageKey);
  if (stored === "en" || stored === "ja") {
    return stored;
  }

  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(localeStorageKey, locale);
}

export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  return formatMessage(locale, key, params);
}

export type { Locale, MessageKey };
