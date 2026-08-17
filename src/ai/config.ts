/**
 * RT AI Core — runtime configuration.
 *
 * SECURITY: This is a React/Vite frontend. Provider secrets (API keys) MUST
 * NEVER live here, in source, localStorage, public files, or VITE_ env vars.
 * The provider interface is designed so a secure backend/API gateway can
 * later inject credentials. Until then, only the development provider is
 * used — it requires no secrets and never claims to be real production AI.
 */

export interface AIConfig {
  /** Active provider id. Only "development" is safe without a backend. */
  activeProviderId: string;
  /** Default model id used when a request has no preference. */
  defaultModelId: string;
  /** Prefer streaming when the selected model supports it. */
  preferStreaming: boolean;
  /** Soft timeout for a request before it is treated as timed out (ms). */
  requestTimeoutMs: number;
  /** Max characters of an assistant message kept in the context window. */
  contextCharBudget: number;
}

export const defaultAIConfig: AIConfig = {
  activeProviderId: "development",
  defaultModelId: "rt-dev-default",
  preferStreaming: true,
  requestTimeoutMs: 60_000,
  contextCharBudget: 12_000,
};

let currentConfig: AIConfig = { ...defaultAIConfig };

export function getAIConfig(): AIConfig {
  return currentConfig;
}

export function setAIConfig(patch: Partial<AIConfig>): AIConfig {
  currentConfig = { ...currentConfig, ...patch };
  return currentConfig;
}
