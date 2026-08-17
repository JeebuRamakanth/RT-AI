import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/icons/Icon";

interface RTSectionProps extends HTMLAttributes<HTMLElement> {
  title: string;
  caption?: string;
  icon?: IconName;
  action?: React.ReactNode;
}

export function RTSection({
  title,
  caption,
  icon,
  action,
  className,
  children,
  ...props
}: RTSectionProps) {
  return (
    <section className={cn("relative", className)} {...props}>
      <header className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-ink-800/60 text-signal">
              <Icon name={icon} size={18} />
            </span>
          )}
          <div>
            <h2 className="font-sans text-sm font-medium tracking-wide text-pearl uppercase">
              {title}
            </h2>
            {caption && (
              <p className="mt-0.5 text-[13px] text-pearl-muted">{caption}</p>
            )}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
