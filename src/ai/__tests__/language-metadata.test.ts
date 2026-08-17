import { describe, it, expect } from "vitest";
import {
  detectLanguage,
  detectStyle,
  detectLanguageStyle,
  languageLabel,
  languageName,
  LANGUAGE_SCRIPTS,
} from "@/ai/language";

describe("detectLanguage (confidence)", () => {
  it("reports a confidence value", () => {
    const r = detectLanguage("Hello, how are you doing today?");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("keeps mixed Telugu × English detection stable", () => {
    const r = detectLanguage("ఈ రోజు meeting ఎలా ఉంది?");
    expect(r.isMixedLanguage).toBe(true);
    expect(r.language).toBe("te");
    expect(r.secondaryLanguage).toBe("en");
    expect(r.confidence).toBeGreaterThan(0.85);
  });

  it("returns low confidence for unknown input", () => {
    expect(detectLanguage("   ").confidence).toBeLessThan(0.5);
  });
});

describe("detectStyle (extended)", () => {
  it("detects verbosity hints", () => {
    expect(detectStyle("Refactor this async function and fix the schema error in depth.").verbosity).toBe("detailed");
    expect(detectStyle("hi").verbosity).toBe("concise");
  });

  it("detects technical level", () => {
    expect(detectStyle("What is an API? Please explain in simple terms.").technicalLevel).toBe("beginner");
    expect(detectStyle("Refactor the async function and fix the schema error.").technicalLevel).toBe("expert");
  });
});

describe("detectLanguageStyle (combined metadata)", () => {
  it("populates languageConfidence, verbosity, technicalLevel, emojiPreference", () => {
    const meta = detectLanguageStyle("Refactor the async function and fix the schema error in depth.");
    expect(meta.languageConfidence).toBeGreaterThan(0);
    expect(meta.verbosity).toBe("detailed");
    expect(meta.technicalLevel).toBe("expert");
    expect(meta.emojiPreference).toBeDefined();
  });

  it("mirrors emoji preference from the message", () => {
    expect(detectLanguageStyle("Super bro 🔥 explain cheyyi").emojiPreference).not.toBe("none");
    expect(detectLanguageStyle("explain the architecture").emojiPreference).toBe("none");
  });
});

describe("script registry extensibility", () => {
  it("lists registered scripts including Telugu and Hindi", () => {
    const codes = LANGUAGE_SCRIPTS.map((s) => s.code);
    expect(codes).toContain("en");
    expect(codes).toContain("te");
    expect(codes).toContain("hi");
  });
});

describe("languageLabel / languageName", () => {
  it("labels mixed language with × separator", () => {
    expect(languageLabel(detectLanguageStyle("ఈ రోజు meeting ఎలా ఉంది?"))).toBe("Telugu × English");
  });
  it("names a bare code", () => {
    expect(languageName("hi")).toBe("Hindi");
    expect(languageName("unknown")).toBe("Auto");
  });
});
