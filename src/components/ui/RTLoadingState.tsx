import { cn } from "@/lib/cn";

interface RTLoadingStateProps {
  label?: string;
  className?: string;
}

export function RTLoadingState({ label = "Working", className }: RTLoadingStateProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5 text-pearl-muted", className)}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-4 w-4">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal/40" />
        <span className="relative inline-flex h-4 w-4 rounded-full bg-signal/80" />
      </span>
      <span className="text-[13px] tracking-wide">{label}…</span>
    </span>
  );
}
