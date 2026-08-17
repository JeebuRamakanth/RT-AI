import { describe, it, expect } from "vitest";
import {
  emojiCount,
  hasEmoji,
  buildEmojiProfile,
  preferenceForMessage,
  applyTastefulEmojis,
} from "@/ai/emoji";

describe("emojiCount / hasEmoji", () => {
  it("counts emojis in a string", () => {
    expect(emojiCount("Super bro 🔥")).toBe(1);
    expect(emojiCount("🎉🎉 done ✅")).toBe(3);
    expect(emojiCount("no emojis here")).toBe(0);
  });

  it("detects presence of emojis", () => {
    expect(hasEmoji("hello 👋")).toBe(true);
    expect(hasEmoji("plain text")).toBe(false);
  });
});

describe("buildEmojiProfile", () => {
  it("defaults to none for empty input", () => {
    const p = buildEmojiProfile([]);
    expect(p.preference).toBe("none");
    expect(p.perMessage).toBe(0);
  });

  it("classifies a sober conversation as none", () => {
    const p = buildEmojiProfile([
      "What is Agentic AI?",
      "Explain the runtime architecture.",
    ]);
    expect(p.preference).toBe("none");
  });

  it("classifies emoji-heavy conversation as expressive", () => {
    const p = buildEmojiProfile([
      "Super bro 🔥🔥🔥🔥",
      "amazing 🚀🚀🎉🚀",
    ]);
    expect(p.perMessage).toBeGreaterThan(3);
    expect(p.preference).toBe("expressive");
  });

  it("is conservative with a single short sample", () => {
    const p = buildEmojiProfile(["ok 🔥"]);
    expect(p.preference).toBe("sparse");
  });
});

describe("preferenceForMessage", () => {
  it("returns none for messages without emojis", () => {
    expect(preferenceForMessage("explain the API schema")).toBe("none");
  });

  it("escalates with emoji density", () => {
    expect(preferenceForMessage("hey 👋")).toBe("sparse");
    expect(preferenceForMessage("great ✨✨✨")).toBe("moderate");
    expect(preferenceForMessage("🔥🔥🔥🔥")).toBe("expressive");
  });
});

describe("applyTastefulEmojis", () => {
  it("leaves text untouched when preference is none", () => {
    const out = applyTastefulEmojis("Done. Here is the answer.", "none");
    expect(out).toBe("Done. Here is the answer.");
  });

  it("adds at most one emoji for sparse preference", () => {
    const out = applyTastefulEmojis("Done. This is the next step.", "sparse");
    const added = emojiCount(out) - emojiCount("Done. This is the next step.");
    expect(added).toBe(1);
  });

  it("never repeats the same emoji within a response", () => {
    const out = applyTastefulEmojis(
      "Done. Great idea. Perfect. Another done step.",
      "moderate",
    );
    // The "done" cue maps to ✅ and should appear at most once even though it
    // matches twice.
    const checkmarks = (out.match(/✅/g) ?? []).length;
    expect(checkmarks).toBeLessThanOrEqual(1);
  });

  it("respects the budget for expressive preference", () => {
    const out = applyTastefulEmojis(
      "Done. Great. Perfect. Idea. Warning. Love it.",
      "expressive",
    );
    // Budget for expressive is 3 — never more than 3 inserted emojis.
    const added = emojiCount(out) - emojiCount("Done. Great. Perfect. Idea. Warning. Love it.");
    expect(added).toBeLessThanOrEqual(3);
  });

  it("does not corrupt text when no cues match", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    const out = applyTastefulEmojis(text, "moderate");
    expect(out).toBe(text);
  });
});
