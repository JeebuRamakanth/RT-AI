/**
 * useConversationLists — reactive loader for the library buckets. Refetches
 * whenever the store revision changes (after any mutation through the
 * repository). Provides pinned, recent, archived, deleted, and counts, plus
 * search results when a query is active.
 */

import { useCallback, useEffect, useState } from "react";
import { useConversationStore } from "@/conversations/useStore";
import type {
  ConversationRecord,
  SearchResult,
} from "@/conversations/types";

interface ListsState {
  pinned: ConversationRecord[];
  recent: ConversationRecord[];
  archived: ConversationRecord[];
  deleted: ConversationRecord[];
  loading: boolean;
  search: SearchResult | null;
  searchQuery: string;
  searching: boolean;
}

export function useConversationLists(): ListsState & {
  setQuery: (q: string) => void;
  clearSearch: () => void;
  refresh: () => void;
} {
  const { repository, owner, revision } = useConversationStore();
  const [pinned, setPinned] = useState<ConversationRecord[]>([]);
  const [recent, setRecent] = useState<ConversationRecord[]>([]);
  const [archived, setArchived] = useState<ConversationRecord[]>([]);
  const [deleted, setDeleted] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState<SearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    const [p, r, a, d] = await Promise.all([
      repository.pinned(owner.id),
      repository.recent(owner.id, 50),
      repository.archived(owner.id, 50),
      repository.deleted(owner.id, 50),
    ]);
    setPinned(p);
    setRecent(r);
    setArchived(a);
    setDeleted(d);
    setLoading(false);
  }, [repository, owner.id]);

  useEffect(() => {
    void load();
  }, [load, revision]);

  const setQuery = useCallback(
    (q: string) => {
      setSearchQuery(q);
      const trimmed = q.trim();
      if (!trimmed) {
        setSearch(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      repository
        .search({ ownerId: owner.id, query: trimmed, includeArchived: true, includeDeleted: false, limit: 50 })
        .then((res) => {
          setSearch(res);
          setSearching(false);
        })
        .catch(() => setSearching(false));
    },
    [repository, owner.id],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearch(null);
  }, []);

  return {
    pinned,
    recent,
    archived,
    deleted,
    loading,
    search,
    searchQuery,
    searching,
    setQuery,
    clearSearch,
    refresh: load,
  };
}
