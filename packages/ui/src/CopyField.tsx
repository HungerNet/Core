import { useMemo, useState } from "react";

export interface CopyFieldProps {
  value: string;
  label?: string;
}

export function CopyField({ value, label = "Copy" }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const displayValue = useMemo(() => value || "", [value]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="copy-field">
      <input className="copy-field__input" readOnly value={displayValue} />
      <button type="button" className="copy-field__button" onClick={handleCopy}>
        {copied ? "Copied!" : label}
      </button>
    </div>
  );
}
