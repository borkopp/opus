import type { Metadata, Viewport } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StudioInstallProvider } from "@/components/pwa/StudioInstallProvider";
import {
  studioAppMetadata,
  studioAppViewport,
} from "@/lib/studio-app-metadata";

export const metadata: Metadata = studioAppMetadata;
export const viewport: Viewport = studioAppViewport;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioInstallProvider>
      <DashboardShell>{children}</DashboardShell>
    </StudioInstallProvider>
  );
}
