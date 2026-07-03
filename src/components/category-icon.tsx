import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function CategoryIcon({
  categoryId,
  size = 40,
  className,
}: {
  categoryId: string;
  size?: number;
  className?: string;
}) {
  const cat = getCategory(categoryId);
  const Icon = cat.icon;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `${cat.color}1f`,
        color: cat.color,
      }}
      title={cat.name}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2} />
    </div>
  );
}
