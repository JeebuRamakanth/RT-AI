import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface RTIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

export const RTIconButton = forwardRef<HTMLButtonElement, RTIconButtonProps>(
  function RTIconButton({ className, label, active, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={active}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]",
          "text-pearl-muted transition-all duration-200 ease-out",
          "hover:text-pearl hover:bg-ink-800/70 active:scale-95",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          active && "text-pearl bg-ink-800/80",
          className,
        )}
        {...props}
      />
    );
  },
);
