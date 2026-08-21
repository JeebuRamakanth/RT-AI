/**
 * AssetGrid — the responsive vault grid. Desktop multi-column, tablet
 * adaptive, mobile compact. Cards render lazily through the browser's
 * native image lazy-loading; virtualization is intentionally deferred
 * until the vault shape demands it.
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Icon } from "@/components/icons/Icon";
import { AssetCard } from "@/components/vault/AssetCard";
import type { Asset } from "@/assets/types";
import type { VaultView } from "@/hooks/useAssetVault";

interface AssetGridProps {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  view: VaultView;
  filtered: boolean;
  onOpen: (asset: Asset) => void;
  onToggleFavorite: (asset: Asset) => void;
  onUpload: () => void;
  onRetry: () => void;
  onResetFilters: () => void;
}

const VIEW_EMPTY: Record<VaultView, { title: string; message: string; icon: "star" | "archive" | "trash" | "image" }> = {
  all: {
    icon: "image",
    title: "Your vault is empty",
    message: "Everything RT AI creates or understands can live here — images, videos, audio, documents, code, and more.",
  },
  favorites: {
    icon: "star",
    title: "No favorites yet",
    message: "Star the assets you reach for most and they'll wait for you here.",
  },
  archived: {
    icon: "archive",
    title: "Nothing archived",
    message: "Archived assets stay safe and searchable, but out of your main view.",
  },
  trash: {
    icon: "trash",
    title: "Trash is empty",
    message: "Deleted assets land here first. Restore them, or remove them permanently.",
  },
};

export function AssetGrid(props: AssetGridProps) {
  const { assets, loading, error, view, filtered } = props;

  if (loading) {
    return (
      <div className="rt-surface rounded-[var(--radius-2xl)] px-4 py-12">
        <LoadingState label="Loading your vault" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="alert"
        title="The vault could not be loaded"
        message={error}
        action={
          <Button variant="secondary" size="sm" onClick={props.onRetry}>
            <Icon name="retry" size={14} />
            Try again
          </Button>
        }
      />
    );
  }

  if (assets.length === 0) {
    if (filtered) {
      return (
        <EmptyState
          icon="search"
          title="Nothing matches"
          message="No assets match the current filters."
          action={
            <Button variant="secondary" size="sm" onClick={props.onResetFilters}>
              Clear filters
            </Button>
          }
        />
      );
    }
    const empty = VIEW_EMPTY[view];
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        message={empty.message}
        action={
          <div className="flex items-center gap-2">
            {view !== "trash" && (
              <Button variant="primary" size="sm" onClick={props.onUpload}>
                <Icon name="upload" size={14} />
                Upload files
              </Button>
            )}
            <Link to="/">
              <Button variant="secondary" size="sm">
                <Icon name="home" size={14} />
                Return to Home
              </Button>
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onOpen={props.onOpen}
          onToggleFavorite={props.onToggleFavorite}
        />
      ))}
    </ul>
  );
}
