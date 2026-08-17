import { describe, it, expect } from "vitest";
import {
  analyzeIntent,
  extractTopic,
  buildConversationIntelligence,
  topicPhrase,
  intentLabel,
} from "@/ai/intelligence";
import { detectLanguageStyle } from "@/ai/language";
import type { IntelligenceTurn } from "@/ai/intelligence";

describe("analyzeIntent", () => {
  it("classifies greetings", () => {
    expect(analyzeIntent("Hi", false)).toBe("greeting");
    expect(analyzeIntent("Namaste", false)).toBe("greeting");
  });

  it("classifies translation requests", () => {
    expect(analyzeIntent("translate this to English", false)).toBe("translation");
  });

  it("classifies questions", () => {
    expect(analyzeIntent("What is Agentic AI?", false)).toBe("question");
  });

  it("classifies continuations when flagged", () => {
    expect(analyzeIntent("first module start cheyyi", true)).toBe("continuation");
  });

  it("falls back to unknown for empty input", () => {
    expect(analyzeIntent("", false)).toBe("unknown");
  });
});

describe("extractTopic", () => {
  it("extracts a capitalized technical phrase", () => {
    expect(extractTopic("Naaku Agentic AI nerchukovali")).toBe("Agentic AI");
  });

  it("extracts a known technical token", () => {
    expect(extractTopic("Tell me about react")).toBe("react");
  });

  it("returns null for plain greetings", () => {
    expect(extractTopic("Hi there")).toBeNull();
  });
});

describe("buildConversationIntelligence", () => {
  it("tracks the active topic across turns", () => {
    const history: IntelligenceTurn[] = [
      { role: "user", text: "I want to learn Agentic AI" },
      { role: "assistant", text: "Sure, let's start." },
    ];
    const intel = buildConversationIntelligence(history, "first module start cheyyi", detectLanguageStyle("first module start cheyyi"));
    expect(intel.activeTopic).toBe("Agentic AI");
    expect(intel.intent).toBe("continuation");
  });

  it("resolves a continuation to the active topic", () => {
    const history: IntelligenceTurn[] = [
      { role: "user", text: "What is Agentic AI?" },
      { role: "assistant", text: "It is..." },
    ];
    const intel = buildConversationIntelligence(history, "first module start cheyyi", detectLanguageStyle("first module start cheyyi"));
    expect(intel.isContinuation).toBe(true);
    expect(intel.continuationTopic).toBe("Agentic AI");
    expect(topicPhrase(intel)).toBe("Agentic AI");
  });

  it("does not mark a new-topic turn as continuation", () => {
    const intel = buildConversationIntelligence([], "What is Agentic AI?", detectLanguageStyle("What is Agentic AI?"));
    expect(intel.isContinuation).toBe(false);
    expect(intel.continuationTopic).toBeNull();
  });

  it("accumulates user preferences across turns", () => {
    const history: IntelligenceTurn[] = [
      { role: "user", text: "hey bro lol what's up" },
      { role: "assistant", text: "hey!" },
    ];
    const intel = buildConversationIntelligence(history, "explain it simply please", detectLanguageStyle("explain it simply please"));
    expect(intel.preferences.formality).toBe("casual");
  });
});

describe("intentLabel", () => {
  it("renders a human label for every intent", () => {
    const labels = ["question", "request", "explanation", "task", "greeting", "continuation", "translation", "unknown"].map(intentLabel as never) as string[];
    expect(labels.every((l) => l.length > 0)).toBe(true);
  });
});
