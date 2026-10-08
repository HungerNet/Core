import { useRef, useState, type DragEvent } from "react";

export interface FileUploadProps {
  accept: string;
  disabled?: boolean;
  hint: string;
  id: string;
  maxSizeBytes?: number;
  onUpload: (file: File, onProgress: (percent: number) => void) => Promise<void>;
}

export function FileUpload({
  accept,
  disabled = false,
  hint,
  id,
  maxSizeBytes,
  onUpload,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  async function upload(file: File) {
    if (disabled || uploading) return;
    if (maxSizeBytes !== undefined && file.size > maxSizeBytes) {
      setError("This file is too large.");
      setProgress(null);
      return;
    }

    setError("");
    setFileName(file.name);
    setProgress(0);
    setUploading(true);
    try {
      await onUpload(file, (percent) => {
        setProgress(Math.max(0, Math.min(100, percent)));
      });
      setProgress(100);
    } catch (cause) {
      setProgress(null);
      setError(cause instanceof Error ? cause.message : "Could not upload this file.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void upload(file);
  }

  return (
    <div
      className={`file-dropzone${dragging ? " is-dragging" : ""}${disabled ? " is-disabled" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        id={id}
        className="file-dropzone-input"
        type="file"
        accept={accept}
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void upload(file);
        }}
      />
      <div className="file-dropzone-content">
        <strong>{uploading ? "Uploading file…" : "Drop a file here"}</strong>
        <span className="site-meta">{hint}</span>
        <button
          className="glass-button glass-button--secondary glass-button--sm"
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Choose file"}
        </button>
        {fileName && <span className="file-dropzone-name">{fileName}</span>}
        {progress !== null && (
          <div
            className="file-upload-progress"
            role="progressbar"
            aria-label="File upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <span className="file-dropzone-error" role="alert">{error}</span>}
      </div>
    </div>
  );
}
