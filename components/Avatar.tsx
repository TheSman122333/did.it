import Image from "next/image";
import { User } from "lucide-react";

export default function Avatar({ url, size = 40 }: { url: string | null; size?: number }) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-sky-soft text-sky"
      style={{ width: size, height: size }}
    >
      <User size={Math.round(size * 0.55)} strokeWidth={1.75} />
    </div>
  );
}
