/**
 * Conversation intelligence integration tests. Drives the orchestrator with
 * prior history to verify topic tracking, conversational continuity,
 * mixed-language + style mirroring, and tasteful emoji behaviour end-to-end.
 */

import { describe, it, expect } from "vitest";
import { createAI } from "@/ai";
import { detectLanguageStyle } from "@/ai/language";
import { emojiCount } from "@/ai/emoji";
import type { AIRequest, StreamEvent } from "@/ai/types";

function req(text: string): AIRequest {
  return {
    conversationId: null,
    message: text,
    content: [{ kind: "text", text }],
    language: detectLanguageStyle(text),
    attachments: [],
    metadata: { requestId: "ci_req", createdAt: Date.now(), source: "test" },
  };
}

describe("conversation continuity", () => {
  it("resolves a follow-up to the active topic from prior turns", async () => {
    const core = createAI();
    const history = [
      { role: "user" as const, text: "I want to learn Agentic AI" },
      { role: "assistant" as const, text: "Sure, let's begin." },
    ];
    const response = await core.orchestrator.run(
      req("first module start cheyyi"),
      () => {},
      undefined,
      { history },
    );
    expect(response.state).toBe("completed");
    expect(response.text).toContain("Agentic AI");
    expect(response.text.toLowerCase()).toContain("follow-up");
  });

  it("carries conversation intelligence onto the request", async () => {
    const core = createAI();
    const history = [
      { role: "user" as const, text: "What is Agentic AI?" },
      { role: "assistant" as const, text: "An agent that acts autonomously." },
    ];
    const response = await core.orchestrator.run(
      req("explain more"),
      () => {},
      undefined,
      { history },
    );
    expect(response.state).toBe("completed");
    expect(response.text).toContain("Intent:");
  });
});

describe("mixed-language + style mirroring", () => {
  it("mirrors mixed Telugu × English with casual style", async () => {
    const core = createAI();
    const response = await core.orchestrator.run(
      req("Super bro 🔥 Agentic AI గురించి explain cheyyi"),
      () => {},
    );
    expect(response.state).toBe("completed");
    expect(response.text).toContain("Telugu × English");
    expect(response.text.toLowerCase()).toContain("casual");
  });
});

describe("polite / formal turn", () => {
  it("marks a formal request and avoids casual tone", async () => {
    const core = createAI();
    const response = await core.orchestrator.run(
      req("Could you please explain Agentic AI in detail?"),
      () => {},
    );
    expect(response.state).toBe("completed");
    expect(response.text.toLowerCase()).toContain("formal");
  });
});

describe("emoji behaviour", () => {
  it("keeps emojis out of sober, emoji-free input", async () => {
    const core = createAI();
    const response = await core.orchestrator.run(
      req("Explain the runtime architecture."),
      () => {},
    );
    expect(response.state).toBe("completed");
    // The dev response should not be sprinkled with emojis when the user
    // used none.
    expect(emojiCount(response.text)).toBe(0);
  });

  it("mirrors a tasteful emoji when the user uses one", async () => {
    const core = createAI();
    const response = await core.orchestrator.run(
      req("Super bro 🔥 explain cheyyi"),
      () => {},
    );
    expect(response.state).toBe("completed");
    // With a sparse/moderate emoji preference, the dev provider may add a few
    // tasteful emojis — assert it never exceeds a small, courteous budget.
    expect(emojiCount(response.text)).toBeLessThanOrEqual(3);
  });

  it("honours a greeting intent with a greeting tone", async () => {
    const core = createAI();
    const events: StreamEvent[] = [];
    const response = await core.orchestrator.run(req("Hi"), (e) => events.push(e));
    expect(response.state).toBe("completed");
    expect(response.text.toLowerCase()).toContain("greeting");
  });
});
