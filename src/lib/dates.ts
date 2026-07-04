/** Format a Date's local Y/M/D components as YYYY-MM-DD (avoids UTC-shift bugs). */
export function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's date as YYYY-MM-DD, in the user's local timezone. */
export function todayISO(): string {
  return toISODateLocal(new Date());
}

/** Parse a bare "YYYY-MM-DD" date as local midnight instead of UTC midnight. */
export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

/** Advance a "YYYY-MM-DD" date by one period of a recurring frequency. */
export function advanceDate(
  dateStr: string,
  freq: "weekly" | "monthly" | "yearly",
): string {
  const d = parseLocalDate(dateStr);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return toISODateLocal(d);
}
