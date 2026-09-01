import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & {size?: number};

const defaults = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const MessageIcon: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg width={size} height={size} {...defaults} {...props}>
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5.1A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="2.8" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg width={size} height={size} {...defaults} {...props}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
    <path d="m8.5 15 2 2 4-4" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg width={size} height={size} {...defaults} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg width={size} height={size} {...defaults} {...props}>
    <path d="m5 12 4 4L19 6" />
  </svg>
);

export const LinkIcon: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg width={size} height={size} {...defaults} {...props}>
    <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg width={size} height={size} {...defaults} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const ScissorsIcon: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg width={size} height={size} {...defaults} {...props}>
    <circle cx="6" cy="7" r="3" />
    <circle cx="6" cy="17" r="3" />
    <path d="m8.7 8.4 11.3 6.1M8.7 15.6 20 9.5" />
  </svg>
);

export const ArrowRightIcon: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg width={size} height={size} {...defaults} {...props}>
    <path d="M5 12h14M14 7l5 5-5 5" />
  </svg>
);

export const SparkleIcon: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg width={size} height={size} {...defaults} {...props}>
    <path d="M12 3c.8 5 2 6.2 7 7-5 .8-6.2 2-7 7-.8-5-2-6.2-7-7 5-.8 6.2-2 7-7z" />
    <path d="M19 16c.3 2.1.9 2.7 3 3-2.1.3-2.7.9-3 3-.3-2.1-.9-2.7-3-3 2.1-.3 2.7-.9 3-3z" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg width={size} height={size} {...defaults} {...props}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  </svg>
);

