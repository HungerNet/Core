import type { CSSProperties, ReactNode } from "react"

/**
 * Icon component with per-icon viewBox support.
 *
 * Usage:
 *   <Icon name="discord" size={22} />
 *
 * - Brand logos keep their original viewBox so they render exactly like the raw SVGs.
 * - Stroke icons use fill="none" and stroke="currentColor".
 * - Fill icons use fill="currentColor".
 */

interface IconDefinition {
  viewBox: string
  stroke: boolean
  path: ReactNode
}

const icons: Record<string, IconDefinition> = {
  bolt: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },

  cpu: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
      </>
    ),
  },

  star: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },

  sparkles: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <path
          d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 18l.5 1.5L7 20l-1.5.5L5 22l-.5-1.5L3 20l1.5-.5L5 18z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },

  palette: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <path
        d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10c0 1.657-1.343 3-3 3h-1.5a1.5 1.5 0 000 3H19a1 1 0 010 2h-7zm-5-9a1 1 0 100-2 1 1 0 000 2zm3-4a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2zm3 4a1 1 0 100-2 1 1 0 000 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },

  zoom: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  lightbulb: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <path
        d="M9 21h6M12 3a6 6 0 016 6c0 2.22-1.2 4.16-3 5.2V17H9v-2.8A6 6 0 0112 3z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },

  puzzle: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <path
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 003 12a9 9 0 009 9 9.003 9.003 0 006.354-2.646zM14.5 8A1.5 1.5 0 0013 9.5V11h-1.5a1.5 1.5 0 000 3H13v1.5a1.5 1.5 0 003 0V14h1.5a1.5 1.5 0 000-3H16V9.5A1.5 1.5 0 0014.5 8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },

  download: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <path d="M12 3v13M7 11l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 19h18" />
      </>
    ),
  },

  checkCircle: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  xCircle: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  play: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: <path d="M5 3l14 9-14 9V3z" strokeLinecap="round" strokeLinejoin="round" />,
  },

  folder: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <path
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },

  tool: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <path
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },

  cube: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <path
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.375c0 .621.504 1.125 1.125 1.125z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },

  github: {
    viewBox: "0 0 24 24",
    stroke: false,
    path: (
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.31 6.84 9.66.5.1.68-.22.68-.48v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.46-1.2-1.12-1.52-1.12-1.52-.92-.65.07-.64.07-.64 1.02.07 1.56 1.07 1.56 1.07.9 1.58 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0112 6.8c.85 0 1.7.12 2.5.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.95-2.34 4.82-4.57 5.07.36.32.68.94.68 1.9v2.82c0 .26.18.58.69.48A10.3 10.3 0 0022 12.26C22 6.58 17.52 2 12 2z" />
    ),
  },

  copy: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <rect x="2" y="2" width="13" height="13" rx="2" />
      </>
    ),
  },

  info: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  helpCircle: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path
          d="M9.09 9a3 3 0 115.82 1c-.55.97-1.64 1.36-2.09 2v1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  users: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <path
          d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="7" r="4" />
        <path
          d="M23 21v-2a4 4 0 00-3-3.87"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 3.13a4 4 0 010 7.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },

  shield: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },

  map: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <path
          d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 4v14M15 6v14" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },


  // -----------------------------
  // Brand / logo icons (preserve original viewBoxes)
  // -----------------------------

  discord: {
    viewBox: "0 0 127.14 96.36",
    stroke: false,
    path: (
      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,48,6.83,72.37,72.37,0,0,0,44.64,0,105.89,105.89,0,0,0,18.39,8.09C2.62,31.65-1.52,54.6.46,77.24A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.68,77.23C128.91,52.84,123.46,30,107.7,8.07ZM42.57,65.69c-6.23,0-11.31-5.72-11.31-12.75S36.25,40.19,42.57,40.19s11.39,5.74,11.31,12.75C53.88,59.97,48.8,65.69,42.57,65.69Zm42,0c-6.23,0-11.31-5.72-11.31-12.75S78.25,40.19,84.57,40.19s11.39,5.74,11.31,12.75C95.88,59.97,90.8,65.69,84.57,65.69Z" />
    ),
  },

  modrinth: {
    viewBox: "0 0 24 24",
    stroke: false,
    path: (
      <path d="M12.252.004a11.78 11.768 0 0 0-8.92 3.73a11 11 0 0 0-2.17 3.11a11.37 11.359 0 0 0-1.16 5.169c0 1.42.17 2.5.6 3.77c.24.759.77 1.899 1.17 2.529a12.3 12.298 0 0 0 8.85 5.639c.44.05 2.54.07 2.76.02c.2-.04.22.1-.26-1.7l-.36-1.37l-1.01-.06a8.5 8.489 0 0 1-5.18-1.8a5.3 5.3 0 0 1-1.3-1.26c0-.05.34-.28.74-.5a37.572 37.545 0 0 1 2.88-1.629c.03 0 .5.45 1.06.98l1 .97l2.07-.43l2.06-.43l1.47-1.47c.8-.8 1.48-1.5 1.48-1.52c0-.09-.42-1.63-.46-1.7c-.04-.06-.2-.03-1.02.18c-.53.13-1.2.3-1.45.4l-.48.15l-.53.53l-.53.53l-.93.1l-.93.07l-.52-.5a2.7 2.7 0 0 1-.96-1.7l-.13-.6l.43-.57c.68-.9.68-.9 1.46-1.1c.4-.1.65-.2.83-.33c.13-.099.65-.579 1.14-1.069l.9-.9l-.7-.7l-.7-.7l-1.95.54c-1.07.3-1.96.53-1.97.53c-.03 0-2.23 2.48-2.63 2.97l-.29.35l.28 1.03c.16.56.3 1.16.31 1.34l.03.3l-.34.23c-.37.23-2.22 1.3-2.84 1.63c-.36.2-.37.2-.44 0.1c-.08-.1-.23-.6-.32-1.03c-.18-.86-.17-2.75.02-3.73a8.84 8.84 0 0 1 7.9-6.93c.43-.03.77-.08.78-.1c.06-.17.5-2.999.47-3.039c-.01-.02-.1-.02-.2-.03Zm3.68.67c-.2 0-.3.1-.37.38c-.06.23-.46 2.42-.46 2.52c0 .04.1.11.22.16a8.51 8.499 0 0 1 2.99 2a8.38 8.379 0 0 1 2.16 3.449a6.9 6.9 0 0 1 .4 2.8c0 1.07 0 1.27-.1 1.73a9.4 9.4 0 0 1-1.76 3.769c-.32.4-.98 1.06-1.37 1.38c-.38.32-1.54 1.1-1.7 1.14c-.1.03-.1.06-.07.26c.03.18.64 2.56.7 2.78l.06.06a12.07 12.058 0 0 0 7.27-9.4c.13-.77.13-2.58 0-3.4a11.96 11.948 0 0 0-5.73-8.578c-.7-.42-2.05-1.06-2.25-1.06Z" />
    ),
  },

  email: {
    viewBox: "0 0 24 24",
    stroke: false,
    path: (
      <path d="M4 4h16a2 2 0 0 1 2 2v1l-10 6L2 7V6a2 2 0 0 1 2-2Zm18 5.236v8.764a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.236l10 6 10-6Z" />
    ),
  },

  youtube: {
    viewBox: "0 0 24 24",
    stroke: false,
    path: (
      <path d="M21.8 8.001a2.75 2.75 0 0 0-1.93-1.947C18.23 5.5 12 5.5 12 5.5s-6.23 0-7.87.554A2.75 2.75 0 0 0 2.2 8.001C1.65 9.65 1.65 12 1.65 12s0 2.35.55 3.999a2.75 2.75 0 0 0 1.93 1.947C5.77 18.5 12 18.5 12 18.5s6.23 0 7.87-.554a2.75 2.75 0 0 0 1.93-1.947C22.35 14.35 22.35 12 22.35 12s0-2.35-.55-3.999ZM10.5 14.75v-5.5L15 12l-4.5 2.75Z" />
    ),
  },

  website: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <path
        d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9m0-18c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9m-7-9h14"
        strokeLinecap="round"
        strokeWidth="2"
      />
    ),
  },


  arrowRight: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />,
  },

  chevronDown: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
  },

  warning: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <path d="M12 9v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  check: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />,
  },

  x: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />,
  },

  battery: {
    viewBox: "0 0 24 24",
    stroke: true,
    path: (
      <>
        <rect x="2" y="7" width="16" height="10" rx="2" />
        <path d="M22 11v2" strokeLinecap="round" />
        <path d="M6 11h8" strokeLinecap="round" />
      </>
    ),
  },
}

interface IconProps {
  name: string
  size?: number
  className?: string
  strokeWidth?: number
  style?: CSSProperties
}

export default function Icon({ name, size = 20, className = "", strokeWidth = 1.75, style }: IconProps) {
  const icon = icons[name]
  if (!icon) return null

  const isStroke = !!icon.stroke

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill={isStroke ? "none" : "currentColor"}
      stroke={isStroke ? "currentColor" : "none"}
      strokeWidth={isStroke ? strokeWidth : undefined}
      className={className}
      style={style}
      aria-hidden="true"
      role="img"
    >
      {icon.path}
    </svg>
  )
}
