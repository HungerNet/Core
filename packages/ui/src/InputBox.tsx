import type { InputHTMLAttributes } from "react";

export interface InputBoxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
}

export function InputBox({ value, onChange, className = "", ...props }: InputBoxProps) {
  return (
    <input
      {...props}
      value={value ?? ""}
      className={['input-box', className].filter(Boolean).join(" ")}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}
