/**
 * Asset store — React context providing the AssetRepository (metadata) and
 * AssetStorage (bytes) pair, plus the shared owner context from the
 * conversation store. Components touch the vault only through this seam.
 *
 * Follows the ConversationStoreProvider contract: a single repository per
 * session and a revision counter that list consumers watch after mutations.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { LocalAssetRepository } from "@/assets/repository";
import { createDefaultAssetStorage, type AssetStorage } from "@/assets/storage";
import { createDefaultStore } from "@/conversations/storage";
import { useConversationStore } from "@/conversations/store";
import type { AssetRepository } from "@/assets/types";

interface AssetStoreValue {
  repository: AssetRepository;
  storage: AssetStorage;
  /** True when bytes survive reloads; false = session-only, shown honestly. */
  storagePersistent: boolean;
  /** Bump to signal vault consumers to refetch after mutations. */
  revision: number;
  bump: () => void;
}

const AssetStoreContext = createContext<AssetStoreValue | null>(null);

export function AssetStoreProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0);

  const repository = useMemo(() => new LocalAssetRepository(createDefaultStore()), []);
  const storage = useMemo(() => createDefaultAssetStorage(), []);

  const value = useMemo<AssetStoreValue>(
    () => ({
      repository,
      storage,
      storagePersistent: storage.persistent,
      revision,
      bump: () => setRevision((r) => r + 1),
    }),
    [repository, storage, revision],
  );

  return <AssetStoreContext.Provider value={value}>{children}</AssetStoreContext.Provider>;
}

export function useAssetStore(): AssetStoreValue {
  const ctx = useContext(AssetStoreContext);
  if (!ctx) {
    throw new Error("useAssetStore must be used within AssetStoreProvider");
  }
  return ctx;
}

/**
 * Convenience: the vault always reads the active owner from the shared
 * conversation store so user separation stays consistent app-wide.
 */
export function useVaultOwner() {
  const { owner } = useConversationStore();
  return owner;
}
