import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/app/actions/profile";
import ProfileTab from "@/components/ProfileTab";

export default async function ProfilePage() {
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

  return <ProfileTab profile={profile} isAnonymous={user.is_anonymous ?? false} />;
}
