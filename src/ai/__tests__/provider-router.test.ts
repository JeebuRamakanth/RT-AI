import { describe, it, expect } from "vitest";
import { createAI } from "@/ai";
import { createDefaultRegistry, ModelRegistry } from "@/ai/registry";
import { ModelRouter } from "@/ai/router";
import { detectLanguageStyle } from "@/ai/language";
import type { AIRequest } from "@/ai/types";

function req(text: string): AIRequest {
  return {
    conversationId: null,
    message: text,
    content: [{ kind: "text", text }],
    language: detectLanguageStyle(text),
    attachments: [],
    metadata: { requestId: "r", createdAt: 0, source: "test" },
  };
}

describe("provider interface", () => {
  it("exposes the development provider with honest metadata", () => {
    const core = createAI();
    const dev = core.providers.get("development");
    expect(dev).toBeDefined();
    expect(dev!.info.development).toBe(true);
    expect(dev!.info.available).toBe(true);
    expect(dev!.info.models[0].streaming).toBe(true);
  });

  it("list() returns registered providers", () => {
    const core = createAI();
    expect(core.providers.list()).toHaveLength(1);
    expect(core.providers.list()[0].info.id).toBe("development");
  });
});

describe("model registry", () => {
  it("registers and retrieves models by provider+id", () => {
    const r = new ModelRegistry();
    r.register({
      providerId: "p",
      modelId: "m",
      label: "Model",
      capabilities: ["text"],
      streaming: true,
      available: true,
      priority: 1,
      development: false,
    });
    expect(r.get("p", "m")?.label).toBe("Model");
    expect(r.get("p", "x")).toBeUndefined();
  });

  it("only available models are returned by available()", () => {
    const r = new ModelRegistry();
    r.register({ providerId: "p", modelId: "a", label: "A", capabilities: ["text"], streaming: true, available: true, priority: 1, development: false });
    r.register({ providerId: "p", modelId: "b", label: "B", capabilities: ["text"], streaming: true, available: false, priority: 2, development: false });
    expect(r.available().map((m) => m.modelId)).toEqual(["a"]);
  });

  it("default registry ships the development model", () => {
    const r = createDefaultRegistry();
    expect(r.available()).toHaveLength(1);
    expect(r.available()[0].development).toBe(true);
  });
});

describe("model router", () => {
  it("selects the highest-priority available text+streaming model", () => {
    const core = createAI();
    const router = new ModelRouter(core.registry);
    const decision = router.route(req("Hello"));
    expect(decision.providerId).toBe("development");
    expect(decision.modelId).toBe("rt-dev-default");
  });

  it("honours an explicit provider preference", () => {
    const core = createAI();
    const router = new ModelRouter(core.registry);
    const decision = router.route({
      ...req("Hello"),
      preferences: { providerId: "development", stream: true },
    });
    expect(decision.providerId).toBe("development");
  });

  it("throws when no model is available", () => {
    const r = new ModelRegistry();
    const router = new ModelRouter(r);
    expect(() => router.route(req("Hi"))).toThrow();
  });
});
