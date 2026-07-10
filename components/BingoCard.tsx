"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { toggleBingoSquare, type BingoCard as BingoCardData } from "@/app/actions/bingo";

export default function BingoCard({
  card,
  initialMarked,
  initialCompleted,
}: {
  card: BingoCardData;
  initialMarked: number[];
  initialCompleted: boolean;
}) {
  const router = useRouter();
  const [marked, setMarked] = useState<Set<number>>(new Set(initialMarked));
  const [won, setWon] = useState(initialCompleted);
  const [pending, setPending] = useState<number | null>(null);

  async function handleToggle(position: number) {
    if (pending !== null) return;
    setPending(position);

    const next = new Set(marked);
    if (next.has(position)) {
      next.delete(position);
    } else {
      next.add(position);
    }
    setMarked(next);

    try {
      const hasBingo = await toggleBingoSquare(card.id, position);
      if (hasBingo && !won) {
        setWon(true);
        router.refresh();
      }
    } catch {
      setMarked(marked); // server rejected it, roll the square back
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <h2 className="section-label">This Week&rsquo;s Bingo</h2>
        {won && (
          <span className="flex items-center gap-1 rounded-lg bg-sun-soft px-2 py-0.5 text-xs font-medium text-sun">
            <PartyPopper size={12} strokeWidth={1.75} />
            Bingo!
          </span>
        )}
      </div>
      <div className="grid w-full grid-cols-5 gap-1.5">
        {card.squares.map((square) => {
          const isMarked = marked.has(square.position);
          return (
            <button
              key={square.position}
              onClick={() => handleToggle(square.position)}
              disabled={pending !== null}
              title={square.prompt}
              className={`aspect-square overflow-hidden rounded-lg border p-1 text-center transition ${
                isMarked
                  ? "border-sage bg-sage text-white"
                  : "border-ink-muted/20 bg-white text-ink"
              }`}
            >
              <span className="line-clamp-4 text-[9px] font-medium leading-tight">
                {square.prompt}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink-muted">
        Row, column, or diagonal wins. Fresh card every Monday.
      </p>
    </div>
  );
}
