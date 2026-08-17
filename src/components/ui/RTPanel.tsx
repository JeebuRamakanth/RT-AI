import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface RTPanelProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export function RTPanel({ className, raised, ...props }: RTPanelProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-2xl)]",
        raised ? "rt-surface-raised" : "rt-surface",
        className,
      )}
      {...props}
    />
  );
}
