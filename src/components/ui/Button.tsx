import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-signal text-ink-950 hover:brightness-110 shadow-[0_0_30px_-10px_rgb(var(--signal-glow)/0.6)] font-medium",
  secondary:
    "rt-surface text-pearl hover:border-ink-700/80 hover:bg-ink-800/80",
  ghost:
    "text-pearl-muted hover:text-pearl hover:bg-ink-800/60 border border-transparent",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-[var(--radius-md)]",
  md: "h-11 px-5 text-sm rounded-[var(--radius-xl)]",
  lg: "h-13 px-7 text-[15px] rounded-[var(--radius-xl)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = "secondary", size = "md", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out",
          "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
