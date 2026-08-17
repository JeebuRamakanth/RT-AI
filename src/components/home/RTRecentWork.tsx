"use client";

import { RTEmptyState } from "@/components/ui/RTEmptyState";

/**
 * Conversation continuation area. Renders an empty state until real
 * conversation history exists. No fabricated data is ever shown.
 */
export function RTRecentWork() {
  return (
    <RTEmptyState
      icon="clock"
      title="No recent work yet"
      message="Conversations and projects you start will appear here, ready to continue where you left off."
    />
  );
}
