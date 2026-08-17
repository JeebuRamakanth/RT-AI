
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Hero } from "@/components/home/Hero";
import { Composer, type ComposerSubmit } from "@/components/home/Composer";
import { QuickActions } from "@/components/home/QuickActions";
import { CapabilityGroups } from "@/components/home/CapabilityGroups";
import { RecentWork } from "@/components/home/RecentWork";
import { ResponseSurface } from "@/components/home/ResponseSurface";
import { Section } from "@/components/ui/Section";
import { useConversation } from "@/hooks/useConversation";

const easing = [0.16, 1, 0.3, 1] as const;

export function Home() {
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

  function handleAction(_id: string) {
    // Quick actions remain planned-but-not-fake for non-text capabilities.
    // Text-style "ask" actions route through the composer intent.
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
          RT AI · A private system for Ramakanth. Step 03 — conversation intelligence.
        </p>
      </footer>
    </div>
  );
}
