import type { Metadata } from "next";
import { StaffInviteAcceptance } from "@/components/staff/StaffInviteAcceptance";

export const metadata: Metadata = {
  title: "Studio invitation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <StaffInviteAcceptance token={token} />;
}
