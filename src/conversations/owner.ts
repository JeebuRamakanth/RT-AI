/**
 * Owner identity — placeholder for local development.
 *
 * RT AI is a private two-user system: Ramakanth and his wife. There is no
 * public-user model. This module provides a safe placeholder owner identity
 * so the storage layer can be owner-aware today, without a real auth layer.
 *
 * A future secure auth/authorization step replaces `getCurrentOwner()` and
 * `listOwners()` without touching the repository or UI call sites — the
 * `Owner` shape stays stable.
 */

import type { Owner } from "@/conversations/types";

/**
 * The two authorized RT AI users. For local development we default to
 * Ramakanth. The active owner is persisted in localStorage so a future
 * "switch user" affordance can demonstrate user separation without auth.
 */

export const OWNERS: Owner[] = [
  { id: "ramakanth", name: "Ramakanth", initials: "R" },
  { id: "wife", name: "Ramakanth's Wife", initials: "W" },
];

const STORAGE_KEY = "rt-owner-id";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore — storage may be unavailable */
  }
}

/**
 * The currently active owner. Defaults to Ramakanth for local development.
 * The conversation repository scopes ALL operations by this owner id so the
 * two users' conversations stay logically separate.
 */
export function getCurrentOwner(): Owner {
  const stored = readStored();
  if (stored) {
    const found = OWNERS.find((o) => o.id === stored);
    if (found) return found;
  }
  writeStored(OWNERS[0].id);
  return OWNERS[0];
}

export function setCurrentOwner(id: string): Owner {
  const found = OWNERS.find((o) => o.id === id);
  if (!found) throw new Error(`Unknown owner: ${id}`);
  writeStored(found.id);
  return found;
}

export function listOwners(): Owner[] {
  return OWNERS.slice();
}
