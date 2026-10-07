import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { studioAppMetadata } from "@/lib/studio-app-metadata";

export const metadata: Metadata = studioAppMetadata;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
