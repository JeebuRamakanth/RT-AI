/**
 * RT AI Core — typed error hierarchy.
 *
 * All AI Core failures are raised as `AIError` subclasses and converted to a
 * serializable `AIErrorDescriptor` before reaching the UI. Internal stack
 * traces and provider secrets are NEVER surfaced.
 */

import type { AIErrorDescriptor, AIErrorKind } from "@/ai/types";

/** Strip any stack-trace-like suffix from a message before it reaches the UI. */
function sanitizeMessage(message: string): string {
  // Drop everything from the first "at <path>:line" stack frame onward.
  return message.replace(/\n?\s+at .*$/s, "").trim() || "An error occurred.";
}

export class AIError extends Error {
  readonly kind: AIErrorKind;
  readonly retryable: boolean;

  constructor(kind: AIErrorKind, message: string, retryable = false) {
    super(message);
    this.name = "AIError";
    this.kind = kind;
    this.retryable = retryable;
    // Preserve the stack for internal debugging, but `toDescriptor()` is
    // what crosses the boundary to the UI.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toDescriptor(): AIErrorDescriptor {
    return { kind: this.kind, message: sanitizeMessage(this.message), retryable: this.retryable };
  }
}

export class ProviderUnavailableError extends AIError {
  constructor(message = "AI provider is unavailable.") {
    super("provider_unavailable", message, true);
    this.name = "ProviderUnavailableError";
  }
}

export class NetworkError extends AIError {
  constructor(message = "Network connection failed.") {
    super("network", message, true);
    this.name = "NetworkError";
  }
}

export class InvalidRequestError extends AIError {
  constructor(message = "The request could not be understood.") {
    super("invalid_request", message, false);
    this.name = "InvalidRequestError";
  }
}

export class TimeoutError extends AIError {
  constructor(message = "The request timed out.") {
    super("timeout", message, true);
    this.name = "TimeoutError";
  }
}

export class CancellationError extends AIError {
  constructor(message = "Request cancelled.") {
    super("cancelled", message, false);
    this.name = "CancellationError";
  }
}

export class UnsupportedCapabilityError extends AIError {
  constructor(message = "This capability is not available yet.") {
    super("unsupported_capability", message, false);
    this.name = "UnsupportedCapabilityError";
  }
}

export class ConfigurationError extends AIError {
  constructor(message = "RT AI is not configured for this provider.") {
    super("configuration", message, false);
    this.name = "ConfigurationError";
  }
}

/** Convert an unknown thrown value into a safe AIError. */
export function toAIError(cause: unknown): AIError {
  if (cause instanceof AIError) return cause;
  if (cause instanceof DOMException && cause.name === "AbortError") {
    return new CancellationError();
  }
  if (cause instanceof Error) {
    // Heuristic: timeout/cancel signals from fetch + AbortController.
    const msg = cause.message.toLowerCase();
    if (msg.includes("abort")) return new CancellationError();
    if (msg.includes("timeout") || msg.includes("timed out")) return new TimeoutError(cause.message);
    if (msg.includes("network") || msg.includes("fetch")) return new NetworkError(cause.message);
    return new InvalidRequestError(cause.message);
  }
  return new InvalidRequestError("An unknown error occurred.");
}

export function isCancellation(cause: unknown): boolean {
  if (cause instanceof CancellationError) return true;
  if (cause instanceof DOMException && cause.name === "AbortError") return true;
  return false;
}
