import { GlassButton, Icon } from "@hungernet/ui/components";
import { useState } from "react";

interface CopyFieldProps {
  label: string
  value: string
  displayValue?: string
}

export default function CopyField({ label, value, displayValue }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="copyfield">
      <div className="copyfield-left">
        <div className="copyfield-label">{label}</div>
        <div className="copyfield-value">
          {displayValue || value}
        </div>
      </div>

      <GlassButton
        size="sm"
        variant="ghost"
        className="copyfield-btn"
        onClick={copy}
      >
        <Icon name={copied ? "check" : "copy"} size={14} />
      </GlassButton>
    </div>
  );
}
