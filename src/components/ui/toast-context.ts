/**
 * Toast context — kept separate from the ToastProvider component so
 * fast-refresh treats each module as a single-concern file.
 */

import { createContext, useContext } from "react";

export interface ToastContextValue {
  notify: (message: string, undo?: () => void) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
