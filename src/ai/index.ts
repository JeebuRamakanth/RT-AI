/**
 * RT AI Core — public API barrel.
 *
 * Wires the AI Core modules together via a small `createAI()` factory and
 * re-exports the canonical types. The UI (Home composer + useConversation
 * hook) depends only on this seam, never on individual modules, so internals
 * can evolve without touching the Home integration.
 */

import { Orchestrator } from "@/ai/orchestrator";
import { createDefaultRegistry, type ModelRegistry } from "@/ai/registry";
import type { AIProvider, ProviderRegistry } from "@/ai/provider";
import { DevelopmentProvider } from "@/ai/development";
import { setAIConfig, getAIConfig, defaultAIConfig, type AIConfig } from "@/ai/config";

export interface AICore {
  orchestrator: Orchestrator;
  registry: ModelRegistry;
  providers: ProviderRegistry;
}

/**
 * Create a wired AI Core. Step 02 ships only the development provider; a
 * future secure backend can register real providers here without changing
 * the orchestrator, router, or UI contracts.
 */
export function createAI(): AICore {
  const registry = createDefaultRegistry();

  const dev = new DevelopmentProvider();
  const providerMap = new Map<string, AIProvider>();
  providerMap.set(dev.info.id, dev);

  const providers: ProviderRegistry = {
    get: (id) => providerMap.get(id),
    list: () => Array.from(providerMap.values()),
  };

  const orchestrator = new Orchestrator(registry, providers);
  return { orchestrator, registry, providers };
}

export type {
  AIRequest,
  AIResponse,
  StreamEvent,
  ContentPart,
  RequestAttachment,
  ModelPreferences,
  ModelDescriptor,
  ModelCapability,
  ResponseState,
  ConversationMessage,
  ConversationRole,
  AIErrorDescriptor,
  AIErrorKind,
} from "@/ai/types";

export {
  AIError,
  ProviderUnavailableError,
  NetworkError,
  InvalidRequestError,
  TimeoutError,
  CancellationError,
  UnsupportedCapabilityError,
  ConfigurationError,
  toAIError,
  isCancellation,
} from "@/ai/errors";

export {
  detectLanguage,
  detectStyle,
  detectLanguageStyle,
  languageLabel,
  languageName,
  LANGUAGE_SCRIPTS,
  type LanguageStyleMetadata,
  type LanguageCode,
  type LanguageScript,
  type Tone,
  type Formality,
  type StyleTag,
  type Verbosity,
  type TechnicalLevel,
} from "@/ai/language";

export {
  emojiCount,
  hasEmoji,
  buildEmojiProfile,
  preferenceForMessage,
  applyTastefulEmojis,
  type EmojiPreference,
  type EmojiProfile,
} from "@/ai/emoji";

export {
  analyzeIntent,
  extractTopic,
  buildConversationIntelligence,
  topicPhrase,
  intentLabel,
  type UserIntent,
  type UserPreferences,
  type ConversationIntelligence,
  type IntelligenceTurn,
} from "@/ai/intelligence";

export {
  buildStylePolicy,
  fallbackStylePolicy,
  type ResponseStylePolicy,
} from "@/ai/style-policy";

export type { ConversationContext } from "@/ai/orchestrator";

export { getAIConfig, setAIConfig, defaultAIConfig, type AIConfig };
