import { Link } from "react-router-dom";

export function Brand() {
  return (
    <Link
      to="/"
      className="group inline-flex items-center gap-2.5 rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-4"
      aria-label="RT AI — home"
    >
      <span
        className="relative flex h-9 w-9 items-center justify-center"
        aria-hidden="true"
      >
        {/* Mark: an aperture-like glyph suggesting an expanding intelligence core */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-signal/30 via-signal/10 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <circle
            cx="17"
            cy="17"
            r="15"
            stroke="rgb(var(--signal) / 0.5)"
            strokeWidth="1"
          />
          <circle
            cx="17"
            cy="17"
            r="9"
            stroke="rgb(var(--signal) / 0.8)"
            strokeWidth="1.2"
          />
          <circle cx="17" cy="17" r="3" fill="rgb(var(--signal))" />
          <path
            d="M17 2v5M17 27v5M2 17h5M27 17h5"
            stroke="rgb(var(--signal) / 0.7)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="font-display text-[22px] tracking-tight text-pearl">
          RT
        </span>
        <span className="font-sans text-[13px] font-medium uppercase tracking-[0.32em] text-signal">
          AI
        </span>
      </span>
    </Link>
  );
}
