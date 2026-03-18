import { useCallback, useId, useMemo, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/shared/ui";

type ImageDropzoneProps = {
  value?: string;
  onChange: (next: string) => void;
  onClear?: () => void;
  disabled?: boolean;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export function ImageDropzone({ value, onChange, onClear, disabled }: ImageDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValue = !!value?.trim();
  const previewUrl = useMemo(() => (hasValue ? value!.trim() : ""), [hasValue, value]);

  const openPicker = useCallback(() => {
    if (disabled) return;
    setError(null);
    inputRef.current?.click();
  }, [disabled]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file.");
        return;
      }
      setError(null);
      const dataUrl = await readFileAsDataUrl(file);
      onChange(dataUrl);
    },
    [onChange],
  );

  const onInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        await handleFiles(e.target.files);
      } finally {
        // Allow re-selecting the same file again.
        e.target.value = "";
      }
    },
    [handleFiles],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      if (disabled) return;
      await handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragActive(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const clear = useCallback(() => {
    if (disabled) return;
    setError(null);
    if (onClear) onClear();
    else onChange("");
  }, [disabled, onChange, onClear]);

  return (
    <div className="space-y-2">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled ? "true" : "false"}
        aria-label={hasValue ? "Change photo" : "Upload photo"}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={[
          "relative border-2 border-dashed rounded-md p-6 text-center transition-colors select-none",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-surface-muted",
          isDragActive ? "border-olive bg-surface-muted" : "border-border",
        ].join(" ")}
      >
        {hasValue ? (
          <div className="space-y-3">
            <div className="mx-auto h-40 w-full overflow-hidden rounded-md bg-transparent">
              <img
                src={previewUrl}
                alt="Selected item photo preview"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex justify-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openPicker} disabled={disabled}>
                Change
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<X size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                }}
                disabled={disabled}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Camera size={32} className="mx-auto text-olive mb-2" />
            <p className="text-sm font-medium">Upload Photo</p>
            <p className="text-xs text-text-secondary">Tap to choose (or drag and drop on desktop)</p>
          </div>
        )}
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

