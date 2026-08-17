
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useConversationLists } from "@/hooks/useConversationLists";
import { formatRelative } from "@/lib/time";

const easing = [0.16, 1, 0.3, 1] as const;

/**
 * Recent conversations surfaced on Home. Pulls from the repository so the list
 * reflects real persisted history (offline-capable). Falls back to an empty
 * state when nothing has been saved yet — no fabricated data is ever shown.
 */
export function RecentWork() {
  const { recent, loading } = useConversationLists();

  if (loading) {
    return <LoadingState label="Loading recent conversations" />;
  }

  if (recent.length === 0) {
    return (
      <EmptyState
        icon="clock"
        title="No recent conversations yet"
        message="Start a conversation above and it will appear here, ready to continue from exactly where you left off."
      />
    );
  }

  return (
    <ul className="grid gap-2.5">
      {recent.slice(0, 5).map((c, i) => (
        <motion.li
          key={c.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: easing, delay: i * 0.04 }}
        >
          <Link
            to={`/chat/${c.id}`}
            className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-ink-700/45 bg-ink-900/45 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-700/80 hover:bg-ink-800/60 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-ink-700/45 bg-ink-950/60 text-pearl-muted transition-colors group-hover:border-signal/40 group-hover:text-signal">
              <Icon name={c.pinned ? "pin" : "spark"} size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium tracking-tight text-pearl">
                  {c.title}
                </span>
                {c.titleAuto && (
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-pearl-faint">
                    auto
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-pearl-faint">
                {c.preview || "No messages yet"}
              </span>
            </span>
            <span className="shrink-0 text-[11.5px] tabular-nums text-pearl-faint">
              {formatRelative(c.lastMessageAt)}
            </span>
            <Icon
              name="chevron-right"
              size={14}
              className="shrink-0 text-pearl-faint transition-transform group-hover:translate-x-0.5 group-hover:text-signal"
            />
          </Link>
        </motion.li>
      ))}
      <li>
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 pt-1 text-[12.5px] font-medium text-pearl-muted transition-colors hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          View all conversations
          <Icon name="chevron-right" size={13} />
        </Link>
      </li>
    </ul>
  );
}
