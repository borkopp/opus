import type { ReactNode } from "react";
import { StudioModal } from "@/components/dashboard/studio-modal";
export function AppointmentModal({
  title,
  busy = false,
  day,
  children,
  footer,
}: {
  title: string;
  busy?: boolean;
  day?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <StudioModal
      title={title}
      busy={busy}
      footer={footer}
      fallback={{
        pathname: "/calendar",
        params: day !== undefined ? { day: String(day) } : {},
      }}
    >
      {children}
    </StudioModal>
  );
}
