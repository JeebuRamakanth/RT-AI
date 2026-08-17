
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Conversation continuation area. Renders an empty state until real
 * conversation history exists. No fabricated data is ever shown.
 */
export function RecentWork() {
  return (
    <EmptyState
      icon="clock"
      title="No recent work yet"
      message="Conversations and projects you start will appear here, ready to continue where you left off."
    />
  );
}
