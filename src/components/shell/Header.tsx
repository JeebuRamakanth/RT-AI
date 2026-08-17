import { motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/cn";

interface HeaderProps {
  onOpenNav?: () => void;
  className?: string;
}

const USER = { name: "Ramakanth", initials: "R" };

export function Header({ onOpenNav, className }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full",
        className,
      )}
    >
      <div className="mx-auto flex h-[var(--header-h)] max-w-[var(--shell-max)] items-center gap-4 px-4 sm:px-6">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(to bottom, rgb(var(--ink-950)) 30%, rgb(var(--ink-950)/0))",
          }}
          aria-hidden
        />
        <button
          type="button"
          onClick={onOpenNav}
          className="mr-1 inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-pearl-muted hover:bg-ink-800/70 hover:text-pearl lg:hidden"
          aria-label="Open navigation"
        >
          <Icon name="menu" size={20} />
        </button>

        {/* Brand is injected by the layout via children slot from Brand */}
        <div className="flex-1 lg:flex-none">{/* spacer; brand rendered in layout */}</div>

        {/* Status / system context */}
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-700/50 bg-ink-900/60 px-3 py-1.5 text-[12px] text-pearl-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal/50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            System ready
          </span>

          <IconButton
            label={theme === "dark" ? "Switch to light" : "Switch to dark"}
            onClick={toggleTheme}
            className="text-pearl-muted"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </IconButton>

          {/* Profile */}
          <button
            type="button"
            className="group flex items-center gap-2.5 rounded-full border border-ink-700/50 bg-ink-900/60 py-1.5 pl-1.5 pr-3 transition-colors hover:bg-ink-800/70 focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={`${USER.name} — account`}
          >
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-signal/80 to-signal/40 text-[11px] font-semibold text-ink-950"
            >
              {USER.initials}
            </motion.span>
            <span className="text-[13px] font-medium text-pearl">{USER.name}</span>
          </button>
        </div>

        {/* Mobile: keep theme toggle + profile compact */}
        <div className="ml-auto flex items-center gap-1 sm:hidden">
          <IconButton label="Toggle theme" onClick={toggleTheme}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </IconButton>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-signal/80 to-signal/40 text-[11px] font-semibold text-ink-950">
            {USER.initials}
          </span>
        </div>
      </div>
    </header>
  );
}
