/**
 * useConversationStore — accessor for the ConversationStoreProvider context.
 * Kept in its own file so fast-refresh treats the provider (store.tsx) as a
 * pure-component module.
 */

import { useContext } from "react";
import { ConversationStoreContext, type ConversationStoreValue } from "@/conversations/store";

export function useConversationStore(): ConversationStoreValue {
  const ctx = useContext(ConversationStoreContext);
  if (!ctx) {
    throw new Error("useConversationStore must be used within ConversationStoreProvider");
  }
  return ctx;
}
