/**
 * Preview support utilities — type icon/label registries and the object-URL
 * hook, kept separate from AssetPreview.tsx so the component file exports
 * only components (fast-refresh friendly).
 */

import { useEffect, useState } from "react";
import { useAssetStore } from "@/assets/store";
import { hasBytes, type Asset, type AssetType } from "@/assets/types";
import type { IconName } from "@/components/icons/Icon";

export const TYPE_ICONS: Record<AssetType, IconName> = {
  image: "image",
  video: "film",
  audio: "mic",
  document: "file",
  pdf: "file",
  presentation: "layers",
  spreadsheet: "layers",
  code: "code",
  other: "attach",
};

export const TYPE_LABELS: Record<AssetType, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  document: "Document",
  pdf: "PDF",
  presentation: "Presentation",
  spreadsheet: "Spreadsheet",
  code: "Code",
  other: "File",
};

/** Resolve an object URL for the asset's stored bytes (null when unavailable). */
export function useAssetObjectUrl(asset: Asset | null): string | null {
  const { storage } = useAssetStore();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!asset || !hasBytes(asset) || !asset.storageReference) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    storage
      .get(asset.storageReference)
      .then((stored) => {
        if (cancelled || !stored) return;
        objectUrl = URL.createObjectURL(stored.blob);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [storage, asset?.id, asset?.storageReference, asset?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return url;
}
