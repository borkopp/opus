import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage services, staff availability, customers, and beauty appointments with OPUS.",
};

export default function BeautyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
