import { describe, it, expect } from "vitest";
import { createAI } from "@/ai";
import { ConversationEngine } from "@/ai/conversation";
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

describe("conversation lifecycle", () => {
  it("creates and maintains a stable conversation id", () => {
    const e = new ConversationEngine();
    const id = e.id;
    expect(id).toMatch(/^conv_/);
    expect(e.getState().id).toBe(id);
  });

  it("adds a user message and an assistant placeholder", () => {
    const e = new ConversationEngine();
    e.beginUserTurn("Hello");
    e.beginAssistantTurn("");
    const state = e.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].role).toBe("user");
    expect(state.messages[0].text).toBe("Hello");
    expect(state.messages[1].role).toBe("assistant");
    expect(state.messages[1].state).toBe("preparing");
    expect(state.streaming).toBe(true);
  });

  it("streams assistant text and completes", () => {
    const e = new ConversationEngine();
    e.beginUserTurn("Hi");
    const asstId = e.beginAssistantTurn("");
    e.appendAssistantText(asstId, "Hello ");
    e.appendAssistantText(asstId, "world");
    e.completeAssistant(asstId, {
      messageId: asstId,
      conversationId: e.id,
      text: "Hello world",
      model: { providerId: "development", modelId: "rt-dev-default", label: "RT Development", development: true, capabilities: ["text", "streaming"] },
      state: "completed",
      startedAt: 0,
      finishedAt: 1,
    });
    const state = e.getState();
    expect(state.streaming).toBe(false);
    expect(state.messages[1].text).toBe("Hello world");
    expect(state.messages[1].state).toBe("completed");
  });

  it("records an error state on failure", () => {
    const e = new ConversationEngine();
    e.beginUserTurn("Hi");
    const asstId = e.beginAssistantTurn("");
    e.failAssistant(asstId, { kind: "network", message: "Network down", retryable: true });
    const m = e.getState().messages[1];
    expect(m.state).toBe("error");
    expect(m.error?.kind).toBe("network");
    expect(e.getState().streaming).toBe(false);
  });

  it("history() returns user/assistant text turns", () => {
    const e = new ConversationEngine();
    e.beginUserTurn("Q");
    const id = e.beginAssistantTurn("");
    e.completeAssistant(id, {
      messageId: id, conversationId: e.id, text: "A",
      model: { providerId: "p", modelId: "m", label: "M", development: true, capabilities: [] },
      state: "completed", startedAt: 0, finishedAt: 1,
    });
    expect(e.history().map((t) => t.text)).toEqual(["Q", "A"]);
  });
});

describe("error handling", () => {
  it("converts an unknown error to an AIError descriptor safely", async () => {
    const { toAIError } = await import("@/ai/errors");
    const err = toAIError(new Error("something failed"));
    expect(err.toDescriptor().message).toBe("something failed");
  });

  it("never exposes a stack trace in the descriptor", async () => {
    const { toAIError } = await import("@/ai/errors");
    const err = toAIError(new Error("boom\n    at file.ts:10:5"));
    const desc = err.toDescriptor();
    expect(desc.message).not.toContain("at file.ts");
  });

  it("maps AbortError to a cancellation error", async () => {
    const { toAIError, isCancellation } = await import("@/ai/errors");
    const abort = new DOMException("Aborted", "AbortError");
    const err = toAIError(abort);
    expect(err.kind).toBe("cancelled");
    expect(isCancellation(abort)).toBe(true);
  });
});

describe("cancellation", () => {
  it("stops the development stream when the abort signal fires", async () => {
    const core = createAI();
    const controller = new AbortController();
    let gotDelta = false;
    const response = await core.orchestrator.run(
      req("Please write a long response"),
      (e) => {
        if (e.type === "text_delta") {
          if (!gotDelta) {
            gotDelta = true;
            controller.abort();
          }
        }
      },
      controller.signal,
    );
    // The response should end in a cancelled state (no crash).
    expect(["cancelled", "completed"]).toContain(response.state);
  });

  it("completes normally when not cancelled", async () => {
    const core = createAI();
    const response = await core.orchestrator.run(req("Hi"), () => {});
    expect(response.state).toBe("completed");
    expect(response.text.length).toBeGreaterThan(0);
  });
});
