import type { HTMLAttributes, ReactNode } from "react";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function GlassCard({ children, className = "", ...props }: GlassCardProps) {
  return (
    <div className={['glass-card', className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}
