/**
 * RT AI Core — canonical domain types.
 *
 * These types are the stable contract between the UI (Home composer) and any
 * AI provider. Provider-specific shapes NEVER reach the UI; everything is
 * normalized into the models defined here. They are intentionally extensible
 * so future capabilities (reasoning, tools, agents, citations, multimodal
 * generation) can be added without breaking the Home integration.
 */

import type { LanguageStyleMetadata } from "@/ai/language";
import type { ResponseStylePolicy } from "@/ai/style-policy";
import type { ConversationIntelligence } from "@/ai/intelligence";

/* ------------------------------------------------------------------ */
/* Content parts — multimodal-ready, text-first                        */
/* ------------------------------------------------------------------ */

export type ContentPart =
  | { kind: "text"; text: string }
  | {
      kind: "attachment";
      attachmentId: string;
      name: string;
      mime: string;
      /** Byte size; informational only. */
      size: number;
      /**
       * Processing state. "pending" means RT AI has NOT yet processed this
       * attachment — the UI must never claim AI understanding that did not
       * happen. Future steps flip this to "processed" once a provider
       * actually understands the content.
       */
      processing: "pending" | "processed";
    };

/* ------------------------------------------------------------------ */
/* Canonical AI request                                                */
/* ------------------------------------------------------------------ */

export interface AIRequest {
  /** Stable conversation identity. New conversations start with null. */
  conversationId: string | null;
  /** Primary text the user typed. May be empty if only attachments sent. */
  message: string;
  /** Structured content parts (text + attachment metadata). */
  content: ContentPart[];
  /** Detected/declared language + style metadata. */
  language: LanguageStyleMetadata;
  /** Attachments carried through as typed metadata (never raw bytes). */
  attachments: RequestAttachment[];
  /** Optional model preferences (hints, not demands). */
  preferences?: ModelPreferences;
  /** Request-scoped metadata (created timestamp, request id, source). */
  metadata: RequestMetadata;
  /** Conversation intelligence for the current turn (built by the orchestrator). */
  intelligence?: ConversationIntelligence;
  /** The centralized response style policy the generation pipeline consumes. */
  stylePolicy?: ResponseStylePolicy;
}

export interface RequestAttachment {
  id: string;
  kind: "file" | "image" | "video" | "audio";
  name: string;
  mime: string;
  size: number;
}

export interface ModelPreferences {
  /** Preferred model id, if the user chose one explicitly. */
  modelId?: string;
  /** Preferred provider id. */
  providerId?: string;
  /** Prefer streaming when the selected model supports it. */
  stream?: boolean;
  /** Hinted task kind; helps the router. */
  task?: TaskKind;
}

export type TaskKind =
  | "chat"
  | "reasoning"
  | "research"
  | "vision"
  | "coding"
  | "tutoring"
  | "summarization"
  | "translation";

export interface RequestMetadata {
  /** Monotonic request id within the conversation. */
  requestId: string;
  createdAt: number;
  /** Where the request originated (e.g. the Home composer). */
  source: string;
}

/* ------------------------------------------------------------------ */
/* Canonical AI response                                               */
/* ------------------------------------------------------------------ */

export interface AIResponse {
  /** Assistant message id (stable across the response lifecycle). */
  messageId: string;
  conversationId: string;
  /** Final assembled text (empty until streaming completes). */
  text: string;
  /** Model/provider metadata — normalized, never provider-specific shapes. */
  model: ModelDescriptor;
  /** Token usage if the provider reports it. */
  usage?: UsageMetadata;
  /** Citations surfaced by the provider (future: research/RAG). */
  citations?: Citation[];
  /** Tool events emitted during generation (future). */
  toolEvents?: ToolEvent[];
  /** Reasoning trace events (future). */
  reasoning?: ReasoningEvent[];
  /** Attachment processing results (future). */
  attachmentResults?: AttachmentResult[];
  /** Lifecycle state. */
  state: ResponseState;
  /** Error, if the response ended in failure. */
  error?: AIErrorDescriptor;
  /** Wall-clock started/finished timestamps. */
  startedAt: number;
  finishedAt?: number;
}

export interface ModelDescriptor {
  providerId: string;
  modelId: string;
  label: string;
  /** True when the provider is a development/mock (never fake as production). */
  development: boolean;
  capabilities: ModelCapability[];
}

export type ModelCapability =
  | "text"
  | "streaming"
  | "multimodal"
  | "tools"
  | "structured"
  | "reasoning";

export interface UsageMetadata {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface Citation {
  id: string;
  title?: string;
  url?: string;
  snippet?: string;
}

export interface ToolEvent {
  id: string;
  toolName: string;
  /** "call" | "result" | "error" — extensible. */
  kind: string;
  data?: unknown;
}

export interface ReasoningEvent {
  id: string;
  text: string;
}

export interface AttachmentResult {
  attachmentId: string;
  /** Honest state: "processed" only when a provider truly understood it. */
  state: "processed" | "unsupported" | "error";
  summary?: string;
}

export type ResponseState =
  | "preparing"
  | "thinking"
  | "streaming"
  | "completing"
  | "completed"
  | "error"
  | "cancelled";

/* ------------------------------------------------------------------ */
/* Canonical stream events                                             */
/* ------------------------------------------------------------------ */

export type StreamEvent =
  | { type: "response_started"; messageId: string; model: ModelDescriptor; startedAt: number }
  | { type: "text_delta"; messageId: string; delta: string }
  | { type: "thinking"; messageId: string; label?: string }
  | { type: "tool_event"; messageId: string; event: ToolEvent }
  | { type: "reasoning"; messageId: string; event: ReasoningEvent }
  | { type: "usage"; messageId: string; usage: UsageMetadata }
  | { type: "citations"; messageId: string; citations: Citation[] }
  | {
      type: "response_completed";
      messageId: string;
      response: AIResponse;
    }
  | { type: "response_error"; messageId: string; error: AIErrorDescriptor };

/* ------------------------------------------------------------------ */
/* Error descriptor (serializable, no stack traces)                    */
/* ------------------------------------------------------------------ */

export type AIErrorKind =
  | "provider_unavailable"
  | "network"
  | "invalid_request"
  | "timeout"
  | "cancelled"
  | "unsupported_capability"
  | "configuration";

export interface AIErrorDescriptor {
  kind: AIErrorKind;
  /** Human-safe message (never a stack trace or secret). */
  message: string;
  /** Optional retry hint for the UI. */
  retryable: boolean;
}

/* ------------------------------------------------------------------ */
/* Conversation model (engine-level)                                   */
/* ------------------------------------------------------------------ */

export type ConversationRole = "user" | "assistant";

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  text: string;
  /** Attachments on this message (user-side metadata). */
  attachments?: RequestAttachment[];
  /** Assistant model metadata (user messages have none). */
  model?: ModelDescriptor;
  state: ResponseState;
  error?: AIErrorDescriptor;
  createdAt: number;
  finishedAt?: number;
}
