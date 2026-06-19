type Props = {
  title: string;
  completed: boolean;
  onComplete: () => void;
};

export default function QuestCard({ title, completed, onComplete }: Props) {
  return (
    <div className="rounded-2xl border p-6 shadow-sm bg-white space-y-4">
      <div className="text-lg font-semibold">Today’s Quest</div>

      <div className="text-gray-700 text-base">{title}</div>

      {completed ? (
        <div className="text-green-600 font-medium">✓ Completed</div>
      ) : (
        <form action={onComplete}>
          <button className="w-full py-2 rounded-xl bg-black text-white hover:opacity-90 transition">
            Did it
          </button>
        </form>
      )}
    </div>
  );
}