/**
 * RT AI Core — emoji intelligence.
 *
 * Detects the user's emoji usage and computes a tasteful emoji preference.
 * The preference feeds the response style policy so responses mirror the
 * user's expressive register: a user who writes with emojis gets a few
 * tasteful emojis back; a user who never uses them gets none.
 *
 * DESIGN RULE: emojis are a deliberate, sparing courtesy — never decorative
 * spam. `applyTastefulEmojis` only inserts a small number of well-matched
 * emojis for clearly-appropriate cues, and only when the preference allows.
 * Output quality never depends on emojis; they are an accent, not content.
 */

/* ------------------------------------------------------------------ */
/* Emoji presence + counting                                            */
/* ------------------------------------------------------------------ */

// Broad emoji coverage: pictographs, symbols, dingbats, and keycaps.
const EMOJI_REGEX = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}]/u;

export function emojiCount(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (EMOJI_REGEX.test(ch)) count++;
  }
  return count;
}

export function hasEmoji(text: string): boolean {
  return EMOJI_REGEX.test(text);
}

/* ------------------------------------------------------------------ */
/* Emoji preference                                                     */
/* ------------------------------------------------------------------ */

/**
 * Emoji preference bucket. Drives how many emojis (if any) a response may
 * carry. "none" is the safe default for users who never use emojis — the
 * system must never inject expressive emojis into a sober conversation.
 */
export type EmojiPreference = "none" | "sparse" | "moderate" | "expressive";

export interface EmojiProfile {
  /** Total emojis observed across the sampled messages. */
  total: number;
  /** Messages sampled. */
  samples: number;
  /** Average emojis per message. */
  perMessage: number;
  /** Derived preference bucket. */
  preference: EmojiPreference;
}

/**
 * Build an emoji profile from a set of (user) messages. Empty input yields a
 * neutral "none" preference — the honest default before we know the user.
 */
export function buildEmojiProfile(messages: string[]): EmojiProfile {
  const samples = messages.length;
  if (samples === 0) {
    return { total: 0, samples: 0, perMessage: 0, preference: "none" };
  }
  let total = 0;
  for (const m of messages) total += emojiCount(m);
  const perMessage = total / samples;
  return {
    total,
    samples,
    perMessage,
    preference: bucketize(perMessage, samples),
  };
}

function bucketize(perMessage: number, samples: number): EmojiPreference {
  // With very few samples, stay conservative so one emoji-laden message does
  // not flip the whole conversation to "expressive".
  if (samples < 2 && perMessage <= 1) return "sparse";
  if (perMessage === 0) return "none";
  if (perMessage <= 1) return "sparse";
  if (perMessage <= 3) return "moderate";
  return "expressive";
}

/** Derive a preference from a single message (used for the first turn). */
export function preferenceForMessage(text: string): EmojiPreference {
  const n = emojiCount(text);
  if (n === 0) return "none";
  if (n <= 1) return "sparse";
  if (n <= 3) return "moderate";
  return "expressive";
}

/* ------------------------------------------------------------------ */
/* Tasteful application                                                  */
/* ------------------------------------------------------------------ */

/**
 * Cue → emoji. Intentionally small and high-signal: each cue maps to one
 * emoji that is safe across languages and registers. Tone is warm but never
 * unprofessional.
 */
const EMOJI_CUES: Array<{ cue: RegExp; emoji: string }> = [
  { cue: /\b(thanks|thank you|cheers|grateful|appreciate)\b/i, emoji: "🙏" },
  { cue: /\b(done|complete|finished|ready|shipped|built)\b/i, emoji: "✅" },
  { cue: /\b(perfect|great|awesome|excellent|nice|wonderful|spot on)\b/i, emoji: "✨" },
  { cue: /\b(idea|insight|tip|suggestion|try this)\b/i, emoji: "💡" },
  { cue: /\b(warning|careful|important|caution|watch out|note)\b/i, emoji: "⚠️" },
  { cue: /\b(error|failed|issue|problem|wrong|broken)\b/i, emoji: "❗" },
  { cue: /\b(fire|amazing|incredible|love it|powerful)\b/i, emoji: "🔥" },
  { cue: /\b(rocket|launch|ship it|deploy|release)\b/i, emoji: "🚀" },
  { cue: /\b(learn|understand|explain|guide|teach)\b/i, emoji: "📖" },
  { cue: /\b(milestone|step \d|first|next step|roadmap)\b/i, emoji: "🎯" },
];

/**
 * Apply a small number of tasteful emojis to a response, gated by the user's
 * preference. Emojis are appended inline after the first matched cue-bearing
 * sentence and never more than `budgetFor` occurrences. When preference is
 * "none", the text is returned untouched.
 *
 * This is used by the development provider to demonstrate the emoji
 * intelligence end-to-end. Real providers receive the preference through the
 * style policy and may apply it in their own generation.
 */
export function applyTastefulEmojis(text: string, preference: EmojiPreference): string {
  if (preference === "none") return text;

  const budget = budgetFor(preference);
  if (budget <= 0) return text;

  const sentences = splitSentences(text);
  let used = 0;
  // Track which emojis we've placed to avoid repetition within one response.
  const placed = new Set<string>();

  for (let i = 0; i < sentences.length && used < budget; i++) {
    const sentence = sentences[i];
    for (const { cue, emoji } of EMOJI_CUES) {
      if (placed.has(emoji)) continue;
      if (cue.test(sentence)) {
        sentences[i] = appendEmoji(sentence, emoji);
        placed.add(emoji);
        used++;
        break;
      }
    }
  }
  return sentences.join("");
}

function budgetFor(preference: EmojiPreference): number {
  switch (preference) {
    case "none":
      return 0;
    case "sparse":
      return 1;
    case "moderate":
      return 2;
    case "expressive":
      return 3;
  }
}

/** Split text into sentences while preserving the separators so we can rejoin. */
function splitSentences(text: string): string[] {
  // Keep trailing separators (., !, ?, newline) attached to each sentence.
  const parts = text.match(/[^.!?\n]+[.!?\n]*\s*/g);
  return parts ?? [text];
}

function appendEmoji(sentence: string, emoji: string): string {
  const trimmed = sentence.replace(/\s+$/, "");
  // Place the emoji right after the sentence terminator (or end), then
  // restore any trailing whitespace we trimmed.
  const trailing = sentence.slice(trimmed.length);
  return `${trimmed} ${emoji}${trailing}`;
}
