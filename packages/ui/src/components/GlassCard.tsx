import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react"

interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode
  variant?: string
  as?: ElementType
  style?: CSSProperties & { [key: `--${string}`]: string | number }
}

export default function GlassCard({
  children,
  className = "",
  variant = "",
  as: Tag = "div",
  ...props
}: GlassCardProps) {
  const Component = Tag as ElementType
  const variantClass = variant ? `glass-card glass-card--${variant}` : "glass-card"
  const combined = className ? `${variantClass} ${className}` : variantClass

  return (
    <Component className={combined} {...props}>
      {children}
    </Component>
  )
}
