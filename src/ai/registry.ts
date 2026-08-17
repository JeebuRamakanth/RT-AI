/**
 * RT AI Core — model registry.
 *
 * A single source of truth for the models RT AI can route to. Each entry
 * carries its provider, capabilities, streaming support, availability, and
 * priority. The registry is intentionally not hard-coded to one model — new
 * providers/models can be registered without touching the router or the UI.
 */

import type { ModelCapability } from "@/ai/types";

export interface ModelDefinition {
  providerId: string;
  modelId: string;
  /** UI label. For dev models, keep "Development"-style honesty. */
  label: string;
  capabilities: ModelCapability[];
  /** True when the model emits streamed text deltas. */
  streaming: boolean;
  /** Available for routing right now. */
  available: boolean;
  /** Lower number = preferred when multiple candidates match. */
  priority: number;
  /** True for development/mock models — never fake as production AI. */
  development: boolean;
}

export class ModelRegistry {
  private readonly models = new Map<string, ModelDefinition>();

  register(model: ModelDefinition): void {
    const key = this.key(model.providerId, model.modelId);
    this.models.set(key, { ...model });
  }

  get(providerId: string, modelId: string): ModelDefinition | undefined {
    return this.models.get(this.key(providerId, modelId));
  }

  list(): ModelDefinition[] {
    return Array.from(this.models.values()).sort((a, b) => a.priority - b.priority);
  }

  available(): ModelDefinition[] {
    return this.list().filter((m) => m.available);
  }

  byProvider(providerId: string): ModelDefinition[] {
    return this.list().filter((m) => m.providerId === providerId);
  }

  private key(providerId: string, modelId: string): string {
    return `${providerId}:${modelId}`;
  }
}

/** The default Step 02 registry — development provider only. */
export function createDefaultRegistry(): ModelRegistry {
  const registry = new ModelRegistry();
  registry.register({
    providerId: "development",
    modelId: "rt-dev-default",
    label: "RT Development",
    capabilities: ["text", "streaming"],
    streaming: true,
    available: true,
    priority: 100,
    development: true,
  });
  return registry;
}
