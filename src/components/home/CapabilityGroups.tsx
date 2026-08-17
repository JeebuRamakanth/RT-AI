
import { motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { SoonBadge } from "@/components/ui/SoonBadge";
import { cn } from "@/lib/cn";
import { capabilityGroups, type CapabilityGroup } from "@/lib/navigation";

const easing = [0.16, 1, 0.3, 1] as const;

function GroupCard({ group, index }: { group: CapabilityGroup; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: easing, delay: index * 0.06 }}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-2xl)] rt-surface p-5 transition-colors duration-300 hover:border-ink-700/80"
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--signal)/0.14), transparent 70%)",
        }}
        aria-hidden
      />
      <header className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-ink-800/70 text-signal">
          <Icon name={group.icon} size={18} />
        </span>
        <h3 className="font-sans text-[15px] font-medium tracking-tight text-pearl">
          {group.title}
        </h3>
      </header>
      <p className="mb-4 text-[13px] text-pearl-muted">{group.caption}</p>
      <ul className="mt-auto space-y-0.5">
        {group.items.map((item) => (
          <li key={item.id}>
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2",
                "text-pearl-muted transition-colors hover:bg-ink-800/50 hover:text-pearl",
              )}
            >
              <Icon name={item.icon} size={16} className="text-pearl-faint" />
              <span className="text-[13.5px]">{item.label}</span>
              {item.status === "soon" && <SoonBadge className="ml-auto" />}
            </div>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

export function CapabilityGroups() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {capabilityGroups.map((g, i) => (
        <GroupCard key={g.id} group={g} index={i} />
      ))}
    </div>
  );
}
