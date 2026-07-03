import { cn } from "@/lib/utils";

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
      {/* top-left facet (lightest) */}
      <polygon points="50,5 6,49 50,49" fill="#8FD8C2" />
      {/* top-right facet */}
      <polygon points="50,5 94,49 50,49" fill="#5BC5A7" />
      {/* bottom-left facet */}
      <polygon points="6,49 50,95 50,49" fill="#46AE93" />
      {/* bottom-right facet (dark slate) */}
      <polygon points="94,49 50,95 50,49" fill="#3D454B" />
      {/* subtle inner highlight */}
      <polygon points="50,5 6,49 50,49" fill="#ffffff" opacity="0.12" />
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
          Mysplitwise
        </span>
      )}
    </div>
  );
}
