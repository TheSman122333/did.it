import { createClient } from "@/lib/supabase/server";
import { ensureTodayQuest, completeQuest } from "@/app/actions/quests";
import { getWorldState } from "@/lib/worldState";
import { revalidatePath } from "next/cache";
import SocialPanel from "@/components/SocialPanel";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div className="scene">Not logged in</div>;

  // TEMP
  const streak = 7;

  const world = getWorldState(streak);
  const quest = await ensureTodayQuest(user.id);

  async function complete() {
    "use server";
    await completeQuest(quest.id);
    revalidatePath("/dashboard");
  }

  return (
    <main className={`scene sky-${world.sky}`}>

      {/* SKY */}
      <div className="sky" />

      {/* CLOUDS */}
      <div className="cloud-layer">
        {Array.from({ length: 14 }).map((_, i) => (
          <img
            key={i}
            src="/clouds.png"
            className="cloud"
            style={{
              top: `${Math.random() * 60}%`,
              left: `${Math.random() * 100}%`,
              width: `${140 + Math.random() * 260}px`,
              opacity: 0.2 + Math.random() * 0.5,
              animationDuration: `${40 + Math.random() * 60}s`,
              animationDelay: `${-Math.random() * 60}s`,
            }}
          />
        ))}
      </div>

      {/* GROUND */}
      <div className="ground">
        <div className="grass" style={{ opacity: world.grassIntensity }} />

        <div className="dirt">
          {["🌱", "🪨", "🪱", "🍄", "🪙", "🪵"].map((e, i) => (
            <span
              key={i}
              className="hidden"
              style={{
                left: `${10 + i * 15}%`,
                top: `${20 + Math.random() * 65}%`,
                opacity: world.objectDensity,
              }}
            >
              {e}
            </span>
          ))}
        </div>
      </div>

      {/* SOCIAL (CLIENT COMPONENT) */}
      <SocialPanel />

      {/* STREAK */}
      <div className="top-right">
        <div className="streak">
          <span className="flame">🔥</span>
          <span className="streak-num">{streak}</span>
        </div>
      </div>

      {/* UI */}
      <div className="ui">
        <div className="title">TODAY’S QUEST</div>

        <div className="quest">{quest.quest.title}</div>

        {quest.completed ? (
          <div className="done">DONE ✓</div>
        ) : (
          <form action={complete}>
            <button className="btn">DID IT</button>
          </form>
        )}
      </div>

    </main>
  );
}