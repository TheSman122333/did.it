// flips at noon eastern not midnight, so read the date 12h in the past
const CHALLENGE_TIMEZONE = "America/New_York";
const ROLLOVER_OFFSET_MS = 12 * 60 * 60 * 1000;

const easternDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHALLENGE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function currentChallengeDate(): string {
  return easternDateFormatter.format(new Date(Date.now() - ROLLOVER_OFFSET_MS));
}

// plain string date math, no timezone involved once we already have the date
export function previousChallengeDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split("T")[0];
}
