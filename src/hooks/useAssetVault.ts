/**
 * useAssetVault — reactive loader for the Asset Vault. Refetches whenever
 * the asset store revision changes (after any mutation). Owns filter/sort/
 * search state and runs queries against the repository — never against
 * rendered cards — so every persisted asset is reachable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAssetStore, useVaultOwner } from "@/assets/store";
import type {
  Asset,
  AssetCollection,
  AssetCounts,
  AssetSearchResult,
  AssetSort,
  AssetSource,
  AssetType,
} from "@/assets/types";

export type VaultView = "all" | "favorites" | "archived" | "trash";

export interface VaultFilters {
  view: VaultView;
  type: AssetType | "all";
  source: AssetSource | "all";
  collectionId: string | null;
  sort: AssetSort;
}

export const DEFAULT_FILTERS: VaultFilters = {
  view: "all",
  type: "all",
  source: "all",
  collectionId: null,
  sort: "newest",
};

export interface UseAssetVault {
  assets: Asset[];
  collections: AssetCollection[];
  counts: AssetCounts | null;
  loading: boolean;
  error: string | null;
  filters: VaultFilters;
  setFilters: (patch: Partial<VaultFilters>) => void;
  resetFilters: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  search: AssetSearchResult | null;
  searching: boolean;
  clearSearch: () => void;
  refresh: () => Promise<void>;
}

export function useAssetVault(): UseAssetVault {
  const { repository, revision } = useAssetStore();
  const owner = useVaultOwner();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [collections, setCollections] = useState<AssetCollection[]>([]);
  const [counts, setCounts] = useState<AssetCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<VaultFilters>(DEFAULT_FILTERS);

  const [searchQuery, setSearchQueryState] = useState("");
  const [search, setSearch] = useState<AssetSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, cols, cts] = await Promise.all([
        repository.list({
          ownerId: owner.id,
          trashOnly: filters.view === "trash",
          favoritesOnly: filters.view === "favorites",
          archivedOnly: filters.view === "archived",
          type: filters.type,
          source: filters.source,
          collectionId: filters.collectionId,
          sort: filters.sort,
        }),
        repository.listCollections(owner.id),
        repository.counts(owner.id),
      ]);
      setAssets(list);
      setCollections(cols);
      setCounts(cts);
    } catch {
      setError("The vault could not be loaded. Your data is safe — try again.");
    } finally {
      setLoading(false);
    }
  }, [repository, owner.id, filters]);

  useEffect(() => {
    void load();
  }, [load, revision]);

  const setFilters = useCallback((patch: Partial<VaultFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState((prev) => ({ ...DEFAULT_FILTERS, view: prev.view }));
  }, []);

  const setSearchQuery = useCallback(
    (q: string) => {
      setSearchQueryState(q);
      const trimmed = q.trim();
      const seq = ++searchSeq.current;
      if (!trimmed) {
        setSearch(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      repository
        .search({ ownerId: owner.id, query: trimmed, includeTrash: true })
        .then((res) => {
          if (searchSeq.current !== seq) return;
          setSearch(res);
          setSearching(false);
        })
        .catch(() => {
          if (searchSeq.current !== seq) return;
          setSearching(false);
        });
    },
    [repository, owner.id],
  );

  const clearSearch = useCallback(() => {
    setSearchQueryState("");
    setSearch(null);
    setSearching(false);
  }, []);

  return useMemo(
    () => ({
      assets,
      collections,
      counts,
      loading,
      error,
      filters,
      setFilters,
      resetFilters,
      searchQuery,
      setSearchQuery,
      search,
      searching,
      clearSearch,
      refresh: load,
    }),
    [
      assets, collections, counts, loading, error, filters, setFilters,
      resetFilters, searchQuery, setSearchQuery, search, searching,
      clearSearch, load,
    ],
  );
}
