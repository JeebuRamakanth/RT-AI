import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { ThemeProvider } from "@/lib/theme";
import { ConversationStoreProvider } from "@/conversations/store";
import { ToastProvider } from "@/components/ui/Toast";
import "@/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <ConversationStoreProvider>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </ConversationStoreProvider>
    </ThemeProvider>
  </StrictMode>,
);
