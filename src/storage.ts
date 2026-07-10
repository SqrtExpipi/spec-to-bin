export function readLocalSetting(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeLocalSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preferences are optional and must not block offline or restricted-browser use.
  }
}
