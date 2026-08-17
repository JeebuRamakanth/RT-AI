/**
 * RT AI Core — conversation engine.
 *
 * Owns conversation identity, the ordered message list, streaming state,
 * completion, errors, and cancellation. Conversation orchestration lives
 * here — NOT inside Composer. The engine is framework-agnostic; the
 * React hook (useConversation) adapts it to the UI.
 */

import type {
  AIResponse,
  ConversationMessage,
  RequestAttachment,
} from "@/ai/types";

export interface ConversationState {
  id: string;
  messages: ConversationMessage[];
  /** True while an assistant turn is in flight. */
  streaming: boolean;
}

let seq = 0;
function uid(prefix: string): string {
  seq = (seq + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
}

export class ConversationEngine {
  readonly id: string;
  private messages: ConversationMessage[] = [];
  private streaming = false;
  private currentAssistantId: string | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(id: string | null = null) {
    this.id = id ?? uid("conv");
  }

  getState(): ConversationState {
    return { id: this.id, messages: this.messages.slice(), streaming: this.streaming };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  beginUserTurn(text: string, attachments: RequestAttachment[] = []): string {
    const msg: ConversationMessage = {
      id: uid("user"),
      role: "user",
      text,
      attachments: attachments.length ? attachments : undefined,
      state: "completed",
      createdAt: Date.now(),
      finishedAt: Date.now(),
    };
    this.messages.push(msg);
    return msg.id;
  }

  beginAssistantTurn(_modelId: string): string {
    const id = uid("asst");
    this.currentAssistantId = id;
    this.streaming = true;
    this.messages.push({
      id,
      role: "assistant",
      text: "",
      model: undefined,
      state: "preparing",
      createdAt: Date.now(),
    });
    this.emit();
    return id;
  }

  setAssistantState(messageId: string, state: ConversationMessage["state"]): void {
    this.updateAssistant(messageId, (m) => {
      m.state = state;
    });
  }

  appendAssistantText(messageId: string, delta: string): void {
    this.updateAssistant(messageId, (m) => {
      m.text += delta;
      if (m.state === "preparing" || m.state === "thinking") m.state = "streaming";
    });
  }

  setAssistantModel(messageId: string, model: NonNullable<ConversationMessage["model"]>): void {
    this.updateAssistant(messageId, (m) => {
      m.model = model;
    });
  }

  completeAssistant(messageId: string, response: AIResponse): void {
    this.updateAssistant(messageId, (m) => {
      m.text = response.text;
      m.model = response.model;
      m.state = response.state === "cancelled" ? "cancelled" : "completed";
      m.error = response.error;
      m.finishedAt = Date.now();
    });
    if (this.currentAssistantId === messageId) {
      this.currentAssistantId = null;
      this.streaming = false;
    }
    this.emit();
  }

  failAssistant(messageId: string, error: NonNullable<ConversationMessage["error"]>): void {
    this.updateAssistant(messageId, (m) => {
      m.state = "error";
      m.error = error;
      m.finishedAt = Date.now();
    });
    if (this.currentAssistantId === messageId) {
      this.currentAssistantId = null;
      this.streaming = false;
    }
    this.emit();
  }

  cancelAssistant(messageId: string): void {
    this.updateAssistant(messageId, (m) => {
      if (m.state === "completed" || m.state === "error") return;
      m.state = "cancelled";
      m.finishedAt = Date.now();
    });
    if (this.currentAssistantId === messageId) {
      this.currentAssistantId = null;
      this.streaming = false;
    }
    this.emit();
  }

  currentAssistant(): ConversationMessage | undefined {
    return this.currentAssistantId
      ? this.messages.find((m) => m.id === this.currentAssistantId)
      : undefined;
  }

  lastAssistant(): ConversationMessage | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === "assistant") return this.messages[i];
    }
    return undefined;
  }

  /** History as user/assistant turns for context building (text only). */
  history(): Array<{ role: "user" | "assistant"; text: string }> {
    return this.messages
      .filter((m) => m.text.length > 0)
      .map((m) => ({ role: m.role, text: m.text }));
  }

  reset(): void {
    this.messages = [];
    this.streaming = false;
    this.currentAssistantId = null;
    this.emit();
  }

  private updateAssistant(
    messageId: string,
    fn: (m: ConversationMessage) => void,
  ): void {
    const idx = this.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    fn(this.messages[idx]);
    this.emit();
  }
}
