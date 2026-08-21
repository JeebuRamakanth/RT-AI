/**
 * AssetPreview — honest preview rendering.
 *
 *  - Images render their real stored bytes.
 *  - Video/audio render native players in "full" mode.
 *  - Everything else renders a premium file-type card.
 *
 * Nothing is ever faked: if bytes are missing locally, the UI says so
 * instead of showing a placeholder image.
 */

import { Icon } from "@/components/icons/Icon";
import { TYPE_ICONS, TYPE_LABELS, useAssetObjectUrl } from "@/components/vault/preview-utils";
import { hasBytes, type Asset } from "@/assets/types";
import { cn } from "@/lib/cn";

interface AssetPreviewProps {
  asset: Asset;
  /** "thumb" for grid cards (no media controls), "full" for details. */
  mode: "thumb" | "full";
  className?: string;
}

export function AssetPreview({ asset, mode, className }: AssetPreviewProps) {
  const url = useAssetObjectUrl(asset);

  if (asset.type === "image" && url) {
    return (
      <img
        src={url}
        alt={asset.name}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  if (mode === "full" && asset.type === "video" && url) {
    return (
      <video src={url} controls preload="metadata" className={cn("max-h-full w-full", className)} />
    );
  }

  if (mode === "full" && asset.type === "audio" && url) {
    return (
      <div className={cn("flex w-full flex-col items-center gap-4", className)}>
        <TypeBadge asset={asset} size={34} />
        <audio src={url} controls preload="metadata" className="w-full" />
      </div>
    );
  }

  return <TypeBadge asset={asset} className={className} />;
}

function TypeBadge({
  asset,
  size = 26,
  className,
}: {
  asset: Asset;
  size?: number;
  className?: string;
}) {
  const missing = !hasBytes(asset);
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-ink-900/60 text-pearl-faint",
        className,
      )}
    >
      <Icon name={TYPE_ICONS[asset.type]} size={size} className={missing ? "opacity-40" : "text-pearl-muted"} />
      <span className="text-[10px] font-medium uppercase tracking-[0.16em]">
        {TYPE_LABELS[asset.type]}
      </span>
      {missing && (
        <span className="px-3 text-center text-[10.5px] leading-snug text-pearl-faint">
          File not available locally
        </span>
      )}
    </div>
  );
}
