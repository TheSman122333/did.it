import { currentChallengeDate, previousChallengeDate } from "@/lib/challengeDate";

const WEEKS = 12;

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

export default function StreakCalendar({ completedDates }: { completedDates: string[] }) {
  const completed = new Set(completedDates);
  // walk challenge-date strings, not plain calendar dates, so a square lines up with the same day the streak uses
  const days: { date: string; done: boolean }[] = [];
  let cursor = currentChallengeDate();
  for (let i = 0; i < WEEKS * 7; i++) {
    days.unshift({ date: cursor, done: completed.has(cursor) });
    cursor = previousChallengeDate(cursor);
  }

  const columns = chunk(days, 7);

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {columns.map((column, i) => (
        <div key={i} className="flex flex-col gap-1">
          {column.map((day) => (
            <div
              key={day.date}
              title={day.date}
              className={`h-3 w-3 rounded-sm ${day.done ? "bg-sage" : "bg-stone-200"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
