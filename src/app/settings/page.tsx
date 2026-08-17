"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme";
import { Icon } from "@/components/icons/Icon";
import { RTPanel } from "@/components/ui/RTPanel";
import { cn } from "@/lib/cn";

const easing = [0.16, 1, 0.3, 1] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-2xl space-y-8 pt-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easing }}
      >
        <h1 className="font-display text-4xl tracking-tight text-pearl">Settings</h1>
        <p className="mt-2 text-[14px] text-pearl-muted">
          Personal preferences for your private RT AI workspace.
        </p>
      </motion.div>

      <RTPanel className="p-5">
        <h2 className="text-sm font-medium tracking-wide text-pearl uppercase">
          Appearance
        </h2>
        <p className="mt-1 text-[13px] text-pearl-muted">
          Choose how RT AI looks. Both themes stay coherent.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-xl)] border p-3 text-left transition-all",
                theme === t
                  ? "border-signal/60 bg-signal/5 shadow-glow"
                  : "border-ink-700/50 bg-ink-900/40 hover:border-ink-700/80",
              )}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
                style={{
                  background:
                    t === "dark" ? "rgb(13 16 24)" : "rgb(248 249 252)",
                  color: t === "dark" ? "rgb(214 196 168)" : "rgb(156 126 64)",
                }}
              >
                <Icon name={t === "dark" ? "moon" : "sun"} size={18} />
              </span>
              <span>
                <span className="block text-[14px] font-medium capitalize text-pearl">
                  {t}
                </span>
                <span className="block text-[12px] text-pearl-faint">
                  {t === "dark" ? "Default" : "Light"}
                </span>
              </span>
            </button>
          ))}
        </div>
      </RTPanel>

      <RTPanel className="p-5">
        <h2 className="text-sm font-medium tracking-wide text-pearl uppercase">
          Privacy
        </h2>
        <p className="mt-1 text-[13px] text-pearl-muted">
          RT AI is private to Ramakanth and his wife. There is no public
          signup, no subscription, and no public-user marketing.
        </p>
      </RTPanel>
    </div>
  );
}
