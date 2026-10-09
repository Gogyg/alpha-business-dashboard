export function withDashboardDefaults<T extends Record<string, any>>(data: Partial<T> | null | undefined, defaults: T): T {
  // A quarter may be created by saving only livingDashboardFocus. Fill missing
  // fields without overwriting persisted values, empty lists, or extra settings.
  const result = { ...data } as Record<string, any>;
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = data?.[key];
    result[key] = value ?? fallback;
    if ((key === 'enpsData' || key === 'visibilityData') && value && typeof value === 'object') {
      result[key] = { ...fallback, ...value };
    }
  }
  return result as T;
}
