/**
 * AssetSearch — vault search input. Search runs against the repository
 * (name, type, tags, source, metadata), not the rendered grid.
 */

import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";

interface AssetSearchProps {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  loading?: boolean;
  className?: string;
}

export function AssetSearch({ value, onChange, onClear, loading = false, className }: AssetSearchProps) {
  return (
    <div className={cn("rt-surface flex items-center gap-2 rounded-[var(--radius-xl)] px-3 py-2.5", className)}>
      <Icon name="search" size={17} className="shrink-0 text-pearl-faint" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search assets by name, type, tag, or source…"
        aria-label="Search assets"
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
