export function safeNumber(value: unknown, fallback = 0, min = 0): number {
  const fallbackValue = Number.isFinite(fallback) ? Math.max(min, fallback) : min;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallbackValue;
  return value <= min ? fallbackValue : value;
}

export function safeRatio(value: unknown, fallback = 0): number {
  return safeNumber(value, fallback, 0);
}

export function safeText(value: unknown, fallback = "-"): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}
