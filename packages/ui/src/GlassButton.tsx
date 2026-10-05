import type { ButtonHTMLAttributes, ReactNode } from "react";

export type GlassButtonVariant = "primary" | "secondary" | "ghost";
export type GlassButtonSize = "sm" | "md" | "lg";

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
}

export function GlassButton({
  children,
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: GlassButtonProps) {
  const classes = [
    "glass-button",
    `glass-button--${variant}`,
    `glass-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
