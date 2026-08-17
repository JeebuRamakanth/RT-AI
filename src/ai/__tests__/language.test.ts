import { describe, it, expect } from "vitest";
import { detectLanguage, detectStyle, detectLanguageStyle, languageLabel } from "@/ai/language";

describe("detectLanguage", () => {
  it("detects English", () => {
    const r = detectLanguage("Hello, how are you?");
    expect(r.language).toBe("en");
    expect(r.isMixedLanguage).toBe(false);
    expect(r.secondaryLanguage).toBeNull();
  });

  it("detects Telugu script", () => {
    const r = detectLanguage("నమస్కారం, ఎలా ఉన్నావు?");
    expect(r.language).toBe("te");
    expect(r.isMixedLanguage).toBe(false);
  });

  it("detects Hindi script", () => {
    const r = detectLanguage("नमस्ते, आप कैसे हैं?");
    expect(r.language).toBe("hi");
    expect(r.isMixedLanguage).toBe(false);
  });

  it("detects mixed Telugu × English", () => {
    const r = detectLanguage("ఈ రోజు meeting ఎలా ఉంది?");
    expect(r.isMixedLanguage).toBe(true);
    expect(r.language).toBe("te");
    expect(r.secondaryLanguage).toBe("en");
  });

  it("returns unknown for empty/whitespace", () => {
    expect(detectLanguage("   ").language).toBe("unknown");
  });
});

describe("detectStyle", () => {
  it("flags casual markers", () => {
    const s = detectStyle("hey, can you help me out lol");
    expect(s.formality).toBe("casual");
  });

  it("flags formal markers", () => {
    const s = detectStyle("Could you please assist me with this?");
    expect(s.formality).toBe("formal");
  });

  it("defaults to neutral formality", () => {
    const s = detectStyle("What is the weather today");
    expect(s.formality).toBe("neutral");
  });

  it("tags technical style", () => {
    const s = detectStyle("Refactor the async function and fix the schema error.");
    expect(s.style).toContain("technical");
  });

  it("tags creative style", () => {
    const s = detectStyle("Write me a short story or poem about a dream.");
    expect(s.style).toContain("creative");
  });
});

describe("detectLanguageStyle (combined)", () => {
  it("combines language + style metadata", () => {
    const meta = detectLanguageStyle("నమస్కారం, please help me with this report.");
    expect(meta.language).toBe("te");
    expect(meta.isMixedLanguage).toBe(true);
    expect(meta.secondaryLanguage).toBe("en");
    expect(meta.formality).toBe("formal");
  });

  it("handles pure English casual input", () => {
    const meta = detectLanguageStyle("hey whats up");
    expect(meta.language).toBe("en");
    expect(meta.formality).toBe("casual");
  });
});

describe("languageLabel", () => {
  it("labels single language", () => {
    expect(languageLabel(detectLanguageStyle("Hello there"))).toBe("English");
  });

  it("labels mixed language with × separator", () => {
    const label = languageLabel(detectLanguageStyle("ఈ రోజు meeting ఎలా ఉంది?"));
    expect(label).toBe("Telugu × English");
  });
});
