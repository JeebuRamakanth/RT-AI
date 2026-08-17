/**
 * RT AI Core — language & style metadata.
 *
 * PRODUCT RULE: RT AI must answer in the user's language and style.
 * English → English, Telugu → Telugu, Hindi → Hindi, Telugu×English →
 * Telugu×English. Casual input → casual style; formal input → formal style.
 *
 * This step uses a lightweight development heuristic. The architecture is
 * typed so a real language detector / model can replace `detectLanguageStyle`
 * later without touching the request/response contracts.
 */

export type LanguageCode = "en" | "te" | "hi" | "mixed" | "unknown";

export type Tone = "neutral" | "warm" | "playful";
export type Formality = "casual" | "neutral" | "formal";
export type StyleTag = "concise" | "detailed" | "technical" | "creative";

export interface LanguageStyleMetadata {
  /** Primary detected language. */
  language: LanguageCode;
  /** Secondary language when mixed (e.g. te × en); otherwise null. */
  secondaryLanguage: LanguageCode | null;
  /** True when two scripts/languages are interleaved. */
  isMixedLanguage: boolean;
  /** Detected tone. */
  tone: Tone;
  /** Detected formality. */
  formality: Formality;
  /** Style hints derived from the message. */
  style: StyleTag[];
}

/* ------------------------------------------------------------------ */
/* Unicode script detection                                            */
/* ------------------------------------------------------------------ */

const TELUGU = /[\u0C00-\u0C7F]/;
const HINDI = /[\u0900-\u097F]/;

function hasTelugu(text: string): boolean {
  return TELUGU.test(text);
}
function hasHindi(text: string): boolean {
  return HINDI.test(text);
}
function hasLatin(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

/**
 * Detect the language(s) present in the message. "mixed" is used when two
 * scripts are interleaved (the canonical RT AI use case, e.g. Telugu×English).
 *
 * In a mixed message the non-Latin script is treated as primary: English is
 * the common borrow-in for RT AI's users, and the native script (Telugu/Hindi)
 * marks the conversational base language. Counts still break ties when more
 * than one non-Latin script is present.
 */
export function detectLanguage(text: string): {
  language: LanguageCode;
  secondaryLanguage: LanguageCode | null;
  isMixedLanguage: boolean;
} {
  const te = hasTelugu(text);
  const hi = hasHindi(text);
  const la = hasLatin(text);

  const present: LanguageCode[] = [];
  if (la) present.push("en");
  if (te) present.push("te");
  if (hi) present.push("hi");

  if (present.length === 0) return { language: "unknown", secondaryLanguage: null, isMixedLanguage: false };
  if (present.length === 1) return { language: present[0], secondaryLanguage: null, isMixedLanguage: false };

  // Multiple scripts present → mixed. Prefer a non-Latin script as primary.
  const counts: Record<string, number> = { en: 0, te: 0, hi: 0 };
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) counts.en++;
    else if (TELUGU.test(ch)) counts.te++;
    else if (HINDI.test(ch)) counts.hi++;
  }
  const nonLatin = (["te", "hi"] as const)
    .filter((c) => counts[c] > 0)
    .sort((a, b) => counts[b] - counts[a]);
  if (nonLatin.length > 0) {
    return {
      language: nonLatin[0],
      secondaryLanguage: counts.en > 0 ? "en" : (nonLatin[1] ?? null),
      isMixedLanguage: true,
    };
  }
  return { language: "en", secondaryLanguage: null, isMixedLanguage: false };
}

/* ------------------------------------------------------------------ */
/* Style heuristics                                                     */
/* ------------------------------------------------------------------ */

const FORMAL_MARKERS = /\b(please|kindly|sincerely|regards|respectfully|appreciate)\b/i;
const CASUAL_MARKERS = /\b(haha|lol|btw|tbh|ya|yeah|nah|gonna|wanna|dunno|cheers|hey)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const TECHNICAL_MARKERS = /\b(api|function|class|error|stack|trace|async|await|promise|endpoint|schema)\b/i;
const CREATIVE_MARKERS = /\b(story|poem|imagine|idea|dream|paint|creative)\b/i;

export function detectStyle(text: string): { tone: Tone; formality: Formality; style: StyleTag[] } {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const hasEmoji = EMOJI.test(trimmed);
  const hasCasual = CASUAL_MARKERS.test(lower);
  const hasFormal = FORMAL_MARKERS.test(lower);
  const isAllCaps = /[A-Z]{4,}/.test(trimmed) && trimmed === trimmed.toUpperCase();
  const endsSentence = /[.!?]$/.test(trimmed);
  const long = trimmed.length > 240;

  let formality: Formality = "neutral";
  if (hasCasual || hasEmoji) formality = "casual";
  else if (hasFormal) formality = "formal";

  let tone: Tone = "neutral";
  if (hasEmoji || isAllCaps) tone = "playful";
  else if (hasFormal) tone = "warm";

  const style: StyleTag[] = [];
  if (TECHNICAL_MARKERS.test(lower)) style.push("technical");
  if (CREATIVE_MARKERS.test(lower)) style.push("creative");
  style.push(long || endsSentence ? "detailed" : "concise");

  return { tone, formality, style };
}

/* ------------------------------------------------------------------ */
/* Combined detection                                                   */
/* ------------------------------------------------------------------ */

export function detectLanguageStyle(text: string): LanguageStyleMetadata {
  const lang = detectLanguage(text);
  const style = detectStyle(text);
  return {
    language: lang.language,
    secondaryLanguage: lang.secondaryLanguage,
    isMixedLanguage: lang.isMixedLanguage,
    tone: style.tone,
    formality: style.formality,
    style: style.style,
  };
}

/** Human-readable language label for UI surfaces (honest, no fake claims). */
export function languageLabel(meta: LanguageStyleMetadata): string {
  const names: Record<LanguageCode, string> = {
    en: "English",
    te: "Telugu",
    hi: "Hindi",
    mixed: "Mixed",
    unknown: "Auto",
  };
  if (meta.isMixedLanguage && meta.secondaryLanguage) {
    return `${names[meta.language]} × ${names[meta.secondaryLanguage]}`;
  }
  return names[meta.language];
}
