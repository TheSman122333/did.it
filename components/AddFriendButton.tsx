"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendFriendRequest } from "@/app/actions/friends";

export default function AddFriendButton({
  userId,
  initialSent = false,
}: {
  userId: string;
  initialSent?: boolean;
}) {
  const router = useRouter();
  const [sent, setSent] = useState(initialSent);

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
