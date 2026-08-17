import { cn } from "@/lib/cn";

interface SoonBadgeProps {
  className?: string;
}

/** Marks planned-but-not-yet-implemented capabilities. Never implies working. */
export function SoonBadge({ className }: SoonBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full border border-signal/30 bg-signal/10 px-2.5",
        "text-[10px] font-medium uppercase tracking-[0.14em] text-signal",
        className,
      )}
    >
      Soon
    </span>
  );
}
