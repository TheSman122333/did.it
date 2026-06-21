import Link from "next/link";
import Avatar from "@/components/Avatar";
import type { Profile } from "@/app/actions/friends";

export default function FriendPillList({ friends }: { friends: Profile[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-3">
      {friends.map((friend) => (
        <li key={friend.id}>
          <Link
            href={`/u/${friend.handle}`}
            className="flex items-center gap-2 rounded-full border border-ink-muted/15 bg-white py-1.5 pl-1.5 pr-3"
          >
            <Avatar url={friend.avatar_url} size={28} />
            <span className="text-sm font-medium text-ink">
              {friend.display_name || `@${friend.handle}`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
