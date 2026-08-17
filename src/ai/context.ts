/**
 * RT AI Core — context builder.
 *
 * Constructs the canonical context the orchestrator hands to a provider.
 * Today this is a thin, deterministic transformation of the request; the
 * architecture is shaped so future memory, RAG, knowledge, tools, and
 * system-instruction separation can plug in here without touching the
 * orchestrator or the UI.
 *
 * SECURITY: System instructions are authored by RT AI (never user input),
 * and user content / attachment metadata are kept strictly separate from
 * system content. This boundary is extensible for future trusted tool
 * outputs. The response style policy's guidance is folded into the
 * system instructions here — it is RT AI-authored, never user text.
 */

import type { AIRequest, ContentPart } from "@/ai/types";
import type { LanguageStyleMetadata } from "@/ai/language";
import { fallbackStylePolicy, type ResponseStylePolicy } from "@/ai/style-policy";
import type { ConversationIntelligence } from "@/ai/intelligence";

export interface BuiltContext {
  /** RT AI-authored system instructions — never derived from user text. */
  system: string;
  /** The user turn, as content parts. */
  user: ContentPart[];
  /** Conversation turns carried into the request (future: memory window). */
  history: ContextTurn[];
  /** Language/style metadata passed through to the provider. */
  language: LanguageStyleMetadata;
  /** The response style policy consumed by the generation pipeline. */
  policy: ResponseStylePolicy;
}

export interface ContextTurn {
  role: "user" | "assistant";
  text: string;
}

const DEFAULT_SYSTEM = `You are RT AI, a private universal assistant for Ramakanth.
Mirror the user's detected language and style. If they write in Telugu, answer in Telugu;
in Hindi, answer in Hindi; in mixed Telugu and English, answer in the same mixed style.
Be direct, honest, and useful. Never fabricate capabilities RT AI does not yet have.`;

/**
 * Build the context for a request. The response style policy supplies the
 * language/style/continuity guidance appended to the system instructions.
 * Future steps will add memory retrieval, RAG passages, and per-task
 * system instructions — all through this seam.
 */
export function buildContext(
  request: AIRequest,
  history: ContextTurn[] = [],
  policy?: ResponseStylePolicy,
  intelligence?: ConversationIntelligence,
): BuiltContext {
  const guidance = policy?.systemGuidance ?? applyLanguageGuidance(DEFAULT_SYSTEM, request.language);
  const system = attachIntelligenceContext(DEFAULT_SYSTEM, guidance, intelligence);
  return {
    system,
    user: request.content,
    history,
    language: request.language,
    policy: policy ?? request.stylePolicy ?? fallbackGuidance(request.language),
  };
}

/** Fold the policy guidance + conversation intelligence into the base system text. */
function attachIntelligenceContext(
  base: string,
  guidance: string,
  intelligence?: ConversationIntelligence,
): string {
  const parts = [base];
  if (guidance) parts.push(guidance);
  if (intelligence?.activeTopic && !intelligence.isContinuation) {
    parts.push(`The user's current topic is "${intelligence.activeTopic}".`);
  }
  return parts.join("\n");
}

function applyLanguageGuidance(base: string, lang: LanguageStyleMetadata): string {
  const parts = [base];
  if (lang.isMixedLanguage && lang.secondaryLanguage) {
    parts.push(
      `Detected mixed language: ${lang.language} × ${lang.secondaryLanguage}. Respond in the same mixed style.`,
    );
  } else if (lang.language !== "unknown") {
    parts.push(`Detected language: ${lang.language}. Respond in that language.`);
  }
  if (lang.formality === "casual") parts.push("Match a casual tone.");
  else if (lang.formality === "formal") parts.push("Match a formal tone.");
  return parts.join("\n");
}

/**
 * Trim a context to a character budget. Used by the orchestrator to keep the
 * provider within reasonable limits once real memory is added.
 */
export function trimContext(ctx: BuiltContext, charBudget: number): BuiltContext {
  let used = ctx.system.length;
  const history: ContextTurn[] = [];
  for (let i = ctx.history.length - 1; i >= 0; i--) {
    const turn = ctx.history[i];
    if (used + turn.text.length > charBudget) break;
    history.unshift(turn);
    used += turn.text.length;
  }
  return { ...ctx, history };
}

function fallbackGuidance(lang: LanguageStyleMetadata): ResponseStylePolicy {
  return fallbackStylePolicy(lang);
}
