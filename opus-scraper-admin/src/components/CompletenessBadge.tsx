interface Props {
  label: string;
  present: boolean;
  partial?: boolean;
}

export function CompletenessBadge({ label, present, partial }: Props) {
  const bg = present ? "#d1fae5" : partial ? "#fef3c7" : "#fee2e2";
  const color = present ? "#065f46" : partial ? "#92400e" : "#991b1b";
  const icon = present ? "✓" : partial ? "~" : "✗";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "1px 6px",
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {icon} {label}
    </span>
  );
}
