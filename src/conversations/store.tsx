/**
 * Conversation store — React context providing a single ConversationRepository
 * instance plus owner context. Components read/write conversations only
 * through this seam.
 *
 * The repository is created once per app session (backed by IndexedDB in the
 * browser). The owner is the placeholder RT AI user; a future auth layer
 * swaps the owner without touching call sites.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  LocalConversationRepository,
  createDefaultStore,
  getCurrentOwner,
  setCurrentOwner as setStoredOwner,
  type ConversationRepository,
  type Owner,
} from "@/conversations";

interface ConversationStoreValue {
  repository: ConversationRepository;
  owner: Owner;
  /** Bump to signal list consumers to refetch after mutations. */
  revision: number;
  bump: () => void;
  switchOwner: (id: string) => void;
}

const ConversationStoreContext = createContext<ConversationStoreValue | null>(null);

export function ConversationStoreProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<Owner>(() => getCurrentOwner());
  const [revision, setRevision] = useState(0);

  const repository = useMemo(() => {
    return new LocalConversationRepository(createDefaultStore());
  }, []);

  const value = useMemo<ConversationStoreValue>(
    () => ({
      repository,
      owner,
      revision,
      bump: () => setRevision((r) => r + 1),
      switchOwner: (id: string) => {
        const next = setStoredOwner(id);
        setOwner(next);
        setRevision((r) => r + 1);
      },
    }),
    [repository, owner, revision],
  );

  return (
    <ConversationStoreContext.Provider value={value}>
      {children}
    </ConversationStoreContext.Provider>
  );
}

export function useConversationStore(): ConversationStoreValue {
  const ctx = useContext(ConversationStoreContext);
  if (!ctx) {
    throw new Error("useConversationStore must be used within ConversationStoreProvider");
  }
  return ctx;
}
