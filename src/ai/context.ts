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
 * outputs.
 */

import type { AIRequest, ContentPart } from "@/ai/types";
import type { LanguageStyleMetadata } from "@/ai/language";

export interface BuiltContext {
  /** RT AI-authored system instructions — never derived from user text. */
  system: string;
  /** The user turn, as content parts. */
  user: ContentPart[];
  /** Conversation turns carried into the request (future: memory window). */
  history: ContextTurn[];
  /** Language/style metadata passed through to the provider. */
  language: LanguageStyleMetadata;
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
 * Build the context for a request. Future steps will add memory retrieval,
 * RAG passages, and per-task system instructions — all through this seam.
 */
export function buildContext(request: AIRequest, history: ContextTurn[] = []): BuiltContext {
  const system = applyLanguageGuidance(DEFAULT_SYSTEM, request.language);
  return {
    system,
    user: request.content,
    history,
    language: request.language,
  };
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
