/**
 * Title generation — deterministic fallback.
 *
 * New conversations start with an auto title. After the first meaningful
 * interaction, `generateTitle` derives a concise title from the user's
 * first message. The result is marked `titleAuto: true` so the UI can show
 * it as auto-generated and allow manual rename.
 *
 * This is intentionally a heuristic — honest about not being a model. A
 * future model-driven title generator can replace `generateTitle` without
 * changing call sites.
 */

import type { LanguageCode } from "@/ai/language";

const MAX_LEN = 60;

/**
 * Derive a title from the first user message. Strategy:
 *  - strip leading greetings
 *  - take the first sentence / clause
 *  - trim to a readable length
 *
 * Multilingual: works on any script because it operates on whitespace and
 * sentence punctuation; falls back to a slice of the raw text.
 */
export function generateTitle(firstMessage: string, language: LanguageCode): string {
  const raw = firstMessage.replace(/\s+/g, " ").trim();
  if (!raw) return defaultTitle(language);

  let text = stripLeadingGreeting(raw);

  // First sentence/clause.
  const stop = text.search(/[.!?।]/);
  if (stop > 0) text = text.slice(0, stop);

  text = text.trim();
  if (!text) text = raw;

  if (text.length > MAX_LEN) {
    text = `${text.slice(0, MAX_LEN - 1).trimEnd()}…`;
  }
  return text || defaultTitle(language);
}

const GREETINGS = [
  /^(hi|hello|hey|namaste|namaskaram|hola|vanakkam|good\s+(morning|afternoon|evening|night))\s*[,!.]?\s+/i,
  /^(naaku|naku|naa)\s+/i,
];

function stripLeadingGreeting(s: string): string {
  let out = s;
  for (const re of GREETINGS) {
    out = out.replace(re, "");
  }
  return out;
}

function defaultTitle(language: LanguageCode): string {
  switch (language) {
    case "te":
      return "కొత్త సంభాషణ";
    case "hi":
      return "नई बातचीत";
    case "mixed":
      return "New conversation";
    default:
      return "New conversation";
  }
}

/** The placeholder title used before any message exists. */
export function placeholderTitle(): string {
  return "New conversation";
}
