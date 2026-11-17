import type { SVGProps } from "react";

const paths = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  document: <path d="M9 4h11l6 6v18H7V4Zm10 0v7h7M12 17h9M12 22h7" />,
  check: <path d="m5 12 4 4L19 6" />,
  down: <path d="M12 4v16M6 14l6 6 6-6" />,
  family: <><circle cx="11" cy="10" r="4" /><circle cx="23" cy="12" r="3" /><path d="M3 27v-3a8 8 0 0 1 16 0v3M20 19a6 6 0 0 1 9 5v3" /></>,
  branch: <path d="M16 28V8m0 12C8 20 5 15 5 9c8 0 11 5 11 11Zm0-5C16 7 20 4 27 4c0 7-4 11-11 11Z" />,
  case: <><rect x="4" y="10" width="24" height="17" rx="2" /><path d="M11 10V5h10v5M4 17c7 5 17 5 24 0M14 18v4h4v-4" /></>,
  chat: <><path d="M20 11.5A8.5 8.5 0 0 1 7 19l-5 2 1.5-5A8.5 8.5 0 1 1 20 11.5Z" /><path d="M7 10h8M7 14h5" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  menu: <path d="M4 8h16M4 16h16" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  person: <><circle cx="12" cy="7.5" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.6" r=".9" fill="currentColor" stroke="none" /></>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="7.5" cy="7" r=".9" fill="currentColor" stroke="none" /><path d="M7.5 10.5V17M11.5 10.5V17m0-3.5a3 3 0 0 1 6 0V17" /></>,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const viewBox = ["document", "family", "branch", "case"].includes(name) ? "0 0 32 32" : "0 0 24 24";
  return <svg viewBox={viewBox} aria-hidden="true" {...props}>{paths[name]}</svg>;
}
