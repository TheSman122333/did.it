import { createClient } from "@/lib/supabase/server";
import { getTodaysChallenge, getMyCompletionForToday } from "@/app/actions/challenge";
import { getStreak } from "@/app/actions/completions";
import { getMyProfile } from "@/app/actions/profile";
import {
  getThisWeeksBingoCard,
  getMyBingoProgress,
  type BingoCard as BingoCardData,
  type BingoProgress,
} from "@/app/actions/bingo";
import CameraCapture from "@/components/CameraCapture";
import BingoCard from "@/components/BingoCard";
import { Check, Flame } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-ink-muted">Loading...</p>
      </main>
    );
  }

  const profile = await getMyProfile(user.id);
  if (profile.banned) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
        <p className="text-sm text-ink-muted">
          Your account has been suspended for reported content.
        </p>
      </main>
    );
  }

  const dailyChallenge = await getTodaysChallenge();

  // bingo is a side game -- if its fetch fails the main challenge still renders
  let bingoCard: BingoCardData | null = null;
  let bingoProgress: BingoProgress | null = null;
  try {
    bingoCard = await getThisWeeksBingoCard();
  } catch {
    bingoCard = null;
  }

  const [completion, streak, progress] = await Promise.all([
    getMyCompletionForToday(user.id, dailyChallenge.id),
    getStreak(user.id),
    bingoCard ? getMyBingoProgress(user.id, bingoCard.id) : Promise.resolve(null),
  ]);
  bingoProgress = progress;

  return (
    <main className="app-shell flex flex-col items-center">
      <div className="flex w-full items-center justify-end">
        <div className="flex items-center gap-1.5 rounded-lg bg-sun-soft px-3 py-1.5 text-sm font-medium text-sun">
          <Flame size={16} strokeWidth={1.75} />
          <span>{streak}</span>
        </div>
      </div>

      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-8 text-center">
        <span className="section-label">Today&rsquo;s Challenge</span>
        <h1 className="max-w-xs text-3xl font-bold text-ink">
          {dailyChallenge.challenge.prompt}
        </h1>

        {completion ? (
          <p className="flex items-center gap-1.5 text-lg font-medium text-sage-dark">
            <Check size={20} strokeWidth={2} />
            Done for today
          </p>
        ) : (
          <CameraCapture dailyChallengeId={dailyChallenge.id} />
        )}
      </div>

      {bingoCard && bingoProgress && (
        <div className="mt-4 w-full pb-8 flex justify-center">
          <BingoCard
            card={bingoCard}
            initialMarked={bingoProgress.markedPositions}
            initialCompleted={bingoProgress.completed}
          />
        </div>
      )}
    </main>
  );
}
