
import { motion } from "framer-motion";
import { useMemo } from "react";

function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

const easing = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const greet = useMemo(() => greeting(new Date()), []);

  return (
    <section className="relative pt-6 sm:pt-10" aria-label="Workspace greeting">
      {/* Faint orbital accent behind the greeting */}
      <div
        className="pointer-events-none absolute -top-10 right-0 h-64 w-64 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--signal)/0.16), transparent 70%)",
        }}
        aria-hidden
      />

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easing }}
        className="text-[13px] font-medium uppercase tracking-[0.28em] text-signal/90"
      >
        {greet}, Ramakanth
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easing, delay: 0.05 }}
        className="mt-4 max-w-3xl font-display text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.04] tracking-tight text-balance text-pearl"
      >
        Your own AI system,
        <br />
        <span className="text-pearl-muted">ready to become anything.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easing, delay: 0.12 }}
        className="mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-pearl-muted"
      >
        One private workspace to think, research, create, and build with AI —
        growing into a complete platform as you add capabilities.
      </motion.p>
    </section>
  );
}
