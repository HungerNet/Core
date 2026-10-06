import type { InputHTMLAttributes } from "react";

interface InputBoxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string
  onChange: (value: string) => void
}

export default function InputBox({ value, onChange, placeholder, ...props }: InputBoxProps) {
  return (
    <div className="inputbox">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </div>
  );
}
