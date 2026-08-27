import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure your beauty studio profile, location, and booking rules.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
