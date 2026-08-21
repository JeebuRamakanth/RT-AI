/**
 * AssetUpload — hidden file input + imperative trigger, shared by the
 * toolbar button, empty states, and drag-and-drop. Accepts any file type:
 * type detection happens in the domain layer (typeFromMime), and previews
 * stay honest per type.
 */

import { forwardRef, useImperativeHandle, useRef } from "react";

export interface AssetUploadHandle {
  openPicker: () => void;
}

interface AssetUploadProps {
  onFiles: (files: File[]) => void;
}

export const AssetUpload = forwardRef<AssetUploadHandle, AssetUploadProps>(
  function AssetUpload({ onFiles }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      openPicker: () => inputRef.current?.click(),
    }));

    return (
      <input
        ref={inputRef}
        type="file"
        multiple
        aria-hidden
        tabIndex={-1}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
      />
    );
  },
);
