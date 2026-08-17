/**
 * RT AI Core — development provider.
 *
 * A safe, deterministic, streaming provider that exercises the entire
 * Home → Core → Provider → Stream → Home flow WITHOUT any external network
 * calls or secrets. It is always clearly marked `development: true` so the
 * UI can never present its output as real production AI.
 *
 * The responses mirror the user's detected language, style, and emoji
 * register — proving the language/style + emoji intelligence works
 * end-to-end. When the request carries a response style policy (built by
 * the orchestrator), the provider reads it to shape greetings, verbosity,
 * technical framing, and tasteful emoji accents. Cancellation is honoured
 * via the supplied AbortSignal — aborting stops the stream cleanly.
 */

import type { AIProvider, ProviderInfo } from "@/ai/provider";
import type {
  AIRequest,
  ModelDescriptor,
  StreamEvent,
  UsageMetadata,
} from "@/ai/types";
import { CancellationError } from "@/ai/errors";
import { languageLabel } from "@/ai/language";
import { applyTastefulEmojis, type EmojiPreference } from "@/ai/emoji";
import type { ConversationIntelligence } from "@/ai/intelligence";

const DEV_PROVIDER_INFO: ProviderInfo = {
  id: "development",
  label: "RT Development Core",
  development: true,
  available: true,
  models: [
    {
      modelId: "rt-dev-default",
      label: "RT Development",
      capabilities: ["text", "streaming"],
      streaming: true,
    },
  ],
};

const DEV_MODEL: ModelDescriptor = {
  providerId: "development",
  modelId: "rt-dev-default",
  label: "RT Development",
  development: true,
  capabilities: ["text", "streaming"],
};

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new CancellationError());
    const t = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new CancellationError());
    };
    function cleanup() {
      clearTimeout(t);
      signal.removeEventListener("abort", onAbort);
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Build a deterministic, language- + style-aware development response body. */
function composeResponse(request: AIRequest): string {
  const policy = request.stylePolicy;
  const intel = request.intelligence;
  const lang = languageLabel(request.language);
  const isCasual = (policy?.formality ?? request.language.formality) === "casual";
  const isFormal = (policy?.formality ?? request.language.formality) === "formal";

  const userText = request.message.trim();
  const hasAttachments = request.attachments.length > 0;

  const greeting = pickGreeting(request.language, isCasual, isFormal, intel);
  const echo = userText.length > 0 ? userText : "(no message text)";

  const lines: string[] = [greeting];
  lines.push("");
  lines.push(
    `I'm the RT AI development core. I received your request in ${lang}${
      request.language.isMixedLanguage ? " (mixed-language detected)" : ""
    } and I'm mirroring it back so you can verify the end-to-end pipeline.`,
  );
  lines.push("");
  lines.push(`You said: "${echo}"`);

  if (intel?.activeTopic) {
    lines.push("");
    if (intel.isContinuation && intel.continuationTopic) {
      lines.push(
        `Conversation continuity: I'm treating this as a follow-up about "${intel.continuationTopic}" (the active topic from your earlier turns).`,
      );
    } else {
      lines.push(`Detected topic: "${intel.activeTopic}".`);
    }
  }

  if (intel) {
    lines.push("");
    lines.push(
      `Intent: ${describeIntent(intel.intent)} · Formality: ${policy?.formality ?? request.language.formality} · Tone: ${policy?.tone ?? request.language.tone} · Verbosity: ${policy?.verbosity ?? request.language.verbosity} · Technical level: ${policy?.technicalLevel ?? request.language.technicalLevel}.`,
    );
  }

  if (hasAttachments) {
    lines.push("");
    lines.push(
      `You attached ${request.attachments.length} item(s): ${request.attachments
        .map((a) => a.name)
        .join(", ")}. ` +
        "Attachment processing is on the roadmap — I'm not claiming to understand them yet.",
    );
  }
  lines.push("");
  lines.push(
    "When a real provider is wired through a secure backend, this same stream will carry genuine model output.",
  );

  const raw = lines.join("\n");
  const emojiPref = (policy?.emojiPreference ?? request.language.emojiPreference) as EmojiPreference;
  return applyTastefulEmojis(raw, emojiPref);
}

function describeIntent(intent: ConversationIntelligence["intent"]): string {
  switch (intent) {
    case "question":
      return "question";
    case "request":
      return "request";
    case "explanation":
      return "explanation";
    case "task":
      return "task";
    case "greeting":
      return "greeting";
    case "continuation":
      return "follow-up";
    case "translation":
      return "translation";
    case "unknown":
      return "open message";
  }
}

function pickGreeting(
  lang: AIRequest["language"],
  isCasual: boolean,
  isFormal: boolean,
  intel?: ConversationIntelligence,
): string {
  const primary = lang.language;
  const secondary = lang.secondaryLanguage;
  const mixed = lang.isMixedLanguage;

  if (intel?.intent === "greeting") {
    if (mixed && primary === "te" && secondary === "en") return "Namaste — nice to hear from you. 🔥";
    if (primary === "te") return "Namaskaram 🙏";
    if (primary === "hi") return "Namaste 🙏";
    return "Hey — good to see you. 👋";
  }

  if (mixed && primary === "te" && secondary === "en") return "Namaste — let's get into it.";
  if (mixed && primary === "hi" && secondary === "en") return "Namaste — let's get into it.";
  if (primary === "te") return "Namaskaram.";
  if (primary === "hi") return "Namaste.";
  if (isCasual) return "Hey — here's what came through.";
  if (isFormal) return "Good to hear from you. Here is the response.";
  return "Here's the response from the development core.";
}

export class DevelopmentProvider implements AIProvider {
  readonly info = DEV_PROVIDER_INFO;

  async *stream(
    request: AIRequest,
    _modelId: string,
    signal: AbortSignal,
  ): AsyncIterable<StreamEvent> {
    const messageId = `asst_${request.metadata.requestId}`;
    const startedAt = Date.now();

    // Preparing → thinking phase (short, deterministic).
    yield { type: "response_started", messageId, model: DEV_MODEL, startedAt };
    yield { type: "thinking", messageId, label: "Composing" };
    await delay(180, signal);

    // Build the full response, then stream it in word-sized deltas so the
    // Home UI visibly updates as events arrive.
    const full = composeResponse(request);
    const tokens = tokenize(full);

    let acc = "";
    for (const tok of tokens) {
      if (signal.aborted) throw new CancellationError();
      await delay(22, signal);
      acc += tok;
      yield { type: "text_delta", messageId, delta: tok };
    }

    // Usage metadata — honest about being a dev estimate, not a real bill.
    const usage: UsageMetadata = {
      promptTokens: estimateTokens(request.message),
      completionTokens: estimateTokens(full),
      totalTokens: estimateTokens(request.message) + estimateTokens(full),
    };
    yield { type: "usage", messageId, usage };

    yield {
      type: "response_completed",
      messageId,
      response: {
        messageId,
        conversationId: request.conversationId ?? "",
        text: acc,
        model: DEV_MODEL,
        usage,
        state: "completed",
        startedAt,
        finishedAt: Date.now(),
      },
    };
  }
}

function tokenize(text: string): string[] {
  // Preserve whitespace by splitting on spaces while keeping them.
  return text.match(/\s+|\S+/g) ?? [text];
}

function estimateTokens(text: string): number {
  // Crude heuristic ~4 chars/token. Explicitly a dev estimate.
  return Math.max(1, Math.ceil(text.length / 4));
}
