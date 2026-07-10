"use client";

import { useState } from "react";
import { Camera, PartyPopper, X } from "lucide-react";
import {
  submitBingoSquare,
  type BingoCard as BingoCardData,
  type BingoSquare,
} from "@/app/actions/bingo";

export default function BingoCard({
  card,
  initialMarked,
  initialCompleted,
}: {
  card: BingoCardData;
  initialMarked: number[];
  initialCompleted: boolean;
}) {
  const [marked, setMarked] = useState<Set<number>>(new Set(initialMarked));
  const [won, setWon] = useState(initialCompleted);
  const [activeSquare, setActiveSquare] = useState<BingoSquare | null>(null);

  function handleClaimed(position: number, hasBingo: boolean) {
    setMarked((prev) => new Set(prev).add(position));
    if (hasBingo) setWon(true);
    setActiveSquare(null);
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
              onClick={() => !isMarked && setActiveSquare(square)}
              disabled={isMarked}
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
        Snap a photo to claim a square. Row, column, or diagonal wins. Fresh card every Monday.
      </p>

      {activeSquare && (
        <BingoSquareModal
          cardId={card.id}
          square={activeSquare}
          onClaimed={handleClaimed}
          onClose={() => setActiveSquare(null)}
        />
      )}
    </div>
  );
}

function BingoSquareModal({
  cardId,
  square,
  onClaimed,
  onClose,
}: {
  cardId: string;
  square: BingoSquare;
  onClaimed: (position: number, hasBingo: boolean) => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setError(null);
  }

  function retake() {
    setFile(null);
    setPreviewUrl(null);
  }

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("bingoCardId", cardId);
      formData.set("position", String(square.position));
      formData.set("photo", file);
      const { won } = await submitBingoSquare(formData);
      onClaimed(square.position, won);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-6">
      <div className="w-full max-w-sm rounded-3xl border border-ink-muted/15 bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold text-ink">{square.prompt}</h1>
          <button onClick={onClose} aria-label="Close">
            <X size={22} strokeWidth={1.75} className="text-ink-muted" />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          {!previewUrl ? (
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-sage text-white active:scale-95">
              <Camera size={26} strokeWidth={1.75} />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <>
              <img
                src={previewUrl}
                alt="Your proof"
                className="aspect-square w-full rounded-2xl object-cover"
              />
              <div className="flex w-full gap-3">
                <button onClick={retake} disabled={submitting} className="btn-secondary flex-1 py-3">
                  Retake
                </button>
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 py-3">
                  {submitting ? "Submitting..." : "Did it"}
                </button>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
