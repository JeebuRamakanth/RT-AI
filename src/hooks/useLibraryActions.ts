/**
 * useLibraryActions — repository mutation handlers for the conversation
 * library, wired to toast notifications + undo for trash, and refresh.
 * Returns the handler bundle used by ConversationRow/ConversationActions.
 */

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useConversationStore } from "@/conversations/useStore";
import { useToast } from "@/components/ui/toast-context";
import type { ConversationActionHandlers } from "@/components/library/ConversationActions";

export function useLibraryActions(): ConversationActionHandlers & {
  renameCommit: (id: string, title: string) => Promise<void>;
} {
  const { repository, bump } = useConversationStore();
  const { notify } = useToast();
  const navigate = useNavigate();

  const onOpen = useCallback((id: string) => {
    void navigate(`/chat/${id}`);
  }, [navigate]);

  const onPin = useCallback(async (id: string) => {
    await repository.pin(id);
    bump();
  }, [repository, bump]);

  const onUnpin = useCallback(async (id: string) => {
    await repository.unpin(id);
    bump();
  }, [repository, bump]);

  const onArchive = useCallback(async (id: string) => {
    await repository.archive(id);
    bump();
    notify("Conversation archived");
  }, [repository, bump, notify]);

  const onUnarchive = useCallback(async (id: string) => {
    await repository.unarchive(id);
    bump();
    notify("Conversation restored from archive");
  }, [repository, bump, notify]);

  const onMoveToTrash = useCallback(async (id: string) => {
    const before = await repository.get(id);
    await repository.moveToTrash(id);
    bump();
    notify("Conversation moved to Trash", async () => {
      if (before) {
        await repository.restore(id);
        // Restore leaves it active (not re-pinned) per documented policy.
        bump();
      }
    });
  }, [repository, bump, notify]);

  const onRestore = useCallback(async (id: string) => {
    await repository.restore(id);
    bump();
    notify("Conversation restored");
  }, [repository, bump, notify]);

  const onPermanentlyDelete = useCallback(async (id: string) => {
    await repository.permanentlyDelete(id);
    bump();
  }, [repository, bump]);

  const renameCommit = useCallback(async (id: string, title: string) => {
    await repository.rename(id, title);
    bump();
  }, [repository, bump]);

  return {
    onOpen,
    onPin,
    onUnpin,
    onArchive,
    onUnarchive,
    onMoveToTrash,
    onRestore,
    onPermanentlyDelete,
    renameCommit,
  };
}
