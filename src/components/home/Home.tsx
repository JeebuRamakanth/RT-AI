
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Hero } from "@/components/home/Hero";
import { Composer, type ComposerSubmit } from "@/components/home/Composer";
import { QuickActions } from "@/components/home/QuickActions";
import { CapabilityGroups } from "@/components/home/CapabilityGroups";
import { RecentWork } from "@/components/home/RecentWork";
import { ResponseSurface } from "@/components/home/ResponseSurface";
import { Section } from "@/components/ui/Section";
import { usePersistedConversation } from "@/hooks/usePersistedConversation";
import type { ConversationStatus } from "@/hooks/useConversation";

const easing = [0.16, 1, 0.3, 1] as const;

export function Home() {
  const navigate = useNavigate();
  const {
    send,
    cancel,
    retry,
    lifecycle,
    streamingText,
    lastResponse,
    lastError,
    isBusy,
    conversationId,
  } = usePersistedConversation("home-composer");

  // Track whether the response surface should stay after completion/error.
  const [dismissed, setDismissed] = useState(false);
  const status = lifecycle as ConversationStatus;
  const surfaceText =
    lifecycle === "completed" ? (lastResponse?.text ?? "") : streamingText;
  const surfaceVisible = (isBusy || lifecycle === "completed" || lifecycle === "error") && !dismissed;

  function handleSubmit(draft: ComposerSubmit) {
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

  // When a turn completes and a conversation has been persisted, offer to open
  // it in the full chat workspace. The Home response surface stays so the
  // user isn't forced to navigate away.
  function handleAction(_id: string) {
    // Quick actions remain planned-but-not-fake for non-text capabilities.
  }

  function handleDismiss() {
    setDismissed(true);
  }

  return (
    <div className="space-y-12">
      <Hero />

      <div className="space-y-3">
        <Composer
          onSubmit={handleSubmit}
          isStreaming={isBusy}
          onCancel={cancel}
        />

        {/* Live assistant response surface — native to the RT AI design. */}
        {surfaceVisible && (
          <ResponseSurface
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

        {/* Continue in the full chat workspace once a conversation persists. */}
        <AnimatePresence>
          {!isBusy && lifecycle === "completed" && conversationId && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: easing }}
              className="flex items-center gap-2 px-1"
            >
              <button
                type="button"
                onClick={() => navigate(`/chat/${conversationId}`)}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-signal transition-colors hover:text-signal-glow focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Continue in Chat
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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

      <Section
        title="Quick actions"
        caption="Jump straight into a capability."
        icon="bolt"
      >
        <QuickActions onAction={handleAction} />
      </Section>

      <Section
        title="Continue where you left off"
        caption="Recent conversations and projects."
        icon="clock"
      >
        <RecentWork />
      </Section>

      <Section
        title="What RT AI will become"
        caption="Capability areas the platform is architected to grow into."
        icon="layers"
      >
        <CapabilityGroups />
      </Section>

      <footer className="pt-8">
        <div className="rt-hairline h-px w-full" />
        <p className="mt-5 text-[12px] text-pearl-faint">
          RT AI · A private system for Ramakanth. Step 04 — persistent conversation library.
        </p>
      </footer>
    </div>
  );
}
