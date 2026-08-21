/**
 * AssetFilters — view tabs (All / Favorites / Archived / Trash), type and
 * source chip filters, collection picker, and sort control. Filter state
 * is owned by useAssetVault; this component is presentational.
 */

import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";
import type { AssetCollection, AssetCounts, AssetSort, AssetSource, AssetType } from "@/assets/types";
import type { VaultFilters, VaultView } from "@/hooks/useAssetVault";

const VIEWS: Array<{ id: VaultView; label: string; icon: "image" | "star" | "archive" | "trash"; countKey: keyof AssetCounts }> = [
  { id: "all", label: "All", icon: "image", countKey: "active" },
  { id: "favorites", label: "Favorites", icon: "star", countKey: "favorites" },
  { id: "archived", label: "Archived", icon: "archive", countKey: "archived" },
  { id: "trash", label: "Trash", icon: "trash", countKey: "trash" },
];

const TYPE_FILTERS: Array<{ id: AssetType | "all"; label: string }> = [
  { id: "all", label: "All types" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "audio", label: "Audio" },
  { id: "document", label: "Documents" },
  { id: "pdf", label: "PDFs" },
  { id: "presentation", label: "Presentations" },
  { id: "spreadsheet", label: "Spreadsheets" },
  { id: "code", label: "Code" },
  { id: "other", label: "Other" },
];

const SOURCE_FILTERS: Array<{ id: AssetSource | "all"; label: string }> = [
  { id: "all", label: "Any source" },
  { id: "generated", label: "Generated" },
  { id: "uploaded", label: "Uploaded" },
  { id: "imported", label: "Imported" },
  { id: "transformed", label: "Transformed" },
  { id: "exported", label: "Exported" },
];

const SORTS: Array<{ id: AssetSort; label: string }> = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "name", label: "Name" },
  { id: "size", label: "Size" },
  { id: "updated", label: "Recently updated" },
];

interface AssetFiltersProps {
  filters: VaultFilters;
  counts: AssetCounts | null;
  collections: AssetCollection[];
  onChange: (patch: Partial<VaultFilters>) => void;
}

export function AssetFilters({ filters, counts, collections, onChange }: AssetFiltersProps) {
  return (
    <div className="space-y-3">
      <nav aria-label="Vault views" className="flex items-center gap-1 overflow-x-auto">
        {VIEWS.map((v) => {
          const active = filters.view === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange({ view: v.id })}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2 text-[13px] font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2",
                active ? "bg-ink-800/80 text-pearl" : "text-pearl-muted hover:bg-ink-800/50 hover:text-pearl",
              )}
            >
              <Icon name={v.icon} size={15} className={active ? "text-signal" : "text-pearl-faint"} />
              {v.label}
              <span className="text-[11px] text-pearl-faint">{counts ? counts[v.countKey] : "—"}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Type filters">
        {TYPE_FILTERS.map((t) => {
          const active = filters.type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ type: t.id })}
              aria-pressed={active}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2",
                active
                  ? "bg-signal/15 text-signal"
                  : "text-pearl-muted hover:bg-ink-800/60 hover:text-pearl",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="vault-source-filter">Source</label>
        <select
          id="vault-source-filter"
          value={filters.source}
          onChange={(e) => onChange({ source: e.target.value as AssetSource | "all" })}
          className="rt-surface rounded-[var(--radius-md)] px-2.5 py-1.5 text-[12.5px] text-pearl-muted focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {SOURCE_FILTERS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        {collections.length > 0 && (
          <>
            <label className="sr-only" htmlFor="vault-collection-filter">Collection</label>
            <select
              id="vault-collection-filter"
              value={filters.collectionId ?? ""}
              onChange={(e) => onChange({ collectionId: e.target.value || null })}
              className="rt-surface rounded-[var(--radius-md)] px-2.5 py-1.5 text-[12.5px] text-pearl-muted focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <option value="">All collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </>
        )}

        <label className="sr-only" htmlFor="vault-sort">Sort</label>
        <select
          id="vault-sort"
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value as AssetSort })}
          className="rt-surface rounded-[var(--radius-md)] px-2.5 py-1.5 text-[12.5px] text-pearl-muted focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
