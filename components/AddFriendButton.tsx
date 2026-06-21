"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendFriendRequest } from "@/app/actions/friends";

export default function AddFriendButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  async function handleAdd() {
    setSent(true);
    await sendFriendRequest(userId);
    router.refresh();
  }

  if (sent) {
    return <span className="text-xs text-ink-muted">Requested</span>;
  }

  return (
    <button onClick={handleAdd} className="btn-primary px-4 py-2 text-sm">
      Add friend
    </button>
  );
}
