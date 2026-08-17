import { describe, it, expect } from "vitest";
import { createAI } from "@/ai";
import { detectLanguageStyle } from "@/ai/language";
import type { AIRequest, AIResponse } from "@/ai/types";
import { StreamEvent } from "@/ai/types";

/** Helper to build a minimal canonical request like the hook does. */
function makeRequest(text: string): AIRequest {
  return {
    conversationId: "conv_test",
    message: text,
    content: [{ kind: "text", text }],
    language: detectLanguageStyle(text),
    attachments: [],
    metadata: { requestId: "req_1", createdAt: Date.now(), source: "test" },
  };
}

describe("AI request creation", () => {
  it("builds a canonical request with content parts and metadata", () => {
    const req = makeRequest("Hello");
    expect(req.message).toBe("Hello");
    expect(req.content[0]).toMatchObject({ kind: "text", text: "Hello" });
    expect(req.metadata.requestId).toBe("req_1");
    expect(req.language.language).toBe("en");
  });

  it("carries attachment metadata without raw bytes", () => {
    const req: AIRequest = {
      conversationId: null,
      message: "analyze this",
      content: [
        { kind: "text", text: "analyze this" },
        { kind: "attachment", attachmentId: "a1", name: "doc.pdf", mime: "application/pdf", size: 1000, processing: "pending" },
      ],
      language: detectLanguageStyle("analyze this"),
      attachments: [{ id: "a1", kind: "file", name: "doc.pdf", mime: "application/pdf", size: 1000 }],
      metadata: { requestId: "req_2", createdAt: 0, source: "test" },
    };
    expect(req.attachments).toHaveLength(1);
    expect(req.content[1]).toMatchObject({ kind: "attachment", processing: "pending" });
  });
});

describe("AI response + stream events (shape contract)", () => {
  it("an AIResponse is created by the pipeline and carries model + state", async () => {
    const core = createAI();
    const events: StreamEvent[] = [];
    const response: AIResponse = await core.orchestrator.run(
      makeRequest("Hello there"),
      (e) => events.push(e),
    );
    expect(response.state).toBe("completed");
    expect(response.text.length).toBeGreaterThan(0);
    expect(response.model.development).toBe(true);
    expect(response.model.providerId).toBe("development");
    expect(response.usage?.totalTokens).toBeGreaterThan(0);
  });

  it("emits response_started, text_delta(s), usage, and response_completed", async () => {
    const core = createAI();
    const events: StreamEvent[] = [];
    await core.orchestrator.run(makeRequest("Hi"), (e) => events.push(e));
    const types = events.map((e) => e.type);
    expect(types).toContain("response_started");
    expect(types.filter((t) => t === "text_delta").length).toBeGreaterThan(0);
    expect(types).toContain("usage");
    expect(types).toContain("response_completed");
  });
});
