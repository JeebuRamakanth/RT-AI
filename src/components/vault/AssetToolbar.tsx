/**
 * AssetToolbar — vault header controls: search, upload, and a subtle
 * storage-honesty note when bytes are session-only.
 */

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { AssetSearch } from "@/components/vault/AssetSearch";

interface AssetToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchClear: () => void;
  searching: boolean;
  onUpload: () => void;
  storagePersistent: boolean;
}

export function AssetToolbar(props: AssetToolbarProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <AssetSearch
          value={props.searchQuery}
          onChange={props.onSearchChange}
          onClear={props.onSearchClear}
          loading={props.searching}
          className="flex-1"
        />
        <Button variant="primary" size="sm" onClick={props.onUpload} className="shrink-0 self-start sm:self-auto">
          <Icon name="upload" size={14} />
          Upload
        </Button>
      </div>
      {!props.storagePersistent && (
        <p className="flex items-center gap-1.5 px-1 text-[11.5px] text-pearl-faint" role="status">
          <Icon name="alert" size={12} />
          Browser storage is unavailable — files uploaded in this session won't survive a reload. Metadata still works.
        </p>
      )}
    </div>
  );
}
