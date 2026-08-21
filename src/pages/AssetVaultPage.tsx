import { AssetStoreProvider } from "@/assets/store";
import { AssetVault } from "@/components/vault/AssetVault";
import { ConversationStoreProvider } from "@/conversations/store";
import { ToastProvider } from "@/components/ui/Toast";

export function AssetVaultPage() {
  return (
    <ConversationStoreProvider>
      <AssetStoreProvider>
        <ToastProvider>
          <AssetVault />
        </ToastProvider>
      </AssetStoreProvider>
    </ConversationStoreProvider>
  );
}
