import type { ReactElement, SVGProps } from "react";

export type IconName = "check" | "copy" | "arrow" | "spark" | "info" | "download" | "modrinth" | "github" | "discord" | "external";

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const iconMap: Record<IconName, ReactElement> = {
  check: (
    <path d="M5 12.5 9.2 16.7 19 6.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  copy: (
    <>
      <rect x="9" y="9" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15V7a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </>
  ),
  arrow: (
    <path d="M5 12h14M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  spark: (
    <path d="M12 2 14.4 8.6 21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2Z" fill="currentColor" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5M12 7h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v13M7 11l5 5 5-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M3 19h18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </>
  ),
  modrinth: (
    <path d="M12.252.004a11.78 11.768 0 0 0-8.92 3.73a11 11 0 0 0-2.17 3.11a11.37 11.359 0 0 0-1.16 5.169c0 1.42.17 2.5.6 3.77c.24.759.77 1.899 1.17 2.529a12.3 12.298 0 0 0 8.85 5.639c.44.05 2.54.07 2.76.02c.2-.04.22.1-.26-1.7l-.36-1.37l-1.01-.06a8.5 8.489 0 0 1-5.18-1.8a5.3 5.3 0 0 1-1.3-1.26c0-.05.34-.28.74-.5a37.572 37.545 0 0 1 2.88-1.629c.03 0 .5.45 1.06.98l1 .97l2.07-.43l2.06-.43l1.47-1.47c.8-.8 1.48-1.5 1.48-1.52c0-.09-.42-1.63-.46-1.7c-.04-.06-.2-.03-1.02.18c-.53.13-1.2.3-1.45.4l-.48.15l-.53.53l-.53.53l-.93.1l-.93.07l-.52-.5a2.7 2.7 0 0 1-.96-1.7l-.13-.6l.43-.57c.68-.9.68-.9 1.46-1.1c.4-.1.65-.2.83-.33c.13-.099.65-.579 1.14-1.069l.9-.9l-.7-.7l-.7-.7l-1.95.54c-1.07.3-1.96.53-1.97.53c-.03 0-2.23 2.48-2.63 2.97l-.29.35l.28 1.03c.16.56.3 1.16.31 1.34l.03.3l-.34.23c-.37.23-2.22 1.3-2.84 1.63c-.36.2-.37.2-.44.1c-.08-.1-.23-.6-.32-1.03c-.18-.86-.17-2.75.02-3.73a8.84 8.84 0 0 1 7.9-6.93c.43-.03.77-.08.78-.1c.06-.17.5-2.999.47-3.039c-.01-.02-.1-.02-.2-.03Zm3.68.67c-.2 0-.3.1-.37.38c-.06.23-.46 2.42-.46 2.52c0 .04.1.11.22.16a8.51 8.499 0 0 1 2.99 2a8.38 8.379 0 0 1 2.16 3.449a6.9 6.9 0 0 1 .4 2.8c0 1.07 0 1.27-.1 1.73a9.4 9.4 0 0 1-1.76 3.769c-.32.4-.98 1.06-1.37 1.38c-.38.32-1.54 1.1-1.7 1.14c-.1.03-.1.06-.07.26c.03.18.64 2.56.7 2.78l.06.06a12.07 12.058 0 0 0 7.27-9.4c.13-.77.13-2.58 0-3.4a11.96 11.948 0 0 0-5.73-8.578c-.7-.42-2.05-1.06-2.25-1.06Z" fill="currentColor" />
  ),
  github: (
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.26-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.58 9.58 0 0 1 12 6.99c.85 0 1.71.11 2.51.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.39.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.37c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" fill="currentColor" />
  ),
  discord: (
    <path d="M19.54 5.34A18.3 18.3 0 0 0 15 3.93l-.58 1.18a16.8 16.8 0 0 0-4.84 0L9 3.93a18.3 18.3 0 0 0-4.55 1.41C1.57 9.58.79 13.72 1.18 17.8a18.4 18.4 0 0 0 5.58 2.82l1.2-1.95a12 12 0 0 1-1.89-.91l.46-.36a13.1 13.1 0 0 0 11.02 0l.46.36c-.6.36-1.24.67-1.89.91l1.2 1.95a18.4 18.4 0 0 0 5.58-2.82c.47-4.73-.8-8.83-3.36-12.46ZM8.96 14.7c-1.08 0-1.96-.99-1.96-2.2s.86-2.2 1.96-2.2 1.98.99 1.96 2.2c0 1.21-.86 2.2-1.96 2.2Zm6.08 0c-1.08 0-1.96-.99-1.96-2.2s.86-2.2 1.96-2.2 1.98.99 1.96 2.2c0 1.21-.86 2.2-1.96 2.2Z" fill="currentColor" />
  ),
  external: (
    <path d="M14 4h6v6m-1-5-9 9m7-1v6H5V7h6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  ),
};

export function Icon({ name, size = 16, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {iconMap[name]}
    </svg>
  );
}
