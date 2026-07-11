import { createClient } from "@/lib/supabase/server";
import { getMyGroups } from "@/app/actions/groups";
import GroupsTab from "@/components/GroupsTab";

export default async function GroupsPage() {
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

  const groups = await getMyGroups();

  return <GroupsTab groups={groups} />;
}
