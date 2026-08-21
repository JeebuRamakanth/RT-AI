/**
 * AssetCard — a single vault card: preview, name, type, date, source and
 * favorite affordance. Actions stay contextual (favorite toggle + open);
 * richer actions live in the details experience.
 */

import { motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { AssetPreview } from "@/components/vault/AssetPreview";
import { TYPE_LABELS } from "@/components/vault/preview-utils";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/cn";
import type { Asset, AssetSource } from "@/assets/types";

const SOURCE_LABELS: Record<AssetSource, string> = {
  generated: "Generated",
  uploaded: "Uploaded",
  imported: "Imported",
  transformed: "Transformed",
  exported: "Exported",
};

interface AssetCardProps {
  asset: Asset;
  onOpen: (asset: Asset) => void;
  onToggleFavorite: (asset: Asset) => void;
}

export function AssetCard({ asset, onOpen, onToggleFavorite }: AssetCardProps) {
  const trashed = asset.deletedAt !== null;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open ${asset.name}`}
        onClick={() => onOpen(asset)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(asset);
          }
        }}
        className={cn(
          "group rt-surface relative flex cursor-pointer flex-col overflow-hidden rounded-[var(--radius-xl)]",
          "transition-colors hover:border-ink-700/80 focus-visible:outline-2 focus-visible:outline-offset-2",
          trashed && "opacity-70",
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <AssetPreview asset={asset} mode="thumb" />
          {!trashed && (
            <button
              type="button"
              aria-label={asset.favorite ? `Unfavorite ${asset.name}` : `Favorite ${asset.name}`}
              aria-pressed={asset.favorite}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(asset);
              }}
              className={cn(
                "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full",
                "bg-ink-950/60 backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                asset.favorite ? "text-signal" : "text-pearl-faint hover:text-pearl",
              )}
            >
              <Icon name={asset.favorite ? "star-filled" : "star"} size={14} />
            </button>
          )}
          {trashed && (
            <span className="absolute left-2 top-2 rounded-full bg-ink-950/70 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-alert backdrop-blur-sm">
              Trash
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1 px-3 py-2.5">
          <span className="truncate text-[13px] font-medium text-pearl" title={asset.name}>
            {asset.name}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-pearl-faint">
            <span className="uppercase tracking-wide">{TYPE_LABELS[asset.type]}</span>
            <span aria-hidden>·</span>
            <span>{SOURCE_LABELS[asset.source]}</span>
            <span aria-hidden>·</span>
            <span>{formatRelativeTime(asset.createdAt)}</span>
          </span>
        </div>
      </div>
    </motion.li>
  );
}
