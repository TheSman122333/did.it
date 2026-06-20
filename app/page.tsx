import { createClient } from "@/lib/supabase/server";
import { getTodaysChallenge, getMyCompletionForToday } from "@/app/actions/challenge";
import { getStreak } from "@/app/actions/completions";
import CameraCapture from "@/components/CameraCapture";
import AuthButton from "@/components/AuthButton";
import AnonBootstrap from "@/components/AnonBootstrap";
import { Check, Flame } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AnonBootstrap />;
  }

  const dailyChallenge = await getTodaysChallenge();
  const [completion, streak] = await Promise.all([
    getMyCompletionForToday(user.id, dailyChallenge.id),
    getStreak(user.id),
  ]);

  return (
    <main className="app-shell flex flex-col items-center justify-between">
      <div className="flex w-full items-center justify-between">
        <AuthButton isAnonymous={user.is_anonymous ?? false} />
        <div className="flex items-center gap-1.5 rounded-lg bg-sun-soft px-3 py-1.5 text-sm font-medium text-sun">
          <Flame size={16} strokeWidth={1.75} />
          <span>{streak}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <span className="section-label">Today&rsquo;s Dare</span>
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
    </main>
  );
}
