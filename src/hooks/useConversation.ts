/**
 * useConversation — React hook adapting the AI Core (ConversationEngine +
 * Orchestrator) to the Home UI. Exposes honest lifecycle states, the message
 * list, send/cancel/retry, and the canonical last-assistant response.
 *
 * The hook is the only seam between React and the AI Core. RTAIComposer
 * stays purely presentational + draft-owning; orchestration lives here.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createAI, type AICore } from "@/ai";
import { ConversationEngine } from "@/ai/conversation";
import type {
  AIErrorDescriptor,
  AIRequest,
  AIResponse,
  ContentPart,
  ConversationMessage,
  RequestAttachment,
  RequestMetadata,
  StreamEvent,
} from "@/ai/types";
import { detectLanguageStyle } from "@/ai/language";
import { CancellationError } from "@/ai/errors";

export type ConversationStatus =
  | "idle"
  | "preparing"
  | "thinking"
  | "streaming"
  | "completing"
  | "completed"
  | "error";

export interface SendInput {
  text: string;
  /** Draft attachments (typed metadata only — never raw bytes). */
  attachments?: Array<{
    id: string;
    kind: "file" | "image" | "video" | "audio";
    name: string;
    mime: string;
    size: number;
  }>;
}

export interface UseConversation {
  conversationId: string;
  messages: ConversationMessage[];
  status: ConversationStatus;
  /** Streaming partial text for the in-flight assistant turn. */
  streamingText: string;
  /** The last assistant response descriptor (model label etc.). */
  lastResponse: AIResponse | null;
  lastError: AIErrorDescriptor | null;
  isBusy: boolean;
  send: (input: SendInput) => Promise<void>;
  cancel: () => void;
  retry: () => Promise<void>;
  reset: () => void;
}

let reqSeq = 0;
function nextRequestId(): string {
  reqSeq = (reqSeq + 1) % Number.MAX_SAFE_INTEGER;
  return `req_${Date.now().toString(36)}_${reqSeq.toString(36)}`;
}

export function useConversation(source = "home-composer"): UseConversation {
  const coreRef = useRef<AICore | null>(null);
  if (!coreRef.current) coreRef.current = createAI();
  const core = coreRef.current;

  const engineRef = useRef<ConversationEngine | null>(null);
  if (!engineRef.current) engineRef.current = new ConversationEngine();
  const engine = engineRef.current;

  const abortRef = useRef<AbortController | null>(null);
  const lastInputRef = useRef<SendInput | null>(null);

  // Subscribe to engine mutations via useSyncExternalStore.
  const state = useSyncExternalStore(
    useCallback((cb) => engine.subscribe(cb), [engine]),
    useCallback(() => engine.getState(), [engine]),
    useCallback(() => engine.getState(), [engine]),
  );

  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [streamingText, setStreamingText] = useState("");
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  const [lastError, setLastError] = useState<AIErrorDescriptor | null>(null);

  const buildRequest = useCallback(
    (input: SendInput): AIRequest => {
      const text = input.text.trim();
      const attachments: RequestAttachment[] = input.attachments ?? [];
      const content: ContentPart[] = [];
      if (text) content.push({ kind: "text", text });
      for (const a of attachments) {
        content.push({
          kind: "attachment",
          attachmentId: a.id,
          name: a.name,
          mime: a.mime,
          size: a.size,
          processing: "pending",
        });
      }
      const metadata: RequestMetadata = {
        requestId: nextRequestId(),
        createdAt: Date.now(),
        source,
      };
      return {
        conversationId: engine.id,
        message: text,
        content,
        language: detectLanguageStyle(text || ""),
        attachments,
        metadata,
      };
    },
    [engine, source],
  );

  const runRequest = useCallback(
    async (input: SendInput) => {
      const request = buildRequest(input);

      // User turn.
      engine.beginUserTurn(request.message, request.attachments);
      // Assistant placeholder.
      const assistantId = engine.beginAssistantTurn("");

      setStatus("preparing");
      setStreamingText("");
      setLastError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const onEvent = (event: StreamEvent) => {
        switch (event.type) {
          case "response_started":
            engine.setAssistantModel(assistantId, event.model);
            setStatus("thinking");
            engine.setAssistantState(assistantId, "thinking");
            break;
          case "thinking":
            setStatus("thinking");
            engine.setAssistantState(assistantId, "thinking");
            break;
          case "text_delta":
            setStatus("streaming");
            engine.appendAssistantText(assistantId, event.delta);
            setStreamingText((prev) => prev + event.delta);
            break;
          case "usage":
            // Future: surface token counts.
            break;
          case "response_completed":
            setStatus("completing");
            engine.setAssistantState(assistantId, "completing");
            break;
          case "response_error":
            setLastError(event.error);
            setStatus("error");
            engine.failAssistant(assistantId, event.error);
            break;
          default:
            break;
        }
      };

      try {
        const response = await core.orchestrator.run(request, onEvent, controller.signal);
        if (response.state === "cancelled") {
          engine.cancelAssistant(assistantId);
          setStatus("idle");
        } else if (response.state === "error") {
          setLastError(response.error ?? null);
          setStatus("error");
          if (response.error) engine.failAssistant(assistantId, response.error);
        } else {
          engine.completeAssistant(assistantId, response);
          setLastResponse(response);
          setStatus("completed");
        }
      } catch (cause) {
        if (cause instanceof CancellationError || controller.signal.aborted) {
          engine.cancelAssistant(assistantId);
          setStatus("idle");
        } else {
          const err = cause as Error & { toDescriptor?: () => AIErrorDescriptor };
          const descriptor: AIErrorDescriptor = err.toDescriptor
            ? err.toDescriptor()
            : { kind: "invalid_request", message: err.message || "Request failed.", retryable: false };
          setLastError(descriptor);
          setStatus("error");
          engine.failAssistant(assistantId, descriptor);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [buildRequest, core, engine],
  );

  const send = useCallback(
    async (input: SendInput) => {
      if (!input.text.trim() && (input.attachments?.length ?? 0) === 0) return;
      lastInputRef.current = input;
      await runRequest(input);
    },
    [runRequest],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retry = useCallback(async () => {
    const last = lastInputRef.current;
    if (!last) return;
    await runRequest(last);
  }, [runRequest]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    engine.reset();
    setStatus("idle");
    setStreamingText("");
    setLastResponse(null);
    setLastError(null);
    lastInputRef.current = null;
  }, [engine]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const isBusy = useMemo(
    () =>
      status === "preparing" ||
      status === "thinking" ||
      status === "streaming" ||
      status === "completing",
    [status],
  );

  return {
    conversationId: engine.id,
    messages: state.messages,
    status,
    streamingText,
    lastResponse,
    lastError,
    isBusy,
    send,
    cancel,
    retry,
    reset,
  };
}
