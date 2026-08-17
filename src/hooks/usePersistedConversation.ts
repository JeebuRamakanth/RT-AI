/**
 * usePersistedConversation — the persisted conversation lifecycle.
 *
 * Wraps the AI Core orchestrator with the ConversationRepository so every
 * meaningful turn is persisted:
 *
 *   resolve conversation → append user message → run orchestrator (stream)
 *   → append assistant message → update metadata (preview/title/stats)
 *
 * It supports continuation: when given an existing conversation id, it loads
 * the canonical messages into the ConversationEngine and restores context so
 * the orchestrator sees prior turns (continuation works across sessions).
 *
 * The hook is framework-agnostic about WHERE it is used (Home or Chat page)
 * — both call the same lifecycle.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ConversationEngine } from "@/ai/conversation";
import { createAI, type AICore } from "@/ai";
import { detectLanguageStyle, type LanguageStyleMetadata } from "@/ai/language";
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
import { CancellationError } from "@/ai/errors";
import {
  generateTitle,
  type AssetReference,
  type ConversationRecord,
  type StoredMessage,
} from "@/conversations";
import type { ConversationRepository } from "@/conversations/types";
import { useConversationStore } from "@/conversations/store";

export type ConversationLifecycle =
  | "idle"
  | "preparing"
  | "thinking"
  | "streaming"
  | "completing"
  | "completed"
  | "error";

export interface PersistedSendInput {
  text: string;
  attachments?: Array<{
    id: string;
    kind: "file" | "image" | "video" | "audio";
    name: string;
    mime: string;
    size: number;
  }>;
  /** Optional asset references to attach to the assistant turn (future vault). */
  assetReferences?: AssetReference[];
}

export interface UsePersistedConversation {
  conversation: ConversationRecord | null;
  conversationId: string | null;
  messages: StoredMessage[];
  lifecycle: ConversationLifecycle;
  streamingText: string;
  lastResponse: AIResponse | null;
  lastError: AIErrorDescriptor | null;
  isBusy: boolean;
  /** Load (hydrate) an existing conversation by id. */
  load: (id: string) => Promise<void>;
  /** Start fresh: clear the active conversation. */
  startFresh: () => void;
  send: (input: PersistedSendInput) => Promise<void>;
  cancel: () => void;
  retry: () => Promise<void>;
  /** Persist a rename through the repository. */
  rename: (title: string) => Promise<void>;
}

let reqSeq = 0;
function nextRequestId(): string {
  reqSeq = (reqSeq + 1) % Number.MAX_SAFE_INTEGER;
  return `req_${Date.now().toString(36)}_${reqSeq.toString(36)}`;
}

interface StyleSnapshot {
  language: LanguageStyleMetadata;
}

function styleOf(metadata: LanguageStyleMetadata) {
  return {
    language: metadata.language,
    secondaryLanguage: metadata.secondaryLanguage,
    isMixedLanguage: metadata.isMixedLanguage,
    formality: metadata.formality,
    tone: metadata.tone,
    verbosity: metadata.verbosity,
    technicalLevel: metadata.technicalLevel,
    emojiPreference: metadata.emojiPreference,
  };
}

export function usePersistedConversation(source = "home"): UsePersistedConversation {
  const { repository, owner, bump } = useConversationStore();

  const coreRef = useRef<AICore | null>(null);
  if (!coreRef.current) coreRef.current = createAI();
  const core = coreRef.current;

  const engineRef = useRef<ConversationEngine | null>(null);
  if (!engineRef.current) engineRef.current = new ConversationEngine();
  const engine = engineRef.current;

  const abortRef = useRef<AbortController | null>(null);
  const lastInputRef = useRef<PersistedSendInput | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const [conversation, setConversation] = useState<ConversationRecord | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [lifecycle, setLifecycle] = useState<ConversationLifecycle>("idle");
  const [streamingText, setStreamingText] = useState("");
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  const [lastError, setLastError] = useState<AIErrorDescriptor | null>(null);

  // Subscribe to engine mutations for live streaming text rendering.
  const engineState = useSyncExternalStore(
    useCallback((cb) => engine.subscribe(cb), [engine]),
    useCallback(() => engine.getState(), [engine]),
    useCallback(() => engine.getState(), [engine]),
  );

  // Keep persisted messages in sync with the engine after each completed turn.
  const persistEngineMessages = useCallback(
    async (id: string) => {
      const stored: StoredMessage[] = engineState.messages.map((m) => ({
        message: m,
        assetReferences: [],
      }));
      const rec = await repository.setMessages(id, stored);
      setConversation(rec);
      setMessages(stored);
      bump();
    },
    [engineState.messages, repository, bump],
  );

  const load = useCallback(
    async (id: string) => {
      const rec = await repository.get(id);
      if (!rec) return;
      const stored = await repository.getMessages(id);
      // Restore canonical messages into the engine so continuation works.
      engine.reset();
      for (const sm of stored) engine.hydrate(sm.message);
      activeIdRef.current = rec.id;
      setConversation(rec);
      setMessages(stored);
      setLifecycle("idle");
      setStreamingText("");
      setLastResponse(null);
      setLastError(null);
      lastInputRef.current = null;
    },
    [engine, repository],
  );

  const startFresh = useCallback(() => {
    abortRef.current?.abort();
    engine.reset();
    activeIdRef.current = null;
    setConversation(null);
    setMessages([]);
    setLifecycle("idle");
    setStreamingText("");
    setLastResponse(null);
    setLastError(null);
    lastInputRef.current = null;
  }, [engine]);

  const ensureConversation = useCallback(
    async (firstText: string, metadata: LanguageStyleMetadata): Promise<ConversationRecord> => {
      if (activeIdRef.current) {
        const existing = await repository.get(activeIdRef.current);
        if (existing && existing.status !== "deleted") {
          return existing;
        }
      }
      const rec = await repository.create({
        ownerId: owner.id,
        title: generateTitle(firstText, metadata.language),
        titleAuto: true,
        language: metadata.language,
        style: styleOf(metadata),
      });
      activeIdRef.current = rec.id;
      setConversation(rec);
      return rec;
    },
    [owner.id, repository],
  );

  const buildRequest = useCallback(
    (text: string, attachments: RequestAttachment[], convId: string): AIRequest => {
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
        conversationId: convId,
        message: text,
        content,
        language: detectLanguageStyle(text || ""),
        attachments,
        metadata,
      };
    },
    [source],
  );

  const runRequest = useCallback(
    async (input: PersistedSendInput, snapshot: StyleSnapshot) => {
      const text = input.text.trim();
      const attachments: RequestAttachment[] = input.attachments ?? [];
      const conv = await ensureConversation(text || (attachments[0]?.name ?? "New conversation"), snapshot.language);
      const convId = conv.id;

      // User turn in engine + persist.
      const userMsg = engine.beginUserTurn(text, attachments);
      await repository.appendConversationMessage(convId, {
        id: userMsg,
        role: "user",
        text,
        attachments: attachments.length ? attachments : undefined,
        state: "completed",
        createdAt: Date.now(),
        finishedAt: Date.now(),
      });

      // Assistant placeholder in engine.
      const assistantId = engine.beginAssistantTurn("");

      setLifecycle("preparing");
      setStreamingText("");
      setLastError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const request = buildRequest(text, attachments, convId);

      const onEvent = (event: StreamEvent) => {
        switch (event.type) {
          case "response_started":
            engine.setAssistantModel(assistantId, event.model);
            setLifecycle("thinking");
            engine.setAssistantState(assistantId, "thinking");
            break;
          case "thinking":
            setLifecycle("thinking");
            engine.setAssistantState(assistantId, "thinking");
            break;
          case "text_delta":
            setLifecycle("streaming");
            engine.appendAssistantText(assistantId, event.delta);
            setStreamingText((prev) => prev + event.delta);
            break;
          case "response_completed":
            setLifecycle("completing");
            engine.setAssistantState(assistantId, "completing");
            break;
          case "response_error":
            setLastError(event.error);
            setLifecycle("error");
            engine.failAssistant(assistantId, event.error);
            break;
          default:
            break;
        }
      };

      try {
        const response = await core.orchestrator.run(
          request,
          onEvent,
          controller.signal,
          { history: engine.history() },
        );
        if (response.state === "cancelled") {
          engine.cancelAssistant(assistantId);
          setLifecycle("idle");
        } else if (response.state === "error") {
          setLastError(response.error ?? null);
          setLifecycle("error");
          if (response.error) engine.failAssistant(assistantId, response.error);
        } else {
          engine.completeAssistant(assistantId, response);
          setLastResponse(response);
          setLifecycle("completed");
        }
        await persistEngineMessages(convId);
      } catch (cause) {
        if (cause instanceof CancellationError || controller.signal.aborted) {
          engine.cancelAssistant(assistantId);
          setLifecycle("idle");
          await persistEngineMessages(convId);
        } else {
          const err = cause as Error & { toDescriptor?: () => AIErrorDescriptor };
          const descriptor: AIErrorDescriptor = err.toDescriptor
            ? err.toDescriptor()
            : { kind: "invalid_request", message: err.message || "Request failed.", retryable: false };
          setLastError(descriptor);
          setLifecycle("error");
          engine.failAssistant(assistantId, descriptor);
          await persistEngineMessages(convId);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [buildRequest, core, engine, ensureConversation, persistEngineMessages, repository],
  );

  const send = useCallback(
    async (input: PersistedSendInput) => {
      if (!input.text.trim() && (input.attachments?.length ?? 0) === 0) return;
      lastInputRef.current = input;
      const snapshot: StyleSnapshot = { language: detectLanguageStyle(input.text || "") };
      await runRequest(input, snapshot);
    },
    [runRequest],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retry = useCallback(async () => {
    const last = lastInputRef.current;
    if (!last) return;
    // Remove the last failed assistant turn before retrying.
    engine.dropLastAssistant();
    const snapshot: StyleSnapshot = { language: detectLanguageStyle(last.text || "") };
    await runRequest(last, snapshot);
  }, [engine, runRequest]);

  const rename = useCallback(
    async (title: string) => {
      if (!activeIdRef.current) return;
      const rec = await repository.rename(activeIdRef.current, title);
      setConversation(rec);
      bump();
    },
    [repository, bump],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const isBusy = useMemo(
    () =>
      lifecycle === "preparing" ||
      lifecycle === "thinking" ||
      lifecycle === "streaming" ||
      lifecycle === "completing",
    [lifecycle],
  );

  // Sync persisted message list with engine state during streaming so the UI
  // shows live deltas while keeping the persisted snapshot for hydration.
  const liveMessages: StoredMessage[] = useMemo(() => {
    if (isBusy || engineState.messages.length > 0) {
      return engineState.messages.map((m) => ({ message: m, assetReferences: [] }));
    }
    return messages;
  }, [engineState.messages, isBusy, messages]);

  return {
    conversation,
    conversationId: activeIdRef.current,
    messages: liveMessages,
    lifecycle,
    streamingText,
    lastResponse,
    lastError,
    isBusy,
    load,
    startFresh,
    send,
    cancel,
    retry,
    rename,
  };
}
