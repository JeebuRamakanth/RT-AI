
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RTHero } from "@/components/home/RTHero";
import { RTAIComposer, type RTAIComposerSubmit } from "@/components/home/RTAIComposer";
import { RTQuickActions } from "@/components/home/RTQuickActions";
import { RTCapabilityGroups } from "@/components/home/RTCapabilityGroups";
import { RTRecentWork } from "@/components/home/RTRecentWork";
import { RTResponseSurface } from "@/components/home/RTResponseSurface";
import { RTSection } from "@/components/ui/RTSection";
import { useConversation } from "@/hooks/useConversation";

const easing = [0.16, 1, 0.3, 1] as const;

export function RTHome() {
  const {
    send,
    cancel,
    retry,
    status,
    streamingText,
    lastResponse,
    lastError,
    isBusy,
  } = useConversation();

  // Track whether the response surface should stay after completion/error.
  const [dismissed, setDismissed] = useState(false);
  const surfaceText =
    status === "completed" ? (lastResponse?.text ?? "") : streamingText;
  const surfaceVisible = (isBusy || status === "completed" || status === "error") && !dismissed;

  function handleSubmit(draft: RTAIComposerSubmit) {
    setDismissed(false);
    void send({
      text: draft.text,
      attachments: draft.attachments.map((a) => ({
        id: a.id,
        kind: a.kind,
        name: a.name,
        mime: "",
        size: 0,
      })),
    });
  }

  function handleAction(_id: string) {
    // Quick actions remain planned-but-not-fake for non-text capabilities.
    // Text-style "ask" actions route through the composer intent.
  }

  function handleDismiss() {
    setDismissed(true);
  }

  return (
    <div className="space-y-12">
      <RTHero />

      <div className="space-y-3">
        <RTAIComposer
          onSubmit={handleSubmit}
          isStreaming={isBusy}
          onCancel={cancel}
        />

        {/* Live assistant response surface — native to the RT AI design. */}
        {surfaceVisible && (
          <RTResponseSurface
            status={status}
            text={surfaceText}
            lastResponse={lastResponse}
            lastError={lastError}
            isBusy={isBusy}
            onRetry={() => {
              setDismissed(false);
              void retry();
            }}
            onDismiss={handleDismiss}
          />
        )}

        {/* Honest "not connected" affordance — shown only before the first
            real AI interaction, so the user understands the dev provider. */}
        <AnimatePresence>
          {!isBusy && status === "idle" && !lastResponse && !lastError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: easing }}
              className="flex items-center gap-2.5 px-1 text-[12.5px] text-pearl-faint"
              role="status"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-pearl-faint" />
              Live development core ready. Type a message to see the AI
              pipeline in action — real providers connect through a secure
              backend in a later step.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RTSection
        title="Quick actions"
        caption="Jump straight into a capability."
        icon="bolt"
      >
        <RTQuickActions onAction={handleAction} />
      </RTSection>

      <RTSection
        title="Continue where you left off"
        caption="Recent conversations and projects."
        icon="clock"
      >
        <RTRecentWork />
      </RTSection>

      <RTSection
        title="What RT AI will become"
        caption="Capability areas the platform is architected to grow into."
        icon="layers"
      >
        <RTCapabilityGroups />
      </RTSection>

      <footer className="pt-8">
        <div className="rt-hairline h-px w-full" />
        <p className="mt-5 text-[12px] text-pearl-faint">
          RT AI · A private system for Ramakanth. Step 02 — AI Core foundation.
        </p>
      </footer>
    </div>
  );
}
