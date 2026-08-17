
import { motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";
import { quickActions } from "@/lib/navigation";

const easing = [0.16, 1, 0.3, 1] as const;

interface RTQuickActionsProps {
  onAction?: (id: string) => void;
}

export function RTQuickActions({ onAction }: RTQuickActionsProps) {
  return (
    <ul className="flex flex-wrap gap-2">
      {quickActions.map((a, i) => (
        <motion.li
          key={a.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easing, delay: 0.28 + i * 0.03 }}
        >
          <button
            type="button"
            onClick={() => onAction?.(a.id)}
            className={cn(
              "group inline-flex items-center gap-2.5 rounded-[var(--radius-xl)] px-3.5 py-2.5",
              "border border-ink-700/45 bg-ink-900/50 text-pearl-muted",
              "transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-700/80 hover:bg-ink-800/70 hover:text-pearl",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
            )}
            title={a.hint}
          >
            <Icon
              name={a.icon}
              size={16}
              className="text-pearl-faint transition-colors group-hover:text-signal"
            />
            <span className="text-[13px] font-medium tracking-tight">{a.label}</span>
          </button>
        </motion.li>
      ))}
    </ul>
  );
}
