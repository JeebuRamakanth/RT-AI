/**
 * RT AI Core — streaming + response normalization.
 *
 * Providers emit canonical StreamEvents (the development provider already
 * does; future real providers will be adapted here). This module provides
 * helpers to fold a stream of events into a single AIResponse and to expose
 * an async-iterable that the orchestrator can drive with cancellation
 * support.
 */

import type { AIResponse, StreamEvent } from "@/ai/types";
import { CancellationError, toAIError, isCancellation } from "@/ai/errors";

/**
 * Consume a provider stream into a final AIResponse, invoking `onEvent` for
 * each canonical event as it arrives (so the UI can update progressively).
 *
 * Cancellation: if `signal` aborts, the provider should reject with a
 * CancellationError; we translate that into a cancelled response descriptor
 * rather than an error, so the UI can present it honestly.
 */
export async function consumeStream(
  stream: AsyncIterable<StreamEvent>,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
): Promise<AIResponse> {
  let acc: AIResponse | null = null;
  let text = "";

  try {
    for await (const event of stream) {
      if (signal.aborted) throw new CancellationError();
      onEvent(event);

      switch (event.type) {
        case "response_started":
          acc = {
            messageId: event.messageId,
            conversationId: "",
            text: "",
            model: event.model,
            state: "streaming",
            startedAt: event.startedAt,
          };
          break;
        case "text_delta":
          text += event.delta;
          if (acc) acc.text = text;
          break;
        case "usage":
          if (acc) acc.usage = event.usage;
          break;
        case "citations":
          if (acc) acc.citations = event.citations;
          break;
        case "tool_event":
          if (acc) acc.toolEvents = [...(acc.toolEvents ?? []), event.event];
          break;
        case "reasoning":
          if (acc) acc.reasoning = [...(acc.reasoning ?? []), event.event];
          break;
        case "response_completed":
          return event.response;
        case "response_error":
          if (acc) {
            acc.state = "error";
            acc.error = event.error;
            acc.finishedAt = Date.now();
          }
          throw toProviderError(event.error);
        default:
          // Future event types are ignored until supported.
          break;
      }
    }
  } catch (cause) {
    if (isCancellation(cause) || signal.aborted) {
      if (acc) {
        acc.state = "cancelled";
        acc.text = text;
        acc.finishedAt = Date.now();
      }
      // Return a soft cancelled response; not thrown.
      return (
        acc ?? {
          messageId: "",
          conversationId: "",
          text,
          model: { providerId: "", modelId: "", label: "", development: true, capabilities: [] },
          state: "cancelled",
          startedAt: Date.now(),
          finishedAt: Date.now(),
        }
      );
    }
    throw toAIError(cause);
  }

  if (acc) {
    // Stream ended without an explicit completion event — finalize.
    acc.state = "completed";
    acc.text = text;
    acc.finishedAt = Date.now();
    return acc;
  }
  throw toProviderError({
    kind: "invalid_request",
    message: "Provider returned no response.",
    retryable: false,
  });
}

function toProviderError(descriptor: { kind: string; message: string; retryable: boolean }): Error {
  // The descriptor already carries a human-safe message; wrap minimally.
  const e = new Error(descriptor.message);
  e.name = "ProviderError";
  return e;
}
