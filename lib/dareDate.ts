// The daily dare flips over at noon America/New_York, not at midnight, so
// everyone in the US sees the new dare around lunchtime instead of overnight.
// Implemented by reading the Eastern calendar date 12 hours in the past --
// that mapping changes exactly when the real Eastern clock crosses noon.
const DARE_TIMEZONE = "America/New_York";
const ROLLOVER_OFFSET_MS = 12 * 60 * 60 * 1000;

const easternDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DARE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function currentDareDate(): string {
  return easternDateFormatter.format(new Date(Date.now() - ROLLOVER_OFFSET_MS));
}

// Pure calendar-day arithmetic on a "YYYY-MM-DD" dare-date string -- once we
// have today's dare-date, walking backward a day is timezone-agnostic.
export function previousDareDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split("T")[0];
}
