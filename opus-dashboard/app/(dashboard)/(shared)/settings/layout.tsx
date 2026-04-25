import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure your organization profile, booking rules, AI agent, and integrations.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
