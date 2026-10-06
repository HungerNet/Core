import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"
import { Link, type LinkProps } from "react-router-dom"

interface SharedProps {
  children?: ReactNode
  variant?: string
  size?: string
  icon?: boolean
  block?: boolean
  className?: string
}

type GlassButtonProps = SharedProps & (
  | ({ to: string; href?: never } & Omit<LinkProps, "to" | "className" | "children">)
  | ({ href: string; to?: never } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">)
  | ({ to?: never; href?: never } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">)
)

export default function GlassButton(props: GlassButtonProps) {
  const {
  children,
  variant = "default",
  size = "md",
  to,
  href,
  icon,
  block = false,
  className = "",
  ...attributes
  } = props
  const classes = [
    "glass-btn",
    variant !== "default" ? `glass-btn--${variant}` : "",
    size !== "md" ? `glass-btn--${size}` : "",
    block ? "glass-btn--block" : "",
    icon ? "glass-btn--icon" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  if (to) {
    return (
      <Link to={to} className={classes} {...(attributes as Omit<LinkProps, "to" | "className" | "children">)}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...(attributes as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">)}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} {...(attributes as Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">)}>
      {children}
    </button>
  )
}
