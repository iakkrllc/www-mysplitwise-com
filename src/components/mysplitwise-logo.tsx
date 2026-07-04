import { cn } from "@/lib/utils";

/**
 * The mysplitwise mark: two overlapping circles — one person's share and
 * another's, meeting in the middle. Deliberately its own geometry (a single
 * rounded square + a Venn overlap), not a diamond/rhombus shape.
 */
export function MysplitwiseMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect x="10" y="10" width="80" height="80" rx="20" fill="#7C3AED" />
      <circle cx="38" cy="50" r="21" fill="#ffffff" />
      <circle cx="62" cy="50" r="21" fill="#ffffff" opacity="0.55" />
    </svg>
  );
}

export function MysplitwiseLogo({
  className,
  size = 28,
  wordmark = true,
}: {
  className?: string;
  size?: number;
  wordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <MysplitwiseMark size={size} />
      {wordmark && (
        <span
          className="font-extrabold tracking-tight text-sw-charcoal"
          style={{ fontSize: size * 0.82 }}
        >
          mysplitwise
        </span>
      )}
    </div>
  );
}
