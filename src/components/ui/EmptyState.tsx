import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/icons/Icon";

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: IconName;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = "spark",
  title,
  message,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-2xl)] px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-800/60 text-pearl-faint">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="font-sans text-sm font-medium text-pearl">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] text-pretty text-pearl-muted">
        {message}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
