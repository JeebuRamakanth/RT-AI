/**
 * RT AI Core — response style policy.
 *
 * A centralized, typed policy that captures how the generation pipeline
 * should shape a response: language, mixed-language handling, tone,
 * formality, verbosity, technical level, style tags, and emoji register.
 * The orchestrator builds it from the conversation intelligence + the
 * request's language metadata, then folds it into system guidance and
 * hands it to the provider via the request. The AI generation pipeline
 * consumes exactly one policy — this is the single source of truth for
 * style mirroring.
 */

import type {
  Formality,
  LanguageCode,
  LanguageStyleMetadata,
  StyleTag,
  Tone,
  Verbosity,
  TechnicalLevel,
} from "@/ai/language";
import type { EmojiPreference } from "@/ai/emoji";
import type { ConversationIntelligence } from "@/ai/intelligence";
import { intentLabel, topicPhrase } from "@/ai/intelligence";

export interface ResponseStylePolicy {
  language: LanguageCode;
  secondaryLanguage: LanguageCode | null;
  isMixedLanguage: boolean;
  tone: Tone;
  formality: Formality;
  verbosity: Verbosity;
  technicalLevel: TechnicalLevel;
  style: StyleTag[];
  emojiPreference: EmojiPreference;
  /** Extra system guidance derived from conversation intelligence. */
  systemGuidance: string;
}

/**
 * Build the response style policy for a turn. The current turn's language
 * metadata is the base; accumulated preferences from the conversation
 * intelligence refine formality/verbosity/emoji when there is a clear pattern.
 */
export function buildStylePolicy(
  intelligence: ConversationIntelligence,
  language: LanguageStyleMetadata,
): ResponseStylePolicy {
  const prefs = intelligence.preferences;

  // Prefer accumulated formality only when the window shows a consistent
  // register that differs from the current turn; otherwise mirror the turn.
  const formality =
    prefs.formality && prefs.formality !== language.formality && intelligence.recentTopics.length > 0
      ? prefs.formality
      : language.formality;

  const verbosity = language.verbosity;
  const technicalLevel = language.technicalLevel;
  const emojiPreference = language.emojiPreference;
  const style = language.style;

  const systemGuidance = buildSystemGuidance(intelligence, language, formality, verbosity, technicalLevel);

  return {
    language: language.language,
    secondaryLanguage: language.secondaryLanguage,
    isMixedLanguage: language.isMixedLanguage,
    tone: language.tone,
    formality,
    verbosity,
    technicalLevel,
    style,
    emojiPreference,
    systemGuidance,
  };
}

/**
 * Compose the language/style/continuity guidance appended to the system
 * instructions. This is the seam where conversation intelligence becomes
 * actionable for the generation pipeline.
 */
function buildSystemGuidance(
  intelligence: ConversationIntelligence,
  language: LanguageStyleMetadata,
  formality: Formality,
  verbosity: Verbosity,
  technicalLevel: TechnicalLevel,
): string {
  const parts: string[] = [];

  if (language.isMixedLanguage && language.secondaryLanguage) {
    parts.push(
      `Detected mixed language: ${language.language} × ${language.secondaryLanguage}. Respond in the same mixed style.`,
    );
  } else if (language.language !== "unknown") {
    parts.push(`Detected language: ${language.language}. Respond in that language.`);
  }

  if (formality === "casual") parts.push("Match a casual tone.");
  else if (formality === "formal") parts.push("Match a formal tone.");

  if (verbosity === "detailed") parts.push("Answer in detail.");
  else if (verbosity === "concise") parts.push("Keep the answer concise.");

  if (technicalLevel === "beginner") parts.push("Assume a beginner audience; define terms.");
  else if (technicalLevel === "expert") parts.push("Assume expert-level familiarity.");

  if (language.emojiPreference === "none") {
    parts.push("Do not use emojis in the response.");
  } else {
    parts.push("You may use a few tasteful emojis, matching the user's register.");
  }

  // Conversation continuity: resolve references to prior turns.
  if (intelligence.isContinuation) {
    const topic = topicPhrase(intelligence);
    if (topic) {
      parts.push(
        `This is a follow-up. The user is continuing the topic "${topic}" from earlier turns. Resolve references like "it", "that", "the same", "first module" to this topic.`,
      );
    } else {
      parts.push("This is a follow-up; carry context from the previous turns.");
    }
  }

  const intent = intentLabel(intelligence.intent);
  parts.push(`Treat this turn as ${intent}.`);

  return parts.join("\n");
}

/** Default neutral policy used when no intelligence is available (fallback). */
export function fallbackStylePolicy(language: LanguageStyleMetadata): ResponseStylePolicy {
  return {
    language: language.language,
    secondaryLanguage: language.secondaryLanguage,
    isMixedLanguage: language.isMixedLanguage,
    tone: language.tone,
    formality: language.formality,
    verbosity: language.verbosity,
    technicalLevel: language.technicalLevel,
    style: language.style,
    emojiPreference: language.emojiPreference,
    systemGuidance: language.isMixedLanguage && language.secondaryLanguage
      ? `Detected mixed language: ${language.language} × ${language.secondaryLanguage}. Respond in the same mixed style.`
      : language.language !== "unknown"
        ? `Detected language: ${language.language}. Respond in that language.`
        : "",
  };
}
