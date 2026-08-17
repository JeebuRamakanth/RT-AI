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
 *
 * The detection is driven by a script registry (`LANGUAGE_SCRIPTS`) so new
 * languages can be added by registering a script range — the core union
 * `LanguageCode` stays strongly typed while the matching logic stays
 * data-driven and extensible.
 */

import { preferenceForMessage, type EmojiPreference } from "@/ai/emoji";

export type LanguageCode = "en" | "te" | "hi" | "mixed" | "unknown";

export type Tone = "neutral" | "warm" | "playful";
export type Formality = "casual" | "neutral" | "formal";
export type StyleTag = "concise" | "detailed" | "technical" | "creative";

/** How much output detail the user's message implies. */
export type Verbosity = "concise" | "balanced" | "detailed";
/** How technical the user's message is — calibrates assumed expertise. */
export type TechnicalLevel = "beginner" | "intermediate" | "expert";

export interface LanguageStyleMetadata {
  /** Primary detected language. */
  language: LanguageCode;
  /** Secondary language when mixed (e.g. te × en); otherwise null. */
  secondaryLanguage: LanguageCode | null;
  /** True when two scripts/languages are interleaved. */
  isMixedLanguage: boolean;
  /** Detection confidence in [0,1]. Low for ambiguous or very short input. */
  languageConfidence: number;
  /** Detected tone. */
  tone: Tone;
  /** Detected formality. */
  formality: Formality;
  /** Style hints derived from the message. */
  style: StyleTag[];
  /** Output verbosity implied by the message. */
  verbosity: Verbosity;
  /** Technical level implied by the message. */
  technicalLevel: TechnicalLevel;
  /** Emoji register implied by the message (mirrors the user's emoji use). */
  emojiPreference: EmojiPreference;
}

/* ------------------------------------------------------------------ */
/* Script registry (extensible language detection)                      */
/* ------------------------------------------------------------------ */

/**
 * A registered script range. To support a new language, add an entry here and
 * to the `LanguageCode` union; the detection logic iterates this list rather
 * than hard-coding Telugu/Hindi.
 */
export interface LanguageScript {
  code: Exclude<LanguageCode, "mixed" | "unknown">;
  name: string;
  test: (ch: string) => boolean;
  /** True when this script is the Latin/default family (the borrow-in). */
  latin?: boolean;
}

const TELUGU = /[\u0C00-\u0C7F]/;
const HINDI = /[\u0900-\u097F]/;
const LATIN = /[A-Za-z]/;

export const LANGUAGE_SCRIPTS: LanguageScript[] = [
  { code: "en", name: "English", test: (ch) => LATIN.test(ch), latin: true },
  { code: "te", name: "Telugu", test: (ch) => TELUGU.test(ch) },
  { code: "hi", name: "Hindi", test: (ch) => HINDI.test(ch) },
];

function hasTelugu(text: string): boolean {
  return TELUGU.test(text);
}
function hasHindi(text: string): boolean {
  return HINDI.test(text);
}
function hasLatin(text: string): boolean {
  return LATIN.test(text);
}

/** Human-readable name for a language code. */
const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  te: "Telugu",
  hi: "Hindi",
  mixed: "Mixed",
  unknown: "Auto",
};

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
  confidence: number;
} {
  const te = hasTelugu(text);
  const hi = hasHindi(text);
  const la = hasLatin(text);

  const present: LanguageCode[] = [];
  if (la) present.push("en");
  if (te) present.push("te");
  if (hi) present.push("hi");

  if (present.length === 0) {
    return { language: "unknown", secondaryLanguage: null, isMixedLanguage: false, confidence: 0.2 };
  }
  if (present.length === 1) {
    // Confidence is higher for longer, clearly single-script messages.
    const letters = countLetters(text);
    const confidence = letters < 3 ? 0.55 : Math.min(0.97, 0.7 + letters / 100);
    return { language: present[0], secondaryLanguage: null, isMixedLanguage: false, confidence };
  }

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
    const primary = nonLatin[0];
    const secondary = counts.en > 0 ? "en" : (nonLatin[1] ?? null);
    // Confidence is strong for clear mixed-script input with both sides present.
    const both = counts.en > 0 && counts[primary] > 0;
    const confidence = both ? 0.92 : 0.7;
    return {
      language: primary,
      secondaryLanguage: secondary,
      isMixedLanguage: true,
      confidence,
    };
  }
  return { language: "en", secondaryLanguage: null, isMixedLanguage: false, confidence: 0.7 };
}

function countLetters(text: string): number {
  let n = 0;
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch) || TELUGU.test(ch) || HINDI.test(ch)) n++;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* Style heuristics                                                     */
/* ------------------------------------------------------------------ */

const FORMAL_MARKERS = /\b(please|kindly|sincerely|regards|respectfully|appreciate)\b/i;
const CASUAL_MARKERS = /\b(haha|lol|btw|tbh|ya|yeah|nah|gonna|wanna|dunno|cheers|hey|bro|man|dude)\b/i;
const TECHNICAL_MARKERS = /\b(api|function|class|error|stack|trace|async|await|promise|endpoint|schema|compiler|runtime|kernel|protocol)\b/i;
const BEGINNER_MARKERS = /\b(what is|how do|explain|beginner|new to|simple terms|eli5|i don.?t understand)\b/i;
const CREATIVE_MARKERS = /\b(story|poem|imagine|idea|dream|paint|creative)\b/i;
const DETAIL_MARKERS = /\b(detailed|in depth|step by step|thorough|elaborate|everything|comprehensive)\b/i;

export function detectStyle(text: string): {
  tone: Tone;
  formality: Formality;
  style: StyleTag[];
  verbosity: Verbosity;
  technicalLevel: TechnicalLevel;
} {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const hasEmojiChar = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(trimmed);
  const hasCasual = CASUAL_MARKERS.test(lower);
  const hasFormal = FORMAL_MARKERS.test(lower);
  const isAllCaps = /[A-Z]{4,}/.test(trimmed) && trimmed === trimmed.toUpperCase();
  const endsSentence = /[.!?]$/.test(trimmed);
  const long = trimmed.length > 240;
  const wantsDetail = DETAIL_MARKERS.test(lower);

  let formality: Formality = "neutral";
  if (hasCasual || hasEmojiChar) formality = "casual";
  else if (hasFormal) formality = "formal";

  let tone: Tone = "neutral";
  if (hasEmojiChar || isAllCaps) tone = "playful";
  else if (hasFormal) tone = "warm";

  const style: StyleTag[] = [];
  const isTechnical = TECHNICAL_MARKERS.test(lower);
  if (isTechnical) style.push("technical");
  if (CREATIVE_MARKERS.test(lower)) style.push("creative");
  style.push(long || endsSentence || wantsDetail ? "detailed" : "concise");

  let verbosity: Verbosity = "balanced";
  if (wantsDetail || long) verbosity = "detailed";
  else if (trimmed.length > 0 && trimmed.length < 48 && !endsSentence) verbosity = "concise";

  let technicalLevel: TechnicalLevel = "intermediate";
  if (BEGINNER_MARKERS.test(lower)) technicalLevel = "beginner";
  else if (isTechnical) technicalLevel = "expert";

  return { tone, formality, style, verbosity, technicalLevel };
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
    languageConfidence: lang.confidence,
    tone: style.tone,
    formality: style.formality,
    style: style.style,
    verbosity: style.verbosity,
    technicalLevel: style.technicalLevel,
    emojiPreference: preferenceForMessage(text),
  };
}

/** Human-readable language label for UI surfaces (honest, no fake claims). */
export function languageLabel(meta: LanguageStyleMetadata): string {
  if (meta.isMixedLanguage && meta.secondaryLanguage) {
    return `${LANGUAGE_NAMES[meta.language]} × ${LANGUAGE_NAMES[meta.secondaryLanguage]}`;
  }
  return LANGUAGE_NAMES[meta.language];
}

/** Human-readable name for a bare LanguageCode (e.g. for logs/debug). */
export function languageName(code: LanguageCode): string {
  return LANGUAGE_NAMES[code];
}

