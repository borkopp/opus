/** Only submit fields the user actually changed; never reset hidden settings. */
export function changedSettings<T extends object>(
  draft: T,
  saved: T,
): Partial<T> {
  const changes: Partial<T> = {};
  for (const key of Object.keys(draft) as Array<keyof T>) {
    if (JSON.stringify(draft[key]) !== JSON.stringify(saved[key])) {
      changes[key] = draft[key];
    }
  }
  return changes;
}

export function refreshSettingsDraft<T extends object>(
  draft: T,
  saved: T,
  incoming: T,
): T {
  return { ...incoming, ...changedSettings(draft, saved) };
}

/** Match server text normalization so a successful save leaves the form clean. */
export function trimSettingsText<T extends object>(values: T): T {
  const trimmed = { ...values };
  for (const key of Object.keys(values) as Array<keyof T>) {
    const value = values[key];
    if (typeof value === "string") trimmed[key] = value.trim() as T[typeof key];
  }
  return trimmed;
}
