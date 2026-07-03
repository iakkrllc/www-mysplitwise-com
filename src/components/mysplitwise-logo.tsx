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
      <rect
        x="14"
        y="22"
        width="58"
        height="58"
        rx="16"
        fill="#22A85A"
        transform="rotate(-10 43 51)"
      />
      <rect
        x="28"
        y="20"
        width="58"
        height="58"
        rx="16"
        fill="#7C3AED"
        opacity="0.94"
        transform="rotate(10 57 49)"
      />
      <path
        d="M40 38 L60 38 L48 50 L60 62 L40 62"
        fill="none"
        stroke="#ffffff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
