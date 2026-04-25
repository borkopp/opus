import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View and manage your organization's activity and real-time alerts.",
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
