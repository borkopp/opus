import type { Viewport } from "next";
import { studioAppViewport } from "@/lib/studio-app-metadata";

// The full-screen editor does not use DashboardShell's safe-area padding.
export const viewport: Viewport = { ...studioAppViewport, viewportFit: "auto" };

export default function WebsiteEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
