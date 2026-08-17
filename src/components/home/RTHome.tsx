"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RTHero } from "@/components/home/RTHero";
import { RTAIComposer, type RTAIComposerSubmit } from "@/components/home/RTAIComposer";
import { RTQuickActions } from "@/components/home/RTQuickActions";
import { RTCapabilityGroups } from "@/components/home/RTCapabilityGroups";
import { RTRecentWork } from "@/components/home/RTRecentWork";
import { RTSection } from "@/components/ui/RTSection";

const easing = [0.16, 1, 0.3, 1] as const;

export function RTHome() {
  const [status, setStatus] = useState<null | { type: "info" }>(null);

  // Composer contract: the UI is ready, the backend is not connected yet.
  // We surface a non-fake acknowledgement instead of a fake AI response.
  function handleSubmit(draft: RTAIComposerSubmit) {
    setStatus({ type: "info" });
  }

  function handleAction(_id: string) {
    setStatus({ type: "info" });
  }

  return (
    <div className="space-y-12">
      <RTHero />

      <div className="space-y-3">
        <RTAIComposer onSubmit={handleSubmit} />

        {/* Honest "not connected" affordance — never a fake AI reply */}
        <AnimatePresence>
          {status?.type === "info" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: easing }}
              className="flex items-center gap-2.5 px-1 text-[12.5px] text-pearl-faint"
              role="status"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-pearl-faint" />
              RT AI&apos;s core is being wired up. This composer is ready to
              connect to real AI, agents, and tools in a later step.
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
          RT AI · A private system for Ramakanth. Step 01 — Foundation.
        </p>
      </footer>
    </div>
  );
}
