/**
 * RT AI Core — conversation intelligence.
 *
 * A layer on top of the conversation engine that derives, per turn, a
 * structured picture of the conversation: the active topic, the user's
 * intent, accumulated preferences, and continuity with prior turns. The
 * orchestrator consumes this (via the response style policy) to shape
 * system guidance so responses stay coherent across a multi-turn
 * conversation.
 *
 * This is a deterministic, heuristic intelligence — honest about being a
 * development approximation. The shapes are typed so a real model-driven
 * analyzer can replace `buildConversationIntelligence` later without
 * touching the request/response contracts.
 */

import type { LanguageStyleMetadata, LanguageCode } from "@/ai/language";
import type { EmojiPreference } from "@/ai/emoji";

/* ------------------------------------------------------------------ */
/* Intent                                                              */
/* ------------------------------------------------------------------ */

export type UserIntent =
  | "question"
  | "request"
  | "explanation"
  | "task"
  | "greeting"
  | "continuation"
  | "translation"
  | "unknown";

const GREETING_RE = /^\s*(hi|hello|hey|namaste|namaskaram|hola|vanakkam|good (morning|afternoon|evening|night))\b/i;
const QUESTION_RE = /\b(what|why|how|when|where|who|which|can you|could you|is it|are there|do you|does it|enda|eppudu|eekada|elaa|ela)\b/i;
const REQUEST_RE = /\b(please|kindly|i need|i want|help me|make|create|write|build|generate|summarize|fix|refactor|cheyyi|cheppu)\b/i;
const TRANSLATION_RE = /\b(translate|translation|in (english|telugu|hindi)|to (english|telugu|hindi)|meaning of|ardham)\b/i;
const CONTINUATION_RE = /\b(it|that|this|the same|continue|next|first|second|another|pinnati|ada|adi|continue from)\b/i;
const EXPLANATION_RE = /\b(explain|describe|tell me about|how does|elaborate|teach|nerchukovali|artham)\b/i;
const TASK_RE = /\b(start|stop|run|deploy|schedule|set up|configure|implement|process|execute)\b/i;

/**
 * Infer the user's intent from the message. "continuation" is returned when
 * the message reads like a follow-up (short, referential, references a prior
 * topic) — the conversation intelligence layer uses history to resolve it.
 *
 * Order matters: greetings, translations, and continuations are specific and
 * checked first; questions before explanations (a "what is X" is a question
 * unless the user explicitly asks to explain in depth).
 */
export function analyzeIntent(text: string, isContinuation: boolean): UserIntent {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "unknown";
  if (GREETING_RE.test(trimmed) && trimmed.split(/\s+/).length <= 4) return "greeting";
  if (TRANSLATION_RE.test(trimmed)) return "translation";
  if (isContinuation) return "continuation";
  if (TASK_RE.test(trimmed)) return "task";
  if (REQUEST_RE.test(trimmed)) return "request";
  if (QUESTION_RE.test(trimmed)) return "question";
  if (EXPLANATION_RE.test(trimmed)) return "explanation";
  return "unknown";
}

/* ------------------------------------------------------------------ */
/* Topic extraction                                                    */
/* ------------------------------------------------------------------ */

/**
 * Extract a candidate topic phrase from a user message. The heuristic favors
 * capitalized multi-word technical phrases (e.g. "Agentic AI", "React
 * Native") that are NOT the first word of the sentence, plus known technical
 * single tokens. This is intentionally simple and honest about being an
 * approximation.
 */
export function extractTopic(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  // Capitalized multi-word phrases anywhere in the message. A single
  // capitalized first word (sentence start) is not a topic; prefer phrases
  // that do not begin at the very start of the message.
  const matches = [...trimmed.matchAll(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})\b/g)];
  const capsPhrases: Array<{ phrase: string; index: number }> = [];
  for (const m of matches) {
    const phrase = m[1];
    const index = m.index ?? 0;
    if (isGreetingWord(phrase)) continue;
    capsPhrases.push({ phrase, index });
    // If the match is sentence-initial, also offer the phrase with the first
    // word dropped — the first word is often a lead-in ("Naaku", "What").
    if (index === 0) {
      const rest = phrase.split(/\s+/).slice(1).join(" ");
      if (rest && /[A-Z][a-zA-Z]/.test(rest)) {
        capsPhrases.push({ phrase: rest, index: 1 });
      }
    }
  }

  // Prefer a phrase that is not sentence-initial.
  const nonInitial = capsPhrases.find((p) => p.index > 0);
  if (nonInitial) return nonInitial.phrase;
  if (capsPhrases.length > 0) return capsPhrases[0].phrase;

  // A lone capitalized token that is not sentence-initial.
  const words = trimmed.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const w = words[i].replace(/[^\w]/g, "");
    if (/^[A-Z][a-zA-Z]+$/.test(w) && !isGreetingWord(w) && w.length > 2) {
      return w;
    }
  }

  // Known technical single tokens (any case).
  const tech = trimmed.match(/\b(ai|agentic|react|typescript|python|spark|docker|kubernetes|api|rag|llm)\b/i);
  if (tech) return tech[0];

  return null;
}

function isGreetingWord(w: string): boolean {
  return /^(Hi|Hello|Hey|Namaste|Namaskaram|Good|What|How|Could|Please|Tell|I|The|A|An|This|That|Naaku|Naku)$/i.test(w);
}

/* ------------------------------------------------------------------ */
/* User preferences (accumulated across turns)                         */
/* ------------------------------------------------------------------ */

export interface UserPreferences {
  /** Preferred formality, rolled up from recent turns. */
  formality: "casual" | "neutral" | "formal";
  /** Preferred verbosity. */
  verbosity: "concise" | "balanced" | "detailed";
  /** Emoji register, derived from the user's emoji usage. */
  emojiPreference: EmojiPreference;
  /** Dominant language across recent turns. */
  dominantLanguage: LanguageCode;
}

/* ------------------------------------------------------------------ */
/* Conversation intelligence snapshot                                   */
/* ------------------------------------------------------------------ */

export interface ConversationIntelligence {
  /** The most recent topic the user has been talking about. */
  activeTopic: string | null;
  /** Recent topics in recency order (oldest → newest before the active one). */
  recentTopics: string[];
  /** Inferred intent for the current turn. */
  intent: UserIntent;
  /** True when the current turn looks like a follow-up to a prior topic. */
  isContinuation: boolean;
  /** The topic referenced by a continuation turn, if resolvable. */
  continuationTopic: string | null;
  /** Accumulated user preferences across recent turns. */
  preferences: UserPreferences;
  /** Current turn's language/style metadata (carried for convenience). */
  language: LanguageStyleMetadata;
}

/* ------------------------------------------------------------------ */
/* History shape (mirrors ConversationEngine.history())                 */
/* ------------------------------------------------------------------ */

export interface IntelligenceTurn {
  role: "user" | "assistant";
  text: string;
}

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

const RECENT_WINDOW = 8;

/**
 * Build a conversation intelligence snapshot for the current turn from the
 * prior history plus the current user message + its language metadata.
 *
 * `history` is the conversation's prior turns (text only). The current
 * message is analyzed separately and appended to the topic trail.
 */
export function buildConversationIntelligence(
  history: IntelligenceTurn[],
  currentMessage: string,
  currentLanguage: LanguageStyleMetadata,
): ConversationIntelligence {
  const userTurns = [
    ...history.filter((t) => t.role === "user").map((t) => t.text),
    currentMessage,
  ];
  const recentUser = userTurns.slice(-RECENT_WINDOW);

  // Topic trail from recent user messages (oldest → newest).
  const topics: string[] = [];
  for (const m of recentUser) {
    const t = extractTopic(m);
    if (t && !topics.some((x) => x.toLowerCase() === t.toLowerCase())) topics.push(t);
  }
  const activeTopic = topics.length > 0 ? topics[topics.length - 1] : null;
  const recentTopics = topics.slice(0, -1);

  // Continuation: short, referential message that does not introduce a new topic.
  const trimmed = currentMessage.trim();
  const introducesTopic = Boolean(extractTopic(trimmed));
  const isContinuation =
    userTurns.length > 1 &&
    !introducesTopic &&
    (CONTINUATION_RE.test(trimmed) || trimmed.split(/\s+/).length <= 6);

  const continuationTopic = isContinuation ? activeTopic : null;

  const intent = analyzeIntent(currentMessage, isContinuation);

  const preferences = rollUpPreferences(recentUser, currentLanguage);

  return {
    activeTopic,
    recentTopics,
    intent,
    isContinuation,
    continuationTopic,
    preferences,
    language: currentLanguage,
  };
}

/**
 * Roll up recent user turns + the current language metadata into accumulated
 * preferences. Defaults inherit from the current turn so a fresh conversation
 * is still responsive.
 */
function rollUpPreferences(
  recentUserMessages: string[],
  current: LanguageStyleMetadata,
): UserPreferences {
  // Dominant language: prefer the current turn's language, but if recent
  // turns consistently used another language, lean toward it. With a
  // development heuristic we simply use the current turn — real analysis
  // would weight the window.
  const dominantLanguage = current.language;

  // Formality: majority of recent turns, defaulting to current.
  let casual = 0;
  let formal = 0;
  for (const m of recentUserMessages) {
    const lower = m.toLowerCase();
    if (/\b(haha|lol|btw|tbh|ya|yeah|nah|gonna|wanna|cheers|hey|bro)\b/i.test(lower)) casual++;
    else if (/\b(please|kindly|regards|respectfully|appreciate)\b/i.test(lower)) formal++;
  }
  let formality: UserPreferences["formality"] = current.formality;
  // A tie with a casual history leans casual — the user's established register
  // wins over a single politely-worded turn.
  if (casual > 0 && casual >= formal) formality = "casual";
  else if (formal > casual) formality = "formal";

  // Emoji preference: from the current turn (already detected) unless the
  // window shows a stronger pattern.
  const emojiPreference = current.emojiPreference;

  // Verbosity: prefer the current turn's verbosity.
  const verbosity = current.verbosity;

  return { formality, verbosity, emojiPreference, dominantLanguage };
}

/* ------------------------------------------------------------------ */
/* Helpers for system guidance                                          */
/* ------------------------------------------------------------------ */

/** Human-readable summary of the active topic, or null if none. */
export function topicPhrase(intel: ConversationIntelligence): string | null {
  if (intel.isContinuation && intel.continuationTopic) {
    return intel.continuationTopic;
  }
  return intel.activeTopic;
}

/** Human label for an intent, suitable for system guidance prose. */
export function intentLabel(intent: UserIntent): string {
  switch (intent) {
    case "question":
      return "a question";
    case "request":
      return "a request";
    case "explanation":
      return "an explanation";
    case "task":
      return "a task";
    case "greeting":
      return "a greeting";
    case "continuation":
      return "a follow-up";
    case "translation":
      return "a translation";
    case "unknown":
      return "an open message";
  }
}
