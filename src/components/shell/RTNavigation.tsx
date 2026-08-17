"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";
import { primaryNav } from "@/lib/navigation";

/**
 * Desktop rail navigation. Lists every future module so the shell is
 * ready for growth. "soon" modules are reachable but clearly marked.
 */
export function RTNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex h-full flex-col">
      <ul className="flex flex-col gap-0.5">
        {primaryNav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5",
                  "transition-colors duration-200",
                  "focus-visible:outline-2 focus-visible:outline-offset-2",
                  isActive
                    ? "bg-ink-800/80 text-pearl"
                    : "text-pearl-muted hover:bg-ink-800/50 hover:text-pearl",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-signal"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon
                  name={item.icon}
                  size={18}
                  className={cn(
                    "shrink-0",
                    isActive ? "text-signal" : "text-pearl-faint group-hover:text-pearl-muted",
                  )}
                />
                <span className="text-[13.5px] font-medium tracking-tight">
                  {item.label}
                </span>
                {item.status === "soon" && (
                  <span className="ml-auto text-[9px] font-medium uppercase tracking-[0.14em] text-pearl-faint">
                    Soon
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Compact navigation for mobile. A slide-down panel triggered from the header.
 */
export function RTMobileNavigation({ open }: { open: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.nav
          aria-label="Primary mobile"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-3 top-[calc(var(--header-h)+12px)] z-40 rt-surface-raised rounded-[var(--radius-2xl)] p-3"
        >
          <ul className="grid grid-cols-2 gap-0.5">
            {primaryNav.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-pearl-muted hover:bg-ink-800/60 hover:text-pearl"
                >
                  <Icon name={item.icon} size={17} className="text-pearl-faint" />
                  <span className="text-[13px] font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

export function useMobileNav() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
