const WEEKS = 12;

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

export default function StreakCalendar({ completedDates }: { completedDates: string[] }) {
  const completed = new Set(completedDates);
  const today = new Date();
  const days: { date: string; done: boolean }[] = [];

  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    days.push({ date: iso, done: completed.has(iso) });
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
