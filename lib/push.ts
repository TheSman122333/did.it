import webpush, { WebPushError } from "web-push";
import { createClient } from "@/lib/supabase/server";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type FriendSubscription = { user_id: string; endpoint: string; p256dh: string; auth: string };

// only returns subs for friends of the caller, never needs the service-role key
export async function notifyUsers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetUserIds: string[],
  payload: PushPayload
) {
  if (targetUserIds.length === 0) return;
  if (!process.env.VAPID_PRIVATE_KEY) return; // push not configured yet

  ensureConfigured();

  const { data: subs } = await supabase.rpc("get_friend_push_subscriptions", {
    target_ids: targetUserIds,
  });

  await Promise.all(
    ((subs ?? []) as FriendSubscription[]).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        // dead subscription (uninstalled, revoked, expired) -- drop it
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    })
  );
}
