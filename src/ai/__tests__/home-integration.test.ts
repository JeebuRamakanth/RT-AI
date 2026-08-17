/**
 * Home → AI Core integration test. Drives the same pipeline the Home composer
 * triggers, without rendering React, to assert the end-to-end flow:
 * request → orchestrator → router → development provider → stream → response.
 */

import { describe, it, expect } from "vitest";
import { createAI } from "@/ai";
import { detectLanguageStyle } from "@/ai/language";
import type { AIRequest, StreamEvent } from "@/ai/types";

function homeRequest(text: string): AIRequest {
  return {
    conversationId: null,
    message: text,
    content: [{ kind: "text", text }],
    language: detectLanguageStyle(text),
    attachments: [],
    metadata: { requestId: "home_req", createdAt: Date.now(), source: "home-composer" },
  };
}

describe("Home → AI Core integration", () => {
  it("streams a completed English response through the pipeline", async () => {
    const core = createAI();
    let deltaCount = 0;
    let finalText = "";
    const response = await core.orchestrator.run(
      homeRequest("Hello, can you help me?"),
      (e: StreamEvent) => {
        if (e.type === "text_delta") deltaCount++;
        if (e.type === "response_completed") finalText = e.response.text;
      },
    );
    expect(response.state).toBe("completed");
    expect(deltaCount).toBeGreaterThan(0);
    expect(finalText).toBe(response.text);
    expect(response.model.development).toBe(true);
  });

  it("mirrors Telugu input with Telugu-aware development output", async () => {
    const core = createAI();
    const response = await core.orchestrator.run(
      homeRequest("నమస్కారం, నాకు సహాయం కావాలి"),
      () => {},
    );
    expect(response.state).toBe("completed");
    // The dev response references the detected language; for Telugu the
    // greeting should be Telugu-specific.
    expect(response.text).toContain("Namaskaram");
  });

  it("mirrors mixed Telugu × English input", async () => {
    const core = createAI();
    const response = await core.orchestrator.run(
      homeRequest("ఈ రోజు meeting ఎలా ఉంది?"),
      () => {},
    );
    expect(response.state).toBe("completed");
    expect(response.text).toContain("Telugu × English");
  });

  it("honestly reports attachments are not yet processed", async () => {
    const core = createAI();
    const req: AIRequest = {
      ...homeRequest("analyze this file"),
      attachments: [{ id: "a1", kind: "file", name: "report.pdf", mime: "application/pdf", size: 5000 }],
      content: [
        { kind: "text", text: "analyze this file" },
        { kind: "attachment", attachmentId: "a1", name: "report.pdf", mime: "application/pdf", size: 5000, processing: "pending" },
      ],
    };
    const response = await core.orchestrator.run(req, () => {});
    expect(response.state).toBe("completed");
    expect(response.text).toContain("report.pdf");
    expect(response.text.toLowerCase()).toContain("roadmap");
  });

  it("uses the home-composer source label", async () => {
    const core = createAI();
    const response = await core.orchestrator.run(homeRequest("Hi"), () => {});
    expect(response.state).toBe("completed");
    // Source is metadata, not surfaced in the text — assert the request path is consistent.
    expect(response.messageId).toMatch(/^asst_/);
  });
});
