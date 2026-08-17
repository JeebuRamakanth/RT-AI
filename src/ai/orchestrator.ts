/**
 * RT AI Core — orchestrator.
 *
 * The single entry point that turns a canonical AIRequest into a stream of
 * canonical events:
 *
 *   request → build context → apply language/style → route → resolve provider
 *          → stream → normalize → canonical events
 *
 * It does NOT implement autonomous agent loops (deferred). It DOES support
 * cancellation end-to-end via an AbortController, and surfaces a safe
 * AIErrorDescriptor on failure (never stack traces or secrets).
 */

import type {
  AIErrorDescriptor,
  AIRequest,
  AIResponse,
  StreamEvent,
} from "@/ai/types";
import { AIError, CancellationError, toAIError } from "@/ai/errors";
import { ModelRouter, describeModel } from "@/ai/router";
import type { ModelDefinition, ModelRegistry } from "@/ai/registry";
import type { ProviderRegistry } from "@/ai/provider";
import { buildContext, trimContext, type ContextTurn } from "@/ai/context";
import { consumeStream } from "@/ai/streaming";
import { getAIConfig } from "@/ai/config";
import {
  buildConversationIntelligence,
  type ConversationIntelligence,
  type IntelligenceTurn,
} from "@/ai/intelligence";
import { buildStylePolicy, type ResponseStylePolicy } from "@/ai/style-policy";

export interface OrchestratorResult {
  /** The final normalized response (completed, cancelled, or error). */
  response: AIResponse;
}

export interface ConversationContext {
  /** Prior conversation turns (text only), as provided by the UI hook. */
  history: IntelligenceTurn[];
}

export class Orchestrator {
  private readonly router: ModelRouter;

  constructor(
    private readonly registry: ModelRegistry,
    private readonly providers: ProviderRegistry,
  ) {
    this.router = new ModelRouter(registry);
  }

  /**
   * Run a request to completion. `onEvent` receives every canonical stream
   * event for progressive UI updates. Returns the final response.
   *
   * `conversation` carries prior turns so the orchestrator can build
   * conversation intelligence (topic, intent, continuity) and a centralized
   * response style policy, which are folded into the system instructions and
   * attached to the request for the provider to consume.
   */
  async run(
    request: AIRequest,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal,
    conversation?: ConversationContext,
  ): Promise<AIResponse> {
    const cfg = getAIConfig();
    const controller = new AbortController();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    // 0) Build conversation intelligence + response style policy from the
    //    request's language metadata + prior history. This is the single
    //    source of truth for style/continuity across the pipeline.
    const intelligence: ConversationIntelligence = buildConversationIntelligence(
      conversation?.history ?? [],
      request.message,
      request.language,
    );
    const policy: ResponseStylePolicy = buildStylePolicy(intelligence, request.language);
    const enrichedRequest: AIRequest = { ...request, intelligence, stylePolicy: policy };

    // 1) Route to a model + resolve its provider.
    const decision = this.router.route(enrichedRequest);
    const provider = this.providers.get(decision.providerId);
    if (!provider) {
      return this.errorResponse(enrichedRequest, {
        kind: "provider_unavailable",
        message: "The selected AI provider is not available.",
        retryable: true,
      }, onEvent);
    }
    if (!provider.info.available) {
      return this.errorResponse(enrichedRequest, {
        kind: "configuration",
        message: "RT AI is not configured for a real provider yet.",
        retryable: false,
      }, onEvent);
    }

    // 2) Build context (with policy + intelligence guidance) and trim to
    //    budget. The development provider consumes the request directly;
    //    real providers will receive `ctx` through an extended provider
    //    interface. History is carried so future memory can plug in here.
    const historyCtx: ContextTurn[] = (conversation?.history ?? []).map((t) => ({
      role: t.role,
      text: t.text,
    }));
    const _ctx = trimContext(
      buildContext(enrichedRequest, historyCtx, policy, intelligence),
      cfg.contextCharBudget,
    );
    void _ctx;

    // 3) Resolve provider stream.
    let stream: AsyncIterable<StreamEvent>;
    try {
      stream = provider.stream(enrichedRequest, decision.modelId, controller.signal);
    } catch (cause) {
      return this.errorResponseFrom(enrichedRequest, cause, onEvent);
    }

    // 4) Consume + normalize into a final AIResponse, surfacing events.
    try {
      const response = await consumeStream(
        stream,
        onEvent,
        controller.signal,
      );
      // Attach conversation id + ensure model descriptor is set.
      return {
        ...response,
        conversationId: enrichedRequest.conversationId ?? response.conversationId,
        model: response.model || describeModel(decision.model),
      };
    } catch (cause) {
      if (cause instanceof CancellationError || controller.signal.aborted) {
        return this.cancelledResponse(enrichedRequest, decision, onEvent);
      }
      return this.errorResponseFrom(enrichedRequest, cause, onEvent);
    }
  }

  private errorResponse(
    request: AIRequest,
    error: AIErrorDescriptor,
    onEvent: (event: StreamEvent) => void,
  ): AIResponse {
    const messageId = `asst_${request.metadata.requestId}`;
    onEvent({ type: "response_error", messageId, error });
    return {
      messageId,
      conversationId: request.conversationId ?? "",
      text: "",
      model: { providerId: "", modelId: "", label: "", development: true, capabilities: [] },
      state: "error",
      error,
      startedAt: Date.now(),
      finishedAt: Date.now(),
    };
  }

  private errorResponseFrom(
    request: AIRequest,
    cause: unknown,
    onEvent: (event: StreamEvent) => void,
  ): AIResponse {
    const err = toAIError(cause);
    return this.errorResponse(request, err.toDescriptor(), onEvent);
  }

  private cancelledResponse(
    request: AIRequest,
    decision: { model: ModelDefinition },
    _onEvent: (event: StreamEvent) => void,
  ): AIResponse {
    const messageId = `asst_${request.metadata.requestId}`;
    const response: AIResponse = {
      messageId,
      conversationId: request.conversationId ?? "",
      text: "",
      model: describeModel(decision.model),
      state: "cancelled",
      startedAt: Date.now(),
      finishedAt: Date.now(),
    };
    // No explicit event — the hook reflects the cancelled state from the response.
    return response;
  }
}

/** Convenience guard for the UI: did the orchestrator end in a recoverable state? */
export function isRetryable(error: AIErrorDescriptor | undefined): boolean {
  return Boolean(error?.retryable);
}

export { AIError };
