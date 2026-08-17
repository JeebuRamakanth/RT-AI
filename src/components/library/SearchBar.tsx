/**
 * SearchBar — the conversation library search input. Polished, keyboard
 * friendly, with a clear affordance and a loading state. Search uses the
 * repository (not the rendered UI list), so it finds any persisted
 * conversation/message.
 */

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  loading?: boolean;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  loading = false,
  autoFocus = false,
  className,
  placeholder = "Search conversations and messages…",
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className={cn("rt-surface flex items-center gap-2 rounded-[var(--radius-xl)] px-3 py-2.5", className)}>
      <Icon name="search" size={17} className="shrink-0 text-pearl-faint" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search conversations"
        className="flex-1 bg-transparent text-[14px] text-pearl placeholder:text-pearl-faint focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onClear();
          }
        }}
      />
      {loading ? (
        <span className="relative flex h-4 w-4 shrink-0" aria-label="Searching" role="status">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal/40" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-signal/80" />
        </span>
      ) : value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-pearl-faint hover:bg-ink-800/70 hover:text-pearl"
        >
          <Icon name="close" size={15} />
        </button>
      ) : null}
    </div>
  );
}
