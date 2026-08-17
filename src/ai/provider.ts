/**
 * RT AI Core — provider abstraction.
 *
 * The application is never coupled to one provider. A provider implements a
 * small streaming interface over the canonical request. Provider-specific
 * response shapes are normalized into canonical events before they reach the
 * UI. The interface is designed to support future text, multimodal,
 * structured output, tool calling, and streaming capabilities without
 * changing its shape.
 *
 * SECURITY: Providers must NOT receive or return secrets through this
 * interface. Credential acquisition is a backend concern — a future secure
 * API gateway will handle real provider keys. The development provider
 * requires no secrets.
 */

import type { AIRequest, ModelCapability, StreamEvent } from "@/ai/types";

export interface ProviderModelInfo {
  modelId: string;
  label: string;
  capabilities: ModelCapability[];
  /** Whether this model streams text deltas. */
  streaming: boolean;
}

export interface ProviderInfo {
  id: string;
  /** Human label shown in the UI. */
  label: string;
  /** True for development/mock providers — never fake as production. */
  development: boolean;
  models: ProviderModelInfo[];
  /** Whether the provider is currently usable without secrets/backend. */
  available: boolean;
}

/**
 * A streaming provider emits canonical stream events as they occur and
 * resolves when the response is fully complete (or rejects with an AIError).
 * Cancellation is honoured via the supplied AbortSignal.
 */
export interface AIProvider {
  readonly info: ProviderInfo;

  /**
   * Stream a response for the given request. The async iterable yields
   * canonical StreamEvent values; the orchestrator surfaces them to the UI.
   * If `signal` aborts, the provider should stop producing and reject with a
   * CancellationError (handled upstream).
   */
  stream(
    request: AIRequest,
    modelId: string,
    signal: AbortSignal,
  ): AsyncIterable<StreamEvent>;
}

/** Registry of available providers keyed by id. */
export interface ProviderRegistry {
  get(id: string): AIProvider | undefined;
  list(): AIProvider[];
}
