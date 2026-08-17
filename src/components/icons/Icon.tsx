import type { SVGProps } from "react";

export type IconName =
  | "spark"
  | "search"
  | "file"
  | "image"
  | "film"
  | "mic"
  | "code"
  | "book"
  | "hammer"
  | "robot"
  | "bolt"
  | "brain"
  | "eye"
  | "layers"
  | "knowledge"
  | "send"
  | "plus"
  | "attach"
  | "menu"
  | "home"
  | "settings"
  | "user"
  | "chevron-right"
  | "arrow-right"
  | "close"
  | "shield"
  | "globe"
  | "play"
  | "pause"
  | "check"
  | "alert"
  | "clock"
  | "more"
  | "sun"
  | "moon";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, React.ReactNode> = {
  spark: (
    <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  file: (
    <>
      <path d="M14 3v5h5" />
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5z" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  code: <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 6l-4 12" />,
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" />
      <path d="M4 19a2 2 0 0 1 2-2h13" />
    </>
  ),
  hammer: <path d="M14 7l3 3M17 4l3 3-4 4-3-3 4-4zM13 8L4 17v3h3l9-9" />,
  robot: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 4v4M8 13h.01M16 13h.01M9 19v2M15 19v2" />
    </>
  ),
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  brain: (
    <>
      <path d="M9 4a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 5 9.5 2.5 2.5 0 0 0 6.5 14 2.5 2.5 0 0 0 9 19a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 2.5-5A2.5 2.5 0 0 0 19 9.5 2.5 2.5 0 0 0 16.5 6.5 2.5 2.5 0 0 0 14 4a2.5 2.5 0 0 0-5 0z" />
      <path d="M12 4v15" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />,
  knowledge: (
    <>
      <path d="M4 4v16M4 4h11l-2 4 2 4H4" />
      <path d="M4 20h11" />
    </>
  ),
  send: <path d="M4 12l16-8-6 16-3-7-7-1z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  attach: (
    <path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5L10.5 17.5a2 2 0 0 1-3-3L15 7" />
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  home: <path d="M4 11l8-7 8 7M6 10v10h12V10" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </>
  ),
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18-3-3-3-15 0-18z" />
    </>
  ),
  play: <path d="M7 4l13 8-13 8V4z" />,
  pause: <path d="M8 4h3v16H8zM13 4h3v16h-3z" />,
  check: <path d="M5 13l4 4L19 7" />,
  alert: <path d="M12 3l9 16H3L12 3zM12 9v5M12 17h.01" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
};

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
