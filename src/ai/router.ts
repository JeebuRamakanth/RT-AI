/**
 * RT AI Core — model router.
 *
 * Selects a model for a given request. Step 02 uses simple deterministic
 * rules: honour explicit preferences, otherwise pick the highest-priority
 * available model that supports the required capability (text + streaming
 * when preferred). The interface is designed so future selection can account
 * for task, modality, quality, latency, availability, and cost — without
 * changing the router's callers.
 */

import type { AIRequest, ModelDescriptor } from "@/ai/types";
import { ModelRegistry, type ModelDefinition } from "@/ai/registry";

export interface RouteDecision {
  providerId: string;
  modelId: string;
  /** The resolved model definition (for the orchestrator/provider). */
  model: ModelDefinition;
}

export class ModelRouter {
  constructor(private readonly registry: ModelRegistry) {}

  route(request: AIRequest): RouteDecision {
    const available = this.registry.available();
    if (available.length === 0) {
      throw new NoAvailableModelError("No AI model is available.");
    }

    // 1) Explicit preference for a specific provider+model.
    const pref = request.preferences;
    if (pref?.providerId && pref?.modelId) {
      const m = this.registry.get(pref.providerId, pref.modelId);
      if (m && m.available) return this.toDecision(m);
    }
    if (pref?.modelId) {
      const m = available.find((x) => x.modelId === pref.modelId);
      if (m) return this.toDecision(m);
    }
    if (pref?.providerId) {
      const byProvider = available
        .filter((x) => x.providerId === pref.providerId)
        .sort((a, b) => a.priority - b.priority);
      if (byProvider[0]) return this.toDecision(byProvider[0]);
    }

    // 2) Capability match: text is always required; streaming when preferred.
    const wantStreaming = pref?.stream ?? true;
    const capable = available
      .filter((m) => m.capabilities.includes("text"))
      .filter((m) => (wantStreaming ? m.streaming : true))
      .sort((a, b) => a.priority - b.priority);

    const chosen = capable[0] ?? available[0];
    return this.toDecision(chosen);
  }

  private toDecision(m: ModelDefinition): RouteDecision {
    return { providerId: m.providerId, modelId: m.modelId, model: m };
  }
}

export class NoAvailableModelError extends Error {
  constructor(message = "No AI model is available.") {
    super(message);
    this.name = "NoAvailableModelError";
  }
}

/** Build a UI-safe ModelDescriptor from a route decision. */
export function describeModel(m: ModelDefinition): ModelDescriptor {
  return {
    providerId: m.providerId,
    modelId: m.modelId,
    label: m.label,
    development: m.development,
    capabilities: m.capabilities,
  };
}
