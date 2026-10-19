import {
  studioAppMetadata,
  studioAppViewport,
} from "@/lib/studio-app-metadata";
import type { Viewport } from "next";
import { StudioInstallProvider } from "@/components/pwa/StudioInstallProvider";

export const metadata = studioAppMetadata;
export const viewport: Viewport = { ...studioAppViewport, viewportFit: "auto" };

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudioInstallProvider>{children}</StudioInstallProvider>;
}
