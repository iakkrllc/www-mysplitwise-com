import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  user,
  size = 36,
  className,
  ring = false,
}: {
  user: Pick<User, "name" | "avatarColor">;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-bold text-white select-none",
        ring && "ring-2 ring-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: user.avatarColor,
        fontSize: size * 0.4,
      }}
      title={user.name}
    >
      {initials(user.name)}
    </div>
  );
}

export function AvatarStack({
  users,
  size = 26,
  max = 4,
}: {
  users: Pick<User, "name" | "avatarColor">[];
  size?: number;
  max?: number;
}) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <div
          key={i}
          style={{ marginLeft: i === 0 ? 0 : -size * 0.32, zIndex: 10 - i }}
        >
          <UserAvatar user={u} size={size} ring />
        </div>
      ))}
      {extra > 0 && (
        <div
          className="relative inline-flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-white"
          style={{
            width: size,
            height: size,
            marginLeft: -size * 0.32,
            fontSize: size * 0.36,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
