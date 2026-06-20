"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, User, Users } from "lucide-react";

const tabs = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/social", label: "Social", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center border-t border-ink-muted/15 bg-white">
      <div className="flex w-full max-w-sm justify-around py-3">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 text-xs font-medium ${
                active ? "text-sage-dark" : "text-ink-muted"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  active ? "bg-sage-soft" : ""
                }`}
              >
                <tab.icon size={20} strokeWidth={1.75} />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
